import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'

export default function VerifyEmail() {
  const [params] = useSearchParams()
  const [state, setState] = useState<'pending' | 'ok' | 'error'>('pending')
  const [msg, setMsg] = useState('Vérification en cours…')

  useEffect(() => {
    const token = params.get('token')
    if (!token) {
      setState('error')
      setMsg('Lien invalide.')
      return
    }
    api<{ message?: string }>(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then((d) => {
        setState('ok')
        setMsg(d.message || 'Email vérifié.')
      })
      .catch((e: Error) => {
        setState('error')
        setMsg(e.message)
      })
  }, [params])

  return (
    <div className="auth-card">
      <h1>{state === 'ok' ? 'Email vérifié ✅' : state === 'error' ? 'Échec' : 'Vérification…'}</h1>
      <p className={state === 'error' ? 'form-error' : ''}>{msg}</p>
      {state === 'ok' && <p className="form-links"><Link to="/connexion">Se connecter</Link></p>}
    </div>
  )
}
