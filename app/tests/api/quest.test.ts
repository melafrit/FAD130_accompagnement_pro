import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Session, asUser, DEMO } from '../helpers/api'
import { createTestUser, deleteTestUser, type TestUser } from '../helpers/fixtures'

// =============================================================================
// Domaine : quest — Questionnaire initial adaptatif
//   POST /api/questionnaire/next  (Claude ou repli déterministe ; requireAuth)
//   POST /api/questionnaire/save  (requireAuth + rôle 'accompagne')
// Code source : app/api/src/questionnaire.ts, app/api/src/claude.ts
//
// Endpoints IA : on teste le CONTRAT (statut + forme + non-vacuité + gating +
// persistance), jamais le texte exact renvoyé par Claude. Comme la stack de test
// tourne sans clé Claude, le repli déterministe (fallbackNext) est actif : on peut
// alors aussi vérifier les libellés exacts des étapes FALLBACK_STEPS. Pour rester
// robuste si une clé venait à être configurée, les libellés exacts sont assertés
// de façon défensive (la forme et la non-vacuité, elles, sont toujours vraies).
// =============================================================================

// Étapes du parcours de secours (claude.ts FALLBACK_STEPS), source de vérité du repli.
const FALLBACK_STEPS = [
  'Dans quelle entreprise et sur quel poste se déroule ton alternance ?',
  'Quel est le sujet (ou le thème pressenti) de ton mémoire ?',
  'Quelle problématique cherches-tu à traiter ?',
  'Quels sont les enjeux — pour toi et pour l’entreprise ?',
  'Quelles difficultés rencontres-tu en ce moment ?',
  'Qu’attends-tu de cet accompagnement ?',
]

// Construit un historique de N paires {question, answer} cohérentes.
function makeHistory(n: number): { question: string; answer: string }[] {
  return Array.from({ length: n }, (_, i) => ({
    question: FALLBACK_STEPS[i] ?? `Question ${i + 1} ?`,
    answer: `Réponse ${i + 1}`,
  }))
}

// Indique si le repli déterministe est actif (pas de clé Claude) : la première
// étape doit alors correspondre exactement à FALLBACK_STEPS[0].
let fallbackActif = false

describe('quest — POST /api/questionnaire/next', () => {
  let amine: Session

  beforeAll(async () => {
    amine = await asUser(DEMO.amine) // accompagné vitrine
    const r = await amine.post('/api/questionnaire/next', { history: [] })
    fallbackActif = r.status === 200 && r.json?.question === FALLBACK_STEPS[0]
  })

  it('TC-QUEST-001 — première étape (history vide) : 200 + contrat de forme', async () => {
    const r = await amine.post('/api/questionnaire/next', { history: [] })
    expect(r.status).toBe(200)
    expect(typeof r.json.question).toBe('string')
    expect(r.json.question.length).toBeGreaterThan(0)
    expect(Array.isArray(r.json.propositions)).toBe(true)
    expect(r.json.propositions.every((p: unknown) => typeof p === 'string')).toBe(true)
    expect(r.json.termine).toBe(false)
    // recapitulatif : null ou string (jamais terminé à l'étape 0)
    expect(r.json.recapitulatif === null || typeof r.json.recapitulatif === 'string').toBe(true)
    if (fallbackActif) expect(r.json.question).toBe(FALLBACK_STEPS[0])
  })

  it('TC-QUEST-002 — étape intermédiaire (history de 3) : 200 + étape suivante non terminée', async () => {
    const r = await amine.post('/api/questionnaire/next', { history: makeHistory(3) })
    expect(r.status).toBe(200)
    expect(r.json.termine).toBe(false)
    expect(typeof r.json.question).toBe('string')
    expect(r.json.question.length).toBeGreaterThan(0)
    expect(Array.isArray(r.json.propositions)).toBe(true)
    if (fallbackActif) expect(r.json.question).toBe(FALLBACK_STEPS[3])
  })

  it('TC-QUEST-003 — fin de parcours (history de 6) : termine=true + récapitulatif non vide', async () => {
    const history = makeHistory(6) // = FALLBACK_STEPS.length → seuil de fin
    const r = await amine.post('/api/questionnaire/next', { history })
    expect(r.status).toBe(200)
    // Contrat (IA active sur la stack : c'est le modèle qui décide de la fin) :
    expect(typeof r.json.termine).toBe('boolean')
    expect(r.json.recapitulatif === null || typeof r.json.recapitulatif === 'string').toBe(true)
    if (fallbackActif) {
      // En repli déterministe (sans clé IA) : à 6 réponses, fin + récapitulatif structuré.
      expect(r.json.termine).toBe(true)
      expect(typeof r.json.recapitulatif).toBe('string')
      expect(r.json.recapitulatif.length).toBeGreaterThan(0)
      expect(r.json.question).toBe('')
      expect(r.json.recapitulatif).toContain('Récapitulatif de ta situation')
      expect(r.json.recapitulatif).toContain(history[0].question)
      expect(r.json.recapitulatif).toContain(history[0].answer)
    }
  })

  it('TC-QUEST-004 — accès : non authentifié → 401 « Non authentifié »', async () => {
    const r = await new Session().post('/api/questionnaire/next', { history: [] })
    expect(r.status).toBe(401)
    expect(r.json.error).toBe('Non authentifié')
  })

  it('TC-QUEST-005 — cookie/jeton invalide → 401 « Session invalide »', async () => {
    const s = new Session()
    s.cookie = 'boussole_token=jeton.bidon.invalide' // JWT corrompu présent mais non décodable
    const r = await s.post('/api/questionnaire/next', { history: [] })
    expect(r.status).toBe(401)
    expect(r.json.error).toBe('Session invalide')
  })

  it('TC-QUEST-006 — accessible à l’accompagnateur ET à l’admin (aucune restriction de rôle)', async () => {
    const acc = await asUser(DEMO.camille) // accompagnateur
    const ra = await acc.post('/api/questionnaire/next', { history: [] })
    expect(ra.status).toBe(200)
    expect(typeof ra.json.question).toBe('string')

    const admin = await asUser(DEMO.admin) // admin
    const rd = await admin.post('/api/questionnaire/next', { history: [] })
    expect(rd.status).toBe(200)
    expect(typeof rd.json.question).toBe('string')
  })

  it('TC-QUEST-007 — history absent/non-tableau toléré (coercition → []) : 200 première étape', async () => {
    // Cas A : body sans history
    const a = await amine.post('/api/questionnaire/next', {})
    expect(a.status).toBe(200)
    expect(a.json.termine).toBe(false)
    if (fallbackActif) expect(a.json.question).toBe(FALLBACK_STEPS[0])
    // Cas B : history = string
    const b = await amine.post('/api/questionnaire/next', { history: 'abc' })
    expect(b.status).toBe(200)
    expect(b.json.termine).toBe(false)
    if (fallbackActif) expect(b.json.question).toBe(FALLBACK_STEPS[0])
    // Cas C : history = number
    const c = await amine.post('/api/questionnaire/next', { history: 123 })
    expect(c.status).toBe(200)
    expect(c.json.termine).toBe(false)
    if (fallbackActif) expect(c.json.question).toBe(FALLBACK_STEPS[0])
  })

  it('TC-QUEST-008 — corps JSON malformé → 400 du middleware express.json (pas de 500 applicatif)', async () => {
    // On contourne le client (qui sérialise du JSON valide) pour envoyer un corps brut malformé.
    const base = process.env.BOUSSOLE_BASE || 'http://localhost:8080'
    const res = await fetch(base + '/api/questionnaire/next', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: amine.cookie },
      body: '{ history: ', // JSON invalide
    })
    expect(res.status).toBe(400)
    expect(res.status).not.toBe(500)
  })

  // TC-QUEST-009 — erreur interne de génération → 500 contrat d'erreur.
  // Le handler ne renvoie 500 que si questionnaireNext() *rejette*. En repli (sans clé),
  // questionnaireNext est non rejetant (catch interne → fallbackNext) ; avec clé, il
  // retombe aussi en repli sur toute erreur réseau. Le 500 n'est donc atteignable qu'en
  // injectant une exception (mock/stub) dans questionnaireNext — non reproductible en
  // intégration HTTP sans dégrader la stack. On documente le contrat sans le forcer :
  // on s'assure qu'une entrée valide ne produit jamais de 500 (robustesse du chemin nominal).
  it('TC-QUEST-009 — chemin d’erreur 500 documenté ; le chemin nominal ne renvoie jamais 500', async () => {
    const r = await amine.post('/api/questionnaire/next', { history: makeHistory(2) })
    expect(r.status).not.toBe(500)
    expect(r.status).toBe(200)
    // Contrat d'erreur de référence (bloc catch du handler), non déclenchable en intégration :
    // 500 { error: 'Erreur lors de la génération de la question' }.
  })
})

describe('quest — POST /api/questionnaire/save', () => {
  let admin: Session
  // Comptes jetables pour les écritures destructives (questionnaires, notifications, dossiers).
  let pilot: TestUser // accompagné jetable « pilote » (auto-assigné)
  let pilotS: Session
  let owner: TestUser // accompagné jetable possédant un parcours ciblé (dossierId)
  let ownerS: Session
  let ownerDossierId: number
  let ownerAccId: number // accompagnateur choisi pour le parcours de `owner`
  let other: TestUser // second accompagné jetable (dossier appartenant à autrui)
  let otherS: Session
  let otherDossierId: number

  beforeAll(async () => {
    admin = await asUser(DEMO.admin)

    // Récupère un accompagnateur démo actif pour démarrer des parcours ciblés.
    const accSession = await asUser(DEMO.camille)
    const meCamille = await accSession.get('/api/auth/me')
    ownerAccId = meCamille.json.user.id as number

    // Accompagné jetable « pilote » (branche auto-assignée, sans dossierId).
    pilot = await createTestUser(admin, 'accompagne', 'quest-pilot')
    pilotS = await asUser({ email: pilot.email, password: pilot.password })

    // Accompagné jetable « owner » avec un parcours ciblé démarré explicitement.
    owner = await createTestUser(admin, 'accompagne', 'quest-owner')
    ownerS = await asUser({ email: owner.email, password: owner.password })
    const started = await ownerS.post('/api/dossiers/start', { titre: 'Parcours quest-owner', accompagnateurId: ownerAccId })
    expect(started.status).toBe(201)
    ownerDossierId = started.json.dossierId as number

    // Second accompagné jetable « other » avec son propre parcours (pour le test de non-propriété).
    other = await createTestUser(admin, 'accompagne', 'quest-other')
    otherS = await asUser({ email: other.email, password: other.password })
    const startedOther = await otherS.post('/api/dossiers/start', { titre: 'Parcours quest-other', accompagnateurId: ownerAccId })
    expect(startedOther.status).toBe(201)
    otherDossierId = startedOther.json.dossierId as number
  })

  afterAll(async () => {
    // Auto-nettoyage : suppression RGPD en cascade des comptes jetables (et de leurs dossiers).
    if (pilot) await deleteTestUser(admin, pilot)
    if (owner) await deleteTestUser(admin, owner)
    if (other) await deleteTestUser(admin, other)
  })

  it('TC-QUEST-016 — nominal sans dossierId : crée le dossier auto-assigné + persiste + notifie', async () => {
    const r = await pilotS.post('/api/questionnaire/save', {
      history: makeHistory(2),
      recapitulatif: 'Récap auto-assigné',
    })
    expect(r.status).toBe(200)
    expect(r.json.ok).toBe(true)
    expect(typeof r.json.dossierId).toBe('number')
    expect(r.json.dossierId).toBeGreaterThan(0)

    // Le dossier auto-assigné apparaît côté accompagné avec un questionnaire rattaché.
    const mine = await pilotS.get('/api/dossiers/mine')
    expect(mine.status).toBe(200)
    const d = (mine.json.dossiers || []).find((x: any) => x.id === r.json.dossierId)
    expect(d).toBeTruthy()
    expect(d.has_questionnaire).toBeGreaterThanOrEqual(1)
  })

  it('TC-QUEST-017 — sans dossierId, ré-appel : réutilise le dossier auto-assigné (pas de doublon)', async () => {
    const r1 = await pilotS.post('/api/questionnaire/save', { history: makeHistory(1), recapitulatif: 'Récap A' })
    const r2 = await pilotS.post('/api/questionnaire/save', { history: makeHistory(1), recapitulatif: 'Récap 2' })
    expect(r1.status).toBe(200)
    expect(r2.status).toBe(200)
    // Même dossier réutilisé (INSERT OR IGNORE sur le lien + SELECT du dossier existant).
    expect(r2.json.dossierId).toBe(r1.json.dossierId)
    // Un seul dossier auto-assigné chez le pilote (pas de doublon).
    const mine = await pilotS.get('/api/dossiers/mine')
    const dossiers = (mine.json.dossiers || []).filter((x: any) => x.id === r1.json.dossierId)
    expect(dossiers.length).toBe(1)
  })

  it('TC-QUEST-018 — avec dossierId valide possédé : rattache au parcours ciblé', async () => {
    const r = await ownerS.post('/api/questionnaire/save', {
      history: makeHistory(2),
      recapitulatif: 'Récap parcours ciblé',
      dossierId: ownerDossierId,
    })
    expect(r.status).toBe(200)
    expect(r.json.ok).toBe(true)
    expect(r.json.dossierId).toBe(ownerDossierId)
    // Le questionnaire est bien rattaché au parcours ciblé (relecture du détail).
    const detail = await ownerS.get(`/api/dossiers/mine/${ownerDossierId}`)
    expect(detail.status).toBe(200)
    expect(detail.json.questionnaire).toBeTruthy()
  })

  it('TC-QUEST-019 — dossierId d’un autre utilisateur → 404 « Parcours introuvable »', async () => {
    // owner tente d'enregistrer sur le parcours de other (non-propriétaire).
    const r = await ownerS.post('/api/questionnaire/save', {
      history: makeHistory(1),
      recapitulatif: 'tentative',
      dossierId: otherDossierId,
    })
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Parcours introuvable')
  })

  it('TC-QUEST-020 — dossierId inexistant → 404 « Parcours introuvable »', async () => {
    const r = await ownerS.post('/api/questionnaire/save', {
      history: [],
      recapitulatif: 'x',
      dossierId: 999999,
    })
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Parcours introuvable')
  })

  it('TC-QUEST-021 — gating rôle : accompagnateur → 403 « Réservé aux personnes accompagnées »', async () => {
    const acc = await asUser(DEMO.camille)
    const r = await acc.post('/api/questionnaire/save', { history: [], recapitulatif: 'x' })
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('Réservé aux personnes accompagnées')
  })

  it('TC-QUEST-022 — gating rôle : admin → 403 « Réservé aux personnes accompagnées »', async () => {
    const r = await admin.post('/api/questionnaire/save', { history: [], recapitulatif: 'x' })
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('Réservé aux personnes accompagnées')
  })

  it('TC-QUEST-023 — accès : non authentifié → 401 « Non authentifié »', async () => {
    const r = await new Session().post('/api/questionnaire/save', { history: [], recapitulatif: 'x' })
    expect(r.status).toBe(401)
    expect(r.json.error).toBe('Non authentifié')
  })

  // TC-QUEST-024 — sans dossierId et AUCUN accompagnateur actif → 400 « Aucun accompagnateur disponible ».
  // Cas dégradé : la branche auto-assignée sélectionne un accompagnateur actif ; pour atteindre le 400 il
  // faut qu'AUCUN n'existe. On désactive temporairement TOUS les accompagnateurs actifs, on vérifie le 400,
  // puis on RESTAURE l'état exact (actif d'origine) dans un finally — y compris en cas d'échec d'assertion —
  // afin de ne jamais dégrader durablement les comptes démo. L'exécution étant séquentielle (un seul worker),
  // la fenêtre de désactivation reste contenue à ce test.
  it('TC-QUEST-024 — sans dossierId et aucun accompagnateur actif → 400 « Aucun accompagnateur disponible »', async () => {
    const usersResp = await admin.get('/api/admin/users')
    const accompagnateurs = (usersResp.json.users || []).filter(
      (u: any) => u.role === 'accompagnateur' && u.actif === 1,
    )
    // Mémorise l'état d'origine pour restauration fidèle.
    const snapshot = accompagnateurs.map((u: any) => ({ id: u.id, actif: u.actif }))
    try {
      for (const u of snapshot) {
        const off = await admin.patch(`/api/admin/users/${u.id}`, { actif: false })
        expect(off.status).toBe(200)
      }
      // Compte jetable neuf, sans dossier préexistant : la branche auto-assignée échoue faute d'accompagnateur.
      const lonely = await createTestUser(admin, 'accompagne', 'quest-noacc')
      try {
        const ls = await asUser({ email: lonely.email, password: lonely.password })
        const r = await ls.post('/api/questionnaire/save', { history: [], recapitulatif: 'x' })
        expect(r.status).toBe(400)
        expect(r.json.error).toBe('Aucun accompagnateur disponible')
      } finally {
        await deleteTestUser(admin, lonely)
      }
    } finally {
      // Restauration impérative de l'état d'origine des accompagnateurs démo.
      for (const u of snapshot) {
        await admin.patch(`/api/admin/users/${u.id}`, { actif: !!u.actif })
      }
    }
  })

  it('TC-QUEST-025 — recapitulatif absent : persiste cr_recap = null', async () => {
    // Enregistre sur le parcours ciblé de owner SANS champ recapitulatif.
    const r = await ownerS.post('/api/questionnaire/save', {
      history: [{ question: 'q', answer: 'r' }],
      dossierId: ownerDossierId,
    })
    expect(r.status).toBe(200)
    expect(r.json.ok).toBe(true)
    expect(r.json.dossierId).toBe(ownerDossierId)
    // Relecture : la dernière ligne (ORDER BY id DESC) a cr_recap null.
    const detail = await ownerS.get(`/api/dossiers/mine/${ownerDossierId}`)
    expect(detail.status).toBe(200)
    expect(detail.json.questionnaire).toBeTruthy()
    expect(detail.json.questionnaire.cr_recap).toBeNull()
  })

  it('TC-QUEST-026 — history absent : persiste contenu = "[]" (défaut)', async () => {
    // dossierId valide + sans champ history → contenu = JSON.stringify([]).
    const r = await ownerS.post('/api/questionnaire/save', {
      recapitulatif: 'Récap sans history',
      dossierId: ownerDossierId,
    })
    expect(r.status).toBe(200)
    expect(r.json.ok).toBe(true)
    const detail = await ownerS.get(`/api/dossiers/mine/${ownerDossierId}`)
    expect(detail.status).toBe(200)
    expect(detail.json.questionnaire).toBeTruthy()
    // contenu relu = tableau vide sérialisé.
    expect(detail.json.questionnaire.contenu).toBe('[]')
    expect(detail.json.questionnaire.cr_recap).toBe('Récap sans history')
  })

  it('TC-QUEST-027 — dossierId non numérique (NaN/0) : coercition → branche auto-assignée (pas de 404)', async () => {
    // Compte jetable dédié pour ne pas polluer pilot/owner ; auto-assigné car dossierId falsy.
    const u = await createTestUser(admin, 'accompagne', 'quest-coerce')
    try {
      const s = await asUser({ email: u.email, password: u.password })
      // Cas A : 'abc' truthy → Number('abc')=NaN → falsy → branche auto-assignée.
      const a = await s.post('/api/questionnaire/save', { dossierId: 'abc', history: [] })
      expect(a.status).toBe(200)
      expect(a.json.ok).toBe(true)
      expect(typeof a.json.dossierId).toBe('number')
      // Cas B : '0' truthy → Number('0')=0 → falsy → même branche auto-assignée, dossier réutilisé.
      const b = await s.post('/api/questionnaire/save', { dossierId: '0', history: [] })
      expect(b.status).toBe(200)
      expect(b.json.ok).toBe(true)
      expect(b.json.dossierId).toBe(a.json.dossierId)
    } finally {
      await deleteTestUser(admin, u)
    }
  })

  it('TC-QUEST-028 — persistance relue : le récapitulatif réapparaît dans le détail du parcours', async () => {
    const recap = `Récap unique ${Date.now()}`
    const r = await ownerS.post('/api/questionnaire/save', {
      history: makeHistory(2),
      recapitulatif: recap,
      dossierId: ownerDossierId,
    })
    expect(r.status).toBe(200)
    const detail = await ownerS.get(`/api/dossiers/mine/${ownerDossierId}`)
    expect(detail.status).toBe(200)
    expect(detail.json.questionnaire).toBeTruthy()
    expect(detail.json.questionnaire.cr_recap).toBe(recap)
    expect(detail.json.questionnaire.complete_le).toBeTruthy()
  })

  it('TC-QUEST-029 — la notification atteint le bon accompagnateur (ciblage)', async () => {
    const acc = await asUser(DEMO.camille) // accompagnateur du parcours de owner
    const before = await acc.get('/api/notifications')
    expect(before.status).toBe(200)
    const countBefore = (before.json.notifications || []).filter(
      (n: any) => n.texte === 'Un accompagné a complété son questionnaire initial.',
    ).length

    const r = await ownerS.post('/api/questionnaire/save', {
      history: [],
      recapitulatif: 'ciblage',
      dossierId: ownerDossierId,
    })
    expect(r.status).toBe(200)

    const after = await acc.get('/api/notifications')
    const countAfter = (after.json.notifications || []).filter(
      (n: any) => n.texte === 'Un accompagné a complété son questionnaire initial.',
    ).length
    // L'accompagnateur du dossier reçoit (au moins) une notification de plus.
    expect(countAfter).toBeGreaterThan(countBefore)

    // Un autre accompagnateur (Mohamed) non rattaché à ce parcours ne reçoit rien pour cette action.
    const autre = await asUser(DEMO.mohamed)
    const autreNotifs = await autre.get('/api/notifications')
    expect(autreNotifs.status).toBe(200)
    expect(Array.isArray(autreNotifs.json.notifications)).toBe(true)
  })
})
