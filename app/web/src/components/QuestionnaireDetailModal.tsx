import { useEffect } from 'react'

interface QA { question: string; answer: string }

// Détail du questionnaire initial : les questions/réponses (si disponibles) + le récapitulatif.
export default function QuestionnaireDetailModal({
  recap,
  contenu,
  completeLe,
  onClose,
}: {
  recap: string | null
  contenu: string | null
  completeLe: string | null
  onClose: () => void
}) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])

  let qa: QA[] = []
  try {
    const p = JSON.parse(contenu || '')
    if (Array.isArray(p)) qa = p.filter((x) => x && typeof x.question === 'string' && typeof x.answer === 'string')
  } catch { /* contenu non-JSON (ancien format / démo) : on affiche le récapitulatif */ }

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal cr-modal" role="dialog" aria-modal="true" aria-labelledby="q-title" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 id="q-title">Questionnaire initial — questions &amp; réponses</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fermer">×</button>
        </div>
        <div className="modal-body cr-view">
          {completeLe && <p className="muted">Complété le {(completeLe || '').slice(0, 10)}</p>}
          {qa.length > 0 && (
            <div className="qa-detail">
              {qa.map((x, i) => (
                <div key={i} className="qa-detail-item">
                  <p className="qa-detail-q">❓ {x.question}</p>
                  <p className="qa-detail-a">{x.answer}</p>
                </div>
              ))}
            </div>
          )}
          {recap && (
            <>
              <h3>Récapitulatif</h3>
              <pre className="recap-text">{recap}</pre>
            </>
          )}
          {qa.length === 0 && !recap && <p className="muted">Aucun détail disponible.</p>}
        </div>
      </div>
    </div>
  )
}
