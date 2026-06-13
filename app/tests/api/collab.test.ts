import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Session, asUser, DEMO } from '../helpers/api'
import { createTestUser, deleteTestUser, type TestUser } from '../helpers/fixtures'
import { latestToken } from '../helpers/db'

// Tests d'intégration API du domaine « collab » (collaboration & IA).
// Source : app/api/src/collaboration.ts (routes /api/collab/*).
//
// Trois sous-domaines :
//   1. Mutualisation entre pairs (accompagnateurs) — feature « mutualisation »
//        GET /ressources/public/:token  (PUBLIC, hors auth/role/feature)
//        GET  /ressources               (requireAuth → role accompagnateur → feature mutualisation)
//        POST /ressources
//        PATCH /ressources/:id          (propriétaire uniquement : WHERE auteur_id=me.id)
//        DELETE /ressources/:id         (propriétaire uniquement)
//   2. Assistant de problématisation (accompagné) — feature « problematisation »
//        GET  /problematisation/dossier/:id
//        POST /problematisation/dossier/:id            (upsert manuel)
//        POST /problematisation/dossier/:id/suggerer   (IA + repli heuristique)
//   3. Résumé « où j'en suis » (accompagné) — feature « resume_parcours »
//        GET  /resume/dossier/:id
//        POST /resume/dossier/:id                       (IA + repli heuristique, upsert)
//
// Chaîne de gardes (ordre = ordre des erreurs) :
//   - 401 { error:'Non authentifié' }                                  si pas de cookie (requireAuth)
//   - 403 { error:'Accès refusé' }                                     si mauvais rôle (requireRole)
//   - 403 { error:'Fonctionnalité non disponible dans votre offre' }   si feature absente (requireFeature)
//   - 404 { error:'Parcours introuvable' } / { error:'Ressource introuvable' } si non-propriétaire
//
// Déterminisme :
//   - Les comptes démo SANS plan (Mohamed, Camille, Amine, Léa…) ont TOUTES les features.
//   - Pour le gating 403, on affecte un compte JETABLE @boussole.test au plan « Découverte »
//     (socle : ne contient ni mutualisation, ni problematisation, ni resume_parcours).
//   - Le destructif (create/patch/delete de ressources) s'exécute sous un accompagnateur jetable,
//     jamais sous Mohamed/Camille (dont la bibliothèque est re-semée au démarrage de la stack).
//   - Tout est nettoyé en afterAll ; on ne dégrade jamais durablement un compte démo.
//   - Les ids (dossiers, ressources) sont découverts dynamiquement, jamais codés en dur.
//   - Endpoints IA (suggerer, resume POST) : contrat seulement (statut + forme + non-vacuité +
//     gating + persistance), jamais le texte exact. Le repli heuristique (clé Claude absente) est
//     déterministe, donc on peut l'asserter ; si l'IA est active (source='ia'), on relâche.

const TOKEN_PUBLIC = 'demo-question-exploration' // ressource publique seedée (Mohamed)

describe('collab — mutualisation, problématisation & résumé', () => {
  let admin: Session
  let mohamed: Session // accompagnateur vitrine (auteur des ressources démo, sans plan → toutes features)
  let camille: Session // second accompagnateur (auteur d'une ressource démo, non-propriétaire des ressources de Mohamed)
  let amine: Session // accompagné vitrine (propriétaire du dossier D1, sans plan → toutes features)
  let lea: Session // accompagné (ne possède pas D1)

  // Plans découverts dynamiquement
  let decouvertePlanId: number

  // Comptes jetables
  let gateAcc: TestUser // accompagnateur au plan Découverte (sans mutualisation)
  let gateAccSession: Session
  let workAcc: TestUser // accompagnateur sans plan (toutes features) pour le destructif sur SES ressources
  let workAccSession: Session
  let gateAccompagne: TestUser // accompagné au plan Découverte (sans problematisation / resume_parcours)
  let gateAccompagneSession: Session
  let anonAcc: { id: number; email: string; password: string } // accompagnateur SANS prénom/nom (auteur anonyme)
  let anonAccSession: Session
  let anonResourceToken = '' // token public d'une ressource créée par l'auteur anonyme

  // Dossier D1 d'Amine (vitrine), découvert dynamiquement
  let d1: number

  beforeAll(async () => {
    admin = await asUser(DEMO.admin)
    mohamed = await asUser(DEMO.mohamed)
    camille = await asUser(DEMO.camille)
    amine = await asUser(DEMO.amine)
    lea = await asUser(DEMO.lea)

    // --- Découverte du plan « Découverte » (socle) ---
    const plansRes = await admin.get('/api/admin/plans')
    expect(plansRes.status).toBe(200)
    const plans: Array<{ id: number; nom: string; features: string[] }> = plansRes.json.plans
    const decouverte = plans.find((p) => p.nom === 'Découverte')
    if (!decouverte) throw new Error('Plan « Découverte » introuvable (seed plans manquant ?)')
    // Garde-fou : Découverte ne doit contenir AUCUNE des 3 features collab.
    expect(decouverte.features).not.toContain('mutualisation')
    expect(decouverte.features).not.toContain('problematisation')
    expect(decouverte.features).not.toContain('resume_parcours')
    decouvertePlanId = decouverte.id

    // --- Découverte du dossier vitrine D1 d'Amine ---
    const mine = await amine.get('/api/dossiers/mine')
    expect(mine.status).toBe(200)
    expect(Array.isArray(mine.json.dossiers)).toBe(true)
    expect(mine.json.dossiers.length).toBeGreaterThan(0)
    // D1 = dossier vitrine accompagné par Mohamed (acc_email = email vitrine de Mohamed).
    const d1Row =
      mine.json.dossiers.find((d: any) => d.acc_email === DEMO.mohamed.email) || mine.json.dossiers[0]
    d1 = d1Row.id
    expect(typeof d1).toBe('number')

    // --- Comptes jetables ---
    // a) accompagnateur GATÉ (plan Découverte → sans mutualisation)
    gateAcc = await createTestUser(admin, 'accompagnateur', 'collab-gate-acc')
    expect((await admin.patch(`/api/admin/users/${gateAcc.id}`, { plan_id: decouvertePlanId })).status).toBe(200)
    gateAccSession = await asUser({ email: gateAcc.email, password: gateAcc.password })

    // b) accompagnateur de TRAVAIL (sans plan → toutes features) pour create/patch/delete isolés
    workAcc = await createTestUser(admin, 'accompagnateur', 'collab-work-acc')
    workAccSession = await asUser({ email: workAcc.email, password: workAcc.password })

    // c) accompagné GATÉ (plan Découverte → sans problematisation ni resume_parcours)
    gateAccompagne = await createTestUser(admin, 'accompagne', 'collab-gate-acg')
    expect((await admin.patch(`/api/admin/users/${gateAccompagne.id}`, { plan_id: decouvertePlanId })).status).toBe(200)
    gateAccompagneSession = await asUser({ email: gateAccompagne.email, password: gateAccompagne.password })

    // d) accompagnateur SANS prénom/nom (auteur « anonyme »).
    //    createTestUser force prenom='Test' ; on crée donc le compte à la main (sans nom/prénom).
    anonAcc = await createAnonymousAccompagnateur(admin)
    anonAccSession = await asUser({ email: anonAcc.email, password: anonAcc.password })
    // Cet auteur crée une ressource puis la rend publique → sert aux cas « auteur anonyme ».
    const created = await anonAccSession.post('/api/collab/ressources', {
      titre: 'Ressource d’un auteur sans nom',
      contenu: 'Contenu de test pour vérifier le repli auteur.',
      type: 'astuce',
    })
    expect(created.status).toBe(201)
    const anonResId = created.json.id as number
    const pub = await anonAccSession.patch(`/api/collab/ressources/${anonResId}`, { public: true })
    expect(pub.status).toBe(200)
    anonResourceToken = pub.json.token
  })

  afterAll(async () => {
    // Nettoyage des comptes jetables (cascade : supprime aussi leurs ressources partagées).
    if (gateAcc) await deleteTestUser(admin, gateAcc)
    if (workAcc) await deleteTestUser(admin, workAcc)
    if (gateAccompagne) await deleteTestUser(admin, gateAccompagne)
    if (anonAcc) await admin.post(`/api/admin/rgpd/${anonAcc.id}`, { action: 'supprimer' })
  })

  // Crée un accompagnateur sans prénom ni nom, et active son mot de passe via le jeton reset.
  async function createAnonymousAccompagnateur(adminSession: Session): Promise<{ id: number; email: string; password: string }> {
    const email = 'test-collab-anon-accompagnateur@boussole.test'
    // Nettoyage préalable d'un éventuel résidu.
    const list = await adminSession.get('/api/admin/users')
    const old = (list.json?.users || []).find((u: any) => u.email === email)
    if (old) await adminSession.post(`/api/admin/rgpd/${old.id}`, { action: 'supprimer' })
    const created = await adminSession.post('/api/admin/users', { email, role: 'accompagnateur' }) // sans nom/prénom
    expect(created.status).toBe(201)
    const id = created.json.id as number
    const token = latestToken(email, 'reset_mdp')
    if (!token) throw new Error('Jeton d’activation introuvable pour le compte anonyme')
    const password = 'TestBoussole2026!'
    const s = new Session()
    expect((await s.post('/api/auth/reset', { token, password })).status).toBe(200)
    return { id, email, password }
  }

  // Récupère une ressource de la bibliothèque par filtre (vue accompagnateur authentifié).
  async function findResource(session: Session, pred: (r: any) => boolean): Promise<any | undefined> {
    const r = await session.get('/api/collab/ressources')
    expect(r.status).toBe(200)
    return (r.json.ressources as any[]).find(pred)
  }

  // ====================================================================================
  //  1. Lien public — GET /ressources/public/:token (hors auth)
  // ====================================================================================

  it('TC-COLLAB-001 — lien public : lecture sans authentification (nominal)', async () => {
    const anon = new Session()
    const r = await anon.get(`/api/collab/ressources/public/${TOKEN_PUBLIC}`)
    expect(r.status).toBe(200)
    const res = r.json.ressource
    expect(res).toBeTruthy()
    // Forme exposée : titre, type, contenu, cree_le, auteur. Aucun id ni token.
    expect(typeof res.titre).toBe('string')
    expect(res.titre.length).toBeGreaterThan(0)
    expect(typeof res.type).toBe('string')
    expect(typeof res.contenu).toBe('string')
    expect(res.contenu.length).toBeGreaterThan(0)
    expect(typeof res.cree_le).toBe('string')
    expect(typeof res.auteur).toBe('string')
    expect(res.auteur.length).toBeGreaterThan(0)
    expect(res).not.toHaveProperty('id')
    expect(res).not.toHaveProperty('token')
    expect(res).not.toHaveProperty('auteur_id')
    // Auteur = prénom+nom joints (Mohamed est nommé).
    expect(res.auteur).not.toBe('Un accompagnateur')
  })

  it('TC-COLLAB-002 — lien public : repli auteur « Un accompagnateur » si prénom/nom vides', async () => {
    const anon = new Session()
    const r = await anon.get(`/api/collab/ressources/public/${anonResourceToken}`)
    expect(r.status).toBe(200)
    // L'auteur n'a ni prénom ni nom → [].filter(Boolean).join(' ') === '' → repli.
    expect(r.json.ressource.auteur).toBe('Un accompagnateur')
  })

  it('TC-COLLAB-003 — lien public : token inexistant → 404', async () => {
    const anon = new Session()
    const r = await anon.get('/api/collab/ressources/public/token-inexistant-xyz')
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Ressource introuvable ou non publique')
  })

  it('TC-COLLAB-004 — lien public : ressource interne → 404 (pas de fuite)', async () => {
    // On crée une ressource interne (portee='interne' par défaut, token NULL) puis on tente de la
    // rendre publique pour obtenir un token, puis on la repasse en interne : le token existe en base
    // mais le filtre WHERE portee='public' doit la masquer.
    const created = await workAccSession.post('/api/collab/ressources', {
      titre: 'Ressource interne masquée',
      contenu: 'Ne doit jamais fuiter via le lien public.',
      type: 'methode',
    })
    expect(created.status).toBe(201)
    const id = created.json.id as number
    const pub = await workAccSession.patch(`/api/collab/ressources/${id}`, { public: true })
    expect(pub.status).toBe(200)
    const token = pub.json.token as string
    // Repasse en interne (token conservé en base mais portee != public).
    expect((await workAccSession.patch(`/api/collab/ressources/${id}`, { public: false })).status).toBe(200)
    const anon = new Session()
    const r = await anon.get(`/api/collab/ressources/public/${token}`)
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Ressource introuvable ou non publique')
    // Nettoyage.
    await workAccSession.del(`/api/collab/ressources/${id}`)
  })

  it('TC-COLLAB-005 — lien public : aucune feature exigée (avec et sans cookie)', async () => {
    // Sans cookie.
    const anon = new Session()
    const r1 = await anon.get(`/api/collab/ressources/public/${TOKEN_PUBLIC}`)
    expect(r1.status).toBe(200)
    // Avec un cookie d'un compte limité (accompagnateur au plan Découverte, sans mutualisation) :
    // la route publique ne traverse ni requireAuth, ni requireRole, ni requireFeature.
    const r2 = await gateAccSession.get(`/api/collab/ressources/public/${TOKEN_PUBLIC}`)
    expect(r2.status).toBe(200)
    expect(r2.json.ressource.titre).toBe(r1.json.ressource.titre)
  })

  it('TC-COLLAB-064 — sécurité : injection SQL inopérante via token public (paramétrage)', async () => {
    const anon = new Session()
    const r = await anon.get(`/api/collab/ressources/public/${encodeURIComponent("' OR '1'='1")}`)
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Ressource introuvable ou non publique')
  })

  // ====================================================================================
  //  2. Bibliothèque interne — GET /ressources
  // ====================================================================================

  it('TC-COLLAB-006 — bibliothèque : liste nominale (forme + flag mienne + tri DESC)', async () => {
    const r = await mohamed.get('/api/collab/ressources')
    expect(r.status).toBe(200)
    expect(Array.isArray(r.json.ressources)).toBe(true)
    expect(r.json.ressources.length).toBeGreaterThan(0)
    for (const item of r.json.ressources) {
      expect(typeof item.id).toBe('number')
      expect(typeof item.titre).toBe('string')
      expect(typeof item.type).toBe('string')
      expect(typeof item.contenu).toBe('string')
      expect(['interne', 'public']).toContain(item.portee)
      expect(item.token === null || typeof item.token === 'string').toBe(true)
      expect(typeof item.cree_le).toBe('string')
      expect(typeof item.auteur).toBe('string')
      expect(typeof item.mienne).toBe('boolean')
    }
    // Tri par cree_le DESC.
    const dates = r.json.ressources.map((x: any) => x.cree_le)
    const sorted = [...dates].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0))
    expect(dates).toEqual(sorted)
    // mienne=true pour une ressource de Mohamed (la ressource publique démo lui appartient).
    const own = r.json.ressources.find((x: any) => x.token === TOKEN_PUBLIC)
    expect(own).toBeTruthy()
    expect(own.mienne).toBe(true)
    // mienne=false pour une ressource d'un autre auteur (Camille en a seedé une).
    const others = r.json.ressources.filter((x: any) => !x.mienne)
    expect(others.length).toBeGreaterThan(0)
  })

  it('TC-COLLAB-007 — bibliothèque : auteur « Anonyme » si prénom/nom vides', async () => {
    // L'auteur anonyme a créé une ressource ; vue de la bibliothèque interne, son auteur == 'Anonyme'
    // (alors que le lien public renvoie 'Un accompagnateur' — cf. TC-COLLAB-002).
    const item = await findResource(mohamed, (x) => x.token === anonResourceToken)
    expect(item).toBeTruthy()
    expect(item.auteur).toBe('Anonyme')
  })

  it('TC-COLLAB-008 — bibliothèque : 401 si non authentifié', async () => {
    const anon = new Session()
    const r = await anon.get('/api/collab/ressources')
    expect(r.status).toBe(401)
    expect(r.json.error).toBe('Non authentifié')
  })

  it('TC-COLLAB-009 — bibliothèque : 403 mauvais rôle (accompagné)', async () => {
    const r = await amine.get('/api/collab/ressources')
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('Accès refusé')
  })

  it('TC-COLLAB-010 — bibliothèque : 403 rôle admin (non autorisé)', async () => {
    const r = await admin.get('/api/collab/ressources')
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('Accès refusé') // requireRole('accompagnateur') exclut admin
  })

  it('TC-COLLAB-011 — bibliothèque : 403 si offre sans mutualisation', async () => {
    const r = await gateAccSession.get('/api/collab/ressources')
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('Fonctionnalité non disponible dans votre offre')
  })

  // ====================================================================================
  //  3. Créer une ressource — POST /ressources
  // ====================================================================================

  it('TC-COLLAB-012 — créer : cas nominal (type valide) → 201 + relecture', async () => {
    const r = await workAccSession.post('/api/collab/ressources', {
      titre: 'Reformuler la demande',
      type: 'methode',
      contenu: 'Distinguer demande explicite et besoin réel.',
    })
    expect(r.status).toBe(201)
    expect(typeof r.json.id).toBe('number')
    const item = await findResource(workAccSession, (x) => x.id === r.json.id)
    expect(item).toBeTruthy()
    expect(item.type).toBe('methode')
    expect(item.portee).toBe('interne') // défaut
    expect(item.mienne).toBe(true)
    await workAccSession.del(`/api/collab/ressources/${r.json.id}`)
  })

  it('TC-COLLAB-013 — créer : type inconnu → repli « astuce »', async () => {
    const r = await workAccSession.post('/api/collab/ressources', { titre: 'T13', contenu: 'C13', type: 'banane' })
    expect(r.status).toBe(201)
    const item = await findResource(workAccSession, (x) => x.id === r.json.id)
    expect(item.type).toBe('astuce')
    await workAccSession.del(`/api/collab/ressources/${r.json.id}`)
  })

  it('TC-COLLAB-014 — créer : type absent → repli « astuce »', async () => {
    const r = await workAccSession.post('/api/collab/ressources', { titre: 'T14', contenu: 'C14' })
    expect(r.status).toBe(201)
    const item = await findResource(workAccSession, (x) => x.id === r.json.id)
    expect(item.type).toBe('astuce')
    await workAccSession.del(`/api/collab/ressources/${r.json.id}`)
  })

  it('TC-COLLAB-015 — créer : titre manquant → 400', async () => {
    const r = await workAccSession.post('/api/collab/ressources', { contenu: 'C', type: 'astuce' })
    expect(r.status).toBe(400)
    expect(r.json.error).toBe('Titre et contenu requis')
  })

  it('TC-COLLAB-016 — créer : titre/contenu uniquement espaces → 400 (après trim)', async () => {
    const r = await workAccSession.post('/api/collab/ressources', { titre: '   ', contenu: '\n\t ' })
    expect(r.status).toBe(400)
    expect(r.json.error).toBe('Titre et contenu requis')
  })

  it('TC-COLLAB-017 — créer : contenu manquant → 400', async () => {
    const r = await workAccSession.post('/api/collab/ressources', { titre: 'T' })
    expect(r.status).toBe(400)
    expect(r.json.error).toBe('Titre et contenu requis')
  })

  it('TC-COLLAB-018 — créer : 401 non authentifié', async () => {
    const anon = new Session()
    const r = await anon.post('/api/collab/ressources', { titre: 'T', contenu: 'C' })
    expect(r.status).toBe(401)
    expect(r.json.error).toBe('Non authentifié')
  })

  it('TC-COLLAB-019 — créer : 403 mauvais rôle (accompagné)', async () => {
    const r = await amine.post('/api/collab/ressources', { titre: 'T', contenu: 'C' })
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('Accès refusé')
  })

  it('TC-COLLAB-020 — créer : 403 sans la feature mutualisation', async () => {
    const r = await gateAccSession.post('/api/collab/ressources', { titre: 'T', contenu: 'C' })
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('Fonctionnalité non disponible dans votre offre')
  })

  // ====================================================================================
  //  4. Basculer interne <-> public — PATCH /ressources/:id
  // ====================================================================================

  it('TC-COLLAB-021 — bascule public : génération du jeton (nominal)', async () => {
    const created = await workAccSession.post('/api/collab/ressources', { titre: 'À publier', contenu: 'Contenu.' })
    const id = created.json.id as number
    const r = await workAccSession.patch(`/api/collab/ressources/${id}`, { public: true })
    expect(r.status).toBe(200)
    expect(r.json.ok).toBe(true)
    expect(r.json.portee).toBe('public')
    expect(typeof r.json.token).toBe('string')
    expect(r.json.token).toMatch(/^[0-9a-f]{64}$/) // makeToken() = 32 octets hex
    // Le lien public répond désormais 200.
    const anon = new Session()
    const pub = await anon.get(`/api/collab/ressources/public/${r.json.token}`)
    expect(pub.status).toBe(200)
    expect(pub.json.ressource.titre).toBe('À publier')
    await workAccSession.del(`/api/collab/ressources/${id}`)
  })

  it('TC-COLLAB-022 — bascule public deux fois : jeton réutilisé (idempotence)', async () => {
    const created = await workAccSession.post('/api/collab/ressources', { titre: 'Idem token', contenu: 'X.' })
    const id = created.json.id as number
    const first = await workAccSession.patch(`/api/collab/ressources/${id}`, { public: true })
    expect(first.status).toBe(200)
    const tokenT = first.json.token as string
    const second = await workAccSession.patch(`/api/collab/ressources/${id}`, { public: true })
    expect(second.status).toBe(200)
    // r.token || makeToken() → le token existant est réutilisé, pas régénéré.
    expect(second.json.token).toBe(tokenT)
    await workAccSession.del(`/api/collab/ressources/${id}`)
  })

  it('TC-COLLAB-023 — repasser en interne : portee=interne, lien public → 404', async () => {
    const created = await workAccSession.post('/api/collab/ressources', { titre: 'Re-interne', contenu: 'Y.' })
    const id = created.json.id as number
    const pub = await workAccSession.patch(`/api/collab/ressources/${id}`, { public: true })
    const tokenT = pub.json.token as string
    const back = await workAccSession.patch(`/api/collab/ressources/${id}`, { public: false })
    expect(back.status).toBe(200)
    expect(back.json.ok).toBe(true)
    expect(back.json.portee).toBe('interne')
    expect(back.json).not.toHaveProperty('token') // token non renvoyé en mode interne
    // Le lien public sur l'ancien token renvoie 404 (filtre portee='public').
    const anon = new Session()
    expect((await anon.get(`/api/collab/ressources/public/${tokenT}`)).status).toBe(404)
    await workAccSession.del(`/api/collab/ressources/${id}`)
  })

  it('TC-COLLAB-024 — bascule : « public » absent ou non strictement true → interne', async () => {
    const created = await workAccSession.post('/api/collab/ressources', { titre: 'Strict bool', contenu: 'Z.' })
    const id = created.json.id as number
    // Le rend d'abord public pour repartir d'un état public.
    await workAccSession.patch(`/api/collab/ressources/${id}`, { public: true })
    // 1) body vide → interne
    const empty = await workAccSession.patch(`/api/collab/ressources/${id}`, {})
    expect(empty.status).toBe(200)
    expect(empty.json.portee).toBe('interne')
    // 2) public:'true' (chaîne) → interne (=== true échoue)
    await workAccSession.patch(`/api/collab/ressources/${id}`, { public: true })
    const str = await workAccSession.patch(`/api/collab/ressources/${id}`, { public: 'true' })
    expect(str.status).toBe(200)
    expect(str.json.portee).toBe('interne')
    // 3) public:1 (number) → interne
    await workAccSession.patch(`/api/collab/ressources/${id}`, { public: true })
    const num = await workAccSession.patch(`/api/collab/ressources/${id}`, { public: 1 })
    expect(num.status).toBe(200)
    expect(num.json.portee).toBe('interne')
    await workAccSession.del(`/api/collab/ressources/${id}`)
  })

  it('TC-COLLAB-025 — bascule : ressource d’un autre accompagnateur → 404 (non-propriétaire)', async () => {
    // Camille tente de modifier une ressource appartenant à Mohamed.
    const mohamedRes = await findResource(mohamed, (x) => x.token === TOKEN_PUBLIC && x.mienne)
    expect(mohamedRes).toBeTruthy()
    const r = await camille.patch(`/api/collab/ressources/${mohamedRes.id}`, { public: true })
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Ressource introuvable')
    // La ressource de Mohamed est intacte (toujours présente et à lui).
    const stillThere = await findResource(mohamed, (x) => x.id === mohamedRes.id)
    expect(stillThere).toBeTruthy()
    expect(stillThere.mienne).toBe(true)
  })

  it('TC-COLLAB-026 — bascule : id inexistant → 404', async () => {
    const r = await workAccSession.patch('/api/collab/ressources/999999', { public: true })
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Ressource introuvable')
  })

  it('TC-COLLAB-027 — bascule : 401 / 403 rôle / 403 feature', async () => {
    const created = await workAccSession.post('/api/collab/ressources', { titre: 'Accès patch', contenu: 'A.' })
    const id = created.json.id as number
    // a) sans cookie → 401
    const anon = new Session()
    const a = await anon.patch(`/api/collab/ressources/${id}`, { public: true })
    expect(a.status).toBe(401)
    expect(a.json.error).toBe('Non authentifié')
    // b) accompagné → 403 Accès refusé
    const b = await amine.patch(`/api/collab/ressources/${id}`, { public: true })
    expect(b.status).toBe(403)
    expect(b.json.error).toBe('Accès refusé')
    // c) accompagnateur sans mutualisation → 403 feature
    const c = await gateAccSession.patch(`/api/collab/ressources/${id}`, { public: true })
    expect(c.status).toBe(403)
    expect(c.json.error).toBe('Fonctionnalité non disponible dans votre offre')
    await workAccSession.del(`/api/collab/ressources/${id}`)
  })

  // ====================================================================================
  //  5. Supprimer une ressource — DELETE /ressources/:id
  // ====================================================================================

  it('TC-COLLAB-028 — supprimer : cas nominal (propriétaire)', async () => {
    const created = await workAccSession.post('/api/collab/ressources', { titre: 'À supprimer', contenu: 'S.' })
    const id = created.json.id as number
    const r = await workAccSession.del(`/api/collab/ressources/${id}`)
    expect(r.status).toBe(200)
    expect(r.json.ok).toBe(true)
    // Relecture : la ressource n'apparaît plus.
    const gone = await findResource(workAccSession, (x) => x.id === id)
    expect(gone).toBeUndefined()
  })

  it('TC-COLLAB-029 — supprimer : ressource d’un autre accompagnateur → 404', async () => {
    const mohamedRes = await findResource(mohamed, (x) => x.token === TOKEN_PUBLIC && x.mienne)
    expect(mohamedRes).toBeTruthy()
    const r = await camille.del(`/api/collab/ressources/${mohamedRes.id}`)
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Ressource introuvable')
    // La ressource de Mohamed existe toujours.
    const stillThere = await findResource(mohamed, (x) => x.id === mohamedRes.id)
    expect(stillThere).toBeTruthy()
  })

  it('TC-COLLAB-030 — supprimer : id inexistant ou déjà supprimé → 404 (idempotence)', async () => {
    // id jamais existant
    const r1 = await workAccSession.del('/api/collab/ressources/999999')
    expect(r1.status).toBe(404)
    expect(r1.json.error).toBe('Ressource introuvable')
    // double suppression
    const created = await workAccSession.post('/api/collab/ressources', { titre: 'Double del', contenu: 'D.' })
    const id = created.json.id as number
    expect((await workAccSession.del(`/api/collab/ressources/${id}`)).status).toBe(200)
    const r2 = await workAccSession.del(`/api/collab/ressources/${id}`)
    expect(r2.status).toBe(404)
    expect(r2.json.error).toBe('Ressource introuvable')
  })

  it('TC-COLLAB-031 — supprimer : 401 / 403 rôle / 403 feature', async () => {
    const created = await workAccSession.post('/api/collab/ressources', { titre: 'Accès del', contenu: 'A.' })
    const id = created.json.id as number
    // a) sans cookie → 401
    const anon = new Session()
    const a = await anon.del(`/api/collab/ressources/${id}`)
    expect(a.status).toBe(401)
    expect(a.json.error).toBe('Non authentifié')
    // b) accompagné → 403 Accès refusé
    const b = await amine.del(`/api/collab/ressources/${id}`)
    expect(b.status).toBe(403)
    expect(b.json.error).toBe('Accès refusé')
    // c) accompagnateur sans feature → 403 feature
    const c = await gateAccSession.del(`/api/collab/ressources/${id}`)
    expect(c.status).toBe(403)
    expect(c.json.error).toBe('Fonctionnalité non disponible dans votre offre')
    // La ressource est toujours là (aucune des tentatives n'a réussi) puis on nettoie.
    expect((await workAccSession.del(`/api/collab/ressources/${id}`)).status).toBe(200)
  })

  // ====================================================================================
  //  6. Problématisation — GET /problematisation/dossier/:id
  // ====================================================================================

  it('TC-COLLAB-032 — problématisation GET : questions + données nominales', async () => {
    const r = await amine.get(`/api/collab/problematisation/dossier/${d1}`)
    expect(r.status).toBe(200)
    expect(Array.isArray(r.json.questions)).toBe(true)
    expect(r.json.questions.length).toBe(4)
    for (const q of r.json.questions) {
      expect(typeof q).toBe('string')
      expect(q.length).toBeGreaterThan(0)
    }
    // data : null (jamais enregistré) OU objet {reponses[], problematique, source, maj_le}.
    if (r.json.data !== null) {
      expect(Array.isArray(r.json.data.reponses)).toBe(true)
      expect(typeof r.json.data.problematique).toBe('string')
      expect(typeof r.json.data.source).toBe('string')
      expect(typeof r.json.data.maj_le).toBe('string')
    }
  })

  it('TC-COLLAB-033 — problématisation GET : dossier d’un autre accompagné → 404', async () => {
    // Léa ne possède pas D1 (à Amine).
    const r = await lea.get(`/api/collab/problematisation/dossier/${d1}`)
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Parcours introuvable')
  })

  it('TC-COLLAB-034 — problématisation GET : 401 / 403 rôle / 403 feature', async () => {
    // a) sans cookie → 401
    const anon = new Session()
    const a = await anon.get(`/api/collab/problematisation/dossier/${d1}`)
    expect(a.status).toBe(401)
    expect(a.json.error).toBe('Non authentifié')
    // b) accompagnateur → 403 Accès refusé (route réservée aux accompagnés)
    const b = await mohamed.get(`/api/collab/problematisation/dossier/${d1}`)
    expect(b.status).toBe(403)
    expect(b.json.error).toBe('Accès refusé')
    // c) accompagné au plan Découverte (sans problematisation) → 403 feature.
    //    On utilise un dossier de l'accompagné gaté lui-même n'est pas nécessaire :
    //    requireFeature s'exécute AVANT ownDossier, donc tout id donne 403.
    const c = await gateAccompagneSession.get(`/api/collab/problematisation/dossier/${d1}`)
    expect(c.status).toBe(403)
    expect(c.json.error).toBe('Fonctionnalité non disponible dans votre offre')
  })

  // ====================================================================================
  //  7. Problématisation — POST /problematisation/dossier/:id (upsert manuel)
  // ====================================================================================

  it('TC-COLLAB-035 — problématisation POST : enregistrement manuel (upsert insert) + relecture', async () => {
    const reponses = ['terrain', 'tension', 'pôles', 'utilité']
    const problematique = 'Comment concilier autonomie et contrôle ?'
    const r = await amine.post(`/api/collab/problematisation/dossier/${d1}`, { reponses, problematique })
    expect(r.status).toBe(200)
    expect(r.json.ok).toBe(true)
    const get = await amine.get(`/api/collab/problematisation/dossier/${d1}`)
    expect(get.status).toBe(200)
    expect(get.json.data).toBeTruthy()
    expect(get.json.data.problematique).toBe(problematique)
    expect(get.json.data.reponses).toEqual(reponses)
    expect(get.json.data.source).toBe('manuel')
    expect(typeof get.json.data.maj_le).toBe('string')
  })

  it('TC-COLLAB-036 — problématisation POST : ré-enregistrement (upsert update, une seule ligne)', async () => {
    // 1re écriture
    await amine.post(`/api/collab/problematisation/dossier/${d1}`, { reponses: ['v1'], problematique: 'Formulation A' })
    // 2e écriture (autres valeurs)
    const r = await amine.post(`/api/collab/problematisation/dossier/${d1}`, {
      reponses: ['v2'],
      problematique: 'Nouvelle formulation',
    })
    expect(r.status).toBe(200)
    expect(r.json.ok).toBe(true)
    // ON CONFLICT(dossier_id) DO UPDATE : GET renvoie bien les DERNIÈRES valeurs.
    const get = await amine.get(`/api/collab/problematisation/dossier/${d1}`)
    expect(get.json.data.problematique).toBe('Nouvelle formulation')
    expect(get.json.data.reponses).toEqual(['v2'])
  })

  it('TC-COLLAB-037 — problématisation POST : corps vide → 200 + valeurs vides (pas de 400)', async () => {
    const r = await amine.post(`/api/collab/problematisation/dossier/${d1}`, {})
    expect(r.status).toBe(200)
    expect(r.json.ok).toBe(true)
    const get = await amine.get(`/api/collab/problematisation/dossier/${d1}`)
    // reponses non-tableau → [] ; problematique String(undefined||'') → ''
    expect(get.json.data.reponses).toEqual([])
    expect(get.json.data.problematique).toBe('')
  })

  it('TC-COLLAB-038 — problématisation POST : reponses non-tableau normalisé à [] ; problematique coercée', async () => {
    const r = await amine.post(`/api/collab/problematisation/dossier/${d1}`, {
      reponses: 'pas un tableau',
      problematique: 42,
    })
    expect(r.status).toBe(200)
    const get = await amine.get(`/api/collab/problematisation/dossier/${d1}`)
    expect(get.json.data.reponses).toEqual([]) // Array.isArray false → []
    expect(get.json.data.problematique).toBe('42') // String(42)
  })

  it('TC-COLLAB-039 — problématisation POST : dossier non possédé → 404', async () => {
    const r = await lea.post(`/api/collab/problematisation/dossier/${d1}`, { reponses: ['x'], problematique: 'y' })
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Parcours introuvable')
  })

  it('TC-COLLAB-040 — problématisation POST : 401 / 403 rôle / 403 feature', async () => {
    // a) sans cookie → 401
    const anon = new Session()
    const a = await anon.post(`/api/collab/problematisation/dossier/${d1}`, { problematique: 'x' })
    expect(a.status).toBe(401)
    expect(a.json.error).toBe('Non authentifié')
    // b) accompagnateur → 403 Accès refusé
    const b = await mohamed.post(`/api/collab/problematisation/dossier/${d1}`, { problematique: 'x' })
    expect(b.status).toBe(403)
    expect(b.json.error).toBe('Accès refusé')
    // c) accompagné gaté (plan sans problematisation) → 403 feature
    const c = await gateAccompagneSession.post(`/api/collab/problematisation/dossier/${d1}`, { problematique: 'x' })
    expect(c.status).toBe(403)
    expect(c.json.error).toBe('Fonctionnalité non disponible dans votre offre')
  })

  // ====================================================================================
  //  8. Problématisation — POST /problematisation/dossier/:id/suggerer (IA + repli)
  // ====================================================================================

  it('TC-COLLAB-041 — problématisation suggerer (IA) : contrat de réponse', async () => {
    const reponses = ['terrain métier/technique', 'une tension récurrente', 'autonomie vs contrôle', 'utilité']
    const r = await amine.post(`/api/collab/problematisation/dossier/${d1}/suggerer`, { reponses })
    expect(r.status).toBe(200)
    // Contrat : champs présents/typés, non-vacuité, sous_questions ≤ 3, source ∈ {ia, heuristique}.
    expect(typeof r.json.problematique).toBe('string')
    expect(r.json.problematique.length).toBeGreaterThan(0)
    expect(Array.isArray(r.json.sous_questions)).toBe(true)
    expect(r.json.sous_questions.length).toBeLessThanOrEqual(3)
    for (const sq of r.json.sous_questions) expect(typeof sq).toBe('string')
    expect(['ia', 'heuristique']).toContain(r.json.source)
  })

  it('TC-COLLAB-042 — problématisation suggerer : repli heuristique déterministe (si IA indisponible)', async () => {
    const reponses = ['un cabinet de conseil', 'x', 'autonomie ↔ contrôle', 'y']
    const r = await amine.post(`/api/collab/problematisation/dossier/${d1}/suggerer`, { reponses })
    expect(r.status).toBe(200)
    // Le repli n'est garanti que si la clé Claude est absente (source='heuristique').
    // Si l'IA est active (source='ia'), on ne fige pas le texte — contrat déjà couvert par TC-041.
    if (r.json.source === 'heuristique') {
      // problematique == `Comment, dans ${reponses[0]}, concilier ${reponses[2]} ?`
      expect(r.json.problematique).toBe('Comment, dans un cabinet de conseil, concilier autonomie ↔ contrôle ?')
      expect(r.json.sous_questions).toEqual([
        'Quels éléments concrets illustrent cette tension ?',
        'Quels leviers permettent de la dépasser ?',
      ])
    }
  })

  it('TC-COLLAB-044 — problématisation suggerer : 404 dossier d’autrui ; 401 / 403 rôle / 403 feature', async () => {
    // a) Léa sur le dossier d'Amine → 404 (gating passé : Léa a la feature ; ownDossier KO)
    const a = await lea.post(`/api/collab/problematisation/dossier/${d1}/suggerer`, { reponses: [] })
    expect(a.status).toBe(404)
    expect(a.json.error).toBe('Parcours introuvable')
    // b) sans cookie → 401
    const anon = new Session()
    const b = await anon.post(`/api/collab/problematisation/dossier/${d1}/suggerer`, { reponses: [] })
    expect(b.status).toBe(401)
    expect(b.json.error).toBe('Non authentifié')
    // c) accompagnateur → 403 Accès refusé
    const c = await mohamed.post(`/api/collab/problematisation/dossier/${d1}/suggerer`, { reponses: [] })
    expect(c.status).toBe(403)
    expect(c.json.error).toBe('Accès refusé')
    // d) accompagné gaté → 403 feature (vérifié AVANT tout appel IA)
    const d = await gateAccompagneSession.post(`/api/collab/problematisation/dossier/${d1}/suggerer`, { reponses: [] })
    expect(d.status).toBe(403)
    expect(d.json.error).toBe('Fonctionnalité non disponible dans votre offre')
  })

  // ====================================================================================
  //  9. Résumé — GET /resume/dossier/:id
  // ====================================================================================

  it('TC-COLLAB-046 — résumé GET : état nominal (null si jamais généré, sinon forme)', async () => {
    const r = await amine.get(`/api/collab/resume/dossier/${d1}`)
    expect(r.status).toBe(200)
    expect(r.json).toHaveProperty('resume')
    if (r.json.resume !== null) {
      expect(typeof r.json.resume.etat).toBe('string')
      expect(Array.isArray(r.json.resume.faits)).toBe(true)
      expect(Array.isArray(r.json.resume.prochaines_etapes)).toBe(true)
      expect(typeof r.json.resume.source).toBe('string')
      expect(typeof r.json.resume.genere_le).toBe('string')
    }
  })

  it('TC-COLLAB-047 — résumé GET : 404 dossier d’autrui ; 401 / 403 rôle / 403 feature', async () => {
    // a) Léa sur dossier d'Amine → 404
    const a = await lea.get(`/api/collab/resume/dossier/${d1}`)
    expect(a.status).toBe(404)
    expect(a.json.error).toBe('Parcours introuvable')
    // b) sans cookie → 401
    const anon = new Session()
    const b = await anon.get(`/api/collab/resume/dossier/${d1}`)
    expect(b.status).toBe(401)
    expect(b.json.error).toBe('Non authentifié')
    // c) accompagnateur → 403 Accès refusé
    const c = await mohamed.get(`/api/collab/resume/dossier/${d1}`)
    expect(c.status).toBe(403)
    expect(c.json.error).toBe('Accès refusé')
    // d) accompagné gaté (plan Découverte : sans resume_parcours) → 403 feature.
    //    NB : le plan « Essentiel » contient resume_parcours, donc on utilise bien Découverte.
    const d = await gateAccompagneSession.get(`/api/collab/resume/dossier/${d1}`)
    expect(d.status).toBe(403)
    expect(d.json.error).toBe('Fonctionnalité non disponible dans votre offre')
  })

  // ====================================================================================
  //  10. Résumé — POST /resume/dossier/:id (IA + repli, upsert)
  // ====================================================================================

  it('TC-COLLAB-048 — résumé POST (IA) : contrat de réponse + persistance/relecture', async () => {
    const r = await amine.post(`/api/collab/resume/dossier/${d1}`)
    expect(r.status).toBe(200)
    expect(typeof r.json.etat).toBe('string')
    expect(r.json.etat.length).toBeGreaterThan(0)
    expect(Array.isArray(r.json.faits)).toBe(true)
    expect(Array.isArray(r.json.prochaines_etapes)).toBe(true)
    expect(['ia', 'heuristique']).toContain(r.json.source)
    // Persistance : GET renvoie le même contenu + genere_le.
    const get = await amine.get(`/api/collab/resume/dossier/${d1}`)
    expect(get.status).toBe(200)
    expect(get.json.resume).toBeTruthy()
    expect(get.json.resume.etat).toBe(r.json.etat)
    expect(get.json.resume.faits).toEqual(r.json.faits)
    expect(get.json.resume.prochaines_etapes).toEqual(r.json.prochaines_etapes)
    expect(get.json.resume.source).toBe(r.json.source)
    expect(typeof get.json.resume.genere_le).toBe('string')
  })

  it('TC-COLLAB-049 — résumé POST : repli heuristique resumeFallback (si IA indisponible)', async () => {
    const r = await amine.post(`/api/collab/resume/dossier/${d1}`)
    expect(r.status).toBe(200)
    // Le repli n'est garanti que sans clé Claude (source='heuristique').
    if (r.json.source === 'heuristique') {
      const PHASES_FR = [
        'Accueil et mise en confiance',
        'Clarifier le besoin',
        'Explorer l’expérience',
        'Relier et donner du sens',
        'Plan d’action & engagement',
        'Clôture et élan',
      ]
      // D1 (vitrine) a des sessions → phaseMax ≥ 0 → l'état cite l'étape + des décomptes.
      expect(r.json.etat).toContain('Tu es à l’étape')
      const citesUnePhase = PHASES_FR.some((p) => r.json.etat.includes(p))
      expect(citesUnePhase).toBe(true)
      expect(r.json.etat).toMatch(/compte\(s\) rendu publié\(s\)/)
      expect(r.json.etat).toMatch(/action\(s\) réalisée\(s\)/)
      // faits[] : 2 éléments (état questionnaire + état CR).
      expect(r.json.faits.length).toBe(2)
      // prochaines_etapes : jusqu'à 3 actions non-faites, ou repli.
      expect(r.json.prochaines_etapes.length).toBeGreaterThan(0)
      expect(r.json.prochaines_etapes.length).toBeLessThanOrEqual(3)
    }
  })

  it('TC-COLLAB-052 — résumé POST : ré-génération met à jour (upsert, une seule ligne)', async () => {
    const first = await amine.post(`/api/collab/resume/dossier/${d1}`)
    expect(first.status).toBe(200)
    const get1 = await amine.get(`/api/collab/resume/dossier/${d1}`)
    const second = await amine.post(`/api/collab/resume/dossier/${d1}`)
    expect(second.status).toBe(200)
    const get2 = await amine.get(`/api/collab/resume/dossier/${d1}`)
    // ON CONFLICT(dossier_id) DO UPDATE : toujours un résumé unique (resume non null), pas de doublon.
    expect(get1.json.resume).toBeTruthy()
    expect(get2.json.resume).toBeTruthy()
    // genere_le est (ré)actualisé à chaque génération (monotone non-décroissant).
    expect(typeof get2.json.resume.genere_le).toBe('string')
    expect(get2.json.resume.genere_le >= get1.json.resume.genere_le).toBe(true)
  })

  it('TC-COLLAB-053 — résumé POST : 404 dossier d’autrui ; 401 / 403 rôle / 403 feature', async () => {
    // a) Léa sur dossier d'Amine → 404
    const a = await lea.post(`/api/collab/resume/dossier/${d1}`)
    expect(a.status).toBe(404)
    expect(a.json.error).toBe('Parcours introuvable')
    // b) sans cookie → 401
    const anon = new Session()
    const b = await anon.post(`/api/collab/resume/dossier/${d1}`)
    expect(b.status).toBe(401)
    expect(b.json.error).toBe('Non authentifié')
    // c) accompagnateur → 403 Accès refusé
    const c = await mohamed.post(`/api/collab/resume/dossier/${d1}`)
    expect(c.status).toBe(403)
    expect(c.json.error).toBe('Accès refusé')
    // d) accompagné gaté (plan Découverte, sans resume_parcours) → 403 feature
    const d = await gateAccompagneSession.post(`/api/collab/resume/dossier/${d1}`)
    expect(d.status).toBe(403)
    expect(d.json.error).toBe('Fonctionnalité non disponible dans votre offre')
  })
})
