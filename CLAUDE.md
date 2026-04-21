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

### Ticket 10 — Vue Finances & cashflowNet
- state.js : `cashflowNet: 0` ajouté dans la section Finances.
- engine.js : `calculerCashflowNet()` exportée — `state.cashflowNet = getTauxPassifTotal() - 0` (totalCharges = 0, prêt pour Ticket 11). Appelée dans `tick()` avant `verifierMort()`.
- ui.js : computed `tauxPassifAffiche` supprimée (orpheline). HUD — ligne `| Passifs : +X.X €/s` retirée. Ref `ongletFinances` + computeds `financesRevenus` / `financesCharges` ajoutés. Bouton Finances : classe `menus__btn--pulse-rouge` si `state.cashflowNet < 0`. Menu Finances : 3 onglets — Revenus (liste passifs + total), Charges (vide), Bilan (cashflowNet en grand, détail revenus/charges). `.menus button` → `.menus__btn` (sélecteur de classe).
- index.html : CSS `.menus__btn`, `.menus__btn--pulse-rouge`, `@keyframes pulse-rouge`. CSS `.finances-onglets`, `.finances-onglet`, `.finances-contenu`, `.finances-vide`, `.finances-liste`, `.finances-ligne`, `.finances-total`, `.finances-bilan` et variantes couleur.

### Ticket 11 — Multiplicateur coloré du clic
- `CONFIG.MULTIPLICATEURS_NIVEAU` ajouté dans config.js : tableau de 5 objets `{ niveau, valeur, couleur, label }` — niv.1 ×1.0 gris, niv.2 ×1.5 blanc, niv.3 ×2.2 jaune, niv.4 ×3.2 orange, niv.5 ×5.0 rouge/or.
- `getMultiplicateurNiveau(secteur)` exportée dans engine.js : appelle `calculerNiveau(secteur)`, cherche l'entrée correspondante dans `CONFIG.MULTIPLICATEURS_NIVEAU`, fallback sur index 0.
- `calculerRevenuClic()` mis à jour : `getMultiplicateurCompetence(state.competence)` remplacé par `getMultiplicateurNiveau(state.secteurActif).valeur`.
- ui.js : import `getMultiplicateurNiveau`. Computed `multiplicateurActuel` → `getMultiplicateurNiveau(state.secteurActif)`. Exposé dans `return`.
- Template : span `btn-clic__multi` (valeur statique) retiré du bouton. `<span class="multiplicateur-diamant" :style="{ color: multiplicateurActuel.couleur }">♦ {{ multiplicateurActuel.label }}</span>` ajouté adjacent au bouton dans `.btn-clic-wrap`.
- index.html : CSS `.multiplicateur-diamant` ajouté (font-size 1.15em, bold, transition color 0.3s).
- Couleur du bouton de clic rendue dynamique : `:class="'btn-clic--' + state.multiplicateurCouleur"` remplacé par `:style="{ color: multiplicateurActuel.couleur }"`. La bordure suit via `currentColor`. Transition `color 0.3s` ajoutée sur `.btn-clic`. Les anciennes classes CSS `.btn-clic--gris/blanc/jaune/orange/or` ne sont plus utilisées pour le bouton principal.

### Ticket 12 — Boutique logement — 6 niveaux
- `CONFIG.LOGEMENTS` ajouté dans config.js : 7 entrées (squat/defaut + 3 locations + 3 achats), champs `{ type, nom, cout, charge, bonheur, transmissible }`.
- `CONFIG.LOGEMENT_TICK_PRELEVEMENT: 25` (= ~6 mois de jeu), `CONFIG.JAUGES_MALUS_SQUAT` (reputation −0.005/tick, hygiene decay bonus −0.008/tick, bonheur plafond 40), `CONFIG.EXPULSION` (choc reputation −15, choc bonheur −20).
- state.js : `state.possessions` créé (`logement: 'squat'`, `logementAchete: false`, plus vehicule/ordinateur/tokens/animaux/items pour les tickets futurs). `state._ticksDepuisLoyer: 0` ajouté au root.
- engine.js : `louerLogement(slug)` (vérifie type=location + premier loyer abordable, set logement) et `acheterLogement(slug)` (déduit cout, set logement+logementAchete=true) exportées + exposées via window. `tickLogement()` : malus squat continus (reputation/hygiene/plafond bonheur) si squat, sinon prélèvement loyer tous les 25 ticks avec expulsion si insolvable. `calculerCashflowNet()` : totalCharges = `CONFIG.LOGEMENTS[state.possessions.logement].charge`. `initialiserNouvelleGeneration()` : logement hérité si `logementAchete`, sinon reset squat. `tickLogement()` branché dans `tick()`.
- ui.js : import `louerLogement`/`acheterLogement`. Computeds `logementActuel`, `logementLocations`, `logementAchats`. Handlers `actionLouer`/`actionAcheter`. `financesCharges` remplacé par computed réel. `totalChargesAffiche` computed. Bouton `🏠 Logement` dans nav. Vue logement dédiée dans le panel. Onglet Charges Finances mis à jour. Bilan : ligne charges dynamique.
- index.html : CSS `.logement-vue`, `.logement-actuel`, `.logement-section-titre`, `.logement-liste`, `.logement-item`, `.logement-item--actuel`, `.logement-item--verrouille`, `.logement-item__*`.

### Ticket 13 — Système Téléphone
- `CONFIG.BOUTIQUE.TELEPHONE: { prix: 1000 }` ajouté dans config.js.
- `CONFIG.TELEPHONE.ACTIONS` ajouté : 4 actions — `monter_compte` (cd 45s, +50 abonnés ×2 si vertueux), `promouvoir` (cd 90s, +200 abonnés + passif `passif_promo` 0.5 €/s non cumulable), `jeux_mobile` (cd 20s, +15 bonheur immédiat + `_bonheurTempExpiry` 30s), `placement_produit` (cd 180s, seuil 10k abonnés, passif `passif_placement` 3 €/s cumulable max 5).
- state.js : `possessions.telephone: false`, `abonnes: 0`, `telephoneCooldowns: {}`, `_bonheurTempExpiry: 0`.
- engine.js : `acheterTelephone()` exportée (vérifie argent ≥ 1000 + !telephone). `executerActionTelephone(id)` exportée : vérifie possession + seuil abonnés + cooldown → applique effet → enregistre `telephoneCooldowns[id] = Date.now() + cooldown×1000`. Bonus karma vertueux ×2 sur abonnés. Passif non cumulable (promouvoir) vs cumulable avec passifMax (placement_produit). `initialiserNouvelleGeneration()` : reset telephone/abonnes/telephoneCooldowns/_bonheurTempExpiry.
- ui.js : `ref now` + `setInterval 1s`. Computed `telephoneActions` (enrichit chaque action de enCooldown/cdRestant/seuilOk/plafondOk/disabled via now.value). Computed `abonnesAffiche` (format k/M). Handlers `actionAcheterTelephone` + `actionTelephone` (floating text via boutiqueFlottants). Bouton 📱 Téléphone dans nav avec badge prix si non acheté. Vue 'telephone' : écran d'achat si !telephone, sinon header abonnés + liste 4 actions (locked/cooldown/max/dispo).
- index.html : CSS `.nav-badge--prix`, `.telephone-vue`, `.telephone-achat`, `.telephone-mock`, `.telephone-btn-achat`, `.telephone-screen`, `.telephone-header`, `.telephone-abonnes`, `.telephone-actions`, `.telephone-action` + variantes `--locked/--cooldown/--disabled`, `__emoji/__label/__lock/__cd/__btn`.

### Ticket 14 — Ordinateur : achat, tokens, 3 commandes légales
- `CONFIG.BOUTIQUE.ORDINATEUR: { prix: 10000 }` ajouté dans config.js.
- `CONFIG.ORDINATEUR` ajouté : `PACKS_TOKENS` (3 packs : 5/10/20 tokens, prixBase 500/900/1600), `MULTIPLICATEURS_GENERATION` (gen 1→1.0, 2→1.5, 3→2.2, defaut→3.0), `MULTIPLICATEURS_AGE` (18-30→×1.0, 30-50→×1.3, 50-70→×1.6, 70+→×2.0), `COMMANDES` (3 légales : `bourse` passif cumulable 2€/s max 10, `don_caritatif` +8 karma +10 rep, `recherche` boost XP ×1.20 pendant 60s).
- state.js : `_boostXpExpiry: 0` ajouté (possessions.ordinateur et tokens existaient déjà).
- engine.js : `calculerXpClic()` modifiée — si `Date.now() < state._boostXpExpiry`, multiplie par `boostXpMulti`. `calculerPrixTokens(prixBase)` exportée : `Math.round(prixBase × multiGen × multiAge)`. `acheterOrdinateur()`, `acheterTokens(quantite)`, `executerCommande(id)` exportées + exposées via window. `initialiserNouvelleGeneration()` : reset `_boostXpExpiry = 0`.
- ui.js : import 3 nouvelles fonctions + `calculerPrixTokens`. Computeds `prixPacksTokens` (PACKS_TOKENS enrichis de prixReel), `tokensAffiche`, `boostXpActif` (via `now`), `boostXpRestant`. Handlers `actionAcheterOrdinateur`, `actionAcheterTokens`, `actionExecuterCommande` (floating text). Bouton 💻 Ordinateur dans nav avec badge 10k€ si non acheté. Vue 'ordinateur' : écran achat si !ordinateur, sinon section Tokens (solde + 3 packs avec prix réel) + section Commandes (3 items, badge 🔬 ACTIF Xs si boost actif).
- index.html : CSS `.ordinateur-vue/achat/screen`, `.ordinateur-section-titre`, `.ordinateur-tokens-solde`, `.ordinateur-packs`, `.ordinateur-pack/__btn/--indispo`, `.ordinateur-commandes`, `.ordinateur-commande/--disabled`, `__emoji/__label/__cout/__btn`, `.ordinateur-boost-badge`.

### Ticket 15 — Vue Carte / Map
- `CONFIG.MAP` ajouté dans config.js : `COOLDOWN_CHANGEMENT: 300s`, `COUTS_CHANGEMENT` (6 clés directionnelles + defaut 5000), `ZONES` (commerce/finance/tech avec x/y% et disponible).
- state.js : `_changementSecteurExpiry: 0`.
- engine.js : `calculerCoutChangement(secteurCible)` exportée (lookup cle directionnelle ou defaut). `changerSecteur(secteurCible)` exportée : vérifie same/cooldown/argent → déduit → change secteurActif → enregistre expiry. `initialiserNouvelleGeneration()` : reset _changementSecteurExpiry + secteurActif = 'commerce'.
- ui.js : `vueActive = ref(null)` + `toggleCarte()`. `toggleMenu()` reset vueActive. Computed `carteZones` (enrichit zones de estActuelle/enCooldown/cdRestant/cout/abordable/disabled via now.value). Computed `cdGlobalRestant` (format mm:ss). Handler `actionChangerSecteur`. Bouton 🗺 Carte dans nav (`.menus__btn--actif` si actif). Template : `v-if="vueActive !== 'carte'"` sur zone-clic, vue carte complète avec 3 zones positionnées en % + panneau info bas. Finance et Tech affichent 🔒 Bientôt (disponible: false).
- index.html : CSS `.menus__btn--actif`, `.carte-container`, `.carte-map` (grille pixel art CSS), `.carte-zone` + variantes `--active/--locked/--cooldown/--indispo`, `__emoji/__label/__lock/__badge/__cout`, `.carte-info`, `.carte-cooldown-global`.

### Ticket 16 — Secteur Tech
- config.js : `CONFIG.NIVEAUX.PALIERS_TECH` ajouté (`1:Développeur junior` → `5:Fondateur`). `CONFIG.METIERS.tech` ajouté : `revenuBase: 12`, 6 upgrades à structure plate (u_t1→u_t6 : Laptop pro/IDE premium/Framework maison/Open source repo/Équipe tech/SaaS produit). `CONFIG.METIERS.commerce.revenuBase: 1` explicité. `CONFIG.MAP.ZONES.tech.disponible: true`.
- engine.js : `calculerRevenuClic()` utilise `CONFIG.METIERS[state.secteurActif]?.revenuBase ?? CONFIG.REVENU_BASE_CLIC` — chaque secteur a son propre revenu de base.
- ui.js : 4 computeds généralisés — `renderUpgradesCommerce→renderUpgradesSecteur` (lit `CONFIG.METIERS[state.secteurActif]`), `niveauCommerce→niveauSecteur`, `nomPalierCommerce→nomPalierSecteur` (lookup `CONFIG.NIVEAUX['PALIERS_' + secteur.toUpperCase()]`), `xpCommerceInfo→xpSecteurInfo`. `verbeBouton` : cherche `secteurActif` en premier, puis `metierActif`, puis DEFAUT. Template : toutes les refs commerce-spécifiques remplacées par les génériques. Ajout `<p v-if="renderUpgradesSecteur.length === 0">` pour les secteurs sans upgrades. Return mis à jour.
- index.html : aucun changement CSS nécessaire (styles upgrades/niveaux déjà génériques).

### Ticket 17 — Secteur Finance
- config.js : `VERBE_METIER.finance: 'Passer un ordre'`. `CONFIG.METIERS.finance` : `revenuBase: null`, `revenuMin: 5`, `revenuMax: 25`, 6 upgrades à structure `effet` imbriquée (u_f1→u_f6 : Compte courtier/Analyse technique/Portefeuille diversifié/Fonds d'investissement/Hedge fund/Empire financier). `CONFIG.NIVEAUX.PALIERS_FINANCE` (Stagiaire→Magnat). `MAP.ZONES.finance.disponible: true`.
- state.js : `_dernierGainClic: 0` ajouté (dernier revenu brut pour feedback couleur).
- engine.js : `calculerRevenuClic()` — branche finance : base aléatoire `[5–25]` + `bonusUpgrades`, arrondi à 2 décimales, stocké dans `_dernierGainClic`, retourné sans modif karma/bonheur. Autres secteurs : comportement inchangé, stockent aussi dans `_dernierGainClic`. `acheterUpgrade()` : supporte les deux structures — plate (`upgrade.bonusClic`) ET imbriquée (`upgrade.effet.bonusClic`) — via `upgrade.effet?.bonusClic ?? upgrade.bonusClic`.
- ui.js : `onClic()` — après calcul du gain, si `secteurActif === 'finance'` : classe `flottant--positif` (>20€), `flottant--negatif` (<10€), `flottant--neutre` (sinon). Stockée dans l'objet flottant. Template : `:class="f.classe"` ajouté sur le span flottant.
- index.html : `.flottant--positif` (vert vif, bold, 1.1em), `.flottant--negatif` (rouge), `.flottant--neutre` (jaune). Couleur par défaut `.flottant` conservée pour les autres secteurs.

### Ticket 18 — Véhicules
- config.js : `CONFIG.VEHICULES` (5 véhicules : velo→supercar, champs prix/chargeMensuelle/karma/reputation/bonusClic). `MAP.ZONES.finance.vehiculeRequis: 'voiture'`, `MAP.ZONES.tech.vehiculeRequis: 'berline'`. `MAP.MESSAGES_BLOCAGE_VEHICULE` (messages humoristiques inline pour finance et tech).
- state.js : `_dernierGainClic` déjà présent. `possessions.vehicule: null` déjà présent. Aucun changement.
- engine.js : `ORDRE_VEHICULES` constant interne. `vehiculePermetSecteur(secteurCible)` exportée : compare index ORDRE du véhicule actuel vs requis (null = toujours OK). `acheterVehicule(id)` exportée : annule effets ancien véhicule (karma/reputation), applique nouveau. `calculerRevenuClic()` : ajoute `vehiculeBonus` (bonusClic du véhicule actuel) pour tous les secteurs. `calculerCashflowNet()` : inclut `chargeMensuelle` du véhicule dans totalCharges. `changerSecteur()` : vérifie `vehiculePermetSecteur` en premier, retourne `{ raison: 'vehicule', message }` si bloqué.
- ui.js : import `acheterVehicule`/`vehiculePermetSecteur`. `messageBlocageCarte = ref('')`. `toggleVehicules()`. Computeds `vehiculeActuel`, `boutiqueVehicules` (avec flags estActuel/abordable/estInferieur via `_ORDRE_VEHICULES`). Handler `actionAcheterVehicule`. `actionChangerSecteur` : affiche message inline si `raison === 'vehicule'`. Template : zone-clic `v-if="vueActive === null"` (générique). Bouton 🚗 Véhicules dans nav. Vue vehicules : 5 cards avec prix/charges/effets/badge ACTUEL/Déjà dépassé. `carte-message-blocage` inline sous la carte.
- index.html : CSS `.vehicule-card` et variantes, `.carte-message-blocage`.

### Ticket 19 — Secteur Immobilier + patches
- config.js : `VERBE_METIER.immobilier: 'Signer un bail'`. `NIVEAUX.PALIERS_IMMOBILIER` (Propriétaire débutant→Magnat de l'Immo). `METIERS.immobilier` : revenuBase 20, 8 upgrades avec prix explicite et passifs passif_immo_1→8. `CONFIG.IMMOBILIER.EVENEMENTS` : 4 événements pondérés (travaux/locataire_fuite/hausse_marche/locataire_premium) + INTERVALLE_MIN/MAX 110–130s. Zone `immobilier` dans MAP.ZONES (berline requise). Messages blocage mis à jour pour finance/tech/immobilier. Patch : finance vehiculeRequis→supercar, tech→voiture, finance revenuMax→40.
- state.js : `_immoEvenementExpiry: 0`, `_immoPassifMulti: 1.0`, `_immoPassifMultiExpiry: 0`.
- engine.js : `acheterUpgrade` utilise `upgrade.prix` quand défini (sinon formule générique). `getTauxPassifTotal` applique `_immoPassifMulti` aux passifs `passif_immo_*`. `declencherEvenementImmo()` exportée : tirage pondéré, applique effets, planifie prochain événement, dispatch `legacy:immo-event`. `tickImmo()` : reset passifMulti expiré (global), init/déclenchement événements si secteur immo. Branchée dans `tick()`. Reset immo dans `initialiserNouvelleGeneration`.
- ui.js : `derniereNotifImmo = ref(null)` + listener `legacy:immo-event` (clear 4s). `immoPassifBadge` computed. `renderUpgradesSecteur` : coût via `upgrade.prix ?? formule`, `effetTexte` généré (string, bonusClic, passifId) — corrige [object Object] pour finance/immo. Template : notif `.immo-notif` fixée, badge `.immo-passif-badge` si multi ≠ 1, `.upgrade-prix` affiché si prix explicite.
- index.html : CSS `.immo-notif`, `@keyframes fadeInOut`, `.immo-passif-badge`, `.upgrade-prix`.

### Ticket 20 — Secteur BTP : chantiers avec timer
- config.js : `VERBE_METIER.btp: 'Donner un coup de main'`. `NIVEAUX.PALIERS_BTP` (Ouvrier→Groupe BTP). `METIERS.btp` : `revenuBase: 5`, `clicAccelere: 1`, 7 upgrades chaînés (u_b1→u_b7, 30s/500€ → 900s/100 000€, sans prix d'achat). `MAP.ZONES.btp` : disponible, vehiculeRequis 'velo'. `MAP.MESSAGES_BLOCAGE_VEHICULE.btp: null`.
- state.js : `chantierActif: null` (`{ id, label, dureeRestante, dureeInitiale, recompense }`) et `btpCompletes: []` (ids complétés, sert de prérequis pour la chaîne).
- engine.js : `lancerChantier(id)` vérifie secteur/chantier actif/niveau/prérequis btpCompletes. `terminerChantier()` crédite argent, push btpCompletes, null chantierActif, dispatch `legacy:btp-complete`. `tickBtp()` décrémente `dureeRestante` de TICK_MS/1000 à chaque tick. `calculerRevenuClic()` : en BTP avec chantier actif, réduit dureeRestante de clicAccelere par clic (+ complétion immédiate si 0) — revenu de base 5€ toujours retourné. Tout exposé via `Object.assign(window, {...})`.
- ui.js : `renderUpgradesSecteur` branché BTP (estBtp/enCours, cout=0, prerequis via btpCompletes, etat sans achete). Computed `chantierProgression` (timer formaté, pourcent barre). Handler `actionLancerChantier`. Listener `legacy:btp-complete` → floating text 2s. Template : bouton "Lancer" (BTP) vs "Acheter" (autres), bloc `.btp-chantier-actif` avec progress bar verte + hint.
- index.html : CSS `.btp-chantier-actif`, `.btp-progress-bar`, `.btp-progress-fill`, `.btp-chantier-timer`, `.btp-chantier-recompense`, `.btp-clic-hint`.

### Simplification — Ticket S1
- ui.js : helper `ajouterFlottant(texte, duree=800)` créé juste après `boutiqueFlottants` — encapsule le pattern push+setTimeout. Remplace 10 occurrences identiques (−53 lignes).
- engine.js : tous les `window.xxx = xxx` éparpillés (16 lignes) remplacés par un unique `Object.assign(window, {...})` en fin de fichier. Suppression de `tickCompetence()` et `getMultiplicateurCompetence()` (dead code).
- config.js : suppression de `MULTIPLICATEUR_COMPETENCE` et `COULEUR_COMPETENCE` (−15 lignes, remplacés par `MULTIPLICATEURS_NIVEAU`).
- state.js : suppression de `competence: 1` et `multiplicateurCouleur` (−3 lignes, plus utilisés).
- Bilan net : −75 lignes sans aucun changement de comportement.

### Ticket 21 — Secteur Influence
- config.js : `VERBE_METIER.influence: 'Créer du contenu'`. `NIVEAUX.PALIERS_INFLUENCE` (Créateur débutant→Phénomène viral). `METIERS.influence` : `revenuBase: 0`, `tauxMonetisation: 0.001`, 6 upgrades u_inf1→u_inf6 (3 bonusAbonnes : 10%/15%/25%/50%, 2 passifs : passif_inf4 5€/s, passif_inf6 30€/s). `MAP.ZONES.influence` (x:45, y:35, voiture requise). `CONFIG.INFLUENCE` : `CIBLE_SECONDES:5`, `SIGMA:2`, `APPUI_MIN:0.3`. Accès : téléphone + ordinateur requis.
- state.js : `_influenceAppuiDebut: 0` ajouté. Reset dans `initialiserNouvelleGeneration`.
- engine.js : `calculerGainInfluence(dureeSeconde)` exportée — Gaussienne centrée sur 5s (σ=2), gainAbonnés = base × (1+bonusUpgrades) × exp, gainArgent = abonnés × tauxMonetisation. `changerSecteur` : check possession téléphone+ordinateur avant véhicule pour secteur influence (`raison: 'possessions'`). Exposée via `Object.assign`.
- ui.js : import `calculerGainInfluence`. Refs `influenceAppuiMs`, `influenceEnAppui`, variable `_influenceRafId`. Handlers `onInfluenceDebut` (lance RAF loop) / `onInfluenceFin` (cancel RAF, calcule gain, ajouterFlottant). Computeds `influenceBarrePct` (0→100% sur 10s), `influencePrecisionLabel` (🎯 Parfait/⬆/⬇ selon delta). `effetTexte` dans `renderUpgradesSecteur` : supporte `e.bonusAbonnes`. `actionChangerSecteur` : gère `raison === 'possessions'`. Template : zone-clic conditionnée `secteurActif !== 'influence'` ; section `.zone-influence` avec @mouseleave guard, barre de progression, label précision, bouton hold (mousedown/mouseup/touch).
- index.html : CSS `.zone-influence`, `.influence-abonnes`, `.influence-barre-wrap`, `.influence-barre-cible`, `.influence-barre-fill` + `--actif`, `.influence-precision`, `.btn-influence`, `.influence-hint`.

---
*Ne jamais lire le GDD pour coder — toutes les infos techniques sont ici.*
*Mettre à jour la section "Sessions terminées" à chaque fin de ticket.*
