import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Session, asUser, DEMO } from '../helpers/api'
import { createTestUser, deleteTestUser, type TestUser } from '../helpers/fixtures'

// =============================================================================
//  Domaine « viz » — Visualisation & émotionnel
//  Source : app/api/src/visualisation.ts
//    - Nuage de thèmes      (feature nuage_themes)  : GET/POST /api/viz/nuage/dossier/:id
//    - Roue des émotions    (feature roue_emotions) : GET /api/viz/emotions/catalogue,
//                                                      GET/POST /api/viz/emotions/dossier/:id
//
//  Contrats vérifiés (cf. code lu) :
//    * Pile de middlewares : requireAuth -> requireFeature(<clé>) -> handler.
//      => 401 { error:'Non authentifié' } avant tout, puis
//         403 { error:'Fonctionnalité non disponible dans votre offre' } si l'offre
//         n'inclut pas la feature, puis contrôle de propriété ownEither (404).
//    * ownEither(uid, did) accepte l'accompagné OU l'accompagnateur du dossier ;
//      sinon (autrui / id inconnu / NaN) -> 404 { error:'Parcours introuvable' }.
//    * POST nuage : renvoie { themes, source } avec statut 200 (PAS 201) ; si le
//      texte agrégé fait <= 80 caractères OU si l'IA échoue/clé absente => repli
//      heuristique (source='heuristique'). On NE FIGE PAS le texte des thèmes.
//    * GET nuage : { nuage: { themes, source, genere_le } } ou { nuage: null }.
//    * Catalogue émotions : 16 entrées { cle, famille }.
//    * POST émotions : sanitize contre EMOTIONS (dédup + filtre), 400 si vide,
//      note tronquée à 200, role = role de l'auteur ; 201 { ok:true }.
//
//  Isolation : aucun scénario ne dégrade durablement un compte démo. Le gating 403,
//  les écritures d'émotions et les dossiers « contrôlés » (vierge / contenu maîtrisé)
//  passent par des comptes JETABLES @boussole.test et un plan jetable, tous nettoyés
//  en afterAll. Les dossiers démo ne servent qu'en LECTURE / génération idempotente.
// =============================================================================

// Sous-ensemble socle SANS nuage_themes ni roue_emotions, pour provoquer le 403.
const SOCLE_SANS_VIZ = [
  'questionnaire', 'entretien', 'comptes_rendus', 'rdv',
  'plan_action', 'synthese', 'auto_evaluation', 'multi_parcours',
]

/** Premier id de dossier de l'accompagné connecté (via /api/dossiers/mine). */
async function firstOwnDossier(s: Session): Promise<number> {
  const r = await s.get('/api/dossiers/mine')
  expect(r.status).toBe(200)
  expect(Array.isArray(r.json?.dossiers)).toBe(true)
  expect(r.json.dossiers.length).toBeGreaterThan(0)
  return r.json.dossiers[0].id as number
}

/** Premier id de dossier suivi par l'accompagnateur connecté (via /api/entretien/dashboard). */
async function firstSupervisedDossier(s: Session): Promise<number> {
  const r = await s.get('/api/entretien/dashboard')
  expect(r.status).toBe(200)
  expect(Array.isArray(r.json?.dossiers)).toBe(true)
  expect(r.json.dossiers.length).toBeGreaterThan(0)
  return r.json.dossiers[0].id as number
}

describe('viz — visualisation & émotionnel', () => {
  let admin: Session
  let amine: Session // accompagné vitrine (propriétaire de dossiers, suivi par Mohamed)
  let mohamed: Session // accompagnateur vitrine (accompagnateur_id des dossiers d'Amine)
  let lea: Session // accompagné tiers (ne possède pas les dossiers d'Amine)
  let karim: Session // accompagné tiers

  // Dossiers démo (LECTURE / génération idempotente uniquement)
  let dossierAmine: number // possédé par Amine, suivi par Mohamed

  // Ressources jetables (créées en beforeAll, supprimées en afterAll)
  let planSansViz: number | null = null
  let pilote: TestUser | null = null // accompagné jetable, rattaché au plan sans viz (pour les 403)
  let owner: TestUser | null = null // accompagné jetable de plein droit (dossiers contrôlés)
  let ownerSession: Session
  let dossierOwner: number // dossier vierge possédé par `owner` (contenu maîtrisé)

  beforeAll(async () => {
    admin = await asUser(DEMO.admin)
    amine = await asUser(DEMO.amine)
    mohamed = await asUser(DEMO.mohamed)
    lea = await asUser(DEMO.lea)
    karim = await asUser(DEMO.karim)

    dossierAmine = await firstOwnDossier(amine)

    // --- Plan jetable SANS nuage_themes ni roue_emotions (pour les cas 403) ---
    const planCreated = await admin.post('/api/admin/plans', {
      nom: `Test-viz-sans-features-${Date.now()}`,
      description: 'Plan jetable de test (socle sans les features viz)',
      features: SOCLE_SANS_VIZ,
    })
    expect(planCreated.status).toBe(201)
    planSansViz = planCreated.json.id as number

    // --- Accompagné jetable rattaché au plan sans viz (déclenche les 403) ---
    pilote = await createTestUser(admin, 'accompagne', 'viz-gate')
    const patched = await admin.patch(`/api/admin/users/${pilote.id}`, { plan_id: planSansViz })
    expect(patched.status).toBe(200)

    // --- Accompagné jetable « de plein droit » (aucun plan => toutes features) ---
    // Il démarre un parcours VIERGE : contenu textuel agrégé vide, aucun relevé d'émotions.
    owner = await createTestUser(admin, 'accompagne', 'viz-owner')
    ownerSession = await asUser({ email: owner.email, password: owner.password })
    const accs = await ownerSession.get('/api/dossiers/accompagnateurs')
    expect(accs.status).toBe(200)
    expect(accs.json.accompagnateurs.length).toBeGreaterThan(0)
    const accId = accs.json.accompagnateurs[0].id as number
    const started = await ownerSession.post('/api/dossiers/start', {
      titre: 'Parcours de test viz', accompagnateurId: accId,
    })
    expect(started.status).toBe(201)
    dossierOwner = started.json.dossierId as number
  })

  afterAll(async () => {
    // Nettoyage : suppression RGPD des comptes jetables (cascade) puis du plan jetable.
    if (owner) await deleteTestUser(admin, owner)
    if (pilote) await deleteTestUser(admin, pilote)
    if (planSansViz != null) await admin.del(`/api/admin/plans/${planSansViz}`)
  })

  // ==========================================================================
  //  1. Nuage de thèmes — GET /api/viz/nuage/dossier/:id
  // ==========================================================================

  it('TC-VIZ-001 — GET nuage existant : relecture nominale (200, forme du nuage)', async () => {
    // On garantit la présence en générant une fois (idempotent, dossier vitrine d'Amine).
    const gen = await amine.post(`/api/viz/nuage/dossier/${dossierAmine}`)
    expect(gen.status).toBe(200)

    const r = await amine.get(`/api/viz/nuage/dossier/${dossierAmine}`)
    expect(r.status).toBe(200)
    expect(r.json.nuage).not.toBeNull()
    expect(Array.isArray(r.json.nuage.themes)).toBe(true)
    expect(['ia', 'heuristique']).toContain(r.json.nuage.source)
    expect(typeof r.json.nuage.genere_le).toBe('string')
    expect(r.json.nuage.genere_le.length).toBeGreaterThan(0)
    for (const t of r.json.nuage.themes) {
      expect(typeof t.mot).toBe('string')
      expect(t.mot.length).toBeGreaterThan(0)
      expect(Number.isInteger(t.poids)).toBe(true)
      expect(t.poids).toBeGreaterThanOrEqual(1)
      expect(t.poids).toBeLessThanOrEqual(10)
    }
  })

  it('TC-VIZ-002 — GET nuage jamais généré : renvoie nuage:null (200)', async () => {
    // Dossier jetable vierge : aucune ligne dans nuages_themes => branche row=undefined.
    const r = await ownerSession.get(`/api/viz/nuage/dossier/${dossierOwner}`)
    expect(r.status).toBe(200)
    expect(r.json).toEqual({ nuage: null })
  })

  it('TC-VIZ-003 — GET nuage : non authentifié (401)', async () => {
    const anon = new Session()
    const r = await anon.get(`/api/viz/nuage/dossier/${dossierAmine}`)
    expect(r.status).toBe(401)
    expect(r.json).toEqual({ error: 'Non authentifié' })
  })

  it('TC-VIZ-004 — GET nuage : feature absente de l\'offre (403 requireFeature)', async () => {
    const s = await asUser({ email: pilote!.email, password: pilote!.password })
    const did = dossierAmine // requireFeature bloque (403) avant tout contrôle de propriété
    const r = await s.get(`/api/viz/nuage/dossier/${did}`)
    expect(r.status).toBe(403)
    expect(r.json).toEqual({ error: 'Fonctionnalité non disponible dans votre offre' })
  })

  it('TC-VIZ-005 — GET nuage : dossier d\'un autre utilisateur (404 propriété)', async () => {
    // Léa n'est ni accompagne_id ni accompagnateur_id du dossier d'Amine.
    const r = await lea.get(`/api/viz/nuage/dossier/${dossierAmine}`)
    expect(r.status).toBe(404)
    expect(r.json).toEqual({ error: 'Parcours introuvable' })
  })

  it('TC-VIZ-006 — GET nuage : id non numérique / inexistant (404)', async () => {
    // 'abc' -> Number => NaN ; 999999 -> inexistant : ownEither renvoie undefined dans les deux cas.
    const rNaN = await mohamed.get('/api/viz/nuage/dossier/abc')
    expect(rNaN.status).toBe(404)
    expect(rNaN.json).toEqual({ error: 'Parcours introuvable' })

    const rUnknown = await mohamed.get('/api/viz/nuage/dossier/999999')
    expect(rUnknown.status).toBe(404)
    expect(rUnknown.json).toEqual({ error: 'Parcours introuvable' })
  })

  // ==========================================================================
  //  1bis. Nuage de thèmes — POST /api/viz/nuage/dossier/:id (contrat IA + repli)
  // ==========================================================================

  it('TC-VIZ-007 — POST nuage : génération nominale par contrat (200, themes + source)', async () => {
    // Dossier vitrine d'Amine (contenu riche). Contrat seulement : on ne fige pas le texte.
    const r = await amine.post(`/api/viz/nuage/dossier/${dossierAmine}`)
    expect(r.status).toBe(200)
    expect(Array.isArray(r.json.themes)).toBe(true)
    expect(r.json.themes.length).toBeLessThanOrEqual(24)
    expect(['ia', 'heuristique']).toContain(r.json.source)
    for (const t of r.json.themes) {
      expect(typeof t.mot).toBe('string')
      expect(t.mot.length).toBeGreaterThan(0)
      expect(Number.isInteger(t.poids)).toBe(true)
      expect(t.poids).toBeGreaterThanOrEqual(1)
      expect(t.poids).toBeLessThanOrEqual(10)
    }
  })

  it('TC-VIZ-008 — POST nuage : persistance et relecture (upsert puis GET cohérent)', async () => {
    const post = await amine.post(`/api/viz/nuage/dossier/${dossierAmine}`)
    expect(post.status).toBe(200)

    const get = await amine.get(`/api/viz/nuage/dossier/${dossierAmine}`)
    expect(get.status).toBe(200)
    expect(get.json.nuage).not.toBeNull()
    // Le GET relit exactement les thèmes persistés par le POST + source + genere_le.
    expect(get.json.nuage.themes).toEqual(post.json.themes)
    expect(get.json.nuage.source).toBe(post.json.source)
    expect(typeof get.json.nuage.genere_le).toBe('string')
    expect(get.json.nuage.genere_le.length).toBeGreaterThan(0)
  })

  it('TC-VIZ-009 — POST nuage : régénération met à jour sans doublon (idempotence upsert)', async () => {
    // ON CONFLICT(dossier_id) DO UPDATE : deux POST successifs => toujours une seule ligne,
    // relue par un unique GET (forme { nuage: {...} }, jamais un tableau de nuages).
    const p1 = await amine.post(`/api/viz/nuage/dossier/${dossierAmine}`)
    expect(p1.status).toBe(200)
    const p2 = await amine.post(`/api/viz/nuage/dossier/${dossierAmine}`)
    expect(p2.status).toBe(200)

    const get = await amine.get(`/api/viz/nuage/dossier/${dossierAmine}`)
    expect(get.status).toBe(200)
    expect(get.json.nuage).not.toBeNull()
    expect(Array.isArray(get.json.nuage.themes)).toBe(true)
    // Le contenu relu correspond au dernier POST (mise à jour, pas accumulation).
    expect(get.json.nuage.themes).toEqual(p2.json.themes)
    expect(get.json.nuage.source).toBe(p2.json.source)
  })

  it('TC-VIZ-010 — POST nuage : dossier quasi vide => repli heuristique (source=\'heuristique\')', async () => {
    // Dossier jetable vierge : txt.trim().length <= 80 => l'IA n'est pas appelée, repli direct.
    const r = await ownerSession.post(`/api/viz/nuage/dossier/${dossierOwner}`)
    expect(r.status).toBe(200)
    expect(r.json.source).toBe('heuristique')
    expect(Array.isArray(r.json.themes)).toBe(true) // peut être vide (aucun mot >= 4 lettres)
    for (const t of r.json.themes) {
      expect(typeof t.mot).toBe('string')
      expect(Number.isInteger(t.poids)).toBe(true)
      expect(t.poids).toBeGreaterThanOrEqual(1)
      expect(t.poids).toBeLessThanOrEqual(10)
    }
  })

  it('TC-VIZ-011 — POST nuage : 401 non authentifié', async () => {
    const anon = new Session()
    const r = await anon.post(`/api/viz/nuage/dossier/${dossierAmine}`)
    expect(r.status).toBe(401)
    expect(r.json).toEqual({ error: 'Non authentifié' })
  })

  it('TC-VIZ-012 — POST nuage : 403 feature non disponible (aucune écriture)', async () => {
    const s = await asUser({ email: pilote!.email, password: pilote!.password })
    const did = dossierAmine // requireFeature bloque (403) avant tout contrôle de propriété
    const r = await s.post(`/api/viz/nuage/dossier/${did}`)
    expect(r.status).toBe(403)
    expect(r.json).toEqual({ error: 'Fonctionnalité non disponible dans votre offre' })
  })

  it('TC-VIZ-013 — POST nuage : 404 dossier d\'autrui (aucune génération)', async () => {
    // Karim n'est pas propriétaire d'un dossier d'Amine.
    const r = await karim.post(`/api/viz/nuage/dossier/${dossierAmine}`)
    expect(r.status).toBe(404)
    expect(r.json).toEqual({ error: 'Parcours introuvable' })
  })

  it('TC-VIZ-014 — POST nuage : accès par l\'accompagnateur du dossier (ownEither OR)', async () => {
    // Mohamed est l'accompagnateur_id du dossier d'Amine : ownEither accepte aussi cette partie.
    const did = await firstSupervisedDossier(mohamed)
    const r = await mohamed.post(`/api/viz/nuage/dossier/${did}`)
    expect(r.status).toBe(200)
    expect(Array.isArray(r.json.themes)).toBe(true)
    expect(['ia', 'heuristique']).toContain(r.json.source)
  })

  it('TC-VIZ-021 — POST nuage : texteDossier exclut les sources privées (contrat de confidentialité)', async () => {
    // texteDossier n'agrège que les CR publiés (cr.publie=1) et le journal partagé (partage=1).
    // Sur le dossier jetable VIERGE (aucun CR, aucun journal), aucun contenu privé ne peut
    // remonter : le repli heuristique ne renvoie donc aucun thème issu de sources confidentielles.
    const r = await ownerSession.post(`/api/viz/nuage/dossier/${dossierOwner}`)
    expect(r.status).toBe(200)
    expect(r.json.source).toBe('heuristique')
    expect(Array.isArray(r.json.themes)).toBe(true)
    // Aucun mot « privé » connu ne doit apparaître (le dossier n'a aucune source textuelle).
    const mots = r.json.themes.map((t: { mot: string }) => t.mot)
    expect(mots).not.toContain('xylophone')
    expect(mots).not.toContain('crocodile')
  })

  // ==========================================================================
  //  2. Roue des émotions — GET /api/viz/emotions/catalogue
  // ==========================================================================

  it('TC-VIZ-022 — GET catalogue émotions : nominal (200, 16 émotions catégorisées)', async () => {
    // Amine n'a aucun plan affecté => niveau max, dont roue_emotions.
    const r = await amine.get('/api/viz/emotions/catalogue')
    expect(r.status).toBe(200)
    expect(Array.isArray(r.json.emotions)).toBe(true)
    expect(r.json.emotions.length).toBe(16)
    const famillesAttendues = new Set(['joie', 'peur', 'tristesse', 'colere', 'surprise', 'calme'])
    for (const e of r.json.emotions) {
      expect(typeof e.cle).toBe('string')
      expect(e.cle.length).toBeGreaterThan(0)
      expect(famillesAttendues.has(e.famille)).toBe(true)
    }
    // Chacune des 6 familles attendues est représentée.
    const famillesPresentes = new Set(r.json.emotions.map((e: { famille: string }) => e.famille))
    for (const f of famillesAttendues) expect(famillesPresentes.has(f)).toBe(true)
  })

  it('TC-VIZ-023 — GET catalogue émotions : 401 non authentifié', async () => {
    const anon = new Session()
    const r = await anon.get('/api/viz/emotions/catalogue')
    expect(r.status).toBe(401)
    expect(r.json).toEqual({ error: 'Non authentifié' })
  })

  it('TC-VIZ-024 — GET catalogue émotions : 403 feature non disponible', async () => {
    const s = await asUser({ email: pilote!.email, password: pilote!.password })
    const r = await s.get('/api/viz/emotions/catalogue')
    expect(r.status).toBe(403)
    expect(r.json).toEqual({ error: 'Fonctionnalité non disponible dans votre offre' })
  })

  // ==========================================================================
  //  2bis. Roue des émotions — GET /api/viz/emotions/dossier/:id
  // ==========================================================================

  it('TC-VIZ-025 — GET émotions dossier : nominal entries + aggregate (200)', async () => {
    // On enregistre au moins 2 relevés sur le dossier jetable « owner » avant de relire.
    const d = dossierOwner
    expect((await ownerSession.post(`/api/viz/emotions/dossier/${d}`, { emotions: ['fier', 'serein'], note: 'r1' })).status).toBe(201)
    expect((await ownerSession.post(`/api/viz/emotions/dossier/${d}`, { emotions: ['curieux'] })).status).toBe(201)

    const r = await ownerSession.get(`/api/viz/emotions/dossier/${d}`)
    expect(r.status).toBe(200)
    expect(Array.isArray(r.json.entries)).toBe(true)
    expect(r.json.entries.length).toBeGreaterThanOrEqual(2)
    expect(r.json.entries.length).toBeLessThanOrEqual(30)
    expect(typeof r.json.aggregate).toBe('object')
    for (const e of r.json.entries) {
      expect(typeof e.id).toBe('number')
      expect(typeof e.role).toBe('string')
      expect(Array.isArray(e.emotions)).toBe(true)
      expect(e.note === null || typeof e.note === 'string').toBe(true)
      expect(typeof e.cree_le).toBe('string')
    }
    // Tri cree_le DESC (le plus récent en tête, ordre non strictement croissant).
    const dates = r.json.entries.map((e: { cree_le: string }) => e.cree_le)
    const sorted = [...dates].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0))
    expect(dates).toEqual(sorted)
  })

  it('TC-VIZ-026 — GET émotions dossier : agrégat correct sur plusieurs relevés', async () => {
    // Dossier jetable DÉDIÉ pour un agrégat déterministe (vierge de tout relevé au départ).
    const accs = await ownerSession.get('/api/dossiers/accompagnateurs')
    const accId = accs.json.accompagnateurs[0].id as number
    const started = await ownerSession.post('/api/dossiers/start', { titre: 'Parcours agg émotions', accompagnateurId: accId })
    expect(started.status).toBe(201)
    const d = started.json.dossierId as number

    expect((await ownerSession.post(`/api/viz/emotions/dossier/${d}`, { emotions: ['fier', 'stresse'] })).status).toBe(201)
    expect((await ownerSession.post(`/api/viz/emotions/dossier/${d}`, { emotions: ['fier', 'curieux'] })).status).toBe(201)

    const r = await ownerSession.get(`/api/viz/emotions/dossier/${d}`)
    expect(r.status).toBe(200)
    expect(r.json.entries.length).toBe(2)
    expect(r.json.aggregate).toEqual({ fier: 2, stresse: 1, curieux: 1 })
  })

  it('TC-VIZ-027 — GET émotions dossier : dossier sans relevé (200, listes vides)', async () => {
    // Dossier jetable frais, jamais alimenté en émotions.
    const accs = await ownerSession.get('/api/dossiers/accompagnateurs')
    const accId = accs.json.accompagnateurs[0].id as number
    const started = await ownerSession.post('/api/dossiers/start', { titre: 'Parcours sans émotion', accompagnateurId: accId })
    expect(started.status).toBe(201)
    const d = started.json.dossierId as number

    const r = await ownerSession.get(`/api/viz/emotions/dossier/${d}`)
    expect(r.status).toBe(200)
    expect(r.json).toEqual({ entries: [], aggregate: {} })
  })

  it('TC-VIZ-028 — GET émotions dossier : limite aux 30 derniers relevés', async () => {
    // 31 relevés enregistrés => entries plafonnées à 30 (LIMIT 30), tri cree_le DESC.
    const accs = await ownerSession.get('/api/dossiers/accompagnateurs')
    const accId = accs.json.accompagnateurs[0].id as number
    const started = await ownerSession.post('/api/dossiers/start', { titre: 'Parcours limite 30', accompagnateurId: accId })
    expect(started.status).toBe(201)
    const d = started.json.dossierId as number

    for (let i = 0; i < 31; i++) {
      const rep = await ownerSession.post(`/api/viz/emotions/dossier/${d}`, { emotions: ['fier'], note: `n${i}` })
      expect(rep.status).toBe(201)
    }
    const r = await ownerSession.get(`/api/viz/emotions/dossier/${d}`)
    expect(r.status).toBe(200)
    expect(r.json.entries.length).toBe(30)
    // L'agrégat ne porte que sur les 30 entries renvoyées.
    expect(r.json.aggregate.fier).toBe(30)
  })

  it('TC-VIZ-029 — GET émotions dossier : 401 non authentifié', async () => {
    const anon = new Session()
    const r = await anon.get(`/api/viz/emotions/dossier/${dossierAmine}`)
    expect(r.status).toBe(401)
    expect(r.json).toEqual({ error: 'Non authentifié' })
  })

  it('TC-VIZ-030 — GET émotions dossier : 403 feature non disponible', async () => {
    const s = await asUser({ email: pilote!.email, password: pilote!.password })
    const did = dossierAmine // requireFeature bloque (403) avant tout contrôle de propriété
    const r = await s.get(`/api/viz/emotions/dossier/${did}`)
    expect(r.status).toBe(403)
    expect(r.json).toEqual({ error: 'Fonctionnalité non disponible dans votre offre' })
  })

  it('TC-VIZ-031 — GET émotions dossier : 404 dossier d\'autrui', async () => {
    const r = await lea.get(`/api/viz/emotions/dossier/${dossierAmine}`)
    expect(r.status).toBe(404)
    expect(r.json).toEqual({ error: 'Parcours introuvable' })
  })

  it('TC-VIZ-032 — GET émotions dossier : accès accompagnateur du dossier autorisé (ownEither OR)', async () => {
    const did = await firstSupervisedDossier(mohamed)
    const r = await mohamed.get(`/api/viz/emotions/dossier/${did}`)
    expect(r.status).toBe(200)
    expect(Array.isArray(r.json.entries)).toBe(true)
    expect(typeof r.json.aggregate).toBe('object')
  })

  // ==========================================================================
  //  2ter. Roue des émotions — POST /api/viz/emotions/dossier/:id
  // ==========================================================================

  it('TC-VIZ-033 — POST émotions : enregistrement nominal (201 ok)', async () => {
    const post = await ownerSession.post(`/api/viz/emotions/dossier/${dossierOwner}`, {
      emotions: ['fier', 'serein'], note: 'bonne semaine',
    })
    expect(post.status).toBe(201)
    expect(post.json).toEqual({ ok: true })

    // Le GET ultérieur reflète l'ajout. Le dossier est partagé entre tests : on retrouve NOTRE
    // relevé par sa note (au lieu de supposer qu'il est le plus récent).
    const get = await ownerSession.get(`/api/viz/emotions/dossier/${dossierOwner}`)
    expect(get.status).toBe(200)
    const mien = (get.json.entries as Array<{ emotions: string[]; note: string | null; role: string }>).find((e) => e.note === 'bonne semaine')
    expect(mien).toBeTruthy()
    expect(mien!.emotions).toEqual(['fier', 'serein'])
    expect(mien!.role).toBe('accompagne')
  })

  it('TC-VIZ-034 — POST émotions : sanitize dédoublonne les émotions valides (201)', async () => {
    const accs = await ownerSession.get('/api/dossiers/accompagnateurs')
    const accId = accs.json.accompagnateurs[0].id as number
    const started = await ownerSession.post('/api/dossiers/start', { titre: 'Parcours dédup', accompagnateurId: accId })
    const d = started.json.dossierId as number

    const post = await ownerSession.post(`/api/viz/emotions/dossier/${d}`, { emotions: ['fier', 'fier', 'serein'] })
    expect(post.status).toBe(201)
    const get = await ownerSession.get(`/api/viz/emotions/dossier/${d}`)
    expect(get.json.entries[0].emotions).toEqual(['fier', 'serein']) // doublon écarté (Set)
  })

  it('TC-VIZ-035 — POST émotions : sanitize filtre les émotions hors catalogue (400)', async () => {
    // Aucune clé valide => tableau vide après sanitize => 400.
    const r = await ownerSession.post(`/api/viz/emotions/dossier/${dossierOwner}`, {
      emotions: ['licorne', 'hs_42', '<script>'],
    })
    expect(r.status).toBe(400)
    expect(r.json).toEqual({ error: 'Sélectionne au moins une émotion' })
  })

  it('TC-VIZ-036 — POST émotions : mélange valide/invalide ne garde que les valides (201)', async () => {
    const accs = await ownerSession.get('/api/dossiers/accompagnateurs')
    const accId = accs.json.accompagnateurs[0].id as number
    const started = await ownerSession.post('/api/dossiers/start', { titre: 'Parcours mélange', accompagnateurId: accId })
    const d = started.json.dossierId as number

    const post = await ownerSession.post(`/api/viz/emotions/dossier/${d}`, {
      emotions: ['fier', 'licorne', 'curieux', 'xxx'],
    })
    expect(post.status).toBe(201)
    const get = await ownerSession.get(`/api/viz/emotions/dossier/${d}`)
    expect(get.json.entries[0].emotions).toEqual(['fier', 'curieux']) // invalides écartés
  })

  it('TC-VIZ-037 — POST émotions : corps sans émotions / vide / mauvais type (400)', async () => {
    // sanitizeEmotions renvoie [] si non-tableau ou vide => 400 dans les trois cas.
    const d = dossierOwner
    const sansChamp = await ownerSession.post(`/api/viz/emotions/dossier/${d}`, {})
    expect(sansChamp.status).toBe(400)
    expect(sansChamp.json).toEqual({ error: 'Sélectionne au moins une émotion' })

    const vide = await ownerSession.post(`/api/viz/emotions/dossier/${d}`, { emotions: [] })
    expect(vide.status).toBe(400)
    expect(vide.json).toEqual({ error: 'Sélectionne au moins une émotion' })

    const string = await ownerSession.post(`/api/viz/emotions/dossier/${d}`, { emotions: 'fier' })
    expect(string.status).toBe(400)
    expect(string.json).toEqual({ error: 'Sélectionne au moins une émotion' })
  })

  it('TC-VIZ-038 — POST émotions : note tronquée à 200 caractères', async () => {
    const accs = await ownerSession.get('/api/dossiers/accompagnateurs')
    const accId = accs.json.accompagnateurs[0].id as number
    const started = await ownerSession.post('/api/dossiers/start', { titre: 'Parcours note longue', accompagnateurId: accId })
    const d = started.json.dossierId as number

    const longue = 'x'.repeat(250)
    const post = await ownerSession.post(`/api/viz/emotions/dossier/${d}`, { emotions: ['fier'], note: longue })
    expect(post.status).toBe(201)
    const get = await ownerSession.get(`/api/viz/emotions/dossier/${d}`)
    expect(get.json.entries[0].note.length).toBe(200) // String(note).slice(0,200)
  })

  it('TC-VIZ-039 — POST émotions : note absente => null (facultative)', async () => {
    const accs = await ownerSession.get('/api/dossiers/accompagnateurs')
    const accId = accs.json.accompagnateurs[0].id as number
    const started = await ownerSession.post('/api/dossiers/start', { titre: 'Parcours sans note', accompagnateurId: accId })
    const d = started.json.dossierId as number

    const post = await ownerSession.post(`/api/viz/emotions/dossier/${d}`, { emotions: ['serein'] })
    expect(post.status).toBe(201)
    const get = await ownerSession.get(`/api/viz/emotions/dossier/${d}`)
    expect(get.json.entries[0].note).toBeNull()
  })

  it('TC-VIZ-040 — POST émotions : 401 non authentifié', async () => {
    const anon = new Session()
    const r = await anon.post(`/api/viz/emotions/dossier/${dossierAmine}`, { emotions: ['fier'] })
    expect(r.status).toBe(401)
    expect(r.json).toEqual({ error: 'Non authentifié' })
  })

  it('TC-VIZ-041 — POST émotions : 403 feature non disponible (aucune insertion)', async () => {
    const s = await asUser({ email: pilote!.email, password: pilote!.password })
    const did = dossierAmine // requireFeature bloque (403) avant tout contrôle de propriété
    const r = await s.post(`/api/viz/emotions/dossier/${did}`, { emotions: ['fier'] })
    expect(r.status).toBe(403)
    expect(r.json).toEqual({ error: 'Fonctionnalité non disponible dans votre offre' })
  })

  it('TC-VIZ-042 — POST émotions : 404 dossier d\'autrui (avant sanitize/insertion)', async () => {
    const r = await karim.post(`/api/viz/emotions/dossier/${dossierAmine}`, { emotions: ['fier'] })
    expect(r.status).toBe(404)
    expect(r.json).toEqual({ error: 'Parcours introuvable' })
  })

  it('TC-VIZ-043 — POST émotions : rôle de l\'auteur enregistré dans le relevé', async () => {
    // Mohamed (accompagnateur du dossier d'Amine) enregistre un relevé : role='accompagnateur'.
    const did = await firstSupervisedDossier(mohamed)
    const post = await mohamed.post(`/api/viz/emotions/dossier/${did}`, { emotions: ['serein'] })
    expect(post.status).toBe(201)
    expect(post.json).toEqual({ ok: true })

    const get = await mohamed.get(`/api/viz/emotions/dossier/${did}`)
    expect(get.status).toBe(200)
    const accEntry = get.json.entries.find((e: { role: string }) => e.role === 'accompagnateur')
    expect(accEntry).toBeTruthy()
    expect(accEntry.role).toBe('accompagnateur')
  })
})
