// state.js — source de vérité unique, état global réactif Vue
// Vue est chargé via CDN global — pas d'import ES module
const { reactive } = Vue
import { CONFIG } from './config.js'

export const state = reactive({
  // Finances
  argent: 0,
  revenuParClic: CONFIG.REVENU_BASE_CLIC,
  passifs: [],           // { id, nom, tauxParSeconde }

  // Compétence & métier
  competence: 1,         // 1 à 5
  metierActif: 'vendeur',
  modeIllegal: false,
  multiplicateurCouleur: CONFIG.COULEUR_COMPETENCE[1],

  // Upgrades
  upgrades: [],          // { id, nom, cout, effet, debloque, prerequis }

  // Jauges personnage (0-100)
  jauges: {
    faim:       CONFIG.JAUGE_MAX,
    hygiene:    CONFIG.JAUGE_MAX,
    sante:      CONFIG.JAUGE_MAX,
    bonheur:    CONFIG.JAUGE_MAX,
    reputation: 50,
  },

  // Karma
  karma: CONFIG.KARMA_DEPART_DEFAUT,
  palierKarma: 'neutre',

  // Génération & héritage
  generation: 1,
  age: CONFIG.AGE_DEPART,
  lignee: {
    reputation: 0,
    karmaDepart: CONFIG.KARMA_DEPART_DEFAUT,
    boostCompetences: {},   // { secteur: pourcentage }
    logement: null,
    toucheCouche2: false,
    toucheCouche3: false,
    generationsVertueuses: 0,
  },

  // UI
  menuOuvert: null,      // 'finances' | 'boutique' | 'upgrades' | null

  // Compteur interne pour le calcul du vieillissement
  _ticksDepuisDernierAnniversaire: 0,
})
