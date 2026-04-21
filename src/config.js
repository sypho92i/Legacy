// config.js — toutes les constantes et valeurs de balancing
// Aucun magic number ailleurs dans le code

export const CONFIG = {
  // Moteur
  TICK_MS: 200,                    // intervalle de la boucle de jeu
  DEBUG: false,                    // active les outils de débogage en jeu

  // Finances
  REVENU_BASE_CLIC: 1,
  MALUS_PASSIF_TICK: 5,            // €/s déduits des passifs si bonheur < 20

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
    vendeur:     'Conclure une vente',
    tech:        'Livrer une feature',
    finance:     'Passer un ordre',
    immobilier:  'Signer un bail',
    btp:         'Donner un coup de main',
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
    PALIERS_IMMOBILIER: {
      1: 'Propriétaire débutant',
      2: 'Bailleur',
      3: 'Investisseur',
      4: 'Promoteur',
      5: 'Magnat de l\'Immo',
    },
    PALIERS_BTP: {
      1: 'Ouvrier',
      2: 'Chef de chantier',
      3: 'Conducteur de travaux',
      4: 'Entrepreneur',
      5: 'Groupe BTP',
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
      commerce:   { label: 'Quartier Commercial',  emoji: '🏪', secteur: 'commerce',   disponible: true, x: 20, y: 30, vehiculeRequis: null       },
      finance:    { label: 'Quartier Financier',   emoji: '🏦', secteur: 'finance',    disponible: true, x: 60, y: 20, vehiculeRequis: 'supercar'  },
      tech:       { label: 'Quartier Tech',         emoji: '💻', secteur: 'tech',       disponible: true, x: 55, y: 65, vehiculeRequis: 'voiture'   },
      immobilier: { label: 'Quartier Immobilier',  emoji: '🏢', secteur: 'immobilier', disponible: true, x: 25, y: 65, vehiculeRequis: 'berline'   },
      btp:        { label: 'Zone BTP',              emoji: '🏗', secteur: 'btp',        disponible: true, x: 80, y: 50, vehiculeRequis: 'velo'      },
    },
    MESSAGES_BLOCAGE_VEHICULE: {
      finance:    "T'as pas une Supercar ? Retourne au bureau.",
      tech:       "Pour bosser dans la tech, faut au moins avoir la voiture qui va avec. Fais un effort.",
      immobilier: "Pour visiter des biens, faut au moins arriver en Berline.",
      btp:        null,
    },
  },

  VEHICULES: {
    velo:     { label: 'Vélo',     emoji: '🚲', prix: 200,   chargeMensuelle: 0,    karma:  0,  reputation: 0,  bonusClic: 0,  vehiculeRequis: null },
    scooter:  { label: 'Scooter',  emoji: '🛵', prix: 1500,  chargeMensuelle: 50,   karma:  0,  reputation: 2,  bonusClic: 0,  vehiculeRequis: null },
    voiture:  { label: 'Voiture',  emoji: '🚗', prix: 8000,  chargeMensuelle: 200,  karma: -2,  reputation: 5,  bonusClic: 3,  vehiculeRequis: null },
    berline:  { label: 'Berline',  emoji: '🚘', prix: 25000, chargeMensuelle: 500,  karma: -5,  reputation: 15, bonusClic: 8,  vehiculeRequis: null },
    supercar: { label: 'Supercar', emoji: '🏎', prix: 80000, chargeMensuelle: 1500, karma: -10, reputation: 25, bonusClic: 20, vehiculeRequis: null },
  },

  // Immobilier — événements aléatoires
  IMMOBILIER: {
    EVENEMENTS: {
      travaux:           { label: 'Travaux urgents',           emoji: '🔧', proba: 0.30, effet: { argentMin: -2000, argentMax: -500  } },
      locataire_fuite:   { label: 'Locataire défaillant',      emoji: '🏃', proba: 0.25, effet: { passifMulti: 0.80, duree: 60       } },
      hausse_marche:     { label: 'Hausse du marché',          emoji: '📈', proba: 0.25, effet: { passifMulti: 1.10, duree: 90       } },
      locataire_premium: { label: 'Nouveau locataire premium', emoji: '🔑', proba: 0.20, effet: { argentFlat: 500                   } },
      INTERVALLE_MIN: 110,
      INTERVALLE_MAX: 130,
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
      revenuMax:  40,
      upgrades: [
        { id: 'u_f1', nom: 'Compte courtier',         effet: { bonusClic: 3  }, prerequis: null,   niveauRequis: 1 },
        { id: 'u_f2', nom: 'Analyse technique',       effet: { bonusClic: 7  }, prerequis: 'u_f1', niveauRequis: 2 },
        { id: 'u_f3', nom: 'Portefeuille diversifié', effet: { passifId: 'passif_fin_3', passifValeur: 2  }, prerequis: 'u_f2', niveauRequis: 2 },
        { id: 'u_f4', nom: 'Fonds d\'investissement', effet: { passifId: 'passif_fin_4', passifValeur: 6  }, prerequis: 'u_f3', niveauRequis: 3 },
        { id: 'u_f5', nom: 'Hedge fund',              effet: { passifId: 'passif_fin_5', passifValeur: 20 }, prerequis: 'u_f4', niveauRequis: 4 },
        { id: 'u_f6', nom: 'Empire financier',        effet: { passifId: 'passif_fin_6', passifValeur: 50 }, prerequis: 'u_f5', niveauRequis: 5 },
      ],
    },
    immobilier: {
      revenuBase: 20,
      upgrades: [
        { id: 'u_i1', nom: 'Studio',               prix: 15000,   effet: { passifId: 'passif_immo_1', passifValeur: 3    }, prerequis: null,   niveauRequis: 1 },
        { id: 'u_i2', nom: 'Appartement T2',        prix: 35000,   effet: { passifId: 'passif_immo_2', passifValeur: 7    }, prerequis: null,   niveauRequis: 1 },
        { id: 'u_i3', nom: 'Appartement T4',        prix: 70000,   effet: { passifId: 'passif_immo_3', passifValeur: 14   }, prerequis: 'u_i2', niveauRequis: 2 },
        { id: 'u_i4', nom: 'Maison',                prix: 120000,  effet: { passifId: 'passif_immo_4', passifValeur: 25   }, prerequis: 'u_i3', niveauRequis: 2 },
        { id: 'u_i5', nom: 'Immeuble locatif',      prix: 300000,  effet: { passifId: 'passif_immo_5', passifValeur: 60   }, prerequis: 'u_i4', niveauRequis: 3 },
        { id: 'u_i6', nom: 'Centre commercial',     prix: 800000,  effet: { passifId: 'passif_immo_6', passifValeur: 150  }, prerequis: 'u_i5', niveauRequis: 4 },
        { id: 'u_i7', nom: 'Tour de bureaux',       prix: 2000000, effet: { passifId: 'passif_immo_7', passifValeur: 400  }, prerequis: 'u_i6', niveauRequis: 4 },
        { id: 'u_i8', nom: 'Complexe résidentiel',  prix: 5000000, effet: { passifId: 'passif_immo_8', passifValeur: 1000 }, prerequis: 'u_i7', niveauRequis: 5 },
      ],
    },
    btp: {
      revenuBase: 5,
      clicAccelere: 1, // secondes retirées du chantier actif par clic
      upgrades: [
        { id: 'u_b1', label: 'Rénovation',           prerequis: null,   niveauRequis: 1, duree: 30,  recompense: 500    },
        { id: 'u_b2', label: 'Pavillon',              prerequis: 'u_b1', niveauRequis: 1, duree: 60,  recompense: 1200   },
        { id: 'u_b3', label: 'Immeuble résidentiel',  prerequis: 'u_b2', niveauRequis: 2, duree: 120, recompense: 3000   },
        { id: 'u_b4', label: 'Centre commercial',     prerequis: 'u_b3', niveauRequis: 3, duree: 240, recompense: 8000   },
        { id: 'u_b5', label: 'Pont',                  prerequis: 'u_b4', niveauRequis: 3, duree: 360, recompense: 15000  },
        { id: 'u_b6', label: 'Stade',                 prerequis: 'u_b5', niveauRequis: 4, duree: 600, recompense: 35000  },
        { id: 'u_b7', label: 'Méga-complexe',         prerequis: 'u_b6', niveauRequis: 5, duree: 900, recompense: 100000 },
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
