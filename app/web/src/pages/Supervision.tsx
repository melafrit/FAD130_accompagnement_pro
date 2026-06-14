import { useState } from 'react'
import { Link } from 'react-router-dom'
import ObservabilityPanel from '../components/supervision/ObservabilityPanel'
import TechHealthPanel from '../components/supervision/TechHealthPanel'
import BusinessPanel from '../components/supervision/BusinessPanel'

type Tab = 'obs' | 'tech' | 'biz'
const TABS: { id: Tab; label: string; hint: string }[] = [
  { id: 'obs', label: 'Observabilité', hint: 'Métriques techniques du service & erreurs' },
  { id: 'tech', label: 'Santé technique', hint: 'État des dépendances & alertes' },
  { id: 'biz', label: 'Indicateurs métier', hint: 'Usage, adoption & tendances' },
]

/** Section « Supervision » : 3 onglets (observabilité technique, santé des dépendances, KPI métier). */
export default function Supervision() {
  const [tab, setTab] = useState<Tab>('obs')

  return (
    <div className="page sup">
      <p className="kicker">Administration</p>
      <h1 className="page-title">Supervision</h1>
      <p className="hint sup-intro">
        Pilotage opérationnel de Boussole : santé technique du service, état des dépendances externes
        (IA Claude, email Brevo, base, sauvegardes) et indicateurs d’usage métier.
      </p>

      <div className="sup-tabs" role="tablist" aria-label="Onglets de supervision">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`sup-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`sup-panel-${t.id}`}
            className={`sup-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
            title={t.hint}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`sup-panel-${tab}`} aria-labelledby={`sup-tab-${tab}`} className="sup-panel">
        {tab === 'obs' && <ObservabilityPanel />}
        {tab === 'tech' && <TechHealthPanel />}
        {tab === 'biz' && <BusinessPanel />}
      </div>

      <p style={{ marginTop: 18 }}><Link className="btn btn-ghost" to="/admin">← Administration</Link></p>
    </div>
  )
}
