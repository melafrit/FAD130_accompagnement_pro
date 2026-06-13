import { Router, type Request, type Response } from 'express'
import { db } from './db'
import { requireAuth, requireRole } from './auth'
import { makeToken, expiryHours } from './util'
import { sendEmail, resetEmail } from './mailer'
import { FEATURES, ALL_FEATURE_KEYS, sanitizeKeys } from './features'

const router = Router()
const ROLES = ['admin', 'accompagnateur', 'accompagne']
function meId(req: Request): number {
  return (req as Request & { user?: { id: number } }).user!.id
}

// Liste de tous les comptes (avec le plan d'abonnement éventuel)
router.get('/users', requireAuth, requireRole('admin'), (_req: Request, res: Response) => {
  const users = db
    .prepare(
      `SELECT u.id, u.email, u.role, u.nom, u.prenom, u.actif, u.email_verifie, u.cree_le, u.dernier_acces,
              u.plan_id, p.nom AS plan_nom
       FROM users u LEFT JOIN plans p ON p.id = u.plan_id
       ORDER BY u.cree_le DESC`,
    )
    .all()
  res.json({ users })
})

// ---- Fonctionnalités & plans d'abonnement -------------------------------------------------

// Registre des fonctionnalités activables (pour construire les plans côté admin)
router.get('/features', requireAuth, requireRole('admin'), (_req: Request, res: Response) => {
  res.json({ features: FEATURES, all: ALL_FEATURE_KEYS })
})

// Liste des plans (avec le nombre d'utilisateurs rattachés)
router.get('/plans', requireAuth, requireRole('admin'), (_req: Request, res: Response) => {
  const rows = db
    .prepare(
      `SELECT p.id, p.nom, p.description, p.features, p.cree_le,
              (SELECT COUNT(*) FROM users u WHERE u.plan_id = p.id) AS nb_users
       FROM plans p ORDER BY p.cree_le ASC`,
    )
    .all() as Array<{ features: string }>
  const plans = rows.map((p) => ({ ...p, features: sanitizeKeys(safeParse(p.features)) }))
  res.json({ plans })
})

// Créer un plan
router.post('/plans', requireAuth, requireRole('admin'), (req: Request, res: Response) => {
  const nom = String(req.body?.nom || '').trim()
  if (!nom) {
    res.status(400).json({ error: 'Le nom du plan est requis' })
    return
  }
  const description = req.body?.description != null ? String(req.body.description) : null
  const features = sanitizeKeys(req.body?.features)
  const info = db
    .prepare('INSERT INTO plans (nom, description, features) VALUES (?, ?, ?)')
    .run(nom, description, JSON.stringify(features))
  res.status(201).json({ id: Number(info.lastInsertRowid) })
})

// Modifier un plan (nom, description, fonctionnalités)
router.patch('/plans/:id', requireAuth, requireRole('admin'), (req: Request, res: Response) => {
  const id = Number(req.params.id)
  if (!db.prepare('SELECT id FROM plans WHERE id=?').get(id)) {
    res.status(404).json({ error: 'Plan introuvable' })
    return
  }
  const { nom, description, features } = req.body || {}
  if (nom !== undefined) {
    const n = String(nom).trim()
    if (!n) {
      res.status(400).json({ error: 'Le nom du plan ne peut pas être vide' })
      return
    }
    db.prepare('UPDATE plans SET nom=? WHERE id=?').run(n, id)
  }
  if (description !== undefined) db.prepare('UPDATE plans SET description=? WHERE id=?').run(description != null ? String(description) : null, id)
  if (features !== undefined) db.prepare('UPDATE plans SET features=? WHERE id=?').run(JSON.stringify(sanitizeKeys(features)), id)
  res.json({ ok: true })
})

// Dupliquer un plan
router.post('/plans/:id/duplication', requireAuth, requireRole('admin'), (req: Request, res: Response) => {
  const src = db.prepare('SELECT nom, description, features FROM plans WHERE id=?').get(Number(req.params.id)) as
    | { nom: string; description: string | null; features: string }
    | undefined
  if (!src) {
    res.status(404).json({ error: 'Plan introuvable' })
    return
  }
  const info = db
    .prepare('INSERT INTO plans (nom, description, features) VALUES (?, ?, ?)')
    .run(`${src.nom} (copie)`, src.description, src.features)
  res.status(201).json({ id: Number(info.lastInsertRowid) })
})

// Supprimer un plan (les utilisateurs rattachés repassent au niveau max)
router.delete('/plans/:id', requireAuth, requireRole('admin'), (req: Request, res: Response) => {
  const id = Number(req.params.id)
  if (!db.prepare('SELECT id FROM plans WHERE id=?').get(id)) {
    res.status(404).json({ error: 'Plan introuvable' })
    return
  }
  db.prepare('UPDATE users SET plan_id=NULL WHERE plan_id=?').run(id)
  db.prepare('DELETE FROM plans WHERE id=?').run(id)
  res.json({ ok: true })
})

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s)
  } catch {
    return []
  }
}

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
  const { actif, role, plan_id } = req.body || {}
  if (actif !== undefined) db.prepare('UPDATE users SET actif=? WHERE id=?').run(actif ? 1 : 0, id)
  if (role !== undefined && ROLES.includes(String(role))) db.prepare('UPDATE users SET role=? WHERE id=?').run(String(role), id)
  if (plan_id !== undefined) {
    if (plan_id === null || plan_id === '') {
      db.prepare('UPDATE users SET plan_id=NULL WHERE id=?').run(id)
    } else if (db.prepare('SELECT id FROM plans WHERE id=?').get(Number(plan_id))) {
      db.prepare('UPDATE users SET plan_id=? WHERE id=?').run(Number(plan_id), id)
    } else {
      res.status(400).json({ error: 'Plan introuvable' })
      return
    }
  }
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
