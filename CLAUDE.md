# LEGACY — Context for Claude Code

> Ce fichier est la **source unique de vérité technique** pour le développement de LEGACY.
> Ne jamais lire le GDD pour coder — toutes les infos utiles sont ici.
> Mettre à jour la section "Sessions terminées" à chaque fin de ticket.

---

## Stack technique

- **Plateforme** : Web navigateur — fichier HTML unique autonome (double-clic pour ouvrir)
- **Framework** : Vanilla HTML/JS — pas de bundler, pas de framework lourd
- **Déploiement** : Vercel, auto-deploy sur push Git (branche `main`)
- **Persistance** : Firebase Realtime Database (intégration future)
- **Style** : CSS pixel art dark — pas de moteur 3D, pas de Unity

---

## Architecture des fichiers

```
index.html          ← point d'entrée unique
src/
  config.js         ← toutes les constantes du jeu (CONFIG object)
  state.js          ← état global réactif (STATE object)
  engine.js         ← boucle de jeu, tick, logique métier
  ui.js             ← rendu DOM, animations, floating text
```

---

## État global — structure de STATE

```js
STATE = {
  // Identité
  nomPersonnage: string,
  age: number,              // 18 au départ
  generation: number,       // commence à 1

  // Finances
  argent: number,
  cashflowNet: number,      // revenus passifs - charges (calculé)

  // Métier
  secteurActif: string,     // 'commerce' | 'finance' | 'tech' | 'immobilier' | 'btp' | 'influence'
  metierActif: string,      // slug du métier en cours
  niveauCompetence: {       // par secteur
    commerce: number,
    finance: number,
    tech: number,
    immobilier: number,
    btp: number,
    influence: number,
  },

  // Jauges (0–100)
  faim: number,
  hygiene: number,
  sante: number,
  bonheur: number,
  reputation: number,
  karma: number,            // 0–100, démarre à 75 (lignée propre)

  // Renommée / téléphone
  abonnes: number,          // jauge renommée sociale
  telephoneActions: [],     // actions débloquées

  // Objets possédés
  possessions: {
    vehicule: string | null,
    logement: string,       // 'squat' par défaut
    ordinateur: boolean,
    tokens: number,
    animaux: [],
    items: [],
  },

  // Illégal
  coucheIllegalMax: number, // 0 | 1 | 2 | 3 — max atteint dans cette vie

  // Lignée
  lignee: [                 // historique des générations
    { nom, age_mort, argent_transmis, karma_final, couche_illegale_max }
  ],
  karmaDepart: number,      // hérité de la lignée (75 par défaut)
  boostCompetences: {       // héritage lignée, plafond +25% par secteur
    commerce: number,
    finance: number,
    // ...
  },
}
```

---

## Boucle de jeu — engine.js

- **Tick** : toutes les **200ms**
- À chaque tick :
  1. Avancer le temps (`age` += incrément)
  2. Descendre les jauges passives (faim, hygiène, santé, bonheur)
  3. Appliquer les revenus passifs → `state.argent`
  4. Débiter les charges fixes
  5. Vérifier les événements probabilistes (karma)
  6. Vérifier conditions de mort (âge, santé, karma)
  7. Appeler `ui.render()`

---

## Formule de revenu par clic

```
revenuClic = revenuBase × multiplicateurCompétence × modifKarma × modifBonheur
```

- `revenuBase` → `CONFIG.METIERS[metierActif].revenuBase`
- `multiplicateurCompétence` → lié au niveau, change de couleur : gris(1) → blanc(2) → jaune(3) → orange(4) → rouge/or(5)
- `modifKarma` → table dans CONFIG (Vertueux +20%, Neutre ±0%, Louche −15%, Criminel −35%, Ennemi public −60%)
- `modifBonheur` → table dans CONFIG (80–100% +20%, 50–80% 0%, 20–50% −25%, 0–20% −50%)

---

## Verbes de clic par métier

Définis dans `CONFIG.VERBE_METIER` :

```js
CONFIG.VERBE_METIER = {
  vendeur:       'Conclure une vente',
  commercial:    'Démarcher un client',
  manager:       'Closer un contrat',
  developpeur:   'Livrer un feature',
  graphiste:     'Livrer un design',
  ouvrier:       'Poser des briques',
  electricien:   'Câbler une installation',
  comptable:     'Clôturer un bilan',
  agent_immo:    'Signer un mandat',
  // ...
  DEFAUT:        'Travailler',
}
```

---

## Système karma — seuils

```js
CONFIG.KARMA = {
  VERTUEUX:      { min: 80, max: 100, modifProd: 1.20 },
  NEUTRE:        { min: 40, max: 80,  modifProd: 1.00 },
  LOUCHE:        { min: 20, max: 40,  modifProd: 0.85 },
  CRIMINEL:      { min: 5,  max: 20,  modifProd: 0.65 },
  ENNEMI_PUBLIC: { min: 0,  max: 5,   modifProd: 0.40 },
}
```

---

## Système illégal — trois couches

| Couche | Accès | Karma/action | Plancher karma |
|--------|-------|-------------|----------------|
| 1 — Opportuniste | Toujours | −2 à −5 | Aucun |
| 2 — Organisé | karma < 65 + compétence niv.3+ | −15 à −25 par palier | 55 max |
| 3 — Haut niveau | karma < 35 + couche 2 active | −30 à −40 par palier | 30 max |

---

## Héritage karma intergénérationnel

```js
function karmaDepart(lignee) {
  const derniere = lignee[lignee.length - 1]
  let base = 75
  if (derniere.couche_illegale_max >= 2) base -= 10
  if (derniere.couche_illegale_max >= 3) base -= 10  // total -20
  // generations consecutives couche 3
  const consec = compterGenerationsConsecutivesCouche3(lignee)
  if (consec >= 2) base -= 15  // total -35
  if (consec >= 3) base -= 15  // total -50 → 25
  return Math.max(0, base)
}
// Rédemption : +5 par génération vertueuse consécutive (sans couche 2+)
```

---

## Téléphone — actions et renommée

- `state.abonnes` = jauge renommée (nombre d'abonnés)
- Actions débloquées progressivement, **non affichées à l'avance**
- Seuils de déblocage dans `CONFIG.TELEPHONE.SEUILS_DEBLOCAGE`

```js
CONFIG.TELEPHONE = {
  ACTIONS: {
    monter_compte:     { disponible: true,  effet: '+abonnes +renommee',  cout: 0 },
    promouvoir:        { disponible: true,  effet: '+renommee +passif',   cout: 0 },
    jeux_mobile:       { disponible: true,  effet: '+bonheur_temp',       cout: 0 },
    placement_produit: { seuil_abonnes: 10000,  effet: 'passif_marques'      },
    revenus_youtube:   { seuil_abonnes: 100000, effet: 'passif_youtube'       },
    // features cachées supplémentaires...
  }
}
```

---

## Ordinateur — commandes et tokens

- `state.possessions.ordinateur` : boolean
- `state.possessions.tokens` : number
- Commandes dans `CONFIG.ORDINATEUR.COMMANDES`

```js
CONFIG.ORDINATEUR = {
  COMMANDES: {
    bourse:          { tokens: 1, effet: '+passif_financier',  legal: true  },
    don_caritatif:   { tokens: 1, effet: '+karma +reputation', legal: true  },
    recherche:       { tokens: 1, effet: '+boost_secteur_temp',legal: true  },
    fraude_fiscale:  { tokens: 2, effet: '+argent_massif',     karma: -15,  couche: 1 },
    piratage:        { tokens: 3, effet: '+actifs_vol',        karma: -25,  couche: 2 },
    hacking_avance:  { tokens: 5, effet: '+revenus_massifs',   karma: -40,  couche: 3 },
  },
  PACKS_TOKENS: [
    { quantite: 5,  prix: 500  },
    { quantite: 10, prix: 900  },
    { quantite: 20, prix: 1600 },
  ]
}
```

---

## Vue carte — map de la ville

- Bouton dédié dans l'interface principale → ouvre la vue map (overlay ou vue séparée)
- Vue du dessus, pixel art
- Zones cliquables = changement de secteur actif

```js
CONFIG.MAP = {
  ZONES: {
    quartier_commercial: { secteur: 'commerce',   disponible: true  },
    quartier_populaire:  { secteur: null,          disponible: true  },
    // futures zones débloquables...
  }
}
```

---

## Véhicules — mobilité et charges

```js
CONFIG.VEHICULES = {
  velo:          { secteurs: 1, reputation: 0,  charge_mensuelle: 0,    karma_saisie: 0   },
  scooter:       { secteurs: 2, reputation: 5,  charge_mensuelle: 50,   karma_saisie: 0   },
  voiture:       { secteurs: 2, reputation: 10, charge_mensuelle: 200,  karma_saisie: 0   },
  berline:       { secteurs: 2, reputation: 20, charge_mensuelle: 600,  karma_saisie: -5  },
  supercar:      { secteurs: 3, reputation: 35, charge_mensuelle: 2000, karma_saisie: -15 },
}
```

---

## Boutique — catégories

| Slug | Type | Effet principal |
|------|------|----------------|
| `logement` | Permanent | +bonheur base, transmissible |
| `loisirs` | Temporaire | +bonheur fort, limité |
| `voyages` | Temporaire | +bonheur, passifs maintenus |
| `alimentation` | Quotidien | +faim, +bonheur temp |
| `sante` | Permanent | +espérance de vie |
| `social` | Karma | +karma, +opportunités |
| `ordinateur` | Permanent | débloque commandes avancées |
| `tokens` | Consommable | fuel ordinateur |

---

## UI — conventions

- **Floating text** : ref locale dans ui.js (`flottants`), hors state.js. Animation CSS `@keyframes flotter` 800ms, nettoyage par `setTimeout`.
- **Couleur multiplicateur** : calculée dans ui.js selon `niveauCompetence[secteurActif]`
- **Pulse cashflow négatif** : icône menu Finances pulse en rouge CSS si `cashflowNet < 0`
- **Jauge karma** : couleur progressive vert→rouge via CSS `hsl()` interpolé

---

## Sessions terminées

### Ticket 1 — Structure HTML/JS de base
Fichiers créés : `index.html`, `src/state.js`, `src/engine.js`, `src/ui.js`, `src/config.js`.
Moteur vide opérationnel : boucle tick 200ms, état global réactif, HUD + jauges + bouton clic squelettes, zéro logique métier.

### Ticket 2 — Bouton de clic avec gain de monnaie
- `onClic()` incrémente `state.argent` via `calculerRevenuClic()` (formule complète : `revenuBase × multiplicateurCompétence × modifKarma × modifBonheur`).
- Floating text : `flottants` ref locale (UI pure, hors state.js), animation CSS `@keyframes flotter` 800ms, nettoyage par `setTimeout`.
- Verbe bouton : `verbeBouton` computed depuis `CONFIG.VERBE_METIER[metierActif]` avec fallback `VERBE_METIER_DEFAUT`.
- `revenuClicAffiche` computed remplace l'ancienne valeur statique `state.revenuParClic` dans le template.

### Ticket 3 — Arbre d'upgrades Commerce — UI liste
- `CONFIG.METIERS.commerce.upgrades` défini dans `config.js` : 6 upgrades chainés par `prerequis` (u_c1→u_c6).
- Coût calculé dynamiquement : `Math.round(100 * Math.pow(2.8, n - 1))` (n = index 1-based).
- `renderUpgradesCommerce` : computed Vue dans `AppRoot.setup()`, retourne le tableau des upgrades enrichis de `{ cout, etat }`.
- Trois états exclusifs : `disponible` (argent OK + prérequis OK), `trop-cher` (prérequis OK, pas assez d'argent), `verrouille` (prérequis non rempli).
- État `achete` géré implicitement : upgrade présent dans `state.upgrades` (array) → plus de bouton, ✓ affiché.
- Bouton `disabled` via `:disabled="upg.etat !== 'disponible'"` — pas seulement visuel.
- Cadenas `🔒` affiché si `verrouille`, pas de bouton.
- CSS upgrades ajouté dans `index.html` (`.upgrade-item--disponible`, `--trop-cher`, `--verrouille`, `--achete`, `.upgrade-cout--rouge`).
- Logique d'achat NON implémentée (ticket suivant). engine.js et state.js non modifiés.

### Ticket 4 — Arbre d'upgrades Commerce — Logique achat
- `state.bonusUpgrades: 0` ajouté dans state.js (cumul additif des bonus clic).
- `passifValeur` ajouté sur u_c4/u_c5/u_c6 dans config.js (8, 25, 50 — valeurs implicites dans les strings effet).
- `calculerRevenuClic()` mis à jour : `(CONFIG.REVENU_BASE_CLIC + state.bonusUpgrades) × ...` — bonus additif.
- `acheterUpgrade(id)` dans engine.js : vérifie argent ≥ coût, prérequis rempli, non déjà acheté → déduit argent, push `{ id }` dans `state.upgrades`, applique effet (bonusClic additif sur `state.bonusUpgrades` / passifId push dans `state.passifs`). Exposée via `window.acheterUpgrade`.
- ui.js : import `acheterUpgrade`, exposé dans setup() return, `@click="acheterUpgrade(upg.id)"` sur le bouton Acheter.

### Ticket 5 — Système de revenus passifs (tick/seconde)
- `CONFIG.MALUS_PASSIF_TICK: 5` ajouté dans config.js (€/s déduits si bonheur < 20).
- `getPlafondPassif(passifId)` : cherche `upgrade.plafond` dans CONFIG.METIERS pour le passif correspondant — retourne null si absent (aucun plafond appliqué). Prêt pour quand les plafonds seront définis.
- `tauxPassifPlafonné(p)` : applique le plafond si défini, sinon retourne `p.tauxParSeconde` brut.
- `getTauxPassifTotal()` exportée : somme des taux plafonnés — utilisée par tickPassifs() et par le HUD via computed Vue.
- `tickPassifs()` modifiée : calcule via `getTauxPassifTotal()`, applique malus bonheur si `state.jauges.bonheur < 20` (soustrait `MALUS_PASSIF_TICK` du taux €/s, plancher 0), puis multiplie par tick ratio.
- HUD : `| Passifs : +X.X €/s` ajouté dans `.hud__meta` — computed `tauxPassifAffiche` réactif sur `state.passifs`. Temporaire, migrera en vue Finances.

### Ticket 6 — Système de niveaux par secteur (Commerce)
- `state.secteurActif: 'commerce'` et `state.xpSecteurs: { commerce:0, finance:0, ... }` ajoutés dans state.js.
- `CONFIG.NIVEAUX` ajouté dans config.js : `SEUILS: [0, 100, 280]`, `PALIERS_COMMERCE: { 1:'Vendeur', 2:'Responsable commercial', 3:'Franchisé' }`, `FACTEUR_XP: 1.8`.
- `niveauRequis` ajouté sur chaque upgrade Commerce : u_c1/u_c2 → 1, u_c3/u_c4 → 2, u_c5/u_c6 → 3.
- `calculerXpClic()` dans engine.js : `Math.max(0.1, 1 × modifKarma × modifBonheur)`. Exportée.
- `calculerNiveau(secteur)` dans engine.js : cherche le palier atteint dans SEUILS (itération descendante), retourne 1–3. Exportée.
- `onClic()` dans ui.js : après gain argent, `state.xpSecteurs[state.secteurActif] += calculerXpClic()`.
- `renderUpgradesCommerce` mis à jour : condition `verrouille` = `!prerequisRempli || !niveauOk` (niveauOk = niveauAtteint >= upg.niveauRequis).
- Computeds ajoutés dans setup() : `niveauCommerce`, `nomPalierCommerce`, `xpCommerceInfo` (current/max/pct pour la barre).
- Template upgrades : bloc `.niveau-commerce` affiché en tête — palier + numéro de niveau + barre XP bleue + label `X / Y XP`.
- CSS ajouté dans index.html : `.niveau-commerce`, `.xp-piste`, `.xp-barre`, `.xp-label`.

### Ticket 6b — Extension niveaux Commerce : 3 → 5 paliers
- `CONFIG.NIVEAUX.SEUILS` : `[0, 100, 400, 1200, 3500]` — 5 paliers.
- `CONFIG.NIVEAUX.PALIERS_COMMERCE` : 1→Vendeur, 2→Responsable commercial, 3→Franchisé, 4→Directeur régional, 5→Magnat.
- `niveauRequis` : u_c1→1, u_c2→2, u_c3→2, u_c4→3, u_c5→4, u_c6→5.
- Seul config.js modifié — `calculerNiveau` (engine.js) est générique, gère N seuils sans changement.

### Ticket 7 — Afficher les jauges
- `CONFIG.JAUGE_DEPART: 80` ajouté dans config.js — valeur initiale de toutes les jauges.
- `JAUGE_DECAY_PAR_TICK` mis à jour : faim −0.008, hygiene −0.004, bonheur −0.005, sante −0.002, reputation 0.
- Constantes d'interaction ajoutées : `JAUGE_SEUIL_FAIM: 20`, `JAUGE_MALUS_SANTE_PAR_TICK: 0.003`, `JAUGE_SEUIL_HYGIENE: 20`, `JAUGE_MALUS_REPUTATION_PAR_TICK: 0.002`.
- state.js : toutes les jauges initialisées à `CONFIG.JAUGE_DEPART` (80), reputation passe de 50 → 80.
- engine.js : `tickJauges()` refactorisée — helper `clampJauge()`, déclin passif en boucle, puis interactions conditionnelles (faim < 20 → malus sante, hygiene < 20 → malus reputation).
- ui.js / index.html : aucun changement (JaugeBar et CSS déjà opérationnels depuis ticket 6).

### Ticket 8 — Système de mort et boucle générationnelle
- `CONFIG.DEBUG: false` ajouté dans config.js.
- state.js : `nomPersonnage: 'Héros'`, `coucheIllegalMax: 0`, `lignee: []` (tableau `{ nom, age_mort, argent_transmis, karma_final, couche_illegale_max }`).
- engine.js : `tickAge()` ne déclenche plus `onMort()` — délégué à `verifierMort()`.
- `verifierMort()` : vérifie `sante ≤ 0 || age ≥ CONFIG.AGE_MORT`, garde `_mortDeclenchee` pour éviter le double déclenchement.
- `tickEvenementsKarma()` : ENNEMI_PUBLIC (karma 0–5) → 2%/tick → `sante −= 15` (clampé).
- `calculerHeritage()` exportée : `{ nom, age_mort, argent_transmis (50%), karma_final, couche_illegale_max }`.
- `karmaDepart(lignee)` interne : malus couche 2 (−10), couche 3 (−10), consécutivité couche 3 ≥2 (−15), ≥3 (−15), rédemption vertueuse (+5/génération).
- `onMort()` : push héritage dans `state.lignee`, stop moteur, dispatch `legacy:mort` avec `{ heritage }`.
- `initialiserNouvelleGeneration()` exportée : `generation += 1`, reset age/jauges/upgrades/passifs/XP, argent = `argent_transmis` du dernier héritage, karma = `karmaDepart(state.lignee)`.
- `startEngine()` : reset `_mortDeclenchee = false`.
- `tick()` : ajout de `tickEvenementsKarma()` + `verifierMort()` en fin de boucle.
- ui.js : refs `mort` + `heritageAffiche` + listener `legacy:mort` → overlay. Computed `competencesAuDeces` (xpSecteurs → niveau par secteur). Fonctions `nouvelleGeneration()` + `mortSimulee()` (debug).
- Overlay plein écran : résumé (nom, âge, argent transmis, karma) + grille 6 compétences + bouton "Nouvelle génération →".
- Bouton debug `☠ Mort simulée` visible uniquement si `CONFIG.DEBUG === true`.
- index.html : CSS `.overlay-mort`, `.ecran-mort` et enfants, `.debug__mort`.

### Ticket 9 — Boutique basique
- `CONFIG.JAUGE_DECAY_PAR_TICK` mis à jour ×3 : faim 0.024, hygiene 0.012, bonheur 0.015, sante 0.006.
- `CONFIG.BOUTIQUE.ITEMS` ajouté dans config.js : 5 items (`repas_simple` 10€ +40 faim, `repas_correct` 25€ +70 faim, `douche` 5€ +50 hygiene, `medecin` 50€ +35 sante, `loisir` 30€ +40 bonheur).
- `acheterItem(id)` exportée dans engine.js : vérifie argent, déduit prix, clamp jauge, retourne item ou null. Exposée via `window.acheterItem`.
- ui.js : `acheterItem` importée. Computed `itemsBoutique` (items + flag `disabled`). Handler `acheterItemBoutique(id)` + floating text 800ms. `boutiqueFlottants` ref locale.
- Template restructuré : contenu existant enveloppé dans `.main-col`, `<aside class="boutique-panel">` toujours visible à droite avec les 5 items. Bouton "Boutique" retiré du menu nav.
- index.html : `#app` passe de flex-column à CSS grid 2 colonnes (`1fr 200px`). `.main-col` occupe `grid-row: 1/3`. `.debug` span les 2 colonnes. CSS `.boutique-panel`, `.boutique-item`, `.boutique-item__btn`, `.boutique-flottant` ajoutés.

---
*Ne jamais lire le GDD pour coder — toutes les infos techniques sont ici.*
*Mettre à jour la section "Sessions terminées" à chaque fin de ticket.*
