import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import DictaInput from './DictaInput'
import DictaTextarea from './DictaTextarea'

interface Phase { id: number; titre: string; soustitre?: string }
interface Reponse { phase: string; texte_reponse: string }
interface QuestionPosee { id: number; phase: string; texte: string; reponse: string | null }
// Question éditable : id négatif = nouvelle (pas encore créée côté serveur) ; deleted = à supprimer.
interface EQ { id: number; phase: number; texte: string; reponse: string; isNew?: boolean; deleted?: boolean }

// Détail d'un entretien (accompagnateur) : par phase, les notes et les questions posées + leurs
// réponses. Éditable champ par champ (texte simple + dictée), enregistrement ou annulation.
export default function EntretienDetailModal({
  sessionId, index, onClose, onChanged,
}: { sessionId: number; index: number; onClose: () => void; onChanged?: () => void }) {
  const [phases, setPhases] = useState<Phase[]>([])
  const [reponses, setReponses] = useState<Reponse[]>([])
  const [questions, setQuestions] = useState<QuestionPosee[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [eqs, setEqs] = useState<EQ[]>([])
  const tempId = useRef(-1)
  const [moments, setMoments] = useState<{ verbatim: string; pourquoi: string }[] | null>(null)
  const [momPartage, setMomPartage] = useState(0)
  const [momBusy, setMomBusy] = useState(false)

  async function load() {
    const [p, s] = await Promise.all([
      api<{ phases: Phase[] }>('/entretien/phases'),
      api<{ reponses: Reponse[]; questions: QuestionPosee[] }>(`/entretien/sessions/${sessionId}`),
    ])
    setPhases(p.phases); setReponses(s.reponses); setQuestions(s.questions)
    try { const m = await api<{ moments: { verbatim: string; pourquoi: string }[] | null; partage: number }>(`/emergence/session/${sessionId}/moments`); setMoments(m.moments); setMomPartage(m.partage) } catch { /* ignore */ }
  }
  async function genMoments() {
    setMomBusy(true)
    try { const m = await api<{ moments: { verbatim: string; pourquoi: string }[]; partage: number }>(`/emergence/session/${sessionId}/moments`, { method: 'POST' }); setMoments(m.moments); setMomPartage(m.partage) }
    finally { setMomBusy(false) }
  }
  async function toggleMomPartage() {
    await api(`/emergence/session/${sessionId}/moments/partage`, { method: 'PATCH', body: JSON.stringify({ partage: momPartage ? 0 : 1 }) })
    setMomPartage((p) => (p ? 0 : 1))
  }
  useEffect(() => {
    void (async () => { try { await load() } catch { /* ignore */ } finally { setLoading(false) } })()
  }, [sessionId])
  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape' && !editing) onClose() }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prevOverflow }
  }, [onClose, editing])

  const phaseTitre = (pid: number) => phases.find((x) => x.id === pid)?.titre || ''
  const phaseIds = Array.from(new Set([
    ...reponses.filter((r) => (r.texte_reponse || '').trim()).map((r) => Number(r.phase)),
    ...questions.map((q) => Number(q.phase)),
  ])).sort((a, b) => a - b)

  function startEdit() {
    const n: Record<number, string> = {}
    reponses.forEach((r) => { n[Number(r.phase)] = r.texte_reponse || '' })
    setNotes(n)
    setEqs(questions.map((q) => ({ id: q.id, phase: Number(q.phase), texte: q.texte, reponse: q.reponse || '' })))
    setMsg(''); setEditing(true)
  }
  const setNote = (phase: number, val: string) => setNotes((p) => ({ ...p, [phase]: val }))
  const setEq = (id: number, patch: Partial<EQ>) => setEqs((p) => p.map((q) => (q.id === id ? { ...q, ...patch } : q)))
  const addQuestion = (phase: number) => setEqs((p) => [...p, { id: tempId.current--, phase, texte: '', reponse: '', isNew: true }])
  const removeQuestion = (id: number) => setEqs((p) => p.flatMap((q) => (q.id !== id ? [q] : q.isNew ? [] : [{ ...q, deleted: true }])))

  async function save() {
    const kept = eqs.filter((q) => !q.deleted)
    if (kept.some((q) => !q.texte.trim())) { setMsg('Chaque question doit avoir un texte (ou supprime-la).'); return }
    setBusy(true); setMsg('')
    try {
      // 1) Notes par phase (seulement celles qui ont changé)
      const orig: Record<number, string> = {}
      reponses.forEach((r) => { orig[Number(r.phase)] = r.texte_reponse || '' })
      for (const pid of Object.keys(notes).map(Number)) {
        const val = notes[pid] ?? ''
        if ((orig[pid] ?? '') !== val) {
          await api(`/entretien/sessions/${sessionId}/reponses`, { method: 'POST', body: JSON.stringify({ phase: String(pid), texte: val }) })
        }
      }
      // 2) Questions : suppressions, créations, mises à jour
      for (const q of eqs) {
        if (q.deleted) {
          if (!q.isNew) await api(`/entretien/sessions/${sessionId}/questions/${q.id}`, { method: 'DELETE' })
          continue
        }
        if (q.isNew) {
          const created = await api<{ id: number }>(`/entretien/sessions/${sessionId}/questions`, { method: 'POST', body: JSON.stringify({ phase: String(q.phase), texte: q.texte.trim() }) })
          if (q.reponse.trim()) await api(`/entretien/sessions/${sessionId}/questions/${created.id}`, { method: 'PATCH', body: JSON.stringify({ reponse: q.reponse }) })
        } else {
          const o = questions.find((x) => x.id === q.id)
          if (!o || o.texte !== q.texte.trim() || (o.reponse || '') !== q.reponse) {
            await api(`/entretien/sessions/${sessionId}/questions/${q.id}`, { method: 'PATCH', body: JSON.stringify({ texte: q.texte.trim(), reponse: q.reponse }) })
          }
        }
      }
      await load(); setEditing(false); onChanged?.()
    } catch { setMsg('Enregistrement impossible. Réessaie.') } finally { setBusy(false) }
  }

  return (
    <div className="modal-overlay" onMouseDown={() => !editing && onClose()}>
      <div className="modal cr-modal" role="dialog" aria-modal="true" aria-labelledby="ent-title" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 id="ent-title">Entretien #{index} — questions &amp; réponses</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fermer">×</button>
        </div>
        <div className="modal-body cr-view">
          {loading ? (
            <p className="muted">Chargement…</p>
          ) : editing ? (
            <>
              {msg && <p className="form-error">{msg}</p>}
              {phases.map((ph) => {
                const qs = eqs.filter((q) => q.phase === ph.id && !q.deleted)
                return (
                  <div key={ph.id} className="ent-phase ent-edit">
                    <h3>Phase {ph.id + 1} — {ph.titre}</h3>
                    <label className="ent-lbl">Notes</label>
                    <DictaTextarea value={notes[ph.id] ?? ''} onChange={(v) => setNote(ph.id, v)} rows={2} placeholder="Notes de cette phase…" aria-label={`Notes — phase ${ph.id + 1}`} />
                    {qs.map((q) => (
                      <div key={q.id} className="ent-edit-q">
                        <DictaInput value={q.texte} onChange={(v) => setEq(q.id, { texte: v })} placeholder="Question posée…" aria-label="Question" />
                        <DictaTextarea value={q.reponse} onChange={(v) => setEq(q.id, { reponse: v })} rows={2} placeholder="Réponse…" aria-label="Réponse" />
                        <button type="button" className="btn btn-ghost btn-sm ent-del" onClick={() => removeQuestion(q.id)}>🗑 Supprimer</button>
                      </div>
                    ))}
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => addQuestion(ph.id)}>+ Ajouter une question</button>
                  </div>
                )
              })}
              <div className="cr-edit-actions">
                <button className="btn btn-ghost" disabled={busy} onClick={() => setEditing(false)}>Annuler</button>
                <button className="btn btn-primary" disabled={busy} onClick={save}>💾 Enregistrer</button>
              </div>
            </>
          ) : (
            <>
              <div className="cr-bar">
                <span className="muted cr-meta">Notes et questions de l’entretien</span>
                <div className="cr-bar-actions">
                  <button className="btn btn-ghost btn-sm" onClick={startEdit}>✎ Éditer</button>
                </div>
              </div>

              <div className="ent-moments">
                <div className="ent-moments-head">
                  <h3>🔑 Moments-clés <span className="muted">(IA)</span></h3>
                  {moments && moments.length > 0 && (
                    <span className="ent-moments-acts">
                      <button className="btn btn-ghost btn-sm" disabled={momBusy} onClick={genMoments}>↻ Régénérer</button>
                      <button className={`btn btn-sm ${momPartage ? 'btn-ghost' : 'btn-primary'}`} onClick={toggleMomPartage}>{momPartage ? '🔓 Partagés — retirer' : '📣 Partager'}</button>
                    </span>
                  )}
                </div>
                {!moments ? (
                  <button className="btn btn-ghost btn-sm" disabled={momBusy} onClick={genMoments}>{momBusy ? 'Analyse…' : '✨ Repérer les moments-clés'}</button>
                ) : moments.length === 0 ? (
                  <p className="muted">Aucun moment-clé repéré.</p>
                ) : (
                  moments.map((m, i) => (
                    <div key={i} className="emergence-moment">
                      <blockquote>« {m.verbatim} »</blockquote>
                      {m.pourquoi && <p className="muted">{m.pourquoi}</p>}
                    </div>
                  ))
                )}
              </div>

              {phaseIds.length === 0 ? (
                <p className="muted">Aucune note ni question enregistrée. Clique sur « Éditer » pour en ajouter.</p>
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}
