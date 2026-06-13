// Affiche de façon compacte les cas de test du catalogue, filtrables par domaine et/ou niveau.
// Usage: node scripts/show.mjs [--domaine=auth] [--niveau=unitaire] [--type=acces] [--full]
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const cat = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'catalog', 'catalog.json'), 'utf8'))
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true] }))
let n = 0
for (const a of cat.areas) {
  const dom = a.areaKey || a.area
  if (args.domaine && dom !== args.domaine) continue
  for (const c of a.cases || []) {
    if (args.niveau && c.niveau !== args.niveau) continue
    if (args.type && c.type !== args.type) continue
    n++
    if (args.full) {
      console.log(`\n${c.id} [${c.niveau}/${c.type}/${c.priorite}] ${c.titre}`)
      console.log(`  trace: ${c.tracabilite}`)
      if (c.donnees) console.log(`  données: ${c.donnees}`)
      if (c.attendu) console.log(`  attendu: ${c.attendu}`)
    } else {
      console.log(`${c.id} [${c.niveau}/${c.type}] ${c.titre}  «${c.tracabilite}»`)
    }
  }
}
console.error(`\n${n} cas affichés.`)
