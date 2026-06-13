import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import DictaTextarea from './DictaTextarea'

interface Data {
  donnees: Record<string, number>
  ia: { comptes_rendus_generes: number; synthese_generee: boolean; fil_rouge_partage: boolean; moments_partages: number }
  ce_que_voit_lia: string
  soustraitants: { nom: string; role: string }[]
  demande_effacement_en_cours: boolean
}
const LABELS: Record<string, string> = {
  questionnaire: 'Questionnaire initial', rdvs: 'Rendez-vous', comptes_rendus_publies: 'Comptes rendus publiés',
  syntheses_publiees: 'Synthèses publiées', actions: 'Plan d’action (étapes)', meteo: 'Relevés de météo', journal: 'Notes de journal',
}

// Tableau de transparence (RGPD) pour l'accompagné + demande d'effacement.
export default function TransparenceModal({ dossierId, onClose }: { dossierId: number | string; onClose: () => void }) {
  const [data, setData] = useState<Data | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [motif, setMotif] = useState('')
  const [showForm, setShowForm] = useState(false)

  useEffect(() => { void api<Data>(`/transparence/dossier/${dossierId}`).then(setData).catch(() => { /* ignore */ }) }, [dossierId])
  useEffect(() => {
    const p = document.body.style.overflow; document.body.style.overflow = 'hidden'
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', k)
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = p }
  }, [onClose])

  async function demander() {
    setBusy(true)
    try {
      await api('/transparence/effacement', { method: 'POST', body: JSON.stringify({ dossierId, motif: motif.trim() || undefined }) })
      setMsg('Ta demande a été envoyée à ton accompagnateur. Il te recontactera — rien n’est supprimé sans validation.')
      setShowForm(false)
      setData((d) => (d ? { ...d, demande_effacement_en_cours: true } : d))
    } catch { setMsg('Demande impossible. Réessaie.') } finally { setBusy(false) }
  }

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal cr-modal" role="dialog" aria-modal="true" aria-labelledby="tr-title" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 id="tr-title">🔒 Mes données & transparence</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fermer">×</button>
        </div>
        <div className="modal-body cr-view">
          {!data ? <p className="muted">Chargement…</p> : (
            <>
              <h3>Les données de ce parcours</h3>
              <ul className="list">{Object.entries(data.donnees).map(([k, v]) => <li key={k}>{LABELS[k] || k} : <strong>{v}</strong></li>)}</ul>

              <h3>Ce que l’IA a vu et produit</h3>
              <p className="muted">{data.ce_que_voit_lia}</p>
              <ul className="list">
                <li>Comptes rendus générés par l’IA : <strong>{data.ia.comptes_rendus_generes}</strong></li>
                <li>Synthèse générée par l’IA : <strong>{data.ia.synthese_generee ? 'oui' : 'non'}</strong></li>
                <li>Fil rouge partagé avec toi : <strong>{data.ia.fil_rouge_partage ? 'oui' : 'non'}</strong></li>
                <li>Moments-clés partagés : <strong>{data.ia.moments_partages}</strong></li>
              </ul>

              <h3>Sous-traitants</h3>
              <ul className="list">{data.soustraitants.map((s, i) => <li key={i}><strong>{s.nom}</strong> — {s.role}</li>)}</ul>

              <h3>Mes droits</h3>
              <p className="muted">Tu peux demander l’effacement de tes données de ce parcours. La demande est transmise à ton accompagnateur (et à l’administrateur), qui la traite : <strong>rien n’est supprimé sans validation</strong>.</p>
              {msg && <p className="form-success">{msg}</p>}
              {data.demande_effacement_en_cours ? (
                <p className="muted">Une demande d’effacement est déjà en cours pour ce parcours.</p>
              ) : showForm ? (
                <div className="tr-form">
                  <DictaTextarea value={motif} onChange={setMotif} rows={2} placeholder="Motif (facultatif)…" aria-label="Motif de la demande d’effacement" />
                  <div className="cr-edit-actions">
                    <button className="btn btn-ghost" disabled={busy} onClick={() => setShowForm(false)}>Annuler</button>
                    <button className="btn btn-primary" disabled={busy} onClick={demander}>Envoyer la demande</button>
                  </div>
                </div>
              ) : (
                <button className="btn btn-ghost" onClick={() => setShowForm(true)}>🗑 Demander l’effacement de mes données</button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
