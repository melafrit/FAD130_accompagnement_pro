import { Router, type Request, type Response } from 'express'
import { db } from './db'
import { requireAuth, requireRole } from './auth'

const router = Router()
interface U { id: number; role: string }
function getUser(req: Request): U {
  return (req as Request & { user?: U }).user as U
}
function ownsDossier(accId: number, dossierId: number): boolean {
  return !!db.prepare('SELECT id FROM dossiers WHERE id=? AND accompagnateur_id=?').get(dossierId, accId)
}

// Liste des tags utilisés par l'accompagnateur (pour le filtre)
router.get('/', requireAuth, requireRole('accompagnateur'), (req: Request, res: Response) => {
  const me = getUser(req)
  const tags = db
    .prepare(
      `SELECT DISTINCT t.id, t.nom FROM tags t
       JOIN dossier_tags dt ON dt.tag_id = t.id
       JOIN dossiers d ON d.id = dt.dossier_id
       WHERE d.accompagnateur_id = ? ORDER BY t.nom`,
    )
    .all(me.id)
  res.json({ tags })
})

// Ajouter un tag à un dossier (création du tag si nécessaire)
router.post('/dossier/:dossierId', requireAuth, requireRole('accompagnateur'), (req: Request, res: Response) => {
  const me = getUser(req)
  const dossierId = Number(req.params.dossierId)
  const nom = String(req.body?.nom || '').trim().toLowerCase()
  if (!ownsDossier(me.id, dossierId) || !nom) {
    res.status(400).json({ error: 'Données invalides' })
    return
  }
  let tag = db.prepare('SELECT id FROM tags WHERE nom=?').get(nom) as { id: number } | undefined
  if (!tag) {
    const info = db.prepare('INSERT INTO tags (nom) VALUES (?)').run(nom)
    tag = { id: Number(info.lastInsertRowid) }
  }
  db.prepare('INSERT OR IGNORE INTO dossier_tags (dossier_id, tag_id) VALUES (?, ?)').run(dossierId, tag.id)
  res.status(201).json({ id: tag.id, nom })
})

// Retirer un tag d'un dossier
router.delete('/dossier/:dossierId/:tagId', requireAuth, requireRole('accompagnateur'), (req: Request, res: Response) => {
  const me = getUser(req)
  const dossierId = Number(req.params.dossierId)
  const tagId = Number(req.params.tagId)
  if (!ownsDossier(me.id, dossierId)) {
    res.status(404).json({ error: 'Dossier introuvable' })
    return
  }
  db.prepare('DELETE FROM dossier_tags WHERE dossier_id=? AND tag_id=?').run(dossierId, tagId)
  res.json({ ok: true })
})

export default router
