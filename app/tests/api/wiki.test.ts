import { describe, it, expect, afterAll } from 'vitest'
import { Session, asUser, DEMO } from '../helpers/api'

// Wiki documentaire interne — ADMIN ONLY. Couvre : contrôle d'accès (401/403/200),
// liste/détail, recherche, CRUD (201/409/400/200/404), exports (Markdown, DOCX, PDF via pandoc).
const BASE = process.env.BOUSSOLE_BASE || 'http://localhost:8080'
const TMP = `tc-wiki-tmp-${process.pid}`

/** Lecture brute (binaire) d'un export, avec le cookie de session admin. */
async function rawExport(cookie: string, path: string) {
  const r = await fetch(BASE + path, { headers: { cookie } })
  const buf = Buffer.from(await r.arrayBuffer())
  return { status: r.status, ct: r.headers.get('content-type') || '', sig: buf.slice(0, 4).toString('hex'), len: buf.length }
}

describe('WIKI — espace documentaire admin-only', () => {
  afterAll(async () => {
    // Filet de sécurité : supprime la page jetable si un test a échoué avant son nettoyage.
    try { const a = await asUser(DEMO.admin); await a.del(`/api/wiki/pages/${TMP}`) } catch { /* déjà absente */ }
  })

  it('TC-WIKI-001 — accès anonyme refusé (401)', async () => {
    const r = await new Session().get('/api/wiki/pages')
    expect(r.status).toBe(401)
  })

  it('TC-WIKI-002 — accompagnateur refusé (403, admin-only)', async () => {
    const s = await asUser(DEMO.camille)
    const r = await s.get('/api/wiki/pages')
    expect(r.status).toBe(403)
  })

  it('TC-WIKI-003 — accompagné refusé sur le détail (403)', async () => {
    const s = await asUser(DEMO.amine)
    const r = await s.get('/api/wiki/pages/security')
    expect(r.status).toBe(403)
  })

  it('TC-WIKI-004 — admin : liste des pages de référence (200, ≥ 20 pages, plusieurs catégories)', async () => {
    const s = await asUser(DEMO.admin)
    const r = await s.get('/api/wiki/pages')
    expect(r.status).toBe(200)
    const pages = r.json.pages || []
    expect(pages.length).toBeGreaterThanOrEqual(20)
    expect(new Set(pages.map((p: { categorie: string }) => p.categorie)).size).toBeGreaterThanOrEqual(4)
  })

  it('TC-WIKI-005 — admin : détail d’une page (200 + contenu Markdown)', async () => {
    const s = await asUser(DEMO.admin)
    const r = await s.get('/api/wiki/pages/executive-summary')
    expect(r.status).toBe(200)
    expect(typeof r.json.page.contenu_md).toBe('string')
    expect(r.json.page.contenu_md.length).toBeGreaterThan(300)
  })

  it('TC-WIKI-006 — détail d’une page inexistante (404)', async () => {
    const s = await asUser(DEMO.admin)
    const r = await s.get('/api/wiki/pages/page-qui-nexiste-pas')
    expect(r.status).toBe(404)
  })

  it('TC-WIKI-007 — recherche plein-texte (200 + résultats)', async () => {
    const s = await asUser(DEMO.admin)
    const r = await s.get('/api/wiki/search?q=architecture')
    expect(r.status).toBe(200)
    expect((r.json.resultats || []).length).toBeGreaterThan(0)
  })

  it('TC-WIKI-008 — création d’une page (201)', async () => {
    const s = await asUser(DEMO.admin)
    const r = await s.post('/api/wiki/pages', { slug: TMP, titre: 'Page jetable', categorie: 'Divers', contenu_md: '# Jetable\n\nContenu.' })
    expect(r.status).toBe(201)
    expect(r.json.page.slug).toBe(TMP)
  })

  it('TC-WIKI-009 — slug déjà existant refusé (409)', async () => {
    const s = await asUser(DEMO.admin)
    const r = await s.post('/api/wiki/pages', { slug: 'security', titre: 'X' })
    expect(r.status).toBe(409)
  })

  it('TC-WIKI-010 — slug invalide refusé (400)', async () => {
    const s = await asUser(DEMO.admin)
    const r = await s.post('/api/wiki/pages', { slug: 'Slug Invalide !', titre: 'X' })
    expect(r.status).toBe(400)
  })

  it('TC-WIKI-011 — mise à jour du contenu (200, persistée)', async () => {
    const s = await asUser(DEMO.admin)
    const patch = await s.patch(`/api/wiki/pages/${TMP}`, { contenu_md: '# Jetable\n\nModifié.', statut: 'brouillon' })
    expect(patch.status).toBe(200)
    const reread = await s.get(`/api/wiki/pages/${TMP}`)
    expect(reread.json.page.contenu_md).toContain('Modifié')
    expect(reread.json.page.statut).toBe('brouillon')
  })

  it('TC-WIKI-012 — suppression (200) puis introuvable (404)', async () => {
    const s = await asUser(DEMO.admin)
    const del = await s.del(`/api/wiki/pages/${TMP}`)
    expect(del.status).toBe(200)
    const after = await s.get(`/api/wiki/pages/${TMP}`)
    expect(after.status).toBe(404)
  })

  it('TC-WIKI-013 — export Markdown (200, text/markdown)', async () => {
    const s = await asUser(DEMO.admin)
    const e = await rawExport(s.cookie, '/api/wiki/export/glossary.md')
    expect(e.status).toBe(200)
    expect(e.ct).toContain('markdown')
    expect(e.len).toBeGreaterThan(100)
  })

  it('TC-WIKI-014 — export DOCX via pandoc (200, signature ZIP/OOXML)', async () => {
    const s = await asUser(DEMO.admin)
    const e = await rawExport(s.cookie, '/api/wiki/export/glossary.docx')
    expect(e.status).toBe(200)
    expect(e.sig).toBe('504b0304') // en-tête ZIP -> conteneur .docx
  }, 30000)

  it('TC-WIKI-015 — export PDF via pandoc (200, signature %PDF)', async () => {
    const s = await asUser(DEMO.admin)
    const e = await rawExport(s.cookie, '/api/wiki/export/glossary.pdf')
    expect(e.status).toBe(200)
    expect(e.sig).toBe('25504446') // %PDF
  }, 45000)
})
