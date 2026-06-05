import { Router, type Request, type Response } from 'express'
import { db } from './db'
import { requireAuth, requireRole } from './auth'

const router = Router()
interface U { id: number; role: string }
function getUser(req: Request): U {
  return (req as Request & { user?: U }).user as U
}

// Accompagné : ses propres actions (plan d'action)
router.get('/mine', requireAuth, requireRole('accompagne'), (req: Request, res: Response) => {
  const me = getUser(req)
  const actions = db
    .prepare(
      `SELECT a.id, a.libelle, a.echeance, a.critere, a.statut
       FROM actions a JOIN dossiers d ON d.id = a.dossier_id
       WHERE d.accompagne_id = ? ORDER BY a.id DESC`,
    )
    .all(me.id)
  res.json({ actions })
})

// Accompagnateur : actions d'un dossier
router.get('/', requireAuth, requireRole('accompagnateur'), (req: Request, res: Response) => {
  const me = getUser(req)
  const dossierId = Number(req.query.dossierId)
  const owns = db.prepare('SELECT id FROM dossiers WHERE id=? AND accompagnateur_id=?').get(dossierId, me.id)
  if (!owns) {
    res.status(404).json({ error: 'Dossier introuvable' })
    return
  }
  const actions = db.prepare('SELECT id, libelle, echeance, critere, statut FROM actions WHERE dossier_id=? ORDER BY id DESC').all(dossierId)
  res.json({ actions })
})

// Accompagnateur : ajouter une action
router.post('/', requireAuth, requireRole('accompagnateur'), (req: Request, res: Response) => {
  const me = getUser(req)
  const { dossierId, libelle, echeance, critere } = req.body || {}
  const owns = db.prepare('SELECT id FROM dossiers WHERE id=? AND accompagnateur_id=?').get(Number(dossierId), me.id)
  if (!owns || !libelle) {
    res.status(400).json({ error: 'Données invalides' })
    return
  }
  const info = db
    .prepare('INSERT INTO actions (dossier_id, libelle, echeance, critere) VALUES (?, ?, ?, ?)')
    .run(Number(dossierId), String(libelle), echeance || null, critere || null)
  res.status(201).json({ id: Number(info.lastInsertRowid) })
})

// Changer le statut (accompagnateur ou accompagné du dossier)
router.patch('/:id', requireAuth, (req: Request, res: Response) => {
  const me = getUser(req)
  const id = Number(req.params.id)
  const statut = String(req.body?.statut || '')
  if (!['a_faire', 'en_cours', 'fait'].includes(statut)) {
    res.status(400).json({ error: 'Statut invalide' })
    return
  }
  const a = db
    .prepare('SELECT d.accompagnateur_id, d.accompagne_id FROM actions a JOIN dossiers d ON d.id=a.dossier_id WHERE a.id=?')
    .get(id) as { accompagnateur_id: number; accompagne_id: number } | undefined
  if (!a || (a.accompagnateur_id !== me.id && a.accompagne_id !== me.id)) {
    res.status(404).json({ error: 'Action introuvable' })
    return
  }
  db.prepare('UPDATE actions SET statut=? WHERE id=?').run(statut, id)
  res.json({ ok: true })
})

export default router
