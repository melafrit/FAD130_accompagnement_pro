import { describe, it, expect, afterAll } from 'vitest'
import { Session, asUser, DEMO } from '../helpers/api'

// Réglages généraux globaux (bascules transversales admin). Endpoints /api/admin/settings.
// Cette suite exerce 'multilingue_enabled' (jamais touché ailleurs) pour éviter toute course
// avec adopt.test.ts qui pilote 'falc_enabled'.
describe('SET — réglages généraux /api/admin/settings', () => {
  it('TC-SET-001 — anonyme → 401', async () => {
    expect((await new Session().get('/api/admin/settings')).status).toBe(401)
  })

  it('TC-SET-002 — accompagnateur → 403', async () => {
    const s = await asUser(DEMO.camille)
    expect((await s.get('/api/admin/settings')).status).toBe(403)
  })

  it('TC-SET-003 — admin → 200 + forme (drapeaux booléens)', async () => {
    const s = await asUser(DEMO.admin)
    const r = await s.get('/api/admin/settings')
    expect(r.status).toBe(200)
    expect(typeof r.json.settings.falc_enabled).toBe('boolean')
    expect(typeof r.json.settings.multilingue_enabled).toBe('boolean')
  })

  it('TC-SET-004 — PATCH bascule un drapeau et /api/context le reflète', async () => {
    const s = await asUser(DEMO.admin)
    // Active le multilingue puis vérifie l'exposition publique via /api/context.
    expect((await s.patch('/api/admin/settings', { multilingue_enabled: true })).status).toBe(200)
    const ctxOn = await new Session().get('/api/context')
    expect(ctxOn.json.flags.multilingue).toBe(true)
    // Désactive puis revérifie.
    await s.patch('/api/admin/settings', { multilingue_enabled: false })
    const ctxOff = await new Session().get('/api/context')
    expect(ctxOff.json.flags.multilingue).toBe(false)
  })

  afterAll(async () => {
    // État par défaut (désactivé) restauré.
    const s = await asUser(DEMO.admin)
    await s.patch('/api/admin/settings', { multilingue_enabled: false })
  })
})
