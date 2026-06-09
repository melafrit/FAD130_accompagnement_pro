interface Zone { label: string; min: number; couleur: string }

interface Props {
  value: number | null
  onChange: (v: number) => void
  zones: Zone[]
  disabled?: boolean
}

/** Curseur continu 0–100 sur un dégradé de couleurs ; légende + zone affichées dynamiquement. */
export default function GradientSlider({ value, onChange, zones, disabled }: Props) {
  const v = value ?? 0
  const sorted = [...zones].sort((a, b) => a.min - b.min)
  const last = sorted[sorted.length - 1]
  const grad = sorted.map((z) => `${z.couleur} ${z.min}%`).concat(`${last.couleur} 100%`).join(', ')
  let zone = sorted[0]
  for (const z of sorted) if (v >= z.min) zone = z

  return (
    <div className={`gslider ${value == null ? 'gslider-empty' : ''}`}>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={v}
        disabled={disabled}
        onPointerDown={() => { if (value == null) onChange(v) }}
        onKeyDown={() => { if (value == null) onChange(v) }}
        onChange={(e) => onChange(Number(e.target.value))}
        className="gslider-input"
        style={{ background: `linear-gradient(to right, ${grad})` }}
        aria-label="Score (0 à 100)"
      />
      <div className="gslider-legend">
        {value == null ? (
          <span className="gslider-empty-txt">Non évalué — glisse pour noter</span>
        ) : (
          <>
            <span className="gslider-zone" style={{ color: zone.couleur }}>{zone.label}</span>
            <span className="gslider-val">{Math.round(v)} %</span>
          </>
        )}
      </div>
    </div>
  )
}
