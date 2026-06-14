import { Router, type Request, type Response } from 'express'
import { spawn } from 'node:child_process'
import { z } from 'zod'
import { db } from './db'
import { requireAuth, requireRole } from './auth'
import { WIKI_SEED } from './wiki/seedData'

/**
 * Wiki documentaire interne — ADMIN ONLY.
 * Toutes les routes exigent un compte authentifié de rôle « admin » (requireAuth + requireRole).
 * Le contenu est du Markdown stocké en base (table wiki_pages), éditable en ligne.
 */
const router = Router()
router.use(requireAuth, requireRole('admin'))

interface U { id: number; role: string }
const getUser = (req: Request): U => (req as Request & { user?: U }).user as U

const STATUTS = ['redige', 'partiel', 'brouillon', 'deprecie'] as const
const slugRe = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const upsertSchema = z.object({
  titre: z.string().trim().min(1).max(200),
  categorie: z.string().trim().min(1).max(120).default('Divers'),
  resume: z.string().max(600).optional().default(''),
  contenu_md: z.string().max(500_000).optional().default(''),
  statut: z.enum(STATUTS).optional().default('redige'),
  ordre: z.number().int().min(0).max(100000).optional().default(0),
})
const createSchema = upsertSchema.extend({
  slug: z.string().trim().regex(slugRe, 'slug invalide (minuscules, chiffres, tirets)').max(120),
})

type PageRow = {
  id: number; slug: string; categorie: string; titre: string; resume: string | null
  contenu_md: string; statut: string; ordre: number; maj_le: string; maj_par: number | null
}

// --- Liste (métadonnées seulement : alimente la barre latérale & l'index) ---
router.get('/pages', (_req: Request, res: Response) => {
  const pages = db
    .prepare('SELECT id, slug, categorie, titre, resume, statut, ordre, maj_le FROM wiki_pages ORDER BY categorie, ordre, titre')
    .all()
  res.json({ pages })
})

// --- Recherche plein-texte simple (titre, résumé, contenu) avec extrait ---
router.get('/search', (req: Request, res: Response) => {
  const q = String(req.query.q || '').trim()
  if (q.length < 2) { res.json({ resultats: [] }); return }
  const like = `%${q.replace(/[%_]/g, (m) => '\\' + m)}%`
  const rows = db
    .prepare(
      `SELECT slug, categorie, titre, resume, contenu_md FROM wiki_pages
       WHERE titre LIKE ? ESCAPE '\\' OR resume LIKE ? ESCAPE '\\' OR contenu_md LIKE ? ESCAPE '\\'
       ORDER BY categorie, ordre LIMIT 40`,
    )
    .all(like, like, like) as PageRow[]
  const ql = q.toLowerCase()
  const resultats = rows.map((r) => {
    const hay = r.contenu_md || ''
    const i = hay.toLowerCase().indexOf(ql)
    const extrait = i >= 0 ? hay.slice(Math.max(0, i - 60), i + 80).replace(/\s+/g, ' ').trim() : (r.resume || '')
    return { slug: r.slug, categorie: r.categorie, titre: r.titre, extrait }
  })
  res.json({ resultats })
})

// --- Détail d'une page ---
router.get('/pages/:slug', (req: Request, res: Response) => {
  const page = db.prepare('SELECT * FROM wiki_pages WHERE slug=?').get(req.params.slug)
  if (!page) { res.status(404).json({ error: 'Page introuvable' }); return }
  res.json({ page })
})

// --- Création ---
router.post('/pages', (req: Request, res: Response) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message || 'Données invalides' }); return }
  const d = parsed.data
  const exists = db.prepare('SELECT 1 FROM wiki_pages WHERE slug=?').get(d.slug)
  if (exists) { res.status(409).json({ error: 'Ce slug existe déjà' }); return }
  const info = db
    .prepare(
      `INSERT INTO wiki_pages (slug, categorie, titre, resume, contenu_md, statut, ordre, maj_par)
       VALUES (@slug, @categorie, @titre, @resume, @contenu_md, @statut, @ordre, @maj_par)`,
    )
    .run({ ...d, maj_par: getUser(req).id })
  const page = db.prepare('SELECT * FROM wiki_pages WHERE id=?').get(info.lastInsertRowid)
  res.status(201).json({ page })
})

// --- Mise à jour ---
router.patch('/pages/:slug', (req: Request, res: Response) => {
  const current = db.prepare('SELECT id FROM wiki_pages WHERE slug=?').get(req.params.slug) as { id: number } | undefined
  if (!current) { res.status(404).json({ error: 'Page introuvable' }); return }
  const parsed = upsertSchema.partial().safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message || 'Données invalides' }); return }
  const fields = parsed.data
  const keys = Object.keys(fields) as (keyof typeof fields)[]
  if (keys.length === 0) { res.status(400).json({ error: 'Aucune modification fournie' }); return }
  const set = keys.map((k) => `${k}=@${k}`).join(', ')
  db.prepare(`UPDATE wiki_pages SET ${set}, maj_le=datetime('now'), maj_par=@maj_par WHERE id=@id`)
    .run({ ...fields, id: current.id, maj_par: getUser(req).id })
  const page = db.prepare('SELECT * FROM wiki_pages WHERE id=?').get(current.id)
  res.json({ page })
})

// --- Suppression ---
router.delete('/pages/:slug', (req: Request, res: Response) => {
  const info = db.prepare('DELETE FROM wiki_pages WHERE slug=?').run(req.params.slug)
  if (info.changes === 0) { res.status(404).json({ error: 'Page introuvable' }); return }
  res.json({ ok: true })
})

// ------------------------------------------------------------------
// Exports : Markdown (natif), DOCX et PDF (via pandoc, optionnel selon l'image)
// ------------------------------------------------------------------
function pageBySlug(slug: string): PageRow | undefined {
  return db.prepare('SELECT * FROM wiki_pages WHERE slug=?').get(slug) as PageRow | undefined
}
const WIKI_AUTEUR = 'Auteur : Mohamed El Afrit — https://www.mohamedelafrit.com'
const WIKI_LICENCE =
  'Documentation © 2026 Mohamed El Afrit. Distribuée sous licence Creative Commons Attribution - Pas d’Utilisation Commerciale - Partage dans les Mêmes Conditions 4.0 (CC BY-NC-SA 4.0). Le code de l’application Boussole est, lui, sous licence AGPL-3.0.'

function fullMarkdown(p: PageRow): string {
  const meta = `<!-- Boussole — Wiki projet · ${p.titre} · catégorie ${p.categorie} · maj ${p.maj_le} -->\n\n`
  const entete = `> **Boussole — Documentation du projet (UE FAD130, Cnam)**  \n> ${WIKI_AUTEUR}  \n> ${WIKI_LICENCE}\n\n---\n\n`
  const corps = p.contenu_md || `# ${p.titre}\n\n*(page vide)*\n`
  const pied = `\n\n---\n\n*${WIKI_LICENCE}*  \n*${WIKI_AUTEUR}*\n`
  return meta + entete + corps + pied
}
function asciiName(slug: string, ext: string): string {
  return `boussole-${slug}`.replace(/[^a-z0-9-]/gi, '-') + '.' + ext
}

/** Lance pandoc en convertissant le Markdown (stdin) vers le format voulu (stdout binaire). */
function runPandoc(markdown: string, args: string[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let child
    try { child = spawn('pandoc', args) } catch (e) { reject(e); return }
    const out: Buffer[] = []
    const err: Buffer[] = []
    child.on('error', reject) // pandoc absent du PATH
    child.stdout.on('data', (d) => out.push(d as Buffer))
    child.stderr.on('data', (d) => err.push(d as Buffer))
    child.on('close', (code) => {
      if (code === 0) resolve(Buffer.concat(out))
      else reject(new Error(Buffer.concat(err).toString() || `pandoc a échoué (code ${code})`))
    })
    child.stdin.on('error', () => { /* flux fermé prématurément */ })
    child.stdin.write(markdown)
    child.stdin.end()
  })
}

// Export Markdown (toujours disponible, aucune dépendance)
router.get('/export/:slug.md', (req: Request, res: Response) => {
  const p = pageBySlug(req.params.slug)
  if (!p) { res.status(404).json({ error: 'Page introuvable' }); return }
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${asciiName(p.slug, 'md')}"`)
  res.send(fullMarkdown(p))
})

// Export DOCX (pandoc, sans moteur externe)
router.get('/export/:slug.docx', async (req: Request, res: Response) => {
  const p = pageBySlug(req.params.slug)
  if (!p) { res.status(404).json({ error: 'Page introuvable' }); return }
  try {
    const buf = await runPandoc(fullMarkdown(p), ['-f', 'gfm', '-t', 'docx', '--toc', '-V', 'lang=fr', '-o', '-'])
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    res.setHeader('Content-Disposition', `attachment; filename="${asciiName(p.slug, 'docx')}"`)
    res.send(buf)
  } catch (e) {
    res.status(503).json({ error: 'Export DOCX indisponible (pandoc absent). Utilisez l’impression du navigateur.', detail: String(e instanceof Error ? e.message : e).slice(0, 300) })
  }
})

// Export PDF (pandoc + moteur HTML wkhtmltopdf ; dégrade proprement si indisponible)
router.get('/export/:slug.pdf', async (req: Request, res: Response) => {
  const p = pageBySlug(req.params.slug)
  if (!p) { res.status(404).json({ error: 'Page introuvable' }); return }
  try {
    const buf = await runPandoc(fullMarkdown(p), ['-f', 'gfm', '-t', 'pdf', '--pdf-engine=wkhtmltopdf', '-V', 'lang=fr', '-o', '-'])
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${asciiName(p.slug, 'pdf')}"`)
    res.send(buf)
  } catch (e) {
    res.status(503).json({ error: 'Export PDF serveur indisponible. Utilisez « Imprimer » (PDF du navigateur).', detail: String(e instanceof Error ? e.message : e).slice(0, 300) })
  }
})

/**
 * Injecte le contenu de référence du wiki au démarrage. Idempotent (INSERT OR IGNORE par slug) :
 * ne crée que les pages absentes et n'écrase jamais une page éditée par l'administrateur.
 */
export function seedWiki(): void {
  if (!Array.isArray(WIKI_SEED) || WIKI_SEED.length === 0) return
  const stmt = db.prepare(
    `INSERT OR IGNORE INTO wiki_pages (slug, categorie, titre, resume, contenu_md, statut, ordre)
     VALUES (@slug, @categorie, @titre, @resume, @contenu_md, @statut, @ordre)`,
  )
  const tx = db.transaction((rows: typeof WIKI_SEED) => {
    for (const r of rows) {
      stmt.run({
        slug: r.slug,
        categorie: r.categorie,
        titre: r.titre,
        resume: r.resume ?? '',
        contenu_md: r.contenu_md ?? '',
        statut: r.statut ?? 'redige',
        ordre: r.ordre ?? 0,
      })
    }
  })
  try {
    tx(WIKI_SEED)
    const n = (db.prepare('SELECT COUNT(*) AS n FROM wiki_pages').get() as { n: number }).n
    console.log(`[wiki] ${n} page(s) de documentation disponibles.`)
  } catch (e) {
    console.error('[wiki] échec du seed :', e)
  }
}

export default router
