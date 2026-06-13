import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Session, asUser, DEMO } from '../helpers/api'
import { createTestUser, deleteTestUser, type TestUser } from '../helpers/fixtures'

// =============================================================================
// Domaine actnotif — Plan d'action (actions), Tags, Notifications (rappels).
// Source : app/api/src/actions.ts, tags.ts, notifications.ts.
//
// Stratégie d'isolation : on construit un bac à sable 100% jetable (@boussole.test)
//  - tutA       : accompagnateur jetable (propriétaire de dossiers)
//  - accA       : accompagné jetable, démarre un parcours avec tutA  -> dossierA
//  - accB       : accompagné jetable, démarre un parcours avec tutA  -> dossierB
//  - accNone    : accompagné jetable SANS aucun parcours (cas « 0 dossier »)
//  - tutB       : second accompagnateur jetable (pour les croisements de propriété)
// On ne mute JAMAIS un compte/dossier de démo (vitrine Mohamed/Amine).
// Les seuls accès aux comptes démo sont en LECTURE SEULE (découverte d'un id de
// dossier d'autrui pour les cas 404) ou des appels qui échouent avant toute
// écriture (ownership KO).
//
// Notes de comportement fidèles au code lu :
//  - /api/actions/* : requireAuth (+ requireRole selon la route). PAS de
//    requireFeature : plan_action est dans le socle, donc aucun 403-feature.
//  - POST /actions : dossierForUser vérifié AVANT la validation du libellé.
//  - PATCH/DELETE /actions/:id : actionForUser -> 404 « Action introuvable ».
//  - opt(v) : trim -> null si vide. priorite falsy n'est jamais testée contre
//    l'énumération (donc '  ' / '' acceptés -> null).
//  - reorder : renumérote de façon contiguë le reste du dossier, isole par
//    dossier_id, 400 si ids non-tableau.
//  - tags : POST renvoie 400 « Données invalides » si ownership KO OU nom vide.
//    DELETE renvoie 404 si ownership KO, idempotent sinon.
//  - notifications : GET déclenche sweepDueReminders() puis renvoie <=30 entrées
//    cree_le DESC + nonLues ; POST /lues borne au user courant.
// =============================================================================

const PAST = '2020-01-01' // rappel_le échu -> rappel dû au sweep
const FUTURE = '2099-12-31'

interface Action {
  id: number
  libelle: string
  echeance: string | null
  critere: string | null
  details: string | null
  priorite: string | null
  statut: string
  rappel_le: string | null
  cree_le: string
  ordre: number
}

let admin: Session
let tutA: TestUser
let tutB: TestUser
let accA: TestUser
let accB: TestUser
let accNone: TestUser

let sTutA: Session // accompagnateur propriétaire de dossierA / dossierB
let sTutB: Session // second accompagnateur (croisements de propriété)
let sAccA: Session // accompagné de dossierA
let sAccB: Session // accompagné de dossierB
let sAccNone: Session // accompagné sans dossier

let dossierA: number // tutA(accompagnateur) <-> accA(accompagné)
let dossierB: number // tutA(accompagnateur) <-> accB(accompagné)
let dossierTutB: number // tutB(accompagnateur) <-> accA(accompagné), dossier « d'autrui » pour tutA

// Un id de dossier de démo (appartenant à un accompagnateur démo) découvert en
// lecture seule, pour les cas « ressource d'autrui » sans rien muter.
let demoForeignDossier: number

/** Démarre un parcours pour un accompagné jetable et renvoie le dossierId créé. */
async function startParcours(accSession: Session, accompagnateurId: number, titre: string): Promise<number> {
  const r = await accSession.post('/api/dossiers/start', { titre, accompagnateurId })
  if (r.status !== 201) throw new Error(`Échec démarrage parcours (${r.status}) : ${JSON.stringify(r.json)}`)
  return r.json.dossierId as number
}

/** Crée une action dans un dossier accessible et renvoie son id. */
async function addAction(s: Session, dossierId: number, body: Record<string, unknown>): Promise<number> {
  const r = await s.post('/api/actions', { dossierId, ...body })
  if (r.status !== 201) throw new Error(`Échec création action (${r.status}) : ${JSON.stringify(r.json)}`)
  return r.json.id as number
}

/** Liste (côté accompagnateur) les actions d'un dossier détenu. */
async function listActions(s: Session, dossierId: number): Promise<Action[]> {
  const r = await s.get(`/api/actions?dossierId=${dossierId}`)
  expect(r.status).toBe(200)
  return r.json.actions as Action[]
}

beforeAll(async () => {
  admin = await asUser(DEMO.admin)

  // Comptes jetables
  tutA = await createTestUser(admin, 'accompagnateur', 'actnotif-tutA')
  tutB = await createTestUser(admin, 'accompagnateur', 'actnotif-tutB')
  accA = await createTestUser(admin, 'accompagne', 'actnotif-accA')
  accB = await createTestUser(admin, 'accompagne', 'actnotif-accB')
  accNone = await createTestUser(admin, 'accompagne', 'actnotif-accNone')

  sTutA = await asUser({ email: tutA.email, password: tutA.password })
  sTutB = await asUser({ email: tutB.email, password: tutB.password })
  sAccA = await asUser({ email: accA.email, password: accA.password })
  sAccB = await asUser({ email: accB.email, password: accB.password })
  sAccNone = await asUser({ email: accNone.email, password: accNone.password })

  // Parcours (dossiers) jetables. accA crée dossierA avec tutA, dossierTutB avec tutB.
  dossierA = await startParcours(sAccA, tutA.id, 'Parcours actnotif A')
  dossierB = await startParcours(sAccB, tutA.id, 'Parcours actnotif B')
  dossierTutB = await startParcours(sAccA, tutB.id, 'Parcours actnotif tutB')

  // Un dossier de démo appartenant à un accompagnateur démo (Mohamed), en LECTURE SEULE.
  const dash = await (await asUser(DEMO.mohamed)).get('/api/entretien/dashboard')
  expect(dash.status).toBe(200)
  const first = (dash.json.dossiers as Array<{ id: number }>)[0]
  demoForeignDossier = first ? first.id : 999999
})

afterAll(async () => {
  // Suppression RGPD en cascade des comptes jetables (dossiers, actions, tags liés, notifications).
  for (const u of [accA, accB, accNone, tutA, tutB]) {
    if (u) await deleteTestUser(admin, u)
  }
})

// ---------------------------------------------------------------------------
// GET /api/actions/mine — accompagné
// ---------------------------------------------------------------------------
describe('GET /api/actions/mine', () => {
  it("TC-ACT-001 — nominal : l'accompagné récupère ses actions et le dossierId", async () => {
    // accA possède dossierA (et dossierTutB, plus récent). /mine cible le dossier
    // le plus récent (ORDER BY id DESC), donc dossierTutB ici. On garantit au moins
    // une action sur ce dossier via tutB (propriétaire), puis on relit côté accA.
    await addAction(sTutB, dossierTutB, { libelle: 'Action mine nominal', echeance: '2026-07-01', priorite: 'haute' })
    const r = await sAccA.get('/api/actions/mine')
    expect(r.status).toBe(200)
    expect(typeof r.json.dossierId).toBe('number')
    expect(Array.isArray(r.json.actions)).toBe(true)
    expect(r.json.actions.length).toBeGreaterThanOrEqual(1)
    const a = r.json.actions[0] as Action
    // Les 10 colonnes COLS doivent être exposées.
    for (const k of ['id', 'libelle', 'echeance', 'critere', 'details', 'priorite', 'statut', 'rappel_le', 'cree_le', 'ordre']) {
      expect(a).toHaveProperty(k)
    }
    // Tri par ordre ASC puis id ASC.
    const acts = r.json.actions as Action[]
    for (let i = 1; i < acts.length; i++) {
      const prev = acts[i - 1]
      const cur = acts[i]
      expect(prev.ordre < cur.ordre || (prev.ordre === cur.ordre && prev.id <= cur.id)).toBe(true)
    }
  })

  it("TC-ACT-002 — accompagné sans dossier : liste vide et dossierId null", async () => {
    const r = await sAccNone.get('/api/actions/mine')
    expect(r.status).toBe(200)
    expect(r.json).toEqual({ actions: [], dossierId: null })
  })

  it('TC-ACT-003 — 401 non authentifié', async () => {
    const r = await new Session().get('/api/actions/mine')
    expect(r.status).toBe(401)
    expect(r.json).toEqual({ error: 'Non authentifié' })
  })

  it('TC-ACT-004 — 403 mauvais rôle (accompagnateur)', async () => {
    const r = await sTutA.get('/api/actions/mine')
    expect(r.status).toBe(403)
    expect(r.json).toEqual({ error: 'Accès refusé' })
  })

  it('TC-ACT-005 — 403 mauvais rôle (admin)', async () => {
    const r = await admin.get('/api/actions/mine')
    expect(r.status).toBe(403)
    expect(r.json).toEqual({ error: 'Accès refusé' })
  })
})

// ---------------------------------------------------------------------------
// GET /api/actions — accompagnateur
// ---------------------------------------------------------------------------
describe('GET /api/actions', () => {
  it("TC-ACT-006 — nominal : l'accompagnateur liste les actions de son dossier", async () => {
    await addAction(sTutA, dossierA, { libelle: 'Action liste nominal' })
    const r = await sTutA.get(`/api/actions?dossierId=${dossierA}`)
    expect(r.status).toBe(200)
    expect(Array.isArray(r.json.actions)).toBe(true)
    const acts = r.json.actions as Action[]
    expect(acts.length).toBeGreaterThanOrEqual(1)
    for (const k of ['id', 'libelle', 'echeance', 'critere', 'details', 'priorite', 'statut', 'rappel_le', 'cree_le', 'ordre']) {
      expect(acts[0]).toHaveProperty(k)
    }
    // Tri ordre ASC puis id ASC.
    for (let i = 1; i < acts.length; i++) {
      const prev = acts[i - 1]
      const cur = acts[i]
      expect(prev.ordre < cur.ordre || (prev.ordre === cur.ordre && prev.id <= cur.id)).toBe(true)
    }
  })

  it("TC-ACT-007 — 404 dossier non détenu par l'accompagnateur", async () => {
    // tutA n'est pas propriétaire de dossierTutB (appartient à tutB).
    const r = await sTutA.get(`/api/actions?dossierId=${dossierTutB}`)
    expect(r.status).toBe(404)
    expect(r.json).toEqual({ error: 'Dossier introuvable' })
  })

  it('TC-ACT-008 — 404 dossierId inexistant ou manquant (NaN)', async () => {
    const sansParam = await sTutA.get('/api/actions')
    expect(sansParam.status).toBe(404)
    expect(sansParam.json).toEqual({ error: 'Dossier introuvable' })
    const inexistant = await sTutA.get('/api/actions?dossierId=999999')
    expect(inexistant.status).toBe(404)
    expect(inexistant.json).toEqual({ error: 'Dossier introuvable' })
  })

  it('TC-ACT-009 — 401 non authentifié', async () => {
    const r = await new Session().get('/api/actions?dossierId=1')
    expect(r.status).toBe(401)
    expect(r.json).toEqual({ error: 'Non authentifié' })
  })

  it('TC-ACT-010 — 403 mauvais rôle (accompagné)', async () => {
    const r = await sAccA.get(`/api/actions?dossierId=${dossierA}`)
    expect(r.status).toBe(403)
    expect(r.json).toEqual({ error: 'Accès refusé' })
  })
})

// ---------------------------------------------------------------------------
// POST /api/actions
// ---------------------------------------------------------------------------
describe('POST /api/actions', () => {
  it("TC-ACT-011 — nominal : l'accompagnateur ajoute une action complète", async () => {
    const body = {
      dossierId: dossierA,
      libelle: 'Préparer le pitch',
      echeance: '2026-07-01',
      critere: 'Pitch prêt',
      details: 'Slides + script',
      priorite: 'haute',
      rappel_le: FUTURE,
    }
    const before = await listActions(sTutA, dossierA)
    const maxOrdre = before.reduce((m, a) => Math.max(m, a.ordre), 0)
    const r = await sTutA.post('/api/actions', body)
    expect(r.status).toBe(201)
    expect(typeof r.json.id).toBe('number')
    const after = await listActions(sTutA, dossierA)
    const created = after.find((a) => a.id === r.json.id)
    expect(created).toBeDefined()
    expect(created!.libelle).toBe('Préparer le pitch')
    expect(created!.echeance).toBe('2026-07-01')
    expect(created!.critere).toBe('Pitch prêt')
    expect(created!.details).toBe('Slides + script')
    expect(created!.priorite).toBe('haute')
    expect(created!.rappel_le).toBe(FUTURE)
    expect(created!.ordre).toBe(maxOrdre + 1)
  })

  it("TC-ACT-012 — nominal : l'accompagné ajoute une action dans SON dossier (libellé seul)", async () => {
    const mine = await sAccA.get('/api/actions/mine')
    expect(mine.status).toBe(200)
    const dossierId = mine.json.dossierId as number
    expect(typeof dossierId).toBe('number')
    const r = await sAccA.post('/api/actions', { dossierId, libelle: 'Réviser le mémoire' })
    expect(r.status).toBe(201)
    expect(typeof r.json.id).toBe('number')
    // Relecture côté accompagnateur (tutB possède le dossier le plus récent de accA).
    const acts = await listActions(sTutB, dossierId)
    const created = acts.find((a) => a.id === r.json.id)
    expect(created).toBeDefined()
    expect(created!.libelle).toBe('Réviser le mémoire')
    // Champs optionnels non fournis -> null ; statut par défaut 'a_faire'.
    expect(created!.echeance).toBeNull()
    expect(created!.critere).toBeNull()
    expect(created!.details).toBeNull()
    expect(created!.priorite).toBeNull()
    expect(created!.rappel_le).toBeNull()
    expect(created!.statut).toBe('a_faire')
  })

  it('TC-ACT-013 — 400 libellé manquant ou vide (après trim)', async () => {
    const espaces = await sTutA.post('/api/actions', { dossierId: dossierA, libelle: '   ' })
    expect(espaces.status).toBe(400)
    expect(espaces.json).toEqual({ error: 'Libellé requis' })
    const sansLibelle = await sTutA.post('/api/actions', { dossierId: dossierA })
    expect(sansLibelle.status).toBe(400)
    expect(sansLibelle.json).toEqual({ error: 'Libellé requis' })
  })

  it('TC-ACT-014 — 400 priorité hors énumération', async () => {
    const r = await sTutA.post('/api/actions', { dossierId: dossierA, libelle: 'X', priorite: 'urgente' })
    expect(r.status).toBe(400)
    expect(r.json).toEqual({ error: 'Priorité invalide' })
  })

  it('TC-ACT-015 — priorité vide/espaces acceptée (normalisée à null)', async () => {
    const r = await sTutA.post('/api/actions', { dossierId: dossierA, libelle: 'Action prio espaces', priorite: '  ' })
    expect(r.status).toBe(201)
    const acts = await listActions(sTutA, dossierA)
    const created = acts.find((a) => a.id === r.json.id)
    expect(created).toBeDefined()
    expect(created!.priorite).toBeNull()
  })

  it("TC-ACT-016 — 404 dossier non accessible à l'utilisateur", async () => {
    // accA n'a aucun lien avec dossierB (qui est à accB). 404 avant validation libellé.
    const r = await sAccA.post('/api/actions', { dossierId: dossierB, libelle: 'X' })
    expect(r.status).toBe(404)
    expect(r.json).toEqual({ error: 'Dossier introuvable' })
  })

  it('TC-ACT-017 — 401 non authentifié', async () => {
    const r = await new Session().post('/api/actions', { dossierId: 1, libelle: 'X' })
    expect(r.status).toBe(401)
    expect(r.json).toEqual({ error: 'Non authentifié' })
  })

  it('TC-ACT-018 — ordre = MAX(ordre)+1 sur ajouts successifs', async () => {
    const before = await listActions(sTutA, dossierA)
    const maxOrdre = before.reduce((m, a) => Math.max(m, a.ordre), 0)
    const idA = await addAction(sTutA, dossierA, { libelle: 'Ordre A' })
    const idB = await addAction(sTutA, dossierA, { libelle: 'Ordre B' })
    const after = await listActions(sTutA, dossierA)
    const a = after.find((x) => x.id === idA)!
    const b = after.find((x) => x.id === idB)!
    expect(a.ordre).toBe(maxOrdre + 1)
    expect(b.ordre).toBe(maxOrdre + 2)
    expect(b.ordre).toBeGreaterThan(a.ordre)
    // Tri stable global.
    for (let i = 1; i < after.length; i++) {
      const prev = after[i - 1]
      const cur = after[i]
      expect(prev.ordre < cur.ordre || (prev.ordre === cur.ordre && prev.id <= cur.id)).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// PATCH /api/actions/:id
// ---------------------------------------------------------------------------
describe('PATCH /api/actions/:id', () => {
  it('TC-ACT-019 — nominal : changement de statut valide', async () => {
    const id = await addAction(sTutA, dossierA, { libelle: 'Action statut' })
    const r = await sTutA.patch(`/api/actions/${id}`, { statut: 'en_cours' })
    expect(r.status).toBe(200)
    expect(r.json).toEqual({ ok: true })
    const acts = await listActions(sTutA, dossierA)
    expect(acts.find((a) => a.id === id)!.statut).toBe('en_cours')
  })

  it('TC-ACT-020 — 400 statut hors énumération', async () => {
    const id = await addAction(sTutA, dossierA, { libelle: 'Action statut invalide' })
    const r = await sTutA.patch(`/api/actions/${id}`, { statut: 'termine' })
    expect(r.status).toBe(400)
    expect(r.json).toEqual({ error: 'Statut invalide' })
  })

  it('TC-ACT-021 — 400 libellé fourni mais vide', async () => {
    const id = await addAction(sTutA, dossierA, { libelle: 'Action libelle vide' })
    const r = await sTutA.patch(`/api/actions/${id}`, { libelle: '   ' })
    expect(r.status).toBe(400)
    expect(r.json).toEqual({ error: 'Libellé vide' })
  })

  it('TC-ACT-022 — 400 priorité invalide (non vide)', async () => {
    const id = await addAction(sTutA, dossierA, { libelle: 'Action prio crit' })
    const r = await sTutA.patch(`/api/actions/${id}`, { priorite: 'critique' })
    expect(r.status).toBe(400)
    expect(r.json).toEqual({ error: 'Priorité invalide' })
  })

  it('TC-ACT-023 — priorité explicitement vidée (null) acceptée', async () => {
    const id = await addAction(sTutA, dossierA, { libelle: 'Action prio à vider', priorite: 'haute' })
    const r = await sTutA.patch(`/api/actions/${id}`, { priorite: '' })
    expect(r.status).toBe(200)
    expect(r.json).toEqual({ ok: true })
    const acts = await listActions(sTutA, dossierA)
    expect(acts.find((a) => a.id === id)!.priorite).toBeNull()
  })

  it('TC-ACT-024 — corps vide : 200 ok sans modification (sets.length===0)', async () => {
    const id = await addAction(sTutA, dossierA, { libelle: 'Action no-op', priorite: 'moyenne' })
    const before = (await listActions(sTutA, dossierA)).find((a) => a.id === id)!
    const r = await sTutA.patch(`/api/actions/${id}`, {})
    expect(r.status).toBe(200)
    expect(r.json).toEqual({ ok: true })
    const after = (await listActions(sTutA, dossierA)).find((a) => a.id === id)!
    expect(after).toEqual(before)
  })

  it('TC-ACT-025 — modif de rappel_le ré-arme rappel_envoye=0 (nouvelle notification au sweep)', async () => {
    // 1) Action avec rappel échu -> 1er sweep génère 1 notif chacun, rappel_envoye=1.
    const id = await addAction(sTutA, dossierA, { libelle: 'Rappel à réarmer', rappel_le: PAST })
    await sAccA.get('/api/notifications') // déclenche le sweep, marque rappel_envoye=1
    const baseAcc = (await sAccA.get('/api/notifications')).json.notifications.length as number
    // 2) On modifie rappel_le (toujours échu) -> SET rappel_envoye=0, donc rééligible.
    const r = await sTutA.patch(`/api/actions/${id}`, { rappel_le: PAST })
    expect(r.status).toBe(200)
    expect(r.json).toEqual({ ok: true })
    // 3) Nouveau sweep -> une notification supplémentaire pour l'accompagné.
    const afterAcc = (await sAccA.get('/api/notifications')).json.notifications.length as number
    expect(afterAcc).toBeGreaterThan(baseAcc)
  })

  it('TC-ACT-026 — mise à jour multi-champs partielle', async () => {
    const id = await addAction(sTutA, dossierA, { libelle: 'Avant maj', critere: 'crit ini', details: 'det ini' })
    const r = await sTutA.patch(`/api/actions/${id}`, {
      libelle: 'Maj',
      echeance: '2026-08-01',
      critere: 'OK',
      details: 'note',
    })
    expect(r.status).toBe(200)
    expect(r.json).toEqual({ ok: true })
    const a = (await listActions(sTutA, dossierA)).find((x) => x.id === id)!
    expect(a.libelle).toBe('Maj')
    expect(a.echeance).toBe('2026-08-01')
    expect(a.critere).toBe('OK')
    expect(a.details).toBe('note')
    // statut inchangé (non fourni).
    expect(a.statut).toBe('a_faire')
  })

  it('TC-ACT-027 — 404 action d\'un dossier non accessible', async () => {
    // Action de dossierB (à accB/tutA). accA n'y a pas accès.
    const id = await addAction(sTutA, dossierB, { libelle: 'Action de B' })
    const r = await sAccA.patch(`/api/actions/${id}`, { statut: 'fait' })
    expect(r.status).toBe(404)
    expect(r.json).toEqual({ error: 'Action introuvable' })
  })

  it('TC-ACT-028 — 404 action inexistante', async () => {
    const r = await sTutA.patch('/api/actions/999999', { statut: 'fait' })
    expect(r.status).toBe(404)
    expect(r.json).toEqual({ error: 'Action introuvable' })
  })

  it('TC-ACT-029 — 401 non authentifié', async () => {
    const r = await new Session().patch('/api/actions/1', { statut: 'fait' })
    expect(r.status).toBe(401)
    expect(r.json).toEqual({ error: 'Non authentifié' })
  })
})

// ---------------------------------------------------------------------------
// DELETE /api/actions/:id
// ---------------------------------------------------------------------------
describe('DELETE /api/actions/:id', () => {
  it('TC-ACT-030 — nominal : suppression d\'une action accessible', async () => {
    const id = await addAction(sTutA, dossierA, { libelle: 'À supprimer' })
    const r = await sTutA.del(`/api/actions/${id}`)
    expect(r.status).toBe(200)
    expect(r.json).toEqual({ ok: true })
    const acts = await listActions(sTutA, dossierA)
    expect(acts.find((a) => a.id === id)).toBeUndefined()
  })

  it('TC-ACT-031 — 404 action d\'un dossier non accessible', async () => {
    const id = await addAction(sTutA, dossierB, { libelle: 'Action B à protéger' })
    const r = await sAccA.del(`/api/actions/${id}`)
    expect(r.status).toBe(404)
    expect(r.json).toEqual({ error: 'Action introuvable' })
    // L'action existe toujours côté propriétaire.
    const acts = await listActions(sTutA, dossierB)
    expect(acts.find((a) => a.id === id)).toBeDefined()
  })

  it('TC-ACT-032 — 404 action inexistante', async () => {
    const r = await sTutA.del('/api/actions/999999')
    expect(r.status).toBe(404)
    expect(r.json).toEqual({ error: 'Action introuvable' })
  })

  it('TC-ACT-033 — 401 non authentifié', async () => {
    const r = await new Session().del('/api/actions/1')
    expect(r.status).toBe(401)
    expect(r.json).toEqual({ error: 'Non authentifié' })
  })
})

// ---------------------------------------------------------------------------
// POST /api/actions/reorder
// ---------------------------------------------------------------------------
describe('POST /api/actions/reorder', () => {
  it('TC-ACT-034 — nominal : réordonnancement complet d\'un dossier', async () => {
    // Dossier dédié au reorder (accB <-> tutA = dossierB), pour ne pas perturber dossierA.
    // On crée 3 actions fraîches et on réordonne uniquement avec leurs ids.
    const a = await addAction(sTutA, dossierB, { libelle: 'reorder-A' })
    const b = await addAction(sTutA, dossierB, { libelle: 'reorder-B' })
    const c = await addAction(sTutA, dossierB, { libelle: 'reorder-C' })
    const r = await sTutA.post('/api/actions/reorder', { dossierId: dossierB, ids: [c, a, b] })
    expect(r.status).toBe(200)
    expect(r.json).toEqual({ ok: true })
    const acts = await listActions(sTutA, dossierB)
    const oc = acts.find((x) => x.id === c)!.ordre
    const oa = acts.find((x) => x.id === a)!.ordre
    const ob = acts.find((x) => x.id === b)!.ordre
    // Les ids passés reçoivent les ordres 0,1,2 dans l'ordre de la liste.
    expect(oc).toBe(0)
    expect(oa).toBe(1)
    expect(ob).toBe(2)
    // Tri ASC global cohérent et ordres uniques.
    const ordres = acts.map((x) => x.ordre)
    expect(new Set(ordres).size).toBe(ordres.length)
  })

  it('TC-ACT-035 — liste partielle : actions absentes renumérotées à la suite sans collision', async () => {
    // 4 actions fraîches sur dossierA. On ne fournit que 2 ids -> les 2 autres
    // sont renumérotées à partir de l'index 2, sans collision.
    const a = await addAction(sTutA, dossierA, { libelle: 'part-A' })
    const b = await addAction(sTutA, dossierA, { libelle: 'part-B' })
    const c = await addAction(sTutA, dossierA, { libelle: 'part-C' })
    const d = await addAction(sTutA, dossierA, { libelle: 'part-D' })
    const r = await sTutA.post('/api/actions/reorder', { dossierId: dossierA, ids: [b, a] })
    expect(r.status).toBe(200)
    expect(r.json).toEqual({ ok: true })
    const acts = await listActions(sTutA, dossierA)
    expect(acts.find((x) => x.id === b)!.ordre).toBe(0)
    expect(acts.find((x) => x.id === a)!.ordre).toBe(1)
    // c et d renumérotés à partir de 2 (>=2), sans collision globale.
    expect(acts.find((x) => x.id === c)!.ordre).toBeGreaterThanOrEqual(2)
    expect(acts.find((x) => x.id === d)!.ordre).toBeGreaterThanOrEqual(2)
    const ordres = acts.map((x) => x.ordre)
    expect(new Set(ordres).size).toBe(ordres.length) // aucune collision/duplication
  })

  it('TC-ACT-036 — ids contenant un id d\'un autre dossier : ignoré (clause dossier_id)', async () => {
    // dossierA et dossierB sont tous deux détenus par tutA. On réordonne dossierA
    // en glissant un id d'action de dossierB : l'UPDATE filtre AND dossier_id=A,
    // donc l'action de B n'est pas déplacée vers A.
    const aA = await addAction(sTutA, dossierA, { libelle: 'isoler-A' })
    const aB = await addAction(sTutA, dossierB, { libelle: 'isoler-B' })
    const bBefore = (await listActions(sTutA, dossierB)).find((x) => x.id === aB)!
    const r = await sTutA.post('/api/actions/reorder', { dossierId: dossierA, ids: [aA, aB] })
    expect(r.status).toBe(200)
    expect(r.json).toEqual({ ok: true })
    // L'action de B reste dans B (toujours listée côté B), non rapatriée dans A.
    const inA = await listActions(sTutA, dossierA)
    expect(inA.find((x) => x.id === aB)).toBeUndefined()
    const inB = await listActions(sTutA, dossierB)
    expect(inB.find((x) => x.id === aB)).toBeDefined()
    // aA a bien été positionné en tête de A (index 0 de la liste fournie).
    expect(inA.find((x) => x.id === aA)!.ordre).toBe(0)
    // bBefore conservé pour traçabilité (l'action de B n'a pas migré).
    expect(bBefore.id).toBe(aB)
  })

  it('TC-ACT-037 — 400 ids non-tableau', async () => {
    const str = await sTutA.post('/api/actions/reorder', { dossierId: dossierA, ids: 'abc' })
    expect(str.status).toBe(400)
    expect(str.json).toEqual({ error: 'Ordre invalide' })
    const sansIds = await sTutA.post('/api/actions/reorder', { dossierId: dossierA })
    expect(sansIds.status).toBe(400)
    expect(sansIds.json).toEqual({ error: 'Ordre invalide' })
  })

  it('TC-ACT-038 — ids tableau vide : 200, toutes renumérotées à partir de 0 sans collision', async () => {
    // Dossier dédié pour un état déterministe : nouveau parcours jetable.
    const dossierEmpty = await startParcours(sAccB, tutA.id, 'Parcours reorder vide')
    await addAction(sTutA, dossierEmpty, { libelle: 'vide-1' })
    await addAction(sTutA, dossierEmpty, { libelle: 'vide-2' })
    const r = await sTutA.post('/api/actions/reorder', { dossierId: dossierEmpty, ids: [] })
    expect(r.status).toBe(200)
    expect(r.json).toEqual({ ok: true })
    const acts = await listActions(sTutA, dossierEmpty)
    const ordres = acts.map((x) => x.ordre).sort((p, q) => p - q)
    // Ordres contigus à partir de 0 : [0, 1, ...].
    expect(ordres).toEqual(ordres.map((_, i) => i))
    expect(new Set(ordres).size).toBe(ordres.length)
  })

  it('TC-ACT-039 — 404 dossier non accessible', async () => {
    // tutA n'est pas lié à dossierTutB. dossierForUser échoue avant le contrôle ids.
    const r = await sTutA.post('/api/actions/reorder', { dossierId: dossierTutB, ids: [1] })
    expect(r.status).toBe(404)
    expect(r.json).toEqual({ error: 'Dossier introuvable' })
  })

  it('TC-ACT-040 — 401 non authentifié', async () => {
    const r = await new Session().post('/api/actions/reorder', { dossierId: 1, ids: [1] })
    expect(r.status).toBe(401)
    expect(r.json).toEqual({ error: 'Non authentifié' })
  })
})

// ---------------------------------------------------------------------------
// GET /api/notifications
// ---------------------------------------------------------------------------
describe('GET /api/notifications', () => {
  it('TC-ACT-045 — nominal : liste + nonLues, déclenche le balayage des rappels', async () => {
    // Action sur dossierA (accA accompagné, tutA accompagnateur), rappel échu, non notifié.
    await addAction(sTutA, dossierA, { libelle: 'Rappel sweep nominal', echeance: '2026-06-10', rappel_le: PAST })
    const r = await sAccA.get('/api/notifications')
    expect(r.status).toBe(200)
    expect(Array.isArray(r.json.notifications)).toBe(true)
    expect(typeof r.json.nonLues).toBe('number')
    expect(r.json.notifications.length).toBeLessThanOrEqual(30)
    expect(r.json.notifications.length).toBeGreaterThanOrEqual(1)
    const n = r.json.notifications[0]
    for (const k of ['id', 'texte', 'lu', 'cree_le']) expect(n).toHaveProperty(k)
    expect(r.json.nonLues).toBeGreaterThanOrEqual(1)
    // Tri cree_le DESC (non strict : cree_le est une chaîne ISO comparable).
    const dates = (r.json.notifications as Array<{ cree_le: string }>).map((x) => x.cree_le)
    for (let i = 1; i < dates.length; i++) expect(dates[i - 1] >= dates[i]).toBe(true)
  })

  it('TC-ACT-046 — isolement par utilisateur (on ne voit que les siennes)', async () => {
    // Provoque une notification distincte chez accB sans en générer chez accA :
    // rappel échu sur dossierB (accB accompagné). Le sweep notifie accB + tutA, pas accA.
    await addAction(sTutA, dossierB, { libelle: 'Rappel isolement', rappel_le: PAST })
    const rB = await sAccB.get('/api/notifications')
    expect(rB.status).toBe(200)
    const textesB = (rB.json.notifications as Array<{ texte: string }>).map((x) => x.texte)
    expect(textesB.some((t) => t.includes('Rappel isolement'))).toBe(true)
    // accNone (jamais lié à aucun dossier) ne voit aucune de ces notifications.
    const rNone = await sAccNone.get('/api/notifications')
    expect(rNone.status).toBe(200)
    const textesNone = (rNone.json.notifications as Array<{ texte: string }>).map((x) => x.texte)
    expect(textesNone.some((t) => t.includes('Rappel isolement'))).toBe(false)
  })

  it('TC-ACT-048 — 401 non authentifié', async () => {
    const r = await new Session().get('/api/notifications')
    expect(r.status).toBe(401)
    expect(r.json).toEqual({ error: 'Non authentifié' })
  })
})

// ---------------------------------------------------------------------------
// POST /api/notifications/lues
// ---------------------------------------------------------------------------
describe('POST /api/notifications/lues', () => {
  it('TC-ACT-049 — nominal : marque toutes les notifications comme lues', async () => {
    // Garantir au moins une non lue chez accA.
    await addAction(sTutA, dossierA, { libelle: 'Rappel à lire', rappel_le: PAST })
    const avant = await sAccA.get('/api/notifications')
    expect(avant.json.nonLues).toBeGreaterThan(0)
    const r = await sAccA.post('/api/notifications/lues')
    expect(r.status).toBe(200)
    expect(r.json).toEqual({ ok: true })
    const apres = await sAccA.get('/api/notifications')
    expect(apres.json.nonLues).toBe(0)
    for (const n of apres.json.notifications as Array<{ lu: number }>) expect(n.lu).toBe(1)
  })

  it('TC-ACT-050 — n\'affecte que l\'utilisateur courant', async () => {
    // Générer une non lue chez accB.
    await addAction(sTutA, dossierB, { libelle: 'Rappel cloisonnement', rappel_le: PAST })
    await sAccB.get('/api/notifications') // matérialise et compte
    const bAvant = (await sAccB.get('/api/notifications')).json.nonLues as number
    expect(bAvant).toBeGreaterThan(0)
    // accA marque ses notifications comme lues.
    await sAccA.get('/api/notifications')
    const lues = await sAccA.post('/api/notifications/lues')
    expect(lues.status).toBe(200)
    // Les non lues de B sont inchangées (UPDATE borné à user_id=A).
    const bApres = (await sAccB.get('/api/notifications')).json.nonLues as number
    expect(bApres).toBe(bAvant)
  })

  it('TC-ACT-051 — 401 non authentifié', async () => {
    const r = await new Session().post('/api/notifications/lues')
    expect(r.status).toBe(401)
    expect(r.json).toEqual({ error: 'Non authentifié' })
  })
})

// ---------------------------------------------------------------------------
// GET /api/tags
// ---------------------------------------------------------------------------
describe('GET /api/tags', () => {
  it('TC-ACT-052 — nominal : tags distincts des dossiers de l\'accompagnateur', async () => {
    // tutA pose deux tags sur dossierA.
    expect((await sTutA.post(`/api/tags/dossier/${dossierA}`, { nom: 'alternance' })).status).toBe(201)
    expect((await sTutA.post(`/api/tags/dossier/${dossierA}`, { nom: 'memoire' })).status).toBe(201)
    const r = await sTutA.get('/api/tags')
    expect(r.status).toBe(200)
    expect(Array.isArray(r.json.tags)).toBe(true)
    const tags = r.json.tags as Array<{ id: number; nom: string }>
    for (const t of tags) {
      expect(t).toHaveProperty('id')
      expect(t).toHaveProperty('nom')
    }
    const noms = tags.map((t) => t.nom)
    expect(noms).toContain('alternance')
    expect(noms).toContain('memoire')
    // DISTINCT : pas de doublon de nom.
    expect(new Set(noms).size).toBe(noms.length)
    // Trié par nom ASC.
    const sorted = [...noms].sort()
    expect(noms).toEqual(sorted)
  })

  it('TC-ACT-053 — accompagnateur sans tag : liste vide', async () => {
    // tutB ne possède que dossierTutB, sur lequel aucun tag n'est posé.
    const r = await sTutB.get('/api/tags')
    expect(r.status).toBe(200)
    expect(r.json).toEqual({ tags: [] })
  })

  it('TC-ACT-054 — 403 mauvais rôle (accompagné)', async () => {
    const r = await sAccA.get('/api/tags')
    expect(r.status).toBe(403)
    expect(r.json).toEqual({ error: 'Accès refusé' })
  })

  it('TC-ACT-055 — 401 non authentifié', async () => {
    const r = await new Session().get('/api/tags')
    expect(r.status).toBe(401)
    expect(r.json).toEqual({ error: 'Non authentifié' })
  })
})

// ---------------------------------------------------------------------------
// POST /api/tags/dossier/:dossierId
// ---------------------------------------------------------------------------
describe('POST /api/tags/dossier/:dossierId', () => {
  it('TC-ACT-056 — nominal : crée et associe un tag (normalisé en minuscules)', async () => {
    const r = await sTutA.post(`/api/tags/dossier/${dossierA}`, { nom: '  Alternance  ' })
    expect(r.status).toBe(201)
    expect(r.json.nom).toBe('alternance')
    expect(typeof r.json.id).toBe('number')
    // Relecture : le tag (en minuscules trimées) figure bien dans la liste.
    const noms = (await sTutA.get('/api/tags')).json.tags.map((t: { nom: string }) => t.nom)
    expect(noms).toContain('alternance')
  })

  it('TC-ACT-057 — idempotence : réutilise un tag existant, pas de doublon de liaison', async () => {
    const first = await sTutA.post(`/api/tags/dossier/${dossierA}`, { nom: 'alternance' })
    expect(first.status).toBe(201)
    const second = await sTutA.post(`/api/tags/dossier/${dossierA}`, { nom: 'alternance' })
    expect(second.status).toBe(201)
    // Même id de tag réutilisé (nom UNIQUE).
    expect(second.json.id).toBe(first.json.id)
    // Pas de doublon dans la liste distincte des tags.
    const noms = (await sTutA.get('/api/tags')).json.tags.map((t: { nom: string }) => t.nom) as string[]
    expect(noms.filter((n) => n === 'alternance').length).toBe(1)
  })

  it('TC-ACT-058 — 400 nom vide après trim', async () => {
    const espaces = await sTutA.post(`/api/tags/dossier/${dossierA}`, { nom: '   ' })
    expect(espaces.status).toBe(400)
    expect(espaces.json).toEqual({ error: 'Données invalides' })
    const sansNom = await sTutA.post(`/api/tags/dossier/${dossierA}`, {})
    expect(sansNom.status).toBe(400)
    expect(sansNom.json).toEqual({ error: 'Données invalides' })
  })

  it('TC-ACT-059 — 400 dossier non détenu (même message que validation)', async () => {
    // tutA ne possède pas dossierTutB. ownsDossier KO -> 400 « Données invalides ».
    const r = await sTutA.post(`/api/tags/dossier/${dossierTutB}`, { nom: 'test' })
    expect(r.status).toBe(400)
    expect(r.json).toEqual({ error: 'Données invalides' })
  })

  it('TC-ACT-060 — 403 mauvais rôle (accompagné)', async () => {
    const r = await sAccA.post(`/api/tags/dossier/${dossierA}`, { nom: 'x' })
    expect(r.status).toBe(403)
    expect(r.json).toEqual({ error: 'Accès refusé' })
  })

  it('TC-ACT-061 — 401 non authentifié', async () => {
    const r = await new Session().post('/api/tags/dossier/1', { nom: 'x' })
    expect(r.status).toBe(401)
    expect(r.json).toEqual({ error: 'Non authentifié' })
  })
})

// ---------------------------------------------------------------------------
// DELETE /api/tags/dossier/:dossierId/:tagId
// ---------------------------------------------------------------------------
describe('DELETE /api/tags/dossier/:dossierId/:tagId', () => {
  it('TC-ACT-062 — nominal : retire la liaison tag-dossier', async () => {
    // Tag unique posé sur dossierB uniquement -> sa suppression le fait disparaître de /tags.
    const posted = await sTutA.post(`/api/tags/dossier/${dossierB}`, { nom: 'tag-a-retirer' })
    expect(posted.status).toBe(201)
    const tagId = posted.json.id as number
    expect((await sTutA.get('/api/tags')).json.tags.map((t: { nom: string }) => t.nom)).toContain('tag-a-retirer')
    const r = await sTutA.del(`/api/tags/dossier/${dossierB}/${tagId}`)
    expect(r.status).toBe(200)
    expect(r.json).toEqual({ ok: true })
    // Plus aucun dossier n'utilise ce tag -> il disparaît de la liste.
    expect((await sTutA.get('/api/tags')).json.tags.map((t: { nom: string }) => t.nom)).not.toContain('tag-a-retirer')
  })

  it('TC-ACT-063 — 404 dossier non détenu', async () => {
    // tutA ne possède pas dossierTutB. ownsDossier KO -> 404.
    const r = await sTutA.del(`/api/tags/dossier/${dossierTutB}/999999`)
    expect(r.status).toBe(404)
    expect(r.json).toEqual({ error: 'Dossier introuvable' })
  })

  it('TC-ACT-064 — liaison inexistante : 200 idempotent', async () => {
    const r = await sTutA.del(`/api/tags/dossier/${dossierA}/999999`)
    expect(r.status).toBe(200)
    expect(r.json).toEqual({ ok: true })
  })

  it('TC-ACT-065 — 403 mauvais rôle (accompagné)', async () => {
    const r = await sAccA.del(`/api/tags/dossier/${dossierA}/1`)
    expect(r.status).toBe(403)
    expect(r.json).toEqual({ error: 'Accès refusé' })
  })

  it('TC-ACT-066 — 401 non authentifié', async () => {
    const r = await new Session().del('/api/tags/dossier/1/1')
    expect(r.status).toBe(401)
    expect(r.json).toEqual({ error: 'Non authentifié' })
  })
})

// ---------------------------------------------------------------------------
// GET /api/notifications — limite à 30 (TC-ACT-047)
// Placé en fin de fichier : génère beaucoup de notifications sur un dossier
// dédié jetable, sans impacter les autres cas (chaque it a son propre dossier).
// ---------------------------------------------------------------------------
describe('GET /api/notifications — limite 30', () => {
  it('TC-ACT-047 — limite à 30 entrées les plus récentes', async () => {
    // On fabrique >30 notifications pour un accompagné jetable dédié via des rappels
    // échus successifs (chaque rappel dû génère 1 notif accompagné + 1 accompagnateur).
    const accBulk = await createTestUser(admin, 'accompagne', 'actnotif-bulk')
    const sAccBulk = await asUser({ email: accBulk.email, password: accBulk.password })
    try {
      const dossierBulk = await startParcours(sAccBulk, tutA.id, 'Parcours notif bulk')
      // 32 actions à rappel échu -> 32 notifications pour l'accompagné après sweep.
      for (let i = 0; i < 32; i++) {
        await addAction(sTutA, dossierBulk, { libelle: `bulk-${i}`, rappel_le: PAST })
      }
      const r = await sAccBulk.get('/api/notifications')
      expect(r.status).toBe(200)
      // LIMIT 30 : exactement 30 entrées renvoyées.
      expect(r.json.notifications.length).toBe(30)
      // nonLues reflète le total réel (sans limite) -> >= 31.
      expect(r.json.nonLues).toBeGreaterThanOrEqual(31)
      // Tri cree_le DESC.
      const dates = (r.json.notifications as Array<{ cree_le: string }>).map((x) => x.cree_le)
      for (let i = 1; i < dates.length; i++) expect(dates[i - 1] >= dates[i]).toBe(true)
    } finally {
      await deleteTestUser(admin, accBulk)
    }
  })
})

// ---------------------------------------------------------------------------
// Garde-fou : référence des dossiers de démo (lecture seule) sans mutation.
// demoForeignDossier est découvert dynamiquement mais n'est utilisé dans aucun
// scénario destructif ; on documente ici qu'il reste accessible et intact.
// ---------------------------------------------------------------------------
describe('Non-régression — pas d\'effet de bord sur les dossiers de démo', () => {
  it('TC-ACT-007b — un accompagnateur jetable ne peut pas lire un dossier de démo (404, aucune mutation)', async () => {
    // couvre l'ownership croisé vers un dossier de démo en lecture seule (cf. TC-ACT-007).
    const r = await sTutA.get(`/api/actions?dossierId=${demoForeignDossier}`)
    expect(r.status).toBe(404)
    expect(r.json).toEqual({ error: 'Dossier introuvable' })
  })
})
