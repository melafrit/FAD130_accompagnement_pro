import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'

export default function Register() {
  const [form, setForm] = useState({ email: '', password: '', role: 'accompagne', nom: '', prenom: '' })
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  function upd(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await api('/auth/register', { method: 'POST', body: JSON.stringify({ ...form, consent }) })
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="auth-card">
        <h1>Compte créé ✅</h1>
        <p>Un email d'activation vous a été envoyé. Cliquez sur le lien pour activer votre compte, puis connectez-vous.</p>
        <p className="form-links"><Link to="/connexion">Aller à la connexion</Link></p>
      </div>
    )
  }

  return (
    <div className="auth-card">
      <h1>Créer un compte</h1>
      <form onSubmit={onSubmit} className="form">
        <div className="field-row">
          <label className="field"><span>Prénom</span><input value={form.prenom} onChange={(e) => upd('prenom', e.target.value)} /></label>
          <label className="field"><span>Nom</span><input value={form.nom} onChange={(e) => upd('nom', e.target.value)} /></label>
        </div>
        <label className="field">
          <span>Email</span>
          <input type="email" value={form.email} onChange={(e) => upd('email', e.target.value)} required autoComplete="email" />
        </label>
        <label className="field">
          <span>Mot de passe (≥ 8 caractères)</span>
          <input type="password" value={form.password} onChange={(e) => upd('password', e.target.value)} required minLength={8} autoComplete="new-password" />
        </label>
        <label className="field">
          <span>Je suis…</span>
          <select value={form.role} onChange={(e) => upd('role', e.target.value)}>
            <option value="accompagne">Personne accompagnée</option>
            <option value="accompagnateur">Accompagnateur</option>
          </select>
        </label>
        <label className="checkbox">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required />
          <span>J'accepte les <Link to="/cgu">CGU</Link> et la <Link to="/confidentialite">politique de confidentialité</Link>.</span>
        </label>
        {error && <p className="form-error">{error}</p>}
        <button className="btn btn-primary" disabled={busy || !consent}>{busy ? '…' : 'Créer mon compte'}</button>
      </form>
      <p className="form-links"><Link to="/connexion">J'ai déjà un compte</Link></p>
    </div>
  )
}
