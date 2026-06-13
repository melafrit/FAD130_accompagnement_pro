import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'

let initialized = false
let seq = 0

/** Rend un diagramme Mermaid. Le contenu provient d'une page de wiki (rédigée par un admin = source de confiance). */
export default function WikiMermaid({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    if (!initialized) {
      // securityLevel 'loose' : autorise les sauts de ligne <br/> et les libellés HTML dans les
      // diagrammes. Acceptable car le contenu du wiki est rédigé par des admins (source de confiance)
      // et n'est rendu qu'à des admins.
      mermaid.initialize({ startOnLoad: false, securityLevel: 'loose', theme: 'default', fontFamily: 'inherit' })
      initialized = true
    }
    const id = `wikimmd-${++seq}`
    mermaid
      .render(id, code)
      .then(({ svg }) => {
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg
          setError('')
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
    return () => { cancelled = true }
  }, [code])

  if (error) {
    return (
      <div className="wiki-mermaid-error">
        <strong>Diagramme Mermaid invalide.</strong>
        <pre>{code}</pre>
      </div>
    )
  }
  return <div className="wiki-mermaid" ref={ref} role="img" aria-label="Diagramme" />
}
