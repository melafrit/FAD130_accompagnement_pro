import { test, expect } from '@playwright/test'
import { login, DEMO } from './helpers'

// Visite guidée par écran (Amélioration 4) : lien du menu (relance l'écran courant) + proposition
// à la première visite. NB : helpers.login neutralise les propositions automatiques
// (boussole_tours_off) ; le test de proposition les réactive explicitement.
test.describe('TOUR — visite guidée par écran', () => {
  test('TC-UI-130 — le lien « Visite guidée » du menu lance la visite de l’écran courant', async ({ page }) => {
    await login(page, DEMO.mohamed)
    await page.goto('/espace')
    await expect(page.getByRole('link', { name: 'Mon espace' })).toBeVisible()

    await page.locator('.authmenu-btn').click()
    await page.getByRole('menuitem', { name: /Visite guidée/ }).click()

    const tour = page.getByRole('dialog', { name: 'Visite guidée' })
    await expect(tour).toBeVisible()
    await expect(tour.getByRole('heading', { name: 'Mon espace' })).toBeVisible() // 1re étape de l'écran espace
    await tour.getByRole('button', { name: 'Passer' }).click()
    await expect(tour).toHaveCount(0)
  })

  test('TC-UI-131 — première visite d’un écran : proposition Oui/Non, « Oui » lance la visite', async ({ page }) => {
    await login(page, DEMO.mohamed)
    // Réactive les propositions automatiques (un addInitScript postérieur à celui de login() qui les coupe).
    await page.addInitScript(() => { try { localStorage.removeItem('boussole_tours_off'); localStorage.removeItem('boussole_tour_tableau-de-bord') } catch { /* ignore */ } })

    await page.goto('/tableau-de-bord')
    const prompt = page.getByRole('dialog', { name: 'Proposition de visite guidée' })
    await expect(prompt).toBeVisible()
    await prompt.getByRole('button', { name: /Oui/ }).click()

    const tour = page.getByRole('dialog', { name: 'Visite guidée' })
    await expect(tour).toBeVisible()
    await tour.getByRole('button', { name: 'Passer' }).click()
    await expect(tour).toHaveCount(0)
  })
})
