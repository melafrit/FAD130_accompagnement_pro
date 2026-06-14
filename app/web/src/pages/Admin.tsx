import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import PlansManager from '../components/PlansManager'
import SettingsPanel from '../components/SettingsPanel'
import RgpdConsole from '../components/RgpdConsole'

interface User {
  id: number
  email: string
  role: string
  nom: string | null
  prenom: string | null
  actif: number
  email_verifie: number
  plan_id: number | null
  plan_nom: string | null
}
interface PlanOpt { id: number; nom: string }

export default function Admin() {
  const [users, setUsers] = useState<User[]>([])
  const [plans, setPlans] = useState<PlanOpt[]>([])
  const [form, setForm] = useState({ email: '', role: 'accompagne', nom: '', prenom: '' })
  const [lien, setLien] = useState({ accompagnateurId: '', accompagneId: '' })
  const [msg, setMsg] = useState('')

  async function load() {
    const d = await api<{ users: User[] }>('/admin/users')
    setUsers(d.users)
  }
  async function loadPlans() {
    const d = await api<{ plans: PlanOpt[] }>('/admin/plans')
    setPlans(d.plans)
  }
  useEffect(() => {
    void load()
    void loadPlans()
  }, [])

  async function setRole(id: number, role: string) {
    await api(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify({ role }) })
    await load()
  }
  async function setPlan(id: number, planId: string) {
    await api(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify({ plan_id: planId === '' ? null : Number(planId) }) })
    await load()
  }
  async function toggleActif(u: User) {
    await api(`/admin/users/${u.id}`, { method: 'PATCH', body: JSON.stringify({ actif: u.actif ? 0 : 1 }) })
    await load()
  }

  async function createUser(e: FormEvent) {
    e.preventDefault()
    setMsg('')
    try {
      await api('/admin/users', { method: 'POST', body: JSON.stringify(form) })
      setForm({ email: '', role: 'accompagne', nom: '', prenom: '' })
      setMsg("Compte créé, email d'activation envoyé.")
      await load()
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Erreur')
    }
  }
  async function createLien(e: FormEvent) {
    e.preventDefault()
    setMsg('')
    try {
      await api('/admin/lien', { method: 'POST', body: JSON.stringify({ accompagnateurId: Number(lien.accompagnateurId), accompagneId: Number(lien.accompagneId) }) })
      setMsg('Rattachement effectué.')
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Erreur')
    }
  }

  const accompagnateurs = users.filter((u) => u.role === 'accompagnateur')
  const accompagnes = users.filter((u) => u.role === 'accompagne')

  return (
    <div className="page">
      <p className="kicker">Administration</p>
      <h1 className="page-title">Gestion des comptes</h1>

      <div className="admin-banners">
        <Link to="/admin/wiki" className="card admin-banner">
          <span>
            <strong>📚 Wiki projet</strong> — documentation officielle (cadrage, architecture, sécurité, exploitation, guides…).
          </span>
          <span className="btn btn-primary">Ouvrir le wiki →</span>
        </Link>
        <Link to="/admin/supervision" className="card admin-banner">
          <span>
            <strong>📊 Supervision</strong> — observabilité technique, santé des dépendances (IA, email, base, sauvegardes) et indicateurs métier.
          </span>
          <span className="btn btn-primary">Ouvrir la supervision →</span>
        </Link>
      </div>

      {msg && <p className="form-success">{msg}</p>}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr><th>Email</th><th>Nom</th><th>Rôle</th><th>Abonnement</th><th>Validé</th><th>Statut</th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className={u.actif ? '' : 'row-inactif'}>
                <td>{u.email}</td>
                <td>{[u.prenom, u.nom].filter(Boolean).join(' ') || '—'}</td>
                <td>
                  <select value={u.role} onChange={(e) => setRole(u.id, e.target.value)} aria-label={`Rôle de ${u.email}`}>
                    <option value="accompagne">Accompagné</option>
                    <option value="accompagnateur">Accompagnateur</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td>
                  <select value={u.plan_id ?? ''} onChange={(e) => setPlan(u.id, e.target.value)} aria-label={`Abonnement de ${u.email}`} title="Niveau maximum si aucun plan">
                    <option value="">Niveau max</option>
                    {plans.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
                  </select>
                </td>
                <td>{u.email_verifie ? '✓' : '—'}</td>
                <td><button className="btn btn-ghost" onClick={() => toggleActif(u)}>{u.actif ? 'Désactiver' : 'Activer'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="cards" style={{ marginTop: 24 }}>
        <div className="card">
          <h3>Créer un compte</h3>
          <form className="form" onSubmit={createUser}>
            <label className="field"><span>Email</span><input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required /></label>
            <div className="field-row">
              <label className="field"><span>Prénom</span><input value={form.prenom} onChange={(e) => setForm((f) => ({ ...f, prenom: e.target.value }))} /></label>
              <label className="field"><span>Nom</span><input value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} /></label>
            </div>
            <label className="field"><span>Rôle</span>
              <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
                <option value="accompagne">Accompagné</option>
                <option value="accompagnateur">Accompagnateur</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <button className="btn btn-primary" type="submit">Créer et envoyer l'activation</button>
          </form>
        </div>

        <div className="card">
          <h3>Rattacher un accompagné</h3>
          <form className="form" onSubmit={createLien}>
            <label className="field"><span>Accompagnateur</span>
              <select value={lien.accompagnateurId} onChange={(e) => setLien((l) => ({ ...l, accompagnateurId: e.target.value }))}>
                <option value="">—</option>
                {accompagnateurs.map((u) => <option key={u.id} value={u.id}>{u.email}</option>)}
              </select>
            </label>
            <label className="field"><span>Accompagné</span>
              <select value={lien.accompagneId} onChange={(e) => setLien((l) => ({ ...l, accompagneId: e.target.value }))}>
                <option value="">—</option>
                {accompagnes.map((u) => <option key={u.id} value={u.id}>{u.email}</option>)}
              </select>
            </label>
            <button className="btn btn-primary" type="submit">Rattacher</button>
          </form>
        </div>
      </div>

      <SettingsPanel />

      <PlansManager onChange={() => { void load(); void loadPlans() }} />

      <RgpdConsole />
    </div>
  )
}
