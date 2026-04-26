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
  cashflowNet: number,      // calculé : revenus passifs - charges

  // Secteur / métier
  secteurActif: string,     // 'commerce' | 'finance' | 'tech' | 'immobilier' | 'btp' | 'influence'
  metierActif: string,
  xpSecteurs: { commerce, finance, tech, immobilier, btp, influence },

  // Jauges (0–100)
  jauges: { faim, hygiene, sante, bonheur, reputation },
  karma: number,            // 0–100, démarre à 75

  // Renommée
  abonnes: number,
  telephoneCooldowns: {},
  _bonheurTempExpiry: 0,

  // Possessions
  possessions: {
    vehicule: string | null,
    logement: string,       // 'squat' par défaut
    logementAchete: boolean,
    telephone: boolean,
    ordinateur: boolean,
    tokens: number,
  },

  // Progression secteurs
  secteursVisites: ['commerce'],   // commerce visité par défaut — reset à chaque génération
  formations: [],                  // slugs secteurs débloqués par formation — reset à chaque génération
  formationActive: null,           // { id, secteur, label, dureeRestante, dureeInitiale, gainXP } | null

  // Illégal
  coucheIllegalMax: number,        // 0 | 1 | 2 | 3

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
  _influenceAppuiDebut: 0,
  _ticksDepuisLoyer: 0,

  // Lignée
  lignee: [{ nom, age_mort, argent_transmis, karma_final, couche_illegale_max }],
  karmaDepart: number,
  boostCompetences: { commerce, finance, tech, immobilier, btp, influence },
}
```

---

## Boucle de jeu — engine.js

**Tick : toutes les 200ms**

À chaque tick : âge, jauges, passifs, charges, événements karma, logement, immobilier, BTP, vérification mort.

---

## Formules clés

**Revenu par clic :**
```
revenuClic = (revenuBase + bonusUpgrades) × multiplicateurNiveau × modifKarma × modifBonheur
```
Finance : base aléatoire `[revenuMin–revenuMax]` au lieu de fixe.
BTP : `revenuBase: 5` toujours retourné, le clic accélère aussi le chantier actif.

**Multiplicateur niveau :**
```js
CONFIG.MULTIPLICATEURS_NIVEAU = [
  { niveau:1, valeur:1.0, couleur:'#9e9e9e', label:'×1.0' },
  { niveau:2, valeur:1.5, couleur:'#ffffff', label:'×1.5' },
  { niveau:3, valeur:2.2, couleur:'#ffeb3b', label:'×2.2' },
  { niveau:4, valeur:3.2, couleur:'#ff9800', label:'×3.2' },
  { niveau:5, valeur:5.0, couleur:'#ffd700', label:'×5.0' },
]
```

**Niveaux XP :**
```js
CONFIG.NIVEAUX.SEUILS = [0, 100, 400, 1200, 3500]  // 5 paliers
```

---

## Système karma

```js
CONFIG.KARMA = {
  VERTUEUX:      { min: 80, modifProd: 1.20 },
  NEUTRE:        { min: 40, modifProd: 1.00 },
  LOUCHE:        { min: 20, modifProd: 0.85 },
  CRIMINEL:      { min: 5,  modifProd: 0.65 },
  ENNEMI_PUBLIC: { min: 0,  modifProd: 0.40 },
}
```

Héritage intergénérationnel : malus couche 2 (−10), couche 3 (−10), consécutivité ≥2 (−15), ≥3 (−15). Rédemption : +5 par génération vertueuse.

---

## Système illégal — trois couches

| Couche | Accès | Plancher karma |
|--------|-------|----------------|
| 1 — Opportuniste | Toujours | Aucun |
| 2 — Organisé | karma < 65 + niv.3+ | 55 max |
| 3 — Haut niveau | karma < 35 + couche 2 | 30 max |

Commandes ordinateur illégales (non encore implémentées côté moteur) : `fraude_fiscale` (couche 1), `piratage` (couche 2), `hacking_avance` (couche 3).

---

## Navigation carte — secteurs

### Changement de secteur — règles

**Aucun cooldown.** Le changement est libre sous trois conditions :
1. **Formation requise** : certains secteurs exigent une formation achetée au Campus
2. **Véhicule requis** : chaque secteur peut exiger un véhicule minimum
3. **Coût d'installation** : `CONFIG.MAP.COUT_INSTALLATION` (2000€) débité une seule fois à la première visite — Commerce est déjà visité par défaut

`changerSecteur(slug)` retourne `{ ok, raison?, message? }`.
Raisons : `'meme_secteur'` | `'formation'` | `'vehicule'` | `'possessions'` | `'argent'`

### Formations — accès aux secteurs et mécanique

Les formations s'achètent et se suivent au Campus (bâtiment `ecole`). Elles débloquent l'accès aux secteurs et donnent un boost XP.

**Mécanique :**
- Le joueur paie le coût → `formationActive` démarre avec un timer
- Le bouton "Étudier" dans la vue Campus accélère le timer (comme BTP)
- Une seule formation à la fois (`state.formationActive`)
- À la fin du timer : `gainXP` crédité dans `state.xpSecteurs[secteur]` + slug pushé dans `state.formations[]`
- Reset complet (`formationActive = null`, `formations = []`) à chaque nouvelle génération

```js
// CONFIG.FORMATIONS est un array
CONFIG.FORMATIONS = [
  { id: 'f_com_1', emoji: '📦', label: 'Vente — Initiation',      secteur: 'commerce',   cout: 1200,  gainXP: 80,  duree: 120 },
  { id: 'f_com_2', emoji: '📦', label: 'Vente — Avancé',          secteur: 'commerce',   cout: 6000,  gainXP: 350, duree: 300 },
  { id: 'f_fin_1', emoji: '💹', label: 'Finance — Initiation',    secteur: 'finance',    cout: 2000,  gainXP: 80,  duree: 120 },
  { id: 'f_fin_2', emoji: '💹', label: 'Finance — Avancé',        secteur: 'finance',    cout: 10000, gainXP: 350, duree: 300 },
  { id: 'f_tec_1', emoji: '💻', label: 'Tech — Initiation',       secteur: 'tech',       cout: 1500,  gainXP: 80,  duree: 120 },
  { id: 'f_tec_2', emoji: '💻', label: 'Tech — Avancé',           secteur: 'tech',       cout: 8000,  gainXP: 350, duree: 300 },
  { id: 'f_imm_1', emoji: '🏢', label: 'Immo — Initiation',       secteur: 'immobilier', cout: 2000,  gainXP: 80,  duree: 120 },
  { id: 'f_imm_2', emoji: '🏢', label: 'Immo — Avancé',           secteur: 'immobilier', cout: 10000, gainXP: 350, duree: 300 },
  { id: 'f_btp_1', emoji: '🏗', label: 'BTP — Initiation',        secteur: 'btp',        cout: 800,   gainXP: 80,  duree: 120 },
  { id: 'f_inf_1', emoji: '🎙', label: 'Influence — Initiation',  secteur: 'influence',  cout: 2500,  gainXP: 80,  duree: 120 },
  { id: 'f_inf_2', emoji: '🎙', label: 'Influence — Avancé',      secteur: 'influence',  cout: 12000, gainXP: 350, duree: 300 },
]
CONFIG.MAP.COUT_INSTALLATION = 2000
```

Fonctions engine.js :
- `inscrireFormation(id)` : vérifie argent + pas de formationActive → déduit coût → set `state.formationActive`
- `etudierFormation()` : appelée par clic "Étudier" → réduit `dureeRestante` de 2s par clic
- `tickFormation()` : décrémente `dureeRestante` par tick → à 0 : crédite XP + push formations + dispatch `legacy:formation-complete`
- Zone verrouillée par formation manquante affiche 🎓 sur la carte

### Véhicules requis par secteur

```js
CONFIG.MAP.ZONES = {
  btp:      { label: 'Zone BTP',           emoji: '🏗', x: 15, y: 65, vehiculeRequis: null,      disponible: true },
  commerce: { label: 'Quartier Commercial',emoji: '🏪', x: 20, y: 30, vehiculeRequis: 'velo',    disponible: true },
  campus:   { label: 'Campus',             emoji: '🎓', x: 10, y: 50, vehiculeRequis: 'velo',    disponible: true },
  tech:     { label: 'Quartier Tech',      emoji: '💻', x: 55, y: 65, vehiculeRequis: 'voiture', disponible: true },
  influence:{ label: 'Studio Influence',   emoji: '🎙', x: 45, y: 35, vehiculeRequis: 'voiture', disponible: true },
  finance:  { label: 'Quartier Financier', emoji: '🏦', x: 60, y: 20, vehiculeRequis: 'supercar',disponible: true },
}
// BTP seul accessible sans véhicule — point de départ absolu
// Commerce + Campus : vélo minimum
// Tech + Influence : voiture minimum
// Finance : supercar
// Zones grisées sur la carte si vehiculeRequis non satisfait — affiche l'emoji du véhicule requis
```

---

## Quartiers et bâtiments

```js
CONFIG.QUARTIERS = {
  btp:      { label: 'Zone BTP',           batiments: ['chantiers', 'logements_bas', 'garage'] },
  commerce: { label: 'Quartier Commercial',batiments: ['bureau', 'boutique_upgrades', 'agence_immo', 'logements_moyens'] },
  finance:  { label: 'Quartier Financier', batiments: ['banque', 'bourse', 'logements_haut', 'concessionnaire'] },
  tech:     { label: 'Quartier Tech',      batiments: ['coworking', 'startup'] },
  influence:{ label: 'Studio Influence',   batiments: ['studio'] },
  campus:   { label: 'Campus',             batiments: ['ecole'] },
}

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

---

## Véhicules

```js
CONFIG.VEHICULES = {
  velo:     { prix: 0,     chargeMensuelle: 0,    karma: 0,   reputation: 0,  bonusClic: 0 },
  scooter:  { prix: 800,   chargeMensuelle: 50,   karma: 0,   reputation: 5,  bonusClic: 0 },
  voiture:  { prix: 5000,  chargeMensuelle: 200,  karma: 0,   reputation: 10, bonusClic: 1 },
  berline:  { prix: 15000, chargeMensuelle: 600,  karma: -5,  reputation: 20, bonusClic: 3 },
  supercar: { prix: 80000, chargeMensuelle: 2000, karma: -15, reputation: 35, bonusClic: 8 },
}
CONFIG.ORDRE_VEHICULES = ['velo', 'scooter', 'voiture', 'berline', 'supercar']
```

---

## Téléphone & Ordinateur

**Téléphone** (1000€) : actions `monter_compte`, `promouvoir`, `jeux_mobile`, `placement_produit` (seuil 10k abonnés).

**Ordinateur** (10000€) : tokens consommables, 3 commandes légales (`bourse` passif, `don_caritatif` karma, `recherche` boost XP), commandes illégales à implémenter.

---

## UI — Layout

### Architecture
```
#app → CSS grid : 220px 1fr, 100vh
├── .sidebar         (fixe, flex-column)
└── .zone-centrale   (flex-grow, position: relative, align-items: center)
```

### Sidebar
- Sprite CSS `#sprite-perso` : 4 variantes `.sprite--jeune/adulte/senior/vieux` (< 30 / < 50 / < 70 / 70+)
- Identité : nom + âge + génération
- 6 jauges `<JaugeBar />`
- `.sidebar-finances` : argent + cashflow + karma
- `.sidebar-nav` : boutons vers overlays (finances, logement, téléphone, ordi, véhicules)

### Zone centrale
Contenu contraint : `max-width: 580px`, centré via `align-items: center`.
Structure verticale fixe de la zone centrale :

```
.zone-centrale
├── .carte-wrap         (flex: 1, overflow: hidden) ← carte ou vue quartier
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
const panneauOverlay = ref(null)    // 'finances'|'logement'|'telephone'|'ordinateur'|'vehicules'|null
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
- `'upgrades'` → upgrades du secteur lié + bouton "Travailler ici" (`entrerDansSecteur`)
- `'boutique'` → items boutique consommables
- `'logements'` → logements filtrés par `gamme`
- `'vehicules'` → liste véhicules achetables
- `'formations'` → liste formations + timer si `formationActive` + bouton "Étudier" 

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
`.panneau-overlay` : `position: absolute; right: 0; top: 0; width: 340px; height: 100%` — par-dessus la carte, refermable via ✕.

---

## Conventions UI

- **`ajouterFlottant(texte, duree=800)`** : helper unique pour tous les floating texts
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
`state.xpSecteurs`. `calculerNiveau()`. Seuils `[0,100,400,1200,3500]`. 5 paliers par secteur. Barre XP UI.

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

### T22 — Suppression cooldown + Formations + Coût installation ✅
Cooldown changement secteur supprimé. `CONFIG.FORMATIONS` array avec duree. `inscrireFormation()` remplace `acheterFormation()`. `secteursVisites`, `formations` dans state. `COUT_INSTALLATION` 2000€ à la première visite. Campus + ecole ajoutés.

### UI-R2 — Recentrage bouton d'action + bande finances sticky ✅
`.action-wrap` flex-shrink:0 sous la carte. `.bande-finances` sticky bottom:0, font-size agrandie. `.panneau-upgrades` scrollable. Zone centrale restructurée en flex-column.

### T23 — Vue bâtiment cliquable + formations timer ✅
3ème niveau de navigation map→quartier→bâtiment. `batimentEnCours` ref. `ouvrirBatiment()`, `retourQuartier()`. `breadcrumb` computed. `formationActiveInfo` + `formationsCampus`. Timer formations : `inscrireFormation` → `tickFormation` → `terminerFormation`. Vue bâtiment conditionnelle selon `contenu`.

### T24 — Refonte carte + quartiers + vue bâtiment navigation ✅
Quartier Immobilier supprimé de la carte. CONFIG.QUARTIERS/BATIMENTS refactorisés (garage BTP, concessionnaire Finance). `vehiculeRequis` corrigés (BTP:null, commerce:velo, campus:velo). Zones grisées avec emoji véhicule requis si véhicule insuffisant. `vehiculesBatiment` computed filtré par gamme ('bas'→vélo/scooter, 'haut'→voiture+). "Travailler ici" uniquement dans la vue bâtiment.

---

### T22 — Suppression cooldown + Formations + Coût installation ✅

**Fichiers :** `config.js`, `state.js`, `engine.js`, `ui.js` — pas d'index.html.

**config.js :**
- Supprimer `COOLDOWN_CHANGEMENT` et `COUTS_CHANGEMENT` de `CONFIG.MAP`
- Ajouter `CONFIG.MAP.COUT_INSTALLATION: 2000`
- Ajouter `CONFIG.FORMATIONS` (voir section dédiée)
- Ajouter `campus` dans `CONFIG.QUARTIERS`, `ecole` dans `CONFIG.BATIMENTS`
- Mettre à jour `CONFIG.MAP.ZONES` avec les `vehiculeRequis` corrects (voir section)

**state.js :**
- Ajouter `secteursVisites: ['commerce']`
- Ajouter `formations: []`
- Supprimer `_changementSecteurExpiry`
- `initialiserNouvelleGeneration()` : reset `formations = []`, `secteursVisites = ['commerce']`

**engine.js :**
- Supprimer `calculerCoutChangement()`
- Supprimer toute référence à `_changementSecteurExpiry`
- Réécrire `changerSecteur(slug)` — ordre des vérifications :
  1. Même secteur → `{ ok: false, raison: 'meme_secteur' }`
  2. Formation manquante → `{ ok: false, raison: 'formation', message }`
  3. Véhicule insuffisant → `{ ok: false, raison: 'vehicule', message }`
  4. Possessions manquantes (influence) → `{ ok: false, raison: 'possessions', message }`
  5. Première visite + argent insuffisant → `{ ok: false, raison: 'argent', message }`
  6. Première visite : déduit `COUT_INSTALLATION`, push dans `secteursVisites`
  7. `state.secteurActif = slug` → `{ ok: true }`
- Ajouter `acheterFormation(secteur)` : vérifie argent → déduit → push `state.formations`. Exposée via `Object.assign`.

**ui.js :**
- Supprimer `cdGlobalRestant` computed et affichage
- Supprimer `calculerCoutChangement` import + usage
- `carteZones` computed : supprimer `enCooldown`/`cdRestant`, ajouter `formationRequise` (bool) et `coutInstallation` (si première visite)
- Ajouter computed `formationsDisponibles` (CONFIG.FORMATIONS enrichi de `estAchetee`/`abordable`)
- Ajouter handler `actionAcheterFormation(secteur)`
- Template carte : zone formation affiche 🎓 + label formation
- Template quartier campus : vue formations au lieu de façades standard
- Imports et `return` mis à jour

**Contraintes :** zéro régression véhicules/possessions influence. Aucune modification index.html.

---

### UI-R2 — Recentrage bouton d'action + bande finances sticky ✅

**Fichiers :** `index.html`, `ui.js` — engine.js, state.js, config.js non touchés.

**Objectif :** Restructurer la zone centrale pour que le bouton d'action soit directement sous la carte, suivi d'une bande solde/passifs sticky, puis les upgrades scrollables.

**index.html — CSS :**
- `.zone-centrale` : `display: flex; flex-direction: column; overflow: hidden` — ne plus utiliser `align-items: center` globalement
- `.carte-wrap` : `flex: 1; overflow: hidden; display: flex; flex-direction: column; min-height: 0` — contient la carte ou la vue quartier
- `.action-wrap` : `flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 12px 16px; background: #0d0d0d; border-top: 1px solid #1a1a1a; position: relative`
- `.bande-finances` : `flex-shrink: 0; display: flex; align-items: center; justify-content: center; gap: 16px; padding: 8px 16px; background: #0f0f0f; border-top: 1px solid #1a1a1a; font-size: 0.95em`
- `.bande-finances__solde` : `font-weight: bold; color: #e0e0e0`
- `.bande-finances__sep` : `color: #333`
- `.bande-finances__passifs` : `font-size: 0.9em` — vert si ≥ 0, rouge + pulse si < 0
- `.panneau-upgrades` : `flex: 1; overflow-y: auto; padding: 12px; max-width: 580px; width: 100%; align-self: center`
- `.btn-travailler` : `min-width: 220px; max-width: 340px; padding: 14px 32px` — retirer `width: 100%` s'il est présent
- Supprimer `.btn-travailler-wrap` s'il existait comme wrapper sidebar — remplacé par `.action-wrap`

**ui.js — template :**

Restructurer `<main class="zone-centrale">` :

```html
<main class="zone-centrale">

  <!-- Carte ou vue quartier -->
  <div class="carte-wrap">
    <!-- contenu navEcran === 'map' ou 'quartier' inchangé -->
  </div>

  <!-- Bouton d'action -->
  <div class="action-wrap">
    <div class="zone-clic__flottants" aria-hidden="true">
      <span v-for="f in flottants" :key="f.id" class="flottant" :class="f.classe">
        +{{ f.gain.toFixed(2) }} €
      </span>
    </div>
    <button
      class="btn-travailler"
      :style="{ color: multiplicateurActuel.couleur, borderColor: multiplicateurActuel.couleur }"
      @click="state.secteurActif !== 'influence' && onClic()"
      @mousedown="state.secteurActif === 'influence' && onInfluenceDebut()"
      @mouseup="state.secteurActif === 'influence' && onInfluenceFin()"
      @touchstart.prevent="state.secteurActif === 'influence' && onInfluenceDebut()"
      @touchend.prevent="state.secteurActif === 'influence' && onInfluenceFin()"
    >{{ verbeBouton }}</button>
    <div class="action-meta">
      <span class="multiplicateur-diamant" :style="{ color: multiplicateurActuel.couleur }">
        ♦ {{ multiplicateurActuel.label }}
      </span>
      <span class="revenu-par-clic">{{ revenuClicAffiche.toFixed(2) }} €/clic</span>
    </div>
  </div>

  <!-- Bande finances sticky -->
  <div class="bande-finances">
    <span class="bande-finances__solde">💰 {{ state.argent.toFixed(2) }} €</span>
    <span class="bande-finances__sep">|</span>
    <span class="bande-finances__passifs"
      :class="state.cashflowNet >= 0 ? 'cashflow-positif' : 'cashflow-negatif'">
      {{ state.cashflowNet >= 0 ? '+' : '' }}{{ state.cashflowNet.toFixed(2) }} €/s
    </span>
  </div>

  <!-- Upgrades scrollables -->
  <div class="panneau-upgrades">
    <!-- contenu upgrades inchangé -->
  </div>

  <!-- Overlay panneau sidebar -->
  <div v-if="panneauOverlay" class="panneau-overlay">
    <!-- contenu overlay inchangé -->
  </div>

</main>
```

- Retirer `.btn-travailler-wrap` de la `<aside class="sidebar">` s'il y est encore
- Retirer `@mouseleave` influence de la sidebar — le déplacer sur `.action-wrap`
- `.sidebar-finances` dans la sidebar peut être simplifiée ou supprimée (solde maintenant dans `.bande-finances`)
- Le `argent` et `cashflowNet` restent dans la sidebar si tu veux (doublon acceptable) ou on les retire — **garder uniquement dans `.bande-finances`** pour éviter la redondance

**Contraintes :** zéro régression fonctionnelle. Le secteur Influence (hold-to-release) doit continuer à fonctionner via `.action-wrap`.

---

### T23 — Vue bâtiment cliquable + formations timer ✅

**Fichiers :** `config.js`, `state.js`, `engine.js`, `ui.js`, `index.html`

**Objectif :** Ajouter un 3ème niveau de navigation (map → quartier → bâtiment) et refondre le système de formations en mécanique active avec timer.

---

**config.js :**
- Mettre à jour `CONFIG.FORMATIONS` : passer de l'objet actuel à l'array avec champs `{ id, emoji, label, secteur, cout, gainXP, duree }` (voir section "Formations" du MD)
- Vérifier que `CONFIG.QUARTIERS` et `CONFIG.BATIMENTS` sont bien présents (déjà dans le code)

**state.js :**
- Ajouter `formationActive: null` — structure `{ id, secteur, label, dureeRestante, dureeInitiale, gainXP }`
- `initialiserNouvelleGeneration()` : reset `formationActive = null`

**engine.js :**
- Ajouter `inscrireFormation(id)` : vérifie argent ≥ cout + `!state.formationActive` → déduit coût → set `state.formationActive`. Retourne `{ ok, raison? }`.
- Ajouter `etudierFormation()` : si `formationActive` → `dureeRestante = Math.max(0, dureeRestante - 2)` → si 0 appelle `terminerFormation()`. Retourne `{ ok }`.
- Ajouter `terminerFormation()` : crédite `gainXP` dans `xpSecteurs[secteur]` + push secteur dans `formations` + reset `formationActive = null` + dispatch `legacy:formation-complete`.
- Ajouter `tickFormation()` : si `formationActive` → décrémente `dureeRestante` de `TICK_MS/1000` → si ≤ 0 appelle `terminerFormation()`. Brancher dans `tick()`.
- Modifier `acheterFormation()` existant → renommer en `inscrireFormation()` (nouvelle mécanique remplace l'ancienne)
- Exposer `inscrireFormation`, `etudierFormation` via `Object.assign`

**ui.js :**
- Ajouter `const batimentEnCours = ref(null)`
- Ajouter `ouvrirBatiment(slug)`, `retourQuartier()` (voir section navigation MD)
- Ajouter computed `breadcrumb` : string calculée depuis `navEcran` + `quartierEnCours` + `batimentEnCours`
- Ajouter computed `formationActiveInfo` : enrichit `state.formationActive` de `pourcent` et `tempsAffiche` (même pattern que `chantierProgression`)
- Ajouter computed `formationsCampus` : `CONFIG.FORMATIONS` enrichi de `estTerminee` (dans `state.formations`), `enCours` (id === `formationActive?.id`), `disabled` (argent insuffisant OU formationActive en cours sur autre formation)
- Ajouter handler `actionInscrireFormation(id)` et `actionEtudierFormation()`
- Listener `legacy:formation-complete` → `ajouterFlottant`
- Template : ajouter `v-else-if="navEcran === 'batiment'"` dans zone centrale
- Vue bâtiment : breadcrumb + contenu conditionnel selon `CONFIG.BATIMENTS[batimentEnCours].contenu`
  - `'upgrades'` : réutilise `.panneau-upgrades` existant + bouton "Travailler ici"
  - `'boutique'` : réutilise liste items existante
  - `'logements'` : réutilise vue logements existante filtrée par gamme
  - `'vehicules'` : réutilise vue véhicules existante
  - `'formations'` : liste formations avec état (terminée ✓ / en cours barre progression / disponible / locked) + bouton "Étudier" si formationActive
- Dans vue quartier : clic sur `.batiment-card` → `ouvrirBatiment(slugBat)` au lieu de rien
- Exposer `batimentEnCours`, `ouvrirBatiment`, `retourQuartier`, `breadcrumb`, `formationActiveInfo`, `formationsCampus`, `actionInscrireFormation`, `actionEtudierFormation` dans le `return`

**index.html :**
- Ajouter CSS `.breadcrumb`, `.breadcrumb__item`, `.breadcrumb__sep`
- Ajouter CSS `.batiment-vue` (wrapper contenu bâtiment)
- Ajouter CSS `.formation-item`, `.formation-item--terminee`, `.formation-item--en-cours`, `.formation-barre`, `.formation-barre-fill`, `.formation-timer`, `.btn-etudier`

**Contraintes :**
- Zéro régression sur BTP, logement, véhicules, téléphone, ordinateur
- `acheterFormation()` dans engine.js remplacé par `inscrireFormation()` — mettre à jour l'import dans ui.js
- Les overlays sidebar (finances, logement...) continuent de fonctionner en parallèle

---

### T24 — Refonte carte + quartiers + vue bâtiment navigation ✅

**Fichiers :** `config.js`, `ui.js`, `index.html` — engine.js et state.js non touchés.

**Objectif :** Corriger le mapping quartiers/bâtiments, supprimer le quartier Immobilier, et rendre les bâtiments cliquables avec contenu dédié. Le bouton "Travailler ici" apparaît dans le bâtiment, pas dans la vue quartier.

---

**config.js :**
- Remplacer `CONFIG.QUARTIERS` et `CONFIG.BATIMENTS` par les nouvelles valeurs du MD (section "Quartiers et bâtiments")
- Remplacer `CONFIG.MAP.ZONES` par les nouvelles valeurs du MD (section "Véhicules requis par secteur") — retirer la zone `immobilier`
- Ajouter le bâtiment `studio` pour le secteur influence
- `CONFIG.MAP.MESSAGES_BLOCAGE_VEHICULE` : retirer l'entrée `immobilier`, garder les autres

**ui.js :**
- Ajouter `const batimentEnCours = ref(null)`
- Ajouter `ouvrirBatiment(slug)` : `navEcran = 'batiment'`, `batimentEnCours = slug`
- Ajouter `retourQuartier()` : `navEcran = 'quartier'`, `batimentEnCours = null`
- Modifier `ouvrirQuartier(slug)` : ne plus appeler `changerSecteur()` — juste naviguer vers la vue quartier. Le changement de secteur se fait uniquement via "Travailler ici" dans le bâtiment.
- Modifier `entrerDansSecteur(slug)` : inchangé — appelé depuis le bouton "Travailler ici" dans la vue bâtiment
- Computed `breadcrumb` : string depuis navEcran + quartierEnCours + batimentEnCours
  - `'map'` → `'🗺 Ville'`
  - `'quartier'` → `'🗺 Ville > [CONFIG.QUARTIERS[quartierEnCours].label]'`
  - `'batiment'` → `'🗺 Ville > [quartier label] > [CONFIG.BATIMENTS[batimentEnCours].label]'`
- Template vue quartier : clic sur `.batiment-card` → `ouvrirBatiment(slugBat)` — retirer le bouton "Travailler ici" qui était dans la vue quartier
- Template : ajouter `v-else-if="navEcran === 'batiment'"` dans zone centrale avec :
  - Breadcrumb en haut + bouton retour `← [label quartier]`
  - Contenu conditionnel selon `CONFIG.BATIMENTS[batimentEnCours].contenu` :
    - `'upgrades'` → panneau upgrades existant + bouton "▶ Travailler ici" si `CONFIG.BATIMENTS[batimentEnCours].secteur` existe
    - `'boutique'` → liste items boutique existante
    - `'logements'` → vue logements filtrée par `CONFIG.BATIMENTS[batimentEnCours].gamme`
    - `'vehicules'` → vue véhicules filtrée par `gamme` du bâtiment : `'bas'` = vélo + scooter (garage BTP), `'haut'` = voiture + berline + supercar (concessionnaire Finance)
    - `'formations'` → à venir (T23) — afficher placeholder pour l'instant
- Exposer `batimentEnCours`, `ouvrirBatiment`, `retourQuartier`, `breadcrumb` dans le `return`

**index.html :**
- Ajouter CSS `.breadcrumb` : `display: flex; align-items: center; gap: 8px; font-size: 0.8em; color: #666; padding: 8px 12px; flex-shrink: 0`
- Ajouter CSS `.breadcrumb__retour` : bouton discret style `← retour`
- Ajouter CSS `.batiment-vue` : `display: flex; flex-direction: column; flex: 1; overflow: hidden`
- Ajouter CSS `.batiment-vue__titre` : nom du bâtiment en header

**Contraintes :**
- La vue quartier n'a plus de bouton "Travailler ici" — ce bouton est exclusivement dans la vue bâtiment
- On peut visiter un quartier/bâtiment sans changer de secteur actif
- Le secteur actif affiché dans `.carte-info` reste inchangé pendant la navigation
- Zéro régression sur overlays sidebar, BTP, influence

### T28 — Événements aléatoires
- config.js : `CONFIG.EVENEMENTS` — 13 événements (TICK_VERIFICATION:25, PROBA:4%, COOLDOWN:150 ticks). Champs par event : id, label, message, conditions, poids, effets, gravite.
- state.js : `_dernierEvenementTick: 0` + `_ticksDepuisVerifEvenement: 0`. Reset dans `initialiserNouvelleGeneration`.
- engine.js : `evaluerConditions(cond)` interne (karmaMin/Max, argentMin, abonnesMin, hygieneMax, secteurActif, coucheIllegalMin, niveauMin). `appliquerEvenement(event)` exportée — applique tous les effets (argent, argentPourcent, abonnes, abonnesPourcent, karma, jauges), dispatch `legacy:evenement`. `tickEvenements()` branché dans `tick()` — guard `_mortDeclenchee`, cooldown, tirage pondéré. `_tickTotal` module-level reset à chaque génération.
- ui.js : `evenementOverlay` ref + `evenementOverlayInfo` computed (effetsLisibles enrichis). Listener `legacy:evenement` → overlay si majeur, `ajouterFlottant` coloré sinon. `fermerEvenementOverlay()`. `ajouterFlottant` étendu avec param `classe`. Boutique-flottants `:class="f.classe"`.
- index.html : CSS `.overlay-evenement` (z-index 90, amber), `.evt-effet--positif/negatif`, `.boutique-flottant--positif/negatif`.

### T26 — Écran de fin de génération + tableau lignée
- engine.js : `calculerHeritage()` enrichie — ajoute `secteurPrincipal` (xpSecteurs reduce) + `generationNumero`. `onMort()` : stocke l'héritage dans `window._recapGeneration` avant le dispatch `legacy:mort`. `initialiserNouvelleGeneration(boostChoisi = null)` : accepte un boost optionnel, incrémente `state.boostCompetences[boostChoisi]` avant le reset (boostCompetences n'est PAS resetté).
- state.js : `boostCompetences: { commerce:0, finance:0, tech:0, immobilier:0, btp:0, influence:0 }` ajouté après `lignee`.
- ui.js : Refs `recapData` + `boostSelectionne` remplacent `mort` + `heritageAffiche`. Listener `legacy:mort` → lit `window._recapGeneration` + set `panneauOverlay = 'mort'` (pas de ✕ fermeture). Computed `recapGeneration` : enrichit recapData de `boostsDisponibles` (secteurs disponibles) + `ligneeComplete` (state.lignee complet). `actionNouvelleGeneration()` : appelle `initialiserNouvelleGeneration(boostSelectionne.value)` + reset overlay + relance moteur. Overlay mort : 5 sections (recap bilan, stats vie, tableau lignée scrollable, grille 6 boost cards sélectionnables, bouton "Nouvelle génération →").
- index.html : CSS overlay élargi (620px, 90vh max-height scrollable). `.overlay-mort__recap`, `.overlay-mort__ligne`, `.overlay-mort__or`, `.overlay-mort__lignee`, `.lignee-table-wrap`, `.lignee-table`, `.boost-grid`, `.boost-card`, `.boost-card--selected`, `.btn-continuer`.

### T27 — Équilibrage économique global
- config.js uniquement (11 valeurs, commentées `// T27:`).
- `TICKS_PAR_AN` 50→75 (vie ~15.5 min). `NIVEAUX.SEUILS[1]` 100→150 (niv.2 plus graduel). Logements : studio 300→150€/mois, appartement 700→450€/mois, loft 1500→900€/mois. Téléphone 1000→800€. Formation BTP cout 200 (300→200). Vélo 200→300€. Berline mensuelle 500→400€. Supercar mensuelle 1500→1100€. BTP `revenuBase` 5→3. Finance `revenuMax` déjà à 40 (patch T19).

### T25 — Commandes illégales ordinateur
- engine.js : `COMMANDES_ILLEGALES` (const exportée, 3 entrées : fraude_fiscale/piratage/hacking_avance). `getCoucheAccessible()` interne : couche 3 si karma < 35 + coucheIllegalMax ≥ 2, couche 2 si karma < 65 + niv.3 dans un secteur, sinon couche 1. `executerCommandeIllegale(id)` exportée : vérifie ordinateur + couche + cooldown → applique gain aléatoire, karma, reputation, tokens → met à jour `coucheIllegalMax` → cooldown via `state.telephoneCooldowns['illegal_' + id]`. Exposée via `Object.assign`.
- ui.js : import `executerCommandeIllegale` + `COMMANDES_ILLEGALES`. Computed `commandesIllegalesInfo` (enrichit chaque commande de accessible/enCooldown/cdRestant/raison). Handler `actionCommandeIllegale`. Section "⚠ Marché noir" dans la vue ordinateur avec états locked/cooldown/disponible. Ajoutés au return.
- index.html : CSS `.illegales-titre`, `.commandes-illegales`, `.commande-item` + variantes `--locked`/`--cooldown`, palette rouge/orange pixel art dark.
- Valeurs : fraude_fiscale 500–2000€/60s cd, piratage 2000–8000€+5tokens/120s cd, hacking_avance 10000–40000€+15tokens/300s cd.

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

---
*Ne jamais lire le GDD pour coder — toutes les infos techniques sont ici.*
*Mettre à jour "Sessions terminées" à chaque fin de ticket.*
