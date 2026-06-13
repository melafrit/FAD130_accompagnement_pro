import bcrypt from 'bcryptjs'
import { db } from './db'
import { makeToken, expiryHours } from './util'
import { sendEmail, resetEmail } from './mailer'
import { seedDemoData } from './seedDemo'
import { ALL_FEATURE_KEYS } from './features'

type Role = 'admin' | 'accompagnateur' | 'accompagne'

/**
 * Plans d'abonnement d'exemple, créés une seule fois (si aucun plan n'existe).
 * Par défaut, les utilisateurs n'ont AUCUN plan (plan_id NULL = niveau max, toutes les
 * fonctionnalités). Ces plans servent à l'admin pour restreindre certains comptes.
 */
function seedPlans(): void {
  const count = (db.prepare('SELECT COUNT(*) AS n FROM plans').get() as { n: number }).n
  if (count > 0) return
  const SOCLE = ['questionnaire', 'entretien', 'comptes_rendus', 'rdv', 'plan_action', 'synthese', 'auto_evaluation', 'multi_parcours']
  const ESSENTIEL = [...SOCLE, 'boussole', 'audio', 'dark_mode', 'meteo', 'journal', 'fil_rouge', 'moments_cles', 'resume_parcours', 'transparence']
  const ins = db.prepare('INSERT INTO plans (nom, description, features) VALUES (?, ?, ?)')
  ins.run('Découverte', 'Le socle de l’accompagnement : questionnaire, entretiens, comptes rendus, rendez-vous, plan d’action, synthèse.', JSON.stringify(SOCLE))
  ins.run('Essentiel', 'Le socle enrichi du confort de lecture, du suivi émotionnel et des premières aides à l’émergence.', JSON.stringify(ESSENTIEL))
  ins.run('Pro', 'L’offre complète : toutes les fonctionnalités, y compris l’IA avancée, le pilotage, la collaboration et les outils d’adoption.', JSON.stringify(ALL_FEATURE_KEYS))
  console.log('[seed] Plans d’abonnement d’exemple créés : Découverte, Essentiel, Pro (utilisateurs au niveau max par défaut).')
}

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
async function ensureDevUser(email: string, role: Role, password: string, prenom?: string, nom?: string): Promise<number> {
  const hash = await bcrypt.hash(password, 10)
  const existing = db.prepare('SELECT id FROM users WHERE email=?').get(email) as { id: number } | undefined
  if (existing) {
    db.prepare('UPDATE users SET password_hash=?, role=?, email_verifie=1, actif=1, prenom=COALESCE(?, prenom), nom=COALESCE(?, nom) WHERE id=?').run(hash, role, prenom || null, nom || null, existing.id)
    return existing.id
  }
  const info = db.prepare('INSERT INTO users (email, password_hash, role, prenom, nom, email_verifie) VALUES (?, ?, ?, ?, ?, 1)').run(email, hash, role, prenom || null, nom || null)
  return Number(info.lastInsertRowid)
}

/** Comptes initiaux. En local, SEED_PASSWORD prépare des comptes de démo prêts à l'emploi. */
export async function seed(): Promise<void> {
  // Retire l'ancien compte de démo (remplacé par afrit_mohamed@yahoo.fr / Amine) s'il traîne encore.
  // Les données liées (dossier, entretiens…) partent en cascade (ON DELETE CASCADE).
  db.prepare("DELETE FROM users WHERE email = 'demo.accompagne@elafrit.com'").run()

  seedPlans()

  const devPwd = process.env.SEED_PASSWORD
  if (devPwd) {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@boussole.local'
    const accEmail = process.env.ACCOMPAGNATEUR_EMAIL || 'accompagnateur@boussole.local'
    // Mot de passe partagé pour les comptes de démo @boussole.demo (et SEED_PASSWORD pour les comptes réels).
    const demoPwd = 'BoussoleDemo2026'
    await ensureDevUser(adminEmail, 'admin', devPwd, 'Mohamed')
    // 2 accompagnateurs : Mohamed (réel) + Camille (démo)
    const mohamedId = await ensureDevUser(accEmail, 'accompagnateur', devPwd, 'Mohamed', 'El Afrit')
    const camilleId = await ensureDevUser('camille.laurent@boussole.demo', 'accompagnateur', demoPwd, 'Camille', 'Laurent')
    // 3 accompagnés : Amine (réel) + Léa + Karim (démo)
    const amineId = await ensureDevUser('afrit_mohamed@yahoo.fr', 'accompagne', devPwd, 'Amine', 'Bensaïd')
    const leaId = await ensureDevUser('lea.martin@boussole.demo', 'accompagne', demoPwd, 'Léa', 'Martin')
    const karimId = await ensureDevUser('karim.benali@boussole.demo', 'accompagne', demoPwd, 'Karim', 'Benali')
    // Liens d'accompagnement (un accompagné peut être suivi par plusieurs accompagnateurs)
    const lien = db.prepare('INSERT OR IGNORE INTO liens_accompagnement (accompagnateur_id, accompagne_id) VALUES (?, ?)')
    lien.run(mohamedId, amineId)   // D1
    lien.run(camilleId, amineId)   // D2
    lien.run(mohamedId, leaId)     // D3
    lien.run(camilleId, leaId)     // D4
    lien.run(camilleId, karimId)   // D5
    lien.run(mohamedId, karimId)   // D6
    await seedDemoData({ mohamed: mohamedId, camille: camilleId, amine: amineId, lea: leaId, karim: karimId })
    console.log('[seed:dev] Comptes de démo prêts : 2 accompagnateurs (Mohamed, Camille) + 3 accompagnés (Amine, Léa, Karim) + jeu de données complet (6 dossiers).')
    return
  }
  await ensureUser(process.env.ADMIN_EMAIL, 'admin')
  await ensureUser(process.env.ACCOMPAGNATEUR_EMAIL, 'accompagnateur')
}
