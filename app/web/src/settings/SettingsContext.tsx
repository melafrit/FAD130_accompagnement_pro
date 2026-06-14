import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from '../lib/api'
import i18n from '../i18n'

// Drapeaux globaux réglés par l'admin (exposés publiquement via /api/context). Conditionnent
// l'affichage de bascules transversales (mode FALC, sélecteur de langue). OFF par défaut.
export interface GlobalFlags { falc: boolean; multilingue: boolean }

interface SettingsCtx { flags: GlobalFlags; ready: boolean }

const DEFAULT: GlobalFlags = { falc: false, multilingue: false }
const Ctx = createContext<SettingsCtx>({ flags: DEFAULT, ready: false })

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<GlobalFlags>(DEFAULT)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let annule = false
    api<{ flags?: Partial<GlobalFlags> }>('/context')
      .then((d) => {
        if (annule) return
        setFlags({ falc: !!d.flags?.falc, multilingue: !!d.flags?.multilingue })
        setReady(true)
      })
      .catch(() => { if (!annule) setReady(true) })
    return () => { annule = true }
  }, [])

  // Si le multilingue est globalement désactivé, on force le français (au cas où un ancien
  // choix « en » subsiste dans localStorage) ; le sélecteur de langue est par ailleurs masqué.
  useEffect(() => {
    if (ready && !flags.multilingue && (i18n.resolvedLanguage || i18n.language || 'fr').slice(0, 2) === 'en') {
      void i18n.changeLanguage('fr')
    }
  }, [ready, flags.multilingue])

  // Si FALC est globalement désactivé, on force le mode OFF (au cas où localStorage='on' traîne).
  useEffect(() => {
    if (ready && !flags.falc) document.documentElement.setAttribute('data-falc', 'off')
  }, [ready, flags.falc])

  return <Ctx.Provider value={{ flags, ready }}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFlag(key: keyof GlobalFlags): boolean {
  return useContext(Ctx).flags[key]
}
