import { useEffect, useState } from 'react'
import { api } from '../lib/api'

interface Settings { falc_enabled: boolean; multilingue_enabled: boolean }

const ITEMS: { key: keyof Settings; label: string; hint: string }[] = [
  { key: 'falc_enabled', label: 'Mode « facile à lire » (FALC)', hint: 'Affiche le bouton FALC dans l’en-tête pour tous les utilisateurs.' },
  { key: 'multilingue_enabled', label: 'Sélecteur de langue (multilingue)', hint: 'Affiche le bouton FR/EN. La traduction anglaise est encore partielle.' },
]

/** Réglages généraux globaux (bascules transversales activées par l'admin pour tout le monde). */
export default function SettingsPanel() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [msg, setMsg] = useState('')

  useEffect(() => { void api<{ settings: Settings }>('/admin/settings').then((d) => setSettings(d.settings)) }, [])

  async function toggle(key: keyof Settings, value: boolean) {
    setMsg('')
    try {
      const d = await api<{ settings: Settings }>('/admin/settings', { method: 'PATCH', body: JSON.stringify({ [key]: value }) })
      setSettings(d.settings)
      setMsg('Réglage enregistré.')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Erreur')
    }
  }

  return (
    <section style={{ marginTop: 32 }}>
      <h2 style={{ margin: 0 }}>Réglages généraux</h2>
      <p className="muted" style={{ margin: '4px 0 0' }}>
        Fonctionnalités transversales activables pour <strong>tous les utilisateurs</strong>. Désactivées par défaut.
      </p>
      {msg && <p className="form-success" style={{ marginTop: 12 }}>{msg}</p>}

      <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
        {settings && ITEMS.map((it) => (
          <label key={it.key} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', cursor: 'pointer' }}>
            <input type="checkbox" checked={settings[it.key]} onChange={(e) => void toggle(it.key, e.target.checked)} />
            <span>
              <strong>{it.label}</strong>
              <span className="muted" style={{ display: 'block', fontSize: 13 }}>{it.hint}</span>
            </span>
          </label>
        ))}
        {!settings && <p className="muted">Chargement des réglages…</p>}
      </div>
    </section>
  )
}
