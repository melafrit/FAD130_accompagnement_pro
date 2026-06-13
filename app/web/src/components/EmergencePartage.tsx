import { useEffect, useState } from 'react'
import { api } from '../lib/api'

interface Moment { verbatim: string; pourquoi: string }
interface FilRouge { fil: string; axes: string[]; explication: string }

// Côté accompagné : affiche le fil rouge et les moments-clés QUE l'accompagnateur a partagés.
export default function EmergencePartage({ dossierId }: { dossierId: number | string }) {
  const [fil, setFil] = useState<FilRouge | null>(null)
  const [moments, setMoments] = useState<Moment[]>([])
  useEffect(() => {
    void (async () => {
      try {
        const d = await api<{ filRouge: FilRouge | null; moments: Moment[] }>(`/emergence/mine/dossier/${dossierId}`)
        setFil(d.filRouge); setMoments(d.moments || [])
      } catch { /* ignore */ }
    })()
  }, [dossierId])

  if (!fil && moments.length === 0) return null
  return (
    <section className="emergence">
      {fil && (
        <>
          <h2>🧵 Le fil rouge de ton mémoire <span className="muted">(proposé par ton accompagnateur)</span></h2>
          <p className="emergence-fil">« {fil.fil} »</p>
          {fil.axes?.length > 0 && <ul className="emergence-axes">{fil.axes.map((a, i) => <li key={i}>{a}</li>)}</ul>}
          {fil.explication && <p className="muted">{fil.explication}</p>}
        </>
      )}
      {moments.length > 0 && (
        <>
          <h3 style={{ marginTop: fil ? 16 : 0 }}>🔑 Moments-clés de tes entretiens</h3>
          {moments.map((m, i) => (
            <div key={i} className="emergence-moment">
              <blockquote>« {m.verbatim} »</blockquote>
              {m.pourquoi && <p className="muted">{m.pourquoi}</p>}
            </div>
          ))}
        </>
      )}
    </section>
  )
}
