// config.js — toutes les constantes et valeurs de balancing
// Aucun magic number ailleurs dans le code

export const CONFIG = {
  // Moteur
  TICK_MS: 200,                    // intervalle de la boucle de jeu
  DEBUG: false,                    // active les outils de débogage en jeu

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

  // Multiplicateurs par niveau — valeur dynamique du clic
  MULTIPLICATEURS_NIVEAU: [
    { niveau: 1, valeur: 1.0,  couleur: '#888888', label: '×1.0' }, // gris
    { niveau: 2, valeur: 1.5,  couleur: '#ffffff', label: '×1.5' }, // blanc
    { niveau: 3, valeur: 2.2,  couleur: '#f5c518', label: '×2.2' }, // jaune
    { niveau: 4, valeur: 3.2,  couleur: '#ff8c00', label: '×3.2' }, // orange
    { niveau: 5, valeur: 5.0,  couleur: '#ff2200', label: '×5.0' }, // rouge/or
  ],

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
    faim:       0.024,
    hygiene:    0.012,
    bonheur:    0.015,
    sante:      0.006,
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
    vendeur:  'Conclure une vente',
    tech:     'Livrer une feature',
    finance:  'Passer un ordre',
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
    PALIERS_TECH: {
      1: 'Développeur junior',
      2: 'Développeur senior',
      3: 'Tech Lead',
      4: 'CTO',
      5: 'Fondateur',
    },
    PALIERS_FINANCE: {
      1: 'Stagiaire',
      2: 'Analyste',
      3: 'Trader',
      4: 'Gestionnaire de fonds',
      5: 'Magnat',
    },
    FACTEUR_XP: 1.8,
  },

  // Logements
  LOGEMENTS: {
    squat:       { type: 'defaut',   nom: 'Squat',       cout: 0,        charge: 0,    bonheur: 0,  transmissible: false },
    studio:      { type: 'location', nom: 'Studio',      cout: 0,        charge: 300,  bonheur: 5,  transmissible: false },
    appartement: { type: 'location', nom: 'Appartement', cout: 0,        charge: 700,  bonheur: 12, transmissible: false },
    loft:        { type: 'location', nom: 'Loft',        cout: 0,        charge: 1500, bonheur: 20, transmissible: false },
    maison:      { type: 'achat',    nom: 'Maison',      cout: 80000,    charge: 200,  bonheur: 30, transmissible: true  },
    villa:       { type: 'achat',    nom: 'Villa',       cout: 300000,   charge: 500,  bonheur: 45, transmissible: true  },
    penthouse:   { type: 'achat',    nom: 'Penthouse',   cout: 1000000,  charge: 1500, bonheur: 60, transmissible: true  },
  },

  LOGEMENT_TICK_PRELEVEMENT: 25, // toutes les 25 ticks = ~6 mois de jeu

  JAUGES_MALUS_SQUAT: {
    reputation_par_tick: 0.005,
    hygiene_decay_bonus: 0.008, // s'ajoute au decay normal
    bonheur_plafond: 40,
  },

  EXPULSION: {
    choc_reputation: -15,
    choc_bonheur:    -20,
  },

  // Boutique — items consommables
  BOUTIQUE: {
    TELEPHONE:   { prix: 1000 },
    ORDINATEUR:  { prix: 10000 },
    ITEMS: [
      { id: 'repas_simple',  label: 'Repas simple',         prix: 10, jauge: 'faim',    effet: 40 },
      { id: 'repas_correct', label: 'Repas correct',        prix: 25, jauge: 'faim',    effet: 70 },
      { id: 'douche',        label: 'Douche',               prix: 5,  jauge: 'hygiene', effet: 50 },
      { id: 'medecin',       label: 'Consultation médecin', prix: 50, jauge: 'sante',   effet: 35 },
      { id: 'loisir',        label: 'Activité loisir',      prix: 30, jauge: 'bonheur', effet: 40 },
    ],
  },

  // Ordinateur — tokens, commandes
  ORDINATEUR: {
    PACKS_TOKENS: [
      { quantite: 5,  prixBase: 500  },
      { quantite: 10, prixBase: 900  },
      { quantite: 20, prixBase: 1600 },
    ],
    MULTIPLICATEURS_GENERATION: { 1: 1.0, 2: 1.5, 3: 2.2, defaut: 3.0 },
    MULTIPLICATEURS_AGE: [
      { min: 18, max: 30,  multi: 1.0 },
      { min: 30, max: 50,  multi: 1.3 },
      { min: 50, max: 70,  multi: 1.6 },
      { min: 70, max: 999, multi: 2.0 },
    ],
    COMMANDES: {
      bourse:        { tokens: 1, legal: true, label: 'Jouer en bourse',  emoji: '📈',
                       effet: { passifId: 'passif_bourse', passifTaux: 2, passifMax: 10 } },
      don_caritatif: { tokens: 1, legal: true, label: 'Don caritatif',    emoji: '🤝',
                       effet: { karma: 8, reputation: 10 } },
      recherche:     { tokens: 1, legal: true, label: 'Recherche',        emoji: '🔬',
                       effet: { boostXpDuree: 60, boostXpMulti: 1.20 } },
    },
  },

  // Téléphone — actions réseau social
  TELEPHONE: {
    ACTIONS: {
      monter_compte: {
        label: 'Monter le compte',
        emoji: '📈',
        cooldown: 45,
        seuilAbonnes: 0,
        effetAbonnes: 50,
      },
      promouvoir: {
        label: 'Promouvoir',
        emoji: '📣',
        cooldown: 90,
        seuilAbonnes: 0,
        effetAbonnes: 200,
        passifId: 'passif_promo',
        passifTaux: 0.5,
      },
      jeux_mobile: {
        label: 'Jeux mobile',
        emoji: '🎮',
        cooldown: 20,
        seuilAbonnes: 0,
        effetBonheur: 15,
        bonheurDuree: 30000,
      },
      placement_produit: {
        label: 'Placement produit',
        emoji: '💼',
        cooldown: 180,
        seuilAbonnes: 10000,
        passifId: 'passif_placement',
        passifTaux: 3,
        passifMax: 5,
      },
    },
  },

  // Carte / Map
  MAP: {
    COOLDOWN_CHANGEMENT: 300,   // secondes (5 min)
    COUTS_CHANGEMENT: {
      'commerce->finance': 5000,
      'commerce->tech':    5000,
      'finance->commerce': 5000,
      'finance->tech':     3000,
      'tech->commerce':    5000,
      'tech->finance':     3000,
      defaut:              5000,
    },
    ZONES: {
      commerce: { label: 'Quartier Commercial', emoji: '🏪', secteur: 'commerce', disponible: true,  x: 20, y: 30 },
      finance:  { label: 'Quartier Financier',  emoji: '🏦', secteur: 'finance',  disponible: true,  x: 60, y: 20 },
      tech:     { label: 'Quartier Tech',        emoji: '💻', secteur: 'tech',     disponible: true,  x: 55, y: 65 },
    },
  },

  METIERS: {
    commerce: {
      revenuBase: 1,
      upgrades: [
        { id: 'u_c1', nom: 'Costume pro',          effet: '+€5 / clic',            bonusClic: 5,  prerequis: null,   niveauRequis: 1 },
        { id: 'u_c2', nom: 'CRM basique',           effet: '+€12 / clic',           bonusClic: 12, prerequis: 'u_c1', niveauRequis: 2 },
        { id: 'u_c3', nom: 'Technique vente niv.2', effet: '+€30 / clic',           bonusClic: 30, prerequis: 'u_c2', niveauRequis: 2 },
        { id: 'u_c4', nom: 'Bureau propre',          effet: 'Débloque €8/s passif',  passifId: 'p_c1', passifValeur: 8,  prerequis: 'u_c3', niveauRequis: 3 },
        { id: 'u_c5', nom: 'Équipe de 3',            effet: 'Débloque €25/s passif', passifId: 'p_c2', passifValeur: 25, prerequis: 'u_c4', niveauRequis: 4 },
        { id: 'u_c6', nom: 'E-commerce',             effet: 'Débloque €50/s passif', passifId: 'p_c3', passifValeur: 50, prerequis: 'u_c5', niveauRequis: 5 },
      ],
    },
    finance: {
      revenuBase: null,   // non utilisé — revenu aléatoire géré dans engine.js
      revenuMin:  5,
      revenuMax:  25,
      upgrades: [
        { id: 'u_f1', nom: 'Compte courtier',         effet: { bonusClic: 3  }, prerequis: null,   niveauRequis: 1 },
        { id: 'u_f2', nom: 'Analyse technique',       effet: { bonusClic: 7  }, prerequis: 'u_f1', niveauRequis: 2 },
        { id: 'u_f3', nom: 'Portefeuille diversifié', effet: { passifId: 'passif_fin_3', passifValeur: 2  }, prerequis: 'u_f2', niveauRequis: 2 },
        { id: 'u_f4', nom: 'Fonds d\'investissement', effet: { passifId: 'passif_fin_4', passifValeur: 6  }, prerequis: 'u_f3', niveauRequis: 3 },
        { id: 'u_f5', nom: 'Hedge fund',              effet: { passifId: 'passif_fin_5', passifValeur: 20 }, prerequis: 'u_f4', niveauRequis: 4 },
        { id: 'u_f6', nom: 'Empire financier',        effet: { passifId: 'passif_fin_6', passifValeur: 50 }, prerequis: 'u_f5', niveauRequis: 5 },
      ],
    },
    tech: {
      revenuBase: 12,
      upgrades: [
        { id: 'u_t1', nom: 'Laptop pro',          effet: '+€10 / clic',              bonusClic: 10,  prerequis: null,   niveauRequis: 1 },
        { id: 'u_t2', nom: 'IDE premium',         effet: '+€25 / clic',              bonusClic: 25,  prerequis: 'u_t1', niveauRequis: 2 },
        { id: 'u_t3', nom: 'Framework maison',    effet: '+€60 / clic',              bonusClic: 60,  prerequis: 'u_t2', niveauRequis: 2 },
        { id: 'u_t4', nom: 'Open source repo',    effet: 'Débloque €15/s passif',    passifId: 'p_t1', passifValeur: 15,  prerequis: 'u_t3', niveauRequis: 3 },
        { id: 'u_t5', nom: 'Équipe tech',         effet: 'Débloque €40/s passif',    passifId: 'p_t2', passifValeur: 40,  prerequis: 'u_t4', niveauRequis: 4 },
        { id: 'u_t6', nom: 'SaaS produit',        effet: 'Débloque €100/s passif',   passifId: 'p_t3', passifValeur: 100, prerequis: 'u_t5', niveauRequis: 5 },
      ],
    },
  },
};
