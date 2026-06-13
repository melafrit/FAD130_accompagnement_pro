import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Session, asUser, DEMO } from '../helpers/api'
import { createTestUser, deleteTestUser, type TestUser } from '../helpers/fixtures'

// Domaine « adopt » — Adoption & accessibilité.
// Seul endpoint exposé : POST /api/adoption/falc (reformulation FALC d'un texte/HTML
// via Claude, avec repli déterministe falcFallback). Source de vérité : app/api/src/adoption.ts
// (router.post('/falc', requireAuth, requireFeature('falc'), ...)).
//
// Réponse nominale : { texte: string, source: 'ia' | 'heuristique' }.
// Accès : requireAuth (401 'Non authentifié' / 'Session invalide') puis
//         requireFeature('falc') (403 'Fonctionnalité non disponible dans votre offre').
// Validation : { error: 'Texte vide' } (400) quand strip(texte ?? html) est vide.
//
// Remarque sur la source IA : la stack peut tourner AVEC ou SANS ANTHROPIC_API_KEY, et
// l'appel Claude peut échouer (callClaude → null) → repli heuristique. Les assertions
// restent donc contractuelles : on n'exige jamais une valeur de source précise pour les
// cas nominaux, sauf TC-ADOPT-004/019 qui ciblent explicitement le repli (où l'on tolère
// l'une OU l'autre source mais on vérifie la forme du repli quand source='heuristique').

const ENDPOINT = '/api/adoption/falc'

// Reconnaît une réponse FALC valide : objet { texte:string non vide, source dans l'ensemble attendu }.
function expectFalcShape(json: any) {
  expect(json).toBeTruthy()
  expect(typeof json.texte).toBe('string')
  expect(json.texte.length).toBeGreaterThan(0)
  expect(typeof json.source).toBe('string')
  expect(['ia', 'heuristique']).toContain(json.source)
}

describe('adopt — POST /api/adoption/falc (FALC)', () => {
  let amine: Session // accompagné vitrine, SANS plan → toutes features (falc inclus)
  let camille: Session // accompagnateur, sans plan restreint
  let admin: Session // admin (mohamed@elafrit.com), sans plan restreint

  // Comptes/plan jetables pour le scénario destructif de gating (plan sans 'falc').
  let gateUser: TestUser | null = null
  let gateSession: Session | null = null

  beforeAll(async () => {
    amine = await asUser(DEMO.amine)
    camille = await asUser(DEMO.camille)
    admin = await asUser(DEMO.admin)

    // Prépare un compte jetable affecté au plan « Découverte » (socle, SANS 'falc')
    // pour le test de gating négatif (TC-ADOPT-012). On n'altère AUCUN compte démo.
    const plansRes = await admin.get('/api/admin/plans')
    const decouverte = plansRes.json.plans.find((p: any) => p.nom === 'Découverte')
    if (decouverte) {
      gateUser = await createTestUser(admin, 'accompagne', 'adopt-gate')
      await admin.patch(`/api/admin/users/${gateUser.id}`, { plan_id: decouverte.id })
      gateSession = await asUser({ email: gateUser.email, password: gateUser.password })
    }
  })

  afterAll(async () => {
    // Auto-nettoyage : suppression RGPD du compte jetable (idempotent).
    if (gateUser) await deleteTestUser(admin, gateUser)
  })

  // --- Nominal & contrat -------------------------------------------------------------------

  it('TC-ADOPT-001 — FALC nominal : texte brut → 200 avec { texte non vide, source }', async () => {
    const r = await amine.post(ENDPOINT, {
      texte:
        "L'accompagnement vise à développer l'autonomie réflexive de la personne accompagnée dans la rédaction de son mémoire professionnel.",
    })
    expect(r.status).toBe(200)
    expectFalcShape(r.json)
  })

  it('TC-ADOPT-002 — FALC via champ html : HTML accepté et nettoyé (aucune balise/entité résiduelle)', async () => {
    const r = await amine.post(ENDPOINT, {
      html: '<h2>Bilan</h2><p>Vous avez bien progress&eacute;.</p><ul><li>Point 1</li></ul>',
    })
    expect(r.status).toBe(200)
    expectFalcShape(r.json)
    // strip() est appliqué AVANT l'appel IA/repli : aucune balise <...> ni entité &...; ne doit
    // subsister dans le texte renvoyé par le repli heuristique. Si l'IA répond, on ne peut pas
    // garantir l'absence de toute balise produite par le modèle, mais le repli, lui, est strict.
    if (r.json.source === 'heuristique') {
      expect(r.json.texte).not.toMatch(/<[^>]+>/)
      expect(r.json.texte).not.toMatch(/&[a-z]+;/i)
    }
  })

  it('TC-ADOPT-003 — FALC : priorité du champ texte sur html (texte ?? html)', async () => {
    // Le code lit String(req.body?.texte ?? req.body?.html ?? '') : 'texte' prime sur 'html'.
    const r = await amine.post(ENDPOINT, {
      texte: 'Phrase issue de texte.',
      html: '<p>Phrase issue de html.</p>',
    })
    expect(r.status).toBe(200)
    expectFalcShape(r.json)
    // Preuve indirecte que c'est bien 'texte' qui est traité (et non 'html') : sur le repli
    // heuristique, le contenu nettoyé du html ('Phrase issue de html.') n'apparaît pas.
    if (r.json.source === 'heuristique') {
      expect(r.json.texte).toContain('Phrase issue de texte.')
      expect(r.json.texte).not.toContain('Phrase issue de html.')
    }
  })

  it('TC-ADOPT-004 — FALC repli heuristique : texte multi-phrases → puces préfixées « • » quand source=heuristique', async () => {
    const r = await amine.post(ENDPOINT, {
      texte: 'Première idée. Deuxième idée importante. Troisième idée à retenir.',
    })
    expect(r.status).toBe(200)
    expectFalcShape(r.json)
    // Si la stack n'a pas de clé IA (ou l'appel échoue), source='heuristique' et falcFallback
    // produit des lignes préfixées par '• '. On ne force pas la source (dépend de l'env), mais
    // dès qu'elle vaut 'heuristique' la forme « puces » DOIT être respectée.
    if (r.json.source === 'heuristique') {
      const lignes = r.json.texte.split('\n')
      expect(lignes.length).toBeGreaterThanOrEqual(1)
      for (const l of lignes) expect(l.startsWith('• ')).toBe(true)
    }
  })

  it('TC-ADOPT-020 — FALC non-régression : la réponse contient exactement { texte, source } (string)', async () => {
    const r = await amine.post(ENDPOINT, { texte: 'Phrase de référence pour le contrat.' })
    expect(r.status).toBe(200)
    expectFalcShape(r.json)
    // Aucune fuite d'autres champs : le contrat se limite à 'texte' et 'source'.
    expect(Object.keys(r.json).sort()).toEqual(['source', 'texte'])
  })

  // --- Validation (400) --------------------------------------------------------------------

  it('TC-ADOPT-005 — FALC validation : texte vide → 400 { error: "Texte vide" }', async () => {
    const r = await amine.post(ENDPOINT, { texte: '' })
    expect(r.status).toBe(400)
    expect(r.json).toEqual({ error: 'Texte vide' })
  })

  it('TC-ADOPT-006 — FALC validation : body {} et body absent → 400 { error: "Texte vide" }', async () => {
    const empty = await amine.post(ENDPOINT, {})
    expect(empty.status).toBe(400)
    expect(empty.json).toEqual({ error: 'Texte vide' })

    const noBody = await amine.post(ENDPOINT)
    expect(noBody.status).toBe(400)
    expect(noBody.json).toEqual({ error: 'Texte vide' })
  })

  it('TC-ADOPT-007 — FALC validation : HTML/espaces uniquement réduit à vide après strip → 400', async () => {
    const r = await amine.post(ENDPOINT, { html: '<br>   <span> &nbsp; </span>\n\t' })
    expect(r.status).toBe(400)
    expect(r.json).toEqual({ error: 'Texte vide' })
  })

  it('TC-ADOPT-009 — FALC : champ non-string coercé par String() (nombre → 200, tableau → 200/400 sans crash)', async () => {
    // String(12345) = '12345' → non vide → 200.
    const nombre = await amine.post(ENDPOINT, { texte: 12345 })
    expect(nombre.status).toBe(200)
    expectFalcShape(nombre.json)

    // String(['a','b']) = 'a,b' → non vide après strip → 200. Quoi qu'il arrive : jamais de 500.
    const tableau = await amine.post(ENDPOINT, { texte: ['a', 'b'] })
    expect([200, 400]).toContain(tableau.status)
    expect(tableau.status).not.toBe(500)
    if (tableau.status === 200) expectFalcShape(tableau.json)
    else expect(tableau.json).toEqual({ error: 'Texte vide' })
  })

  // --- Valeurs limites / résilience --------------------------------------------------------

  it('TC-ADOPT-008 — FALC : texte > 4000 caractères → 200 (slice(0,4000) avant IA), pas de 413/500', async () => {
    // ~6000 caractères de phrases valides.
    const phrase = 'Ceci est une phrase de remplissage pour tester la troncature. '
    const long = phrase.repeat(Math.ceil(6000 / phrase.length)).slice(0, 6000)
    const r = await amine.post(ENDPOINT, { texte: long })
    expect(r.status).toBe(200)
    expectFalcShape(r.json)
  })

  it('TC-ADOPT-019 — FALC robustesse : si l\'IA est indisponible, repli sans 500 (source=heuristique → puces)', async () => {
    // Contrat de résilience : le try/catch de callClaude + le repli garantissent un 200.
    // On ne peut pas forcer la panne IA depuis le client ; on vérifie l'invariant : 200, jamais
    // 500, et forme de repli valide quand source='heuristique'.
    const r = await amine.post(ENDPOINT, { texte: 'Une phrase. Une autre phrase.' })
    expect(r.status).toBe(200)
    expect(r.status).not.toBe(500)
    expectFalcShape(r.json)
    if (r.json.source === 'heuristique') {
      for (const l of r.json.texte.split('\n')) expect(l.startsWith('• ')).toBe(true)
    }
  })

  // --- Contrôle d'accès : authentification (401) -------------------------------------------

  it('TC-ADOPT-010 — FALC accès : non authentifié → 401 { error: "Non authentifié" }', async () => {
    const anon = new Session() // aucun cookie
    const r = await anon.post(ENDPOINT, { texte: 'Texte de test.' })
    expect(r.status).toBe(401)
    expect(r.json).toEqual({ error: 'Non authentifié' })
  })

  it('TC-ADOPT-011 — FALC accès : cookie/JWT invalide → 401 { error: "Session invalide" }', async () => {
    const bad = new Session()
    // Injecte un cookie boussole_token falsifié : jwt.verify échoue dans requireAuth.
    bad.cookie = 'boussole_token=eyJhbGciOiJIUzI1NiJ9.invalide.signature'
    const r = await bad.post(ENDPOINT, { texte: 'x.' })
    expect(r.status).toBe(401)
    expect(r.json).toEqual({ error: 'Session invalide' })
  })

  // --- Contrôle d'accès : gating par feature (403 / 200) -----------------------------------

  it('TC-ADOPT-012 — FALC gating négatif : plan « Découverte » (sans falc) → 403', async () => {
    // Nécessite le plan « Découverte » seedé ; le compte jetable y est affecté en beforeAll.
    expect(gateSession).not.toBeNull()
    const r = await (gateSession as Session).post(ENDPOINT, { texte: 'Texte de test.' })
    expect(r.status).toBe(403)
    expect(r.json).toEqual({ error: 'Fonctionnalité non disponible dans votre offre' })
  })

  it('TC-ADOPT-013 — FALC gating positif : compte démo sans plan (Amine) → 200 (toutes features)', async () => {
    // userFeatures renvoie ALL_FEATURE_KEYS quand u.plan_id est nul → falc accordé.
    const r = await amine.post(ENDPOINT, { texte: 'Texte de test.' })
    expect(r.status).toBe(200)
    expectFalcShape(r.json)
  })

  it('TC-ADOPT-014 — FALC gating positif : plan « Pro » (toutes features, falc inclus) → 200', async () => {
    // Affecte temporairement un compte jetable au plan Pro, vérifie l'accès, puis le compte est
    // supprimé en afterAll. On n'altère aucun compte démo.
    const pro = (await admin.get('/api/admin/plans')).json.plans.find((p: any) => p.nom === 'Pro')
    expect(pro).toBeTruthy()
    const proUser = await createTestUser(admin, 'accompagne', 'adopt-pro')
    try {
      await admin.patch(`/api/admin/users/${proUser.id}`, { plan_id: pro.id })
      const s = await asUser({ email: proUser.email, password: proUser.password })
      const r = await s.post(ENDPOINT, { texte: 'Texte de test.' })
      expect(r.status).toBe(200)
      expectFalcShape(r.json)
    } finally {
      await deleteTestUser(admin, proUser)
    }
  })

  it('TC-ADOPT-015 — FALC accès multi-rôles : accompagnateur et admin (sans plan) → 200', async () => {
    // L'endpoint n'impose pas de rôle (requireAuth + requireFeature seulement, pas de requireRole).
    const rAcc = await camille.post(ENDPOINT, { texte: 'Texte de test.' })
    expect(rAcc.status).toBe(200)
    expectFalcShape(rAcc.json)

    const rAdmin = await admin.post(ENDPOINT, { texte: 'Texte de test.' })
    expect(rAdmin.status).toBe(200)
    expectFalcShape(rAdmin.json)
  })
})
