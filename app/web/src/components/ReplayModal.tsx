import { useEffect, useState } from 'react'
import { api } from '../lib/api'

interface Moment { ref: string; phase: number; titre: string; question: string; reponse: string; annotation: string }

// Auto-confrontation / replay annoté : on rejoue l'entretien moment par moment et on annote sa posture.
// Un bouton IA amorce les annotations (auto-confrontation), que l'accompagnateur modifie avant d'enregistrer.
export default function ReplayModal({ sessionId, index, onClose }: { sessionId: number; index: number; onClose: () => void }) {
  const [moments, setMoments] = useState<Moment[]>([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [source, setSource] = useState<string | null>(null)

  useEffect(() => {
    api<{ moments: Moment[]; source: string | null }>(`/reflexivite/replay/session/${sessionId}`)
      .then((d) => { setMoments(d.moments); setSource(d.source) })
      .catch(() => { /* ignore */ })
  }, [sessionId])

  useEffect(() => {
    const p = document.body.style.overflow; document.body.style.overflow = 'hidden'
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', k)
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = p }
  }, [onClose])

  function setAnn(ref: string, v: string) { setMoments((ms) => ms.map((m) => (m.ref === ref ? { ...m, annotation: v } : m))) }

  async function initialiser() {
    setBusy(true); setMsg('')
    try {
      const d = await api<{ moments: Moment[]; source: string }>(`/reflexivite/replay/session/${sessionId}/initialiser`, { method: 'POST' })
      // Conserve les annotations déjà saisies ; remplit les vides avec l'amorce IA.
      setMoments((prev) => d.moments.map((m) => ({ ...m, annotation: prev.find((p) => p.ref === m.ref)?.annotation?.trim() ? (prev.find((p) => p.ref === m.ref) as Moment).annotation : m.annotation })))
      setSource(d.source)
      setMsg('Auto-confrontation amorcée par l’IA — ajuste chaque annotation.')
    } catch { setMsg('Impossible d’amorcer l’auto-confrontation.') } finally { setBusy(false) }
  }
  async function enregistrer() {
    setBusy(true); setMsg('')
    try {
      await api(`/reflexivite/replay/session/${sessionId}`, { method: 'POST', body: JSON.stringify({ moments: moments.map((m) => ({ ref: m.ref, annotation: m.annotation })) }) })
      setMsg('Annotations enregistrées ✓')
    } catch { setMsg('Échec de l’enregistrement.') } finally { setBusy(false) }
  }

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="replay-title" style={{ maxWidth: 720 }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 id="replay-title">🎬 Replay annoté — Entretien #{index}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fermer">×</button>
        </div>
        <div className="modal-body">
          <p className="muted">Rejoue tes interventions et annote ta posture, moment par moment. {source === 'ia' && <em>(amorcé par l’IA)</em>}</p>
          {moments.length === 0 && <p className="muted">Aucune question enregistrée pour cet entretien : rien à rejouer.</p>}
          <ol style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 12 }}>
            {moments.map((m) => (
              <li key={m.ref} style={{ border: '1px solid var(--border, #e5e7eb)', borderRadius: 10, padding: 12 }}>
                <div className="muted" style={{ fontSize: '.78rem', textTransform: 'uppercase', letterSpacing: '.03em' }}>{m.titre}</div>
                <div style={{ fontWeight: 600, margin: '2px 0' }}>« {m.question} »</div>
                {m.reponse && <div className="muted" style={{ fontSize: '.88rem', marginBottom: 6 }}>→ {m.reponse}</div>}
                <textarea rows={2} value={m.annotation} onChange={(e) => setAnn(m.ref, e.target.value)} placeholder="Ici, ma posture : induction ? ouverture ? écoute ?… (annotation)" style={{ width: '100%' }} />
              </li>
            ))}
          </ol>
          {msg && <p className="form-success">{msg}</p>}
          {moments.length > 0 && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
              <button className="btn btn-ghost" disabled={busy} onClick={initialiser}>✨ Initialiser l’auto-confrontation (IA)</button>
              <button className="btn btn-primary" disabled={busy} onClick={enregistrer} style={{ marginLeft: 'auto' }}>Enregistrer</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
