import { useState } from 'react'
import { useFlag } from '../settings/SettingsContext'

// Bascule du mode FALC « facile à lire » sur l'interface (texte plus grand, plus aéré, meilleur contraste).
// Visible uniquement si l'admin a activé le réglage global « FALC » (désactivé par défaut pour tous).
export default function FalcToggle() {
  const actif = useFlag('falc')
  const [on, setOn] = useState(() => document.documentElement.getAttribute('data-falc') === 'on')
  if (!actif) return null

  function toggle() {
    const v = !on
    setOn(v)
    document.documentElement.setAttribute('data-falc', v ? 'on' : 'off')
    try { localStorage.setItem('falc', v ? 'on' : 'off') } catch { /* ignore */ }
  }

  return (
    <button type="button" className="theme-toggle" onClick={toggle} aria-pressed={on} title={on ? 'Désactiver le mode facile à lire' : 'Activer le mode facile à lire'} aria-label="Mode facile à lire">
      {on ? '📖' : '📘'}
    </button>
  )
}
