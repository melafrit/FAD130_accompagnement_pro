// Agrège les résultats des 3 couches (Vitest unit/api JSON + Playwright JSON) en un rapport
// d'exécution Markdown daté, et rafraîchit la matrice de traçabilité.
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const RES = path.join(ROOT, '.results')
const DOCS = path.join(ROOT, 'docs')

function readJson(f) { try { return JSON.parse(fs.readFileSync(path.join(RES, f), 'utf8')) } catch { return null } }

function vitestStats(j) {
  if (!j) return null
  return { total: j.numTotalTests ?? 0, passed: j.numPassedTests ?? 0, failed: j.numFailedTests ?? 0 }
}
function vitestFailures(j) {
  if (!j || !j.testResults) return []
  const out = []
  for (const file of j.testResults) {
    for (const a of file.assertionResults || []) {
      if (a.status === 'failed') out.push(`${a.fullName || a.title} (${path.basename(file.name || '')})`)
    }
  }
  return out
}
function playwrightStats(j) {
  if (!j || !j.stats) return null
  const s = j.stats
  const passed = s.expected ?? 0
  const failed = (s.unexpected ?? 0) + (s.flaky ?? 0)
  return { total: passed + failed + (s.skipped ?? 0), passed, failed }
}

const unit = vitestStats(readJson('unit.json'))
const api = vitestStats(readJson('api.json'))
const ui = playwrightStats(readJson('ui.json'))
const failuresUnit = vitestFailures(readJson('unit.json'))
const failuresApi = vitestFailures(readJson('api.json'))

const layers = [['Unitaire', unit], ['API', api], ['UI (Playwright)', ui]]
const totals = layers.reduce((acc, [, s]) => s ? { total: acc.total + s.total, passed: acc.passed + s.passed, failed: acc.failed + s.failed } : acc, { total: 0, passed: 0, failed: 0 })
const stamp = process.env.RUN_STAMP || new Date().toISOString()
const verdict = totals.failed === 0 && totals.total > 0 ? '✅ VERT' : (totals.total === 0 ? '⚠️ AUCUN RÉSULTAT' : '❌ ROUGE')

let section = `\n## Exécution du ${stamp}\n\n**Verdict : ${verdict}** — ${totals.passed}/${totals.total} tests au vert.\n\n| Couche | Total | Réussis | Échecs |\n|---|---|---|---|\n`
for (const [nom, s] of layers) section += `| ${nom} | ${s ? s.total : '—'} | ${s ? s.passed : '—'} | ${s ? s.failed : '—'} |\n`
const allFailures = [...failuresUnit, ...failuresApi]
if (allFailures.length) {
  section += `\n**Échecs :**\n${allFailures.slice(0, 60).map((f) => `- ${f}`).join('\n')}\n`
  if (allFailures.length > 60) section += `- … et ${allFailures.length - 60} autres\n`
}

const reportPath = path.join(DOCS, '04-Rapport-execution.md')
const header = `# Rapport d'exécution — Boussole\n\n> Identifiant : BOUSSOLE-RAP-001. Historique des exécutions de la batterie de non-régression (le plus récent en premier).\n`
// On ne conserve QUE les sections d'exécution existantes (tout ce qui suit le 1er « ## Exécution »),
// en ignorant tout bandeau précédent : impossible d'accumuler des en-têtes dupliqués (robuste aux
// fins de ligne et à l'apostrophe).
let prevSections = ''
try {
  const existing = fs.readFileSync(reportPath, 'utf8')
  const idx = existing.indexOf('## Exécution')
  if (idx >= 0) {
    prevSections = '\n' + existing.slice(idx)
    // Auto-réparation : retire d'éventuels bandeaux glissés ENTRE des sections d'exécution.
    prevSections = prevSections.replace(/\n?# Rapport d['’]exécution — Boussole\n\n> Identifiant : BOUSSOLE-RAP-001\.[^\n]*\n/g, '')
  }
} catch { /* premier rapport */ }
fs.mkdirSync(DOCS, { recursive: true })
fs.writeFileSync(reportPath, header + section + prevSections)

// Rafraîchit la matrice de traçabilité (couverture par scan des IDs dans les tests)
try { execSync('node scripts/build-catalog.mjs', { cwd: ROOT, stdio: 'ignore' }) } catch { /* ignore */ }

console.log(`\n=== RAPPORT ${verdict} : ${totals.passed}/${totals.total} (unit ${unit ? unit.passed + '/' + unit.total : '—'}, api ${api ? api.passed + '/' + api.total : '—'}, ui ${ui ? ui.passed + '/' + ui.total : '—'}) ===`)
process.exit(totals.failed === 0 ? 0 : 1)
