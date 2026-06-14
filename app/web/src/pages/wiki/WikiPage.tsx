import { useEffect, useRef, useState } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { api } from '../../lib/api'
import WikiMarkdown from '../../components/wiki/WikiMarkdown'
import WikiToc from '../../components/wiki/WikiToc'
import WikiExportActions from '../../components/wiki/WikiExportActions'
import WikiEditor, { type WikiFullPage } from '../../components/wiki/WikiEditor'
import { WikiBreadcrumb, WikiStatusBadge } from '../../components/wiki/WikiBits'
import type { WikiCtx } from './WikiLayout'

export default function WikiPage() {
  const { slug } = useParams()
  const { reload } = useOutletContext<WikiCtx>()
  const nav = useNavigate()
  const [page, setPage] = useState<WikiFullPage | null>(null)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    setPage(null)
    setEditing(false)
    setError('')
    api<{ page: WikiFullPage }>(`/wiki/pages/${slug}`)
      .then((d) => { if (!cancelled) setPage(d.page) })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Page introuvable') })
    return () => { cancelled = true }
  }, [slug])

  async function remove() {
    if (!page) return
    if (!window.confirm(`Supprimer définitivement la page « ${page.titre} » ?`)) return
    try {
      await api(`/wiki/pages/${page.slug}`, { method: 'DELETE' })
      reload()
      nav('/admin/wiki')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Suppression impossible')
    }
  }

  if (error) return <div className="wiki-article"><WikiBreadcrumb /><p className="form-error">{error}</p></div>
  if (!page) return <p>Chargement…</p>

  return (
    <div className="wiki-article">
      <WikiBreadcrumb categorie={page.categorie} titre={page.titre} />

      <header className="wiki-article-head">
        <div className="wiki-article-titleline">
          <h1>{page.titre}</h1>
          <WikiStatusBadge statut={page.statut} />
        </div>
        {!editing && (
          <div className="wiki-article-tools">
            <WikiExportActions slug={page.slug} />
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>✎ Modifier</button>
            <button className="btn btn-ghost btn-sm wiki-danger" onClick={remove}>🗑 Supprimer</button>
          </div>
        )}
      </header>

      {editing ? (
        <WikiEditor
          page={page}
          onSaved={(p) => { setPage(p); setEditing(false); reload() }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <>
          <div className="wiki-article-body">
            <div className="wiki-article-content" ref={contentRef}>
              <WikiMarkdown markdown={page.contenu_md} />
            </div>
            <WikiToc containerRef={contentRef} markdown={page.contenu_md} />
          </div>
          <footer className="wiki-licence-footer">
            <p>
              <strong>Boussole</strong> — Documentation du projet (UE FAD130, Cnam) · <strong>Auteur : Mohamed El Afrit</strong> ·{' '}
              <a href="https://www.mohamedelafrit.com" target="_blank" rel="noopener noreferrer">mohamedelafrit.com</a>
            </p>
            <p>
              © 2026 Mohamed El Afrit · Projet <strong>open source</strong> — contenu sous licence{' '}
              <strong>CC&nbsp;BY-NC-SA&nbsp;4.0</strong>, code sous <strong>AGPL-3.0</strong>.
            </p>
          </footer>
        </>
      )}
    </div>
  )
}
