import { useMemo, useState } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import { api } from '../../lib/api'
import { WikiStatusBadge } from '../../components/wiki/WikiBits'
import type { WikiCtx } from './WikiLayout'

function slugify(s: string): string {
  return s.normalize('NFD').replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)
}

export default function WikiHome() {
  const { pages, reload } = useOutletContext<WikiCtx>()
  const nav = useNavigate()
  const [showNew, setShowNew] = useState(false)
  const [titre, setTitre] = useState('')
  const [slug, setSlug] = useState('')
  const [categorie, setCategorie] = useState('Divers')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const groups = useMemo(() => {
    const m = new Map<string, typeof pages>()
    for (const p of pages) { if (!m.has(p.categorie)) m.set(p.categorie, []); m.get(p.categorie)!.push(p) }
    return Array.from(m.entries())
  }, [pages])

  const recent = useMemo(
    () => [...pages].sort((a, b) => String(b.maj_le).localeCompare(String(a.maj_le))).slice(0, 6),
    [pages],
  )

  async function create() {
    setBusy(true); setErr('')
    const finalSlug = (slug || slugify(titre)).trim()
    try {
      await api('/wiki/pages', {
        method: 'POST',
        body: JSON.stringify({ slug: finalSlug, titre: titre.trim(), categorie: categorie.trim() || 'Divers', statut: 'brouillon', ordre: 999, contenu_md: `# ${titre.trim()}\n\n` }),
      })
      reload()
      nav(`/admin/wiki/${finalSlug}`)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Création impossible')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="wiki-home">
      <header className="wiki-home-head">
        <div>
          <h1>📚 Wiki projet — Boussole</h1>
          <p className="wiki-home-sub">
            Documentation officielle du projet (cadrage, spécifications, architecture, sécurité, exploitation, guides).
            Espace réservé aux administrateurs · {pages.length} pages.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNew((v) => !v)}>+ Nouvelle page</button>
      </header>

      {showNew && (
        <div className="card wiki-newpage">
          <div className="wiki-newpage-row">
            <label className="field"><span>Titre</span>
              <input value={titre} onChange={(e) => { setTitre(e.target.value); if (!slug) setSlug(slugify(e.target.value)) }} />
            </label>
            <label className="field"><span>Slug (URL)</span>
              <input value={slug} onChange={(e) => setSlug(slugify(e.target.value))} placeholder="ex: notes-internes" />
            </label>
            <label className="field"><span>Catégorie</span>
              <input value={categorie} onChange={(e) => setCategorie(e.target.value)} />
            </label>
          </div>
          {err && <p className="form-error">{err}</p>}
          <div className="wiki-newpage-actions">
            <button className="btn btn-primary" onClick={create} disabled={busy || !titre.trim()}>Créer</button>
            <button className="btn btn-ghost" onClick={() => setShowNew(false)} disabled={busy}>Annuler</button>
          </div>
        </div>
      )}

      <section className="wiki-cats">
        {groups.map(([cat, items]) => (
          <div key={cat} className="card wiki-cat-card">
            <h2>{cat}</h2>
            <ul>
              {items.map((p) => (
                <li key={p.slug}>
                  <Link to={`/admin/wiki/${p.slug}`}>{p.titre}</Link>
                  {p.statut !== 'redige' && <WikiStatusBadge statut={p.statut} />}
                  {p.resume && <span className="wiki-cat-resume">{p.resume}</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {recent.length > 0 && (
        <section className="wiki-recent">
          <h2>Récemment mises à jour</h2>
          <ul>
            {recent.map((p) => (
              <li key={p.slug}><Link to={`/admin/wiki/${p.slug}`}>{p.titre}</Link> <span className="wiki-recent-date">{String(p.maj_le).slice(0, 16).replace('T', ' ')}</span></li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
