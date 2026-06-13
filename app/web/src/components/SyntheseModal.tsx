import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import HtmlContent from './HtmlContent'
import RichTextEditor from './RichTextEditor'
import DictaInput from './DictaInput'
import EcouterButton from './EcouterButton'

interface DocCurrent { id: number; version: number; contenu_html: string | null; source: string; genere_le: string; publie: number }
interface DocVersion { id: number; version: number; source: string; genere_le: string; publie: number }
interface Message { id: number; auteur_id: number; auteur_prenom: string | null; auteur_role: string; texte: string; cree_le: string; is_me: boolean }

function shortDate(s: string | null) { return (s || '').slice(0, 16).replace('T', ' ') }

// Synthèse du parcours : document HTML généré par l'IA, éditable, versionné, publiable, avec discussion.
export default function SyntheseModal({
  dossierId,
  role,
  onClose,
  onChanged,
}: {
  dossierId: number | string
  role: 'accompagnateur' | 'accompagne'
  onClose: () => void
  onChanged?: () => void
}) {
  const accompagnateur = role === 'accompagnateur'
  const [loading, setLoading] = useState(true)
  const [doc, setDoc] = useState<DocCurrent | null>(null)
  const [versions, setVersions] = useState<DocVersion[]>([])
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [histHtml, setHistHtml] = useState<{ version: number; html: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [newMsg, setNewMsg] = useState('')
  const dialogRef = useRef<HTMLDivElement>(null)
  const msgsRef = useRef<HTMLDivElement>(null)

  const loadDoc = useCallback(async () => {
    const d = await api<{ doc: DocCurrent | null; versions: DocVersion[] }>(`/synthese/dossier/${dossierId}`)
    setDoc(d.doc)
    setVersions(d.versions || [])
  }, [dossierId])
  const loadMessages = useCallback(async () => {
    try { const d = await api<{ messages: Message[] }>(`/synthese/dossier/${dossierId}/messages`); setMessages(d.messages) } catch { /* indisponible (non publié) */ }
  }, [dossierId])

  useEffect(() => {
    void (async () => { try { await loadDoc(); await loadMessages() } finally { setLoading(false) } })()
  }, [loadDoc, loadMessages])

  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null
    dialogRef.current?.focus()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prevOverflow; prevFocus?.focus?.() }
  }, [])
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape' && !editing) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, editing])
  useEffect(() => { if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight }, [messages.length])

  async function generer() {
    setBusy(true); setMsg('')
    try { await api('/synthese/generer', { method: 'POST', body: JSON.stringify({ dossierId }) }); await loadDoc(); onChanged?.() }
    catch { setMsg('Génération impossible.') } finally { setBusy(false) }
  }
  async function regenerer() {
    if (!window.confirm('Régénérer la synthèse avec l’IA ? Cela crée une nouvelle version (les précédentes restent dans l’historique).')) return
    setEditing(false); setHistHtml(null)
    await generer()
  }
  function startEdit() { if (!doc) return; setDraft(doc.contenu_html || ''); setHistHtml(null); setEditing(true) }
  async function save() {
    if (!doc) return
    setBusy(true); setMsg('')
    try { await api(`/synthese/version/${doc.id}`, { method: 'PATCH', body: JSON.stringify({ contenu_html: draft }) }); await loadDoc(); setEditing(false); onChanged?.() }
    catch { setMsg('Enregistrement impossible.') } finally { setBusy(false) }
  }
  async function publier() {
    if (!doc) return
    setBusy(true); setMsg('')
    try { await api(`/synthese/version/${doc.id}/publier`, { method: 'POST' }); await loadDoc(); onChanged?.(); setMsg('Synthèse publiée — l’accompagné peut la consulter.') }
    catch { setMsg('Publication impossible.') } finally { setBusy(false) }
  }
  async function voirVersion(v: DocVersion) {
    if (doc && v.id === doc.id) { setHistHtml(null); return }
    try { const d = await api<{ doc: { version: number; contenu_html: string | null } }>(`/synthese/version/${v.id}`); setHistHtml({ version: d.doc.version, html: d.doc.contenu_html || '' }) }
    catch { setMsg('Impossible de charger cette version.') }
  }
  async function envoyer() {
    const t = newMsg.trim()
    if (!t) return
    try { await api(`/synthese/dossier/${dossierId}/messages`, { method: 'POST', body: JSON.stringify({ texte: t }) }); setNewMsg(''); await loadMessages() }
    catch { setMsg('Message non envoyé. Réessaie.') }
  }

  const displayHtml = histHtml ? histHtml.html : doc?.contenu_html || ''
  const onHistory = histHtml != null

  return (
    <div className="modal-overlay" onMouseDown={() => !editing && onClose()}>
      <div className="modal cr-modal" role="dialog" aria-modal="true" aria-labelledby="syn-doc-title" tabIndex={-1} ref={dialogRef} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 id="syn-doc-title">Synthèse du parcours</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fermer">×</button>
        </div>
        <div className="modal-body">
          {loading ? (
            <p className="muted">Chargement…</p>
          ) : !doc ? (
            accompagnateur ? (
              <div className="cr-empty">
                <p className="muted">Aucune synthèse pour ce parcours.</p>
                <button className="btn btn-primary" disabled={busy} onClick={generer}>✨ Générer la synthèse (IA)</button>
                {busy && <p className="muted">Génération en cours…</p>}
              </div>
            ) : <p className="muted">La synthèse n’est pas encore disponible.</p>
          ) : (
            <>
              {accompagnateur && (
                <div className="cr-bar">
                  <span className={`cr-badge ${doc.publie ? 'pub' : 'draft'}`}>{doc.publie ? '✓ Publiée' : '• Brouillon'}</span>
                  <span className="muted cr-meta">v{doc.version} · {doc.source === 'ia' ? 'générée IA' : 'éditée'} · {shortDate(doc.genere_le)}</span>
                  <div className="cr-bar-actions">
                    {!editing && !onHistory && <button className="btn btn-ghost btn-sm" onClick={startEdit}>✎ Éditer</button>}
                    {!editing && !onHistory && <button className="btn btn-ghost btn-sm" disabled={busy} onClick={regenerer}>↻ Régénérer (IA)</button>}
                    {!editing && !onHistory && !doc.publie && <button className="btn btn-primary btn-sm" disabled={busy} onClick={publier}>📣 Publier</button>}
                  </div>
                </div>
              )}

              {accompagnateur && versions.length > 1 && !editing && (
                <div className="cr-hist">
                  <label>Historique :{' '}
                    <select value={onHistory ? versions.find((v) => v.version === histHtml!.version)?.id : doc.id} onChange={(e) => { const v = versions.find((x) => x.id === Number(e.target.value)); if (v) void voirVersion(v) }}>
                      {versions.map((v) => (<option key={v.id} value={v.id}>v{v.version} — {v.source === 'ia' ? 'IA' : 'éditée'} {v.publie ? '(publiée)' : ''} — {shortDate(v.genere_le)}</option>))}
                    </select>
                  </label>
                  {onHistory && <span className="muted"> (version archivée, lecture seule)</span>}
                </div>
              )}

              {msg && <p className="form-success cr-msg">{msg}</p>}

              {editing ? (
                <>
                  <RichTextEditor value={draft} onChange={setDraft} />
                  <div className="cr-edit-actions">
                    <button className="btn btn-ghost" disabled={busy} onClick={() => setEditing(false)}>Annuler</button>
                    <button className="btn btn-primary" disabled={busy} onClick={save}>💾 Enregistrer</button>
                  </div>
                </>
              ) : (
                <>
                  {displayHtml && <div className="cr-listen"><EcouterButton html={displayHtml} label="Écouter la synthèse" /></div>}
                  <HtmlContent className="cr-view" html={displayHtml} />
                </>
              )}

              {!editing && (
                <section className="cr-discussion">
                  <h3>💬 Échanges {accompagnateur ? <span className="muted">(avec l’accompagné)</span> : <span className="muted">(avec votre accompagnateur)</span>}</h3>
                  {!doc.publie && accompagnateur && <p className="muted">La discussion sera visible par l’accompagné une fois la synthèse publiée.</p>}
                  <div className="cr-msgs" ref={msgsRef}>
                    {messages.length === 0 && <p className="muted">Aucun message pour l’instant.</p>}
                    {messages.map((m) => (
                      <div key={m.id} className={`cr-msg-item ${m.is_me ? 'me' : ''}`}>
                        <div className="cr-msg-meta">{m.auteur_prenom || (m.auteur_role === 'accompagnateur' ? 'Accompagnateur' : 'Accompagné')} · {shortDate(m.cree_le)}</div>
                        <div className="cr-msg-text">{m.texte}</div>
                      </div>
                    ))}
                  </div>
                  <form className="cr-msg-form" onSubmit={(e) => { e.preventDefault(); void envoyer() }}>
                    <DictaInput value={newMsg} onChange={setNewMsg} placeholder="Écrire un message…" aria-label="Écrire un message" />
                    <button className="btn btn-primary" type="submit">Envoyer</button>
                  </form>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
