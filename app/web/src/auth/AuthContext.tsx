import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, type User } from '../lib/api'

interface AuthCtx {
  user: User | null
  loading: boolean
  refresh: () => Promise<void>
  logout: () => Promise<void>
}

const Ctx = createContext<AuthCtx>({
  user: null,
  loading: true,
  refresh: async () => {},
  logout: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  async function refresh() {
    try {
      const data = await api<{ user: User }>('/auth/me')
      setUser(data.user)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  async function logout() {
    try { await api('/auth/logout', { method: 'POST' }) } finally { setUser(null) }
  }

  useEffect(() => {
    void refresh()
  }, [])

  return <Ctx.Provider value={{ user, loading, refresh, logout }}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(Ctx)
}
