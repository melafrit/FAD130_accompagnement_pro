import { useState } from 'react'
import { api } from '../lib/api'
import { useFeature } from '../features/FeaturesContext'

interface Analyse { type: string; ouverte: boolean; remarque: string; reformulation: string | null }
const COULEUR: Record<string, string> = { ouverte: '#16a34a', fermée: '#f59e0b', inductive: '#dc2626' }

// Coach de posture contextuel : analyse la question en cours de saisie (ouverte / fermée / inductive)
// et propose une reformulation ouverte. Côté entretien, à côté du champ « ajouter une question ».
export default function CoachPosture({ question, onReformuler }: { question: string; onReformuler: (q: string) => void }) {
  const actif = useFeature('coach_posture')
  const [res, setRes] = useState<Analyse | null>(null)
  const [busy, setBusy] = useState(false)
  if (!actif) return null

  async function analyser() {
    const q = question.trim()
    if (!q) return
    setBusy(true)
    try { setRes(await api<Analyse>('/reflexivite/coach/analyser', { method: 'POST', body: JSON.stringify({ question: q }) })) }
    catch { /* ignore */ } finally { setBusy(false) }
  }

  return (
    <div style={{ marginTop: 6 }}>
      <button type="button" className="btn btn-ghost btn-sm" disabled={busy || !question.trim()} onClick={analyser} title="Vérifier si ma question est ouverte et peu inductive">
        🎯 Coacher ma question
      </button>
      {res && (
        <div style={{ marginTop: 8, padding: '8px 12px', borderLeft: `3px solid ${COULEUR[res.type] || '#888'}`, background: 'var(--surface-2, #f8fafc)', borderRadius: 6 }}>
          <strong style={{ color: COULEUR[res.type] || 'inherit' }}>{res.type === 'ouverte' ? '✓ Question ouverte' : res.type === 'inductive' ? '⚠ Question inductive' : '○ Question fermée'}</strong>
          <p style={{ margin: '4px 0', fontSize: '.88rem' }}>{res.remarque}</p>
          {res.reformulation && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onReformuler(res.reformulation as string)} title="Reprendre cette reformulation">
              ↪ {res.reformulation}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
