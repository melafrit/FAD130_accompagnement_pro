import { describe, it, expect, afterAll, beforeAll } from 'vitest'
import { Session, asUser, DEMO } from '../helpers/api'

// Wiki avancé (Phase 2) : partage public opt-in (lien tokenisé), historique de versions, export global.
const BASE = process.env.BOUSSOLE_BASE || 'http://localhost:8080'
const SLUG = `tc-wiki-adv-${process.pid}`

async function admin() { return asUser(DEMO.admin) }
async function raw(cookie: string, path: string) {
  const r = await fetch(BASE + path, { headers: { cookie } })
  const b = Buffer.from(await r.arrayBuffer())
  return { status: r.status, ct: r.headers.get('content-type') || '', sig: b.slice(0, 4).toString('hex'), len: b.length, text: b.toString('utf8') }
}

describe('WIKI avancé — partage, versions, export global', () => {
  beforeAll(async () => {
    const a = await admin()
    await a.del(`/api/wiki/pages/${SLUG}`) // au cas où
    await a.post('/api/wiki/pages', { slug: SLUG, titre: 'Page test avancée', categorie: 'Divers', contenu_md: '# V0\n\nContenu initial.' })
  })
  afterAll(async () => { try { const a = await admin(); await a.del(`/api/wiki/pages/${SLUG}`) } catch { /* déjà supprimée */ } })

  it('TC-WIKI-016 — partage : génère un lien public, accessible SANS authentification', async () => {
    const a = await admin()
    const share = await a.post(`/api/wiki/pages/${SLUG}/share`)
    expect(share.status).toBe(200)
    expect(share.json.token).toMatch(/^[a-f0-9]{16,40}$/)
    const anon = new Session()
    const pub = await anon.get(`/api/wiki/public/${share.json.token}`)
    expect(pub.status).toBe(200)
    expect(pub.json.page.titre).toBe('Page test avancée')
    expect(pub.json.page.contenu_md).toContain('Contenu')
  })

  it('TC-WIKI-017 — un jeton inexistant ou invalide → 404 (pas de fuite)', async () => {
    const anon = new Session()
    const r1 = await anon.get('/api/wiki/public/0123456789abcdef0123456789abcdef') // bien formé, inexistant
    expect(r1.status).toBe(404)
    const r2 = await anon.get('/api/wiki/public/pas-un-jeton')
    expect(r2.status).toBe(404)
  })

  it('TC-WIKI-018 — révocation : le lien public ne fonctionne plus (404)', async () => {
    const a = await admin()
    const share = await a.post(`/api/wiki/pages/${SLUG}/share`)
    const token = share.json.token
    const anon = new Session()
    expect((await anon.get(`/api/wiki/public/${token}`)).status).toBe(200)
    const rev = await a.del(`/api/wiki/pages/${SLUG}/share`)
    expect(rev.status).toBe(200)
    expect((await anon.get(`/api/wiki/public/${token}`)).status).toBe(404)
  })

  it('TC-WIKI-019 — partage réservé à l’admin (accompagnateur → 403)', async () => {
    const acc = await asUser(DEMO.camille)
    expect((await acc.post(`/api/wiki/pages/${SLUG}/share`)).status).toBe(403)
  })

  it('TC-WIKI-020 — historique : chaque modification crée une version', async () => {
    const a = await admin()
    const before = (await a.get(`/api/wiki/pages/${SLUG}/versions`)).json.versions.length
    await a.patch(`/api/wiki/pages/${SLUG}`, { contenu_md: '# V1\n\nModif 1.' })
    await a.patch(`/api/wiki/pages/${SLUG}`, { contenu_md: '# V2\n\nModif 2.' })
    const after = (await a.get(`/api/wiki/pages/${SLUG}/versions`)).json.versions
    expect(after.length).toBe(before + 2)
    expect(after[0].version).toBeGreaterThan(after[1].version) // ordre décroissant
  })

  it('TC-WIKI-021 — restauration d’une version remet son contenu', async () => {
    const a = await admin()
    const versions = (await a.get(`/api/wiki/pages/${SLUG}/versions`)).json.versions
    const v = versions[versions.length - 1] // la plus ancienne (contenu initial « V0 »)
    const full = (await a.get(`/api/wiki/pages/${SLUG}/versions/${v.version}`)).json.version
    const restore = await a.post(`/api/wiki/pages/${SLUG}/versions/${v.version}/restore`)
    expect(restore.status).toBe(200)
    expect(restore.json.page.contenu_md).toBe(full.contenu_md)
  })

  it('TC-WIKI-022 — export global Markdown/DOCX/PDF (admin)', async () => {
    const a = await admin()
    const md = await raw(a.cookie, '/api/wiki/export-all.md')
    expect(md.status).toBe(200)
    expect(md.ct).toContain('markdown')
    expect(md.text).toContain('Sommaire')
    const docx = await raw(a.cookie, '/api/wiki/export-all.docx')
    expect(docx.status).toBe(200)
    expect(docx.sig).toBe('504b0304')
  }, 45000)

  it('TC-WIKI-023 — export global réservé à l’admin (anonyme → 401)', async () => {
    const anon = new Session()
    expect((await anon.get('/api/wiki/export-all.md')).status).toBe(401)
  })
})
