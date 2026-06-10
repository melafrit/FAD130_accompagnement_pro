import { Router, type Request, type Response, type NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { db } from './db'
import { makeToken, expiryHours } from './util'
import { sendEmail, verificationEmail, resetEmail } from './mailer'

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me'
const COOKIE = 'boussole_token'
const PROD = process.env.NODE_ENV === 'production'
const CGU_VERSION = '1.0'
const PC_VERSION = '1.0'

type Role = 'admin' | 'accompagnateur' | 'accompagne'
interface SessionUser { id: number; email: string; role: Role }
type ReqUser = Request & { user?: SessionUser; cookies?: Record<string, string> }

interface UserRow {
  id: number
  email: string
  password_hash: string | null
  role: Role
  nom: string | null
  prenom: string | null
  email_verifie: number
  actif: number
}

interface TokenRow { id: number; user_id: number; expire_le: string }

const router = Router()

function setAuthCookie(res: Response, user: SessionUser): void {
  const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' })
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: PROD,
    maxAge: 7 * 24 * 3600 * 1000,
  })
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = (req as ReqUser).cookies?.[COOKIE]
  if (!token) {
    res.status(401).json({ error: 'Non authentifié' })
    return
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as SessionUser
    ;(req as ReqUser).user = { id: payload.id, email: payload.email, role: payload.role }
    next()
  } catch {
    res.status(401).json({ error: 'Session invalide' })
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as ReqUser).user
    if (!user || !roles.includes(user.role)) {
      res.status(403).json({ error: 'Accès refusé' })
      return
    }
    next()
  }
}

// --- Inscription ---
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['accompagnateur', 'accompagne']),
  nom: z.string().min(1).optional(),
  prenom: z.string().min(1).optional(),
  consent: z.literal(true),
})

router.post('/register', async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Données invalides (mot de passe ≥ 8 caractères, consentement requis)' })
    return
  }
  const { email, password, role, nom, prenom } = parsed.data
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) {
    res.status(409).json({ error: 'Un compte existe déjà avec cet email' })
    return
  }
  const hash = await bcrypt.hash(password, 10)
  const info = db
    .prepare('INSERT INTO users (email, password_hash, role, nom, prenom, email_verifie) VALUES (?, ?, ?, ?, ?, 0)')
    .run(email, hash, role, nom ?? null, prenom ?? null)
  const userId = Number(info.lastInsertRowid)
  db.prepare('INSERT INTO consentements (user_id, version_cgu, version_pc, ip) VALUES (?, ?, ?, ?)')
    .run(userId, CGU_VERSION, PC_VERSION, req.ip ?? null)
  const token = makeToken()
  db.prepare("INSERT INTO tokens (user_id, type, valeur, expire_le) VALUES (?, 'verif_email', ?, ?)")
    .run(userId, token, expiryHours(48))
  const mail = verificationEmail(token)
  await sendEmail(email, mail.subject, mail.html)
  res.status(201).json({ ok: true, message: 'Compte créé. Vérifiez votre email pour l’activer.' })
})

// --- Vérification de l'email ---
router.get('/verify-email', (req: Request, res: Response) => {
  const token = String(req.query.token || '')
  const row = db
    .prepare("SELECT id, user_id, expire_le FROM tokens WHERE valeur = ? AND type = 'verif_email' AND utilise = 0")
    .get(token) as TokenRow | undefined
  if (!row || row.expire_le < new Date().toISOString()) {
    res.status(400).json({ error: 'Lien invalide ou expiré' })
    return
  }
  const pend = db.prepare('SELECT email_pending FROM users WHERE id = ?').get(row.user_id) as { email_pending: string | null } | undefined
  let message = 'Email vérifié. Vous pouvez vous connecter.'
  if (pend?.email_pending) {
    // Changement d'e-mail : on applique l'adresse en attente (si toujours libre)
    const taken = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(pend.email_pending, row.user_id)
    if (taken) {
      res.status(409).json({ error: 'Cette adresse e-mail est désormais utilisée par un autre compte.' })
      return
    }
    db.prepare('UPDATE users SET email = email_pending, email_pending = NULL, email_verifie = 1 WHERE id = ?').run(row.user_id)
    message = 'Nouvelle adresse e-mail confirmée.'
  } else {
    db.prepare('UPDATE users SET email_verifie = 1 WHERE id = ?').run(row.user_id)
  }
  db.prepare('UPDATE tokens SET utilise = 1 WHERE id = ?').run(row.id)
  res.json({ ok: true, message })
})

// --- Connexion ---
router.post('/login', async (req: Request, res: Response) => {
  const parsed = z.object({ email: z.string().email(), password: z.string() }).safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Données invalides' })
    return
  }
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(parsed.data.email) as UserRow | undefined
  if (!user || !user.password_hash) {
    res.status(401).json({ error: 'Identifiants incorrects' })
    return
  }
  if (!user.actif) {
    res.status(403).json({ error: 'Compte désactivé' })
    return
  }
  if (!(await bcrypt.compare(parsed.data.password, user.password_hash))) {
    res.status(401).json({ error: 'Identifiants incorrects' })
    return
  }
  if (!user.email_verifie) {
    res.status(403).json({ error: 'Email non vérifié. Consultez votre boîte mail.' })
    return
  }
  setAuthCookie(res, { id: user.id, email: user.email, role: user.role })
  db.prepare("UPDATE users SET dernier_acces = datetime('now') WHERE id = ?").run(user.id)
  res.json({ user: { id: user.id, email: user.email, role: user.role, nom: user.nom, prenom: user.prenom } })
})

// --- Déconnexion ---
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie(COOKIE)
  res.json({ ok: true })
})

// --- Profil courant ---
router.get('/me', requireAuth, (req: Request, res: Response) => {
  const u = (req as ReqUser).user as SessionUser
  const row = db.prepare('SELECT id, email, role, nom, prenom FROM users WHERE id = ?').get(u.id)
  res.json({ user: row })
})

// --- Mise à jour du profil (prénom / nom) ---
router.patch('/me', requireAuth, (req: Request, res: Response) => {
  const u = (req as ReqUser).user as SessionUser
  const parsed = z.object({ prenom: z.string().max(80).optional(), nom: z.string().max(80).optional() }).safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Données invalides' })
    return
  }
  const prenom = parsed.data.prenom?.trim() || null
  const nom = parsed.data.nom?.trim() || null
  db.prepare('UPDATE users SET prenom = ?, nom = ? WHERE id = ?').run(prenom, nom, u.id)
  const row = db.prepare('SELECT id, email, role, nom, prenom FROM users WHERE id = ?').get(u.id)
  res.json({ user: row })
})

// --- Changement de mot de passe (depuis le profil) ---
router.post('/change-password', requireAuth, async (req: Request, res: Response) => {
  const u = (req as ReqUser).user as SessionUser
  const parsed = z.object({ ancien: z.string(), nouveau: z.string().min(8) }).safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Le nouveau mot de passe doit faire au moins 8 caractères.' })
    return
  }
  const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(u.id) as { password_hash: string | null } | undefined
  if (!row || !row.password_hash || !(await bcrypt.compare(parsed.data.ancien, row.password_hash))) {
    res.status(400).json({ error: 'Mot de passe actuel incorrect.' })
    return
  }
  const hash = await bcrypt.hash(parsed.data.nouveau, 10)
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, u.id)
  res.json({ ok: true })
})

// --- Changement d'adresse e-mail (avec re-validation par lien envoyé à la nouvelle adresse) ---
router.post('/change-email', requireAuth, async (req: Request, res: Response) => {
  const u = (req as ReqUser).user as SessionUser
  const parsed = z.object({ email: z.string().email() }).safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Adresse e-mail invalide.' })
    return
  }
  const email = parsed.data.email.trim()
  const me = db.prepare('SELECT email FROM users WHERE id = ?').get(u.id) as { email: string } | undefined
  if (me && me.email.toLowerCase() === email.toLowerCase()) {
    res.status(400).json({ error: 'C’est déjà votre adresse actuelle.' })
    return
  }
  const taken = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, u.id)
  if (taken) {
    res.status(409).json({ error: 'Cette adresse est déjà utilisée par un autre compte.' })
    return
  }
  db.prepare('UPDATE users SET email_pending = ? WHERE id = ?').run(email, u.id)
  const token = makeToken()
  db.prepare("INSERT INTO tokens (user_id, type, valeur, expire_le) VALUES (?, 'verif_email', ?, ?)").run(u.id, token, expiryHours(48))
  const mail = verificationEmail(token)
  await sendEmail(email, mail.subject, mail.html)
  res.json({ ok: true, message: 'Un lien de confirmation a été envoyé à votre nouvelle adresse.' })
})

// --- Demande de réinitialisation ---
router.post('/request-reset', async (req: Request, res: Response) => {
  const parsed = z.object({ email: z.string().email() }).safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Email invalide' })
    return
  }
  const user = db.prepare('SELECT id, email FROM users WHERE email = ?').get(parsed.data.email) as
    | { id: number; email: string }
    | undefined
  if (user) {
    const token = makeToken()
    db.prepare("INSERT INTO tokens (user_id, type, valeur, expire_le) VALUES (?, 'reset_mdp', ?, ?)")
      .run(user.id, token, expiryHours(2))
    const mail = resetEmail(token)
    await sendEmail(user.email, mail.subject, mail.html)
  }
  res.json({ ok: true, message: 'Si un compte existe, un email a été envoyé.' })
})

// --- Réinitialisation du mot de passe ---
router.post('/reset', async (req: Request, res: Response) => {
  const parsed = z.object({ token: z.string(), password: z.string().min(8) }).safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Mot de passe trop court (≥ 8 caractères)' })
    return
  }
  const row = db
    .prepare("SELECT id, user_id, expire_le FROM tokens WHERE valeur = ? AND type = 'reset_mdp' AND utilise = 0")
    .get(parsed.data.token) as TokenRow | undefined
  if (!row || row.expire_le < new Date().toISOString()) {
    res.status(400).json({ error: 'Lien invalide ou expiré' })
    return
  }
  const hash = await bcrypt.hash(parsed.data.password, 10)
  db.prepare('UPDATE users SET password_hash = ?, email_verifie = 1 WHERE id = ?').run(hash, row.user_id)
  db.prepare('UPDATE tokens SET utilise = 1 WHERE id = ?').run(row.id)
  res.json({ ok: true, message: 'Mot de passe mis à jour. Vous pouvez vous connecter.' })
})

export default router
