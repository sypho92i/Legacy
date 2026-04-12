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

export function calculerRevenuClic() {
  return (
    CONFIG.REVENU_BASE_CLIC
    * getMultiplicateurCompetence(state.competence)
    * getModifKarma(state.karma)
    * getModifBonheur(state.jauges.bonheur)
  )
}

// ─── Étapes du tick ───────────────────────────────────────────────────────────

function tickPassifs() {
  const tauxTotal = state.passifs.reduce((acc, p) => acc + p.tauxParSeconde, 0)
  // Les passifs sont en $/s, le tick est en fraction de seconde
  state.argent += tauxTotal * (CONFIG.TICK_MS / 1000)
}

function tickJauges() {
  const decay = CONFIG.JAUGE_DECAY_PAR_TICK
  for (const jauge of Object.keys(decay)) {
    state.jauges[jauge] = Math.max(
      CONFIG.JAUGE_MIN,
      Math.min(CONFIG.JAUGE_MAX, state.jauges[jauge] - decay[jauge])
    )
  }
}

function tickAge() {
  state._ticksDepuisDernierAnniversaire++
  if (state._ticksDepuisDernierAnniversaire >= CONFIG.TICKS_PAR_AN) {
    state._ticksDepuisDernierAnniversaire = 0
    state.age++
    if (state.age >= CONFIG.AGE_MORT) {
      onMort()
    }
  }
}

function tickKarma() {
  const palier = getPalierKarma(state.karma)
  state.palierKarma = palier.palier
}

function tickCompetence() {
  state.multiplicateurCouleur = CONFIG.COULEUR_COMPETENCE[state.competence] ?? 'gris'
}

// ─── Événement mort ───────────────────────────────────────────────────────────

function onMort() {
  // Arrête la boucle — la logique héritage sera dans un prochain ticket
  stopEngine()
  // Signal UI : le composant racine écoute cet événement
  window.dispatchEvent(new CustomEvent('legacy:mort', { detail: { generation: state.generation } }))
}

// ─── Boucle principale ────────────────────────────────────────────────────────

let _intervalId = null

export function startEngine() {
  if (_intervalId !== null) return
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
}
