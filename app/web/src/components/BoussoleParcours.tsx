import { useEffect, useState } from 'react'
import { useFeature } from '../features/FeaturesContext'

// Boussole du parcours : demi-cercle gradué sur les 6 phases de l'entretien,
// une aiguille pointe la phase courante, + jalons et progression vers l'autonomie.
const PHASES_LONG = [
  'Accueil et mise en confiance',
  'Clarifier le besoin',
  "Explorer l'expérience",
  'Relier et donner du sens',
  "Plan d'action & engagement",
  'Clôture et élan',
]

interface Props {
  phaseMax: number // -1 (aucun entretien) à 5
  questionnaire: boolean
  entretiens: number
  crPublies: number
  synthesePubliee: boolean
  cloture: boolean
}

const cx = 160, cy = 168, R = 124
const pt = (deg: number, r: number): [number, number] => {
  const a = (deg * Math.PI) / 180
  return [cx + r * Math.cos(a), cy - r * Math.sin(a)]
}
const arc = (aStart: number, aEnd: number, r: number) => {
  const [x1, y1] = pt(aStart, r)
  const [x2, y2] = pt(aEnd, r)
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`
}

export default function BoussoleParcours({ phaseMax, questionnaire, entretiens, crPublies, synthesePubliee, cloture }: Props) {
  const boussoleActive = useFeature('boussole')
  const cur = Math.max(-1, Math.min(5, phaseMax))
  const pct = cur < 0 ? 0 : Math.round(((cur + 1) / 6) * 100)
  const targetDeg = cur < 0 ? 180 : 180 - cur * 30 - 15

  // Animation d'entrée : l'aiguille balaie de la position de départ vers la phase courante.
  const [anim, setAnim] = useState(false)
  useEffect(() => { const t = setTimeout(() => setAnim(true), 80); return () => clearTimeout(t) }, [])
  const needleDeg = anim ? targetDeg : 180
  const [nx, ny] = pt(needleDeg, R - 24)

  if (!boussoleActive) return null

  return (
    <div className="boussole">
      <svg viewBox="0 0 320 196" className="boussole-svg" role="img"
        aria-label={`Boussole du parcours : ${cur < 0 ? 'pas encore commencé' : `phase ${cur + 1} sur 6, ${PHASES_LONG[cur]}`} — progression ${pct}% vers l'autonomie`}>
        {PHASES_LONG.map((_, i) => {
          const aS = 180 - i * 30 - 1.5
          const aE = 180 - (i + 1) * 30 + 1.5
          const state = cur < 0 || i > cur ? 'future' : i === cur ? 'current' : 'done'
          return <path key={i} className={`bs-seg ${state}`} d={arc(aS, aE, R)} />
        })}
        {PHASES_LONG.map((_, i) => {
          const [tx, ty] = pt(180 - i * 30 - 15, R + 15)
          return <text key={i} className="bs-num" x={tx.toFixed(1)} y={ty.toFixed(1)} textAnchor="middle" dominantBaseline="middle">{i + 1}</text>
        })}
        {cur >= 0 && <line className="bs-needle" x1={cx} y1={cy} x2={nx.toFixed(1)} y2={ny.toFixed(1)} />}
        <circle className="bs-hub" cx={cx} cy={cy} r="7" />
        <text className="bs-pct" x={cx} y={cy - 40} textAnchor="middle">{pct}%</text>
        <text className="bs-pct-lbl" x={cx} y={cy - 24} textAnchor="middle">vers l’autonomie</text>
      </svg>

      <p className="boussole-phase">
        {cur < 0
          ? <>Parcours ouvert — <strong>en attente du premier entretien</strong></>
          : <>Phase {cur + 1} / 6 · <strong>{PHASES_LONG[cur]}</strong></>}
      </p>

      <div className="boussole-jalons">
        <span className={`bs-jalon ${questionnaire ? 'ok' : ''}`}>{questionnaire ? '✓' : '○'} Questionnaire</span>
        <span className={`bs-jalon ${entretiens > 0 ? 'ok' : ''}`}>{entretiens > 0 ? '✓' : '○'} {entretiens} entretien{entretiens > 1 ? 's' : ''}</span>
        <span className={`bs-jalon ${crPublies > 0 ? 'ok' : ''}`}>{crPublies > 0 ? '✓' : '○'} {crPublies} CR publié{crPublies > 1 ? 's' : ''}</span>
        <span className={`bs-jalon ${synthesePubliee ? 'ok' : ''}`}>{synthesePubliee ? '✓' : '○'} Synthèse</span>
        <span className={`bs-jalon ${cloture ? 'ok' : ''}`}>{cloture ? '✓' : '○'} Clôture</span>
      </div>
    </div>
  )
}
