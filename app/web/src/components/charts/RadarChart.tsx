export interface RadarAxis { label: string; value: number }

/** Radar SVG : un axe par critère (valeurs 0–100). */
export default function RadarChart({ axes, color = '#1f3a5f', size = 300 }: { axes: RadarAxis[]; color?: string; size?: number }) {
  const n = axes.length
  if (n < 3) return null
  const pad = 64
  const R = (size - pad * 2) / 2
  const cx = size / 2
  const cy = size / 2
  const ang = (i: number) => (-90 + (i * 360) / n) * (Math.PI / 180)
  const pt = (i: number, r: number): [number, number] => [cx + r * Math.cos(ang(i)), cy + r * Math.sin(ang(i))]
  const ringPts = (rv: number) => axes.map((_, i) => pt(i, (R * rv) / 100).join(',')).join(' ')
  const clamp = (v: number) => Math.max(0, Math.min(100, v))
  const valuePts = axes.map((a, i) => pt(i, (R * clamp(a.value)) / 100).join(',')).join(' ')

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: size }} className="radar" role="img" aria-label="Radar des critères">
      {[25, 50, 75, 100].map((rv) => (
        <polygon key={rv} points={ringPts(rv)} fill="none" stroke="#dcd6c6" strokeWidth={1} />
      ))}
      {axes.map((_, i) => {
        const [x, y] = pt(i, R)
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#dcd6c6" strokeWidth={1} />
      })}
      <polygon points={valuePts} fill={color} fillOpacity={0.22} stroke={color} strokeWidth={2} />
      {axes.map((a, i) => {
        const [x, y] = pt(i, (R * clamp(a.value)) / 100)
        return <circle key={`d${i}`} cx={x} cy={y} r={3.5} fill={color} />
      })}
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
