import { describe, it, expect } from 'vitest'
import { Session, asUser, DEMO } from '../helpers/api'
import { createTestUser, deleteTestUser } from '../helpers/fixtures'

// Test de fumée : valide la plomberie de la batterie avant les suites complètes.
describe('SMOKE — plomberie de test', () => {
  it('TC-SMOKE-001 — /api/health répond ok', async () => {
    const r = await new Session().get('/api/health')
    expect(r.status).toBe(200)
    expect(r.json.status).toBe('ok')
  })

  it('TC-SMOKE-002 — connexion admin + cookie de session + /me', async () => {
    const s = await asUser(DEMO.admin)
    expect(s.cookie).toContain('boussole_token=')
    const me = await s.get('/api/auth/me')
    expect(me.status).toBe(200)
    expect(me.json.user.role).toBe('admin')
  })

  it('TC-SMOKE-003 — /me/features renvoie la liste des fonctionnalités', async () => {
    const s = await asUser(DEMO.mohamed)
    const f = await s.get('/api/auth/me/features')
    expect(f.status).toBe(200)
    expect(Array.isArray(f.json.features)).toBe(true)
    expect(f.json.features.length).toBeGreaterThan(0)
  })

  it('TC-SMOKE-004 — accès refusé sans authentification (401)', async () => {
    const r = await new Session().get('/api/admin/users')
    expect(r.status).toBe(401)
  })

  it('TC-SMOKE-005 — accès refusé pour mauvais rôle (403)', async () => {
    const s = await asUser(DEMO.amine) // accompagné
    const r = await s.get('/api/admin/users')
    expect(r.status).toBe(403)
  })

  it('TC-SMOKE-006 — cycle compte de test jetable (création → jeton en base → activation → connexion → suppression)', async () => {
    const admin = await asUser(DEMO.admin)
    const user = await createTestUser(admin, 'accompagne', 'smoke')
    expect(user.id).toBeGreaterThan(0)
    const s = await asUser({ email: user.email, password: user.password })
    const me = await s.get('/api/auth/me')
    expect(me.json.user.email).toBe(user.email)
    await deleteTestUser(admin, user)
    // Le compte n'existe plus → connexion impossible
    const again = await new Session().login(user.email, user.password)
    expect(again.status).toBe(401)
  })
})
