import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api'
import TrendLine from './TrendLine'

type Snap = Record<string, number> & { jour?: string }
type Biz = { current: Record<string, number>; series: Snap[]; days: number }

const FAMILIES: { titre: string; kpis: { k: string; l: string; suffix?: string }[] }[] = [
  { titre: 'Adoption & comptes', kpis: [
    { k: 'inscriptions_total', l: 'Inscriptions' }, { k: 'accompagnateurs', l: 'Accompagnateurs' },
    { k: 'accompagnes', l: 'Accompagnés' }, { k: 'actifs_30j', l: 'Actifs (30 j)' }] },
  { titre: 'Activité d’accompagnement', kpis: [
    { k: 'parcours_total', l: 'Parcours' }, { k: 'parcours_clotures', l: 'Parcours clôturés' },
    { k: 'entretiens', l: 'Entretiens' }, { k: 'rdv', l: 'Rendez-vous' }] },
  { titre: 'Production de livrables', kpis: [
    { k: 'cr_publies', l: 'Comptes rendus publiés' }, { k: 'syntheses_publiees', l: 'Synthèses publiées' },
    { k: 'actions', l: 'Actions' }, { k: 'actions_faites', l: 'Actions terminées' }] },
  { titre: 'Engagement & complétion', kpis: [
    { k: 'taux_completion', l: 'Complétion des parcours', suffix: ' %' }, { k: 'taux_actions_faites', l: 'Actions terminées', suffix: ' %' },
    { k: 'outils_journal', l: 'Entrées de journal' }, { k: 'outils_meteo', l: 'Relevés météo' }] },
]
const TRENDS = [
  { k: 'inscriptions_total', l: 'Inscriptions' }, { k: 'parcours_total', l: 'Parcours' },
  { k: 'entretiens', l: 'Entretiens' }, { k: 'cr_publies', l: 'Comptes rendus publiés' },
]

/** Panneau « Monitoring métier » : KPI d'usage + tendances historiques. */
export default function BusinessPanel() {
  const [days, setDays] = useState(30)
  const [b, setB] = useState<Biz | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    api<Biz>(`/monitoring/business?days=${days}`).then(setB).catch((e) => setError(e instanceof Error ? e.message : 'Erreur'))
  }, [days])
  useEffect(() => { load() }, [load])

  if (error) return <p className="form-error">{error}</p>
  if (!b) return <p>Chargement des indicateurs métier…</p>
  const cur = b.current

  return (
    <div className="sup-biz">
      {FAMILIES.map((fam) => (
        <section className="card" key={fam.titre}>
          <h2>{fam.titre}</h2>
          <div className="obs-db">
            {fam.kpis.map((k) => (
              <div className="obs-db-item" key={k.k}>
                <span className="obs-db-v">{cur[k.k] ?? 0}{k.suffix || ''}</span>
                <span className="obs-db-l">{k.l}</span>
              </div>
            ))}
          </div>
        </section>
      ))}

      <section className="card">
        <div className="sup-trend-head">
          <h2>Tendances</h2>
          <div className="sup-window">
            {[7, 30, 90].map((d) => (
              <button key={d} className={`btn btn-ghost btn-sm ${days === d ? 'active' : ''}`} onClick={() => setDays(d)}>{d} j</button>
            ))}
          </div>
        </div>
        {b.series.length < 2 ? (
          <p className="muted">Les tendances apparaîtront après quelques jours de collecte (un instantané est capturé chaque jour). Données disponibles : {b.series.length} jour(s).</p>
        ) : (
          <div className="sup-trends">
            {TRENDS.map((t) => (
              <div className="sup-trend" key={t.k}>
                <p className="sup-trend-title">{t.l}</p>
                <TrendLine points={b.series.map((s) => ({ label: String(s.jour || '').slice(5), value: Number(s[t.k] || 0) }))} reveal={1} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
