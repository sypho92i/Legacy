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
  return Math.max(0.1,
    1 * getModifKarma(state.karma) * getModifBonheur(state.jauges.bonheur)
  )
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
  const totalCharges = 0  // Aucune charge fixe pour l'instant (Ticket 11+)
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
  const dernierHeritage = state.lignee[state.lignee.length - 1]
  const kDepart = karmaDepart(state.lignee)

  state.generation += 1
  state.age = CONFIG.AGE_DEPART
  state._ticksDepuisDernierAnniversaire = 0
  state.argent = dernierHeritage ? dernierHeritage.argent_transmis : 0
  state.karma = kDepart
  state.nomPersonnage = ''
  state.bonusUpgrades = 0
  state.upgrades = []
  state.passifs = []
  state.coucheIllegalMax = 0
  state.palierKarma = 'neutre'
  state.xpSecteurs = { commerce: 0, finance: 0, tech: 0, immobilier: 0, btp: 0, influence: 0 }

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
  tickAge()
  tickKarma()
  tickCompetence()
  tickEvenementsKarma()
  calculerCashflowNet()
  verifierMort()
}
