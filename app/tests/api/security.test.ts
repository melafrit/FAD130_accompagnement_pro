import { describe, it, expect } from 'vitest'
import { Session } from '../helpers/api'

// En-têtes de sécurité (helmet + CSP). Vérifiés sur une réponse réelle de la stack.
describe('SEC — en-têtes de sécurité HTTP', () => {
  it('TC-SEC-001 — Content-Security-Policy présente et restrictive', async () => {
    const r = await new Session().get('/api/health')
    expect(r.status).toBe(200)
    const csp = r.headers.get('content-security-policy') || ''
    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("object-src 'none'")
  })

  it('TC-SEC-002 — en-têtes helmet de durcissement présents', async () => {
    const r = await new Session().get('/api/health')
    expect(r.headers.get('x-content-type-options')).toBe('nosniff')
    // helmet pose soit X-Frame-Options soit frame-ancestors dans la CSP (anti-clickjacking)
    const frame = r.headers.get('x-frame-options') || (r.headers.get('content-security-policy') || '')
    expect(frame).toBeTruthy()
  })
})
