export interface EvoPoint { label: string; value: number }

/** Courbe d'évolution de la note globale (/20) au fil des versions validées.
 *  `reveal` : le tracé se redessine à chaque changement de cette clé. */
export default function EvolutionLine({ points, reveal = 0 }: { points: EvoPoint[]; reveal?: number }) {
  if (points.length < 2) {
    return <p className="muted">Valide au moins deux versions pour visualiser ta progression dans le temps.</p>
  }
  const W = 540
  const H = 200
  const padL = 32
  const padR = 14
  const padT = 14
  const padB = 30
  const maxV = 20
  const x = (i: number) => padL + (i * (W - padL - padR)) / (points.length - 1)
  const y = (v: number) => padT + (H - padT - padB) * (1 - Math.max(0, Math.min(maxV, v)) / maxV)
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W }} className="evoline" role="img" aria-label="Évolution de la note globale">
      {[0, 5, 10, 15, 20].map((g) => (
        <g key={g}>
          <line x1={padL} y1={y(g)} x2={W - padR} y2={y(g)} stroke="#e7e2d6" strokeWidth={1} />
          <text x={padL - 6} y={y(g)} textAnchor="end" dominantBaseline="middle" className="evo-axis">{g}</text>
        </g>
      ))}
      <path key={reveal} className="evo-draw" d={d} fill="none" stroke="#1f3a5f" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" pathLength={1} />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.value)} r={4} fill="#1f3a5f" />
          <text x={x(i)} y={H - 10} textAnchor="middle" className="evo-axis">{p.label}</text>
        </g>
      ))}
    </svg>
  )
}
