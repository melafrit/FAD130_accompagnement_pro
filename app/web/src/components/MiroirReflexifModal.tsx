import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'

interface Force { principe: string; observation: string; verbatim: string }
interface Glissement extends Force { conseil: string }
interface ScoreP { indicateur: string; score: number | null; commentaire: string | null }
interface Miroir { forces: Force[]; glissements: Glissement[]; synthese: string; scores: ScoreP[]; note: number | null; source?: string; genere_le?: string }

function zoneLabel(s: number | null) {
  if (s == null) return ''
  return s >= 75 ? 'Expert' : s >= 50 ? 'Maîtrisé' : s >= 25 ? 'En développement' : 'Émergent'
}

// Miroir réflexif : l'IA analyse la posture de l'accompagnateur sur un entretien.
export default function MiroirReflexifModal({ sessionId, index, onClose }: { sessionId: number; index: number; onClose: () => void }) {
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [analyse, setAnalyse] = useState<Miroir | null>(null)
  const [labels, setLabels] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    const [a, g] = await Promise.all([
      api<{ analyse: Miroir | null }>(`/miroir/session/${sessionId}`),
      api<{ criteres: { indicateurs: { id: string; texte: string }[] }[] }>('/autoeval/grille').catch(() => ({ criteres: [] })),
    ])
    setAnalyse(a.analyse)
    const map: Record<string, string> = {}
    g.criteres.forEach((c) => c.indicateurs.forEach((i) => (map[i.id] = i.texte)))
    setLabels(map)
  }, [sessionId])

  useEffect(() => { void (async () => { try { await load() } finally { setLoading(false) } })() }, [load])
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])

  async function analyser() {
    setBusy(true); setMsg('')
    try { setAnalyse(await api<Miroir>(`/miroir/session/${sessionId}`, { method: 'POST' })) }
    catch { setMsg('Analyse impossible. Réessaie.') } finally { setBusy(false) }
  }
  async function appliquer() {
    setBusy(true); setMsg('')
    try {
      const r = await api<{ appliques: number }>(`/miroir/session/${sessionId}/appliquer`, { method: 'POST' })
      setMsg(`✓ ${r.appliques} indicateur(s) appliqué(s) au brouillon de ta grille. Va dans « Mon auto-évaluation » pour valider.`)
    } catch { setMsg('Application impossible.') } finally { setBusy(false) }
  }

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal cr-modal" role="dialog" aria-modal="true" aria-labelledby="mir-title" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 id="mir-title">🪞 Miroir réflexif — entretien #{index}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fermer">×</button>
        </div>
        <div className="modal-body cr-view">
          {loading ? (
            <p className="muted">Chargement…</p>
          ) : !analyse ? (
            <div className="cr-empty">
              <p className="muted">Aucune analyse pour cet entretien. L'IA va analyser <strong>ta posture</strong> (tes questions et tes notes) au regard des 8 principes — elle propose, tu décides.</p>
              <button className="btn btn-primary" disabled={busy} onClick={analyser}>{busy ? 'Analyse en cours…' : '✨ Analyser ma posture'}</button>
            </div>
          ) : (
            <>
              <div className="cr-bar">
                <span className={`cr-badge ${analyse.source === 'ia' ? 'pub' : 'draft'}`}>{analyse.source === 'ia' ? 'Analyse IA' : 'Analyse (repli)'}</span>
                {analyse.note != null && <span className="mir-note">Posture sur cet entretien : <strong>{analyse.note}/100</strong> ({zoneLabel(analyse.note)})</span>}
                <div className="cr-bar-actions">
                  <button className="btn btn-ghost btn-sm" disabled={busy} onClick={analyser}>↻ Régénérer</button>
                </div>
              </div>

              {msg && <p className="form-success cr-msg">{msg}</p>}

              {analyse.synthese && <p className="mir-synthese">{analyse.synthese}</p>}

              {analyse.forces.length > 0 && (
                <section className="mir-sec">
                  <h3>✅ Tes points forts</h3>
                  {analyse.forces.map((f, i) => (
                    <div key={i} className="mir-item mir-force">
                      <div className="mir-item-head">{f.principe}</div>
                      <div>{f.observation}</div>
                      {f.verbatim && <blockquote className="mir-verbatim">« {f.verbatim} »</blockquote>}
                    </div>
                  ))}
                </section>
              )}

              {analyse.glissements.length > 0 && (
                <section className="mir-sec">
                  <h3>⚠️ Points de vigilance</h3>
                  {analyse.glissements.map((g, i) => (
                    <div key={i} className="mir-item mir-gliss">
                      <div className="mir-item-head">{g.principe}</div>
                      <div>{g.observation}</div>
                      {g.verbatim && <blockquote className="mir-verbatim">« {g.verbatim} »</blockquote>}
                      {g.conseil && <div className="mir-conseil">💡 {g.conseil}</div>}
                    </div>
                  ))}
                </section>
              )}

              {analyse.scores.length > 0 && (
                <section className="mir-sec">
                  <h3>📊 Scores proposés pour ta grille</h3>
                  <p className="muted" style={{ marginTop: 0 }}>Propositions à valider — elles ne remplacent pas ton jugement.</p>
                  {analyse.scores.map((s) => (
                    <div key={s.indicateur} className="mir-score">
                      <span className="mir-score-badge">{s.score ?? '—'}<small>/100</small></span>
                      <div>
                        <div className="mir-score-lbl"><strong>{s.indicateur}</strong> {labels[s.indicateur] || ''}</div>
                        {s.commentaire && <div className="muted">{s.commentaire}</div>}
                      </div>
                    </div>
                  ))}
                  <div className="cr-edit-actions">
                    <button className="btn btn-primary" disabled={busy} onClick={appliquer}>↳ Appliquer ces scores à ma grille</button>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
