import { useEffect, useState } from 'react'
import { api } from '../lib/api'

interface ExportData {
  dossier: { titre: string | null; statut: string; contexte: string | null; cree_le: string; accompagne: string }
  questionnaire: string | null
  comptes_rendus: { date: string; html: string }[]
  synthese: string | null
  actions: { libelle: string; statut: string; echeance: string | null; critere: string | null }[]
  grille: { note: number | null; commentaire: string | null } | null
}
const fdate = (s: string) => (s || '').slice(0, 10)
const STATUT: Record<string, string> = { a_faire: 'À faire', en_cours: 'En cours', fait: 'Fait' }

// Export PDF complet : vue imprimable assemblée (synthèse, comptes rendus, plan d'action, bilan).
export default function ExportDossierModal({ dossierId, onClose }: { dossierId: number | string; onClose: () => void }) {
  const [data, setData] = useState<ExportData | null>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    api<ExportData>(`/confort/export/dossier/${dossierId}`).then(setData).catch(() => setErr('Chargement impossible.'))
  }, [dossierId])
  useEffect(() => {
    const p = document.body.style.overflow; document.body.style.overflow = 'hidden'
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', k)
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = p }
  }, [onClose])

  return (
    <div className="modal-overlay export-overlay" onMouseDown={onClose}>
      <div className="modal export-modal" role="dialog" aria-modal="true" aria-labelledby="export-title" style={{ maxWidth: 820 }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head no-print">
          <h2 id="export-title">📄 Export PDF complet</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fermer">×</button>
        </div>
        <div className="modal-body">
          {err && <p className="form-error">{err}</p>}
          <div className="no-print" style={{ marginBottom: 12 }}>
            <button className="btn btn-primary" disabled={!data} onClick={() => window.print()}>🖨️ Imprimer / enregistrer en PDF</button>
          </div>
          {data && (
            <article className="export-doc">
              <header>
                <p style={{ color: '#16324f', fontWeight: 700, margin: 0 }}>✶ Boussole</p>
                <h1 style={{ margin: '4px 0' }}>{data.dossier.titre || 'Parcours d’accompagnement'}</h1>
                <p className="muted">Accompagné : <strong>{data.dossier.accompagne}</strong> · {data.dossier.statut === 'cloture' ? 'Clôturé' : 'En cours'} · ouvert le {fdate(data.dossier.cree_le)}</p>
                {data.dossier.contexte && <p>{data.dossier.contexte}</p>}
              </header>

              {data.questionnaire && (<section><h2>Questionnaire initial</h2><p style={{ whiteSpace: 'pre-wrap' }}>{data.questionnaire}</p></section>)}

              {data.synthese && (<section><h2>Synthèse du parcours</h2><div dangerouslySetInnerHTML={{ __html: data.synthese }} /></section>)}

              {data.comptes_rendus.length > 0 && (
                <section>
                  <h2>Comptes rendus ({data.comptes_rendus.length})</h2>
                  {data.comptes_rendus.map((cr, i) => (
                    <div key={i} style={{ marginBottom: 16 }}>
                      <h3>Entretien du {fdate(cr.date)}</h3>
                      <div dangerouslySetInnerHTML={{ __html: cr.html }} />
                    </div>
                  ))}
                </section>
              )}

              {data.actions.length > 0 && (
                <section>
                  <h2>Plan d’action</h2>
                  <ul>{data.actions.map((a, i) => (
                    <li key={i}>{a.libelle} — <em>{STATUT[a.statut] || a.statut}</em>{a.echeance ? ` (échéance ${fdate(a.echeance)})` : ''}{a.critere ? ` · critère : ${a.critere}` : ''}</li>
                  ))}</ul>
                </section>
              )}

              {data.grille && data.grille.note != null && (
                <section>
                  <h2>Bilan de la pratique d’accompagnement</h2>
                  <p>Note globale : <strong>{data.grille.note}/20</strong></p>
                  {data.grille.commentaire && <p>{data.grille.commentaire}</p>}
                </section>
              )}
            </article>
          )}
        </div>
      </div>
    </div>
  )
}
