import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import ActionList, { type Action } from '../components/ActionList'

export default function MonPlanAction() {
  const [actions, setActions] = useState<Action[]>([])

  async function load() {
    const d = await api<{ actions: Action[] }>('/actions/mine')
    setActions(d.actions)
  }
  useEffect(() => {
    void load()
  }, [])

  async function setStatut(id: number, statut: string) {
    await api(`/actions/${id}`, { method: 'PATCH', body: JSON.stringify({ statut }) })
    await load()
  }

  return (
    <div className="page">
      <p className="kicker">Mon espace</p>
      <h1 className="page-title">Mon plan d'action</h1>
      <p className="lead">Suis tes prochaines étapes et marque-les au fur et à mesure.</p>
      <ActionList actions={actions} onStatut={setStatut} />
    </div>
  )
}
