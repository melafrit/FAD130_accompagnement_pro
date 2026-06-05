import { type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

/** Restreint l'accès aux utilisateurs connectés (et, en option, à un rôle donné). */
export default function Protected({ children, role }: { children: ReactNode; role?: string }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="auth-card"><p>Chargement…</p></div>
  if (!user) return <Navigate to="/connexion" replace />
  if (role && user.role !== role) return <Navigate to="/espace" replace />
  return <>{children}</>
}
