import { useEffect, useState } from 'react'
import { api } from '../lib/api'

interface Slot { id: number; debut: string; fin: string }
interface Rdv { id: number; debut: string; fin: string; statut: string }

function formatSlot(iso: string): string {
  const [d, t] = iso.split('T')
  const [y, m, day] = (d || '').split('-')
  return `${day}/${m}/${y} à ${(t || '').slice(0, 5)}`
}

export default function RendezVous() {
  const [slots, setSlots] = useState<Slot[]>([])
  const [mine, setMine] = useState<Rdv[]>([])
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    const [a, b] = await Promise.all([
      api<{ creneaux: Slot[] }>('/rdv/disponibles'),
      api<{ rdv: Rdv[] }>('/rdv/mine'),
    ])
    setSlots(a.creneaux)
    setMine(b.rdv)
  }
  useEffect(() => {
    void load()
  }, [])

  async function book(id: number) {
    setMsg('')
    setBusy(true)
    try {
      await api('/rdv/reserver', { method: 'POST', body: JSON.stringify({ creneauId: id }) })
      setMsg('Rendez-vous confirmé ✅ Un email de confirmation t’a été envoyé.')
      await load()
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <p className="kicker">Rendez-vous</p>
      <h1 className="page-title">Choisir un créneau</h1>
      {msg && <p className="form-success">{msg}</p>}

      {mine.length > 0 && (
        <section>
          <h2>Mes rendez-vous</h2>
          <div className="slots">
            {mine.map((r) => (
              <div key={r.id} className="slot slot-reserved">
                <span>{formatSlot(r.debut)}</span>
                <span className="slot-tag">{r.statut}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2>Créneaux disponibles</h2>
        <div className="slots">
          {slots.length === 0 && <p className="muted">Aucun créneau disponible pour l'instant — reviens un peu plus tard.</p>}
          {slots.map((s) => (
            <div key={s.id} className="slot">
              <span>{formatSlot(s.debut)}</span>
              <button className="btn btn-primary" disabled={busy} onClick={() => book(s.id)}>Réserver</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
