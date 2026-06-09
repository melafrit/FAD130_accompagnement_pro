import { useEffect, useState } from 'react'

/** Barre de progression indéterminée + libellé d'étape qui défile, pendant un appel à l'IA. */
export default function AiProgress({ steps }: { steps: string[] }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (steps.length <= 1) return
    const t = setInterval(() => setI((x) => (x + 1) % steps.length), 1800)
    return () => clearInterval(t)
  }, [steps.length])
  return (
    <div className="aiprog" role="status" aria-live="polite">
      <div className="aiprog-track"><span className="aiprog-bar" /></div>
      <p className="aiprog-label">✨ {steps[i] || 'L’IA travaille…'}</p>
    </div>
  )
}
