import { test, expect } from '@playwright/test'

// Smoke UI : valide la plomberie Playwright (Chromium + baseURL :8080 + auth front).
test.describe('SMOKE UI', () => {
  test('TC-UISMOKE-001 — la page de connexion se charge', async ({ page }) => {
    await page.goto('/connexion')
    await expect(page.locator('input[type=email]')).toBeVisible()
    await expect(page.locator('input[type=password]')).toBeVisible()
  })

  test('TC-UISMOKE-002 — connexion accompagnateur → accès à l’espace', async ({ page }) => {
    await page.goto('/connexion')
    await page.fill('input[type=email]', 'elafrit.mohamed@gmail.com')
    await page.fill('input[type=password]', 'BoussoleDemo2026')
    await page.getByRole('button', { name: 'Se connecter' }).click()
    await expect(page.getByRole('link', { name: 'Mon espace' })).toBeVisible({ timeout: 15000 })
  })
})
