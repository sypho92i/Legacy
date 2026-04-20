// engine.js — boucle de jeu, calculs purs
// Règle : ne touche jamais au DOM, ne lit jamais le DOM
import { CONFIG } from './config.js'
import { state }  from './state.js'

// ─── Helpers de calcul ────────────────────────────────────────────────────────

export function getPalierKarma(karma) {
  return CONFIG.PALIERS_KARMA.find(p => karma >= p.min && karma <= p.max)
    ?? CONFIG.PALIERS_KARMA.find(p => p.palier === 'neutre')
}

export function getModifKarma(karma) {
  return 1 + getPalierKarma(karma).modifProductivite
}

export function getModifBonheur(bonheur) {
  // Linéaire : 50 % bonheur = ×1, 100 % bonheur = ×1.5, 0 % = ×0.5
  return 0.5 + (bonheur / CONFIG.JAUGE_MAX)
}

export function getMultiplicateurCompetence(competence) {
  return CONFIG.MULTIPLICATEUR_COMPETENCE[competence] ?? 1
}

export function getMultiplicateurNiveau(secteur) {
  const niveau = calculerNiveau(secteur)
  return CONFIG.MULTIPLICATEURS_NIVEAU.find(m => m.niveau === niveau)
    ?? CONFIG.MULTIPLICATEURS_NIVEAU[0]
}

export function calculerXpClic() {
  const base = Math.max(0.1,
    1 * getModifKarma(state.karma) * getModifBonheur(state.jauges.bonheur)
  )
  if (Date.now() < state._boostXpExpiry) {
    return base * CONFIG.ORDINATEUR.COMMANDES.recherche.effet.boostXpMulti
  }
  return base
}

export function calculerNiveau(secteur) {
  const xp = state.xpSecteurs[secteur] ?? 0
  const seuils = CONFIG.NIVEAUX.SEUILS
  let niveau = 1
  for (let i = seuils.length - 1; i >= 0; i--) {
    if (xp >= seuils[i]) { niveau = i + 1; break }
  }
  return niveau
}

export function calculerRevenuClic() {
  return (
    (CONFIG.REVENU_BASE_CLIC + state.bonusUpgrades)
    * getMultiplicateurNiveau(state.secteurActif).valeur
    * getModifKarma(state.karma)
    * getModifBonheur(state.jauges.bonheur)
  )
}

// ─── Achat d'upgrade ──────────────────────────────────────────────────────────

export function acheterUpgrade(id) {
  const upgrades = CONFIG.METIERS[state.secteurActif ?? 'commerce'].upgrades
  const idx      = upgrades.findIndex(u => u.id === id)
  if (idx === -1) return

  const upgrade = upgrades[idx]
  const cout    = Math.round(100 * Math.pow(2.8, idx))

  // Vérifications
  if (state.argent < cout) return
  const prerequisRempli = upgrade.prerequis === null || state.upgrades.some(u => u.id === upgrade.prerequis)
  if (!prerequisRempli) return
  if (state.upgrades.some(u => u.id === id)) return

  // Déduire le coût
  state.argent -= cout

  // Activer l'upgrade
  state.upgrades.push({ id })

  // Appliquer l'effet (additif)
  if (upgrade.bonusClic) {
    state.bonusUpgrades += upgrade.bonusClic
  }
  if (upgrade.passifId) {
    state.passifs.push({ id: upgrade.passifId, nom: upgrade.nom, tauxParSeconde: upgrade.passifValeur })
  }
}

window.acheterUpgrade = acheterUpgrade

// ─── Achat d'item boutique ────────────────────────────────────────────────────

export function acheterItem(id) {
  const item = CONFIG.BOUTIQUE.ITEMS.find(i => i.id === id)
  if (!item) return null
  if (state.argent < item.prix) return null
  state.argent -= item.prix
  state.jauges[item.jauge] = clampJauge(state.jauges[item.jauge] + item.effet)
  return item
}

window.acheterItem = acheterItem

// ─── Logement ─────────────────────────────────────────────────────────────────

export function louerLogement(slug) {
  const logement = CONFIG.LOGEMENTS[slug]
  if (!logement || logement.type !== 'location') return null
  if (state.argent < logement.charge) return null
  state.possessions.logement       = slug
  state.possessions.logementAchete = false
  state._ticksDepuisLoyer          = 0
  return logement
}

export function acheterLogement(slug) {
  const logement = CONFIG.LOGEMENTS[slug]
  if (!logement || logement.type !== 'achat') return null
  if (state.argent < logement.cout) return null
  state.argent                     -= logement.cout
  state.possessions.logement       = slug
  state.possessions.logementAchete = true
  state._ticksDepuisLoyer          = 0
  return logement
}

window.louerLogement   = louerLogement
window.acheterLogement = acheterLogement

// ─── Téléphone ────────────────────────────────────────────────────────────────

export function acheterTelephone() {
  if (state.possessions.telephone) return false
  if (state.argent < CONFIG.BOUTIQUE.TELEPHONE.prix) return false
  state.argent -= CONFIG.BOUTIQUE.TELEPHONE.prix
  state.possessions.telephone = true
  return true
}

export function executerActionTelephone(id) {
  if (!state.possessions.telephone) return { ok: false, raison: 'Pas de téléphone' }
  const action = CONFIG.TELEPHONE.ACTIONS[id]
  if (!action) return { ok: false, raison: 'Action inconnue' }

  if (state.abonnes < (action.seuilAbonnes ?? 0)) {
    return { ok: false, raison: 'Seuil abonnés non atteint' }
  }

  const now = Date.now()
  if (now < (state.telephoneCooldowns[id] ?? 0)) {
    return { ok: false, raison: 'En cooldown' }
  }

  // Effet abonnés
  if (action.effetAbonnes) {
    const palier = getPalierKarma(state.karma)
    const bonus = palier.palier === 'vertueux' ? 2 : 1
    state.abonnes += action.effetAbonnes * bonus
  }

  // Effet bonheur temporaire
  if (action.effetBonheur) {
    state.jauges.bonheur = clampJauge(state.jauges.bonheur + action.effetBonheur)
    state._bonheurTempExpiry = now + action.bonheurDuree
  }

  // Effet passif
  if (action.passifId) {
    if (action.passifMax) {
      const count = state.passifs.filter(p => p.id === action.passifId).length
      if (count < action.passifMax) {
        state.passifs.push({ id: action.passifId, nom: action.label, tauxParSeconde: action.passifTaux })
      }
    } else if (!state.passifs.some(p => p.id === action.passifId)) {
      state.passifs.push({ id: action.passifId, nom: action.label, tauxParSeconde: action.passifTaux })
    }
  }

  state.telephoneCooldowns[id] = now + action.cooldown * 1000
  return { ok: true }
}

window.acheterTelephone        = acheterTelephone
window.executerActionTelephone = executerActionTelephone

// ─── Ordinateur ───────────────────────────────────────────────────────────────

export function calculerPrixTokens(prixBase) {
  const multiGen = CONFIG.ORDINATEUR.MULTIPLICATEURS_GENERATION[state.generation]
    ?? CONFIG.ORDINATEUR.MULTIPLICATEURS_GENERATION.defaut
  const entreeAge = CONFIG.ORDINATEUR.MULTIPLICATEURS_AGE.find(
    e => state.age >= e.min && state.age < e.max
  )
  const multiAge = entreeAge?.multi ?? 1.0
  return Math.round(prixBase * multiGen * multiAge)
}

export function acheterOrdinateur() {
  if (state.possessions.ordinateur) return false
  if (state.argent < CONFIG.BOUTIQUE.ORDINATEUR.prix) return false
  state.argent -= CONFIG.BOUTIQUE.ORDINATEUR.prix
  state.possessions.ordinateur = true
  return true
}

export function acheterTokens(quantite) {
  const pack = CONFIG.ORDINATEUR.PACKS_TOKENS.find(p => p.quantite === quantite)
  if (!pack) return { ok: false }
  const prix = calculerPrixTokens(pack.prixBase)
  if (state.argent < prix) return { ok: false }
  state.argent -= prix
  state.possessions.tokens += quantite
  return { ok: true, prix }
}

export function executerCommande(id) {
  const cmd = CONFIG.ORDINATEUR.COMMANDES[id]
  if (!cmd) return { ok: false, raison: 'Commande inconnue' }
  if (!state.possessions.ordinateur) return { ok: false, raison: 'Pas d\'ordinateur' }
  if (state.possessions.tokens < cmd.tokens) return { ok: false, raison: 'Tokens insuffisants' }

  state.possessions.tokens -= cmd.tokens
  const effet = cmd.effet

  if (effet.passifId !== undefined) {
    const count = state.passifs.filter(p => p.id === effet.passifId).length
    if (count < effet.passifMax) {
      state.passifs.push({ id: effet.passifId, nom: cmd.label, tauxParSeconde: effet.passifTaux })
    }
  }
  if (effet.karma !== undefined) {
    state.karma = Math.max(0, Math.min(100, state.karma + effet.karma))
  }
  if (effet.reputation !== undefined) {
    state.jauges.reputation = clampJauge(state.jauges.reputation + effet.reputation)
  }
  if (effet.boostXpDuree !== undefined) {
    state._boostXpExpiry = Date.now() + effet.boostXpDuree * 1000
  }

  return { ok: true }
}

window.acheterOrdinateur = acheterOrdinateur
window.acheterTokens     = acheterTokens
window.executerCommande  = executerCommande

// ─── Carte / Secteurs ─────────────────────────────────────────────────────────

export function calculerCoutChangement(secteurCible) {
  const cle = state.secteurActif + '->' + secteurCible
  return CONFIG.MAP.COUTS_CHANGEMENT[cle] ?? CONFIG.MAP.COUTS_CHANGEMENT.defaut
}

export function changerSecteur(secteurCible) {
  if (secteurCible === state.secteurActif)
    return { ok: false, raison: 'same' }
  if (Date.now() < state._changementSecteurExpiry)
    return { ok: false, raison: 'cooldown' }
  const cout = calculerCoutChangement(secteurCible)
  if (state.argent < cout)
    return { ok: false, raison: 'argent', cout }
  state.argent -= cout
  state.secteurActif = secteurCible
  state._changementSecteurExpiry = Date.now() + CONFIG.MAP.COOLDOWN_CHANGEMENT * 1000
  return { ok: true, cout }
}

window.changerSecteur          = changerSecteur
window.calculerCoutChangement  = calculerCoutChangement

function tickLogement() {
  if (state.possessions.logement === 'squat') {
    // Malus continus squat
    state.jauges.reputation = clampJauge(state.jauges.reputation - CONFIG.JAUGES_MALUS_SQUAT.reputation_par_tick)
    state.jauges.hygiene    = clampJauge(state.jauges.hygiene    - CONFIG.JAUGES_MALUS_SQUAT.hygiene_decay_bonus)
    if (state.jauges.bonheur > CONFIG.JAUGES_MALUS_SQUAT.bonheur_plafond) {
      state.jauges.bonheur = CONFIG.JAUGES_MALUS_SQUAT.bonheur_plafond
    }
    return
  }

  state._ticksDepuisLoyer++
  if (state._ticksDepuisLoyer >= CONFIG.LOGEMENT_TICK_PRELEVEMENT) {
    state._ticksDepuisLoyer = 0
    const logement = CONFIG.LOGEMENTS[state.possessions.logement]
    if (logement && logement.charge > 0) {
      if (state.argent >= logement.charge) {
        state.argent -= logement.charge
      } else {
        // Expulsion
        state.possessions.logement       = 'squat'
        state.possessions.logementAchete = false
        state.jauges.reputation = clampJauge(state.jauges.reputation + CONFIG.EXPULSION.choc_reputation)
        state.jauges.bonheur    = clampJauge(state.jauges.bonheur    + CONFIG.EXPULSION.choc_bonheur)
      }
    }
  }
}

// ─── Helpers passifs ──────────────────────────────────────────────────────────

function getPlafondPassif(passifId) {
  for (const secteur of Object.values(CONFIG.METIERS)) {
    const upgrade = secteur.upgrades?.find(u => u.passifId === passifId)
    if (upgrade?.plafond !== undefined) return upgrade.plafond
  }
  return null
}

function tauxPassifPlafonné(p) {
  const plafond = getPlafondPassif(p.id)
  return plafond !== null ? Math.min(p.tauxParSeconde, plafond) : p.tauxParSeconde
}

export function getTauxPassifTotal() {
  return state.passifs.reduce((acc, p) => acc + tauxPassifPlafonné(p), 0)
}

// ─── Cashflow ─────────────────────────────────────────────────────────────────

export function calculerCashflowNet() {
  const totalRevenus = getTauxPassifTotal()
  const totalCharges = CONFIG.LOGEMENTS[state.possessions.logement]?.charge ?? 0
  state.cashflowNet = totalRevenus - totalCharges
}

// ─── Étapes du tick ───────────────────────────────────────────────────────────

function tickPassifs() {
  const tauxTotal = getTauxPassifTotal()
  const taux = state.jauges.bonheur < 20
    ? Math.max(0, tauxTotal - CONFIG.MALUS_PASSIF_TICK)
    : tauxTotal
  // Les passifs sont en $/s, le tick est en fraction de seconde
  state.argent += taux * (CONFIG.TICK_MS / 1000)
}

function clampJauge(val) {
  return Math.max(CONFIG.JAUGE_MIN, Math.min(CONFIG.JAUGE_MAX, val))
}

function tickJauges() {
  const decay = CONFIG.JAUGE_DECAY_PAR_TICK

  // Déclin passif de base
  for (const jauge of Object.keys(decay)) {
    state.jauges[jauge] = clampJauge(state.jauges[jauge] - decay[jauge])
  }

  // Interactions soustractives
  if (state.jauges.faim < CONFIG.JAUGE_SEUIL_FAIM) {
    state.jauges.sante = clampJauge(state.jauges.sante - CONFIG.JAUGE_MALUS_SANTE_PAR_TICK)
  }
  if (state.jauges.hygiene < CONFIG.JAUGE_SEUIL_HYGIENE) {
    state.jauges.reputation = clampJauge(state.jauges.reputation - CONFIG.JAUGE_MALUS_REPUTATION_PAR_TICK)
  }
}

function tickAge() {
  state._ticksDepuisDernierAnniversaire++
  if (state._ticksDepuisDernierAnniversaire >= CONFIG.TICKS_PAR_AN) {
    state._ticksDepuisDernierAnniversaire = 0
    state.age++
  }
}

function tickKarma() {
  const palier = getPalierKarma(state.karma)
  state.palierKarma = palier.palier
}

function tickCompetence() {
  state.multiplicateurCouleur = CONFIG.COULEUR_COMPETENCE[state.competence] ?? 'gris'
}

// ─── Héritage & mort ─────────────────────────────────────────────────────────

export function calculerHeritage() {
  return {
    nom:               state.nomPersonnage,
    age_mort:          state.age,
    argent_transmis:   Math.floor(state.argent * 0.5),
    karma_final:       state.karma,
    couche_illegale_max: state.coucheIllegalMax,
  }
}

function karmaDepart(lignee) {
  if (!lignee || lignee.length === 0) return CONFIG.KARMA_DEPART_DEFAUT
  const derniere = lignee[lignee.length - 1]
  let base = CONFIG.KARMA_DEPART_DEFAUT
  if (derniere.couche_illegale_max >= 2) base -= 10
  if (derniere.couche_illegale_max >= 3) base -= 10  // total -20

  // Générations consécutives couche 3
  let consecCouche3 = 0
  for (let i = lignee.length - 1; i >= 0; i--) {
    if (lignee[i].couche_illegale_max >= 3) consecCouche3++
    else break
  }
  if (consecCouche3 >= 2) base -= 15  // total -35
  if (consecCouche3 >= 3) base -= 15  // total -50

  // Rédemption : +5 par génération vertueuse consécutive (sans couche 2+)
  let consecVertueux = 0
  for (let i = lignee.length - 1; i >= 0; i--) {
    if (lignee[i].couche_illegale_max < 2) consecVertueux++
    else break
  }
  base += consecVertueux * 5

  return Math.max(0, Math.min(100, base))
}

export function initialiserNouvelleGeneration() {
  const dernierHeritage     = state.lignee[state.lignee.length - 1]
  const kDepart             = karmaDepart(state.lignee)
  const heritageLogementAchete = state.possessions.logementAchete
  const heritageLogementSlug   = state.possessions.logement

  state.generation += 1
  state.age = CONFIG.AGE_DEPART
  state._ticksDepuisDernierAnniversaire = 0
  state._ticksDepuisLoyer = 0
  state.argent = dernierHeritage ? dernierHeritage.argent_transmis : 0
  state.karma = kDepart
  state.nomPersonnage = ''
  state.bonusUpgrades = 0
  state.upgrades = []
  state.passifs = []
  state.coucheIllegalMax = 0
  state.palierKarma = 'neutre'
  state.xpSecteurs = { commerce: 0, finance: 0, tech: 0, immobilier: 0, btp: 0, influence: 0 }

  // Héritage logement : conservé uniquement si bien acheté
  state.possessions = {
    logement:       heritageLogementAchete ? heritageLogementSlug : 'squat',
    logementAchete: heritageLogementAchete,
    telephone:      false,
    vehicule:       null,
    ordinateur:     false,
    tokens:         0,
    animaux:        [],
    items:          [],
  }

  state.abonnes                  = 0
  state.telephoneCooldowns       = {}
  state._bonheurTempExpiry       = 0
  state._boostXpExpiry           = 0
  state._changementSecteurExpiry = 0
  state.secteurActif             = 'commerce'

  for (const key of Object.keys(state.jauges)) {
    state.jauges[key] = CONFIG.JAUGE_DEPART
  }
}

let _mortDeclenchee = false

function verifierMort() {
  if (_mortDeclenchee) return
  if (state.jauges.sante <= 0 || state.age >= CONFIG.AGE_MORT) {
    _mortDeclenchee = true
    onMort()
  }
}

function tickEvenementsKarma() {
  // ENNEMI_PUBLIC : 2%/tick de subir −15 santé
  if (state.karma >= 0 && state.karma <= 5) {
    if (Math.random() < 0.02) {
      state.jauges.sante = clampJauge(state.jauges.sante - 15)
    }
  }
}

function onMort() {
  const heritage = calculerHeritage()
  state.lignee.push(heritage)
  stopEngine()
  window.dispatchEvent(new CustomEvent('legacy:mort', { detail: { heritage } }))
}

// ─── Boucle principale ────────────────────────────────────────────────────────

let _intervalId = null

export function startEngine() {
  if (_intervalId !== null) return
  _mortDeclenchee = false
  _intervalId = setInterval(tick, CONFIG.TICK_MS)
}

export function stopEngine() {
  if (_intervalId === null) return
  clearInterval(_intervalId)
  _intervalId = null
}

export function isEngineRunning() {
  return _intervalId !== null
}

function tick() {
  tickPassifs()
  tickJauges()
  tickLogement()
  tickAge()
  tickKarma()
  tickCompetence()
  tickEvenementsKarma()
  calculerCashflowNet()
  verifierMort()
}
