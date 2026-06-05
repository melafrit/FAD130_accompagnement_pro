import { useEffect, useState, type ChangeEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useSpeechToText } from '../hooks/useSpeechToText'

interface Phase { id: number; titre: string; objectif: string; vigilance: string[]; questions: string[] }
interface Dossier { id: number; titre: string | null; accompagne_prenom: string | null; accompagne_email: string; recap: string | null }
interface Suggestion { questions: string[]; reformulation: string | null; a_surveiller: string | null }

export default function Entretien() {
  const [phases, setPhases] = useState<Phase[]>([])
  const [dossiers, setDossiers] = useState<Dossier[]>([])
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [dossierId, setDossierId] = useState<number | null>(null)
  const [current, setCurrent] = useState(0)
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [sugg, setSugg] = useState<Suggestion | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [crId, setCrId] = useState<number | null>(null)
  const [crBusy, setCrBusy] = useState(false)
  const nav = useNavigate()
  const [params] = useSearchParams()

  const { listening, supported, toggle } = useSpeechToText((t) => {
    setNotes((n) => ({ ...n, [current]: (n[current] ? n[current] + ' ' : '') + t }))
  })

  async function startSession(dId: number) {
    setDossierId(dId)
    const r = await api<{ sessionId: number }>('/entretien/sessions', { method: 'POST', body: JSON.stringify({ dossierId: dId }) })
    setSessionId(r.sessionId)
    const s = await api<{ session: { phase_atteinte: string }; reponses: { phase: string; texte_reponse: string }[] }>(`/entretien/sessions/${r.sessionId}`)
    const map: Record<number, string> = {}
    s.reponses.forEach((x) => { map[Number(x.phase)] = x.texte_reponse })
    setNotes(map)
    setCurrent(Number(s.session.phase_atteinte) || 0)
  }

  useEffect(() => {
    void (async () => {
      const [p, d] = await Promise.all([
        api<{ phases: Phase[] }>('/entretien/phases'),
        api<{ dossiers: Dossier[] }>('/entretien/dossiers'),
      ])
      setPhases(p.phases)
      setDossiers(d.dossiers)
      const dp = params.get('dossier')
      if (dp) await startSession(Number(dp))
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function saveCurrent() {
    if (sessionId == null) return
    await api(`/entretien/sessions/${sessionId}/reponses`, { method: 'POST', body: JSON.stringify({ phase: current, texte: notes[current] || '' }) })
  }
  async function goTo(idx: number) {
    await saveCurrent()
    setSugg(null)
    setCurrent(idx)
  }
  async function askIA() {
    if (sessionId == null) return
    setBusy(true)
    try {
      setSugg(await api<Suggestion>('/entretien/suggestions', { method: 'POST', body: JSON.stringify({ phase: current, transcript: notes[current] || '' }) }))
    } finally {
      setBusy(false)
    }
  }
  function retour() {
    nav(dossierId ? `/dossier/${dossierId}` : '/tableau-de-bord')
  }
  async function pauseEtQuitter() {
    await saveCurrent()
    retour()
  }
  async function terminer() {
    await saveCurrent()
    if (sessionId != null) await api(`/entretien/sessions/${sessionId}/cloturer`, { method: 'POST' })
    setDone(true)
  }
  async function genererCR() {
    if (sessionId == null) return
    setCrBusy(true)
    try {
      const r = await api<{ id: number }>('/cr/generer', { method: 'POST', body: JSON.stringify({ sessionId }) })
      setCrId(r.id)
    } finally {
      setCrBusy(false)
    }
  }
  async function reimport(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f || crId == null) return
    const fd = new FormData()
    fd.append('fichier', f)
    await fetch(`/api/cr/${crId}/reimport`, { method: 'POST', credentials: 'include', body: fd })
    alert('Compte rendu mis à jour.')
  }

  if (done) {
    return (
      <div className="page">
        <h1 className="page-title">Entretien clôturé ✅</h1>
        <p className="lead">Génère le compte rendu de cet entretien. Tu pourras lancer un nouvel entretien plus tard depuis le dossier.</p>
        {crId == null ? (
          <button className="btn btn-primary" disabled={crBusy} onClick={genererCR}>{crBusy ? 'Génération…' : '📄 Générer le compte rendu'}</button>
        ) : (
          <div className="cr-done">
            <p className="form-success">Compte rendu généré ✅ et publié dans l'espace de l'accompagné.</p>
            <p><a className="btn btn-primary" href={`/api/cr/${crId}/download`}>⬇ Télécharger (.docx)</a></p>
            <p className="muted">Tu peux le modifier dans Word puis le ré-importer :</p>
            <input type="file" accept=".docx" onChange={reimport} />
          </div>
        )}
        <p style={{ marginTop: 20 }}><button className="btn btn-ghost" onClick={retour}>Retour au dossier</button></p>
      </div>
    )
  }

  if (sessionId == null) {
    return (
      <div className="page">
        <p className="kicker">Entretien guidé</p>
        <h1 className="page-title">Choisir un accompagné</h1>
        {dossiers.length === 0 && <p className="muted">Aucun accompagné pour l'instant. Un dossier est créé quand un accompagné complète son questionnaire initial.</p>}
        <div className="cards">
          {dossiers.map((d) => (
            <div key={d.id} className="card">
              <h3>{d.accompagne_prenom || d.accompagne_email}</h3>
              {d.recap && <p className="muted">Questionnaire initial complété ✓</p>}
              <button className="btn btn-primary" onClick={() => startSession(d.id)}>Démarrer l'entretien</button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const phase = phases[current]
  if (!phase) return null
  return (
    <div className="page">
      <p className="kicker">Entretien guidé · Phase {current + 1}/6</p>
      <div className="phase-steps">
        {phases.map((p, i) => <button key={p.id} className={`phase-step ${i === current ? 'active' : ''}`} onClick={() => goTo(i)} aria-label={`Phase ${i}`}>{i}</button>)}
      </div>

      <div className="phase">
        <div className="phase-head"><span className="phase-num">{phase.id}</span><h2 style={{ margin: 0 }}>{phase.titre}</h2></div>
        <p className="phase-obj">{phase.objectif}</p>
        <div className="phase-grid">
          <div><h4>⚠️ Vigilance</h4><ul>{phase.vigilance.map((v, i) => <li key={i}>{v}</li>)}</ul></div>
          <div><h4>💬 Questions à poser</h4><ul>{phase.questions.map((q, i) => <li key={i}>{q}</li>)}</ul></div>
        </div>
      </div>

      <div className="notes-block">
        <div className="notes-head">
          <h3>Notes / réponses</h3>
          {supported ? (
            <button className={`btn btn-ghost mic ${listening ? 'mic-on' : ''}`} onClick={toggle}>{listening ? '⏹ Arrêter le micro' : '🎙 Dicter'}</button>
          ) : <span className="muted">(dictée non supportée par ce navigateur)</span>}
        </div>
        <textarea className="notes-area" value={notes[current] || ''} onChange={(e) => setNotes((n) => ({ ...n, [current]: e.target.value }))} onBlur={saveCurrent} placeholder="Saisis ou dicte les propos de la personne…" />
        <div className="notes-actions"><button className="btn btn-primary" disabled={busy} onClick={askIA}>{busy ? '…' : '✨ Suggestions de l’IA'}</button></div>
        {sugg && (
          <div className="sugg">
            {sugg.reformulation && <p><strong>Reformulation :</strong> {sugg.reformulation}</p>}
            <p style={{ margin: '4px 0' }}><strong>Questions d’approfondissement :</strong></p>
            <ul>{sugg.questions.map((q, i) => <li key={i}>{q}</li>)}</ul>
            {sugg.a_surveiller && <p className="sugg-watch">À surveiller : {sugg.a_surveiller}</p>}
          </div>
        )}
      </div>

      <div className="entretien-nav">
        <button className="btn btn-ghost" disabled={current === 0} onClick={() => goTo(current - 1)}>← Précédent</button>
        <div className="entretien-nav-right">
          {current < phases.length - 1 && <button className="btn btn-ghost" onClick={() => goTo(current + 1)}>Suivant →</button>}
          <button className="btn btn-ghost" onClick={pauseEtQuitter}>💾 Reprendre plus tard</button>
          <button className="btn btn-primary" onClick={terminer}>✓ Clôturer &amp; générer le CR</button>
        </div>
      </div>
    </div>
  )
}
