import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await api('/auth/request-reset', { method: 'POST', body: JSON.stringify({ email }) })
    } catch {
      /* on n'indique pas si le compte existe (anti-énumération) */
    }
    setDone(true)
    setBusy(false)
  }

  return (
    <div className="auth-card">
      <h1>Mot de passe oublié</h1>
      {done ? (
        <p>Si un compte existe pour cet email, un lien de réinitialisation vient d'être envoyé.</p>
      ) : (
        <form onSubmit={onSubmit} className="form">
          <label className="field">
            <span>Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <button className="btn btn-primary" disabled={busy}>{busy ? '…' : 'Envoyer le lien'}</button>
        </form>
      )}
      <p className="form-links"><Link to="/connexion">Retour à la connexion</Link></p>
    </div>
  )
}
