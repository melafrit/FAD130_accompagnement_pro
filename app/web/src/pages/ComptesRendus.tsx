import { useEffect, useState } from 'react'
import { api } from '../lib/api'

interface CR { id: number; version: number; genere_le: string }

export default function ComptesRendus() {
  const [crs, setCrs] = useState<CR[]>([])

  useEffect(() => {
    void api<{ comptesRendus: CR[] }>('/cr/mine').then((d) => setCrs(d.comptesRendus))
  }, [])

  return (
    <div className="page">
      <p className="kicker">Mon espace</p>
      <h1 className="page-title">Mes comptes rendus</h1>
      <div className="slots">
        {crs.length === 0 && <p className="muted">Aucun compte rendu pour l'instant.</p>}
        {crs.map((c) => (
          <div key={c.id} className="slot">
            <span>Compte rendu du {c.genere_le?.slice(0, 10)}{c.version > 1 ? ` (v${c.version})` : ''}</span>
            <a className="btn btn-primary" href={`/api/cr/${c.id}/download`}>⬇ Télécharger (.docx)</a>
          </div>
        ))}
      </div>
    </div>
  )
}
