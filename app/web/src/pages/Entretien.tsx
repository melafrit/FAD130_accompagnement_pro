import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useSpeechToText } from '../hooks/useSpeechToText'
import { useTypewriter } from '../hooks/useTypewriter'
import AiProgress from '../components/AiProgress'

interface Phase { id: number; titre: string; objectif: string; vigilance: string[]; questions: string[] }
interface Dossier { id: number; titre: string | null; accompagne_prenom: string | null; accompagne_email: string; recap: string | null }
interface Suggestion { questions: string[]; reformulation: string | null; a_surveiller: string | null }
interface Question { id: number; phase: string; texte: string; reponse: string | null }

// Ancrage théorique incarné par les suggestions, selon la phase (mapping front, défendable à l'oral).
const PHASE_ANCRAGE: Record<number, { nom: string; pourquoi: string }> = {
  0: { nom: 'Rogers', pourquoi: 'Alliance et non-jugement : créer la « bulle » de confiance.' },
  1: { nom: 'Porter', pourquoi: 'Reformuler et clarifier la demande avant d’agir.' },
  2: { nom: 'Brémond', pourquoi: 'Le geste écologique : faire raconter l’expérience, le moins d’induction possible.' },
  3: { nom: 'Maela Paul', pourquoi: 'Une relation « avec » : structurer ensemble, sans imposer mon plan.' },
  4: { nom: 'Bandura', pourquoi: 'Renforcer le sentiment d’efficacité : micro-objectifs et critères.' },
  5: { nom: 'Deci & Ryan', pourquoi: 'Soutenir l’autonomie et accueillir l’émotion-boussole à la clôture.' },
}

export default function Entretien() {
  const [phases, setPhases] = useState<Phase[]>([])
  const [dossiers, setDossiers] = useState<Dossier[]>([])
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [dossierId, setDossierId] = useState<number | null>(null)
  const [current, setCurrent] = useState(0)
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [questionsByPhase, setQuestionsByPhase] = useState<Record<number, { id: number; texte: string; reponse: string | null }[]>>({})
  const [newQ, setNewQ] = useState('')
  const newQRef = useRef<HTMLInputElement>(null)
  const [sugg, setSugg] = useState<Suggestion | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [crId, setCrId] = useState<number | null>(null)
  const [crBusy, setCrBusy] = useState(false)
  const nav = useNavigate()
  const [params] = useSearchParams()

  const { listening, supported, interim, toggle } = useSpeechToText((t) => {
    setNotes((n) => ({ ...n, [current]: (n[current] ? n[current] + ' ' : '') + t }))
  })
  const typed = useTypewriter(sugg ? [sugg.reformulation || '', ...sugg.questions] : [])

  async function startSession(dId: number) {
    setDossierId(dId)
    const r = await api<{ sessionId: number }>('/entretien/sessions', { method: 'POST', body: JSON.stringify({ dossierId: dId }) })
    setSessionId(r.sessionId)
    const s = await api<{ session: { phase_atteinte: string }; reponses: { phase: string; texte_reponse: string }[]; questions: Question[] }>(`/entretien/sessions/${r.sessionId}`)
    const map: Record<number, string> = {}
    s.reponses.forEach((x) => { map[Number(x.phase)] = x.texte_reponse })
    setNotes(map)
    const qmap: Record<number, { id: number; texte: string; reponse: string | null }[]> = {}
    s.questions.forEach((q) => { const p = Number(q.phase); (qmap[p] = qmap[p] || []).push({ id: q.id, texte: q.texte, reponse: q.reponse }) })
    setQuestionsByPhase(qmap)
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
  async function addQuestion(texte: string) {
    const t = texte.trim()
    if (!t || sessionId == null) return
    const r = await api<{ id: number; texte: string }>(`/entretien/sessions/${sessionId}/questions`, { method: 'POST', body: JSON.stringify({ phase: current, texte: t }) })
    setQuestionsByPhase((m) => ({ ...m, [current]: [...(m[current] || []), { id: r.id, texte: r.texte, reponse: null }] }))
    setNewQ('')
  }
  async function removeQuestion(qid: number) {
    if (sessionId == null) return
    await api(`/entretien/sessions/${sessionId}/questions/${qid}`, { method: 'DELETE' })
    setQuestionsByPhase((m) => ({ ...m, [current]: (m[current] || []).filter((q) => q.id !== qid) }))
  }
  // Charge une question proposée dans le champ de saisie pour la MODIFIER avant de l'ajouter.
  function editSuggestion(q: string) {
    setNewQ(q)
    requestAnimationFrame(() => {
      const el = newQRef.current
      if (!el) return
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }
  function setQReponse(qid: number, reponse: string) {
    setQuestionsByPhase((m) => ({ ...m, [current]: (m[current] || []).map((x) => (x.id === qid ? { ...x, reponse } : x)) }))
  }
  async function saveQReponse(qid: number, reponse: string) {
    if (sessionId == null) return
    await api(`/entretien/sessions/${sessionId}/questions/${qid}`, { method: 'PATCH', body: JSON.stringify({ reponse }) })
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
          <>
            <button className="btn btn-primary" disabled={crBusy} onClick={genererCR}>📄 Générer le compte rendu</button>
            {crBusy && <AiProgress steps={['Lecture de l’entretien…', 'Rédaction du compte rendu…', 'Mise en forme du document…']} />}
          </>
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
  const qPosees = questionsByPhase[current] || []
  const segs = sugg ? [sugg.reformulation || '', ...sugg.questions] : []
  const activeIdx = segs.findIndex((s, i) => (typed[i] ?? s.length) < s.length)
  const lastVisible = activeIdx === -1 ? segs.length - 1 : activeIdx
  return (
    <div className="page">
      <p className="kicker">Entretien guidé · Phase {current + 1}/6</p>
      <div className="phase-steps">
        {phases.map((p, i) => <button key={p.id} className={`phase-step ${i === current ? 'active' : ''}`} onClick={() => goTo(i)} aria-label={`Phase ${i + 1}`}>{i + 1}</button>)}
      </div>

      <div className="phase">
        <div className="phase-head"><span className="phase-num">{phase.id + 1}</span><h2 style={{ margin: 0 }}>{phase.titre}</h2></div>
        <p className="phase-obj">{phase.objectif}</p>
        <div className="phase-grid">
          <div><h4>⚠️ Vigilance</h4><ul>{phase.vigilance.map((v, i) => <li key={i}>{v}</li>)}</ul></div>
          <div>
            <h4>💬 Questions à poser <span className="muted">(＋ ajouter · ✎ modifier)</span></h4>
            <ul className="phase-q">{phase.questions.map((q, i) => (
              <li key={i} className="sugg-item">
                <button className="phase-q-btn" onClick={() => addQuestion(q)} title="Ajouter telle quelle">{q} <span className="phase-q-plus">＋</span></button>
                <button className="sugg-edit" onClick={() => editSuggestion(q)} title="Modifier avant d'ajouter">✎</button>
              </li>
            ))}</ul>
          </div>
        </div>
      </div>

      <div className="questions-block">
        <h3>❓ Questions que j'ai posées <span className="muted">(phase {current + 1})</span></h3>
        <ul className="qposees">
          {qPosees.map((q) => (
            <li key={q.id} className="qposee">
              <div className="qposee-head"><span className="qposee-q">{q.texte}</span><button className="q-del" onClick={() => removeQuestion(q.id)} aria-label="Supprimer la question">×</button></div>
              <textarea
                className="qposee-rep"
                value={q.reponse || ''}
                onChange={(e) => setQReponse(q.id, e.target.value)}
                onBlur={(e) => saveQReponse(q.id, e.target.value)}
                placeholder="Notes / réponse de la personne à cette question…"
                rows={2}
              />
            </li>
          ))}
          {qPosees.length === 0 && <li className="muted">Aucune question enregistrée pour cette phase — saisis-la ou clique une question proposée ci-dessus.</li>}
        </ul>
        <form className="q-add" onSubmit={(e) => { e.preventDefault(); void addQuestion(newQ) }}>
          <input ref={newQRef} value={newQ} onChange={(e) => setNewQ(e.target.value)} placeholder="Saisir ou modifier une question, puis Ajouter…" />
          <button className="btn btn-ghost" type="submit">＋ Ajouter</button>
        </form>
      </div>

      <div className="notes-block">
        <div className="notes-head">
          <h3>Notes générales de la phase <span className="muted">(facultatif)</span></h3>
          {supported ? (
            <button className={`btn btn-ghost mic ${listening ? 'mic-on' : ''}`} onClick={toggle}>{listening ? '⏹ Arrêter le micro' : '🎙 Dicter'}</button>
          ) : <span className="muted">(dictée non supportée par ce navigateur)</span>}
        </div>
        <textarea className="notes-area" value={notes[current] || ''} onChange={(e) => setNotes((n) => ({ ...n, [current]: e.target.value }))} onBlur={saveCurrent} placeholder="Saisis ou dicte les propos de la personne…" />
        {interim && <p className="interim"><span className="listening-dot" aria-hidden="true" />{interim}</p>}
        <div className="notes-actions"><button className="btn btn-primary" disabled={busy} onClick={askIA}>✨ Suggestions de l’IA</button></div>
        {busy && <AiProgress steps={['Lecture de tes notes…', 'Analyse de la phase…', 'Préparation des suggestions…']} />}
        {sugg && (
          <div className="sugg">
            {PHASE_ANCRAGE[current] && (
              <p className="sugg-ancrage">Posture incarnée : <span className="anchor-chip ancrage-badge">🎓 {PHASE_ANCRAGE[current].nom}</span> <span className="muted">— {PHASE_ANCRAGE[current].pourquoi}</span></p>
            )}
            {sugg.reformulation && (
              <p><strong>Reformulation :</strong> {sugg.reformulation.slice(0, typed[0] ?? sugg.reformulation.length)}{activeIdx === 0 && <span className="tw-caret">▌</span>}</p>
            )}
            <p style={{ margin: '4px 0' }}><strong>Questions d’approfondissement</strong> <span className="muted">(＋ ajouter · ✎ modifier)</span> :</p>
            <ul className="sugg-q">
              {sugg.questions.map((q, i) => {
                if (i + 1 > lastVisible) return null
                const shown = typed[i + 1] ?? q.length
                if (shown >= q.length) {
                  return (
                    <li key={i} className="sugg-item">
                      <button className="sugg-q-btn" onClick={() => addQuestion(q)} title="Ajouter telle quelle">{q} <span className="phase-q-plus">＋</span></button>
                      <button className="sugg-edit" onClick={() => editSuggestion(q)} title="Modifier avant d'ajouter">✎</button>
                    </li>
                  )
                }
                return <li key={i}><span className="sugg-q-typing">{q.slice(0, shown)}{activeIdx === i + 1 && <span className="tw-caret">▌</span>}</span></li>
              })}
            </ul>
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
