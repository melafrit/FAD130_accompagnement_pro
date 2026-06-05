import bcrypt from 'bcryptjs'
import { db } from './db'
import { makeToken, expiryHours } from './util'
import { sendEmail, resetEmail } from './mailer'

type Role = 'admin' | 'accompagnateur' | 'accompagne'

/**
 * Crée un compte (sans mot de passe) s'il n'existe pas, et envoie un lien
 * d'activation (réinitialisation) pour que la personne définisse son mot de passe.
 * Utilisé en production (pas de mot de passe par défaut).
 */
async function ensureUser(email: string | undefined, role: Role): Promise<void> {
  if (!email) return
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) return

  const info = db.prepare('INSERT INTO users (email, role, email_verifie) VALUES (?, ?, 1)').run(email, role)
  const userId = Number(info.lastInsertRowid)
  const token = makeToken()
  db.prepare("INSERT INTO tokens (user_id, type, valeur, expire_le) VALUES (?, 'reset_mdp', ?, ?)")
    .run(userId, token, expiryHours(72))
  const mail = resetEmail(token)
  console.log(`[seed] Compte ${role} créé : ${email} — lien d'activation envoyé (ou journalisé en dev).`)
  await sendEmail(email, `Boussole — activez votre compte (${role})`, mail.html)
}

/**
 * Crée/active un compte avec un mot de passe connu (variable SEED_PASSWORD).
 * Réservé au DÉVELOPPEMENT / aux tests locaux.
 */
async function ensureDevUser(email: string, role: Role, password: string, prenom?: string): Promise<number> {
  const hash = await bcrypt.hash(password, 10)
  const existing = db.prepare('SELECT id FROM users WHERE email=?').get(email) as { id: number } | undefined
  if (existing) {
    db.prepare('UPDATE users SET password_hash=?, role=?, email_verifie=1, actif=1 WHERE id=?').run(hash, role, existing.id)
    return existing.id
  }
  const info = db.prepare('INSERT INTO users (email, password_hash, role, prenom, email_verifie) VALUES (?, ?, ?, ?, 1)').run(email, hash, role, prenom || null)
  return Number(info.lastInsertRowid)
}

/** Comptes initiaux. En local, SEED_PASSWORD prépare des comptes de démo prêts à l'emploi. */
export async function seed(): Promise<void> {
  const devPwd = process.env.SEED_PASSWORD
  if (devPwd) {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@boussole.local'
    const accEmail = process.env.ACCOMPAGNATEUR_EMAIL || 'accompagnateur@boussole.local'
    await ensureDevUser(adminEmail, 'admin', devPwd)
    const accId = await ensureDevUser(accEmail, 'accompagnateur', devPwd)
    const acpId = await ensureDevUser('demo.accompagne@elafrit.com', 'accompagne', devPwd, 'Démo')
    db.prepare('INSERT OR IGNORE INTO liens_accompagnement (accompagnateur_id, accompagne_id) VALUES (?, ?)').run(accId, acpId)
    if (!db.prepare('SELECT id FROM dossiers WHERE accompagne_id=? AND accompagnateur_id=?').get(acpId, accId)) {
      db.prepare('INSERT INTO dossiers (accompagne_id, accompagnateur_id, titre) VALUES (?, ?, ?)').run(acpId, accId, 'Accompagnement mémoire')
    }
    console.log('[seed:dev] Comptes de démo prêts (mot de passe = SEED_PASSWORD) : admin, accompagnateur, demo.accompagne@elafrit.com')
    return
  }
  await ensureUser(process.env.ADMIN_EMAIL, 'admin')
  await ensureUser(process.env.ACCOMPAGNATEUR_EMAIL, 'accompagnateur')
}
