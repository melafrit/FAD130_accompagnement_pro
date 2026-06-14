import { useEffect, useRef, useState } from 'react'
import DOMPurify from 'dompurify'
import { useFeature } from '../features/FeaturesContext'

// Lecture vocale d'un contenu HTML via la synthèse vocale du navigateur (gratuit, hors-ligne).
function htmlToText(html: string): string {
  // Défense : on assainit AVANT d'écrire dans innerHTML — sans cela, un nœud détaché contenant
  // p.ex. <img onerror=…> pourrait déclencher du code. On ne lit ensuite que le texte.
  const clean = DOMPurify.sanitize(html || '', { USE_PROFILES: { html: true } })
  const div = document.createElement('div')
  div.innerHTML = clean
  return (div.textContent || '').replace(/\s+/g, ' ').trim()
}

export default function EcouterButton({ html, label = 'Écouter' }: { html: string; label?: string }) {
  const [speaking, setSpeaking] = useState(false)
  const audioActif = useFeature('audio')
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const startedRef = useRef(false)

  // Coupe la lecture si le composant est démonté (fermeture de la popup).
  useEffect(() => () => { if (supported && startedRef.current) window.speechSynthesis.cancel() }, [supported])

  if (!supported || !audioActif) return null

  function toggle() {
    const synth = window.speechSynthesis
    if (speaking) { synth.cancel(); setSpeaking(false); return }
    const text = htmlToText(html)
    if (!text) return
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'fr-FR'
    const fr = synth.getVoices().find((v) => v.lang?.toLowerCase().startsWith('fr'))
    if (fr) u.voice = fr
    u.rate = 1
    u.onend = () => setSpeaking(false)
    u.onerror = () => setSpeaking(false)
    synth.cancel()
    synth.speak(u)
    startedRef.current = true
    setSpeaking(true)
  }

  return (
    <button type="button" className="btn btn-ghost btn-sm" onClick={toggle} aria-pressed={speaking}
      title={speaking ? 'Arrêter la lecture' : 'Lire à voix haute'}>
      {speaking ? '⏹ Arrêter' : `🔊 ${label}`}
    </button>
  )
}
