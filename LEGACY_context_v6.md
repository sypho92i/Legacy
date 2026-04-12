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
    tech: number,
    immobilier: number,
    btp: number,
    influence: number,
  },
}
```

---

## Philosophie des calculs — système mixte

> Ne jamais utiliser un système purement multiplicatif. Chaque type de calcul a un rôle narratif précis.

| Type | Usage | Raison |
|------|-------|--------|
| **Additif** | Bonus upgrades, items, compétences | Chaque amélioration *ajoute* quelque chose de concret |
| **Multiplicatif** | Niveau de compétence, automatisation | Ces états changent l'*échelle* du personnage |
| **Soustractif plafonné** | Malus karma, malus bonheur | Douleur constante et prévisible, pas d'effondrement total |
| **Exponentiel** | Coût des upgrades | Tension clicker classique — jamais sur les revenus |
| **Plafond / plancher** | Tous les calculs finaux | Revenu minimum garanti, revenu max plafonné par niveau formation |

---

## Formule de revenu par clic

```js
function calculerRevenuClic() {
  // 1. Base additive — revenu de base + somme de tous les bonus upgrades/items
  const base = CONFIG.METIERS[state.metierActif].revenuBase
  const bonusUpgrades = state.upgrades
    .filter(u => u.actif)
    .reduce((sum, u) => sum + u.bonusClic, 0)

  // 2. Multiplicateur compétence — seul vrai multiplicateur
  const multComp = CONFIG.COMPETENCE.MULTIPLICATEURS[state.niveauCompetence[state.secteurActif]]
  // niv 1→1.0, niv 2→1.5, niv 3→2.2, niv 4→3.2, niv 5→5.0

  // 3. Malus soustractifs plafonnés — valeurs fixes par palier, pas des %
  const malusKarma   = CONFIG.KARMA[palierKarma()].malusClic      // valeur fixe €
  const malusBonheur = CONFIG.BONHEUR[palierBonheur()].malusClic  // valeur fixe €

  // 4. Calcul final avec plancher garanti
  const revenu = Math.max(
    CONFIG.REVENU_MIN_GARANTI,
    Math.min(
      (base + bonusUpgrades) * multComp - malusKarma - malusBonheur,
      CONFIG.METIERS[state.metierActif].plafondNiveau
    )
  )
  return revenu
}
```

**Couleur multiplicateur compétence** (UI) : gris(niv1) → blanc(niv2) → jaune(niv3) → orange(niv4) → rouge/or(niv5)

---

## Formule de revenus passifs (tick)

```js
function calculerRevenusPassifs() {
  // Additif pur — chaque source s'additionne
  let total = 0
  state.sourcesPassives.forEach(source => {
    // Chaque source a son propre plafond
    const revSource = Math.min(source.valeur, source.plafond)
    total += revSource
  })

  // Malus soustractif si bonheur très bas (0–20%) — fixe par tick
  if (state.bonheur < 20) total -= CONFIG.BONHEUR.TRES_BAS.malusPassif

  // Plancher : les passifs ne peuvent jamais être négatifs
  return Math.max(0, total)
}
```

---

## Formule de descente des jauges (tick)

```js
// Vitesses de descente — valeurs fixes par tick (200ms)
CONFIG.JAUGES = {
  faim:    { descente: 0.008, seuilAlerte: 20, malusSante: 0.003 },
  hygiene: { descente: 0.004, seuilAlerte: 20, malusReputation: 2 }, // soustractif fixe sur réputation
  sante:   { descente: 0.002, seuilAlerte: 15 }, // descente de base, accélérée si faim < 20
  bonheur: { descente: 0.005, seuilAlerte: 20 },
  // réputation ne descend pas passivement — influencée par événements et hygiene
}

// Interactions entre jauges — soustractifs fixes, pas de multiplicateurs
function tickJauges() {
  state.faim    = Math.max(0, state.faim    - CONFIG.JAUGES.faim.descente)
  state.hygiene = Math.max(0, state.hygiene - CONFIG.JAUGES.hygiene.descente)
  state.bonheur = Math.max(0, state.bonheur - CONFIG.JAUGES.bonheur.descente)

  // Santé : descente de base + malus additif si faim négligée
  const malusFaim = state.faim < 20 ? CONFIG.JAUGES.faim.malusSante : 0
  state.sante = Math.max(0, state.sante - CONFIG.JAUGES.sante.descente - malusFaim)

  // Réputation : malus soustractif fixe si hygiène basse
  if (state.hygiene < 20) {
    state.reputation = Math.max(0, state.reputation - CONFIG.JAUGES.hygiene.malusReputation)
  }
}
```

---

## Formule de productivité globale

```js
// Utilisée pour les revenus passifs et la vitesse de formation
function calculerProductivite() {
  // Base multiplicative compétence
  const multComp = CONFIG.COMPETENCE.MULTIPLICATEURS[state.niveauCompetence[state.secteurActif]]

  // Bonus additifs permanents (secteur Vertueux, items santé, réseau social)
  const bonusAdditifs = calculerBonusAdditifsProd()

  // Malus soustractifs fixes par palier bonheur
  const malusBonheur = CONFIG.BONHEUR[palierBonheur()].malusProd  // valeur fixe, pas un %

  // Malus soustractif fixe par palier karma
  const malusKarma = CONFIG.KARMA[palierKarma()].malusProd  // valeur fixe, pas un %

  return Math.max(
    CONFIG.PROD_MIN,
    (1 + bonusAdditifs) * multComp - malusBonheur - malusKarma
  )
}
```

---

## CONFIG.KARMA — malus soustractifs fixes

```js
CONFIG.KARMA = {
  VERTUEUX:      { min: 80, max: 100, malusClic: 0,   malusProd: 0,   bonusProd: 0.2  },
  NEUTRE:        { min: 40, max: 80,  malusClic: 0,   malusProd: 0,   bonusProd: 0    },
  LOUCHE:        { min: 20, max: 40,  malusClic: 3,   malusProd: 0.1, bonusProd: 0    },
  CRIMINEL:      { min: 5,  max: 20,  malusClic: 8,   malusProd: 0.25,bonusProd: 0    },
  ENNEMI_PUBLIC: { min: 0,  max: 5,   malusClic: 15,  malusProd: 0.5, bonusProd: 0    },
}
// malusClic = € retirés du revenu par clic (soustractif fixe)
// malusProd = valeur fixe retirée du multiplicateur de productivité
// bonusProd = bonus additif pour le palier Vertueux uniquement
```

---

## CONFIG.BONHEUR — malus soustractifs fixes

```js
CONFIG.BONHEUR = {
  TRES_HAUT:  { min: 80,  max: 100, malusClic: 0,  malusProd: 0,    malusPassif: 0,  bonusProd: 0.15 },
  NORMAL:     { min: 50,  max: 80,  malusClic: 0,  malusProd: 0,    malusPassif: 0,  bonusProd: 0    },
  BAS:        { min: 20,  max: 50,  malusClic: 2,  malusProd: 0.15, malusPassif: 0,  bonusProd: 0    },
  TRES_BAS:   { min: 0,   max: 20,  malusClic: 5,  malusProd: 0.35, malusPassif: 2,  bonusProd: 0    },
}
// malusPassif = € retirés des revenus passifs par tick si bonheur très bas
```

---

## CONFIG.COMPETENCE — multiplicateurs de clic

```js
CONFIG.COMPETENCE = {
  MULTIPLICATEURS: { 1: 1.0, 2: 1.5, 3: 2.2, 4: 3.2, 5: 5.0 },
  // Progression non-linéaire — le niveau 5 vaut 5× le niveau 1, pas juste +20% par niveau
}
```

---

## Coût des upgrades — progression exponentielle

```js
// Formule : cout(n) = coutBase × (facteur ^ (n-1))
// Exemple Commerce : coutBase=100, facteur=2.8
// niv1=100, niv2=280, niv3=784, niv4=2195, niv5=6146
CONFIG.UPGRADES_COUT = {
  commerce: { base: 100,  facteur: 2.8 },
  finance:  { base: 500,  facteur: 3.2 },
  tech:     { base: 200,  facteur: 3.0 },
  immobilier:{ base: 1000, facteur: 3.5 },
  btp:      { base: 150,  facteur: 2.5 },
  influence:{ base: 2000, facteur: 4.0 },
}
// Le coût est exponentiel, jamais le revenu — c'est ça qui crée la tension clicker
```

---

## Formule de calcul héritage

```js
function calculerHeritage() {
  // Argent transmis — pourcentage additif selon karma final
  const pctArgent = CONFIG.HERITAGE.PCT_ARGENT[palierKarma()]
  // VERTUEUX: 80%, NEUTRE: 70%, LOUCHE: 60%, CRIMINEL: 55%, ENNEMI_PUBLIC: 50%
  const argentTransmis = Math.floor(state.argent * pctArgent)

  // Boost compétences — additif plafonné par secteur
  const boostNouveau = {}
  Object.keys(state.niveauCompetence).forEach(secteur => {
    const niv = state.niveauCompetence[secteur]
    if (niv > 0) {
      const gain = CONFIG.HERITAGE.BOOST_COMPETENCE_PAR_NIV * niv  // +5% par niveau atteint
      const actuel = state.boostCompetences[secteur] || 0
      boostNouveau[secteur] = Math.min(actuel + gain, CONFIG.HERITAGE.BOOST_MAX)  // plafond +25%
    }
  })

  // Logement transmis avec ses charges — objet complet
  const logementTransmis = state.possessions.logement !== 'squat'
    ? { type: state.possessions.logement, charges: CONFIG.LOGEMENTS[state.possessions.logement].charge }
    : null

  return { argentTransmis, boostNouveau, logementTransmis }
}
```

---

## Formule probabilité événements négatifs

```js
function probEvenementNegatif() {
  // Additif — base fixe + contribution karma
  const base = CONFIG.EVENEMENTS.PROB_BASE  // 0.001 par tick (très rare au départ)
  const contribKarma = (100 - state.karma) * CONFIG.EVENEMENTS.COEFF_KARMA  // 0.0005 par point de karma perdu
  const prob = base + contribKarma

  // Plafond — jamais plus de 2% de chance par tick même à karma 0
  return Math.min(prob, CONFIG.EVENEMENTS.PROB_MAX)  // 0.02
}
// À karma 75 (neutre) : 0.001 + 25×0.0005 = 0.0135 → ~1.35% par tick
// À karma 20 (louche) : 0.001 + 80×0.0005 = 0.041 → plafonné à 2% par tick
```

---

## Système illégal — trois couches

| Couche | Accès | Karma/action | Plancher karma |
|--------|-------|-------------|----------------|
| 1 — Opportuniste | Toujours | −2 à −5 (soustractif fixe) | Aucun |
| 2 — Organisé | karma < 65 + compétence niv.3+ | −15 à −25 par palier | 55 max |
| 3 — Haut niveau | karma < 35 + couche 2 active | −30 à −40 par palier | 30 max |

```js
function appliquerActionIllegale(couche, valeurKarma) {
  // Soustractif direct sur karma — pas de multiplicateur
  state.karma = Math.max(
    CONFIG.ILLEGAL.PLANCHERS[couche],
    state.karma - valeurKarma
  )
  state.coucheIllegalMax = Math.max(state.coucheIllegalMax, couche)
}
```

---

## Formule remontée karma

```js
function remonterKarma(source) {
  // Additif fixe selon source ET couche max atteinte — asymétrie intentionnelle
  const gains = CONFIG.KARMA_REMONTEE[source]  // { c0, c1, c2, c3 }
  const gain = gains['c' + state.coucheIllegalMax]
  state.karma = Math.min(
    CONFIG.ILLEGAL.PLAFONDS_REMONTEE[state.coucheIllegalMax],  // 100 / 55 / 30
    state.karma + gain
  )
}

CONFIG.KARMA_REMONTEE = {
  choix_legal:      { c0: 3,  c1: 3,  c2: 1, c3: 0 },
  boutique_social:  { c0: 5,  c1: 5,  c2: 2, c3: 1 },
  gala_charite:     { c0: 10, c1: 10, c2: 4, c3: 2 },
  event_exceptionnel:{ c0: 15, c1: 15, c2: 8, c3: 3 },
}
```

---

## Héritage karma intergénérationnel

```js
function karmaDepart(lignee) {
  let base = 75
  const derniere = lignee[lignee.length - 1]

  // Soustractifs fixes selon couche max atteinte par le parent
  if (derniere.couche_illegale_max >= 2) base -= 10
  if (derniere.couche_illegale_max >= 3) base -= 10  // total −20

  // Soustractifs additionnels pour générations consécutives couche 3
  const consec = compterGenerationsConsecutivesCouche3(lignee)
  if (consec >= 2) base -= 15  // total −35
  if (consec >= 3) base -= 15  // total −50 → 25

  // Bonus additif rédemption — +5 par génération vertueuse consécutive
  const redemption = compterGenerationsVertueusesConsecutives(lignee)
  base += redemption * 5

  return Math.max(0, Math.min(75, base))  // plancher 0, plafond 75 (jamais mieux que lignée propre)
}
```

---

## Avantages croisés inter-secteurs

```js
// Bonus additifs appliqués selon les secteurs développés — pas multiplicatifs
CONFIG.AVANTAGES_CROISES = {
  commerce:   { cible: 'boutique',       type: 'reduction',  valeur: 0.15 }, // −15% prix boutique
  finance:    { cible: 'heritage_argent',type: 'additif',    valeur: 0.10 }, // +10% argent transmis
  tech:       { cible: 'auto_clic',      type: 'seuil',      valeur: 3    }, // auto-clic dès niv.3 au lieu de niv.5
  immobilier: { cible: 'cout_logement',  type: 'reduction',  valeur: 0.20 }, // −20% coût logement perso
  btp:        { cible: 'cout_construction',type:'reduction', valeur: 0.25 }, // −25% logement + véhicule
  influence:  { cible: 'malus_karma',    type: 'reduction',  valeur: 0.30 }, // −30% sur tous les malusClic karma
}
// Prérequis : secteur développé à niv.2 minimum pour activer l'avantage
```

---

## Verbes de clic par métier

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
  DEFAUT:        'Travailler',
}
```

---

## Téléphone — actions et renommée

```js
CONFIG.TELEPHONE = {
  ACTIONS: {
    monter_compte:     { disponible: true, bonusAbonnes: 10,  bonusBonheur: 0  },
    promouvoir:        { disponible: true, bonusAbonnes: 5,   bonusPassif: 1   },
    jeux_mobile:       { disponible: true, bonusBonheur: 8,   duree: 30        }, // boost 30 ticks
    placement_produit: { seuil_abonnes: 10000,  passif: 50  },
    revenus_youtube:   { seuil_abonnes: 100000, passif: 200 },
  },
  // Passif abonnés — additif pur, s'ajoute aux autres passifs
  // passif_abonnes = floor(state.abonnes / 1000) × CONFIG.TELEPHONE.REVENU_PAR_MILLIER
  REVENU_PAR_MILLIER: 0.5,  // €0.5/s par tranche de 1000 abonnés
}
```

---

## Ordinateur — commandes et tokens

```js
CONFIG.ORDINATEUR = {
  COMMANDES: {
    bourse:           { tokens: 1, passifAdditif: 10,  legal: true,  couche: 0 },
    don_caritatif:    { tokens: 1, karmaAdditif: 5,    legal: true,  couche: 0 },
    recherche:        { tokens: 1, boostProdTemp: 0.2, legal: true,  couche: 0 }, // +0.2 additif prod, 60 ticks
    fraude_fiscale:   { tokens: 2, argentAdditif: 500, karmamalus: 15, couche: 1 },
    piratage:         { tokens: 3, argentAdditif: 2000,karmamalus: 25, couche: 2 },
    hacking_avance:   { tokens: 5, argentAdditif: 8000,karmamalus: 40, couche: 3 },
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

```js
CONFIG.MAP = {
  ZONES: {
    quartier_commercial: { secteur: 'commerce',   disponible: true  },
    quartier_populaire:  { secteur: null,          disponible: true  },
  }
}
```

---

## Véhicules — mobilité et charges

```js
CONFIG.VEHICULES = {
  velo:     { secteurs: 1, reputationAdditif: 0,  charge_mensuelle: 0,    karma_saisie: 0   },
  scooter:  { secteurs: 2, reputationAdditif: 5,  charge_mensuelle: 50,   karma_saisie: 0   },
  voiture:  { secteurs: 2, reputationAdditif: 10, charge_mensuelle: 200,  karma_saisie: 0   },
  berline:  { secteurs: 2, reputationAdditif: 20, charge_mensuelle: 600,  karma_saisie: -5  },
  supercar: { secteurs: 3, reputationAdditif: 35, charge_mensuelle: 2000, karma_saisie: -15 },
}
// reputationAdditif — s'additionne aux autres sources de réputation, pas multiplicatif
// karma_saisie — soustractif fixe appliqué une seule fois si saisie
```

---

## Boutique — catégories

| Slug | Type | Effet | Calcul |
|------|------|-------|--------|
| `logement` | Permanent | +bonheur base | Additif fixe par niveau |
| `loisirs` | Temporaire | +bonheur fort | Additif fixe, durée limitée en ticks |
| `voyages` | Temporaire | +bonheur, passifs maintenus | Additif fixe |
| `alimentation` | Quotidien | +faim, +bonheur temp | Additif fixe sur jauge |
| `sante` | Permanent | +espérance de vie | Additif fixe sur plafond age_mort |
| `social` | Karma | +karma, +opportunités | Additif fixe karma |
| `ordinateur` | Permanent | débloque commandes avancées | — |
| `tokens` | Consommable | fuel ordinateur | Additif sur state.possessions.tokens |

---

## UI — conventions

- **Floating text** : ref locale dans ui.js (`flottants`), hors state.js. Animation CSS `@keyframes flotter` 800ms, nettoyage par `setTimeout`.
- **Couleur multiplicateur** : calculée dans ui.js selon `niveauCompetence[secteurActif]` — gris/blanc/jaune/orange/rouge-or
- **Pulse cashflow négatif** : icône menu Finances pulse en rouge CSS si `cashflowNet < 0`
- **Jauge karma** : couleur progressive vert→rouge via CSS `hsl()` interpolé

---

## Sessions terminées

### Ticket 1 — Structure HTML/JS de base
Fichiers créés : `index.html`, `src/state.js`, `src/engine.js`, `src/ui.js`, `src/config.js`.
Moteur vide opérationnel : boucle tick 200ms, état global réactif, HUD + jauges + bouton clic squelettes, zéro logique métier.

### Ticket 2 — Bouton de clic avec gain de monnaie
- `onClic()` incrémente `state.argent` via `calculerRevenuClic()` (formule complète : `(revenuBase + bonusUpgrades) × multComp - malusKarma - malusBonheur`, plancher `REVENU_MIN_GARANTI`).
- Floating text : `flottants` ref locale (UI pure, hors state.js), animation CSS `@keyframes flotter` 800ms, nettoyage par `setTimeout`.
- Verbe bouton : `verbeBouton` computed depuis `CONFIG.VERBE_METIER[metierActif]` avec fallback `VERBE_METIER_DEFAUT`.
- `revenuClicAffiche` computed remplace l'ancienne valeur statique `state.revenuParClic` dans le template.

---
*Ne jamais lire le GDD pour coder — toutes les infos utiles sont ici.*
*Mettre à jour la section "Sessions terminées" à chaque fin de ticket.*
