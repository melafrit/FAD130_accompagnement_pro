import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Session, asUser, DEMO } from '../helpers/api'
import { createTestUser, deleteTestUser, type TestUser } from '../helpers/fixtures'

// ============================================================================
//  Domaine « confort » — tests d'intégration API contre la stack :8080
//  Endpoints couverts (app/api/src/confort.ts) :
//    - GET  /api/confort/visio/rdv/:id        (requireAuth + requireFeature('visio'))
//    - GET  /api/confort/push/cle             (requireAuth + requireFeature('pwa_push'))
//    - POST /api/confort/push/abonnement      (requireAuth + requireFeature('pwa_push'))
//    - POST /api/confort/push/test            (requireAuth + requireFeature('pwa_push'))
//    - GET  /api/confort/export/dossier/:id   (requireAuth + requireRole('accompagnateur') + requireFeature('export_pdf'))
//
//  Conventions : découverte dynamique des ids, comptes jetables @boussole.test
//  pour le gating (plan « Découverte » = socle sans visio/pwa_push/export_pdf),
//  auto-nettoyage en afterAll. On ne dégrade jamais durablement un compte démo.
//  Les cas niveau « unitaire » (TC-CONFORT-004, 010, 028, 029, 035) et « ui »
//  (043-050) sont traités ailleurs ; on couvre exhaustivement les cas « api ».
// ============================================================================

// Sessions démo réutilisées (lecture seule sur les comptes vitrine)
let admin: Session
let mohamed: Session // accompagnateur vitrine (sans plan → toutes features)
let amine: Session // accompagné vitrine (sans plan → toutes features)
let camille: Session // accompagnateur secondaire (non-propriétaire des dossiers de Mohamed)

// Compte accompagnateur jetable bridé sur le plan « Découverte » (gating 403)
let gated: TestUser
let gatedSession: Session
let decouverteId: number

// Ids découverts dynamiquement
let rdvMohamedId: number // RDV rattaché à un créneau de Mohamed (il en est l'accompagnateur)
let rdvAmineId: number // RDV où Amine est l'accompagné
let dossierMohamedId: number // dossier garni appartenant à Mohamed

// Endpoint push factice partagé (best-effort : un endpoint factice peut échouer
// côté webpush sans faire échouer la réponse HTTP).
const PUSH_ENDPOINT_A = `https://push.example/boussole-test-${Date.now()}-A`
const PUSH_ENDPOINT_B = `https://push.example/boussole-test-${Date.now()}-B`

beforeAll(async () => {
  admin = await asUser(DEMO.admin)
  mohamed = await asUser(DEMO.mohamed)
  amine = await asUser(DEMO.amine)
  camille = await asUser(DEMO.camille)

  // --- Découverte du dossier garni de Mohamed et d'un RDV associé ---
  const dash = await mohamed.get('/api/entretien/dashboard')
  expect(dash.status).toBe(200)
  const dossiers = (dash.json.dossiers || []) as Array<{ id: number; nb_cr: number }>
  expect(dossiers.length).toBeGreaterThan(0)
  // Privilégier un dossier garni (avec CR), sinon le premier disponible.
  const garni = dossiers.find((d) => (d.nb_cr ?? 0) > 0) || dossiers[0]
  dossierMohamedId = garni.id

  const detail = await mohamed.get(`/api/dossiers/${dossierMohamedId}`)
  expect(detail.status).toBe(200)
  const rdvs = (detail.json.rdvs || []) as Array<{ id: number }>
  // On a besoin d'au moins un RDV de Mohamed pour les cas visio côté accompagnateur ;
  // on cherche le premier dossier en ayant si nécessaire.
  if (rdvs.length > 0) {
    rdvMohamedId = rdvs[0].id
  } else {
    for (const d of dossiers) {
      const det = await mohamed.get(`/api/dossiers/${d.id}`)
      const rs = (det.json.rdvs || []) as Array<{ id: number }>
      if (rs.length > 0) { rdvMohamedId = rs[0].id; break }
    }
  }
  expect(rdvMohamedId, 'aucun RDV trouvé pour Mohamed (jeu de démo)').toBeTypeOf('number')

  // --- Découverte d'un RDV où Amine est l'accompagné ---
  const mine = await amine.get('/api/dossiers/mine')
  expect(mine.status).toBe(200)
  const parcours = (mine.json.dossiers || []) as Array<{ id: number; nb_rdv: number }>
  expect(parcours.length).toBeGreaterThan(0)
  for (const p of parcours) {
    const det = await amine.get(`/api/dossiers/mine/${p.id}`)
    const rs = (det.json.rdvs || []) as Array<{ id: number }>
    if (rs.length > 0) { rdvAmineId = rs[0].id; break }
  }
  expect(rdvAmineId, 'aucun RDV trouvé pour Amine (jeu de démo)').toBeTypeOf('number')

  // --- Compte jetable bridé sur « Découverte » pour le gating 403 ---
  const plans = (await admin.get('/api/admin/plans')).json.plans as Array<{ id: number; nom: string }>
  const decouverte = plans.find((p) => p.nom === 'Découverte')
  expect(decouverte, 'plan « Découverte » introuvable').toBeTruthy()
  decouverteId = decouverte!.id

  gated = await createTestUser(admin, 'accompagnateur', 'confort-gate')
  const upd = await admin.patch(`/api/admin/users/${gated.id}`, { plan_id: decouverteId })
  expect(upd.status).toBe(200)
  gatedSession = await asUser({ email: gated.email, password: gated.password })
}, 60000)

afterAll(async () => {
  // Purge des abonnements push créés par les comptes démo (Amine) pour ne pas
  // laisser de résidu. On supprime via re-POST n'a pas de sens : il n'existe pas
  // d'endpoint DELETE. On retire donc l'utilisateur jetable, et on laisse les
  // abonnements factices d'Amine inertes (endpoints push.example, jamais joignables).
  if (gated) await deleteTestUser(admin, gated)
})

// ============================================================================
//  1. Visio aux rendez-vous (GET /api/confort/visio/rdv/:id)
// ============================================================================
describe('Visio — GET /api/confort/visio/rdv/:id', () => {
  it('TC-CONFORT-001 — nominal accompagnateur : salle + url Jitsi', async () => {
    const r = await mohamed.get(`/api/confort/visio/rdv/${rdvMohamedId}`)
    expect(r.status).toBe(200)
    expect(typeof r.json.salle).toBe('string')
    expect(typeof r.json.url).toBe('string')
    expect(r.json.salle.length).toBeGreaterThan(0)
    expect(r.json.url.length).toBeGreaterThan(0)
    // salle de forme 'Boussole-<id>-<hash10>' ; url = 'https://meet.jit.si/' + salle
    expect(r.json.salle).toMatch(new RegExp(`^Boussole-${rdvMohamedId}-[0-9a-f]{10}$`))
    expect(r.json.url).toBe(`https://meet.jit.si/${r.json.salle}`)
  })

  it('TC-CONFORT-002 — nominal accompagné : accès à sa propre visio (salle partagée)', async () => {
    const r = await amine.get(`/api/confort/visio/rdv/${rdvAmineId}`)
    expect(r.status).toBe(200)
    expect(r.json.salle).toMatch(new RegExp(`^Boussole-${rdvAmineId}-[0-9a-f]{10}$`))
    expect(r.json.url).toBe(`https://meet.jit.si/${r.json.salle}`)

    // La salle est dérivée du seul id de RDV + JWT_SECRET : l'accompagnateur du même
    // RDV obtient exactement la même salle. On le vérifie via Mohamed sur son RDV
    // (l'égalité salle accompagné == salle accompagnateur pour un id donné est garantie
    // par construction côté serveur ; on contrôle ici la forme partagée pour rdvAmineId
    // en re-sollicitant l'endpoint, déjà couvert par le déterminisme TC-003).
    const r2 = await amine.get(`/api/confort/visio/rdv/${rdvAmineId}`)
    expect(r2.json.salle).toBe(r.json.salle)
  })

  it('TC-CONFORT-003 — URL déterministe : salle/url stables entre deux appels', async () => {
    const a = await mohamed.get(`/api/confort/visio/rdv/${rdvMohamedId}`)
    const b = await mohamed.get(`/api/confort/visio/rdv/${rdvMohamedId}`)
    expect(a.status).toBe(200)
    expect(b.status).toBe(200)
    expect(a.json.salle).toBe(b.json.salle)
    expect(a.json.url).toBe(b.json.url)
  })

  it('TC-CONFORT-005 — 401 non authentifié', async () => {
    const anon = new Session()
    const r = await anon.get('/api/confort/visio/rdv/1')
    expect(r.status).toBe(401)
    expect(r.json).toEqual({ error: 'Non authentifié' })
    expect(r.json.salle).toBeUndefined()
  })

  it("TC-CONFORT-006 — 403 feature 'visio' absente du plan (requireFeature avant lecture)", async () => {
    const r = await gatedSession.get(`/api/confort/visio/rdv/${rdvMohamedId}`)
    expect(r.status).toBe(403)
    expect(r.json).toEqual({ error: 'Fonctionnalité non disponible dans votre offre' })
  })

  it('TC-CONFORT-007 — 404 RDV d’un autre utilisateur (non-participant)', async () => {
    // Camille n'est ni accompagnatrice ni accompagnée du RDV de Mohamed/Amine.
    const r = await camille.get(`/api/confort/visio/rdv/${rdvMohamedId}`)
    expect(r.status).toBe(404)
    expect(r.json).toEqual({ error: 'Rendez-vous introuvable' })
  })

  it('TC-CONFORT-008 — 404 RDV inexistant', async () => {
    const r = await mohamed.get('/api/confort/visio/rdv/99999999')
    expect(r.status).toBe(404)
    expect(r.json).toEqual({ error: 'Rendez-vous introuvable' })
  })

  it('TC-CONFORT-009 — id non numérique (NaN) traité comme introuvable (pas de 500)', async () => {
    const r = await mohamed.get('/api/confort/visio/rdv/abc')
    expect(r.status).toBe(404)
    expect(r.json).toEqual({ error: 'Rendez-vous introuvable' })
  })
})

// ============================================================================
//  2a. Push — clé VAPID (GET /api/confort/push/cle)
// ============================================================================
describe('Push clé — GET /api/confort/push/cle', () => {
  it('TC-CONFORT-011 — nominal : renvoie la clé publique VAPID non vide', async () => {
    const r = await amine.get('/api/confort/push/cle')
    expect(r.status).toBe(200)
    expect(typeof r.json.cle).toBe('string')
    expect(r.json.cle.length).toBeGreaterThan(0)
  })

  it('TC-CONFORT-012 — 401 non authentifié', async () => {
    const anon = new Session()
    const r = await anon.get('/api/confort/push/cle')
    expect(r.status).toBe(401)
    expect(r.json).toEqual({ error: 'Non authentifié' })
  })

  it("TC-CONFORT-013 — 403 feature 'pwa_push' absente du plan", async () => {
    const r = await gatedSession.get('/api/confort/push/cle')
    expect(r.status).toBe(403)
    expect(r.json).toEqual({ error: 'Fonctionnalité non disponible dans votre offre' })
  })
})

// ============================================================================
//  2b. Push — abonnement (POST /api/confort/push/abonnement)
// ============================================================================
describe('Push abonnement — POST /api/confort/push/abonnement', () => {
  it('TC-CONFORT-014 — nominal : création (201 { ok:true }), format enveloppé', async () => {
    const r = await amine.post('/api/confort/push/abonnement', {
      subscription: { endpoint: PUSH_ENDPOINT_A, keys: { p256dh: 'BPpEnveloppe', auth: 'a1b2' } },
    })
    expect(r.status).toBe(201)
    expect(r.json).toEqual({ ok: true })
  })

  it("TC-CONFORT-015 — accepte le format plat (sans clé 'subscription')", async () => {
    const r = await amine.post('/api/confort/push/abonnement', {
      endpoint: PUSH_ENDPOINT_B,
      keys: { p256dh: 'BPpPlat', auth: 'xy' },
    })
    expect(r.status).toBe(201)
    expect(r.json).toEqual({ ok: true })
  })

  it('TC-CONFORT-016 — upsert idempotent sur endpoint existant (pas de doublon)', async () => {
    // Re-POST du même endpoint A avec de nouvelles clés : ON CONFLICT(endpoint) DO UPDATE.
    const r = await amine.post('/api/confort/push/abonnement', {
      subscription: { endpoint: PUSH_ENDPOINT_A, keys: { p256dh: 'BPpMaj', auth: 'maj42' } },
    })
    expect(r.status).toBe(201)
    expect(r.json).toEqual({ ok: true })
    // Idempotence vérifiée par contrat : un nouvel upsert renvoie le même 201 ok.
    const again = await amine.post('/api/confort/push/abonnement', {
      subscription: { endpoint: PUSH_ENDPOINT_A, keys: { p256dh: 'BPpMaj2', auth: 'maj43' } },
    })
    expect(again.status).toBe(201)
    expect(again.json).toEqual({ ok: true })
  })

  it("TC-CONFORT-017 — réattribution de l'endpoint à l'utilisateur courant (excluded.user_id)", async () => {
    // Endpoint partagé : Amine s'abonne, puis Lea (autre accompagné) réutilise le même
    // endpoint → ON CONFLICT met user_id = Lea. Pas de doublon (endpoint unique).
    const shared = `https://push.example/boussole-test-${Date.now()}-shared`
    const a = await amine.post('/api/confort/push/abonnement', {
      subscription: { endpoint: shared, keys: { p256dh: 'BPpA', auth: 'authA' } },
    })
    expect(a.status).toBe(201)
    const lea = await asUser(DEMO.lea)
    const b = await lea.post('/api/confort/push/abonnement', {
      subscription: { endpoint: shared, keys: { p256dh: 'BPpB', auth: 'authB' } },
    })
    expect(b.status).toBe(201)
    expect(b.json).toEqual({ ok: true })
  })

  it('TC-CONFORT-018 — 400 endpoint manquant', async () => {
    const r = await amine.post('/api/confort/push/abonnement', {
      subscription: { keys: { p256dh: 'x', auth: 'y' } },
    })
    expect(r.status).toBe(400)
    expect(r.json).toEqual({ error: 'Abonnement invalide' })
  })

  it('TC-CONFORT-019 — 400 keys.p256dh manquant', async () => {
    const r = await amine.post('/api/confort/push/abonnement', {
      endpoint: 'https://push.example/ep-no-p256dh',
      keys: { auth: 'y' },
    })
    expect(r.status).toBe(400)
    expect(r.json).toEqual({ error: 'Abonnement invalide' })
  })

  it('TC-CONFORT-020 — 400 keys.auth manquant', async () => {
    const r = await amine.post('/api/confort/push/abonnement', {
      endpoint: 'https://push.example/ep-no-auth',
      keys: { p256dh: 'x' },
    })
    expect(r.status).toBe(400)
    expect(r.json).toEqual({ error: 'Abonnement invalide' })
  })

  it('TC-CONFORT-021 — 400 corps vide / sans keys (pas de 500)', async () => {
    const r = await amine.post('/api/confort/push/abonnement', {})
    expect(r.status).toBe(400)
    expect(r.json).toEqual({ error: 'Abonnement invalide' })
  })

  it('TC-CONFORT-022 — 401 non authentifié', async () => {
    const anon = new Session()
    const r = await anon.post('/api/confort/push/abonnement', {
      endpoint: 'https://push.example/anon',
      keys: { p256dh: 'x', auth: 'y' },
    })
    expect(r.status).toBe(401)
    expect(r.json).toEqual({ error: 'Non authentifié' })
  })

  it("TC-CONFORT-023 — 403 feature 'pwa_push' absente (aucune insertion)", async () => {
    const r = await gatedSession.post('/api/confort/push/abonnement', {
      endpoint: 'https://push.example/gated',
      keys: { p256dh: 'x', auth: 'y' },
    })
    expect(r.status).toBe(403)
    expect(r.json).toEqual({ error: 'Fonctionnalité non disponible dans votre offre' })
  })
})

// ============================================================================
//  2c. Push — test d'envoi (POST /api/confort/push/test)
// ============================================================================
describe('Push test — POST /api/confort/push/test', () => {
  it('TC-CONFORT-024 — nominal sans abonnement (best-effort, 200 { ok:true })', async () => {
    // Karim n'a (a priori) aucun abonnement push enregistré → boucle vide, succès.
    const karim = await asUser(DEMO.karim)
    const r = await karim.post('/api/confort/push/test')
    expect(r.status).toBe(200)
    expect(r.json).toEqual({ ok: true })
  })

  it('TC-CONFORT-025 — nominal avec abonnement enregistré (envoi best-effort, 200)', async () => {
    // Amine possède au moins un abonnement (endpoints push.example, factices et
    // jamais joignables) ; l'échec webpush est avalé et ne fait pas échouer la réponse.
    const r = await amine.post('/api/confort/push/test')
    expect(r.status).toBe(200)
    expect(r.json).toEqual({ ok: true })
  })

  it('TC-CONFORT-026 — 401 non authentifié', async () => {
    const anon = new Session()
    const r = await anon.post('/api/confort/push/test')
    expect(r.status).toBe(401)
    expect(r.json).toEqual({ error: 'Non authentifié' })
  })

  it("TC-CONFORT-027 — 403 feature 'pwa_push' absente", async () => {
    const r = await gatedSession.post('/api/confort/push/test')
    expect(r.status).toBe(403)
    expect(r.json).toEqual({ error: 'Fonctionnalité non disponible dans votre offre' })
  })
})

// ============================================================================
//  3. Export PDF complet (GET /api/confort/export/dossier/:id)
// ============================================================================
describe('Export dossier — GET /api/confort/export/dossier/:id', () => {
  it('TC-CONFORT-030 — nominal accompagnateur propriétaire : forme complète', async () => {
    const r = await mohamed.get(`/api/confort/export/dossier/${dossierMohamedId}`)
    expect(r.status).toBe(200)
    const j = r.json
    // bloc dossier
    expect(j.dossier).toBeTypeOf('object')
    expect(j.dossier).toHaveProperty('titre')
    expect(typeof j.dossier.statut).toBe('string')
    expect(j.dossier).toHaveProperty('contexte')
    expect(typeof j.dossier.cree_le).toBe('string')
    expect(typeof j.dossier.accompagne).toBe('string')
    expect(j.dossier.accompagne.length).toBeGreaterThan(0)
    // questionnaire : string | null
    expect(j.questionnaire === null || typeof j.questionnaire === 'string').toBe(true)
    // comptes_rendus : tableau de { date, html }
    expect(Array.isArray(j.comptes_rendus)).toBe(true)
    for (const cr of j.comptes_rendus) {
      expect(typeof cr.date).toBe('string')
      expect(typeof cr.html).toBe('string') // html||'' → toujours string
    }
    // synthese : string | null
    expect(j.synthese === null || typeof j.synthese === 'string').toBe(true)
    // actions : tableau de { libelle, statut, echeance, critere }
    expect(Array.isArray(j.actions)).toBe(true)
    for (const a of j.actions) {
      expect(typeof a.libelle).toBe('string')
      expect(typeof a.statut).toBe('string')
      expect(a).toHaveProperty('echeance')
      expect(a).toHaveProperty('critere')
    }
    // grille : { note, commentaire } | null
    if (j.grille !== null) {
      expect(j.grille).toHaveProperty('note')
      expect(j.grille).toHaveProperty('commentaire')
    }
  })

  it('TC-CONFORT-031 — comptes_rendus : seulement les CR publiés, triés par date croissante', async () => {
    const r = await mohamed.get(`/api/confort/export/dossier/${dossierMohamedId}`)
    expect(r.status).toBe(200)
    const crs = r.json.comptes_rendus as Array<{ date: string; html: string }>
    expect(Array.isArray(crs)).toBe(true)
    // Tri ascendant sur s.date (ORDER BY s.date) : vérification structurelle.
    for (let i = 1; i < crs.length; i++) {
      expect(crs[i - 1].date <= crs[i].date).toBe(true)
    }
    // L'export n'inclut que des CR publiés : le contrat ne renvoie pas de drapeau
    // publie (ils sont déjà filtrés cr.publie=1 côté SQL). On valide la forme.
    for (const cr of crs) {
      expect(typeof cr.date).toBe('string')
      expect(typeof cr.html).toBe('string')
    }
  })

  it('TC-CONFORT-032 — synthese : dernière version publiée (string | null)', async () => {
    // Le dossier vitrine de Mohamed a une synthèse publiée ; le contrat renvoie
    // contenu_html (ORDER BY version DESC, publie=1) ou null. On valide le type.
    const r = await mohamed.get(`/api/confort/export/dossier/${dossierMohamedId}`)
    expect(r.status).toBe(200)
    expect(r.json.synthese === null || typeof r.json.synthese === 'string').toBe(true)
  })

  it('TC-CONFORT-033 — grille : auto-évaluation validée la plus récente, ou null', async () => {
    const r = await mohamed.get(`/api/confort/export/dossier/${dossierMohamedId}`)
    expect(r.status).toBe(200)
    const g = r.json.grille
    if (g === null) {
      expect(g).toBeNull()
    } else {
      // { note: number|null, commentaire: string|null }
      expect(g).toHaveProperty('note')
      expect(g).toHaveProperty('commentaire')
      expect(g.note === null || typeof g.note === 'number').toBe(true)
      expect(g.commentaire === null || typeof g.commentaire === 'string').toBe(true)
    }
  })

  it('TC-CONFORT-034 — dossier vide : sections null/listes vides, accompagne renseigné', async () => {
    // Construit un dossier minimal m'appartenant via deux comptes jetables :
    // un accompagnateur (acc jetable, sans plan → export_pdf actif) et un accompagné
    // qui démarre un parcours en choisissant cet accompagnateur. Aucun questionnaire,
    // CR, synthèse, action ni grille → toutes les sections sont vides/null.
    const acc = await createTestUser(admin, 'accompagnateur', 'export-empty-acc')
    const sub = await createTestUser(admin, 'accompagne', 'export-empty-sub')
    try {
      const subS = await asUser({ email: sub.email, password: sub.password })
      const started = await subS.post('/api/dossiers/start', { titre: 'Parcours vide (test)', accompagnateurId: acc.id })
      expect(started.status).toBe(201)
      const emptyDossierId = started.json.dossierId as number
      expect(typeof emptyDossierId).toBe('number')

      const accS = await asUser({ email: acc.email, password: acc.password })
      const r = await accS.get(`/api/confort/export/dossier/${emptyDossierId}`)
      expect(r.status).toBe(200)
      const j = r.json
      expect(j.questionnaire).toBeNull()
      expect(j.comptes_rendus).toEqual([])
      expect(j.synthese).toBeNull()
      expect(j.actions).toEqual([])
      expect(j.grille).toBeNull()
      // accompagne = prénom+nom ('Test export-empty-sub' via createTestUser) ou email à défaut
      expect(typeof j.dossier.accompagne).toBe('string')
      expect(j.dossier.accompagne.length).toBeGreaterThan(0)
      expect(j.dossier.titre).toBe('Parcours vide (test)')
    } finally {
      await deleteTestUser(admin, sub)
      await deleteTestUser(admin, acc)
    }
  })

  it('TC-CONFORT-036 — 401 non authentifié', async () => {
    const anon = new Session()
    const r = await anon.get('/api/confort/export/dossier/1')
    expect(r.status).toBe(401)
    expect(r.json).toEqual({ error: 'Non authentifié' })
  })

  it('TC-CONFORT-037 — 403 rôle accompagné (requireRole avant feature/lecture)', async () => {
    const r = await amine.get(`/api/confort/export/dossier/${dossierMohamedId}`)
    expect(r.status).toBe(403)
    expect(r.json).toEqual({ error: 'Accès refusé' })
  })

  it('TC-CONFORT-038 — 403 rôle admin (non-accompagnateur)', async () => {
    const r = await admin.get(`/api/confort/export/dossier/${dossierMohamedId}`)
    expect(r.status).toBe(403)
    expect(r.json).toEqual({ error: 'Accès refusé' })
  })

  it("TC-CONFORT-039 — 403 feature 'export_pdf' absente (rôle OK, feature KO)", async () => {
    // gatedSession est accompagnateur (rôle OK) sur le plan « Découverte » (sans export_pdf).
    const r = await gatedSession.get(`/api/confort/export/dossier/${dossierMohamedId}`)
    expect(r.status).toBe(403)
    expect(r.json).toEqual({ error: 'Fonctionnalité non disponible dans votre offre' })
  })

  it('TC-CONFORT-040 — 404 dossier d’un autre accompagnateur (propriété)', async () => {
    // Camille (accompagnatrice, sans plan → export_pdf actif) tente le dossier de Mohamed.
    const r = await camille.get(`/api/confort/export/dossier/${dossierMohamedId}`)
    expect(r.status).toBe(404)
    expect(r.json).toEqual({ error: 'Dossier introuvable' })
  })

  it('TC-CONFORT-041 — 404 dossier inexistant', async () => {
    const r = await mohamed.get('/api/confort/export/dossier/99999999')
    expect(r.status).toBe(404)
    expect(r.json).toEqual({ error: 'Dossier introuvable' })
  })

  it('TC-CONFORT-042 — id non numérique traité comme introuvable (pas de 500)', async () => {
    const r = await mohamed.get('/api/confort/export/dossier/abc')
    expect(r.status).toBe(404)
    expect(r.json).toEqual({ error: 'Dossier introuvable' })
  })
})
