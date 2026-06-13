import { useState } from 'react'
import { useFeature } from '../features/FeaturesContext'

// Bascule du mode FALC « facile à lire » sur l'interface (texte plus grand, plus aéré, meilleur contraste).
export default function FalcToggle() {
  const actif = useFeature('falc')
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
