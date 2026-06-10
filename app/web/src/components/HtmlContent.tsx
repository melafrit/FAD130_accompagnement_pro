import DOMPurify from 'dompurify'

// Affiche du HTML de façon sûre (assaini contre le XSS) — pour les comptes rendus, notes, etc.
export default function HtmlContent({ html, className }: { html: string; className?: string }) {
  const clean = DOMPurify.sanitize(html || '', { USE_PROFILES: { html: true } })
  return <div className={`html-content ${className || ''}`.trim()} dangerouslySetInnerHTML={{ __html: clean }} />
}
