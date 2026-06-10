import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react'

export interface Action {
  id: number
  libelle: string
  echeance: string | null
  critere: string | null
  details: string | null
  priorite: string | null
  statut: string
  rappel_le: string | null
  cree_le: string | null
  ordre: number | null
}

const PRIO_LABEL: Record<string, string> = { haute: 'Priorité haute', moyenne: 'Priorité moyenne', basse: 'Priorité basse' }

export default function ActionList({
  actions,
  onStatut,
  onOpen,
  onReorder,
}: {
  actions: Action[]
  onStatut: (id: number, statut: string) => void
  onOpen?: (a: Action) => void
  onReorder?: (ids: number[]) => void
}) {
  // Copie locale réordonnable pendant le glisser-déposer ; resynchronisée sur les props.
  const [items, setItems] = useState<Action[]>(actions)
  const dragId = useRef<number | null>(null)
  const startOrder = useRef<number[]>([])
  const [draggingId, setDraggingId] = useState<number | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (dragId.current == null) setItems(actions) // ne pas écraser pendant un glissement
  }, [actions])

  function startDrag(e: ReactPointerEvent, id: number) {
    if (!onReorder) return
    e.preventDefault()
    dragId.current = id
    startOrder.current = items.map((a) => a.id)
    setDraggingId(id)
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
  }
  function moveDrag(e: ReactPointerEvent) {
    if (dragId.current == null || !listRef.current) return
    const rows = Array.from(listRef.current.querySelectorAll<HTMLElement>('[data-action-row]'))
    const y = e.clientY
    // index souhaité = nombre d'AUTRES lignes dont le milieu est au-dessus du pointeur
    let desired = 0
    for (const r of rows) {
      if (Number(r.dataset.id) === dragId.current) continue
      const rect = r.getBoundingClientRect()
      if (rect.top + rect.height / 2 < y) desired++
    }
    setItems((cur) => {
      const moved = cur.find((a) => a.id === dragId.current)
      if (!moved) return cur
      const without = cur.filter((a) => a.id !== dragId.current)
      const clamped = Math.max(0, Math.min(desired, without.length))
      const next = [...without.slice(0, clamped), moved, ...without.slice(clamped)]
      // évite un setState inutile si l'ordre n'a pas changé
      if (next.every((a, i) => a.id === cur[i].id)) return cur
      return next
    })
  }
  function endDrag() {
    if (dragId.current == null) return
    dragId.current = null
    setDraggingId(null)
    const next = items.map((a) => a.id)
    const prev = startOrder.current
    // ne persiste que si l'ordre a réellement changé (un simple clic sur la poignée ne réordonne rien)
    if (next.length === prev.length && next.every((id, i) => id === prev[i])) return
    onReorder?.(next)
  }
  // Réordonnancement au clavier (accessibilité) : flèches haut/bas sur la poignée
  function moveByKeyboard(e: ReactKeyboardEvent, id: number) {
    if (!onReorder || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return
    e.preventDefault()
    const from = items.findIndex((a) => a.id === id)
    if (from === -1) return
    const to = e.key === 'ArrowUp' ? from - 1 : from + 1
    if (to < 0 || to >= items.length) return
    const next = items.slice()
    ;[next[from], next[to]] = [next[to], next[from]]
    setItems(next)
    onReorder(next.map((a) => a.id))
  }

  if (items.length === 0) return <p className="muted">Aucune action pour l'instant.</p>

  return (
    <div className="actions-list" ref={listRef}>
      {items.map((a) => (
        <div
          key={a.id}
          data-action-row
          data-id={a.id}
          className={`action-item statut-${a.statut}${a.priorite ? ` prio-${a.priorite}` : ''}${draggingId === a.id ? ' dragging' : ''}`}
        >
          {onReorder && (
            <button
              type="button"
              className="action-drag"
              aria-label="Réordonner (glisser, ou flèches haut/bas)"
              title="Glisser pour réordonner (ou flèches ↑/↓)"
              onPointerDown={(e) => startDrag(e, a.id)}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onKeyDown={(e) => moveByKeyboard(e, a.id)}
            >
              ⠿
            </button>
          )}
          {a.priorite && <span className={`prio-dot prio-${a.priorite}`} title={PRIO_LABEL[a.priorite] || ''} aria-label={PRIO_LABEL[a.priorite] || ''} />}
          <button
            type="button"
            className="action-body"
            onClick={() => onOpen?.(a)}
            disabled={!onOpen}
            aria-label={onOpen ? `Ouvrir le détail : ${a.libelle}` : undefined}
          >
            <span className="action-lib">{a.libelle}</span>
            {(a.echeance || a.critere || a.rappel_le) && (
              <span className="action-meta">
                {a.echeance ? `Échéance : ${a.echeance}` : ''}
                {a.echeance && a.critere ? ' · ' : ''}
                {a.critere || ''}
                {(a.echeance || a.critere) && a.rappel_le ? ' · ' : ''}
                {a.rappel_le ? `🔔 ${a.rappel_le}` : ''}
              </span>
            )}
          </button>
          <select
            className="action-statut"
            value={a.statut}
            onChange={(e) => onStatut(a.id, e.target.value)}
            onClick={(e) => e.stopPropagation()}
            aria-label="Statut"
          >
            <option value="a_faire">À faire</option>
            <option value="en_cours">En cours</option>
            <option value="fait">Fait</option>
          </select>
        </div>
      ))}
    </div>
  )
}
