import { useEffect, useState } from 'react'
import { api } from '../lib/api'

interface Attestation {
  titre: string | null; accompagne: string; accompagnateur: string
  debut: string; fin: string | null; nb_entretiens: number; nb_comptes_rendus: number
}
const fdate = (s: string | null) => {
  if (!s) return '—'
  const [y, m, d] = s.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

// Attestation de fin d'accompagnement (imprimable) pour un parcours clôturé.
export default function AttestationModal({ dossierId, onClose }: { dossierId: number | string; onClose: () => void }) {
  const [att, setAtt] = useState<Attestation | null>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    api<Attestation>(`/ethique/attestation/dossier/${dossierId}`).then(setAtt).catch((e) => setErr(e instanceof Error ? e.message : 'Indisponible.'))
  }, [dossierId])
  useEffect(() => {
    const p = document.body.style.overflow; document.body.style.overflow = 'hidden'
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', k)
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = p }
  }, [onClose])

  return (
    <div className="modal-overlay attestation-overlay" onMouseDown={onClose}>
      <div className="modal attestation-modal" role="dialog" aria-modal="true" aria-labelledby="att-title" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head no-print">
          <h2 id="att-title">📜 Attestation de fin</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fermer">×</button>
        </div>
        <div className="modal-body">
          {err && <p className="form-error">{err}</p>}
          {att && (
            <>
              <div className="no-print" style={{ marginBottom: 12 }}>
                <button className="btn btn-primary" onClick={() => window.print()}>🖨️ Imprimer / enregistrer en PDF</button>
              </div>
              <div className="attestation">
                <p className="att-brand">✶ Boussole</p>
                <h1 className="att-titre">Attestation d’accompagnement</h1>
                <p className="att-corps">
                  Nous attestons que <strong>{att.accompagne}</strong> a bénéficié d’un accompagnement
                  {att.titre ? <> dans le cadre de <em>« {att.titre} »</em></> : null}, conduit par <strong>{att.accompagnateur}</strong>.
                </p>
                <ul className="att-faits">
                  <li>Période : du <strong>{fdate(att.debut)}</strong> au <strong>{fdate(att.fin || att.debut)}</strong></li>
                  <li>Entretiens d’accompagnement : <strong>{att.nb_entretiens}</strong></li>
                  <li>Comptes rendus remis : <strong>{att.nb_comptes_rendus}</strong></li>
                </ul>
                <p className="att-corps">Le parcours a été mené à son terme. Cette attestation est délivrée pour valoir ce que de droit.</p>
                <div className="att-signature">
                  <span>{att.accompagnateur}</span>
                  <span className="muted">Accompagnateur — Boussole (UE FAD130, Cnam)</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
