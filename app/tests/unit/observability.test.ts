import { describe, it, expect } from 'vitest'
import { metrics, reportError } from '../../api/src/observability'

describe('OBS — observabilité (sans IA)', () => {
  it('TC-OBS-010 — metrics() renvoie la forme attendue', () => {
    const m = metrics()
    expect(typeof m.uptime_s).toBe('number')
    expect(m.requests).toHaveProperty('total')
    expect(m.requests).toHaveProperty('5xx')
    expect(m.db).toHaveProperty('users')
    expect(typeof m.errors_logged).toBe('number')
  })

  it('TC-OBS-011 — reportError persiste dans error_log', () => {
    const before = metrics().errors_logged
    reportError(new Error('erreur de test'), { method: 'POST', path: '/api/test', status: 500, userId: null })
    expect(metrics().errors_logged).toBe(before + 1)
  })
})
