import { useState } from 'react'

/** Actions d'export d'une page : impression (PDF navigateur), Markdown, DOCX et PDF serveur (pandoc). */
export default function WikiExportActions({ slug }: { slug: string }) {
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')

  async function download(ext: 'md' | 'docx' | 'pdf') {
    setBusy(ext)
    setMsg('')
    try {
      const res = await fetch(`/api/wiki/export/${slug}.${ext}`, { credentials: 'include' })
      const ct = res.headers.get('content-type') || ''
      if (!res.ok || ct.includes('application/json')) {
        const j = await res.json().catch(() => ({}))
        setMsg(j.error || `Export ${ext.toUpperCase()} indisponible.`)
        return
      }
      const blob = await res.blob()
      const href = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = href
      a.download = `boussole-${slug}.${ext}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(href)
    } catch {
      setMsg('Téléchargement impossible.')
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="wiki-export">
      <button className="btn btn-ghost btn-sm" onClick={() => window.print()} title="Imprimer ou enregistrer en PDF">🖨 Imprimer</button>
      <button className="btn btn-ghost btn-sm" disabled={busy === 'md'} onClick={() => download('md')}>⬇ Markdown</button>
      <button className="btn btn-ghost btn-sm" disabled={busy === 'docx'} onClick={() => download('docx')}>{busy === 'docx' ? '…' : '⬇ DOCX'}</button>
      <button className="btn btn-ghost btn-sm" disabled={busy === 'pdf'} onClick={() => download('pdf')}>{busy === 'pdf' ? '…' : '⬇ PDF'}</button>
      {msg && <span className="wiki-export-msg" role="status">{msg}</span>}
    </div>
  )
}
