import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'

interface Tag { id: number; nom: string }
interface DDossier {
  id: number
  accompagne_prenom: string | null
  accompagne_email: string
  nb_sessions: number
  actions_ouvertes: number
  questionnaire: number
  nb_cr: number
  tags: string | null
}

function parseTags(s: string | null): Tag[] {
  if (!s) return []
  return s.split(',').map((p) => {
    const [id, ...rest] = p.split('|')
    return { id: Number(id), nom: rest.join('|') }
  })
}

export default function Dashboard() {
  const [dossiers, setDossiers] = useState<DDossier[]>([])
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [filtre, setFiltre] = useState('')
  const [nouveauTag, setNouveauTag] = useState<Record<number, string>>({})

  async function load() {
    const [d, t] = await Promise.all([
      api<{ dossiers: DDossier[] }>('/entretien/dashboard'),
      api<{ tags: Tag[] }>('/tags'),
    ])
    setDossiers(d.dossiers)
    setAllTags(t.tags)
  }
  useEffect(() => {
    void load()
  }, [])

  async function addTag(e: FormEvent, dossierId: number) {
    e.preventDefault()
    const nom = (nouveauTag[dossierId] || '').trim()
    if (!nom) return
    await api(`/tags/dossier/${dossierId}`, { method: 'POST', body: JSON.stringify({ nom }) })
    setNouveauTag((n) => ({ ...n, [dossierId]: '' }))
    await load()
  }
  async function removeTag(dossierId: number, tagId: number) {
    await api(`/tags/dossier/${dossierId}/${tagId}`, { method: 'DELETE' })
    await load()
  }

  const filtres = filtre ? dossiers.filter((d) => parseTags(d.tags).some((t) => t.nom === filtre)) : dossiers

  return (
    <div className="page">
      <p className="kicker">Accompagnateur</p>
      <h1 className="page-title">Tableau de bord</h1>

      {allTags.length > 0 && (
        <div className="dash-filter">
          <label>Filtrer par tag :</label>
          <select value={filtre} onChange={(e) => setFiltre(e.target.value)}>
            <option value="">Tous</option>
            {allTags.map((t) => <option key={t.id} value={t.nom}>{t.nom}</option>)}
          </select>
        </div>
      )}

      {filtres.length === 0 && <p className="muted">Aucun accompagné{filtre ? ' avec ce tag' : " pour l'instant"}.</p>}
      <div className="dash-grid">
        {filtres.map((d) => {
          const tags = parseTags(d.tags)
          return (
            <div key={d.id} className="card dash-card">
              <h3>{d.accompagne_prenom || d.accompagne_email}</h3>
              <ul className="dash-stats">
                <li>Questionnaire : {d.questionnaire ? '✓' : '—'}</li>
                <li>Entretiens : {d.nb_sessions}</li>
                <li>Comptes rendus : {d.nb_cr}</li>
                <li>Actions en cours : <strong>{d.actions_ouvertes}</strong></li>
              </ul>
              <div className="tag-chips">
                {tags.map((t) => (
                  <span key={t.id} className="tag-chip">{t.nom}<button onClick={() => removeTag(d.id, t.id)} aria-label="Retirer le tag">×</button></span>
                ))}
              </div>
              <form className="tag-add" onSubmit={(e) => addTag(e, d.id)}>
                <input value={nouveauTag[d.id] || ''} onChange={(e) => setNouveauTag((n) => ({ ...n, [d.id]: e.target.value }))} placeholder="+ ajouter un tag (Entrée)" />
              </form>
              <div className="dash-actions">
                <Link className="btn btn-ghost" to={`/plan-action/${d.id}`}>Plan d'action</Link>
                <Link className="btn btn-primary" to="/entretien">Entretien</Link>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
