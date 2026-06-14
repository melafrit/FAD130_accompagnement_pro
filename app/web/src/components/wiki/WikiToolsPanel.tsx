import { useState } from 'react'
import { api } from '../../lib/api'

type Version = { version: number; titre: string; statut: string; cree_le: string; taille: number }

/** Panneau admin d'une page : partage public (lien tokenisé) + historique de versions. */
export default function WikiToolsPanel({ slug, onRestored }: { slug: string; onRestored: () => void }) {
  const [tab, setTab] = useState<'' | 'share' | 'history'>('')
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [versions, setVersions] = useState<Version[]>([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function openShare() {
    setTab(tab === 'share' ? '' : 'share'); setMsg('')
  }
  async function generate() {
    setBusy(true); setMsg('')
    try {
      const d = await api<{ url: string }>(`/wiki/pages/${slug}/share`, { method: 'POST' })
      setShareUrl(`${window.location.origin}${d.url}`)
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Erreur') } finally { setBusy(false) }
  }
  async function revoke() {
    setBusy(true); setMsg('')
    try { await api(`/wiki/pages/${slug}/share`, { method: 'DELETE' }); setShareUrl(null); setMsg('Partage révoqué.') }
    catch (e) { setMsg(e instanceof Error ? e.message : 'Erreur') } finally { setBusy(false) }
  }
  async function openHistory() {
    if (tab === 'history') { setTab(''); return }
    setTab('history'); setMsg('')
    try { const d = await api<{ versions: Version[] }>(`/wiki/pages/${slug}/versions`); setVersions(d.versions || []) }
    catch { setVersions([]) }
  }
  async function restore(version: number) {
    if (!window.confirm(`Restaurer la version ${version} ? (l'état actuel sera historisé)`)) return
    setBusy(true); setMsg('')
    try {
      await api(`/wiki/pages/${slug}/versions/${version}/restore`, { method: 'POST' })
      setMsg(`Version ${version} restaurée.`); onRestored()
      const d = await api<{ versions: Version[] }>(`/wiki/pages/${slug}/versions`); setVersions(d.versions || [])
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Erreur') } finally { setBusy(false) }
  }

  return (
    <div className="wiki-tools">
      <div className="wiki-tools-buttons">
        <button className="btn btn-ghost btn-sm" onClick={openShare} aria-expanded={tab === 'share'}>🔗 Partager</button>
        <button className="btn btn-ghost btn-sm" onClick={openHistory} aria-expanded={tab === 'history'}>🕓 Historique</button>
      </div>

      {tab === 'share' && (
        <div className="wiki-tools-panel">
          <p className="wiki-tools-hint">Génère un lien <strong>public en lecture seule</strong> pour cette page (les autres pages restent privées).</p>
          {shareUrl ? (
            <div className="wiki-share-link">
              <input readOnly value={shareUrl} onFocus={(e) => e.currentTarget.select()} aria-label="Lien public" />
              <button className="btn btn-ghost btn-sm" onClick={() => { void navigator.clipboard?.writeText(shareUrl); setMsg('Lien copié.') }}>Copier</button>
              <button className="btn btn-ghost btn-sm wiki-danger" onClick={revoke} disabled={busy}>Révoquer</button>
            </div>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={generate} disabled={busy}>{busy ? '…' : 'Générer un lien public'}</button>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="wiki-tools-panel">
          {versions.length === 0 ? (
            <p className="wiki-tools-hint">Aucune version antérieure (la page n’a pas encore été modifiée).</p>
          ) : (
            <table className="wiki-history-table">
              <thead><tr><th>Version</th><th>Date</th><th>Statut</th><th></th></tr></thead>
              <tbody>
                {versions.map((v) => (
                  <tr key={v.version}>
                    <td>#{v.version}</td>
                    <td>{String(v.cree_le).slice(0, 16).replace('T', ' ')}</td>
                    <td>{v.statut}</td>
                    <td><button className="btn btn-ghost btn-sm" onClick={() => restore(v.version)} disabled={busy}>Restaurer</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      {msg && <p className="wiki-tools-msg" role="status">{msg}</p>}
    </div>
  )
}
