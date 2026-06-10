import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../lib/api'
import ActionList, { type Action } from '../components/ActionList'
import ActionDetailModal from '../components/ActionDetailModal'
import DictaInput from '../components/DictaInput'

export default function MonPlanAction() {
  const [actions, setActions] = useState<Action[]>([])
  const [dossierId, setDossierId] = useState<number | null>(null)
  const [libelle, setLibelle] = useState('')
  const [selected, setSelected] = useState<Action | null>(null)

  async function load() {
    const d = await api<{ actions: Action[]; dossierId: number | null }>('/actions/mine')
    setActions(d.actions)
    setDossierId(d.dossierId)
  }
  useEffect(() => {
    void load()
  }, [])

  async function setStatut(id: number, statut: string) {
    await api(`/actions/${id}`, { method: 'PATCH', body: JSON.stringify({ statut }) })
    await load()
  }
  async function addAction(e: FormEvent) {
    e.preventDefault()
    if (!libelle.trim() || dossierId == null) return
    await api('/actions', { method: 'POST', body: JSON.stringify({ dossierId, libelle }) })
    setLibelle('')
    await load()
  }
  async function reorder(ids: number[]) {
    if (dossierId == null) return
    await api('/actions/reorder', { method: 'POST', body: JSON.stringify({ dossierId, ids }) })
    await load()
  }

  return (
    <div className="page">
      <p className="kicker">Mon espace</p>
      <h1 className="page-title">Mon plan d'action</h1>
      <p className="lead">Suis tes prochaines étapes, ajoute les tiennes et marque-les au fur et à mesure.</p>

      {dossierId != null && (
        <form className="qa-form" onSubmit={addAction}>
          <DictaInput value={libelle} onChange={setLibelle} placeholder="Ajouter ou dicter une action…" />
          <button className="btn btn-primary" type="submit">Ajouter</button>
        </form>
      )}
      <p className="muted action-hint">Clique une action pour ouvrir son détail (échéance, priorité, rappel, notes…) · glisse la poignée ⠿ pour réordonner.</p>
      <ActionList actions={actions} onStatut={setStatut} onOpen={setSelected} onReorder={reorder} />

      {selected && <ActionDetailModal key={selected.id} action={selected} onClose={() => setSelected(null)} onSaved={load} />}
    </div>
  )
}
