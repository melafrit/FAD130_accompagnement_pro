import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { Reorder, useDragControls, AnimatePresence, MotionConfig } from 'framer-motion'

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

// Une ligne d'action (Reorder.Item) : glissable uniquement par la poignée (dragControls).
function ActionRow({
  action,
  canReorder,
  onStatut,
  onOpen,
  onDragStart,
  onDragEnd,
  onKeyReorder,
}: {
  action: Action
  canReorder: boolean
  onStatut: (id: number, statut: string) => void
  onOpen?: (a: Action) => void
  onDragStart: () => void
  onDragEnd: () => void
  onKeyReorder: (e: ReactKeyboardEvent) => void
}) {
  const controls = useDragControls()
  return (
    <Reorder.Item
      value={action}
      as="div"
      dragListener={false}
      dragControls={controls}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      layout="position"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: action.statut === 'fait' ? 0.75 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 600, damping: 38 }}
      whileDrag={{ scale: 1.03, boxShadow: '0 12px 30px rgba(0,0,0,.20)', zIndex: 5, cursor: 'grabbing' }}
      className={`action-item statut-${action.statut}${action.priorite ? ` prio-${action.priorite}` : ''}`}
    >
      {canReorder && (
        <button
          type="button"
          className="action-drag"
          aria-label="Réordonner (glisser, ou flèches haut/bas)"
          title="Glisser pour réordonner (ou flèches ↑/↓)"
          style={{ touchAction: 'none' }}
          onPointerDown={(e) => controls.start(e)}
          onKeyDown={onKeyReorder}
        >
          ⠿
        </button>
      )}
      {action.priorite && <span className={`prio-dot prio-${action.priorite}`} title={PRIO_LABEL[action.priorite] || ''} aria-label={PRIO_LABEL[action.priorite] || ''} />}
      <button
        type="button"
        className="action-body"
        onClick={() => onOpen?.(action)}
        disabled={!onOpen}
        aria-label={onOpen ? `Ouvrir le détail : ${action.libelle}` : undefined}
      >
        <span className="action-lib">{action.libelle}</span>
        {(action.echeance || action.critere || action.rappel_le) && (
          <span className="action-meta">
            {action.echeance ? `Échéance : ${action.echeance}` : ''}
            {action.echeance && action.critere ? ' · ' : ''}
            {action.critere || ''}
            {(action.echeance || action.critere) && action.rappel_le ? ' · ' : ''}
            {action.rappel_le ? `🔔 ${action.rappel_le}` : ''}
          </span>
        )}
      </button>
      <select
        className="action-statut"
        value={action.statut}
        onChange={(e) => onStatut(action.id, e.target.value)}
        onClick={(e) => e.stopPropagation()}
        aria-label="Statut"
      >
        <option value="a_faire">À faire</option>
        <option value="en_cours">En cours</option>
        <option value="fait">Fait</option>
      </select>
    </Reorder.Item>
  )
}

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
  const [items, setItems] = useState<Action[]>(actions)
  const draggingRef = useRef(false) // vrai pendant un glissement OU une rafale de déplacements clavier
  const startOrder = useRef<number[]>([])
  const itemsRef = useRef(items)
  itemsRef.current = items
  const kbTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Resynchronise sur les props, sauf pendant une interaction (pour ne pas casser l'animation en cours)
  useEffect(() => {
    if (!draggingRef.current) setItems(actions)
  }, [actions])
  useEffect(() => () => { if (kbTimer.current) clearTimeout(kbTimer.current) }, [])

  function handleDragStart() {
    draggingRef.current = true
    startOrder.current = itemsRef.current.map((a) => a.id)
  }
  function handleDragEnd() {
    draggingRef.current = false
    const next = itemsRef.current.map((a) => a.id)
    const prev = startOrder.current
    // ne persiste que si l'ordre a réellement changé (un simple clic sur la poignée ne réordonne rien)
    if (next.length === prev.length && next.every((id, i) => id === prev[i])) return
    onReorder?.(next)
  }
  // Réordonnancement au clavier (accessibilité) : flèches haut/bas sur la poignée.
  // Déplacement optimiste immédiat ; on ne persiste (POST + rechargement) qu'une fois la rafale
  // de touches terminée (anti-emballement + pas de retour en arrière dû à une réponse tardive).
  function moveByKeyboard(e: ReactKeyboardEvent, id: number) {
    if (!onReorder || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return
    e.preventDefault()
    const cur = itemsRef.current
    const from = cur.findIndex((a) => a.id === id)
    if (from === -1) return
    const to = e.key === 'ArrowUp' ? from - 1 : from + 1
    if (to < 0 || to >= cur.length) return
    const next = cur.slice()
    ;[next[from], next[to]] = [next[to], next[from]]
    itemsRef.current = next // synchronise pour les touches rapprochées
    draggingRef.current = true // suspend la resync pendant la rafale
    setItems(next)
    if (kbTimer.current) clearTimeout(kbTimer.current)
    kbTimer.current = setTimeout(() => {
      draggingRef.current = false
      onReorder?.(itemsRef.current.map((a) => a.id))
    }, 350)
  }

  if (items.length === 0) return <p className="muted">Aucune action pour l'instant.</p>

  return (
    <MotionConfig reducedMotion="user">
      <Reorder.Group axis="y" as="div" values={items} onReorder={setItems} className="actions-list">
        <AnimatePresence initial={false}>
          {items.map((a) => (
            <ActionRow
              key={a.id}
              action={a}
              canReorder={!!onReorder}
              onStatut={onStatut}
              onOpen={onOpen}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onKeyReorder={(e) => moveByKeyboard(e, a.id)}
            />
          ))}
        </AnimatePresence>
      </Reorder.Group>
    </MotionConfig>
  )
}
