// state.js — source de vérité unique, état global réactif Vue
// Vue est chargé via CDN global — pas d'import ES module
const { reactive } = Vue
import { CONFIG } from './config.js'

export const state = reactive({
  // Identité
  nomPersonnage: 'Héros',

  // Finances
  argent: 100000,
  cashflowNet: 0,        // revenus passifs - charges (calculé chaque tick)
  revenuParClic: CONFIG.REVENU_BASE_CLIC,
  passifs: [],           // { id, nom, tauxParSeconde }

  // Métier
  metierActif: 'vendeur',
  modeIllegal: false,

  // Upgrades
  upgrades: [],          // { id }
  bonusUpgrades: 0,      // cumul additif des bonus clic achetés

  // XP par secteur
  secteurActif: 'commerce',
  xpSecteurs: {
    commerce:    0,
    finance:     0,
    tech:        0,
    immobilier:  0,
    btp:         0,
    influence:   0,
  },

  // Jauges personnage (0-100)
  jauges: {
    faim:       CONFIG.JAUGE_DEPART,
    hygiene:    CONFIG.JAUGE_DEPART,
    sante:      CONFIG.JAUGE_DEPART,
    bonheur:    CONFIG.JAUGE_DEPART,
    reputation: CONFIG.JAUGE_DEPART,
  },

  // Karma
  karma: CONFIG.KARMA_DEPART_DEFAUT,
  palierKarma: 'neutre',

  // Génération & héritage
  generation: 1,
  age: CONFIG.AGE_DEPART,
  coucheIllegalMax: 0,     // 0 | 1 | 2 | 3 — max atteint dans cette vie
  lignee: [],              // [{ nom, age_mort, argent_transmis, karma_final, couche_illegale_max }]
  boostCompetences: { commerce: 0, finance: 0, tech: 0, immobilier: 0, btp: 0, influence: 0 },

  // Possessions
  possessions: {
    logement:       'squat',
    logementAchete: false,
    telephone:      false,
    vehicule:       null,
    ordinateur:     false,
    tokens:         0,
    animaux:        [],
    items:          [],
  },

  // Téléphone & réseaux sociaux
  abonnes: 0,
  telephoneCooldowns: {},   // { action_id: timestampExpiry ms }

  // UI
  menuOuvert: null,      // 'finances' | 'logement' | 'upgrades' | 'telephone' | null

  // Compteurs internes
  _ticksDepuisDernierAnniversaire: 0,
  _ticksDepuisLoyer: 0,
  _bonheurTempExpiry: 0,    // timestamp expiry boost bonheur jeux_mobile
  _boostXpExpiry: 0,            // timestamp expiry boost XP commande recherche
  _dernierGainClic: 0,          // dernier revenu clic brut (feedback couleur finance)
  _immoEvenementExpiry: 0,      // timestamp prochain événement immo
  _immoPassifMulti: 1.0,        // multiplicateur temporaire passifs immo
  _immoPassifMultiExpiry: 0,    // timestamp fin du multiplicateur immo

  // BTP — chantiers
  chantierActif: null,          // { id, label, dureeRestante, dureeInitiale, recompense } | null
  btpCompletes: [],             // ids des chantiers terminés au moins une fois (déblocage chaîne)

  // Influence — hold-to-release
  _influenceAppuiDebut: 0,      // timestamp ms du début d'appui (0 = pas d'appui)

  // Formations
  formationActive: null,        // { id, secteur, label, dureeRestante, dureeInitiale, gainXP } | null
  formations: [],               // slugs secteurs débloqués par formation — reset à chaque génération
  secteursVisites: ['commerce'],// secteurs ayant déjà payé le coût d'installation
})
