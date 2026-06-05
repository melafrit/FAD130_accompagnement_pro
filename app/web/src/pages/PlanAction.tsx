import { useEffect, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../lib/api'
import ActionList, { type Action } from '../components/ActionList'

export default function PlanAction() {
  const { dossierId } = useParams()
  const [actions, setActions] = useState<Action[]>([])
  const [libelle, setLibelle] = useState('')
  const [echeance, setEcheance] = useState('')
  const [critere, setCritere] = useState('')

  async function load() {
    const d = await api<{ actions: Action[] }>(`/actions?dossierId=${dossierId}`)
    setActions(d.actions)
  }
  useEffect(() => {
    void load()
  }, [dossierId])

  async function add(e: FormEvent) {
    e.preventDefault()
    if (!libelle.trim()) return
    await api('/actions', { method: 'POST', body: JSON.stringify({ dossierId: Number(dossierId), libelle, echeance, critere }) })
    setLibelle('')
    setEcheance('')
    setCritere('')
    await load()
  }
  async function setStatut(id: number, statut: string) {
    await api(`/actions/${id}`, { method: 'PATCH', body: JSON.stringify({ statut }) })
    await load()
  }

  return (
    <div className="page">
      <p className="kicker">Accompagnateur</p>
      <h1 className="page-title">Plan d'action</h1>
      <form className="slot-form" onSubmit={add}>
        <label className="field"><span>Action</span><input value={libelle} onChange={(e) => setLibelle(e.target.value)} placeholder="Étape à réaliser" required /></label>
        <label className="field"><span>Échéance</span><input type="date" value={echeance} onChange={(e) => setEcheance(e.target.value)} /></label>
        <label className="field"><span>Critère</span><input value={critere} onChange={(e) => setCritere(e.target.value)} placeholder="Critère de réussite" /></label>
        <button className="btn btn-primary" type="submit">Ajouter</button>
      </form>
      <ActionList actions={actions} onStatut={setStatut} />
    </div>
  )
}
