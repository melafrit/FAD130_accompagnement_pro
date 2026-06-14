import { type ReactNode, isValidElement } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github.css'
import WikiMermaid from './WikiMermaid'

function childClassName(children: ReactNode): string {
  const child = Array.isArray(children) ? children[0] : children
  if (isValidElement(child)) return (child.props as { className?: string }).className || ''
  return ''
}
function childText(children: ReactNode): string {
  const child = Array.isArray(children) ? children[0] : children
  if (isValidElement(child)) {
    const c = (child.props as { children?: ReactNode }).children
    return typeof c === 'string' ? c : Array.isArray(c) ? c.join('') : String(c ?? '')
  }
  return ''
}

/** Rendu Markdown du wiki : tableaux GFM, coloration de code, diagrammes Mermaid, liens internes par slug.
 *  `trusted` : true sur les surfaces admin (rendu Mermaid en 'loose'). Par défaut false → 'strict'
 *  (la page partagée publiquement ne passe pas `trusted`). */
export default function WikiMarkdown({ markdown, trusted = false }: { markdown: string; trusted?: boolean }) {
  const nav = useNavigate()
  return (
    <div className="wiki-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug, rehypeHighlight]}
        components={{
          // Les blocs ```mermaid sont rendus en SVG ; les autres blocs gardent leur <pre> (coloré).
          pre({ children, ...props }) {
            if (childClassName(children).includes('language-mermaid')) {
              return <WikiMermaid code={childText(children).trim()} trusted={trusted} />
            }
            return <pre {...props}>{children}</pre>
          },
          // Tableaux GFM : encapsulés pour le défilement horizontal sur petits écrans.
          table({ children, ...props }) {
            return (
              <div className="wiki-table-wrap">
                <table {...props}>{children}</table>
              </div>
            )
          },
          a({ href, children, ...props }) {
            const h = href || ''
            const external = /^https?:\/\//i.test(h) || h.startsWith('mailto:')
            const anchor = h.startsWith('#')
            if (h && !external && !anchor) {
              const slug = h.replace(/^\.?\//, '').replace(/\.md$/, '').replace(/^\/+/, '')
              const to = `/admin/wiki/${slug}`
              return (
                <a
                  href={to}
                  onClick={(e) => { e.preventDefault(); nav(to) }}
                  {...props}
                >
                  {children}
                </a>
              )
            }
            return (
              <a href={h} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined} {...props}>
                {children}
              </a>
            )
          },
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  )
}
