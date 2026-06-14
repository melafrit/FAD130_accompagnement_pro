import { Router, type Request, type Response } from 'express'
import { requireAuth } from './auth'
import { getFlag } from './settings'
import { recordDependency } from './depStatus'

// Adoption & accessibilité :
//  - Mode FALC (Facile À Lire et à Comprendre) : reformulation IA d'un texte en langage simple
//    (le volet « UI simplifiée » est géré côté client). Repli déterministe sans IA.
const router = Router()
const KEY = process.env.ANTHROPIC_API_KEY
const MODEL = process.env.ANTHROPIC_MODEL_REPORT || 'claude-opus-4-8'

export const strip = (html: string) => (html || '').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim()

async function callClaude(system: string, user: string, maxTokens = 1200): Promise<string | null> {
  if (!KEY) return null
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, messages: [{ role: 'user', content: [
        { type: 'text', text: system, cache_control: { type: 'ephemeral' } }, { type: 'text', text: user },
      ] }] }),
    })
    if (!res.ok) { recordDependency('claude', false, `HTTP ${res.status}`); return null }
    const data = (await res.json()) as { content?: { type: string; text?: string }[] }
    recordDependency('claude', true)
    return (data.content || []).filter((b) => b.type === 'text').map((b) => b.text || '').join('').trim() || null
  } catch (e) { recordDependency('claude', false, e instanceof Error ? e.message : String(e)); return null }
}

// Repli déterministe : découpe en phrases courtes, présentées en puces.
export function falcFallback(texte: string): string {
  const phrases = texte.split(/(?<=[.!?])\s+/).map((p) => p.trim()).filter((p) => p.length > 3)
  return phrases.slice(0, 12).map((p) => `• ${p}`).join('\n')
}

router.post('/falc', requireAuth, async (req: Request, res: Response) => {
  // Le mode FALC est piloté par un réglage GLOBAL admin (et non plus par le plan d'abonnement) :
  // désactivé par défaut pour tout le monde, activable par l'administrateur.
  if (!getFlag('falc_enabled')) {
    res.status(403).json({ error: 'Le mode « facile à lire » n’est pas activé.' })
    return
  }
  const texte = strip(String(req.body?.texte ?? req.body?.html ?? ''))
  if (!texte) { res.status(400).json({ error: 'Texte vide' }); return }
  const system =
    'Tu réécris un texte en FALC (Facile À Lire et à Comprendre). Règles : une seule idée par phrase, phrases courtes, ' +
    'mots simples et courants, voix active, pas de jargon, pas de sigles non expliqués. Tu gardes tout le sens. ' +
    'Tu peux utiliser des puces. Tu réponds uniquement avec le texte réécrit, en français.'
  const out = await callClaude(system, `Réécris ce texte en facile à lire :\n\n${texte.slice(0, 4000)}`, 1200)
  // Garantit une sortie non vide : IA, sinon repli heuristique, sinon le texte d'entrée lui-même
  // (le repli peut être vide pour une entrée sans phrase « réelle », ex. « a,b »).
  res.json({ texte: out || falcFallback(texte) || texte, source: out ? 'ia' : 'heuristique' })
})

export default router
