import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import HtmlContent from './HtmlContent'
import RichTextEditor from './RichTextEditor'
import DictaInput from './DictaInput'
import EcouterButton from './EcouterButton'
import FalcButton from './FalcButton'

interface CRCurrent { id: number; version: number; contenu_html: string | null; source: string; genere_le: string; publie: number }
interface CRVersion { id: number; version: number; source: string; genere_le: string; publie: number }
interface Message { id: number; auteur_id: number; auteur_prenom: string | null; auteur_role: string; texte: string; cree_le: string; is_me: boolean }

function shortDate(s: string | null) { return (s || '').slice(0, 16).replace('T', ' ') }

export default function CompteRenduModal({
  sessionId,
  role,
  onClose,
  onChanged,
}: {
  sessionId: number
  role: 'accompagnateur' | 'accompagne'
  onClose: () => void
  onChanged?: () => void
}) {
  const accompagnateur = role === 'accompagnateur'
  const [loading, setLoading] = useState(true)
  const [cr, setCr] = useState<CRCurrent | null>(null)
  const [versions, setVersions] = useState<CRVersion[]>([])
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [histHtml, setHistHtml] = useState<{ version: number; html: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [newMsg, setNewMsg] = useState('')
  const dialogRef = useRef<HTMLDivElement>(null)
  const msgsRef = useRef<HTMLDivElement>(null)

  const loadCr = useCallback(async () => {
    const d = await api<{ cr: CRCurrent | null; versions: CRVersion[] }>(`/cr/session/${sessionId}`)
    setCr(d.cr)
    setVersions(d.versions || [])
  }, [sessionId])
  const loadMessages = useCallback(async () => {
    try {
      const d = await api<{ messages: Message[] }>(`/cr/session/${sessionId}/messages`)
      setMessages(d.messages)
    } catch { /* discussion indisponible (CR non publié) */ }
  }, [sessionId])

  useEffect(() => {
    void (async () => {
      try { await loadCr(); await loadMessages() } finally { setLoading(false) }
    })()
  }, [loadCr, loadMessages])

  // Focus + verrou du défilement (au montage), restaurés à la fermeture
  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null
    dialogRef.current?.focus()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prevOverflow; prevFocus?.focus?.() }
  }, [])
  // Échap (désactivé en édition pour ne pas perdre les modifications)
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape' && !editing) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, editing])
  // Défile la discussion vers le dernier message
  useEffect(() => { if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight }, [messages.length])

  async function generer() {
    setBusy(true); setMsg('')
    try { await api('/cr/generer', { method: 'POST', body: JSON.stringify({ sessionId }) }); await loadCr(); onChanged?.() }
    catch { setMsg('Génération impossible.') } finally { setBusy(false) }
  }
  async function regenerer() {
    if (!window.confirm('Régénérer le compte rendu avec l’IA ? Cela crée une nouvelle version (tes modifications de la version courante sont conservées dans l’historique).')) return
    setEditing(false); setHistHtml(null)
    await generer()
  }
  function startEdit() {
    if (!cr) return
    setDraft(cr.contenu_html || '')
    setHistHtml(null)
    setEditing(true)
  }
  async function save() {
    if (!cr) return
    setBusy(true); setMsg('')
    try { await api(`/cr/version/${cr.id}`, { method: 'PATCH', body: JSON.stringify({ contenu_html: draft }) }); await loadCr(); setEditing(false); onChanged?.() }
    catch { setMsg('Enregistrement impossible.') } finally { setBusy(false) }
  }
  async function publier() {
    if (!cr) return
    setBusy(true); setMsg('')
    try { await api(`/cr/version/${cr.id}/publier`, { method: 'POST' }); await loadCr(); onChanged?.(); setMsg('Compte rendu publié — l’accompagné peut le consulter.') }
    catch { setMsg('Publication impossible.') } finally { setBusy(false) }
  }
  async function voirVersion(v: CRVersion) {
    if (cr && v.id === cr.id) { setHistHtml(null); return }
    try {
      const d = await api<{ cr: { version: number; contenu_html: string | null } }>(`/cr/version/${v.id}`)
      setHistHtml({ version: d.cr.version, html: d.cr.contenu_html || '' })
    } catch { setMsg('Impossible de charger cette version.') }
  }
  async function envoyer() {
    const t = newMsg.trim()
    if (!t) return
    try {
      await api(`/cr/session/${sessionId}/messages`, { method: 'POST', body: JSON.stringify({ texte: t }) })
      setNewMsg('')
      await loadMessages()
    } catch { setMsg('Message non envoyé. Réessaie.') }
  }

  const displayHtml = histHtml ? histHtml.html : cr?.contenu_html || ''
  const onHistory = histHtml != null

  return (
    <div className="modal-overlay" onMouseDown={() => !editing && onClose()}>
      <div className="modal cr-modal" role="dialog" aria-modal="true" aria-labelledby="cr-modal-title" tabIndex={-1} ref={dialogRef} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 id="cr-modal-title">Compte rendu d’entretien</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fermer">×</button>
        </div>

        <div className="modal-body">
          {loading ? (
            <p className="muted">Chargement…</p>
          ) : !cr ? (
            accompagnateur ? (
              <div className="cr-empty">
                <p className="muted">Aucun compte rendu pour cet entretien.</p>
                <button className="btn btn-primary" disabled={busy} onClick={generer}>✨ Générer le compte rendu (IA)</button>
                {busy && <p className="muted">Génération en cours…</p>}
              </div>
            ) : (
              <p className="muted">Le compte rendu n’est pas encore disponible.</p>
            )
          ) : (
            <>
              {accompagnateur && (
                <div className="cr-bar">
                  <span className={`cr-badge ${cr.publie ? 'pub' : 'draft'}`}>{cr.publie ? '✓ Publié' : '• Brouillon'}</span>
                  <span className="muted cr-meta">v{cr.version} · {cr.source === 'ia' ? 'généré IA' : 'édité'} · {shortDate(cr.genere_le)}</span>
                  <div className="cr-bar-actions">
                    {!editing && !onHistory && <button className="btn btn-ghost btn-sm" onClick={startEdit}>✎ Éditer</button>}
                    {!editing && !onHistory && <button className="btn btn-ghost btn-sm" disabled={busy} onClick={regenerer}>↻ Régénérer (IA)</button>}
                    {!editing && !onHistory && !cr.publie && <button className="btn btn-primary btn-sm" disabled={busy} onClick={publier}>📣 Publier</button>}
                  </div>
                </div>
              )}

              {accompagnateur && versions.length > 1 && !editing && (
                <div className="cr-hist">
                  <label>Historique :{' '}
                    <select value={onHistory ? versions.find((v) => v.version === histHtml!.version)?.id : cr.id} onChange={(e) => { const v = versions.find((x) => x.id === Number(e.target.value)); if (v) void voirVersion(v) }}>
                      {versions.map((v) => (
                        <option key={v.id} value={v.id}>v{v.version} — {v.source === 'ia' ? 'IA' : 'édité'} {v.publie ? '(publié)' : ''} — {shortDate(v.genere_le)}</option>
                      ))}
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
                  {displayHtml && (
                    <div className="cr-listen" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <EcouterButton html={displayHtml} label="Écouter le compte rendu" />
                      <FalcButton html={displayHtml} />
                    </div>
                  )}
                  <HtmlContent className="cr-view" html={displayHtml} />
                </>
              )}

              {/* Discussion */}
              {!editing && (
                <section className="cr-discussion">
                  <h3>💬 Échanges {accompagnateur ? <span className="muted">(avec l’accompagné)</span> : <span className="muted">(avec votre accompagnateur)</span>}</h3>
                  {!cr.publie && accompagnateur && <p className="muted">La discussion sera visible par l’accompagné une fois le compte rendu publié.</p>}
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
