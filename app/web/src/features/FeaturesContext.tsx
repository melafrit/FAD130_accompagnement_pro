import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../auth/AuthContext'

interface FeaturesCtx {
  /** Vrai si la fonctionnalité est activée pour l'utilisateur (ou si le statut n'est pas encore chargé). */
  has: (key: string) => boolean
  features: Set<string>
  ready: boolean
}

const Ctx = createContext<FeaturesCtx>({ has: () => true, features: new Set(), ready: false })

export function FeaturesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [features, setFeatures] = useState<Set<string>>(new Set())
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let annule = false
    if (!user) {
      setFeatures(new Set())
      setReady(false)
      return
    }
    setReady(false)
    api<{ features: string[] }>('/auth/me/features')
      .then((d) => {
        if (!annule) {
          setFeatures(new Set(d.features))
          setReady(true)
        }
      })
      .catch(() => {
        if (!annule) setReady(true)
      })
    return () => {
      annule = true
    }
  }, [user])

  // Tant que le statut n'est pas chargé, on n'occulte rien (évite un clignotement de l'UI).
  const has = (key: string) => !ready || features.has(key)

  return <Ctx.Provider value={{ has, features, ready }}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFeature(key: string): boolean {
  return useContext(Ctx).has(key)
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFeatures(): FeaturesCtx {
  return useContext(Ctx)
}
