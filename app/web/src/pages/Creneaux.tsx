import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../lib/api'

interface Creneau {
  id: number
  debut: string
  fin: string
  reserve: number
  accompagne_email?: string | null
  accompagne_prenom?: string | null
}

function formatSlot(iso: string): string {
  const [d, t] = iso.split('T')
  const [y, m, day] = (d || '').split('-')
  return `${day}/${m}/${y} à ${(t || '').slice(0, 5)}`
}
function heure(iso: string): string {
  return (iso.split('T')[1] || '').slice(0, 5)
}
function addMinutes(local: string, mins: number): string {
  const d = new Date(local)
  d.setMinutes(d.getMinutes() + mins)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

export default function Creneaux() {
  const [creneaux, setCreneaux] = useState<Creneau[]>([])
  const [debut, setDebut] = useState('')
  const [duree, setDuree] = useState(45)
  const [error, setError] = useState('')

  async function load() {
    const d = await api<{ creneaux: Creneau[] }>('/rdv/creneaux/mine')
    setCreneaux(d.creneaux)
  }
  useEffect(() => {
    void load()
  }, [])

  async function add(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!debut) return
    try {
      await api('/rdv/creneaux', { method: 'POST', body: JSON.stringify({ debut, fin: addMinutes(debut, duree) }) })
      setDebut('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    }
  }
  async function remove(id: number) {
    await api(`/rdv/creneaux/${id}`, { method: 'DELETE' })
    await load()
  }

  return (
    <div className="page">
      <p className="kicker">Accompagnateur</p>
      <h1 className="page-title">Mes disponibilités</h1>
      <p className="lead">Ajoute des créneaux ; tes accompagnés pourront en réserver un.</p>

      <form className="slot-form" onSubmit={add}>
        <label className="field">
          <span>Début</span>
          <input type="datetime-local" value={debut} onChange={(e) => setDebut(e.target.value)} required />
        </label>
        <label className="field">
          <span>Durée</span>
          <select value={duree} onChange={(e) => setDuree(Number(e.target.value))}>
            <option value={30}>30 min</option>
            <option value={45}>45 min</option>
            <option value={60}>60 min</option>
          </select>
        </label>
        <button className="btn btn-primary" type="submit">Ajouter le créneau</button>
      </form>
      {error && <p className="form-error">{error}</p>}

      <div className="slots">
        {creneaux.length === 0 && <p className="muted">Aucun créneau pour l'instant.</p>}
        {creneaux.map((c) => (
          <div key={c.id} className={`slot ${c.reserve ? 'slot-reserved' : ''}`}>
            <span>{formatSlot(c.debut)} → {heure(c.fin)}</span>
            {c.reserve ? (
              <span className="slot-tag">
                Réservé{c.accompagne_prenom ? ` · ${c.accompagne_prenom}` : c.accompagne_email ? ` · ${c.accompagne_email}` : ''}
              </span>
            ) : (
              <button className="btn btn-ghost" onClick={() => remove(c.id)}>Supprimer</button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
