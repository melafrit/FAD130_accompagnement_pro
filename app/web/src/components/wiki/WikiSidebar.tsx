import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { WikiStatusBadge } from './WikiBits'

export type WikiMeta = { id: number; slug: string; categorie: string; titre: string; resume?: string; statut: string; ordre: number; maj_le?: string }
type Hit = { slug: string; categorie: string; titre: string; extrait: string }

export default function WikiSidebar({ pages, currentSlug }: { pages: WikiMeta[]; currentSlug?: string }) {
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<Hit[]>([])
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Groupe les pages par catégorie en respectant l'ordre.
  const groups = useMemo(() => {
    const map = new Map<string, WikiMeta[]>()
    for (const p of pages) {
      if (!map.has(p.categorie)) map.set(p.categorie, [])
      map.get(p.categorie)!.push(p)
    }
    return Array.from(map.entries())
  }, [pages])

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    const query = q.trim()
    if (query.length < 2) { setHits([]); return }
    timer.current = setTimeout(() => {
      api<{ resultats: Hit[] }>(`/wiki/search?q=${encodeURIComponent(query)}`)
        .then((d) => setHits(d.resultats || []))
        .catch(() => setHits([]))
    }, 220)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [q])

  return (
    <aside className="wiki-sidebar" aria-label="Navigation du wiki">
      <Link to="/admin/wiki" className="wiki-sidebar-home">📚 Wiki projet</Link>
      <div className="wiki-search">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher dans la documentation…"
          aria-label="Rechercher dans la documentation"
        />
      </div>

      {q.trim().length >= 2 ? (
        <div className="wiki-search-results">
          <p className="wiki-search-count">{hits.length} résultat(s)</p>
          <ul>
            {hits.map((h) => (
              <li key={h.slug}>
                <button className="wiki-search-hit" onClick={() => { setQ(''); nav(`/admin/wiki/${h.slug}`) }}>
                  <span className="wiki-search-hit-title">{h.titre}</span>
                  <span className="wiki-search-hit-cat">{h.categorie}</span>
                  {h.extrait && <span className="wiki-search-hit-extract">…{h.extrait}…</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <nav className="wiki-nav">
          {groups.map(([cat, items]) => (
            <div key={cat} className="wiki-nav-group">
              <p className="wiki-nav-cat">{cat}</p>
              <ul>
                {items.map((p) => (
                  <li key={p.slug}>
                    <Link
                      to={`/admin/wiki/${p.slug}`}
                      className={p.slug === currentSlug ? 'wiki-nav-link active' : 'wiki-nav-link'}
                      aria-current={p.slug === currentSlug ? 'page' : undefined}
                    >
                      <span>{p.titre}</span>
                      {p.statut !== 'redige' && <WikiStatusBadge statut={p.statut} />}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      )}
    </aside>
  )
}
