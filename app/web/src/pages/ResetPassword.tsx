import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await api('/auth/reset', {
        method: 'POST',
        body: JSON.stringify({ token: params.get('token'), password }),
      })
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-card">
      <h1>Nouveau mot de passe</h1>
      {done ? (
        <>
          <p>Mot de passe mis à jour ✅</p>
          <p className="form-links"><Link to="/connexion">Se connecter</Link></p>
        </>
      ) : (
        <form onSubmit={onSubmit} className="form">
          <label className="field">
            <span>Nouveau mot de passe (≥ 8 caractères)</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="btn btn-primary" disabled={busy}>{busy ? '…' : 'Valider'}</button>
        </form>
      )}
    </div>
  )
}
