export interface Action {
  id: number
  libelle: string
  echeance: string | null
  critere: string | null
  statut: string
}

export default function ActionList({ actions, onStatut }: { actions: Action[]; onStatut: (id: number, statut: string) => void }) {
  return (
    <div className="actions-list">
      {actions.length === 0 && <p className="muted">Aucune action pour l'instant.</p>}
      {actions.map((a) => (
        <div key={a.id} className={`action-item statut-${a.statut}`}>
          <div>
            <p className="action-lib">{a.libelle}</p>
            {(a.echeance || a.critere) && (
              <p className="action-meta">
                {a.echeance ? `Échéance : ${a.echeance}` : ''}
                {a.echeance && a.critere ? ' · ' : ''}
                {a.critere || ''}
              </p>
            )}
          </div>
          <select value={a.statut} onChange={(e) => onStatut(a.id, e.target.value)} aria-label="Statut">
            <option value="a_faire">À faire</option>
            <option value="en_cours">En cours</option>
            <option value="fait">Fait</option>
          </select>
        </div>
      ))}
    </div>
  )
}
