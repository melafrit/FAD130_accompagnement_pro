import { useEffect, useState } from 'react'
import { api } from '../lib/api'

const PHASES = ['Accueil et mise en confiance', 'Clarifier le besoin', "Explorer l'expérience", 'Relier et donner du sens', "Plan d'action & engagement", 'Clôture et élan']

// Carte « souvenir » du parcours, imprimable (ou export PDF via la boîte d'impression).
export default function CarteParcours({ dossierId, titre, accompagnateur, phaseMax, nbEntretiens, onClose }: {
  dossierId: number | string; titre: string; accompagnateur: string; phaseMax: number; nbEntretiens: number; onClose: () => void
}) {
  const [fil, setFil] = useState<string | null>(null)
  useEffect(() => { void api<{ filRouge: { fil: string } | null }>(`/emergence/mine/dossier/${dossierId}`).then((d) => setFil(d.filRouge?.fil || null)).catch(() => { /* ignore */ }) }, [dossierId])
  useEffect(() => {
    const p = document.body.style.overflow; document.body.style.overflow = 'hidden'
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', k)
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = p }
  }, [onClose])
  const cur = Math.max(-1, Math.min(5, phaseMax))

  return (
    <div className="modal-overlay carte-overlay" onMouseDown={onClose}>
      <div className="modal carte-modal" role="dialog" aria-modal="true" aria-labelledby="carte-title" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head no-print">
          <h2 id="carte-title">🖨️ Carte de mon parcours</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fermer">×</button>
        </div>
        <div className="modal-body">
          <div className="carte">
            <div className="carte-brand">✶ Boussole</div>
            <h1 className="carte-titre">{titre}</h1>
            <p className="carte-sub">Accompagné·e par <strong>{accompagnateur}</strong> · {nbEntretiens} entretien{nbEntretiens > 1 ? 's' : ''}</p>
            <div className="carte-phases">
              {PHASES.map((p, i) => (
                <div key={i} className={`carte-phase ${i <= cur ? 'ok' : ''}`}>
                  <span className="carte-phase-num">{i <= cur ? '✓' : i + 1}</span><span>{p}</span>
                </div>
              ))}
            </div>
            {fil && <div className="carte-fil"><span className="muted">Mon fil rouge</span><p>« {fil} »</p></div>}
            <p className="carte-foot">« On l’amène au bord du précipice, c’est elle qui déploie ses ailes. »<br />Bravo pour le chemin parcouru.</p>
          </div>
          <div className="carte-actions no-print">
            <button className="btn btn-primary" onClick={() => window.print()}>🖨️ Imprimer / enregistrer en PDF</button>
          </div>
        </div>
      </div>
    </div>
  )
}
