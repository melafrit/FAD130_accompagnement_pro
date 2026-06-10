import { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

// Éditeur de texte riche (TipTap) — produit du HTML. StarterKit fournit gras/italique/souligné/
// titres/listes/historique. `value`/`onChange` le rendent contrôlé (HTML).
export default function RichTextEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || '',
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

  // Synchronise un changement externe (régénération IA, bascule de version) sans casser la frappe
  useEffect(() => {
    if (editor && value !== editor.getHTML()) editor.commands.setContent(value || '')
  }, [value, editor])

  if (!editor) return <div className="rte rte-loading" />

  const cls = (active: boolean) => `rte-btn${active ? ' on' : ''}`
  return (
    <div className="rte">
      <div className="rte-toolbar">
        <button type="button" className={cls(editor.isActive('bold'))} onClick={() => editor.chain().focus().toggleBold().run()} title="Gras" aria-label="Gras"><strong>G</strong></button>
        <button type="button" className={cls(editor.isActive('italic'))} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italique" aria-label="Italique"><em>I</em></button>
        <button type="button" className={cls(editor.isActive('underline'))} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Souligné" aria-label="Souligné"><u>S</u></button>
        <span className="rte-sep" aria-hidden="true" />
        <button type="button" className={cls(editor.isActive('heading', { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Titre" aria-label="Titre">T₁</button>
        <button type="button" className={cls(editor.isActive('heading', { level: 3 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Sous-titre" aria-label="Sous-titre">T₂</button>
        <span className="rte-sep" aria-hidden="true" />
        <button type="button" className={cls(editor.isActive('bulletList'))} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Liste à puces" aria-label="Liste à puces">•</button>
        <button type="button" className={cls(editor.isActive('orderedList'))} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Liste numérotée" aria-label="Liste numérotée">1.</button>
        <span className="rte-sep" aria-hidden="true" />
        <button type="button" className="rte-btn" onClick={() => editor.chain().focus().undo().run()} title="Annuler" aria-label="Annuler">↶</button>
        <button type="button" className="rte-btn" onClick={() => editor.chain().focus().redo().run()} title="Rétablir" aria-label="Rétablir">↷</button>
      </div>
      <EditorContent editor={editor} className="rte-content" />
    </div>
  )
}
