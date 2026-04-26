// engine.js — boucle de jeu, calculs purs
// Règle : ne touche jamais au DOM, ne lit jamais le DOM
import { CONFIG } from './config.js'
import { state }  from './state.js'

// ─── Helpers de calcul ────────────────────────────────────────────────────────

export function getPalierKarma(karma) {
  return CONFIG.PALIERS_KARMA.find(p => karma >= p.min && karma <= p.max)
    ?? CONFIG.PALIERS_KARMA.find(p => p.palier === 'neutre')
}

export function getPalierReputation() {
  const rep = state.jauges.reputation
  return CONFIG.REPUTATION.find(p => rep >= p.min)
    ?? CONFIG.REPUTATION[CONFIG.REPUTATION.length - 1]
}

function getModificateurReputationInfluence() {
  const rep = state.jauges.reputation
  const entry = CONFIG.REPUTATION_EFFETS.INFLUENCE_MULT.find(e => rep >= e.min)
  return entry?.valeur ?? 1.0
}

export function getModifKarma(karma) {
  return 1 + getPalierKarma(karma).modifProductivite
}

export function getModifBonheur(bonheur) {
  // Linéaire : 50 % bonheur = ×1, 100 % bonheur = ×1.5, 0 % = ×0.5
  return 0.5 + (bonheur / CONFIG.JAUGE_MAX)
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
  const vehiculeBonus = state.possessions.vehicule
    ? (CONFIG.VEHICULES[state.possessions.vehicule]?.bonusClic ?? 0)
    : 0

  if (state.secteurActif === 'finance') {
    const cfg  = CONFIG.METIERS.finance
    const base = Math.random() * (cfg.revenuMax - cfg.revenuMin) + cfg.revenuMin
    const gain = Math.round((base + state.bonusUpgrades + vehiculeBonus) * 100) / 100
    state._dernierGainClic = gain
    return gain
  }
  const revenuBase = CONFIG.METIERS[state.secteurActif]?.revenuBase ?? CONFIG.REVENU_BASE_CLIC
  const gain = (
    (revenuBase + state.bonusUpgrades + vehiculeBonus)
    * getMultiplicateurNiveau(state.secteurActif).valeur
    * getModifKarma(state.karma)
    * getModifBonheur(state.jauges.bonheur)
  )
  state._dernierGainClic = gain

  // BTP : chaque clic accélère le chantier actif
  if (state.secteurActif === 'btp' && state.chantierActif) {
    state.chantierActif.dureeRestante = Math.max(0,
      state.chantierActif.dureeRestante - CONFIG.METIERS.btp.clicAccelere
    )
    if (state.chantierActif.dureeRestante === 0) {
      terminerChantier()
    }
  }

  return gain
}

// ─── Achat d'upgrade ──────────────────────────────────────────────────────────

export function acheterUpgrade(id) {
  const upgrades = CONFIG.METIERS[state.secteurActif ?? 'commerce'].upgrades
  const idx      = upgrades.findIndex(u => u.id === id)
  if (idx === -1) return

  const upgrade = upgrades[idx]
  // Prix explicite (immobilier) ou formule générique (commerce / tech / finance)
  const cout = upgrade.prix !== undefined ? upgrade.prix : Math.round(100 * Math.pow(2.8, idx))

  // Vérifications
  if (state.argent < cout) return
  const prerequisRempli = upgrade.prerequis === null || state.upgrades.some(u => u.id === upgrade.prerequis)
  if (!prerequisRempli) return
  if (state.upgrades.some(u => u.id === id)) return

  // Déduire le coût
  state.argent -= cout

  // Activer l'upgrade
  state.upgrades.push({ id })

  // Appliquer l'effet — supporte structure plate ET imbriquée { effet: { ... } }
  const bonusClic   = upgrade.effet?.bonusClic   ?? upgrade.bonusClic
  const passifId    = upgrade.effet?.passifId    ?? upgrade.passifId
  const passifValeur = upgrade.effet?.passifValeur ?? upgrade.passifValeur

  if (bonusClic) {
    state.bonusUpgrades += bonusClic
  }
  if (passifId) {
    state.passifs.push({ id: passifId, nom: upgrade.nom, tauxParSeconde: passifValeur })
  }
}

// ─── Achat d'item boutique ────────────────────────────────────────────────────

export function acheterItem(id) {
  const item = CONFIG.BOUTIQUE.ITEMS.find(i => i.id === id)
  if (!item) return null
  if (state.argent < item.prix) return null
  state.argent -= item.prix
  state.jauges[item.jauge] = clampJauge(state.jauges[item.jauge] + item.effet)
  return item
}

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

  // Effet abonnés — bonus karma vertueux + modificateur réputation
  if (action.effetAbonnes) {
    const palier = getPalierKarma(state.karma)
    const bonusKarma = palier.palier === 'vertueux' ? 2 : 1
    state.abonnes += Math.round(action.effetAbonnes * bonusKarma * getModificateurReputationInfluence())
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

// ─── Commandes illégales ──────────────────────────────────────────────────────

export const COMMANDES_ILLEGALES = {
  fraude_fiscale: { label: 'Fraude fiscale',  emoji: '🧾', couche: 1, cooldown: 60,
                    gainMin: 500,   gainMax: 2000,  karma: -5,  reputation: -3,  tokens: 0  },
  piratage:       { label: 'Piratage',        emoji: '🔓', couche: 2, cooldown: 120,
                    gainMin: 2000,  gainMax: 8000,  karma: -10, reputation: -8,  tokens: 5  },
  hacking_avance: { label: 'Hacking avancé', emoji: '💀', couche: 3, cooldown: 300,
                    gainMin: 10000, gainMax: 40000, karma: -20, reputation: -15, tokens: 15 },
}

function getCoucheAccessible() {
  if (state.karma < 35 && state.coucheIllegalMax >= 2) return 3
  const anyNiv3 = Object.keys(state.xpSecteurs).some(s => calculerNiveau(s) >= 3)
  if (state.karma < 65 && anyNiv3) return 2
  return 1
}

export function executerCommandeIllegale(id) {
  if (!state.possessions.ordinateur) return { ok: false, raison: 'ordinateur' }
  const cmd = COMMANDES_ILLEGALES[id]
  if (!cmd) return { ok: false, raison: 'inconnue' }

  const coucheMax = getCoucheAccessible()
  if (cmd.couche > coucheMax) return { ok: false, raison: 'couche', coucheRequise: cmd.couche }

  const cooldownKey = 'illegal_' + id
  const now = Date.now()
  if (now < (state.telephoneCooldowns[cooldownKey] ?? 0))
    return { ok: false, raison: 'cooldown' }

  // Appliquer effets
  let gain = Math.round(Math.random() * (cmd.gainMax - cmd.gainMin) + cmd.gainMin)

  // T32 : malus rendement si réputation trop élevée (trop exposé pour agir discrètement)
  const malusReputation = state.jauges.reputation >= CONFIG.REPUTATION_ILLEGAL.MALUS_GAIN_ILLEGAL_REPUTATION_MIN
  if (malusReputation) gain = Math.round(gain * CONFIG.REPUTATION_ILLEGAL.MALUS_GAIN_ILLEGAL_MULT)

  state.argent += gain
  state.karma             = Math.max(0, Math.min(100, state.karma + cmd.karma))
  state.jauges.reputation = clampJauge(state.jauges.reputation + cmd.reputation)
  if (cmd.tokens > 0) state.possessions.tokens += cmd.tokens

  // Mise à jour couche max atteinte
  if (cmd.couche > state.coucheIllegalMax) state.coucheIllegalMax = cmd.couche

  // T32 : risque de scandale si réputation élevée
  if (state.jauges.reputation >= CONFIG.REPUTATION_ILLEGAL.RISQUE_SCANDALE_REPUTATION_MIN
      && Math.random() < CONFIG.REPUTATION_ILLEGAL.RISQUE_SCANDALE_PROBA) {
    state.jauges.reputation = clampJauge(state.jauges.reputation + CONFIG.REPUTATION_ILLEGAL.SCANDALE_REPUTATION)
    state.jauges.bonheur    = clampJauge(state.jauges.bonheur    + CONFIG.REPUTATION_ILLEGAL.SCANDALE_BONHEUR)
    window.dispatchEvent(new CustomEvent('legacy:scandale-illegal', {
      detail: { label: 'Scandale', cmd: id }
    }))
  }

  // Cooldown — même pattern que telephoneCooldowns
  state.telephoneCooldowns[cooldownKey] = now + cmd.cooldown * 1000

  return { ok: true, gain, malusReputation }
}

// ─── Véhicules ────────────────────────────────────────────────────────────────

export function vehiculePermetSecteur(secteurCible) {
  const zone = CONFIG.MAP.ZONES[secteurCible]
  if (!zone || !zone.vehiculeRequis) return true
  const ordre    = CONFIG.ORDRE_VEHICULES
  const idxActuel = ordre.indexOf(state.possessions.vehicule ?? '')
  const idxRequis = ordre.indexOf(zone.vehiculeRequis)
  return idxActuel >= idxRequis
}

export function acheterVehicule(id) {
  const cfg = CONFIG.VEHICULES[id]
  if (!cfg) return { ok: false, raison: 'unknown' }
  if (state.argent < cfg.prix) return { ok: false, raison: 'argent' }

  // Annuler effets de l'ancien véhicule
  if (state.possessions.vehicule) {
    const ancien = CONFIG.VEHICULES[state.possessions.vehicule]
    if (ancien) {
      state.karma            = Math.min(100, Math.max(0, state.karma - ancien.karma))
      state.jauges.reputation = Math.max(0, state.jauges.reputation - ancien.reputation)
    }
  }

  // Appliquer nouveau véhicule
  state.argent -= cfg.prix
  state.possessions.vehicule = id
  state.karma            = Math.max(0,   Math.min(100, state.karma + cfg.karma))
  state.jauges.reputation = Math.min(100, Math.max(0,   state.jauges.reputation + cfg.reputation))

  return { ok: true }
}

// ─── Carte / Secteurs ─────────────────────────────────────────────────────────

export function calculerGainInfluence(dureeSeconde) {
  if (dureeSeconde < CONFIG.INFLUENCE.APPUI_MIN) return { abonnes: 0, argent: 0 }
  const bonusUpgradesInfluence = (CONFIG.METIERS.influence.upgrades ?? [])
    .filter(u => state.upgrades.some(up => up.id === u.id) && u.effet.bonusAbonnes)
    .reduce((acc, u) => acc + u.effet.bonusAbonnes, 0)
  const gainAbonnesBase = Math.round(50 + state.abonnes * 0.01)
  const gainAbonnes = Math.round(
    gainAbonnesBase * (1 + bonusUpgradesInfluence)
    * getModificateurReputationInfluence()
    * Math.exp(-((dureeSeconde - CONFIG.INFLUENCE.CIBLE_SECONDES) ** 2)
      / (2 * CONFIG.INFLUENCE.SIGMA ** 2))
  )
  const gainArgent = Math.round(state.abonnes * CONFIG.METIERS.influence.tauxMonetisation)
  return { abonnes: gainAbonnes, argent: gainArgent }
}

export function changerSecteur(secteurCible) {
  if (secteurCible === state.secteurActif)
    return { ok: false, raison: 'same' }
  if (secteurCible === 'influence' &&
      (!state.possessions.telephone || !state.possessions.ordinateur))
    return { ok: false, raison: 'possessions',
      message: "Pour influencer, faut d'abord avoir un téléphone et un ordi." }
  if (!vehiculePermetSecteur(secteurCible))
    return { ok: false, raison: 'vehicule', message: CONFIG.MAP.MESSAGES_BLOCAGE_VEHICULE[secteurCible] }
  state.secteurActif = secteurCible
  return { ok: true }
}

// ─── Campus — formations ──────────────────────────────────────────────────────

export function inscrireFormation(id) {
  const f = CONFIG.FORMATIONS.find(f => f.id === id)
  if (!f) return { ok: false, raison: 'unknown' }
  if (state.formationActive) return { ok: false, raison: 'en_cours' }
  if (state.argent < f.cout) return { ok: false, raison: 'argent' }
  state.argent -= f.cout
  state.formationActive = {
    id:            f.id,
    secteur:       f.secteur,
    label:         f.label,
    dureeRestante: f.duree,
    dureeInitiale: f.duree,
    gainXP:        f.gainXP,
  }
  return { ok: true }
}

export function etudierFormation() {
  if (!state.formationActive) return { ok: false }
  state.formationActive.dureeRestante = Math.max(0, state.formationActive.dureeRestante - 2)
  if (state.formationActive.dureeRestante === 0) terminerFormation()
  return { ok: true }
}

function terminerFormation() {
  const f = state.formationActive
  if (!f) return
  state.xpSecteurs[f.secteur] = (state.xpSecteurs[f.secteur] ?? 0) + f.gainXP
  if (!state.formations.includes(f.secteur)) state.formations.push(f.secteur)
  state.formationActive = null
  window.dispatchEvent(new CustomEvent('legacy:formation-complete', {
    detail: { secteur: f.secteur, gainXP: f.gainXP, label: f.label },
  }))
}

function tickFormation() {
  if (!state.formationActive) return
  state.formationActive.dureeRestante -= CONFIG.TICK_MS / 1000
  if (state.formationActive.dureeRestante <= 0) {
    state.formationActive.dureeRestante = 0
    terminerFormation()
  }
}

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
  return state.passifs.reduce((acc, p) => {
    let taux = tauxPassifPlafonné(p)
    if (p.id.startsWith('passif_immo_')) taux *= (state._immoPassifMulti ?? 1.0)
    return acc + taux
  }, 0)
}

// T33 — revenus passifs des biens d'investissement (affectés par _immoPassifMulti comme les autres immo)
function getTauxInvestImmo() {
  if (state.investissementsImmobiliers.length === 0) return 0
  const base = state.investissementsImmobiliers.reduce((s, inv) => s + inv.revenuPassif, 0)
  return base * (state._immoPassifMulti ?? 1.0)
}

// ─── Cashflow ─────────────────────────────────────────────────────────────────

export function calculerCashflowNet() {
  const totalRevenus   = getTauxPassifTotal() + getTauxInvestImmo()
  const chargeLogement = CONFIG.LOGEMENTS[state.possessions.logement]?.charge ?? 0
  const chargeVehicule = state.possessions.vehicule
    ? (CONFIG.VEHICULES[state.possessions.vehicule]?.chargeMensuelle ?? 0)
    : 0
  state.cashflowNet = totalRevenus - chargeLogement - chargeVehicule
}

// ─── Étapes du tick ───────────────────────────────────────────────────────────

function tickPassifs() {
  const tauxTotal = getTauxPassifTotal() + getTauxInvestImmo()
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

// ─── Héritage & mort ─────────────────────────────────────────────────────────

export function calculerHeritage() {
  const secteurPrincipal = Object.entries(state.xpSecteurs)
    .reduce((max, [s, xp]) => xp > max[1] ? [s, xp] : max, ['commerce', 0])[0]
  // T33 : les biens d'investissement sont liquidés à leur valeur courante avant calcul de l'héritage
  const valeurInvestissements = state.investissementsImmobiliers
    .reduce((s, inv) => s + inv.valeurCourante, 0)
  return {
    nom:               state.nomPersonnage,
    age_mort:          state.age,
    argent_transmis:   Math.floor((state.argent + valeurInvestissements) * 0.5),
    karma_final:       state.karma,
    couche_illegale_max: state.coucheIllegalMax,
    secteurPrincipal,
    generationNumero:  state.generation,
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

export function initialiserNouvelleGeneration(boostChoisi = null) {
  // Boost intergénérationnel — appliqué avant le reset, persist dans boostCompetences
  if (boostChoisi && boostChoisi in state.boostCompetences) {
    state.boostCompetences[boostChoisi] += 1
  }
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
  state._immoEvenementExpiry     = 0
  state._immoPassifMulti         = 1.0
  state._immoPassifMultiExpiry   = 0
  state.chantierActif            = null
  state.btpCompletes             = []
  state._influenceAppuiDebut     = 0
  state.secteurActif             = 'commerce'
  state.formationActive          = null
  state.formations               = []
  state.secteursVisites          = ['commerce']
  state._dernierEvenementTick    = 0
  state._ticksDepuisVerifEvenement = 0
  _tickTotal                     = 0
  state.marcheNoir.dealsActifs      = []
  state.marcheNoir._dernierRefreshS = 0
  state.marcheNoir._immuniteExpiry  = 0
  state.investissementsImmobiliers  = []
  _ticksImmoReeval                  = 0

  for (const key of Object.keys(state.jauges)) {
    state.jauges[key] = CONFIG.JAUGE_DEPART
  }
}

// ─── BTP — chantiers ─────────────────────────────────────────────────────────

export function lancerChantier(id) {
  if (state.secteurActif !== 'btp')      return { ok: false, raison: 'mauvais_secteur' }
  if (state.chantierActif !== null)       return { ok: false, raison: 'chantier_en_cours' }
  const cfg = CONFIG.METIERS.btp.upgrades.find(u => u.id === id)
  if (!cfg)                               return { ok: false, raison: 'unknown' }
  if (calculerNiveau('btp') < cfg.niveauRequis)  return { ok: false, raison: 'locked' }
  if (cfg.prerequis !== null && !state.btpCompletes.includes(cfg.prerequis))
    return { ok: false, raison: 'locked' }

  state.chantierActif = {
    id,
    label:         cfg.label,
    dureeRestante: cfg.duree,
    dureeInitiale: cfg.duree,
    recompense:    cfg.recompense,
  }
  return { ok: true }
}

export function terminerChantier() {
  if (!state.chantierActif) return 0
  const { recompense, id } = state.chantierActif
  state.argent += recompense
  if (!state.btpCompletes.includes(id)) {
    state.btpCompletes.push(id)
  }
  state.chantierActif = null
  window.dispatchEvent(new CustomEvent('legacy:btp-complete', { detail: { gain: recompense } }))
  return recompense
}

function tickBtp() {
  if (!state.chantierActif) return
  state.chantierActif.dureeRestante -= CONFIG.TICK_MS / 1000
  if (state.chantierActif.dureeRestante <= 0) {
    state.chantierActif.dureeRestante = 0
    terminerChantier()
  }
}

// ─── Immobilier — événements ──────────────────────────────────────────────────

export function declencherEvenementImmo() {
  const evts = CONFIG.IMMOBILIER.EVENEMENTS
  const ids  = Object.keys(evts).filter(k => k !== 'INTERVALLE_MIN' && k !== 'INTERVALLE_MAX')

  // Tirage pondéré
  const total = ids.reduce((s, k) => s + evts[k].proba, 0)
  let r = Math.random() * total
  let choisi = ids[0]
  for (const id of ids) {
    r -= evts[id].proba
    if (r <= 0) { choisi = id; break }
  }

  const evt   = evts[choisi]
  const effet = evt.effet

  if (effet.argentMin !== undefined) {
    const montant = Math.round(Math.random() * (effet.argentMax - effet.argentMin) + effet.argentMin)
    state.argent += montant
  }
  if (effet.argentFlat !== undefined) {
    state.argent += effet.argentFlat
  }
  if (effet.passifMulti !== undefined) {
    state._immoPassifMulti       = effet.passifMulti
    state._immoPassifMultiExpiry = Date.now() + effet.duree * 1000
  }

  // Planifier prochain événement
  const intervalle = evts.INTERVALLE_MIN +
    Math.random() * (evts.INTERVALLE_MAX - evts.INTERVALLE_MIN)
  state._immoEvenementExpiry = Date.now() + intervalle * 1000

  window.dispatchEvent(new CustomEvent('legacy:immo-event', {
    detail: { id: choisi, label: evt.label, emoji: evt.emoji }
  }))

  return { id: choisi, label: evt.label, emoji: evt.emoji }
}

function tickImmo() {
  // Reset passif multi expiré (indépendant du secteur actif)
  if (state._immoPassifMultiExpiry > 0 && Date.now() >= state._immoPassifMultiExpiry) {
    state._immoPassifMulti       = 1.0
    state._immoPassifMultiExpiry = 0
  }

  if (state.secteurActif !== 'immobilier') return

  if (state._immoEvenementExpiry === 0) {
    state._immoEvenementExpiry = Date.now() +
      CONFIG.IMMOBILIER.EVENEMENTS.INTERVALLE_MIN * 1000
    return
  }

  if (Date.now() >= state._immoEvenementExpiry) {
    declencherEvenementImmo()
  }
}

let _mortDeclenchee    = false
let _tickTotal         = 0   // compteur absolu de ticks — reset à chaque génération
let _ticksImmoReeval   = 0   // compteur réévaluation biens investissement — reset à chaque génération

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
  window._recapGeneration = heritage
  stopEngine()
  window.dispatchEvent(new CustomEvent('legacy:mort', { detail: { heritage } }))
}

// ─── Événements aléatoires ───────────────────────────────────────────────────

function evaluerConditions(cond) {
  if (!cond) return true
  if (cond.karmaMin        !== undefined && state.karma                   < cond.karmaMin)        return false
  if (cond.karmaMax        !== undefined && state.karma                   > cond.karmaMax)        return false
  if (cond.argentMin       !== undefined && state.argent                  < cond.argentMin)       return false
  if (cond.abonnesMin      !== undefined && state.abonnes                 < cond.abonnesMin)      return false
  if (cond.hygieneMax      !== undefined && state.jauges.hygiene          > cond.hygieneMax)      return false
  if (cond.reputationMin   !== undefined && state.jauges.reputation       < cond.reputationMin)   return false
  if (cond.reputationMax   !== undefined && state.jauges.reputation       > cond.reputationMax)   return false
  if (cond.secteurActif    !== undefined && state.secteurActif           !== cond.secteurActif)   return false
  if (cond.coucheIllegalMin !== undefined && state.coucheIllegalMax       < cond.coucheIllegalMin) return false
  if (cond.coucheMin       !== undefined && state.coucheIllegalMax       < cond.coucheMin)        return false
  if (cond.possessions     !== undefined && !state.possessions[cond.possessions])                 return false
  if (cond.niveauMin       !== undefined && calculerNiveau(state.secteurActif) < cond.niveauMin) return false
  return true
}

export function appliquerEvenement(event) {
  const e = event.effets
  if (e.argent         !== undefined) state.argent   = Math.max(0, state.argent + e.argent)
  if (e.argentPourcent !== undefined) state.argent   = Math.max(0, state.argent * (1 + e.argentPourcent))
  if (e.abonnes        !== undefined) state.abonnes  = Math.max(0, state.abonnes + e.abonnes)
  if (e.abonnesPourcent !== undefined) state.abonnes = Math.max(0, Math.floor(state.abonnes * (1 + e.abonnesPourcent)))
  if (e.karma          !== undefined) state.karma    = Math.max(0, Math.min(100, state.karma + e.karma))
  for (const jauge of ['bonheur', 'sante', 'hygiene', 'reputation']) {
    if (e[jauge] !== undefined) state.jauges[jauge] = clampJauge(state.jauges[jauge] + e[jauge])
  }
  state._dernierEvenementTick = _tickTotal
  window.dispatchEvent(new CustomEvent('legacy:evenement', { detail: { event } }))
}

function tickEvenements() {
  if (_mortDeclenchee) return
  _tickTotal++
  state._ticksDepuisVerifEvenement++
  if (state._ticksDepuisVerifEvenement < CONFIG.EVENEMENTS.TICK_VERIFICATION) return
  state._ticksDepuisVerifEvenement = 0
  if (_tickTotal - state._dernierEvenementTick < CONFIG.EVENEMENTS.COOLDOWN_GLOBAL_TICKS) return
  if (Math.random() > CONFIG.EVENEMENTS.PROBA_PAR_TIRAGE) return

  const immunite   = Date.now() / 1000 < state.marcheNoir._immuniteExpiry
  const eligibles = CONFIG.EVENEMENTS.LISTE.filter(ev =>
    evaluerConditions(ev.conditions) &&
    !(immunite && (ev.gravite === 'negatif' || ev.gravite === 'majeur'))
  )
  if (eligibles.length === 0) return

  const total = eligibles.reduce((s, ev) => s + ev.poids, 0)
  let r = Math.random() * total
  let choisi = eligibles[0]
  for (const ev of eligibles) { r -= ev.poids; if (r <= 0) { choisi = ev; break } }

  appliquerEvenement(choisi)
}

// ─── Marché noir ─────────────────────────────────────────────────────────────

function _tiragePondere(pool) {
  const total = pool.reduce((s, d) => s + d.poids, 0)
  let r = Math.random() * total
  for (const d of pool) { r -= d.poids; if (r <= 0) return d }
  return pool[pool.length - 1]
}

export function genererDeals() {
  const now = Date.now() / 1000
  const eligible = CONFIG.MARCHE_NOIR.DEALS.filter(d => evaluerConditions(d.conditions))
  const nb   = Math.min(CONFIG.MARCHE_NOIR.NB_DEALS_ACTIFS, eligible.length)
  const pool = [...eligible]
  const choisis = []
  for (let i = 0; i < nb; i++) {
    if (pool.length === 0) break
    const d = _tiragePondere(pool)
    choisis.push({ ...d, expiryS: now + CONFIG.MARCHE_NOIR.DUREE_DEAL_S, id_instance: Math.random() })
    pool.splice(pool.indexOf(d), 1)
  }
  state.marcheNoir.dealsActifs      = choisis
  state.marcheNoir._dernierRefreshS = now
}

export function accepterDeal(idInstance) {
  if (state.coucheIllegalMax < CONFIG.MARCHE_NOIR.DEBLOCKAGE_COUCHE)
    return { ok: false, raison: 'couche' }

  const idx = state.marcheNoir.dealsActifs.findIndex(d => d.id_instance === idInstance)
  if (idx === -1) return { ok: false, raison: 'introuvable' }

  const deal = state.marcheNoir.dealsActifs[idx]
  const now  = Date.now() / 1000
  if (now > deal.expiryS) return { ok: false, raison: 'expire' }

  // Vérifier affordabilité argent
  const cout = deal.cout
  if (cout.argent !== undefined && state.argent < cout.argent) return { ok: false, raison: 'argent' }

  // Appliquer cout
  if (cout.argent         !== undefined) state.argent = Math.max(0, state.argent - cout.argent)
  if (cout.argentPourcent !== undefined) state.argent = Math.max(0, state.argent * (1 - cout.argentPourcent))
  if (cout.karma          !== undefined) state.karma  = Math.max(0, Math.min(100, state.karma + cout.karma))

  // Appliquer gain
  const gain = deal.gain
  if (gain.argent          !== undefined) state.argent  = Math.max(0, state.argent + gain.argent)
  if (gain.argentPourcent  !== undefined) state.argent  = Math.max(0, state.argent * (1 + gain.argentPourcent))
  if (gain.argentAleatoire !== undefined) {
    const [min, max] = gain.argentAleatoire
    state.argent += Math.floor(Math.random() * (max - min) + min)
  }
  if (gain.karma      !== undefined) state.karma = Math.max(0, Math.min(100, state.karma + gain.karma))
  if (gain.abonnes    !== undefined) state.abonnes = Math.max(0, state.abonnes + gain.abonnes)
  if (gain.reputation !== undefined) state.jauges.reputation = clampJauge(state.jauges.reputation + gain.reputation)
  if (gain.immuniteEvenementsS !== undefined)
    state.marcheNoir._immuniteExpiry = now + gain.immuniteEvenementsS

  if (gain.formationOfferte) {
    const disponibles = Object.keys(state.xpSecteurs).filter(s => !state.formations.includes(s))
    if (disponibles.length > 0)
      state.formations.push(disponibles[Math.floor(Math.random() * disponibles.length)])
    // Si toutes déjà obtenues : coût payé, rien de gagné — comportement attendu
  }

  if (gain.vehiculeOffert) {
    const ordre     = CONFIG.ORDRE_VEHICULES
    const idxActuel = ordre.indexOf(state.possessions.vehicule ?? '')
    const prochain  = ordre[idxActuel + 1]   // undefined si déjà supercar
    if (prochain) {
      const ancien = state.possessions.vehicule
        ? CONFIG.VEHICULES[state.possessions.vehicule] : null
      if (ancien) {
        state.karma = Math.min(100, Math.max(0, state.karma - ancien.karma))
        state.jauges.reputation = Math.max(0, state.jauges.reputation - ancien.reputation)
      }
      state.possessions.vehicule = prochain
      const cfg = CONFIG.VEHICULES[prochain]
      if (cfg) {
        state.karma = Math.max(0, Math.min(100, state.karma + cfg.karma))
        state.jauges.reputation = clampJauge(state.jauges.reputation + cfg.reputation)
      }
    }
    // Si déjà supercar : coût payé, rien de gagné
  }

  // Retirer deal accepté et générer un remplaçant individuel
  state.marcheNoir.dealsActifs.splice(idx, 1)
  const restantsIds = state.marcheNoir.dealsActifs.map(d => d.id)
  const pool = CONFIG.MARCHE_NOIR.DEALS.filter(d =>
    !restantsIds.includes(d.id) && evaluerConditions(d.conditions)
  )
  if (pool.length > 0) {
    const nouveau = _tiragePondere(pool)
    state.marcheNoir.dealsActifs.push({
      ...nouveau, expiryS: now + CONFIG.MARCHE_NOIR.DUREE_DEAL_S, id_instance: Math.random(),
    })
  }

  window.dispatchEvent(new CustomEvent('legacy:deal-accepte', { detail: { deal } }))
  return { ok: true, deal }
}

function tickMarcheNoir() {
  if (state.coucheIllegalMax < CONFIG.MARCHE_NOIR.DEBLOCKAGE_COUCHE) return
  const now = Date.now() / 1000

  // Purger les deals expirés
  state.marcheNoir.dealsActifs = state.marcheNoir.dealsActifs.filter(d => now < d.expiryS)

  // Premier accès : générer immédiatement
  if (state.marcheNoir._dernierRefreshS === 0) { genererDeals(); return }

  // Refresh complet si cooldown dépassé
  if (now - state.marcheNoir._dernierRefreshS >= CONFIG.MARCHE_NOIR.COOLDOWN_REFRESH_S)
    genererDeals()
}

// ─── Immobilier avancé — achat-revente (T33) ─────────────────────────────────

export function acheterInvestissementImmobilier(idBien) {
  const bien = CONFIG.IMMOBILIER_AVANCE.BIENS.find(b => b.id === idBien)
  if (!bien) return { ok: false, raison: 'unknown' }
  if (state.argent < bien.prix) return { ok: false, raison: 'argent' }
  state.argent -= bien.prix
  state.investissementsImmobiliers.push({
    idInstance:     Math.random().toString(36).slice(2),
    idBien:         bien.id,
    label:          bien.label,
    prixAchat:      bien.prix,
    valeurCourante: bien.prix,
    revenuPassif:   bien.revenuPassif,
  })
  return { ok: true }
}

export function revendreInvestissementImmobilier(idInstance) {
  const idx = state.investissementsImmobiliers.findIndex(i => i.idInstance === idInstance)
  if (idx === -1) return { ok: false, raison: 'introuvable' }
  const inv       = state.investissementsImmobiliers[idx]
  const gain      = Math.round(inv.valeurCourante)
  const plusValue = gain - inv.prixAchat
  state.argent   += gain
  state.investissementsImmobiliers.splice(idx, 1)
  return { ok: true, gain, plusValue }
}

function tickInvestissementsImmobiliers() {
  if (state.investissementsImmobiliers.length === 0) return
  _ticksImmoReeval++
  if (_ticksImmoReeval < CONFIG.IMMOBILIER_AVANCE.TICKS_PAR_REEVAL) return
  _ticksImmoReeval = 0

  const niveauImmo   = calculerNiveau('immobilier')
  const bonusNiveau  = Math.max(0, (niveauImmo - 1) * CONFIG.IMMOBILIER_AVANCE.BONUS_NIVEAU_PAR_NV)
  const variation_range = CONFIG.IMMOBILIER_AVANCE.VARIATION_MAX - CONFIG.IMMOBILIER_AVANCE.VARIATION_MIN

  for (const inv of state.investissementsImmobiliers) {
    const variation = CONFIG.IMMOBILIER_AVANCE.VARIATION_MIN
      + Math.random() * variation_range
      + bonusNiveau
    // Plancher : l'investissement ne peut pas descendre sous 40% du prix d'achat
    inv.valeurCourante = Math.max(
      Math.round(inv.prixAchat * 0.4),
      Math.round(inv.valeurCourante * (1 + variation))
    )
  }
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
  tickImmo()
  tickBtp()
  tickFormation()
  tickAge()
  tickKarma()
  tickEvenementsKarma()
  tickEvenements()
  tickMarcheNoir()
  tickInvestissementsImmobiliers()
  calculerCashflowNet()
  verifierMort()
}

// ─── Exposition globale (debug console + appels cross-module) ─────────────────
Object.assign(window, {
  acheterUpgrade,
  acheterItem,
  louerLogement,
  acheterLogement,
  acheterTelephone,
  executerActionTelephone,
  acheterOrdinateur,
  acheterTokens,
  executerCommande,
  acheterVehicule,
  vehiculePermetSecteur,
  changerSecteur,
  inscrireFormation,
  etudierFormation,
  lancerChantier,
  terminerChantier,
  declencherEvenementImmo,
  calculerGainInfluence,
  executerCommandeIllegale,
  appliquerEvenement,
  genererDeals,
  accepterDeal,
  getPalierReputation,
  acheterInvestissementImmobilier,
  revendreInvestissementImmobilier,
})
