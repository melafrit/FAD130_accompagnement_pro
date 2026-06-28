import { Router, type Request, type Response } from 'express'
import { db } from './db'
import { requireAuth, requireRole } from './auth'
import { GRILLE, ZONES, INDICATEUR_IDS } from './grille'
import { PHASES } from './phases'

const router = Router()
const KEY = process.env.ANTHROPIC_API_KEY
const MODEL = process.env.ANTHROPIC_MODEL_REPORT || 'claude-opus-4-8'

interface U { id: number; role: string }
function getUser(req: Request): U {
  return (req as Request & { user?: U }).user as U
}
function owns(accId: number, dossierId: number): { accompagne_id: number } | undefined {
  return db.prepare('SELECT accompagne_id FROM dossiers WHERE id=? AND accompagnateur_id=?').get(dossierId, accId) as
    | { accompagne_id: number }
    | undefined
}

interface ScoreIn { indicateur: string; score: number | null; commentaire: string | null }
type ScoreMap = Record<string, { score: number | null; commentaire: string | null }>

function clampScore(v: unknown): number | null {
  return typeof v === 'number' && isFinite(v) ? Math.max(0, Math.min(100, v)) : null
}

// Sous-score d'un critère, sur son barème officiel (7, 7 ou 6 points) :
// moyenne de ses indicateurs notés (0–100) ramenée à ses points.
function critereScore(map: ScoreMap, c: (typeof GRILLE)[number]): number | null {
  const vals = c.indicateurs.map((i) => map[i.id]?.score).filter((v): v is number => typeof v === 'number')
  if (!vals.length) return null
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length
  return Math.round((avg / 100) * c.points * 10) / 10
}

/** Note /20 pondérée selon le barème officiel (7/7/6) + sous-scores par critère. */
function computeBreakdown(map: ScoreMap): { note: number | null; parCritere: { critere: number; sur: number; score: number | null }[] } {
  const parCritere = GRILLE.map((c) => ({ critere: c.id, sur: c.points, score: critereScore(map, c) }))
  const note = parCritere.every((p) => p.score == null) ? null : Math.round(parCritere.reduce((a, p) => a + (p.score || 0), 0) * 10) / 10
  return { note, parCritere }
}
function computeNote(map: ScoreMap): number | null {
  return computeBreakdown(map).note
}

function getOrCreateDraft(dossierId: number): number {
  const row = db.prepare("SELECT id FROM auto_evaluations WHERE dossier_id=? AND statut='brouillon' ORDER BY id DESC LIMIT 1").get(dossierId) as { id: number } | undefined
  if (row) return row.id
  const info = db.prepare("INSERT INTO auto_evaluations (dossier_id, statut) VALUES (?, 'brouillon')").run(dossierId)
  return Number(info.lastInsertRowid)
}
function loadScores(evalId: number): ScoreMap {
  const rows = db.prepare('SELECT indicateur, score, commentaire FROM auto_evaluation_scores WHERE eval_id=?').all(evalId) as { indicateur: string; score: number | null; commentaire: string | null }[]
  const map: ScoreMap = {}
  for (const id of INDICATEUR_IDS) map[id] = { score: null, commentaire: null }
  for (const r of rows) if (map[r.indicateur]) map[r.indicateur] = { score: r.score, commentaire: r.commentaire }
  return map
}
function saveDraft(evalId: number, scores: ScoreIn[], commentaireGlobal: unknown, analyseQuestions: unknown): void {
  const up = db.prepare(
    `INSERT INTO auto_evaluation_scores (eval_id, indicateur, score, commentaire) VALUES (?,?,?,?)
     ON CONFLICT(eval_id, indicateur) DO UPDATE SET score=excluded.score, commentaire=excluded.commentaire`,
  )
  const tx = db.transaction(() => {
    for (const s of scores) {
      if (!INDICATEUR_IDS.includes(s.indicateur)) continue
      up.run(evalId, s.indicateur, clampScore(s.score), s.commentaire != null ? String(s.commentaire) : null)
    }
    const note = computeNote(loadScores(evalId))
    db.prepare("UPDATE auto_evaluations SET commentaire_global=?, analyse_questions=?, note_globale=?, maj_le=datetime('now') WHERE id=?").run(
      commentaireGlobal != null ? String(commentaireGlobal) : null,
      analyseQuestions != null ? String(analyseQuestions) : null,
      note,
      evalId,
    )
  })
  tx()
}

// --- Structure statique de la grille (critères + zones) ---
router.get('/grille', requireAuth, requireRole('accompagnateur'), (_req: Request, res: Response) => {
  res.json({ criteres: GRILLE, zones: ZONES })
})

// --- Auto-évaluation courante (brouillon) + historique des versions validées ---
router.get('/:id', requireAuth, requireRole('accompagnateur'), (req: Request, res: Response) => {
  const me = getUser(req)
  const id = Number(req.params.id)
  if (!owns(me.id, id)) {
    res.status(404).json({ error: 'Dossier introuvable' })
    return
  }
  const evalId = getOrCreateDraft(id)
  const head = db.prepare('SELECT id, statut, note_globale, commentaire_global, analyse_questions, maj_le FROM auto_evaluations WHERE id=?').get(evalId) as {
    id: number; statut: string; note_globale: number | null; commentaire_global: string | null; analyse_questions: string | null; maj_le: string
  }
  const historique = db
    .prepare("SELECT id, note_globale, maj_le FROM auto_evaluations WHERE dossier_id=? AND statut='validee' ORDER BY maj_le, id")
    .all(id) as { id: number; note_globale: number | null; maj_le: string }[]
  const scores = loadScores(evalId)
  res.json({ eval: { ...head, scores, parCritere: computeBreakdown(scores).parCritere }, historique })
})

// --- Enregistrer (met à jour le brouillon) ---
router.post('/:id', requireAuth, requireRole('accompagnateur'), (req: Request, res: Response) => {
  const me = getUser(req)
  const id = Number(req.params.id)
  if (!owns(me.id, id)) {
    res.status(404).json({ error: 'Dossier introuvable' })
    return
  }
  const evalId = getOrCreateDraft(id)
  const scores = Array.isArray(req.body?.scores) ? (req.body.scores as ScoreIn[]) : []
  saveDraft(evalId, scores, req.body?.commentaire_global, req.body?.analyse_questions)
  const note = (db.prepare('SELECT note_globale FROM auto_evaluations WHERE id=?').get(evalId) as { note_globale: number | null }).note_globale
  res.json({ ok: true, note_globale: note, parCritere: computeBreakdown(loadScores(evalId)).parCritere })
})

// --- Valider : fige la version courante dans l'historique et repart d'un nouveau brouillon ---
router.post('/:id/valider', requireAuth, requireRole('accompagnateur'), (req: Request, res: Response) => {
  const me = getUser(req)
  const id = Number(req.params.id)
  if (!owns(me.id, id)) {
    res.status(404).json({ error: 'Dossier introuvable' })
    return
  }
  const evalId = getOrCreateDraft(id)
  const scores = Array.isArray(req.body?.scores) ? (req.body.scores as ScoreIn[]) : []
  saveDraft(evalId, scores, req.body?.commentaire_global, req.body?.analyse_questions)
  const tx = db.transaction(() => {
    db.prepare("UPDATE auto_evaluations SET statut='validee', maj_le=datetime('now') WHERE id=?").run(evalId)
    const head = db.prepare('SELECT note_globale, commentaire_global, analyse_questions FROM auto_evaluations WHERE id=?').get(evalId) as { note_globale: number | null; commentaire_global: string | null; analyse_questions: string | null }
    const info = db.prepare("INSERT INTO auto_evaluations (dossier_id, statut, note_globale, commentaire_global, analyse_questions) VALUES (?, 'brouillon', ?, ?, ?)").run(id, head.note_globale, head.commentaire_global, head.analyse_questions)
    const newId = Number(info.lastInsertRowid)
    const rows = db.prepare('SELECT indicateur, score, commentaire FROM auto_evaluation_scores WHERE eval_id=?').all(evalId) as { indicateur: string; score: number | null; commentaire: string | null }[]
    const ins = db.prepare('INSERT INTO auto_evaluation_scores (eval_id, indicateur, score, commentaire) VALUES (?,?,?,?)')
    for (const r of rows) ins.run(newId, r.indicateur, r.score, r.commentaire)
  })
  tx()
  res.json({ ok: true })
})

// --- Contexte complet du dossier pour le prompt IA ---
function buildContext(dossierId: number): string {
  const d = db.prepare('SELECT titre, contexte, statut, synthese FROM dossiers WHERE id=?').get(dossierId) as
    | { titre: string | null; contexte: string | null; statut: string; synthese: string | null }
    | undefined
  const q = db.prepare('SELECT cr_recap FROM questionnaires_initiaux WHERE dossier_id=? AND cr_recap IS NOT NULL ORDER BY id DESC LIMIT 1').get(dossierId) as { cr_recap: string } | undefined
  const sessions = db.prepare('SELECT id, date FROM sessions WHERE dossier_id=? ORDER BY date').all(dossierId) as { id: number; date: string }[]
  const parts: string[] = [`# Dossier : ${d?.titre || '(sans titre)'} — statut : ${d?.statut || '?'}`]
  if (d?.contexte) parts.push(`## Contexte\n${d.contexte}`)
  if (q?.cr_recap) parts.push(`## Questionnaire initial (récapitulatif)\n${q.cr_recap}`)
  sessions.forEach((s, i) => {
    const reps = db.prepare('SELECT phase, texte_reponse FROM reponses WHERE session_id=? ORDER BY phase').all(s.id) as { phase: string | null; texte_reponse: string | null }[]
    const ques = db.prepare('SELECT phase, texte, reponse FROM questions_entretien WHERE session_id=? ORDER BY id').all(s.id) as { phase: string | null; texte: string; reponse: string | null }[]
    const blocs: string[] = []
    PHASES.forEach((ph) => {
      const note = reps.find((r) => String(r.phase) === String(ph.id))?.texte_reponse
      const qs = ques.filter((qq) => String(qq.phase) === String(ph.id))
      if (!note && qs.length === 0) return
      let bloc = `### Phase ${ph.id + 1} — ${ph.titre}`
      if (qs.length) bloc += `\nQuestions posées par l'accompagnateur (avec réponses recueillies) :\n${qs.map((qq) => `  • Q : ${qq.texte}${qq.reponse ? `\n    R : ${qq.reponse}` : ''}`).join('\n')}`
      if (note) bloc += `\nNotes générales : ${note}`
      blocs.push(bloc)
    })
    parts.push(`## Entretien ${i + 1} (${String(s.date).slice(0, 10)})\n${blocs.join('\n') || '(pas de notes)'}`)
  })
  const actions = db.prepare('SELECT libelle, statut FROM actions WHERE dossier_id=? ORDER BY id').all(dossierId) as { libelle: string; statut: string }[]
  if (actions.length) parts.push(`## Plan d'action\n${actions.map((a) => `- ${a.libelle} (${a.statut})`).join('\n')}`)
  if (d?.synthese) parts.push(`## Synthèse finale\n${d.synthese}`)
  return parts.join('\n\n')
}

const GRILLE_TXT = GRILLE.map((c) => `### Critère ${c.id} — ${c.titre}\n` + c.indicateurs.map((i) => `- ${i.id} : ${i.texte}`).join('\n')).join('\n\n')
const ZONES_TXT = ZONES.map((z, i) => `- ${z.min}–${ZONES[i + 1] ? ZONES[i + 1].min : 100} : ${z.label}`).join('\n')
const INSTRUCTIONS =
  `Tu assistes un accompagnateur (UE FAD130, Cnam) dans l'AUTO-évaluation de SA pratique d'accompagnement, à partir des traces d'un dossier (questionnaire, entretiens, plan d'action). ` +
  `Tu ne juges pas l'accompagné : tu évalues la posture de l'ACCOMPAGNATEUR au regard de la grille ci-dessous. Tu proposes ; c'est lui qui validera.\n\n` +
  `Cette grille reprend la GRILLE OFFICIELLE de fin de formation FAD130, pondérée 7 / 7 / 6 = 20 points (Critère 1 = 7 pts, Critère 2 = 7 pts, Critère 3 = 6 pts). ` +
  `Chaque indicateur vaut 1 point — 20 indicateurs formulés en « je » (la personne évaluée est l'accompagnateur) :\n${GRILLE_TXT}\n\n` +
  `Échelle de score 0–100 (4 zones) :\n${ZONES_TXT}\n\n` +
  `Pour CHAQUE indicateur (les 20), propose : un "score" entier 0–100 et un "commentaire" bref (1–2 phrases) à la première personne (« je »), STRICTEMENT fondé sur les traces fournies. ` +
  `Si une trace manque pour juger un indicateur, propose un score prudent (autour de 50) et signale explicitement le manque d'éléments dans le commentaire. ` +
  `Garde à l'esprit les « questions à se poser » de la grille officielle : la JUSTIFICATION des stratégies/méthodes/outils privilégiés, la VIGILANCE sur son positionnement et sa RÉÉVALUATION dans le temps (indic. 1.6, 1.7), l'ajustement sensible/INTUITIF et l'équilibre stratégique↔méthodique↔intuitif (2.7), et l'ANALYSE CRITIQUE de la fonction — rayonnement, tensions, évolutions, place sociale (3.5). ` +
  `Tu disposes aussi des QUESTIONS effectivement posées par l'accompagnateur (listées par phase) : évalue leur TYPE et leur qualité ` +
  `(ouvertes vs fermées, reformulation, relances, induction vs « geste écologique », dosage des attitudes de Porter) et tiens-en compte ` +
  `explicitement dans la notation des indicateurs concernés (notamment 1.4, 2.1, 2.4, 2.5, 2.6). ` +
  `Ajoute un "commentaire_global" (3–5 phrases) dégageant forces et axes de progrès critère par critère, ` +
  `puis un champ "analyse_questions" (3–5 phrases) qualifiant spécifiquement la qualité et la variété des questions posées, avec un conseil concret.`

async function suggererGrille(dossierId: number): Promise<{ scores: ScoreIn[]; commentaire_global: string; analyse_questions: string } | null> {
  if (!KEY) return null
  const context = buildContext(dossierId)
  const schema = `Réponds en JSON STRICT, sans aucun texte autour : {"scores":[{"indicateur":"1.1","score":0,"commentaire":"…"}, … les 20 indicateurs …],"commentaire_global":"…","analyse_questions":"…"}`
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: INSTRUCTIONS, cache_control: { type: 'ephemeral' } },
              { type: 'text', text: `Traces du dossier à analyser :\n\n${context}\n\n${schema}` },
            ],
          },
        ],
      }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { content?: { type: string; text?: string }[] }
    const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text || '').join('')
    const a = text.indexOf('{')
    const b = text.lastIndexOf('}')
    if (a < 0 || b < 0) return null
    const j = JSON.parse(text.slice(a, b + 1)) as { scores?: { indicateur?: string; score?: number; commentaire?: string }[]; commentaire_global?: string; analyse_questions?: string }
    const scores: ScoreIn[] = (Array.isArray(j.scores) ? j.scores : [])
      .filter((s) => typeof s.indicateur === 'string' && INDICATEUR_IDS.includes(s.indicateur))
      .map((s) => ({ indicateur: s.indicateur as string, score: clampScore(s.score), commentaire: s.commentaire != null ? String(s.commentaire) : null }))
    return { scores, commentaire_global: j.commentaire_global || '', analyse_questions: j.analyse_questions || '' }
  } catch {
    return null
  }
}

// --- Pré-remplissage IA (Opus) : suggère, ne sauvegarde pas ---
router.post('/:id/ia', requireAuth, requireRole('accompagnateur'), async (req: Request, res: Response) => {
  const me = getUser(req)
  const id = Number(req.params.id)
  if (!owns(me.id, id)) {
    res.status(404).json({ error: 'Dossier introuvable' })
    return
  }
  const suggestion = await suggererGrille(id)
  if (!suggestion) {
    res.json({ available: false, message: "L'assistant IA n'est pas disponible (clé API absente ou service injoignable)." })
    return
  }
  res.json({ available: true, ...suggestion })
})

export default router
