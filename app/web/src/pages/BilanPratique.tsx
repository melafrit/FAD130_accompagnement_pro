import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'

interface Bilan { forces: string[]; axes: string[]; evolution: string; synthese: string; conseils: string[]; source?: string; genere_le?: string }
interface Base { nbDossiers: number; nbEntretiens: number; miroirs: number; indicateurs: number }

function Liste({ titre, items, puce }: { titre: string; items: string[]; puce: string }) {
  if (!items?.length) return null
  return (
    <div style={{ flex: '1 1 280px' }}>
      <h3 style={{ marginBottom: 6 }}>{titre}</h3>
      <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
        {items.map((x, i) => <li key={i} style={{ padding: '3px 0' }}>{puce} {x}</li>)}
      </ul>
    </div>
  )
}

export default function BilanPratique() {
  const [bilan, setBilan] = useState<Bilan | null>(null)
  const [base, setBase] = useState<Base | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    api<{ bilan: Bilan | null; base: Base }>('/reflexivite/bilan')
      .then((d) => { setBilan(d.bilan); setBase(d.base) })
      .catch(() => { /* ignore */ })
  }, [])

  async function generer() {
    setBusy(true); setMsg('')
    try { setBilan(await api<Bilan>('/reflexivite/bilan', { method: 'POST' })); setMsg('Bilan mis à jour ✓') }
    catch { setMsg('Génération impossible.') } finally { setBusy(false) }
  }

  return (
    <div className="page">
      <p className="kicker">Accompagnateur · Réflexivité</p>
      <h1 className="page-title">Bilan de ma pratique</h1>
      <p className="lead">Une synthèse réflexive de l’ensemble de mes accompagnements, à partir de mes auto-évaluations et de mes analyses de posture.</p>

      {base && (
        <p className="muted">Basé sur {base.nbDossiers} parcours · {base.nbEntretiens} entretiens · {base.miroirs} analyses de posture · {base.indicateurs} indicateurs renseignés.</p>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '8px 0 18px' }}>
        <button className="btn btn-primary" disabled={busy} onClick={generer}>{busy ? 'Analyse en cours…' : bilan ? '↻ Régénérer mon bilan' : '✨ Générer mon bilan'}</button>
        <Link className="btn btn-ghost" to="/tableau-de-bord">← Tableau de bord</Link>
      </div>
      {msg && <p className="form-success">{msg}</p>}

      {!bilan ? (
        <p className="muted">Aucun bilan pour l’instant. Lance une première analyse quand tu as renseigné quelques auto-évaluations.</p>
      ) : (
        <div className="card" style={{ padding: 20 }}>
          {bilan.source === 'heuristique' && <p className="muted"><em>Bilan généré sans IA (synthèse déterministe).</em></p>}
          <p style={{ fontSize: '1.05rem' }}>{bilan.synthese}</p>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 8 }}>
            <Liste titre="Mes appuis" items={bilan.forces} puce="✅" />
            <Liste titre="Mes axes de progrès" items={bilan.axes} puce="🎯" />
          </div>
          {bilan.evolution && <><h3 style={{ marginBottom: 4 }}>Évolution</h3><p>{bilan.evolution}</p></>}
          {bilan.conseils?.length > 0 && (
            <><h3 style={{ marginBottom: 4 }}>Mes prochains pas</h3>
              <ul>{bilan.conseils.map((c, i) => <li key={i}>{c}</li>)}</ul></>
          )}
        </div>
      )}
    </div>
  )
}
