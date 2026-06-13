import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'node:child_process'
import { Session, asUser, DEMO } from '../helpers/api'
import { createTestUser, deleteTestUser, type TestUser } from '../helpers/fixtures'
import { latestToken } from '../helpers/db'

// =============================================================================
// Tests d'intégration API — domaine AUTH (Boussole), stack Docker :8080.
// Couvre EXHAUSTIVEMENT les cas de niveau "api" du catalogue : TC-AUTH-001..051.
// (Les cas 052..058 sont "unitaire" et 059..069 "ui" : hors périmètre de ce fichier.)
//
// Déterminisme & isolation :
//  - Tous les comptes créés par inscription publique utilisent un suffixe unique
//    de run (@boussole.test) supprimé en afterAll par SQL ciblé.
//  - Les scénarios destructifs (change-password, change-email, plan Découverte)
//    passent par createTestUser/deleteTestUser (comptes jetables RGPD).
//  - Les comptes démo ne sont jamais dégradés durablement : on ne les utilise
//    qu'en lecture (login OK/KO) ; les tokens reset créés au passage sont nettoyés.
// =============================================================================

const CONTAINER = process.env.BOUSSOLE_API_CONTAINER || 'boussole-api-local'
const OPEN_RW = `const db=require('better-sqlite3')(process.env.DB_PATH||'./data/boussole.sqlite');`
const OPEN_RO = `const db=require('better-sqlite3')(process.env.DB_PATH||'./data/boussole.sqlite',{readonly:true});`

/** Exécute un script Node DANS le conteneur API (script sur stdin pour éviter le quoting). */
function runInContainer(js: string): string {
  return execSync(`docker exec -i ${CONTAINER} node`, { input: js, encoding: 'utf8' }).trim()
}

/** Lecture d'une valeur scalaire (1ère colonne de la 1ère ligne), '' si absente. */
function readScalar(sql: string, params: unknown[] = []): string {
  const js = `${OPEN_RO}const r=db.prepare(${JSON.stringify(sql)}).get(${params.map((p) => JSON.stringify(p)).join(',')});const v=r?Object.values(r)[0]:null;process.stdout.write(v==null?'':String(v))`
  return runInContainer(js)
}

/** Exécute une mutation SQL ponctuelle (forcer expiration, désactivation, nettoyage). */
function execSql(sql: string, params: unknown[] = []): void {
  const js = `${OPEN_RW}db.prepare(${JSON.stringify(sql)}).run(${params.map((p) => JSON.stringify(p)).join(',')});process.stdout.write('ok')`
  runInContainer(js)
}

// Suffixe unique de run : garantit des emails frais et un nettoyage ciblé.
const RUN = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`
const mail = (slug: string) => `tc-auth-${slug}-${RUN}@boussole.test`
const REGISTER_PW = 'MotDePasse1'

/** Inscrit un compte accompagné (email_verifie=0) et renvoie son email. */
async function register(email: string, extra: Record<string, unknown> = {}): Promise<void> {
  const s = new Session()
  const r = await s.post('/api/auth/register', { email, password: REGISTER_PW, role: 'accompagne', consent: true, ...extra })
  if (r.status !== 201) throw new Error(`Inscription de préparation échouée (${r.status}) pour ${email} : ${JSON.stringify(r.json)}`)
}

describe('AUTH — API', () => {
  let admin: Session
  let allFeatureKeys: string[] = [] // registre complet des clés (récupéré via l'admin)
  const createdUsers: TestUser[] = [] // comptes jetables admin (RGPD)

  beforeAll(async () => {
    admin = await asUser(DEMO.admin)
    // Source de vérité du registre complet des fonctionnalités : GET /api/admin/features → { all }.
    allFeatureKeys = (await admin.get('/api/admin/features')).json.all
    expect(Array.isArray(allFeatureKeys)).toBe(true)
    expect(allFeatureKeys.length).toBeGreaterThan(0)
  })

  afterAll(async () => {
    // Comptes jetables créés via l'admin → suppression RGPD.
    for (const u of createdUsers) {
      try { await deleteTestUser(admin, u) } catch { /* idempotent */ }
    }
    // Tous les comptes @boussole.test de ce run créés par inscription publique + leurs traces.
    try {
      execSql(
        `DELETE FROM tokens WHERE user_id IN (SELECT id FROM users WHERE email LIKE ?)`,
        [`%${RUN}@boussole.test`],
      )
      execSql(
        `DELETE FROM consentements WHERE user_id IN (SELECT id FROM users WHERE email LIKE ?)`,
        [`%${RUN}@boussole.test`],
      )
      execSql(`DELETE FROM users WHERE email LIKE ?`, [`%${RUN}@boussole.test`])
    } catch { /* best-effort */ }
  })

  // ---------------------------------------------------------------------------
  // POST /api/auth/register
  // ---------------------------------------------------------------------------

  it('TC-AUTH-001 — inscription nominale accompagné valide retourne 201 + effets en base', async () => {
    const email = mail('reg-nominal')
    const s = new Session()
    const r = await s.post('/api/auth/register', {
      email, password: REGISTER_PW, role: 'accompagne', nom: 'Test', prenom: 'Nelly', consent: true,
    })
    expect(r.status).toBe(201)
    expect(r.json.ok).toBe(true)
    expect(typeof r.json.message).toBe('string')
    expect(r.json.message.length).toBeGreaterThan(0)
    // Une ligne users (non vérifiée), un consentement v1.0/1.0, un token verif_email non utilisé.
    expect(readScalar('SELECT email_verifie FROM users WHERE email=?', [email])).toBe('0')
    expect(readScalar('SELECT version_cgu FROM consentements WHERE user_id=(SELECT id FROM users WHERE email=?)', [email])).toBe('1.0')
    expect(readScalar('SELECT version_pc FROM consentements WHERE user_id=(SELECT id FROM users WHERE email=?)', [email])).toBe('1.0')
    expect(readScalar("SELECT COUNT(*) FROM tokens WHERE type='verif_email' AND utilise=0 AND user_id=(SELECT id FROM users WHERE email=?)", [email])).toBe('1')
  })

  it('TC-AUTH-002 — inscription accompagnateur valide sans nom/prénom retourne 201', async () => {
    const email = mail('reg-accompagnateur')
    const s = new Session()
    const r = await s.post('/api/auth/register', { email, password: REGISTER_PW, role: 'accompagnateur', consent: true })
    expect(r.status).toBe(201)
    expect(readScalar('SELECT role FROM users WHERE email=?', [email])).toBe('accompagnateur')
    // nom/prenom omis → NULL (readScalar renvoie '' pour NULL).
    expect(readScalar('SELECT nom FROM users WHERE email=?', [email])).toBe('')
    expect(readScalar('SELECT prenom FROM users WHERE email=?', [email])).toBe('')
    expect(readScalar("SELECT COUNT(*) FROM tokens WHERE type='verif_email' AND user_id=(SELECT id FROM users WHERE email=?)", [email])).toBe('1')
  })

  it('TC-AUTH-003 — inscription refusée si mot de passe de 7 caractères retourne 400', async () => {
    const email = mail('reg-court')
    const s = new Session()
    const r = await s.post('/api/auth/register', { email, password: 'Abcdef1', role: 'accompagne', consent: true })
    expect(r.status).toBe(400)
    expect(r.json.error).toMatch(/mot de passe/i)
    expect(readScalar('SELECT COUNT(*) FROM users WHERE email=?', [email])).toBe('0')
  })

  it('TC-AUTH-004 — inscription acceptée à la limite basse de 8 caractères retourne 201', async () => {
    const email = mail('reg-limite8')
    const s = new Session()
    const r = await s.post('/api/auth/register', { email, password: 'Abcdefg1', role: 'accompagne', consent: true })
    expect(r.status).toBe(201)
    expect(readScalar('SELECT COUNT(*) FROM users WHERE email=?', [email])).toBe('1')
  })

  it('TC-AUTH-005 — inscription refusée si consentement absent OU false retourne 400', async () => {
    const emailA = mail('reg-noconsent')
    const emailB = mail('reg-consentfalse')
    const s = new Session()
    // Variante A : consent absent.
    const a = await s.post('/api/auth/register', { email: emailA, password: REGISTER_PW, role: 'accompagne' })
    expect(a.status).toBe(400)
    // Variante B : consent === false.
    const b = await s.post('/api/auth/register', { email: emailB, password: REGISTER_PW, role: 'accompagne', consent: false })
    expect(b.status).toBe(400)
    expect(readScalar('SELECT COUNT(*) FROM users WHERE email IN (?,?)', [emailA, emailB])).toBe('0')
  })

  it('TC-AUTH-006 — inscription refusée si email mal formé retourne 400', async () => {
    const s = new Session()
    const r = await s.post('/api/auth/register', { email: 'pasunemail', password: REGISTER_PW, role: 'accompagne', consent: true })
    expect(r.status).toBe(400)
    expect(readScalar('SELECT COUNT(*) FROM users WHERE email=?', ['pasunemail'])).toBe('0')
  })

  it('TC-AUTH-007 — inscription refusée si rôle invalide (admin / inconnu) retourne 400', async () => {
    const emailAdmin = mail('reg-roleadmin')
    const emailInconnu = mail('reg-roleinconnu')
    const s = new Session()
    const a = await s.post('/api/auth/register', { email: emailAdmin, password: REGISTER_PW, role: 'admin', consent: true })
    expect(a.status).toBe(400)
    const b = await s.post('/api/auth/register', { email: emailInconnu, password: REGISTER_PW, role: 'inconnu', consent: true })
    expect(b.status).toBe(400)
    expect(readScalar('SELECT COUNT(*) FROM users WHERE email IN (?,?)', [emailAdmin, emailInconnu])).toBe('0')
  })

  it('TC-AUTH-008 — inscription en conflit (email déjà existant) retourne 409', async () => {
    const s = new Session()
    const r = await s.post('/api/auth/register', { email: DEMO.amine.email, password: REGISTER_PW, role: 'accompagne', consent: true })
    expect(r.status).toBe(409)
    expect(r.json.error).toBe('Un compte existe déjà avec cet email')
  })

  it('TC-AUTH-009 — inscription refusée si nom vide explicite ("") retourne 400', async () => {
    const email = mail('reg-nomvide')
    const s = new Session()
    const r = await s.post('/api/auth/register', { email, password: REGISTER_PW, role: 'accompagne', nom: '', consent: true })
    expect(r.status).toBe(400)
    expect(readScalar('SELECT COUNT(*) FROM users WHERE email=?', [email])).toBe('0')
  })

  // ---------------------------------------------------------------------------
  // GET /api/auth/verify-email
  // ---------------------------------------------------------------------------

  it('TC-AUTH-010 — vérification d’email nominale active le compte (200) puis TC-AUTH-013 rejoue 400', async () => {
    // couvre TC-AUTH-010 et TC-AUTH-013 (rejouabilité interdite : utilise=1 exclu du WHERE)
    const email = mail('verify-ok')
    await register(email)
    const token = latestToken(email, 'verif_email')
    expect(token).not.toBe('')

    const s = new Session()
    const r = await s.get(`/api/auth/verify-email?token=${token}`)
    expect(r.status).toBe(200)
    expect(r.json.ok).toBe(true)
    expect(r.json.message).toBe('Email vérifié. Vous pouvez vous connecter.')
    expect(readScalar('SELECT email_verifie FROM users WHERE email=?', [email])).toBe('1')
    expect(readScalar('SELECT utilise FROM tokens WHERE valeur=?', [token])).toBe('1')

    // TC-AUTH-013 : rejouer le même jeton (désormais utilise=1) → 400.
    const replay = await s.get(`/api/auth/verify-email?token=${token}`)
    expect(replay.status).toBe(400)
    expect(replay.json.error).toBe('Lien invalide ou expiré')
  })

  it('TC-AUTH-011 — vérification d’email avec jeton inexistant retourne 400', async () => {
    const s = new Session()
    const r = await s.get('/api/auth/verify-email?token=deadbeef000000')
    expect(r.status).toBe(400)
    expect(r.json.error).toBe('Lien invalide ou expiré')
  })

  it('TC-AUTH-012 — vérification d’email avec jeton expiré retourne 400', async () => {
    const email = mail('verify-expire')
    await register(email)
    const token = latestToken(email, 'verif_email')
    expect(token).not.toBe('')
    // Forcer l'expiration en base.
    execSql("UPDATE tokens SET expire_le='2000-01-01T00:00:00.000Z' WHERE valeur=?", [token])

    const s = new Session()
    const r = await s.get(`/api/auth/verify-email?token=${token}`)
    expect(r.status).toBe(400)
    expect(r.json.error).toBe('Lien invalide ou expiré')
    // Compte resté non activé.
    expect(readScalar('SELECT email_verifie FROM users WHERE email=?', [email])).toBe('0')
  })

  it('TC-AUTH-014 — vérification d’email sans paramètre token retourne 400', async () => {
    const s = new Session()
    const r = await s.get('/api/auth/verify-email')
    expect(r.status).toBe(400)
    expect(r.json.error).toBe('Lien invalide ou expiré')
  })

  it('TC-AUTH-015 — confirmation de changement d’e-mail via jeton email_cible met à jour l’adresse', async () => {
    // Compte jetable connecté → change-email → on lit le token email_cible et on confirme.
    const u = await createTestUser(admin, 'accompagne', 'chgmail-ok')
    createdUsers.push(u)
    const s = await asUser({ email: u.email, password: u.password })
    const cible = mail('chgmail-cible')
    const ce = await s.post('/api/auth/change-email', { email: cible })
    expect(ce.status).toBe(200)
    expect(readScalar('SELECT email_pending FROM users WHERE id=?', [u.id])).toBe(cible)

    const token = readScalar("SELECT valeur FROM tokens WHERE user_id=? AND type='verif_email' AND email_cible=? AND utilise=0 ORDER BY id DESC LIMIT 1", [u.id, cible])
    expect(token).not.toBe('')

    const anon = new Session()
    const r = await anon.get(`/api/auth/verify-email?token=${token}`)
    expect(r.status).toBe(200)
    expect(r.json.message).toBe('Nouvelle adresse e-mail confirmée.')
    expect(readScalar('SELECT email FROM users WHERE id=?', [u.id])).toBe(cible)
    expect(readScalar('SELECT email_pending FROM users WHERE id=?', [u.id])).toBe('') // NULL
    expect(readScalar('SELECT email_verifie FROM users WHERE id=?', [u.id])).toBe('1')
    expect(readScalar('SELECT utilise FROM tokens WHERE valeur=?', [token])).toBe('1')
    // u.email a changé : mettre à jour pour le nettoyage RGPD afterAll.
    u.email = cible
  })

  it('TC-AUTH-016 — confirmation de changement d’e-mail bloquée si la cible est prise entre-temps retourne 409', async () => {
    const u = await createTestUser(admin, 'accompagne', 'chgmail-collision')
    createdUsers.push(u)
    const s = await asUser({ email: u.email, password: u.password })
    const cible = mail('collision')
    const ce = await s.post('/api/auth/change-email', { email: cible })
    expect(ce.status).toBe(200)
    const token = readScalar("SELECT valeur FROM tokens WHERE user_id=? AND type='verif_email' AND email_cible=? AND utilise=0 ORDER BY id DESC LIMIT 1", [u.id, cible])
    expect(token).not.toBe('')

    // Entre-temps, un AUTRE compte prend l'adresse cible (inscription publique).
    await register(cible)
    const emailCourantAvant = readScalar('SELECT email FROM users WHERE id=?', [u.id])

    const anon = new Session()
    const r = await anon.get(`/api/auth/verify-email?token=${token}`)
    expect(r.status).toBe(409)
    expect(r.json.error).toBe('Cette adresse e-mail est désormais utilisée par un autre compte.')
    // Adresse courante inchangée, jeton NON consommé.
    expect(readScalar('SELECT email FROM users WHERE id=?', [u.id])).toBe(emailCourantAvant)
    expect(readScalar('SELECT utilise FROM tokens WHERE valeur=?', [token])).toBe('0')
  })

  // ---------------------------------------------------------------------------
  // POST /api/auth/login
  // ---------------------------------------------------------------------------

  it('TC-AUTH-017 — connexion nominale d’un compte vérifié pose le cookie et renvoie l’utilisateur', async () => {
    const s = new Session()
    const r = await s.login(DEMO.amine.email, DEMO.amine.password)
    expect(r.status).toBe(200)
    expect(r.json.user).toMatchObject({ email: DEMO.amine.email, role: 'accompagne' })
    expect(typeof r.json.user.id).toBe('number')
    expect('nom' in r.json.user).toBe(true)
    expect('prenom' in r.json.user).toBe(true)
    // Pas de hash exposé.
    expect(r.json.user.password_hash).toBeUndefined()
    // Cookie de session httpOnly posé.
    const setCookie = r.headers.get('set-cookie') || ''
    expect(setCookie).toMatch(/boussole_token=/)
    expect(setCookie).toMatch(/HttpOnly/i)
    expect(setCookie).toMatch(/SameSite=Lax/i)
    // Le client a bien capté le cookie → /me fonctionne.
    expect((await s.get('/api/auth/me')).status).toBe(200)
  })

  it('TC-AUTH-018 — connexion refusée avec mot de passe incorrect retourne 401', async () => {
    const s = new Session()
    const r = await s.login(DEMO.amine.email, 'MauvaisMotDePasse')
    expect(r.status).toBe(401)
    expect(r.json.error).toBe('Identifiants incorrects')
    expect(s.cookie).toBe('')
  })

  it('TC-AUTH-019 — connexion refusée avec email inconnu retourne 401 (anti-énumération)', async () => {
    const s = new Session()
    const r = await s.login('inexistant@boussole.demo', REGISTER_PW)
    expect(r.status).toBe(401)
    expect(r.json.error).toBe('Identifiants incorrects')
  })

  it('TC-AUTH-020 — connexion refusée pour compte non vérifié retourne 403', async () => {
    const email = mail('login-nonverifie')
    await register(email) // email_verifie=0
    const s = new Session()
    const r = await s.login(email, REGISTER_PW)
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('Email non vérifié. Consultez votre boîte mail.')
    expect(s.cookie).toBe('')
  })

  it('TC-AUTH-021 — connexion refusée pour compte désactivé retourne 403 (avant la comparaison du mdp)', async () => {
    const u = await createTestUser(admin, 'accompagne', 'login-desactive')
    createdUsers.push(u)
    // Désactivation propre via l'admin.
    expect((await admin.patch(`/api/admin/users/${u.id}`, { actif: false })).status).toBe(200)
    const s = new Session()
    const r = await s.login(u.email, u.password)
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('Compte désactivé')
  })

  it('TC-AUTH-022 — connexion refusée si corps invalide retourne 400 (deux variantes)', async () => {
    const s = new Session()
    const a = await s.login('pasunemail', 'x')
    expect(a.status).toBe(400)
    expect(a.json.error).toBe('Données invalides')
    const b = await s.post('/api/auth/login', { email: 'a@b.fr' }) // password manquant
    expect(b.status).toBe(400)
    expect(b.json.error).toBe('Données invalides')
  })

  // ---------------------------------------------------------------------------
  // POST /api/auth/logout
  // ---------------------------------------------------------------------------

  it('TC-AUTH-023 — déconnexion efface le cookie de session', async () => {
    const s = await asUser(DEMO.amine)
    const r = await s.logout()
    expect(r.status).toBe(200)
    expect(r.json.ok).toBe(true)
    const setCookie = r.headers.get('set-cookie') || ''
    expect(setCookie).toMatch(/boussole_token=/)
    // Effacement : Expires dans le passé ou Max-Age=0.
    expect(/Max-Age=0/i.test(setCookie) || /Expires=Thu, 01 Jan 1970/i.test(setCookie) || /boussole_token=;/.test(setCookie)).toBe(true)
    // Le client a vidé son cookie → /me redevient 401.
    expect(s.cookie).toBe('')
    expect((await s.get('/api/auth/me')).status).toBe(401)
  })

  // ---------------------------------------------------------------------------
  // GET /api/auth/me
  // ---------------------------------------------------------------------------

  it('TC-AUTH-024 — GET /me nominal renvoie le profil de l’utilisateur authentifié', async () => {
    const s = await asUser(DEMO.amine)
    const r = await s.get('/api/auth/me')
    expect(r.status).toBe(200)
    expect(r.json.user).toMatchObject({ email: DEMO.amine.email, role: 'accompagne' })
    expect(typeof r.json.user.id).toBe('number')
    expect('nom' in r.json.user).toBe(true)
    expect('prenom' in r.json.user).toBe(true)
    expect(r.json.user.password_hash).toBeUndefined()
  })

  it('TC-AUTH-025 — GET /me sans cookie retourne 401 Non authentifié', async () => {
    const s = new Session()
    const r = await s.get('/api/auth/me')
    expect(r.status).toBe(401)
    expect(r.json.error).toBe('Non authentifié')
  })

  it('TC-AUTH-026 — GET /me avec JWT altéré retourne 401 Session invalide', async () => {
    const s = new Session()
    s.cookie = 'boussole_token=eyJ.invalide.signature'
    const r = await s.get('/api/auth/me')
    expect(r.status).toBe(401)
    expect(r.json.error).toBe('Session invalide')
  })

  // ---------------------------------------------------------------------------
  // GET /api/auth/me/features
  // ---------------------------------------------------------------------------

  it('TC-AUTH-027 — GET /me/features sans plan renvoie TOUTES les fonctionnalités', async () => {
    const s = await asUser(DEMO.amine) // compte démo sans plan
    const r = await s.get('/api/auth/me/features')
    expect(r.status).toBe(200)
    expect(Array.isArray(r.json.features)).toBe(true)
    r.json.features.forEach((f: unknown) => expect(typeof f).toBe('string'))
    // Toutes les clés du registre présentes (aucun plan = niveau max).
    for (const key of allFeatureKeys) expect(r.json.features).toContain(key)
    expect(r.json.features.length).toBe(allFeatureKeys.length)
  })

  it('TC-AUTH-028 — GET /me/features avec plan Découverte renvoie exactement le sous-ensemble socle', async () => {
    const u = await createTestUser(admin, 'accompagnateur', 'features-decouverte')
    createdUsers.push(u)
    const decouverte = (await admin.get('/api/admin/plans')).json.plans.find((p: any) => p.nom === 'Découverte')
    expect(decouverte).toBeTruthy()
    expect((await admin.patch(`/api/admin/users/${u.id}`, { plan_id: decouverte.id })).status).toBe(200)

    const s = await asUser({ email: u.email, password: u.password })
    const r = await s.get('/api/auth/me/features')
    expect(r.status).toBe(200)
    // Exactement les features stockées dans le plan (socle), ni plus ni moins.
    expect([...r.json.features].sort()).toEqual([...decouverte.features].sort())
    // Sous-ensemble strict : hors-socle absent.
    expect(r.json.features).not.toContain('export_pdf')
    expect(r.json.features).not.toContain('miroir')
    expect(r.json.features.length).toBeLessThan(allFeatureKeys.length)
  })

  it('TC-AUTH-029 — GET /me/features sans authentification retourne 401', async () => {
    const s = new Session()
    const r = await s.get('/api/auth/me/features')
    expect(r.status).toBe(401)
    expect(r.json.error).toBe('Non authentifié')
  })

  // ---------------------------------------------------------------------------
  // PATCH /api/auth/me
  // ---------------------------------------------------------------------------

  it('TC-AUTH-030 — PATCH /me met à jour prénom et nom (avec persistance)', async () => {
    const u = await createTestUser(admin, 'accompagne', 'patch-me')
    createdUsers.push(u)
    const s = await asUser({ email: u.email, password: u.password })
    const r = await s.patch('/api/auth/me', { prenom: 'Amine', nom: 'El Afrit' })
    expect(r.status).toBe(200)
    expect(r.json.user).toMatchObject({ prenom: 'Amine', nom: 'El Afrit' })
    // Persistance confirmée en relecture.
    const me = await s.get('/api/auth/me')
    expect(me.json.user).toMatchObject({ prenom: 'Amine', nom: 'El Afrit' })
  })

  it('TC-AUTH-031 — PATCH /me normalise chaînes vides/espaces en NULL', async () => {
    const u = await createTestUser(admin, 'accompagne', 'patch-me-null')
    createdUsers.push(u)
    const s = await asUser({ email: u.email, password: u.password })
    const r = await s.patch('/api/auth/me', { prenom: '   ', nom: '' })
    expect(r.status).toBe(200)
    expect(r.json.user.prenom).toBeNull()
    expect(r.json.user.nom).toBeNull()
    const me = await s.get('/api/auth/me')
    expect(me.json.user.prenom).toBeNull()
    expect(me.json.user.nom).toBeNull()
  })

  it('TC-AUTH-032 — PATCH /me refuse un prénom de 81 caractères (400) et accepte 80 (200)', async () => {
    const u = await createTestUser(admin, 'accompagne', 'patch-me-max')
    createdUsers.push(u)
    const s = await asUser({ email: u.email, password: u.password })
    const tooLong = 'a'.repeat(81)
    const ko = await s.patch('/api/auth/me', { prenom: tooLong })
    expect(ko.status).toBe(400)
    expect(ko.json.error).toBe('Données invalides')
    const exactly80 = 'b'.repeat(80)
    const ok = await s.patch('/api/auth/me', { prenom: exactly80 })
    expect(ok.status).toBe(200)
    expect(ok.json.user.prenom).toBe(exactly80)
  })

  it('TC-AUTH-033 — PATCH /me sans authentification retourne 401', async () => {
    const s = new Session()
    const r = await s.patch('/api/auth/me', { prenom: 'X' })
    expect(r.status).toBe(401)
    expect(r.json.error).toBe('Non authentifié')
  })

  // ---------------------------------------------------------------------------
  // POST /api/auth/change-password
  // ---------------------------------------------------------------------------

  it('TC-AUTH-034 — changement de mot de passe nominal avec ancien correct (puis reconnexion)', async () => {
    const u = await createTestUser(admin, 'accompagne', 'chgpwd-ok')
    createdUsers.push(u)
    const s = await asUser({ email: u.email, password: u.password })
    const nouveau = 'NouveauMdp1'
    const r = await s.post('/api/auth/change-password', { ancien: u.password, nouveau })
    expect(r.status).toBe(200)
    expect(r.json.ok).toBe(true)
    // Reconnexion avec le nouveau mdp réussit, avec l'ancien échoue.
    const s2 = new Session()
    expect((await s2.login(u.email, nouveau)).status).toBe(200)
    expect((await new Session().login(u.email, u.password)).status).toBe(401)
    u.password = nouveau // garder la cohérence (non strictement nécessaire pour la suppression RGPD)
  })

  it('TC-AUTH-035 — changement de mot de passe refusé si ancien incorrect retourne 400', async () => {
    const u = await createTestUser(admin, 'accompagne', 'chgpwd-badold')
    createdUsers.push(u)
    const s = await asUser({ email: u.email, password: u.password })
    const r = await s.post('/api/auth/change-password', { ancien: 'PasLeBon', nouveau: 'NouveauMdp1' })
    expect(r.status).toBe(400)
    expect(r.json.error).toBe('Mot de passe actuel incorrect.')
    // Mot de passe inchangé : l'ancien fonctionne toujours.
    expect((await new Session().login(u.email, u.password)).status).toBe(200)
  })

  it('TC-AUTH-036 — changement de mot de passe refusé si nouveau < 8 caractères retourne 400', async () => {
    const u = await createTestUser(admin, 'accompagne', 'chgpwd-short')
    createdUsers.push(u)
    const s = await asUser({ email: u.email, password: u.password })
    const r = await s.post('/api/auth/change-password', { ancien: u.password, nouveau: 'Court12' }) // 7 car.
    expect(r.status).toBe(400)
    expect(r.json.error).toBe('Le nouveau mot de passe doit faire au moins 8 caractères.')
  })

  it('TC-AUTH-037 — changement de mot de passe sans authentification retourne 401', async () => {
    const s = new Session()
    const r = await s.post('/api/auth/change-password', { ancien: 'x', nouveau: 'NouveauMdp1' })
    expect(r.status).toBe(401)
    expect(r.json.error).toBe('Non authentifié')
  })

  // ---------------------------------------------------------------------------
  // POST /api/auth/change-email
  // ---------------------------------------------------------------------------

  it('TC-AUTH-038 — changement d’e-mail nominal émet un lien et met l’e-mail en attente', async () => {
    const u = await createTestUser(admin, 'accompagne', 'chgmail-nominal')
    createdUsers.push(u)
    const s = await asUser({ email: u.email, password: u.password })
    // Pré-existant : émettre un premier lien verif pour vérifier qu'il est annulé.
    await s.post('/api/auth/change-email', { email: mail('chgmail-premier') })
    const cible = mail('chgmail-nouvelle')
    const r = await s.post('/api/auth/change-email', { email: cible })
    expect(r.status).toBe(200)
    expect(r.json.ok).toBe(true)
    expect(typeof r.json.message).toBe('string')
    // email courant inchangé, email_pending = nouvelle adresse.
    expect(readScalar('SELECT email FROM users WHERE id=?', [u.id])).toBe(u.email)
    expect(readScalar('SELECT email_pending FROM users WHERE id=?', [u.id])).toBe(cible)
    // Un token verif_email non utilisé avec email_cible=cible.
    expect(readScalar("SELECT COUNT(*) FROM tokens WHERE user_id=? AND type='verif_email' AND email_cible=? AND utilise=0", [u.id, cible])).toBe('1')
    // Anciens tokens verif_email du même user consommés (un seul non utilisé restant : le nouveau).
    expect(readScalar("SELECT COUNT(*) FROM tokens WHERE user_id=? AND type='verif_email' AND utilise=0", [u.id])).toBe('1')
  })

  it('TC-AUTH-039 — changement d’e-mail refusé si identique à l’adresse actuelle (insensible à la casse) retourne 400', async () => {
    const u = await createTestUser(admin, 'accompagne', 'chgmail-same')
    createdUsers.push(u)
    const s = await asUser({ email: u.email, password: u.password })
    const r = await s.post('/api/auth/change-email', { email: u.email.toUpperCase() })
    expect(r.status).toBe(400)
    expect(r.json.error).toBe('C’est déjà votre adresse actuelle.')
  })

  it('TC-AUTH-040 — changement d’e-mail refusé si adresse déjà prise par un autre compte retourne 409', async () => {
    const u = await createTestUser(admin, 'accompagne', 'chgmail-taken')
    createdUsers.push(u)
    const s = await asUser({ email: u.email, password: u.password })
    const r = await s.post('/api/auth/change-email', { email: DEMO.lea.email })
    expect(r.status).toBe(409)
    expect(r.json.error).toBe('Cette adresse est déjà utilisée par un autre compte.')
    // Aucun email_pending ni token émis.
    expect(readScalar('SELECT email_pending FROM users WHERE id=?', [u.id])).toBe('')
    expect(readScalar("SELECT COUNT(*) FROM tokens WHERE user_id=? AND type='verif_email' AND email_cible=?", [u.id, DEMO.lea.email])).toBe('0')
  })

  it('TC-AUTH-041 — changement d’e-mail refusé si adresse mal formée retourne 400', async () => {
    const u = await createTestUser(admin, 'accompagne', 'chgmail-invalid')
    createdUsers.push(u)
    const s = await asUser({ email: u.email, password: u.password })
    const r = await s.post('/api/auth/change-email', { email: 'pas-un-email' })
    expect(r.status).toBe(400)
    expect(r.json.error).toBe('Adresse e-mail invalide.')
  })

  it('TC-AUTH-042 — changement d’e-mail sans authentification retourne 401', async () => {
    const s = new Session()
    const r = await s.post('/api/auth/change-email', { email: 'x@boussole.demo' })
    expect(r.status).toBe(401)
    expect(r.json.error).toBe('Non authentifié')
  })

  // ---------------------------------------------------------------------------
  // POST /api/auth/request-reset
  // ---------------------------------------------------------------------------

  it('TC-AUTH-043 — demande de réinitialisation pour un compte existant émet un jeton et répond 200 générique', async () => {
    // Compte jetable pour ne pas polluer un compte démo de tokens reset.
    const u = await createTestUser(admin, 'accompagne', 'reqreset-ok')
    createdUsers.push(u)
    const s = new Session()
    const r = await s.post('/api/auth/request-reset', { email: u.email })
    expect(r.status).toBe(200)
    expect(r.json.ok).toBe(true)
    expect(r.json.message).toBe('Si un compte existe, un email a été envoyé.')
    // Un token reset_mdp non utilisé a été créé, expirant ~2h plus tard (donc futur).
    const token = latestToken(u.email, 'reset_mdp')
    expect(token).not.toBe('')
    const expire = readScalar('SELECT expire_le FROM tokens WHERE valeur=?', [token])
    expect(expire > new Date().toISOString()).toBe(true)
  })

  it('TC-AUTH-044 — demande de réinitialisation pour un email inconnu répond 200 (anti-énumération) sans créer de jeton', async () => {
    const email = mail('reqreset-unknown') // n'existe pas en base
    const s = new Session()
    const r = await s.post('/api/auth/request-reset', { email })
    expect(r.status).toBe(200)
    // Réponse strictement identique au cas existant.
    expect(r.json).toMatchObject({ ok: true, message: 'Si un compte existe, un email a été envoyé.' })
    // Aucun utilisateur, donc aucun jeton.
    expect(latestToken(email, 'reset_mdp')).toBe('')
  })

  it('TC-AUTH-045 — demande de réinitialisation avec email mal formé retourne 400', async () => {
    const s = new Session()
    const r = await s.post('/api/auth/request-reset', { email: 'arobase-manquant' })
    expect(r.status).toBe(400)
    expect(r.json.error).toBe('Email invalide')
  })

  // ---------------------------------------------------------------------------
  // POST /api/auth/reset
  // ---------------------------------------------------------------------------

  it('TC-AUTH-046 — réinitialisation nominale change le mdp et vérifie l’email (200) puis TC-AUTH-049 rejoue 400', async () => {
    // couvre TC-AUTH-046 et TC-AUTH-049 (jeton à usage unique : WHERE utilise=0)
    const u = await createTestUser(admin, 'accompagne', 'reset-ok')
    createdUsers.push(u)
    // Demander un reset, lire le token.
    expect((await new Session().post('/api/auth/request-reset', { email: u.email })).status).toBe(200)
    const token = latestToken(u.email, 'reset_mdp')
    expect(token).not.toBe('')

    const s = new Session()
    const nouveau = 'ResetMdp123'
    const r = await s.post('/api/auth/reset', { token, password: nouveau })
    expect(r.status).toBe(200)
    expect(r.json.ok).toBe(true)
    expect(typeof r.json.message).toBe('string')
    expect(readScalar('SELECT email_verifie FROM users WHERE id=?', [u.id])).toBe('1')
    expect(readScalar('SELECT utilise FROM tokens WHERE valeur=?', [token])).toBe('1')
    // Connexion réussie avec le nouveau mot de passe.
    expect((await new Session().login(u.email, nouveau)).status).toBe(200)
    u.password = nouveau

    // TC-AUTH-049 : rejouer le même token (utilise=1) → 400.
    const replay = await new Session().post('/api/auth/reset', { token, password: 'AutreMdp123' })
    expect(replay.status).toBe(400)
    expect(replay.json.error).toBe('Lien invalide ou expiré')
  })

  it('TC-AUTH-047 — réinitialisation refusée avec jeton invalide retourne 400', async () => {
    const s = new Session()
    const r = await s.post('/api/auth/reset', { token: 'jetoninexistant', password: 'ResetMdp123' })
    expect(r.status).toBe(400)
    expect(r.json.error).toBe('Lien invalide ou expiré')
  })

  it('TC-AUTH-048 — réinitialisation refusée avec jeton expiré retourne 400 (mdp inchangé)', async () => {
    const u = await createTestUser(admin, 'accompagne', 'reset-expire')
    createdUsers.push(u)
    expect((await new Session().post('/api/auth/request-reset', { email: u.email })).status).toBe(200)
    const token = latestToken(u.email, 'reset_mdp')
    expect(token).not.toBe('')
    execSql("UPDATE tokens SET expire_le='2000-01-01T00:00:00.000Z' WHERE valeur=?", [token])

    const s = new Session()
    const r = await s.post('/api/auth/reset', { token, password: 'ResetMdp123' })
    expect(r.status).toBe(400)
    expect(r.json.error).toBe('Lien invalide ou expiré')
    // Mot de passe inchangé : l'ancien fonctionne toujours.
    expect((await new Session().login(u.email, u.password)).status).toBe(200)
  })

  it('TC-AUTH-050 — réinitialisation refusée avec mot de passe trop court retourne 400 (token non consommé)', async () => {
    const u = await createTestUser(admin, 'accompagne', 'reset-short')
    createdUsers.push(u)
    expect((await new Session().post('/api/auth/request-reset', { email: u.email })).status).toBe(200)
    const token = latestToken(u.email, 'reset_mdp')
    expect(token).not.toBe('')

    const s = new Session()
    const r = await s.post('/api/auth/reset', { token, password: 'Court12' }) // 7 car.
    expect(r.status).toBe(400)
    expect(r.json.error).toBe('Mot de passe trop court (≥ 8 caractères)')
    // Validation du schéma en amont : le token reste consommable (utilise=0).
    expect(readScalar('SELECT utilise FROM tokens WHERE valeur=?', [token])).toBe('0')
  })

  it('TC-AUTH-051 — réinitialisation refusée si token manquant dans le corps retourne 400', async () => {
    const s = new Session()
    const r = await s.post('/api/auth/reset', { password: 'ResetMdp123' }) // token absent
    expect(r.status).toBe(400)
  })
})
