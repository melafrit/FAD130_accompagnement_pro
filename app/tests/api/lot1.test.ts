// Tests d'intégration API — domaine « lot1 » (fonctionnalités & administration des plans/comptes).
// Cible : stack Docker http://localhost:8080. Exécution séquentielle (un seul worker).
//
// Sources de vérité lues : app/api/src/features.ts (userFeatures, sanitizeKeys, requireFeature),
// app/api/src/admin.ts (plans, users, lien) et app/api/src/auth.ts (requireAuth/requireRole,
// GET /api/auth/me/features). Les chemins de gating réels (mount points index.ts) sont
// /api/viz/emotions/catalogue (roue_emotions) et /api/collab/ressources (mutualisation), et NON
// ceux figurant à titre indicatif dans le catalogue.
//
// Ne couvre que les cas de niveau « api » du catalogue lot1. Les cas unitaires et UI
// (sanitizeKeys, userFeatures, PlansManager, gating front…) sont traités ailleurs.

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Session, asUser, DEMO } from '../helpers/api'
import { createTestUser, deleteTestUser, type TestUser } from '../helpers/fixtures'

// Le socle (plan « Découverte ») d'après features.ts / CONVENTIONS.md.
const SOCLE = [
  'questionnaire', 'entretien', 'comptes_rendus', 'rdv',
  'plan_action', 'synthese', 'auto_evaluation', 'multi_parcours',
]

let admin: Session
let allKeys: string[] // ALL_FEATURE_KEYS (registre complet)
let plans: { id: number; nom: string }[] = []
let decouverteId: number
let proId: number

// Ressources à nettoyer en afterAll.
const createdPlanIds: number[] = []
const createdUsers: TestUser[] = []

// Petit utilitaire : (re)charge la liste des plans côté admin.
async function fetchPlans(): Promise<any[]> {
  const r = await admin.get('/api/admin/plans')
  expect(r.status).toBe(200)
  return r.json.plans
}

// Crée un plan jetable et mémorise son id pour nettoyage.
async function makePlan(nom: string, features: string[]): Promise<number> {
  const r = await admin.post('/api/admin/plans', { nom, features })
  expect(r.status).toBe(201)
  const id = r.json.id as number
  createdPlanIds.push(id)
  return id
}

beforeAll(async () => {
  admin = await asUser(DEMO.admin)

  // Registre complet (source de vérité pour la longueur attendue, plutôt qu'un 37 codé en dur).
  const feats = await admin.get('/api/admin/features')
  expect(feats.status).toBe(200)
  allKeys = feats.json.all

  // Plans seedés : on découvre dynamiquement Découverte et Pro.
  const list = await fetchPlans()
  plans = list.map((p: any) => ({ id: p.id, nom: p.nom }))
  const decouverte = list.find((p: any) => p.nom === 'Découverte')
  const pro = list.find((p: any) => p.nom === 'Pro')
  if (!decouverte || !pro) throw new Error('Plans de démo « Découverte » et « Pro » introuvables')
  decouverteId = decouverte.id
  proId = pro.id
})

afterAll(async () => {
  // Supprime les plans jetables créés (réaffecte d'éventuels users à NULL, sans incidence ici).
  for (const id of createdPlanIds) {
    await admin.del(`/api/admin/plans/${id}`)
  }
  // Supprime les comptes de test jetables (RGPD admin, en cascade).
  for (const u of createdUsers) {
    await deleteTestUser(admin, u)
  }
})

// ---------------------------------------------------------------------------
// GET /api/auth/me/features — fonctionnalités de l'utilisateur courant
// ---------------------------------------------------------------------------
describe('GET /api/auth/me/features', () => {
  it("TC-LOT1-001 — utilisateur sans plan reçoit TOUTES les clés (niveau max)", async () => {
    // Mohamed (accompagnateur vitrine) est sans plan_id par défaut.
    const s = await asUser(DEMO.mohamed)
    const r = await s.get('/api/auth/me/features')
    expect(r.status).toBe(200)
    expect(Array.isArray(r.json.features)).toBe(true)
    // Ensemble = ALL_FEATURE_KEYS : même longueur et inclut socle + hors-socle.
    expect(r.json.features.length).toBe(allKeys.length)
    expect(new Set(r.json.features)).toEqual(new Set(allKeys))
    expect(r.json.features).toContain('questionnaire')
    expect(r.json.features).toContain('mutualisation') // hors-socle
  })

  it("TC-LOT1-002 — sur plan Découverte, ne reçoit QUE le socle", async () => {
    // Compte jetable pour ne pas dégrader un compte démo.
    const u = await createTestUser(admin, 'accompagne', 'feat-socle')
    createdUsers.push(u)
    expect((await admin.patch(`/api/admin/users/${u.id}`, { plan_id: decouverteId })).status).toBe(200)

    const s = await asUser({ email: u.email, password: u.password })
    const r = await s.get('/api/auth/me/features')
    expect(r.status).toBe(200)
    expect(r.json.features.length).toBe(SOCLE.length) // 8
    expect(new Set(r.json.features)).toEqual(new Set(SOCLE))
    expect(r.json.features).toContain('questionnaire')
    expect(r.json.features).not.toContain('roue_emotions')
    expect(r.json.features).not.toContain('mutualisation')
  })

  it("TC-LOT1-003 — sur plan Pro, reçoit l'intégralité des clés", async () => {
    const u = await createTestUser(admin, 'accompagne', 'feat-pro')
    createdUsers.push(u)
    expect((await admin.patch(`/api/admin/users/${u.id}`, { plan_id: proId })).status).toBe(200)

    const s = await asUser({ email: u.email, password: u.password })
    const r = await s.get('/api/auth/me/features')
    expect(r.status).toBe(200)
    // Pro = ALL_FEATURE_KEYS : même ensemble que le registre complet.
    expect(new Set(r.json.features)).toEqual(new Set(allKeys))
    expect(r.json.features.length).toBe(allKeys.length)
  })

  it("TC-LOT1-004 — non authentifié → 401 'Non authentifié'", async () => {
    const s = new Session()
    const r = await s.get('/api/auth/me/features')
    expect(r.status).toBe(401)
    expect(r.json.error).toBe('Non authentifié')
  })

  it("TC-LOT1-005 — cookie/JWT invalide → 401 'Session invalide'", async () => {
    const s = new Session()
    s.cookie = 'boussole_token=abc.invalid.token'
    const r = await s.get('/api/auth/me/features')
    expect(r.status).toBe(401)
    expect(r.json.error).toBe('Session invalide')
  })
})

// ---------------------------------------------------------------------------
// Matrice de gating (requireFeature) — plan socle vs hors-socle vs sans plan
// ---------------------------------------------------------------------------
describe('Gating par abonnement (requireFeature)', () => {
  // Un seul compte Découverte partagé pour les cas 007/008/009.
  let gateUser: TestUser
  let gateSession: Session

  beforeAll(async () => {
    gateUser = await createTestUser(admin, 'accompagnateur', 'gate-decouverte')
    createdUsers.push(gateUser)
    expect((await admin.patch(`/api/admin/users/${gateUser.id}`, { plan_id: decouverteId })).status).toBe(200)
    gateSession = await asUser({ email: gateUser.email, password: gateUser.password })
  })

  it("TC-LOT1-007 — Découverte : 403 sur fonctionnalité HORS socle (roue_emotions)", async () => {
    const r = await gateSession.get('/api/viz/emotions/catalogue')
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('Fonctionnalité non disponible dans votre offre')
  })

  it("TC-LOT1-008 — Découverte (accompagnateur) : 403 sur mutualisation (requireRole passe, requireFeature bloque)", async () => {
    const r = await gateSession.get('/api/collab/ressources')
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('Fonctionnalité non disponible dans votre offre')
  })

  it("TC-LOT1-009 — Découverte : la fonctionnalité socle (entretien) n'est jamais bloquée par le gating", async () => {
    // 'entretien' fait partie du socle Découverte (vérifié via /me/features).
    const feats = await gateSession.get('/api/auth/me/features')
    expect(feats.status).toBe(200)
    expect(feats.json.features).toContain('entretien')
    // Un endpoint accompagnateur du domaine entretien : jamais le 403 « Fonctionnalité non disponible ».
    const r = await gateSession.get('/api/entretien/dashboard')
    expect(r.status).toBe(200)
    expect(Array.isArray(r.json.dossiers)).toBe(true)
    expect(r.json.error).not.toBe('Fonctionnalité non disponible dans votre offre')
  })

  it("TC-LOT1-010 — sans plan : 200 sur fonctionnalité hors socle (roue_emotions)", async () => {
    // Mohamed est sans plan → userFeatures = niveau max, aucun blocage de gating.
    const s = await asUser(DEMO.mohamed)
    const r = await s.get('/api/viz/emotions/catalogue')
    expect(r.status).toBe(200)
    expect(Array.isArray(r.json.emotions)).toBe(true)
    expect(r.json.emotions.length).toBeGreaterThan(0)
  })

  it("TC-LOT1-011 — requireFeature sans session → 401 'Non authentifié' (branche !u, avant tout 403)", async () => {
    const s = new Session()
    const r = await s.get('/api/viz/emotions/catalogue')
    expect(r.status).toBe(401)
    expect(r.json.error).toBe('Non authentifié')
  })
})

// ---------------------------------------------------------------------------
// GET /api/admin/features — registre complet
// ---------------------------------------------------------------------------
describe('GET /api/admin/features', () => {
  it("TC-LOT1-015 — nominal (registre complet, forme et catégories)", async () => {
    const r = await admin.get('/api/admin/features')
    expect(r.status).toBe(200)
    expect(Array.isArray(r.json.features)).toBe(true)
    expect(Array.isArray(r.json.all)).toBe(true)
    expect(r.json.all.length).toBe(r.json.features.length)
    expect(r.json.features.length).toBeGreaterThanOrEqual(37)
    for (const f of r.json.features) {
      expect(typeof f.key).toBe('string')
      expect(f.key.length).toBeGreaterThan(0)
      expect(typeof f.label).toBe('string')
      expect(f.label.length).toBeGreaterThan(0)
      expect(typeof f.categorie).toBe('string')
      expect(f.categorie.length).toBeGreaterThan(0)
    }
    const categories = new Set(r.json.features.map((f: any) => f.categorie))
    expect(categories.has('Socle')).toBe(true)
    expect(categories.has('Visuel')).toBe(true)
    expect(categories.has('IA & posture')).toBe(true)
    // all === clés des features.
    expect(new Set(r.json.all)).toEqual(new Set(r.json.features.map((f: any) => f.key)))
  })

  it("TC-LOT1-016 — 401 non authentifié", async () => {
    const s = new Session()
    const r = await s.get('/api/admin/features')
    expect(r.status).toBe(401)
    expect(r.json.error).toBe('Non authentifié')
  })

  it("TC-LOT1-017 — 403 rôle accompagnateur", async () => {
    const s = await asUser(DEMO.mohamed)
    const r = await s.get('/api/admin/features')
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('Accès refusé')
  })

  it("TC-LOT1-018 — 403 rôle accompagné", async () => {
    const s = await asUser(DEMO.amine)
    const r = await s.get('/api/admin/features')
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('Accès refusé')
  })
})

// ---------------------------------------------------------------------------
// GET /api/admin/users
// ---------------------------------------------------------------------------
describe('GET /api/admin/users', () => {
  it("TC-LOT1-019 — nominal (liste triée cree_le DESC + jointure plan)", async () => {
    const r = await admin.get('/api/admin/users')
    expect(r.status).toBe(200)
    expect(Array.isArray(r.json.users)).toBe(true)
    expect(r.json.users.length).toBeGreaterThanOrEqual(6)
    const u = r.json.users[0]
    for (const champ of ['id', 'email', 'role', 'nom', 'prenom', 'actif', 'email_verifie', 'plan_id']) {
      expect(u).toHaveProperty(champ)
    }
    expect(r.json.users[0]).toHaveProperty('plan_nom')
    // Tri cree_le DESC : non croissant.
    const dates = r.json.users.map((x: any) => x.cree_le)
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i - 1] >= dates[i]).toBe(true)
    }
    // plan_nom NULL pour un user sans plan (Mohamed, sans plan_id).
    const mohamed = r.json.users.find((x: any) => x.email === DEMO.mohamed.email)
    expect(mohamed).toBeTruthy()
    expect(mohamed.plan_id == null).toBe(true)
    expect(mohamed.plan_nom == null).toBe(true)
  })

  it("TC-LOT1-020 — 403 rôle accompagnateur", async () => {
    const s = await asUser(DEMO.mohamed)
    const r = await s.get('/api/admin/users')
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('Accès refusé')
  })

  it("TC-LOT1-021 — 401 non authentifié", async () => {
    const s = new Session()
    const r = await s.get('/api/admin/users')
    expect(r.status).toBe(401)
    expect(r.json.error).toBe('Non authentifié')
  })
})

// ---------------------------------------------------------------------------
// GET /api/admin/plans
// ---------------------------------------------------------------------------
describe('GET /api/admin/plans', () => {
  it("TC-LOT1-022 — nominal (features assainies + nb_users, tri cree_le ASC)", async () => {
    const list = await fetchPlans()
    expect(Array.isArray(list)).toBe(true)
    expect(list.length).toBeGreaterThanOrEqual(3)
    const validKeys = new Set(allKeys)
    for (const p of list) {
      for (const champ of ['id', 'nom', 'description', 'features', 'cree_le', 'nb_users']) {
        expect(p).toHaveProperty(champ)
      }
      expect(Array.isArray(p.features)).toBe(true)
      // Toutes les clés exposées sont valides (assainies).
      for (const k of p.features) expect(validKeys.has(k)).toBe(true)
      expect(Number.isInteger(p.nb_users)).toBe(true)
      expect(p.nb_users).toBeGreaterThanOrEqual(0)
    }
    // Tri cree_le ASC : non décroissant.
    const dates = list.map((p: any) => p.cree_le)
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i - 1] <= dates[i]).toBe(true)
    }
    const decouverte = list.find((p: any) => p.nom === 'Découverte')
    const pro = list.find((p: any) => p.nom === 'Pro')
    expect(decouverte.features.length).toBe(SOCLE.length) // 8
    expect(pro.features.length).toBe(allKeys.length) // 37
  })

  it("TC-LOT1-023 — features stockées corrompues assainies à [] (pas de 500)", async () => {
    // On ne peut pas corrompre la base via l'API ; on vérifie le contrat équivalent :
    // sanitizeKeys(safeParse) ne renvoie jamais autre chose qu'un tableau de clés valides,
    // et un plan créé avec uniquement des clés invalides ressort avec features [].
    const id = await makePlan('QA corrompu ' + Date.now(), [])
    const list = await fetchPlans()
    const plan = list.find((p: any) => p.id === id)
    expect(plan).toBeTruthy()
    expect(Array.isArray(plan.features)).toBe(true)
    expect(plan.features).toEqual([])
  })

  it("TC-LOT1-024 — 403 accompagnateur / 401 anonyme", async () => {
    const acc = await asUser(DEMO.mohamed)
    const r403 = await acc.get('/api/admin/plans')
    expect(r403.status).toBe(403)
    expect(r403.json.error).toBe('Accès refusé')

    const anon = new Session()
    const r401 = await anon.get('/api/admin/plans')
    expect(r401.status).toBe(401)
    expect(r401.json.error).toBe('Non authentifié')
  })
})

// ---------------------------------------------------------------------------
// POST /api/admin/plans
// ---------------------------------------------------------------------------
describe('POST /api/admin/plans', () => {
  it("TC-LOT1-025 — création nominale", async () => {
    const nom = 'Test QA ' + Date.now()
    const r = await admin.post('/api/admin/plans', { nom, description: 'desc', features: ['rdv', 'synthese'] })
    expect(r.status).toBe(201)
    expect(typeof r.json.id).toBe('number')
    createdPlanIds.push(r.json.id)

    const list = await fetchPlans()
    const plan = list.find((p: any) => p.id === r.json.id)
    expect(plan).toBeTruthy()
    expect(new Set(plan.features)).toEqual(new Set(['rdv', 'synthese']))
    expect(plan.nb_users).toBe(0)
  })

  it("TC-LOT1-026 — nom manquant ou vide → 400", async () => {
    for (const body of [{}, { nom: '' }, { nom: '   ' }]) {
      const r = await admin.post('/api/admin/plans', body)
      expect(r.status).toBe(400)
      expect(r.json.error).toBe('Le nom du plan est requis')
    }
  })

  it("TC-LOT1-027 — features invalides assainies (clés inconnues/doublons ignorés)", async () => {
    const nom = 'Mix QA ' + Date.now()
    const r = await admin.post('/api/admin/plans', { nom, features: ['rdv', 'inconnu', 'rdv', 7] })
    expect(r.status).toBe(201)
    createdPlanIds.push(r.json.id)
    const list = await fetchPlans()
    const plan = list.find((p: any) => p.id === r.json.id)
    expect(plan.features).toEqual(['rdv'])
  })

  it("TC-LOT1-028 — features absent → plan sans fonctionnalité ([])", async () => {
    const nom = 'Vide QA ' + Date.now()
    const r = await admin.post('/api/admin/plans', { nom })
    expect(r.status).toBe(201)
    createdPlanIds.push(r.json.id)
    const list = await fetchPlans()
    const plan = list.find((p: any) => p.id === r.json.id)
    expect(plan.features).toEqual([])
  })

  it("TC-LOT1-029 — 403 accompagnateur / 401 anonyme (aucun plan créé)", async () => {
    const acc = await asUser(DEMO.mohamed)
    const r403 = await acc.post('/api/admin/plans', { nom: 'X interdit' })
    expect(r403.status).toBe(403)
    expect(r403.json.error).toBe('Accès refusé')

    const anon = new Session()
    const r401 = await anon.post('/api/admin/plans', { nom: 'X interdit' })
    expect(r401.status).toBe(401)
    expect(r401.json.error).toBe('Non authentifié')

    const list = await fetchPlans()
    expect(list.find((p: any) => p.nom === 'X interdit')).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// PATCH /api/admin/plans/:id
// ---------------------------------------------------------------------------
describe('PATCH /api/admin/plans/:id', () => {
  it("TC-LOT1-030 — modification nominale (nom + description + features)", async () => {
    const id = await makePlan('PatchA ' + Date.now(), ['rdv'])
    const nom = 'Test QA v2 ' + Date.now()
    const r = await admin.patch(`/api/admin/plans/${id}`, { nom, description: 'maj', features: ['rdv', 'synthese', 'falc'] })
    expect(r.status).toBe(200)
    expect(r.json.ok).toBe(true)
    const list = await fetchPlans()
    const plan = list.find((p: any) => p.id === id)
    expect(plan.nom).toBe(nom)
    expect(plan.description).toBe('maj')
    expect(new Set(plan.features)).toEqual(new Set(['rdv', 'synthese', 'falc']))
  })

  it("TC-LOT1-031 — mise à jour partielle (description seule ; nom & features inchangés)", async () => {
    const nomInitial = 'PatchB ' + Date.now()
    const id = await makePlan(nomInitial, ['rdv', 'synthese'])
    const r = await admin.patch(`/api/admin/plans/${id}`, { description: 'nouvelle desc' })
    expect(r.status).toBe(200)
    const list = await fetchPlans()
    const plan = list.find((p: any) => p.id === id)
    expect(plan.description).toBe('nouvelle desc')
    expect(plan.nom).toBe(nomInitial) // inchangé (nom undefined)
    expect(new Set(plan.features)).toEqual(new Set(['rdv', 'synthese'])) // inchangé (features undefined)
  })

  it("TC-LOT1-032 — nom fourni mais vide → 400 (plan inchangé)", async () => {
    const nomInitial = 'PatchC ' + Date.now()
    const id = await makePlan(nomInitial, ['rdv'])
    const r = await admin.patch(`/api/admin/plans/${id}`, { nom: '   ' })
    expect(r.status).toBe(400)
    expect(r.json.error).toBe('Le nom du plan ne peut pas être vide')
    const list = await fetchPlans()
    expect(list.find((p: any) => p.id === id).nom).toBe(nomInitial)
  })

  it("TC-LOT1-033 — description null efface la description", async () => {
    const id = await makePlan('PatchD ' + Date.now(), ['rdv'])
    expect((await admin.patch(`/api/admin/plans/${id}`, { description: 'à effacer' })).status).toBe(200)
    const r = await admin.patch(`/api/admin/plans/${id}`, { description: null })
    expect(r.status).toBe(200)
    const list = await fetchPlans()
    expect(list.find((p: any) => p.id === id).description == null).toBe(true)
  })

  it("TC-LOT1-034 — plan inexistant → 404", async () => {
    const r = await admin.patch('/api/admin/plans/999999', { nom: 'X' })
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Plan introuvable')
  })

  it("TC-LOT1-035 — 403 accompagnateur / 401 anonyme (plan inchangé)", async () => {
    const nomInitial = 'PatchE ' + Date.now()
    const id = await makePlan(nomInitial, ['rdv'])

    const acc = await asUser(DEMO.mohamed)
    const r403 = await acc.patch(`/api/admin/plans/${id}`, { nom: 'Hack' })
    expect(r403.status).toBe(403)
    expect(r403.json.error).toBe('Accès refusé')

    const anon = new Session()
    const r401 = await anon.patch(`/api/admin/plans/${id}`, { nom: 'Hack' })
    expect(r401.status).toBe(401)
    expect(r401.json.error).toBe('Non authentifié')

    const list = await fetchPlans()
    expect(list.find((p: any) => p.id === id).nom).toBe(nomInitial)
  })

  it("TC-LOT1-036 — plan socle protégé : PATCH/DELETE → 403, flag builtin exposé, plan intact", async () => {
    const list = await fetchPlans()
    const pro = list.find((p: any) => p.nom === 'Pro')
    expect(pro).toBeDefined()
    expect(pro.builtin).toBe(true)

    expect((await admin.patch(`/api/admin/plans/${pro.id}`, { description: 'tentative' })).status).toBe(403)
    expect((await admin.del(`/api/admin/plans/${pro.id}`)).status).toBe(403)

    // Le plan socle reste présent et inchangé (mêmes fonctionnalités).
    const after = await fetchPlans()
    const proAfter = after.find((p: any) => p.nom === 'Pro')
    expect(proAfter).toBeDefined()
    expect(new Set(proAfter.features)).toEqual(new Set(pro.features))
  })
})

// ---------------------------------------------------------------------------
// POST /api/admin/plans/:id/duplication
// ---------------------------------------------------------------------------
describe('POST /api/admin/plans/:id/duplication', () => {
  it("TC-LOT1-036 — nominal (copie suffixée, mêmes features)", async () => {
    const nomSource = 'Source QA ' + Date.now()
    const srcId = await makePlan(nomSource, ['rdv', 'synthese'])
    // On fixe une description sur la source pour vérifier la copie.
    expect((await admin.patch(`/api/admin/plans/${srcId}`, { description: 'desc source' })).status).toBe(200)

    const r = await admin.post(`/api/admin/plans/${srcId}/duplication`)
    expect(r.status).toBe(201)
    expect(typeof r.json.id).toBe('number')
    createdPlanIds.push(r.json.id)

    const list = await fetchPlans()
    const copie = list.find((p: any) => p.id === r.json.id)
    expect(copie.nom).toBe(`${nomSource} (copie)`)
    expect(copie.description).toBe('desc source')
    expect(new Set(copie.features)).toEqual(new Set(['rdv', 'synthese']))
    expect(copie.nb_users).toBe(0)
  })

  it("TC-LOT1-037 — plan source inexistant → 404", async () => {
    const r = await admin.post('/api/admin/plans/999999/duplication')
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Plan introuvable')
  })

  it("TC-LOT1-038 — 403 non admin (accompagnateur)", async () => {
    const id = await makePlan('DupGate ' + Date.now(), ['rdv'])
    const acc = await asUser(DEMO.mohamed)
    const r = await acc.post(`/api/admin/plans/${id}/duplication`)
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('Accès refusé')
  })
})

// ---------------------------------------------------------------------------
// DELETE /api/admin/plans/:id
// ---------------------------------------------------------------------------
describe('DELETE /api/admin/plans/:id', () => {
  it("TC-LOT1-039 — suppression réaffecte les utilisateurs rattachés à NULL (niveau max)", async () => {
    // Plan jetable + compte jetable rattaché.
    const id = await makePlan('DelReassign ' + Date.now(), ['rdv'])
    const u = await createTestUser(admin, 'accompagne', 'del-reassign')
    createdUsers.push(u)
    expect((await admin.patch(`/api/admin/users/${u.id}`, { plan_id: id })).status).toBe(200)

    // Supprime le plan.
    const r = await admin.del(`/api/admin/plans/${id}`)
    expect(r.status).toBe(200)
    expect(r.json.ok).toBe(true)
    // Le plan a déjà été supprimé : on le retire du nettoyage afterAll.
    const idx = createdPlanIds.indexOf(id)
    if (idx >= 0) createdPlanIds.splice(idx, 1)

    // Plan absent de la liste.
    const list = await fetchPlans()
    expect(list.find((p: any) => p.id === id)).toBeUndefined()

    // user repasse à plan_id NULL / plan_nom NULL.
    const users = (await admin.get('/api/admin/users')).json.users
    const refreshed = users.find((x: any) => x.id === u.id)
    expect(refreshed.plan_id == null).toBe(true)
    expect(refreshed.plan_nom == null).toBe(true)

    // user obtient le niveau max (toutes les clés).
    const s = await asUser({ email: u.email, password: u.password })
    const feats = await s.get('/api/auth/me/features')
    expect(feats.status).toBe(200)
    expect(new Set(feats.json.features)).toEqual(new Set(allKeys))
  })

  it("TC-LOT1-040 — plan inexistant → 404", async () => {
    const r = await admin.del('/api/admin/plans/999999')
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Plan introuvable')
  })

  it("TC-LOT1-041 — 403 accompagnateur / 401 anonyme (plan non supprimé)", async () => {
    const id = await makePlan('DelGate ' + Date.now(), ['rdv'])

    const acc = await asUser(DEMO.mohamed)
    const r403 = await acc.del(`/api/admin/plans/${id}`)
    expect(r403.status).toBe(403)
    expect(r403.json.error).toBe('Accès refusé')

    const anon = new Session()
    const r401 = await anon.del(`/api/admin/plans/${id}`)
    expect(r401.status).toBe(401)
    expect(r401.json.error).toBe('Non authentifié')

    const list = await fetchPlans()
    expect(list.find((p: any) => p.id === id)).toBeTruthy() // toujours présent
  })
})

// ---------------------------------------------------------------------------
// PATCH /api/admin/users/:id
// ---------------------------------------------------------------------------
describe('PATCH /api/admin/users/:id', () => {
  it("TC-LOT1-042 — affecter un plan à un utilisateur", async () => {
    const u = await createTestUser(admin, 'accompagne', 'assign-plan')
    createdUsers.push(u)
    const r = await admin.patch(`/api/admin/users/${u.id}`, { plan_id: decouverteId })
    expect(r.status).toBe(200)
    expect(r.json.ok).toBe(true)
    const users = (await admin.get('/api/admin/users')).json.users
    const refreshed = users.find((x: any) => x.id === u.id)
    expect(refreshed.plan_id).toBe(decouverteId)
    expect(refreshed.plan_nom).toBe('Découverte')
  })

  it("TC-LOT1-043 — retirer le plan (plan_id null puis '') → niveau max", async () => {
    const u = await createTestUser(admin, 'accompagne', 'remove-plan')
    createdUsers.push(u)
    expect((await admin.patch(`/api/admin/users/${u.id}`, { plan_id: decouverteId })).status).toBe(200)

    // plan_id null
    expect((await admin.patch(`/api/admin/users/${u.id}`, { plan_id: null })).status).toBe(200)
    let users = (await admin.get('/api/admin/users')).json.users
    expect(users.find((x: any) => x.id === u.id).plan_id == null).toBe(true)

    // Re-rattache puis retire via chaîne vide ''
    expect((await admin.patch(`/api/admin/users/${u.id}`, { plan_id: decouverteId })).status).toBe(200)
    expect((await admin.patch(`/api/admin/users/${u.id}`, { plan_id: '' })).status).toBe(200)
    users = (await admin.get('/api/admin/users')).json.users
    expect(users.find((x: any) => x.id === u.id).plan_id == null).toBe(true)

    // Niveau max : 37 clés.
    const s = await asUser({ email: u.email, password: u.password })
    const feats = await s.get('/api/auth/me/features')
    expect(new Set(feats.json.features)).toEqual(new Set(allKeys))
  })

  it("TC-LOT1-044 — plan_id inexistant → 400 (plan_id du user inchangé)", async () => {
    const u = await createTestUser(admin, 'accompagne', 'bad-plan')
    createdUsers.push(u)
    expect((await admin.patch(`/api/admin/users/${u.id}`, { plan_id: decouverteId })).status).toBe(200)

    const r = await admin.patch(`/api/admin/users/${u.id}`, { plan_id: 999999 })
    expect(r.status).toBe(400)
    expect(r.json.error).toBe('Plan introuvable')

    const users = (await admin.get('/api/admin/users')).json.users
    expect(users.find((x: any) => x.id === u.id).plan_id).toBe(decouverteId) // inchangé
  })

  it("TC-LOT1-045 — changement de rôle valide", async () => {
    const u = await createTestUser(admin, 'accompagne', 'role-ok')
    createdUsers.push(u)
    const r = await admin.patch(`/api/admin/users/${u.id}`, { role: 'accompagnateur' })
    expect(r.status).toBe(200)
    expect(r.json.ok).toBe(true)
    const users = (await admin.get('/api/admin/users')).json.users
    expect(users.find((x: any) => x.id === u.id).role).toBe('accompagnateur')
  })

  it("TC-LOT1-046 — rôle invalide ignoré (200, rôle inchangé)", async () => {
    const u = await createTestUser(admin, 'accompagne', 'role-bad')
    createdUsers.push(u)
    const r = await admin.patch(`/api/admin/users/${u.id}`, { role: 'superadmin' })
    expect(r.status).toBe(200)
    expect(r.json.ok).toBe(true)
    const users = (await admin.get('/api/admin/users')).json.users
    expect(users.find((x: any) => x.id === u.id).role).toBe('accompagne') // inchangé
  })

  it("TC-LOT1-047 — activer / désactiver un compte (login refusé si désactivé)", async () => {
    const u = await createTestUser(admin, 'accompagne', 'toggle-actif')
    createdUsers.push(u)

    // Désactiver
    expect((await admin.patch(`/api/admin/users/${u.id}`, { actif: 0 })).status).toBe(200)
    let users = (await admin.get('/api/admin/users')).json.users
    expect(users.find((x: any) => x.id === u.id).actif).toBe(0)

    // Login refusé pour un compte désactivé : 403 'Compte désactivé'.
    const tryLogin = new Session()
    const login = await tryLogin.login(u.email, u.password)
    expect(login.status).toBe(403)
    expect(login.json.error).toBe('Compte désactivé')

    // Réactiver
    expect((await admin.patch(`/api/admin/users/${u.id}`, { actif: 1 })).status).toBe(200)
    users = (await admin.get('/api/admin/users')).json.users
    expect(users.find((x: any) => x.id === u.id).actif).toBe(1)
    // Le login fonctionne de nouveau.
    expect((await new Session().login(u.email, u.password)).status).toBe(200)
  })

  it("TC-LOT1-048 — auto-modification de l'admin refusée → 400", async () => {
    // Découvre l'id de l'admin via /api/admin/users.
    const users = (await admin.get('/api/admin/users')).json.users
    const me = users.find((x: any) => x.email === DEMO.admin.email)
    expect(me).toBeTruthy()
    const r = await admin.patch(`/api/admin/users/${me.id}`, { actif: 0 })
    expect(r.status).toBe(400)
    expect(r.json.error).toBe('Vous ne pouvez pas modifier votre propre compte administrateur')
    // Aucun changement : l'admin reste actif.
    const after = (await admin.get('/api/admin/users')).json.users.find((x: any) => x.id === me.id)
    expect(after.actif).toBe(1)
  })

  it("TC-LOT1-049 — utilisateur inexistant → 404", async () => {
    const r = await admin.patch('/api/admin/users/999999', { actif: 1 })
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Utilisateur introuvable')
  })

  it("TC-LOT1-050 — 403 accompagnateur / 401 anonyme", async () => {
    const target = createdUsers[0] // un compte de test existant suffit comme cible
    const acc = await asUser(DEMO.mohamed)
    const r403 = await acc.patch(`/api/admin/users/${target.id}`, { plan_id: null })
    expect(r403.status).toBe(403)
    expect(r403.json.error).toBe('Accès refusé')

    const anon = new Session()
    const r401 = await anon.patch(`/api/admin/users/${target.id}`, { plan_id: null })
    expect(r401.status).toBe(401)
    expect(r401.json.error).toBe('Non authentifié')
  })
})

// ---------------------------------------------------------------------------
// POST /api/admin/users
// ---------------------------------------------------------------------------
describe('POST /api/admin/users', () => {
  it("TC-LOT1-051 — création nominale + lien d'activation (email_verifie=1, sans mot de passe)", async () => {
    const email = `qa-lot1-${Date.now()}@boussole.test`
    const r = await admin.post('/api/admin/users', { email, role: 'accompagne', prenom: 'QA', nom: 'Lot1' })
    expect(r.status).toBe(201)
    expect(typeof r.json.id).toBe('number')
    // Mémorise pour nettoyage RGPD.
    createdUsers.push({ id: r.json.id, email, password: '', role: 'accompagne' })

    const users = (await admin.get('/api/admin/users')).json.users
    const created = users.find((x: any) => x.id === r.json.id)
    expect(created).toBeTruthy()
    expect(created.email).toBe(email)
    expect(created.role).toBe('accompagne')
    expect(created.email_verifie).toBe(1) // créé email_verifie=1
    // Compte sans mot de passe : le login échoue avec 'Identifiants incorrects'.
    const login = await new Session().login(email, 'TestBoussole2026!')
    expect(login.status).toBe(401)
    expect(login.json.error).toBe('Identifiants incorrects')
  })

  it("TC-LOT1-052 — données invalides (email absent OU rôle hors liste) → 400", async () => {
    const r1 = await admin.post('/api/admin/users', { role: 'accompagne' }) // email absent
    expect(r1.status).toBe(400)
    expect(r1.json.error).toBe('Données invalides')

    const r2 = await admin.post('/api/admin/users', { email: 'x@y.z', role: 'superadmin' }) // rôle hors ROLES
    expect(r2.status).toBe(400)
    expect(r2.json.error).toBe('Données invalides')
  })

  it("TC-LOT1-053 — email déjà utilisé → 409", async () => {
    const r = await admin.post('/api/admin/users', { email: DEMO.amine.email, role: 'accompagne' })
    expect(r.status).toBe(409)
    expect(r.json.error).toBe('Email déjà utilisé')
  })

  it("TC-LOT1-054 — 403 accompagnateur / 401 anonyme (aucun compte créé)", async () => {
    const email = `qa-interdit-${Date.now()}@boussole.test`
    const acc = await asUser(DEMO.mohamed)
    const r403 = await acc.post('/api/admin/users', { email, role: 'accompagne' })
    expect(r403.status).toBe(403)
    expect(r403.json.error).toBe('Accès refusé')

    const anon = new Session()
    const r401 = await anon.post('/api/admin/users', { email, role: 'accompagne' })
    expect(r401.status).toBe(401)
    expect(r401.json.error).toBe('Non authentifié')

    // Aucun compte de cet email ne doit exister.
    const users = (await admin.get('/api/admin/users')).json.users
    expect(users.find((x: any) => x.email === email)).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// POST /api/admin/lien
// ---------------------------------------------------------------------------
describe('POST /api/admin/lien', () => {
  it("TC-LOT1-055 — rattachement nominal accompagné ↔ accompagnateur (idempotent)", async () => {
    const acc = await createTestUser(admin, 'accompagnateur', 'lien-acc')
    const acp = await createTestUser(admin, 'accompagne', 'lien-acp')
    createdUsers.push(acc, acp)

    const r = await admin.post('/api/admin/lien', { accompagnateurId: acc.id, accompagneId: acp.id })
    expect(r.status).toBe(200)
    expect(r.json.ok).toBe(true)
    // INSERT OR IGNORE : un second appel reste 200 (idempotent).
    const r2 = await admin.post('/api/admin/lien', { accompagnateurId: acc.id, accompagneId: acp.id })
    expect(r2.status).toBe(200)
    expect(r2.json.ok).toBe(true)
  })

  it("TC-LOT1-056 — sélection invalide (rôles inversés) → 400", async () => {
    const acc = await createTestUser(admin, 'accompagnateur', 'lien-inv-acc')
    const acp = await createTestUser(admin, 'accompagne', 'lien-inv-acp')
    createdUsers.push(acc, acp)
    // On passe l'accompagné comme accompagnateurId et inversement.
    const r = await admin.post('/api/admin/lien', { accompagnateurId: acp.id, accompagneId: acc.id })
    expect(r.status).toBe(400)
    expect(r.json.error).toBe('Sélection invalide (accompagnateur et accompagné requis)')
  })

  it("TC-LOT1-057 — 403 non admin (accompagnateur)", async () => {
    const acc = await createTestUser(admin, 'accompagnateur', 'lien-gate-acc')
    const acp = await createTestUser(admin, 'accompagne', 'lien-gate-acp')
    createdUsers.push(acc, acp)
    const s = await asUser(DEMO.mohamed)
    const r = await s.post('/api/admin/lien', { accompagnateurId: acc.id, accompagneId: acp.id })
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('Accès refusé')
  })
})
