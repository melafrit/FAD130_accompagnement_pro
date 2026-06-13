import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Session, asUser, DEMO } from '../helpers/api'
import { createTestUser, deleteTestUser, type TestUser } from '../helpers/fixtures'

// Tests d'intégration API du domaine « pilot » (pilotage & alertes accompagnateur).
// Source : app/api/src/pilotage.ts (routes /api/pilotage/*).
// Chaîne de middlewares pour les 4 routes : requireAuth → requireRole('accompagnateur') → requireFeature(<clé>).
//   - 401 { error: 'Non authentifié' } si aucun cookie (requireAuth)
//   - 401 { error: 'Session invalide' } si jeton corrompu (requireAuth)
//   - 403 { error: 'Accès refusé' } si rôle ≠ accompagnateur (requireRole), y compris admin
//   - 403 { error: 'Fonctionnalité non disponible dans votre offre' } si l'offre n'inclut pas la feature (requireFeature)
// Les comptes démo sans plan (Mohamed, Camille…) ont TOUTES les features (userFeatures → ALL_FEATURE_KEYS).
// Pour le gating 403, on utilise un compte JETABLE @boussole.test affecté au plan « Découverte » (socle, sans
// signaux_faibles / tableau_impact / digest_email), puis on le supprime en afterAll.

describe('pilot — pilotage & alertes (accompagnateur)', () => {
  let admin: Session
  let mohamed: Session // accompagnateur vitrine (dossiers démo, sans plan → toutes features)
  let camille: Session // second accompagnateur (dossiers distincts)
  let amine: Session // accompagné
  let lea: Session // accompagné
  let karim: Session // accompagné

  // Plans découverts dynamiquement
  let decouvertePlanId: number
  let proPlanId: number

  // Comptes de test jetables
  let gated: TestUser // accompagnateur affecté au plan « Découverte » (sans features pilotage)
  let gatedSession: Session
  let proUser: TestUser // accompagnateur affecté au plan « Pro » (toutes features)
  let proSession: Session
  let emptyUser: TestUser // accompagnateur sans aucun dossier (sans plan → toutes features)
  let emptySession: Session

  beforeAll(async () => {
    admin = await asUser(DEMO.admin)
    mohamed = await asUser(DEMO.mohamed)
    camille = await asUser(DEMO.camille)
    amine = await asUser(DEMO.amine)
    lea = await asUser(DEMO.lea)
    karim = await asUser(DEMO.karim)

    // Découverte dynamique des plans (jamais d'id en dur).
    const plansRes = await admin.get('/api/admin/plans')
    expect(plansRes.status).toBe(200)
    const plans: Array<{ id: number; nom: string; features: string[] }> = plansRes.json.plans
    const decouverte = plans.find((p) => p.nom === 'Découverte')
    const pro = plans.find((p) => p.nom === 'Pro')
    if (!decouverte || !pro) throw new Error('Plans « Découverte » / « Pro » introuvables (seed plans manquant ?)')
    // Garde-fou : Découverte ne doit contenir AUCUNE feature de pilotage.
    expect(decouverte.features).not.toContain('signaux_faibles')
    expect(decouverte.features).not.toContain('tableau_impact')
    expect(decouverte.features).not.toContain('digest_email')
    decouvertePlanId = decouverte.id
    proPlanId = pro.id

    // Compte jeté pour le gating 403 (plan Découverte = socle uniquement).
    gated = await createTestUser(admin, 'accompagnateur', 'pilot-gate')
    expect((await admin.patch(`/api/admin/users/${gated.id}`, { plan_id: decouvertePlanId })).status).toBe(200)
    gatedSession = await asUser({ email: gated.email, password: gated.password })

    // Compte jeté affecté au plan Pro (toutes features → accès OK).
    proUser = await createTestUser(admin, 'accompagnateur', 'pilot-pro')
    expect((await admin.patch(`/api/admin/users/${proUser.id}`, { plan_id: proPlanId })).status).toBe(200)
    proSession = await asUser({ email: proUser.email, password: proUser.password })

    // Compte jeté SANS plan et SANS dossier (toutes features, mais zéro parcours suivi).
    emptyUser = await createTestUser(admin, 'accompagnateur', 'pilot-empty')
    emptySession = await asUser({ email: emptyUser.email, password: emptyUser.password })
  })

  afterAll(async () => {
    // Nettoyage des comptes jetables uniquement (jamais de dégradation des comptes démo).
    if (gated) await deleteTestUser(admin, gated)
    if (proUser) await deleteTestUser(admin, proUser)
    if (emptyUser) await deleteTestUser(admin, emptyUser)
  })

  // ----------------------------------------------------------------------------------------
  // GET /api/pilotage/signaux (feature signaux_faibles)
  // ----------------------------------------------------------------------------------------

  it('TC-PILOT-001 — GET /pilotage/signaux : 200 et forme de la réponse', async () => {
    const r = await mohamed.get('/api/pilotage/signaux')
    expect(r.status).toBe(200)
    expect(Array.isArray(r.json.signaux)).toBe(true)
    expect(r.json.signaux.length).toBeGreaterThan(0) // Mohamed (vitrine) a au moins un dossier suivi
    for (const s of r.json.signaux) {
      expect(typeof s.dossier_id).toBe('number')
      expect(typeof s.prenom).toBe('string')
      expect(s.prenom.length).toBeGreaterThan(0)
      expect(['vert', 'orange', 'rouge']).toContain(s.niveau)
      expect(Array.isArray(s.raisons)).toBe(true)
      expect(s.raisons.length).toBeGreaterThan(0)
      for (const raison of s.raisons) expect(typeof raison).toBe('string')
      expect(typeof s.signature).toBe('string')
      // signature = `${niveau}|${raisons triées jointes par ';'}`
      expect(s.signature.startsWith(`${s.niveau}|`)).toBe(true)
    }
  })

  it('TC-PILOT-002 — GET /pilotage/signaux : ne renvoie que les dossiers de l\'accompagnateur connecté', async () => {
    const mineCamille = await camille.get('/api/pilotage/signaux')
    expect(mineCamille.status).toBe(200)
    const mineMohamed = await mohamed.get('/api/pilotage/signaux')
    expect(mineMohamed.status).toBe(200)
    const camilleIds = new Set<number>(mineCamille.json.signaux.map((s: any) => s.dossier_id))
    const mohamedIds = new Set<number>(mineMohamed.json.signaux.map((s: any) => s.dossier_id))
    // Isolation par accompagnateur (BASE_SQL filtre WHERE d.accompagnateur_id=?) : aucun chevauchement de dossier.
    for (const id of camilleIds) expect(mohamedIds.has(id)).toBe(false)
  })

  it('TC-PILOT-003 — GET /pilotage/signaux : 401 si non authentifié', async () => {
    const anon = new Session()
    const r = await anon.get('/api/pilotage/signaux')
    expect(r.status).toBe(401)
    expect(r.json.error).toBe('Non authentifié')
  })

  it('TC-PILOT-004 — GET /pilotage/signaux : 401 si jeton invalide/corrompu', async () => {
    const corrupt = new Session()
    corrupt.cookie = 'boussole_token=jeton.bidon.123'
    const r = await corrupt.get('/api/pilotage/signaux')
    expect(r.status).toBe(401)
    expect(r.json.error).toBe('Session invalide')
  })

  it('TC-PILOT-005 — GET /pilotage/signaux : 403 si rôle accompagné', async () => {
    const r = await amine.get('/api/pilotage/signaux')
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('Accès refusé')
  })

  it('TC-PILOT-006 — GET /pilotage/signaux : 403 si rôle admin', async () => {
    const r = await admin.get('/api/pilotage/signaux')
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('Accès refusé') // requireRole('accompagnateur') exclut admin
  })

  it('TC-PILOT-007 — GET /pilotage/signaux : 403 si offre sans signaux_faibles', async () => {
    const r = await gatedSession.get('/api/pilotage/signaux')
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('Fonctionnalité non disponible dans votre offre')
  })

  it('TC-PILOT-008 — GET /pilotage/signaux : accès OK avec plan Pro (signaux_faibles inclus)', async () => {
    const r = await proSession.get('/api/pilotage/signaux')
    expect(r.status).toBe(200)
    expect(Array.isArray(r.json.signaux)).toBe(true)
  })

  it('TC-PILOT-009 — GET /pilotage/signaux : accompagnateur sans dossier → liste vide', async () => {
    const r = await emptySession.get('/api/pilotage/signaux')
    expect(r.status).toBe(200)
    expect(r.json.signaux).toEqual([])
  })

  // ----------------------------------------------------------------------------------------
  // GET /api/pilotage/impact (feature tableau_impact)
  // ----------------------------------------------------------------------------------------

  it('TC-PILOT-025 — GET /pilotage/impact : 200 et contrat des indicateurs', async () => {
    const r = await mohamed.get('/api/pilotage/impact')
    expect(r.status).toBe(200)
    const b = r.json
    for (const k of [
      'dossiers_actifs',
      'dossiers_clotures',
      'entretiens_total',
      'cr_publies',
      'syntheses_publiees',
      'actions_total',
      'actions_faites',
      'taux_actions',
      'progression_moyenne',
    ]) {
      expect(typeof b[k]).toBe('number')
    }
    // meteo_evolution : number | null
    expect(b.meteo_evolution === null || typeof b.meteo_evolution === 'number').toBe(true)
    // Répartition des signaux : tous des nombres
    expect(b.signaux).toBeTruthy()
    expect(typeof b.signaux.vert).toBe('number')
    expect(typeof b.signaux.orange).toBe('number')
    expect(typeof b.signaux.rouge).toBe('number')
    // Cohérence d'agrégat : somme des signaux = dossiers actifs + clôturés
    expect(b.signaux.vert + b.signaux.orange + b.signaux.rouge).toBe(b.dossiers_actifs + b.dossiers_clotures)
  })

  it('TC-PILOT-026 — GET /pilotage/impact : 401 non authentifié', async () => {
    const anon = new Session()
    const r = await anon.get('/api/pilotage/impact')
    expect(r.status).toBe(401)
    expect(r.json.error).toBe('Non authentifié')
  })

  it('TC-PILOT-027 — GET /pilotage/impact : 403 mauvais rôle (accompagné)', async () => {
    const r = await amine.get('/api/pilotage/impact')
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('Accès refusé')
  })

  it('TC-PILOT-028 — GET /pilotage/impact : 403 si offre sans tableau_impact', async () => {
    const r = await gatedSession.get('/api/pilotage/impact')
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('Fonctionnalité non disponible dans votre offre')
  })

  it('TC-PILOT-029 — GET /pilotage/impact : agrégats restreints aux dossiers de l\'accompagnateur', async () => {
    const impactCamille = await camille.get('/api/pilotage/impact')
    expect(impactCamille.status).toBe(200)
    // Isolation : la répartition des signaux de Camille couvre exactement SES dossiers,
    // dont les ids ne chevauchent pas ceux de Mohamed (vérifié via /signaux ci-dessous).
    const sumCamille =
      impactCamille.json.signaux.vert + impactCamille.json.signaux.orange + impactCamille.json.signaux.rouge
    const sigCamille = await camille.get('/api/pilotage/signaux')
    const sigMohamed = await mohamed.get('/api/pilotage/signaux')
    const camilleIds = new Set<number>(sigCamille.json.signaux.map((s: any) => s.dossier_id))
    const mohamedIds = new Set<number>(sigMohamed.json.signaux.map((s: any) => s.dossier_id))
    // Le nombre de signaux agrégés correspond au nombre de dossiers de Camille.
    expect(sumCamille).toBe(camilleIds.size)
    // Aucun dossier de Mohamed n'est compté chez Camille.
    for (const id of camilleIds) expect(mohamedIds.has(id)).toBe(false)
  })

  // ----------------------------------------------------------------------------------------
  // GET /api/pilotage/digest (feature digest_email)
  // ----------------------------------------------------------------------------------------

  it('TC-PILOT-037 — GET /pilotage/digest : 200 et contrat de l\'aperçu', async () => {
    const r = await mohamed.get('/api/pilotage/digest')
    expect(r.status).toBe(200)
    const b = r.json
    expect(b.periode).toBe('7 derniers jours')
    expect(Array.isArray(b.lignes)).toBe(true)
    expect(b.lignes.length).toBeGreaterThan(0)
    expect(b.impact).toBeTruthy()
    expect(typeof b.impact.dossiers_actifs).toBe('number')
    expect(b.resume).toBeTruthy()
    expect(typeof b.resume.alertes).toBe('number')
    expect(typeof b.resume.actifs).toBe('number')
    expect(typeof b.html).toBe('string')
    expect(b.html.length).toBeGreaterThan(0)
    for (const l of b.lignes) {
      expect(typeof l.dossier_id).toBe('number')
      expect(typeof l.prenom).toBe('string')
      expect(['vert', 'orange', 'rouge']).toContain(l.niveau)
      expect(typeof l.cr_semaine).toBe('number')
      expect(typeof l.meteo_semaine).toBe('number')
      expect(typeof l.journal_semaine).toBe('number')
      expect(typeof l.actions_retard).toBe('number')
      expect(typeof l.rdv_7j).toBe('number')
    }
  })

  it('TC-PILOT-038 — GET /pilotage/digest : 401 non authentifié', async () => {
    const anon = new Session()
    const r = await anon.get('/api/pilotage/digest')
    expect(r.status).toBe(401)
    expect(r.json.error).toBe('Non authentifié')
  })

  it('TC-PILOT-039 — GET /pilotage/digest : 403 mauvais rôle (accompagné)', async () => {
    const r = await lea.get('/api/pilotage/digest')
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('Accès refusé')
  })

  it('TC-PILOT-040 — GET /pilotage/digest : 403 si offre sans digest_email', async () => {
    const r = await gatedSession.get('/api/pilotage/digest')
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('Fonctionnalité non disponible dans votre offre')
  })

  // ----------------------------------------------------------------------------------------
  // POST /api/pilotage/digest/envoyer (feature digest_email)
  // ----------------------------------------------------------------------------------------

  it('TC-PILOT-047 — POST /pilotage/digest/envoyer : 200 { ok:true, envoye_a } (envoi nominal)', async () => {
    const r = await mohamed.post('/api/pilotage/digest/envoyer')
    expect(r.status).toBe(200)
    expect(r.json.ok).toBe(true)
    expect(typeof r.json.envoye_a).toBe('string')
    // Destinataire = email de l'accompagnateur connecté (Mohamed vitrine).
    expect(r.json.envoye_a).toBe(DEMO.mohamed.email)
  })

  it('TC-PILOT-048 — POST /pilotage/digest/envoyer : 401 non authentifié', async () => {
    const anon = new Session()
    const r = await anon.post('/api/pilotage/digest/envoyer')
    expect(r.status).toBe(401)
    expect(r.json.error).toBe('Non authentifié')
  })

  it('TC-PILOT-049 — POST /pilotage/digest/envoyer : 403 mauvais rôle (accompagné)', async () => {
    const r = await karim.post('/api/pilotage/digest/envoyer')
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('Accès refusé')
  })

  it('TC-PILOT-050 — POST /pilotage/digest/envoyer : 403 si offre sans digest_email', async () => {
    const r = await gatedSession.post('/api/pilotage/digest/envoyer')
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('Fonctionnalité non disponible dans votre offre')
  })

  it('TC-PILOT-051 — POST /pilotage/digest/envoyer : envoie au PROPRE email, pas à celui d\'un autre', async () => {
    const r = await camille.post('/api/pilotage/digest/envoyer')
    expect(r.status).toBe(200)
    expect(r.json.ok).toBe(true)
    // Le destinataire est l'email de Camille, jamais celui de Mohamed.
    expect(r.json.envoye_a).toBe(DEMO.camille.email)
    expect(r.json.envoye_a).not.toBe(DEMO.mohamed.email)
  })

  // ----------------------------------------------------------------------------------------
  // Non-régression : accès complet pour un accompagnateur SANS plan (toutes features)
  // ----------------------------------------------------------------------------------------

  it('TC-PILOT-057 — Non-régression : les 4 endpoints répondent 200 pour un accompagnateur sans plan', async () => {
    // Mohamed (vitrine) n'a pas de plan → userFeatures renvoie ALL_FEATURE_KEYS.
    expect((await mohamed.get('/api/pilotage/signaux')).status).toBe(200)
    expect((await mohamed.get('/api/pilotage/impact')).status).toBe(200)
    expect((await mohamed.get('/api/pilotage/digest')).status).toBe(200)
    expect((await mohamed.post('/api/pilotage/digest/envoyer')).status).toBe(200)
  })
})
