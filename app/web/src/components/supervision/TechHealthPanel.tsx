import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api'

type Dep = { status: 'ok' | 'warn' | 'down' | 'unknown'; detail: string; since: string | null }
type Health = { claude: Dep; brevo: Dep; database: Dep; backups: Dep; error_rate: Dep; time: string }

const ITEMS: { key: keyof Health; label: string }[] = [
  { key: 'claude', label: 'IA Claude (Anthropic)' },
  { key: 'brevo', label: 'Email (Brevo)' },
  { key: 'database', label: 'Base de données (SQLite)' },
  { key: 'backups', label: 'Sauvegardes' },
  { key: 'error_rate', label: 'Taux d’erreur serveur' },
]
const STATUS: Record<string, { label: string; cls: string }> = {
  ok: { label: 'Opérationnel', cls: 'ok' },
  warn: { label: 'À surveiller', cls: 'warn' },
  down: { label: 'En panne', cls: 'down' },
  unknown: { label: 'Inconnu', cls: 'unknown' },
}

/** Panneau « Monitoring technique » : santé des dépendances en temps réel. */
export default function TechHealthPanel() {
  const [h, setH] = useState<Health | null>(null)
  const [auto, setAuto] = useState(true)
  const [updated, setUpdated] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(() => {
    api<Health>('/monitoring/health')
      .then((d) => { setH(d); setUpdated(new Date().toLocaleTimeString()); setError('') })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur'))
  }, [])
  useEffect(() => { load() }, [load])
  useEffect(() => { if (!auto) return; const id = setInterval(load, 10000); return () => clearInterval(id) }, [auto, load])

  if (error) return <p className="form-error">{error}</p>
  if (!h) return <p>Chargement de l’état de santé…</p>

  const items = ITEMS.map((it) => ({ ...it, dep: h[it.key] as Dep }))
  const worst = items.some((i) => i.dep.status === 'down') ? 'down' : items.some((i) => i.dep.status === 'warn') ? 'warn' : 'ok'

  return (
    <div className="sup-health">
      <div className="obs-controls obs-controls-right">
        <span className="obs-updated">Mise à jour : {updated || '—'}</span>
        <label className="obs-auto"><input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> Auto (10 s)</label>
        <button className="btn btn-ghost btn-sm" onClick={load}>↻ Rafraîchir</button>
      </div>

      <section className={`card sup-overall sup-overall-${worst}`}>
        <span className={`sup-dot sup-dot-${worst}`} aria-hidden="true" />
        <strong>État global : {STATUS[worst].label}</strong>
        <span className="muted"> — un email est envoyé à l’admin lors d’un passage à un état dégradé.</span>
      </section>

      <div className="sup-deps">
        {items.map(({ key, label, dep }) => {
          const s = STATUS[dep.status] || STATUS.unknown
          return (
            <div className={`card sup-dep sup-dep-${s.cls}`} key={key}>
              <div className="sup-dep-head">
                <span className={`sup-dot sup-dot-${s.cls}`} aria-hidden="true" />
                <strong>{label}</strong>
                <span className={`sup-badge sup-badge-${s.cls}`}>{s.label}</span>
              </div>
              <p className="sup-dep-detail">{dep.detail}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
