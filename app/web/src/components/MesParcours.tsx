import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'

interface Parcours {
  id: number; titre: string; statut: string
  acc_prenom: string | null; acc_nom: string | null; acc_email: string
  has_questionnaire: number; synthese_publiee: number; nb_cr: number; nb_rdv: number
}

export default function MesParcours() {
  const [dossiers, setDossiers] = useState<Parcours[]>([])
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    void api<{ dossiers: Parcours[] }>('/dossiers/mine').then((d) => setDossiers(d.dossiers)).catch(() => {}).finally(() => setLoaded(true))
  }, [])

  return (
    <section className="parcours-section">
      <div className="parcours-head">
        <h2>Mes parcours</h2>
        <Link className="btn btn-primary" to="/nouveau-parcours">+ Démarrer un nouveau parcours</Link>
      </div>
      {loaded && dossiers.length === 0 && <p className="muted">Tu n’as pas encore de parcours. Démarre ton premier parcours d’accompagnement avec le bouton ci-dessus.</p>}
      <div className="cards cards-actions">
        {dossiers.map((d) => {
          const acc = [d.acc_prenom, d.acc_nom].filter(Boolean).join(' ') || d.acc_email
          return (
            <div key={d.id} className="card">
              <h3>{d.titre}</h3>
              <p className="muted">Accompagnateur : {acc} · {d.statut === 'cloture' ? 'Clôturé' : 'En cours'}</p>
              <p className="parcours-badges">
                <span className={`pb ${d.has_questionnaire ? 'ok' : ''}`}>{d.has_questionnaire ? 'Questionnaire ✓' : 'Questionnaire à faire'}</span>
                {d.nb_cr > 0 && <span className="pb ok">{d.nb_cr} compte{d.nb_cr > 1 ? 's' : ''} rendu{d.nb_cr > 1 ? 's' : ''}</span>}
                {d.synthese_publiee ? <span className="pb ok">Synthèse ✓</span> : null}
              </p>
              <Link className="btn btn-primary" to={`/parcours/${d.id}`}>Ouvrir le parcours</Link>
            </div>
          )
        })}
      </div>
    </section>
  )
}
