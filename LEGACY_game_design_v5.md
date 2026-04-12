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

### 5. Événements spéciaux par métier
Pool de **8–12 événements uniques** par métier — chacun n'apparaît qu'une seule fois par vie.

| Tier | Quantité | Description |
|------|----------|-------------|
| ◈ Communs | 4–5 | Apparaissent tôt, enjeux modérés. Revus sur plusieurs générations. |
| ◈ Rares | 3–4 | Mid-game, enjeux forts. Pas garantis à chaque vie. |
| ◈ Exceptionnels | 1–2 | Changent le cours d'une vie. Peuvent ne jamais apparaître. Moments de légende dans la lignée. |

---

## ◎ Secteurs — revenus passifs + avantages croisés

| Secteur | Compétence | Revenu passif | Avantage croisé |
|---------|-----------|---------------|-----------------|
| 🛒 Commerce | Négociation niv. 1→5 | Commissions automatisées | −10 à −20% sur tous les achats boutique |
| 🏦 Finance / Droit | Analyse niv. 1→5 | Intérêts, dividendes | +% sur transmission d'argent à la mort |
| 💻 Tech / Création | Programmation niv. 1→5 | Revenus SaaS, algo | Automatisation du clic débloquée plus tôt |
| 🏠 Immobilier | Gestion niv. 1→5 | Loyers mensuels | Réductions logement perso + accès niveaux supérieurs tôt |
| 🏗️ BTP / Artisanat | Maîtrise niv. 1→5 | Contrats récurrents | Logement + véhicule construits/réparés à coût réduit |
| 🌐 Influence / Politique | Réseau niv. 1→5 | Rétributions, rentes | Réduction malus karma + accès événements premium |

> ⚠ Influence / Politique : déblocage tardif uniquement — prérequis niveau 3+ dans un autre secteur.

---

## ⚠ Système illégal — trois couches transversales

### ① Couche 1 — Opportuniste
*Accessible dès le début · ancré dans le métier en cours*

Petite fraude du quotidien liée au métier. Vendeur qui gonfle ses notes de frais, BTP au noir, comptable qui arrange les chiffres. L'action de clic change de verbe — narrativement distinct du légal.

| Karma par action | Prérequis | Type de descente | Plancher |
|-----------------|-----------|-----------------|---------|
| −2 à −5 | Aucun | Linéaire, lente | Aucun |

### ② Couche 2 — Organisé
*Mid-game · nécessite compétence niv.3+ + karma < 65*

Sort du secteur d'origine. Trafic, blanchiment, fraude à grande échelle. Nécessite une compétence légale comme couverture. Certains upgrades sont **irréversibles**.

| Karma par palier | Prérequis | Type de descente | Plancher |
|-----------------|-----------|-----------------|---------|
| −15 à −25 | karma < 65 | Paliers brutaux | 55 max |

### ③ Couche 3 — Haut niveau
*Late-game · nécessite réseau + couche 2 active + karma < 35*

Corruption, crime organisé, manipulation de marché. Revenus massifs, exposition totale. Traces héréditaires permanentes — certains métiers premium refusent définitivement cette lignée.

| Karma par palier | Prérequis | Type de descente | Plancher |
|-----------------|-----------|-----------------|---------|
| −30 à −40 | karma < 35 | Spirale accélérée | 30 max |

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

---

## ⬢ Héritage intergénérationnel

| Élément | Transmission | Conditions |
|---------|-------------|------------|
| 💰 Argent | 50–80% | Selon karma et richesse |
| ⚡ Boost compétences | +5 à +8% vitesse par secteur | Plafond +25% par secteur |
| 🏠 Logement | Résidence principale héritée | Avec ses charges |
| ⭐ Réputation | Cumulative sur la lignée | Ouvre/ferme des portes |

**Lignées hybrides** — boosts transmis dans tous les secteurs développés par les ancêtres. Plafond +25% atteint en 4–5 générations. La méta-progression **est** l'héritage — pas de système Prestige séparé.

---

## 🗺 Vue carte — map de la ville

Accessible via un bouton dédié depuis l'interface principale. Vue du dessus de la ville, navigation entre les zones.

### Zones disponibles au lancement
| Zone | Description | Accès |
|------|-------------|-------|
| 🏪 Quartier Commercial | Hub principal du secteur Commerce. Boutiques, bureaux, marché. | Dès le début |
| 🏘 Quartier Populaire | Zone résidentielle de départ. Logements bas de gamme, petits boulots. | Dès le début |

> ⚠ D'autres quartiers se débloquent avec la progression : quartier financier, zone industrielle, quartier huppé, etc.

Le secteur actif du personnage détermine dans quelle zone il travaille. Changer de zone via la map = changer de secteur actif (nécessite un véhicule pour les zones éloignées).

---

## 📱 Téléphone — réseau social & renommée

Le téléphone remplace la mécanique "réseau social" sous forme de silhouettes. C'est un objet accessible dès le début, avec des actions débloquées progressivement selon le niveau de renommée.

### Jauge Renommée
- Mesurée en **nombre d'abonnés** (0 → des milliers → des millions)
- Monte via les actions téléphone et certains événements
- Impacte directement la **réputation** du personnage
- Les features avancées n'apparaissent **pas à l'avance** — elles se révèlent au fur et à mesure

### Actions téléphone

| Action | Effet | Disponibilité |
|--------|-------|---------------|
| 📲 Monter son compte réseaux | +abonnés, +renommée lentement | Dès le début |
| 📣 Promouvoir son secteur | +renommée, +revenus passifs légers | Dès le début |
| 🎮 Jeux mobile | +bonheur temporaire (divertissement) | Dès le début |
| 🤝 Placement de produit | Revenu passif — grandes marques | Déblocage renommée moyenne |
| 💰 Revenus vues YouTube | Revenu passif — monétisation contenu | Déblocage renommée élevée |
| ★ *Autres features cachées* | *Se révèlent avec la renommée* | *Progression naturelle* |

> Les features avancées ne sont pas listées dans l'interface — le joueur les découvre en jouant.

---

## 💻 Ordinateur — actions avancées

L'ordinateur est un **objet à acheter en boutique**. Une fois acquis, certaines commandes nécessitent des **tokens** également achetables en boutique.

### Acquisition
- Achat en boutique (coût modéré, mid-game)
- Visible dans la scène logement une fois acquis
- Débloque immédiatement les commandes gratuites

### Commandes disponibles

| Commande | Coût | Effet | Légalité |
|----------|------|-------|----------|
| 📈 Bourse | Token × 1 | Revenu passif financier — investissements automatisés | ✅ Légal |
| 🤲 Don caritatif | Token × 1 | +karma, +réputation | ✅ Légal |
| 🔍 Recherche marché | Token × 1 | Boost temporaire revenus secteur actif | ✅ Légal |
| 💸 Fraude fiscale | Token × 2 | +argent massif, karma −15 | ⚠ Couche 1 |
| 🖥 Piratage | Token × 3 | Vol d'actifs d'un concurrent, karma −25 | ⚠ Couche 2 |
| 👾 Hacking avancé | Token × 5 | Revenus massifs, exposition maximale, karma −40 | ⚠ Couche 3 |

> Les commandes illégales de l'ordinateur s'inscrivent dans le système des trois couches — mêmes règles de karma, mêmes conséquences héréditaires.

### Tokens en boutique
- Achetés par packs (×5, ×10, ×20)
- Coût croissant — les tokens deviennent une vraie décision budgétaire en mid-game
- Pas de tokens = ordinateur inutilisable pour les commandes avancées

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

---

## 📊 Menu finances

Débit automatique invisible dans le flux de jeu. Icône menu pulse discrètement en rouge si cashflow négatif.

| Onglet | Contenu |
|--------|---------|
| 📈 Revenus | Tous les passifs actifs par source et taux /s |
| 📉 Charges | Dépenses récurrentes, fréquence, option vente/résiliation directe |
| ⚖ Bilan | Cashflow net /s — vert si positif, rouge si négatif. KPI principal du mid-game |

---

## 🎨 Représentations visuelles évolutives

### Scènes
| Scène | Progression |
|-------|------------|
| 🏢 Lieu de travail | Stand de marché → bureau → open space → tour de verre |
| 🏠 Logement | Squat → studio → appartement → maison → villa → penthouse |
| ✈ Vacances | Camping → plage → croisière privée *(débloquée par les voyages)* |
| 🚗 Véhicule | Visible dans la scène quartier — vélo → supercar |
| 📱 Téléphone | Visible dans la scène logement — actions débloquées progressivement |
| 💻 Ordinateur | Visible dans la scène logement une fois acheté en boutique |
| 🐾 Animal de compagnie | Chat (+bonheur léger) ou chien (+bonheur fort, +réputation). Charge mensuelle. |
| 👕 Items équipés | Vêtements + accessoires visibles sur le sprite. Effets réputation et bonheur. |
| ❤ Santé visible | Posture et silhouette reflètent la jauge Santé |

### Vieillissement du personnage
| Âge | Apparence |
|-----|-----------|
| 18–29 | Posture droite, sprite dynamique |
| 30–39 | Légèrement plus solide, premières rides |
| 40–49 | Posture selon santé, cheveux grisonnants |
| 50–59 | Nettement marqué, clic ralenti si santé basse |
| 60–69 | Vieux mais actif si bien entretenu |
| 70+ | Phase de déclin, mort naturelle imminente |

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
| 💻 Ordinateur | Permanent | Débloque les commandes avancées (bourse, hacking, etc.). |
| 🪙 Tokens ordi | Consommable | Packs ×5 / ×10 / ×20. Nécessaires pour les commandes avancées. |

---

## ⚡ Automatisation du clic — seuil symbolique d'aisance

| Niveau | Situation |
|--------|-----------|
| 🔴 Bas niveau | Clic manuel obligatoire. Voyage = sacrifice revenus actifs. Financièrement inaccessible. |
| 🟡 Intermédiaire | Quelques passifs. Voyage possible mais coûteux en opportunité. |
| 🟢 Haut niveau | Clics automatisés (employés, franchise, algo). Voyage 100% positif. Liberté totale de jeu. |

---

## 🎵 Bande son

Composée par **Silent Knight Studio** — dark fantasy, orchestral, cinématique.

---

*LEGACY — v5 · Game Design Document*
