import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Session, asUser, DEMO } from '../helpers/api'
import { createTestUser, deleteTestUser, type TestUser } from '../helpers/fixtures'

// Tests d'intégration API du domaine « relemerg » (Relationnel & émotionnel + Émergence + Transparence + Miroir).
// Sources lues :
//   - app/api/src/relationnel.ts  (/api/relationnel/* : météo intérieure + micro-journal)
//   - app/api/src/emergence.ts    (/api/emergence/*   : banque de questions, fil rouge, moments-clés, lecture /mine)
//   - app/api/src/transparence.ts (/api/transparence/*: tableau RGPD + demande d'effacement)
//   - app/api/src/miroir.ts       (/api/miroir/*      : analyse réflexive de posture + application des scores)
//
// Règles de conception (cf. CONVENTIONS.md) :
//   - Découverte dynamique des ids : aucun id numérique en dur. On crée un BAC À SABLE isolé via deux comptes
//     jetables @boussole.test (un accompagnateur accA + un accompagné accP). accP démarre un parcours en
//     choisissant accA (POST /api/dossiers/start), ce qui donne un dossier dT possédé des deux côtés, puis accA
//     ouvre une session sT (POST /api/entretien/sessions) qu'on remplit d'une question + réponse.
//     → Tous les écrits destructifs/stateful (météo, journal, banque, fil rouge, moments, miroir, effacement)
//       se font sur ce bac à sable jetable. On ne touche JAMAIS au dossier vitrine D1 (Amine/Mohamed) en écriture.
//   - Endpoints IA (banque, fil rouge, moments, miroir) : on vérifie le CONTRAT (statut, présence/typage des
//     champs, non-vacuité garantie, gating, persistance/relecture) et source ∈ {'ia','heuristique'} — jamais le texte.
//   - Gating 403 (transparence/miroir = requireFeature serveur) : compte jetable affecté au plan « Découverte »
//     (socle, sans 'transparence' ni 'miroir'). Le requireFeature s'exécute AVANT le contrôle de propriété, donc
//     un id quelconque suffit pour observer le 403.
//   - Nettoyage : tous les comptes jetables sont supprimés en afterAll (RGPD admin, cascade).

describe('relemerg — relationnel, émergence, transparence, miroir', () => {
  let admin: Session
  let mohamed: Session // accompagnateur vitrine (sans plan → toutes features) ; possède D1 (Amine)
  let camille: Session // second accompagnateur (dossiers distincts de Mohamed)
  let amine: Session // accompagné vitrine (sans plan → toutes features) ; possède D1 (avec Mohamed) et D2 (avec Camille)
  let lea: Session // autre accompagné (dossiers non liés à Amine)

  // Bac à sable jetable
  let accA: TestUser // accompagnateur jetable (possède dT, sT)
  let accASession: Session
  let accP: TestUser // accompagné jetable (possède dT)
  let accPSession: Session
  let dT = 0 // dossier jetable (accP accompagné, accA accompagnateur)
  let sT = 0 // session jetable du dossier dT
  let qT = 0 // question (avec réponse) de la session sT

  // Compte accompagnateur jetable affecté au plan « Découverte » (sans 'miroir' ni 'banque_questions' côté feature)
  let gatedAcc: TestUser
  let gatedAccSession: Session
  // Compte accompagné jetable affecté au plan « Découverte » (sans 'transparence')
  let gatedAccP: TestUser
  let gatedAccPSession: Session

  let decouvertePlanId = 0

  // Ids du dossier vitrine D1 (Amine + Mohamed) et d'une de ses sessions — découverts dynamiquement.
  let d1 = 0
  let d1Session = 0
  // Un dossier d'autrui pour les tests de propriété (dossier de Léa, jamais lié à Amine ni à accP).
  let dLea = 0

  beforeAll(async () => {
    admin = await asUser(DEMO.admin)
    mohamed = await asUser(DEMO.mohamed)
    camille = await asUser(DEMO.camille)
    amine = await asUser(DEMO.amine)
    lea = await asUser(DEMO.lea)

    // --- Découverte du dossier vitrine D1 (Amine + Mohamed) côté accompagné ---
    const mine = await amine.get('/api/dossiers/mine')
    expect(mine.status).toBe(200)
    const dossiersAmine: Array<{ id: number; titre: string; acc_email: string }> = mine.json.dossiers
    const d1Row = dossiersAmine.find((d) => d.acc_email === DEMO.mohamed.email)
    if (!d1Row) throw new Error('Dossier vitrine D1 (Amine + Mohamed) introuvable')
    d1 = d1Row.id

    // Une session de D1 (côté Mohamed) pour les lectures de moments-clés/miroir partagés.
    const dash = await mohamed.get('/api/entretien/dashboard')
    expect(dash.status).toBe(200)
    const detailD1 = await mohamed.get(`/api/dossiers/${d1}`)
    expect(detailD1.status).toBe(200)
    const sessionsD1: Array<{ id: number }> = detailD1.json.sessions
    expect(sessionsD1.length).toBeGreaterThan(0)
    d1Session = sessionsD1[0].id

    // --- Un dossier de Léa (chez Mohamed), jamais lié à Amine ni au bac à sable ---
    const dashMohamed = await mohamed.get('/api/entretien/dossiers')
    expect(dashMohamed.status).toBe(200)
    const dossiersMohamed: Array<{ id: number; accompagne_email: string }> = dashMohamed.json.dossiers
    const dLeaRow = dossiersMohamed.find((d) => d.accompagne_email === DEMO.lea.email)
    if (!dLeaRow) throw new Error('Dossier de Léa (chez Mohamed) introuvable')
    dLea = dLeaRow.id

    // --- Plan « Découverte » (socle, sans transparence/miroir/banque…) ---
    const plansRes = await admin.get('/api/admin/plans')
    expect(plansRes.status).toBe(200)
    const plans: Array<{ id: number; nom: string; features: string[] }> = plansRes.json.plans
    const decouverte = plans.find((p) => p.nom === 'Découverte')
    if (!decouverte) throw new Error('Plan « Découverte » introuvable (seed plans manquant ?)')
    // Garde-fous : le socle n'inclut aucune des features gatées de ce domaine.
    expect(decouverte.features).not.toContain('transparence')
    expect(decouverte.features).not.toContain('miroir')
    decouvertePlanId = decouverte.id

    // --- Bac à sable jetable : accA (accompagnateur) + accP (accompagné), reliés par un parcours démarré par accP ---
    accA = await createTestUser(admin, 'accompagnateur', 'relemerg-acc')
    accASession = await asUser({ email: accA.email, password: accA.password })
    accP = await createTestUser(admin, 'accompagne', 'relemerg-acp')
    accPSession = await asUser({ email: accP.email, password: accP.password })

    // accP démarre un parcours en choisissant accA → crée le lien + le dossier dT.
    const accs = await accPSession.get('/api/dossiers/accompagnateurs')
    expect(accs.status).toBe(200)
    const accChoice = (accs.json.accompagnateurs as Array<{ id: number; email: string }>).find((a) => a.email === accA.email)
    if (!accChoice) throw new Error('Accompagnateur jetable introuvable dans la liste de choix')
    const started = await accPSession.post('/api/dossiers/start', { titre: 'Bac à sable relemerg', accompagnateurId: accChoice.id })
    expect(started.status).toBe(201)
    dT = started.json.dossierId
    expect(typeof dT).toBe('number')

    // accA ouvre une session d'entretien sur dT et y ajoute une question répondue (pour des fallbacks non vides).
    const sess = await accASession.post('/api/entretien/sessions', { dossierId: dT })
    expect(sess.status).toBe(200)
    sT = sess.json.sessionId
    expect(typeof sT).toBe('number')
    const addQ = await accASession.post(`/api/entretien/sessions/${sT}/questions`, { phase: '0', texte: 'Comment décrirais-tu ta situation aujourd’hui ?' })
    expect(addQ.status).toBe(201)
    qT = addQ.json.id
    const setRep = await accASession.patch(`/api/entretien/sessions/${sT}/questions/${qT}`, { reponse: 'Je me sens prêt à avancer même si tout reste à structurer dans mon mémoire.' })
    expect(setRep.status).toBe(200)
    // Une note de phase pour enrichir le contexte du miroir.
    await accASession.post(`/api/entretien/sessions/${sT}/reponses`, { phase: '0', texte: 'Cadre posé, bonne alliance.' })

    // --- Comptes jetables gatés sur le plan « Découverte » ---
    gatedAcc = await createTestUser(admin, 'accompagnateur', 'relemerg-gate-acc')
    expect((await admin.patch(`/api/admin/users/${gatedAcc.id}`, { plan_id: decouvertePlanId })).status).toBe(200)
    gatedAccSession = await asUser({ email: gatedAcc.email, password: gatedAcc.password })

    gatedAccP = await createTestUser(admin, 'accompagne', 'relemerg-gate-acp')
    expect((await admin.patch(`/api/admin/users/${gatedAccP.id}`, { plan_id: decouvertePlanId })).status).toBe(200)
    gatedAccPSession = await asUser({ email: gatedAccP.email, password: gatedAccP.password })
  })

  afterAll(async () => {
    // Suppression des comptes jetables uniquement (jamais de dégradation des comptes démo).
    // dT, sT et toutes les données associées partent en cascade avec accP/accA.
    if (gatedAccP) await deleteTestUser(admin, gatedAccP)
    if (gatedAcc) await deleteTestUser(admin, gatedAcc)
    if (accP) await deleteTestUser(admin, accP)
    if (accA) await deleteTestUser(admin, accA)
  })

  // ======================================================================================
  // Météo intérieure — POST /api/relationnel/meteo
  // ======================================================================================

  it('TC-REL-001 — météo : relevé valide (accompagné) → 201 { id, niveau, mot }', async () => {
    const r = await accPSession.post('/api/relationnel/meteo', { dossierId: dT, niveau: 4, mot: 'serein' })
    expect(r.status).toBe(201)
    expect(typeof r.json.id).toBe('number')
    expect(r.json.niveau).toBe(4)
    expect(r.json.mot).toBe('serein')
  })

  it('TC-REL-002 — météo : sans le mot facultatif → 201, mot=null', async () => {
    const r = await accPSession.post('/api/relationnel/meteo', { dossierId: dT, niveau: 3 })
    expect(r.status).toBe(201)
    expect(r.json.niveau).toBe(3)
    expect(r.json.mot).toBeNull()
  })

  it('TC-REL-003 — météo : bornes du niveau (1 et 5 acceptés) → 201', async () => {
    const r1 = await accPSession.post('/api/relationnel/meteo', { dossierId: dT, niveau: 1 })
    expect(r1.status).toBe(201)
    expect(r1.json.niveau).toBe(1)
    const r5 = await accPSession.post('/api/relationnel/meteo', { dossierId: dT, niveau: 5 })
    expect(r5.status).toBe(201)
    expect(r5.json.niveau).toBe(5)
  })

  it('TC-REL-004 — météo : niveau hors plage écrêté (Math.min/Math.max → 1..5)', async () => {
    // niveau=9 → Math.min(5, 9) = 5
    const rHigh = await accPSession.post('/api/relationnel/meteo', { dossierId: dT, niveau: 9 })
    expect(rHigh.status).toBe(201)
    expect(rHigh.json.niveau).toBe(5)
    // niveau=-2 → Math.max(1, Math.min(5, -2)) = 1 (donc truthy, pas de 400)
    const rLow = await accPSession.post('/api/relationnel/meteo', { dossierId: dT, niveau: -2 })
    expect(rLow.status).toBe(201)
    expect(rLow.json.niveau).toBe(1)
  })

  it('TC-REL-005 — météo : niveau manquant / non numérique / 0 → clampé à 1 (201, jamais 400)', async () => {
    // Comportement RÉEL : niveau = Math.max(1, Math.min(5, Number(req.body.niveau)||0)) → toujours ≥ 1.
    // Le garde-fou `if (!niveau)` est donc du code mort : aucune entrée ne produit 400, tout est clampé à [1,5].
    const rMissing = await accPSession.post('/api/relationnel/meteo', { dossierId: dT })
    expect(rMissing.status).toBe(201)
    expect(rMissing.json.niveau).toBe(1)
    const rNaN = await accPSession.post('/api/relationnel/meteo', { dossierId: dT, niveau: 'abc' })
    expect(rNaN.status).toBe(201)
    expect(rNaN.json.niveau).toBe(1)
    const rZero = await accPSession.post('/api/relationnel/meteo', { dossierId: dT, niveau: 0 })
    expect(rZero.status).toBe(201)
    expect(rZero.json.niveau).toBe(1)
  })

  it('TC-REL-006 — météo : mot tronqué à 120 caractères (slice(0,120).trim())', async () => {
    const longMot = 'a'.repeat(200)
    const r = await accPSession.post('/api/relationnel/meteo', { dossierId: dT, niveau: 3, mot: longMot })
    expect(r.status).toBe(201)
    expect(typeof r.json.mot).toBe('string')
    expect(r.json.mot.length).toBe(120)
  })

  it('TC-REL-007 — météo : POST non authentifié → 401', async () => {
    const anon = new Session()
    const r = await anon.post('/api/relationnel/meteo', { dossierId: dT, niveau: 3 })
    expect(r.status).toBe(401)
    expect(r.json.error).toBe('Non authentifié')
  })

  it('TC-REL-008 — météo : POST sur un dossier d\'autrui → 404 (access null)', async () => {
    // accP n'est lié qu'à dT ; dLea ne lui appartient pas.
    const r = await accPSession.post('/api/relationnel/meteo', { dossierId: dLea, niveau: 3 })
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Dossier introuvable')
  })

  it('TC-REL-009 — météo : l\'accompagnateur enregistre son propre check (role=\'accompagnateur\')', async () => {
    const r = await accASession.post('/api/relationnel/meteo', { dossierId: dT, niveau: 2, mot: 'fatigué' })
    expect(r.status).toBe(201)
    expect(r.json.niveau).toBe(2)
    expect(r.json.mot).toBe('fatigué')
    // Le check apparaît dans « mine » côté accompagnateur (filtré par role='accompagnateur' ET auteur_id).
    const list = await accASession.get(`/api/relationnel/meteo/dossier/${dT}`)
    expect(list.status).toBe(200)
    const ids = (list.json.mine as Array<{ id: number }>).map((m) => m.id)
    expect(ids).toContain(r.json.id)
  })

  it('TC-REL-010 — météo : dossierId absent / non numérique → 404 (access null sur NaN)', async () => {
    const rMissing = await accPSession.post('/api/relationnel/meteo', { niveau: 3 })
    expect(rMissing.status).toBe(404)
    expect(rMissing.json.error).toBe('Dossier introuvable')
    const rText = await accPSession.post('/api/relationnel/meteo', { dossierId: 'x', niveau: 3 })
    expect(rText.status).toBe(404)
    expect(rText.json.error).toBe('Dossier introuvable')
  })

  // ======================================================================================
  // Météo intérieure — GET /api/relationnel/meteo/dossier/:id
  // ======================================================================================

  it('TC-REL-011 — météo : lecture côté accompagné (mine peuplé, autre vide ; tri desc ≤30)', async () => {
    const r = await accPSession.get(`/api/relationnel/meteo/dossier/${dT}`)
    expect(r.status).toBe(200)
    expect(Array.isArray(r.json.mine)).toBe(true)
    expect(Array.isArray(r.json.autre)).toBe(true)
    expect(r.json.autre).toEqual([]) // l'accompagné ne voit jamais « autre »
    expect(r.json.mine.length).toBeGreaterThan(0)
    expect(r.json.mine.length).toBeLessThanOrEqual(30)
    for (const m of r.json.mine) {
      expect(typeof m.id).toBe('number')
      expect(typeof m.niveau).toBe('number')
      expect(typeof m.cree_le).toBe('string')
      expect(m.mot === null || typeof m.mot === 'string').toBe(true)
    }
    // Tri décroissant par cree_le (puis id) : la séquence de cree_le est non croissante.
    const dates = (r.json.mine as Array<{ cree_le: string }>).map((m) => m.cree_le)
    for (let i = 1; i < dates.length; i++) expect(dates[i - 1] >= dates[i]).toBe(true)
  })

  it('TC-REL-012 — météo : lecture côté accompagnateur (mine = ses propres checks ; autre = météo accompagné)', async () => {
    const r = await accASession.get(`/api/relationnel/meteo/dossier/${dT}`)
    expect(r.status).toBe(200)
    // mine : uniquement role='accompagnateur' ET auteur_id=moi → on a posté au moins un check en TC-REL-009.
    expect(r.json.mine.length).toBeGreaterThan(0)
    // autre : la météo de l'accompagné (role='accompagne'), peuplée par les POST de accP plus haut.
    expect(r.json.autre.length).toBeGreaterThan(0)
    for (const m of r.json.autre) {
      expect(typeof m.id).toBe('number')
      expect(typeof m.niveau).toBe('number')
    }
  })

  it('TC-REL-013 — météo : lecture d\'un dossier d\'autrui → 404', async () => {
    const r = await accPSession.get(`/api/relationnel/meteo/dossier/${dLea}`)
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Dossier introuvable')
  })

  it('TC-REL-014 — météo : lecture non authentifiée → 401', async () => {
    const anon = new Session()
    const r = await anon.get(`/api/relationnel/meteo/dossier/${dT}`)
    expect(r.status).toBe(401)
    expect(r.json.error).toBe('Non authentifié')
  })

  // ======================================================================================
  // Micro-journal — POST/GET/PATCH/DELETE /api/relationnel/journal
  // ======================================================================================

  it('TC-REL-015 — journal : créer une note partagée → 201 { id, texte, partage:1, cree_le }', async () => {
    const r = await accPSession.post('/api/relationnel/journal', { dossierId: dT, texte: 'Avancée sur le plan', partage: true })
    expect(r.status).toBe(201)
    expect(typeof r.json.id).toBe('number')
    expect(r.json.texte).toBe('Avancée sur le plan')
    expect(r.json.partage).toBe(1)
    expect(typeof r.json.cree_le).toBe('string')
  })

  it('TC-REL-016 — journal : note privée (partage absent → 0)', async () => {
    const r = await accPSession.post('/api/relationnel/journal', { dossierId: dT, texte: 'Note perso' })
    expect(r.status).toBe(201)
    expect(r.json.partage).toBe(0)
  })

  it('TC-REL-017 — journal : note vide (espaces / absente) → 400 { error:\'Note vide\' }', async () => {
    const rSpaces = await accPSession.post('/api/relationnel/journal', { dossierId: dT, texte: '   ' })
    expect(rSpaces.status).toBe(400)
    expect(rSpaces.json.error).toBe('Note vide')
    const rMissing = await accPSession.post('/api/relationnel/journal', { dossierId: dT })
    expect(rMissing.status).toBe(400)
    expect(rMissing.json.error).toBe('Note vide')
  })

  it('TC-REL-018 — journal : un accompagnateur ne peut pas créer de note → 404 (access !== accompagne)', async () => {
    // accA accompagne bien dT, mais le rôle d'accès est 'accompagnateur', pas 'accompagne'.
    const r = await accASession.post('/api/relationnel/journal', { dossierId: dT, texte: 'test' })
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Parcours introuvable')
  })

  it('TC-REL-019 — journal : créer sur un dossier d\'autrui → 404', async () => {
    const r = await accPSession.post('/api/relationnel/journal', { dossierId: dLea, texte: 'x' })
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Parcours introuvable')
  })

  it('TC-REL-020 — journal : création non authentifiée → 401', async () => {
    const anon = new Session()
    const r = await anon.post('/api/relationnel/journal', { dossierId: dT, texte: 'x' })
    expect(r.status).toBe(401)
    expect(r.json.error).toBe('Non authentifié')
  })

  it('TC-REL-021 — journal : lecture côté accompagné (toutes ses notes, privées + partagées, tri desc)', async () => {
    const r = await accPSession.get(`/api/relationnel/journal/dossier/${dT}`)
    expect(r.status).toBe(200)
    expect(Array.isArray(r.json.entrees)).toBe(true)
    const partages = (r.json.entrees as Array<{ partage: number }>).map((e) => e.partage)
    // L'accompagné voit ses notes partagées (1) ET privées (0) — on a créé les deux.
    expect(partages).toContain(1)
    expect(partages).toContain(0)
    for (const e of r.json.entrees) {
      expect(typeof e.id).toBe('number')
      expect(typeof e.texte).toBe('string')
    }
    const dates = (r.json.entrees as Array<{ cree_le: string }>).map((e) => e.cree_le)
    for (let i = 1; i < dates.length; i++) expect(dates[i - 1] >= dates[i]).toBe(true)
  })

  it('TC-REL-022 — journal : lecture côté accompagnateur (notes partagées uniquement)', async () => {
    const r = await accASession.get(`/api/relationnel/journal/dossier/${dT}`)
    expect(r.status).toBe(200)
    expect(Array.isArray(r.json.entrees)).toBe(true)
    // L'accompagnateur ne voit QUE partage=1 (au moins la note partagée de TC-REL-015).
    expect(r.json.entrees.length).toBeGreaterThan(0)
    for (const e of r.json.entrees) expect(e.partage).toBe(1)
  })

  it('TC-REL-023 — journal : lecture d\'un dossier d\'autrui → 404', async () => {
    const r = await accPSession.get(`/api/relationnel/journal/dossier/${dLea}`)
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Dossier introuvable')
  })

  it('TC-REL-024 — journal : modifier le texte d\'une note dont je suis l\'auteur → 200 { ok:true }', async () => {
    const created = await accPSession.post('/api/relationnel/journal', { dossierId: dT, texte: 'Texte initial', partage: false })
    expect(created.status).toBe(201)
    const noteId = created.json.id
    const patched = await accPSession.patch(`/api/relationnel/journal/${noteId}`, { texte: 'Texte révisé' })
    expect(patched.status).toBe(200)
    expect(patched.json.ok).toBe(true)
    // Relecture : le texte est mis à jour.
    const after = await accPSession.get(`/api/relationnel/journal/dossier/${dT}`)
    const row = (after.json.entrees as Array<{ id: number; texte: string; maj_le: string | null }>).find((e) => e.id === noteId)
    expect(row).toBeTruthy()
    expect(row!.texte).toBe('Texte révisé')
    expect(row!.maj_le).toBeTruthy() // maj_le renseigné par datetime('now')
  })

  it('TC-REL-025 — journal : basculer le partage via PATCH (visibilité côté accompagnateur)', async () => {
    const created = await accPSession.post('/api/relationnel/journal', { dossierId: dT, texte: 'Note à partager', partage: false })
    const noteId = created.json.id
    // partage:1 → visible côté accompagnateur
    expect((await accPSession.patch(`/api/relationnel/journal/${noteId}`, { partage: 1 })).status).toBe(200)
    let accView = await accASession.get(`/api/relationnel/journal/dossier/${dT}`)
    expect((accView.json.entrees as Array<{ id: number }>).some((e) => e.id === noteId)).toBe(true)
    // partage:0 → masquée côté accompagnateur
    expect((await accPSession.patch(`/api/relationnel/journal/${noteId}`, { partage: 0 })).status).toBe(200)
    accView = await accASession.get(`/api/relationnel/journal/dossier/${dT}`)
    expect((accView.json.entrees as Array<{ id: number }>).some((e) => e.id === noteId)).toBe(false)
  })

  it('TC-REL-026 — journal : PATCH avec texte vide → 400 { error:\'Note vide\' }', async () => {
    const created = await accPSession.post('/api/relationnel/journal', { dossierId: dT, texte: 'Existante' })
    const r = await accPSession.patch(`/api/relationnel/journal/${created.json.id}`, { texte: '   ' })
    expect(r.status).toBe(400)
    expect(r.json.error).toBe('Note vide')
  })

  it('TC-REL-027 — journal : PATCH sans aucun champ → no-op 200 { ok:true }', async () => {
    const created = await accPSession.post('/api/relationnel/journal', { dossierId: dT, texte: 'Inchangée' })
    const r = await accPSession.patch(`/api/relationnel/journal/${created.json.id}`, {})
    expect(r.status).toBe(200)
    expect(r.json.ok).toBe(true)
    // Le texte n'a pas changé.
    const after = await accPSession.get(`/api/relationnel/journal/dossier/${dT}`)
    const row = (after.json.entrees as Array<{ id: number; texte: string }>).find((e) => e.id === created.json.id)
    expect(row!.texte).toBe('Inchangée')
  })

  it('TC-REL-028 — journal : PATCH une note d\'un autre utilisateur → 404 (WHERE accompagne_id=me)', async () => {
    // Note créée par accP ; un autre accompagné (Léa) ne peut pas la modifier.
    const created = await accPSession.post('/api/relationnel/journal', { dossierId: dT, texte: 'Note de accP' })
    const r = await lea.patch(`/api/relationnel/journal/${created.json.id}`, { texte: 'hack' })
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Note introuvable')
  })

  it('TC-REL-029 — journal : supprimer une note dont je suis l\'auteur → 200 { ok:true }', async () => {
    const created = await accPSession.post('/api/relationnel/journal', { dossierId: dT, texte: 'À supprimer' })
    const noteId = created.json.id
    const del = await accPSession.del(`/api/relationnel/journal/${noteId}`)
    expect(del.status).toBe(200)
    expect(del.json.ok).toBe(true)
    // La note n'est plus dans la liste.
    const after = await accPSession.get(`/api/relationnel/journal/dossier/${dT}`)
    expect((after.json.entrees as Array<{ id: number }>).some((e) => e.id === noteId)).toBe(false)
  })

  it('TC-REL-030 — journal : supprimer une note inexistante / d\'autrui → 404', async () => {
    const r = await accPSession.del('/api/relationnel/journal/999999')
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Note introuvable')
  })

  it('TC-REL-031 — journal : DELETE non authentifié → 401', async () => {
    const anon = new Session()
    const r = await anon.del('/api/relationnel/journal/1')
    expect(r.status).toBe(401)
    expect(r.json.error).toBe('Non authentifié')
  })

  // ======================================================================================
  // Émergence — banque de questions : POST/GET /api/emergence/dossier/:did/banque
  // ======================================================================================

  it('TC-REL-036 — banque : générer (contrat IA) + persistance/relecture (upsert)', async () => {
    const r = await accASession.post(`/api/emergence/dossier/${dT}/banque`)
    expect(r.status).toBe(200)
    expect(['ia', 'heuristique']).toContain(r.json.source)
    const banque = r.json.banque
    expect(banque && typeof banque === 'object').toBe(true)
    // Clés '0'..'5' → tableaux de chaînes non vides.
    for (const k of ['0', '1', '2', '3', '4', '5']) {
      expect(Array.isArray(banque[k])).toBe(true)
      expect(banque[k].length).toBeGreaterThan(0)
      for (const q of banque[k]) {
        expect(typeof q).toBe('string')
        expect(q.length).toBeGreaterThan(0)
      }
    }
    // Relecture GET → même banque persistée.
    const read = await accASession.get(`/api/emergence/dossier/${dT}/banque`)
    expect(read.status).toBe(200)
    expect(read.json.banque).toEqual(banque)
  })

  it('TC-REL-038 — banque : régénération (ON CONFLICT) écrase la précédente', async () => {
    const r1 = await accASession.post(`/api/emergence/dossier/${dT}/banque`)
    expect(r1.status).toBe(200)
    const r2 = await accASession.post(`/api/emergence/dossier/${dT}/banque`)
    expect(r2.status).toBe(200)
    // Après deux générations, la relecture renvoie une banque unique cohérente (clés '0'..'5').
    const read = await accASession.get(`/api/emergence/dossier/${dT}/banque`)
    expect(read.status).toBe(200)
    for (const k of ['0', '1', '2', '3', '4', '5']) expect(Array.isArray(read.json.banque[k])).toBe(true)
    // Le contenu relu correspond à la DERNIÈRE génération.
    expect(read.json.banque).toEqual(r2.json.banque)
  })

  it('TC-REL-039 — banque : non-propriétaire du dossier → 404 (ownsDossier false)', async () => {
    // Camille ne possède pas dT (accompagné par accA).
    const r = await camille.post(`/api/emergence/dossier/${dT}/banque`)
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Dossier introuvable')
  })

  it('TC-REL-040 — banque : rôle accompagné interdit → 403 (requireRole)', async () => {
    const r = await accPSession.post(`/api/emergence/dossier/${dT}/banque`)
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('Accès refusé')
  })

  it('TC-REL-041 — banque : non authentifié → 401', async () => {
    const anon = new Session()
    const r = await anon.post(`/api/emergence/dossier/${dT}/banque`)
    expect(r.status).toBe(401)
    expect(r.json.error).toBe('Non authentifié')
  })

  it('TC-REL-042 — banque : lecture avant génération → 200 { banque:null }', async () => {
    // Nouveau dossier vierge (jamais de banque) : on en crée un éphémère via le bac à sable.
    const started = await accPSession.post('/api/dossiers/start', { titre: 'Dossier sans banque', accompagnateurId: (await getAccChoiceId()) })
    expect(started.status).toBe(201)
    const freshDid = started.json.dossierId
    const r = await accASession.get(`/api/emergence/dossier/${freshDid}/banque`)
    expect(r.status).toBe(200)
    expect(r.json.banque).toBeNull()
  })

  // ======================================================================================
  // Émergence — fil rouge : POST/GET/PATCH /api/emergence/dossier/:did/fil-rouge[/partage]
  // ======================================================================================

  it('TC-REL-044 — fil rouge : générer (contrat IA + champs)', async () => {
    const r = await accASession.post(`/api/emergence/dossier/${dT}/fil-rouge`)
    expect(r.status).toBe(200)
    expect(['ia', 'heuristique']).toContain(r.json.source)
    expect(typeof r.json.fil).toBe('string')
    expect(r.json.fil.length).toBeGreaterThan(0)
    expect(Array.isArray(r.json.axes)).toBe(true)
    expect(typeof r.json.explication).toBe('string')
    expect([0, 1]).toContain(r.json.partage)
  })

  it('TC-REL-046 — fil rouge : relecture après génération → { filRouge:{ fil, axes, explication, partage } }', async () => {
    await accASession.post(`/api/emergence/dossier/${dT}/fil-rouge`) // garantit l'existence
    const r = await accASession.get(`/api/emergence/dossier/${dT}/fil-rouge`)
    expect(r.status).toBe(200)
    expect(r.json.filRouge).toBeTruthy()
    expect(typeof r.json.filRouge.fil).toBe('string')
    expect(Array.isArray(r.json.filRouge.axes)).toBe(true)
    expect(typeof r.json.filRouge.explication).toBe('string')
    expect([0, 1]).toContain(r.json.filRouge.partage)
  })

  it('TC-REL-047 — fil rouge : relecture avant génération → 200 { filRouge:null }', async () => {
    const started = await accPSession.post('/api/dossiers/start', { titre: 'Dossier sans fil rouge', accompagnateurId: (await getAccChoiceId()) })
    const freshDid = started.json.dossierId
    const r = await accASession.get(`/api/emergence/dossier/${freshDid}/fil-rouge`)
    expect(r.status).toBe(200)
    expect(r.json.filRouge).toBeNull()
  })

  it('TC-REL-048 — fil rouge : basculer le partage (PATCH) → visibilité côté accompagné /mine', async () => {
    await accASession.post(`/api/emergence/dossier/${dT}/fil-rouge`) // existence garantie
    // partage:1 → l'accompagné voit le fil rouge via /mine
    expect((await accASession.patch(`/api/emergence/dossier/${dT}/fil-rouge/partage`, { partage: 1 })).status).toBe(200)
    let mine = await accPSession.get(`/api/emergence/mine/dossier/${dT}`)
    expect(mine.status).toBe(200)
    expect(mine.json.filRouge).toBeTruthy()
    expect(typeof mine.json.filRouge.fil).toBe('string')
    // partage:0 → le fil rouge disparaît de /mine
    expect((await accASession.patch(`/api/emergence/dossier/${dT}/fil-rouge/partage`, { partage: 0 })).status).toBe(200)
    mine = await accPSession.get(`/api/emergence/mine/dossier/${dT}`)
    expect(mine.json.filRouge).toBeNull()
  })

  it('TC-REL-049 — fil rouge : non-propriétaire → 404 (POST / GET / PATCH)', async () => {
    // Camille ne possède pas dT.
    expect((await camille.post(`/api/emergence/dossier/${dT}/fil-rouge`)).status).toBe(404)
    const get = await camille.get(`/api/emergence/dossier/${dT}/fil-rouge`)
    expect(get.status).toBe(404)
    expect(get.json.error).toBe('Dossier introuvable')
    const patch = await camille.patch(`/api/emergence/dossier/${dT}/fil-rouge/partage`, { partage: 1 })
    expect(patch.status).toBe(404)
    expect(patch.json.error).toBe('Dossier introuvable')
  })

  it('TC-REL-050 — fil rouge : rôle accompagné → 403 (requireRole)', async () => {
    const r = await accPSession.post(`/api/emergence/dossier/${dT}/fil-rouge`)
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('Accès refusé')
  })

  // ======================================================================================
  // Émergence — moments-clés : POST/GET/PATCH /api/emergence/session/:sid/moments[/partage]
  // ======================================================================================

  it('TC-REL-052 — moments-clés : générer (contrat IA) → { moments:[{ verbatim, pourquoi }], partage, source }', async () => {
    const r = await accASession.post(`/api/emergence/session/${sT}/moments`)
    expect(r.status).toBe(200)
    expect(['ia', 'heuristique']).toContain(r.json.source)
    expect([0, 1]).toContain(r.json.partage)
    expect(Array.isArray(r.json.moments)).toBe(true)
    // La session sT a une question répondue → le repli produit au moins un moment ; l'IA aussi.
    expect(r.json.moments.length).toBeGreaterThan(0)
    for (const m of r.json.moments) {
      expect(typeof m.verbatim).toBe('string')
      expect(typeof m.pourquoi).toBe('string')
    }
  })

  it('TC-REL-055 — moments-clés : régénération (ON CONFLICT session_id) — une seule entrée par session', async () => {
    const r1 = await accASession.post(`/api/emergence/session/${sT}/moments`)
    expect(r1.status).toBe(200)
    const r2 = await accASession.post(`/api/emergence/session/${sT}/moments`)
    expect(r2.status).toBe(200)
    // La relecture renvoie un unique jeu de moments (upsert par session).
    const read = await accASession.get(`/api/emergence/session/${sT}/moments`)
    expect(read.status).toBe(200)
    expect(Array.isArray(read.json.moments)).toBe(true)
    expect(read.json.moments).toEqual(r2.json.moments)
  })

  it('TC-REL-056 — moments-clés : session d\'autrui → 404 (POST / GET / PATCH)', async () => {
    // d1Session appartient au dossier vitrine de Mohamed ; accA ne le possède pas.
    expect((await accASession.post(`/api/emergence/session/${d1Session}/moments`)).status).toBe(404)
    const get = await accASession.get(`/api/emergence/session/${d1Session}/moments`)
    expect(get.status).toBe(404)
    expect(get.json.error).toBe('Entretien introuvable')
    const patch = await accASession.patch(`/api/emergence/session/${d1Session}/moments/partage`, { partage: 1 })
    expect(patch.status).toBe(404)
    expect(patch.json.error).toBe('Entretien introuvable')
  })

  it('TC-REL-057 — moments-clés : rôle accompagné → 403', async () => {
    const r = await accPSession.post(`/api/emergence/session/${sT}/moments`)
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('Accès refusé')
  })

  it('TC-REL-058 — moments-clés : lecture avant génération → 200 { moments:null, partage:0 }', async () => {
    // Nouvelle session vierge sur un dossier frais → aucun moment.
    const started = await accPSession.post('/api/dossiers/start', { titre: 'Dossier sans moments', accompagnateurId: (await getAccChoiceId()) })
    const freshDid = started.json.dossierId
    const sess = await accASession.post('/api/entretien/sessions', { dossierId: freshDid })
    const freshSid = sess.json.sessionId
    const r = await accASession.get(`/api/emergence/session/${freshSid}/moments`)
    expect(r.status).toBe(200)
    expect(r.json.moments).toBeNull()
    expect(r.json.partage).toBe(0)
  })

  it('TC-REL-059 — moments-clés : basculer le partage → visibilité côté accompagné /mine', async () => {
    await accASession.post(`/api/emergence/session/${sT}/moments`) // existence garantie
    // partage:1 → moments visibles dans /mine
    expect((await accASession.patch(`/api/emergence/session/${sT}/moments/partage`, { partage: 1 })).status).toBe(200)
    let mine = await accPSession.get(`/api/emergence/mine/dossier/${dT}`)
    expect(mine.status).toBe(200)
    expect(Array.isArray(mine.json.moments)).toBe(true)
    expect(mine.json.moments.length).toBeGreaterThan(0)
    // partage:0 → moments retirés de /mine
    expect((await accASession.patch(`/api/emergence/session/${sT}/moments/partage`, { partage: 0 })).status).toBe(200)
    mine = await accPSession.get(`/api/emergence/mine/dossier/${dT}`)
    expect(mine.json.moments).toEqual([])
  })

  // ======================================================================================
  // Émergence — lecture côté accompagné : GET /api/emergence/mine/dossier/:did
  // ======================================================================================

  it('TC-REL-060 — /mine : seul le partagé est visible (fil rouge partagé + moments d\'une session partagée)', async () => {
    // Active le partage du fil rouge et des moments de sT.
    await accASession.post(`/api/emergence/dossier/${dT}/fil-rouge`)
    await accASession.patch(`/api/emergence/dossier/${dT}/fil-rouge/partage`, { partage: 1 })
    await accASession.post(`/api/emergence/session/${sT}/moments`)
    await accASession.patch(`/api/emergence/session/${sT}/moments/partage`, { partage: 1 })

    const mine = await accPSession.get(`/api/emergence/mine/dossier/${dT}`)
    expect(mine.status).toBe(200)
    expect(mine.json.filRouge).toBeTruthy() // car fil rouge partagé
    expect(Array.isArray(mine.json.moments)).toBe(true)
    expect(mine.json.moments.length).toBeGreaterThan(0) // moments de la session partagée
    for (const m of mine.json.moments) {
      expect(typeof m.verbatim).toBe('string')
      expect(typeof m.pourquoi).toBe('string')
    }
    // Remise à l'état non partagé (hygiène pour les tests suivants sur le même dossier).
    await accASession.patch(`/api/emergence/dossier/${dT}/fil-rouge/partage`, { partage: 0 })
    await accASession.patch(`/api/emergence/session/${sT}/moments/partage`, { partage: 0 })
  })

  it('TC-REL-061 — /mine : rien de partagé → { filRouge:null, moments:[] }', async () => {
    // S'assure que rien n'est partagé sur dT.
    await accASession.post(`/api/emergence/dossier/${dT}/fil-rouge`)
    await accASession.patch(`/api/emergence/dossier/${dT}/fil-rouge/partage`, { partage: 0 })
    await accASession.post(`/api/emergence/session/${sT}/moments`)
    await accASession.patch(`/api/emergence/session/${sT}/moments/partage`, { partage: 0 })

    const mine = await accPSession.get(`/api/emergence/mine/dossier/${dT}`)
    expect(mine.status).toBe(200)
    expect(mine.json.filRouge).toBeNull()
    expect(mine.json.moments).toEqual([])
  })

  it('TC-REL-062 — /mine : dossier d\'autrui → 404 { error:\'Parcours introuvable\' }', async () => {
    // amine ne possède pas dT (accompagné = accP).
    const r = await amine.get(`/api/emergence/mine/dossier/${dT}`)
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Parcours introuvable')
  })

  it('TC-REL-063 — /mine : rôle accompagnateur → 403 (requireRole(\'accompagne\'))', async () => {
    const r = await accASession.get(`/api/emergence/mine/dossier/${dT}`)
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('Accès refusé')
  })

  // ======================================================================================
  // Transparence — GET /api/transparence/dossier/:id  &  POST /api/transparence/effacement
  // ======================================================================================

  it('TC-REL-065 — transparence : tableau RGPD nominal (forme exhaustive + typage)', async () => {
    const r = await accPSession.get(`/api/transparence/dossier/${dT}`)
    expect(r.status).toBe(200)
    const b = r.json
    // donnees : tous des nombres
    for (const k of ['questionnaire', 'rdvs', 'comptes_rendus_publies', 'syntheses_publiees', 'actions', 'meteo', 'journal']) {
      expect(typeof b.donnees[k]).toBe('number')
    }
    // ia : typage mixte
    expect(typeof b.ia.comptes_rendus_generes).toBe('number')
    expect(typeof b.ia.synthese_generee).toBe('boolean')
    expect(typeof b.ia.fil_rouge_partage).toBe('boolean')
    expect(typeof b.ia.moments_partages).toBe('number')
    // texte explicatif non vide
    expect(typeof b.ce_que_voit_lia).toBe('string')
    expect(b.ce_que_voit_lia.length).toBeGreaterThan(0)
    // 2 sous-traitants { nom, role }
    expect(Array.isArray(b.soustraitants)).toBe(true)
    expect(b.soustraitants.length).toBe(2)
    for (const s of b.soustraitants) {
      expect(typeof s.nom).toBe('string')
      expect(typeof s.role).toBe('string')
    }
    expect(typeof b.demande_effacement_en_cours).toBe('boolean')
  })

  it('TC-REL-066 — transparence : feature absente → 403 (requireFeature)', async () => {
    // Compte accompagné jetable sur plan Découverte (sans 'transparence'). Le requireFeature s'exécute avant
    // la vérification de propriété → 403 quel que soit l'id de dossier.
    const r = await gatedAccPSession.get(`/api/transparence/dossier/${dT}`)
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('Fonctionnalité non disponible dans votre offre')
  })

  it('TC-REL-067 — transparence : rôle accompagnateur → 403 (requireRole)', async () => {
    const r = await accASession.get(`/api/transparence/dossier/${dT}`)
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('Accès refusé')
  })

  it('TC-REL-068 — transparence : dossier d\'autrui → 404 (ownDossier undefined)', async () => {
    // amine a la feature (sans plan) mais ne possède pas dT.
    const r = await amine.get(`/api/transparence/dossier/${dT}`)
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Parcours introuvable')
  })

  it('TC-REL-069 — transparence : non authentifié → 401', async () => {
    const anon = new Session()
    const r = await anon.get(`/api/transparence/dossier/${dT}`)
    expect(r.status).toBe(401)
    expect(r.json.error).toBe('Non authentifié')
  })

  it('TC-REL-070 — transparence : cohérence des compteurs météo/journal avec les données réelles', async () => {
    // Dossier frais isolé : on crée un nombre CONNU de relevés météo (accompagné) et de notes journal.
    const started = await accPSession.post('/api/dossiers/start', { titre: 'Dossier compteurs', accompagnateurId: (await getAccChoiceId()) })
    const did = started.json.dossierId
    const N = 3 // relevés météo (role='accompagne')
    const M = 2 // notes journal (accompagne_id=accP)
    for (let i = 0; i < N; i++) expect((await accPSession.post('/api/relationnel/meteo', { dossierId: did, niveau: 3 })).status).toBe(201)
    for (let i = 0; i < M; i++) expect((await accPSession.post('/api/relationnel/journal', { dossierId: did, texte: `note ${i}` })).status).toBe(201)
    const r = await accPSession.get(`/api/transparence/dossier/${did}`)
    expect(r.status).toBe(200)
    expect(r.json.donnees.meteo).toBe(N)
    expect(r.json.donnees.journal).toBe(M)
  })

  it('TC-REL-071 — effacement : création + notifications (accompagnateur + admins) → 201 { ok:true }', async () => {
    // Compteur de non-lues AVANT (exact et non borné, contrairement à la liste plafonnée à 30).
    const adminBefore = unreadCount((await admin.get('/api/notifications')).json)
    const accBefore = unreadCount((await accASession.get('/api/notifications')).json)

    const r = await accPSession.post('/api/transparence/effacement', { dossierId: dT, motif: 'Je quitte le dispositif' })
    expect(r.status).toBe(201)
    expect(r.json.ok).toBe(true)

    // La demande apparaît comme « en cours » dans le tableau.
    const tableau = await accPSession.get(`/api/transparence/dossier/${dT}`)
    expect(tableau.json.demande_effacement_en_cours).toBe(true)

    // Une notification (non lue) en plus pour l'accompagnateur accA ET pour l'admin (transaction).
    const adminAfter = unreadCount((await admin.get('/api/notifications')).json)
    const accAfter = unreadCount((await accASession.get('/api/notifications')).json)
    expect(adminAfter).toBeGreaterThan(adminBefore)
    expect(accAfter).toBeGreaterThan(accBefore)
  })

  it('TC-REL-072 — effacement : sans motif (facultatif) → 201 { ok:true }', async () => {
    // Dossier frais pour ne pas dépendre de l'état précédent.
    const started = await accPSession.post('/api/dossiers/start', { titre: 'Dossier effacement sans motif', accompagnateurId: (await getAccChoiceId()) })
    const did = started.json.dossierId
    const r = await accPSession.post('/api/transparence/effacement', { dossierId: did })
    expect(r.status).toBe(201)
    expect(r.json.ok).toBe(true)
  })

  it('TC-REL-073 — effacement : motif tronqué à 500 caractères (slice(0,500).trim()) → 201', async () => {
    const started = await accPSession.post('/api/dossiers/start', { titre: 'Dossier motif long', accompagnateurId: (await getAccChoiceId()) })
    const did = started.json.dossierId
    const longMotif = 'm'.repeat(700)
    const r = await accPSession.post('/api/transparence/effacement', { dossierId: did, motif: longMotif })
    // Le serveur tronque le motif à 500 et accepte la demande (pas d'erreur de validation).
    expect(r.status).toBe(201)
    expect(r.json.ok).toBe(true)
  })

  it('TC-REL-074 — effacement : dossier d\'autrui → 404 (ownDossier undefined)', async () => {
    const r = await accPSession.post('/api/transparence/effacement', { dossierId: dLea })
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Parcours introuvable')
  })

  it('TC-REL-075 — effacement : feature absente → 403 (requireFeature)', async () => {
    const r = await gatedAccPSession.post('/api/transparence/effacement', { dossierId: dT })
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('Fonctionnalité non disponible dans votre offre')
  })

  it('TC-REL-076 — effacement : rôle accompagnateur → 403 (requireRole)', async () => {
    const r = await accASession.post('/api/transparence/effacement', { dossierId: dT })
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('Accès refusé')
  })

  it('TC-REL-077 — effacement : 2e demande pendant une en_attente → drapeau demande_effacement_en_cours:true', async () => {
    // Dossier frais : 1re demande puis lecture du tableau → en cours.
    const started = await accPSession.post('/api/dossiers/start', { titre: 'Dossier double effacement', accompagnateurId: (await getAccChoiceId()) })
    const did = started.json.dossierId
    expect((await accPSession.post('/api/transparence/effacement', { dossierId: did })).status).toBe(201)
    const tableau = await accPSession.get(`/api/transparence/dossier/${did}`)
    expect(tableau.status).toBe(200)
    expect(tableau.json.demande_effacement_en_cours).toBe(true)
    // Une 2e demande reste acceptée (pas de garde-fou serveur) — comportement documenté du code.
    const second = await accPSession.post('/api/transparence/effacement', { dossierId: did })
    expect(second.status).toBe(201)
  })

  // ======================================================================================
  // Miroir réflexif — POST/GET /api/miroir/session/:sid  &  POST .../appliquer
  // ======================================================================================

  it('TC-REL-079 — miroir : générer l\'analyse de posture (contrat IA + persistance/relecture)', async () => {
    const r = await accASession.post(`/api/miroir/session/${sT}`)
    expect(r.status).toBe(200)
    expect(['ia', 'heuristique']).toContain(r.json.source)
    expect(Array.isArray(r.json.forces)).toBe(true)
    expect(r.json.forces.length).toBeLessThanOrEqual(3)
    expect(Array.isArray(r.json.glissements)).toBe(true)
    expect(r.json.glissements.length).toBeLessThanOrEqual(3)
    expect(typeof r.json.synthese).toBe('string')
    expect(Array.isArray(r.json.scores)).toBe(true)
    // note ∈ [0,100] ou null
    expect(r.json.note === null || (typeof r.json.note === 'number' && r.json.note >= 0 && r.json.note <= 100)).toBe(true)
    // Chaque score porte un indicateur (de la grille) + un score numérique|null
    for (const s of r.json.scores) {
      expect(typeof s.indicateur).toBe('string')
      expect(s.score === null || typeof s.score === 'number').toBe(true)
    }
    // Relecture GET → analyse persistée.
    const read = await accASession.get(`/api/miroir/session/${sT}`)
    expect(read.status).toBe(200)
    expect(read.json.analyse).toBeTruthy()
    expect(Array.isArray(read.json.analyse.scores)).toBe(true)
    expect(['ia', 'heuristique']).toContain(read.json.analyse.source)
  })

  it('TC-REL-085 — miroir : régénération (ON CONFLICT session_id) — une seule analyse par session', async () => {
    expect((await accASession.post(`/api/miroir/session/${sT}`)).status).toBe(200)
    expect((await accASession.post(`/api/miroir/session/${sT}`)).status).toBe(200)
    // La relecture renvoie une analyse unique cohérente.
    const read = await accASession.get(`/api/miroir/session/${sT}`)
    expect(read.status).toBe(200)
    expect(read.json.analyse).toBeTruthy()
    expect(Array.isArray(read.json.analyse.scores)).toBe(true)
  })

  it('TC-REL-086 — miroir : feature absente → 403 (requireFeature)', async () => {
    // Accompagnateur jetable sur plan Découverte (sans 'miroir'). requireFeature avant ownership → 403.
    const r = await gatedAccSession.post(`/api/miroir/session/${sT}`)
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('Fonctionnalité non disponible dans votre offre')
  })

  it('TC-REL-087 — miroir : rôle accompagné → 403 (requireRole)', async () => {
    const r = await accPSession.post(`/api/miroir/session/${sT}`)
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('Accès refusé')
  })

  it('TC-REL-088 — miroir : session d\'autrui → 404 (POST / GET ; ownsSession undefined)', async () => {
    // d1Session appartient au dossier vitrine de Mohamed ; accA ne le possède pas (mais a la feature, sans plan).
    const post = await accASession.post(`/api/miroir/session/${d1Session}`)
    expect(post.status).toBe(404)
    expect(post.json.error).toBe('Entretien introuvable')
    const get = await accASession.get(`/api/miroir/session/${d1Session}`)
    expect(get.status).toBe(404)
    expect(get.json.error).toBe('Entretien introuvable')
  })

  it('TC-REL-089 — miroir : non authentifié → 401', async () => {
    const anon = new Session()
    const r = await anon.post(`/api/miroir/session/${sT}`)
    expect(r.status).toBe(401)
    expect(r.json.error).toBe('Non authentifié')
  })

  it('TC-REL-090 — miroir : relire l\'analyse avant génération → 200 { analyse:null }', async () => {
    // Session fraîche sans analyse.
    const started = await accPSession.post('/api/dossiers/start', { titre: 'Dossier sans miroir', accompagnateurId: (await getAccChoiceId()) })
    const freshDid = started.json.dossierId
    const sess = await accASession.post('/api/entretien/sessions', { dossierId: freshDid })
    const freshSid = sess.json.sessionId
    const r = await accASession.get(`/api/miroir/session/${freshSid}`)
    expect(r.status).toBe(200)
    expect(r.json.analyse).toBeNull()
  })

  it('TC-REL-091 — miroir : appliquer les scores au brouillon d\'auto-évaluation → 200 { ok:true, appliques>0 }', async () => {
    // Génère d'abord l'analyse (scores filtrés sur INDICATEUR_IDS) sur sT.
    const gen = await accASession.post(`/api/miroir/session/${sT}`)
    expect(gen.status).toBe(200)
    const r = await accASession.post(`/api/miroir/session/${sT}/appliquer`)
    expect(r.status).toBe(200)
    expect(r.json.ok).toBe(true)
    expect(typeof r.json.appliques).toBe('number')
    expect(r.json.appliques).toBeGreaterThan(0)
  })

  it('TC-REL-093 — miroir/appliquer : réutilise le brouillon existant (pas de doublon sur 2 applications)', async () => {
    // Deux applications successives sur le même dossier (depuis sT) doivent rester cohérentes.
    await accASession.post(`/api/miroir/session/${sT}`)
    const first = await accASession.post(`/api/miroir/session/${sT}/appliquer`)
    expect(first.status).toBe(200)
    const second = await accASession.post(`/api/miroir/session/${sT}/appliquer`)
    expect(second.status).toBe(200)
    expect(second.json.ok).toBe(true)
    // Le nombre d'indicateurs appliqués est le même d'une application à l'autre (même jeu de scores, ON CONFLICT).
    expect(second.json.appliques).toBe(first.json.appliques)
  })

  it('TC-REL-094 — miroir/appliquer : sans analyse préalable → 404 { error:\'Aucune analyse à appliquer\' }', async () => {
    // Session fraîche possédée mais sans analyse stockée.
    const started = await accPSession.post('/api/dossiers/start', { titre: 'Dossier appliquer sans analyse', accompagnateurId: (await getAccChoiceId()) })
    const freshDid = started.json.dossierId
    const sess = await accASession.post('/api/entretien/sessions', { dossierId: freshDid })
    const freshSid = sess.json.sessionId
    const r = await accASession.post(`/api/miroir/session/${freshSid}/appliquer`)
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Aucune analyse à appliquer')
  })

  it('TC-REL-095 — miroir/appliquer : session d\'autrui → 404 (ownsSession undefined avant lecture analyse)', async () => {
    const r = await accASession.post(`/api/miroir/session/${d1Session}/appliquer`)
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Entretien introuvable')
  })

  it('TC-REL-096 — miroir/appliquer : feature \'miroir\' absente → 403 (requireFeature)', async () => {
    const r = await gatedAccSession.post(`/api/miroir/session/${sT}/appliquer`)
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('Fonctionnalité non disponible dans votre offre')
  })

  // ======================================================================================
  // Non-régression inter-modules
  // ======================================================================================

  it('TC-REL-099 — non-régression : les données d\'un dossier ne fuient pas sur un autre (isolation par dossier_id)', async () => {
    // Deux dossiers du MÊME accompagné accP : dT (avec accA) et dB (un autre parcours).
    const startedB = await accPSession.post('/api/dossiers/start', { titre: 'Dossier B isolation', accompagnateurId: (await getAccChoiceId()) })
    const dB = startedB.json.dossierId
    // On crée des relevés/notes UNIQUEMENT sur dB.
    const meteoB = await accPSession.post('/api/relationnel/meteo', { dossierId: dB, niveau: 5, mot: 'isolation' })
    const journalB = await accPSession.post('/api/relationnel/journal', { dossierId: dB, texte: 'note exclusive dB' })
    // La météo de dB n'apparaît pas dans dT.
    const meteoT = await accPSession.get(`/api/relationnel/meteo/dossier/${dT}`)
    expect((meteoT.json.mine as Array<{ id: number }>).some((m) => m.id === meteoB.json.id)).toBe(false)
    // Le journal de dB n'apparaît pas dans dT.
    const journalT = await accPSession.get(`/api/relationnel/journal/dossier/${dT}`)
    expect((journalT.json.entrees as Array<{ id: number }>).some((e) => e.id === journalB.json.id)).toBe(false)
    // Les compteurs de transparence sont distincts par dossier (dB a exactement 1 météo + 1 journal).
    const transB = await accPSession.get(`/api/transparence/dossier/${dB}`)
    expect(transB.json.donnees.meteo).toBe(1)
    expect(transB.json.donnees.journal).toBe(1)
  })

  it('TC-REL-100 — non-régression : cohérence transparence ↔ partage du fil rouge (false→true)', async () => {
    // Dossier frais pour un état initial propre (aucun fil rouge partagé).
    const started = await accPSession.post('/api/dossiers/start', { titre: 'Dossier coherence partage', accompagnateurId: (await getAccChoiceId()) })
    const did = started.json.dossierId
    // Génère le fil rouge (non partagé par défaut) côté accompagnateur.
    await accASession.post(`/api/emergence/dossier/${did}/fil-rouge`)
    await accASession.patch(`/api/emergence/dossier/${did}/fil-rouge/partage`, { partage: 0 })
    const before = await accPSession.get(`/api/transparence/dossier/${did}`)
    expect(before.json.ia.fil_rouge_partage).toBe(false)
    // L'accompagnateur active le partage.
    expect((await accASession.patch(`/api/emergence/dossier/${did}/fil-rouge/partage`, { partage: 1 })).status).toBe(200)
    const after = await accPSession.get(`/api/transparence/dossier/${did}`)
    expect(after.json.ia.fil_rouge_partage).toBe(true)
    // Cohérent avec /emergence/mine : le fil rouge est désormais visible.
    const mine = await accPSession.get(`/api/emergence/mine/dossier/${did}`)
    expect(mine.json.filRouge).toBeTruthy()
  })

  // ---- Helpers internes ----
  // Renvoie l'id de l'accompagnateur jetable accA tel que vu par accP dans la liste de choix.
  async function getAccChoiceId(): Promise<number> {
    const accs = await accPSession.get('/api/dossiers/accompagnateurs')
    const choice = (accs.json.accompagnateurs as Array<{ id: number; email: string }>).find((a) => a.email === accA.email)
    if (!choice) throw new Error('Accompagnateur jetable introuvable')
    return choice.id
  }
})

// Nombre de notifications NON LUES (champ nonLues exact et non borné de GET /api/notifications).
function unreadCount(body: unknown): number {
  if (body && typeof body === 'object') {
    const n = (body as { nonLues?: unknown }).nonLues
    if (typeof n === 'number') return n
  }
  return 0
}
