import { useRef, type InputHTMLAttributes, type Ref } from 'react'
import { useDictation } from '../hooks/useDictation'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  value: string
  onChange: (value: string) => void
  /** Appelé après l'ajout d'un texte dicté — pour persister si le champ se sauvegarde au blur. */
  onCommit?: (value: string) => void
  inputRef?: Ref<HTMLInputElement>
}

// Champ d'une ligne avec bouton micro intégré. Conserve le « Entrée pour envoyer » (le micro est type="button").
export default function DictaInput({ value, onChange, onCommit, className, inputRef, ...rest }: Props) {
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
    <div className="dicta dicta-inline">
      <input
        {...rest}
        ref={inputRef}
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
