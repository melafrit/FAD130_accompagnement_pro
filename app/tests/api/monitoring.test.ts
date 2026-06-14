import { describe, it, expect } from 'vitest'
import { Session, asUser, DEMO } from '../helpers/api'

// Supervision — santé technique & KPI métier. Endpoints réservés à l'administrateur.
describe('MON — supervision /api/monitoring/health', () => {
  it('TC-MON-001 — anonyme → 401', async () => {
    expect((await new Session().get('/api/monitoring/health')).status).toBe(401)
  })

  it('TC-MON-002 — accompagnateur → 403', async () => {
    const s = await asUser(DEMO.camille)
    expect((await s.get('/api/monitoring/health')).status).toBe(403)
  })

  it('TC-MON-003 — admin → 200 + santé de chaque dépendance', async () => {
    const s = await asUser(DEMO.admin)
    const r = await s.get('/api/monitoring/health')
    expect(r.status).toBe(200)
    for (const k of ['claude', 'brevo', 'database', 'backups', 'error_rate']) {
      expect(r.json[k]).toBeTruthy()
      expect(['ok', 'warn', 'down', 'unknown']).toContain(r.json[k].status)
      expect(typeof r.json[k].detail).toBe('string')
    }
    // La base et le journal d'erreurs sont actifs : sur la pile de test ils répondent « ok ».
    expect(r.json.database.status).toBe('ok')
    expect(typeof r.json.time).toBe('string')
  })
})

describe('MON — supervision /api/monitoring/business', () => {
  it('TC-MON-004 — anonyme → 401', async () => {
    expect((await new Session().get('/api/monitoring/business')).status).toBe(401)
  })

  it('TC-MON-005 — accompagnateur → 403', async () => {
    const s = await asUser(DEMO.camille)
    expect((await s.get('/api/monitoring/business')).status).toBe(403)
  })

  it('TC-MON-006 — admin → 200 + KPI courants, taux dérivés et séries', async () => {
    const s = await asUser(DEMO.admin)
    const r = await s.get('/api/monitoring/business?days=30')
    expect(r.status).toBe(200)
    const cur = r.json.current
    // Familles de KPI métier présentes.
    for (const k of ['inscriptions_total', 'accompagnateurs', 'accompagnes', 'parcours_total', 'entretiens', 'cr_publies', 'actions']) {
      expect(typeof cur[k]).toBe('number')
    }
    // Taux dérivés bornés à [0, 100].
    expect(cur.taux_completion).toBeGreaterThanOrEqual(0)
    expect(cur.taux_completion).toBeLessThanOrEqual(100)
    expect(cur.taux_actions_faites).toBeGreaterThanOrEqual(0)
    expect(cur.taux_actions_faites).toBeLessThanOrEqual(100)
    // Le jeu de démo comporte des inscriptions : au moins l'admin.
    expect(cur.inscriptions_total).toBeGreaterThan(0)
    expect(Array.isArray(r.json.series)).toBe(true)
    expect(r.json.days).toBe(30)
  })
})
