import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import RichTextEditor from './RichTextEditor'

// Notes privées de l'accompagnateur pour un entretien — JAMAIS publiées à l'accompagné.
export default function NotesPriveesModal({ sessionId, onClose }: { sessionId: number; onClose: () => void }) {
  const [html, setHtml] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    void api<{ contenu_html: string }>(`/cr/session/${sessionId}/notes`)
      .then((d) => setHtml(d.contenu_html || ''))
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [sessionId])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])

  async function save() {
    setBusy(true); setMsg('')
    try { await api(`/cr/session/${sessionId}/notes`, { method: 'PUT', body: JSON.stringify({ contenu_html: html }) }); setMsg('Notes enregistrées ✅') }
    catch { setMsg('Enregistrement impossible.') } finally { setBusy(false) }
  }

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal cr-modal" role="dialog" aria-modal="true" aria-labelledby="np-title" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 id="np-title">🔒 Notes privées</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fermer">×</button>
        </div>
        <div className="modal-body">
          <p className="np-banner">🔒 <strong>Privé</strong> — visible uniquement par toi. Ces notes ne sont <strong>jamais publiées</strong> ni visibles par l’accompagné (pense-bête, points de vigilance, éléments de posture…).</p>
          {!loaded ? <p className="muted">Chargement…</p> : <RichTextEditor value={html} onChange={setHtml} />}
          {msg && <p className="form-success">{msg}</p>}
        </div>
        <div className="modal-actions">
          <span className="muted">Confidentiel</span>
          <div className="modal-actions-right">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>Fermer</button>
            <button type="button" className="btn btn-primary" onClick={save} disabled={busy || !loaded}>💾 Enregistrer</button>
          </div>
        </div>
      </div>
    </div>
  )
}
