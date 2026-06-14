import { Router, type Request, type Response } from 'express'
import { db } from './db'
import { requireAuth, requireRole } from './auth'
import { makeToken, expiryHours } from './util'
import { sendEmail, resetEmail } from './mailer'
import { FEATURES, ALL_FEATURE_KEYS, sanitizeKeys } from './features'
import { BUILTIN_PLAN_NAMES } from './seed'
import { allSettings, setFlag, SETTING_KEYS } from './settings'
import { processEffacement, retentionEligibles, anonymizeUser, deleteUser } from './ethique'

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

// Réglages généraux globaux (bascules transversales : FALC, multilingue…)
router.get('/settings', requireAuth, requireRole('admin'), (_req: Request, res: Response) => {
  res.json({ settings: allSettings() })
})

// Mise à jour d'un ou plusieurs réglages (corps : { falc_enabled?: bool, multilingue_enabled?: bool })
router.patch('/settings', requireAuth, requireRole('admin'), (req: Request, res: Response) => {
  const body = req.body || {}
  for (const key of SETTING_KEYS) {
    if (key in body) setFlag(key, body[key] === true || body[key] === '1' || body[key] === 1)
  }
  res.json({ settings: allSettings() })
})

// Liste des plans (avec le nombre d'utilisateurs rattachés)
router.get('/plans', requireAuth, requireRole('admin'), (_req: Request, res: Response) => {
  const rows = db
    .prepare(
      `SELECT p.id, p.nom, p.description, p.features, p.cree_le,
              (SELECT COUNT(*) FROM users u WHERE u.plan_id = p.id) AS nb_users
       FROM plans p ORDER BY p.cree_le ASC`,
    )
    .all() as Array<{ nom: string; features: string }>
  // `builtin` : plan socle géré par l'application (non modifiable / non supprimable).
  const plans = rows.map((p) => ({ ...p, features: sanitizeKeys(safeParse(p.features)), builtin: BUILTIN_PLAN_NAMES.has(p.nom) }))
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
  const existing = db.prepare('SELECT nom FROM plans WHERE id=?').get(id) as { nom: string } | undefined
  if (!existing) {
    res.status(404).json({ error: 'Plan introuvable' })
    return
  }
  // Les plans socle (Découverte/Essentiel/Pro) sont gérés par le code (réalignés au démarrage) : non modifiables.
  if (BUILTIN_PLAN_NAMES.has(existing.nom)) {
    res.status(403).json({ error: 'Ce plan est un plan socle, géré par l’application : il ne peut pas être modifié.' })
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
  const existing = db.prepare('SELECT nom FROM plans WHERE id=?').get(id) as { nom: string } | undefined
  if (!existing) {
    res.status(404).json({ error: 'Plan introuvable' })
    return
  }
  // Plans socle protégés (cf. PATCH) : non supprimables.
  if (BUILTIN_PLAN_NAMES.has(existing.nom)) {
    res.status(403).json({ error: 'Ce plan est un plan socle, géré par l’application : il ne peut pas être supprimé.' })
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

// ---- Console RGPD : demandes d'effacement & rétention -------------------------------------

// Demandes d'effacement en attente (avec l'accompagné et le parcours concernés)
router.get('/effacements', requireAuth, requireRole('admin'), (_req: Request, res: Response) => {
  const demandes = db.prepare(
    `SELECT e.id, e.motif, e.statut, e.cree_le, e.accompagne_id,
            u.email, u.prenom, u.nom, u.anonymise, d.titre AS dossier_titre
     FROM demandes_effacement e
     JOIN users u ON u.id=e.accompagne_id
     LEFT JOIN dossiers d ON d.id=e.dossier_id
     WHERE e.statut='en_attente' ORDER BY e.cree_le ASC`,
  ).all()
  res.json({ demandes })
})

// Traiter une demande : anonymiser OU supprimer (au choix de l'admin)
router.post('/effacements/:id', requireAuth, requireRole('admin'), (req: Request, res: Response) => {
  const action = String(req.body?.action || '')
  if (action !== 'anonymiser' && action !== 'supprimer') { res.status(400).json({ error: 'Action invalide (anonymiser | supprimer)' }); return }
  if (!processEffacement(Number(req.params.id), action)) { res.status(404).json({ error: 'Demande introuvable' }); return }
  res.json({ ok: true, action })
})

// Action RGPD directe sur un compte (hors demande) — anonymiser ou supprimer
router.post('/rgpd/:userId', requireAuth, requireRole('admin'), (req: Request, res: Response) => {
  const userId = Number(req.params.userId)
  const action = String(req.body?.action || '')
  if (userId === meId(req)) { res.status(400).json({ error: 'Action impossible sur votre propre compte' }); return }
  const u = db.prepare('SELECT id FROM users WHERE id=?').get(userId)
  if (!u) { res.status(404).json({ error: 'Utilisateur introuvable' }); return }
  if (action === 'anonymiser') anonymizeUser(userId)
  else if (action === 'supprimer') deleteUser(userId)
  else { res.status(400).json({ error: 'Action invalide' }); return }
  res.json({ ok: true, action })
})

// Politique de rétention : comptes éligibles à l'anonymisation automatique
router.get('/retention', requireAuth, requireRole('admin'), (_req: Request, res: Response) => {
  const months = Number(process.env.RETENTION_MONTHS) || 36
  res.json({ months, auto: process.env.RETENTION_AUTO === '1', eligibles: retentionEligibles(months) })
})

// Appliquer la rétention maintenant (anonymise les comptes éligibles)
router.post('/retention/appliquer', requireAuth, requireRole('admin'), (_req: Request, res: Response) => {
  const elig = retentionEligibles()
  elig.forEach((u) => anonymizeUser(u.id))
  res.json({ ok: true, anonymises: elig.length })
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
