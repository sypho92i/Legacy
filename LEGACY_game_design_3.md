# ★ LEGACY — Game Design Document

> *"Vis, choisis, meurs, transmets — et recommence avec les conséquences de ta vie passée."*

---

## ⟳ Boucle de jeu principale

```
Naissance → Formation → Carrière → Accumulation → Mort → Héritage
    ↑                                                         ↓
    └──────────────── Nouvelle génération ←───────────────────┘
```

Run de **~15–25 min** — durée émergente. Jour abstrait passif. Multiplicateur de clic coloré selon niveau compétence : ◆ gris → ◆ blanc → ◆ jaune → ◆ orange → ◆ rouge/or.

> 🔧 **Implémentation** — Le multiplicateur coloré est un système à part entière : 5 niveaux visuels distincts, chacun lié à un seuil de compétence. C'est le premier feedback gameplay visible — doit être implémenté avant les upgrades.

---

## ⚒ Métiers — anatomie d'un métier

### 1. Action de clic
Verbe propre au métier. "Conclure une vente", "Livrer un feature", "Poser des briques". Change l'identité narrative de chaque run.

### 2. Revenu par clic
Lié au niveau de compétence + upgrades débloqués. Multiplicateur coloré appliqué ici directement.

### 3. Revenus passifs progressifs
Propres à chaque métier, débloqués par les upgrades.
- Vendeur : commissions → équipe de vente → franchise
- Développeur : freelance récurrent → SaaS → algorithme

### 4. Upgrades propres
5–6 niveaux par métier. Certains augmentent le clic, d'autres débloquent des passifs, d'autres ouvrent le métier suivant du secteur.

> 🔧 **Implémentation** — Découper en 3 tâches distinctes : (1) modèle de données upgrades, (2) UI liste upgrades disponibles, (3) logique achat + application effet.

### 5. Événements spéciaux par métier
Pool de **8–12 événements uniques** par métier — chacun n'apparaît qu'une seule fois par vie.

| Tier | Quantité | Description |
|------|----------|-------------|
| ◈ Communs | 4–5 | Apparaissent tôt, enjeux modérés. Revus sur plusieurs générations. |
| ◈ Rares | 3–4 | Mid-game, enjeux forts. Pas garantis à chaque vie. |
| ◈ Exceptionnels | 1–2 | Changent le cours d'une vie. Peuvent ne jamais apparaître. Moments de légende dans la lignée. |

> 🔧 **Implémentation** — Développer d'abord sur le secteur Commerce uniquement (5 communs + 3 rares). Le moteur de déclenchement est une tâche séparée du contenu des events.

### 6. Métier pilote MVP
Le secteur **Commerce / Vendeur** est le seul métier complet en Phase 1. Tous les autres secteurs sont traités en Phase 3, une filière par sprint.

---

## ◎ Secteurs — revenus passifs + avantages croisés

| Secteur | Compétence | Revenu passif | Avantage croisé | Phase |
|---------|-----------|---------------|-----------------|-------|
| 🛒 Commerce | Négociation niv. 1→5 | Commissions automatisées | −10 à −20% sur tous les achats boutique | Phase 1 |
| 💻 Tech / Création | Programmation niv. 1→5 | Revenus SaaS, algo | Automatisation du clic débloquée plus tôt | Phase 3 |
| 🏦 Finance / Droit | Analyse niv. 1→5 | Intérêts, dividendes | +% sur transmission d'argent à la mort | Phase 3 |
| 🏗️ BTP / Artisanat | Maîtrise niv. 1→5 | Contrats récurrents | Logement + véhicule construits/réparés à coût réduit | Phase 3 |
| 🏠 Immobilier | Gestion niv. 1→5 | Loyers mensuels | Réductions logement perso + accès niveaux supérieurs tôt | Phase 3 |
| 🌐 Influence / Politique | Réseau niv. 1→5 | Rétributions, rentes | Réduction malus karma + accès événements premium | Phase 4 |

> ⚠ Influence / Politique : déblocage tardif uniquement — prérequis niveau 3+ dans un autre secteur.

---

## ⚠ Système illégal — trois couches transversales

### ① Couche 1 — Opportuniste
*Accessible dès le début · ancré dans le métier en cours*

Petite fraude du quotidien liée au métier. Vendeur qui gonfle ses notes de frais, BTP au noir, comptable qui arrange les chiffres. L'action de clic change de verbe — narrativement distinct du légal.

| Karma par action | Prérequis | Type de descente | Plancher |
|-----------------|-----------|-----------------|---------|
| −2 à −5 | Aucun | Linéaire, lente | Aucun |

> 🔧 **Implémentation Phase 3** — Implémenter couche 1 sur Commerce uniquement. Le verbe de clic change, le karma descend. Une tâche séparée par secteur ensuite.

---

### ② Couche 2 — Organisé
*Mid-game · nécessite compétence niv.3+ + karma < 65*

Sort du secteur d'origine. Trafic, blanchiment, fraude à grande échelle. Nécessite une compétence légale comme couverture. Certains upgrades sont **irréversibles**.
- Comptable niv.3 → blanchiment
- Agent immobilier niv.3 → marchands de sommeil

| Karma par palier | Prérequis | Type de descente | Plancher |
|-----------------|-----------|-----------------|---------|
| −15 à −25 | karma < 65 | Paliers brutaux | 55 max |

---

### ③ Couche 3 — Haut niveau
*Late-game · nécessite réseau + couche 2 active + karma < 35*

Corruption, crime organisé, manipulation de marché. Revenus massifs, exposition totale. Traces héréditaires permanentes — certains métiers premium refusent définitivement cette lignée.

| Karma par palier | Prérequis | Type de descente | Plancher |
|-----------------|-----------|-----------------|---------|
| −30 à −40 | karma < 35 | Spirale accélérée | 30 max |

---

### ↑ Remontée karma — asymétrie intentionnelle

> Descendre est rapide. Remonter est lent et coûteux.

| Action positive | Couche 1 | Couche 2 | Couche 3 |
|----------------|---------|---------|---------|
| Choix légal simple | +3 | +1 | +0 |
| Boutique Social | +5 | +2 | +1 |
| Gala de charité | +10 | +4 | +2 |
| Événement exceptionnel positif | +15 | +8 | +3 |

---

## ♦ Système karma — 5 paliers

| Palier | Plage | Effet productivité |
|--------|-------|--------------------|
| ✦ Vertueux | 80–100 | +20% |
| ◆ Neutre | 40–80 | ±0% |
| ◇ Louche | 20–40 | −15% |
| ▼ Criminel | 5–20 | −35% |
| ✖ Ennemi public | 0–5 | −60% |

**Événements probabilistes négatifs :**
`Probabilité = base% + (100 − karma) × coefficient`

Contrôle fiscal · saisie d'actifs · hospitalisation · mort prématurée.
Jauge toujours visible, couleur progressive vert→rouge. Apprentissage par l'expérience, pas de tutoriel.

> 🔧 **Implémentation** — La formule probabiliste est une tâche technique à part. Elle dépend du système karma (Phase 2) et conditionne tous les événements négatifs. À implémenter en même temps que le moteur d'événements.

---

## ⬡ Héritage karma intergénérationnel

| Situation du parent | Karma de départ enfant | Impact |
|--------------------|----------------------|--------|
| Jamais touché couche 2+ | 75 | Normal |
| A touché couche 2 | 65 | −10 au départ |
| A touché couche 3 | 55 | −20 + réputation entachée |
| 2 générations couche 3 | 40 | −35 · portes fermées |
| 3+ générations couche 3 | 25 | Zone Louche dès naissance · événements négatifs immédiats |

> ↑ **Rédemption** — +5 karma de départ par génération vertueuse consécutive. 4 générations vertueuses effacent une génération de couche 3.

> 🔧 **Implémentation Phase 4** — Ce système est distinct des malédictions/bénédictions ponctuelles. C'est la table structurelle de karma de départ. Implémenter séparément, en vérifiant les edge cases : que se passe-t-il si le parent a fait couche 2 puis s'est racheté ? La rédemption s'applique-t-elle partiellement ?

---

## ⬢ Héritage intergénérationnel

| Élément | Transmission | Conditions |
|---------|-------------|------------|
| 💰 Argent | 50–80% | Selon karma et richesse |
| ⚡ Boost compétences | +5 à +8% vitesse par secteur | Plafond +25% par secteur |
| 🏠 Logement | Résidence principale héritée | Avec ses charges |
| ⭐ Réputation | Cumulative sur la lignée | Ouvre/ferme des portes |

**Lignées hybrides** — boosts transmis dans tous les secteurs développés par les ancêtres. Plafond +25% atteint en 4–5 générations. La méta-progression **est** l'héritage — pas de système Prestige séparé.

> ⚠ **Piège de l'héritage logement** — Hériter d'une berline ou d'un penthouse au niveau 1 = charges impossibles à tenir. Vendre = perdre la progression. Garder = cashflow négatif. Ce dilemme est intentionnel et doit être lisible dès la 2e génération.

---

## 🚗 Véhicules — mobilité + charges fixes

| Véhicule | Mobilité | Réputation | Charges | Si non payé |
|----------|----------|-----------|---------|-------------|
| 🚲 Vélo | 1 secteur, lent | +0 | Aucune | — |
| 🛵 Scooter | 2 secteurs, moyen | +5 | Assurance légère | Réputation −2 |
| 🚗 Voiture basique | 2 secteurs, rapide | +10 | Assurance + entretien | Saisie, mobilité perdue |
| 🚘 Berline | 2 secteurs + réseau | +20 | Assurance + crédit | Saisie + karma −5 |
| 🏎 Supercar | 3 secteurs | +35 | Charges + impôt luxe | Saisie + karma −15 |

> ⚠ **Piège de l'héritage** — Hériter d'une berline au niveau 1 = charges impossibles à tenir. Vendre = perdre la mobilité multi-secteurs. Garder = cashflow négatif. Premier vrai dilemme stratégique de chaque nouvelle génération.

> 🔧 **Implémentation** — Les véhicules ne sont pas encore dans le backlog. À ajouter en Phase 3 (Could Have MVP). Les charges fixes s'appuient sur le menu finances.

---

## 📊 Menu finances

Débit automatique invisible dans le flux de jeu. Icône menu pulse discrètement en rouge si cashflow négatif.

| Onglet | Contenu |
|--------|---------|
| 📈 Revenus | Tous les passifs actifs par source et taux /s |
| 📉 Charges | Dépenses récurrentes, fréquence, option vente/résiliation directe |
| ⚖ Bilan | Cashflow net /s — vert si positif, rouge si négatif. KPI principal du mid-game |

> 🔧 **Implémentation Phase 2** — Ce menu est nécessaire dès que la boutique logement existe. Sans lui, le joueur ne peut pas voir l'effet de ses charges. Dépendance : boutique logement doit exister avant que ce menu soit utile, mais ils peuvent être développés en parallèle.

---

## 🎨 Représentations visuelles évolutives

### Scènes
| Scène | Progression |
|-------|------------|
| 🏢 Lieu de travail | Stand de marché → bureau → open space → tour de verre |
| 🏠 Logement | Squat → studio → appartement → maison → villa → penthouse |
| ✈ Vacances | Camping → plage → croisière privée *(débloquée par les voyages)* |
| 🚗 Véhicule | Visible dans la scène quartier — vélo → supercar |
| 👥 Réseau social | Silhouettes autour du perso — nombre et tenues évoluent avec niveau Social |
| 🐾 Animal de compagnie | Chat (+bonheur léger) ou chien (+bonheur fort, +réputation). Charge mensuelle. |
| 👕 Items équipés | Vêtements + accessoires visibles sur le sprite. Effets réputation et bonheur. |
| ❤ Santé visible | Posture et silhouette reflètent la jauge Santé |

### Vieillissement du personnage
| Âge | Apparence | Effet gameplay |
|-----|-----------|----------------|
| 18–29 | Posture droite, sprite dynamique | Vitesse de clic normale |
| 30–39 | Légèrement plus solide, premières rides | Aucun malus |
| 40–49 | Posture selon santé, cheveux grisonnants | Léger malus si santé < 40 |
| 50–59 | Nettement marqué, clic ralenti si santé basse | −10% clic si santé < 30 |
| 60–69 | Vieux mais actif si bien entretenu | −20% clic si santé < 50 |
| 70+ | Phase de déclin, mort naturelle imminente | −40% clic · timer mort visible |

> 🔧 **Implémentation Phase 5** — Le vieillissement visuel est lié à la jauge Santé (Phase 1). Les effets gameplay de ralentissement du clic se branchent sur la même jauge. À traiter en Phase 5 côté sprites, mais la logique de malus peut être câblée dès Phase 1 sans visuels.

---

## 🛒 Boutique

| Catégorie | Type | Description |
|-----------|------|-------------|
| 🏠 Logement | Permanent | Squat → Penthouse. Transmissible. Logement perso ≠ biens locatifs. |
| 🎬 Loisirs | Temporaire | Boost fort mais limité. Force le retour régulier. |
| ✈ Voyages | Temporaire | 100% positif une fois payé. Passifs maintenus. Automatisation aux niveaux élevés. |
| 🍽 Alimentation | Quotidien | Restaure jauge Faim + boost bonheur temporaire. |
| 🏥 Santé | Permanent | Salle de sport, médecin privé. Rallonge l'espérance de vie. |
| 👥 Social / Réseau | Karma | Booste karma + opportunités rares. Gala de charité = défense karma. |

---

## ⚡ Automatisation du clic — seuil symbolique d'aisance

| Niveau | Situation |
|--------|-----------|
| 🔴 Bas niveau | Clic manuel obligatoire. Voyage = sacrifice revenus actifs. Financièrement inaccessible. |
| 🟡 Intermédiaire | Quelques passifs. Voyage possible mais coûteux en opportunité. |
| 🟢 Haut niveau | Clics automatisés (employés, franchise, algo). Voyage 100% positif. Liberté totale de jeu. |

---

## 🗓 Ordre de développement recommandé

### Sprint 1 — Boucle de clic jouable
1. Structure HTML/JS du jeu
2. Bouton de clic + gain monnaie
3. Multiplicateur coloré du clic (5 niveaux)
4. Modèle de données upgrades
5. Système tick/seconde passifs

### Sprint 2 — Métier pilote Commerce complet
6. UI liste upgrades disponibles
7. Logique achat + application effet upgrades
8. Progression vendeur → franchisé
9. Jauges personnage (5 jauges)

### Sprint 3 — Mort, karma, héritage de base
10. Logique de mort + transition génération *(dépend des jauges Santé)*
11. Calcul héritage argent + compétences
12. Jauge karma 5 paliers + modificateurs productivité *(peut démarrer Sprint 2)*
13. Moteur déclenchement événements + formule probabiliste

> 🔧 **Règle de debug** — Implémenter un bouton "Mort simulée" dès Sprint 2 pour tester le passage de génération sans attendre une vraie mort en jeu.

---

## 🎵 Bande son

Composée par **Silent Knight Studio** — dark fantasy, orchestral, cinématique.

---

*LEGACY — v5 · Game Design Document · mis à jour post-audit backlog*
