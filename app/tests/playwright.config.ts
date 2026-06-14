import { defineConfig, devices } from '@playwright/test'

// Tests UI bout-en-bout contre la stack Docker :8080 (Chromium).
// Exécution séquentielle (1 worker) : backend partagé, certains scénarios mutent des données.
export default defineConfig({
  testDir: './ui',
  globalSetup: './global-setup.ts', // active le réglage global FALC le temps de la session UI
  fullyParallel: false,
  workers: 1,
  // Sur CI : 2 tentatives pour absorber les flakes TRANSITOIRES (timing, réseau) — une vraie
  // régression échoue à chaque tentative. En local : 0, pour que les flakes restent visibles.
  retries: process.env.CI ? 2 : 0,
  timeout: 45000,
  expect: { timeout: 10000 },
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: process.env.BOUSSOLE_BASE || 'http://localhost:8080',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'fr-FR',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
