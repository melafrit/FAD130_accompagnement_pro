export interface RadarAxis { label: string; value: number }

/** Radar SVG : un axe par critère (valeurs 0–100).
 *  `reveal` : la zone-valeur se déploie depuis le centre à chaque changement de cette clé (révélation),
 *  mais suit instantanément les éditions de curseurs (reveal inchangé → pas de remontage, pas d'animation). */
export default function RadarChart({ axes, color = '#1f3a5f', size = 300, reveal = 0 }: { axes: RadarAxis[]; color?: string; size?: number; reveal?: number }) {
  const n = axes.length
  if (n < 3) return null
  const pad = 64
  const R = (size - pad * 2) / 2
  const cx = size / 2
  const cy = size / 2
  const lp = 84 // marge horizontale (gauche/droite) pour que les étiquettes ne soient pas coupées
  const ang = (i: number) => (-90 + (i * 360) / n) * (Math.PI / 180)
  const pt = (i: number, r: number): [number, number] => [cx + r * Math.cos(ang(i)), cy + r * Math.sin(ang(i))]
  const ringPts = (rv: number) => axes.map((_, i) => pt(i, (R * rv) / 100).join(',')).join(' ')
  const clamp = (v: number) => Math.max(0, Math.min(100, v))
  const valuePts = axes.map((a, i) => pt(i, (R * clamp(a.value)) / 100).join(',')).join(' ')

  return (
    <svg viewBox={`${-lp} 0 ${size + lp * 2} ${size}`} width="100%" style={{ maxWidth: size + lp * 2 }} className="radar" role="img" aria-label="Radar des critères">
      {[25, 50, 75, 100].map((rv) => (
        <polygon key={rv} points={ringPts(rv)} fill="none" stroke="#dcd6c6" strokeWidth={1} />
      ))}
      {axes.map((_, i) => {
        const [x, y] = pt(i, R)
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#dcd6c6" strokeWidth={1} />
      })}
      <g key={reveal} className="radar-grow" style={{ transformOrigin: `${cx}px ${cy}px`, transformBox: 'view-box' }}>
        <polygon points={valuePts} fill={color} fillOpacity={0.22} stroke={color} strokeWidth={2} />
        {axes.map((a, i) => {
          const [x, y] = pt(i, (R * clamp(a.value)) / 100)
          return <circle key={`d${i}`} cx={x} cy={y} r={3.5} fill={color} />
        })}
      </g>
      {axes.map((a, i) => {
        const [x, y] = pt(i, R + 20)
        const anchor = Math.abs(x - cx) < 8 ? 'middle' : x > cx ? 'start' : 'end'
        return (
          <text key={`l${i}`} x={x} y={y} textAnchor={anchor} className="radar-label" dominantBaseline="middle">
            {a.label} <tspan className="radar-val">{Math.round(a.value)}</tspan>
          </text>
        )
      })}
    </svg>
  )
}
