import { useRef, type TextareaHTMLAttributes } from 'react'
import { useDictation } from '../hooks/useDictation'

type Props = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> & {
  value: string
  onChange: (value: string) => void
  /** Appelé après l'ajout d'un texte dicté (aucun blur ne se déclenche alors) — pour persister si besoin. */
  onCommit?: (value: string) => void
}

// Zone de texte multi-lignes avec bouton micro intégré : on parle, le texte s'ajoute dans le champ.
export default function DictaTextarea({ value, onChange, onCommit, className, ...rest }: Props) {
  const valueRef = useRef(value)
  valueRef.current = value
  const { supported, active, interim, toggle } = useDictation((t) => {
    const piece = t.trim() // pas d'espace en trop, quel que soit ce que renvoie le moteur
    if (!piece) return
    const cur = valueRef.current
    const sep = cur && !/\s$/.test(cur) ? ' ' : ''
    const next = cur + sep + piece
    valueRef.current = next
    onChange(next)
    onCommit?.(next)
  })
  return (
    <div className="dicta">
      <textarea
        {...rest}
        className={`dicta-field ${className || ''}`.trim()}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {supported && (
        <button
          type="button"
          className={`dicta-mic ${active ? 'on' : ''}`}
          onClick={toggle}
          aria-label={active ? 'Arrêter la dictée' : 'Dicter dans ce champ'}
          aria-pressed={active}
          title={active ? 'Arrêter la dictée' : 'Dicter'}
        >
          {active ? '⏹' : '🎙'}
        </button>
      )}
      {active && interim && (
        <p className="dicta-interim" aria-live="polite" aria-atomic="true"><span className="listening-dot" aria-hidden="true" />{interim}</p>
      )}
    </div>
  )
}
