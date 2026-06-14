import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { login, DEMO } from './helpers'

// Audit d'accessibilité automatisé (axe-core) — référentiel WCAG 2.1 niveau AA (socle RGAA).
// On échoue uniquement sur les violations « critical » / « serious » (les plus impactantes).
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

async function violationsGraves(page: Page) {
  const res = await new AxeBuilder({ page }).withTags(WCAG).analyze()
  return res.violations
    .filter((v) => v.impact === 'critical' || v.impact === 'serious')
    .map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length }))
}

test.describe('A11Y — accessibilité (axe-core, WCAG 2.1 AA)', () => {
  const PUBLIC: [string, string][] = [
    ['TC-A11Y-001', '/'],
    ['TC-A11Y-002', '/connexion'],
    ['TC-A11Y-003', '/inscription'],
    ['TC-A11Y-004', '/methode'],
    ['TC-A11Y-005', '/presentation'],
    ['TC-A11Y-006', '/accessibilite'],
  ]
  for (const [id, path] of PUBLIC) {
    test(`${id} — ${path} sans violation critique/sérieuse`, async ({ page }) => {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      const v = await violationsGraves(page)
      expect(v, JSON.stringify(v, null, 2)).toEqual([])
    })
  }

  test('TC-A11Y-010 — espace accompagnateur sans violation critique/sérieuse', async ({ page }) => {
    await login(page, DEMO.mohamed)
    await page.goto('/espace')
    await page.waitForLoadState('networkidle')
    const v = await violationsGraves(page)
    expect(v, JSON.stringify(v, null, 2)).toEqual([])
  })

  test('TC-A11Y-011 — administration sans violation critique/sérieuse', async ({ page }) => {
    await login(page, DEMO.admin)
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')
    const v = await violationsGraves(page)
    expect(v, JSON.stringify(v, null, 2)).toEqual([])
  })

  test('TC-A11Y-012 — wiki admin sans violation critique/sérieuse', async ({ page }) => {
    await login(page, DEMO.admin)
    await page.goto('/admin/wiki')
    await page.waitForLoadState('networkidle')
    const v = await violationsGraves(page)
    expect(v, JSON.stringify(v, null, 2)).toEqual([])
  })
})
