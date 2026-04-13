// ui.js — composants Vue, handlers d'événements, update UI
// Règle : ne contient que du Vue réactif — zéro querySelector/getElementById
import { state }            from './state.js'
import { calculerRevenuClic, calculerXpClic, calculerNiveau, startEngine, stopEngine, isEngineRunning, acheterUpgrade, acheterItem, getTauxPassifTotal, initialiserNouvelleGeneration } from './engine.js'
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
      state.menuOuvert = state.menuOuvert === nom ? null : nom
    }

    function toggleEngine() {
      isEngineRunning() ? stopEngine() : startEngine()
    }

    // ── Computed ──────────────────────────────────────────────────────────────

    const verbeBouton = computed(() =>
      CONFIG.VERBE_METIER[state.metierActif] ?? CONFIG.VERBE_METIER_DEFAUT
    )

    const revenuClicAffiche = computed(() => calculerRevenuClic())
    const tauxPassifAffiche = computed(() => getTauxPassifTotal())

    // ── Upgrades Commerce ─────────────────────────────────────────────────────

    const renderUpgradesCommerce = computed(() => {
      const niveauAtteint = calculerNiveau('commerce')
      return CONFIG.METIERS.commerce.upgrades.map((upg, idx) => {
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

    // ── Niveau Commerce ───────────────────────────────────────────────────────

    const niveauCommerce = computed(() => calculerNiveau('commerce'))

    const nomPalierCommerce = computed(() =>
      CONFIG.NIVEAUX.PALIERS_COMMERCE[niveauCommerce.value] ?? 'Inconnu'
    )

    const xpCommerceInfo = computed(() => {
      const xp     = state.xpSecteurs.commerce
      const niveau = niveauCommerce.value
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

    // ── Boutique ──────────────────────────────────────────────────────────────

    const itemsBoutique = computed(() =>
      CONFIG.BOUTIQUE.ITEMS.map(item => ({
        ...item,
        disabled: state.argent < item.prix,
      }))
    )

    const competencesAuDeces = computed(() =>
      Object.entries(state.xpSecteurs).map(([secteur]) => ({
        secteur,
        niveau: calculerNiveau(secteur),
      }))
    )

    return { state, CONFIG, flottants, boutiqueFlottants, verbeBouton, revenuClicAffiche, tauxPassifAffiche, niveauCommerce, nomPalierCommerce, xpCommerceInfo, onClic, toggleMenu, toggleEngine, isEngineRunning, renderUpgradesCommerce, acheterUpgrade, acheterItemBoutique, itemsBoutique, mort, heritageAffiche, competencesAuDeces, nouvelleGeneration, mortSimulee }
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
          | Passifs : +{{ tauxPassifAffiche.toFixed(1) }} €/s
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
      <section class="zone-clic">
        <div class="btn-clic-wrap">
          <div class="zone-clic__flottants" aria-hidden="true">
            <span v-for="f in flottants" :key="f.id" class="flottant">
              +{{ f.gain.toFixed(2) }} €
            </span>
          </div>
          <button
            class="btn-clic"
            :class="'btn-clic--' + state.multiplicateurCouleur"
            @click="onClic"
          >
            {{ verbeBouton }}
            <span class="btn-clic__multi">
              ×{{ CONFIG.MULTIPLICATEUR_COMPETENCE[state.competence] }}
            </span>
          </button>
        </div>
        <p class="revenu-par-clic">
          Revenu/clic : {{ revenuClicAffiche.toFixed(2) }} €
        </p>
      </section>

      <!-- ── Menus ──────────────────────────────────────────────── -->
      <nav class="menus">
        <button @click="toggleMenu('finances')">Finances</button>
        <button @click="toggleMenu('upgrades')">Améliorations</button>
      </nav>

      <div v-if="state.menuOuvert" class="panel">
        <h2>{{ state.menuOuvert }}</h2>

        <template v-if="state.menuOuvert === 'upgrades'">
          <div class="niveau-commerce">
            <div class="niveau-commerce__header">
              <span class="niveau-commerce__palier">{{ nomPalierCommerce }}</span>
              <span class="niveau-commerce__niv">Niv.{{ niveauCommerce }}</span>
            </div>
            <div class="xp-piste">
              <div class="xp-barre" :style="{ width: xpCommerceInfo.pct + '%' }"></div>
            </div>
            <div class="xp-label">{{ xpCommerceInfo.current }} / {{ xpCommerceInfo.max }} XP</div>
          </div>
          <ul class="upgrades-list">
            <li
              v-for="upg in renderUpgradesCommerce"
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
        <template v-else>
          <p><em>Contenu à venir (prochains tickets)</em></p>
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
