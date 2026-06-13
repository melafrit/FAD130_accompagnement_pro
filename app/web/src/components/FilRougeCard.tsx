import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'

interface FilRouge { fil: string; axes: string[]; explication: string; partage: number }

// Fil rouge du mémoire (côté accompagnateur) : l'IA le fait émerger, tu décides de le partager.
export default function FilRougeCard({ dossierId }: { dossierId: number | string }) {
  const [fr, setFr] = useState<FilRouge | null>(null)
  const [busy, setBusy] = useState(false)
  const load = useCallback(async () => { setFr((await api<{ filRouge: FilRouge | null }>(`/emergence/dossier/${dossierId}/fil-rouge`)).filRouge) }, [dossierId])
  useEffect(() => { void load().catch(() => { /* ignore */ }) }, [load])

  async function gen() { setBusy(true); try { setFr(await api<FilRouge>(`/emergence/dossier/${dossierId}/fil-rouge`, { method: 'POST' })) } finally { setBusy(false) } }
  async function togglePartage() {
    if (!fr) return
    await api(`/emergence/dossier/${dossierId}/fil-rouge/partage`, { method: 'PATCH', body: JSON.stringify({ partage: fr.partage ? 0 : 1 }) })
    await load()
  }

  return (
    <section className="emergence">
      <h2>🧵 Fil rouge du mémoire <span className="muted">(IA — tu décides du partage)</span></h2>
      {!fr ? (
        <button className="btn btn-primary" disabled={busy} onClick={gen}>{busy ? 'Analyse en cours…' : '✨ Faire émerger le fil rouge'}</button>
      ) : (
        <>
          <p className="emergence-fil">« {fr.fil} »</p>
          {fr.axes?.length > 0 && <ul className="emergence-axes">{fr.axes.map((a, i) => <li key={i}>{a}</li>)}</ul>}
          {fr.explication && <p className="muted">{fr.explication}</p>}
          <div className="emergence-acts">
            <button className="btn btn-ghost btn-sm" disabled={busy} onClick={gen}>↻ Régénérer</button>
            <button className={`btn btn-sm ${fr.partage ? 'btn-ghost' : 'btn-primary'}`} onClick={togglePartage}>
              {fr.partage ? '🔓 Partagé — retirer le partage' : '📣 Partager avec l’accompagné'}
            </button>
          </div>
        </>
      )}
    </section>
  )
}
