import { Router, type Request, type Response } from 'express'
import { db } from './db'
import { requireAuth, requireRole } from './auth'
import { PHASES } from './phases'
import { suggestForPhase } from './claudeSuggest'

const router = Router()

interface AuthedUser { id: number; role: string }
function getUser(req: Request): AuthedUser {
  return (req as Request & { user?: AuthedUser }).user as AuthedUser
}

// Les 6 phases (référentiel)
router.get('/phases', requireAuth, (_req: Request, res: Response) => {
  res.json({ phases: PHASES })
})

// Dossiers de l'accompagnateur (ses accompagnés)
router.get('/dossiers', requireAuth, requireRole('accompagnateur'), (req: Request, res: Response) => {
  const me = getUser(req)
  const dossiers = db
    .prepare(
      `SELECT d.id, d.titre,
              u.prenom AS accompagne_prenom, u.email AS accompagne_email,
              (SELECT cr_recap FROM questionnaires_initiaux q WHERE q.dossier_id = d.id ORDER BY q.id DESC LIMIT 1) AS recap
       FROM dossiers d
       JOIN users u ON u.id = d.accompagne_id
       WHERE d.accompagnateur_id = ?
       ORDER BY d.cree_le DESC`,
    )
    .all(me.id)
  res.json({ dossiers })
})

// Tableau de bord de l'accompagnateur (vue d'ensemble des accompagnés)
router.get('/dashboard', requireAuth, requireRole('accompagnateur'), (req: Request, res: Response) => {
  const me = getUser(req)
  const dossiers = db
    .prepare(
      `SELECT d.id, u.prenom AS accompagne_prenom, u.email AS accompagne_email,
              (SELECT COUNT(*) FROM sessions s WHERE s.dossier_id = d.id) AS nb_sessions,
              (SELECT COUNT(*) FROM actions a WHERE a.dossier_id = d.id AND a.statut != 'fait') AS actions_ouvertes,
              (SELECT COUNT(*) FROM questionnaires_initiaux q WHERE q.dossier_id = d.id) AS questionnaire,
              (SELECT COUNT(*) FROM comptes_rendus cr JOIN sessions s2 ON s2.id = cr.session_id WHERE s2.dossier_id = d.id) AS nb_cr,
              (SELECT GROUP_CONCAT(t.id || '|' || t.nom, ',') FROM dossier_tags dt JOIN tags t ON t.id = dt.tag_id WHERE dt.dossier_id = d.id) AS tags
       FROM dossiers d JOIN users u ON u.id = d.accompagne_id
       WHERE d.accompagnateur_id = ? ORDER BY d.cree_le DESC`,
    )
    .all(me.id)
  res.json({ dossiers })
})

// Démarrer (ou reprendre) une session d'entretien pour un dossier
router.post('/sessions', requireAuth, requireRole('accompagnateur'), (req: Request, res: Response) => {
  const me = getUser(req)
  const dossierId = Number(req.body?.dossierId)
  const dossier = db.prepare('SELECT id FROM dossiers WHERE id=? AND accompagnateur_id=?').get(dossierId, me.id)
  if (!dossier) {
    res.status(404).json({ error: 'Dossier introuvable' })
    return
  }
  let session = db.prepare("SELECT id FROM sessions WHERE dossier_id=? AND statut='en_cours' ORDER BY id DESC LIMIT 1").get(dossierId) as { id: number } | undefined
  if (!session) {
    const info = db.prepare("INSERT INTO sessions (dossier_id, phase_atteinte) VALUES (?, '0')").run(dossierId)
    session = { id: Number(info.lastInsertRowid) }
  }
  res.json({ sessionId: session.id })
})

function ownsSession(userId: number, sessionId: number): boolean {
  return !!db
    .prepare('SELECT s.id FROM sessions s JOIN dossiers d ON d.id=s.dossier_id WHERE s.id=? AND d.accompagnateur_id=?')
    .get(sessionId, userId)
}

// Détail d'une session (+ réponses déjà saisies)
router.get('/sessions/:id', requireAuth, requireRole('accompagnateur'), (req: Request, res: Response) => {
  const me = getUser(req)
  const id = Number(req.params.id)
  if (!ownsSession(me.id, id)) {
    res.status(404).json({ error: 'Session introuvable' })
    return
  }
  const session = db.prepare('SELECT id, dossier_id, phase_atteinte, statut FROM sessions WHERE id=?').get(id)
  const reponses = db.prepare('SELECT phase, texte_reponse FROM reponses WHERE session_id=? ORDER BY phase').all(id)
  const questions = db.prepare('SELECT id, phase, texte, reponse FROM questions_entretien WHERE session_id=? ORDER BY id').all(id)
  res.json({ session, reponses, questions })
})

// Enregistrer les notes d'une phase
router.post('/sessions/:id/reponses', requireAuth, requireRole('accompagnateur'), (req: Request, res: Response) => {
  const me = getUser(req)
  const id = Number(req.params.id)
  if (!ownsSession(me.id, id)) {
    res.status(404).json({ error: 'Session introuvable' })
    return
  }
  const phase = String(req.body?.phase ?? '')
  const texte = String(req.body?.texte ?? '')
  const phaseObj = PHASES.find((p) => String(p.id) === phase)
  db.prepare('DELETE FROM reponses WHERE session_id=? AND phase=?').run(id, phase)
  db.prepare("INSERT INTO reponses (session_id, phase, question, texte_reponse, source) VALUES (?, ?, ?, ?, 'saisie')").run(
    id,
    phase,
    phaseObj ? phaseObj.titre : null,
    texte,
  )
  db.prepare('UPDATE sessions SET phase_atteinte=? WHERE id=?').run(phase, id)
  res.json({ ok: true })
})

// Ajouter une question posée pendant l'entretien (par phase)
router.post('/sessions/:id/questions', requireAuth, requireRole('accompagnateur'), (req: Request, res: Response) => {
  const me = getUser(req)
  const id = Number(req.params.id)
  if (!ownsSession(me.id, id)) {
    res.status(404).json({ error: 'Session introuvable' })
    return
  }
  const phase = String(req.body?.phase ?? '')
  const texte = String(req.body?.texte ?? '').trim()
  if (!texte) {
    res.status(400).json({ error: 'Question vide' })
    return
  }
  const info = db.prepare('INSERT INTO questions_entretien (session_id, phase, texte) VALUES (?,?,?)').run(id, phase, texte)
  res.status(201).json({ id: Number(info.lastInsertRowid), phase, texte })
})

// Mettre à jour une question (sa réponse, et éventuellement son texte)
router.patch('/sessions/:id/questions/:qid', requireAuth, requireRole('accompagnateur'), (req: Request, res: Response) => {
  const me = getUser(req)
  const id = Number(req.params.id)
  const qid = Number(req.params.qid)
  if (!ownsSession(me.id, id)) {
    res.status(404).json({ error: 'Session introuvable' })
    return
  }
  const reponse = req.body?.reponse != null ? String(req.body.reponse) : null
  if (req.body?.texte != null) {
    db.prepare('UPDATE questions_entretien SET texte=?, reponse=? WHERE id=? AND session_id=?').run(String(req.body.texte), reponse, qid, id)
  } else {
    db.prepare('UPDATE questions_entretien SET reponse=? WHERE id=? AND session_id=?').run(reponse, qid, id)
  }
  res.json({ ok: true })
})

// Supprimer une question posée
router.delete('/sessions/:id/questions/:qid', requireAuth, requireRole('accompagnateur'), (req: Request, res: Response) => {
  const me = getUser(req)
  const id = Number(req.params.id)
  const qid = Number(req.params.qid)
  if (!ownsSession(me.id, id)) {
    res.status(404).json({ error: 'Session introuvable' })
    return
  }
  db.prepare('DELETE FROM questions_entretien WHERE id=? AND session_id=?').run(qid, id)
  res.json({ ok: true })
})

// Clôturer la session
router.post('/sessions/:id/cloturer', requireAuth, requireRole('accompagnateur'), (req: Request, res: Response) => {
  const me = getUser(req)
  const id = Number(req.params.id)
  if (!ownsSession(me.id, id)) {
    res.status(404).json({ error: 'Session introuvable' })
    return
  }
  db.prepare("UPDATE sessions SET statut='terminee' WHERE id=?").run(id)
  res.json({ ok: true })
})

// Suggestions IA (reformulation + questions d'approfondissement)
router.post('/suggestions', requireAuth, requireRole('accompagnateur'), async (req: Request, res: Response) => {
  const phase = Number(req.body?.phase)
  const transcript = String(req.body?.transcript || '')
  try {
    res.json(await suggestForPhase(phase, transcript))
  } catch {
    res.status(500).json({ error: 'Erreur lors de la génération des suggestions' })
  }
})

export default router
