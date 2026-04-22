// ui.js — composants Vue, handlers d'événements, update UI
// Règle : ne contient que du Vue réactif — zéro querySelector/getElementById
import { state }            from './state.js'
import { calculerRevenuClic, calculerXpClic, calculerNiveau, getMultiplicateurNiveau, startEngine, stopEngine, isEngineRunning, acheterUpgrade, acheterItem, louerLogement, acheterLogement, getTauxPassifTotal, initialiserNouvelleGeneration, acheterTelephone, executerActionTelephone, calculerPrixTokens, acheterOrdinateur, acheterTokens, executerCommande, changerSecteur, acheterFormation, acheterVehicule, vehiculePermetSecteur, declencherEvenementImmo, lancerChantier, calculerGainInfluence } from './engine.js'
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

    // ── Notif événement immobilier ────────────────────────────────────────────
    const derniereNotifImmo = ref(null)
    window.addEventListener('legacy:immo-event', (e) => {
      derniereNotifImmo.value = e.detail
      setTimeout(() => { derniereNotifImmo.value = null }, 4000)
    })

    // ── Floating texts ────────────────────────────────────────────────────────
    const flottants = ref([])
    let _nextFlottantId = 0

    // ── Floating texts boutique ───────────────────────────────────────────────
    const boutiqueFlottants = ref([])
    let _nextBoutiqueFlottantId = 0

    function ajouterFlottant(texte, duree = 800) {
      const fid = _nextBoutiqueFlottantId++
      boutiqueFlottants.value.push({ id: fid, texte })
      setTimeout(() => {
        const idx = boutiqueFlottants.value.findIndex(f => f.id === fid)
        if (idx !== -1) boutiqueFlottants.value.splice(idx, 1)
      }, duree)
    }

    // ── Notif achèvement chantier BTP ─────────────────────────────────────────
    window.addEventListener('legacy:btp-complete', (e) => {
      ajouterFlottant(`🏗 +${e.detail.gain.toLocaleString('fr-FR')} €`, 2000)
    })

    // ── Horloge pour cooldowns ────────────────────────────────────────────────
    const now = ref(Date.now())
    setInterval(() => { now.value = Date.now() }, 1000)

    // ── Navigation centrale ───────────────────────────────────────────────────
    // panneauActif : 'travail' uniquement (plus de remplacement de la carte)
    const panneauActif        = ref('travail')
    const messageBlocageCarte = ref('')

    function setPanneau(nom) {
      panneauActif.value        = nom
      messageBlocageCarte.value = ''
    }

    // ── Overlay latéral (finances / logement / telephone / ordinateur / vehicules / boutique)
    const panneauOverlay = ref(null) // null | 'finances' | 'logement' | 'telephone' | 'ordinateur' | 'vehicules' | 'boutique'

    function ouvrirOverlay(nom) {
      panneauOverlay.value = panneauOverlay.value === nom ? null : nom
    }
    function fermerOverlay() { panneauOverlay.value = null }

    // ── Navigation carte / quartier ───────────────────────────────────────────
    const navEcran        = ref('map')   // 'map' | 'quartier'
    const quartierEnCours = ref(null)    // slug du quartier en cours de visite

    function retourCarte() {
      navEcran.value        = 'map'
      quartierEnCours.value = null
      messageBlocageCarte.value = ''
    }

    function entrerDansSecteur(slug) {
      const result = changerSecteur(slug)
      if (!result.ok) {
        if (result.raison === 'vehicule' || result.raison === 'possessions')
          messageBlocageCarte.value = result.message
        return
      }
      messageBlocageCarte.value = ''
      retourCarte()
    }

    // ── ouvrirQuartier — appelé par clic sur zone map ─────────────────────────
    function ouvrirQuartier(slug) {
      if (slug === 'boutique') { ouvrirOverlay('boutique'); return }
      messageBlocageCarte.value = ''
      navEcran.value        = 'quartier'
      quartierEnCours.value = slug
    }

    function toggleEngine() {
      isEngineRunning() ? stopEngine() : startEngine()
    }

    // ── Handlers clic ──────────────────────────────────────────────────────────

    function onClic() {
      const gain = calculerRevenuClic()
      state.argent += gain
      state.xpSecteurs[state.secteurActif] += calculerXpClic()

      let classe = ''
      if (state.secteurActif === 'finance') {
        if      (state._dernierGainClic > 20) classe = 'flottant--positif'
        else if (state._dernierGainClic < 10) classe = 'flottant--negatif'
        else                                  classe = 'flottant--neutre'
      }

      const id = _nextFlottantId++
      flottants.value.push({ id, gain, classe })
      setTimeout(() => {
        const idx = flottants.value.findIndex(f => f.id === id)
        if (idx !== -1) flottants.value.splice(idx, 1)
      }, 800)
    }

    function acheterItemBoutique(id) {
      const item = acheterItem(id)
      if (!item) return
      ajouterFlottant(`+${item.effet} ${item.jauge}`)
    }

    // ── Computed ──────────────────────────────────────────────────────────────

    const verbeBouton = computed(() =>
      CONFIG.VERBE_METIER[state.secteurActif]
      ?? CONFIG.VERBE_METIER[state.metierActif]
      ?? CONFIG.VERBE_METIER_DEFAUT
    )

    const revenuClicAffiche = computed(() => calculerRevenuClic())

    // ── Sprite perso — suit le secteur actif sur la carte ─────────────────────
    const spritePosition = computed(() => {
      const zone = CONFIG.MAP.ZONES[state.secteurActif]
      if (!zone) return { left: '50%', top: '50%' }
      return { left: zone.x + '%', top: zone.y + '%' }
    })

    // ── Upgrades secteur actif ────────────────────────────────────────────────

    const renderUpgradesSecteur = computed(() => {
      const metier = CONFIG.METIERS[state.secteurActif]
      if (!metier?.upgrades) return []
      const niveauAtteint = calculerNiveau(state.secteurActif)
      const estBtp        = state.secteurActif === 'btp'
      return metier.upgrades.map((upg, idx) => {
        const cout = estBtp
          ? 0
          : (upg.prix !== undefined ? upg.prix : Math.round(100 * Math.pow(2.8, idx)))

        const estAchete = estBtp
          ? false
          : state.upgrades.some(u => u.id === upg.id)
        const prerequisRempli = estBtp
          ? (upg.prerequis === null || state.btpCompletes.includes(upg.prerequis))
          : (upg.prerequis === null || state.upgrades.some(u => u.id === upg.prerequis))
        const niveauOk  = !upg.niveauRequis || niveauAtteint >= upg.niveauRequis
        const enCours   = estBtp && state.chantierActif?.id === upg.id

        let etat
        if (estBtp) {
          if (!prerequisRempli || !niveauOk) etat = 'verrouille'
          else if (state.chantierActif)      etat = 'trop-cher'
          else                               etat = 'disponible'
        } else {
          if (estAchete)                          etat = 'achete'
          else if (!prerequisRempli || !niveauOk) etat = 'verrouille'
          else if (state.argent < cout)           etat = 'trop-cher'
          else                                    etat = 'disponible'
        }

        const effetTexte = (() => {
          if (estBtp) return `⏱ ${upg.duree}s → +${upg.recompense.toLocaleString('fr-FR')} €`
          const e = upg.effet
          if (typeof e === 'string') return e
          if (!e) return ''
          if (e.bonusClic)    return `+€${e.bonusClic} / clic`
          if (e.bonusAbonnes) return `+${Math.round(e.bonusAbonnes * 100)}% abonnés`
          if (e.passifId)     return `+${e.passifValeur} €/s passif`
          return ''
        })()

        return { ...upg, cout, etat, effetTexte, estBtp, enCours }
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

    // ── Véhicules ─────────────────────────────────────────────────────────────

    const vehiculeActuel = computed(() =>
      state.possessions.vehicule ? CONFIG.VEHICULES[state.possessions.vehicule] : null
    )

    const boutiqueVehicules = computed(() =>
      Object.entries(CONFIG.VEHICULES).map(([id, cfg]) => ({
        id, ...cfg,
        estActuel:    state.possessions.vehicule === id,
        abordable:    state.argent >= cfg.prix,
        estInferieur: CONFIG.ORDRE_VEHICULES.indexOf(id) < CONFIG.ORDRE_VEHICULES.indexOf(state.possessions.vehicule ?? ''),
      }))
    )

    function actionAcheterVehicule(id) {
      const result = acheterVehicule(id)
      if (!result.ok) return
      const cfg = CONFIG.VEHICULES[id]
      ajouterFlottant(`${cfg.emoji} ${cfg.label} acheté !`)
    }

    // ── Téléphone ─────────────────────────────────────────────────────────────

    function actionAcheterTelephone() {
      const ok = acheterTelephone()
      if (!ok) return
      ajouterFlottant('📱 Téléphone acheté !')
    }

    function actionTelephone(id) {
      const result = executerActionTelephone(id)
      if (!result.ok) return
      const action = CONFIG.TELEPHONE.ACTIONS[id]
      let texte = '✓'
      if (action.effetAbonnes)      texte = `+${action.effetAbonnes} abonnés`
      else if (action.effetBonheur) texte = `+${action.effetBonheur} bonheur`
      else if (action.passifId)     texte = `+${action.passifTaux} €/s`
      ajouterFlottant(texte)
    }

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

    // ── Ordinateur ────────────────────────────────────────────────────────────

    const prixPacksTokens = computed(() =>
      CONFIG.ORDINATEUR.PACKS_TOKENS.map(pack => ({
        ...pack,
        prixReel: calculerPrixTokens(pack.prixBase),
      }))
    )

    const tokensAffiche  = computed(() => state.possessions.tokens)
    const boostXpActif   = computed(() => now.value < state._boostXpExpiry)
    const boostXpRestant = computed(() =>
      boostXpActif.value ? Math.ceil((state._boostXpExpiry - now.value) / 1000) : 0
    )

    function actionAcheterOrdinateur() {
      const ok = acheterOrdinateur()
      if (!ok) return
      ajouterFlottant('💻 Ordinateur acheté !')
    }

    function actionAcheterTokens(quantite) {
      const result = acheterTokens(quantite)
      if (!result.ok) return
      ajouterFlottant(`+${quantite} 🔮`)
    }

    function actionExecuterCommande(id) {
      const result = executerCommande(id)
      if (!result.ok) return
      const cmd = CONFIG.ORDINATEUR.COMMANDES[id]
      ajouterFlottant(`${cmd.emoji} ${cmd.label}`)
    }

    // ── Carte — computeds ─────────────────────────────────────────────────────

    const carteZones = computed(() =>
      Object.entries(CONFIG.MAP.ZONES).map(([id, zone]) => {
        const estActuelle = zone.secteur !== null && zone.secteur === state.secteurActif
        const disabled    = estActuelle || !zone.disponible
        return { id, ...zone, estActuelle, disabled }
      })
    )

    // ── Campus — formations ───────────────────────────────────────────────────

    const formationsCampus = computed(() =>
      CONFIG.FORMATIONS.map(f => ({
        ...f,
        disabled: state.argent < f.cout,
      }))
    )

    function actionAcheterFormation(id) {
      const result = acheterFormation(id)
      if (!result.ok) return
      ajouterFlottant(`📚 +${result.gainXP} XP ${result.secteur}`)
    }

    // ── Compétences au décès ───────────────────────────────────────────────────

    const competencesAuDeces = computed(() =>
      Object.entries(state.xpSecteurs).map(([secteur]) => ({
        secteur,
        niveau: calculerNiveau(secteur),
      }))
    )

    // ── Influence — hold-to-release ───────────────────────────────────────────

    const influenceAppuiMs  = ref(0)
    const influenceEnAppui  = ref(false)
    let _influenceRafId = null

    function onInfluenceDebut() {
      if (!state.possessions.telephone || !state.possessions.ordinateur) {
        ajouterFlottant('📱💻 Requis'); return
      }
      state._influenceAppuiDebut = Date.now()
      influenceEnAppui.value     = true
      influenceAppuiMs.value     = 0
      const loop = () => {
        influenceAppuiMs.value = Date.now() - state._influenceAppuiDebut
        _influenceRafId = requestAnimationFrame(loop)
      }
      _influenceRafId = requestAnimationFrame(loop)
    }

    function onInfluenceFin() {
      if (!influenceEnAppui.value) return
      if (_influenceRafId !== null) { cancelAnimationFrame(_influenceRafId); _influenceRafId = null }
      influenceEnAppui.value = false
      const duree = (Date.now() - state._influenceAppuiDebut) / 1000
      state._influenceAppuiDebut = 0
      const { abonnes, argent } = calculerGainInfluence(duree)
      if (abonnes > 0) {
        state.abonnes += abonnes
        state.argent  += argent
        state.xpSecteurs.influence += calculerXpClic()
      }
      ajouterFlottant(abonnes > 0 ? `+${abonnes} abonnés` : '❌ Trop court')
    }

    const influenceBarrePct = computed(() => {
      if (!influenceEnAppui.value) return 0
      const s    = influenceAppuiMs.value / 1000
      const cible = CONFIG.INFLUENCE.CIBLE_SECONDES
      return Math.min(100, Math.round((s / (cible * 2)) * 100))
    })

    const influencePrecisionLabel = computed(() => {
      if (!influenceEnAppui.value) return ''
      const s     = influenceAppuiMs.value / 1000
      const cible = CONFIG.INFLUENCE.CIBLE_SECONDES
      const delta = s - cible
      if (Math.abs(delta) < 0.5) return '🎯 Parfait !'
      if (delta < 0) return `⬆ ${Math.abs(delta).toFixed(1)}s de plus`
      return `⬇ Relâche !`
    })

    // ── BTP — chantier ────────────────────────────────────────────────────────

    const chantierProgression = computed(() => {
      const _ = now.value
      const c = state.chantierActif
      if (!c) return null
      const duree = Math.max(0, c.dureeRestante)
      return {
        label:         c.label,
        recompense:    c.recompense,
        dureeRestante: duree,
        dureeInitiale: c.dureeInitiale,
        pourcent:      Math.min(100, Math.round((1 - duree / c.dureeInitiale) * 100)),
        tempsAffiche:  formatMmSs(duree * 1000),
      }
    })

    function actionLancerChantier(id) {
      const result = lancerChantier(id)
      if (!result.ok) return
      const cfg = CONFIG.METIERS.btp.upgrades.find(u => u.id === id)
      ajouterFlottant(`🏗 ${cfg?.label ?? id} lancé !`)
    }

    // ── Sprite — classe selon l'âge ───────────────────────────────────────────
    const spriteClasse = computed(() => {
      const age = state.age
      if (age < 30) return 'sprite--jeune'
      if (age < 50) return 'sprite--adulte'
      if (age < 70) return 'sprite--senior'
      return 'sprite--vieux'
    })

    // ── Immobilier — badge passif multi ──────────────────────────────────────
    const immoPassifBadge = computed(() => {
      if (state._immoPassifMulti === 1.0) return null
      const pct = Math.round((state._immoPassifMulti - 1) * 100)
      return pct >= 0 ? `+${pct}% loyers` : `${pct}% loyers`
    })

    return {
      state, CONFIG, flottants, boutiqueFlottants,
      verbeBouton, revenuClicAffiche, multiplicateurActuel,
      niveauSecteur, nomPalierSecteur, xpSecteurInfo,
      onClic, toggleEngine, isEngineRunning,
      renderUpgradesSecteur, acheterUpgrade, acheterItemBoutique, itemsBoutique,
      mort, heritageAffiche, competencesAuDeces, nouvelleGeneration, mortSimulee,
      ongletFinances, financesRevenus, financesCharges, totalChargesAffiche, getTauxPassifTotal,
      logementActuel, logementLocations, logementAchats, actionLouer, actionAcheter,
      telephoneActions, abonnesAffiche, actionAcheterTelephone, actionTelephone,
      prixPacksTokens, tokensAffiche, boostXpActif, boostXpRestant,
      actionAcheterOrdinateur, actionAcheterTokens, actionExecuterCommande,
      panneauActif, setPanneau, messageBlocageCarte,
      panneauOverlay, ouvrirOverlay, fermerOverlay,
      navEcran, quartierEnCours, retourCarte, entrerDansSecteur, ouvrirQuartier,
      carteZones, spritePosition, spriteClasse,
      formationsCampus, actionAcheterFormation,
      vehiculeActuel, boutiqueVehicules, actionAcheterVehicule,
      derniereNotifImmo, immoPassifBadge,
      chantierProgression, actionLancerChantier,
      influenceAppuiMs, influenceEnAppui, influenceBarrePct, influencePrecisionLabel,
      onInfluenceDebut, onInfluenceFin,
    }
  },

  template: `
    <div id="app">

      <!-- ══════════════════════════════════════════════════════════ -->
      <!-- SIDEBAR                                                   -->
      <!-- ══════════════════════════════════════════════════════════ -->
      <aside class="sidebar">

        <!-- Sprite personnage -->
        <div id="sprite-perso" :class="spriteClasse"></div>

        <!-- Identité -->
        <div class="sidebar-identite">
          <span class="sidebar-identite__nom">{{ state.nomPersonnage }}</span>
          <span class="sidebar-identite__meta">{{ state.age }} ans — Gén. {{ state.generation }}</span>
        </div>

        <!-- Jauges -->
        <section class="jauges">
          <jauge-bar
            v-for="(valeur, nom) in state.jauges"
            :key="nom"
            :nom="nom"
            :valeur="valeur"
            :max="CONFIG.JAUGE_MAX"
          />
        </section>

        <!-- Karma -->
        <div class="sidebar-karma">Karma : {{ state.karma }} ({{ state.palierKarma }})</div>

        <!-- Finances -->
        <div class="sidebar-finances">
          <div class="sidebar-argent">💰 {{ state.argent.toFixed(2) }} €</div>
          <div :class="state.cashflowNet >= 0 ? 'cashflow-positif' : 'cashflow-negatif'">
            {{ state.cashflowNet >= 0 ? '+' : '' }}{{ state.cashflowNet.toFixed(2) }} €/s
          </div>
        </div>

        <!-- Nav overlay -->
        <nav class="sidebar-nav">
          <button
            @click="ouvrirOverlay('finances')"
            :class="['sidebar-nav__btn', {
              'sidebar-nav__btn--pulse-rouge': state.cashflowNet < 0,
              'sidebar-nav__btn--actif': panneauOverlay === 'finances',
            }]"
          >📊 Finances</button>
          <button
            class="sidebar-nav__btn"
            :class="{ 'sidebar-nav__btn--actif': panneauOverlay === 'logement' }"
            @click="ouvrirOverlay('logement')"
          >🏠 Logement</button>
          <button
            class="sidebar-nav__btn"
            :class="{ 'sidebar-nav__btn--actif': panneauOverlay === 'telephone' }"
            @click="ouvrirOverlay('telephone')"
          >
            📱 Téléphone
            <span v-if="!state.possessions.telephone" class="nav-badge--prix">1000€</span>
          </button>
          <button
            class="sidebar-nav__btn"
            :class="{ 'sidebar-nav__btn--actif': panneauOverlay === 'ordinateur' }"
            @click="ouvrirOverlay('ordinateur')"
          >
            💻 Ordinateur
            <span v-if="!state.possessions.ordinateur" class="nav-badge--prix">10k€</span>
          </button>
          <button
            class="sidebar-nav__btn"
            :class="{ 'sidebar-nav__btn--actif': panneauOverlay === 'vehicules' }"
            @click="ouvrirOverlay('vehicules')"
          >🚗 Véhicules</button>
        </nav>

        <!-- Debug -->
        <footer class="debug">
          <button @click="toggleEngine">
            {{ isEngineRunning() ? '⏸ Pause' : '▶ Start' }}
          </button>
          <button v-if="CONFIG.DEBUG" class="debug__mort" @click="mortSimulee">
            ☠ Mort
          </button>
        </footer>

      </aside>

      <!-- ══════════════════════════════════════════════════════════ -->
      <!-- ZONE CENTRALE                                             -->
      <!-- ══════════════════════════════════════════════════════════ -->
      <main class="zone-centrale">

        <!-- ── Vue Carte ─────────────────────────────────────────── -->
        <div v-if="navEcran === 'map'" class="ville-container">
          <div class="carte-map">

            <div class="sprite-perso" :style="spritePosition"></div>

            <div
              v-for="zone in carteZones"
              :key="zone.id"
              class="carte-zone"
              :class="{
                'carte-zone--active':  zone.estActuelle,
                'carte-zone--locked':  !zone.disponible,
              }"
              :style="{ left: zone.x + '%', top: zone.y + '%' }"
              @click="!zone.disabled && ouvrirQuartier(zone.id)"
            >
              <span class="carte-zone__emoji">{{ zone.emoji }}</span>
              <span class="carte-zone__label">{{ zone.label }}</span>
              <span v-if="!zone.disponible" class="carte-zone__lock">🔒 Bientôt</span>
              <span v-else-if="zone.estActuelle" class="carte-zone__badge">● ICI</span>
            </div>

            <div
              class="carte-zone batiment-boutique"
              :class="{ 'carte-zone--active': panneauOverlay === 'boutique' }"
              style="left: 85%; top: 78%"
              @click="ouvrirOverlay('boutique')"
            >
              <span class="carte-zone__emoji">🏪</span>
              <span class="carte-zone__label">Boutique</span>
            </div>

          </div>

          <div class="carte-info">
            <span>Secteur actif : <strong>{{ state.secteurActif }}</strong></span>
          </div>
          <div v-if="messageBlocageCarte" class="carte-message-blocage">
            {{ messageBlocageCarte }}
          </div>
          <div class="boutique-flottants" aria-hidden="true">
            <span v-for="f in boutiqueFlottants" :key="f.id" class="boutique-flottant">{{ f.texte }}</span>
          </div>
        </div>

        <!-- ── Vue Quartier ──────────────────────────────────────── -->
        <div v-else-if="navEcran === 'quartier'" class="quartier-vue">
          <div class="quartier-breadcrumb">
            <button class="quartier-retour" @click="retourCarte">← Ville</button>
            <span>{{ CONFIG.MAP.ZONES[quartierEnCours]?.label ?? quartierEnCours }}</span>
          </div>

          <!-- Campus : liste de formations -->
          <template v-if="quartierEnCours === 'campus'">
            <p style="color:#888; font-size:0.85em; margin:0 0 8px;">
              Développez vos compétences dans tous les secteurs.
            </p>
            <ul class="boutique-liste boutique-liste--inline">
              <li
                v-for="f in formationsCampus"
                :key="f.id"
                class="boutique-item"
                :class="{ 'boutique-item--disabled': f.disabled }"
              >
                <div class="boutique-item__label">{{ f.emoji }} {{ f.label }}</div>
                <div class="boutique-item__prix" style="color:#aaa; font-size:0.8em;">
                  +{{ f.gainXP }} XP {{ f.secteur }}
                </div>
                <div class="boutique-item__prix">{{ f.cout.toLocaleString('fr-FR') }} €</div>
                <button
                  class="boutique-item__btn"
                  :disabled="f.disabled"
                  @click="actionAcheterFormation(f.id)"
                >Suivre</button>
              </li>
            </ul>
          </template>

          <!-- Autres quartiers : façade RPG + bouton travailler -->
          <template v-else>
            <div class="quartier-facade">
              <div
                v-for="slugBat in (CONFIG.QUARTIERS?.[quartierEnCours]?.batiments ?? [])"
                :key="slugBat"
                class="batiment-card"
              >
                <div class="batiment-card__toit"></div>
                <div class="batiment-card__corps">
                  <span class="batiment-card__emoji">{{ CONFIG.BATIMENTS?.[slugBat]?.emoji }}</span>
                  <span class="batiment-card__label">{{ CONFIG.BATIMENTS?.[slugBat]?.label }}</span>
                </div>
              </div>
            </div>
            <div v-if="messageBlocageCarte" class="carte-message-blocage">{{ messageBlocageCarte }}</div>
            <button class="btn-entrer-secteur" @click="entrerDansSecteur(quartierEnCours)">
              ▶ Travailler ici
            </button>
          </template>
        </div>

        <!-- ── Influence barre (sous la carte, secteur influence) ── -->
        <div v-if="state.secteurActif === 'influence' && navEcran === 'map'" class="influence-zone-centrale">
          <p class="influence-abonnes">🎙 {{ abonnesAffiche }} abonnés</p>
          <div class="influence-barre-wrap">
            <div class="influence-barre-cible"></div>
            <div
              class="influence-barre-fill"
              :class="{ 'influence-barre-fill--actif': influenceEnAppui }"
              :style="{ width: influenceBarrePct + '%' }"
            ></div>
          </div>
          <p class="influence-precision">{{ influencePrecisionLabel || 'Maintiens 5 secondes' }}</p>
          <p class="influence-hint">Maintiens le bouton ~5s pour maximiser les abonnés</p>
        </div>

        <!-- ── Upgrades (uniquement en vue carte) ────────────────── -->
        <div v-if="navEcran === 'map'" class="panneau-upgrades">
          <div class="niveau-commerce">
            <div class="niveau-commerce__header">
              <span class="niveau-commerce__palier">{{ nomPalierSecteur }}</span>
              <span class="niveau-commerce__niv">Niv.{{ niveauSecteur }}</span>
            </div>
            <div class="xp-piste">
              <div class="xp-barre" :style="{ width: xpSecteurInfo.pct + '%' }"></div>
            </div>
            <div class="xp-label">{{ xpSecteurInfo.current }} / {{ xpSecteurInfo.max }} XP</div>
            <span v-if="immoPassifBadge && state.secteurActif === 'immobilier'" class="immo-passif-badge">
              {{ immoPassifBadge }}
            </span>
          </div>

          <!-- BTP chantier actif -->
          <div v-if="state.secteurActif === 'btp' && chantierProgression" class="btp-chantier-actif">
            <div class="btp-chantier-header">
              🏗 {{ chantierProgression.label }}
              <span class="btp-chantier-timer">{{ chantierProgression.tempsAffiche }}</span>
              <span class="btp-chantier-recompense">+{{ chantierProgression.recompense.toLocaleString('fr-FR') }}€</span>
            </div>
            <div class="btp-progress-bar">
              <div class="btp-progress-fill" :style="{ width: chantierProgression.pourcent + '%' }"></div>
            </div>
            <div class="btp-clic-hint">Clique sur Travailler pour accélérer ⚡</div>
          </div>

          <p v-if="renderUpgradesSecteur.length === 0" class="finances-vide">
            Aucune amélioration disponible dans ce secteur.
          </p>
          <ul v-else class="upgrades-list">
            <li
              v-for="upg in renderUpgradesSecteur"
              :key="upg.id"
              :class="['upgrade-item', 'upgrade-item--' + upg.etat]"
            >
              <div class="upgrade-header">
                <span class="upgrade-nom">{{ upg.nom ?? upg.label }}</span>
                <span v-if="!upg.estBtp" class="upgrade-cout" :class="{ 'upgrade-cout--rouge': upg.etat === 'trop-cher' }">{{ upg.cout }} €</span>
              </div>
              <div class="upgrade-footer">
                <span class="upgrade-effet">
                  {{ upg.effetTexte }}
                  <span v-if="upg.prix !== undefined && !upg.estBtp" class="upgrade-prix">{{ upg.prix.toLocaleString('fr-FR') }} €</span>
                </span>
                <template v-if="upg.estBtp">
                  <span v-if="upg.etat === 'verrouille'" class="upgrade-cadenas">🔒</span>
                  <template v-else>
                    <span v-if="upg.enCours" class="upgrade-check" style="color:#facc15;">⚡ En cours</span>
                    <button v-else class="upgrade-btn" :disabled="upg.etat !== 'disponible'" @click="actionLancerChantier(upg.id)">Lancer</button>
                  </template>
                </template>
                <template v-else>
                  <span v-if="upg.etat === 'verrouille'" class="upgrade-cadenas">🔒</span>
                  <span v-else-if="upg.etat === 'achete'" class="upgrade-check">✓</span>
                  <button v-else class="upgrade-btn" :disabled="upg.etat !== 'disponible'" @click="acheterUpgrade(upg.id)">Acheter</button>
                </template>
              </div>
            </li>
          </ul>
        </div>

        <!-- ── Bouton Travailler (ancré en bas de zone-centrale) ─── -->
        <div
          class="btn-travailler-wrap"
          @mouseleave="influenceEnAppui && onInfluenceFin()"
        >
          <div class="zone-clic__flottants" aria-hidden="true">
            <span v-for="f in flottants" :key="f.id" class="flottant" :class="f.classe">
              +{{ f.gain.toFixed(2) }} €
            </span>
          </div>
          <span class="multiplicateur-diamant" :style="{ color: multiplicateurActuel.couleur }">
            ♦ {{ multiplicateurActuel.label }}
          </span>
          <button
            class="btn-travailler"
            :style="{ color: multiplicateurActuel.couleur, borderColor: multiplicateurActuel.couleur }"
            @click="state.secteurActif !== 'influence' && onClic()"
            @mousedown="state.secteurActif === 'influence' && onInfluenceDebut()"
            @mouseup="state.secteurActif === 'influence' && onInfluenceFin()"
            @touchstart.prevent="state.secteurActif === 'influence' && onInfluenceDebut()"
            @touchend.prevent="state.secteurActif === 'influence' && onInfluenceFin()"
          >{{ verbeBouton }}</button>
          <p class="revenu-par-clic">{{ revenuClicAffiche.toFixed(2) }} €/clic</p>
        </div>

        <!-- ── Overlay panneau latéral ────────────────────────────── -->
        <div v-if="panneauOverlay" class="panneau-overlay">
          <div class="panneau-overlay__header">
            <span class="panneau-overlay__titre">
              {{ panneauOverlay === 'boutique'   ? '🏪 Boutique'
               : panneauOverlay === 'finances'   ? '📊 Finances'
               : panneauOverlay === 'logement'   ? '🏠 Logement'
               : panneauOverlay === 'telephone'  ? '📱 Téléphone'
               : panneauOverlay === 'ordinateur' ? '💻 Ordinateur'
               :                                  '🚗 Véhicules' }}
            </span>
            <button class="panneau-overlay__fermer" @click="fermerOverlay">✕</button>
          </div>

          <!-- Boutique -->
          <template v-if="panneauOverlay === 'boutique'">
            <ul class="boutique-liste boutique-liste--inline">
              <li v-for="item in itemsBoutique" :key="item.id" class="boutique-item" :class="{ 'boutique-item--disabled': item.disabled }">
                <div class="boutique-item__label">{{ item.label }}</div>
                <div class="boutique-item__prix">{{ item.prix }} €</div>
                <button class="boutique-item__btn" :disabled="item.disabled" @click="acheterItemBoutique(item.id)">Acheter</button>
              </li>
            </ul>
          </template>

          <!-- Finances -->
          <template v-else-if="panneauOverlay === 'finances'">
            <div class="finances-onglets">
              <button
                v-for="ong in ['revenus', 'charges', 'bilan']"
                :key="ong"
                class="finances-onglet"
                :class="{ 'finances-onglet--actif': ongletFinances === ong }"
                @click="ongletFinances = ong"
              >{{ ong.charAt(0).toUpperCase() + ong.slice(1) }}</button>
            </div>
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
            <div v-if="ongletFinances === 'charges'" class="finances-contenu">
              <p v-if="financesCharges.length === 0" class="finances-vide">Aucune charge active</p>
              <ul v-else class="finances-liste">
                <li v-for="(ch, i) in financesCharges" :key="i" class="finances-ligne">
                  <span class="finances-ligne__label">{{ ch.nom }}</span>
                  <span class="finances-ligne__valeur finances-ligne__valeur--rouge">−{{ ch.charge }} €</span>
                </li>
              </ul>
            </div>
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

          <!-- Logement -->
          <template v-else-if="panneauOverlay === 'logement'">
            <div class="logement-vue">
              <div class="logement-actuel">
                <span class="logement-actuel__label">Logement actuel</span>
                <span class="logement-actuel__nom">{{ logementActuel.nom }}</span>
                <span v-if="logementActuel.bonheur > 0" class="logement-actuel__bonus">+{{ logementActuel.bonheur }} bonheur</span>
                <span v-if="logementActuel.charge > 0" class="logement-actuel__charge">
                  {{ logementActuel.type === 'achat' ? 'Charges' : 'Loyer' }} : {{ logementActuel.charge }} € / 6 mois
                </span>
              </div>
              <h3 class="logement-section-titre">Locations</h3>
              <ul class="logement-liste">
                <li v-for="l in logementLocations" :key="l.slug" class="logement-item"
                  :class="{ 'logement-item--actuel': l.estActuel, 'logement-item--verrouille': !l.abordable && !l.estActuel }">
                  <div class="logement-item__header">
                    <span class="logement-item__nom">{{ l.nom }}</span>
                    <span class="logement-item__prix">{{ l.charge }} € / 6 mois</span>
                  </div>
                  <div class="logement-item__footer">
                    <span class="logement-item__bonheur" v-if="l.bonheur > 0">+{{ l.bonheur }} bonheur</span>
                    <span v-if="l.estActuel" class="logement-item__badge">✓ Actuel</span>
                    <button v-else class="logement-item__btn" :disabled="!l.abordable" @click="actionLouer(l.slug)">Louer</button>
                  </div>
                </li>
              </ul>
              <h3 class="logement-section-titre">Achats</h3>
              <ul class="logement-liste">
                <li v-for="l in logementAchats" :key="l.slug" class="logement-item"
                  :class="{ 'logement-item--actuel': l.estActuel, 'logement-item--verrouille': !l.abordable && !l.estActuel }">
                  <div class="logement-item__header">
                    <span class="logement-item__nom">{{ l.nom }}</span>
                    <span class="logement-item__prix">{{ l.cout.toLocaleString('fr-FR') }} €</span>
                  </div>
                  <div class="logement-item__footer">
                    <span class="logement-item__bonheur" v-if="l.bonheur > 0">+{{ l.bonheur }} bonheur</span>
                    <span class="logement-item__charges" v-if="l.charge > 0">Charges {{ l.charge }} €</span>
                    <span v-if="l.estActuel" class="logement-item__badge">✓ Actuel</span>
                    <button v-else class="logement-item__btn" :disabled="!l.abordable" @click="actionAcheter(l.slug)">Acheter</button>
                  </div>
                </li>
              </ul>
            </div>
          </template>

          <!-- Téléphone -->
          <template v-else-if="panneauOverlay === 'telephone'">
            <div class="telephone-vue">
              <div v-if="!state.possessions.telephone" class="telephone-achat">
                <div class="telephone-mock">📱</div>
                <p>Achetez un téléphone pour accéder aux réseaux sociaux.</p>
                <button class="telephone-btn-achat" :disabled="state.argent < CONFIG.BOUTIQUE.TELEPHONE.prix" @click="actionAcheterTelephone">
                  Acheter — {{ CONFIG.BOUTIQUE.TELEPHONE.prix }} €
                </button>
              </div>
              <div v-else class="telephone-screen">
                <div class="telephone-header">
                  <span>Réseaux sociaux</span>
                  <span class="telephone-abonnes">{{ abonnesAffiche }} abonnés</span>
                </div>
                <ul class="telephone-actions">
                  <li v-for="action in telephoneActions" :key="action.id" class="telephone-action"
                    :class="{
                      'telephone-action--locked':   !action.seuilOk,
                      'telephone-action--cooldown':  action.seuilOk && action.enCooldown,
                      'telephone-action--disabled':  action.seuilOk && !action.enCooldown && !action.plafondOk,
                    }">
                    <span class="telephone-action__emoji">{{ action.emoji }}</span>
                    <span class="telephone-action__label">{{ action.label }}</span>
                    <span v-if="!action.seuilOk" class="telephone-action__lock">🔒 {{ (action.seuilAbonnes / 1000).toFixed(0) }}k abonnés</span>
                    <span v-else-if="action.enCooldown" class="telephone-action__cd">{{ action.cdRestant }}s</span>
                    <span v-else-if="!action.plafondOk" class="telephone-action__cd">Max</span>
                    <button v-else class="telephone-action__btn" @click="actionTelephone(action.id)">▶</button>
                  </li>
                </ul>
              </div>
            </div>
          </template>

          <!-- Ordinateur -->
          <template v-else-if="panneauOverlay === 'ordinateur'">
            <div class="ordinateur-vue">
              <div v-if="!state.possessions.ordinateur" class="ordinateur-achat">
                <div class="ordinateur-mock">💻</div>
                <p>Accédez aux marchés financiers, dons caritatifs et outils de recherche.</p>
                <button class="ordinateur-btn-achat" :disabled="state.argent < CONFIG.BOUTIQUE.ORDINATEUR.prix" @click="actionAcheterOrdinateur">
                  Acheter — {{ CONFIG.BOUTIQUE.ORDINATEUR.prix.toLocaleString('fr-FR') }} €
                </button>
              </div>
              <div v-else class="ordinateur-screen">
                <div class="ordinateur-section-titre">
                  Tokens
                  <span class="ordinateur-tokens-solde">{{ tokensAffiche }} 🔮</span>
                </div>
                <ul class="ordinateur-packs">
                  <li v-for="pack in prixPacksTokens" :key="pack.quantite" class="ordinateur-pack"
                    :class="{ 'ordinateur-pack--indispo': state.argent < pack.prixReel }">
                    <span>{{ pack.quantite }} tokens</span>
                    <span>{{ pack.prixReel.toLocaleString('fr-FR') }} €</span>
                    <button class="ordinateur-pack__btn" :disabled="state.argent < pack.prixReel" @click="actionAcheterTokens(pack.quantite)">Acheter</button>
                  </li>
                </ul>
                <div class="ordinateur-section-titre">Commandes</div>
                <ul class="ordinateur-commandes">
                  <li v-for="(cmd, id) in CONFIG.ORDINATEUR.COMMANDES" :key="id" class="ordinateur-commande"
                    :class="{ 'ordinateur-commande--disabled': state.possessions.tokens < cmd.tokens }">
                    <span class="ordinateur-commande__emoji">{{ cmd.emoji }}</span>
                    <span class="ordinateur-commande__label">{{ cmd.label }}</span>
                    <span v-if="id === 'recherche' && boostXpActif" class="ordinateur-boost-badge">🔬 ACTIF {{ boostXpRestant }}s</span>
                    <span class="ordinateur-commande__cout">{{ cmd.tokens }} 🔮</span>
                    <button class="ordinateur-commande__btn" :disabled="state.possessions.tokens < cmd.tokens" @click="actionExecuterCommande(id)">▶</button>
                  </li>
                </ul>
              </div>
            </div>
          </template>

          <!-- Véhicules -->
          <template v-else-if="panneauOverlay === 'vehicules'">
            <div class="vehicules-vue">
              <div v-for="v in boutiqueVehicules" :key="v.id" class="vehicule-card"
                :class="{ 'vehicule-card--actuel': v.estActuel, 'vehicule-card--depasse': v.estInferieur }">
                <span class="vehicule-card__emoji">{{ v.emoji }}</span>
                <div class="vehicule-card__info">
                  <span class="vehicule-card__label">{{ v.label }}</span>
                  <span class="vehicule-card__stats">
                    {{ v.prix.toLocaleString('fr-FR') }} €
                    <template v-if="v.chargeMensuelle > 0"> — {{ v.chargeMensuelle }} €/mois</template>
                    <template v-if="v.karma < 0"> — Karma {{ v.karma }}</template>
                    <template v-if="v.reputation > 0"> — +{{ v.reputation }} rép.</template>
                    <template v-if="v.bonusClic > 0"> — +{{ v.bonusClic }}€/clic</template>
                  </span>
                  <span v-if="v.estActuel" class="vehicule-card__badge">● ACTUEL</span>
                </div>
                <span v-if="v.estInferieur" style="font-size:0.7em; color:#666;">Déjà dépassé</span>
                <button v-else-if="!v.estActuel" class="vehicule-card__btn" :disabled="!v.abordable" @click="actionAcheterVehicule(v.id)">Acheter</button>
              </div>
            </div>
          </template>

        </div>
        <!-- /panneau-overlay -->

        <!-- Notif immo -->
        <div v-if="derniereNotifImmo" class="immo-notif">
          {{ derniereNotifImmo.emoji }} {{ derniereNotifImmo.label }}
        </div>

      </main>

      <!-- ══════════════════════════════════════════════════════════ -->
      <!-- ÉCRAN DE FIN DE VIE (overlay global)                     -->
      <!-- ══════════════════════════════════════════════════════════ -->
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
