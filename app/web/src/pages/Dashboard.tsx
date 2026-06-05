import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'

interface DDossier {
  id: number
  accompagne_prenom: string | null
  accompagne_email: string
  nb_sessions: number
  actions_ouvertes: number
  questionnaire: number
  nb_cr: number
}

export default function Dashboard() {
  const [dossiers, setDossiers] = useState<DDossier[]>([])

  useEffect(() => {
    void api<{ dossiers: DDossier[] }>('/entretien/dashboard').then((d) => setDossiers(d.dossiers))
  }, [])

  return (
    <div className="page">
      <p className="kicker">Accompagnateur</p>
      <h1 className="page-title">Tableau de bord</h1>
      {dossiers.length === 0 && <p className="muted">Aucun accompagné pour l'instant. Un dossier apparaît quand un accompagné complète son questionnaire initial.</p>}
      <div className="dash-grid">
        {dossiers.map((d) => (
          <div key={d.id} className="card dash-card">
            <h3>{d.accompagne_prenom || d.accompagne_email}</h3>
            <ul className="dash-stats">
              <li>Questionnaire : {d.questionnaire ? '✓' : '—'}</li>
              <li>Entretiens : {d.nb_sessions}</li>
              <li>Comptes rendus : {d.nb_cr}</li>
              <li>Actions en cours : <strong>{d.actions_ouvertes}</strong></li>
            </ul>
            <div className="dash-actions">
              <Link className="btn btn-ghost" to={`/plan-action/${d.id}`}>Plan d'action</Link>
              <Link className="btn btn-primary" to="/entretien">Entretien</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
