// ui.js — composants Vue, handlers d'événements, update UI
// Règle : ne contient que du Vue réactif — zéro querySelector/getElementById
import { state }            from './state.js'
import { calculerRevenuClic, calculerXpClic, calculerNiveau, getMultiplicateurNiveau, startEngine, stopEngine, isEngineRunning, acheterUpgrade, acheterItem, louerLogement, acheterLogement, getTauxPassifTotal, initialiserNouvelleGeneration, acheterTelephone, executerActionTelephone, calculerPrixTokens, acheterOrdinateur, acheterTokens, executerCommande, changerSecteur, calculerCoutChangement } from './engine.js'
// calculerCashflowNet est appelé dans tick() — state.cashflowNet est toujours à jour
import { CONFIG }           from './config.js'

// ─── Composant racine ─────────────────────────────────────────────────────────

export const AppRoot = {
  setup() {
    const { ref, computed } = Vue

    // ── Écran de fin de vie ───────────────────────────────────────────────────
    const mort          = ref(false)
    const heritageAffiche = ref(null)

    window.addEventListener('legacy:mort', (e) => {
      heritageAffiche.value = e.detail.heritage
      mort.value = true
    })

    function nouvelleGeneration() {
      initialiserNouvelleGeneration()
      mort.value = false
      startEngine()
    }

    function mortSimulee() {
      stopEngine()
      window.dispatchEvent(new CustomEvent('legacy:mort', {
        detail: {
          heritage: {
            nom:               state.nomPersonnage,
            age_mort:          state.age,
            argent_transmis:   Math.floor(state.argent * 0.5),
            karma_final:       state.karma,
            couche_illegale_max: state.coucheIllegalMax,
          }
        }
      }))
    }

    // ── Floating texts ────────────────────────────────────────────────────────
    const flottants = ref([])
    let _nextFlottantId = 0

    // ── Floating texts boutique ───────────────────────────────────────────────
    const boutiqueFlottants = ref([])
    let _nextBoutiqueFlottantId = 0

    // ── Horloge pour cooldowns téléphone / carte ──────────────────────────────
    const now = ref(Date.now())
    setInterval(() => { now.value = Date.now() }, 1000)

    // ── Vue principale (carte vs jeu) ─────────────────────────────────────────
    const vueActive = ref(null) // null | 'carte'

    // ── Handlers ──────────────────────────────────────────────────────────────

    function onClic() {
      const gain = calculerRevenuClic()
      state.argent += gain
      state.xpSecteurs[state.secteurActif] += calculerXpClic()

      const id = _nextFlottantId++
      flottants.value.push({ id, gain })
      setTimeout(() => {
        const idx = flottants.value.findIndex(f => f.id === id)
        if (idx !== -1) flottants.value.splice(idx, 1)
      }, 800)
    }

    function acheterItemBoutique(id) {
      const item = acheterItem(id)
      if (!item) return
      const fid = _nextBoutiqueFlottantId++
      boutiqueFlottants.value.push({ id: fid, texte: `+${item.effet} ${item.jauge}` })
      setTimeout(() => {
        const idx = boutiqueFlottants.value.findIndex(f => f.id === fid)
        if (idx !== -1) boutiqueFlottants.value.splice(idx, 1)
      }, 800)
    }

    function toggleMenu(nom) {
      vueActive.value  = null
      state.menuOuvert = state.menuOuvert === nom ? null : nom
    }

    function toggleCarte() {
      state.menuOuvert = null
      vueActive.value  = vueActive.value === 'carte' ? null : 'carte'
    }

    function toggleEngine() {
      isEngineRunning() ? stopEngine() : startEngine()
    }

    // ── Computed ──────────────────────────────────────────────────────────────

    const verbeBouton = computed(() =>
      CONFIG.VERBE_METIER[state.secteurActif]
      ?? CONFIG.VERBE_METIER[state.metierActif]
      ?? CONFIG.VERBE_METIER_DEFAUT
    )

    const revenuClicAffiche = computed(() => calculerRevenuClic())

    // ── Upgrades secteur actif ────────────────────────────────────────────────

    const renderUpgradesSecteur = computed(() => {
      const metier = CONFIG.METIERS[state.secteurActif]
      if (!metier?.upgrades) return []
      const niveauAtteint = calculerNiveau(state.secteurActif)
      return metier.upgrades.map((upg, idx) => {
        const n    = idx + 1
        const cout = Math.round(100 * Math.pow(2.8, n - 1))
        const estAchete       = state.upgrades.some(u => u.id === upg.id)
        const prerequisRempli = upg.prerequis === null || state.upgrades.some(u => u.id === upg.prerequis)
        const niveauOk        = !upg.niveauRequis || niveauAtteint >= upg.niveauRequis

        let etat
        if (estAchete)                          etat = 'achete'
        else if (!prerequisRempli || !niveauOk) etat = 'verrouille'
        else if (state.argent < cout)           etat = 'trop-cher'
        else                                    etat = 'disponible'

        return { ...upg, cout, etat }
      })
    })

    // ── Niveau secteur actif ──────────────────────────────────────────────────

    const niveauSecteur = computed(() => calculerNiveau(state.secteurActif))

    const nomPalierSecteur = computed(() => {
      const cle = 'PALIERS_' + state.secteurActif.toUpperCase()
      return (CONFIG.NIVEAUX[cle] ?? {})[niveauSecteur.value] ?? state.secteurActif
    })

    const xpSecteurInfo = computed(() => {
      const xp     = state.xpSecteurs[state.secteurActif] ?? 0
      const niveau = niveauSecteur.value
      const seuils = CONFIG.NIVEAUX.SEUILS
      if (niveau >= seuils.length) {
        return { current: Math.round(xp), max: Math.round(xp), pct: 100 }
      }
      const seuilActuel  = seuils[niveau - 1]
      const seuilSuivant = seuils[niveau]
      const current      = Math.round(xp - seuilActuel)
      const max          = seuilSuivant - seuilActuel
      return { current, max, pct: Math.min(100, (current / max) * 100) }
    })

    // ── Multiplicateur coloré ─────────────────────────────────────────────────

    const multiplicateurActuel = computed(() => getMultiplicateurNiveau(state.secteurActif))

    // ── Finances ──────────────────────────────────────────────────────────────

    const ongletFinances = ref('revenus')

    const financesRevenus = computed(() => state.passifs.map(p => ({
      nom:           p.nom,
      tauxParSeconde: p.tauxParSeconde,
    })))

    const financesCharges = computed(() => {
      const log = CONFIG.LOGEMENTS[state.possessions.logement]
      if (!log || log.charge === 0) return []
      return [{ nom: `Loyer — ${log.nom}`, charge: log.charge }]
    })

    const totalChargesAffiche = computed(() =>
      financesCharges.value.reduce((acc, ch) => acc + ch.charge, 0)
    )

    // ── Boutique ──────────────────────────────────────────────────────────────

    const itemsBoutique = computed(() =>
      CONFIG.BOUTIQUE.ITEMS.map(item => ({
        ...item,
        disabled: state.argent < item.prix,
      }))
    )

    // ── Logement ──────────────────────────────────────────────────────────────

    const logementActuel = computed(() => {
      const slug = state.possessions.logement
      return { slug, ...CONFIG.LOGEMENTS[slug] }
    })

    const logementLocations = computed(() =>
      Object.entries(CONFIG.LOGEMENTS)
        .filter(([, l]) => l.type === 'location')
        .map(([slug, l]) => ({
          slug, ...l,
          estActuel: state.possessions.logement === slug,
          abordable: state.argent >= l.charge,
        }))
    )

    const logementAchats = computed(() =>
      Object.entries(CONFIG.LOGEMENTS)
        .filter(([, l]) => l.type === 'achat')
        .map(([slug, l]) => ({
          slug, ...l,
          estActuel: state.possessions.logement === slug,
          abordable: state.argent >= l.cout,
        }))
    )

    function actionLouer(slug) { louerLogement(slug) }
    function actionAcheter(slug) { acheterLogement(slug) }

    // ── Téléphone ─────────────────────────────────────────────────────────────

    function actionAcheterTelephone() {
      const ok = acheterTelephone()
      if (!ok) return
      const fid = _nextBoutiqueFlottantId++
      boutiqueFlottants.value.push({ id: fid, texte: '📱 Téléphone acheté !' })
      setTimeout(() => {
        const idx = boutiqueFlottants.value.findIndex(f => f.id === fid)
        if (idx !== -1) boutiqueFlottants.value.splice(idx, 1)
      }, 800)
    }

    function actionTelephone(id) {
      const result = executerActionTelephone(id)
      if (!result.ok) return
      const action = CONFIG.TELEPHONE.ACTIONS[id]
      let texte = '✓'
      if (action.effetAbonnes) texte = `+${action.effetAbonnes} abonnés`
      else if (action.effetBonheur) texte = `+${action.effetBonheur} bonheur`
      else if (action.passifId) texte = `+${action.passifTaux} €/s`
      const fid = _nextBoutiqueFlottantId++
      boutiqueFlottants.value.push({ id: fid, texte })
      setTimeout(() => {
        const idx = boutiqueFlottants.value.findIndex(f => f.id === fid)
        if (idx !== -1) boutiqueFlottants.value.splice(idx, 1)
      }, 800)
    }

    // ── Téléphone — computeds ─────────────────────────────────────────────────

    const telephoneActions = computed(() =>
      Object.entries(CONFIG.TELEPHONE.ACTIONS).map(([id, action]) => {
        const expiry     = state.telephoneCooldowns[id] ?? 0
        const enCooldown = now.value < expiry
        const cdRestant  = enCooldown ? Math.ceil((expiry - now.value) / 1000) : 0
        const seuilOk    = state.abonnes >= (action.seuilAbonnes ?? 0)
        const plafondOk  = !action.passifMax || state.passifs.filter(p => p.id === action.passifId).length < action.passifMax
        const disabled   = !seuilOk || enCooldown || !plafondOk
        return { id, ...action, enCooldown, cdRestant, seuilOk, plafondOk, disabled }
      })
    )

    const abonnesAffiche = computed(() => {
      const n = state.abonnes
      if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
      if (n >= 1000)      return (n / 1000).toFixed(1) + 'k'
      return n.toString()
    })

    // ── Ordinateur — computeds ────────────────────────────────────────────────

    const prixPacksTokens = computed(() =>
      CONFIG.ORDINATEUR.PACKS_TOKENS.map(pack => ({
        ...pack,
        prixReel: calculerPrixTokens(pack.prixBase),
      }))
    )

    const tokensAffiche = computed(() => state.possessions.tokens)

    const boostXpActif = computed(() => now.value < state._boostXpExpiry)

    const boostXpRestant = computed(() =>
      boostXpActif.value ? Math.ceil((state._boostXpExpiry - now.value) / 1000) : 0
    )

    function actionAcheterOrdinateur() {
      const ok = acheterOrdinateur()
      if (!ok) return
      const fid = _nextBoutiqueFlottantId++
      boutiqueFlottants.value.push({ id: fid, texte: '💻 Ordinateur acheté !' })
      setTimeout(() => {
        const idx = boutiqueFlottants.value.findIndex(f => f.id === fid)
        if (idx !== -1) boutiqueFlottants.value.splice(idx, 1)
      }, 800)
    }

    function actionAcheterTokens(quantite) {
      const result = acheterTokens(quantite)
      if (!result.ok) return
      const fid = _nextBoutiqueFlottantId++
      boutiqueFlottants.value.push({ id: fid, texte: `+${quantite} 🔮` })
      setTimeout(() => {
        const idx = boutiqueFlottants.value.findIndex(f => f.id === fid)
        if (idx !== -1) boutiqueFlottants.value.splice(idx, 1)
      }, 800)
    }

    function actionExecuterCommande(id) {
      const result = executerCommande(id)
      if (!result.ok) return
      const cmd = CONFIG.ORDINATEUR.COMMANDES[id]
      const fid = _nextBoutiqueFlottantId++
      boutiqueFlottants.value.push({ id: fid, texte: `${cmd.emoji} ${cmd.label}` })
      setTimeout(() => {
        const idx = boutiqueFlottants.value.findIndex(f => f.id === fid)
        if (idx !== -1) boutiqueFlottants.value.splice(idx, 1)
      }, 800)
    }

    // ── Carte — computeds & handler ───────────────────────────────────────────

    function formatMmSs(ms) {
      const total = Math.max(0, Math.ceil(ms / 1000))
      const mm = Math.floor(total / 60)
      const ss = total % 60
      return `${mm}:${ss.toString().padStart(2, '0')}`
    }

    const carteZones = computed(() =>
      Object.entries(CONFIG.MAP.ZONES).map(([id, zone]) => {
        const estActuelle = zone.secteur === state.secteurActif
        const enCooldown  = now.value < state._changementSecteurExpiry
        const cdRestant   = enCooldown ? formatMmSs(state._changementSecteurExpiry - now.value) : ''
        const cout        = calculerCoutChangement(zone.secteur)
        const abordable   = state.argent >= cout
        const disabled    = estActuelle || enCooldown || !zone.disponible
        return { id, ...zone, estActuelle, enCooldown, cdRestant, cout, abordable, disabled }
      })
    )

    const cdGlobalRestant = computed(() => {
      const diff = state._changementSecteurExpiry - now.value
      return diff > 0 ? formatMmSs(diff) : ''
    })

    function actionChangerSecteur(secteur) {
      const result = changerSecteur(secteur)
      if (!result.ok) return
      const zone = Object.values(CONFIG.MAP.ZONES).find(z => z.secteur === secteur)
      const fid = _nextBoutiqueFlottantId++
      boutiqueFlottants.value.push({ id: fid, texte: `→ ${zone?.label ?? secteur}` })
      setTimeout(() => {
        const idx = boutiqueFlottants.value.findIndex(f => f.id === fid)
        if (idx !== -1) boutiqueFlottants.value.splice(idx, 1)
      }, 800)
    }

    // ── Compétences au décès ───────────────────────────────────────────────────

    const competencesAuDeces = computed(() =>
      Object.entries(state.xpSecteurs).map(([secteur]) => ({
        secteur,
        niveau: calculerNiveau(secteur),
      }))
    )

    return { state, CONFIG, flottants, boutiqueFlottants, verbeBouton, revenuClicAffiche, multiplicateurActuel, niveauSecteur, nomPalierSecteur, xpSecteurInfo, onClic, toggleMenu, toggleEngine, isEngineRunning, renderUpgradesSecteur, acheterUpgrade, acheterItemBoutique, itemsBoutique, mort, heritageAffiche, competencesAuDeces, nouvelleGeneration, mortSimulee, ongletFinances, financesRevenus, financesCharges, totalChargesAffiche, getTauxPassifTotal, logementActuel, logementLocations, logementAchats, actionLouer, actionAcheter, telephoneActions, abonnesAffiche, actionAcheterTelephone, actionTelephone, prixPacksTokens, tokensAffiche, boostXpActif, boostXpRestant, actionAcheterOrdinateur, actionAcheterTokens, actionExecuterCommande, vueActive, toggleCarte, carteZones, cdGlobalRestant, actionChangerSecteur }
  },

  template: `
    <div id="app">

      <!-- ── Colonne principale ────────────────────────────────── -->
      <div class="main-col">

      <!-- ── HUD principal ─────────────────────────────────────── -->
      <section class="hud">
        <div class="hud__argent">
          💰 {{ state.argent.toFixed(2) }} €
        </div>
        <div class="hud__meta">
          Génération {{ state.generation }} — Âge {{ state.age }} ans
          | Métier : {{ state.metierActif }}
          | Karma : {{ state.karma }} ({{ state.palierKarma }})
        </div>
      </section>

      <!-- ── Jauges ─────────────────────────────────────────────── -->
      <section class="jauges">
        <jauge-bar
          v-for="(valeur, nom) in state.jauges"
          :key="nom"
          :nom="nom"
          :valeur="valeur"
          :max="CONFIG.JAUGE_MAX"
        />
      </section>

      <!-- ── Zone de clic ──────────────────────────────────────── -->
      <section v-if="vueActive !== 'carte'" class="zone-clic">
        <div class="btn-clic-wrap">
          <div class="zone-clic__flottants" aria-hidden="true">
            <span v-for="f in flottants" :key="f.id" class="flottant">
              +{{ f.gain.toFixed(2) }} €
            </span>
          </div>
          <button
            class="btn-clic"
            :style="{ color: multiplicateurActuel.couleur }"
            @click="onClic"
          >
            {{ verbeBouton }}
          </button>
          <span
            class="multiplicateur-diamant"
            :style="{ color: multiplicateurActuel.couleur }"
          >♦ {{ multiplicateurActuel.label }}</span>
        </div>
        <p class="revenu-par-clic">
          Revenu/clic : {{ revenuClicAffiche.toFixed(2) }} €
        </p>
      </section>

      <!-- ── Menus ──────────────────────────────────────────────── -->
      <nav class="menus">
        <button
          @click="toggleMenu('finances')"
          :class="['menus__btn', { 'menus__btn--pulse-rouge': state.cashflowNet < 0 }]"
        >Finances</button>
        <button class="menus__btn" @click="toggleMenu('upgrades')">Améliorations</button>
        <button class="menus__btn" @click="toggleMenu('logement')">🏠 Logement</button>
        <button class="menus__btn" @click="toggleMenu('telephone')">
          📱 Téléphone
          <span v-if="!state.possessions.telephone" class="nav-badge--prix">1000€</span>
        </button>
        <button class="menus__btn" @click="toggleMenu('ordinateur')">
          💻 Ordinateur
          <span v-if="!state.possessions.ordinateur" class="nav-badge--prix">10k€</span>
        </button>
        <button
          class="menus__btn"
          :class="{ 'menus__btn--actif': vueActive === 'carte' }"
          @click="toggleCarte"
        >🗺 Carte</button>
      </nav>

      <!-- ── Vue Carte ─────────────────────────────────────────── -->
      <div v-if="vueActive === 'carte'" class="carte-container">
        <div class="carte-map">
          <div
            v-for="zone in carteZones"
            :key="zone.id"
            class="carte-zone"
            :class="{
              'carte-zone--active':   zone.estActuelle,
              'carte-zone--locked':   !zone.disponible,
              'carte-zone--cooldown':  zone.enCooldown && !zone.estActuelle,
              'carte-zone--indispo':  !zone.abordable && !zone.estActuelle && zone.disponible,
            }"
            :style="{ left: zone.x + '%', top: zone.y + '%' }"
            @click="!zone.disabled && actionChangerSecteur(zone.secteur)"
          >
            <span class="carte-zone__emoji">{{ zone.emoji }}</span>
            <span class="carte-zone__label">{{ zone.label }}</span>
            <span v-if="!zone.disponible" class="carte-zone__lock">🔒 Bientôt</span>
            <span v-else-if="zone.estActuelle" class="carte-zone__badge">● ICI</span>
            <span v-else class="carte-zone__cout">{{ zone.cout.toLocaleString('fr-FR') }}€</span>
          </div>
        </div>
        <div class="carte-info">
          <span>Secteur actif : <strong>{{ state.secteurActif }}</strong></span>
          <span v-if="cdGlobalRestant" class="carte-cooldown-global">⏳ Rechargement : {{ cdGlobalRestant }}</span>
        </div>
      </div>

      <div v-if="state.menuOuvert" class="panel">
        <h2>{{ state.menuOuvert }}</h2>

        <!-- ── Menu Finances ─────────────────────────────────── -->
        <template v-if="state.menuOuvert === 'finances'">
          <div class="finances-onglets">
            <button
              v-for="ong in ['revenus', 'charges', 'bilan']"
              :key="ong"
              class="finances-onglet"
              :class="{ 'finances-onglet--actif': ongletFinances === ong }"
              @click="ongletFinances = ong"
            >{{ ong.charAt(0).toUpperCase() + ong.slice(1) }}</button>
          </div>

          <!-- Onglet Revenus -->
          <div v-if="ongletFinances === 'revenus'" class="finances-contenu">
            <p v-if="financesRevenus.length === 0" class="finances-vide">Aucun revenu passif actif</p>
            <ul v-else class="finances-liste">
              <li v-for="(rev, i) in financesRevenus" :key="i" class="finances-ligne">
                <span class="finances-ligne__label">{{ rev.nom }}</span>
                <span class="finances-ligne__valeur finances-ligne__valeur--vert">+{{ rev.tauxParSeconde.toFixed(2) }} €/s</span>
              </li>
            </ul>
            <div class="finances-total">
              <span>Total</span>
              <span class="finances-ligne__valeur--vert">+{{ getTauxPassifTotal().toFixed(2) }} €/s</span>
            </div>
          </div>

          <!-- Onglet Charges -->
          <div v-if="ongletFinances === 'charges'" class="finances-contenu">
            <p v-if="financesCharges.length === 0" class="finances-vide">Aucune charge active</p>
            <ul v-else class="finances-liste">
              <li v-for="(ch, i) in financesCharges" :key="i" class="finances-ligne">
                <span class="finances-ligne__label">{{ ch.nom }}</span>
                <span class="finances-ligne__valeur finances-ligne__valeur--rouge">−{{ ch.charge }} €</span>
              </li>
            </ul>
          </div>

          <!-- Onglet Bilan -->
          <div v-if="ongletFinances === 'bilan'" class="finances-contenu">
            <div class="finances-bilan">
              <div class="finances-bilan__cashflow" :class="state.cashflowNet >= 0 ? 'finances-bilan__cashflow--vert' : 'finances-bilan__cashflow--rouge'">
                {{ state.cashflowNet >= 0 ? '+' : '' }}{{ state.cashflowNet.toFixed(2) }} €/s
              </div>
              <div class="finances-bilan__detail">
                <span>Revenus passifs</span>
                <span>+{{ getTauxPassifTotal().toFixed(2) }} €/s</span>
              </div>
              <div class="finances-bilan__detail">
                <span>Charges</span>
                <span :class="totalChargesAffiche > 0 ? 'finances-ligne__valeur--rouge' : ''">−{{ totalChargesAffiche.toFixed(0) }} €</span>
              </div>
            </div>
          </div>
        </template>

        <!-- ── Menu Améliorations ─────────────────────────────── -->
        <template v-else-if="state.menuOuvert === 'upgrades'">
          <div class="niveau-commerce">
            <div class="niveau-commerce__header">
              <span class="niveau-commerce__palier">{{ nomPalierSecteur }}</span>
              <span class="niveau-commerce__niv">Niv.{{ niveauSecteur }}</span>
            </div>
            <div class="xp-piste">
              <div class="xp-barre" :style="{ width: xpSecteurInfo.pct + '%' }"></div>
            </div>
            <div class="xp-label">{{ xpSecteurInfo.current }} / {{ xpSecteurInfo.max }} XP</div>
          </div>
          <p v-if="renderUpgradesSecteur.length === 0" class="finances-vide">Aucune amélioration disponible dans ce secteur.</p>
          <ul v-else class="upgrades-list">
            <li
              v-for="upg in renderUpgradesSecteur"
              :key="upg.id"
              :class="['upgrade-item', 'upgrade-item--' + upg.etat]"
            >
              <div class="upgrade-header">
                <span class="upgrade-nom">{{ upg.nom }}</span>
                <span class="upgrade-cout" :class="{ 'upgrade-cout--rouge': upg.etat === 'trop-cher' }">{{ upg.cout }} €</span>
              </div>
              <div class="upgrade-footer">
                <span class="upgrade-effet">{{ upg.effet }}</span>
                <span v-if="upg.etat === 'verrouille'" class="upgrade-cadenas" aria-label="verrouillé">🔒</span>
                <span v-else-if="upg.etat === 'achete'" class="upgrade-check">✓</span>
                <button
                  v-else
                  class="upgrade-btn"
                  :disabled="upg.etat !== 'disponible'"
                  @click="acheterUpgrade(upg.id)"
                >Acheter</button>
              </div>
            </li>
          </ul>
        </template>

        <!-- ── Menu Logement ──────────────────────────────────── -->
        <template v-else-if="state.menuOuvert === 'logement'">
          <div class="logement-vue">

            <!-- Logement actuel -->
            <div class="logement-actuel">
              <span class="logement-actuel__label">Logement actuel</span>
              <span class="logement-actuel__nom">{{ logementActuel.nom }}</span>
              <span v-if="logementActuel.bonheur > 0" class="logement-actuel__bonus">+{{ logementActuel.bonheur }} bonheur</span>
              <span v-if="logementActuel.charge > 0" class="logement-actuel__charge">
                {{ logementActuel.type === 'achat' ? 'Charges' : 'Loyer' }} : {{ logementActuel.charge }} € / 6 mois
              </span>
            </div>

            <!-- Locations -->
            <h3 class="logement-section-titre">Locations</h3>
            <ul class="logement-liste">
              <li
                v-for="l in logementLocations"
                :key="l.slug"
                class="logement-item"
                :class="{ 'logement-item--actuel': l.estActuel, 'logement-item--verrouille': !l.abordable && !l.estActuel }"
              >
                <div class="logement-item__header">
                  <span class="logement-item__nom">{{ l.nom }}</span>
                  <span class="logement-item__prix">{{ l.charge }} € / 6 mois</span>
                </div>
                <div class="logement-item__footer">
                  <span class="logement-item__bonheur" v-if="l.bonheur > 0">+{{ l.bonheur }} bonheur</span>
                  <span v-if="l.estActuel" class="logement-item__badge">✓ Actuel</span>
                  <button
                    v-else
                    class="logement-item__btn"
                    :disabled="!l.abordable"
                    @click="actionLouer(l.slug)"
                  >Louer</button>
                </div>
              </li>
            </ul>

            <!-- Achats -->
            <h3 class="logement-section-titre">Achats</h3>
            <ul class="logement-liste">
              <li
                v-for="l in logementAchats"
                :key="l.slug"
                class="logement-item"
                :class="{ 'logement-item--actuel': l.estActuel, 'logement-item--verrouille': !l.abordable && !l.estActuel }"
              >
                <div class="logement-item__header">
                  <span class="logement-item__nom">{{ l.nom }}</span>
                  <span class="logement-item__prix">{{ l.cout.toLocaleString('fr-FR') }} €</span>
                </div>
                <div class="logement-item__footer">
                  <span class="logement-item__bonheur" v-if="l.bonheur > 0">+{{ l.bonheur }} bonheur</span>
                  <span class="logement-item__charges" v-if="l.charge > 0">Charges {{ l.charge }} €</span>
                  <span v-if="l.estActuel" class="logement-item__badge">✓ Actuel</span>
                  <button
                    v-else
                    class="logement-item__btn"
                    :disabled="!l.abordable"
                    @click="actionAcheter(l.slug)"
                  >Acheter</button>
                </div>
              </li>
            </ul>

          </div>
        </template>

        <!-- ── Menu Ordinateur ───────────────────────────────────── -->
        <template v-else-if="state.menuOuvert === 'ordinateur'">
          <div class="ordinateur-vue">

            <!-- Écran d'achat -->
            <div v-if="!state.possessions.ordinateur" class="ordinateur-achat">
              <div class="ordinateur-mock">💻</div>
              <p>Accédez aux marchés financiers, aux dons caritatifs et aux outils de recherche.</p>
              <button
                class="ordinateur-btn-achat"
                :disabled="state.argent < CONFIG.BOUTIQUE.ORDINATEUR.prix"
                @click="actionAcheterOrdinateur"
              >Acheter — {{ CONFIG.BOUTIQUE.ORDINATEUR.prix.toLocaleString('fr-FR') }} €</button>
            </div>

            <!-- Écran principal -->
            <div v-else class="ordinateur-screen">

              <!-- Tokens -->
              <div class="ordinateur-section-titre">
                Tokens
                <span class="ordinateur-tokens-solde">{{ tokensAffiche }} 🔮</span>
              </div>
              <ul class="ordinateur-packs">
                <li
                  v-for="pack in prixPacksTokens"
                  :key="pack.quantite"
                  class="ordinateur-pack"
                  :class="{ 'ordinateur-pack--indispo': state.argent < pack.prixReel }"
                >
                  <span>{{ pack.quantite }} tokens</span>
                  <span>{{ pack.prixReel.toLocaleString('fr-FR') }} €</span>
                  <button
                    class="ordinateur-pack__btn"
                    :disabled="state.argent < pack.prixReel"
                    @click="actionAcheterTokens(pack.quantite)"
                  >Acheter</button>
                </li>
              </ul>

              <!-- Commandes -->
              <div class="ordinateur-section-titre">Commandes</div>
              <ul class="ordinateur-commandes">
                <li
                  v-for="(cmd, id) in CONFIG.ORDINATEUR.COMMANDES"
                  :key="id"
                  class="ordinateur-commande"
                  :class="{ 'ordinateur-commande--disabled': state.possessions.tokens < cmd.tokens }"
                >
                  <span class="ordinateur-commande__emoji">{{ cmd.emoji }}</span>
                  <span class="ordinateur-commande__label">{{ cmd.label }}</span>
                  <span
                    v-if="id === 'recherche' && boostXpActif"
                    class="ordinateur-boost-badge"
                  >🔬 ACTIF {{ boostXpRestant }}s</span>
                  <span class="ordinateur-commande__cout">{{ cmd.tokens }} 🔮</span>
                  <button
                    class="ordinateur-commande__btn"
                    :disabled="state.possessions.tokens < cmd.tokens"
                    @click="actionExecuterCommande(id)"
                  >▶</button>
                </li>
              </ul>

            </div>
          </div>
        </template>

        <!-- ── Menu Téléphone ─────────────────────────────────── -->
        <template v-else-if="state.menuOuvert === 'telephone'">
          <div class="telephone-vue">

            <!-- Écran d'achat -->
            <div v-if="!state.possessions.telephone" class="telephone-achat">
              <div class="telephone-mock">📱</div>
              <p>Achetez un téléphone pour accéder aux réseaux sociaux et faire grandir votre audience.</p>
              <button
                class="telephone-btn-achat"
                :disabled="state.argent < CONFIG.BOUTIQUE.TELEPHONE.prix"
                @click="actionAcheterTelephone"
              >Acheter — {{ CONFIG.BOUTIQUE.TELEPHONE.prix }} €</button>
            </div>

            <!-- Écran principal -->
            <div v-else class="telephone-screen">
              <div class="telephone-header">
                <span>Réseaux sociaux</span>
                <span class="telephone-abonnes">{{ abonnesAffiche }} abonnés</span>
              </div>
              <ul class="telephone-actions">
                <li
                  v-for="action in telephoneActions"
                  :key="action.id"
                  class="telephone-action"
                  :class="{
                    'telephone-action--locked':   !action.seuilOk,
                    'telephone-action--cooldown':  action.seuilOk && action.enCooldown,
                    'telephone-action--disabled':  action.seuilOk && !action.enCooldown && !action.plafondOk,
                  }"
                >
                  <span class="telephone-action__emoji">{{ action.emoji }}</span>
                  <span class="telephone-action__label">{{ action.label }}</span>
                  <span v-if="!action.seuilOk" class="telephone-action__lock">
                    🔒 {{ (action.seuilAbonnes / 1000).toFixed(0) }}k abonnés
                  </span>
                  <span v-else-if="action.enCooldown" class="telephone-action__cd">{{ action.cdRestant }}s</span>
                  <span v-else-if="!action.plafondOk" class="telephone-action__cd">Max</span>
                  <button
                    v-else
                    class="telephone-action__btn"
                    @click="actionTelephone(action.id)"
                  >▶</button>
                </li>
              </ul>
            </div>

          </div>
        </template>

        <button @click="toggleMenu(state.menuOuvert)">Fermer</button>
      </div>

      </div><!-- /.main-col -->

      <!-- ── Panneau boutique (toujours visible) ───────────────── -->
      <aside class="boutique-panel">
        <h2 class="boutique-panel__titre">Boutique</h2>
        <div class="boutique-flottants" aria-hidden="true">
          <span v-for="f in boutiqueFlottants" :key="f.id" class="boutique-flottant">
            {{ f.texte }}
          </span>
        </div>
        <ul class="boutique-liste">
          <li v-for="item in itemsBoutique" :key="item.id" class="boutique-item" :class="{ 'boutique-item--disabled': item.disabled }">
            <div class="boutique-item__label">{{ item.label }}</div>
            <div class="boutique-item__prix">{{ item.prix }} €</div>
            <button
              class="boutique-item__btn"
              :disabled="item.disabled"
              @click="acheterItemBoutique(item.id)"
            >Acheter</button>
          </li>
        </ul>
      </aside>

      <!-- ── Debug engine ───────────────────────────────────────── -->
      <footer class="debug">
        <button @click="toggleEngine">
          {{ isEngineRunning() ? '⏸ Pause moteur' : '▶ Démarrer moteur' }}
        </button>
        <button v-if="CONFIG.DEBUG" class="debug__mort" @click="mortSimulee">
          ☠ Mort simulée
        </button>
      </footer>

      <!-- ── Écran de fin de vie ────────────────────────────────── -->
      <div v-if="mort" class="overlay-mort">
        <div class="ecran-mort">
          <h1 class="ecran-mort__titre">Fin de vie</h1>

          <div v-if="heritageAffiche" class="ecran-mort__resume">
            <p class="ecran-mort__nom">{{ heritageAffiche.nom }}</p>
            <p>Décédé à <strong>{{ heritageAffiche.age_mort }} ans</strong></p>
            <p>Argent transmis : <strong>{{ heritageAffiche.argent_transmis }} €</strong></p>
            <p>Karma final : <strong>{{ heritageAffiche.karma_final }}</strong></p>
          </div>

          <div class="ecran-mort__competences">
            <h2>Compétences</h2>
            <ul class="ecran-mort__liste-comp">
              <li v-for="c in competencesAuDeces" :key="c.secteur" class="ecran-mort__comp-item">
                <span class="ecran-mort__comp-secteur">{{ c.secteur }}</span>
                <span class="ecran-mort__comp-niv">Niv.{{ c.niveau }}</span>
              </li>
            </ul>
          </div>

          <button class="ecran-mort__btn" @click="nouvelleGeneration">
            Nouvelle génération →
          </button>
        </div>
      </div>

    </div>
  `,
}

// ─── Composant jauge ──────────────────────────────────────────────────────────

export const JaugeBar = {
  props: {
    nom:    { type: String,  required: true },
    valeur: { type: Number,  required: true },
    max:    { type: Number,  default: 100   },
  },
  computed: {
    pct()     { return (this.valeur / this.max) * 100 },
    couleur() {
      if (this.pct >= 60) return 'vert'
      if (this.pct >= 30) return 'orange'
      return 'rouge'
    },
  },
  template: `
    <div class="jauge">
      <span class="jauge__nom">{{ nom }}</span>
      <div class="jauge__piste">
        <div
          class="jauge__barre"
          :class="'jauge__barre--' + couleur"
          :style="{ width: pct + '%' }"
        ></div>
      </div>
      <span class="jauge__valeur">{{ Math.round(valeur) }}</span>
    </div>
  `,
}
