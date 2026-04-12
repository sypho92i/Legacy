// ui.js — composants Vue, handlers d'événements, update UI
// Règle : ne contient que du Vue réactif — zéro querySelector/getElementById
import { state }            from './state.js'
import { calculerRevenuClic, startEngine, stopEngine, isEngineRunning } from './engine.js'
import { CONFIG }           from './config.js'

// ─── Composant racine ─────────────────────────────────────────────────────────

export const AppRoot = {
  setup() {
    // Écouteur mort (dispatché par engine.js)
    window.addEventListener('legacy:mort', (e) => {
      console.log('[LEGACY] Mort — génération', e.detail.generation)
      // TODO ticket héritage : ouvrir écran de transition
    })

    // ── Handlers ──────────────────────────────────────────────────────────────

    function onClic() {
      const gain = calculerRevenuClic()
      state.argent += gain
    }

    function toggleMenu(nom) {
      state.menuOuvert = state.menuOuvert === nom ? null : nom
    }

    function toggleEngine() {
      isEngineRunning() ? stopEngine() : startEngine()
    }

    return { state, CONFIG, onClic, toggleMenu, toggleEngine, isEngineRunning }
  },

  template: `
    <div id="app">

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
      <section class="zone-clic">
        <button
          class="btn-clic"
          :class="'btn-clic--' + state.multiplicateurCouleur"
          @click="onClic"
        >
          Travailler
          <span class="btn-clic__multi">
            ×{{ CONFIG.MULTIPLICATEUR_COMPETENCE[state.competence] }}
          </span>
        </button>
        <p class="revenu-par-clic">
          Revenu/clic : {{ state.revenuParClic.toFixed(2) }} €
        </p>
      </section>

      <!-- ── Menus ──────────────────────────────────────────────── -->
      <nav class="menus">
        <button @click="toggleMenu('finances')">Finances</button>
        <button @click="toggleMenu('boutique')">Boutique</button>
        <button @click="toggleMenu('upgrades')">Améliorations</button>
      </nav>

      <div v-if="state.menuOuvert" class="panel">
        <h2>{{ state.menuOuvert }}</h2>
        <p><em>Contenu à venir (prochains tickets)</em></p>
        <button @click="toggleMenu(state.menuOuvert)">Fermer</button>
      </div>

      <!-- ── Debug engine ───────────────────────────────────────── -->
      <footer class="debug">
        <button @click="toggleEngine">
          {{ isEngineRunning() ? '⏸ Pause moteur' : '▶ Démarrer moteur' }}
        </button>
      </footer>

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
