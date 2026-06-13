import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useFeature } from '../features/FeaturesContext'

const EMO_LABEL: Record<string, string> = {
  fier: 'Fier·e', confiant: 'Confiant·e', enthousiaste: 'Enthousiaste', soulage: 'Soulagé·e',
  inquiet: 'Inquiet·e', stresse: 'Stressé·e', depasse: 'Dépassé·e',
  decourage: 'Découragé·e', seul: 'Seul·e', decu: 'Déçu·e',
  frustre: 'Frustré·e', agace: 'Agacé·e', etonne: 'Étonné·e', curieux: 'Curieux·se',
  serein: 'Serein·e', pose: 'Posé·e',
}
const FAMILLES = [
  { cle: 'joie', label: 'Joie', couleur: '#f59e0b', emos: ['fier', 'confiant', 'enthousiaste', 'soulage'] },
  { cle: 'peur', label: 'Peur', couleur: '#8b5cf6', emos: ['inquiet', 'stresse', 'depasse'] },
  { cle: 'tristesse', label: 'Tristesse', couleur: '#3b82f6', emos: ['decourage', 'seul', 'decu'] },
  { cle: 'colere', label: 'Colère', couleur: '#dc2626', emos: ['frustre', 'agace'] },
  { cle: 'surprise', label: 'Surprise', couleur: '#10b981', emos: ['etonne', 'curieux'] },
  { cle: 'calme', label: 'Calme', couleur: '#14b8a6', emos: ['serein', 'pose'] },
]
const COULEUR = Object.fromEntries(FAMILLES.flatMap((f) => f.emos.map((e) => [e, f.couleur])))
const fdate = (s: string) => (s || '').slice(0, 16).replace('T', ' ')

interface Entry { id: number; role: string; emotions: string[]; note: string | null; cree_le: string }

// Roue des émotions : outil distinct de la météo. L'accompagné nomme ses émotions (catégorisées) ;
// l'accompagnateur visualise le climat émotionnel (agrégat + historique).
export default function RoueEmotions({ dossierId, role }: { dossierId: number | string; role: 'accompagne' | 'accompagnateur' }) {
  const actif = useFeature('roue_emotions')
  const [entries, setEntries] = useState<Entry[]>([])
  const [agg, setAgg] = useState<Record<string, number>>({})
  const [sel, setSel] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    const d = await api<{ entries: Entry[]; aggregate: Record<string, number> }>(`/viz/emotions/dossier/${dossierId}`)
    setEntries(d.entries || []); setAgg(d.aggregate || {})
  }, [dossierId])
  useEffect(() => { if (actif) void load().catch(() => { /* ignore */ }) }, [actif, load])
  if (!actif) return null

  const readOnly = role === 'accompagnateur'
  function toggle(e: string) { setSel((s) => (s.includes(e) ? s.filter((x) => x !== e) : [...s, e])) }
  async function envoyer() {
    if (!sel.length) return
    setBusy(true); setMsg('')
    try { await api('/viz/emotions/dossier/' + dossierId, { method: 'POST', body: JSON.stringify({ emotions: sel, note: note.trim() || undefined }) }); setSel([]); setNote(''); setMsg('C’est noté ✓'); await load() }
    catch { setMsg('Impossible d’enregistrer.') } finally { setBusy(false) }
  }
  const maxAgg = Math.max(1, ...Object.values(agg))

  return (
    <section className="card" style={{ padding: 18 }}>
      <h2 style={{ marginTop: 0 }}>🎡 Roue des émotions {readOnly && <span className="muted">(climat de l’accompagné)</span>}</h2>

      {!readOnly && (
        <>
          <p className="muted" style={{ marginTop: 0 }}>Quelles émotions traversent ton parcours en ce moment ? (plusieurs possibles)</p>
          <div style={{ display: 'grid', gap: 8, marginBottom: 10 }}>
            {FAMILLES.map((f) => (
              <div key={f.cle} style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                <span style={{ width: 78, fontSize: '.8rem', fontWeight: 600, color: f.couleur }}>{f.label}</span>
                {f.emos.map((e) => {
                  const on = sel.includes(e)
                  return (
                    <button key={e} type="button" onClick={() => toggle(e)} aria-pressed={on}
                      style={{ border: `1.5px solid ${f.couleur}`, background: on ? f.couleur : 'transparent', color: on ? '#fff' : f.couleur, borderRadius: 999, padding: '3px 11px', fontSize: '.85rem', cursor: 'pointer' }}>
                      {EMO_LABEL[e]}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Un mot (facultatif)…" style={{ flex: 1, minWidth: 160 }} />
            <button className="btn btn-primary btn-sm" disabled={busy || !sel.length} onClick={envoyer}>Enregistrer</button>
          </div>
          {msg && <p className="form-success">{msg}</p>}
        </>
      )}

      {Object.keys(agg).length > 0 && (
        <div style={{ marginTop: readOnly ? 0 : 14 }}>
          <h3 style={{ marginBottom: 6 }}>{readOnly ? 'Émotions les plus exprimées' : 'Mon climat émotionnel'}</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {Object.entries(agg).sort((a, b) => b[1] - a[1]).map(([e, n]) => (
              <span key={e} style={{ background: (COULEUR[e] || '#888') + '22', color: COULEUR[e] || '#444', border: `1px solid ${COULEUR[e] || '#888'}`, borderRadius: 999, padding: '2px 10px', fontSize: `${0.78 + (n / maxAgg) * 0.35}rem` }}>
                {EMO_LABEL[e] || e} · {n}
              </span>
            ))}
          </div>
        </div>
      )}
      {readOnly && entries.length > 0 && (
        <div style={{ marginTop: 12 }}>
          {entries.slice(0, 6).map((en) => (
            <div key={en.id} style={{ fontSize: '.85rem', padding: '3px 0' }}>
              <span className="muted">{fdate(en.cree_le)} — </span>
              {en.emotions.map((e) => EMO_LABEL[e] || e).join(', ')}{en.note ? ` · « ${en.note} »` : ''}
            </div>
          ))}
        </div>
      )}
      {readOnly && entries.length === 0 && <p className="muted">L’accompagné n’a pas encore utilisé la roue des émotions.</p>}
    </section>
  )
}
