import { useState } from 'react'
import { api } from '../../lib/api'
import WikiMarkdown from './WikiMarkdown'

export type WikiFullPage = {
  id: number; slug: string; categorie: string; titre: string; resume: string | null
  contenu_md: string; statut: string; ordre: number; maj_le: string
}

/** Éditeur Markdown avec aperçu live. Enregistre via PATCH /api/wiki/pages/:slug. */
export default function WikiEditor({ page, onSaved, onCancel }: { page: WikiFullPage; onSaved: (p: WikiFullPage) => void; onCancel: () => void }) {
  const [titre, setTitre] = useState(page.titre)
  const [categorie, setCategorie] = useState(page.categorie)
  const [resume, setResume] = useState(page.resume || '')
  const [statut, setStatut] = useState(page.statut)
  const [ordre, setOrdre] = useState(String(page.ordre))
  const [md, setMd] = useState(page.contenu_md || '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function save() {
    setSaving(true)
    setErr('')
    try {
      const d = await api<{ page: WikiFullPage }>(`/wiki/pages/${page.slug}`, {
        method: 'PATCH',
        body: JSON.stringify({ titre, categorie, resume, statut, ordre: Number(ordre) || 0, contenu_md: md }),
      })
      onSaved(d.page)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Échec de l’enregistrement')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="wiki-editor">
      <div className="wiki-editor-meta">
        <label className="field">
          <span>Titre</span>
          <input value={titre} onChange={(e) => setTitre(e.target.value)} />
        </label>
        <label className="field">
          <span>Catégorie</span>
          <input value={categorie} onChange={(e) => setCategorie(e.target.value)} />
        </label>
        <label className="field">
          <span>Statut</span>
          <select value={statut} onChange={(e) => setStatut(e.target.value)}>
            <option value="redige">Rédigé</option>
            <option value="partiel">À enrichir</option>
            <option value="brouillon">Brouillon</option>
            <option value="deprecie">Déprécié</option>
          </select>
        </label>
        <label className="field wiki-field-narrow">
          <span>Ordre</span>
          <input type="number" value={ordre} onChange={(e) => setOrdre(e.target.value)} />
        </label>
        <label className="field wiki-field-wide">
          <span>Résumé</span>
          <input value={resume} onChange={(e) => setResume(e.target.value)} />
        </label>
      </div>

      <div className="wiki-editor-split">
        <div className="wiki-editor-pane">
          <p className="wiki-editor-label">Markdown</p>
          <textarea
            className="wiki-editor-textarea"
            value={md}
            onChange={(e) => setMd(e.target.value)}
            spellCheck={false}
            aria-label="Contenu Markdown"
          />
        </div>
        <div className="wiki-editor-pane">
          <p className="wiki-editor-label">Aperçu</p>
          <div className="wiki-editor-preview">
            <WikiMarkdown markdown={md} />
          </div>
        </div>
      </div>

      {err && <p className="form-error">{err}</p>}
      <div className="wiki-editor-actions">
        <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
        <button className="btn btn-ghost" onClick={onCancel} disabled={saving}>Annuler</button>
      </div>
    </div>
  )
}
