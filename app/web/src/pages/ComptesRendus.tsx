import { useEffect, useState, lazy, Suspense } from 'react'
import { api } from '../lib/api'
import ErrorBoundary from '../components/ErrorBoundary'
const CompteRenduModal = lazy(() => import('../components/CompteRenduModal'))

interface CR { id: number; session_id: number; genere_le: string; publie_le: string | null; entretien_date: string; dossier_titre: string | null }

export default function ComptesRendus() {
  const [crs, setCrs] = useState<CR[]>([])
  const [openSession, setOpenSession] = useState<number | null>(null)

  function load() {
    void api<{ comptesRendus: CR[] }>('/cr/mine').then((d) => setCrs(d.comptesRendus))
  }
  useEffect(() => { load() }, [])

  return (
    <div className="page">
      <p className="kicker">Mon espace</p>
      <h1 className="page-title">Mes comptes rendus</h1>
      <div className="slots">
        {crs.length === 0 && <p className="muted">Aucun compte rendu pour l'instant.</p>}
        {crs.map((c) => (
          <div key={c.id} className="slot">
            <span>Compte rendu — entretien du {(c.entretien_date || '').slice(0, 10)}{c.publie_le ? ` · publié le ${(c.publie_le || '').slice(0, 10)}` : ''}</span>
            <button className="btn btn-primary" onClick={() => setOpenSession(c.session_id)}>Consulter</button>
          </div>
        ))}
      </div>
      <ErrorBoundary onReset={() => setOpenSession(null)}>
        <Suspense fallback={null}>
          {openSession != null && <CompteRenduModal sessionId={openSession} role="accompagne" onClose={() => { setOpenSession(null); load() }} />}
        </Suspense>
      </ErrorBoundary>
    </div>
  )
}
