import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../lib/api'

interface Ressource { titre: string; type: string; contenu: string; cree_le: string; auteur: string }
const TYPE_LABEL: Record<string, string> = { question: '❓ Question', methode: '🧭 Méthode', astuce: '💡 Astuce' }

// Page publique (sans authentification) : lecture d'une ressource partagée via son lien externe.
export default function RessourcePublique() {
  const { token } = useParams()
  const [ressource, setRessource] = useState<Ressource | null>(null)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    api<{ ressource: Ressource }>(`/collab/ressources/public/${token}`)
      .then((d) => setRessource(d.ressource))
      .catch(() => setErreur('Cette ressource n’existe pas ou n’est plus partagée publiquement.'))
  }, [token])

  return (
    <div className="page">
      <p className="kicker">Boussole · Ressource partagée</p>
      {erreur && <p className="form-error">{erreur}</p>}
      {ressource && (
        <article className="card" style={{ padding: 22 }}>
          <p className="muted" style={{ margin: 0 }}>{TYPE_LABEL[ressource.type] || ressource.type}</p>
          <h1 className="page-title" style={{ marginTop: 4 }}>{ressource.titre}</h1>
          <p style={{ whiteSpace: 'pre-wrap', fontSize: '1.05rem' }}>{ressource.contenu}</p>
          <p className="muted">Partagé par {ressource.auteur}.</p>
        </article>
      )}
      <p style={{ marginTop: 20 }}><Link className="btn btn-ghost" to="/">Découvrir Boussole</Link></p>
    </div>
  )
}
