import { test, expect } from '@playwright/test'

// Tests UI du GUIDE de prise en main (/guide = Guide.tsx).
// Page PUBLIQUE : aucun de ces tests ne se connecte (pas de login()).
// Couvre l'accès anonyme, les deux onglets de rôle, le parcours pas-à-pas et les points d'entrée
// depuis la navigation. Cite les TC-UI couverts.

test.describe('GUIDE — page publique /guide', () => {
  test('TC-UI-374 — la page est accessible sans connexion et affiche les deux parcours', async ({ page }) => {
    await page.goto('/guide')
    await expect(page.getByRole('heading', { name: 'Guide d’utilisation de Boussole', level: 1 })).toBeVisible()
    // Aucune redirection vers /connexion : la route est bien hors <Protected>.
    await expect(page).toHaveURL(/\/guide$/)
    const onglets = page.getByRole('tab')
    await expect(onglets).toHaveCount(2)
    await expect(page.getByRole('tab', { name: /accompagnateur/i })).toHaveAttribute('aria-selected', 'true')
  })

  test('TC-UI-375 — le parcours accompagnateur avance étape par étape', async ({ page }) => {
    await page.goto('/guide')
    const panneau = page.getByRole('tabpanel')
    await expect(panneau.getByRole('heading', { name: 'Ton espace', level: 3 })).toBeVisible()
    await expect(page.locator('.phase-counter')).toHaveText('1 / 7')
    // « Précédent » est désactivé sur la première étape.
    await expect(page.getByRole('button', { name: '← Précédent' })).toBeDisabled()

    await page.getByRole('button', { name: 'Suivant →' }).click()
    await expect(page.locator('.phase-counter')).toHaveText('2 / 7')
    await expect(panneau.getByRole('heading', { name: 'Tes disponibilités', level: 3 })).toBeVisible()
    // La progression est exposée aux technologies d'assistance.
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2')
  })

  test('TC-UI-376 — changer d’onglet bascule sur le parcours accompagné et réinitialise l’étape', async ({ page }) => {
    await page.goto('/guide')
    await page.getByRole('button', { name: 'Suivant →' }).click()
    await expect(page.locator('.phase-counter')).toHaveText('2 / 7')

    await page.getByRole('tab', { name: /accompagné/i }).click()
    await expect(page.getByRole('tab', { name: /accompagné/i })).toHaveAttribute('aria-selected', 'true')
    // Le parcours accompagné compte 6 étapes et repart de la première.
    await expect(page.locator('.phase-counter')).toHaveText('1 / 6')
    await expect(page.getByRole('tabpanel').getByRole('heading', { name: 'Ton espace', level: 3 })).toBeVisible()
  })

  test('TC-UI-377 — chaque étape montre une capture décrite par un texte alternatif', async ({ page }) => {
    await page.goto('/guide')
    const capture = page.locator('.guide-shot')
    await expect(capture).toBeVisible()
    // L'alternative textuelle est obligatoire (axe-core « image-alt » est bloquant) et doit être descriptive.
    const alt = await capture.getAttribute('alt')
    expect(alt && alt.length).toBeGreaterThan(20)
    // L'image est réellement servie (et non cassée).
    await expect.poll(() => capture.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0)
  })

  test('TC-UI-378 — le guide est atteignable depuis la navigation et le pied de page', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('link', { name: 'Guide' }).click()
    await expect(page).toHaveURL(/\/guide$/)

    await page.goto('/')
    await page.getByRole('navigation', { name: 'Liens de bas de page' }).getByRole('link', { name: 'Guide' }).click()
    await expect(page).toHaveURL(/\/guide$/)
    await expect(page.getByRole('heading', { name: 'Guide d’utilisation de Boussole', level: 1 })).toBeVisible()
  })
})
