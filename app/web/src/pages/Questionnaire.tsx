import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import AiProgress from '../components/AiProgress'
import DictaInput from '../components/DictaInput'

interface Step {
  question: string
  propositions: string[]
  termine: boolean
  recapitulatif: string | null
}
interface QA { question: string; answer: string }

export default function Questionnaire() {
  const [history, setHistory] = useState<QA[]>([])
  const [step, setStep] = useState<Step | null>(null)
  const [answer, setAnswer] = useState('')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const nav = useNavigate()

  async function loadNext(h: QA[]) {
    setBusy(true)
    try {
      const s = await api<Step>('/questionnaire/next', { method: 'POST', body: JSON.stringify({ history: h }) })
      setStep(s)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    void loadNext([])
  }, [])

  async function submit(ans: string) {
    if (!step || !ans.trim()) return
    const h = [...history, { question: step.question, answer: ans }]
    setHistory(h)
    setAnswer('')
    await loadNext(h)
  }

  async function save() {
    setBusy(true)
    try {
      await api('/questionnaire/save', { method: 'POST', body: JSON.stringify({ history, recapitulatif: step?.recapitulatif }) })
      setSaved(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <p className="kicker">Questionnaire initial</p>
      <h1 className="page-title">Préparer ton 1ᵉʳ rendez-vous</h1>
      <p className="lead">Réponds à ton rythme : tu peux choisir une proposition ou écrire librement.</p>

      <div className="qa-history">
        {history.map((qa, i) => (
          <div key={i} className="qa-item">
            <p className="qa-q">{qa.question}</p>
            <p className="qa-a">{qa.answer}</p>
          </div>
        ))}
      </div>

      {busy && <AiProgress steps={['L’assistant prépare la prochaine question…', 'Adaptation à tes réponses…']} />}

      {step && !step.termine && !busy && (
        <div className="qa-current">
          <p className="qa-q qa-q-active">{step.question}</p>
          {step.propositions.length > 0 && (
            <div className="qa-props">
              {step.propositions.map((p, i) => (
                <button key={i} className="btn btn-ghost qa-prop" onClick={() => submit(p)}>{p}</button>
              ))}
            </div>
          )}
          <form onSubmit={(e) => { e.preventDefault(); submit(answer) }} className="qa-form">
            <DictaInput value={answer} onChange={setAnswer} placeholder="Ta réponse (ou 🎙 pour dicter)…" aria-label="Ta réponse" />
            <button className="btn btn-primary" type="submit">Envoyer</button>
          </form>
        </div>
      )}

      {step && step.termine && (
        <div className="qa-recap">
          <h2>Récapitulatif</h2>
          <pre className="recap-text">{step.recapitulatif}</pre>
          {saved ? (
            <>
              <p className="form-success">✅ Enregistré. Ton accompagnateur en sera informé. Tu pourras bientôt choisir un créneau de rendez-vous.</p>
              <button className="btn btn-primary" onClick={() => nav('/espace')}>Retour à mon espace</button>
            </>
          ) : (
            <button className="btn btn-primary" disabled={busy} onClick={save}>Valider et enregistrer</button>
          )}
        </div>
      )}
    </div>
  )
}
