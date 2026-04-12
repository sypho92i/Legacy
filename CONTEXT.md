# LEGACY — Contexte technique Claude Code

## Stack
- Vue.js 3 CDN (pas de bundler, pas de node_modules)
- Vanilla CSS
- Compatible Electron (pour déploiement Steam futur)

## Structure fichiers
```
LEGACY/
├── index.html          ← point d'entrée, monte Vue
├── src/
│   ├── state.js        ← état global réactif (source de vérité unique)
│   ├── engine.js       ← boucle tick, calculs, logique métier
│   ├── ui.js           ← composants Vue, handlers événements
│   └── config.js       ← constantes, balancing (coûts, taux, durées)
├── assets/
│   ├── audio/
│   ├── sprites/
│   └── fonts/
└── docs/               ← GDD (ne pas lire pour coder)
```

## Règles architecture — à respecter absolument
- Zéro manipulation DOM directe — tout passe par Vue réactif
- `state.js` est la seule source de vérité — jamais de variable locale qui duplique l'état
- `engine.js` calcule uniquement — il ne touche pas au DOM
- `config.js` contient tous les chiffres — jamais de magic numbers dans le code
- Un ticket = une responsabilité = des fichiers bien séparés

## État global (src/state.js)
```js
{
  // Finances
  argent: 0,
  revenuParClic: 1,
  passifs: [],           // { id, nom, tauxParSeconde }

  // Compétence & métier
  competence: 1,         // 1 à 5
  metierActif: 'vendeur',
  modeIllegal: false,
  multiplicateurCouleur: 'gris', // gris > blanc > jaune > orange > or

  // Upgrades
  upgrades: [],          // { id, nom, cout, effet, debloque, prerequis }

  // Jauges personnage (0-100)
  jauges: {
    faim: 100,
    hygiene: 100,
    sante: 100,
    bonheur: 100,
    reputation: 50
  },

  // Karma
  karma: 75,             // 0-100
  palierKarma: 'neutre', // vertueux > neutre > louche > criminel > ennemiPublic

  // Génération & héritage
  generation: 1,
  age: 18,
  lignee: {
    reputation: 0,
    karmaDepart: 75,
    boostCompetences: {},  // { secteur: pourcentage }
    logement: null,
    toucheCouche2: false,
    toucheCouche3: false,
    generationsVertueuses: 0
  },

  // UI
  menuOuvert: null       // 'finances' | 'boutique' | 'upgrades' | null
}
```

## Karma — paliers
| Palier | Plage | Effet productivité |
|---|---|---|
| vertueux | 80-100 | +20% |
| neutre | 40-80 | ±0% |
| louche | 20-40 | -15% |
| criminel | 5-20 | -35% |
| ennemiPublic | 0-5 | -60% |

## Multiplicateur coloré du clic
| Niveau compétence | Couleur | Multiplicateur |
|---|---|---|
| 1 | gris | ×1 |
| 2 | blanc | ×2 |
| 3 | jaune | ×4 |
| 4 | orange | ×8 |
| 5 | rouge/or | ×16 |

## Moteur (src/engine.js)
- Tick toutes les **200ms**
- Chaque tick : calcul passifs → update argent → update jauges → update age → check mort
- Formule revenu/clic : `revenuBase × multiplicateurCompetence × modifKarma × modifBonheur`
- Formule événements négatifs : `proba = base% + (100 - karma) × coefficient`

## Secteurs & phases de développement
| Secteur | Phase |
|---|---|
| Commerce (métier pilote) | Phase 1 |
| Tech, Finance, BTP, Immobilier | Phase 3 |
| Influence / Politique | Phase 4 |

## Héritage à la mort
- Argent transmis : 50-80% selon karma
- Boost compétences : +5 à +8% par secteur développé (plafond +25%)
- Logement transmis avec ses charges
- Karma de départ enfant selon historique lignée

## Sessions terminées

### Ticket 1 — Structure HTML/JS de base
Fichiers créés : `index.html`, `src/state.js`, `src/engine.js`, `src/ui.js`, `src/config.js`.
Moteur vide opérationnel : boucle tick 200ms, état global réactif, HUD + jauges + bouton clic squelettes, zéro logique métier.

### Ticket 2 — Bouton de clic avec gain de monnaie
- `onClic()` incrémente `state.argent` via `calculerRevenuClic()` (formule complète : `revenuBase × multiplicateurCompétence × modifKarma × modifBonheur`).
- Floating text : `flottants` ref locale (UI pure, hors state.js), animation CSS `@keyframes flotter` 800ms, nettoyage par `setTimeout`.
- Verbe bouton : `verbeBouton` computed depuis `CONFIG.VERBE_METIER[metierActif]` avec fallback `VERBE_METIER_DEFAUT`.
- `revenuClicAffiche` computed remplace l'ancienne valeur statique `state.revenuParClic` dans le template.

---
*Ne jamais lire le GDD pour coder — toutes les infos techniques sont ici.*
*Mettre à jour la section "Sessions terminées" à chaque fin de ticket.*
