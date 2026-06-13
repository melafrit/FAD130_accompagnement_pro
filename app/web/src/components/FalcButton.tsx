import { useState } from 'react'
import { api } from '../lib/api'
import { useFeature } from '../features/FeaturesContext'

// Bouton « Facile à lire » : reformule un contenu en FALC (langage simple) via l'IA.
export default function FalcButton({ html, label = 'Facile à lire' }: { html: string; label?: string }) {
  const actif = useFeature('falc')
  const [open, setOpen] = useState(false)
  const [texte, setTexte] = useState('')
  const [busy, setBusy] = useState(false)
  if (!actif) return null

  async function lire() {
    if (open) { setOpen(false); return }
    setBusy(true)
    try {
      const d = await api<{ texte: string }>('/adoption/falc', { method: 'POST', body: JSON.stringify({ html }) })
      setTexte(d.texte); setOpen(true)
    } catch { /* ignore */ } finally { setBusy(false) }
  }

  return (
    <>
      <button type="button" className="btn btn-ghost btn-sm" onClick={lire} disabled={busy} aria-expanded={open} title="Lire une version en langage simple">
        📖 {busy ? '…' : label}
      </button>
      {open && (
        <div style={{ marginTop: 8, padding: '12px 16px', border: '1px solid var(--bordure, #e5e7eb)', borderRadius: 10, background: 'var(--surface-2, #f8fafc)', fontSize: '1.08rem', lineHeight: 1.8 }}>
          <p className="muted" style={{ marginTop: 0, fontSize: '.82rem' }}>Version facile à lire et à comprendre</p>
          {texte.split('\n').filter(Boolean).map((ligne, i) => <p key={i} style={{ margin: '4px 0' }}>{ligne}</p>)}
        </div>
      )}
    </>
  )
}
