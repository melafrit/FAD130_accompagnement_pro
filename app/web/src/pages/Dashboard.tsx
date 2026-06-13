import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useFeature } from '../features/FeaturesContext'
import PilotageBoard from '../components/PilotageBoard'

interface Tag { id: number; nom: string }
interface Signal { dossier_id: number; niveau: 'vert' | 'orange' | 'rouge'; raisons: string[] }
const SIGNAL_COULEUR: Record<string, string> = { vert: '#16a34a', orange: '#f59e0b', rouge: '#dc2626' }
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
  const [signaux, setSignaux] = useState<Record<number, Signal>>({})
  const signauxActifs = useFeature('signaux_faibles')
  const bilanActif = useFeature('bilan_pratique')

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
  useEffect(() => {
    if (!signauxActifs) return
    api<{ signaux: Signal[] }>('/pilotage/signaux')
      .then((d) => setSignaux(Object.fromEntries(d.signaux.map((s) => [s.dossier_id, s]))))
      .catch(() => { /* ignore */ })
  }, [signauxActifs])

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
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Tableau de bord</h1>
        {bilanActif && <Link className="btn btn-ghost btn-sm" to="/bilan-pratique">🪞 Bilan de ma pratique</Link>}
      </div>

      <PilotageBoard />

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
          const sig = signaux[d.id]
          return (
            <div key={d.id} className="card dash-card">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {signauxActifs && sig && (
                  <span
                    aria-label={`Signal ${sig.niveau} : ${sig.raisons.join(', ')}`}
                    title={sig.raisons.join('\n')}
                    style={{ width: 12, height: 12, borderRadius: '50%', flex: '0 0 auto', background: SIGNAL_COULEUR[sig.niveau], boxShadow: '0 0 0 2px rgba(0,0,0,.06)' }}
                  />
                )}
                {d.accompagne_prenom || d.accompagne_email}
              </h3>
              {signauxActifs && sig && sig.niveau !== 'vert' && (
                <p style={{ margin: '0 0 6px', fontSize: '.82rem', color: SIGNAL_COULEUR[sig.niveau] }}>{sig.raisons[0]}</p>
              )}
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
                <Link className="btn btn-primary" to={`/dossier/${d.id}`}>Ouvrir le dossier</Link>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
