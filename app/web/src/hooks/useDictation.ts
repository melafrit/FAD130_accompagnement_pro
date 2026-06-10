import { useEffect, useId, useRef, useState } from 'react'

/* eslint-disable @typescript-eslint/no-explicit-any */
// Dictée vocale PARTAGÉE : un seul SpeechRecognition pour toute l'app.
// Chaque champ s'enregistre via un id ; cliquer le micro d'un autre champ arrête le précédent
// puis lui passe la main (file d'attente `pending`). Robuste aux désabonnements et aux
// caprices de Chrome (stop()/start() rapprochés, onend non émis).

type Cbs = { onText: (t: string) => void; onInterim: (t: string) => void; onState: (active: boolean) => void; isMounted: () => boolean }

let rec: any = null
let activeId: string | null = null
let cbs: Cbs | null = null
let pending: { id: string; cbs: Cbs } | null = null
let stopping = false
let stopTimer: ReturnType<typeof setTimeout> | null = null

function dictationSupported(): boolean {
  return typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
}

function clearStopTimer() {
  if (stopTimer) { clearTimeout(stopTimer); stopTimer = null }
}

// Démarre le champ en file d'attente, avec un réessai différé si Chrome refuse un start() trop rapproché.
function startQueued(p: { id: string; cbs: Cbs }) {
  const r = rec
  if (!r || !p.cbs.isMounted()) { p.cbs.onState(false); return }
  activeId = p.id
  cbs = p.cbs
  try {
    r.start()
    p.cbs.onState(true)
  } catch {
    activeId = null
    cbs = null
    setTimeout(() => {
      if (activeId !== null || pending !== null) { p.cbs.onState(false); return } // un autre champ a pris la main
      if (!p.cbs.isMounted()) { p.cbs.onState(false); return } // champ démonté entre-temps : ne pas rouvrir le micro
      const r2 = rec
      if (!r2) { p.cbs.onState(false); return }
      activeId = p.id
      cbs = p.cbs
      try { r2.start(); p.cbs.onState(true) }
      catch { activeId = null; cbs = null; p.cbs.onState(false) }
    }, 200)
  }
}

// Reset dur : le moteur est bloqué (onend jamais émis) → on le détache et on en recrée un neuf.
function hardReset(old: any) {
  clearStopTimer()
  try { old.onend = null; old.onerror = null; old.abort() } catch { /* ignore */ }
  rec = null
  const p = pending
  pending = null
  cbs = null
  activeId = null
  stopping = false
  if (p) startDictation(p.id, p.cbs)
}

function ensureRec(): any {
  if (rec) return rec
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!SR) return null
  const r = new SR()
  r.lang = 'fr-FR'
  r.continuous = true
  r.interimResults = true
  r.onresult = (e: any) => {
    let interim = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i]
      if (res.isFinal) cbs?.onText(res[0].transcript) // espacement géré côté champ (pas de blanc en trop)
      else interim += res[0].transcript
    }
    cbs?.onInterim(interim)
  }
  const finish = () => {
    clearStopTimer()
    const prev = cbs
    cbs = null
    activeId = null
    stopping = false
    prev?.onState(false)
    const p = pending
    pending = null
    if (p) startQueued(p)
  }
  r.onend = finish
  r.onerror = finish
  rec = r
  return r
}

// Demande l'arrêt du moteur en cours et arme un garde-fou : si onend/onerror ne se déclenche
// jamais (onglet en arrière-plan, micro révoqué…), on force la reprise pour ne pas bloquer
// toutes les dictées futures (le drapeau `stopping` resterait sinon coincé).
function issueStop(r: any) {
  if (stopping) return
  stopping = true
  try { r.stop() } catch { /* ignore */ }
  clearStopTimer()
  stopTimer = setTimeout(() => {
    if (!stopping) return
    stopTimer = setTimeout(() => { if (stopping) hardReset(r) }, 600) // armé avant abort() pour qu'un onend synchrone l'annule
    try { r.abort() } catch { /* ignore */ }
  }, 1500)
}

function startDictation(id: string, c: Cbs): void {
  const r = ensureRec()
  if (!r) return
  if (!c.isMounted()) { c.onState(false); return } // champ déjà démonté (ex. reprise différée) : ne pas ouvrir le micro
  if (activeId === id) return
  if (activeId !== null) {
    // un autre champ dicte : on le met en file d'attente et on arrête le courant
    pending = { id, cbs: c }
    issueStop(r)
    return
  }
  activeId = id
  cbs = c
  try {
    r.start()
    c.onState(true)
  } catch {
    activeId = null
    cbs = null
    c.onState(false)
  }
}

function stopDictation(id: string): void {
  // 1) champ seulement EN FILE D'ATTENTE (pas encore actif) : on annule le démarrage prévu
  if (pending && pending.id === id) {
    const p = pending
    pending = null
    p.cbs.onState(false)
    return
  }
  // 2) champ actif : on arrête le moteur
  if (rec && activeId === id) {
    try { rec.stop() } catch { /* ignore */ }
  }
}

/** Hook de dictée pour un champ : renvoie l'état, la transcription en cours, et un toggle. */
export function useDictation(onText: (t: string) => void) {
  const id = useId()
  const [active, setActive] = useState(false)
  const [interim, setInterim] = useState('')
  const onTextRef = useRef(onText)
  onTextRef.current = onText
  const mountedRef = useRef(true)

  function toggle() {
    if (active) {
      stopDictation(id)
    } else {
      // Toutes les remontées sont gardées par mountedRef : un résultat tardif ne peut jamais
      // écrire dans un champ démonté (ni déclencher un setState sur un composant détruit).
      startDictation(id, {
        onText: (t) => { if (mountedRef.current) onTextRef.current(t) },
        onInterim: (t) => { if (mountedRef.current) setInterim(t) },
        onState: (a) => { if (mountedRef.current) { setActive(a); if (!a) setInterim('') } },
        isMounted: () => mountedRef.current,
      })
    }
  }

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false; stopDictation(id) }
  }, [id])

  return { supported: dictationSupported(), active, interim, toggle }
}
