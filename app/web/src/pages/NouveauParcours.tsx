import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

interface Acc { id: number; prenom: string | null; nom: string | null; email: string }

export default function NouveauParcours() {
  const [accs, setAccs] = useState<Acc[]>([])
  const [titre, setTitre] = useState('')
  const [accId, setAccId] = useState<number | ''>('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const nav = useNavigate()

  useEffect(() => {
    void api<{ accompagnateurs: Acc[] }>('/dossiers/accompagnateurs')
      .then((d) => { setAccs(d.accompagnateurs); if (d.accompagnateurs[0]) setAccId(d.accompagnateurs[0].id) })
      .catch(() => {})
  }, [])

  async function submit(e: FormEvent) {
    e.preventDefault(); setMsg('')
    if (!titre.trim() || !accId) { setMsg('Renseigne un titre et choisis un accompagnateur.'); return }
    setBusy(true)
    try {
      const r = await api<{ dossierId: number }>('/dossiers/start', { method: 'POST', body: JSON.stringify({ titre, accompagnateurId: accId }) })
      nav(`/questionnaire?dossier=${r.dossierId}`)
    } catch (err) { setMsg((err as Error).message || 'Erreur.'); setBusy(false) }
  }

  return (
    <div className="page">
      <p className="kicker">Mon espace</p>
      <h1 className="page-title">Démarrer un nouveau parcours</h1>
      <p className="lead">Donne un titre à ton parcours (ex. sujet de mémoire), choisis ton accompagnateur, puis tu rempliras le questionnaire initial et prendras rendez-vous.</p>
      <form className="profil-form" onSubmit={submit} style={{ maxWidth: 540 }}>
        <label className="field"><span className="field-label">Titre du parcours</span>
          <input value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Ex. Mémoire — refonte d’une application" />
        </label>
        <label className="field"><span className="field-label">Accompagnateur</span>
          <select value={accId} onChange={(e) => setAccId(e.target.value ? Number(e.target.value) : '')}>
            {accs.length === 0 && <option value="">Aucun accompagnateur disponible</option>}
            {accs.map((a) => <option key={a.id} value={a.id}>{[a.prenom, a.nom].filter(Boolean).join(' ') || a.email}</option>)}
          </select>
        </label>
        {msg && <p className="form-error">{msg}</p>}
        <div className="profil-actions">
          <button className="btn btn-primary" type="submit" disabled={busy || accs.length === 0}>Démarrer et remplir le questionnaire</button>
        </div>
      </form>
      <p style={{ marginTop: 18 }}><Link className="btn btn-ghost" to="/espace">← Retour à mes parcours</Link></p>
    </div>
  )
}
