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

  it('TC-OBS-003 — admin → 200 + forme des métriques détaillées', async () => {
    const s = await asUser(DEMO.admin)
    const r = await s.get('/api/metrics')
    expect(r.status).toBe(200)
    expect(typeof r.json.uptime_s).toBe('number')
    expect(r.json.requests).toHaveProperty('total')
    expect(r.json.requests).toHaveProperty('avg_ms')
    expect(r.json.requests).toHaveProperty('error_rate')
    expect(r.json.memory_mb).toHaveProperty('rss')
    expect(r.json.db).toHaveProperty('users')
  })

  it('TC-OBS-004 — /api/metrics/errors : anonyme 401, admin 200 + forme', async () => {
    expect((await new Session().get('/api/metrics/errors')).status).toBe(401)
    const s = await asUser(DEMO.admin)
    const r = await s.get('/api/metrics/errors?limit=10')
    expect(r.status).toBe(200)
    expect(Array.isArray(r.json.recent)).toBe(true)
    expect(Array.isArray(r.json.byPath)).toBe(true)
  })
})
