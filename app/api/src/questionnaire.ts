import { Router, type Request, type Response } from 'express'
import { db } from './db'
import { requireAuth } from './auth'
import { questionnaireNext, type QA } from './claude'
import { docxFromText } from './compteRendu'

const router = Router()

interface AuthedUser { id: number; role: string }
function getUser(req: Request): AuthedUser {
  return (req as Request & { user?: AuthedUser }).user as AuthedUser
}

// Étape suivante du questionnaire (Claude ou parcours de secours)
router.post('/next', requireAuth, async (req: Request, res: Response) => {
  const history: QA[] = Array.isArray(req.body?.history) ? req.body.history : []
  try {
    res.json(await questionnaireNext(history))
  } catch {
    res.status(500).json({ error: 'Erreur lors de la génération de la question' })
  }
})

// Enregistrement du questionnaire complété (crée le dossier + notifie l'accompagnateur)
router.post('/save', requireAuth, (req: Request, res: Response) => {
  const user = getUser(req)
  if (user.role !== 'accompagne') {
    res.status(403).json({ error: 'Réservé aux personnes accompagnées' })
    return
  }
  const history = req.body?.history ?? []
  const recapitulatif: string | null = req.body?.recapitulatif ?? null

  const acc = db
    .prepare("SELECT id FROM users WHERE role='accompagnateur' AND actif=1 ORDER BY id LIMIT 1")
    .get() as { id: number } | undefined
  if (!acc) {
    res.status(400).json({ error: 'Aucun accompagnateur disponible' })
    return
  }
  db.prepare('INSERT OR IGNORE INTO liens_accompagnement (accompagnateur_id, accompagne_id) VALUES (?, ?)').run(acc.id, user.id)

  let dossier = db
    .prepare('SELECT id FROM dossiers WHERE accompagne_id=? AND accompagnateur_id=? ORDER BY id LIMIT 1')
    .get(user.id, acc.id) as { id: number } | undefined
  if (!dossier) {
    const info = db
      .prepare('INSERT INTO dossiers (accompagne_id, accompagnateur_id, titre) VALUES (?, ?, ?)')
      .run(user.id, acc.id, 'Accompagnement mémoire')
    dossier = { id: Number(info.lastInsertRowid) }
  }
  db.prepare("INSERT INTO questionnaires_initiaux (dossier_id, contenu, cr_recap, complete_le) VALUES (?, ?, ?, datetime('now'))")
    .run(dossier.id, JSON.stringify(history), recapitulatif)

  db.prepare('INSERT INTO notifications (user_id, texte) VALUES (?, ?)').run(
    acc.id,
    'Un accompagné a complété son questionnaire initial.',
  )

  res.json({ ok: true, dossierId: dossier.id })
})

// Télécharger le récapitulatif du questionnaire en DOCX (accompagnateur du dossier ou accompagné)
router.get('/:dossierId/cr', requireAuth, async (req: Request, res: Response) => {
  const me = getUser(req)
  const dossierId = Number(req.params.dossierId)
  const d = db
    .prepare('SELECT d.id, d.accompagnateur_id, d.accompagne_id, u.prenom, u.email FROM dossiers d JOIN users u ON u.id=d.accompagne_id WHERE d.id=?')
    .get(dossierId) as { accompagnateur_id: number; accompagne_id: number; prenom: string | null; email: string } | undefined
  const allowed = d && ((me.role === 'accompagnateur' && d.accompagnateur_id === me.id) || (me.role === 'accompagne' && d.accompagne_id === me.id))
  if (!d || !allowed) {
    res.status(404).json({ error: 'Dossier introuvable' })
    return
  }
  const q = db.prepare('SELECT cr_recap, complete_le FROM questionnaires_initiaux WHERE dossier_id=? ORDER BY id DESC LIMIT 1').get(dossierId) as
    | { cr_recap: string | null; complete_le: string | null }
    | undefined
  if (!q || !q.cr_recap) {
    res.status(404).json({ error: 'Aucun questionnaire complété' })
    return
  }
  const buf = await docxFromText('Questionnaire initial — Boussole', `Accompagné : ${d.prenom || d.email}  ·  ${(q.complete_le || '').slice(0, 10)}`, q.cr_recap)
  res.setHeader('Content-Disposition', `attachment; filename="questionnaire-initial-${dossierId}.docx"`)
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
  res.send(buf)
})

export default router
