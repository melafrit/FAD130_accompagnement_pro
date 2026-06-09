import { useEffect, useRef, useState } from 'react'

function couleurPour(v: number): string {
  if (v >= 75) return '#2f6f4f'
  if (v >= 50) return '#7fae6b'
  if (v >= 25) return '#e8a33d'
  return '#d9534f'
}
function reducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Jauge circulaire du score global ; affiche /20 et /100.
 *  `reveal` : à chaque changement de cette clé, la note « compte » et l'arc se remplit (révélation / pré-remplissage IA).
 *  Les éditions de curseurs (reveal inchangé) restent instantanées — aucune animation, aucun lag. */
export default function Gauge({ value, size = 184, reveal = 0 }: { value: number | null; size?: number; reveal?: number }) {
  const has = value != null
  const target = Math.max(0, Math.min(100, value ?? 0))
  const targetRef = useRef(target)
  targetRef.current = target // toujours la cible VIVANTE : un drag pendant l'animation reste suivi (pas de figement/saut)
  const [anim, setAnim] = useState<number | null>(null)

  useEffect(() => {
    if (reducedMotion()) { setAnim(null); return }
    let raf = 0
    const start = performance.now()
    const dur = 800
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur)
      const eased = 1 - Math.pow(1 - t, 3)
      setAnim(targetRef.current * eased)
      if (t < 1) raf = requestAnimationFrame(tick)
      else setAnim(null)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reveal])

  const v = anim != null ? anim : target
  const r = (size - 26) / 2
  const c = 2 * Math.PI * r
  const cx = size / 2
  const cy = size / 2
  const note20 = v / 5

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="gauge" role="img" aria-label="Score global">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e7e2d6" strokeWidth={14} />
      {has && v > 0 && (
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={couleurPour(v)}
          strokeWidth={14}
          strokeLinecap="round"
          strokeDasharray={`${(c * v) / 100} ${c}`}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      )}
      <text x={cx} y={cy - 4} textAnchor="middle" className="gauge-big">{has ? `${note20.toFixed(1)}/20` : '—'}</text>
      <text x={cx} y={cy + 20} textAnchor="middle" className="gauge-small">{has ? `${Math.round(v)}/100` : 'non évalué'}</text>
    </svg>
  )
}
