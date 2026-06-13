import { type RefObject, useEffect, useState } from 'react'

type Item = { id: string; text: string; level: number }

/** Sommaire auto : lit les titres h2/h3 (avec ancre rehype-slug) rendus dans le conteneur de contenu. */
export default function WikiToc({ containerRef, markdown }: { containerRef: RefObject<HTMLElement>; markdown: string }) {
  const [items, setItems] = useState<Item[]>([])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const collect = () => {
      const hs = Array.from(el.querySelectorAll('h2, h3')) as HTMLElement[]
      setItems(hs.filter((h) => h.id).map((h) => ({ id: h.id, text: h.textContent || '', level: h.tagName === 'H2' ? 2 : 3 })))
    }
    const t = setTimeout(collect, 60)
    return () => clearTimeout(t)
  }, [markdown, containerRef])

  if (items.length < 2) return null
  return (
    <nav className="wiki-toc" aria-label="Sommaire de la page">
      <p className="wiki-toc-title">Sur cette page</p>
      <ul>
        {items.map((it) => (
          <li key={it.id} className={`wiki-toc-l${it.level}`}>
            <a
              href={`#${it.id}`}
              onClick={(e) => { e.preventDefault(); document.getElementById(it.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}
            >
              {it.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
