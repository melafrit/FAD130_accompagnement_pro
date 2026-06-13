import { Router, type Request, type Response } from 'express'
import { db } from './db'
import { requireAuth } from './auth'
import { requireFeature } from './features'

// Visualisation & émotionnel :
//  - Nuage de thèmes / carte mentale d'un parcours (IA + repli par fréquence)
//  - Roue des émotions : outil distinct de la météo (émotions catégorisées)
const router = Router()
const KEY = process.env.ANTHROPIC_API_KEY
const MODEL = process.env.ANTHROPIC_MODEL_REPORT || 'claude-opus-4-8'
interface U { id: number; role: string }
const getUser = (req: Request) => (req as Request & { user?: U }).user as U
// Propriété par l'une ou l'autre des parties (accompagné OU accompagnateur du dossier)
const ownEither = (uid: number, did: number) =>
  db.prepare('SELECT id FROM dossiers WHERE id=? AND (accompagne_id=? OR accompagnateur_id=?)').get(did, uid, uid) as { id: number } | undefined

async function callClaude(system: string, user: string, maxTokens = 1000): Promise<string | null> {
  if (!KEY) return null
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, messages: [{ role: 'user', content: [
        { type: 'text', text: system, cache_control: { type: 'ephemeral' } }, { type: 'text', text: user },
      ] }] }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { content?: { type: string; text?: string }[] }
    return (data.content || []).filter((b) => b.type === 'text').map((b) => b.text || '').join('') || null
  } catch { return null }
}
export function extractJson<T>(text: string | null): T | null {
  if (!text) return null
  const a = text.indexOf('{'), b = text.lastIndexOf('}')
  if (a < 0 || b < 0) return null
  try { return JSON.parse(text.slice(a, b + 1)) as T } catch { return null }
}

// ====================================================================================
//  1. Nuage de thèmes
// ====================================================================================
interface Theme { mot: string; poids: number }
export const strip = (html: string) => (html || '').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ')
function texteDossier(did: number): string {
  const parts: string[] = []
  const q = db.prepare('SELECT cr_recap FROM questionnaires_initiaux WHERE dossier_id=?').get(did) as { cr_recap: string | null } | undefined
  if (q?.cr_recap) parts.push(q.cr_recap)
  const crs = db.prepare("SELECT contenu_html FROM comptes_rendus cr JOIN sessions s ON s.id=cr.session_id WHERE s.dossier_id=? AND cr.publie=1").all(did) as { contenu_html: string | null }[]
  crs.forEach((c) => c.contenu_html && parts.push(strip(c.contenu_html)))
  const notes = db.prepare('SELECT texte_reponse FROM reponses r JOIN sessions s ON s.id=r.session_id WHERE s.dossier_id=?').all(did) as { texte_reponse: string | null }[]
  notes.forEach((n) => n.texte_reponse && parts.push(n.texte_reponse))
  const jour = db.prepare('SELECT texte FROM journal_entrees WHERE dossier_id=? AND partage=1').all(did) as { texte: string }[]
  jour.forEach((j) => parts.push(j.texte))
  const fil = db.prepare("SELECT contenu FROM emergence WHERE dossier_id=? AND type='fil_rouge'").get(did) as { contenu: string } | undefined
  if (fil) { try { const f = JSON.parse(fil.contenu) as { fil?: string; axes?: string[] }; parts.push(f.fil || '', ...(f.axes || [])) } catch { /* ignore */ } }
  return parts.join('\n')
}
const STOP = new Set('le la les un une des de du au aux et ou à a en dans pour par sur avec sans sous que qui quoi dont où ce cet cette ces mon ma mes ton ta tes son sa ses se sa il elle ils elles je tu nous vous on ne pas plus moins très bien plus est sont été être avoir fait faire suis tout tous toute toutes comme mais donc car si quand leur leurs lui me te se y d l n s c j qu aussi entre vers chez son the of and'.split(/\s+/))
export function nuageFallback(did: number): { themes: Theme[] } {
  const txt = texteDossier(did).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const freq: Record<string, number> = {}
  for (const w of txt.split(/[^a-z'-]+/i)) {
    const m = w.replace(/^['-]+|['-]+$/g, '')
    if (m.length < 4 || STOP.has(m)) continue
    freq[m] = (freq[m] || 0) + 1
  }
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 24)
  const max = sorted[0]?.[1] || 1
  return { themes: sorted.map(([mot, n]) => ({ mot, poids: Math.max(1, Math.round((n / max) * 10)) })) }
}

router.get('/nuage/dossier/:id', requireAuth, requireFeature('nuage_themes'), (req: Request, res: Response) => {
  const me = getUser(req)
  const did = Number(req.params.id)
  if (!ownEither(me.id, did)) { res.status(404).json({ error: 'Parcours introuvable' }); return }
  const row = db.prepare('SELECT contenu, source, genere_le FROM nuages_themes WHERE dossier_id=?').get(did) as { contenu: string; source: string; genere_le: string } | undefined
  res.json({ nuage: row ? { ...JSON.parse(row.contenu), source: row.source, genere_le: row.genere_le } : null })
})

router.post('/nuage/dossier/:id', requireAuth, requireFeature('nuage_themes'), async (req: Request, res: Response) => {
  const me = getUser(req)
  const did = Number(req.params.id)
  if (!ownEither(me.id, did)) { res.status(404).json({ error: 'Parcours introuvable' }); return }
  const txt = texteDossier(did)
  let result: { themes: Theme[] } | null = null
  let source = 'ia'
  if (txt.trim().length > 80) {
    const system = "Tu extrais les THÈMES saillants d'un parcours d'accompagnement de mémoire (UE FAD130) pour un nuage de thèmes. Mots ou expressions courtes, pondérés selon leur importance."
    const ai = extractJson<{ themes: Theme[] }>(await callClaude(system, `Texte du parcours :\n${txt.slice(0, 6000)}\n\nJSON STRICT : {"themes":[{"mot":"…","poids":1-10}]} (12 à 20 thèmes, poids = importance).`, 800))
    if (ai && Array.isArray(ai.themes) && ai.themes.length) result = { themes: ai.themes.filter((t) => t.mot).slice(0, 24).map((t) => ({ mot: String(t.mot), poids: Math.max(1, Math.min(10, Number(t.poids) || 1)) })) }
  }
  if (!result) { result = nuageFallback(did); source = 'heuristique' }
  db.prepare(
    "INSERT INTO nuages_themes (dossier_id, contenu, source, genere_le) VALUES (?,?,?,datetime('now')) " +
    'ON CONFLICT(dossier_id) DO UPDATE SET contenu=excluded.contenu, source=excluded.source, genere_le=datetime(\'now\')',
  ).run(did, JSON.stringify(result), source)
  res.json({ ...result, source })
})

// ====================================================================================
//  2. Roue des émotions (outil distinct de la météo)
// ====================================================================================
// Familles d'émotions (clé -> famille). Sert à valider les sélections côté serveur.
export const EMOTIONS: Record<string, string> = {
  fier: 'joie', confiant: 'joie', enthousiaste: 'joie', soulage: 'joie',
  inquiet: 'peur', stresse: 'peur', depasse: 'peur',
  decourage: 'tristesse', seul: 'tristesse', decu: 'tristesse',
  frustre: 'colere', agace: 'colere',
  etonne: 'surprise', curieux: 'surprise',
  serein: 'calme', pose: 'calme',
}
export const sanitizeEmotions = (arr: unknown): string[] => (Array.isArray(arr) ? [...new Set(arr.map(String).filter((e) => e in EMOTIONS))] : [])

router.get('/emotions/catalogue', requireAuth, requireFeature('roue_emotions'), (_req: Request, res: Response) => {
  res.json({ emotions: Object.entries(EMOTIONS).map(([cle, famille]) => ({ cle, famille })) })
})

router.get('/emotions/dossier/:id', requireAuth, requireFeature('roue_emotions'), (req: Request, res: Response) => {
  const me = getUser(req)
  const did = Number(req.params.id)
  if (!ownEither(me.id, did)) { res.status(404).json({ error: 'Parcours introuvable' }); return }
  const rows = db.prepare('SELECT id, role, emotions, note, cree_le FROM emotions_roue WHERE dossier_id=? ORDER BY cree_le DESC LIMIT 30').all(did) as { id: number; role: string; emotions: string; note: string | null; cree_le: string }[]
  const entries = rows.map((r) => ({ id: r.id, role: r.role, emotions: JSON.parse(r.emotions) as string[], note: r.note, cree_le: r.cree_le }))
  const agg: Record<string, number> = {}
  for (const e of entries) for (const k of e.emotions) agg[k] = (agg[k] || 0) + 1
  res.json({ entries, aggregate: agg })
})

router.post('/emotions/dossier/:id', requireAuth, requireFeature('roue_emotions'), (req: Request, res: Response) => {
  const me = getUser(req)
  const did = Number(req.params.id)
  if (!ownEither(me.id, did)) { res.status(404).json({ error: 'Parcours introuvable' }); return }
  const emotions = sanitizeEmotions(req.body?.emotions)
  if (!emotions.length) { res.status(400).json({ error: 'Sélectionne au moins une émotion' }); return }
  const note = req.body?.note != null ? String(req.body.note).slice(0, 200) : null
  db.prepare('INSERT INTO emotions_roue (dossier_id, auteur_id, role, emotions, note) VALUES (?,?,?,?,?)').run(did, me.id, me.role, JSON.stringify(emotions), note)
  res.status(201).json({ ok: true })
})

export default router
