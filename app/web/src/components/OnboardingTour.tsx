import { useEffect, useState } from 'react'

export interface TourStep { title: string; body: string; selector?: string }

interface Rect { top: number; left: number; width: number; height: number }

/**
 * Rendu d'une visite guidée : surlignage de l'élément ciblé (data-tour) + carte explicative,
 * navigation pas à pas. Composant générique piloté par une liste d'étapes (visite globale par
 * rôle OU visite de l'écran courant — cf. OnboardingManager / tours.ts).
 */
export default function OnboardingTour({ steps, onClose }: { steps: TourStep[]; onClose: () => void }) {
  const [i, setI] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)
  const step = steps[i]

  useEffect(() => {
    let r: Rect | null = null
    if (step?.selector) {
      const el = document.querySelector(step.selector) as HTMLElement | null
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' })
        const b = el.getBoundingClientRect()
        r = { top: b.top - 6, left: b.left - 6, width: b.width + 12, height: b.height + 12 }
      }
    }
    setRect(r)
  }, [i, step?.selector])

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])

  if (!step) return null
  const last = i === steps.length - 1
  const cardStyle: React.CSSProperties = rect
    ? { position: 'fixed', top: Math.min(rect.top + rect.height + 12, window.innerHeight - 220), left: Math.max(12, Math.min(rect.left, window.innerWidth - 340)), width: 320 }
    : { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 340 }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000 }} role="dialog" aria-modal="true" aria-label="Visite guidée">
      {rect ? (
        <div style={{ position: 'fixed', top: rect.top, left: rect.left, width: rect.width, height: rect.height, borderRadius: 10, boxShadow: '0 0 0 9999px rgba(13,22,40,.62)', border: '2px solid #f4b740', pointerEvents: 'none', transition: 'all .25s ease' }} />
      ) : (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(13,22,40,.62)' }} onClick={onClose} />
      )}
      <div className="card" style={{ ...cardStyle, zIndex: 1001, padding: 18, boxShadow: '0 12px 40px rgba(0,0,0,.3)' }}>
        <p className="muted" style={{ margin: 0, fontSize: '.78rem' }}>Étape {i + 1} / {steps.length}</p>
        <h3 style={{ margin: '4px 0 8px' }}>{step.title}</h3>
        <p style={{ marginTop: 0 }}>{step.body}</p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Passer</button>
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            {i > 0 && <button className="btn btn-ghost btn-sm" onClick={() => setI(i - 1)}>← Précédent</button>}
            <button className="btn btn-primary btn-sm" onClick={() => (last ? onClose() : setI(i + 1))}>{last ? 'Terminer' : 'Suivant →'}</button>
          </span>
        </div>
      </div>
    </div>
  )
}
