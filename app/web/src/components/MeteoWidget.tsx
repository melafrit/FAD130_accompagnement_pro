import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import DictaInput from './DictaInput'

interface Entry { id: number; niveau: number; mot: string | null; cree_le: string }
const EMOJIS = ['😞', '😟', '😐', '🙂', '😄']
const LABELS = ['Difficile', 'Mitigé', 'Neutre', 'Plutôt bien', 'En forme']
const fdate = (s: string) => (s || '').slice(0, 16).replace('T', ' ')

// Météo intérieure : check-in d'humeur (1-5) + un mot. Côté accompagné = sa météo (vue par l'accompagnateur) ;
// côté accompagnateur = son auto-check PRIVÉ + la météo de l'accompagné en lecture.
export default function MeteoWidget({ dossierId, role, accompagneNom }: { dossierId: number | string; role: 'accompagne' | 'accompagnateur'; accompagneNom?: string }) {
  const [mine, setMine] = useState<Entry[]>([])
  const [autre, setAutre] = useState<Entry[]>([])
  const [niveau, setNiveau] = useState<number | null>(null)
  const [mot, setMot] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const acc = role === 'accompagnateur'

  const load = useCallback(async () => {
    const d = await api<{ mine: Entry[]; autre: Entry[] }>(`/relationnel/meteo/dossier/${dossierId}`)
    setMine(d.mine || []); setAutre(d.autre || [])
  }, [dossierId])
  useEffect(() => { void load().catch(() => { /* ignore */ }) }, [load])

  async function envoyer() {
    if (!niveau) return
    setBusy(true); setMsg('')
    try {
      await api('/relationnel/meteo', { method: 'POST', body: JSON.stringify({ dossierId, niveau, mot: mot.trim() || undefined }) })
      setNiveau(null); setMot(''); setMsg('C’est noté ✓'); await load()
    } catch { setMsg('Impossible d’enregistrer.') } finally { setBusy(false) }
  }

  const hist = (rows: Entry[]) => rows.slice(0, 8).map((en) => (
    <div key={en.id} className="meteo-row">
      <span className="meteo-emo-sm">{EMOJIS[en.niveau - 1]}</span>
      <span className="muted">{fdate(en.cree_le)}</span>
      {en.mot && <span className="meteo-mot">— {en.mot}</span>}
    </div>
  ))

  return (
    <section className="meteo">
      <h2>{acc ? '🌤️ Mon état avant l’entretien' : '🌤️ Comment te sens-tu ?'} {acc && <span className="muted">(privé)</span>}</h2>
      <div className="meteo-pick">
        {EMOJIS.map((e, i) => (
          <button key={i} type="button" className={`meteo-emo ${niveau === i + 1 ? 'sel' : ''}`} title={LABELS[i]} aria-label={LABELS[i]} aria-pressed={niveau === i + 1} onClick={() => setNiveau(i + 1)}>{e}</button>
        ))}
      </div>
      <div className="meteo-form">
        <DictaInput value={mot} onChange={setMot} placeholder="Un mot (facultatif)…" aria-label="Un mot pour décrire" />
        <button className="btn btn-primary btn-sm" disabled={!niveau || busy} onClick={envoyer}>Enregistrer</button>
      </div>
      {msg && <p className="form-success">{msg}</p>}
      {mine.length > 0 && <div className="meteo-hist"><h3>{acc ? 'Mes relevés' : 'Mon historique'}</h3>{hist(mine)}</div>}
      {acc && (autre.length > 0
        ? <div className="meteo-hist"><h3>Météo de {accompagneNom || 'l’accompagné'}</h3>{hist(autre)}</div>
        : <p className="muted">{accompagneNom || 'L’accompagné'} n’a pas encore partagé sa météo.</p>)}
    </section>
  )
}
