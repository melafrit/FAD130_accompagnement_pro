import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Session, asUser, DEMO } from '../helpers/api'
import { createTestUser, deleteTestUser, type TestUser } from '../helpers/fixtures'
import { currentTotp } from '../../api/src/totp'

// Double authentification TOTP (opt-in). Compte de test jetable : aucun compte de démo touché.
describe('2FA — double authentification TOTP', () => {
  let admin: Session
  let user: TestUser
  let secret = ''

  beforeAll(async () => {
    admin = await asUser(DEMO.admin)
    user = await createTestUser(admin, 'accompagne', '2fa')
  })
  afterAll(async () => { try { await deleteTestUser(admin, user) } catch { /* déjà supprimé */ } })

  async function login2fa(): Promise<Session> {
    const s = new Session()
    const r = await s.post('/api/auth/login', { email: user.email, password: user.password, code: currentTotp(secret) })
    if (r.status !== 200 || !r.json.user) throw new Error(`login 2FA échoué (${r.status})`)
    return s
  }

  it('TC-2FA-001 — statut initial : désactivée', async () => {
    const s = await asUser({ email: user.email, password: user.password })
    const r = await s.get('/api/auth/2fa/status')
    expect(r.status).toBe(200)
    expect(r.json.enabled).toBe(false)
  })

  it('TC-2FA-002 — setup renvoie secret + QR ; enable exige un code valide', async () => {
    const s = await asUser({ email: user.email, password: user.password })
    const setup = await s.post('/api/auth/2fa/setup')
    expect(setup.status).toBe(200)
    expect(typeof setup.json.secret).toBe('string')
    expect(String(setup.json.qr)).toMatch(/^data:image\/png;base64,/)
    secret = setup.json.secret
    expect((await s.post('/api/auth/2fa/enable', { code: '000000' })).status).toBe(401) // mauvais code
    const ok = await s.post('/api/auth/2fa/enable', { code: currentTotp(secret) })
    expect(ok.status).toBe(200)
    expect(ok.json.enabled).toBe(true)
  })

  it('TC-2FA-003 — login sans code → challenge (pas de cookie de session)', async () => {
    const s = new Session()
    const r = await s.post('/api/auth/login', { email: user.email, password: user.password })
    expect(r.status).toBe(200)
    expect(r.json.twofa).toBe(true)
    expect((await s.get('/api/auth/me')).status).toBe(401) // non authentifié
  })

  it('TC-2FA-004 — login avec code valide → authentifié', async () => {
    const s = new Session()
    const r = await s.post('/api/auth/login', { email: user.email, password: user.password, code: currentTotp(secret) })
    expect(r.status).toBe(200)
    expect(r.json.user?.email).toBe(user.email)
    expect((await s.get('/api/auth/me')).status).toBe(200)
  })

  it('TC-2FA-005 — login avec code invalide → 401', async () => {
    const s = new Session()
    const r = await s.post('/api/auth/login', { email: user.email, password: user.password, code: '000000' })
    expect(r.status).toBe(401)
  })

  it('TC-2FA-006 — désactivation : code requis, puis retour à l’état initial', async () => {
    const s = await login2fa()
    expect((await s.post('/api/auth/2fa/disable', { code: '000000' })).status).toBe(401)
    const off = await s.post('/api/auth/2fa/disable', { code: currentTotp(secret) })
    expect(off.status).toBe(200)
    expect(off.json.enabled).toBe(false)
    // après désactivation, login sans code fonctionne de nouveau
    const s2 = await asUser({ email: user.email, password: user.password })
    expect((await s2.get('/api/auth/me')).status).toBe(200)
  })
})
