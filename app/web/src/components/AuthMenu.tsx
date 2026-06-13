import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

// Icône utilisateur dans le menu : ouvre un panneau (prénom/nom + profil + connexion/déconnexion).
export default function AuthMenu() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const nav = useNavigate()

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') { setOpen(false); btnRef.current?.focus() } }
    document.addEventListener('mousedown', onDoc)
    window.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); window.removeEventListener('keydown', onKey) }
  }, [open])

  const fullName = user ? [user.prenom, user.nom].filter(Boolean).join(' ').trim() : ''
  const initials = user ? ((user.prenom?.[0] || '') + (user.nom?.[0] || '')).toUpperCase() || (user.email[0] || '').toUpperCase() : ''

  async function onLogout() {
    setOpen(false)
    try { await logout() } finally { nav('/') }
  }

  return (
    <div className="authmenu" ref={ref}>
      <button
        ref={btnRef}
        className="authmenu-btn"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={user ? `Compte : ${fullName || user.email}` : 'Compte'}
        title={user ? (fullName || user.email) : 'Compte'}
      >
        {user ? <span className="authmenu-avatar">{initials || '·'}</span> : <span className="authmenu-icon" aria-hidden="true">👤</span>}
      </button>
      {open && (
        <div className="authmenu-dropdown" role="menu">
          {user ? (
            <>
              <div className="authmenu-head">
                <span className="authmenu-name">{fullName || '(prénom/nom à compléter)'}</span>
                <span className="authmenu-email">{user.email}</span>
              </div>
              <Link className="authmenu-item" to="/profil" role="menuitem" onClick={() => setOpen(false)}>👤 Mon profil</Link>
              <Link className="authmenu-item" to="/espace" role="menuitem" onClick={() => setOpen(false)}>🗂 Mon espace</Link>
              {user.role === 'admin' && (
                <>
                  <Link className="authmenu-item" to="/admin" role="menuitem" onClick={() => setOpen(false)}>⚙️ Administration</Link>
                  <Link className="authmenu-item" to="/admin/wiki" role="menuitem" onClick={() => setOpen(false)}>📚 Wiki projet</Link>
                </>
              )}
              <div className="authmenu-foot">
                <button className="btn btn-ghost" role="menuitem" onClick={onLogout}>Déconnexion</button>
              </div>
            </>
          ) : (
            <div className="authmenu-foot authmenu-foot-out">
              <Link className="btn btn-primary" role="menuitem" to="/connexion" onClick={() => setOpen(false)}>Connexion</Link>
              <Link className="btn btn-ghost" role="menuitem" to="/inscription" onClick={() => setOpen(false)}>Inscription</Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
