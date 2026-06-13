import { Router, type Request, type Response } from 'express'
import { db } from './db'
import { requireAuth, requireRole } from './auth'
import { requireFeature } from './features'
import { PHASES } from './phases'
import { GRILLE, INDICATEUR_IDS } from './grille'

// Miroir réflexif : l'IA (ou un repli heuristique) analyse la POSTURE de l'accompagnateur
// sur UN entretien — forces, glissements (avec verbatims), synthèse — et propose des scores
// de grille que l'accompagnateur peut appliquer à son auto-évaluation.
const router = Router()
const KEY = process.env.ANTHROPIC_API_KEY
const MODEL = process.env.ANTHROPIC_MODEL_REPORT || 'claude-opus-4-8'

interface U { id: number; role: string }
const getUser = (req: Request) => (req as Request & { user?: U }).user as U
function ownsSession(accId: number, sid: number): { dossier_id: number } | undefined {
  return db.prepare('SELECT d.id AS dossier_id FROM sessions s JOIN dossiers d ON d.id=s.dossier_id WHERE s.id=? AND d.accompagnateur_id=?').get(sid, accId) as { dossier_id: number } | undefined
}

interface QPosee { phase: string | null; texte: string; reponse: string | null }
interface Note { phase: string | null; texte_reponse: string | null }
interface Force { principe: string; observation: string; verbatim: string }
interface Glissement extends Force { conseil: string }
interface ScoreP { indicateur: string; score: number | null; commentaire: string | null }
interface Miroir { forces: Force[]; glissements: Glissement[]; synthese: string; scores: ScoreP[]; note: number | null }

function sessionData(sid: number) {
  const ques = db.prepare('SELECT phase, texte, reponse FROM questions_entretien WHERE session_id=? ORDER BY id').all(sid) as QPosee[]
  const notes = db.prepare('SELECT phase, texte_reponse FROM reponses WHERE session_id=? ORDER BY phase').all(sid) as Note[]
  return { ques, notes }
}
function sessionContext(sid: number): string {
  const { ques, notes } = sessionData(sid)
  const parts: string[] = []
  PHASES.forEach((ph) => {
    const note = notes.find((n) => String(n.phase) === String(ph.id))?.texte_reponse
    const qs = ques.filter((q) => String(q.phase) === String(ph.id))
    if (!note && !qs.length) return
    let b = `### Phase ${ph.id + 1} — ${ph.titre}`
    if (qs.length) b += `\nQuestions posées par l'accompagnateur :\n${qs.map((q) => `  • ${q.texte}${q.reponse ? `\n    (réponse recueillie : ${q.reponse})` : ''}`).join('\n')}`
    if (note) b += `\nNotes de l'accompagnateur : ${note}`
    parts.push(b)
  })
  return parts.join('\n\n') || '(aucune note ni question saisie)'
}

const PRINCIPES_TXT = [
  "1. Faire parler l'autre (parler peu, écouter beaucoup)",
  "2. Le geste écologique (le moins d'induction possible ; questions ouvertes et neutres)",
  '3. Faire émerger (aider à trouver, ne pas donner la solution)',
  '4. Non-jugement (questionner un travail, jamais la personne)',
  '5. Demande / besoin / décision (la demande explicite n\'est pas toujours le besoin réel)',
  '6. Moyens, pas résultat (outiller, ne pas décider à la place)',
  '7. Influencer par le cadre (objectifs, critères, rythme — pas l\'autorité)',
  "8. Viser l'autonomie (faire croître l'autonomie de la personne)",
].join('\n')
const GRILLE_TXT = GRILLE.map((c) => `### Critère ${c.id} — ${c.titre}\n` + c.indicateurs.map((i) => `- ${i.id} : ${i.texte}`).join('\n')).join('\n\n')

const INSTRUCTIONS =
  "Tu aides un accompagnateur (UE FAD130, Cnam) à faire un RETOUR RÉFLEXIF sur SA propre posture lors d'UN entretien précis. " +
  "Tu analyses uniquement SES interventions (questions posées + notes), au regard des 8 principes de posture et des attitudes de Porter. " +
  "Tu n'évalues JAMAIS l'accompagné. Tu proposes ; l'accompagnateur validera.\n\n" +
  `Les 8 principes de posture :\n${PRINCIPES_TXT}\n\n` +
  `La grille d'auto-évaluation (indicateurs formulés en « je » — la personne évaluée est l'accompagnateur) :\n${GRILLE_TXT}\n\n` +
  "Cite des VERBATIMS EXACTS tirés des traces fournies (une question réellement posée, un extrait de note). N'invente jamais de verbatim. " +
  "Pour les scores, ne note QUE les indicateurs réellement observables dans cet entretien."
const SCHEMA =
  'Réponds en JSON STRICT, sans aucun texte autour :\n' +
  '{"forces":[{"principe":"…","observation":"… 1 phrase …","verbatim":"… cité mot pour mot …"}],' +
  '"glissements":[{"principe":"…","observation":"…","verbatim":"…","conseil":"… concret, à la 1re personne …"}],' +
  '"synthese":"… 2-3 phrases réflexives à la 1re personne …",' +
  '"scores":[{"indicateur":"2.5","score":0,"commentaire":"… bref, en je …"}],"note":0}\n' +
  '(2 à 3 forces ; 1 à 3 glissements : induction, question fermée/orientée, conseil donné trop vite, niveau psychologique non entendu ; note = /100 de la posture sur cet entretien.)'

async function suggererMiroir(sid: number): Promise<Miroir | null> {
  if (!KEY) return null
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2048,
        messages: [{ role: 'user', content: [
          { type: 'text', text: INSTRUCTIONS, cache_control: { type: 'ephemeral' } },
          { type: 'text', text: `Traces de l'entretien à analyser :\n\n${sessionContext(sid)}\n\n${SCHEMA}` },
        ] }],
      }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { content?: { type: string; text?: string }[] }
    const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text || '').join('')
    const a = text.indexOf('{'), b = text.lastIndexOf('}')
    if (a < 0 || b < 0) return null
    const j = JSON.parse(text.slice(a, b + 1)) as Partial<Miroir>
    return {
      forces: Array.isArray(j.forces) ? j.forces.slice(0, 3) : [],
      glissements: Array.isArray(j.glissements) ? j.glissements.slice(0, 3) : [],
      synthese: typeof j.synthese === 'string' ? j.synthese : '',
      scores: Array.isArray(j.scores) ? j.scores : [],
      note: typeof j.note === 'number' ? Math.max(0, Math.min(100, j.note)) : null,
    }
  } catch { return null }
}

// Repli heuristique (sans clé API) : analyse simple du type de questions posées.
const OPEN_RE = /^(quel|quelle|comment|qu['’ ]|raconte|en quoi|pourquoi|à quoi|que pense|qu'attends|si tout|décris|parle-moi|dis-moi)/i
function fallbackMiroir(sid: number): Miroir {
  const { ques, notes } = sessionData(sid)
  const allQ = ques.map((q) => (q.texte || '').trim()).filter(Boolean)
  const open = allQ.filter((t) => OPEN_RE.test(t))
  const closed = allQ.filter((t) => !OPEN_RE.test(t))
  const ratio = allQ.length ? open.length / allQ.length : 0
  const note0 = notes.find((n) => String(n.phase) === '0')?.texte_reponse || ''
  const forces: Force[] = []
  if (open.length) forces.push({ principe: 'Le geste écologique', observation: 'Tu poses surtout des questions ouvertes, qui font raconter sans induire.', verbatim: open[0] })
  if (note0) forces.push({ principe: 'Influencer par le cadre', observation: 'Tu poses le cadre et l’alliance dès l’ouverture.', verbatim: note0.slice(0, 160) })
  if (forces.length < 2 && allQ.length) forces.push({ principe: "Faire parler l'autre", observation: "Tu laisses de la place à la parole de l'accompagné.", verbatim: allQ[0] })
  const glissements: Glissement[] = []
  if (closed.length) glissements.push({ principe: 'Faire émerger', observation: 'Quelques questions sont fermées ou orientées et suggèrent une réponse.', verbatim: closed[0], conseil: 'Je transforme ces questions en questions ouvertes (« qu’est-ce qui… », « comment… ») pour faire émerger plutôt qu’induire.' })
  if (!glissements.length) glissements.push({ principe: 'Faire émerger', observation: 'Veiller à ne pas apporter mes propres analyses à la place de l’accompagné.', verbatim: '', conseil: 'Je reformule et je relance par une question ouverte plutôt que de proposer ma lecture.' })
  const synthese = `Sur cet entretien, je suis plutôt dans une posture d'écoute (${open.length}/${allQ.length || 0} questions ouvertes). Mon appui : le cadre et les questions ouvertes ; ma vigilance : transformer systématiquement mes propositions en questions pour faire émerger.`
  const scores: ScoreP[] = [
    { indicateur: '1.1', score: note0 ? 80 : 60, commentaire: note0 ? 'J’ai posé le cadre et l’alliance dès l’ouverture.' : 'Cadre peu visible dans les traces de cet entretien.' },
    { indicateur: '1.4', score: 72, commentaire: 'Je questionne le travail sans juger la personne.' },
    { indicateur: '2.1', score: 70, commentaire: 'Je fais formuler la demande et le besoin réel.' },
    { indicateur: '2.4', score: closed.length ? 55 : 66, commentaire: 'Dosage du conseil (Porter) : à surveiller.' },
    { indicateur: '2.5', score: Math.round(45 + ratio * 35), commentaire: 'Faire émerger : proportionnel à la part de questions ouvertes.' },
    { indicateur: '2.6', score: 75, commentaire: 'Micro-objectifs et feedback présents.' },
  ]
  const note = Math.round(scores.reduce((a, s) => a + (s.score || 0), 0) / scores.length)
  return { forces, glissements, synthese, scores, note }
}

// --- Générer (et stocker) l'analyse réflexive d'un entretien ---
router.post('/session/:sid', requireAuth, requireRole('accompagnateur'), requireFeature('miroir'), async (req: Request, res: Response) => {
  const me = getUser(req)
  const sid = Number(req.params.sid)
  const owned = ownsSession(me.id, sid)
  if (!owned) { res.status(404).json({ error: 'Entretien introuvable' }); return }
  let result = await suggererMiroir(sid)
  let source = 'ia'
  if (!result) { result = fallbackMiroir(sid); source = 'heuristique' }
  result.scores = (result.scores || []).filter((s) => INDICATEUR_IDS.includes(s.indicateur))
  db.prepare(
    "INSERT INTO analyses_posture (session_id, dossier_id, contenu, source, genere_le) VALUES (?,?,?,?,datetime('now')) " +
    'ON CONFLICT(session_id) DO UPDATE SET contenu=excluded.contenu, source=excluded.source, genere_le=datetime(\'now\')',
  ).run(sid, owned.dossier_id, JSON.stringify(result), source)
  res.json({ ...result, source })
})

// --- Récupérer l'analyse stockée (si elle existe) ---
router.get('/session/:sid', requireAuth, requireRole('accompagnateur'), requireFeature('miroir'), (req: Request, res: Response) => {
  const me = getUser(req)
  const sid = Number(req.params.sid)
  if (!ownsSession(me.id, sid)) { res.status(404).json({ error: 'Entretien introuvable' }); return }
  const row = db.prepare('SELECT contenu, source, genere_le FROM analyses_posture WHERE session_id=?').get(sid) as { contenu: string; source: string; genere_le: string } | undefined
  res.json({ analyse: row ? { ...JSON.parse(row.contenu), source: row.source, genere_le: row.genere_le } : null })
})

// --- Appliquer les scores proposés à la grille (brouillon d'auto-évaluation du dossier) ---
router.post('/session/:sid/appliquer', requireAuth, requireRole('accompagnateur'), requireFeature('miroir'), (req: Request, res: Response) => {
  const me = getUser(req)
  const sid = Number(req.params.sid)
  const owned = ownsSession(me.id, sid)
  if (!owned) { res.status(404).json({ error: 'Entretien introuvable' }); return }
  const row = db.prepare('SELECT contenu FROM analyses_posture WHERE session_id=?').get(sid) as { contenu: string } | undefined
  if (!row) { res.status(404).json({ error: 'Aucune analyse à appliquer' }); return }
  const data = JSON.parse(row.contenu) as { scores?: ScoreP[] }
  const dossierId = owned.dossier_id
  const draft = db.prepare("SELECT id FROM auto_evaluations WHERE dossier_id=? AND statut='brouillon' ORDER BY id DESC LIMIT 1").get(dossierId) as { id: number } | undefined
  const evalId = draft ? draft.id : Number(db.prepare("INSERT INTO auto_evaluations (dossier_id, statut) VALUES (?, 'brouillon')").run(dossierId).lastInsertRowid)
  const up = db.prepare('INSERT INTO auto_evaluation_scores (eval_id, indicateur, score, commentaire) VALUES (?,?,?,?) ON CONFLICT(eval_id, indicateur) DO UPDATE SET score=excluded.score, commentaire=excluded.commentaire')
  let n = 0
  db.transaction(() => {
    for (const s of data.scores || []) {
      if (!INDICATEUR_IDS.includes(s.indicateur)) continue
      const sc = typeof s.score === 'number' ? Math.max(0, Math.min(100, s.score)) : null
      up.run(evalId, s.indicateur, sc, s.commentaire != null ? String(s.commentaire) : null)
      n++
    }
    const vals = (db.prepare('SELECT score FROM auto_evaluation_scores WHERE eval_id=? AND score IS NOT NULL').all(evalId) as { score: number }[]).map((r) => r.score)
    const noteG = vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length / 5) * 10) / 10 : null
    db.prepare("UPDATE auto_evaluations SET note_globale=?, maj_le=datetime('now') WHERE id=?").run(noteG, evalId)
  })()
  res.json({ ok: true, appliques: n })
})

export default router
