import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useFeature } from '../features/FeaturesContext'

interface Theme { mot: string; poids: number }
interface Nuage { themes: Theme[]; source?: string; genere_le?: string }
const PALETTE = ['#16324f', '#1d6a96', '#0e7490', '#7c3aed', '#b45309', '#15803d', '#be123c', '#4338ca']

// Nuage de thèmes / carte mentale d'un parcours : mots dimensionnés par importance.
export default function NuageThemes({ dossierId }: { dossierId: number | string }) {
  const actif = useFeature('nuage_themes')
  const [nuage, setNuage] = useState<Nuage | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!actif) return
    api<{ nuage: Nuage | null }>(`/viz/nuage/dossier/${dossierId}`).then((d) => setNuage(d.nuage)).catch(() => { /* ignore */ })
  }, [actif, dossierId])
  if (!actif) return null

  async function gen() {
    setBusy(true)
    try { setNuage(await api<Nuage>(`/viz/nuage/dossier/${dossierId}`, { method: 'POST' })) } finally { setBusy(false) }
  }

  const themes = nuage?.themes || []
  return (
    <section className="card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>🗂️ Nuage de thèmes</h2>
        <button className="btn btn-ghost btn-sm" disabled={busy} onClick={gen}>{busy ? 'Analyse…' : themes.length ? '↻ Régénérer' : '✨ Générer le nuage'}</button>
      </div>
      {themes.length === 0 ? (
        <p className="muted" style={{ marginBottom: 0 }}>Fais émerger les thèmes saillants du parcours (questionnaire, comptes rendus, notes, fil rouge).</p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', alignItems: 'center', justifyContent: 'center', padding: '10px 0' }} aria-label="Nuage de thèmes">
          {themes.map((t, i) => (
            <span key={t.mot + i} style={{ fontSize: `${0.85 + t.poids * 0.16}rem`, fontWeight: 500 + Math.min(3, Math.round(t.poids / 3)) * 100, color: PALETTE[i % PALETTE.length], lineHeight: 1.1, opacity: 0.55 + t.poids * 0.045 }}>
              {t.mot}
            </span>
          ))}
        </div>
      )}
    </section>
  )
}
