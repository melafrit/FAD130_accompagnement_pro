// Captures d'écran de l'application pour le guide public /guide.
//
// Volontairement PLACÉ HORS de `ui/` : `testDir: './ui'` embarquerait ce fichier dans la
// batterie de non-régression, et le globalSetup forcerait le mode FALC (captures « facile
// à lire » au lieu du rendu normal).
//
//   cd app/tests ; node scripts/captures.mjs
//
// Prérequis : la stack locale tourne (docker compose -f app/docker-compose.local.yml up -d).
// Les PNG sont écrits dans app/web/public/captures/ et servis en /captures/<nom>.png.

import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ICI = dirname(fileURLToPath(import.meta.url))
const BASE = process.env.BOUSSOLE_BASE || 'http://localhost:8080'
const OUT = resolve(ICI, '../../web/public/captures')

// Mots de passe de démo (identiques à ui/helpers.ts — stack LOCALE uniquement).
const MDP = 'BoussoleDemo2026'
const COMPTES = {
  accompagnateur: { email: 'elafrit.mohamed@gmail.com', password: MDP },
  accompagne: { email: 'afrit_mohamed@yahoo.fr', password: MDP },
}

async function connexion(page, compte) {
  await page.context().clearCookies()
  // Sans ceci, l'overlay de visite guidée pollue toutes les captures.
  await page.addInitScript(() => {
    try {
      ;['accompagnateur', 'accompagne', 'admin'].forEach((r) => localStorage.setItem(`boussole_onboarding_${r}`, '1'))
      localStorage.setItem('boussole_tours_off', '1')
    } catch { /* localStorage indisponible */ }
  })
  await page.goto(`${BASE}/connexion`)
  await page.fill('input[type=email]', compte.email)
  await page.fill('input[type=password]', compte.password)
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await page.waitForSelector('a:has-text("Mon espace")', { timeout: 20000 })
}

// Masque les éléments flottants qui n'apportent rien au guide (bouton d'aide « ? »).
async function nettoyer(page) {
  await page.addStyleTag({ content: '.onboarding-fab { display: none !important; }' })
}

async function capturer(page, chemin, nom) {
  await page.goto(`${BASE}${chemin}`)
  // Plusieurs pages sont en lazy() derrière un Suspense : sans cette attente on capture « Chargement… ».
  await page.waitForSelector('h1, h2', { timeout: 20000 })
  await page.waitForLoadState('networkidle').catch(() => {})
  await nettoyer(page)
  await page.waitForTimeout(600) // laisse retomber les animations d'entrée (graphiques, jauges)
  await page.screenshot({ path: `${OUT}/${nom}.png` })
  console.log(`  ✓ ${nom}.png  ←  ${chemin}`)
}

const browser = await chromium.launch()
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1.5, // net sans alourdir le dépôt
  locale: 'fr-FR',
})
const page = await ctx.newPage()
mkdirSync(OUT, { recursive: true })

try {
  // ---------- ACCOMPAGNATEUR ----------
  console.log('ACCOMPAGNATEUR')
  await connexion(page, COMPTES.accompagnateur)
  // Les identifiants de dossiers changent à chaque redémarrage de l'API : on les résout dynamiquement.
  const idAcc = await page.evaluate(async () => {
    const r = await fetch('/api/entretien/dashboard', { credentials: 'include' })
    const d = await r.json()
    const vitrine = (d.dossiers || []).find((x) => x.accompagne_prenom === 'Amine') || (d.dossiers || [])[0]
    return vitrine?.id
  })
  if (!idAcc) throw new Error('Dossier vitrine introuvable côté accompagnateur')
  console.log(`  (dossier vitrine : ${idAcc})`)

  await capturer(page, '/espace', 'acc-1-espace')
  await capturer(page, '/mes-creneaux', 'acc-2-creneaux')
  await capturer(page, `/entretien?dossier=${idAcc}`, 'acc-3-entretien')
  await capturer(page, `/dossier/${idAcc}`, 'acc-4-dossier')
  await capturer(page, `/plan-action/${idAcc}`, 'acc-5-plan-action')
  await capturer(page, `/dossier/${idAcc}/auto-evaluation`, 'acc-6-auto-evaluation')
  await capturer(page, '/tableau-de-bord', 'acc-7-tableau-de-bord')

  // ---------- ACCOMPAGNÉ ----------
  console.log('ACCOMPAGNÉ')
  await connexion(page, COMPTES.accompagne)
  const idAcp = await page.evaluate(async () => {
    const r = await fetch('/api/dossiers/mine', { credentials: 'include' })
    const d = await r.json()
    // Le parcours vitrine (complet) est celui accompagné par Mohamed, pas le premier de la liste.
    const vitrine = (d.dossiers || []).find((x) => x.acc_prenom === 'Mohamed') || (d.dossiers || [])[0]
    return vitrine?.id
  })
  if (!idAcp) throw new Error('Parcours vitrine introuvable côté accompagné')
  console.log(`  (parcours vitrine : ${idAcp})`)

  await capturer(page, '/espace', 'acp-1-espace')
  await capturer(page, `/questionnaire?dossier=${idAcp}`, 'acp-2-questionnaire')
  await capturer(page, '/rendez-vous', 'acp-3-rendez-vous')
  await capturer(page, `/parcours/${idAcp}`, 'acp-4-parcours')
  await capturer(page, '/mes-comptes-rendus', 'acp-5-comptes-rendus')
  await capturer(page, '/mon-plan-action', 'acp-6-plan-action')

  console.log(`\nOK — captures écrites dans ${OUT}`)
} finally {
  await browser.close()
}
