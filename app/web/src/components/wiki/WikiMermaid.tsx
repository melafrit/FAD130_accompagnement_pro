import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'

let currentLevel: 'loose' | 'strict' | null = null
let seq = 0

/**
 * Rend un diagramme Mermaid.
 * `trusted` : pages d'administration (contenu rédigé par un admin = source de confiance) →
 * securityLevel 'loose' (autorise <br/> et libellés HTML). Par défaut `false` (ex. page
 * partagée publiquement, servie SANS authentification) → securityLevel 'strict' qui encode
 * le HTML des libellés et désactive les interactions — durcissement de la surface publique.
 * Tous les diagrammes d'une même page partagent le même contexte, donc pas de conflit de config.
 */
export default function WikiMermaid({ code, trusted = false }: { code: string; trusted?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const level: 'loose' | 'strict' = trusted ? 'loose' : 'strict'
    if (currentLevel !== level) {
      mermaid.initialize({ startOnLoad: false, securityLevel: level, theme: 'default', fontFamily: 'inherit' })
      currentLevel = level
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
  }, [code, trusted])

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
