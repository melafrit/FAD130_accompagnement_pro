import bcrypt from 'bcryptjs'
import { db } from './db'
import { makeToken, expiryHours } from './util'
import { sendEmail, resetEmail } from './mailer'
import { seedDemoData } from './seedDemo'
import { ALL_FEATURE_KEYS, sanitizeKeys } from './features'

type Role = 'admin' | 'accompagnateur' | 'accompagne'

// Définition canonique des 3 plans socle (la source de vérité est le code).
const SOCLE_KEYS = ['questionnaire', 'entretien', 'comptes_rendus', 'rdv', 'plan_action', 'synthese', 'auto_evaluation', 'multi_parcours']
const ESSENTIEL_KEYS = [...SOCLE_KEYS, 'boussole', 'audio', 'dark_mode', 'meteo', 'journal', 'fil_rouge', 'moments_cles', 'resume_parcours', 'transparence']

export const BUILTIN_PLANS = [
  { nom: 'Découverte', description: 'Le socle de l’accompagnement : questionnaire, entretiens, comptes rendus, rendez-vous, plan d’action, synthèse.', features: SOCLE_KEYS },
  { nom: 'Essentiel', description: 'Le socle enrichi du confort de lecture, du suivi émotionnel et des premières aides à l’émergence.', features: ESSENTIEL_KEYS },
  { nom: 'Pro', description: 'L’offre complète : toutes les fonctionnalités, y compris l’IA avancée, le pilotage, la collaboration et les outils d’adoption.', features: ALL_FEATURE_KEYS },
]

/** Noms des plans socle — protégés contre l'édition/suppression via l'admin (cf. admin.ts). */
export const BUILTIN_PLAN_NAMES = new Set(BUILTIN_PLANS.map((p) => p.nom))

/**
 * Réaligne les 3 plans socle sur leur définition de code à CHAQUE démarrage (upsert par nom) :
 * garantit que « Pro » contient TOUTES les clés du registre FEATURES même après ajout d'une
 * fonctionnalité, et que Découverte/Essentiel restent fidèles à leur définition. Les plans
 * personnalisés (admin) ne sont jamais touchés ; les clés obsolètes sont nettoyées (sanitizeKeys).
 */
function seedPlans(): void {
  const exists = db.prepare('SELECT id FROM plans WHERE nom=?')
  const upd = db.prepare('UPDATE plans SET description=?, features=? WHERE nom=?')
  const ins = db.prepare('INSERT INTO plans (nom, description, features) VALUES (?, ?, ?)')
  for (const p of BUILTIN_PLANS) {
    const features = JSON.stringify(sanitizeKeys(p.features))
    if (exists.get(p.nom)) upd.run(p.description, features, p.nom)
    else ins.run(p.nom, p.description, features)
  }
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
