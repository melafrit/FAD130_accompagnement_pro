import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import DictaInput from './DictaInput'
import DictaTextarea from './DictaTextarea'
import type { Action } from './ActionList'

// Popup de détail / édition d'une action du plan d'action.
export default function ActionDetailModal({ action, onClose, onSaved }: { action: Action; onClose: () => void; onSaved: () => void }) {
  const [libelle, setLibelle] = useState(action.libelle)
  const [statut, setStatut] = useState(action.statut)
  const [priorite, setPriorite] = useState(action.priorite || '')
  const [echeance, setEcheance] = useState(action.echeance || '')
  const [rappel, setRappel] = useState(action.rappel_le || '')
  const [critere, setCritere] = useState(action.critere || '')
  const [details, setDetails] = useState(action.details || '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const libelleRef = useRef<HTMLInputElement>(null)

  // Au montage : focus sur le 1er champ + verrou du défilement de la page ; restauration à la fermeture.
  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null
    libelleRef.current?.focus()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
      prevFocus?.focus?.()
    }
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function save() {
    if (!libelle.trim()) { setErr('Le libellé est obligatoire.'); return }
    setBusy(true); setErr('')
    try {
      await api(`/actions/${action.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ libelle, statut, priorite, echeance, rappel_le: rappel, critere, details }),
      })
      onSaved()
      onClose()
    } catch {
      setErr('Enregistrement impossible. Réessaie.')
    } finally {
      setBusy(false)
    }
  }
  async function remove() {
    if (!window.confirm('Supprimer définitivement cette action ?')) return
    setBusy(true); setErr('')
    try {
      await api(`/actions/${action.id}`, { method: 'DELETE' })
      onSaved()
      onClose()
    } catch {
      setErr('Suppression impossible. Réessaie.')
      setBusy(false)
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal action-modal" role="dialog" aria-modal="true" aria-labelledby="action-modal-title" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 id="action-modal-title">Détail de l'action</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fermer">×</button>
        </div>

        <div className="modal-body">
          <div className="field">
            <span className="field-label">Action</span>
            <DictaInput inputRef={libelleRef} value={libelle} onChange={setLibelle} aria-label="Libellé de l'action" placeholder="Libellé de l'action…" />
          </div>

          <div className="field-row">
            <label className="field">
              <span className="field-label">Statut</span>
              <select value={statut} onChange={(e) => setStatut(e.target.value)}>
                <option value="a_faire">À faire</option>
                <option value="en_cours">En cours</option>
                <option value="fait">Fait</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label">Priorité</span>
              <select value={priorite} onChange={(e) => setPriorite(e.target.value)}>
                <option value="">— Aucune</option>
                <option value="haute">Haute</option>
                <option value="moyenne">Moyenne</option>
                <option value="basse">Basse</option>
              </select>
            </label>
          </div>

          <div className="field-row">
            <label className="field">
              <span className="field-label">Échéance</span>
              <input type="date" value={echeance} onChange={(e) => setEcheance(e.target.value)} />
            </label>
            <label className="field">
              <span className="field-label">Rappel <span className="muted">(notif + e-mail)</span></span>
              <input type="date" value={rappel} onChange={(e) => setRappel(e.target.value)} />
            </label>
          </div>

          <div className="field">
            <span className="field-label">Indicateur de réussite</span>
            <DictaInput value={critere} onChange={setCritere} aria-label="Indicateur de réussite" placeholder="C'est réussi quand… (ex. « Pitch prêt »)" />
          </div>

          <div className="field">
            <span className="field-label">Description / notes</span>
            <DictaTextarea value={details} onChange={setDetails} aria-label="Description ou notes" placeholder="Détails, sous-étapes, contexte…" rows={3} />
          </div>

          {action.cree_le && <p className="muted modal-meta">Créée le {(action.cree_le || '').slice(0, 10)}</p>}
          {err && <p className="form-error">{err}</p>}
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-danger" onClick={remove} disabled={busy}>🗑 Supprimer</button>
          <div className="modal-actions-right">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>Annuler</button>
            <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>Enregistrer</button>
          </div>
        </div>
      </div>
    </div>
  )
}
