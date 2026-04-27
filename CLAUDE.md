# LEGACY — Context for Claude Code

> Source unique de vérité technique. Ne jamais lire le GDD pour coder.
> Mettre à jour "Sessions terminées" à chaque fin de ticket.

---

## Stack technique

- **Plateforme** : Web navigateur — fichier HTML unique autonome
- **Framework** : Vanilla HTML/JS — pas de bundler, pas de framework lourd
- **Déploiement** : Vercel, auto-deploy sur push Git (branche `main`)
- **Persistance** : Firebase Realtime Database (intégration future)
- **Style** : CSS pixel art dark — monospace, pas de moteur 3D

---

## Architecture des fichiers

```
index.html       ← point d'entrée unique, tout le CSS
src/
  config.js      ← toutes les constantes du jeu (CONFIG object)
  state.js       ← état global réactif (STATE object)
  engine.js      ← boucle de jeu, tick, logique métier
  ui.js          ← Vue 3, template, handlers, computeds
```

---

## État global — STATE

```js
STATE = {
  // Identité
  nomPersonnage: string,
  age: number,              // 18 au départ
  generation: number,       // commence à 1

  // Finances
  argent: number,
  cashflowNet: number,      // calculé : revenus passifs + investissements - charges

  // Secteur / métier
  secteurActif: string,     // 'commerce' | 'finance' | 'tech' | 'immobilier' | 'btp' | 'influence'
  metierActif: string,
  xpSecteurs: { commerce, finance, tech, immobilier, btp, influence },

  // Jauges (0–100)
  jauges: { faim, hygiene, sante, bonheur, reputation },
  karma: number,            // 0–100, démarre à 75
  palierKarma: string,      // 'vertueux' | 'neutre' | 'louche' | 'criminel' | 'ennemiPublic'

  // Renommée
  abonnes: number,
  telephoneCooldowns: {},

  // Possessions
  possessions: {
    vehicule: string | null,
    logement: string,       // 'squat' par défaut
    logementAchete: boolean,
    telephone: boolean,
    ordinateur: boolean,
    tokens: number,
    animaux: [],
    items: [],
    compteBancaire: boolean,  // T40 — débloqué via upgrade banque
    epargne: number,          // T40 — solde épargne rémunéré à 0.5%/an
  },

  // Prêt bancaire (T40)
  pret: null,  // { montant, mensualite, dureeRestante } | null — un seul actif à la fois

  // Progression secteurs
  secteursVisites: ['commerce'],   // commerce visité par défaut — reset à chaque génération
  niveauFormation: { commerce:0, finance:0, tech:0, immobilier:0, btp:0, influence:0 }, // permanent comme boostCompetences
  formationActive: null,           // { id, secteur, label, dureeRestante, dureeInitiale, gainNiveaux } | null

  // Illégal
  coucheIllegalMax: number,        // 0 | 1 | 2 | 3
  modeIllegal: boolean,

  // Interne
  upgrades: [],
  passifs: [],
  bonusUpgrades: number,
  btpCompletes: [],
  chantierActif: null | { id, label, dureeRestante, dureeInitiale, recompense },
  _dernierGainClic: 0,
  _boostXpExpiry: 0,
  _immoEvenementExpiry: 0,
  _immoPassifMulti: 1.0,
  _immoPassifMultiExpiry: 0,
  _bonheurTempExpiry: 0,
  _boostXpExpiry: 0,
  _influenceAppuiDebut: 0,
  _ticksDepuisLoyer: 0,
  _dernierEvenementTick: 0,        // tick du dernier événement aléatoire
  _ticksDepuisVerifEvenement: 0,   // compteur vers le prochain tirage

  // Lignée
  lignee: [{ nom, age_mort, argent_transmis, karma_final, couche_illegale_max }],
  boostCompetences: { commerce, finance, tech, immobilier, btp, influence },

  // Marché noir
  marcheNoir: {
    dealsActifs: [],        // deals actuellement proposés (≤ NB_DEALS_ACTIFS)
    _dernierRefreshS: 0,    // timestamp (s) du dernier refresh complet
    _immuniteExpiry: 0,     // timestamp (s) fin d'immunité événements négatifs
  },

  // Immobilier avancé — biens d'investissement détenus
  investissementsImmobiliers: [], // [{ idInstance, idBien, label, prixAchat, valeurCourante, revenuPassif }]
}
```

---

## Boucle de jeu — engine.js

**Tick : toutes les 200ms**

À chaque tick : âge, jauges, passifs, charges, événements karma, logement, immobilier, BTP, formations, événements aléatoires, marché noir, investissements immobiliers, vérification mort.

---

## Formules clés

**Revenu par clic :**
```
revenuClic = (revenuBase + bonusUpgrades) × multiplicateurNiveau × modifKarma × modifBonheur
```
Finance : base aléatoire `[5–40]` au lieu de fixe.
BTP : `revenuBase: 3` toujours retourné, le clic accélère aussi le chantier actif.

**Multiplicateur niveau :**
```js
CONFIG.MULTIPLICATEURS_NIVEAU = [
  { niveau: 1, valeur: 1.0, couleur: '#888888', label: '×1.0' },
  { niveau: 2, valeur: 1.5, couleur: '#ffffff', label: '×1.5' },
  { niveau: 3, valeur: 2.2, couleur: '#f5c518', label: '×2.2' },
  { niveau: 4, valeur: 3.2, couleur: '#ff8c00', label: '×3.2' },
  { niveau: 5, valeur: 5.0, couleur: '#ff2200', label: '×5.0' },
]
```

**Niveaux XP :**
```js
CONFIG.NIVEAUX.SEUILS = [0, 150, 500, 1500, 4000]  // 5 paliers (T27)
```

---

## Système karma

```js
CONFIG.PALIERS_KARMA = [
  { palier: 'vertueux',     min: 80, max: 100, modifProductivite:  0.20 },
  { palier: 'neutre',       min: 40, max: 79,  modifProductivite:  0.00 },
  { palier: 'louche',       min: 20, max: 39,  modifProductivite: -0.15 },
  { palier: 'criminel',     min: 5,  max: 19,  modifProductivite: -0.35 },
  { palier: 'ennemiPublic', min: 0,  max: 4,   modifProductivite: -0.60 },
]
```

`modifProductivite` est un delta additif appliqué au multiplicateur : `×(1 + modifProductivite)`.

Héritage intergénérationnel : malus couche 2 (−10), couche 3 (−10), consécutivité ≥2 (−15), ≥3 (−15). Rédemption : +5 par génération vertueuse.

---

## Système de réputation

```js
CONFIG.REPUTATION = [
  { min: 80, label: 'Célébrité', couleur: '#ffd700' },
  { min: 60, label: 'Respecté',  couleur: '#4caf50' },
  { min: 40, label: 'Connu',     couleur: '#9e9e9e' },
  { min: 20, label: 'Mal vu',    couleur: '#b85c00' },
  { min: 0,  label: 'Paria',     couleur: '#8b0000' },
]

CONFIG.REPUTATION_EFFETS.INFLUENCE_MULT = [
  { min: 80, valeur: 1.30 },
  { min: 60, valeur: 1.15 },
  { min: 20, valeur: 1.00 },
  { min: 0,  valeur: 0.80 },
]
```

Modificateur branché sur `calculerGainInfluence` (gainAbonnes) et `executerActionTelephone` (effetAbonnes).
Badge `⭐ [label]` affiché dans la sidebar. Watch Vue sur le label → floating text coloré au changement de palier.

### Réputation × illégal

```js
CONFIG.REPUTATION_ILLEGAL = {
  DEALS_DISCRETS_REPUTATION_MAX:    60,   // deals discrets inaccessibles au-dessus
  MALUS_GAIN_ILLEGAL_REPUTATION_MIN: 70,  // gains illégaux réduits au-dessus
  MALUS_GAIN_ILLEGAL_MULT:          0.85, // ×0.85 sur les gains (−15%)
  RISQUE_SCANDALE_REPUTATION_MIN:   75,   // risque de scandale au-dessus
  RISQUE_SCANDALE_PROBA:            0.25, // 25% par commande illégale
  SCANDALE_REPUTATION:              -8,
  SCANDALE_BONHEUR:                -10,
}
```

Deals avec `reputationMax: 60` : blanchiment, corruption_fonctionnaire, contrat_douteux, protection_criminelle.

---

## Système illégal — trois couches

| Couche | Accès | Plancher karma |
|--------|-------|----------------|
| 1 — Opportuniste | Toujours | Aucun |
| 2 — Organisé | karma < 65 + niv.3+ dans un secteur | 55 max |
| 3 — Haut niveau | karma < 35 + coucheIllegalMax ≥ 2 | 30 max |

Commandes ordinateur illégales (engine.js `COMMANDES_ILLEGALES`) : `fraude_fiscale` (couche 1 — 500–2000€/60s), `piratage` (couche 2 — 2000–8000€+5tokens/120s), `hacking_avance` (couche 3 — 10000–40000€+15tokens/300s). Gestion cooldown via `state.telephoneCooldowns['illegal_' + id]`.

---

## Navigation carte — secteurs

### Changement de secteur — règles

**Aucun cooldown, aucun coût.** `changerSecteur(slug)` vérifie dans l'ordre :
1. **Même secteur** → `{ ok: false, raison: 'same' }`
2. **Possessions manquantes** (influence : téléphone + ordinateur requis) → `{ ok: false, raison: 'possessions', message }`
3. **Véhicule insuffisant** → `{ ok: false, raison: 'vehicule', message }`
4. Sinon → `{ ok: true }`, `state.secteurActif = slug`

Raisons : `'same'` | `'vehicule'` | `'possessions'`

> Note : `state.secteursVisites` existe dans le state mais n'est pas utilisé comme gate dans `changerSecteur` — il est simplement resetté à chaque génération.

### Formations — mécanique (T35 : refaisables)

Les formations s'achètent au Campus (bâtiment `ecole`) ou via l'overlay sidebar `🎓 Formations`. Elles sont **refaisables** et accumulent des niveaux permanents qui boostent l'XP/clic.

**Mécanique :**
- 3 formations par secteur (courte/moyenne/longue), 18 au total
- `demarrerFormation(id)` : vérifie argent + pas de formationActive → déduit coût → set `state.formationActive` (durée en ticks)
- `tickFormation()` : décrémente `dureeRestante` de 1 par tick → à 0 : `state.niveauFormation[secteur] += gainNiveaux` + dispatch `legacy:formation-terminee`
- `state.niveauFormation` est **permanent** (jamais resetté entre générations, comme `boostCompetences`)
- `formationActive` seul est resetté à chaque génération
- Bonus XP : `getBonusFormation(secteur) = 1 + niveauFormation[secteur] × FORMATIONS_BONUS_BASE` → branché dans `calculerXpClic()`
- Badge `📚 +X% XP` sous la barre XP si bonus > 0
- Deal `faux_diplome` → +1 niveauFormation à un secteur aléatoire

```js
CONFIG.FORMATIONS_BONUS_BASE = 0.08   // +8% XP/clic par niveau dans un secteur

// CONFIG.FORMATIONS — 18 entrées (duree en ticks : 300/900/2000)
// ex: { id:'f_com_1', emoji:'📦', label:'Vente — Fondamentaux', secteur:'commerce', cout:400, gainNiveaux:1, duree:300 }
// 300 ticks = 60s · 900 ticks = 180s · 2000 ticks = 400s
```

Fonctions engine.js :
- `demarrerFormation(id)` exportée — `getBonusFormation(secteur)` exportée
- `tickFormation()` privée — décrémente de 1 tick par tick
- `terminerFormation()` privée — incrémente `niveauFormation`, dispatch `legacy:formation-terminee`

### Véhicules requis par secteur

```js
CONFIG.MAP.ZONES = {
  btp:      { label: 'Zone Industrielle',    emoji: '🏗', x: 18, y: 75, vehiculeRequis: null,       disponible: true },
  commerce: { label: 'Quartier Commercial', emoji: '🏪', x: 20, y: 30, vehiculeRequis: 'velo',     disponible: true },
  campus:   { label: 'Campus',              emoji: '🎓', x: 10, y: 50, vehiculeRequis: 'velo',     disponible: true },
  tech:     { label: 'Quartier Tech',       emoji: '💻', x: 55, y: 65, vehiculeRequis: 'voiture',  disponible: true },
  finance:  { label: 'Quartier Financier',  emoji: '🏦', x: 60, y: 20, vehiculeRequis: 'supercar', disponible: true },
  // influence : surCarte:false — n'apparaît pas sur la carte, accessible via le Studio dans Quartier Tech
  // vehiculeRequis:'voiture' conservé pour que changerSecteur('influence') hérite du check voiture
  influence:{ label: 'Studio Influence',    emoji: '🎙', x: 50, y: 75, vehiculeRequis: 'voiture',  disponible: true, surCarte: false },
}
// BTP seul accessible sans véhicule — point de départ absolu
// Commerce + Campus : vélo minimum
// Tech (+ Influence via Studio dans Tech) : voiture minimum
// Finance : supercar
// Zones grisées sur la carte si vehiculeRequis non satisfait — affiche l'emoji du véhicule requis
// surCarte:false → filtré dans carteZones computed (ui.js) — zone non visible sur la carte
```

---

## Quartiers et bâtiments

```js
CONFIG.QUARTIERS = {
  btp:      { label: 'Zone Industrielle',   batiments: ['chantiers', 'logements_bas', 'garage'] },
  commerce: { label: 'Quartier Commercial',batiments: ['bureau', 'boutique_upgrades', 'agence_immo', 'logements_moyens'] },
  finance:  { label: 'Quartier Financier', batiments: ['banque', 'bourse', 'logements_haut', 'concessionnaire'] },
  tech:     { label: 'Quartier Tech',      batiments: ['coworking', 'startup', 'studio'] },  // studio = accès secteur Influence
  campus:   { label: 'Campus',             batiments: ['ecole'] },
}
// Influence n'est plus un quartier indépendant — son Studio est dans Quartier Tech (T41)

// Pas de quartier Immobilier — agence dans Commerce, logements répartis dans BTP/Commerce/Finance
// Garage (BTP) = vélo + scooter | Concessionnaire (Finance) = voiture + berline + supercar

CONFIG.BATIMENTS = {
  // BTP
  chantiers:         { emoji: '🔨', label: 'Chantiers',      contenu: 'upgrades',   secteur: 'btp'        },
  logements_bas:     { emoji: '🏚', label: 'Logements',      contenu: 'logements',  gamme: 'bas'          },
  garage:            { emoji: '🚲', label: 'Garage',         contenu: 'vehicules',  gamme: 'bas'          },
  // Commerce
  bureau:            { emoji: '🏢', label: 'Bureau',         contenu: 'upgrades',   secteur: 'commerce'   },
  boutique_upgrades: { emoji: '🏪', label: 'Boutique',       contenu: 'boutique'                          },
  agence_immo:       { emoji: '🏘', label: 'Agence Immo',    contenu: 'upgrades',   secteur: 'immobilier' },
  logements_moyens:  { emoji: '🏠', label: 'Résidences',     contenu: 'logements',  gamme: 'moyen'        },
  // Finance
  banque:            { emoji: '🏦', label: 'Banque',         contenu: 'upgrades',   secteur: 'finance'    },
  bourse:            { emoji: '📊', label: 'Bourse',         contenu: 'upgrades',   secteur: 'finance'    },
  logements_haut:    { emoji: '🏰', label: 'Villas',         contenu: 'logements',  gamme: 'haut'         },
  concessionnaire:   { emoji: '🚗', label: 'Concessionnaire',contenu: 'vehicules',  gamme: 'haut'         },
  // Tech
  coworking:         { emoji: '💻', label: 'Coworking',      contenu: 'upgrades',   secteur: 'tech'       },
  startup:           { emoji: '🚀', label: 'Startup',        contenu: 'upgrades',   secteur: 'tech'       },
  // Influence
  studio:            { emoji: '🎙', label: 'Studio',         contenu: 'upgrades',   secteur: 'influence'  },
  // Campus
  ecole:             { emoji: '🎓', label: 'École / Campus', contenu: 'formations'                        },
}
```

**Logements par gamme :** `bas` < 500€/mois — `moyen` 500–2000€ ou achat < 150k — `haut` > 150k achat.

**Vue bâtiment `agence_immo`** : en plus des upgrades immobilier, contient une section investissement (T33) avec achat de biens et suivi du portefeuille.

---

## Véhicules

```js
CONFIG.VEHICULES = {
  velo:     { prix: 300,   chargeMensuelle: 0,    karma:   0, reputation:  0, bonusClic:  0 },
  scooter:  { prix: 1500,  chargeMensuelle: 50,   karma:   0, reputation:  2, bonusClic:  0 },
  voiture:  { prix: 8000,  chargeMensuelle: 200,  karma:  -2, reputation:  5, bonusClic:  3 },
  berline:  { prix: 25000, chargeMensuelle: 400,  karma:  -5, reputation: 15, bonusClic:  8 },
  supercar: { prix: 80000, chargeMensuelle: 1100, karma: -10, reputation: 25, bonusClic: 20 },
}
CONFIG.ORDRE_VEHICULES = ['velo', 'scooter', 'voiture', 'berline', 'supercar']
```

---

## Téléphone & Ordinateur

**Téléphone** (800€) : actions `monter_compte`, `promouvoir`, `jeux_mobile`, `placement_produit` (seuil 10k abonnés).

**Ordinateur** (10000€) : tokens consommables, 3 commandes légales (`bourse` passif, `don_caritatif` karma+réputation, `recherche` boost XP), 3 commandes illégales (`fraude_fiscale`, `piratage`, `hacking_avance`).

---

## Immobilier avancé — achat-revente (T33)

```js
CONFIG.IMMOBILIER_AVANCE = {
  VARIATION_MIN:      -0.08,  // −8% par réévaluation annuelle
  VARIATION_MAX:       0.12,  // +12% par réévaluation (tendance haussière légère)
  TICKS_PAR_REEVAL:      75,  // 75 ticks = 1 an de jeu
  BONUS_NIVEAU_PAR_NV:  0.01, // +1% par niveau immo au-dessus du niveau 1
  BIENS: [
    { id: 'parking',  label: 'Place de parking', prix: 12000,  revenuPassif: 4  },
    { id: 'studio',   label: 'Studio locatif',   prix: 45000,  revenuPassif: 12 },
    { id: 'local',    label: 'Local commercial', prix: 120000, revenuPassif: 28 },
    { id: 'immeuble', label: 'Petit immeuble',   prix: 350000, revenuPassif: 75 },
  ],
}
```

- `acheterInvestissementImmobilier(idBien)` / `revendreInvestissementImmobilier(idInstance)` exposées via `Object.assign`
- `getTauxInvestImmo()` privée — intégrée dans `tickPassifs()` et `calculerCashflowNet()`
- Rééval annuelle via module-level `_ticksImmoReeval` (reset à chaque génération)
- Plancher valeur à 40% du prix d'achat
- `calculerHeritage()` inclut `valeurCourante` de tous les investissements avant la règle des 50%

---

## Événements aléatoires

```js
CONFIG.EVENEMENTS = {
  TICK_VERIFICATION:    25,   // toutes les 25 ticks (5s) → tirage
  PROBA_PAR_TIRAGE:   0.04,   // 4% → ~1 événement / 2 min
  COOLDOWN_GLOBAL_TICKS: 150, // 30s minimum entre deux événements
  LISTE: [ /* 18 événements avec conditions, poids, effets, gravite */ ]
}
```

Conditions supportées par `evaluerConditions` : `karmaMin`, `karmaMax`, `argentMin`, `abonnesMin`, `hygieneMax`, `secteurActif`, `coucheIllegalMin`, `niveauMin`, `reputationMin`, `reputationMax`.
Gravités : `'positif'` | `'negatif'` | `'majeur'` (overlay bloquant).
Immunité événements négatifs/majeurs possible via deal marché noir (`protection_criminelle`).

---

## Marché noir

```js
CONFIG.MARCHE_NOIR = {
  DEBLOCKAGE_COUCHE:  2,
  NB_DEALS_ACTIFS:    3,
  DUREE_DEAL_S:     180,   // 3 min avant expiration
  COOLDOWN_REFRESH_S: 300, // 5 min entre deux refresh
  DEALS: [ /* 8 deals : couche 2 (blanchiment, achat_abonnes, corruption_fonctionnaire,
                                   faux_diplome, vehicule_vole)
                         couche 3 (contrat_douteux, protection_criminelle, tuyau_boursier) */ ]
}
```

Deals filtrés par `reputationMax` pour les deals discrets (seuil 60).
`genererDeals()` + `accepterDeal(idInstance)` exposées via `Object.assign`.
`tickMarcheNoir()` branchée dans `tick()`.

---

## UI — Layout

### Architecture
```
#app → CSS grid : 220px 1fr, 100vh
├── .sidebar         (fixe, flex-column)
└── .zone-centrale   (flex-grow, position: relative)
```

### Sidebar
- Sprite CSS `#sprite-perso` : 4 variantes `.sprite--jeune/adulte/senior/vieux` (< 30 / < 50 / < 70 / 70+)
- Identité : nom + âge + génération
- 6 jauges `<JaugeBar />`
- Badge réputation `⭐ [label]` coloré dynamiquement
- `.sidebar-nav` : boutons conditionnels vers overlays (T40) — chaque bouton s'affiche uniquement si la possession existe :
  - 📊 Finances : `possessions.compteBancaire`
  - 🏠 Logement : `logement !== 'squat'`
  - 📱 Téléphone : `possessions.telephone`
  - 💻 Ordinateur : `possessions.ordinateur`
  - 🚗 Véhicule : `possessions.vehicule !== null`
  - 🕵️ Contact : `coucheIllegalMax ≥ 2`

### Zone centrale
Contenu contraint : `max-width: 580px`, centré via `align-self: center`.
Structure verticale fixe de la zone centrale :

```
.zone-centrale
├── .carte-wrap         (flex: 1, overflow: hidden) ← carte ou vue quartier ou vue bâtiment
├── .action-wrap        (flex-shrink: 0, centré)    ← bouton + multiplicateur + €/clic
├── .bande-finances     (flex-shrink: 0, sticky)    ← 💰 solde | +X.XX €/s passifs
└── .panneau-upgrades   (overflow-y: auto)          ← upgrades secteur, scrollable
```

| `navEcran` | Vue affichée |
|------------|-------------|
| `'map'` | Carte ville (`.carte-map`) |
| `'quartier'` | Façades RPG du quartier |
| `'batiment'` | Contenu du bâtiment cliqué |

```js
const navEcran = ref('map')
const quartierEnCours = ref(null)   // slug du quartier (ex: 'finance')
const batimentEnCours = ref(null)   // slug du bâtiment (ex: 'banque')
const panneauOverlay = ref(null)    // 'finances'|'logement'|'telephone'|'ordinateur'|'vehicules'|'marche_noir'|'mort'|null
```

Fonctions de navigation :
- `ouvrirQuartier(slug)` → `navEcran = 'quartier'`, `quartierEnCours = slug`
- `ouvrirBatiment(slug)` → `navEcran = 'batiment'`, `batimentEnCours = slug`
- `retourQuartier()` → `navEcran = 'quartier'`, `batimentEnCours = null`
- `retourCarte()` → `navEcran = 'map'`, reset tout
- `entrerDansSecteur(slug)` → `changerSecteur()` + `retourCarte()`
- `ouvrirOverlay(nom)` / `fermerOverlay()`

**Breadcrumb :** affiché en haut de la zone centrale selon navEcran.
- map : `🗺 Ville`
- quartier : `🗺 Ville > [label quartier]`
- batiment : `🗺 Ville > [label quartier] > [label bâtiment]`

**Vue bâtiment — contenu conditionnel** selon `CONFIG.BATIMENTS[slug].contenu` :
- `'upgrades'` → upgrades du secteur lié + bouton "Travailler ici" (`entrerDansSecteur`) + section investissement si `agence_immo`
- `'boutique'` → items boutique consommables
- `'logements'` → logements filtrés par `gamme`
- `'vehicules'` → liste véhicules achetables
- `'formations'` → formations groupées par secteur + timer si `formationActive` en cours (bouton "Démarrer")

### Bouton d'action
`.action-wrap` : centré horizontalement, `flex-shrink: 0`. Contient :
- Floating texts (position absolute)
- Bouton verbe dynamique (`CONFIG.VERBE_METIER`) avec couleur multiplicateur
- Ligne secondaire : ♦ multiplicateur + revenu/clic

### Bande finances (sticky)
`.bande-finances` : ligne horizontale centrée, `flex-shrink: 0`, toujours visible.
Contenu : `💰 X XXX €` séparé par `|` de `+X.XX €/s`.
Couleur cashflow : vert si ≥ 0, rouge + pulse si < 0.

### Overlays sidebar
`.panneau-overlay` : `position: absolute; right: 0; top: 0; width: 340px; height: 100%` — par-dessus la carte, refermable via ✕ (sauf overlay mort qui est bloquant).

---

## Conventions UI

- **`ajouterFlottant(texte, duree=800, classe='')`** : helper unique pour tous les floating texts — `classe` optionnel pour colorer (`boutique-flottant--positif` / `--negatif`)
- **`now`** : `ref(Date.now())` + `setInterval 1s` — cooldowns téléphone/ordi uniquement
- **Sprite** : CSS pur, aucune image externe, computed `spriteClasse`
- **Pulse rouge** : cashflow négatif → animation bouton Finances sidebar

---

## Sessions terminées

### T1-T2 — Structure + clic
Fichiers créés. Moteur tick 200ms. `onClic()` → `calculerRevenuClic()`. Floating texts. Verbe bouton dynamique.

### T3-T4 — Upgrades Commerce
6 upgrades chaînés. Coût `100 × 2.8^n`. États disponible/trop-cher/verrouille/achete. `acheterUpgrade()`. `state.bonusUpgrades` additif.

### T5 — Revenus passifs
`getTauxPassifTotal()`. `tickPassifs()`. Malus bonheur < 20.

### T6-T6b — Niveaux XP
`state.xpSecteurs`. `calculerNiveau()`. Seuils `[0,100,400,1200,3500]` (rebalancés T27). 5 paliers par secteur. Barre XP UI.

### T7 — Jauges
Déclin passif. Faim < 20 → malus santé. Hygiene < 20 → malus réputation.

### T8 — Mort et générations
`verifierMort()`. Heritage 50% argent. `initialiserNouvelleGeneration()`. Karma intergénérationnel. Overlay écran mort.

### T9 — Boutique
5 items consommables. `acheterItem()`.

### T10 — Vue Finances
`cashflowNet`. 3 onglets revenus/charges/bilan.

### T11 — Multiplicateur coloré
`CONFIG.MULTIPLICATEURS_NIVEAU`. `getMultiplicateurNiveau()`. Diamant ♦ coloré.

### T12 — Logement
7 logements. `tickLogement()`. Malus squat. Expulsion. Héritage logement acheté.

### T13 — Téléphone
4 actions cooldowns. Abonnés. `executerActionTelephone()`.

### T14 — Ordinateur
Tokens. 3 packs. 3 commandes légales. Prix scalés génération/âge.

### T15 — Carte / Map
`CONFIG.MAP.ZONES`. `changerSecteur()`. Cooldown 300s (supprimé au T22).

### T16 — Secteur Tech
`CONFIG.METIERS.tech`. `revenuBase: 12`. Computeds généralisés (`renderUpgradesSecteur`, etc.).

### T17 — Secteur Finance
Aléatoire `[5–40]`. Feedback couleur floating text.

### T18 — Véhicules
5 véhicules. `vehiculePermetSecteur()`. `acheterVehicule()`. Charges mensuelles.

### T19 — Secteur Immobilier
8 upgrades. Événements pondérés. `_immoPassifMulti`.

### T20 — Secteur BTP
7 chantiers chaînés avec timer. `lancerChantier()`. Clic accélère.

### S1 — Simplification
`ajouterFlottant()` helper. `Object.assign(window,{})` unique. −75 lignes.

### T21 — Secteur Influence
Hold-to-release gaussien (cible 5s). Abonnés → monétisation. Accès : téléphone + ordinateur.

### UI-R1 — Refonte layout ✅
Grid 2 colonnes. Sprite CSS. Sidebar-nav. `.btn-travailler` centré dans zone centrale. `panneauOverlay` drawer. `navEcran` + vue quartier façades RPG. `max-width: 580px` contenu central.

### T22 — Suppression cooldown + Campus + ecole ✅
Cooldown changement secteur supprimé. `CONFIG.FORMATIONS` array initial. `secteursVisites` ajouté dans state. Campus + ecole ajoutés.

### UI-R2 — Recentrage bouton d'action + bande finances sticky ✅
`.action-wrap` flex-shrink:0 sous la carte. `.bande-finances` sticky bottom:0, font-size agrandie. `.panneau-upgrades` scrollable. Zone centrale restructurée en flex-column.

### T23 — Vue bâtiment cliquable + formations timer ✅
3ème niveau de navigation map→quartier→bâtiment. `batimentEnCours` ref. `ouvrirBatiment()`, `retourQuartier()`. `breadcrumb` computed. `formationActiveInfo` + `formationsCampus`. Timer formations : `inscrireFormation` → `tickFormation` → `terminerFormation`. Vue bâtiment conditionnelle selon `contenu`.

### T24 — Refonte carte + quartiers + vue bâtiment navigation ✅
Quartier Immobilier supprimé de la carte. CONFIG.QUARTIERS/BATIMENTS refactorisés (garage BTP, concessionnaire Finance). `vehiculeRequis` corrigés (BTP:null, commerce:velo, campus:velo). Zones grisées avec emoji véhicule requis si véhicule insuffisant. `vehiculesBatiment` computed filtré par gamme ('bas'→vélo/scooter, 'haut'→voiture+). "Travailler ici" uniquement dans la vue bâtiment.

### T25 — Commandes illégales ordinateur
- engine.js : `COMMANDES_ILLEGALES` (const exportée, 3 entrées : fraude_fiscale/piratage/hacking_avance). `getCoucheAccessible()` interne : couche 3 si karma < 35 + coucheIllegalMax ≥ 2, couche 2 si karma < 65 + niv.3 dans un secteur, sinon couche 1. `executerCommandeIllegale(id)` exportée : vérifie ordinateur + couche + cooldown → applique gain aléatoire, karma, reputation, tokens → met à jour `coucheIllegalMax` → cooldown via `state.telephoneCooldowns['illegal_' + id]`. Exposée via `Object.assign`.
- ui.js : import `executerCommandeIllegale` + `COMMANDES_ILLEGALES`. Computed `commandesIllegalesInfo` (enrichit chaque commande de accessible/enCooldown/cdRestant/raison). Handler `actionCommandeIllegale`. Section "⚠ Marché noir" dans la vue ordinateur avec états locked/cooldown/disponible. Ajoutés au return.
- index.html : CSS `.illegales-titre`, `.commandes-illegales`, `.commande-item` + variantes `--locked`/`--cooldown`, palette rouge/orange pixel art dark.
- Valeurs : fraude_fiscale 500–2000€/60s cd, piratage 2000–8000€+5tokens/120s cd, hacking_avance 10000–40000€+15tokens/300s cd.

### T26 — Écran de fin de génération + tableau lignée
- engine.js : `calculerHeritage()` enrichie — ajoute `secteurPrincipal` (xpSecteurs reduce) + `generationNumero`. `onMort()` : stocke l'héritage dans `window._recapGeneration` avant le dispatch `legacy:mort`. `initialiserNouvelleGeneration(boostChoisi = null)` : accepte un boost optionnel, incrémente `state.boostCompetences[boostChoisi]` avant le reset (boostCompetences n'est PAS resetté).
- state.js : `boostCompetences: { commerce:0, finance:0, tech:0, immobilier:0, btp:0, influence:0 }` ajouté après `lignee`.
- ui.js : Refs `recapData` + `boostSelectionne` remplacent `mort` + `heritageAffiche`. Listener `legacy:mort` → lit `window._recapGeneration` + set `panneauOverlay = 'mort'` (pas de ✕ fermeture). Computed `recapGeneration` : enrichit recapData de `boostsDisponibles` (secteurs disponibles) + `ligneeComplete` (state.lignee complet). `actionNouvelleGeneration()` : appelle `initialiserNouvelleGeneration(boostSelectionne.value)` + reset overlay + relance moteur. Overlay mort : 5 sections (recap bilan, stats vie, tableau lignée scrollable, grille 6 boost cards sélectionnables, bouton "Nouvelle génération →").
- index.html : CSS overlay élargi (620px, 90vh max-height scrollable). `.overlay-mort__recap`, `.overlay-mort__ligne`, `.overlay-mort__or`, `.overlay-mort__lignee`, `.lignee-table-wrap`, `.lignee-table`, `.boost-grid`, `.boost-card`, `.boost-card--selected`, `.btn-continuer`.

### T27 — Équilibrage économique global
- config.js uniquement (11 valeurs, commentées `// T27:`).
- `TICKS_PAR_AN` 50→75 (vie ~15.5 min). `NIVEAUX.SEUILS` → `[0, 150, 500, 1500, 4000]`. Logements : studio 300→150€/mois, appartement 700→450€/mois, loft 1500→900€/mois. Téléphone 1000→800€. Formation BTP cout 300→200. Vélo 200→300€. Scooter 800→1500€. Voiture 5000→8000€. Berline 15000→25000€, mensuelle 600→400€. Supercar mensuelle 1500→1100€. BTP `revenuBase` 5→3.

### T28 — Événements aléatoires
- config.js : `CONFIG.EVENEMENTS` — `TICK_VERIFICATION:25`, `PROBA_PAR_TIRAGE:0.04`, `COOLDOWN_GLOBAL_TICKS:150`, `LISTE` 13 événements pondérés (positif/negatif/majeur) avec `conditions`, `effets`, `poids`.
- state.js : `_dernierEvenementTick:0`, `_ticksDepuisVerifEvenement:0`.
- engine.js : module-level `let _tickTotal = 0`. `evaluerConditions(cond)` privée (karmaMin/Max, argentMin, abonnesMin, hygieneMax, secteurActif, coucheIllegalMin, niveauMin). `appliquerEvenement(event)` exportée. `tickEvenements()` branchée dans `tick()`. Reset dans `initialiserNouvelleGeneration()`.
- ui.js : `ajouterFlottant(texte, duree, classe)` étendu avec param classe. `evenementOverlay` ref séparée. Listener `legacy:evenement` : majeur → overlay bloquant, autres → floating coloré. Computed `evenementOverlayInfo` avec `effetsLisibles`. `fermerEvenementOverlay()`.
- index.html : CSS `.overlay-evenement` (amber, z-index:90), `.evt-effet--positif/--negatif`, `.boutique-flottant--positif/--negatif`.

### T29 — Marché noir / réseau illégal
- config.js : `CONFIG.MARCHE_NOIR` — `DEBLOCKAGE_COUCHE:2`, `NB_DEALS_ACTIFS:3`, `DUREE_DEAL_S:180`, `COOLDOWN_REFRESH_S:300`, `DEALS` 8 entrées (couche 2 : blanchiment, achat_abonnes, corruption_fonctionnaire, faux_diplome, vehicule_vole — couche 3 : contrat_douteux, protection_criminelle, tuyau_boursier).
- state.js : `marcheNoir: { dealsActifs:[], _dernierRefreshS:0, _immuniteExpiry:0 }`.
- engine.js : `evaluerConditions` étendue (coucheMin, possessions). `tickEvenements` : immunité filtre negatif/majeur. `_tiragePondere(pool)` privée. `genererDeals()` + `accepterDeal(idInstance)` exportées. `tickMarcheNoir()` branchée dans `tick()`. Reset génération.
- ui.js : `marcheNoirDisponible` computed. `_formatMMSS(s)` helper. `dealsEnrichis` computed (tempsRestantS, tempsAffiche, expire, abordable, coutAffiche, gainAffiche). `immuniteRestanteS` + `prochainRefreshS` computeds. `actionAccepterDeal(idInstance)`. Bouton sidebar `🕵️ Contact` conditionnel. Overlay `marche_noir` : immunité badge, deal cards avec timers colorés, coût/gain, bouton accept, footer refresh.
- index.html : CSS `.overlay-marche-noir`, `.mn-immunite`, `.mn-vide`, `.deal-card`, `.deal-card--expired`, `.deal-card__header`, `.deal-card__label`, `.deal-timer--rouge/--orange`, `.deal-cout`, `.deal-gain`, `.deal-card__btn`, `.mn-footer`, `.btn-contact`.

### T30 — Système de réputation
- config.js : `CONFIG.REPUTATION` array 5 paliers (Paria/Mal vu/Connu/Respecté/Célébrité, couleurs), `CONFIG.REPUTATION_EFFETS.INFLUENCE_MULT` (×0.8→×1.3). 2 nouveaux événements LISTE : `opportunite_media` (reputationMin:60, abonnesMin:2000) + `bad_buzz` (reputationMax:30, abonnesMin:1000).
- engine.js : `getPalierReputation()` exportée. `getModificateurReputationInfluence()` privée. `evaluerConditions` étendue (reputationMin/reputationMax). Modificateur branché sur `calculerGainInfluence` (gainAbonnes) et `executerActionTelephone` (effetAbonnes).
- ui.js : import `getPalierReputation`. `watch` destructuré depuis Vue. Computed `palierReputation`. Watch label → `ajouterFlottant` coloré au changement de palier. Badge `<div class="reputation-badge">` après section jauges.
- index.html : CSS `.reputation-badge` (border coloré dynamique, monospace, discret).
- Aucune modification state.js. Zéro régression.

### T31 — Événements réputation dédiés
- config.js : ajout de 3 événements dans `CONFIG.EVENEMENTS.LISTE` (`invitation_media` reputationMin:60, `bad_buzz_expo` reputationMin:50+abonnesMin:500, `controle_renforce` reputationMax:25). Effets sobres : abonnés, abonnesPourcent, bonheur, argent. 18 événements au total, 0 doublon.
- engine.js : inchangé — `evaluerConditions` et `appliquerEvenement` déjà compatibles depuis T30.
- ui.js : inchangé — `effetsLisibles` couvre tous les types d'effets utilisés.
- index.html : inchangé.

### T32 — Réputation × Marché noir / illégal
- config.js : `CONFIG.REPUTATION_ILLEGAL` (DEALS_DISCRETS_REPUTATION_MAX:60, MALUS_GAIN_ILLEGAL_REPUTATION_MIN:70, MALUS_GAIN_ILLEGAL_MULT:0.85, RISQUE_SCANDALE_REPUTATION_MIN:75, PROBA:0.25, effets scandale). `reputationMax:60` ajouté aux conditions de 4 deals discrets : `blanchiment`, `corruption_fonctionnaire`, `contrat_douteux`, `protection_criminelle`.
- engine.js : `executerCommandeIllegale` — malus ×0.85 sur gain si réputation ≥ 70, risque scandale 25% si réputation ≥ 75 (−8 rép, −10 bonheur, dispatch `legacy:scandale-illegal`). Retourne `malusReputation` bool.
- ui.js : listener `legacy:scandale-illegal` → flottant rouge. `commandesIllegalesInfo` enrichi de `malusReputation`. Badge "⚠ Rendement −15%" dans la liste commandes illégales. Bandeau `mn-rep-avert` dans overlay marché noir si réputation ≥ 60.
- index.html : CSS `.mn-rep-avert` (amber, fond sombre) + `.commande-malus-rep` (amber, petit texte).

### T33 — Immobilier avancé / achat-revente
- config.js : `CONFIG.IMMOBILIER_AVANCE` — 4 biens (parking 12k, studio 45k, local 120k, immeuble 350k€), `VARIATION_MIN:-0.08 / MAX:+0.12`, `TICKS_PAR_REEVAL:75` (1 an de jeu), `BONUS_NIVEAU_PAR_NV:0.01`.
- state.js : `investissementsImmobiliers: []` — tableau `[{ idInstance, idBien, label, prixAchat, valeurCourante, revenuPassif }]`.
- engine.js : `acheterInvestissementImmobilier(idBien)`, `revendreInvestissementImmobilier(idInstance)`, `tickInvestissementsImmobiliers()` (rééval annuelle + bonus niveau immo, plancher 40%). `getTauxInvestImmo()` intégré dans `tickPassifs()` et `calculerCashflowNet()`. `calculerHeritage()` inclut valeurCourante des investissements dans l'argent transmis. Reset + `_ticksImmoReeval` à chaque génération.
- ui.js : computeds `biensImmobiliersDisponibles` + `investissementsImmobiliersInfo` (delta, deltaPct). Handlers `actionAcheterInvestissement`, `actionRevendreInvestissement`. Section investissement dans template `agence_immo` (liste achat + portefeuille + delta coloré vert/rouge).
- index.html : CSS `.invest-card`, `.invest-card--achat`, `.invest-card__header/label/prix/value/meta/delta`, `.invest-card__delta--positif/--negatif`, `.invest-card__btn`.

### T34 — Boosts compétences lignée — effet XP réel
- config.js : `BOOST_COMPETENCE_PAR_POINT:0.10`, `BOOST_COMPETENCE_MAX_POINTS:5`. 1 point = +10% XP/clic, plafond 5 points (+50%).
- engine.js : `getBoostLignee(secteur)` exportée — `1 + min(boostCompetences[secteur], 5) × 0.10`. Branché dans `calculerXpClic()` après le boost recherche (multiplicatif). Exposée via `Object.assign`.
- ui.js : import `getBoostLignee`. Computed `boostLigneeSecteurActif`. Badge `⚡ Lignée +X% XP` sous la barre XP si boost > 0 (class `.boost-lignee-badge`). `recapGeneration` enrichit chaque boost card de `bonusAffiche` (ex: `"+20% XP"`). `.boost-card__bonus` affiché dans l'overlay mort.
- index.html : CSS `.boost-lignee-badge` (amber) + `.boost-card__bonus` (amber 0.75em).

### T35 — Système de formations refaisables
- config.js : `FORMATIONS_BONUS_BASE:0.08` (+8% XP/clic par niveau). `CONFIG.FORMATIONS` remplacé : 18 entrées (3 par secteur, courte/moyenne/longue), durée en ticks (300/900/2000), champ `gainNiveaux` (1/2/3) remplace `gainXP`.
- state.js : `formations: []` remplacé par `niveauFormation: { commerce:0, ... }` (permanent comme `boostCompetences` — pas de reset entre générations). `formationActive.gainXP` → `gainNiveaux`.
- engine.js : `getBonusFormation(secteur)` exportée — `1 + niveauFormation[secteur] × 0.08`. Branché dans `calculerXpClic()` (multiplicatif). `demarrerFormation(id)` remplace `inscrireFormation`. `terminerFormation()` incrémente `niveauFormation` + dispatch `legacy:formation-terminee`. `tickFormation` décrémente de 1 tick (plus de décrémentation en secondes). Deal `faux_diplome` : donne +1 niveauFormation à un secteur aléatoire. `etudierFormation` supprimée.
- ui.js : Computeds `formationsDisponibles` (groupées par secteur) + `formationEnCours` + `bonusFormationSecteurActif`. Overlay sidebar `🎓 Formations` + badge `📚 +X% XP` sous la barre XP. Vue ecole et overlay utilisent les nouveaux computeds. Event `legacy:formation-terminee`.
- index.html : CSS `.bonus-formation-badge` (vert) + `.formations-overlay`, `.formation-groupe`, `.formation-cards-row`, `.formation-mini-card` + variantes.

### T36 — Arrestation et gameplay prison
- config.js : `CONFIG.PRISON` — `PROBA_PAR_TICK` {0:0, 1:0.0003, 2:0.0008, 3:0.0018}, `MULTIPLICATEUR_KARMA` {vertueux:0.3 … ennemiPublic:5.0}, `DUREE_TICKS` {1:150, 2:400, 3:900}, `SAISIE_ARGENT_PCT` {1:0.4, 2:0.65, 3:0.9}, `MALUS_REPUTATION` {1:−20, 2:−40, 3:−60}, `DEAL_PRISON_DUREE_TICKS:375`. `ACTIONS` (5 entrées : travailler_cellule/etudier/bonne_conduite/reseauter/planifier_coup). `FORMATIONS_ILLEGALES` (3 entrées prison-only : blanchiment_avance/hacking_terrain/reseau_ombre).
- state.js : `prison: { actif, couche, dureeInitiale, dureeRestante, bonneConduiteAccumulee, dealPrisonExpiry }` dans root.
- engine.js : `tickArrestation()` (proba×multiKarma → `entrerEnPrison`). `entrerEnPrison(couche)` (saisie argent, malus rép., dispatch `legacy:arrestation`). `sortirDePrison()` (reset + `genererDealPrison()` si dealPrisonExpiry > 0 + dispatch `legacy:liberation`). `genererDealPrison()` (deal couche 3 aléatoire, expiry DEAL_PRISON_DUREE_TICKS×200ms). `executerActionPrison(id)` exportée (5 cas : argent+XP / avance formation / bonneConduite+karma / immunité / planifier+flag). `tickPrison()` (dureeRestante−1, sortie si dureeRestante−bonneConduiteAccumulee ≤ 0). `demarrerFormation` : bloque FORMATIONS_ILLEGALES si !prison.actif. `calculerHeritage()` : champ `prisonnier: coucheIllegalMax >= 2`. `karmaDepart()` : `if (derniere.prisonnier) base -= 5`. `initialiserNouvelleGeneration()` : reset prison. `tick()` : +tickArrestation, +tickPrison. Exposé via `Object.assign`.
- ui.js : import `executerActionPrison`. Listener `legacy:liberation` → flottant vert "Liberté !". Computed `prisonEnCours` (progressionPct, tempsRestantAffiche, actionsAccessibles avec locked/cooldown). Computed `formationsPrison` (FORMATIONS_ILLEGALES enrichies). Handler `actionExecuterActionPrison`. Sidebar nav + bouton clic désactivés si `prison.actif`. Overlay prison full-screen (z-index:95, bloquant) : barre durée, liste actions (🔒/cooldown/▶), formations clandestines, badge deal planifié.
- index.html : CSS `.overlay-prison`, `.prison-card`, `.prison-header`, `.prison-duree`, `.prison-barre-wrap/barre/duree-label`, `.prison-actions`, `.prison-action` + `--locked`/`--cooldown`, `.prison-action__label/raison/cd/btn`, `.prison-formations`, `.prison-section-titre`, `.prison-deal-badge`.

### T37 — Secteur BTP (refonte click-based)
- config.js : `VERBE_METIER.btp` → 'Poser des briques'. `PALIERS_BTP` : 3→'Artisan', 4→'Entrepreneur BTP', 5→'Promoteur'. `METIERS.btp` remplacé : revenuBase 5, 6 upgrades plats (u_b1–u_b6, bonusClic + passifs, prerequis:null). `CONFIG.BTP` ajouté : `VEHICULE_REQUIS:'voiture'`, `CHANTIERS` 4 objets (renovation 25c/400€, maison 60c/1800€, immeuble 150c/7000€, complexe 400c/28000€). `MAP.ZONES.btp` : x:60,y:68,vehiculeRequis:'voiture'. `MAP.MESSAGES_BLOCAGE_VEHICULE.btp` : message voiture. `FORMATIONS` f_btp_2 cout 800→600, f_btp_3 cout 2500→1500.
- state.js : `_btpChantierActif:'renovation'`, `_btpClicsChantier:0` ajoutés. `chantierActif`/`btpCompletes` conservés (legacy).
- engine.js : Suppression bloc BTP dans `calculerRevenuClic()` (clicAccelere). `_getBtpChantier()`, `_getProchainChantier()` (u_b6→complexe, u_b5→immeuble, u_b3→maison, else→renovation), `getChantierBTPInfo()` exportée. `initialiserNouvelleGeneration()` reset `_btpChantierActif/'renovation'` + `_btpClicsChantier/0`. `Object.assign` : +`getChantierBTPInfo`, +`getProchainChantier:_getProchainChantier`.
- ui.js : Import `getChantierBTPInfo`. `onClic()` : branch btp → `_btpClicsChantier++`, si ≥ clicsRequis → `argent += bonus`, dispatch `legacy:btp-fin-chantier`, reset clics, `_btpChantierActif = window.getProchainChantier()`. `btpNotif` ref + listener `legacy:btp-fin-chantier` (3s timeout). `chantierBTPInfo` computed (null si secteur ≠ btp). `getUpgradesPourSecteur` : suppression `estBtp` special-casing — BTP traité comme secteur standard (upgrades achetables). Suppression `chantierProgression`, `actionLancerChantier`. Template : `.btp-chantier-wrap` (barre + label) sous bouton, `.btp-notif` global fixed. Upgrade list simplifié (plus de branch estBtp/Lancer).
- index.html : CSS `.btp-chantier-wrap`, `.btp-barre-piste`, `.btp-barre-fill`, `.btp-barre-label`, `.btp-notif` (fixed top 60px, vert pixel art).

### Fix carte — positions zones sans superposition
- config.js : `MAP.ZONES` — positions redistribuées en 3 lignes de 2 pour éliminer les superpositions. Layout final : Commerce(18%,15%) · Finance(70%,15%) / Campus(12%,45%) · Tech(62%,45%) / BTP(18%,75%) · Influence(50%,75%). Boutique fixe (85%,78%) conservée dans le template.

### T36 UI Polish — Formation indicateur + HUD lignée
- ui.js : Suppression bouton `🎓 Formations` du sidebar nav. Computed `formationIndicateur` (`state.formationActive → { label, tempsRestantAffiche (_formatMMSS), progressionPct }`). Computed `cashflowAffiche` (`{ valeur, classe: 'positif'|'negatif'|'neutre' }`). Computed `resumeLignee` (`{ generation, karma, palier }`). Exposés dans return. Template : `<div class="formation-indicateur" v-if="formationIndicateur">` avec label + timer + mini barre de progression, inséré sous le `€/clic`. Bande finances mise à jour : cashflow utilise `.hud__cashflow--[classe]`, ajout span `.hud__lignee` (`Gén.X · [palier]`).
- index.html : CSS `.formation-indicateur` (amber, monospace, 0.78em, barre 4px orange). `.hud__cashflow--positif/negatif/neutre`. `.hud__lignee` (gris discret, 0.78em).

### T38 — Renommage Zone BTP → Zone Industrielle
- config.js : `MAP.ZONES.btp.label` → `'Zone Industrielle'`. `MAP.ZONES.btp.vehiculeRequis` → `null` (revert T37 — BTP reste point de départ sans véhicule). `QUARTIERS.btp.label` → `'Zone Industrielle'`.
- ui.js / index.html : aucun changement — les labels sont entièrement data-driven via CONFIG.
- CLAUDE.md : références `Zone BTP` → `Zone Industrielle` dans la doc MAP.ZONES et QUARTIERS.

### Fix départ BTP — secteur initial corrigé
- state.js : `secteurActif: 'commerce'` → `'btp'` · `secteursVisites: ['commerce']` → `['btp']`.
- engine.js `initialiserNouvelleGeneration()` : idem, les deux champs forcés à `'btp'` / `['btp']` au reset.
- ui.js : aucun changement — le marqueur "ici" sur la carte est déjà 100 % dynamique (`zone.secteur === state.secteurActif`).

### T39 — BTP clic simple aux niveaux 1-2, jauge chantier au niveau 3+
- config.js : `CONFIG.BTP.NIVEAU_DEBLOCAGE_CHANTIER: 3`.
- engine.js : `calculerRevenuClic()` — branche BTP ajoutée avant le chemin générique : si `calculerNiveau('btp') >= 3`, retourne 0 (le chantier gère le gain différé). Niveaux 1-2 tombent dans le chemin standard (revenuBase×multiplicateurs).
- ui.js : `onClic()` — la logique chantier (incrément `_btpClicsChantier`, dispatch `legacy:btp-fin-chantier`) conditionnée à `niveauBtp >= CONFIG.BTP.NIVEAU_DEBLOCAGE_CHANTIER` + `return` précoce pour court-circuiter le floating text (gain=0). `chantierBTPInfo` computed : retourne null si niveau btp < 3, donc `.btp-chantier-wrap` masqué aux niveaux 1-2.
- index.html : aucun changement CSS.

### T40 — Compte bancaire, épargne, prêts
- config.js : `CONFIG.COMPTE_BANCAIRE` (`cout:500, chargeMensuelle:15`). `CONFIG.PRETS` (3 paliers : petit 5k/12 mois/450€/mois niv.1, moyen 20k/24 mois/900€/mois niv.3, grand 80k/36 mois/2500€/mois niv.5). `CONFIG.EPARGNE_TAUX_ANNUEL:0.005`. Upgrade `compte_bancaire` ajouté en tête de `CONFIG.METIERS.finance.upgrades` (prix:500, effet string 'Accès épargne & prêts').
- state.js : `possessions.compteBancaire:false` + `possessions.epargne:0` + `pret:null` à la racine.
- engine.js : `deposerEpargne(montant)` / `retirerEpargne(montant)` / `prendreUnPret(id)` exportées. `tickEpargne()` — intérêts 0.5% tous les 75 ticks. `tickPret()` — mensualité tous les ~6 ticks (1 mois de jeu), `state.pret = null` en fin de remboursement + dispatch `legacy:pret-rembourse`. `calculerCashflowNet()` étendu : soustraît chargeMensuelle compte bancaire + mensualité prêt actif. `acheterUpgrade` : flag spécial `id === 'compte_bancaire'` → `possessions.compteBancaire = true`. `initialiserNouvelleGeneration` reset `pret`, `possessions.compteBancaire/epargne`, `_ticksEpargne`, `_ticksPretMensuel`.
- ui.js : Sidebar — 5 boutons conditionnels (v-if). Overlay logement remplacé par vue simplifiée (nom, statut, charge, bonheur + bouton "Changer" → `allerVersLogements()` navigue directement vers le bâtiment logement adapté). Overlay finances — onglets étendus à 5 : `['revenus', 'charges', 'bilan', 'epargne', 'pret']`. Charges : `financesChargesEtendues` (logement + véhicule + compte + prêt). Onglet Épargne : solde, taux, input montant, boutons Déposer/Retirer. Onglet Prêt : si prêt actif → recap remboursement ; sinon → 3 cards conditionnées par niveauFinance + réputation ≥ 40.
- index.html : CSS `.logement-actuel-vue`, `.btn-changer-logement`, `.epargne-section`, `.epargne-input`, `.epargne-btn`, `.pret-card`, `.pret-actif`.

### T41 — Influence intégré dans le Quartier Tech
- config.js : `MAP.ZONES.influence` → ajout `surCarte: false` (la zone est conservée pour que `vehiculePermetSecteur('influence')` hérite du check voiture ; elle est simplement masquée de la carte). `QUARTIERS.tech.batiments` → `['coworking', 'startup', 'studio']`. `QUARTIERS.influence` supprimé.
- ui.js : `carteZones` computed — `.filter(([, zone]) => zone.surCarte !== false)` ajouté avant le `.map(...)` pour exclure la zone influence du rendu carte.
- engine.js : aucune modification — `changerSecteur('influence')` fonctionne sans changement : check possessions (téléphone + ordi) puis `vehiculePermetSecteur` qui lit `MAP.ZONES.influence.vehiculeRequis = 'voiture'`.
- index.html : aucun changement — le marqueur influence était 100% data-driven via `carteZones`.
- Breadcrumb studio : `Ville > Quartier Tech > Studio` (automatique — `quartierEnCours` sera `'tech'`).
- "Travailler ici" dans le Studio : appelle `entrerDansSecteur('influence')` via `CONFIG.BATIMENTS.studio.secteur`.

---
*Ne jamais lire le GDD pour coder — toutes les infos techniques sont ici.*
*Mettre à jour "Sessions terminées" à chaque fin de ticket.*
