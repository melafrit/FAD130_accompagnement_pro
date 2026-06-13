import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'

interface Ressource {
  id: number; titre: string; type: string; contenu: string; portee: string; token: string | null
  cree_le: string; auteur: string; mienne: boolean
}
const TYPE_LABEL: Record<string, string> = { question: '❓ Question', methode: '🧭 Méthode', astuce: '💡 Astuce' }

export default function Mutualisation() {
  const [ressources, setRessources] = useState<Ressource[]>([])
  const [form, setForm] = useState({ titre: '', type: 'astuce', contenu: '' })
  const [msg, setMsg] = useState('')

  async function load() {
    setRessources((await api<{ ressources: Ressource[] }>('/collab/ressources')).ressources)
  }
  useEffect(() => { void load() }, [])

  async function creer(e: FormEvent) {
    e.preventDefault(); setMsg('')
    try {
      await api('/collab/ressources', { method: 'POST', body: JSON.stringify(form) })
      setForm({ titre: '', type: 'astuce', contenu: '' }); setMsg('Ressource partagée ✓'); await load()
    } catch (err) { setMsg(err instanceof Error ? err.message : 'Erreur') }
  }
  async function togglePublic(r: Ressource) {
    const d = await api<{ token?: string }>(`/collab/ressources/${r.id}`, { method: 'PATCH', body: JSON.stringify({ public: r.portee !== 'public' }) })
    if (d.token) {
      const url = `${location.origin}/ressource/${d.token}`
      try { await navigator.clipboard.writeText(url); setMsg('Lien public copié : ' + url) } catch { setMsg('Lien public : ' + url) }
    }
    await load()
  }
  async function copierLien(r: Ressource) {
    if (!r.token) return
    const url = `${location.origin}/ressource/${r.token}`
    try { await navigator.clipboard.writeText(url); setMsg('Lien copié : ' + url) } catch { setMsg('Lien : ' + url) }
  }
  async function supprimer(r: Ressource) {
    if (!window.confirm(`Supprimer « ${r.titre} » ?`)) return
    await api(`/collab/ressources/${r.id}`, { method: 'DELETE' }); await load()
  }

  return (
    <div className="page">
      <p className="kicker">Accompagnateur · Collaboration</p>
      <h1 className="page-title">Mutualisation entre pairs</h1>
      <p className="lead">Partage tes questions, méthodes et astuces avec les autres accompagnateurs — et, si tu le souhaites, via un lien public.</p>
      <p><Link className="btn btn-ghost btn-sm" to="/tableau-de-bord">← Tableau de bord</Link></p>
      {msg && <p className="form-success" style={{ wordBreak: 'break-all' }}>{msg}</p>}

      <div className="card" style={{ padding: 18, marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Partager une ressource</h3>
        <form className="form" onSubmit={creer}>
          <div className="field-row">
            <label className="field" style={{ flex: 2 }}><span>Titre</span><input value={form.titre} onChange={(e) => setForm((f) => ({ ...f, titre: e.target.value }))} required /></label>
            <label className="field"><span>Type</span>
              <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                <option value="astuce">Astuce</option><option value="question">Question</option><option value="methode">Méthode</option>
              </select>
            </label>
          </div>
          <label className="field"><span>Contenu</span><textarea rows={3} value={form.contenu} onChange={(e) => setForm((f) => ({ ...f, contenu: e.target.value }))} required /></label>
          <button className="btn btn-primary" type="submit">Partager</button>
        </form>
      </div>

      <h2>Bibliothèque partagée <span className="muted">({ressources.length})</span></h2>
      {ressources.length === 0 && <p className="muted">Aucune ressource partagée pour l’instant. Sois le premier à en proposer une !</p>}
      <div style={{ display: 'grid', gap: 12 }}>
        {ressources.map((r) => (
          <div key={r.id} className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <strong>{TYPE_LABEL[r.type] || r.type} · {r.titre}</strong>
              <span className="muted" style={{ fontSize: '.8rem' }}>par {r.mienne ? 'moi' : r.auteur}{r.portee === 'public' ? ' · 🌐 public' : ''}</span>
            </div>
            <p style={{ margin: '8px 0', whiteSpace: 'pre-wrap' }}>{r.contenu}</p>
            {r.mienne && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => togglePublic(r)}>{r.portee === 'public' ? '🔒 Rendre interne' : '🌐 Rendre public'}</button>
                {r.portee === 'public' && r.token && <button className="btn btn-ghost btn-sm" onClick={() => copierLien(r)}>🔗 Copier le lien</button>}
                <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto', color: 'var(--danger,#b91c1c)' }} onClick={() => supprimer(r)}>Supprimer</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
