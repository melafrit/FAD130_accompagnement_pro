import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import WikiMarkdown from '../../components/wiki/WikiMarkdown'
import '../../components/wiki/wiki.css'

type PublicPage = { slug: string; categorie: string; titre: string; resume: string | null; contenu_md: string; maj_le: string }

/** Page de wiki partagée publiquement en lecture seule (accès par jeton, sans authentification). */
export default function WikiPublic() {
  const { token } = useParams()
  const [page, setPage] = useState<PublicPage | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch(`/api/wiki/public/${token}`)
      .then(async (r) => {
        if (!r.ok) { if (!cancelled) setError('Cette page n’est pas partagée publiquement, ou le lien a été révoqué.'); return }
        const d = await r.json()
        if (!cancelled) setPage(d.page)
      })
      .catch(() => { if (!cancelled) setError('Chargement impossible.') })
    return () => { cancelled = true }
  }, [token])

  return (
    <div className="page wiki-page-root">
      <div className="wiki-article">
        <p className="wiki-breadcrumb">
          <Link to="/">Boussole</Link>
          <span aria-hidden="true"> › </span>
          <span>Documentation partagée (lecture seule)</span>
        </p>
        {error && <p className="form-error">{error}</p>}
        {!error && !page && <p>Chargement…</p>}
        {page && (
          <>
            <header className="wiki-article-head">
              <div className="wiki-article-titleline">
                <h1>{page.titre}</h1>
              </div>
              {page.resume && <p className="wiki-home-sub">{page.resume}</p>}
            </header>
            <div className="wiki-article-content">
              <WikiMarkdown markdown={page.contenu_md} />
            </div>
            <footer className="wiki-licence-footer">
              <p>
                <strong>Boussole</strong> — Documentation du projet (UE FAD130, Cnam) · <strong>Auteur : Mohamed El Afrit</strong> ·{' '}
                <a href="https://www.mohamedelafrit.com" target="_blank" rel="noopener noreferrer">mohamedelafrit.com</a>
              </p>
              <p>
                © 2026 Mohamed El Afrit · Contenu sous licence <strong>CC&nbsp;BY-NC-SA&nbsp;4.0</strong>. Page partagée en lecture seule.
              </p>
            </footer>
          </>
        )}
      </div>
    </div>
  )
}
