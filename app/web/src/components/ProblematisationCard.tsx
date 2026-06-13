import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useFeature } from '../features/FeaturesContext'

interface PbData { reponses: string[]; problematique: string; source?: string }

// Assistant de problématisation (accompagné) : guidé (questions) puis libre (édition de la problématique).
export default function ProblematisationCard({ dossierId }: { dossierId: number | string }) {
  const actif = useFeature('problematisation')
  const [questions, setQuestions] = useState<string[]>([])
  const [reponses, setReponses] = useState<string[]>([])
  const [problematique, setProblematique] = useState('')
  const [sousQuestions, setSousQuestions] = useState<string[]>([])
  const [ouvert, setOuvert] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (!actif) return
    api<{ questions: string[]; data: PbData | null }>(`/collab/problematisation/dossier/${dossierId}`).then((d) => {
      setQuestions(d.questions)
      setReponses(d.data?.reponses?.length ? d.data.reponses : d.questions.map(() => ''))
      setProblematique(d.data?.problematique || '')
    }).catch(() => { /* ignore */ })
  }, [actif, dossierId])
  if (!actif) return null

  function setRep(i: number, v: string) { setReponses((r) => r.map((x, j) => (j === i ? v : x))) }

  async function suggerer() {
    setBusy(true); setMsg('')
    try {
      const d = await api<{ problematique: string; sous_questions: string[] }>(`/collab/problematisation/dossier/${dossierId}/suggerer`, { method: 'POST', body: JSON.stringify({ reponses }) })
      setProblematique(d.problematique); setSousQuestions(d.sous_questions || [])
      setMsg('Proposition générée — à toi de l’ajuster.')
    } catch { setMsg('Impossible de générer une proposition.') } finally { setBusy(false) }
  }
  async function enregistrer() {
    setBusy(true); setMsg('')
    try { await api(`/collab/problematisation/dossier/${dossierId}`, { method: 'POST', body: JSON.stringify({ reponses, problematique }) }); setMsg('Enregistré ✓') }
    catch { setMsg('Échec de l’enregistrement.') } finally { setBusy(false) }
  }

  return (
    <section className="card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>🎯 Ma problématique</h2>
        <button className="btn btn-ghost btn-sm" onClick={() => setOuvert((v) => !v)} aria-expanded={ouvert}>{ouvert ? 'Réduire' : problematique ? 'Revoir' : 'Construire ma problématique'}</button>
      </div>
      {problematique && !ouvert && <p style={{ fontStyle: 'italic', marginBottom: 0 }}>« {problematique} »</p>}

      {ouvert && (
        <div style={{ marginTop: 10 }}>
          <p className="muted">Réponds à ces questions (guidé), puis laisse l’IA proposer une formulation que tu pourras réécrire librement.</p>
          {questions.map((q, i) => (
            <label key={i} className="field" style={{ display: 'block', marginBottom: 10 }}>
              <span>{q}</span>
              <textarea rows={2} value={reponses[i] || ''} onChange={(e) => setRep(i, e.target.value)} />
            </label>
          ))}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '4px 0 12px' }}>
            <button className="btn btn-ghost btn-sm" disabled={busy} onClick={suggerer}>✨ Proposer une problématique (IA)</button>
          </div>
          <label className="field" style={{ display: 'block' }}>
            <span>Ma problématique (modifiable librement)</span>
            <textarea rows={3} value={problematique} onChange={(e) => setProblematique(e.target.value)} placeholder="La question centrale de mon mémoire…" />
          </label>
          {sousQuestions.length > 0 && (
            <><p style={{ margin: '6px 0 2px', fontWeight: 600 }}>Sous-questions suggérées</p>
              <ul>{sousQuestions.map((s, i) => <li key={i}>{s}</li>)}</ul></>
          )}
          {msg && <p className="form-success">{msg}</p>}
          <button className="btn btn-primary" disabled={busy} onClick={enregistrer}>Enregistrer</button>
        </div>
      )}
    </section>
  )
}
