import { Router, type Request, type Response } from 'express'
import { db } from './db'
import { requireAuth } from './auth'

// Relationnel & émotionnel : météo intérieure (humeur 1-5 + un mot) et micro-journal de l'accompagné.
const router = Router()
interface U { id: number; role: string }
const getUser = (req: Request) => (req as Request & { user?: U }).user as U

// Renvoie le rôle d'accès de l'utilisateur sur ce dossier, ou null.
function access(userId: number, role: string, dossierId: number): 'accompagne' | 'accompagnateur' | null {
  const d = db.prepare('SELECT accompagne_id, accompagnateur_id FROM dossiers WHERE id=?').get(dossierId) as { accompagne_id: number; accompagnateur_id: number } | undefined
  if (!d) return null
  if (role === 'accompagne' && d.accompagne_id === userId) return 'accompagne'
  if (role === 'accompagnateur' && d.accompagnateur_id === userId) return 'accompagnateur'
  return null
}

// ---------- Météo intérieure ----------
router.post('/meteo', requireAuth, (req: Request, res: Response) => {
  const me = getUser(req)
  const dossierId = Number(req.body?.dossierId)
  const acc = access(me.id, me.role, dossierId)
  if (!acc) { res.status(404).json({ error: 'Dossier introuvable' }); return }
  const niveau = Math.max(1, Math.min(5, Number(req.body?.niveau) || 0))
  if (!niveau) { res.status(400).json({ error: 'Niveau requis (1-5)' }); return }
  const mot = req.body?.mot != null ? String(req.body.mot).slice(0, 120).trim() || null : null
  const info = db.prepare('INSERT INTO meteo_humeur (dossier_id, auteur_id, role, niveau, mot) VALUES (?,?,?,?,?)').run(dossierId, me.id, acc, niveau, mot)
  res.status(201).json({ id: Number(info.lastInsertRowid), niveau, mot })
})

router.get('/meteo/dossier/:id', requireAuth, (req: Request, res: Response) => {
  const me = getUser(req)
  const id = Number(req.params.id)
  const acc = access(me.id, me.role, id)
  if (!acc) { res.status(404).json({ error: 'Dossier introuvable' }); return }
  // « mine » = mes propres relevés ; « autre » = la météo de l'accompagné (visible par l'accompagnateur).
  const byRole = (r: string) => db.prepare('SELECT id, niveau, mot, cree_le FROM meteo_humeur WHERE dossier_id=? AND role=? ORDER BY cree_le DESC, id DESC LIMIT 30').all(id, r)
  if (acc === 'accompagne') {
    res.json({ mine: byRole('accompagne'), autre: [] })
  } else {
    res.json({ mine: db.prepare("SELECT id, niveau, mot, cree_le FROM meteo_humeur WHERE dossier_id=? AND role='accompagnateur' AND auteur_id=? ORDER BY cree_le DESC, id DESC LIMIT 30").all(id, me.id), autre: byRole('accompagne') })
  }
})

// ---------- Micro-journal (accompagné) ----------
router.post('/journal', requireAuth, (req: Request, res: Response) => {
  const me = getUser(req)
  const dossierId = Number(req.body?.dossierId)
  if (access(me.id, me.role, dossierId) !== 'accompagne') { res.status(404).json({ error: 'Parcours introuvable' }); return }
  const texte = String(req.body?.texte ?? '').trim()
  if (!texte) { res.status(400).json({ error: 'Note vide' }); return }
  const partage = req.body?.partage ? 1 : 0
  const info = db.prepare('INSERT INTO journal_entrees (dossier_id, accompagne_id, texte, partage) VALUES (?,?,?,?)').run(dossierId, me.id, texte, partage)
  res.status(201).json({ id: Number(info.lastInsertRowid), texte, partage, cree_le: new Date().toISOString() })
})

router.get('/journal/dossier/:id', requireAuth, (req: Request, res: Response) => {
  const me = getUser(req)
  const id = Number(req.params.id)
  const acc = access(me.id, me.role, id)
  if (!acc) { res.status(404).json({ error: 'Dossier introuvable' }); return }
  if (acc === 'accompagne') {
    res.json({ entrees: db.prepare('SELECT id, texte, partage, cree_le, maj_le FROM journal_entrees WHERE dossier_id=? AND accompagne_id=? ORDER BY cree_le DESC, id DESC').all(id, me.id) })
  } else {
    // l'accompagnateur ne voit QUE les notes partagées
    res.json({ entrees: db.prepare('SELECT id, texte, partage, cree_le, maj_le FROM journal_entrees WHERE dossier_id=? AND partage=1 ORDER BY cree_le DESC, id DESC').all(id) })
  }
})

router.patch('/journal/:id', requireAuth, (req: Request, res: Response) => {
  const me = getUser(req)
  const id = Number(req.params.id)
  const row = db.prepare('SELECT id FROM journal_entrees WHERE id=? AND accompagne_id=?').get(id, me.id)
  if (!row) { res.status(404).json({ error: 'Note introuvable' }); return }
  const sets: string[] = []
  const vals: (string | number)[] = []
  if (req.body?.texte != null) {
    const t = String(req.body.texte).trim()
    if (!t) { res.status(400).json({ error: 'Note vide' }); return }
    sets.push('texte=?'); vals.push(t)
  }
  if (req.body?.partage != null) { sets.push('partage=?'); vals.push(req.body.partage ? 1 : 0) }
  if (!sets.length) { res.json({ ok: true }); return }
  sets.push("maj_le=datetime('now')")
  vals.push(id)
  db.prepare(`UPDATE journal_entrees SET ${sets.join(', ')} WHERE id=?`).run(...vals)
  res.json({ ok: true })
})

router.delete('/journal/:id', requireAuth, (req: Request, res: Response) => {
  const me = getUser(req)
  const id = Number(req.params.id)
  const info = db.prepare('DELETE FROM journal_entrees WHERE id=? AND accompagne_id=?').run(id, me.id)
  if (!info.changes) { res.status(404).json({ error: 'Note introuvable' }); return }
  res.json({ ok: true })
})

export default router
