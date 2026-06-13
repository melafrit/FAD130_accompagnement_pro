import { useCallback, useEffect, useState } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import { api } from '../../lib/api'
import WikiSidebar, { type WikiMeta } from '../../components/wiki/WikiSidebar'
import '../../components/wiki/wiki.css'

export type WikiCtx = { pages: WikiMeta[]; reload: () => void }

/** Coquille du wiki : barre latérale (navigation + recherche) + contenu (Outlet). Liste chargée une fois. */
export default function WikiLayout() {
  const { slug } = useParams()
  const [pages, setPages] = useState<WikiMeta[]>([])
  const [loaded, setLoaded] = useState(false)

  const reload = useCallback(() => {
    api<{ pages: WikiMeta[] }>('/wiki/pages')
      .then((d) => setPages(d.pages || []))
      .catch(() => setPages([]))
      .finally(() => setLoaded(true))
  }, [])

  useEffect(() => { reload() }, [reload])

  return (
    <div className="page wiki-page-root">
      <div className="wiki-layout">
        <WikiSidebar pages={pages} currentSlug={slug} />
        <main className="wiki-main" id="wiki-main">
          {loaded ? <Outlet context={{ pages, reload } satisfies WikiCtx} /> : <p>Chargement du wiki…</p>}
        </main>
      </div>
    </div>
  )
}
