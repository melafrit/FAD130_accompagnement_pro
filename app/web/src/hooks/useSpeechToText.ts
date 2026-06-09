import { useEffect, useRef, useState } from 'react'

/* eslint-disable @typescript-eslint/no-explicit-any */
// Transcription vocale via l'API Web Speech (webkitSpeechRecognition).
// Non typée par le DOM standard : on utilise `any` de façon contrôlée.
// `interim` expose la transcription EN COURS (résultats intermédiaires) pour un affichage temps réel ;
// le texte finalisé est, lui, transmis via onText (comportement inchangé).
export function useSpeechToText(onText: (t: string) => void) {
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [supported] = useState<boolean>(() => {
    const w = window as any
    return typeof window !== 'undefined' && !!(w.SpeechRecognition || w.webkitSpeechRecognition)
  })
  const recRef = useRef<any>(null)
  const onTextRef = useRef(onText)
  onTextRef.current = onText

  useEffect(() => {
    const w = window as any
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!SR) return
    const rec = new SR()
    rec.lang = 'fr-FR'
    rec.continuous = true
    rec.interimResults = true
    rec.onresult = (e: any) => {
      let inter = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]
        if (res.isFinal) onTextRef.current(res[0].transcript + ' ')
        else inter += res[0].transcript
      }
      setInterim(inter)
    }
    rec.onend = () => { setListening(false); setInterim('') }
    rec.onerror = () => { setListening(false); setInterim('') }
    recRef.current = rec
    return () => {
      try {
        rec.stop()
      } catch {
        /* ignore */
      }
    }
  }, [])

  function toggle() {
    const rec = recRef.current
    if (!rec) return
    if (listening) {
      try {
        rec.stop()
      } catch {
        /* ignore */
      }
      setListening(false)
      setInterim('')
    } else {
      try {
        rec.start()
        setListening(true)
      } catch {
        /* ignore */
      }
    }
  }

  return { listening, supported, interim, toggle }
}
