import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Session, asUser, DEMO } from '../helpers/api'
import { createTestUser, deleteTestUser, type TestUser } from '../helpers/fixtures'
import { scalar } from '../helpers/db'

// Tests d'intégration API du domaine « ethique » (RGPD, rétention, attestation de fin).
// Sources :
//   - app/api/src/ethique.ts  : GET /api/ethique/attestation/dossier/:id (requireAuth + requireFeature('attestation'))
//                               + helpers anonymizeUser / deleteUser / processEffacement / retentionEligibles
//   - app/api/src/admin.ts    : GET /api/admin/effacements, POST /api/admin/effacements/:id,
//                               POST /api/admin/rgpd/:userId, GET /api/admin/retention, POST /api/admin/retention/appliquer
//                               (toutes en requireAuth + requireRole('admin'), JAMAIS de requireFeature)
//
// Conventions respectées :
//   - Découverte DYNAMIQUE des identifiants (parcours D5 clôturé de Karim, D4 non clôturé de Léa,
//     id de l'admin via /api/auth/me, plan « Découverte » via /api/admin/plans). Aucun id en dur.
//   - Tout scénario DESTRUCTIF (anonymisation, suppression, traitement de demande) opère sur des
//     comptes JETABLES @boussole.test, supprimés en afterAll. Les comptes/dossiers démo (Karim, Léa,
//     Amine, Mohamed, Camille, demande seedée de Léa) ne sont JAMAIS dégradés.
//   - Erreurs d'auth fidèles au code : requireAuth → 401 « Non authentifié » (sans cookie) ou
//     « Session invalide » (jeton corrompu) ; requireRole → 403 « Accès refusé » ;
//     requireFeature → 403 « Fonctionnalité non disponible dans votre offre ».
//
// L'apostrophe typographique « ’ » (U+2019) est utilisée dans les messages côté serveur
// (ex. « L’attestation … clôturé. », « Action impossible sur votre propre compte »).

const ATTESTATION_NON_CLOTURE = 'L’attestation n’est disponible qu’une fois le parcours clôturé.'

describe('ethique — RGPD, rétention & attestation de fin', () => {
  let admin: Session
  let mohamed: Session // accompagnateur (vitrine, sans plan → toutes features)
  let camille: Session // accompagnatrice de D5 (Karim, clôturé) et D4 (Léa)
  let amine: Session // accompagné (vitrine)
  let lea: Session // accompagnée (D3, D4 non clôturés) + demande d'effacement seedée
  let karim: Session // accompagné, propriétaire du parcours D5 clôturé

  let adminId: number // id de l'admin connecté (pour le garde-fou « propre compte »)
  let d5Id: number // parcours VAE de Karim, statut='cloture'
  let leaNonClotureId: number // un parcours de Léa NON clôturé (D3 ou D4)
  let decouvertePlanId: number // plan socle SANS la feature 'attestation'

  // Comptes jetables (scénarios destructifs / gating)
  let gated: TestUser // accompagné rattaché au plan « Découverte » (sans 'attestation')
  let gatedSession: Session

  beforeAll(async () => {
    admin = await asUser(DEMO.admin)
    mohamed = await asUser(DEMO.mohamed)
    camille = await asUser(DEMO.camille)
    amine = await asUser(DEMO.amine)
    lea = await asUser(DEMO.lea)
    karim = await asUser(DEMO.karim)

    // Id de l'admin connecté (jamais en dur)
    const me = await admin.get('/api/auth/me')
    expect(me.status).toBe(200)
    adminId = me.json.user.id
    expect(typeof adminId).toBe('number')

    // Découverte dynamique du parcours clôturé D5 (côté accompagné Karim)
    const mineKarim = await karim.get('/api/dossiers/mine')
    expect(mineKarim.status).toBe(200)
    const d5 = (mineKarim.json.dossiers as Array<{ id: number; statut: string }>).find((d) => d.statut === 'cloture')
    if (!d5) throw new Error('Parcours clôturé (D5) de Karim introuvable dans le jeu de démo')
    d5Id = d5.id

    // Découverte dynamique d'un parcours NON clôturé de Léa (D3/D4)
    const mineLea = await lea.get('/api/dossiers/mine')
    expect(mineLea.status).toBe(200)
    const nonClot = (mineLea.json.dossiers as Array<{ id: number; statut: string }>).find((d) => d.statut !== 'cloture')
    if (!nonClot) throw new Error('Parcours non clôturé de Léa introuvable dans le jeu de démo')
    leaNonClotureId = nonClot.id

    // Plan « Découverte » (socle, SANS 'attestation') pour les tests de gating 403
    const plansRes = await admin.get('/api/admin/plans')
    expect(plansRes.status).toBe(200)
    const decouverte = (plansRes.json.plans as Array<{ id: number; nom: string; features: string[] }>).find((p) => p.nom === 'Découverte')
    if (!decouverte) throw new Error('Plan « Découverte » introuvable (seed plans manquant ?)')
    expect(decouverte.features).not.toContain('attestation') // garde-fou : le socle n'inclut pas l'attestation
    decouvertePlanId = decouverte.id

    // Compte jetable accompagné rattaché au plan socle (gating de la feature 'attestation')
    gated = await createTestUser(admin, 'accompagne', 'ethique-gate')
    expect((await admin.patch(`/api/admin/users/${gated.id}`, { plan_id: decouvertePlanId })).status).toBe(200)
    gatedSession = await asUser({ email: gated.email, password: gated.password })
  })

  afterAll(async () => {
    // Nettoyage des comptes jetables uniquement (jamais de dégradation des comptes démo).
    if (gated) await deleteTestUser(admin, gated)
  })

  // Helper : crée un compte accompagné jetable, lui fait démarrer un parcours (donc un dossier),
  // puis dépose une demande d'effacement en_attente — le tout via l'API. Retourne le compte + ids.
  async function makeEffacementDemande(tag: string): Promise<{ user: TestUser; dossierId: number; demandeId: number }> {
    const user = await createTestUser(admin, 'accompagne', tag)
    const s = await asUser({ email: user.email, password: user.password })
    // Choix d'un accompagnateur valide (découverte dynamique)
    const accs = await s.get('/api/dossiers/accompagnateurs')
    expect(accs.status).toBe(200)
    const accompagnateurId = (accs.json.accompagnateurs as Array<{ id: number }>)[0].id
    const start = await s.post('/api/dossiers/start', { titre: `Parcours jetable ${tag}`, accompagnateurId })
    expect(start.status).toBe(201)
    const dossierId = start.json.dossierId as number
    // Dépôt de la demande d'effacement (feature 'transparence' active : compte sans plan)
    const dem = await s.post('/api/transparence/effacement', { dossierId, motif: `Test ${tag}` })
    expect(dem.status).toBe(201)
    // Récupération de l'id de la demande via la console admin (filtre sur l'accompagné jetable)
    const list = await admin.get('/api/admin/effacements')
    expect(list.status).toBe(200)
    const mine = (list.json.demandes as Array<{ id: number; accompagne_id: number }>).find((x) => x.accompagne_id === user.id)
    if (!mine) throw new Error(`Demande d'effacement jetable introuvable pour ${user.email}`)
    return { user, dossierId, demandeId: mine.id }
  }

  // =========================================================================================
  // GET /api/ethique/attestation/dossier/:id  (requireAuth → requireFeature('attestation'))
  // =========================================================================================

  it('TC-ETHIQUE-001 — Attestation d\'un parcours clôturé (accompagné propriétaire) : 200 + forme', async () => {
    const r = await karim.get(`/api/ethique/attestation/dossier/${d5Id}`)
    expect(r.status).toBe(200)
    const b = r.json
    // titre : string | null (nullable en base, mais seedé pour D5)
    expect(b.titre === null || typeof b.titre === 'string').toBe(true)
    expect(typeof b.accompagne).toBe('string')
    expect(b.accompagne.length).toBeGreaterThan(0)
    expect(typeof b.accompagnateur).toBe('string')
    expect(b.accompagnateur.length).toBeGreaterThan(0)
    expect(typeof b.debut).toBe('string') // cree_le
    expect(b.debut.length).toBeGreaterThan(0)
    // fin : date (synthèse publiée) ou null
    expect(b.fin === null || typeof b.fin === 'string').toBe(true)
    expect(typeof b.nb_entretiens).toBe('number')
    expect(b.nb_entretiens).toBeGreaterThanOrEqual(0)
    expect(typeof b.nb_comptes_rendus).toBe('number')
    expect(b.nb_comptes_rendus).toBeGreaterThanOrEqual(0)
  })

  it('TC-ETHIQUE-002 — Attestation accessible aussi à l\'accompagnateur du dossier clôturé (Camille)', async () => {
    const r = await camille.get(`/api/ethique/attestation/dossier/${d5Id}`)
    expect(r.status).toBe(200)
    const b = r.json
    expect(typeof b.accompagne).toBe('string')
    expect(b.accompagne.length).toBeGreaterThan(0)
    // L'accompagnateur correspond à Camille (Camille Laurent dans le seed)
    expect(typeof b.accompagnateur).toBe('string')
    expect(b.accompagnateur).toContain('Camille')
    expect(typeof b.nb_entretiens).toBe('number')
    expect(typeof b.nb_comptes_rendus).toBe('number')
  })

  it('TC-ETHIQUE-003 — Champs agrégés cohérents (nb_entretiens, nb_comptes_rendus publiés, fin = max synthèse publiée)', async () => {
    const r = await karim.get(`/api/ethique/attestation/dossier/${d5Id}`)
    expect(r.status).toBe(200)
    const b = r.json
    // Agrégats attendus, lus en base (lecture seule via le conteneur).
    const nbSessions = Number(scalar('SELECT COUNT(*) AS n FROM sessions WHERE dossier_id=?', d5Id))
    const nbCrPublies = Number(
      scalar("SELECT COUNT(*) AS n FROM comptes_rendus cr JOIN sessions s ON s.id=cr.session_id WHERE s.dossier_id=? AND cr.publie=1", d5Id),
    )
    const maxSynthese = scalar("SELECT MAX(publie_le) AS m FROM syntheses WHERE dossier_id=? AND publie=1", d5Id)
    expect(b.nb_entretiens).toBe(nbSessions)
    expect(b.nb_comptes_rendus).toBe(nbCrPublies)
    if (maxSynthese) {
      expect(b.fin).toBe(maxSynthese)
    } else {
      expect(b.fin).toBeNull()
    }
  })

  it('TC-ETHIQUE-004 — Attestation : 400 si le parcours n\'est pas clôturé', async () => {
    const r = await lea.get(`/api/ethique/attestation/dossier/${leaNonClotureId}`)
    expect(r.status).toBe(400)
    expect(r.json.error).toBe(ATTESTATION_NON_CLOTURE)
  })

  it('TC-ETHIQUE-005 — Attestation : 404 si le dossier n\'appartient pas à l\'utilisateur (Léa sur D5 de Karim)', async () => {
    const r = await lea.get(`/api/ethique/attestation/dossier/${d5Id}`)
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Parcours introuvable')
  })

  it('TC-ETHIQUE-006 — Attestation : 404 si l\'identifiant de dossier est inexistant', async () => {
    const r = await karim.get('/api/ethique/attestation/dossier/99999999')
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Parcours introuvable')
  })

  it('TC-ETHIQUE-007 — Attestation : id non numérique → Number(id)=NaN → 404', async () => {
    const r = await karim.get('/api/ethique/attestation/dossier/abc')
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Parcours introuvable')
  })

  it('TC-ETHIQUE-008 — Attestation : 401 si non authentifié', async () => {
    const anon = new Session()
    const r = await anon.get('/api/ethique/attestation/dossier/1')
    expect(r.status).toBe(401)
    expect(r.json.error).toBe('Non authentifié')
  })

  it('TC-ETHIQUE-009 — Attestation : 401 si cookie/jeton invalide', async () => {
    const corrupt = new Session()
    corrupt.cookie = 'boussole_token=jeton.corrompu.xyz'
    const r = await corrupt.get('/api/ethique/attestation/dossier/1')
    expect(r.status).toBe(401)
    expect(r.json.error).toBe('Session invalide')
  })

  it('TC-ETHIQUE-010 — Attestation : 403 si l\'offre ne contient pas la fonctionnalité \'attestation\'', async () => {
    // Compte jetable rattaché au plan « Découverte » (socle, sans 'attestation').
    const r = await gatedSession.get(`/api/ethique/attestation/dossier/${d5Id}`)
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('Fonctionnalité non disponible dans votre offre')
  })

  it('TC-ETHIQUE-011 — Attestation : 403 prioritaire sur 404 (requireFeature avant le handler, id inexistant)', async () => {
    // requireFeature s'exécute AVANT le handler : 403 même pour un id inexistant (jamais 404).
    const r = await gatedSession.get('/api/ethique/attestation/dossier/99999999')
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('Fonctionnalité non disponible dans votre offre')
  })

  // =========================================================================================
  // GET /api/admin/effacements  (requireAuth → requireRole('admin'))
  // =========================================================================================

  it('TC-ETHIQUE-012 — Console RGPD : liste des demandes d\'effacement (admin) + demande seedée de Léa', async () => {
    const r = await admin.get('/api/admin/effacements')
    expect(r.status).toBe(200)
    expect(Array.isArray(r.json.demandes)).toBe(true)
    const demandes = r.json.demandes as Array<Record<string, unknown>>
    expect(demandes.length).toBeGreaterThan(0)
    for (const d of demandes) {
      expect(typeof d.id).toBe('number')
      expect(d.statut).toBe('en_attente') // la requête filtre WHERE e.statut='en_attente'
      expect(typeof d.cree_le).toBe('string')
      expect(typeof d.accompagne_id).toBe('number')
      expect(typeof d.email).toBe('string')
      // motif / prenom / nom / dossier_titre : nullable → présents comme clés
      expect('motif' in d).toBe(true)
      expect('prenom' in d).toBe(true)
      expect('nom' in d).toBe(true)
      expect('anonymise' in d).toBe(true)
      expect('dossier_titre' in d).toBe(true)
    }
    // La demande seedée de Léa (parcours exploratoire ESS) doit figurer dans la liste.
    const leaDemande = demandes.find((d) => d.email === DEMO.lea.email)
    expect(leaDemande).toBeTruthy()
    expect(leaDemande!.dossier_titre).toContain('coopérative')
  })

  it('TC-ETHIQUE-013 — Liste des effacements : 401 si non authentifié', async () => {
    const anon = new Session()
    const r = await anon.get('/api/admin/effacements')
    expect(r.status).toBe(401)
    expect(r.json.error).toBe('Non authentifié')
  })

  it('TC-ETHIQUE-014 — Liste des effacements : 403 pour un accompagnateur (mauvais rôle)', async () => {
    const r = await mohamed.get('/api/admin/effacements')
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('Accès refusé')
  })

  it('TC-ETHIQUE-015 — Liste des effacements : 403 pour un accompagné (mauvais rôle)', async () => {
    const r = await amine.get('/api/admin/effacements')
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('Accès refusé')
  })

  it('TC-ETHIQUE-016 — Console RGPD NON gatée par plan : un admin rattaché à un plan minimal y accède (effacements + retention)', async () => {
    // L'admin de démo (mohamed@elafrit.com) n'a pas de plan. On crée un admin JETABLE,
    // on le rattache au plan « Découverte » (socle), et on vérifie que les routes admin
    // répondent 200 (elles ne dépendent QUE du rôle, jamais de requireFeature).
    const minimalAdmin = await createTestUser(admin, 'admin', 'ethique-min-admin')
    try {
      expect((await admin.patch(`/api/admin/users/${minimalAdmin.id}`, { plan_id: decouvertePlanId })).status).toBe(200)
      const s = await asUser({ email: minimalAdmin.email, password: minimalAdmin.password })
      expect((await s.get('/api/admin/effacements')).status).toBe(200)
      expect((await s.get('/api/admin/retention')).status).toBe(200)
    } finally {
      await deleteTestUser(admin, minimalAdmin)
    }
  })

  // =========================================================================================
  // POST /api/admin/effacements/:id  (traitement d'une demande : anonymiser | supprimer)
  // =========================================================================================

  it('TC-ETHIQUE-017 — Traiter une demande par anonymisation (compte @boussole.test) : 200 + demande traitée + compte anonymisé', async () => {
    const { user, demandeId } = await makeEffacementDemande('eff-anon')
    try {
      const r = await admin.post(`/api/admin/effacements/${demandeId}`, { action: 'anonymiser' })
      expect(r.status).toBe(200)
      expect(r.json.ok).toBe(true)
      expect(r.json.action).toBe('anonymiser')
      // La demande est marquée traitée (statut + action + traite_le renseignés).
      expect(scalar('SELECT statut FROM demandes_effacement WHERE id=?', demandeId)).toBe('traitee')
      expect(scalar('SELECT action FROM demandes_effacement WHERE id=?', demandeId)).toBe('anonymiser')
      expect(scalar('SELECT traite_le FROM demandes_effacement WHERE id=?', demandeId).length).toBeGreaterThan(0)
      // Le compte est anonymisé.
      expect(scalar('SELECT email FROM users WHERE id=?', user.id)).toBe(`anonyme-${user.id}@boussole.local`)
      expect(scalar('SELECT actif FROM users WHERE id=?', user.id)).toBe('0')
      expect(scalar('SELECT anonymise FROM users WHERE id=?', user.id)).toBe('1')
      // nom/prenom effacés (NULL → scalar renvoie '')
      expect(scalar('SELECT nom FROM users WHERE id=?', user.id)).toBe('')
      expect(scalar('SELECT prenom FROM users WHERE id=?', user.id)).toBe('')
    } finally {
      await deleteTestUser(admin, user) // idempotent : DELETE par id (compte anonymisé mais toujours présent)
    }
  })

  it('TC-ETHIQUE-018 — Traiter une demande par suppression (compte @boussole.test) : 200 + compte supprimé + demande en cascade', async () => {
    const { user, demandeId } = await makeEffacementDemande('eff-suppr')
    try {
      const r = await admin.post(`/api/admin/effacements/${demandeId}`, { action: 'supprimer' })
      expect(r.status).toBe(200)
      expect(r.json.ok).toBe(true)
      expect(r.json.action).toBe('supprimer')
      // Le user est supprimé (DELETE) ...
      expect(scalar('SELECT id FROM users WHERE id=?', user.id)).toBe('')
      // ... et la demande part en cascade (accompagne_id ... ON DELETE CASCADE) : aucune mise à jour de statut.
      expect(scalar('SELECT id FROM demandes_effacement WHERE id=?', demandeId)).toBe('')
      const list = await admin.get('/api/admin/effacements')
      const stillThere = (list.json.demandes as Array<{ id: number }>).some((d) => d.id === demandeId)
      expect(stillThere).toBe(false)
    } finally {
      await deleteTestUser(admin, user) // idempotent (déjà supprimé)
    }
  })

  it('TC-ETHIQUE-019 — Traiter un effacement : 400 si action absente ou invalide (aucune donnée modifiée)', async () => {
    const { user, demandeId } = await makeEffacementDemande('eff-bad')
    try {
      // Body vide → action '' → 400
      const r1 = await admin.post(`/api/admin/effacements/${demandeId}`, {})
      expect(r1.status).toBe(400)
      expect(r1.json.error).toBe('Action invalide (anonymiser | supprimer)')
      // action='foo' → 400
      const r2 = await admin.post(`/api/admin/effacements/${demandeId}`, { action: 'foo' })
      expect(r2.status).toBe(400)
      expect(r2.json.error).toBe('Action invalide (anonymiser | supprimer)')
      // La demande reste en_attente et le compte intact (rien n'a été traité).
      expect(scalar('SELECT statut FROM demandes_effacement WHERE id=?', demandeId)).toBe('en_attente')
      expect(scalar('SELECT anonymise FROM users WHERE id=?', user.id)).toBe('0')
    } finally {
      await deleteTestUser(admin, user)
    }
  })

  it('TC-ETHIQUE-020 — Traiter un effacement : 404 si la demande est introuvable', async () => {
    const r = await admin.post('/api/admin/effacements/99999999', { action: 'anonymiser' })
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Demande introuvable')
  })

  it('TC-ETHIQUE-021 — Traiter un effacement : 401 non authentifié / 403 mauvais rôle (aucune action)', async () => {
    const anon = new Session()
    const r1 = await anon.post('/api/admin/effacements/1', { action: 'anonymiser' })
    expect(r1.status).toBe(401)
    expect(r1.json.error).toBe('Non authentifié')
    // Accompagnateur (rôle non-admin) → 403 Accès refusé (requireRole avant le handler).
    const r2 = await mohamed.post('/api/admin/effacements/1', { action: 'anonymiser' })
    expect(r2.status).toBe(403)
    expect(r2.json.error).toBe('Accès refusé')
  })

  // =========================================================================================
  // POST /api/admin/rgpd/:userId  (action directe hors demande : anonymiser | supprimer)
  // =========================================================================================

  it('TC-ETHIQUE-022 — Action RGPD directe : anonymiser un compte hors demande (@boussole.test) : 200 + compte anonymisé', async () => {
    const user = await createTestUser(admin, 'accompagne', 'rgpd-anon')
    try {
      const r = await admin.post(`/api/admin/rgpd/${user.id}`, { action: 'anonymiser' })
      expect(r.status).toBe(200)
      expect(r.json.ok).toBe(true)
      expect(r.json.action).toBe('anonymiser')
      expect(scalar('SELECT email FROM users WHERE id=?', user.id)).toBe(`anonyme-${user.id}@boussole.local`)
      expect(scalar('SELECT actif FROM users WHERE id=?', user.id)).toBe('0')
      expect(scalar('SELECT anonymise FROM users WHERE id=?', user.id)).toBe('1')
      expect(scalar('SELECT nom FROM users WHERE id=?', user.id)).toBe('')
      expect(scalar('SELECT prenom FROM users WHERE id=?', user.id)).toBe('')
      // Les jetons (créés à l'activation) sont supprimés par anonymizeUser.
      expect(scalar('SELECT COUNT(*) AS n FROM tokens WHERE user_id=?', user.id)).toBe('0')
    } finally {
      await deleteTestUser(admin, user)
    }
  })

  it('TC-ETHIQUE-023 — Action RGPD directe : supprimer un compte hors demande (@boussole.test) : 200 + compte supprimé', async () => {
    const user = await createTestUser(admin, 'accompagne', 'rgpd-suppr')
    let supprime = false
    try {
      const r = await admin.post(`/api/admin/rgpd/${user.id}`, { action: 'supprimer' })
      expect(r.status).toBe(200)
      expect(r.json.ok).toBe(true)
      expect(r.json.action).toBe('supprimer')
      expect(scalar('SELECT id FROM users WHERE id=?', user.id)).toBe('') // DELETE FROM users
      supprime = true
    } finally {
      if (!supprime) await deleteTestUser(admin, user) // cleanup uniquement si la suppression n'a pas eu lieu
    }
  })

  it('TC-ETHIQUE-024 — Action RGPD directe : 400 si l\'admin cible son propre compte (avant toute recherche)', async () => {
    const r = await admin.post(`/api/admin/rgpd/${adminId}`, { action: 'anonymiser' })
    expect(r.status).toBe(400)
    expect(r.json.error).toBe('Action impossible sur votre propre compte')
    // Garde-fou : l'admin n'a pas été anonymisé.
    expect(scalar('SELECT anonymise FROM users WHERE id=?', adminId)).toBe('0')
  })

  it('TC-ETHIQUE-025 — Action RGPD directe : 404 si l\'utilisateur cible n\'existe pas', async () => {
    const r = await admin.post('/api/admin/rgpd/99999999', { action: 'anonymiser' })
    expect(r.status).toBe(404)
    expect(r.json.error).toBe('Utilisateur introuvable')
  })

  it('TC-ETHIQUE-026 — Action RGPD directe : 400 si action invalide (user existant ≠ soi, aucune modification)', async () => {
    const user = await createTestUser(admin, 'accompagne', 'rgpd-badaction')
    try {
      const r = await admin.post(`/api/admin/rgpd/${user.id}`, { action: 'effacer' })
      expect(r.status).toBe(400)
      expect(r.json.error).toBe('Action invalide')
      // Le compte est intact (la branche else échoue APRÈS la vérification d'existence).
      expect(scalar('SELECT anonymise FROM users WHERE id=?', user.id)).toBe('0')
      expect(scalar('SELECT email FROM users WHERE id=?', user.id)).toBe(user.email)
    } finally {
      await deleteTestUser(admin, user)
    }
  })

  it('TC-ETHIQUE-027 — Action RGPD directe : 401 non authentifié / 403 mauvais rôle (aucune suppression)', async () => {
    const anon = new Session()
    const r1 = await anon.post('/api/admin/rgpd/2', { action: 'supprimer' })
    expect(r1.status).toBe(401)
    expect(r1.json.error).toBe('Non authentifié')
    // Accompagné (rôle non-admin) → 403 Accès refusé.
    const r2 = await amine.post('/api/admin/rgpd/2', { action: 'supprimer' })
    expect(r2.status).toBe(403)
    expect(r2.json.error).toBe('Accès refusé')
  })

  // =========================================================================================
  // GET /api/admin/retention  &  POST /api/admin/retention/appliquer
  // =========================================================================================

  it('TC-ETHIQUE-028 — Politique de rétention (admin) : months, auto, liste des éligibles', async () => {
    const r = await admin.get('/api/admin/retention')
    expect(r.status).toBe(200)
    const b = r.json
    expect(typeof b.months).toBe('number')
    expect(b.months).toBe(36) // RETENTION_MONTHS par défaut
    expect(typeof b.auto).toBe('boolean')
    expect(b.auto).toBe(false) // RETENTION_AUTO non '1' par défaut
    expect(Array.isArray(b.eligibles)).toBe(true)
    for (const e of b.eligibles) {
      expect(typeof e.id).toBe('number')
      expect(typeof e.email).toBe('string')
      // derniere_activite : non NULL pour les éligibles (filtre IS NOT NULL)
      expect(typeof e.derniere_activite).toBe('string')
    }
  })

  it('TC-ETHIQUE-029 — Rétention : 401 non authentifié / 403 mauvais rôle', async () => {
    const anon = new Session()
    const r1 = await anon.get('/api/admin/retention')
    expect(r1.status).toBe(401)
    expect(r1.json.error).toBe('Non authentifié')
    const r2 = await mohamed.get('/api/admin/retention')
    expect(r2.status).toBe(403)
    expect(r2.json.error).toBe('Accès refusé')
  })

  it('TC-ETHIQUE-030 — Appliquer la rétention (admin) : 200 { ok, anonymises } cohérent avec la liste des éligibles', async () => {
    // Contrat seulement : le jeu de démo est récent, donc en pratique aucun compte n'est éligible
    // (anonymises=0). On vérifie la cohérence entre la liste GET et le décompte POST, sans dégrader
    // de compte démo. anonymises === nombre d'éligibles relevés juste avant.
    const before = await admin.get('/api/admin/retention')
    expect(before.status).toBe(200)
    const nbEligibles = (before.json.eligibles as unknown[]).length
    const r = await admin.post('/api/admin/retention/appliquer')
    expect(r.status).toBe(200)
    expect(r.json.ok).toBe(true)
    expect(typeof r.json.anonymises).toBe('number')
    expect(r.json.anonymises).toBe(nbEligibles)
    // Après application, les comptes traités ne figurent plus dans eligibles (anonymise=0 requis).
    const after = await admin.get('/api/admin/retention')
    expect(after.status).toBe(200)
    expect((after.json.eligibles as unknown[]).length).toBe(0)
  })

  it('TC-ETHIQUE-031 — Appliquer la rétention quand aucun compte n\'est éligible : 200 { ok:true, anonymises:0 }', async () => {
    // Sur le jeu de démo récent, eligibles=[] : un second appel renvoie un décompte nul.
    const retention = await admin.get('/api/admin/retention')
    expect(retention.status).toBe(200)
    expect((retention.json.eligibles as unknown[]).length).toBe(0)
    const r = await admin.post('/api/admin/retention/appliquer')
    expect(r.status).toBe(200)
    expect(r.json.ok).toBe(true)
    expect(r.json.anonymises).toBe(0)
  })

  it('TC-ETHIQUE-032 — Appliquer la rétention : 401 non authentifié / 403 mauvais rôle (aucune anonymisation)', async () => {
    const anon = new Session()
    const r1 = await anon.post('/api/admin/retention/appliquer')
    expect(r1.status).toBe(401)
    expect(r1.json.error).toBe('Non authentifié')
    const r2 = await karim.post('/api/admin/retention/appliquer')
    expect(r2.status).toBe(403)
    expect(r2.json.error).toBe('Accès refusé')
  })
})
