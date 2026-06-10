import { useEffect, useState } from 'react'
import { api } from '../lib/api'

interface Phase { id: number; titre: string }
interface Reponse { phase: string; texte_reponse: string }
interface QuestionPosee { id: number; phase: string; texte: string; reponse: string | null }

// Détail d'un entretien : par phase, les notes et les questions posées + leurs réponses.
export default function EntretienDetailModal({ sessionId, index, onClose }: { sessionId: number; index: number; onClose: () => void }) {
  const [phases, setPhases] = useState<Phase[]>([])
  const [reponses, setReponses] = useState<Reponse[]>([])
  const [questions, setQuestions] = useState<QuestionPosee[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        const [p, s] = await Promise.all([
          api<{ phases: Phase[] }>('/entretien/phases'),
          api<{ reponses: Reponse[]; questions: QuestionPosee[] }>(`/entretien/sessions/${sessionId}`),
        ])
        setPhases(p.phases); setReponses(s.reponses); setQuestions(s.questions)
      } catch { /* ignore */ } finally { setLoading(false) }
    })()
  }, [sessionId])
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])

  const phaseTitre = (pid: number) => phases.find((x) => x.id === pid)?.titre || ''
  const phaseIds = Array.from(new Set([
    ...reponses.filter((r) => (r.texte_reponse || '').trim()).map((r) => Number(r.phase)),
    ...questions.map((q) => Number(q.phase)),
  ])).sort((a, b) => a - b)

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal cr-modal" role="dialog" aria-modal="true" aria-labelledby="ent-title" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 id="ent-title">Entretien #{index} — questions &amp; réponses</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fermer">×</button>
        </div>
        <div className="modal-body cr-view">
          {loading ? (
            <p className="muted">Chargement…</p>
          ) : phaseIds.length === 0 ? (
            <p className="muted">Aucune note ni question enregistrée pour cet entretien.</p>
          ) : phaseIds.map((pid) => {
            const note = reponses.find((r) => Number(r.phase) === pid)?.texte_reponse
            const qs = questions.filter((q) => Number(q.phase) === pid)
            return (
              <div key={pid} className="ent-phase">
                <h3>Phase {pid + 1}{phaseTitre(pid) ? ` — ${phaseTitre(pid)}` : ''}</h3>
                {note && note.trim() && <p className="ent-notes"><strong>Notes :</strong> {note}</p>}
                {qs.length > 0 && (
                  <ul className="ent-qs">
                    {qs.map((q) => (
                      <li key={q.id}>
                        <span className="ent-q">❓ {q.texte}</span>
                        {q.reponse && q.reponse.trim() && <span className="ent-r">{q.reponse}</span>}
                      </li>
                    ))}
                  </ul>
                )}
                {!note?.trim() && qs.length === 0 && <p className="muted">(rien de saisi)</p>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
