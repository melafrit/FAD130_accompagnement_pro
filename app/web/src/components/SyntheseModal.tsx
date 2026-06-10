import { useEffect, useState } from 'react'
import { api } from '../lib/api'

interface SyntheseData {
  titre: string
  accompagne: string
  statut: string
  creeLe: string
  editeLe: string
  contexte: string
  questionnaire: { cr_recap: string; complete_le: string | null } | null
  entretiens: { date: string; phase_atteinte: string | null; statut: string; reponses: { phase: string; texte: string }[] }[]
  actions: { libelle: string; echeance: string | null; critere: string | null; statut: string }[]
  rdvs: { debut: string; fin: string; statut: string }[]
  synthese: string | null
}

const STATUT_FR: Record<string, string> = { en_cours: 'En cours', cloture: 'Clôturé', terminee: 'Terminé', a_faire: 'À faire', fait: 'Fait' }
const sf = (s: string) => STATUT_FR[s] || s || '—'
function fr(iso: string): string {
  if (!iso) return '—'
  const [d, t] = String(iso).split('T')
  const [y, m, day] = (d || '').split('-')
  if (!y) return String(iso)
  return t ? `${day}/${m}/${y} à ${t.slice(0, 5)}` : `${day}/${m}/${y}`
}
const phaseLbl = (p: string | null) => `Phase ${Number(p) + 1}`

// Synthèse du parcours affichée à l'écran (remplace l'ancien export .docx).
export default function SyntheseModal({ dossierId, onClose }: { dossierId: number | string; onClose: () => void }) {
  const [d, setD] = useState<SyntheseData | null>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    void api<SyntheseData>(`/dossiers/${dossierId}/synthese`).then(setD).catch(() => setErr('Chargement impossible.'))
  }, [dossierId])
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal cr-modal" role="dialog" aria-modal="true" aria-labelledby="syn-title" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 id="syn-title">Synthèse du parcours</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fermer">×</button>
        </div>
        <div className="modal-body cr-view">
          {err && <p className="form-error">{err}</p>}
          {!d ? (
            !err && <p className="muted">Chargement…</p>
          ) : (
            <>
              <p><strong>{d.titre}</strong><br /><span className="muted">Accompagné : {d.accompagne} · Statut : {sf(d.statut)} · Ouvert le {fr(d.creeLe)}</span></p>

              <h2>1. Contexte</h2>
              <p>{d.contexte || '—'}</p>

              <h2>2. Questionnaire initial</h2>
              {d.questionnaire ? (
                <>
                  <p className="muted">Complété le {fr(d.questionnaire.complete_le || '')}</p>
                  <pre className="recap-text">{d.questionnaire.cr_recap}</pre>
                </>
              ) : <p className="muted">Non complété par l’accompagné.</p>}

              <h2>3. Entretiens</h2>
              {d.entretiens.length === 0 ? <p className="muted">Aucun entretien.</p> : d.entretiens.map((e, i) => (
                <div key={i} className="syn-entretien">
                  <h3>Entretien {i + 1} — {fr(e.date)} · {sf(e.statut)}</h3>
                  {e.reponses.length === 0 ? <p className="muted">(pas de notes saisies)</p> : e.reponses.map((r, j) => (
                    <p key={j}><strong>{phaseLbl(r.phase)} :</strong> {r.texte}</p>
                  ))}
                </div>
              ))}

              <h2>4. Plan d’action</h2>
              {d.actions.length === 0 ? <p className="muted">Aucune action.</p> : (
                <ul>{d.actions.map((a, i) => (
                  <li key={i}>{a.libelle}{a.echeance ? ` — échéance ${a.echeance}` : ''}{a.critere ? ` (${a.critere})` : ''} — <em>{sf(a.statut)}</em></li>
                ))}</ul>
              )}

              <h2>5. Rendez-vous</h2>
              {d.rdvs.length === 0 ? <p className="muted">Aucun rendez-vous.</p> : (
                <ul>{d.rdvs.map((r, i) => <li key={i}>{fr(r.debut)} ({sf(r.statut)})</li>)}</ul>
              )}

              <h2>6. Synthèse finale</h2>
              <p>{d.synthese || (d.statut === 'cloture' ? '—' : 'Démarche en cours.')}</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
