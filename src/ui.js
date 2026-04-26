// ui.js — composants Vue, handlers d'événements, update UI
// Règle : ne contient que du Vue réactif — zéro querySelector/getElementById
import { state }            from './state.js'
import { calculerRevenuClic, calculerXpClic, calculerNiveau, getMultiplicateurNiveau, startEngine, stopEngine, isEngineRunning, acheterUpgrade, acheterItem, louerLogement, acheterLogement, getTauxPassifTotal, initialiserNouvelleGeneration, acheterTelephone, executerActionTelephone, calculerPrixTokens, acheterOrdinateur, acheterTokens, executerCommande, changerSecteur, demarrerFormation, getBonusFormation, acheterVehicule, vehiculePermetSecteur, declencherEvenementImmo, lancerChantier, calculerGainInfluence, executerCommandeIllegale, COMMANDES_ILLEGALES, appliquerEvenement, accepterDeal, getPalierReputation, getBoostLignee, acheterInvestissementImmobilier, revendreInvestissementImmobilier } from './engine.js'
import { CONFIG }           from './config.js'

// ─── Composant racine ─────────────────────────────────────────────────────────

export const AppRoot = {
  setup() {
    const { ref, computed, watch } = Vue

    // ── Écran de fin de génération ────────────────────────────────────────────
    const recapData       = ref(null)
    const boostSelectionne = ref(null)

    window.addEventListener('legacy:mort', () => {
      recapData.value        = window._recapGeneration ?? null
      boostSelectionne.value = null
      panneauOverlay.value   = 'mort'
    })

    const recapGeneration = computed(() => {
      if (!recapData.value) return null
      const boostsDisponibles = Object.values(CONFIG.MAP.ZONES)
        .filter(z => z.secteur && z.disponible !== false)
        .map(z => {
          const pts = Math.min(state.boostCompetences[z.secteur] ?? 0, CONFIG.BOOST_COMPETENCE_MAX_POINTS)
          return {
            secteur:      z.secteur,
            label:        z.label,
            emoji:        z.emoji,
            bonusAffiche: pts > 0 ? `+${pts * 10}% XP` : '',
          }
        })
      return {
        ...recapData.value,
        boostsDisponibles,
        ligneeComplete: state.lignee,
      }
    })

    const boostLigneeSecteurActif = computed(() => getBoostLignee(state.secteurActif))

    function actionNouvelleGeneration() {
      initialiserNouvelleGeneration(boostSelectionne.value)
      boostSelectionne.value = null
      panneauOverlay.value   = null
      startEngine()
    }

    function mortSimulee() {
      const secteurPrincipal = Object.entries(state.xpSecteurs)
        .reduce((max, [s, xp]) => xp > max[1] ? [s, xp] : max, ['commerce', 0])[0]
      const heritage = {
        nom:               state.nomPersonnage,
        age_mort:          state.age,
        argent_transmis:   Math.floor(state.argent * 0.5),
        karma_final:       state.karma,
        couche_illegale_max: state.coucheIllegalMax,
        secteurPrincipal,
        generationNumero:  state.generation,
      }
      state.lignee.push(heritage)
      window._recapGeneration = heritage
      stopEngine()
      window.dispatchEvent(new CustomEvent('legacy:mort', { detail: { heritage } }))
    }

    // ── Notif événement immobilier ────────────────────────────────────────────
    const derniereNotifImmo = ref(null)
    window.addEventListener('legacy:immo-event', (e) => {
      derniereNotifImmo.value = e.detail
      setTimeout(() => { derniereNotifImmo.value = null }, 4000)
    })

    // ── Événements aléatoires — overlay majeur ────────────────────
    const evenementOverlay = ref(null)   // event object | null

    window.addEventListener('legacy:evenement', (e) => {
      const evt = e.detail.event
      if (evt.gravite === 'majeur') {
        evenementOverlay.value = evt
      } else {
        const emoji  = evt.gravite === 'positif' ? '✨' : '⚠'
        const classe = evt.gravite === 'positif' ? 'boutique-flottant--positif' : 'boutique-flottant--negatif'
        ajouterFlottant(`${emoji} ${evt.label} : ${evt.message}`, 2500, classe)
      }
    })

    const evenementOverlayInfo = computed(() => {
      const evt = evenementOverlay.value
      if (!evt) return null
      const effetsLisibles = Object.entries(evt.effets).map(([cle, val]) => {
        const sign = val > 0 ? '+' : ''
        const textes = {
          argent:          `${sign}${val.toLocaleString('fr-FR')} € argent`,
          argentPourcent:  `${val > 0 ? '+' : ''}${Math.round(val * 100)}% argent`,
          abonnes:         `${sign}${val} abonnés`,
          abonnesPourcent: `${val > 0 ? '+' : ''}${Math.round(val * 100)}% abonnés`,
          karma:           `${sign}${val} karma`,
          bonheur:         `${sign}${val} bonheur`,
          sante:           `${sign}${val} santé`,
          hygiene:         `${sign}${val} hygiène`,
          reputation:      `${sign}${val} réputation`,
        }
        return { texte: textes[cle] ?? `${cle}: ${val}`, positif: val > 0 }
      })
      return { ...evt, effetsLisibles }
    })

    function fermerEvenementOverlay() {
      evenementOverlay.value = null
    }

    // ── Floating texts ────────────────────────────────────────────────────────
    const flottants = ref([])
    let _nextFlottantId = 0

    // ── Floating texts boutique ───────────────────────────────────────────────
    const boutiqueFlottants = ref([])
    let _nextBoutiqueFlottantId = 0

    function ajouterFlottant(texte, duree = 800, classe = '') {
      const fid = _nextBoutiqueFlottantId++
      boutiqueFlottants.value.push({ id: fid, texte, classe })
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
    const messageBlocageCarte = ref('')

    // ── Overlay latéral (finances / logement / telephone / ordinateur / vehicules / boutique)
    const panneauOverlay = ref(null) // null | 'finances' | 'logement' | 'telephone' | 'ordinateur' | 'vehicules' | 'boutique'

    function ouvrirOverlay(nom) {
      panneauOverlay.value = panneauOverlay.value === nom ? null : nom
    }
    function fermerOverlay() { panneauOverlay.value = null }

    // ── Navigation carte / quartier / bâtiment ───────────────────────────────
    const navEcran        = ref('map')   // 'map' | 'quartier' | 'batiment'
    const quartierEnCours = ref(null)    // slug du quartier en cours de visite
    const batimentEnCours = ref(null)    // slug du bâtiment en cours de visite

    function retourCarte() {
      navEcran.value        = 'map'
      quartierEnCours.value = null
      batimentEnCours.value = null
      messageBlocageCarte.value = ''
    }

    function retourQuartier() {
      navEcran.value        = 'quartier'
      batimentEnCours.value = null
    }

    function ouvrirBatiment(slug) {
      batimentEnCours.value = slug
      navEcran.value        = 'batiment'
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

    const breadcrumb = computed(() => {
      if (navEcran.value === 'map') return '🗺 Ville'
      const qLabel = CONFIG.MAP.ZONES[quartierEnCours.value]?.label ?? quartierEnCours.value
      if (navEcran.value === 'quartier') return `🗺 Ville > ${qLabel}`
      const bLabel = CONFIG.BATIMENTS?.[batimentEnCours.value]?.label ?? batimentEnCours.value
      return `🗺 Ville > ${qLabel} > ${bLabel}`
    })

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

    // ── Helpers ───────────────────────────────────────────────────────────────

    function formatMmSs(ms) {
      const totalS = Math.ceil(ms / 1000)
      const m = Math.floor(totalS / 60)
      const s = totalS % 60
      return `${m}:${s.toString().padStart(2, '0')}`
    }

    // ── Upgrades — helper partagé map + bâtiment ──────────────────────────────

    function getUpgradesPourSecteur(secteur) {
      const metier = CONFIG.METIERS[secteur]
      if (!metier?.upgrades) return []
      const niveauAtteint = calculerNiveau(secteur)
      const estBtp        = secteur === 'btp'
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
        const niveauOk = !upg.niveauRequis || niveauAtteint >= upg.niveauRequis
        const enCours  = estBtp && state.chantierActif?.id === upg.id
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
    }

    const renderUpgradesSecteur  = computed(() => getUpgradesPourSecteur(state.secteurActif))
    const renderUpgradesBatiment = computed(() => {
      const secteur = CONFIG.BATIMENTS?.[batimentEnCours.value]?.secteur
      return secteur ? getUpgradesPourSecteur(secteur) : []
    })

    const batimentSecteurInfo = computed(() => {
      const secteur = CONFIG.BATIMENTS?.[batimentEnCours.value]?.secteur
      if (!secteur) return null
      const niveau    = calculerNiveau(secteur)
      const cle       = 'PALIERS_' + secteur.toUpperCase()
      const nomPalier = (CONFIG.NIVEAUX[cle] ?? {})[niveau] ?? secteur
      const xp        = state.xpSecteurs[secteur] ?? 0
      const seuils    = CONFIG.NIVEAUX.SEUILS
      let xpInfo
      if (niveau >= seuils.length) {
        xpInfo = { current: Math.round(xp), max: Math.round(xp), pct: 100 }
      } else {
        const seuilActuel  = seuils[niveau - 1]
        const seuilSuivant = seuils[niveau]
        const current      = Math.round(xp - seuilActuel)
        const max          = seuilSuivant - seuilActuel
        xpInfo = { current, max, pct: Math.min(100, (current / max) * 100) }
      }
      return { secteur, niveau, nomPalier, xpInfo }
    })

    const logementsBatiment = computed(() => {
      const gamme = CONFIG.BATIMENTS?.[batimentEnCours.value]?.gamme
      const gammeFilter = {
        bas:   ([, l]) => l.type === 'location' && l.charge < 500,
        moyen: ([, l]) => (l.type === 'location' && l.charge >= 500) || (l.type === 'achat' && l.cout < 150000),
        haut:  ([, l]) => l.type === 'achat' && l.cout >= 150000,
      }
      const fn = gamme ? (gammeFilter[gamme] ?? (() => true)) : (() => true)
      return Object.entries(CONFIG.LOGEMENTS)
        .filter(fn)
        .map(([slug, l]) => ({
          slug, ...l,
          estActuel: state.possessions.logement === slug,
          abordable: l.type === 'location' ? state.argent >= l.charge : state.argent >= l.cout,
        }))
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



    const boutiqueVehicules = computed(() =>
      Object.entries(CONFIG.VEHICULES).map(([id, cfg]) => ({
        id, ...cfg,
        estActuel:    state.possessions.vehicule === id,
        abordable:    state.argent >= cfg.prix,
        estInferieur: CONFIG.ORDRE_VEHICULES.indexOf(id) < CONFIG.ORDRE_VEHICULES.indexOf(state.possessions.vehicule ?? ''),
      }))
    )

    const vehiculesBatiment = computed(() => {
      const gamme = CONFIG.BATIMENTS?.[batimentEnCours.value]?.gamme
      const all   = boutiqueVehicules.value
      if (gamme === 'bas')  return all.filter(v => ['velo', 'scooter'].includes(v.id))
      if (gamme === 'haut') return all.filter(v => ['voiture', 'berline', 'supercar'].includes(v.id))
      return all
    })

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

    // ── Commandes illégales ───────────────────────────────────────────────────

    const commandesIllegalesInfo = computed(() =>
      Object.entries(COMMANDES_ILLEGALES).map(([id, cmd]) => {
        const cooldownKey  = 'illegal_' + id
        const expiry       = state.telephoneCooldowns[cooldownKey] ?? 0
        const enCooldown   = now.value < expiry
        const cdRestant    = enCooldown ? Math.ceil((expiry - now.value) / 1000) : 0
        // Couche accessible : recalcul simplifié côté UI (même logique que engine)
        const anyNiv3      = Object.keys(state.xpSecteurs).some(s => calculerNiveau(s) >= 3)
        const coucheMax    = (state.karma < 35 && state.coucheIllegalMax >= 2) ? 3
                           : (state.karma < 65 && anyNiv3)                     ? 2 : 1
        const accessible   = cmd.couche <= coucheMax
        let raison = null
        if (!accessible) raison = `Couche ${cmd.couche} — karma ou niveau insuffisant`
        else if (enCooldown) raison = `Cooldown ${cdRestant}s`
        // T32 : malus rendement si réputation trop élevée
        const malusReputation = state.jauges.reputation >= CONFIG.REPUTATION_ILLEGAL.MALUS_GAIN_ILLEGAL_REPUTATION_MIN
        return { id, ...cmd, accessible, enCooldown, cdRestant, coucheMax, raison, malusReputation }
      })
    )

    function actionCommandeIllegale(id) {
      const result = executerCommandeIllegale(id)
      if (!result.ok) return
      const cmd = COMMANDES_ILLEGALES[id]
      const classe = result.malusReputation ? 'boutique-flottant--negatif' : ''
      ajouterFlottant(`${cmd.emoji} +${result.gain.toLocaleString('fr-FR')} €`, 1200, classe)
    }

    // ── Carte — computeds ─────────────────────────────────────────────────────

    const carteZones = computed(() =>
      Object.entries(CONFIG.MAP.ZONES).map(([id, zone]) => {
        const estActuelle    = zone.secteur !== null && zone.secteur === state.secteurActif
        const vehiculeBloque = !!zone.vehiculeRequis && (() => {
          const ordre     = CONFIG.ORDRE_VEHICULES
          const idxActuel = ordre.indexOf(state.possessions.vehicule ?? '')
          const idxRequis = ordre.indexOf(zone.vehiculeRequis)
          return idxActuel < idxRequis
        })()
        const disabled = !zone.disponible || vehiculeBloque
        return { id, ...zone, estActuelle, vehiculeBloque, disabled }
      })
    )

    // ── Campus — formations (T35) ─────────────────────────────────────────────

    // Formations groupées par secteur avec niveauFormation courant
    const formationsDisponibles = computed(() => {
      const SECTEURS_EMOJIS = { commerce: '📦', finance: '💹', tech: '💻', immobilier: '🏢', btp: '🏗', influence: '🎙' }
      return Object.keys(state.niveauFormation).map(secteur => {
        const niveau = state.niveauFormation[secteur] ?? 0
        const bonus  = Math.round(niveau * CONFIG.FORMATIONS_BONUS_BASE * 100)
        const formations = CONFIG.FORMATIONS
          .filter(f => f.secteur === secteur)
          .map(f => ({
            ...f,
            enCours:      state.formationActive?.id === f.id,
            disabled:     state.argent < f.cout || !!state.formationActive,
            dureeAffiche: formatMmSs(f.duree * CONFIG.TICK_MS),
          }))
        return { secteur, niveau, bonus, formations, emoji: SECTEURS_EMOJIS[secteur] ?? '' }
      })
    })

    const formationEnCours = computed(() => {
      const f = state.formationActive
      if (!f) return null
      const duree = Math.max(0, f.dureeRestante)
      return {
        ...f,
        pourcent:     Math.min(100, Math.round((1 - duree / f.dureeInitiale) * 100)),
        tempsAffiche: formatMmSs(duree * CONFIG.TICK_MS),
      }
    })

    const bonusFormationSecteurActif = computed(() => getBonusFormation(state.secteurActif))

    function actionDemarrerFormation(id) {
      const result = demarrerFormation(id)
      if (!result.ok) return
      ajouterFlottant('📚 Formation démarrée', 1200)
    }

    window.addEventListener('legacy:formation-terminee', (e) => {
      const pct = Math.round(e.detail.gainNiveaux * CONFIG.FORMATIONS_BONUS_BASE * 100)
      ajouterFlottant(`🎓 +${e.detail.gainNiveaux} niveau ${e.detail.secteur} (+${pct}% XP) !`, 2500, 'boutique-flottant--positif')
    })

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

    // ── Marché noir ───────────────────────────────────────────────────────────

    const marcheNoirDisponible = computed(() =>
      state.coucheIllegalMax >= CONFIG.MARCHE_NOIR.DEBLOCKAGE_COUCHE
    )

    function _formatMMSS(s) {
      const m = Math.floor(s / 60)
      return `${m}:${(s % 60).toString().padStart(2, '0')}`
    }

    const dealsEnrichis = computed(() => {
      if (!marcheNoirDisponible.value) return []
      const nowS = now.value / 1000
      return state.marcheNoir.dealsActifs.map(deal => {
        const tempsRestantS = Math.max(0, Math.floor(deal.expiryS - nowS))
        const expire        = tempsRestantS <= 0

        let abordable = true
        const cout = deal.cout
        if (cout.argent !== undefined && state.argent < cout.argent) abordable = false
        if (cout.argentPourcent !== undefined && state.argent <= 0)  abordable = false

        const coutsTexte = []
        if (cout.argent         !== undefined && cout.argent > 0)
          coutsTexte.push(`−${cout.argent.toLocaleString('fr-FR')} €`)
        if (cout.argentPourcent !== undefined)
          coutsTexte.push(`−${Math.round(cout.argentPourcent * 100)}% argent`)
        if (cout.karma          !== undefined)
          coutsTexte.push(`${cout.karma} karma`)

        const gainsTexte = []
        const gain = deal.gain
        if (gain.argent          !== undefined && gain.argent > 0)
          gainsTexte.push(`+${gain.argent.toLocaleString('fr-FR')} €`)
        if (gain.argentPourcent  !== undefined)
          gainsTexte.push(`+${Math.round(gain.argentPourcent * 100)}% argent`)
        if (gain.argentAleatoire !== undefined)
          gainsTexte.push(`+${gain.argentAleatoire[0].toLocaleString('fr-FR')}–${gain.argentAleatoire[1].toLocaleString('fr-FR')} €`)
        if (gain.karma           !== undefined)
          gainsTexte.push(`${gain.karma > 0 ? '+' : ''}${gain.karma} karma`)
        if (gain.abonnes         !== undefined && gain.abonnes > 0)
          gainsTexte.push(`+${gain.abonnes.toLocaleString('fr-FR')} abonnés`)
        if (gain.reputation      !== undefined)
          gainsTexte.push(`${gain.reputation > 0 ? '+' : ''}${gain.reputation} rép.`)
        if (gain.formationOfferte)    gainsTexte.push('Formation offerte')
        if (gain.vehiculeOffert)      gainsTexte.push('Véhicule +1')
        if (gain.immuniteEvenementsS) gainsTexte.push(`Immunité ${gain.immuniteEvenementsS / 60} min`)

        return {
          ...deal, tempsRestantS, tempsAffiche: _formatMMSS(tempsRestantS),
          expire, abordable,
          coutAffiche: coutsTexte.join(', ') || '—',
          gainAffiche: gainsTexte.join(', ')  || '—',
        }
      })
    })

    const immuniteRestanteS = computed(() =>
      Math.max(0, Math.floor(state.marcheNoir._immuniteExpiry - now.value / 1000))
    )

    const prochainRefreshS = computed(() => {
      if (state.marcheNoir._dernierRefreshS === 0) return 0
      return Math.max(0, Math.floor(
        state.marcheNoir._dernierRefreshS + CONFIG.MARCHE_NOIR.COOLDOWN_REFRESH_S - now.value / 1000
      ))
    })

    function actionAccepterDeal(idInstance) {
      const result = accepterDeal(idInstance)
      if (!result.ok) {
        if (result.raison === 'expire') ajouterFlottant('⌛ Deal expiré', 1500, 'boutique-flottant--negatif')
        return
      }
      const gain = result.deal.gain
      let texte = '✓ Deal conclu'
      if (gain.argentAleatoire)             texte = '💰 Jackpot !'
      else if (gain.argentPourcent > 0)     texte = `+${Math.round(gain.argentPourcent * 100)}% argent`
      else if (gain.formationOfferte)       texte = '🎓 Formation débloquée'
      else if (gain.vehiculeOffert)         texte = '🚗 Véhicule obtenu'
      else if (gain.immuniteEvenementsS)    texte = '🛡 Immunité active'
      ajouterFlottant(texte, 2000, 'boutique-flottant--positif')
    }

    // ── Immobilier avancé — T33 ───────────────────────────────────────────────

    const biensImmobiliersDisponibles = computed(() =>
      CONFIG.IMMOBILIER_AVANCE.BIENS.map(bien => ({
        ...bien,
        abordable: state.argent >= bien.prix,
      }))
    )

    const investissementsImmobiliersInfo = computed(() =>
      state.investissementsImmobiliers.map(inv => {
        const delta    = Math.round(inv.valeurCourante - inv.prixAchat)
        const deltaPct = Math.round((delta / inv.prixAchat) * 100)
        return { ...inv, delta, deltaPct }
      })
    )

    function actionAcheterInvestissement(idBien) {
      const result = acheterInvestissementImmobilier(idBien)
      if (!result.ok) { ajouterFlottant('❌ Fonds insuffisants', 1200, 'boutique-flottant--negatif'); return }
      const bien = CONFIG.IMMOBILIER_AVANCE.BIENS.find(b => b.id === idBien)
      ajouterFlottant(`🏢 ${bien?.label ?? ''} acquis !`, 1500, 'boutique-flottant--positif')
    }

    function actionRevendreInvestissement(idInstance) {
      const result = revendreInvestissementImmobilier(idInstance)
      if (!result.ok) return
      const classe = result.plusValue >= 0 ? 'boutique-flottant--positif' : 'boutique-flottant--negatif'
      const sign   = result.plusValue >= 0 ? '+' : ''
      ajouterFlottant(`💰 Vendu · ${sign}${result.plusValue.toLocaleString('fr-FR')} €`, 2000, classe)
    }

    // T32 — scandale après commande illégale exposée
    window.addEventListener('legacy:scandale-illegal', () => {
      ajouterFlottant('📰 Scandale ! Réputation en chute.', 2000, 'boutique-flottant--negatif')
    })

    // ── Réputation — palier et badge ─────────────────────────────────────────
    const palierReputation = computed(() => getPalierReputation())

    // Notification flottante si le palier change
    watch(() => palierReputation.value.label, (nouveau, ancien) => {
      if (!ancien || nouveau === ancien) return
      const palierIdx = CONFIG.REPUTATION.findIndex(p => p.label === nouveau)
      const ancienIdx = CONFIG.REPUTATION.findIndex(p => p.label === ancien)
      const classe = palierIdx < ancienIdx
        ? 'boutique-flottant--positif'   // palier amélioré (index plus petit = min plus haut)
        : 'boutique-flottant--negatif'
      ajouterFlottant(`⭐ Réputation : ${nouveau}`, 1500, classe)
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
      renderUpgradesSecteur, renderUpgradesBatiment, batimentSecteurInfo,
      acheterUpgrade, acheterItemBoutique, itemsBoutique,
      recapGeneration, boostSelectionne, actionNouvelleGeneration, mortSimulee, competencesAuDeces,
      ongletFinances, financesRevenus, financesCharges, totalChargesAffiche, getTauxPassifTotal,
      logementActuel, logementLocations, logementAchats, logementsBatiment, actionLouer, actionAcheter,
      telephoneActions, abonnesAffiche, actionAcheterTelephone, actionTelephone,
      prixPacksTokens, tokensAffiche, boostXpActif, boostXpRestant,
      actionAcheterOrdinateur, actionAcheterTokens, actionExecuterCommande,
      commandesIllegalesInfo, actionCommandeIllegale, COMMANDES_ILLEGALES,
      messageBlocageCarte,
      panneauOverlay, ouvrirOverlay, fermerOverlay,
      navEcran, quartierEnCours, batimentEnCours, breadcrumb,
      retourCarte, retourQuartier, ouvrirBatiment, entrerDansSecteur, ouvrirQuartier,
      carteZones, spritePosition, spriteClasse,
      formationsDisponibles, formationEnCours, bonusFormationSecteurActif, actionDemarrerFormation,
      boutiqueVehicules, vehiculesBatiment, actionAcheterVehicule,
      evenementOverlay, evenementOverlayInfo, fermerEvenementOverlay,
      marcheNoirDisponible, dealsEnrichis, immuniteRestanteS, prochainRefreshS, actionAccepterDeal,
      palierReputation,
      boostLigneeSecteurActif,
      biensImmobiliersDisponibles, investissementsImmobiliersInfo,
      actionAcheterInvestissement, actionRevendreInvestissement,
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

        <!-- Badge réputation -->
        <div class="reputation-badge" :style="{ color: palierReputation.couleur, borderColor: palierReputation.couleur }">
          ⭐ {{ palierReputation.label }}
        </div>

        <!-- Karma -->
        <div class="sidebar-karma">Karma : {{ state.karma }} ({{ state.palierKarma }})</div>

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
          <button
            class="sidebar-nav__btn"
            :class="{ 'sidebar-nav__btn--actif': panneauOverlay === 'formations' }"
            @click="ouvrirOverlay('formations')"
          >🎓 Formations</button>
          <button
            v-if="marcheNoirDisponible"
            class="sidebar-nav__btn btn-contact"
            :class="{ 'sidebar-nav__btn--actif': panneauOverlay === 'marche_noir' }"
            @click="ouvrirOverlay('marche_noir')"
          >🕵️ Contact</button>
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
                'carte-zone--active':          zone.estActuelle,
                'carte-zone--locked':          !zone.disponible,
                'carte-zone--vehicule-bloque': zone.vehiculeBloque,
              }"
              :style="{ left: zone.x + '%', top: zone.y + '%' }"
              @click="!zone.disabled && ouvrirQuartier(zone.id)"
            >
              <span class="carte-zone__emoji">{{ zone.emoji }}</span>
              <span class="carte-zone__label">{{ zone.label }}</span>
              <span v-if="!zone.disponible" class="carte-zone__lock">🔒 Bientôt</span>
              <span v-else-if="zone.estActuelle" class="carte-zone__badge">● ICI</span>
              <span v-else-if="zone.vehiculeBloque" class="carte-zone__vehicule-requis">{{ CONFIG.VEHICULES[zone.vehiculeRequis]?.emoji }}</span>
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
            <span v-for="f in boutiqueFlottants" :key="f.id" class="boutique-flottant" :class="f.classe">{{ f.texte }}</span>
          </div>
        </div>

        <!-- ── Vue Quartier ──────────────────────────────────────── -->
        <div v-else-if="navEcran === 'quartier'" class="quartier-vue">
          <div class="quartier-breadcrumb">
            <button class="quartier-retour" @click="retourCarte">← Ville</button>
            <span>{{ CONFIG.MAP.ZONES[quartierEnCours]?.label ?? quartierEnCours }}</span>
          </div>
          <div class="quartier-facade">
            <div
              v-for="slugBat in (CONFIG.QUARTIERS?.[quartierEnCours]?.batiments ?? [])"
              :key="slugBat"
              class="batiment-card"
              @click="ouvrirBatiment(slugBat)"
            >
              <div class="batiment-card__toit"></div>
              <div class="batiment-card__corps">
                <span class="batiment-card__emoji">{{ CONFIG.BATIMENTS?.[slugBat]?.emoji }}</span>
                <span class="batiment-card__label">{{ CONFIG.BATIMENTS?.[slugBat]?.label }}</span>
              </div>
            </div>
          </div>
          <div v-if="messageBlocageCarte" class="carte-message-blocage">{{ messageBlocageCarte }}</div>
        </div>

        <!-- ── Vue Bâtiment ───────────────────────────────────────── -->
        <div v-else-if="navEcran === 'batiment'" class="quartier-vue">
          <div class="quartier-breadcrumb">
            <button class="quartier-retour" @click="retourCarte">← Ville</button>
            <span style="color:#555">/</span>
            <button class="quartier-retour" @click="retourQuartier">{{ CONFIG.MAP.ZONES[quartierEnCours]?.label ?? quartierEnCours }}</button>
            <span style="color:#555">/</span>
            <span>{{ CONFIG.BATIMENTS?.[batimentEnCours]?.label ?? batimentEnCours }}</span>
          </div>

          <!-- Upgrades -->
          <template v-if="CONFIG.BATIMENTS?.[batimentEnCours]?.contenu === 'upgrades'">
            <div class="panneau-upgrades" style="flex:1;overflow-y:auto;">
              <div v-if="batimentSecteurInfo" class="niveau-commerce">
                <div class="niveau-commerce__header">
                  <span class="niveau-commerce__palier">{{ batimentSecteurInfo.nomPalier }}</span>
                  <span class="niveau-commerce__niv">Niv.{{ batimentSecteurInfo.niveau }}</span>
                </div>
                <div class="xp-piste"><div class="xp-barre" :style="{ width: batimentSecteurInfo.xpInfo.pct + '%' }"></div></div>
                <div class="xp-label">{{ batimentSecteurInfo.xpInfo.current }} / {{ batimentSecteurInfo.xpInfo.max }} XP</div>
              </div>
              <p v-if="renderUpgradesBatiment.length === 0" class="finances-vide">Aucune amélioration disponible.</p>
              <ul v-else class="upgrades-list">
                <li v-for="upg in renderUpgradesBatiment" :key="upg.id" :class="['upgrade-item', 'upgrade-item--' + upg.etat]">
                  <div class="upgrade-header">
                    <span class="upgrade-nom">{{ upg.nom ?? upg.label }}</span>
                    <span v-if="!upg.estBtp" class="upgrade-cout" :class="{ 'upgrade-cout--rouge': upg.etat === 'trop-cher' }">{{ upg.cout }} €</span>
                  </div>
                  <div class="upgrade-footer">
                    <span class="upgrade-effet">{{ upg.effetTexte }}</span>
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
            <button class="btn-entrer-secteur" @click="entrerDansSecteur(CONFIG.BATIMENTS?.[batimentEnCours]?.secteur)">▶ Travailler ici</button>

            <!-- Investissements immobiliers — Agence Immo uniquement -->
            <template v-if="batimentEnCours === 'agence_immo'">
              <div class="invest-section">
                <div class="invest-section__titre">📈 Investissements — Biens disponibles</div>
                <div v-for="bien in biensImmobiliersDisponibles" :key="bien.id" class="invest-card invest-card--achat">
                  <div class="invest-card__header">
                    <span class="invest-card__label">{{ bien.label }}</span>
                    <span class="invest-card__prix">{{ bien.prix.toLocaleString('fr-FR') }} €</span>
                  </div>
                  <div class="invest-card__meta">+{{ bien.revenuPassif }} €/s passif</div>
                  <button class="invest-card__btn" :disabled="!bien.abordable" @click="actionAcheterInvestissement(bien.id)">
                    Investir
                  </button>
                </div>

                <template v-if="investissementsImmobiliersInfo.length > 0">
                  <div class="invest-section__titre" style="margin-top:10px;">📂 Portefeuille détenu</div>
                  <div v-for="inv in investissementsImmobiliersInfo" :key="inv.idInstance" class="invest-card">
                    <div class="invest-card__header">
                      <span class="invest-card__label">{{ inv.label }}</span>
                      <span class="invest-card__value">{{ Math.round(inv.valeurCourante).toLocaleString('fr-FR') }} €</span>
                    </div>
                    <div class="invest-card__meta">+{{ inv.revenuPassif }} €/s · achat {{ inv.prixAchat.toLocaleString('fr-FR') }} €</div>
                    <div class="invest-card__delta" :class="inv.delta >= 0 ? 'invest-card__delta--positif' : 'invest-card__delta--negatif'">
                      {{ inv.delta >= 0 ? '+' : '' }}{{ inv.delta.toLocaleString('fr-FR') }} €
                      ({{ inv.deltaPct >= 0 ? '+' : '' }}{{ inv.deltaPct }}%)
                    </div>
                    <button class="invest-card__btn" @click="actionRevendreInvestissement(inv.idInstance)">
                      Revendre
                    </button>
                  </div>
                </template>
              </div>
            </template>
          </template>

          <!-- Boutique -->
          <template v-else-if="CONFIG.BATIMENTS?.[batimentEnCours]?.contenu === 'boutique'">
            <ul class="boutique-liste boutique-liste--inline">
              <li v-for="item in itemsBoutique" :key="item.id" class="boutique-item" :class="{ 'boutique-item--disabled': item.disabled }">
                <div class="boutique-item__label">{{ item.label }}</div>
                <div class="boutique-item__prix">{{ item.prix }} €</div>
                <button class="boutique-item__btn" :disabled="item.disabled" @click="acheterItemBoutique(item.id)">Acheter</button>
              </li>
            </ul>
          </template>

          <!-- Logements -->
          <template v-else-if="CONFIG.BATIMENTS?.[batimentEnCours]?.contenu === 'logements'">
            <ul class="logement-liste">
              <li v-for="l in logementsBatiment" :key="l.slug" class="logement-item"
                :class="{ 'logement-item--actuel': l.estActuel, 'logement-item--verrouille': !l.abordable && !l.estActuel }">
                <div class="logement-item__header">
                  <span class="logement-item__nom">{{ l.nom }}</span>
                  <span class="logement-item__prix">{{ l.type === 'achat' ? l.cout.toLocaleString('fr-FR') + ' €' : l.charge + ' € / 6 mois' }}</span>
                </div>
                <div class="logement-item__footer">
                  <span v-if="l.bonheur > 0" class="logement-item__bonheur">+{{ l.bonheur }} bonheur</span>
                  <span v-if="l.estActuel" class="logement-item__badge">✓ Actuel</span>
                  <button v-else-if="l.type === 'location'" class="logement-item__btn" :disabled="!l.abordable" @click="actionLouer(l.slug)">Louer</button>
                  <button v-else class="logement-item__btn" :disabled="!l.abordable" @click="actionAcheter(l.slug)">Acheter</button>
                </div>
              </li>
            </ul>
          </template>

          <!-- Véhicules -->
          <template v-else-if="CONFIG.BATIMENTS?.[batimentEnCours]?.contenu === 'vehicules'">
            <div class="vehicules-vue">
              <div v-for="v in vehiculesBatiment" :key="v.id" class="vehicule-card"
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

          <!-- Formations (ecole) -->
          <template v-else-if="CONFIG.BATIMENTS?.[batimentEnCours]?.contenu === 'formations'">
            <div class="formations-vue">
              <div v-if="formationEnCours" class="formation-active-card">
                <div class="formation-active-header">
                  📚 {{ formationEnCours.label }}
                  <span class="formation-timer">{{ formationEnCours.tempsAffiche }}</span>
                </div>
                <div class="formation-barre">
                  <div class="formation-barre-fill" :style="{ width: formationEnCours.pourcent + '%' }"></div>
                </div>
                <span style="font-size:0.75em; color:#60a5fa;">+{{ formationEnCours.gainNiveaux }} niveau{{ formationEnCours.gainNiveaux > 1 ? 'x' : '' }} {{ formationEnCours.secteur }}</span>
              </div>
              <p style="color:#888; font-size:0.85em; margin:0 0 10px;">Formations refaisables — chaque completion améliore vos gains XP.</p>
              <div v-for="groupe in formationsDisponibles" :key="groupe.secteur" class="formation-groupe">
                <div class="formation-groupe__header">
                  <span>{{ groupe.emoji }} {{ groupe.secteur }}</span>
                  <span v-if="groupe.niveau > 0" class="formation-groupe__niveau">Niv. {{ groupe.niveau }} · +{{ groupe.bonus }}% XP</span>
                </div>
                <div class="formation-cards-row">
                  <div v-for="f in groupe.formations" :key="f.id" class="formation-mini-card"
                    :class="{ 'formation-mini-card--en-cours': f.enCours, 'formation-mini-card--disabled': f.disabled && !f.enCours }">
                    <div class="formation-mini-card__label">{{ f.label.split('—')[1]?.trim() ?? f.label }}</div>
                    <div class="formation-mini-card__meta">{{ f.cout.toLocaleString('fr-FR') }} € · {{ f.dureeAffiche }}</div>
                    <div class="formation-mini-card__gain">+{{ f.gainNiveaux }} niv.</div>
                    <span v-if="f.enCours" class="formation-en-cours">En cours</span>
                    <button v-else class="boutique-item__btn" :disabled="f.disabled" @click="actionDemarrerFormation(f.id)">Démarrer</button>
                  </div>
                </div>
              </div>
            </div>
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

        <!-- ── Bouton Travailler ──────────────────────────────────── -->
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

        <!-- ── Bande finances ─────────────────────────────────────── -->
        <div class="bande-finances">
          <span class="bande-finances__solde">💰 {{ state.argent.toFixed(2) }} €</span>
          <span class="bande-finances__sep">|</span>
          <span
            class="bande-finances__passifs"
            :class="state.cashflowNet >= 0 ? 'cashflow-positif' : 'cashflow-negatif'"
          >
            {{ state.cashflowNet >= 0 ? '+' : '' }}{{ state.cashflowNet.toFixed(2) }} €/s
          </span>
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
            <span v-if="boostLigneeSecteurActif > 1" class="boost-lignee-badge">
              ⚡ Lignée +{{ Math.round((boostLigneeSecteurActif - 1) * 100) }}% XP
            </span>
            <span v-if="bonusFormationSecteurActif > 1" class="bonus-formation-badge">
              📚 Formation +{{ Math.round((bonusFormationSecteurActif - 1) * 100) }}% XP
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

        <!-- ── Overlay panneau latéral ────────────────────────────── -->
        <div v-if="panneauOverlay" class="panneau-overlay">
          <div class="panneau-overlay__header">
            <span class="panneau-overlay__titre">
              {{ panneauOverlay === 'boutique'   ? '🏪 Boutique'
               : panneauOverlay === 'finances'   ? '📊 Finances'
               : panneauOverlay === 'logement'   ? '🏠 Logement'
               : panneauOverlay === 'telephone'  ? '📱 Téléphone'
               : panneauOverlay === 'ordinateur'  ? '💻 Ordinateur'
               : panneauOverlay === 'marche_noir' ? '🕵️ Réseau'
               : panneauOverlay === 'formations'  ? '🎓 Formations'
               :                                   '🚗 Véhicules' }}
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

                <!-- Commandes illégales -->
                <div class="ordinateur-section-titre illegales-titre">⚠ Marché noir</div>
                <ul class="commandes-illegales">
                  <li v-for="cmd in commandesIllegalesInfo" :key="cmd.id"
                    class="commande-item"
                    :class="{
                      'commande-item--locked':   !cmd.accessible,
                      'commande-item--cooldown':  cmd.accessible && cmd.enCooldown,
                    }">
                    <span class="commande-item__emoji">{{ cmd.emoji }}</span>
                    <div class="commande-item__info">
                      <span class="commande-item__label">{{ cmd.label }}</span>
                      <span class="commande-item__gains">{{ cmd.gainMin.toLocaleString('fr-FR') }}–{{ cmd.gainMax.toLocaleString('fr-FR') }} €
                        <template v-if="cmd.tokens > 0"> · +{{ cmd.tokens }} 🔮</template>
                        · Karma {{ cmd.karma }} · Rép. {{ cmd.reputation }}
                      </span>
                      <span class="commande-item__couche">Couche {{ cmd.couche }}</span>
                      <span v-if="cmd.malusReputation" class="commande-malus-rep">⚠ Rendement −15%</span>
                    </div>
                    <div class="commande-item__action">
                      <span v-if="!cmd.accessible" class="commande-item__raison">🔒 {{ cmd.raison }}</span>
                      <span v-else-if="cmd.enCooldown" class="commande-item__cd">⏳ {{ cmd.cdRestant }}s</span>
                      <button v-else class="commande-item__btn" @click="actionCommandeIllegale(cmd.id)">▶</button>
                    </div>
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

          <!-- Marché noir -->
          <template v-else-if="panneauOverlay === 'marche_noir'">
            <div class="overlay-marche-noir">
              <!-- Statut immunité -->
              <div v-if="immuniteRestanteS > 0" class="mn-immunite">
                🛡 Immunité active — {{ _formatMMSS ? '' : '' }}{{ Math.floor(immuniteRestanteS / 60) }}:{{ (immuniteRestanteS % 60).toString().padStart(2, '0') }} restantes
              </div>
              <!-- T32 — avertissement réputation élevée -->
              <div v-if="state.jauges.reputation >= CONFIG.REPUTATION_ILLEGAL.DEALS_DISCRETS_REPUTATION_MAX" class="mn-rep-avert">
                👁 Ta réputation attire trop l'attention — certains deals discrets sont inaccessibles.
              </div>

              <!-- Deals actifs -->
              <div v-if="dealsEnrichis.length === 0" class="mn-vide">
                <p>Aucune offre disponible.<br>
                <span style="color:#555; font-size:0.85em;">Prochain refresh dans {{ prochainRefreshS }}s</span></p>
              </div>
              <div
                v-for="deal in dealsEnrichis"
                :key="deal.id_instance"
                class="deal-card"
                :class="{ 'deal-card--expired': deal.expire }"
              >
                <div class="deal-card__header">
                  <span class="deal-card__label">{{ deal.label }}</span>
                  <span
                    class="deal-timer"
                    :class="{
                      'deal-timer--rouge':  deal.tempsRestantS < 30,
                      'deal-timer--orange': deal.tempsRestantS >= 30 && deal.tempsRestantS < 60,
                    }"
                  >⏱ {{ deal.tempsAffiche }}</span>
                </div>
                <p class="deal-card__desc">{{ deal.description }}</p>
                <div class="deal-card__meta">
                  <span class="deal-cout">Coût : {{ deal.coutAffiche }}</span>
                  <span class="deal-gain">Gain : {{ deal.gainAffiche }}</span>
                </div>
                <button
                  class="deal-card__btn"
                  :disabled="!deal.abordable || deal.expire"
                  @click="actionAccepterDeal(deal.id_instance)"
                >{{ deal.expire ? 'Expiré' : !deal.abordable ? 'Insuffisant' : 'Accepter' }}</button>
              </div>

              <!-- Footer refresh -->
              <div v-if="dealsEnrichis.length > 0" class="mn-footer">
                Refresh dans {{ prochainRefreshS }}s
              </div>
            </div>
          </template>

          <!-- Formations -->
          <template v-else-if="panneauOverlay === 'formations'">
            <div class="formations-overlay">

              <!-- Formation en cours -->
              <div v-if="formationEnCours" class="formation-active-card">
                <div class="formation-active-header">
                  📚 {{ formationEnCours.label }}
                  <span class="formation-timer">{{ formationEnCours.tempsAffiche }}</span>
                </div>
                <div class="formation-barre">
                  <div class="formation-barre-fill" :style="{ width: formationEnCours.pourcent + '%' }"></div>
                </div>
                <span style="font-size:0.75em; color:#60a5fa;">+{{ formationEnCours.gainNiveaux }} niveau{{ formationEnCours.gainNiveaux > 1 ? 'x' : '' }} {{ formationEnCours.secteur }}</span>
              </div>

              <!-- Secteurs -->
              <div
                v-for="groupe in formationsDisponibles"
                :key="groupe.secteur"
                class="formation-groupe"
              >
                <div class="formation-groupe__header">
                  <span>{{ groupe.emoji }} {{ groupe.secteur }}</span>
                  <span v-if="groupe.niveau > 0" class="formation-groupe__niveau">
                    Niv. {{ groupe.niveau }} · +{{ groupe.bonus }}% XP
                  </span>
                </div>
                <div class="formation-cards-row">
                  <div
                    v-for="f in groupe.formations"
                    :key="f.id"
                    class="formation-mini-card"
                    :class="{ 'formation-mini-card--en-cours': f.enCours, 'formation-mini-card--disabled': f.disabled && !f.enCours }"
                  >
                    <div class="formation-mini-card__label">{{ f.label.split('—')[1]?.trim() ?? f.label }}</div>
                    <div class="formation-mini-card__meta">
                      {{ f.cout.toLocaleString('fr-FR') }} € · {{ f.dureeAffiche }}
                    </div>
                    <div class="formation-mini-card__gain">+{{ f.gainNiveaux }} niv.</div>
                    <span v-if="f.enCours" class="formation-en-cours">En cours</span>
                    <button v-else class="boutique-item__btn"
                      :disabled="f.disabled"
                      @click="actionDemarrerFormation(f.id)"
                    >Démarrer</button>
                  </div>
                </div>
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
      <!-- ÉCRAN DE FIN DE GÉNÉRATION (overlay bloquant global)     -->
      <!-- ══════════════════════════════════════════════════════════ -->
      <div v-if="panneauOverlay === 'mort'" class="overlay-mort">
        <div class="ecran-mort" v-if="recapGeneration">

          <!-- Titre -->
          <div class="overlay-mort__titre">
            💀 FIN DE GÉNÉRATION #{{ recapGeneration.generationNumero }}
            <div class="overlay-mort__sous-titre">
              {{ recapGeneration.nom || '???' }} — mort{{ recapGeneration.generationNumero !== 1 ? '' : '' }} à {{ recapGeneration.age_mort }} ans
            </div>
          </div>

          <!-- Bilan -->
          <div class="overlay-mort__recap">
            <h3 class="overlay-mort__section-titre">Bilan de vie</h3>
            <div class="overlay-mort__ligne">
              <span>💰 Héritage transmis</span>
              <strong class="overlay-mort__or">{{ recapGeneration.argent_transmis.toLocaleString('fr-FR') }} €</strong>
            </div>
            <div class="overlay-mort__ligne">
              <span>⚡ Karma final</span>
              <strong>{{ recapGeneration.karma_final }}</strong>
            </div>
            <div class="overlay-mort__ligne">
              <span>🏆 Secteur principal</span>
              <strong style="text-transform:capitalize">{{ recapGeneration.secteurPrincipal }}</strong>
            </div>
            <div class="overlay-mort__ligne">
              <span>☠ Couche illégale max</span>
              <strong :style="{ color: recapGeneration.couche_illegale_max > 0 ? '#ef4444' : '#888' }">
                {{ recapGeneration.couche_illegale_max === 0 ? 'Aucune' : recapGeneration.couche_illegale_max }}
              </strong>
            </div>
          </div>

          <!-- Lignée -->
          <div v-if="recapGeneration.ligneeComplete.length > 1" class="overlay-mort__lignee">
            <h3 class="overlay-mort__section-titre">Lignée — {{ recapGeneration.ligneeComplete.length }} générations</h3>
            <div class="lignee-table-wrap">
              <table class="lignee-table">
                <thead>
                  <tr><th>Nom</th><th>Âge</th><th>Argent</th><th>Karma</th></tr>
                </thead>
                <tbody>
                  <tr v-for="(anc, i) in recapGeneration.ligneeComplete" :key="i"
                    :class="{ 'lignee-table__row--actuelle': i === recapGeneration.ligneeComplete.length - 1 }">
                    <td>{{ anc.nom || '???' }}</td>
                    <td>{{ anc.age_mort }} ans</td>
                    <td class="lignee-table__or">{{ anc.argent_transmis.toLocaleString('fr-FR') }} €</td>
                    <td>{{ anc.karma_final }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Boost de départ -->
          <div>
            <h3 class="overlay-mort__section-titre">
              Boost de départ
              <span style="font-size:0.75em; color:#555; font-weight:normal;">(optionnel)</span>
            </h3>
            <div class="boost-grid">
              <div
                v-for="b in recapGeneration.boostsDisponibles"
                :key="b.secteur"
                class="boost-card"
                :class="{ 'boost-card--selected': boostSelectionne === b.secteur }"
                @click="boostSelectionne = boostSelectionne === b.secteur ? null : b.secteur"
              >
                <span class="boost-card__emoji">{{ b.emoji }}</span>
                <span class="boost-card__label">{{ b.secteur }}</span>
                <span v-if="b.bonusAffiche" class="boost-card__bonus">{{ b.bonusAffiche }}</span>
              </div>
            </div>
            <p v-if="boostSelectionne" style="font-size:0.75em; color:#a78bfa; margin-top:6px;">
              +1 boost {{ boostSelectionne }} en héritage
            </p>
          </div>

          <!-- Continuer -->
          <button class="btn-continuer" @click="actionNouvelleGeneration">
            ▶ COMMENCER GÉNÉRATION {{ recapGeneration.generationNumero + 1 }}
          </button>

        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════════ -->
      <!-- OVERLAY ÉVÉNEMENT MAJEUR                                  -->
      <!-- ══════════════════════════════════════════════════════════ -->
      <div v-if="evenementOverlay && panneauOverlay !== 'mort'" class="overlay-evenement">
        <div class="overlay-evenement__card" v-if="evenementOverlayInfo">
          <div class="overlay-evenement__titre">⚡ {{ evenementOverlayInfo.label }}</div>
          <p class="overlay-evenement__message">{{ evenementOverlayInfo.message }}</p>
          <ul class="overlay-evenement__effets">
            <li
              v-for="(ef, i) in evenementOverlayInfo.effetsLisibles"
              :key="i"
              :class="ef.positif ? 'evt-effet--positif' : 'evt-effet--negatif'"
            >{{ ef.texte }}</li>
          </ul>
          <button class="overlay-evenement__btn" @click="fermerEvenementOverlay">Continuer →</button>
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
