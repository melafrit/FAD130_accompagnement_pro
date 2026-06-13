import { useEffect, useState } from 'react'
import { api } from '../lib/api'

// Débriefing réflexif à chaud : 3 questions guidées après un entretien, avec amorce IA modifiable.
export default function DebriefingModal({ sessionId, index, onClose }: { sessionId: number; index: number; onClose: () => void }) {
  const [questions, setQuestions] = useState<string[]>([])
  const [reponses, setReponses] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [source, setSource] = useState<string | null>(null)

  useEffect(() => {
    api<{ questions: string[]; debriefing: { reponses: string[]; source: string } | null }>(`/reflexivite/debriefing/session/${sessionId}`)
      .then((d) => {
        setQuestions(d.questions)
        setReponses(d.debriefing?.reponses?.length ? d.debriefing.reponses : d.questions.map(() => ''))
        if (d.debriefing) setSource(d.debriefing.source)
      })
      .catch(() => { /* ignore */ })
  }, [sessionId])

  useEffect(() => {
    const p = document.body.style.overflow; document.body.style.overflow = 'hidden'
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', k)
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = p }
  }, [onClose])

  function setRep(i: number, v: string) { setReponses((r) => r.map((x, j) => (j === i ? v : x))) }

  async function amorcer() {
    setBusy(true); setMsg('')
    try {
      const d = await api<{ reponses: string[]; source: string }>(`/reflexivite/debriefing/session/${sessionId}/suggerer`, { method: 'POST' })
      setReponses((prev) => questions.map((_, i) => prev[i]?.trim() ? prev[i] : d.reponses[i] || ''))
      setSource(d.source)
      setMsg('Amorce IA insérée — à toi de l’ajuster.')
    } catch { setMsg('Impossible de générer une amorce.') } finally { setBusy(false) }
  }
  async function enregistrer() {
    setBusy(true); setMsg('')
    try {
      await api(`/reflexivite/debriefing/session/${sessionId}`, { method: 'POST', body: JSON.stringify({ reponses }) })
      setMsg('Débriefing enregistré ✓')
    } catch { setMsg('Échec de l’enregistrement.') } finally { setBusy(false) }
  }

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="debrief-title" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 id="debrief-title">💬 Débriefing — Entretien #{index}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fermer">×</button>
        </div>
        <div className="modal-body">
          <p className="muted">Un court retour réflexif à chaud, pour toi. {source === 'ia' && <em>(amorcé par l’IA)</em>}</p>
          {questions.map((q, i) => (
            <label key={i} className="field" style={{ display: 'block', marginBottom: 12 }}>
              <span>{q}</span>
              <textarea rows={2} value={reponses[i] || ''} onChange={(e) => setRep(i, e.target.value)} placeholder="…" />
            </label>
          ))}
          {msg && <p className="form-success">{msg}</p>}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
            <button className="btn btn-ghost" disabled={busy} onClick={amorcer}>✨ Amorcer par l’IA</button>
            <button className="btn btn-primary" disabled={busy} onClick={enregistrer} style={{ marginLeft: 'auto' }}>Enregistrer</button>
          </div>
        </div>
      </div>
    </div>
  )
}
