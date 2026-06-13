import { Router, type Request, type Response } from 'express'
import { db } from './db'
import { requireAuth, requireRole } from './auth'
import { PHASES } from './phases'

// IA au service de l'émergence : banque de questions personnalisée (par dossier/phase),
// fil rouge du mémoire (par dossier) et moments-clés (par entretien). L'accompagnateur génère,
// puis partage à sa main (le fil rouge et les moments-clés deviennent visibles par l'accompagné).
const router = Router()
const KEY = process.env.ANTHROPIC_API_KEY
const MODEL = process.env.ANTHROPIC_MODEL_REPORT || 'claude-opus-4-8'
interface U { id: number; role: string }
const getUser = (req: Request) => (req as Request & { user?: U }).user as U
const ownsDossier = (accId: number, did: number) => !!db.prepare('SELECT id FROM dossiers WHERE id=? AND accompagnateur_id=?').get(did, accId)
function ownsSession(accId: number, sid: number) {
  return db.prepare('SELECT d.id AS dossier_id FROM sessions s JOIN dossiers d ON d.id=s.dossier_id WHERE s.id=? AND d.accompagnateur_id=?').get(sid, accId) as { dossier_id: number } | undefined
}

async function callClaude(instructions: string, content: string, maxTokens = 1500): Promise<Record<string, unknown> | null> {
  if (!KEY) return null
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, messages: [{ role: 'user', content: [
        { type: 'text', text: instructions, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: content },
      ] }] }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { content?: { type: string; text?: string }[] }
    const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text || '').join('')
    const a = text.indexOf('{'), b = text.lastIndexOf('}')
    if (a < 0 || b < 0) return null
    return JSON.parse(text.slice(a, b + 1)) as Record<string, unknown>
  } catch { return null }
}

function dossierContext(dossierId: number, includeJournal = true): string {
  const d = db.prepare('SELECT titre, contexte FROM dossiers WHERE id=?').get(dossierId) as { titre: string | null; contexte: string | null } | undefined
  const q = db.prepare('SELECT cr_recap FROM questionnaires_initiaux WHERE dossier_id=? AND cr_recap IS NOT NULL ORDER BY id DESC LIMIT 1').get(dossierId) as { cr_recap: string } | undefined
  const parts: string[] = [`# ${d?.titre || 'Parcours'}`]
  if (d?.contexte) parts.push(`## Contexte\n${d.contexte}`)
  if (q?.cr_recap) parts.push(`## Questionnaire initial\n${q.cr_recap}`)
  const sessions = db.prepare('SELECT id, date FROM sessions WHERE dossier_id=? ORDER BY date').all(dossierId) as { id: number; date: string }[]
  sessions.forEach((s, i) => {
    const reps = db.prepare('SELECT phase, texte_reponse FROM reponses WHERE session_id=?').all(s.id) as { phase: string | null; texte_reponse: string | null }[]
    const ques = db.prepare('SELECT phase, texte, reponse FROM questions_entretien WHERE session_id=?').all(s.id) as { phase: string | null; texte: string; reponse: string | null }[]
    const blocs: string[] = []
    PHASES.forEach((ph) => {
      const note = reps.find((r) => String(r.phase) === String(ph.id))?.texte_reponse
      const qs = ques.filter((qq) => String(qq.phase) === String(ph.id))
      if (!note && !qs.length) return
      blocs.push(`${ph.titre} : ${qs.map((qq) => `« ${qq.texte} »${qq.reponse ? ` → ${qq.reponse}` : ''}`).join(' ; ')}${note ? ` [notes : ${note}]` : ''}`)
    })
    if (blocs.length) parts.push(`## Entretien ${i + 1}\n${blocs.join('\n')}`)
  })
  if (includeJournal) {
    const j = db.prepare('SELECT texte FROM journal_entrees WHERE dossier_id=? AND partage=1 ORDER BY cree_le').all(dossierId) as { texte: string }[]
    if (j.length) parts.push(`## Journal partagé de l'accompagné\n${j.map((x) => `- ${x.texte}`).join('\n')}`)
  }
  return parts.join('\n\n')
}
function sessionContext(sid: number): string {
  const reps = db.prepare('SELECT phase, texte_reponse FROM reponses WHERE session_id=?').all(sid) as { phase: string | null; texte_reponse: string | null }[]
  const ques = db.prepare('SELECT phase, texte, reponse FROM questions_entretien WHERE session_id=?').all(sid) as { phase: string | null; texte: string; reponse: string | null }[]
  const parts: string[] = []
  PHASES.forEach((ph) => {
    const note = reps.find((r) => String(r.phase) === String(ph.id))?.texte_reponse
    const qs = ques.filter((qq) => String(qq.phase) === String(ph.id))
    if (!note && !qs.length) return
    parts.push(`### ${ph.titre}\n${qs.map((qq) => `Q: ${qq.texte}${qq.reponse ? `\nR: ${qq.reponse}` : ''}`).join('\n')}${note ? `\nNotes: ${note}` : ''}`)
  })
  return parts.join('\n\n') || '(aucune note)'
}

// ---------- Banque de questions personnalisée (par dossier) ----------
const phasesList = PHASES.map((p) => `${p.id} = ${p.titre}`).join(' ; ')
export function fallbackBanque(dossierId: number): Record<string, string[]> {
  const nom = (db.prepare('SELECT u.prenom FROM dossiers d JOIN users u ON u.id=d.accompagne_id WHERE d.id=?').get(dossierId) as { prenom: string | null } | undefined)?.prenom || 'la personne'
  return {
    '0': [`${nom}, qu'est-ce qui t'amène précisément aujourd'hui ?`],
    '1': [`Qu'attends-tu vraiment de ce travail, au-delà du diplôme ?`],
    '2': [`Raconte-moi une situation concrète et marquante de ton expérience.`],
    '3': [`Quel fil relie cette expérience à ta problématique ?`],
    '4': [`Quelle est la prochaine petite étape, et pour quand ?`],
    '5': [`Qu'est-ce que tu retiens, et comment te sens-tu maintenant ?`],
  }
}
router.post('/dossier/:did/banque', requireAuth, requireRole('accompagnateur'), async (req: Request, res: Response) => {
  const me = getUser(req); const did = Number(req.params.did)
  if (!ownsDossier(me.id, did)) { res.status(404).json({ error: 'Dossier introuvable' }); return }
  const instr = `Tu aides un accompagnateur (FAD130) à préparer un entretien. À partir du contexte précis de l'étudiant, propose pour CHAQUE phase 2-3 questions ouvertes SUR-MESURE (ancrées dans SON contexte, pas génériques), à poser pendant l'entretien. Phases : ${phasesList}. Réponds en JSON strict : {"0":["…"],"1":["…"],…,"5":["…"]}.`
  const j = await callClaude(instr, dossierContext(did))
  const contenu = (j && typeof j === 'object') ? j : fallbackBanque(did)
  const source = j ? 'ia' : 'heuristique'
  db.prepare("INSERT INTO emergence (dossier_id, type, contenu, genere_le) VALUES (?, 'banque', ?, datetime('now')) ON CONFLICT(dossier_id, type) DO UPDATE SET contenu=excluded.contenu, genere_le=datetime('now')").run(did, JSON.stringify(contenu))
  res.json({ banque: contenu, source })
})
router.get('/dossier/:did/banque', requireAuth, requireRole('accompagnateur'), (req: Request, res: Response) => {
  const me = getUser(req); const did = Number(req.params.did)
  if (!ownsDossier(me.id, did)) { res.status(404).json({ error: 'Dossier introuvable' }); return }
  const row = db.prepare("SELECT contenu FROM emergence WHERE dossier_id=? AND type='banque'").get(did) as { contenu: string } | undefined
  res.json({ banque: row ? JSON.parse(row.contenu) : null })
})

// ---------- Fil rouge du mémoire (par dossier, partageable) ----------
router.post('/dossier/:did/fil-rouge', requireAuth, requireRole('accompagnateur'), async (req: Request, res: Response) => {
  const me = getUser(req); const did = Number(req.params.did)
  if (!ownsDossier(me.id, did)) { res.status(404).json({ error: 'Dossier introuvable' }); return }
  const instr = `Tu aides un accompagnateur (FAD130) à faire ÉMERGER le fil conducteur du mémoire d'un étudiant, à partir de ses entretiens accumulés. Tu ne rédiges pas à sa place : tu proposes un fil qu'il pourra valider. Réponds en JSON strict : {"fil":"une phrase qui capte le fil rouge","axes":["axe 1","axe 2","axe 3"],"explication":"2-3 phrases qui justifient, fondées sur les traces"}.`
  const j = await callClaude(instr, dossierContext(did))
  const contenu = j && j.fil ? j : { fil: 'Relier l\'expérience vécue à une démarche professionnelle structurée.', axes: ['Diagnostic', 'Démarche', 'Résultats & recul'], explication: 'Fil rouge proposé à partir des traces du parcours (à affiner).' }
  const source = j && j.fil ? 'ia' : 'heuristique'
  db.prepare("INSERT INTO emergence (dossier_id, type, contenu, genere_le) VALUES (?, 'fil_rouge', ?, datetime('now')) ON CONFLICT(dossier_id, type) DO UPDATE SET contenu=excluded.contenu, genere_le=datetime('now')").run(did, JSON.stringify(contenu))
  const partage = (db.prepare("SELECT partage FROM emergence WHERE dossier_id=? AND type='fil_rouge'").get(did) as { partage: number }).partage
  res.json({ ...contenu, partage, source })
})
router.get('/dossier/:did/fil-rouge', requireAuth, requireRole('accompagnateur'), (req: Request, res: Response) => {
  const me = getUser(req); const did = Number(req.params.did)
  if (!ownsDossier(me.id, did)) { res.status(404).json({ error: 'Dossier introuvable' }); return }
  const row = db.prepare("SELECT contenu, partage FROM emergence WHERE dossier_id=? AND type='fil_rouge'").get(did) as { contenu: string; partage: number } | undefined
  res.json({ filRouge: row ? { ...JSON.parse(row.contenu), partage: row.partage } : null })
})
router.patch('/dossier/:did/fil-rouge/partage', requireAuth, requireRole('accompagnateur'), (req: Request, res: Response) => {
  const me = getUser(req); const did = Number(req.params.did)
  if (!ownsDossier(me.id, did)) { res.status(404).json({ error: 'Dossier introuvable' }); return }
  db.prepare("UPDATE emergence SET partage=? WHERE dossier_id=? AND type='fil_rouge'").run(req.body?.partage ? 1 : 0, did)
  res.json({ ok: true })
})

// ---------- Moments-clés (par entretien, partageable) ----------
export function fallbackMoments(sid: number) {
  const q = db.prepare('SELECT reponse FROM questions_entretien WHERE session_id=? AND reponse IS NOT NULL AND TRIM(reponse)<>\'\' ORDER BY id LIMIT 2').all(sid) as { reponse: string }[]
  return { moments: q.map((x) => ({ verbatim: x.reponse.slice(0, 160), pourquoi: 'Passage potentiellement pivot de l\'entretien.' })) }
}
router.post('/session/:sid/moments', requireAuth, requireRole('accompagnateur'), async (req: Request, res: Response) => {
  const me = getUser(req); const sid = Number(req.params.sid)
  const owned = ownsSession(me.id, sid)
  if (!owned) { res.status(404).json({ error: 'Entretien introuvable' }); return }
  const instr = `Tu aides un accompagnateur (FAD130) à repérer les MOMENTS-CLÉS d'un entretien : les verbatims pivots, là où quelque chose bascule (prise de conscience, émotion, déclic). Cite des verbatims EXACTS. Réponds en JSON strict : {"moments":[{"verbatim":"… cité mot pour mot …","pourquoi":"1 phrase"}]} (2 à 4 moments).`
  const j = await callClaude(instr, sessionContext(sid), 1200)
  const contenu = j && Array.isArray((j as { moments?: unknown }).moments) ? j : fallbackMoments(sid)
  const source = j && Array.isArray((j as { moments?: unknown }).moments) ? 'ia' : 'heuristique'
  db.prepare("INSERT INTO moments_cles (session_id, dossier_id, contenu, genere_le) VALUES (?,?,?,datetime('now')) ON CONFLICT(session_id) DO UPDATE SET contenu=excluded.contenu, genere_le=datetime('now')").run(sid, owned.dossier_id, JSON.stringify(contenu))
  const partage = (db.prepare('SELECT partage FROM moments_cles WHERE session_id=?').get(sid) as { partage: number }).partage
  res.json({ ...contenu, partage, source })
})
router.get('/session/:sid/moments', requireAuth, requireRole('accompagnateur'), (req: Request, res: Response) => {
  const me = getUser(req); const sid = Number(req.params.sid)
  if (!ownsSession(me.id, sid)) { res.status(404).json({ error: 'Entretien introuvable' }); return }
  const row = db.prepare('SELECT contenu, partage FROM moments_cles WHERE session_id=?').get(sid) as { contenu: string; partage: number } | undefined
  res.json({ moments: row ? JSON.parse(row.contenu).moments : null, partage: row?.partage ?? 0 })
})
router.patch('/session/:sid/moments/partage', requireAuth, requireRole('accompagnateur'), (req: Request, res: Response) => {
  const me = getUser(req); const sid = Number(req.params.sid)
  if (!ownsSession(me.id, sid)) { res.status(404).json({ error: 'Entretien introuvable' }); return }
  db.prepare('UPDATE moments_cles SET partage=? WHERE session_id=?').run(req.body?.partage ? 1 : 0, sid)
  res.json({ ok: true })
})

// ---------- Lecture côté accompagné (uniquement ce qui est partagé) ----------
router.get('/mine/dossier/:did', requireAuth, requireRole('accompagne'), (req: Request, res: Response) => {
  const me = getUser(req); const did = Number(req.params.did)
  if (!db.prepare('SELECT id FROM dossiers WHERE id=? AND accompagne_id=?').get(did, me.id)) { res.status(404).json({ error: 'Parcours introuvable' }); return }
  const fr = db.prepare("SELECT contenu FROM emergence WHERE dossier_id=? AND type='fil_rouge' AND partage=1").get(did) as { contenu: string } | undefined
  const moments = db.prepare('SELECT contenu FROM moments_cles WHERE dossier_id=? AND partage=1 ORDER BY genere_le').all(did) as { contenu: string }[]
  res.json({
    filRouge: fr ? JSON.parse(fr.contenu) : null,
    moments: moments.flatMap((m) => JSON.parse(m.contenu).moments || []),
  })
})

export default router
