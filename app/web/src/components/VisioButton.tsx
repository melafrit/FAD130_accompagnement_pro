import { useState } from 'react'
import { api } from '../lib/api'
import { useFeature } from '../features/FeaturesContext'

// Bouton de visioconférence (Jitsi Meet, sans compte) pour un rendez-vous.
export default function VisioButton({ rdvId, label = '🎥 Rejoindre la visio' }: { rdvId: number; label?: string }) {
  const actif = useFeature('visio')
  const [busy, setBusy] = useState(false)
  if (!actif) return null

  async function rejoindre() {
    setBusy(true)
    try {
      const d = await api<{ url: string }>(`/confort/visio/rdv/${rdvId}`)
      window.open(d.url, '_blank', 'noopener,noreferrer')
    } catch { /* ignore */ } finally { setBusy(false) }
  }
  return <button className="btn btn-ghost btn-sm" disabled={busy} onClick={rejoindre} title="Ouvrir la salle de visioconférence">{label}</button>
}
