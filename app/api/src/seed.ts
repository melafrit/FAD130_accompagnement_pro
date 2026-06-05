import { db } from './db'
import { makeToken, expiryHours } from './util'
import { sendEmail, resetEmail } from './mailer'

type Role = 'admin' | 'accompagnateur' | 'accompagne'

/**
 * Crée un compte (sans mot de passe) s'il n'existe pas, et envoie un lien
 * d'activation (réinitialisation) pour que la personne définisse son mot de passe.
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

/** Comptes initiaux définis par ADMIN_EMAIL et ACCOMPAGNATEUR_EMAIL. */
export async function seed(): Promise<void> {
  await ensureUser(process.env.ADMIN_EMAIL, 'admin')
  await ensureUser(process.env.ACCOMPAGNATEUR_EMAIL, 'accompagnateur')
}
