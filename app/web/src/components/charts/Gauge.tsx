function couleurPour(v: number): string {
  if (v >= 75) return '#2f6f4f'
  if (v >= 50) return '#7fae6b'
  if (v >= 25) return '#e8a33d'
  return '#d9534f'
}

/** Jauge circulaire du score global ; affiche /20 et /100. */
export default function Gauge({ value, size = 184 }: { value: number | null; size?: number }) {
  const has = value != null
  const v = Math.max(0, Math.min(100, value ?? 0))
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
