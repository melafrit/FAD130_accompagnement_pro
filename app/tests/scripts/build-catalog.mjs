// Génère le catalogue de cas de test (02) + la matrice de traçabilité (03) à partir
// du résultat du workflow de conception ISTQB, persisté dans catalog/catalog.json.
// La matrice marque un cas « automatisé » dès que son ID apparaît dans tests/{unit,api,ui}.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const CATALOG_JSON = path.join(ROOT, 'catalog', 'catalog.json')
const DOCS = path.join(ROOT, 'docs')

// 1) Persiste le catalogue normalisé si absent (depuis le fichier de sortie du workflow)
function loadCatalog() {
  if (fs.existsSync(CATALOG_JSON)) return JSON.parse(fs.readFileSync(CATALOG_JSON, 'utf8'))
  const src = process.env.WF_RESULT
  if (!src || !fs.existsSync(src)) throw new Error('catalog.json absent et WF_RESULT introuvable. Passe le chemin du résultat du workflow via WF_RESULT.')
  const data = JSON.parse(fs.readFileSync(src, 'utf8'))
  const areas = (data.result || data).areas
  const norm = { generatedFrom: 'workflow istqb-test-design', areas }
  fs.mkdirSync(path.dirname(CATALOG_JSON), { recursive: true })
  fs.writeFileSync(CATALOG_JSON, JSON.stringify(norm, null, 2))
  return norm
}

const catalog = loadCatalog()
const areas = catalog.areas
const allCases = areas.flatMap((a) => (a.cases || []).map((c) => ({ ...c, domaine: a.areaKey || a.area })))

// 2) Détecte la couverture : un ID est « automatisé » s'il apparaît dans un fichier de test
function collectTestRefs() {
  const refs = new Map() // id -> [fichiers]
  for (const dir of ['unit', 'api', 'ui']) {
    const d = path.join(ROOT, dir)
    if (!fs.existsSync(d)) continue
    for (const f of walk(d)) {
      const txt = fs.readFileSync(f, 'utf8')
      const rel = path.relative(ROOT, f).replace(/\\/g, '/')
      for (const m of txt.matchAll(/TC-[A-Z0-9]+-\d{3}/g)) {
        const id = m[0]
        if (!refs.has(id)) refs.set(id, new Set())
        refs.get(id).add(rel)
      }
    }
  }
  return refs
}
function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) yield* walk(p)
    else if (/\.(test\.ts|spec\.ts)$/.test(e.name)) yield p
  }
}
const refs = collectTestRefs()

// 3) Génère le catalogue (02)
const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ')
let cat = `# Catalogue de cas de test — Boussole\n\n> Généré automatiquement à partir de la conception ISTQB. ${allCases.length} cas de test sur ${areas.length} domaines.\n> Identifiant : BOUSSOLE-CAT-001 · Voir le plan : [01-Plan-de-test.md](01-Plan-de-test.md) · La matrice : [03-Matrice-tracabilite.md](03-Matrice-tracabilite.md)\n\n`
const niveau = (n) => ({ unitaire: 'Unitaire', api: 'API', ui: 'UI' }[n] || n)
for (const a of areas) {
  const cases = a.cases || []
  cat += `## Domaine ${(a.areaKey || a.area).toUpperCase()} — ${cases.length} cas\n\n`
  if ((a.endpoints || []).length) {
    cat += `**Endpoints couverts :**\n\n`
    for (const e of a.endpoints) cat += `- \`${e.method} ${e.path}\`${e.feature ? ` · feature: \`${e.feature}\`` : ''}${e.role ? ` · rôle: ${e.role}` : ''}${e.summary ? ` — ${e.summary}` : ''}\n`
    cat += `\n`
  }
  for (const c of cases) {
    const cov = refs.has(c.id) ? `✅ ${[...refs.get(c.id)].join(', ')}` : '⏳ à automatiser'
    cat += `### ${c.id} — ${c.titre}\n\n`
    cat += `| Niveau | Type | Priorité | Technique |\n|---|---|---|---|\n| ${niveau(c.niveau)} | ${c.type} | ${c.priorite} | ${esc(c.technique)} |\n\n`
    if (c.preconditions) cat += `- **Préconditions :** ${c.preconditions}\n`
    if (c.donnees) cat += `- **Données :** ${c.donnees}\n`
    if (c.etapes && c.etapes.length) cat += `- **Étapes :**\n${c.etapes.map((s, i) => `  ${i + 1}. ${s}`).join('\n')}\n`
    if (c.attendu) cat += `- **Résultat attendu :** ${c.attendu}\n`
    cat += `- **Traçabilité :** ${c.tracabilite}\n`
    cat += `- **Automatisation :** ${cov}\n\n`
  }
}
fs.mkdirSync(DOCS, { recursive: true })
fs.writeFileSync(path.join(DOCS, '02-Catalogue-cas-de-test.md'), cat)

// 4) Génère la matrice de traçabilité (03)
const covered = allCases.filter((c) => refs.has(c.id)).length
let mat = `# Matrice de traçabilité — Boussole\n\n> Identifiant : BOUSSOLE-MAT-001 · ${allCases.length} cas · ${covered} automatisés (${Math.round((covered / allCases.length) * 100)}%).\n> Régénérée à chaque exécution (un cas est « automatisé » dès que son ID apparaît dans le code de test).\n\n`
mat += `## Synthèse de couverture par domaine\n\n| Domaine | Cas | Automatisés | Couverture |\n|---|---|---|---|\n`
for (const a of areas) {
  const cs = a.cases || []
  const cov = cs.filter((c) => refs.has(c.id)).length
  mat += `| ${(a.areaKey || a.area).toUpperCase()} | ${cs.length} | ${cov} | ${cs.length ? Math.round((cov / cs.length) * 100) : 0}% |\n`
}
mat += `| **Total** | **${allCases.length}** | **${covered}** | **${Math.round((covered / allCases.length) * 100)}%** |\n\n`
mat += `## Détail (cas ↔ fonctionnalité/endpoint ↔ test automatisé)\n\n| Cas | Niveau | Priorité | Traçabilité (feature / endpoint / UI) | Test automatisé |\n|---|---|---|---|---|\n`
for (const c of allCases) {
  const cov = refs.has(c.id) ? `✅ ${[...refs.get(c.id)].join(', ')}` : '⏳'
  mat += `| ${c.id} | ${niveau(c.niveau)} | ${c.priorite} | ${esc(c.tracabilite)} | ${cov} |\n`
}
fs.writeFileSync(path.join(DOCS, '03-Matrice-tracabilite.md'), mat)

console.log(`Catalogue: ${allCases.length} cas → docs/02-Catalogue-cas-de-test.md`)
console.log(`Matrice  : ${covered}/${allCases.length} automatisés (${Math.round((covered / allCases.length) * 100)}%) → docs/03-Matrice-tracabilite.md`)
