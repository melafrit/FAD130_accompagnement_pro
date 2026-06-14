import { describe, it, expect } from 'vitest'
import { Session, asUser, DEMO } from '../helpers/api'

// Endpoint de métriques (observabilité) — réservé à l'administrateur.
describe('OBS — endpoint /api/metrics', () => {
  it('TC-OBS-001 — anonyme → 401', async () => {
    expect((await new Session().get('/api/metrics')).status).toBe(401)
  })

  it('TC-OBS-002 — accompagnateur → 403', async () => {
    const s = await asUser(DEMO.camille)
    expect((await s.get('/api/metrics')).status).toBe(403)
  })

  it('TC-OBS-003 — admin → 200 + forme des métriques', async () => {
    const s = await asUser(DEMO.admin)
    const r = await s.get('/api/metrics')
    expect(r.status).toBe(200)
    expect(typeof r.json.uptime_s).toBe('number')
    expect(r.json.requests).toHaveProperty('total')
    expect(r.json.db).toHaveProperty('users')
  })
})
