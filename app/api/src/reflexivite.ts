import { Router, type Request, type Response } from 'express'
import { db } from './db'
import { requireAuth, requireRole } from './auth'
import { requireFeature } from './features'
import { PHASES } from './phases'
import { GRILLE } from './grille'

// Réflexivité (accompagnateur) :
//  - Bilan de pratique global : synthèse réflexive sur l'ensemble des parcours (IA + repli)
//  - Coach de posture contextuel : rappels par phase + analyse d'une question (ouverte/inductive)
//  - Débriefing réflexif à chaud : court retour guidé après un entretien (IA pour amorcer)
//  - Auto-confrontation / replay annoté : annotation moment par moment, avec amorce IA
const router = Router()
const KEY = process.env.ANTHROPIC_API_KEY
const MODEL = process.env.ANTHROPIC_MODEL_REPORT || 'claude-opus-4-8'
interface U { id: number; role: string }
const getUser = (req: Request) => (req as Request & { user?: U }).user as U
const ownsSession = (accId: number, sid: number) =>
  db.prepare('SELECT d.id AS dossier_id FROM sessions s JOIN dossiers d ON d.id=s.dossier_id WHERE s.id=? AND d.accompagnateur_id=?').get(sid, accId) as { dossier_id: number } | undefined

// Libellés des indicateurs de la grille (id -> texte)
const INDIC_LABEL: Record<string, string> = {}
for (const c of GRILLE) for (const i of c.indicateurs) INDIC_LABEL[i.id] = i.texte

async function callClaude(system: string, user: string, maxTokens = 1600): Promise<string | null> {
  if (!KEY) return null
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, messages: [{ role: 'user', content: [
        { type: 'text', text: system, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: user },
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
//  1. Bilan de pratique global
// ====================================================================================
interface Bilan { forces: string[]; axes: string[]; evolution: string; synthese: string; conseils: string[] }

function bilanContexte(accId: number): { scores: { indicateur: string; moy: number; n: number }[]; nbDossiers: number; nbEntretiens: number; miroirs: number } {
  const nbDossiers = (db.prepare('SELECT COUNT(*) n FROM dossiers WHERE accompagnateur_id=?').get(accId) as { n: number }).n
  const nbEntretiens = (db.prepare('SELECT COUNT(*) n FROM sessions s JOIN dossiers d ON d.id=s.dossier_id WHERE d.accompagnateur_id=?').get(accId) as { n: number }).n
  const miroirs = (db.prepare('SELECT COUNT(*) n FROM analyses_posture ap JOIN dossiers d ON d.id=ap.dossier_id WHERE d.accompagnateur_id=?').get(accId) as { n: number }).n
  const scores = db.prepare(
    `SELECT s.indicateur AS indicateur, AVG(s.score) AS moy, COUNT(*) AS n
     FROM auto_evaluation_scores s
     JOIN auto_evaluations e ON e.id=s.eval_id
     JOIN dossiers d ON d.id=e.dossier_id
     WHERE d.accompagnateur_id=? AND s.score IS NOT NULL
     GROUP BY s.indicateur HAVING n>0 ORDER BY moy DESC`,
  ).all(accId) as { indicateur: string; moy: number; n: number }[]
  return { scores, nbDossiers, nbEntretiens, miroirs }
}

export function bilanFallback(accId: number): Bilan {
  const { scores, nbDossiers, nbEntretiens } = bilanContexte(accId)
  const top = scores.slice(0, 3)
  const bottom = [...scores].reverse().slice(0, 3)
  const lbl = (id: string) => INDIC_LABEL[id] || id
  return {
    forces: top.map((s) => `${lbl(s.indicateur)} (${Math.round(s.moy)}/100)`),
    axes: bottom.map((s) => `${lbl(s.indicateur)} (${Math.round(s.moy)}/100)`),
    evolution: `Sur ${nbDossiers} parcours et ${nbEntretiens} entretiens, ma pratique se stabilise : des appuis nets sur le cadre et la structuration, des marges de progrès sur l’émergence et l’écoute du niveau psychologique.`,
    synthese: 'Mon positionnement combine un cadre solide et une posture d’écoute en construction. Mon enjeu central reste de faire émerger plutôt que d’apporter mes propres analyses.',
    conseils: ['Transformer systématiquement mes propositions en questions ouvertes', 'Accueillir davantage l’émotionnel et le niveau psychologique', 'Doser le conseil (attitudes de Porter) en fin d’entretien'],
  }
}

router.get('/bilan', requireAuth, requireRole('accompagnateur'), requireFeature('bilan_pratique'), (req: Request, res: Response) => {
  const me = getUser(req)
  const row = db.prepare('SELECT contenu, source, genere_le FROM bilans_pratique WHERE accompagnateur_id=?').get(me.id) as { contenu: string; source: string; genere_le: string } | undefined
  const ctx = bilanContexte(me.id)
  res.json({ bilan: row ? { ...JSON.parse(row.contenu), source: row.source, genere_le: row.genere_le } : null, base: { nbDossiers: ctx.nbDossiers, nbEntretiens: ctx.nbEntretiens, miroirs: ctx.miroirs, indicateurs: ctx.scores.length } })
})

router.post('/bilan', requireAuth, requireRole('accompagnateur'), requireFeature('bilan_pratique'), async (req: Request, res: Response) => {
  const me = getUser(req)
  const ctx = bilanContexte(me.id)
  let bilan: Bilan | null = null
  let source = 'ia'
  if (ctx.scores.length) {
    const system =
      "Tu aides un accompagnateur (UE FAD130, Cnam) à dresser un BILAN RÉFLEXIF GLOBAL de SA pratique, à partir de ses auto-évaluations agrégées sur plusieurs parcours. " +
      'Tu écris à la 1re personne (« je »), sans complaisance ni dévalorisation. Tu ne juges jamais les accompagnés.'
    const data = `Indicateurs (moyenne /100 sur ${ctx.nbDossiers} parcours, ${ctx.nbEntretiens} entretiens) :\n` +
      ctx.scores.map((s) => `- ${s.indicateur} ${INDIC_LABEL[s.indicateur] || ''} : ${Math.round(s.moy)}`).join('\n') +
      '\n\nRéponds en JSON STRICT : {"forces":["…"],"axes":["…"],"evolution":"…","synthese":"…","conseils":["…"]} (3 forces, 3 axes, 2-3 conseils concrets, en « je »).'
    bilan = extractJson<Bilan>(await callClaude(system, data, 1400))
  }
  if (!bilan) { bilan = bilanFallback(me.id); source = 'heuristique' }
  db.prepare(
    "INSERT INTO bilans_pratique (accompagnateur_id, contenu, source, genere_le) VALUES (?,?,?,datetime('now')) " +
    'ON CONFLICT(accompagnateur_id) DO UPDATE SET contenu=excluded.contenu, source=excluded.source, genere_le=datetime(\'now\')',
  ).run(me.id, JSON.stringify(bilan), source)
  res.json({ ...bilan, source })
})

// ====================================================================================
//  2. Coach de posture contextuel
// ====================================================================================
router.get('/coach/phase/:phase', requireAuth, requireRole('accompagnateur'), requireFeature('coach_posture'), (req: Request, res: Response) => {
  const ph = PHASES.find((p) => p.id === Number(req.params.phase))
  if (!ph) { res.status(404).json({ error: 'Phase inconnue' }); return }
  res.json({ phase: ph.id, titre: ph.titre, objectif: ph.objectif, vigilance: ph.vigilance, questions: ph.questions })
})

const OPEN_RE = /^(quel|quelle|comment|qu['’ ]|raconte|en quoi|pourquoi|à quoi|que pense|qu'attends|si tout|décris|parle-moi|dis-moi|qu'est|peux-tu)/i
const FERME_RE = /\b(est-ce que|as-tu|avez-vous|veux-tu|penses-tu|crois-tu|tu as|il faut|tu dois|tu devrais)\b/i
export function analyseQuestionFallback(q: string): { type: string; ouverte: boolean; remarque: string; reformulation: string | null } {
  const t = q.trim()
  const ouverte = OPEN_RE.test(t) && !FERME_RE.test(t)
  if (ouverte) return { type: 'ouverte', ouverte: true, remarque: 'Question ouverte et peu inductive : elle laisse la personne explorer.', reformulation: null }
  const induite = /\b(tu dois|il faut|tu devrais|ne penses-tu pas|c'est mieux)\b/i.test(t)
  return {
    type: induite ? 'inductive' : 'fermée',
    ouverte: false,
    remarque: induite ? 'Cette question suggère une réponse (induction) : elle oriente vers ta propre lecture.' : 'Question plutôt fermée (réponse oui/non) : elle limite l’exploration.',
    reformulation: `Qu’est-ce qui… ? / Comment… ? (reformule « ${t.slice(0, 60)} » en question ouverte)`,
  }
}
router.post('/coach/analyser', requireAuth, requireRole('accompagnateur'), requireFeature('coach_posture'), async (req: Request, res: Response) => {
  const q = String(req.body?.question || '').trim()
  if (!q) { res.status(400).json({ error: 'Question vide' }); return }
  const system =
    "Tu es un coach de posture d'accompagnement (UE FAD130). On te donne UNE question que l'accompagnateur s'apprête à poser. " +
    "Tu évalues si elle est OUVERTE et peu inductive (geste écologique), et tu proposes au besoin une reformulation ouverte. Bienveillant, bref."
  const ai = extractJson<{ type: string; ouverte: boolean; remarque: string; reformulation: string | null }>(
    await callClaude(system, `Question : « ${q} »\n\nRéponds en JSON STRICT : {"type":"ouverte|fermée|inductive","ouverte":true,"remarque":"… 1 phrase …","reformulation":"… ou null si déjà ouverte …"}`, 400),
  )
  res.json(ai || analyseQuestionFallback(q))
})

// ====================================================================================
//  3. Débriefing réflexif à chaud
// ====================================================================================
const DEBRIEF_QUESTIONS = [
  'Qu’est-ce qui s’est bien passé dans cet entretien ?',
  'Un moment de doute, de gêne ou de bascule ?',
  'Ma vigilance / mon intention pour la prochaine fois ?',
]
export function sessionTraces(sid: number): string {
  const ques = db.prepare('SELECT phase, texte, reponse FROM questions_entretien WHERE session_id=? ORDER BY id').all(sid) as { phase: string; texte: string; reponse: string | null }[]
  const notes = db.prepare('SELECT phase, texte_reponse FROM reponses WHERE session_id=? ORDER BY phase').all(sid) as { phase: string; texte_reponse: string | null }[]
  const parts: string[] = []
  PHASES.forEach((ph) => {
    const note = notes.find((n) => String(n.phase) === String(ph.id))?.texte_reponse
    const qs = ques.filter((q) => String(q.phase) === String(ph.id))
    if (!note && !qs.length) return
    let b = `### ${ph.titre}`
    if (qs.length) b += `\n${qs.map((q) => `• ${q.texte}${q.reponse ? ` → ${q.reponse}` : ''}`).join('\n')}`
    if (note) b += `\nNotes : ${note}`
    parts.push(b)
  })
  return parts.join('\n\n') || '(aucune trace)'
}
router.get('/debriefing/session/:sid', requireAuth, requireRole('accompagnateur'), requireFeature('debriefing'), (req: Request, res: Response) => {
  const me = getUser(req)
  const sid = Number(req.params.sid)
  if (!ownsSession(me.id, sid)) { res.status(404).json({ error: 'Entretien introuvable' }); return }
  const row = db.prepare('SELECT contenu, source, maj_le FROM debriefings WHERE session_id=?').get(sid) as { contenu: string; source: string; maj_le: string } | undefined
  res.json({ questions: DEBRIEF_QUESTIONS, debriefing: row ? { ...JSON.parse(row.contenu), source: row.source, maj_le: row.maj_le } : null })
})
router.post('/debriefing/session/:sid', requireAuth, requireRole('accompagnateur'), requireFeature('debriefing'), (req: Request, res: Response) => {
  const me = getUser(req)
  const sid = Number(req.params.sid)
  const owned = ownsSession(me.id, sid)
  if (!owned) { res.status(404).json({ error: 'Entretien introuvable' }); return }
  const reponses = Array.isArray(req.body?.reponses) ? req.body.reponses.map((x: unknown) => String(x ?? '')) : []
  db.prepare(
    "INSERT INTO debriefings (session_id, dossier_id, contenu, source, maj_le) VALUES (?,?,?,?,datetime('now')) " +
    'ON CONFLICT(session_id) DO UPDATE SET contenu=excluded.contenu, source=excluded.source, maj_le=datetime(\'now\')',
  ).run(sid, owned.dossier_id, JSON.stringify({ reponses }), 'manuel')
  res.json({ ok: true })
})
router.post('/debriefing/session/:sid/suggerer', requireAuth, requireRole('accompagnateur'), requireFeature('debriefing'), async (req: Request, res: Response) => {
  const me = getUser(req)
  const sid = Number(req.params.sid)
  if (!ownsSession(me.id, sid)) { res.status(404).json({ error: 'Entretien introuvable' }); return }
  const system = "Tu amorces le DÉBRIEFING RÉFLEXIF d'un accompagnateur juste après SON entretien (UE FAD130). Réponses courtes, à la 1re personne, à partir de SES traces. Il les modifiera ensuite."
  const ai = extractJson<{ reponses: string[] }>(
    await callClaude(system, `Traces :\n${sessionTraces(sid)}\n\nPour chacune de ces 3 questions, propose une amorce (1-2 phrases, en « je ») :\n${DEBRIEF_QUESTIONS.map((q, i) => `${i + 1}. ${q}`).join('\n')}\n\nJSON STRICT : {"reponses":["…","…","…"]}`, 600),
  )
  const reponses = ai && Array.isArray(ai.reponses) ? ai.reponses.slice(0, 3).map(String) : [
    'J’ai posé le cadre et fait raconter une situation concrète.',
    'Un moment où j’ai eu envie de donner la solution au lieu de questionner.',
    'La prochaine fois, je transforme mes propositions en questions ouvertes.',
  ]
  res.json({ reponses, source: ai ? 'ia' : 'heuristique' })
})

// ====================================================================================
//  4. Auto-confrontation / replay annoté
// ====================================================================================
interface Moment { ref: string; phase: number; titre: string; question: string; reponse: string; annotation: string }
export function momentsDeSession(sid: number): Moment[] {
  const ques = db.prepare('SELECT id, phase, texte, reponse FROM questions_entretien WHERE session_id=? ORDER BY id').all(sid) as { id: number; phase: string; texte: string; reponse: string | null }[]
  return ques.map((q) => {
    const ph = PHASES.find((p) => p.id === Number(q.phase))
    return { ref: `q${q.id}`, phase: Number(q.phase), titre: ph?.titre || `Phase ${Number(q.phase) + 1}`, question: q.texte, reponse: q.reponse || '', annotation: '' }
  })
}
router.get('/replay/session/:sid', requireAuth, requireRole('accompagnateur'), requireFeature('replay_annote'), (req: Request, res: Response) => {
  const me = getUser(req)
  const sid = Number(req.params.sid)
  if (!ownsSession(me.id, sid)) { res.status(404).json({ error: 'Entretien introuvable' }); return }
  const base = momentsDeSession(sid)
  const row = db.prepare('SELECT contenu, source, maj_le FROM replays WHERE session_id=?').get(sid) as { contenu: string; source: string; maj_le: string } | undefined
  const saved = row ? (JSON.parse(row.contenu).moments as Moment[]) : []
  const moments = base.map((m) => ({ ...m, annotation: saved.find((s) => s.ref === m.ref)?.annotation || '' }))
  res.json({ moments, source: row?.source || null, maj_le: row?.maj_le || null })
})
router.post('/replay/session/:sid', requireAuth, requireRole('accompagnateur'), requireFeature('replay_annote'), (req: Request, res: Response) => {
  const me = getUser(req)
  const sid = Number(req.params.sid)
  const owned = ownsSession(me.id, sid)
  if (!owned) { res.status(404).json({ error: 'Entretien introuvable' }); return }
  const moments = Array.isArray(req.body?.moments)
    ? req.body.moments.map((m: { ref?: unknown; annotation?: unknown }) => ({ ref: String(m.ref ?? ''), annotation: String(m.annotation ?? '') }))
    : []
  db.prepare(
    "INSERT INTO replays (session_id, dossier_id, contenu, source, maj_le) VALUES (?,?,?,?,datetime('now')) " +
    'ON CONFLICT(session_id) DO UPDATE SET contenu=excluded.contenu, source=excluded.source, maj_le=datetime(\'now\')',
  ).run(sid, owned.dossier_id, JSON.stringify({ moments }), 'manuel')
  res.json({ ok: true })
})
// Amorce IA de l'auto-confrontation : propose une annotation par moment (l'accompagnateur les modifie puis enregistre)
router.post('/replay/session/:sid/initialiser', requireAuth, requireRole('accompagnateur'), requireFeature('replay_annote'), async (req: Request, res: Response) => {
  const me = getUser(req)
  const sid = Number(req.params.sid)
  if (!ownsSession(me.id, sid)) { res.status(404).json({ error: 'Entretien introuvable' }); return }
  const base = momentsDeSession(sid)
  if (!base.length) { res.json({ moments: base, source: 'heuristique' }); return }
  const system =
    "Tu amorces une AUTO-CONFRONTATION : pour chaque moment (question posée par l'accompagnateur), tu proposes une courte annotation réflexive à la 1re personne " +
    "(« ici je… »), centrée sur SA posture (induction, ouverture, écoute, cadre). L'accompagnateur modifiera ensuite. Bref, sans juger l'accompagné."
  const liste = base.map((m, i) => `${i}. [${m.titre}] « ${m.question} »`).join('\n')
  const ai = extractJson<{ annotations: string[] }>(
    await callClaude(system, `Moments :\n${liste}\n\nJSON STRICT : {"annotations":["… moment 0 …","… moment 1 …", …]} (une entrée par moment, 1 phrase chacune, en « je »).`, 1200),
  )
  const ann = ai && Array.isArray(ai.annotations) ? ai.annotations.map(String) : []
  const moments = base.map((m, i) => ({ ...m, annotation: ann[i] || (OPEN_RE.test(m.question) ? 'Ici je pose une question ouverte qui laisse explorer.' : 'Ici ma question est plutôt fermée : je pourrais l’ouvrir davantage.') }))
  res.json({ moments, source: ai ? 'ia' : 'heuristique' })
})

export default router
