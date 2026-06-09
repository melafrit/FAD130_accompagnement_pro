export interface Bar { label: string; value: number | null; color: string; title?: string }

/** Barres horizontales (un indicateur par ligne), colorées par zone. */
export default function BarsChart({ bars }: { bars: Bar[] }) {
  return (
    <div className="barchart">
      {bars.map((b, i) => (
        <div className="barrow" key={i} title={b.title || b.label}>
          <span className="barlabel">{b.label}</span>
          <span className="bartrack">
            <span className="barfill" style={{ width: `${Math.max(0, Math.min(100, b.value ?? 0))}%`, background: b.color }} />
          </span>
          <span className="barval">{b.value != null ? Math.round(b.value) : '—'}</span>
        </div>
      ))}
    </div>
  )
}
