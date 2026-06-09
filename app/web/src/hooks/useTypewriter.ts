import { useEffect, useRef, useState } from 'react'

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Effet « machine à écrire » : pour une liste de segments de texte, renvoie le nombre de
 * caractères révélés par segment. Redémarre quand le contenu change ; nettoie le timer.
 * cps = caractères par seconde.
 */
export function useTypewriter(texts: string[], cps = 48): number[] {
  const total = texts.reduce((a, t) => a + t.length, 0)
  const key = texts.join('')
  const [n, setN] = useState(total)

  // Reset SYNCHRONE au changement de contenu (pendant le rendu) : évite qu'une frame n'affiche
  // l'ancien compteur (texte complet) avec le nouveau texte avant que l'effet ne remette à 0.
  const prevKey = useRef(key)
  if (prevKey.current !== key) {
    prevKey.current = key
    setN(reducedMotion() || total === 0 ? total : 0)
  }

  useEffect(() => {
    if (reducedMotion() || total === 0) {
      setN(total)
      return
    }
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const revealed = Math.floor(((now - start) / 1000) * cps)
      setN(Math.min(total, revealed))
      if (revealed < total) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  // répartit les n caractères révélés sur les segments, dans l'ordre
  const out: number[] = []
  let rem = n
  for (const t of texts) {
    const c = Math.max(0, Math.min(t.length, rem))
    out.push(c)
    rem -= t.length
  }
  return out
}
