import { test, expect } from '@playwright/test'
import { login, DEMO } from './helpers'

// Tests UI de la section ADMIN « Supervision » (/admin/supervision = Supervision.tsx + 3 panneaux).
// Couvre l'affichage des 3 onglets, leur bascule, le rendu des données live, et la redirection
// de l'ancien chemin /admin/observability. Cite les TC-UI couverts.

test.describe('SUPERVISION — section /admin/supervision', () => {
  test('TC-UI-360 — les 3 onglets s’affichent et basculent (Observabilité / Santé technique / Métier)', async ({ page }) => {
    await login(page, DEMO.admin)
    await page.goto('/admin/supervision')

    await expect(page.getByRole('heading', { name: 'Supervision', level: 1 })).toBeVisible()
    const tablist = page.getByRole('tablist', { name: 'Onglets de supervision' })
    await expect(tablist.getByRole('tab')).toHaveCount(3)

    // Onglet 1 — Observabilité (actif par défaut) : KPI techniques.
    await expect(page.getByRole('tab', { name: 'Observabilité' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByText('Requêtes traitées')).toBeVisible({ timeout: 15000 })

    // Onglet 2 — Santé technique : voyants des dépendances + état global.
    await page.getByRole('tab', { name: 'Santé technique' }).click()
    await expect(page.getByText(/État global/)).toBeVisible({ timeout: 15000 })
    // { exact: true } cible le libellé <strong> (texte exact) et non le détail qui peut le contenir
    // (ex. état « inconnu » : « IA Claude (Anthropic) : aucun appel récent ») → évite la double-correspondance.
    await expect(page.getByText('Base de données (SQLite)', { exact: true })).toBeVisible()
    await expect(page.getByText('IA Claude (Anthropic)', { exact: true })).toBeVisible()

    // Onglet 3 — Indicateurs métier : familles de KPI + sélecteur de fenêtre.
    await page.getByRole('tab', { name: 'Indicateurs métier' }).click()
    await expect(page.getByRole('heading', { name: 'Adoption & comptes' })).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('heading', { name: 'Tendances' })).toBeVisible()
    await expect(page.getByRole('button', { name: '90 j' })).toBeVisible()
  })

  test('TC-UI-361 — l’ancien chemin /admin/observability redirige vers /admin/supervision', async ({ page }) => {
    await login(page, DEMO.admin)
    await page.goto('/admin/observability')
    await expect(page).toHaveURL(/\/admin\/supervision$/)
    await expect(page.getByRole('heading', { name: 'Supervision', level: 1 })).toBeVisible()
  })

  test('TC-UI-362 — la fenêtre temporelle des tendances est sélectionnable (7 / 30 / 90 j)', async ({ page }) => {
    await login(page, DEMO.admin)
    await page.goto('/admin/supervision')
    await page.getByRole('tab', { name: 'Indicateurs métier' }).click()
    await expect(page.getByRole('heading', { name: 'Adoption & comptes' })).toBeVisible({ timeout: 15000 })
    const b7 = page.getByRole('button', { name: '7 j' })
    await b7.click()
    await expect(b7).toHaveClass(/active/)
  })
})
