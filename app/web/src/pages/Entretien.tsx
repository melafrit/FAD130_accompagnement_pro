import { useEffect, useRef, useState, lazy, Suspense } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useTypewriter } from '../hooks/useTypewriter'
import AiProgress from '../components/AiProgress'
import DictaTextarea from '../components/DictaTextarea'
import DictaInput from '../components/DictaInput'
import ErrorBoundary from '../components/ErrorBoundary'
import CoachPosture from '../components/CoachPosture'
const CompteRenduModal = lazy(() => import('../components/CompteRenduModal'))

interface Phase { id: number; titre: string; objectif: string; vigilance: string[]; questions: string[] }
interface Dossier { id: number; titre: string | null; accompagne_prenom: string | null; accompagne_email: string; recap: string | null }
interface Suggestion { questions: string[]; reformulation: string | null; a_surveiller: string | null }
interface Question { id: number; phase: string; texte: string; reponse: string | null }

// Caractères de nouvelle matière (dictée) avant que le co-pilote ne propose un rafraîchissement.
const NEW_MATERIAL = 140

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
  const [editingQId, setEditingQId] = useState<number | null>(null)
  const [editQText, setEditQText] = useState('')
  const [sugg, setSugg] = useState<Suggestion | null>(null)
  const [autoMode, setAutoMode] = useState(false)
  const [banque, setBanque] = useState<Record<string, string[]> | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [showCr, setShowCr] = useState(false)
  const nav = useNavigate()
  const [params] = useSearchParams()
  const notesRef = useRef('')
  const lastSuggLenRef = useRef(0)
  const busyRef = useRef(false)
  const sessionRef = useRef<number | null>(null)
  const askIARef = useRef<() => void>(() => {})

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
    try { setBanque((await api<{ banque: Record<string, string[]> | null }>(`/emergence/dossier/${dId}/banque`)).banque) } catch { /* ignore */ }
  }
  async function genBanque() {
    if (dossierId == null) return
    setBusy(true)
    try { setBanque((await api<{ banque: Record<string, string[]> }>(`/emergence/dossier/${dossierId}/banque`, { method: 'POST' })).banque) }
    finally { setBusy(false) }
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

  async function saveReponse(texte: string) {
    if (sessionId == null) return
    await api(`/entretien/sessions/${sessionId}/reponses`, { method: 'POST', body: JSON.stringify({ phase: current, texte }) })
  }
  async function saveCurrent() {
    await saveReponse(notes[current] || '')
  }
  async function goTo(idx: number) {
    await saveCurrent()
    setSugg(null)
    setEditingQId(null)
    setCurrent(idx)
    lastSuggLenRef.current = (notes[idx] || '').length
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
  // Édition en place du texte d'une question déjà ajoutée
  function startEditQ(qid: number, texte: string) {
    setEditingQId(qid)
    setEditQText(texte)
  }
  async function saveQTexte(qid: number) {
    const t = editQText.trim()
    if (!t) return // champ vide : on garde l'éditeur ouvert (annuler avec ✗ ou Échap)
    setEditingQId(null)
    const prev = (questionsByPhase[current] || []).find((x) => x.id === qid)?.texte
    setQuestionsByPhase((m) => ({ ...m, [current]: (m[current] || []).map((x) => (x.id === qid ? { ...x, texte: t } : x)) }))
    if (sessionId == null) return
    try {
      await api(`/entretien/sessions/${sessionId}/questions/${qid}`, { method: 'PATCH', body: JSON.stringify({ texte: t }) })
    } catch {
      // échec réseau : on annule la modification optimiste et on prévient
      if (prev !== undefined) setQuestionsByPhase((m) => ({ ...m, [current]: (m[current] || []).map((x) => (x.id === qid ? { ...x, texte: prev } : x)) }))
      alert('La modification de la question n’a pas pu être enregistrée. Réessaie.')
    }
  }
  async function saveQReponse(qid: number, reponse: string) {
    if (sessionId == null) return
    await api(`/entretien/sessions/${sessionId}/questions/${qid}`, { method: 'PATCH', body: JSON.stringify({ reponse }) })
  }
  async function askIA() {
    if (sessionId == null) return
    const transcript = notes[current] || ''
    setBusy(true)
    try {
      setSugg(await api<Suggestion>('/entretien/suggestions', { method: 'POST', body: JSON.stringify({ phase: current, transcript }) }))
      lastSuggLenRef.current = transcript.length
    } finally {
      setBusy(false)
    }
  }

  // Refs synchronisées à chaque rendu (le co-pilote auto lit la dernière valeur sans recréer le timer).
  notesRef.current = notes[current] || ''
  busyRef.current = busy
  sessionRef.current = sessionId
  askIARef.current = askIA

  // Co-pilote en mode auto : rafraîchit les suggestions dès qu'il y a assez de nouvelle matière dictée.
  useEffect(() => {
    if (!autoMode) return
    const t = setInterval(() => {
      if (busyRef.current || sessionRef.current == null) return
      if (notesRef.current.length - lastSuggLenRef.current >= NEW_MATERIAL) askIARef.current()
    }, 22000)
    return () => clearInterval(t)
  }, [autoMode, current])
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
  if (done) {
    return (
      <div className="page">
        <h1 className="page-title">Entretien clôturé ✅</h1>
        <p className="lead">Génère et mets en forme le compte rendu de cet entretien (éditable), puis publie-le à l’accompagné quand il est prêt. Tu pourras le rouvrir plus tard depuis le dossier.</p>
        <button className="btn btn-primary" onClick={() => setShowCr(true)}>📄 Ouvrir le compte rendu</button>
        <p style={{ marginTop: 20 }}><button className="btn btn-ghost" onClick={retour}>Retour au dossier</button></p>
        <ErrorBoundary onReset={() => setShowCr(false)}>
          <Suspense fallback={null}>
            {showCr && sessionId != null && <CompteRenduModal sessionId={sessionId} role="accompagnateur" onClose={() => setShowCr(false)} />}
          </Suspense>
        </ErrorBoundary>
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
  const hasNew = (notes[current] || '').length - lastSuggLenRef.current >= NEW_MATERIAL
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
            {banque?.[current]?.length ? (
              <ul className="phase-q phase-q-perso">{banque[current].map((q, i) => (
                <li key={`p${i}`} className="sugg-item">
                  <button className="phase-q-btn perso" onClick={() => addQuestion(q)} title="Ajouter telle quelle">✨ {q} <span className="phase-q-plus">＋</span></button>
                  <button className="sugg-edit" onClick={() => editSuggestion(q)} title="Modifier avant d'ajouter">✎</button>
                </li>
              ))}</ul>
            ) : (
              <p><button className="btn btn-ghost btn-sm" disabled={busy} onClick={genBanque}>✨ Adapter les questions à cet étudiant</button></p>
            )}
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
              <div className="qposee-head">
                {editingQId === q.id ? (
                  <form className="qposee-edit" onSubmit={(e) => { e.preventDefault(); void saveQTexte(q.id) }}>
                    <input
                      autoFocus
                      value={editQText}
                      onChange={(e) => setEditQText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Escape') setEditingQId(null) }}
                      aria-label="Modifier la question"
                    />
                    <button type="submit" className="q-edit-ok" aria-label="Enregistrer la question" title="Enregistrer">✓</button>
                    <button type="button" className="q-edit-cancel" onClick={() => setEditingQId(null)} aria-label="Annuler" title="Annuler">✗</button>
                  </form>
                ) : (
                  <>
                    <span className="qposee-q">{q.texte}</span>
                    <span className="qposee-acts">
                      <button className="q-edit" onClick={() => startEditQ(q.id, q.texte)} aria-label="Modifier la question" title="Modifier la question">✎</button>
                      <button className="q-del" onClick={() => removeQuestion(q.id)} aria-label="Supprimer la question" title="Supprimer la question">×</button>
                    </span>
                  </>
                )}
              </div>
              <DictaTextarea
                className="qposee-rep"
                value={q.reponse || ''}
                onChange={(v) => setQReponse(q.id, v)}
                onBlur={(e) => void saveQReponse(q.id, e.target.value)}
                onCommit={(v) => void saveQReponse(q.id, v)}
                placeholder="Notes / réponse de la personne à cette question…"
                rows={2}
              />
            </li>
          ))}
          {qPosees.length === 0 && <li className="muted">Aucune question enregistrée pour cette phase — saisis-la ou clique une question proposée ci-dessus.</li>}
        </ul>
        <form className="q-add" onSubmit={(e) => { e.preventDefault(); void addQuestion(newQ) }}>
          <DictaInput inputRef={newQRef} value={newQ} onChange={setNewQ} placeholder="Saisir, dicter ou modifier une question, puis Ajouter…" />
          <button className="btn btn-ghost" type="submit">＋ Ajouter</button>
        </form>
        <CoachPosture question={newQ} onReformuler={editSuggestion} />
      </div>

      <div className="notes-block">
        <div className="notes-head">
          <h3>Notes générales de la phase <span className="muted">(facultatif · 🎙 pour dicter)</span></h3>
        </div>
        <DictaTextarea
          key={`notes-${current}`}
          className="notes-area"
          value={notes[current] || ''}
          onChange={(v) => setNotes((n) => ({ ...n, [current]: v }))}
          onBlur={() => void saveCurrent()}
          onCommit={(v) => void saveReponse(v)}
          placeholder="Saisis ou dicte les propos de la personne…"
        />
        <div className="copilote-bar">
          <button className="btn btn-primary" disabled={busy} onClick={askIA}>✨ Suggestions de l’IA</button>
          <label className="copilote-switch" title="Le co-pilote rafraîchit les suggestions automatiquement quand tu dictes de la nouvelle matière">
            <input type="checkbox" checked={autoMode} onChange={(e) => setAutoMode(e.target.checked)} /> ⚡ Co-pilote auto
          </label>
          {autoMode && <span className="copilote-live" aria-live="polite">● en direct</span>}
          {!autoMode && hasNew && <button className="copilote-new" disabled={busy} onClick={askIA}>↻ Nouvelles suggestions disponibles</button>}
        </div>
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
