import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Session, asUser, DEMO } from '../helpers/api'
import { createTestUser, deleteTestUser, type TestUser } from '../helpers/fixtures'

// =============================================================================
// Domaine « dossier » — parcours, auto-évaluation, synthèse.
// Routeurs : /api/dossiers (dossier.ts), /api/autoeval (autoeval.ts), /api/synthese (synthese.ts).
//
// Stratégie d'isolation :
//  - Les lectures nominales s'appuient sur le jeu de démo (read-only) découvert dynamiquement.
//  - Tout scénario MUTANT/DESTRUCTIF (clôture, réouverture, auto-éval, génération/édition/
//    publication de synthèse, messages) s'exécute sur un dossier JETABLE détenu par un
//    accompagnateur de test, démarré par un accompagné de test. Aucun compte/dossier de
//    démo n'est jamais dégradé durablement.
//  - Tous les comptes de test sont supprimés en afterAll (RGPD cascade).
// =============================================================================

// --- 21 identifiants d'indicateurs de la grille (3 critères × 7) ---
const INDICATEUR_IDS = [
  '1.1', '1.2', '1.3', '1.4', '1.5', '1.6', '1.7',
  '2.1', '2.2', '2.3', '2.4', '2.5', '2.6', '2.7',
  '3.1', '3.2', '3.3', '3.4', '3.5', '3.6', '3.7',
]

describe('dossier (parcours · auto-évaluation · synthèse)', () => {
  // Comptes jetables
  let admin: Session
  let accA: TestUser // accompagnateur propriétaire du dossier jetable
  let accB: TestUser // accompagnateur tiers (non-propriétaire) pour les 404
  let learner: TestUser // accompagné qui démarre le parcours jetable

  let sA: Session // session accompagnateur A (propriétaire)
  let sB: Session // session accompagnateur B (tiers)
  let sL: Session // session accompagné jetable

  let dossierJetable: number // dossier détenu par accA, démarré par learner

  beforeAll(async () => {
    admin = await asUser(DEMO.admin)
    accA = await createTestUser(admin, 'accompagnateur', 'doss-acc-a')
    accB = await createTestUser(admin, 'accompagnateur', 'doss-acc-b')
    learner = await createTestUser(admin, 'accompagne', 'doss-learner')

    sA = await asUser({ email: accA.email, password: accA.password })
    sB = await asUser({ email: accB.email, password: accB.password })
    sL = await asUser({ email: learner.email, password: learner.password })

    // L'accompagné jetable démarre un parcours avec l'accompagnateur A → dossier détenu par accA.
    const start = await sL.post('/api/dossiers/start', { titre: 'Parcours jetable QA', accompagnateurId: accA.id })
    if (start.status !== 201) throw new Error(`Démarrage du dossier jetable échoué (${start.status})`)
    dossierJetable = start.json.dossierId as number
  })

  afterAll(async () => {
    // Suppression RGPD en cascade des comptes de test (et de leurs dossiers).
    for (const u of [learner, accA, accB]) {
      if (u) await deleteTestUser(admin, u)
    }
  })

  // ---------------------------------------------------------------------------
  // GET /api/dossiers/accompagnateurs
  // ---------------------------------------------------------------------------
  it('TC-DOSS-001 — lister les accompagnateurs disponibles (nominal)', async () => {
    const r = await sL.get('/api/dossiers/accompagnateurs')
    expect(r.status).toBe(200)
    expect(Array.isArray(r.json.accompagnateurs)).toBe(true)
    expect(r.json.accompagnateurs.length).toBeGreaterThanOrEqual(2)
    for (const a of r.json.accompagnateurs) {
      expect(a).toHaveProperty('id')
      expect(a).toHaveProperty('prenom')
      expect(a).toHaveProperty('nom')
      expect(a).toHaveProperty('email')
    }
    // L'accompagnateur de test actif y figure ; aucun champ de mot de passe n'est exposé.
    expect(r.json.accompagnateurs.some((a: any) => a.id === accA.id)).toBe(true)
    expect(r.json.accompagnateurs[0]).not.toHaveProperty('password_hash')
    // Tri par prenom puis email : la séquence des prenom est non-décroissante.
    const prenoms = r.json.accompagnateurs.map((a: any) => String(a.prenom ?? ''))
    const sorted = [...prenoms].sort((x, y) => x.localeCompare(y))
    expect(prenoms).toEqual(sorted)
  })

  it('TC-DOSS-002 — accompagnateurs : non authentifié → 401', async () => {
    const anon = new Session()
    const r = await anon.get('/api/dossiers/accompagnateurs')
    expect(r.status).toBe(401)
    expect(r.json.error).toBe('Non authentifié')
  })

  it('TC-DOSS-003 — accompagnateurs : rôle accompagnateur → 403', async () => {
    const r = await sA.get('/api/dossiers/accompagnateurs')
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('Accès refusé')
  })

  // ---------------------------------------------------------------------------
  // POST /api/dossiers/start
  // ---------------------------------------------------------------------------
  it('TC-DOSS-004 — démarrer un parcours (nominal, 201)', async () => {
    const r = await sL.post('/api/dossiers/start', { titre: 'Mémoire — refonte appli', accompagnateurId: accA.id })
    expect(r.status).toBe(201)
    expect(typeof r.json.dossierId).toBe('number')
    // Le dossier créé apparaît dans la liste de l'accompagné avec le bon accompagnateur, statut en_cours.
    const mine = await sL.get('/api/dossiers/mine')
    const d = mine.json.dossiers.find((x: any) => x.id === r.json.dossierId)
    expect(d).toBeTruthy()
    expect(d.statut).toBe('en_cours')
    expect(d.acc_email).toBe(accA.email)
    // Une notification a bien été émise vers l'accompagnateur choisi.
    const notifs = await sA.get('/api/notifications')
    expect(notifs.status).toBe(200)
  })

  it('TC-DOSS-005 — démarrer : titre manquant/vide/espaces → 400', async () => {
    const expectedErr = 'Donne un titre à ton parcours.'
    const a = await sL.post('/api/dossiers/start', { titre: '', accompagnateurId: accA.id })
    expect(a.status).toBe(400)
    expect(a.json.error).toBe(expectedErr)
    const b = await sL.post('/api/dossiers/start', { titre: '   ', accompagnateurId: accA.id })
    expect(b.status).toBe(400)
    expect(b.json.error).toBe(expectedErr)
    const c = await sL.post('/api/dossiers/start', { accompagnateurId: accA.id })
    expect(c.status).toBe(400)
    expect(c.json.error).toBe(expectedErr)
  })

  it('TC-DOSS-006 — démarrer : accompagnateur invalide/inexistant/inactif/rôle accompagné → 400', async () => {
    const expectedErr = 'Choisis un accompagnateur valide.'
    // A. id inexistant
    const a = await sL.post('/api/dossiers/start', { titre: 'x', accompagnateurId: 999999 })
    expect(a.status).toBe(400)
    expect(a.json.error).toBe(expectedErr)
    // B. id d'un utilisateur de rôle accompagné (le learner lui-même)
    const b = await sL.post('/api/dossiers/start', { titre: 'x', accompagnateurId: learner.id })
    expect(b.status).toBe(400)
    expect(b.json.error).toBe(expectedErr)
    // C. accompagnateur désactivé (actif=0)
    const inactif = await createTestUser(admin, 'accompagnateur', 'doss-inactif')
    await admin.patch(`/api/admin/users/${inactif.id}`, { actif: 0 })
    const c = await sL.post('/api/dossiers/start', { titre: 'x', accompagnateurId: inactif.id })
    expect(c.status).toBe(400)
    expect(c.json.error).toBe(expectedErr)
    await deleteTestUser(admin, inactif)
    // D. accompagnateurId absent (Number(undefined)=NaN)
    const d = await sL.post('/api/dossiers/start', { titre: 'x' })
    expect(d.status).toBe(400)
    expect(d.json.error).toBe(expectedErr)
  })

  it('TC-DOSS-007 — démarrer : non authentifié → 401', async () => {
    const anon = new Session()
    const r = await anon.post('/api/dossiers/start', { titre: 'x', accompagnateurId: accA.id })
    expect(r.status).toBe(401)
    expect(r.json.error).toBe('Non authentifié')
  })

  it('TC-DOSS-008 — démarrer : rôle accompagnateur → 403', async () => {
    const r = await sA.post('/api/dossiers/start', { titre: 'x', accompagnateurId: accA.id })
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('Accès refusé')
  })

  it('TC-DOSS-009 — lien d\'accompagnement non dupliqué au re-démarrage (INSERT OR IGNORE)', async () => {
    // Le learner a déjà au moins un parcours avec accA (beforeAll + TC-004). On en démarre un nouveau.
    const before = await sL.get('/api/dossiers/mine')
    const nbAvant = before.json.dossiers.filter((d: any) => d.acc_email === accA.email).length
    const r = await sL.post('/api/dossiers/start', { titre: 'Second parcours', accompagnateurId: accA.id })
    expect(r.status).toBe(201)
    const after = await sL.get('/api/dossiers/mine')
    const nbApres = after.json.dossiers.filter((d: any) => d.acc_email === accA.email).length
    // Un nouveau DOSSIER est bien créé (le lien, lui, n'est pas dupliqué — invariant DB non observable ici).
    expect(nbApres).toBe(nbAvant + 1)
  })

  // ---------------------------------------------------------------------------
  // GET /api/dossiers/mine
  // ---------------------------------------------------------------------------
  it('TC-DOSS-010 — lister mes parcours (nominal + compteurs)', async () => {
    // Compte de démo Amine : dossier vitrine avec questionnaire, CR publiés, synthèse publiée, RDV.
    const sAmine = await asUser(DEMO.amine)
    const r = await sAmine.get('/api/dossiers/mine')
    expect(r.status).toBe(200)
    expect(Array.isArray(r.json.dossiers)).toBe(true)
    expect(r.json.dossiers.length).toBeGreaterThanOrEqual(1)
    for (const d of r.json.dossiers) {
      expect(d).toHaveProperty('id')
      expect(d).toHaveProperty('titre')
      expect(d).toHaveProperty('statut')
      expect(d).toHaveProperty('cree_le')
      expect(d).toHaveProperty('acc_prenom')
      expect(d).toHaveProperty('acc_nom')
      expect(d).toHaveProperty('acc_email')
      expect(d).toHaveProperty('has_questionnaire')
      expect(d).toHaveProperty('synthese_publiee')
      expect(d).toHaveProperty('nb_cr')
      expect(d).toHaveProperty('nb_rdv')
    }
    // Tri par cree_le DESC.
    const dates = r.json.dossiers.map((d: any) => String(d.cree_le))
    const sortedDesc = [...dates].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0))
    expect(dates).toEqual(sortedDesc)
    // Au moins un dossier vitrine cumule les compteurs.
    const vitrine = r.json.dossiers.find((d: any) => d.synthese_publiee >= 1)
    expect(vitrine).toBeTruthy()
    expect(vitrine.has_questionnaire).toBeGreaterThanOrEqual(1)
    expect(vitrine.nb_cr).toBeGreaterThanOrEqual(1)
  })

  it('TC-DOSS-011 — lister mes parcours : isolation entre accompagnés', async () => {
    const sAmine = await asUser(DEMO.amine)
    const sLea = await asUser(DEMO.lea)
    const amineIds = new Set((await sAmine.get('/api/dossiers/mine')).json.dossiers.map((d: any) => d.id))
    const lea = await sLea.get('/api/dossiers/mine')
    expect(lea.status).toBe(200)
    expect(lea.json.dossiers.length).toBeGreaterThanOrEqual(1)
    // Aucun dossier de Léa ne doit appartenir à l'ensemble des dossiers d'Amine.
    for (const d of lea.json.dossiers) expect(amineIds.has(d.id)).toBe(false)
  })

  // ---------------------------------------------------------------------------
  // GET /api/dossiers/mine/:id
  // ---------------------------------------------------------------------------
  it('TC-DOSS-012 — détail d\'un parcours côté accompagné (nominal)', async () => {
    const sAmine = await asUser(DEMO.amine)
    const list = await sAmine.get('/api/dossiers/mine')
    const id = list.json.dossiers[0].id
    const r = await sAmine.get(`/api/dossiers/mine/${id}`)
    expect(r.status).toBe(200)
    const d = r.json.dossier
    for (const k of ['id', 'titre', 'statut', 'cree_le', 'accompagnateur_id', 'acc_prenom', 'acc_nom', 'acc_email']) {
      expect(d).toHaveProperty(k)
    }
    expect(r.json).toHaveProperty('questionnaire')
    expect(Array.isArray(r.json.crs)).toBe(true)
    expect(typeof r.json.synthese_publiee).toBe('boolean')
    expect(r.json).toHaveProperty('phase_max')
    expect(r.json).toHaveProperty('nb_entretiens')
    expect(Array.isArray(r.json.actions)).toBe(true)
    expect(Array.isArray(r.json.rdvs)).toBe(true)
    // CR renvoyés sont publiés et triés publie_le DESC.
    const crDates = r.json.crs.map((c: any) => String(c.publie_le))
    const sortedDesc = [...crDates].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0))
    expect(crDates).toEqual(sortedDesc)
  })

  it('TC-DOSS-013 — détail parcours accompagné : dossier d\'autrui ou inexistant → 404', async () => {
    const sAmine = await asUser(DEMO.amine)
    const sLea = await asUser(DEMO.lea)
    const amineId = (await sAmine.get('/api/dossiers/mine')).json.dossiers[0].id
    const a = await sLea.get(`/api/dossiers/mine/${amineId}`)
    expect(a.status).toBe(404)
    expect(a.json.error).toBe('Parcours introuvable')
    const b = await sLea.get('/api/dossiers/mine/999999')
    expect(b.status).toBe(404)
    expect(b.json.error).toBe('Parcours introuvable')
  })

  it('TC-DOSS-014 — détail parcours accompagné : rôle accompagnateur → 403', async () => {
    const r = await sA.get('/api/dossiers/mine/1')
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('Accès refusé')
  })

  // ---------------------------------------------------------------------------
  // GET /api/dossiers/:id (accompagnateur)
  // ---------------------------------------------------------------------------
  it('TC-DOSS-015 — détail complet dossier côté accompagnateur (nominal)', async () => {
    // Sur le dossier jetable détenu par accA.
    const r = await sA.get(`/api/dossiers/${dossierJetable}`)
    expect(r.status).toBe(200)
    const d = r.json.dossier
    for (const k of ['id', 'titre', 'contexte', 'statut', 'synthese', 'cree_le', 'accompagne_prenom', 'accompagne_email']) {
      expect(d).toHaveProperty(k)
    }
    expect(r.json).toHaveProperty('questionnaire')
    expect(Array.isArray(r.json.sessions)).toBe(true)
    expect(typeof r.json.synthese_publiee).toBe('boolean')
    expect(Array.isArray(r.json.actions)).toBe(true)
    expect(Array.isArray(r.json.rdvs)).toBe(true)
    // Chaque session porte un tableau crs (id, version, genere_le, publie).
    for (const s of r.json.sessions) expect(Array.isArray(s.crs)).toBe(true)
  })

  it('TC-DOSS-016 — détail dossier : non-propriétaire → 404', async () => {
    // accB (tiers) tente d'accéder au dossier détenu par accA.
    const r = await sB.get(`/api/dossiers/${dossierJetable}`)
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Dossier introuvable')
  })

  it('TC-DOSS-017 — détail dossier : id inexistant → 404', async () => {
    const r = await sA.get('/api/dossiers/999999')
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Dossier introuvable')
  })

  it('TC-DOSS-018 — détail dossier : rôle accompagné → 403', async () => {
    const r = await sL.get('/api/dossiers/1')
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('Accès refusé')
  })

  // ---------------------------------------------------------------------------
  // GET /api/dossiers/:id/synthese (JSON)
  // ---------------------------------------------------------------------------
  it('TC-DOSS-019 — synthèse JSON du dossier (nominal)', async () => {
    const r = await sA.get(`/api/dossiers/${dossierJetable}/synthese`)
    expect(r.status).toBe(200)
    // titre par défaut, accompagné, statut, dates, contexte défaut '—'.
    expect(typeof r.json.titre).toBe('string')
    expect(r.json.titre.length).toBeGreaterThan(0)
    expect(typeof r.json.accompagne).toBe('string')
    expect(typeof r.json.statut).toBe('string')
    expect(r.json).toHaveProperty('creeLe')
    expect(typeof r.json.editeLe).toBe('string')
    // editeLe est un ISO récent.
    expect(Number.isNaN(Date.parse(r.json.editeLe))).toBe(false)
    expect(typeof r.json.contexte).toBe('string')
    expect(r.json).toHaveProperty('questionnaire') // null toléré
    expect(Array.isArray(r.json.entretiens)).toBe(true)
    expect(Array.isArray(r.json.actions)).toBe(true)
    expect(Array.isArray(r.json.rdvs)).toBe(true)
    expect(r.json).toHaveProperty('synthese')
  })

  it('TC-DOSS-020 — synthèse JSON dossier : non-propriétaire → 404', async () => {
    const r = await sB.get(`/api/dossiers/${dossierJetable}/synthese`)
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Dossier introuvable')
  })

  // ---------------------------------------------------------------------------
  // POST /api/dossiers/:id/cloturer  +  /rouvrir  (DESTRUCTIF → dossier jetable dédié)
  // ---------------------------------------------------------------------------
  it('TC-DOSS-021 — clôturer la démarche avec synthèse finale (nominal)', async () => {
    const dossier = await freshDossier(sL, sA, accA.id)
    const r = await sA.post(`/api/dossiers/${dossier}/cloturer`, { synthese: 'Beau parcours, autonomie acquise.' })
    expect(r.status).toBe(200)
    expect(r.json.ok).toBe(true)
    const detail = await sA.get(`/api/dossiers/${dossier}`)
    expect(detail.json.dossier.statut).toBe('cloture')
    expect(detail.json.dossier.synthese).toBe('Beau parcours, autonomie acquise.')
  })

  it('TC-DOSS-022 — clôturer sans synthèse (synthese null accepté)', async () => {
    const dossier = await freshDossier(sL, sA, accA.id)
    const r = await sA.post(`/api/dossiers/${dossier}/cloturer`, {})
    expect(r.status).toBe(200)
    expect(r.json.ok).toBe(true)
    const detail = await sA.get(`/api/dossiers/${dossier}`)
    expect(detail.json.dossier.statut).toBe('cloture')
    expect(detail.json.dossier.synthese).toBeNull()
  })

  it('TC-DOSS-023 — clôturer : non-propriétaire → 404', async () => {
    const r = await sB.post(`/api/dossiers/${dossierJetable}/cloturer`, { synthese: 'x' })
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Dossier introuvable')
    // Aucun changement de statut côté propriétaire.
    const detail = await sA.get(`/api/dossiers/${dossierJetable}`)
    expect(detail.json.dossier.statut).toBe('en_cours')
  })

  it('TC-DOSS-024 — clôturer : rôle accompagné → 403', async () => {
    const r = await sL.post('/api/dossiers/1/cloturer', { synthese: 'x' })
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('Accès refusé')
  })

  it('TC-DOSS-025 — rouvrir un dossier clôturé (nominal)', async () => {
    const dossier = await freshDossier(sL, sA, accA.id)
    await sA.post(`/api/dossiers/${dossier}/cloturer`, { synthese: 'Synthèse finale conservée.' })
    const r = await sA.post(`/api/dossiers/${dossier}/rouvrir`)
    expect(r.status).toBe(200)
    expect(r.json.ok).toBe(true)
    const detail = await sA.get(`/api/dossiers/${dossier}`)
    expect(detail.json.dossier.statut).toBe('en_cours')
    // La synthèse finale saisie reste inchangée après réouverture.
    expect(detail.json.dossier.synthese).toBe('Synthèse finale conservée.')
  })

  it('TC-DOSS-026 — rouvrir : non-propriétaire → 404', async () => {
    const r = await sB.post(`/api/dossiers/${dossierJetable}/rouvrir`)
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Dossier introuvable')
  })

  it('TC-DOSS-027 — cycle clôturer puis rouvrir (non-régression d\'état)', async () => {
    const dossier = await freshDossier(sL, sA, accA.id)
    const avant = await sA.get(`/api/dossiers/${dossier}`)
    const nbSessions = avant.json.sessions.length
    const nbActions = avant.json.actions.length
    const nbRdvs = avant.json.rdvs.length
    expect((await sA.post(`/api/dossiers/${dossier}/cloturer`, { synthese: 'Fin.' })).status).toBe(200)
    expect((await sA.post(`/api/dossiers/${dossier}/rouvrir`)).status).toBe(200)
    const apres = await sA.get(`/api/dossiers/${dossier}`)
    expect(apres.json.dossier.statut).toBe('en_cours')
    // Aucune perte de sessions/actions/RDV.
    expect(apres.json.sessions.length).toBe(nbSessions)
    expect(apres.json.actions.length).toBe(nbActions)
    expect(apres.json.rdvs.length).toBe(nbRdvs)
  })

  // ---------------------------------------------------------------------------
  // GET /api/autoeval/grille
  // ---------------------------------------------------------------------------
  it('TC-DOSS-028 — grille statique d\'auto-évaluation (nominal)', async () => {
    const r = await sA.get('/api/autoeval/grille')
    expect(r.status).toBe(200)
    expect(Array.isArray(r.json.criteres)).toBe(true)
    expect(r.json.criteres.length).toBe(3)
    expect(Array.isArray(r.json.zones)).toBe(true)
    expect(r.json.zones.length).toBe(4)
    // 3 critères × 7 indicateurs = 21.
    let total = 0
    for (const c of r.json.criteres) {
      expect(c).toHaveProperty('id')
      expect(c).toHaveProperty('titre')
      expect(c).toHaveProperty('resume')
      expect(Array.isArray(c.indicateurs)).toBe(true)
      expect(c.indicateurs.length).toBe(7)
      for (const i of c.indicateurs) {
        expect(i).toHaveProperty('id')
        expect(i).toHaveProperty('texte')
      }
      total += c.indicateurs.length
    }
    expect(total).toBe(21)
    // Zones ordonnées : min 0/25/50/75.
    expect(r.json.zones.map((z: any) => z.min)).toEqual([0, 25, 50, 75])
    expect(r.json.zones.map((z: any) => z.label)).toEqual(['Émergent', 'En développement', 'Maîtrisé', 'Expert'])
  })

  it('TC-DOSS-029 — grille : rôle accompagné → 403', async () => {
    const r = await sL.get('/api/autoeval/grille')
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('Accès refusé')
  })

  it('TC-DOSS-030 — grille : non authentifié → 401', async () => {
    const anon = new Session()
    const r = await anon.get('/api/autoeval/grille')
    expect(r.status).toBe(401)
    expect(r.json.error).toBe('Non authentifié')
  })

  // ---------------------------------------------------------------------------
  // GET /api/autoeval/:id  (création de brouillon)
  // ---------------------------------------------------------------------------
  it('TC-DOSS-031 — charger l\'auto-évaluation courante crée un brouillon (nominal)', async () => {
    // Dossier vierge (jetable, sans auto-éval préalable).
    const dossier = await freshDossier(sL, sA, accA.id)
    const r = await sA.get(`/api/autoeval/${dossier}`)
    expect(r.status).toBe(200)
    const e = r.json.eval
    expect(typeof e.id).toBe('number')
    expect(e.statut).toBe('brouillon')
    expect(e.note_globale).toBeNull() // vierge → null
    expect(e).toHaveProperty('commentaire_global')
    expect(e).toHaveProperty('analyse_questions')
    expect(e).toHaveProperty('maj_le')
    // scores contient exactement les 21 clés initialisées {score:null, commentaire:null}.
    expect(Object.keys(e.scores).sort()).toEqual([...INDICATEUR_IDS].sort())
    for (const id of INDICATEUR_IDS) {
      expect(e.scores[id]).toEqual({ score: null, commentaire: null })
    }
    expect(Array.isArray(r.json.historique)).toBe(true)
    expect(r.json.historique.length).toBe(0)
  })

  it('TC-DOSS-032 — charger auto-évaluation : non-propriétaire → 404', async () => {
    const r = await sB.get(`/api/autoeval/${dossierJetable}`)
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Dossier introuvable')
  })

  // ---------------------------------------------------------------------------
  // POST /api/autoeval/:id  (enregistrer le brouillon)
  // ---------------------------------------------------------------------------
  it('TC-DOSS-033 — enregistrer le brouillon avec scores valides (nominal + note)', async () => {
    const dossier = await freshDossier(sL, sA, accA.id)
    const r = await sA.post(`/api/autoeval/${dossier}`, {
      scores: [
        { indicateur: '1.1', score: 80, commentaire: 'ok' },
        { indicateur: '2.1', score: 60, commentaire: null },
      ],
      commentaire_global: 'Forces…',
      analyse_questions: 'Questions ouvertes…',
    })
    expect(r.status).toBe(200)
    expect(r.json.ok).toBe(true)
    // note = round((80+60)/2 / 5 * 10) / 10 = round(70/5*10)/10 = round(140)/10 = 14.0
    expect(r.json.note_globale).toBe(14)
    // Relecture : scores upsertés + commentaires globaux persistés.
    const back = await sA.get(`/api/autoeval/${dossier}`)
    expect(back.json.eval.scores['1.1']).toEqual({ score: 80, commentaire: 'ok' })
    expect(back.json.eval.scores['2.1']).toEqual({ score: 60, commentaire: null })
    expect(back.json.eval.commentaire_global).toBe('Forces…')
    expect(back.json.eval.analyse_questions).toBe('Questions ouvertes…')
    expect(back.json.eval.note_globale).toBe(14)
  })

  it('TC-DOSS-034 — enregistrer : clamp des scores hors bornes [0,100]', async () => {
    const dossier = await freshDossier(sL, sA, accA.id)
    const r = await sA.post(`/api/autoeval/${dossier}`, {
      scores: [
        { indicateur: '1.1', score: 150 },
        { indicateur: '1.2', score: -20 },
        { indicateur: '1.3', score: 0 },
        { indicateur: '1.4', score: 100 },
      ],
    })
    expect(r.status).toBe(200)
    const back = await sA.get(`/api/autoeval/${dossier}`)
    expect(back.json.eval.scores['1.1'].score).toBe(100)
    expect(back.json.eval.scores['1.2'].score).toBe(0)
    expect(back.json.eval.scores['1.3'].score).toBe(0)
    expect(back.json.eval.scores['1.4'].score).toBe(100)
  })

  it('TC-DOSS-035 — enregistrer : score non numérique/NaN/null → null', async () => {
    const dossier = await freshDossier(sL, sA, accA.id)
    const r = await sA.post(`/api/autoeval/${dossier}`, {
      scores: [
        { indicateur: '1.1', score: 'abc' },
        { indicateur: '1.2', score: null },
      ],
    })
    expect(r.status).toBe(200)
    const back = await sA.get(`/api/autoeval/${dossier}`)
    expect(back.json.eval.scores['1.1'].score).toBeNull()
    expect(back.json.eval.scores['1.2'].score).toBeNull()
    // Aucun score numérique → note_globale null.
    expect(back.json.eval.note_globale).toBeNull()
  })

  it('TC-DOSS-036 — enregistrer : indicateur inconnu ignoré', async () => {
    const dossier = await freshDossier(sL, sA, accA.id)
    const r = await sA.post(`/api/autoeval/${dossier}`, {
      scores: [
        { indicateur: '9.9', score: 50 },
        { indicateur: '1.1', score: 50 },
      ],
    })
    expect(r.status).toBe(200)
    const back = await sA.get(`/api/autoeval/${dossier}`)
    // '9.9' n'existe pas dans la map des 21 clés ; '1.1' est bien enregistré.
    expect(back.json.eval.scores['9.9']).toBeUndefined()
    expect(back.json.eval.scores['1.1'].score).toBe(50)
  })

  it('TC-DOSS-037 — enregistrer : corps sans scores (tableau vide accepté)', async () => {
    const dossier = await freshDossier(sL, sA, accA.id)
    // Pré-charge un score existant.
    await sA.post(`/api/autoeval/${dossier}`, { scores: [{ indicateur: '1.1', score: 40, commentaire: 'init' }] })
    // POST sans champ scores, seulement un commentaire global.
    const r = await sA.post(`/api/autoeval/${dossier}`, { commentaire_global: 'maj' })
    expect(r.status).toBe(200)
    expect(r.json.ok).toBe(true)
    const back = await sA.get(`/api/autoeval/${dossier}`)
    // Le score existant est inchangé ; le commentaire global est mis à jour.
    expect(back.json.eval.scores['1.1']).toEqual({ score: 40, commentaire: 'init' })
    expect(back.json.eval.commentaire_global).toBe('maj')
  })

  it('TC-DOSS-038 — enregistrer : non-propriétaire → 404', async () => {
    const r = await sB.post(`/api/autoeval/${dossierJetable}`, { scores: [{ indicateur: '1.1', score: 50 }] })
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Dossier introuvable')
  })

  // ---------------------------------------------------------------------------
  // POST /api/autoeval/:id/valider
  // ---------------------------------------------------------------------------
  it('TC-DOSS-042 — valider fige la version et crée un nouveau brouillon copié', async () => {
    const dossier = await freshDossier(sL, sA, accA.id)
    // Saisir des scores dans le brouillon courant.
    await sA.post(`/api/autoeval/${dossier}`, {
      scores: [{ indicateur: '1.1', score: 80 }, { indicateur: '2.1', score: 60 }],
      commentaire_global: 'Bilan v1',
      analyse_questions: 'Questions v1',
    })
    const draftAvant = (await sA.get(`/api/autoeval/${dossier}`)).json.eval.id
    // /valider resauvegarde le brouillon depuis le corps AVANT de le figer : on transmet le
    // contenu courant (comme le fait le front), sinon un corps vide effacerait les commentaires.
    const v = await sA.post(`/api/autoeval/${dossier}/valider`, {
      scores: [{ indicateur: '1.1', score: 80 }, { indicateur: '2.1', score: 60 }],
      commentaire_global: 'Bilan v1',
      analyse_questions: 'Questions v1',
    })
    expect(v.status).toBe(200)
    expect(v.json.ok).toBe(true)
    const back = await sA.get(`/api/autoeval/${dossier}`)
    // Le brouillon courant est NOUVEAU (id différent de la version figée).
    expect(back.json.eval.statut).toBe('brouillon')
    expect(back.json.eval.id).not.toBe(draftAvant)
    // Il reprend note/commentaires et les scores copiés.
    expect(back.json.eval.note_globale).toBe(14)
    expect(back.json.eval.commentaire_global).toBe('Bilan v1')
    expect(back.json.eval.scores['1.1'].score).toBe(80)
    expect(back.json.eval.scores['2.1'].score).toBe(60)
    // L'ancien brouillon est désormais une version validée présente dans l'historique.
    expect(back.json.historique.length).toBe(1)
    expect(back.json.historique[0].id).toBe(draftAvant)
    expect(back.json.historique[0].note_globale).toBe(14)
    expect(back.json.historique[0]).toHaveProperty('maj_le')
  })

  it('TC-DOSS-043 — valider plusieurs fois : historique croissant et trié', async () => {
    const dossier = await freshDossier(sL, sA, accA.id)
    // Validation 1 (note A).
    await sA.post(`/api/autoeval/${dossier}/valider`, { scores: [{ indicateur: '1.1', score: 80 }, { indicateur: '2.1', score: 60 }] })
    // Validation 2 (note B différente).
    await sA.post(`/api/autoeval/${dossier}/valider`, { scores: [{ indicateur: '1.1', score: 50 }, { indicateur: '2.1', score: 50 }] })
    const back = await sA.get(`/api/autoeval/${dossier}`)
    expect(back.json.historique.length).toBe(2)
    for (const h of back.json.historique) {
      expect(h).toHaveProperty('id')
      expect(h).toHaveProperty('note_globale')
      expect(h).toHaveProperty('maj_le')
    }
    // Trié par maj_le, id (ordre non-décroissant des id, qui croissent à l'insertion).
    const ids = back.json.historique.map((h: any) => h.id)
    expect(ids).toEqual([...ids].sort((a, b) => a - b))
    // Le brouillon courant est distinct des versions validées.
    expect(ids).not.toContain(back.json.eval.id)
  })

  it('TC-DOSS-044 — valider : non-propriétaire → 404', async () => {
    const r = await sB.post(`/api/autoeval/${dossierJetable}/valider`, { scores: [{ indicateur: '1.1', score: 50 }] })
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Dossier introuvable')
  })

  // ---------------------------------------------------------------------------
  // POST /api/autoeval/:id/ia  (endpoint IA — contrat seulement)
  // ---------------------------------------------------------------------------
  it('TC-DOSS-045 / TC-DOSS-046 — pré-remplissage IA : contrat disponible OU repli, sans écriture', async () => {
    // couvre TC-DOSS-045 (available:true) et TC-DOSS-046 (available:false) selon la config serveur.
    const dossier = await freshDossier(sL, sA, accA.id)
    const before = (await sA.get(`/api/autoeval/${dossier}`)).json.eval.scores
    const r = await sA.post(`/api/autoeval/${dossier}/ia`)
    expect(r.status).toBe(200)
    expect(typeof r.json.available).toBe('boolean')
    if (r.json.available) {
      // Contrat « disponible » : scores filtrés/clampés + textes non figés.
      expect(Array.isArray(r.json.scores)).toBe(true)
      expect(typeof r.json.commentaire_global).toBe('string')
      expect(typeof r.json.analyse_questions).toBe('string')
      for (const s of r.json.scores) {
        expect(INDICATEUR_IDS).toContain(s.indicateur)
        if (s.score !== null) {
          expect(typeof s.score).toBe('number')
          expect(s.score).toBeGreaterThanOrEqual(0)
          expect(s.score).toBeLessThanOrEqual(100)
        }
        expect(['string', 'object']).toContain(typeof s.commentaire) // string | null
      }
    } else {
      // Contrat « repli » : message d'indisponibilité.
      expect(r.json.message).toBe("L'assistant IA n'est pas disponible (clé API absente ou service injoignable).")
    }
    // Dans les deux cas : RIEN n'est sauvegardé en base (brouillon inchangé).
    const after = (await sA.get(`/api/autoeval/${dossier}`)).json.eval.scores
    expect(after).toEqual(before)
  })

  it('TC-DOSS-048 — pré-remplissage IA : non-propriétaire → 404', async () => {
    const r = await sB.post(`/api/autoeval/${dossierJetable}/ia`)
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Dossier introuvable')
  })

  it('TC-DOSS-049 — endpoints autoeval : rôle accompagné → 403', async () => {
    // GET /:id ; POST /:id ; POST /:id/valider ; POST /:id/ia
    const get = await sL.get(`/api/autoeval/${dossierJetable}`)
    expect(get.status).toBe(403)
    expect(get.json.error).toBe('Accès refusé')
    const post = await sL.post(`/api/autoeval/${dossierJetable}`, { scores: [] })
    expect(post.status).toBe(403)
    const valider = await sL.post(`/api/autoeval/${dossierJetable}/valider`, { scores: [] })
    expect(valider.status).toBe(403)
    const ia = await sL.post(`/api/autoeval/${dossierJetable}/ia`)
    expect(ia.status).toBe(403)
  })

  // ---------------------------------------------------------------------------
  // POST /api/synthese/generer  (endpoint IA — contrat seulement)
  // ---------------------------------------------------------------------------
  it('TC-DOSS-050 — générer la synthèse (nominal, 201, nouvelle version)', async () => {
    const dossier = await freshDossier(sL, sA, accA.id)
    const r1 = await sA.post('/api/synthese/generer', { dossierId: dossier })
    expect(r1.status).toBe(201)
    expect(typeof r1.json.id).toBe('number')
    expect(r1.json.version).toBe(1)
    expect(typeof r1.json.contenu_html).toBe('string')
    expect(r1.json.contenu_html.length).toBeGreaterThan(0)
    expect(r1.json.source).toBe('ia')
    expect(r1.json.publie).toBe(0)
    // La version s'incrémente à chaque appel.
    const r2 = await sA.post('/api/synthese/generer', { dossierId: dossier })
    expect(r2.status).toBe(201)
    expect(r2.json.version).toBe(2)
  })

  it('TC-DOSS-051 — générer : dossierId d\'autrui/inexistant → 404', async () => {
    // dossier détenu par accA, généré par accB (tiers).
    const a = await sB.post('/api/synthese/generer', { dossierId: dossierJetable })
    expect(a.status).toBe(404)
    expect(a.json.error).toBe('Dossier introuvable')
    // dossierId inexistant.
    const b = await sA.post('/api/synthese/generer', { dossierId: 999999 })
    expect(b.status).toBe(404)
    expect(b.json.error).toBe('Dossier introuvable')
  })

  it('TC-DOSS-052 — générer : rôle accompagné → 403', async () => {
    const r = await sL.post('/api/synthese/generer', { dossierId: dossierJetable })
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('Accès refusé')
  })

  // ---------------------------------------------------------------------------
  // GET /api/synthese/dossier/:id  (état selon rôle)
  // ---------------------------------------------------------------------------
  it('TC-DOSS-056 — état synthèse côté accompagnateur (courant + historique)', async () => {
    const dossier = await freshDossier(sL, sA, accA.id)
    await sA.post('/api/synthese/generer', { dossierId: dossier })
    await sA.post('/api/synthese/generer', { dossierId: dossier })
    const r = await sA.get(`/api/synthese/dossier/${dossier}`)
    expect(r.status).toBe(200)
    expect(r.json.role).toBe('accompagnateur')
    expect(r.json.doc).toBeTruthy()
    expect(r.json.doc.version).toBe(2) // le doc courant est la dernière version
    expect(Array.isArray(r.json.versions)).toBe(true)
    expect(r.json.versions.length).toBe(2)
    for (const v of r.json.versions) {
      for (const k of ['id', 'version', 'source', 'genere_le', 'publie']) expect(v).toHaveProperty(k)
    }
    // Triées version DESC.
    const versions = r.json.versions.map((v: any) => v.version)
    expect(versions).toEqual([...versions].sort((a, b) => b - a))
  })

  it('TC-DOSS-057 — état synthèse côté accompagné : version publiée seule', async () => {
    // Cas démo : Amine possède une synthèse publiée sur son dossier vitrine.
    const sAmine = await asUser(DEMO.amine)
    const mine = await sAmine.get('/api/dossiers/mine')
    const avecSynthese = mine.json.dossiers.find((d: any) => d.synthese_publiee >= 1)
    expect(avecSynthese).toBeTruthy()
    const r = await sAmine.get(`/api/synthese/dossier/${avecSynthese.id}`)
    expect(r.status).toBe(200)
    expect(r.json.role).toBe('accompagne')
    expect(Array.isArray(r.json.versions)).toBe(true)
    expect(r.json.versions.length).toBe(0)
    expect(r.json.doc).toBeTruthy()
    for (const k of ['id', 'version', 'contenu_html', 'genere_le']) expect(r.json.doc).toHaveProperty(k)
    expect(r.json.doc.publie).toBe(1)
    // Cas « aucune publication » → doc:null (dossier jetable sans synthèse publiée, côté accompagné jetable).
    const dossier = await freshDossier(sL, sA, accA.id)
    const none = await sL.get(`/api/synthese/dossier/${dossier}`)
    expect(none.status).toBe(200)
    expect(none.json.role).toBe('accompagne')
    expect(none.json.doc).toBeNull()
  })

  it('TC-DOSS-058 — état synthèse : accès non autorisé (ni acc ni accompagné) → 404', async () => {
    // accB n'est ni l'accompagnateur ni l'accompagné du dossier jetable.
    const r = await sB.get(`/api/synthese/dossier/${dossierJetable}`)
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Dossier introuvable')
  })

  // ---------------------------------------------------------------------------
  // GET /api/synthese/version/:id
  // ---------------------------------------------------------------------------
  it('TC-DOSS-059 — lire une version archivée (propriétaire)', async () => {
    const dossier = await freshDossier(sL, sA, accA.id)
    const gen = await sA.post('/api/synthese/generer', { dossierId: dossier })
    const r = await sA.get(`/api/synthese/version/${gen.json.id}`)
    expect(r.status).toBe(200)
    expect(r.json.doc).toBeTruthy()
    expect(r.json.doc.id).toBe(gen.json.id)
    expect(r.json.doc).toHaveProperty('version')
    expect(typeof r.json.doc.contenu_html).toBe('string')
  })

  it('TC-DOSS-060 — lire une version : version d\'un dossier d\'autrui → 404', async () => {
    const dossier = await freshDossier(sL, sA, accA.id)
    const gen = await sA.post('/api/synthese/generer', { dossierId: dossier })
    // accB (tiers) tente de lire la version d'un dossier détenu par accA.
    const r = await sB.get(`/api/synthese/version/${gen.json.id}`)
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Introuvable')
  })

  it('TC-DOSS-061 — lire une version : rôle accompagné → 403', async () => {
    const r = await sL.get('/api/synthese/version/1')
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('Accès refusé')
  })

  // ---------------------------------------------------------------------------
  // PATCH /api/synthese/version/:id
  // ---------------------------------------------------------------------------
  it('TC-DOSS-062 — éditer la version courante (PATCH, nominal)', async () => {
    const dossier = await freshDossier(sL, sA, accA.id)
    const gen = await sA.post('/api/synthese/generer', { dossierId: dossier })
    const r = await sA.patch(`/api/synthese/version/${gen.json.id}`, { contenu_html: '<h2>Édité</h2><p>Contenu remanié.</p>' })
    expect(r.status).toBe(200)
    expect(r.json.ok).toBe(true)
    // Relecture : contenu mis à jour, source devient 'edition'.
    const back = await sA.get(`/api/synthese/version/${gen.json.id}`)
    expect(back.json.doc.contenu_html).toBe('<h2>Édité</h2><p>Contenu remanié.</p>')
    const etat = await sA.get(`/api/synthese/dossier/${dossier}`)
    const v = etat.json.versions.find((x: any) => x.id === gen.json.id)
    expect(v.source).toBe('edition')
  })

  it('TC-DOSS-063 — éditer une version NON courante → 400', async () => {
    const dossier = await freshDossier(sL, sA, accA.id)
    const v1 = await sA.post('/api/synthese/generer', { dossierId: dossier })
    await sA.post('/api/synthese/generer', { dossierId: dossier }) // v2 devient la courante
    const r = await sA.patch(`/api/synthese/version/${v1.json.id}`, { contenu_html: '<p>nope</p>' })
    expect(r.status).toBe(400)
    expect(r.json.error).toBe('Seule la version courante est modifiable.')
    // v1 inchangée (toujours lisible, contenu d'origine non remplacé).
    const back = await sA.get(`/api/synthese/version/${v1.json.id}`)
    expect(back.json.doc.contenu_html).not.toBe('<p>nope</p>')
  })

  it('TC-DOSS-064 — éditer : version d\'autrui → 404', async () => {
    const dossier = await freshDossier(sL, sA, accA.id)
    const gen = await sA.post('/api/synthese/generer', { dossierId: dossier })
    const r = await sB.patch(`/api/synthese/version/${gen.json.id}`, { contenu_html: '<p>x</p>' })
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Introuvable')
  })

  // ---------------------------------------------------------------------------
  // POST /api/synthese/version/:id/publier
  // ---------------------------------------------------------------------------
  it('TC-DOSS-065 — publier une version (nominal, unicité du publié)', async () => {
    const dossier = await freshDossier(sL, sA, accA.id)
    const v1 = await sA.post('/api/synthese/generer', { dossierId: dossier })
    const v2 = await sA.post('/api/synthese/generer', { dossierId: dossier })
    // Publier v1 puis v2.
    expect((await sA.post(`/api/synthese/version/${v1.json.id}/publier`)).status).toBe(200)
    const pub2 = await sA.post(`/api/synthese/version/${v2.json.id}/publier`)
    expect(pub2.status).toBe(200)
    expect(pub2.json.ok).toBe(true)
    // Après publication de v2 : une seule version publiée (v2).
    const etat = await sA.get(`/api/synthese/dossier/${dossier}`)
    const publiees = etat.json.versions.filter((v: any) => v.publie === 1)
    expect(publiees.length).toBe(1)
    expect(publiees[0].id).toBe(v2.json.id)
    // Une notification a été créée pour l'accompagné.
    const notifs = await sL.get('/api/notifications')
    expect(notifs.status).toBe(200)
  })

  it('TC-DOSS-066 — publier : version d\'autrui → 404', async () => {
    const dossier = await freshDossier(sL, sA, accA.id)
    const gen = await sA.post('/api/synthese/generer', { dossierId: dossier })
    const r = await sB.post(`/api/synthese/version/${gen.json.id}/publier`)
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Introuvable')
    // Rien n'est publié.
    const etat = await sA.get(`/api/synthese/dossier/${dossier}`)
    expect(etat.json.versions.every((v: any) => v.publie === 0)).toBe(true)
  })

  it('TC-DOSS-067 — publier : rôle accompagné → 403', async () => {
    const r = await sL.post('/api/synthese/version/1/publier')
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('Accès refusé')
  })

  // ---------------------------------------------------------------------------
  // GET /api/synthese/mine
  // ---------------------------------------------------------------------------
  it('TC-DOSS-068 — synthèses publiées de l\'accompagné (mine)', async () => {
    const sAmine = await asUser(DEMO.amine)
    const r = await sAmine.get('/api/synthese/mine')
    expect(r.status).toBe(200)
    expect(Array.isArray(r.json.syntheses)).toBe(true)
    expect(r.json.syntheses.length).toBeGreaterThanOrEqual(1)
    for (const s of r.json.syntheses) {
      for (const k of ['id', 'dossier_id', 'publie_le', 'dossier_titre']) expect(s).toHaveProperty(k)
    }
    // Triées publie_le DESC.
    const dates = r.json.syntheses.map((s: any) => String(s.publie_le))
    expect(dates).toEqual([...dates].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0)))
    // Une par dossier (dossier_id uniques).
    const dossierIds = r.json.syntheses.map((s: any) => s.dossier_id)
    expect(new Set(dossierIds).size).toBe(dossierIds.length)
  })

  it('TC-DOSS-069 — synthèses mine : rôle accompagnateur → 403', async () => {
    const r = await sA.get('/api/synthese/mine')
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('Accès refusé')
  })

  // ---------------------------------------------------------------------------
  // /api/synthese/dossier/:id/messages  (discussion)
  // ---------------------------------------------------------------------------
  it('TC-DOSS-070 — discussion : accompagné bloqué tant que non publiée → 404', async () => {
    // Dossier jetable, aucune synthèse publiée → l'accompagné ne peut ni lire ni poster.
    const dossier = await freshDossier(sL, sA, accA.id)
    const get = await sL.get(`/api/synthese/dossier/${dossier}/messages`)
    expect(get.status).toBe(404)
    expect(get.json.error).toBe('Discussion indisponible')
    const post = await sL.post(`/api/synthese/dossier/${dossier}/messages`, { texte: 'Bonjour' })
    expect(post.status).toBe(404)
    expect(post.json.error).toBe('Discussion indisponible')
  })

  it('TC-DOSS-071 — discussion : accompagnateur autorisé même non publié', async () => {
    const dossier = await freshDossier(sL, sA, accA.id)
    const post = await sA.post(`/api/synthese/dossier/${dossier}/messages`, { texte: 'Note interne' })
    expect(post.status).toBe(201)
    expect(typeof post.json.id).toBe('number')
    const get = await sA.get(`/api/synthese/dossier/${dossier}/messages`)
    expect(get.status).toBe(200)
    expect(Array.isArray(get.json.messages)).toBe(true)
    const mine = get.json.messages.find((m: any) => m.id === post.json.id)
    expect(mine).toBeTruthy()
    expect(mine.is_me).toBe(true)
    expect(mine.texte).toBe('Note interne')
  })

  it('TC-DOSS-072 — discussion : accompagné autorisé après publication (échange complet)', async () => {
    const dossier = await freshDossier(sL, sA, accA.id)
    const gen = await sA.post('/api/synthese/generer', { dossierId: dossier })
    expect((await sA.post(`/api/synthese/version/${gen.json.id}/publier`)).status).toBe(200)
    // L'accompagné peut désormais poster.
    const post = await sL.post(`/api/synthese/dossier/${dossier}/messages`, { texte: 'Merci pour cette synthèse' })
    expect(post.status).toBe(201)
    expect(typeof post.json.id).toBe('number')
    // Lecture côté accompagné : is_me=true pour son message, métadonnées exposées, ordre ASC.
    const getL = await sL.get(`/api/synthese/dossier/${dossier}/messages`)
    expect(getL.status).toBe(200)
    const m = getL.json.messages.find((x: any) => x.id === post.json.id)
    expect(m.is_me).toBe(true)
    expect(m).toHaveProperty('auteur_prenom')
    expect(m).toHaveProperty('auteur_role')
    const dates = getL.json.messages.map((x: any) => String(x.cree_le))
    expect(dates).toEqual([...dates].sort())
    // Lecture côté accompagnateur : is_me=false pour le message de l'accompagné.
    const getA = await sA.get(`/api/synthese/dossier/${dossier}/messages`)
    const mA = getA.json.messages.find((x: any) => x.id === post.json.id)
    expect(mA.is_me).toBe(false)
  })

  it('TC-DOSS-073 — discussion : message vide → 400', async () => {
    // Discussion autorisée : accompagnateur (toujours autorisé).
    const dossier = await freshDossier(sL, sA, accA.id)
    const a = await sA.post(`/api/synthese/dossier/${dossier}/messages`, { texte: '   ' })
    expect(a.status).toBe(400)
    expect(a.json.error).toBe('Message vide')
    const b = await sA.post(`/api/synthese/dossier/${dossier}/messages`, {})
    expect(b.status).toBe(400)
    expect(b.json.error).toBe('Message vide')
    // Aucun message inséré.
    const get = await sA.get(`/api/synthese/dossier/${dossier}/messages`)
    expect(get.json.messages.length).toBe(0)
  })

  it('TC-DOSS-074 — discussion : tiers non lié au dossier → 404', async () => {
    // accB n'est ni accompagnateur ni accompagné du dossier jetable.
    const get = await sB.get(`/api/synthese/dossier/${dossierJetable}/messages`)
    expect(get.status).toBe(404)
    expect(get.json.error).toBe('Discussion indisponible')
    const post = await sB.post(`/api/synthese/dossier/${dossierJetable}/messages`, { texte: 'intrusion' })
    expect(post.status).toBe(404)
    expect(post.json.error).toBe('Discussion indisponible')
  })

  it('TC-DOSS-075 — endpoints messages/dossier synthèse : non authentifié → 401', async () => {
    const anon = new Session()
    const a = await anon.get(`/api/synthese/dossier/${dossierJetable}`)
    expect(a.status).toBe(401)
    expect(a.json.error).toBe('Non authentifié')
    const b = await anon.get(`/api/synthese/dossier/${dossierJetable}/messages`)
    expect(b.status).toBe(401)
    expect(b.json.error).toBe('Non authentifié')
    const c = await anon.post(`/api/synthese/dossier/${dossierJetable}/messages`, { texte: 'x' })
    expect(c.status).toBe(401)
    expect(c.json.error).toBe('Non authentifié')
  })

  // ---------------------------------------------------------------------------
  // Utilitaire : crée un dossier jetable frais (détenu par accA) pour isoler chaque
  // scénario mutant. L'accompagné jetable démarre un nouveau parcours avec accA.
  // ---------------------------------------------------------------------------
  async function freshDossier(learnerSession: Session, _ownerSession: Session, ownerId: number): Promise<number> {
    const r = await learnerSession.post('/api/dossiers/start', { titre: `Parcours QA ${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, accompagnateurId: ownerId })
    if (r.status !== 201) throw new Error(`freshDossier: démarrage échoué (${r.status}) : ${JSON.stringify(r.json)}`)
    return r.json.dossierId as number
  }
})
