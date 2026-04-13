// config.js — toutes les constantes et valeurs de balancing
// Aucun magic number ailleurs dans le code

export const CONFIG = {
  // Moteur
  TICK_MS: 200,                    // intervalle de la boucle de jeu

  // Finances
  REVENU_BASE_CLIC: 1,
  MALUS_PASSIF_TICK: 5,            // €/s déduits des passifs si bonheur < 20

  // Compétence → multiplicateur de clic
  MULTIPLICATEUR_COMPETENCE: {
    1: 1,
    2: 2,
    3: 4,
    4: 8,
    5: 16,
  },

  COULEUR_COMPETENCE: {
    1: 'gris',
    2: 'blanc',
    3: 'jaune',
    4: 'orange',
    5: 'or',
  },

  // Karma — paliers
  PALIERS_KARMA: [
    { palier: 'vertueux',     min: 80,  max: 100, modifProductivite:  0.20 },
    { palier: 'neutre',       min: 40,  max: 79,  modifProductivite:  0.00 },
    { palier: 'louche',       min: 20,  max: 39,  modifProductivite: -0.15 },
    { palier: 'criminel',     min: 5,   max: 19,  modifProductivite: -0.35 },
    { palier: 'ennemiPublic', min: 0,   max: 4,   modifProductivite: -0.60 },
  ],

  // Jauges
  JAUGE_MIN:    0,
  JAUGE_MAX:  100,
  JAUGE_DEPART: 80,

  JAUGE_DECAY_PAR_TICK: {   // dégradation passive par tick (200 ms)
    faim:       0.008,
    hygiene:    0.004,
    bonheur:    0.005,
    sante:      0.002,
    reputation: 0,          // pas de déclin passif — modifiée uniquement par interactions
  },

  // Interactions soustractives entre jauges
  JAUGE_SEUIL_FAIM:              20,   // en dessous → malus sante
  JAUGE_MALUS_SANTE_PAR_TICK:   0.003,
  JAUGE_SEUIL_HYGIENE:           20,   // en dessous → malus reputation
  JAUGE_MALUS_REPUTATION_PAR_TICK: 0.002,

  // Âge
  AGE_DEPART: 18,
  TICKS_PAR_AN: 50,          // 50 ticks × 200 ms = 10 s par an (balancing provisoire)
  AGE_MORT: 80,

  // Héritage
  HERITAGE_ARGENT_MIN: 0.50, // 50% minimum transmis
  HERITAGE_ARGENT_MAX: 0.80, // 80% maximum transmis

  HERITAGE_BOOST_COMPETENCE_PAR_SECTEUR: { min: 0.05, max: 0.08 },
  HERITAGE_BOOST_COMPETENCE_PLAFOND: 0.25,

  // Karma de départ — héritage
  KARMA_DEPART_DEFAUT: 75,

  // Verbe affiché sur le bouton de clic selon le métier actif
  VERBE_METIER: {
    vendeur:     'Conclure une vente',
    // Phase 3+ : tech, finance, BTP, immobilier, influence…
  },
  VERBE_METIER_DEFAUT: 'Travailler',

  // Niveaux par secteur
  NIVEAUX: {
    SEUILS: [0, 100, 400, 1200, 3500], // XP cumulée requise pour niv.1 à 5
    PALIERS_COMMERCE: {
      1: 'Vendeur',
      2: 'Responsable commercial',
      3: 'Franchisé',
      4: 'Directeur régional',
      5: 'Magnat',
    },
    FACTEUR_XP: 1.8,
  },

  METIERS: {
    commerce: {
      upgrades: [
        { id: 'u_c1', nom: 'Costume pro',          effet: '+€5 / clic',            bonusClic: 5,  prerequis: null,   niveauRequis: 1 },
        { id: 'u_c2', nom: 'CRM basique',           effet: '+€12 / clic',           bonusClic: 12, prerequis: 'u_c1', niveauRequis: 2 },
        { id: 'u_c3', nom: 'Technique vente niv.2', effet: '+€30 / clic',           bonusClic: 30, prerequis: 'u_c2', niveauRequis: 2 },
        { id: 'u_c4', nom: 'Bureau propre',          effet: 'Débloque €8/s passif',  passifId: 'p_c1', passifValeur: 8,  prerequis: 'u_c3', niveauRequis: 3 },
        { id: 'u_c5', nom: 'Équipe de 3',            effet: 'Débloque €25/s passif', passifId: 'p_c2', passifValeur: 25, prerequis: 'u_c4', niveauRequis: 4 },
        { id: 'u_c6', nom: 'E-commerce',             effet: 'Débloque €50/s passif', passifId: 'p_c3', passifValeur: 50, prerequis: 'u_c5', niveauRequis: 5 },
      ],
    },
  },
};
