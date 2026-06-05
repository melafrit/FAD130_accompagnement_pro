import { Router, type Request, type Response } from 'express'
import { db } from './db'
import { requireAuth } from './auth'

const router = Router()
function uid(req: Request): number {
  return (req as Request & { user?: { id: number } }).user!.id
}

// Liste des notifications + nombre de non lues
router.get('/', requireAuth, (req: Request, res: Response) => {
  const id = uid(req)
  const notifications = db
    .prepare('SELECT id, texte, lu, cree_le FROM notifications WHERE user_id=? ORDER BY cree_le DESC LIMIT 30')
    .all(id)
  const nl = db.prepare('SELECT COUNT(*) AS n FROM notifications WHERE user_id=? AND lu=0').get(id) as { n: number }
  res.json({ notifications, nonLues: nl.n })
})

// Tout marquer comme lu
router.post('/lues', requireAuth, (req: Request, res: Response) => {
  db.prepare('UPDATE notifications SET lu=1 WHERE user_id=?').run(uid(req))
  res.json({ ok: true })
})

export default router
