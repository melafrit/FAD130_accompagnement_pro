import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Session, asUser, DEMO } from '../helpers/api'
import { createTestUser, deleteTestUser, type TestUser } from '../helpers/fixtures'

// =============================================================================
// Domaine « cr » — Comptes rendus d'entretien (app/api/src/cr.ts + compteRendu.ts)
//
// Stratégie d'isolation : on ne touche JAMAIS aux dossiers de démo (vitrine
// Mohamed/Amine D1). On fabrique un bac à sable jetable :
//   - 1 accompagnateur jetable (propriétaire du dossier sous test)
//   - 1 accompagné jetable qui démarre un parcours en choisissant cet
//     accompagnateur (POST /api/dossiers/start) → dossier + lien créés.
//   - L'accompagnateur ouvre une session d'entretien (POST /api/entretien/sessions)
//     et y saisit des réponses par phase (POST /api/entretien/sessions/:id/reponses).
// On peut alors générer / éditer / publier / discuter librement sur CETTE session.
//
// Pour les scénarios « ressource d'autrui » (404), on s'appuie sur :
//   - DEMO.camille (autre accompagnateur, non propriétaire du dossier jetable)
//   - 1 second accompagné jetable (non rattaché à la session du premier)
//
// Tous les comptes jetables sont supprimés en afterAll (RGPD admin, en cascade).
// Endpoints IA (POST /generer) : on vérifie le CONTRAT (statut/forme/non-vacuité/
// persistance), jamais le texte exact. La stack de test tourne sans clé IA → repli
// déterministe (les 6 sections sont présentes).
// =============================================================================

interface Sandbox {
  acc: TestUser // accompagnateur propriétaire
  acce: TestUser // accompagné rattaché
  dossierId: number
  sessionId: number
}

let admin: Session
let accSess: Session // session connectée de l'accompagnateur jetable
let acceSess: Session // session connectée de l'accompagné jetable
let sandbox: Sandbox
let other: TestUser // accompagné jetable non rattaché (pour les 404 d'accès)

/** Saisit des réponses par phase pour que le CR ait du contenu non vide (et un plan d'action). */
async function seedReponses(s: Session, sessionId: number) {
  const phases: Array<[number, string]> = [
    [0, 'Contexte initial de la personne accompagnée.'],
    [1, 'Demande exprimée : clarifier un projet professionnel.'],
    [2, 'Points clés exprimés pendant l\'entretien.'],
    [3, 'Ce qui a émergé : un axe de travail sur la confiance.'],
    [4, 'Contacter un mentor avant la fin du mois.'],
    [5, 'Propositions pour la suite de l\'accompagnement.'],
  ]
  for (const [phase, texte] of phases) {
    const r = await s.post(`/api/entretien/sessions/${sessionId}/reponses`, { phase: String(phase), texte })
    expect(r.status).toBe(200)
  }
}

/**
 * Construit un bac à sable complet (accompagnateur + accompagné + dossier + session).
 * Le dossier appartient à l'accompagnateur jetable ; la session a des réponses par phase.
 */
async function buildSandbox(tag: string): Promise<Sandbox> {
  const acc = await createTestUser(admin, 'accompagnateur', tag + '-acc')
  const acce = await createTestUser(admin, 'accompagne', tag + '-acce')
  const as = await asUser({ email: acc.email, password: acc.password })
  const aes = await asUser({ email: acce.email, password: acce.password })
  // L'accompagné démarre un parcours en choisissant l'accompagnateur jetable.
  const start = await aes.post('/api/dossiers/start', { titre: `Parcours test ${tag}`, accompagnateurId: acc.id })
  expect(start.status).toBe(201)
  const dossierId = Number(start.json.dossierId)
  // L'accompagnateur ouvre une session d'entretien sur ce dossier et y saisit des réponses.
  const sess = await as.post('/api/entretien/sessions', { dossierId })
  expect(sess.status).toBe(200)
  const sessionId = Number(sess.json.sessionId)
  await seedReponses(as, sessionId)
  accSess = as
  acceSess = aes
  return { acc, acce, dossierId, sessionId }
}

/** Génère une version de CR et renvoie son corps {id, version, ...}. */
async function generer(s: Session, sessionId: number) {
  const r = await s.post('/api/cr/generer', { sessionId })
  expect(r.status).toBe(201)
  return r.json as { id: number; version: number; contenu_html: string; source: string; publie: number }
}

/** Compte les actions du plan d'action d'un dossier (via le détail accompagnateur). */
async function countActions(s: Session, dossierId: number): Promise<number> {
  const r = await s.get(`/api/dossiers/${dossierId}`)
  expect(r.status).toBe(200)
  return (r.json.actions || []).length
}

beforeAll(async () => {
  admin = await asUser(DEMO.admin)
  sandbox = await buildSandbox('cr')
  other = await createTestUser(admin, 'accompagne', 'cr-other')
}, 120_000)

afterAll(async () => {
  // Nettoyage : suppression RGPD en cascade des comptes jetables (dossiers, sessions,
  // CR, notes, messages, notifications associés sont supprimés avec l'utilisateur).
  if (sandbox?.acc) await deleteTestUser(admin, sandbox.acc)
  if (sandbox?.acce) await deleteTestUser(admin, sandbox.acce)
  if (other) await deleteTestUser(admin, other)
})

// ---------------------------------------------------------------------------
// POST /api/cr/generer
// ---------------------------------------------------------------------------
describe('POST /api/cr/generer — génération du compte rendu', () => {
  it('TC-CR-001 — générer le CR : 201 + forme (id, version:1, contenu_html, source:ia, publie:0)', async () => {
    // Bac à sable dédié pour garantir « aucun CR encore généré ».
    const sb = await buildSandbox('cr-gen1')
    const s = await asUser({ email: sb.acc.email, password: sb.acc.password })
    const r = await s.post('/api/cr/generer', { sessionId: sb.sessionId })
    expect(r.status).toBe(201)
    expect(typeof r.json.id).toBe('number')
    expect(r.json.version).toBe(1)
    expect(typeof r.json.contenu_html).toBe('string')
    expect(r.json.contenu_html.length).toBeGreaterThan(0)
    expect(r.json.source).toBe('ia')
    expect(r.json.publie).toBe(0)
    await deleteTestUser(admin, sb.acc)
    await deleteTestUser(admin, sb.acce)
  })

  it('TC-CR-002 — régénérer incrémente la version et conserve l\'historique (v1 + v2)', async () => {
    const sb = await buildSandbox('cr-gen2')
    const s = await asUser({ email: sb.acc.email, password: sb.acc.password })
    const v1 = await generer(s, sb.sessionId)
    expect(v1.version).toBe(1)
    const v2 = await generer(s, sb.sessionId)
    expect(v2.version).toBe(2)
    expect(v2.source).toBe('ia')
    expect(v2.publie).toBe(0)
    // L'historique (côté accompagnateur) contient les 2 versions, triées DESC.
    const etat = await s.get(`/api/cr/session/${sb.sessionId}`)
    expect(etat.status).toBe(200)
    const versions = etat.json.versions as Array<{ version: number }>
    expect(versions.length).toBeGreaterThanOrEqual(2)
    expect(versions[0].version).toBe(2)
    expect(versions.some((v) => v.version === 1)).toBe(true)
    await deleteTestUser(admin, sb.acc)
    await deleteTestUser(admin, sb.acce)
  })

  it('TC-CR-003 — le plan d\'action n\'est alimenté qu\'à la 1re génération (pas de doublon)', async () => {
    const sb = await buildSandbox('cr-plan')
    const s = await asUser({ email: sb.acc.email, password: sb.acc.password })
    const before = await countActions(s, sb.dossierId)
    await generer(s, sb.sessionId) // 1re génération → insère l'étape de phase 4
    const after1 = await countActions(s, sb.dossierId)
    expect(after1).toBe(before + 1) // une seule étape de plan (phase 4) non vide
    await generer(s, sb.sessionId) // régénération → AUCUNE insertion
    const after2 = await countActions(s, sb.dossierId)
    expect(after2).toBe(after1)
    await deleteTestUser(admin, sb.acc)
    await deleteTestUser(admin, sb.acce)
  })

  it('TC-CR-004 — repli déterministe sans clé IA : 201 + 6 sections présentes', async () => {
    // La stack de test tourne sans ANTHROPIC_API_KEY → contentToHtml du repli.
    const sb = await buildSandbox('cr-repli')
    const s = await asUser({ email: sb.acc.email, password: sb.acc.password })
    const cr = await generer(s, sb.sessionId)
    const html = cr.contenu_html
    expect(html).toContain('Contexte et demande')
    expect(html).toContain('Points clés')
    expect(html).toContain('émergé')
    expect(html).toContain('Plan d')
    expect(html).toContain('Propositions pour la suite')
    expect(html).toContain('vigilance')
    await deleteTestUser(admin, sb.acc)
    await deleteTestUser(admin, sb.acce)
  })

  it('TC-CR-005 — générer : 401 sans cookie', async () => {
    const s = new Session()
    const r = await s.post('/api/cr/generer', { sessionId: 1 })
    expect(r.status).toBe(401)
    expect(r.json.error).toBe('Non authentifié')
  })

  it('TC-CR-006 — générer : 403 rôle accompagné', async () => {
    const s = await asUser(DEMO.amine)
    const r = await s.post('/api/cr/generer', { sessionId: sandbox.sessionId })
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('Accès refusé')
  })

  it('TC-CR-007 — générer : 403 rôle admin', async () => {
    const r = await admin.post('/api/cr/generer', { sessionId: sandbox.sessionId })
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('Accès refusé')
  })

  it('TC-CR-008 — générer : 404 session d\'un autre accompagnateur', async () => {
    const camille = await asUser(DEMO.camille)
    const r = await camille.post('/api/cr/generer', { sessionId: sandbox.sessionId })
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Session introuvable')
  })

  it('TC-CR-009 — générer : 404 sessionId inexistant / manquant / non numérique', async () => {
    const inexistant = await accSess.post('/api/cr/generer', { sessionId: 999999 })
    expect(inexistant.status).toBe(404)
    expect(inexistant.json.error).toBe('Session introuvable')
    const manquant = await accSess.post('/api/cr/generer', {})
    expect(manquant.status).toBe(404)
    expect(manquant.json.error).toBe('Session introuvable')
    const nonNum = await accSess.post('/api/cr/generer', { sessionId: 'abc' })
    expect(nonNum.status).toBe(404)
    expect(nonNum.json.error).toBe('Session introuvable')
  })
})

// ---------------------------------------------------------------------------
// GET /api/cr/session/:sid  (état du CR)
// ---------------------------------------------------------------------------
describe('GET /api/cr/session/:sid — état du compte rendu', () => {
  it('TC-CR-010 — accompagnateur : version courante + historique trié DESC', async () => {
    const sb = await buildSandbox('cr-etat-acc')
    const s = await asUser({ email: sb.acc.email, password: sb.acc.password })
    await generer(s, sb.sessionId)
    await generer(s, sb.sessionId)
    const r = await s.get(`/api/cr/session/${sb.sessionId}`)
    expect(r.status).toBe(200)
    expect(r.json.role).toBe('accompagnateur')
    expect(r.json.cr).toMatchObject({ source: expect.any(String), publie: expect.any(Number) })
    expect(typeof r.json.cr.id).toBe('number')
    expect(typeof r.json.cr.version).toBe('number')
    const versions = r.json.versions as Array<{ id: number; version: number; source: string; genere_le: string; publie: number }>
    expect(versions.length).toBeGreaterThanOrEqual(2)
    expect(versions[0].version).toBeGreaterThanOrEqual(versions[1].version)
    expect(versions[0]).toHaveProperty('source')
    expect(versions[0]).toHaveProperty('genere_le')
    await deleteTestUser(admin, sb.acc)
    await deleteTestUser(admin, sb.acce)
  })

  it('TC-CR-011 — accompagné : voit uniquement la version publiée (versions vide)', async () => {
    const sb = await buildSandbox('cr-etat-pub')
    const s = await asUser({ email: sb.acc.email, password: sb.acc.password })
    const cr = await generer(s, sb.sessionId)
    expect((await s.post(`/api/cr/version/${cr.id}/publier`)).status).toBe(200)
    const acce = await asUser({ email: sb.acce.email, password: sb.acce.password })
    const r = await acce.get(`/api/cr/session/${sb.sessionId}`)
    expect(r.status).toBe(200)
    expect(r.json.role).toBe('accompagne')
    expect(r.json.cr).not.toBeNull()
    expect(r.json.cr.publie).toBe(1)
    expect(typeof r.json.cr.contenu_html).toBe('string')
    expect(r.json.versions).toEqual([])
    await deleteTestUser(admin, sb.acc)
    await deleteTestUser(admin, sb.acce)
  })

  it('TC-CR-012 — accompagné : brouillon non publié → cr null (invisible avant publication)', async () => {
    const sb = await buildSandbox('cr-etat-brouillon')
    const s = await asUser({ email: sb.acc.email, password: sb.acc.password })
    await generer(s, sb.sessionId) // généré mais NON publié
    const acce = await asUser({ email: sb.acce.email, password: sb.acce.password })
    const r = await acce.get(`/api/cr/session/${sb.sessionId}`)
    expect(r.status).toBe(200)
    expect(r.json.role).toBe('accompagne')
    expect(r.json.cr).toBeNull()
    expect(r.json.versions).toEqual([])
    await deleteTestUser(admin, sb.acc)
    await deleteTestUser(admin, sb.acce)
  })

  it('TC-CR-013 — état du CR : 401 sans cookie', async () => {
    const s = new Session()
    const r = await s.get('/api/cr/session/1')
    expect(r.status).toBe(401)
    expect(r.json.error).toBe('Non authentifié')
  })

  it('TC-CR-014 — état du CR : 404 accompagné non rattaché à la session', async () => {
    // « other » est un accompagné jetable sans aucun lien avec la session du sandbox.
    const o = await asUser({ email: other.email, password: other.password })
    const r = await o.get(`/api/cr/session/${sandbox.sessionId}`)
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Session introuvable')
  })

  it('TC-CR-015 — état du CR : 404 accompagnateur non propriétaire', async () => {
    const camille = await asUser(DEMO.camille)
    const r = await camille.get(`/api/cr/session/${sandbox.sessionId}`)
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Session introuvable')
  })

  it('TC-CR-016 — état du CR : 404 sid inexistant / non numérique', async () => {
    const inexistant = await accSess.get('/api/cr/session/999999')
    expect(inexistant.status).toBe(404)
    expect(inexistant.json.error).toBe('Session introuvable')
    const nonNum = await accSess.get('/api/cr/session/abc')
    expect(nonNum.status).toBe(404)
    expect(nonNum.json.error).toBe('Session introuvable')
  })
})

// ---------------------------------------------------------------------------
// GET /api/cr/version/:id  (lecture d'une version d'historique)
// ---------------------------------------------------------------------------
describe('GET /api/cr/version/:id — lecture d\'une version', () => {
  it('TC-CR-017 — lire une version d\'historique : 200 + forme complète', async () => {
    const sb = await buildSandbox('cr-ver-lire')
    const s = await asUser({ email: sb.acc.email, password: sb.acc.password })
    const cr = await generer(s, sb.sessionId)
    const r = await s.get(`/api/cr/version/${cr.id}`)
    expect(r.status).toBe(200)
    expect(r.json.cr).toMatchObject({
      id: cr.id,
      session_id: sb.sessionId,
      version: 1,
      source: expect.any(String),
      publie: expect.any(Number),
    })
    expect(typeof r.json.cr.contenu_html).toBe('string')
    expect(r.json.cr).toHaveProperty('genere_le')
    expect(r.json.cr).toHaveProperty('accompagnateur_id')
    await deleteTestUser(admin, sb.acc)
    await deleteTestUser(admin, sb.acce)
  })

  it('TC-CR-018 — lire une version : 401 sans cookie', async () => {
    const s = new Session()
    const r = await s.get('/api/cr/version/1')
    expect(r.status).toBe(401)
    expect(r.json.error).toBe('Non authentifié')
  })

  it('TC-CR-019 — lire une version : 403 rôle accompagné', async () => {
    const acce = await asUser({ email: sandbox.acce.email, password: sandbox.acce.password })
    const r = await acce.get('/api/cr/version/1')
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('Accès refusé')
  })

  it('TC-CR-020 — lire une version : 404 version d\'un autre accompagnateur', async () => {
    // On crée une version réelle dans le sandbox puis Camille tente de la lire.
    // Session dédiée au propriétaire du sandbox partagé (le global accSess a pu être réécrasé par un buildSandbox ultérieur).
    const cr = await generer(await asUser({ email: sandbox.acc.email, password: sandbox.acc.password }), sandbox.sessionId)
    const camille = await asUser(DEMO.camille)
    const r = await camille.get(`/api/cr/version/${cr.id}`)
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Compte rendu introuvable')
  })

  it('TC-CR-021 — lire une version : 404 id inexistant', async () => {
    const r = await accSess.get('/api/cr/version/999999')
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Compte rendu introuvable')
  })
})

// ---------------------------------------------------------------------------
// PATCH /api/cr/version/:id  (édition de la version courante)
// ---------------------------------------------------------------------------
describe('PATCH /api/cr/version/:id — édition de la version courante', () => {
  it('TC-CR-022 — éditer la version courante : 200 ok, source→edition, modif visible', async () => {
    const sb = await buildSandbox('cr-edit')
    const s = await asUser({ email: sb.acc.email, password: sb.acc.password })
    const cr = await generer(s, sb.sessionId)
    const nouveau = '<h2>Modifié</h2><p>texte édité</p>'
    const r = await s.patch(`/api/cr/version/${cr.id}`, { contenu_html: nouveau })
    expect(r.status).toBe(200)
    expect(r.json.ok).toBe(true)
    const relu = await s.get(`/api/cr/session/${sb.sessionId}`)
    expect(relu.json.cr.contenu_html).toBe(nouveau)
    expect(relu.json.cr.source).toBe('edition')
    await deleteTestUser(admin, sb.acc)
    await deleteTestUser(admin, sb.acce)
  })

  it('TC-CR-023 — éditer une version COURANTE publiée : reste publiée, modif visible côté accompagné', async () => {
    const sb = await buildSandbox('cr-edit-pub')
    const s = await asUser({ email: sb.acc.email, password: sb.acc.password })
    const cr = await generer(s, sb.sessionId)
    expect((await s.post(`/api/cr/version/${cr.id}/publier`)).status).toBe(200)
    const nouveau = '<p>correction post-publication</p>'
    const r = await s.patch(`/api/cr/version/${cr.id}`, { contenu_html: nouveau })
    expect(r.status).toBe(200)
    // Le statut publié n'est pas modifié.
    const etat = await s.get(`/api/cr/session/${sb.sessionId}`)
    expect(etat.json.cr.publie).toBe(1)
    // L'accompagné voit aussitôt le contenu mis à jour.
    const acce = await asUser({ email: sb.acce.email, password: sb.acce.password })
    const vue = await acce.get(`/api/cr/session/${sb.sessionId}`)
    expect(vue.json.cr.contenu_html).toBe(nouveau)
    expect(vue.json.cr.publie).toBe(1)
    await deleteTestUser(admin, sb.acc)
    await deleteTestUser(admin, sb.acce)
  })

  it('TC-CR-024 — éditer une version d\'historique (non courante) : 400 figée, contenu inchangé', async () => {
    const sb = await buildSandbox('cr-edit-hist')
    const s = await asUser({ email: sb.acc.email, password: sb.acc.password })
    const v1 = await generer(s, sb.sessionId)
    const v1Html = v1.contenu_html
    await generer(s, sb.sessionId) // v2 devient la version courante
    const r = await s.patch(`/api/cr/version/${v1.id}`, { contenu_html: '<p>tentative</p>' })
    expect(r.status).toBe(400)
    expect(r.json.error).toContain('Seule la version courante est modifiable')
    // Le contenu de v1 reste inchangé.
    const relu = await s.get(`/api/cr/version/${v1.id}`)
    expect(relu.json.cr.contenu_html).toBe(v1Html)
    await deleteTestUser(admin, sb.acc)
    await deleteTestUser(admin, sb.acce)
  })

  it('TC-CR-025 — éditer sans contenu_html : 200, enregistre chaîne vide (permissif)', async () => {
    const sb = await buildSandbox('cr-edit-vide')
    const s = await asUser({ email: sb.acc.email, password: sb.acc.password })
    const cr = await generer(s, sb.sessionId)
    const r = await s.patch(`/api/cr/version/${cr.id}`, {})
    expect(r.status).toBe(200)
    expect(r.json.ok).toBe(true)
    const relu = await s.get(`/api/cr/session/${sb.sessionId}`)
    expect(relu.json.cr.contenu_html).toBe('')
    await deleteTestUser(admin, sb.acc)
    await deleteTestUser(admin, sb.acce)
  })

  it('TC-CR-026 — éditer : 401 sans cookie', async () => {
    const s = new Session()
    const r = await s.patch('/api/cr/version/1', { contenu_html: 'x' })
    expect(r.status).toBe(401)
    expect(r.json.error).toBe('Non authentifié')
  })

  it('TC-CR-027 — éditer : 403 rôle accompagné', async () => {
    const acce = await asUser({ email: sandbox.acce.email, password: sandbox.acce.password })
    const r = await acce.patch('/api/cr/version/1', { contenu_html: 'piratage' })
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('Accès refusé')
  })

  it('TC-CR-028 — éditer : 404 version d\'un autre accompagnateur', async () => {
    // Session dédiée au propriétaire du sandbox partagé (le global accSess a pu être réécrasé par un buildSandbox ultérieur).
    const cr = await generer(await asUser({ email: sandbox.acc.email, password: sandbox.acc.password }), sandbox.sessionId)
    const camille = await asUser(DEMO.camille)
    const r = await camille.patch(`/api/cr/version/${cr.id}`, { contenu_html: 'x' })
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Compte rendu introuvable')
  })

  it('TC-CR-029 — éditer : 404 id inexistant', async () => {
    const r = await accSess.patch('/api/cr/version/999999', { contenu_html: 'x' })
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Compte rendu introuvable')
  })
})

// ---------------------------------------------------------------------------
// POST /api/cr/version/:id/publier
// ---------------------------------------------------------------------------
describe('POST /api/cr/version/:id/publier — publication', () => {
  it('TC-CR-030 — publier : 200, version visée publie=1, notif accompagné, dépublie les autres', async () => {
    const sb = await buildSandbox('cr-pub')
    const s = await asUser({ email: sb.acc.email, password: sb.acc.password })
    const cr = await generer(s, sb.sessionId)
    const r = await s.post(`/api/cr/version/${cr.id}/publier`)
    expect(r.status).toBe(200)
    expect(r.json.ok).toBe(true)
    // Côté accompagnateur : la version courante est publiée.
    const etat = await s.get(`/api/cr/session/${sb.sessionId}`)
    expect(etat.json.cr.publie).toBe(1)
    // Côté accompagné : la version publiée est désormais visible (preuve de notification implicite).
    const acce = await asUser({ email: sb.acce.email, password: sb.acce.password })
    const vue = await acce.get(`/api/cr/session/${sb.sessionId}`)
    expect(vue.json.cr).not.toBeNull()
    expect(vue.json.cr.publie).toBe(1)
    await deleteTestUser(admin, sb.acc)
    await deleteTestUser(admin, sb.acce)
  })

  it('TC-CR-031 — publier une autre version : exclusivité (v2 publiée, v1 dépubliée)', async () => {
    const sb = await buildSandbox('cr-pub-excl')
    const s = await asUser({ email: sb.acc.email, password: sb.acc.password })
    const v1 = await generer(s, sb.sessionId)
    const v2 = await generer(s, sb.sessionId)
    expect((await s.post(`/api/cr/version/${v1.id}/publier`)).status).toBe(200)
    expect((await s.post(`/api/cr/version/${v2.id}/publier`)).status).toBe(200)
    // v1 dépubliée, v2 publiée.
    const relV1 = await s.get(`/api/cr/version/${v1.id}`)
    expect(relV1.json.cr.publie).toBe(0)
    const relV2 = await s.get(`/api/cr/version/${v2.id}`)
    expect(relV2.json.cr.publie).toBe(1)
    // L'accompagné voit la version la plus haute publiée (v2).
    const acce = await asUser({ email: sb.acce.email, password: sb.acce.password })
    const vue = await acce.get(`/api/cr/session/${sb.sessionId}`)
    expect(vue.json.cr.version).toBe(v2.version)
    await deleteTestUser(admin, sb.acc)
    await deleteTestUser(admin, sb.acce)
  })

  it('TC-CR-032 — publier : 401 sans cookie', async () => {
    const s = new Session()
    const r = await s.post('/api/cr/version/1/publier')
    expect(r.status).toBe(401)
    expect(r.json.error).toBe('Non authentifié')
  })

  it('TC-CR-033 — publier : 403 rôle accompagné', async () => {
    const acce = await asUser({ email: sandbox.acce.email, password: sandbox.acce.password })
    const r = await acce.post('/api/cr/version/1/publier')
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('Accès refusé')
  })

  it('TC-CR-034 — publier : 404 version d\'un autre accompagnateur', async () => {
    // Session dédiée au propriétaire du sandbox partagé (le global accSess a pu être réécrasé par un buildSandbox ultérieur).
    const cr = await generer(await asUser({ email: sandbox.acc.email, password: sandbox.acc.password }), sandbox.sessionId)
    const camille = await asUser(DEMO.camille)
    const r = await camille.post(`/api/cr/version/${cr.id}/publier`)
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Compte rendu introuvable')
  })

  it('TC-CR-035 — publier : 404 id inexistant', async () => {
    const r = await accSess.post('/api/cr/version/999999/publier')
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Compte rendu introuvable')
  })
})

// ---------------------------------------------------------------------------
// GET /api/cr/mine  (accompagné)
// ---------------------------------------------------------------------------
describe('GET /api/cr/mine — comptes rendus publiés de l\'accompagné', () => {
  it('TC-CR-036 — nominal : 200 + forme, uniquement les CR publiés de l\'accompagné', async () => {
    const sb = await buildSandbox('cr-mine')
    const s = await asUser({ email: sb.acc.email, password: sb.acc.password })
    const cr = await generer(s, sb.sessionId)
    expect((await s.post(`/api/cr/version/${cr.id}/publier`)).status).toBe(200)
    const acce = await asUser({ email: sb.acce.email, password: sb.acce.password })
    const r = await acce.get('/api/cr/mine')
    expect(r.status).toBe(200)
    const list = r.json.comptesRendus as Array<Record<string, unknown>>
    expect(Array.isArray(list)).toBe(true)
    expect(list.length).toBeGreaterThanOrEqual(1)
    const item = list.find((c) => c.session_id === sb.sessionId)!
    expect(item).toBeDefined()
    expect(item).toHaveProperty('id')
    expect(item).toHaveProperty('genere_le')
    expect(item).toHaveProperty('publie_le')
    expect(item).toHaveProperty('entretien_date')
    expect(item).toHaveProperty('dossier_titre')
    await deleteTestUser(admin, sb.acc)
    await deleteTestUser(admin, sb.acce)
  })

  it('TC-CR-037 — exclut les brouillons non publiés (filtre publie=1)', async () => {
    const sb = await buildSandbox('cr-mine-filtre')
    const s = await asUser({ email: sb.acc.email, password: sb.acc.password })
    // Génère un CR mais ne le publie PAS.
    await generer(s, sb.sessionId)
    const acce = await asUser({ email: sb.acce.email, password: sb.acce.password })
    const r = await acce.get('/api/cr/mine')
    expect(r.status).toBe(200)
    const list = r.json.comptesRendus as Array<{ session_id: number }>
    expect(list.some((c) => c.session_id === sb.sessionId)).toBe(false)
    await deleteTestUser(admin, sb.acc)
    await deleteTestUser(admin, sb.acce)
  })

  it('TC-CR-038 — liste vide si aucun CR publié', async () => {
    // « other » est un accompagné jetable sans dossier ni CR.
    const o = await asUser({ email: other.email, password: other.password })
    const r = await o.get('/api/cr/mine')
    expect(r.status).toBe(200)
    expect(r.json.comptesRendus).toEqual([])
  })

  it('TC-CR-039 — mine : 401 sans cookie', async () => {
    const s = new Session()
    const r = await s.get('/api/cr/mine')
    expect(r.status).toBe(401)
    expect(r.json.error).toBe('Non authentifié')
  })

  it('TC-CR-040 — mine : 403 rôle accompagnateur', async () => {
    const r = await accSess.get('/api/cr/mine')
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('Accès refusé')
  })
})

// ---------------------------------------------------------------------------
// GET / POST /api/cr/session/:sid/messages  (discussion)
// ---------------------------------------------------------------------------
describe('GET /api/cr/session/:sid/messages — lecture de la discussion', () => {
  it('TC-CR-041 — accompagnateur : 200 + forme messages avec is_me', async () => {
    const sb = await buildSandbox('cr-msg-lire')
    const s = await asUser({ email: sb.acc.email, password: sb.acc.password })
    // Poste un message côté accompagnateur, puis relit.
    expect((await s.post(`/api/cr/session/${sb.sessionId}/messages`, { texte: 'Bonjour' })).status).toBe(201)
    const r = await s.get(`/api/cr/session/${sb.sessionId}/messages`)
    expect(r.status).toBe(200)
    const messages = r.json.messages as Array<Record<string, unknown>>
    expect(messages.length).toBeGreaterThanOrEqual(1)
    const m = messages[messages.length - 1]
    expect(m).toHaveProperty('id')
    expect(m).toHaveProperty('auteur_id')
    expect(m).toHaveProperty('texte')
    expect(m).toHaveProperty('cree_le')
    expect(m).toHaveProperty('auteur_prenom')
    expect(m).toHaveProperty('auteur_role')
    expect(m.is_me).toBe(true)
    await deleteTestUser(admin, sb.acc)
    await deleteTestUser(admin, sb.acce)
  })

  it('TC-CR-042 — accompagné : autorisé si CR publié, is_me correct', async () => {
    const sb = await buildSandbox('cr-msg-pub')
    const s = await asUser({ email: sb.acc.email, password: sb.acc.password })
    const cr = await generer(s, sb.sessionId)
    expect((await s.post(`/api/cr/version/${cr.id}/publier`)).status).toBe(200)
    const acce = await asUser({ email: sb.acce.email, password: sb.acce.password })
    expect((await acce.post(`/api/cr/session/${sb.sessionId}/messages`, { texte: 'Merci' })).status).toBe(201)
    const r = await acce.get(`/api/cr/session/${sb.sessionId}/messages`)
    expect(r.status).toBe(200)
    const mine = (r.json.messages as Array<{ texte: string; is_me: boolean }>).find((m) => m.texte === 'Merci')!
    expect(mine.is_me).toBe(true)
    await deleteTestUser(admin, sb.acc)
    await deleteTestUser(admin, sb.acce)
  })

  it('TC-CR-043 — accompagné : bloqué tant qu\'aucun CR publié → 404', async () => {
    const sb = await buildSandbox('cr-msg-bloque')
    const acce = await asUser({ email: sb.acce.email, password: sb.acce.password })
    const r = await acce.get(`/api/cr/session/${sb.sessionId}/messages`)
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Discussion indisponible')
    await deleteTestUser(admin, sb.acc)
    await deleteTestUser(admin, sb.acce)
  })

  it('TC-CR-044 — messages : 401 sans cookie', async () => {
    const s = new Session()
    const r = await s.get('/api/cr/session/1/messages')
    expect(r.status).toBe(401)
    expect(r.json.error).toBe('Non authentifié')
  })

  it('TC-CR-045 — messages : 404 utilisateur non rattaché à la session', async () => {
    const camille = await asUser(DEMO.camille)
    const r = await camille.get(`/api/cr/session/${sandbox.sessionId}/messages`)
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Discussion indisponible')
  })
})

describe('POST /api/cr/session/:sid/messages — poster un message', () => {
  it('TC-CR-046 — accompagnateur : 201 {id}, message relu, notif accompagné', async () => {
    const sb = await buildSandbox('cr-post-acc')
    const s = await asUser({ email: sb.acc.email, password: sb.acc.password })
    const r = await s.post(`/api/cr/session/${sb.sessionId}/messages`, { texte: 'Voici mon retour.' })
    expect(r.status).toBe(201)
    expect(typeof r.json.id).toBe('number')
    const relu = await s.get(`/api/cr/session/${sb.sessionId}/messages`)
    expect((relu.json.messages as Array<{ texte: string }>).some((m) => m.texte === 'Voici mon retour.')).toBe(true)
    await deleteTestUser(admin, sb.acc)
    await deleteTestUser(admin, sb.acce)
  })

  it('TC-CR-047 — accompagné (CR publié) : 201 {id}, notif destinée à l\'accompagnateur', async () => {
    const sb = await buildSandbox('cr-post-acce')
    const s = await asUser({ email: sb.acc.email, password: sb.acc.password })
    const cr = await generer(s, sb.sessionId)
    expect((await s.post(`/api/cr/version/${cr.id}/publier`)).status).toBe(200)
    const acce = await asUser({ email: sb.acce.email, password: sb.acce.password })
    const r = await acce.post(`/api/cr/session/${sb.sessionId}/messages`, { texte: 'J\'ai une question.' })
    expect(r.status).toBe(201)
    expect(typeof r.json.id).toBe('number')
    // L'accompagnateur relit et voit le message de l'accompagné.
    const relu = await s.get(`/api/cr/session/${sb.sessionId}/messages`)
    const m = (relu.json.messages as Array<{ texte: string; auteur_role: string }>).find((x) => x.texte === 'J\'ai une question.')!
    expect(m).toBeDefined()
    expect(m.auteur_role).toBe('accompagne')
    await deleteTestUser(admin, sb.acc)
    await deleteTestUser(admin, sb.acce)
  })

  it('TC-CR-048 — poster : 400 texte vide / espaces / champ absent', async () => {
    const sb = await buildSandbox('cr-post-vide')
    const s = await asUser({ email: sb.acc.email, password: sb.acc.password })
    const espaces = await s.post(`/api/cr/session/${sb.sessionId}/messages`, { texte: '   ' })
    expect(espaces.status).toBe(400)
    expect(espaces.json.error).toBe('Message vide')
    const absent = await s.post(`/api/cr/session/${sb.sessionId}/messages`, {})
    expect(absent.status).toBe(400)
    expect(absent.json.error).toBe('Message vide')
    await deleteTestUser(admin, sb.acc)
    await deleteTestUser(admin, sb.acce)
  })

  it('TC-CR-049 — accompagné bloqué si CR non publié (propriété vérifiée avant le texte) → 404', async () => {
    const sb = await buildSandbox('cr-post-bloque')
    const acce = await asUser({ email: sb.acce.email, password: sb.acce.password })
    const r = await acce.post(`/api/cr/session/${sb.sessionId}/messages`, { texte: 'test' })
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Discussion indisponible')
    await deleteTestUser(admin, sb.acc)
    await deleteTestUser(admin, sb.acce)
  })

  it('TC-CR-050 — poster : 401 sans cookie', async () => {
    const s = new Session()
    const r = await s.post('/api/cr/session/1/messages', { texte: 'x' })
    expect(r.status).toBe(401)
    expect(r.json.error).toBe('Non authentifié')
  })

  it('TC-CR-051 — poster : 404 session non rattachée (accompagnateur non propriétaire)', async () => {
    const camille = await asUser(DEMO.camille)
    const r = await camille.post(`/api/cr/session/${sandbox.sessionId}/messages`, { texte: 'x' })
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Discussion indisponible')
  })
})

// ---------------------------------------------------------------------------
// GET / PUT /api/cr/session/:sid/notes  (notes privées de l'accompagnateur)
// ---------------------------------------------------------------------------
describe('GET/PUT /api/cr/session/:sid/notes — notes privées de l\'accompagnateur', () => {
  it('TC-CR-052 — lire les notes : 200, vide si absente', async () => {
    const sb = await buildSandbox('cr-notes-vide')
    const s = await asUser({ email: sb.acc.email, password: sb.acc.password })
    const r = await s.get(`/api/cr/session/${sb.sessionId}/notes`)
    expect(r.status).toBe(200)
    expect(r.json.contenu_html).toBe('')
    expect(r.json.maj_le).toBeNull()
    await deleteTestUser(admin, sb.acc)
    await deleteTestUser(admin, sb.acce)
  })

  it('TC-CR-053 — notes : jamais accessibles par l\'accompagné (403 sur GET et PUT)', async () => {
    const acce = await asUser({ email: sandbox.acce.email, password: sandbox.acce.password })
    const get = await acce.get(`/api/cr/session/${sandbox.sessionId}/notes`)
    expect(get.status).toBe(403)
    expect(get.json.error).toBe('Accès refusé')
    const put = await acce.request('PUT', `/api/cr/session/${sandbox.sessionId}/notes`, { contenu_html: 'x' })
    expect(put.status).toBe(403)
    expect(put.json.error).toBe('Accès refusé')
  })

  it('TC-CR-054 — lire les notes : 404 accompagnateur non propriétaire', async () => {
    const camille = await asUser(DEMO.camille)
    const r = await camille.get(`/api/cr/session/${sandbox.sessionId}/notes`)
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Session introuvable')
  })

  it('TC-CR-055 — lire les notes : 401 sans cookie', async () => {
    const s = new Session()
    const r = await s.get('/api/cr/session/1/notes')
    expect(r.status).toBe(401)
    expect(r.json.error).toBe('Non authentifié')
  })

  it('TC-CR-056 — écrire les notes : création puis relecture (maj_le renseigné)', async () => {
    const sb = await buildSandbox('cr-notes-crea')
    const s = await asUser({ email: sb.acc.email, password: sb.acc.password })
    const contenu = '<p>Penser à explorer X</p>'
    const w = await s.request('PUT', `/api/cr/session/${sb.sessionId}/notes`, { contenu_html: contenu })
    expect(w.status).toBe(200)
    expect(w.json.ok).toBe(true)
    const r = await s.get(`/api/cr/session/${sb.sessionId}/notes`)
    expect(r.json.contenu_html).toBe(contenu)
    expect(r.json.maj_le).not.toBeNull()
    await deleteTestUser(admin, sb.acc)
    await deleteTestUser(admin, sb.acce)
  })

  it('TC-CR-057 — écrire les notes : mise à jour (upsert, une seule ligne, contenu remplacé)', async () => {
    const sb = await buildSandbox('cr-notes-upsert')
    const s = await asUser({ email: sb.acc.email, password: sb.acc.password })
    expect((await s.request('PUT', `/api/cr/session/${sb.sessionId}/notes`, { contenu_html: '<p>Première note</p>' })).status).toBe(200)
    const remplacant = '<p>Nouvelle note remplaçante</p>'
    expect((await s.request('PUT', `/api/cr/session/${sb.sessionId}/notes`, { contenu_html: remplacant })).status).toBe(200)
    const r = await s.get(`/api/cr/session/${sb.sessionId}/notes`)
    expect(r.json.contenu_html).toBe(remplacant)
    expect(r.json.maj_le).not.toBeNull()
    await deleteTestUser(admin, sb.acc)
    await deleteTestUser(admin, sb.acce)
  })

  it('TC-CR-058 — écrire les notes : contenu vide accepté (permissif)', async () => {
    const sb = await buildSandbox('cr-notes-vide2')
    const s = await asUser({ email: sb.acc.email, password: sb.acc.password })
    const w = await s.request('PUT', `/api/cr/session/${sb.sessionId}/notes`, {})
    expect(w.status).toBe(200)
    expect(w.json.ok).toBe(true)
    const r = await s.get(`/api/cr/session/${sb.sessionId}/notes`)
    expect(r.json.contenu_html).toBe('')
    await deleteTestUser(admin, sb.acc)
    await deleteTestUser(admin, sb.acce)
  })

  it('TC-CR-059 — écrire les notes : 404 accompagnateur non propriétaire', async () => {
    const camille = await asUser(DEMO.camille)
    const r = await camille.request('PUT', `/api/cr/session/${sandbox.sessionId}/notes`, { contenu_html: 'x' })
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Session introuvable')
  })

  it('TC-CR-060 — notes privées jamais exposées à l\'accompagné (ni session, ni mine)', async () => {
    const sb = await buildSandbox('cr-notes-confid')
    const s = await asUser({ email: sb.acc.email, password: sb.acc.password })
    const secret = 'NOTE_PRIVEE_CONFIDENTIELLE_XYZ'
    expect((await s.request('PUT', `/api/cr/session/${sb.sessionId}/notes`, { contenu_html: `<p>${secret}</p>` })).status).toBe(200)
    const cr = await generer(s, sb.sessionId)
    expect((await s.post(`/api/cr/version/${cr.id}/publier`)).status).toBe(200)
    const acce = await asUser({ email: sb.acce.email, password: sb.acce.password })
    const etat = await acce.get(`/api/cr/session/${sb.sessionId}`)
    expect(JSON.stringify(etat.json)).not.toContain(secret)
    const mine = await acce.get('/api/cr/mine')
    expect(JSON.stringify(mine.json)).not.toContain(secret)
    await deleteTestUser(admin, sb.acc)
    await deleteTestUser(admin, sb.acce)
  })
})
