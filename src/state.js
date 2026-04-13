// state.js — source de vérité unique, état global réactif Vue
// Vue est chargé via CDN global — pas d'import ES module
const { reactive } = Vue
import { CONFIG } from './config.js'

export const state = reactive({
  // Identité
  nomPersonnage: 'Héros',

  // Finances
  argent: 0,
  cashflowNet: 0,        // revenus passifs - charges (calculé chaque tick)
  revenuParClic: CONFIG.REVENU_BASE_CLIC,
  passifs: [],           // { id, nom, tauxParSeconde }

  // Compétence & métier
  competence: 1,         // 1 à 5
  metierActif: 'vendeur',
  modeIllegal: false,
  multiplicateurCouleur: CONFIG.COULEUR_COMPETENCE[1],

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

  // Possessions
  possessions: {
    logement:       'squat',
    logementAchete: false,
    vehicule:       null,
    ordinateur:     false,
    tokens:         0,
    animaux:        [],
    items:          [],
  },

  // UI
  menuOuvert: null,      // 'finances' | 'logement' | 'upgrades' | null

  // Compteurs internes
  _ticksDepuisDernierAnniversaire: 0,
  _ticksDepuisLoyer: 0,
})
