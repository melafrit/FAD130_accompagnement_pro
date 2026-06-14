export interface TrendPoint { label: string; value: number }

/** Niveau « rond » immédiatement au-dessus de v (1/2/5 × 10^n) pour un axe lisible. */
function niceMax(v: number): number {
  if (v <= 5) return 5
  const pow = Math.pow(10, Math.floor(Math.log10(v)))
  for (const m of [1, 2, 5, 10]) { if (v <= m * pow) return m * pow }
  return 10 * pow
}

/**
 * Courbe de tendance auto-échelonnée pour les KPI métier (valeurs entières quelconques).
 * Distincte de EvolutionLine (figée sur une note /20). `reveal` redéclenche le tracé.
 */
export default function TrendLine({ points, reveal = 0 }: { points: TrendPoint[]; reveal?: number }) {
  if (points.length < 2) {
    return <p className="muted">Pas encore assez de points pour tracer une tendance.</p>
  }
  const W = 540, H = 200, padL = 40, padR = 14, padT = 14, padB = 30
  const maxV = niceMax(Math.max(1, ...points.map((p) => p.value)))
  const x = (i: number) => padL + (i * (W - padL - padR)) / (points.length - 1)
  const y = (v: number) => padT + (H - padT - padB) * (1 - Math.max(0, Math.min(maxV, v)) / maxV)
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(maxV * f))
  // Au plus ~8 étiquettes d'abscisse pour éviter le chevauchement.
  const step = Math.max(1, Math.ceil(points.length / 8))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W }} className="evoline" role="img" aria-label="Courbe de tendance">
      {ticks.map((g) => (
        <g key={g}>
          <line x1={padL} y1={y(g)} x2={W - padR} y2={y(g)} stroke="#e7e2d6" strokeWidth={1} />
          <text x={padL - 6} y={y(g)} textAnchor="end" dominantBaseline="middle" className="evo-axis">{g}</text>
        </g>
      ))}
      <path key={reveal} className="evo-draw" d={d} fill="none" stroke="#1f3a5f" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" pathLength={1} />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.value)} r={3.5} fill="#1f3a5f" />
          {i % step === 0 && <text x={x(i)} y={H - 10} textAnchor="middle" className="evo-axis">{p.label}</text>}
        </g>
      ))}
    </svg>
  )
}
