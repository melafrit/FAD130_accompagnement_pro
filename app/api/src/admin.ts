import { Router, type Request, type Response } from 'express'
import { db } from './db'
import { requireAuth, requireRole } from './auth'
import { makeToken, expiryHours } from './util'
import { sendEmail, resetEmail } from './mailer'

const router = Router()
const ROLES = ['admin', 'accompagnateur', 'accompagne']
function meId(req: Request): number {
  return (req as Request & { user?: { id: number } }).user!.id
}

// Liste de tous les comptes
router.get('/users', requireAuth, requireRole('admin'), (_req: Request, res: Response) => {
  const users = db
    .prepare('SELECT id, email, role, nom, prenom, actif, email_verifie, cree_le, dernier_acces FROM users ORDER BY cree_le DESC')
    .all()
  res.json({ users })
})

// Créer un compte (sans mot de passe ; envoi d'un lien d'activation)
router.post('/users', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  const { email, role, nom, prenom } = req.body || {}
  const r = String(role || '')
  if (!email || !ROLES.includes(r)) {
    res.status(400).json({ error: 'Données invalides' })
    return
  }
  if (db.prepare('SELECT id FROM users WHERE email=?').get(email)) {
    res.status(409).json({ error: 'Email déjà utilisé' })
    return
  }
  const info = db.prepare('INSERT INTO users (email, role, nom, prenom, email_verifie) VALUES (?, ?, ?, ?, 1)').run(String(email), r, nom || null, prenom || null)
  const id = Number(info.lastInsertRowid)
  const token = makeToken()
  db.prepare("INSERT INTO tokens (user_id, type, valeur, expire_le) VALUES (?, 'reset_mdp', ?, ?)").run(id, token, expiryHours(72))
  const mail = resetEmail(token)
  await sendEmail(String(email), 'Boussole — activez votre compte', mail.html)
  res.status(201).json({ id })
})

// Activer/désactiver ou changer le rôle d'un compte
router.patch('/users/:id', requireAuth, requireRole('admin'), (req: Request, res: Response) => {
  const id = Number(req.params.id)
  if (id === meId(req)) {
    res.status(400).json({ error: 'Vous ne pouvez pas modifier votre propre compte administrateur' })
    return
  }
  if (!db.prepare('SELECT id FROM users WHERE id=?').get(id)) {
    res.status(404).json({ error: 'Utilisateur introuvable' })
    return
  }
  const { actif, role } = req.body || {}
  if (actif !== undefined) db.prepare('UPDATE users SET actif=? WHERE id=?').run(actif ? 1 : 0, id)
  if (role !== undefined && ROLES.includes(String(role))) db.prepare('UPDATE users SET role=? WHERE id=?').run(String(role), id)
  res.json({ ok: true })
})

// Rattacher un accompagné à un accompagnateur
router.post('/lien', requireAuth, requireRole('admin'), (req: Request, res: Response) => {
  const accompagnateurId = Number(req.body?.accompagnateurId)
  const accompagneId = Number(req.body?.accompagneId)
  const acc = db.prepare("SELECT id FROM users WHERE id=? AND role='accompagnateur'").get(accompagnateurId)
  const acp = db.prepare("SELECT id FROM users WHERE id=? AND role='accompagne'").get(accompagneId)
  if (!acc || !acp) {
    res.status(400).json({ error: 'Sélection invalide (accompagnateur et accompagné requis)' })
    return
  }
  db.prepare('INSERT OR IGNORE INTO liens_accompagnement (accompagnateur_id, accompagne_id) VALUES (?, ?)').run(accompagnateurId, accompagneId)
  res.json({ ok: true })
})

export default router
