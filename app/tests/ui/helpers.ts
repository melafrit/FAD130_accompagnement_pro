import { type Page, expect } from '@playwright/test'

// Identifiants de démo (mot de passe commun).
export const DEMO = {
  admin: { email: 'mohamed@elafrit.com', password: 'BoussoleDemo2026' },
  mohamed: { email: 'elafrit.mohamed@gmail.com', password: 'BoussoleDemo2026' },
  camille: { email: 'camille.laurent@boussole.demo', password: 'BoussoleDemo2026' },
  amine: { email: 'afrit_mohamed@yahoo.fr', password: 'BoussoleDemo2026' },
  lea: { email: 'lea.martin@boussole.demo', password: 'BoussoleDemo2026' },
  karim: { email: 'karim.benali@boussole.demo', password: 'BoussoleDemo2026' },
} as const

/** Connecte un compte de démo via l'UI et attend l'apparition de la navigation « Mon espace ». */
export async function login(page: Page, account: { email: string; password: string }) {
  await page.goto('/connexion')
  await page.fill('input[type=email]', account.email)
  await page.fill('input[type=password]', account.password)
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await expect(page.getByRole('link', { name: 'Mon espace' })).toBeVisible({ timeout: 15000 })
  await dismissOnboarding(page)
}

/** Ferme la visite guidée d'accueil si elle s'affiche (overlay onboarding). */
export async function dismissOnboarding(page: Page) {
  const passer = page.getByRole('button', { name: 'Passer' })
  try { if (await passer.isVisible({ timeout: 1500 })) await passer.click() } catch { /* absente */ }
}

/** Récupère l'id du 1er dossier de l'accompagné connecté dont l'accompagnateur a le prénom donné. */
export async function dossierMineId(page: Page, accPrenom?: string): Promise<number> {
  const d = await page.evaluate(async () => {
    const r = await fetch('/api/dossiers/mine', { credentials: 'include' })
    return r.json()
  })
  const list = d.dossiers || []
  const found = accPrenom ? list.find((x: any) => x.acc_prenom === accPrenom) : list[0]
  return (found || list[0]).id
}

/** Récupère l'id du 1er dossier suivi par l'accompagnateur connecté (filtre optionnel sur le prénom de l'accompagné). */
export async function dossierAccId(page: Page, accompagnePrenom?: string): Promise<number> {
  const d = await page.evaluate(async () => {
    const r = await fetch('/api/entretien/dashboard', { credentials: 'include' })
    return r.json()
  })
  const list = d.dossiers || []
  const found = accompagnePrenom ? list.find((x: any) => x.accompagne_prenom === accompagnePrenom) : list[0]
  return (found || list[0]).id
}
