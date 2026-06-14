import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'

type Metrics = {
  service: string; version: string; node: string; started_at: string; uptime_s: number
  memory_mb: { rss: number; heap_used: number }
  requests: { total: number; '2xx': number; '3xx': number; '4xx': number; '5xx': number; avg_ms: number; error_rate: number }
  errors_logged: number
  db: Record<string, number>
  time: string
}
type ErrRow = { id: number; methode: string | null; chemin: string | null; statut: number; message: string; user_id: number | null; cree_le: string }
type Errors = { recent: ErrRow[]; byPath: { chemin: string; n: number }[] }

function fmtUptime(s: number): string {
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60)
  return [d ? `${d} j` : '', h ? `${h} h` : '', `${m} min`].filter(Boolean).join(' ')
}

export default function Observability() {
  const [m, setM] = useState<Metrics | null>(null)
  const [err, setErr] = useState<Errors | null>(null)
  const [auto, setAuto] = useState(true)
  const [updated, setUpdated] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(() => {
    Promise.all([api<Metrics>('/metrics'), api<Errors>('/metrics/errors?limit=20')])
      .then(([mm, ee]) => { setM(mm); setErr(ee); setUpdated(new Date().toLocaleTimeString()); setError('') })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur de chargement'))
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (!auto) return
    const id = setInterval(load, 10000)
    return () => clearInterval(id)
  }, [auto, load])

  if (error) return <div className="page"><p className="form-error">{error}</p></div>
  if (!m) return <div className="page"><p>Chargement des métriques…</p></div>

  const req = m.requests
  const classes = [
    { k: '2xx', label: 'Succès (2xx)', v: req['2xx'], cls: 'ok' },
    { k: '3xx', label: 'Redirections (3xx)', v: req['3xx'], cls: 'info' },
    { k: '4xx', label: 'Erreurs client (4xx)', v: req['4xx'], cls: 'warn' },
    { k: '5xx', label: 'Erreurs serveur (5xx)', v: req['5xx'], cls: 'err' },
  ]
  const maxClass = Math.max(1, ...classes.map((c) => c.v))

  return (
    <div className="page obs">
      <p className="kicker">Administration</p>
      <div className="obs-head">
        <h1 className="page-title">Observabilité</h1>
        <div className="obs-controls">
          <span className="obs-updated">Mise à jour : {updated || '—'}</span>
          <label className="obs-auto"><input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> Auto (10 s)</label>
          <button className="btn btn-ghost btn-sm" onClick={load}>↻ Rafraîchir</button>
        </div>
      </div>

      <section className="card obs-status" aria-label="État du service">
        <span className="obs-dot" aria-hidden="true" /> Service <strong>{m.service}</strong> v{m.version} · Node {m.node}
        · démarré il y a <strong>{fmtUptime(m.uptime_s)}</strong>
        · mémoire <strong>{m.memory_mb.rss} Mo</strong> (heap {m.memory_mb.heap_used} Mo)
      </section>

      <section className="obs-kpis" aria-label="Indicateurs clés">
        <div className="card obs-kpi"><span className="obs-kpi-v">{req.total}</span><span className="obs-kpi-l">Requêtes traitées</span></div>
        <div className="card obs-kpi"><span className="obs-kpi-v">{req.avg_ms} ms</span><span className="obs-kpi-l">Latence moyenne</span></div>
        <div className={`card obs-kpi ${req.error_rate > 0 ? 'obs-kpi-alert' : ''}`}><span className="obs-kpi-v">{(req.error_rate * 100).toFixed(2)} %</span><span className="obs-kpi-l">Taux d'erreur 5xx</span></div>
        <div className={`card obs-kpi ${m.errors_logged > 0 ? 'obs-kpi-alert' : ''}`}><span className="obs-kpi-v">{m.errors_logged}</span><span className="obs-kpi-l">Erreurs journalisées</span></div>
      </section>

      <section className="card">
        <h2>Réponses par classe de statut HTTP</h2>
        <div className="obs-bars">
          {classes.map((c) => (
            <div className="obs-bar-row" key={c.k}>
              <span className="obs-bar-label">{c.label}</span>
              <span className="obs-bar-track"><span className={`obs-bar-fill obs-${c.cls}`} style={{ width: `${(c.v / maxClass) * 100}%` }} /></span>
              <span className="obs-bar-val">{c.v}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Volumétrie des données</h2>
        <div className="obs-db">
          {Object.entries(m.db).map(([k, v]) => (
            <div className="obs-db-item" key={k}><span className="obs-db-v">{v}</span><span className="obs-db-l">{k}</span></div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Dernières erreurs serveur</h2>
        {err && err.recent.length > 0 ? (
          <div className="obs-table-wrap">
            <table className="obs-errors">
              <thead><tr><th>Date</th><th>Statut</th><th>Méthode</th><th>Chemin</th><th>Message</th></tr></thead>
              <tbody>
                {err.recent.map((e) => (
                  <tr key={e.id}>
                    <td>{(e.cree_le || '').slice(0, 19).replace('T', ' ')}</td>
                    <td><span className="obs-badge-err">{e.statut}</span></td>
                    <td>{e.methode}</td>
                    <td>{e.chemin}</td>
                    <td className="obs-msg">{e.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">Aucune erreur serveur journalisée. ✅</p>
        )}
        {err && err.byPath.length > 0 && (
          <p className="obs-bypath"><strong>Endpoints les plus en erreur :</strong> {err.byPath.map((p) => `${p.chemin} (${p.n})`).join(' · ')}</p>
        )}
      </section>

      <p style={{ marginTop: 18 }}><Link className="btn btn-ghost" to="/admin">← Administration</Link></p>
    </div>
  )
}
