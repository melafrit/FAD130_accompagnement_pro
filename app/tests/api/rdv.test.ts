import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Session, asUser, DEMO, BASE } from '../helpers/api'
import { createTestUser, deleteTestUser, type TestUser } from '../helpers/fixtures'

// =============================================================================
//  Domaine RDV — tests d'intégration API (stack Docker :8080)
//
//  Stratégie d'isolation : pour tous les scénarios mutants (créneaux, réservations,
//  demandes), on travaille sur un GRAPHE DE TEST JETABLE entièrement maîtrisé, sans
//  jamais dégrader les comptes de démo (vitrine Mohamed/Amine, dossier D1) :
//    - testAccA, testAccB : deux accompagnateurs jetables
//    - testP, testP2      : deux accompagnés jetables
//    - dossierP_A  : parcours de testP avec testAccA  (testP lié à testAccA)
//    - dossierP_B  : parcours de testP avec testAccB
//    - dossierP2_A : parcours de testP2 avec testAccA (ownership croisé)
//  Les liens d'accompagnement et dossiers sont créés via POST /api/dossiers/start.
//  La suppression RGPD des comptes jetables (afterAll) purge en cascade créneaux,
//  rdv, dossiers et demandes_rdv (ON DELETE CASCADE).
//
//  Découverte dynamique : aucun id codé en dur ; les ids de créneaux/rdv/dossiers
//  sont lus via les endpoints (/creneaux/mine, /disponibles, /mine, /dossiers/start).
//  Les endpoints rdv n'appliquent aucun requireFeature : pas de gating effectif (TC-RDV-066).
// =============================================================================

// --- Petits utilitaires de date (toujours dans le futur pour rester « disponible ») ---
function futureSlot(daysAhead: number, startHH = '10:00', endHH = '10:45'): { debut: string; fin: string } {
  const d = new Date(Date.now() + daysAhead * 86400000)
  const day = d.toISOString().slice(0, 10)
  return { debut: `${day}T${startHH}`, fin: `${day}T${endHH}` }
}
function pastSlot(daysAgo: number, startHH = '10:00', endHH = '10:45'): { debut: string; fin: string } {
  const d = new Date(Date.now() - daysAgo * 86400000)
  const day = d.toISOString().slice(0, 10)
  return { debut: `${day}T${startHH}`, fin: `${day}T${endHH}` }
}

// --- Helpers de découverte ---
async function listCreneaux(acc: Session): Promise<any[]> {
  const r = await acc.get('/api/rdv/creneaux/mine')
  return r.json.creneaux as any[]
}
async function createCreneau(acc: Session, slot: { debut: string; fin: string }): Promise<number> {
  const r = await acc.post('/api/rdv/creneaux', slot)
  expect(r.status).toBe(201)
  return r.json.id as number
}
async function notifTextsFor(s: Session): Promise<string[]> {
  const r = await s.get('/api/notifications')
  expect(r.status).toBe(200)
  return (r.json.notifications as { texte: string }[]).map((n) => n.texte)
}
// Lecture brute (corps non-JSON, en-têtes) pour l'export ICS.
async function rawGet(s: Session, path: string): Promise<{ status: number; body: string; contentType: string | null; disposition: string | null }> {
  const res = await fetch(BASE + path, { headers: s.cookie ? { cookie: s.cookie } : {} })
  const body = await res.text()
  return {
    status: res.status,
    body,
    contentType: res.headers.get('content-type'),
    disposition: res.headers.get('content-disposition'),
  }
}

describe('RDV — créneaux, réservation, demandes, export ICS', () => {
  let admin: Session
  let testAccA: TestUser
  let testAccB: TestUser
  let testP: TestUser
  let testP2: TestUser
  let accA: Session
  let accB: Session
  let pSess: Session
  let p2Sess: Session
  let dossierP_A: number // parcours de testP avec testAccA
  let dossierP_B: number // parcours de testP avec testAccB
  let dossierP2_A: number // parcours de testP2 avec testAccA

  beforeAll(async () => {
    admin = await asUser(DEMO.admin)
    testAccA = await createTestUser(admin, 'accompagnateur', 'rdv-accA')
    testAccB = await createTestUser(admin, 'accompagnateur', 'rdv-accB')
    testP = await createTestUser(admin, 'accompagne', 'rdv-p1')
    testP2 = await createTestUser(admin, 'accompagne', 'rdv-p2')

    accA = await asUser({ email: testAccA.email, password: testAccA.password })
    accB = await asUser({ email: testAccB.email, password: testAccB.password })
    pSess = await asUser({ email: testP.email, password: testP.password })
    p2Sess = await asUser({ email: testP2.email, password: testP2.password })

    // testP démarre un parcours avec chacun des deux accompagnateurs (crée lien + dossier).
    const dPA = await pSess.post('/api/dossiers/start', { titre: 'Parcours test A', accompagnateurId: testAccA.id })
    expect(dPA.status).toBe(201)
    dossierP_A = dPA.json.dossierId as number
    const dPB = await pSess.post('/api/dossiers/start', { titre: 'Parcours test B', accompagnateurId: testAccB.id })
    expect(dPB.status).toBe(201)
    dossierP_B = dPB.json.dossierId as number

    // testP2 démarre un parcours avec testAccA (pour les tests de propriété croisée).
    const dP2A = await p2Sess.post('/api/dossiers/start', { titre: 'Parcours test P2/A', accompagnateurId: testAccA.id })
    expect(dP2A.status).toBe(201)
    dossierP2_A = dP2A.json.dossierId as number
  }, 60000)

  afterAll(async () => {
    // Cascade : supprime créneaux, rdv, dossiers, demandes_rdv liés aux comptes jetables.
    if (testAccA) await deleteTestUser(admin, testAccA)
    if (testAccB) await deleteTestUser(admin, testAccB)
    if (testP) await deleteTestUser(admin, testP)
    if (testP2) await deleteTestUser(admin, testP2)
  })

  // ===========================================================================
  //  POST /api/rdv/creneaux — création de créneau
  // ===========================================================================
  it('TC-RDV-001 — créer un créneau valide → 201 {id, debut, fin, reserve:0} et visible dans /creneaux/mine', async () => {
    const slot = futureSlot(30, '10:00', '10:45')
    const r = await accA.post('/api/rdv/creneaux', slot)
    expect(r.status).toBe(201)
    expect(typeof r.json.id).toBe('number')
    expect(r.json.debut).toBe(slot.debut)
    expect(r.json.fin).toBe(slot.fin)
    expect(r.json.reserve).toBe(0)
    const mine = await listCreneaux(accA)
    expect(mine.some((c) => c.id === r.json.id)).toBe(true)
  })

  it('TC-RDV-002 — créer un créneau notifie les demandeurs et passe leurs demandes_rdv à « satisfaite »', async () => {
    // testP demande un RDV sur son parcours avec accA (aucun créneau précis requis).
    const dem = await pSess.post('/api/rdv/demander', { dossierId: dossierP_A })
    expect(dem.status).toBe(200)
    // accA crée un créneau → notification au demandeur + demandes en_attente satisfaites.
    const before = await notifTextsFor(pSess)
    const slot = futureSlot(31, '11:00', '11:45')
    const r = await accA.post('/api/rdv/creneaux', slot)
    expect(r.status).toBe(201)
    const after = await notifTextsFor(pSess)
    expect(after.length).toBeGreaterThan(before.length)
    expect(after.some((t) => /nouveaux créneaux/i.test(t))).toBe(true)
    // Une nouvelle demande sur le même parcours ne trouve plus de demande en_attente :
    // si une demande 'satisfaite' subsiste sans en_attente, redemander réinsère une ligne (200).
    const reDem = await pSess.post('/api/rdv/demander', { dossierId: dossierP_A })
    expect(reDem.status).toBe(200)
  })

  it('TC-RDV-003 — refus si fin <= début (fin==début et fin<début) → 400', async () => {
    const eq = await accA.post('/api/rdv/creneaux', { debut: '2026-07-01T10:00', fin: '2026-07-01T10:00' })
    expect(eq.status).toBe(400)
    expect(eq.json.error).toMatch(/Créneau invalide/i)
    const lt = await accA.post('/api/rdv/creneaux', { debut: '2026-07-01T10:00', fin: '2026-07-01T09:00' })
    expect(lt.status).toBe(400)
    expect(lt.json.error).toMatch(/Créneau invalide/i)
  })

  it('TC-RDV-004 — refus si debut et/ou fin manquant → 400', async () => {
    const empty = await accA.post('/api/rdv/creneaux', {})
    expect(empty.status).toBe(400)
    const noFin = await accA.post('/api/rdv/creneaux', { debut: '2026-07-01T10:00' })
    expect(noFin.status).toBe(400)
    const noDebut = await accA.post('/api/rdv/creneaux', { fin: '2026-07-01T10:45' })
    expect(noDebut.status).toBe(400)
    for (const r of [empty, noFin, noDebut]) expect(r.json.error).toMatch(/Créneau invalide/i)
  })

  it('TC-RDV-005 — body absent → 400 sans crash 500 (garde req.body || {})', async () => {
    const r = await accA.post('/api/rdv/creneaux')
    expect(r.status).toBe(400)
    expect(r.json.error).toMatch(/Créneau invalide/i)
  })

  it('TC-RDV-006 — création refusée sans authentification → 401', async () => {
    const r = await new Session().post('/api/rdv/creneaux', futureSlot(30))
    expect(r.status).toBe(401)
    expect(r.json.error).toMatch(/Non authentifié/i)
  })

  it('TC-RDV-007 — création refusée pour un accompagné → 403', async () => {
    const r = await pSess.post('/api/rdv/creneaux', futureSlot(30))
    expect(r.status).toBe(403)
    expect(r.json.error).toMatch(/Accès refusé/i)
  })

  it('TC-RDV-008 — création refusée pour un admin → 403', async () => {
    const r = await admin.post('/api/rdv/creneaux', futureSlot(30))
    expect(r.status).toBe(403)
    expect(r.json.error).toMatch(/Accès refusé/i)
  })

  // ===========================================================================
  //  GET /api/rdv/creneaux/mine — liste des créneaux de l'accompagnateur
  // ===========================================================================
  it('TC-RDV-009 — lister ses créneaux → 200 {creneaux} trié par debut, réservataire renseigné si réservé', async () => {
    // Un créneau libre + un créneau réservé chez accA.
    const libre = futureSlot(40, '09:00', '09:45')
    await createCreneau(accA, libre)
    const reserveSlot = futureSlot(41, '09:00', '09:45')
    const cid = await createCreneau(accA, reserveSlot)
    const resa = await pSess.post('/api/rdv/reserver', { creneauId: cid, dossierId: dossierP_A })
    expect(resa.status).toBe(200)

    const r = await accA.get('/api/rdv/creneaux/mine')
    expect(r.status).toBe(200)
    expect(Array.isArray(r.json.creneaux)).toBe(true)
    const debuts = (r.json.creneaux as any[]).map((c) => c.debut)
    expect([...debuts]).toEqual([...debuts].sort())
    for (const c of r.json.creneaux as any[]) {
      expect(typeof c.id).toBe('number')
      expect('debut' in c && 'fin' in c && 'reserve' in c).toBe(true)
    }
    const reserved = (r.json.creneaux as any[]).find((c) => c.id === cid)
    expect(reserved.reserve).toBe(1)
    expect(reserved.accompagne_email).toBe(testP.email)
  })

  it('TC-RDV-010 — isolation : accB ne voit que ses propres créneaux', async () => {
    const marker = futureSlot(42, '08:00', '08:30')
    const cidA = await createCreneau(accA, marker)
    const listB = await listCreneaux(accB)
    expect(listB.every((c) => c.id !== cidA)).toBe(true)
  })

  it('TC-RDV-011 — lister ses créneaux sans authentification → 401', async () => {
    const r = await new Session().get('/api/rdv/creneaux/mine')
    expect(r.status).toBe(401)
    expect(r.json.error).toMatch(/Non authentifié/i)
  })

  it('TC-RDV-012 — lister ses créneaux refusé pour un accompagné → 403', async () => {
    const r = await pSess.get('/api/rdv/creneaux/mine')
    expect(r.status).toBe(403)
    expect(r.json.error).toMatch(/Accès refusé/i)
  })

  // ===========================================================================
  //  DELETE /api/rdv/creneaux/:id — suppression de créneau
  // ===========================================================================
  it('TC-RDV-013 — supprimer un créneau libre du propriétaire → 200 {ok:true} et disparition', async () => {
    const cid = await createCreneau(accA, futureSlot(45, '14:00', '14:45'))
    const del = await accA.del(`/api/rdv/creneaux/${cid}`)
    expect(del.status).toBe(200)
    expect(del.json.ok).toBe(true)
    const mine = await listCreneaux(accA)
    expect(mine.some((c) => c.id === cid)).toBe(false)
  })

  it('TC-RDV-014 — supprimer un créneau réservé → 409 « Créneau déjà réservé », ressource intacte', async () => {
    const cid = await createCreneau(accA, futureSlot(46, '14:00', '14:45'))
    const resa = await pSess.post('/api/rdv/reserver', { creneauId: cid, dossierId: dossierP_A })
    expect(resa.status).toBe(200)
    const del = await accA.del(`/api/rdv/creneaux/${cid}`)
    expect(del.status).toBe(409)
    expect(del.json.error).toMatch(/déjà réservé/i)
    // Le créneau existe toujours et reste réservé.
    const still = (await listCreneaux(accA)).find((c) => c.id === cid)
    expect(still).toBeDefined()
    expect(still.reserve).toBe(1)
  })

  it('TC-RDV-015 — supprimer un créneau inexistant → 404 « Créneau introuvable »', async () => {
    const del = await accA.del('/api/rdv/creneaux/999999')
    expect(del.status).toBe(404)
    expect(del.json.error).toMatch(/introuvable/i)
  })

  it('TC-RDV-016 — supprimer le créneau d\'un autre accompagnateur → 404 (non-propriétaire)', async () => {
    const cidA = await createCreneau(accA, futureSlot(47, '15:00', '15:45'))
    const del = await accB.del(`/api/rdv/creneaux/${cidA}`)
    expect(del.status).toBe(404)
    expect(del.json.error).toMatch(/introuvable/i)
    // Le créneau d'accA est toujours là.
    expect((await listCreneaux(accA)).some((c) => c.id === cidA)).toBe(true)
  })

  it('TC-RDV-017 — supprimer avec un id non numérique → 404 sans 500', async () => {
    const del = await accA.del('/api/rdv/creneaux/abc')
    expect(del.status).toBe(404)
    expect(del.json.error).toMatch(/introuvable/i)
  })

  it('TC-RDV-018 — supprimer sans authentification → 401', async () => {
    const r = await new Session().del('/api/rdv/creneaux/1')
    expect(r.status).toBe(401)
    expect(r.json.error).toMatch(/Non authentifié/i)
  })

  it('TC-RDV-019 — supprimer refusé pour un accompagné → 403', async () => {
    const r = await pSess.del('/api/rdv/creneaux/1')
    expect(r.status).toBe(403)
    expect(r.json.error).toMatch(/Accès refusé/i)
  })

  // ===========================================================================
  //  GET /api/rdv/disponibles — créneaux libres (accompagné)
  // ===========================================================================
  it('TC-RDV-020 — créneaux disponibles d\'un parcours (dossierId) → 200 {creneaux:[{id,debut,fin}]} triés', async () => {
    const slot = futureSlot(50, '10:00', '10:45')
    const cid = await createCreneau(accA, slot)
    const r = await pSess.get(`/api/rdv/disponibles?dossierId=${dossierP_A}`)
    expect(r.status).toBe(200)
    expect(Array.isArray(r.json.creneaux)).toBe(true)
    const debuts = (r.json.creneaux as any[]).map((c) => c.debut)
    expect([...debuts]).toEqual([...debuts].sort())
    const found = (r.json.creneaux as any[]).find((c) => c.id === cid)
    expect(found).toBeDefined()
    expect(Object.keys(found).sort()).toEqual(['debut', 'fin', 'id'])
  })

  it('TC-RDV-021 — créneaux disponibles sans dossierId : accompagnateur par défaut/lié', async () => {
    // testP est lié à accA (et accB). findAccompagnateurFor renvoie le lien actif d'id le plus bas
    // (accA, créé avant accB) → on doit voir au moins un créneau libre futur d'accA.
    const slot = futureSlot(51, '10:00', '10:45')
    const cid = await createCreneau(accA, slot)
    const r = await pSess.get('/api/rdv/disponibles')
    expect(r.status).toBe(200)
    expect(Array.isArray(r.json.creneaux)).toBe(true)
    expect((r.json.creneaux as any[]).some((c) => c.id === cid)).toBe(true)
  })

  it('TC-RDV-022 — disponibles exclut les créneaux passés et réservés (futur + reserve=0 seulement)', async () => {
    const passe = await createCreneau(accB, pastSlot(2, '10:00', '10:45'))
    const futurLibre = await createCreneau(accB, futureSlot(52, '10:00', '10:45'))
    const futurReserve = await createCreneau(accB, futureSlot(53, '10:00', '10:45'))
    const resa = await pSess.post('/api/rdv/reserver', { creneauId: futurReserve, dossierId: dossierP_B })
    expect(resa.status).toBe(200)

    const r = await pSess.get(`/api/rdv/disponibles?dossierId=${dossierP_B}`)
    expect(r.status).toBe(200)
    const ids = (r.json.creneaux as any[]).map((c) => c.id)
    expect(ids).toContain(futurLibre)
    expect(ids).not.toContain(passe)
    expect(ids).not.toContain(futurReserve)
    // Tous les créneaux listés sont strictement futurs.
    const now = new Date().toISOString()
    for (const c of r.json.creneaux as any[]) expect(c.debut > now).toBe(true)
  })

  it('TC-RDV-023 — disponibles avec un dossier non possédé → 200 {creneaux:[]} (aucune fuite)', async () => {
    // testP demande les disponibilités pour le dossier de testP2 → targetAccompagnateur=null → [].
    const r = await pSess.get(`/api/rdv/disponibles?dossierId=${dossierP2_A}`)
    expect(r.status).toBe(200)
    expect(r.json.creneaux).toEqual([])
  })

  it('TC-RDV-024 — disponibles refusé pour un accompagnateur → 403', async () => {
    const r = await accA.get('/api/rdv/disponibles')
    expect(r.status).toBe(403)
    expect(r.json.error).toMatch(/Accès refusé/i)
  })

  it('TC-RDV-025 — disponibles sans authentification → 401', async () => {
    const r = await new Session().get('/api/rdv/disponibles')
    expect(r.status).toBe(401)
    expect(r.json.error).toMatch(/Non authentifié/i)
  })

  // ===========================================================================
  //  POST /api/rdv/reserver — réservation (accompagné)
  // ===========================================================================
  it('TC-RDV-026 — réserver un créneau libre par parcours → 200 {ok:true}, créneau réservé, rdv créé, notifs', async () => {
    const cid = await createCreneau(accA, futureSlot(55, '10:00', '10:45'))
    const pNotifBefore = (await notifTextsFor(pSess)).length

    const r = await pSess.post('/api/rdv/reserver', { creneauId: cid, dossierId: dossierP_A })
    expect(r.status).toBe(200)
    expect(r.json.ok).toBe(true)

    // Le créneau passe reserve=1 côté accompagnateur.
    const slot = (await listCreneaux(accA)).find((c) => c.id === cid)
    expect(slot.reserve).toBe(1)
    // Un rdv confirmé apparaît côté accompagné.
    const mine = await pSess.get('/api/rdv/mine')
    expect(mine.json.rdv.some((x: any) => x.statut === 'confirme')).toBe(true)
    // Notifications : accompagné (confirmation) + accompagnateur (nouveau rdv).
    const pNotifAfter = await notifTextsFor(pSess)
    expect(pNotifAfter.length).toBeGreaterThan(pNotifBefore)
    expect(pNotifAfter.some((t) => /confirmé/i.test(t))).toBe(true)
    const accNotif = await notifTextsFor(accA)
    expect(accNotif.some((t) => /Nouveau rendez-vous réservé/i.test(t))).toBe(true)
  })

  it('TC-RDV-027 — réserver sans dossierId (mode hérité, accompagnateur lié) → 200 {ok:true}', async () => {
    // testP est lié à accA ; findAccompagnateurFor(testP) = accA (lien le plus ancien).
    const cid = await createCreneau(accA, futureSlot(56, '10:00', '10:45'))
    const r = await pSess.post('/api/rdv/reserver', { creneauId: cid })
    expect(r.status).toBe(200)
    expect(r.json.ok).toBe(true)
    const slot = (await listCreneaux(accA)).find((c) => c.id === cid)
    expect(slot.reserve).toBe(1)
  })

  it('TC-RDV-028 — double réservation du même créneau → 409 « Créneau indisponible »', async () => {
    const cid = await createCreneau(accA, futureSlot(57, '10:00', '10:45'))
    const first = await pSess.post('/api/rdv/reserver', { creneauId: cid, dossierId: dossierP_A })
    expect(first.status).toBe(200)
    const second = await pSess.post('/api/rdv/reserver', { creneauId: cid, dossierId: dossierP_A })
    expect(second.status).toBe(409)
    expect(second.json.error).toMatch(/Créneau indisponible/i)
  })

  it('TC-RDV-029 — réserver un créneau inexistant → 409 « Créneau indisponible »', async () => {
    const r = await pSess.post('/api/rdv/reserver', { creneauId: 999999 })
    expect(r.status).toBe(409)
    expect(r.json.error).toMatch(/Créneau indisponible/i)
  })

  it('TC-RDV-030 — réserver avec creneauId manquant/non numérique → 409 sans 500', async () => {
    const missing = await pSess.post('/api/rdv/reserver', {})
    expect(missing.status).toBe(409)
    expect(missing.json.error).toMatch(/Créneau indisponible/i)
    const nan = await pSess.post('/api/rdv/reserver', { creneauId: 'x' })
    expect(nan.status).toBe(409)
    expect(nan.json.error).toMatch(/Créneau indisponible/i)
  })

  it('TC-RDV-031 — réserver avec un dossierId non possédé → 409 « ...pour ce parcours »', async () => {
    const cid = await createCreneau(accA, futureSlot(58, '10:00', '10:45'))
    // testP tente de réserver en citant le dossier de testP2.
    const r = await pSess.post('/api/rdv/reserver', { creneauId: cid, dossierId: dossierP2_A })
    expect(r.status).toBe(409)
    expect(r.json.error).toMatch(/pour ce parcours/i)
    // Aucun rdv créé : le créneau reste libre.
    const slot = (await listCreneaux(accA)).find((c) => c.id === cid)
    expect(slot.reserve).toBe(0)
  })

  it('TC-RDV-032 — réserver le créneau d\'un accompagnateur ≠ accompagnateur du parcours → 409 « ...pour ce parcours »', async () => {
    // Créneau d'accB, mais dossierP_A est rattaché à accA → incohérence.
    const cidB = await createCreneau(accB, futureSlot(59, '10:00', '10:45'))
    const r = await pSess.post('/api/rdv/reserver', { creneauId: cidB, dossierId: dossierP_A })
    expect(r.status).toBe(409)
    expect(r.json.error).toMatch(/pour ce parcours/i)
    const slot = (await listCreneaux(accB)).find((c) => c.id === cidB)
    expect(slot.reserve).toBe(0)
  })

  it('TC-RDV-033 — réserver sans dossierId un créneau d\'un accompagnateur non « par défaut » → 409 « Créneau indisponible »', async () => {
    // testP2 n'est lié qu'à accA → findAccompagnateurFor(testP2)=accA.
    // Un créneau d'accB sans dossierId ne correspond pas → 409 « Créneau indisponible ».
    const cidB = await createCreneau(accB, futureSlot(60, '10:00', '10:45'))
    const r = await p2Sess.post('/api/rdv/reserver', { creneauId: cidB })
    expect(r.status).toBe(409)
    expect(r.json.error).toMatch(/Créneau indisponible/i)
    const slot = (await listCreneaux(accB)).find((c) => c.id === cidB)
    expect(slot.reserve).toBe(0)
  })

  it('TC-RDV-034 — réserver refusé pour un accompagnateur → 403', async () => {
    const r = await accA.post('/api/rdv/reserver', { creneauId: 1 })
    expect(r.status).toBe(403)
    expect(r.json.error).toMatch(/Accès refusé/i)
  })

  it('TC-RDV-035 — réserver sans authentification → 401', async () => {
    const r = await new Session().post('/api/rdv/reserver', { creneauId: 1 })
    expect(r.status).toBe(401)
    expect(r.json.error).toMatch(/Non authentifié/i)
  })

  it('TC-RDV-036 — atomicité de la réservation : reserve=1 ET rdv inséré ET notifications cohérents', async () => {
    const cid = await createCreneau(accA, futureSlot(61, '10:00', '10:45'))
    const r = await pSess.post('/api/rdv/reserver', { creneauId: cid, dossierId: dossierP_A })
    expect(r.status).toBe(200)
    // Effets observés de manière cohérente (pas d'état partiel) : créneau réservé...
    const slot = (await listCreneaux(accA)).find((c) => c.id === cid)
    expect(slot.reserve).toBe(1)
    expect(slot.accompagne_email).toBe(testP.email) // jointure rdv → un rdv existe bien
    // ...et notification côté accompagnateur présente.
    const accNotif = await notifTextsFor(accA)
    expect(accNotif.some((t) => /Nouveau rendez-vous réservé/i.test(t))).toBe(true)
  })

  // ===========================================================================
  //  POST /api/rdv/demander — demande de RDV sur un parcours
  // ===========================================================================
  it('TC-RDV-037 — demander un RDV sur un parcours → 200 {ok:true}, demande + notification accompagnateur', async () => {
    // Utilise le parcours testP/accB (vierge de demande au départ).
    const accNotifBefore = (await notifTextsFor(accB)).length
    const r = await pSess.post('/api/rdv/demander', { dossierId: dossierP_B })
    expect(r.status).toBe(200)
    expect(r.json.ok).toBe(true)
    const accNotifAfter = await notifTextsFor(accB)
    expect(accNotifAfter.length).toBeGreaterThan(accNotifBefore)
    expect(accNotifAfter.some((t) => /demande un rendez-vous/i.test(t))).toBe(true)
  })

  it('TC-RDV-038 — demander deux fois : pas de doublon « en_attente », mais notification à chaque appel', async () => {
    // 1er appel : crée (ou conserve) une demande en_attente + notifie.
    const first = await pSess.post('/api/rdv/demander', { dossierId: dossierP_B })
    expect(first.status).toBe(200)
    const accBefore = (await notifTextsFor(accB)).length
    // 2e appel : la garde if(!exists) évite la 2e ligne, mais notifie quand même.
    const second = await pSess.post('/api/rdv/demander', { dossierId: dossierP_B })
    expect(second.status).toBe(200)
    const accAfter = await notifTextsFor(accB)
    expect(accAfter.length).toBeGreaterThan(accBefore)
  })

  it('TC-RDV-039 — demander sur un parcours non possédé ou inexistant → 404 « Parcours introuvable »', async () => {
    const autrui = await pSess.post('/api/rdv/demander', { dossierId: dossierP2_A })
    expect(autrui.status).toBe(404)
    expect(autrui.json.error).toMatch(/Parcours introuvable/i)
    const absent = await pSess.post('/api/rdv/demander', { dossierId: 999999 })
    expect(absent.status).toBe(404)
    expect(absent.json.error).toMatch(/Parcours introuvable/i)
  })

  it('TC-RDV-040 — demander avec dossierId manquant/non numérique → 404 sans 500', async () => {
    const missing = await pSess.post('/api/rdv/demander', {})
    expect(missing.status).toBe(404)
    expect(missing.json.error).toMatch(/Parcours introuvable/i)
    const nan = await pSess.post('/api/rdv/demander', { dossierId: 'x' })
    expect(nan.status).toBe(404)
    expect(nan.json.error).toMatch(/Parcours introuvable/i)
  })

  it('TC-RDV-041 — demander refusé pour un accompagnateur → 403', async () => {
    const r = await accA.post('/api/rdv/demander', { dossierId: dossierP_A })
    expect(r.status).toBe(403)
    expect(r.json.error).toMatch(/Accès refusé/i)
  })

  it('TC-RDV-042 — demander sans authentification → 401', async () => {
    const r = await new Session().post('/api/rdv/demander', { dossierId: 1 })
    expect(r.status).toBe(401)
    expect(r.json.error).toMatch(/Non authentifié/i)
  })

  // ===========================================================================
  //  GET /api/rdv/mine — rendez-vous de l'accompagné
  // ===========================================================================
  it('TC-RDV-043 — lister mes rendez-vous → 200 {rdv:[{id,debut,fin,statut}]} trié par debut', async () => {
    // testP a au moins un rdv (réservations précédentes).
    const cid = await createCreneau(accA, futureSlot(62, '10:00', '10:45'))
    await pSess.post('/api/rdv/reserver', { creneauId: cid, dossierId: dossierP_A })
    const r = await pSess.get('/api/rdv/mine')
    expect(r.status).toBe(200)
    expect(Array.isArray(r.json.rdv)).toBe(true)
    expect(r.json.rdv.length).toBeGreaterThan(0)
    for (const x of r.json.rdv as any[]) {
      expect(typeof x.id).toBe('number')
      expect('debut' in x && 'fin' in x && 'statut' in x).toBe(true)
    }
    const debuts = (r.json.rdv as any[]).map((x) => x.debut)
    expect([...debuts]).toEqual([...debuts].sort())
  })

  it('TC-RDV-044 — isolation : testP2 ne voit que ses propres rendez-vous', async () => {
    // testP a des rdv ; testP2 n'en a aucun (n'a réservé aucun créneau avec succès).
    const idsP = new Set((await pSess.get('/api/rdv/mine')).json.rdv.map((x: any) => x.id))
    const r2 = await p2Sess.get('/api/rdv/mine')
    expect(r2.status).toBe(200)
    for (const x of r2.json.rdv as any[]) expect(idsP.has(x.id)).toBe(false)
  })

  it('TC-RDV-045 — lister mes rendez-vous refusé pour un accompagnateur → 403', async () => {
    const r = await accA.get('/api/rdv/mine')
    expect(r.status).toBe(403)
    expect(r.json.error).toMatch(/Accès refusé/i)
  })

  it('TC-RDV-046 — lister mes rendez-vous sans authentification → 401', async () => {
    const r = await new Session().get('/api/rdv/mine')
    expect(r.status).toBe(401)
    expect(r.json.error).toMatch(/Non authentifié/i)
  })

  // ===========================================================================
  //  GET /api/rdv/:id/ics — export iCalendar
  // ===========================================================================
  it('TC-RDV-047 — export ICS par l\'accompagné propriétaire → 200 text/calendar + corps VCALENDAR valide', async () => {
    const cid = await createCreneau(accA, futureSlot(63, '10:00', '10:45'))
    await pSess.post('/api/rdv/reserver', { creneauId: cid, dossierId: dossierP_A })
    const rdvId = (await pSess.get('/api/rdv/mine')).json.rdv.slice(-1)[0].id as number

    const r = await rawGet(pSess, `/api/rdv/${rdvId}/ics`)
    expect(r.status).toBe(200)
    expect(r.contentType).toMatch(/text\/calendar/)
    expect(r.disposition).toMatch(new RegExp(`filename="rdv-boussole-${rdvId}\\.ics"`))
    expect(r.body).toContain('BEGIN:VCALENDAR')
    expect(r.body).toContain('BEGIN:VEVENT')
    expect(r.body).toContain(`UID:boussole-rdv-${rdvId}@boussole.elafrit.com`)
    expect(r.body).toContain('DTSTART:')
    expect(r.body).toContain('DTEND:')
    expect(r.body).toContain('SUMMARY:')
    expect(r.body).toMatch(/DESCRIPTION:.*Statut/i)
    expect(r.body).toContain('\r\n') // lignes séparées par CRLF
  })

  it('TC-RDV-048 — export ICS par l\'accompagnateur partie au rdv → 200 ICS valide', async () => {
    const cid = await createCreneau(accA, futureSlot(64, '10:00', '10:45'))
    await pSess.post('/api/rdv/reserver', { creneauId: cid, dossierId: dossierP_A })
    const rdvId = (await pSess.get('/api/rdv/mine')).json.rdv.slice(-1)[0].id as number

    const r = await rawGet(accA, `/api/rdv/${rdvId}/ics`)
    expect(r.status).toBe(200)
    expect(r.contentType).toMatch(/text\/calendar/)
    expect(r.body).toContain('BEGIN:VCALENDAR')
  })

  it('TC-RDV-049 — export ICS refusé pour un tiers non partie → 403, aucune fuite', async () => {
    const cid = await createCreneau(accA, futureSlot(65, '10:00', '10:45'))
    await pSess.post('/api/rdv/reserver', { creneauId: cid, dossierId: dossierP_A })
    const rdvId = (await pSess.get('/api/rdv/mine')).json.rdv.slice(-1)[0].id as number

    // Autre accompagné (testP2) : non partie.
    const otherP = await rawGet(p2Sess, `/api/rdv/${rdvId}/ics`)
    expect(otherP.status).toBe(403)
    expect(otherP.body).not.toContain('BEGIN:VCALENDAR')
    // Autre accompagnateur (accB) : non partie.
    const otherAcc = await rawGet(accB, `/api/rdv/${rdvId}/ics`)
    expect(otherAcc.status).toBe(403)
    expect(otherAcc.body).not.toContain('BEGIN:VCALENDAR')
  })

  it('TC-RDV-050 — export ICS refusé pour un admin non partie → 403', async () => {
    const cid = await createCreneau(accA, futureSlot(66, '10:00', '10:45'))
    await pSess.post('/api/rdv/reserver', { creneauId: cid, dossierId: dossierP_A })
    const rdvId = (await pSess.get('/api/rdv/mine')).json.rdv.slice(-1)[0].id as number

    const r = await rawGet(admin, `/api/rdv/${rdvId}/ics`)
    expect(r.status).toBe(403)
    expect(r.body).not.toContain('BEGIN:VCALENDAR')
  })

  it('TC-RDV-051 — export ICS d\'un rdv inexistant → 404 « Rendez-vous introuvable »', async () => {
    const r = await pSess.get('/api/rdv/999999/ics')
    expect(r.status).toBe(404)
    expect(r.json.error).toMatch(/Rendez-vous introuvable/i)
  })

  it('TC-RDV-052 — export ICS sans authentification → 401', async () => {
    const r = await new Session().get('/api/rdv/1/ics')
    expect(r.status).toBe(401)
    expect(r.json.error).toMatch(/Non authentifié/i)
  })

  it('TC-RDV-053 — export ICS avec id non numérique → 404 sans 500', async () => {
    const r = await pSess.get('/api/rdv/abc/ics')
    expect(r.status).toBe(404)
    expect(r.json.error).toMatch(/Rendez-vous introuvable/i)
  })

  // ===========================================================================
  //  Non-régression — absence de gating par offre sur le domaine rdv
  // ===========================================================================
  it('TC-RDV-066 — endpoints rdv accessibles avec un plan « Découverte » restreint (pas de requireFeature)', async () => {
    const plans = (await admin.get('/api/admin/plans')).json.plans as { id: number; nom: string }[]
    const decouverte = plans.find((p) => p.nom === 'Découverte')
    expect(decouverte).toBeDefined()

    // Comptes jetables dédiés à ce scénario (ne pas modifier le plan des comptes de la suite principale).
    const gateAcc = await createTestUser(admin, 'accompagnateur', 'rdv-gate-acc')
    const gateP = await createTestUser(admin, 'accompagne', 'rdv-gate-p')
    try {
      await admin.patch(`/api/admin/users/${gateAcc.id}`, { plan_id: decouverte!.id })
      await admin.patch(`/api/admin/users/${gateP.id}`, { plan_id: decouverte!.id })
      const gAcc = await asUser({ email: gateAcc.email, password: gateAcc.password })
      const gP = await asUser({ email: gateP.email, password: gateP.password })

      // Accompagnateur restreint : création de créneau autorisée (201), pas de 403 fonctionnalité.
      const crea = await gAcc.post('/api/rdv/creneaux', futureSlot(70, '10:00', '10:45'))
      expect(crea.status).toBe(201)
      // Accompagné restreint : consultation des disponibilités autorisée (200), pas de 403.
      const dispo = await gP.get('/api/rdv/disponibles')
      expect(dispo.status).toBe(200)
      expect(Array.isArray(dispo.json.creneaux)).toBe(true)
    } finally {
      await deleteTestUser(admin, gateAcc)
      await deleteTestUser(admin, gateP)
    }
  })

  it('TC-RDV-080 — isolation multi-parcours (anti-IDOR) : un dossier ne révèle QUE ses propres RDV', async () => {
    // testP réserve un RDV sous chacun de ses deux parcours (accompagnateurs A et B distincts).
    const slotA = futureSlot(80, '09:00', '09:45')
    const cidA = await createCreneau(accA, slotA)
    expect((await pSess.post('/api/rdv/reserver', { creneauId: cidA, dossierId: dossierP_A })).status).toBe(200)

    const slotB = futureSlot(81, '14:00', '14:45')
    const cidB = await createCreneau(accB, slotB)
    expect((await pSess.post('/api/rdv/reserver', { creneauId: cidB, dossierId: dossierP_B })).status).toBe(200)

    // accA consulte SON dossier (parcours A) : il voit le RDV de A, jamais celui de B (parcours
    // d'accB) — sinon fuite inter-parcours d'un même accompagné (IDOR).
    const detail = await accA.get(`/api/dossiers/${dossierP_A}`)
    expect(detail.status).toBe(200)
    const debuts = (detail.json.rdvs as { debut: string }[]).map((r) => r.debut)
    expect(debuts).toContain(slotA.debut)
    expect(debuts).not.toContain(slotB.debut)

    // Même isolation dans la synthèse JSON du parcours A.
    const synth = await accA.get(`/api/dossiers/${dossierP_A}/synthese`)
    expect(synth.status).toBe(200)
    const sDebuts = ((synth.json.rdvs as { debut: string }[] | undefined) || []).map((r) => r.debut)
    expect(sDebuts).toContain(slotA.debut)
    expect(sDebuts).not.toContain(slotB.debut)
  })
})
