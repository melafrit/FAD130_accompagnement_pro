import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Session, asUser, DEMO } from '../helpers/api'
import { createTestUser, deleteTestUser, type TestUser } from '../helpers/fixtures'

// ============================================================================
//  Domaine « reflex » — Réflexivité de l'accompagnateur
//  Source : app/api/src/reflexivite.ts (monté sous /api/reflexivite)
//
//  Endpoints couverts (niveau « api » du catalogue) :
//   - GET  /bilan                          (feature bilan_pratique)
//   - POST /bilan                          (feature bilan_pratique, IA + repli)
//   - GET  /coach/phase/:phase             (feature coach_posture)
//   - POST /coach/analyser                 (feature coach_posture, IA + repli)
//   - GET  /debriefing/session/:sid        (feature debriefing)
//   - POST /debriefing/session/:sid        (feature debriefing)
//   - POST /debriefing/session/:sid/suggerer (feature debriefing, IA + repli)
//   - GET  /replay/session/:sid            (feature replay_annote)
//   - POST /replay/session/:sid            (feature replay_annote)
//   - POST /replay/session/:sid/initialiser (feature replay_annote, IA + repli)
//
//  Règles appliquées :
//   - Endpoints IA : test du CONTRAT uniquement (statut + forme + non-vacuité +
//     source ∈ {'ia','heuristique'} + persistance/relecture). Jamais le texte exact.
//   - Découverte DYNAMIQUE des identifiants (aucun id codé en dur) :
//       sessions de l'accompagnateur connecté via /api/entretien/dashboard puis
//       /api/dossiers/:id ; session « d'autrui » découverte chez le second
//       accompagnateur de démo (Camille) tout en restant connecté en Mohamed.
//   - Scénarios destructifs / gating : comptes jetables @boussole.test, supprimés
//     en afterAll. Le bilan vitrine de Mohamed n'est JAMAIS regénéré (POST /bilan
//     se fait sur un compte jetable pour ne pas écraser la vitrine D1).
// ============================================================================

const ERR_AUTH = 'Non authentifié'
const ERR_ROLE = 'Accès refusé'
const ERR_FEATURE = 'Fonctionnalité non disponible dans votre offre'
const ERR_SESSION = 'Entretien introuvable'

// Comptes jetables partagés
let admin: Session
let gatePilot: TestUser // accompagnateur sur plan « Découverte » (sans les features de réflexivité)
let gateSession: Session // session connectée du compte « gatePilot »
let bilanPilot: TestUser // accompagnateur (toutes features) pour les POST /bilan destructifs
let bilanSession: Session

// Sessions de démo (Mohamed = accompagnateur vitrine, possède le dossier D1 d'Amine)
let mohamed: Session
let amine: Session // accompagné (mauvais rôle)
let anon: Session // aucune session

// Identifiants découverts dynamiquement
let myOwnedSid: number // session possédée par Mohamed (1ᵉʳ entretien d'Amine, avec questions/débriefing/replay)
let otherSid: number // session possédée par un AUTRE accompagnateur (Camille), inaccessible à Mohamed

/** Découvre une session possédée par l'accompagnateur connecté `s`. Renvoie la 1ʳᵉ session du 1ᵉʳ dossier qui en a une. */
async function discoverOwnedSession(s: Session): Promise<number> {
  const dash = await s.get('/api/entretien/dashboard')
  expect(dash.status).toBe(200)
  const dossiers: Array<{ id: number }> = dash.json.dossiers || []
  for (const d of dossiers) {
    const detail = await s.get(`/api/dossiers/${d.id}`)
    if (detail.status !== 200) continue
    const sessions: Array<{ id: number }> = detail.json.sessions || []
    if (sessions.length) return sessions[0].id
  }
  throw new Error('Aucune session possédée découverte pour cet accompagnateur')
}

beforeAll(async () => {
  admin = await asUser(DEMO.admin)
  mohamed = await asUser(DEMO.mohamed)
  amine = await asUser(DEMO.amine)
  anon = new Session() // jamais connectée

  // Découverte des sessions (Mohamed possède D1 ; Camille possède d'autres dossiers).
  myOwnedSid = await discoverOwnedSession(mohamed)
  const camille = await asUser(DEMO.camille)
  otherSid = await discoverOwnedSession(camille)
  await camille.logout()

  // Compte jetable « gating » : accompagnateur affecté au plan socle « Découverte »
  // (ne contient PAS bilan_pratique / coach_posture / debriefing / replay_annote → 403 feature).
  const plans = (await admin.get('/api/admin/plans')).json.plans as Array<{ id: number; nom: string }>
  const decouverte = plans.find((p) => p.nom === 'Découverte')
  if (!decouverte) throw new Error('Plan « Découverte » introuvable')
  gatePilot = await createTestUser(admin, 'accompagnateur', 'reflex-gate')
  const patched = await admin.patch(`/api/admin/users/${gatePilot.id}`, { plan_id: decouverte.id })
  expect(patched.status).toBe(200)
  gateSession = await asUser({ email: gatePilot.email, password: gatePilot.password })

  // Compte jetable « bilan » : accompagnateur SANS plan (toutes features) pour les POST /bilan
  // destructifs — évite d'écraser le bilan vitrine de Mohamed. N'ayant ni dossier ni score,
  // ses bilans empruntent le repli heuristique (forces/axes possiblement vides : c'est conforme).
  bilanPilot = await createTestUser(admin, 'accompagnateur', 'reflex-bilan')
  bilanSession = await asUser({ email: bilanPilot.email, password: bilanPilot.password })
}, 120_000)

afterAll(async () => {
  if (admin) {
    if (gatePilot) await deleteTestUser(admin, gatePilot)
    if (bilanPilot) await deleteTestUser(admin, bilanPilot)
  }
})

// ============================================================================
//  1. Bilan de pratique global — GET /bilan
// ============================================================================
describe('Bilan de pratique — GET /api/reflexivite/bilan', () => {
  it('TC-REFLEX-001 — relecture nominale (accompagnateur Mohamed, bilan pré-publié)', async () => {
    const r = await mohamed.get('/api/reflexivite/bilan')
    expect(r.status).toBe(200)
    expect(r.json).toHaveProperty('bilan')
    expect(r.json).toHaveProperty('base')
    // Mohamed possède un bilan vitrine persisté (source 'ia').
    const b = r.json.bilan
    expect(b).not.toBeNull()
    expect(Array.isArray(b.forces)).toBe(true)
    expect(Array.isArray(b.axes)).toBe(true)
    expect(typeof b.evolution).toBe('string')
    expect(typeof b.synthese).toBe('string')
    expect(Array.isArray(b.conseils)).toBe(true)
    expect(typeof b.source).toBe('string')
    expect(typeof b.genere_le).toBe('string')
    // base : compteurs entiers ≥ 0
    const base = r.json.base
    for (const k of ['nbDossiers', 'nbEntretiens', 'miroirs', 'indicateurs']) {
      expect(Number.isInteger(base[k])).toBe(true)
      expect(base[k]).toBeGreaterThanOrEqual(0)
    }
  })

  it('TC-REFLEX-002 — bilan=null si jamais généré (compte jetable sans bilan)', async () => {
    // Le compte « bilan » n'a encore rien généré au moment de ce test (ordre des describe).
    // Pour rester robuste à l'ordre, on emploie un accompagnateur frais et isolé.
    const fresh = await createTestUser(admin, 'accompagnateur', 'reflex-nobilan')
    try {
      const s = await asUser({ email: fresh.email, password: fresh.password })
      const r = await s.get('/api/reflexivite/bilan')
      expect(r.status).toBe(200)
      expect(r.json.bilan).toBeNull()
      const base = r.json.base
      expect(Number.isInteger(base.nbDossiers)).toBe(true)
      expect(base.nbDossiers).toBeGreaterThanOrEqual(0)
      expect(Number.isInteger(base.indicateurs)).toBe(true)
    } finally {
      await deleteTestUser(admin, fresh)
    }
  })

  it('TC-REFLEX-003 — 401 sans cookie', async () => {
    const r = await anon.get('/api/reflexivite/bilan')
    expect(r.status).toBe(401)
    expect(r.json.error).toBe(ERR_AUTH)
  })

  it('TC-REFLEX-004 — 403 mauvais rôle (accompagné)', async () => {
    const r = await amine.get('/api/reflexivite/bilan')
    expect(r.status).toBe(403)
    expect(r.json.error).toBe(ERR_ROLE)
  })

  it('TC-REFLEX-005 — 403 offre sans bilan_pratique (plan Découverte)', async () => {
    const r = await gateSession.get('/api/reflexivite/bilan')
    expect(r.status).toBe(403)
    expect(r.json.error).toBe(ERR_FEATURE)
  })
})

// ============================================================================
//  Bilan de pratique global — POST /bilan (contrat IA + repli + persistance)
//  Exécuté sur le compte jetable « bilan » pour ne PAS écraser la vitrine Mohamed.
// ============================================================================
describe('Bilan de pratique — POST /api/reflexivite/bilan', () => {
  it('TC-REFLEX-006 — génération nominale + persistance (contrat)', async () => {
    const r = await bilanSession.post('/api/reflexivite/bilan')
    expect(r.status).toBe(200)
    // Forme du contrat : tableaux/strings + source ∈ {ia,heuristique}.
    expect(Array.isArray(r.json.forces)).toBe(true)
    expect(Array.isArray(r.json.axes)).toBe(true)
    expect(typeof r.json.evolution).toBe('string')
    expect(r.json.evolution.length).toBeGreaterThan(0)
    expect(typeof r.json.synthese).toBe('string')
    expect(r.json.synthese.length).toBeGreaterThan(0)
    expect(Array.isArray(r.json.conseils)).toBe(true)
    expect(r.json.conseils.length).toBeGreaterThan(0)
    expect(['ia', 'heuristique']).toContain(r.json.source)
    // Persistance : le GET suivant relit le même contenu, avec genere_le présent.
    const relu = await bilanSession.get('/api/reflexivite/bilan')
    expect(relu.status).toBe(200)
    expect(relu.json.bilan).not.toBeNull()
    expect(relu.json.bilan.synthese).toBe(r.json.synthese)
    expect(relu.json.bilan.source).toBe(r.json.source)
    expect(typeof relu.json.bilan.genere_le).toBe('string')
  })

  it('TC-REFLEX-007 — repli heuristique quand aucun score (structure complète)', async () => {
    // Le compte jetable n'a aucun dossier ni auto-évaluation → scores.length === 0 → bilanFallback.
    const r = await bilanSession.post('/api/reflexivite/bilan')
    expect(r.status).toBe(200)
    expect(r.json.source).toBe('heuristique')
    // bilanFallback renseigne toujours evolution/synthese/conseils ; forces/axes peuvent être vides sans score.
    expect(Array.isArray(r.json.forces)).toBe(true)
    expect(Array.isArray(r.json.axes)).toBe(true)
    expect(typeof r.json.evolution).toBe('string')
    expect(r.json.evolution.length).toBeGreaterThan(0)
    expect(typeof r.json.synthese).toBe('string')
    expect(r.json.synthese.length).toBeGreaterThan(0)
    expect(r.json.conseils.length).toBe(3) // bilanFallback fournit exactement 3 conseils
  })

  it('TC-REFLEX-008 — upsert idempotent (un seul bilan par accompagnateur)', async () => {
    const r1 = await bilanSession.post('/api/reflexivite/bilan')
    expect(r1.status).toBe(200)
    const r2 = await bilanSession.post('/api/reflexivite/bilan')
    expect(r2.status).toBe(200)
    // ON CONFLICT(accompagnateur_id) : le second remplace le premier ; GET ne renvoie qu'un bilan.
    const relu = await bilanSession.get('/api/reflexivite/bilan')
    expect(relu.status).toBe(200)
    expect(relu.json.bilan).not.toBeNull()
    expect(relu.json.bilan.synthese).toBe(r2.json.synthese)
    expect(relu.json.bilan.source).toBe(r2.json.source)
  })

  it('TC-REFLEX-009 — 401 sans cookie', async () => {
    const r = await anon.post('/api/reflexivite/bilan')
    expect(r.status).toBe(401)
    expect(r.json.error).toBe(ERR_AUTH)
  })

  it('TC-REFLEX-010 — 403 mauvais rôle (accompagné)', async () => {
    const r = await amine.post('/api/reflexivite/bilan')
    expect(r.status).toBe(403)
    expect(r.json.error).toBe(ERR_ROLE)
  })

  it('TC-REFLEX-011 — 403 offre sans bilan_pratique', async () => {
    const r = await gateSession.post('/api/reflexivite/bilan')
    expect(r.status).toBe(403)
    expect(r.json.error).toBe(ERR_FEATURE)
  })
})

// ============================================================================
//  2. Coach de posture — GET /coach/phase/:phase
// ============================================================================
describe('Coach de posture — GET /api/reflexivite/coach/phase/:phase', () => {
  it('TC-REFLEX-015 — nominale phase valide (0)', async () => {
    const r = await mohamed.get('/api/reflexivite/coach/phase/0')
    expect(r.status).toBe(200)
    expect(r.json.phase).toBe(0)
    expect(r.json.titre).toBe('Accueil et mise en confiance')
    expect(typeof r.json.objectif).toBe('string')
    expect(Array.isArray(r.json.vigilance)).toBe(true)
    expect(r.json.vigilance.length).toBeGreaterThan(0)
    expect(Array.isArray(r.json.questions)).toBe(true)
    expect(r.json.questions.length).toBeGreaterThan(0)
  })

  it('TC-REFLEX-016 — toutes les phases 0..5 répondent 200 avec phase = i', async () => {
    const titres = [
      'Accueil et mise en confiance',
      'Clarifier le besoin',
      'Explorer l’expérience',
      'Relier et donner du sens',
      'Plan d’action & engagement',
      'Clôture et élan',
    ]
    for (let i = 0; i <= 5; i++) {
      const r = await mohamed.get(`/api/reflexivite/coach/phase/${i}`)
      expect(r.status).toBe(200)
      expect(r.json.phase).toBe(i)
      expect(r.json.titre).toBe(titres[i])
    }
  })

  it('TC-REFLEX-017 — 404 phase hors plage (6)', async () => {
    const r = await mohamed.get('/api/reflexivite/coach/phase/6')
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Phase inconnue')
  })

  it('TC-REFLEX-018 — 404 phase non numérique (abc → NaN)', async () => {
    const r = await mohamed.get('/api/reflexivite/coach/phase/abc')
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Phase inconnue')
  })

  it('TC-REFLEX-019 — 404 phase négative (-1)', async () => {
    const r = await mohamed.get('/api/reflexivite/coach/phase/-1')
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Phase inconnue')
  })

  it('TC-REFLEX-020 — 401 sans cookie', async () => {
    const r = await anon.get('/api/reflexivite/coach/phase/0')
    expect(r.status).toBe(401)
    expect(r.json.error).toBe(ERR_AUTH)
  })

  it('TC-REFLEX-021 — 403 mauvais rôle (accompagné)', async () => {
    const r = await amine.get('/api/reflexivite/coach/phase/0')
    expect(r.status).toBe(403)
    expect(r.json.error).toBe(ERR_ROLE)
  })

  it('TC-REFLEX-022 — 403 offre sans coach_posture', async () => {
    const r = await gateSession.get('/api/reflexivite/coach/phase/0')
    expect(r.status).toBe(403)
    expect(r.json.error).toBe(ERR_FEATURE)
  })
})

// ============================================================================
//  Coach de posture — POST /coach/analyser (contrat IA + repli)
// ============================================================================
describe('Coach de posture — POST /api/reflexivite/coach/analyser', () => {
  it('TC-REFLEX-023 — nominale (contrat, question ouverte)', async () => {
    const r = await mohamed.post('/api/reflexivite/coach/analyser', {
      question: 'Comment as-tu vécu cette situation ?',
    })
    expect(r.status).toBe(200)
    expect(['ouverte', 'fermée', 'inductive']).toContain(r.json.type)
    expect(typeof r.json.ouverte).toBe('boolean')
    expect(typeof r.json.remarque).toBe('string')
    expect(r.json.remarque.length).toBeGreaterThan(0)
    // reformulation : string ou null
    expect(r.json.reformulation === null || typeof r.json.reformulation === 'string').toBe(true)
  })

  it('TC-REFLEX-024 — 400 question vide (trim → "")', async () => {
    const r = await mohamed.post('/api/reflexivite/coach/analyser', { question: '   ' })
    expect(r.status).toBe(400)
    expect(r.json.error).toBe('Question vide')
    // Corps sans question : même résultat.
    const r2 = await mohamed.post('/api/reflexivite/coach/analyser', {})
    expect(r2.status).toBe(400)
    expect(r2.json.error).toBe('Question vide')
  })

  it('TC-REFLEX-025 — 401 sans cookie', async () => {
    const r = await anon.post('/api/reflexivite/coach/analyser', { question: 'Comment ?' })
    expect(r.status).toBe(401)
    expect(r.json.error).toBe(ERR_AUTH)
  })

  it('TC-REFLEX-026 — 403 mauvais rôle (accompagné)', async () => {
    const r = await amine.post('/api/reflexivite/coach/analyser', { question: 'Comment ?' })
    expect(r.status).toBe(403)
    expect(r.json.error).toBe(ERR_ROLE)
  })

  it('TC-REFLEX-027 — 403 offre sans coach_posture', async () => {
    const r = await gateSession.post('/api/reflexivite/coach/analyser', { question: 'Comment ?' })
    expect(r.status).toBe(403)
    expect(r.json.error).toBe(ERR_FEATURE)
  })
})

// ============================================================================
//  3. Débriefing réflexif à chaud — GET /debriefing/session/:sid
// ============================================================================
describe('Débriefing — GET /api/reflexivite/debriefing/session/:sid', () => {
  it('TC-REFLEX-033 — nominale (propriétaire)', async () => {
    const r = await mohamed.get(`/api/reflexivite/debriefing/session/${myOwnedSid}`)
    expect(r.status).toBe(200)
    expect(Array.isArray(r.json.questions)).toBe(true)
    expect(r.json.questions.length).toBe(3)
    for (const q of r.json.questions) {
      expect(typeof q).toBe('string')
      expect(q.length).toBeGreaterThan(0)
    }
    // debriefing : null OU objet {reponses[], source, maj_le}
    if (r.json.debriefing !== null) {
      expect(Array.isArray(r.json.debriefing.reponses)).toBe(true)
      expect(typeof r.json.debriefing.source).toBe('string')
      expect(typeof r.json.debriefing.maj_le).toBe('string')
    }
  })

  it('TC-REFLEX-034 — 404 session d’un autre accompagnateur', async () => {
    const r = await mohamed.get(`/api/reflexivite/debriefing/session/${otherSid}`)
    expect(r.status).toBe(404)
    expect(r.json.error).toBe(ERR_SESSION)
  })

  it('TC-REFLEX-035 — 404 session inexistante', async () => {
    const r = await mohamed.get('/api/reflexivite/debriefing/session/999999')
    expect(r.status).toBe(404)
    expect(r.json.error).toBe(ERR_SESSION)
  })

  it('TC-REFLEX-036 — 401 sans cookie', async () => {
    const r = await anon.get(`/api/reflexivite/debriefing/session/${myOwnedSid}`)
    expect(r.status).toBe(401)
    expect(r.json.error).toBe(ERR_AUTH)
  })

  it('TC-REFLEX-037 — 403 mauvais rôle (accompagné)', async () => {
    const r = await amine.get(`/api/reflexivite/debriefing/session/${myOwnedSid}`)
    expect(r.status).toBe(403)
    expect(r.json.error).toBe(ERR_ROLE)
  })

  it('TC-REFLEX-038 — 403 offre sans debriefing (gating avant contrôle de propriété)', async () => {
    // gatePilot ne possède pas cette session, mais requireFeature s'exécute AVANT ownsSession → 403.
    const r = await gateSession.get(`/api/reflexivite/debriefing/session/${myOwnedSid}`)
    expect(r.status).toBe(403)
    expect(r.json.error).toBe(ERR_FEATURE)
  })
})

// ============================================================================
//  Débriefing — POST /debriefing/session/:sid (enregistrement + relecture)
//  Écritures faites sur une session jetable créée chez le compte « bilanPilot »
//  est impossible (il n'a pas de session) ; on écrit donc sur la session vitrine
//  de Mohamed PUIS on restaure le débriefing d'origine en afterAll de ce bloc.
// ============================================================================
describe('Débriefing — POST /api/reflexivite/debriefing/session/:sid', () => {
  let snapshot: string[] | null = null

  beforeAll(async () => {
    // Capture le débriefing vitrine pour le restaurer après les tests destructifs.
    const r = await mohamed.get(`/api/reflexivite/debriefing/session/${myOwnedSid}`)
    snapshot = r.json.debriefing ? r.json.debriefing.reponses : null
  })

  afterAll(async () => {
    // Restaure l'état initial (vitrine D1) pour ne pas dégrader durablement le jeu de démo.
    if (snapshot) {
      await mohamed.post(`/api/reflexivite/debriefing/session/${myOwnedSid}`, { reponses: snapshot })
    }
  })

  it('TC-REFLEX-039 — enregistrement nominal + relecture (source=manuel)', async () => {
    const reponses = ['ok cadre', 'un doute', 'ouvrir mes questions']
    const post = await mohamed.post(`/api/reflexivite/debriefing/session/${myOwnedSid}`, { reponses })
    expect(post.status).toBe(200)
    expect(post.json.ok).toBe(true)
    const relu = await mohamed.get(`/api/reflexivite/debriefing/session/${myOwnedSid}`)
    expect(relu.status).toBe(200)
    expect(relu.json.debriefing).not.toBeNull()
    expect(relu.json.debriefing.reponses).toEqual(reponses)
    expect(relu.json.debriefing.source).toBe('manuel')
    expect(typeof relu.json.debriefing.maj_le).toBe('string')
  })

  it('TC-REFLEX-040 — body sans reponses → tableau vide (pas de 500)', async () => {
    const post = await mohamed.post(`/api/reflexivite/debriefing/session/${myOwnedSid}`, {})
    expect(post.status).toBe(200)
    expect(post.json.ok).toBe(true)
    const relu = await mohamed.get(`/api/reflexivite/debriefing/session/${myOwnedSid}`)
    expect(relu.json.debriefing.reponses).toEqual([])
    // reponses non-tableau → coercé en [] également.
    const post2 = await mohamed.post(`/api/reflexivite/debriefing/session/${myOwnedSid}`, { reponses: 'pas-un-tableau' })
    expect(post2.status).toBe(200)
    const relu2 = await mohamed.get(`/api/reflexivite/debriefing/session/${myOwnedSid}`)
    expect(relu2.json.debriefing.reponses).toEqual([])
  })

  it('TC-REFLEX-041 — coercition des éléments en chaîne (null → "")', async () => {
    const post = await mohamed.post(`/api/reflexivite/debriefing/session/${myOwnedSid}`, { reponses: [1, null, { a: 1 }] })
    expect(post.status).toBe(200)
    const relu = await mohamed.get(`/api/reflexivite/debriefing/session/${myOwnedSid}`)
    const rep = relu.json.debriefing.reponses
    expect(rep.length).toBe(3)
    rep.forEach((x: unknown) => expect(typeof x).toBe('string'))
    expect(rep[0]).toBe('1') // String(1)
    expect(rep[1]).toBe('') // String(null ?? '') → ''
  })

  it('TC-REFLEX-042 — upsert idempotent (ON CONFLICT session_id)', async () => {
    await mohamed.post(`/api/reflexivite/debriefing/session/${myOwnedSid}`, { reponses: ['A1', 'A2', 'A3'] })
    await mohamed.post(`/api/reflexivite/debriefing/session/${myOwnedSid}`, { reponses: ['B1', 'B2', 'B3'] })
    const relu = await mohamed.get(`/api/reflexivite/debriefing/session/${myOwnedSid}`)
    expect(relu.json.debriefing.reponses).toEqual(['B1', 'B2', 'B3'])
  })

  it('TC-REFLEX-043 — 404 non-propriétaire (aucune écriture)', async () => {
    const r = await mohamed.post(`/api/reflexivite/debriefing/session/${otherSid}`, { reponses: ['x'] })
    expect(r.status).toBe(404)
    expect(r.json.error).toBe(ERR_SESSION)
  })

  it('TC-REFLEX-044 — 401 sans cookie', async () => {
    const r = await anon.post(`/api/reflexivite/debriefing/session/${myOwnedSid}`, { reponses: ['x'] })
    expect(r.status).toBe(401)
    expect(r.json.error).toBe(ERR_AUTH)
  })

  it('TC-REFLEX-045 — 403 offre sans debriefing', async () => {
    const r = await gateSession.post(`/api/reflexivite/debriefing/session/${myOwnedSid}`, { reponses: ['x'] })
    expect(r.status).toBe(403)
    expect(r.json.error).toBe(ERR_FEATURE)
  })
})

// ============================================================================
//  Débriefing — POST /debriefing/session/:sid/suggerer (contrat IA + repli)
// ============================================================================
describe('Débriefing — POST /api/reflexivite/debriefing/session/:sid/suggerer', () => {
  it('TC-REFLEX-046 — amorce IA (contrat : ≤3 réponses non vides, source typée)', async () => {
    const r = await mohamed.post(`/api/reflexivite/debriefing/session/${myOwnedSid}/suggerer`)
    expect(r.status).toBe(200)
    expect(Array.isArray(r.json.reponses)).toBe(true)
    expect(r.json.reponses.length).toBeGreaterThan(0)
    expect(r.json.reponses.length).toBeLessThanOrEqual(3) // slice(0,3)
    for (const x of r.json.reponses) {
      expect(typeof x).toBe('string')
      expect(x.length).toBeGreaterThan(0)
    }
    expect(['ia', 'heuristique']).toContain(r.json.source)
  })

  it('TC-REFLEX-047 — repli heuristique = 3 amorces non vides (vérifié si source=heuristique)', async () => {
    // On ne peut pas forcer l'absence de clé IA depuis le test ; on vérifie le CONTRAT.
    // Quand le repli s'applique (source='heuristique'), il fournit exactement 3 amorces par défaut.
    const r = await mohamed.post(`/api/reflexivite/debriefing/session/${myOwnedSid}/suggerer`)
    expect(r.status).toBe(200)
    expect(['ia', 'heuristique']).toContain(r.json.source)
    if (r.json.source === 'heuristique') {
      expect(r.json.reponses.length).toBe(3)
    }
    for (const x of r.json.reponses) {
      expect(typeof x).toBe('string')
      expect(x.length).toBeGreaterThan(0)
    }
  })

  it('TC-REFLEX-048 — 404 non-propriétaire', async () => {
    const r = await mohamed.post(`/api/reflexivite/debriefing/session/${otherSid}/suggerer`)
    expect(r.status).toBe(404)
    expect(r.json.error).toBe(ERR_SESSION)
  })

  it('TC-REFLEX-049 — 401 sans cookie', async () => {
    const r = await anon.post(`/api/reflexivite/debriefing/session/${myOwnedSid}/suggerer`)
    expect(r.status).toBe(401)
    expect(r.json.error).toBe(ERR_AUTH)
  })

  it('TC-REFLEX-050 — 403 mauvais rôle (accompagné) OU offre sans debriefing', async () => {
    const role = await amine.post(`/api/reflexivite/debriefing/session/${myOwnedSid}/suggerer`)
    expect(role.status).toBe(403)
    expect(role.json.error).toBe(ERR_ROLE)
    const feature = await gateSession.post(`/api/reflexivite/debriefing/session/${myOwnedSid}/suggerer`)
    expect(feature.status).toBe(403)
    expect(feature.json.error).toBe(ERR_FEATURE)
  })
})

// ============================================================================
//  4. Replay annoté — GET /replay/session/:sid
// ============================================================================
describe('Replay annoté — GET /api/reflexivite/replay/session/:sid', () => {
  it('TC-REFLEX-052 — nominale (moments construits depuis les questions)', async () => {
    const r = await mohamed.get(`/api/reflexivite/replay/session/${myOwnedSid}`)
    expect(r.status).toBe(200)
    expect(Array.isArray(r.json.moments)).toBe(true)
    // source/maj_le : null ou string (présent si un replay a été enregistré).
    expect(r.json.source === null || typeof r.json.source === 'string').toBe(true)
    expect(r.json.maj_le === null || typeof r.json.maj_le === 'string').toBe(true)
    for (const m of r.json.moments) {
      expect(typeof m.ref).toBe('string')
      expect(m.ref.startsWith('q')).toBe(true) // ref = 'q<id>'
      expect(typeof m.phase).toBe('number')
      expect(typeof m.titre).toBe('string')
      expect(typeof m.question).toBe('string')
      expect(typeof m.reponse).toBe('string')
      expect(typeof m.annotation).toBe('string')
    }
  })

  it('TC-REFLEX-053 — fusion des annotations sauvegardées (jointure par ref)', async () => {
    // La session vitrine D1 possède un replay pré-enregistré (source='ia').
    const r = await mohamed.get(`/api/reflexivite/replay/session/${myOwnedSid}`)
    expect(r.status).toBe(200)
    if (r.json.moments.length && r.json.source) {
      // Au moins un moment porte une annotation non vide issue de la sauvegarde.
      const annotated = r.json.moments.some((m: { annotation: string }) => m.annotation.length > 0)
      expect(annotated).toBe(true)
      expect(typeof r.json.maj_le).toBe('string')
    }
  })

  it('TC-REFLEX-054 — 404 non-propriétaire', async () => {
    const r = await mohamed.get(`/api/reflexivite/replay/session/${otherSid}`)
    expect(r.status).toBe(404)
    expect(r.json.error).toBe(ERR_SESSION)
  })

  it('TC-REFLEX-055 — 401 sans cookie / 403 accompagné / 403 offre sans replay_annote', async () => {
    const noAuth = await anon.get(`/api/reflexivite/replay/session/${myOwnedSid}`)
    expect(noAuth.status).toBe(401)
    expect(noAuth.json.error).toBe(ERR_AUTH)
    const wrongRole = await amine.get(`/api/reflexivite/replay/session/${myOwnedSid}`)
    expect(wrongRole.status).toBe(403)
    expect(wrongRole.json.error).toBe(ERR_ROLE)
    const noFeature = await gateSession.get(`/api/reflexivite/replay/session/${myOwnedSid}`)
    expect(noFeature.status).toBe(403)
    expect(noFeature.json.error).toBe(ERR_FEATURE)
  })
})

// ============================================================================
//  Replay annoté — POST /replay/session/:sid (enregistrement + relecture)
//  Restaure l'état initial du replay vitrine en afterAll.
// ============================================================================
describe('Replay annoté — POST /api/reflexivite/replay/session/:sid', () => {
  let snapshot: Array<{ ref: string; annotation: string }> | null = null

  beforeAll(async () => {
    const r = await mohamed.get(`/api/reflexivite/replay/session/${myOwnedSid}`)
    snapshot = (r.json.moments || []).map((m: { ref: string; annotation: string }) => ({ ref: m.ref, annotation: m.annotation }))
  })

  afterAll(async () => {
    if (snapshot) {
      await mohamed.post(`/api/reflexivite/replay/session/${myOwnedSid}`, { moments: snapshot })
    }
  })

  it('TC-REFLEX-056 — enregistrement annotations + relecture (source=manuel)', async () => {
    // Découvre un ref de moment réel pour la session.
    const before = await mohamed.get(`/api/reflexivite/replay/session/${myOwnedSid}`)
    expect(before.json.moments.length).toBeGreaterThan(0)
    const ref = before.json.moments[0].ref as string
    const annotation = 'ici je questionne ouvert'
    const post = await mohamed.post(`/api/reflexivite/replay/session/${myOwnedSid}`, { moments: [{ ref, annotation }] })
    expect(post.status).toBe(200)
    expect(post.json.ok).toBe(true)
    const relu = await mohamed.get(`/api/reflexivite/replay/session/${myOwnedSid}`)
    expect(relu.status).toBe(200)
    expect(relu.json.source).toBe('manuel')
    expect(typeof relu.json.maj_le).toBe('string')
    const moment = relu.json.moments.find((m: { ref: string }) => m.ref === ref)
    expect(moment.annotation).toBe(annotation)
  })

  it('TC-REFLEX-057 — body sans moments → tableau vide (pas de 500)', async () => {
    const post = await mohamed.post(`/api/reflexivite/replay/session/${myOwnedSid}`, {})
    expect(post.status).toBe(200)
    expect(post.json.ok).toBe(true)
    const relu = await mohamed.get(`/api/reflexivite/replay/session/${myOwnedSid}`)
    // Aucune annotation sauvegardée → toutes vides.
    relu.json.moments.forEach((m: { annotation: string }) => expect(m.annotation).toBe(''))
    // moments non-tableau → coercé en [] également.
    const post2 = await mohamed.post(`/api/reflexivite/replay/session/${myOwnedSid}`, { moments: 'x' })
    expect(post2.status).toBe(200)
  })

  it('TC-REFLEX-058 — coercition ref/annotation en chaîne (null/undefined → "")', async () => {
    const post = await mohamed.post(`/api/reflexivite/replay/session/${myOwnedSid}`, {
      moments: [{ ref: null, annotation: 42 }, {}],
    })
    expect(post.status).toBe(200)
    expect(post.json.ok).toBe(true)
    // Les ref invalides ne correspondent à aucun moment réel → relecture sans annotation, sans crash.
    const relu = await mohamed.get(`/api/reflexivite/replay/session/${myOwnedSid}`)
    expect(relu.status).toBe(200)
    expect(Array.isArray(relu.json.moments)).toBe(true)
  })

  it('TC-REFLEX-059 — upsert idempotent (ON CONFLICT session_id)', async () => {
    const before = await mohamed.get(`/api/reflexivite/replay/session/${myOwnedSid}`)
    const ref = before.json.moments[0].ref as string
    await mohamed.post(`/api/reflexivite/replay/session/${myOwnedSid}`, { moments: [{ ref, annotation: 'A' }] })
    await mohamed.post(`/api/reflexivite/replay/session/${myOwnedSid}`, { moments: [{ ref, annotation: 'B' }] })
    const relu = await mohamed.get(`/api/reflexivite/replay/session/${myOwnedSid}`)
    const moment = relu.json.moments.find((m: { ref: string }) => m.ref === ref)
    expect(moment.annotation).toBe('B') // B remplace A
  })

  it('TC-REFLEX-060 — 404 non-propriétaire (aucune écriture)', async () => {
    const r = await mohamed.post(`/api/reflexivite/replay/session/${otherSid}`, { moments: [{ ref: 'q1', annotation: 'x' }] })
    expect(r.status).toBe(404)
    expect(r.json.error).toBe(ERR_SESSION)
  })

  it('TC-REFLEX-061 — 401 sans cookie / 403 accompagné / 403 offre sans replay_annote', async () => {
    const noAuth = await anon.post(`/api/reflexivite/replay/session/${myOwnedSid}`, { moments: [] })
    expect(noAuth.status).toBe(401)
    expect(noAuth.json.error).toBe(ERR_AUTH)
    const wrongRole = await amine.post(`/api/reflexivite/replay/session/${myOwnedSid}`, { moments: [] })
    expect(wrongRole.status).toBe(403)
    expect(wrongRole.json.error).toBe(ERR_ROLE)
    const noFeature = await gateSession.post(`/api/reflexivite/replay/session/${myOwnedSid}`, { moments: [] })
    expect(noFeature.status).toBe(403)
    expect(noFeature.json.error).toBe(ERR_FEATURE)
  })
})

// ============================================================================
//  Replay annoté — POST /replay/session/:sid/initialiser (contrat IA + repli)
// ============================================================================
describe('Replay annoté — POST /api/reflexivite/replay/session/:sid/initialiser', () => {
  it('TC-REFLEX-062 — amorce IA par moment (contrat : annotation non vide par moment)', async () => {
    const r = await mohamed.post(`/api/reflexivite/replay/session/${myOwnedSid}/initialiser`)
    expect(r.status).toBe(200)
    expect(Array.isArray(r.json.moments)).toBe(true)
    expect(['ia', 'heuristique']).toContain(r.json.source)
    for (const m of r.json.moments) {
      // Les champs structurels sont conservés.
      expect(typeof m.ref).toBe('string')
      expect(typeof m.phase).toBe('number')
      expect(typeof m.titre).toBe('string')
      expect(typeof m.question).toBe('string')
      expect(typeof m.reponse).toBe('string')
      // Une annotation non vide est proposée pour chaque moment.
      expect(typeof m.annotation).toBe('string')
      expect(m.annotation.length).toBeGreaterThan(0)
    }
  })

  it('TC-REFLEX-063 — repli déterministe via OPEN_RE (vérifié si source=heuristique)', async () => {
    const HEUR_OPEN = 'Ici je pose une question ouverte qui laisse explorer.'
    const HEUR_FERME = 'Ici ma question est plutôt fermée : je pourrais l’ouvrir davantage.'
    const OPEN_RE = /^(quel|quelle|comment|qu['’ ]|raconte|en quoi|pourquoi|à quoi|que pense|qu'attends|si tout|décris|parle-moi|dis-moi|qu'est|peux-tu)/i
    const r = await mohamed.post(`/api/reflexivite/replay/session/${myOwnedSid}/initialiser`)
    expect(r.status).toBe(200)
    expect(['ia', 'heuristique']).toContain(r.json.source)
    if (r.json.source === 'heuristique') {
      for (const m of r.json.moments) {
        const expected = OPEN_RE.test(m.question) ? HEUR_OPEN : HEUR_FERME
        expect(m.annotation).toBe(expected)
      }
    }
  })

  it('TC-REFLEX-064 — session sans moment → liste vide, source=heuristique (aucun appel IA)', async () => {
    // Toutes les sessions de démo sont 'terminee' ; POST /entretien/sessions ne trouve donc
    // aucune session 'en_cours' et CRÉE une session vierge (sans question_entretien) → base.length === 0.
    // La session vide est inerte (réutilisée telle quelle aux exécutions suivantes : pas d'accumulation).
    const dash = await mohamed.get('/api/entretien/dashboard')
    const dossierId = (dash.json.dossiers || [])[0]?.id
    expect(dossierId).toBeTruthy()
    const start = await mohamed.post('/api/entretien/sessions', { dossierId })
    expect(start.status).toBe(200)
    const sid = start.json.sessionId as number
    // La session fraîche n'a aucune question → moments=[] et source='heuristique' (pas d'appel IA).
    const detail = await mohamed.get(`/api/entretien/sessions/${sid}`)
    expect(detail.status).toBe(200)
    const init = await mohamed.post(`/api/reflexivite/replay/session/${sid}/initialiser`)
    expect(init.status).toBe(200)
    if ((detail.json.questions || []).length === 0) {
      // Cas garanti par le jeu de démo : aucune question → contrat strict.
      expect(init.json.moments).toEqual([])
      expect(init.json.source).toBe('heuristique')
    } else {
      // Filet de sécurité si une exécution antérieure a laissé des questions sur cette session.
      expect(['ia', 'heuristique']).toContain(init.json.source)
    }
  })

  it('TC-REFLEX-065 — 404 non-propriétaire', async () => {
    const r = await mohamed.post(`/api/reflexivite/replay/session/${otherSid}/initialiser`)
    expect(r.status).toBe(404)
    expect(r.json.error).toBe(ERR_SESSION)
  })

  it('TC-REFLEX-066 — 401 sans cookie / 403 accompagné / 403 offre sans replay_annote', async () => {
    const noAuth = await anon.post(`/api/reflexivite/replay/session/${myOwnedSid}/initialiser`)
    expect(noAuth.status).toBe(401)
    expect(noAuth.json.error).toBe(ERR_AUTH)
    const wrongRole = await amine.post(`/api/reflexivite/replay/session/${myOwnedSid}/initialiser`)
    expect(wrongRole.status).toBe(403)
    expect(wrongRole.json.error).toBe(ERR_ROLE)
    const noFeature = await gateSession.post(`/api/reflexivite/replay/session/${myOwnedSid}/initialiser`)
    expect(noFeature.status).toBe(403)
    expect(noFeature.json.error).toBe(ERR_FEATURE)
  })
})
