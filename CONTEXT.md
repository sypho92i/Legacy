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

---
*Ne jamais lire le GDD pour coder — toutes les infos techniques sont ici.*
*Mettre à jour la section "Sessions terminées" à chaque fin de ticket.*
