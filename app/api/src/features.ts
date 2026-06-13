import type { Request, Response, NextFunction } from 'express'
import { db } from './db'

// Registre des fonctionnalités activables par plan d'abonnement.
// La clé est stable (utilisée pour le filtrage côté serveur et client) ; le libellé/catégorie servent l'admin.
export interface Feature { key: string; label: string; categorie: string }

export const FEATURES: Feature[] = [
  // Socle
  { key: 'questionnaire', label: 'Questionnaire initial', categorie: 'Socle' },
  { key: 'entretien', label: 'Entretien guidé', categorie: 'Socle' },
  { key: 'comptes_rendus', label: 'Comptes rendus', categorie: 'Socle' },
  { key: 'rdv', label: 'Rendez-vous', categorie: 'Socle' },
  { key: 'plan_action', label: 'Plan d’action', categorie: 'Socle' },
  { key: 'synthese', label: 'Synthèse du parcours', categorie: 'Socle' },
  { key: 'auto_evaluation', label: 'Grille d’auto-évaluation', categorie: 'Socle' },
  { key: 'multi_parcours', label: 'Multi-parcours (accompagné)', categorie: 'Socle' },
  // Visuel & confort de lecture
  { key: 'boussole', label: 'Boussole du parcours', categorie: 'Visuel' },
  { key: 'audio', label: 'Lecture audio (CR / synthèse)', categorie: 'Visuel' },
  { key: 'dark_mode', label: 'Mode sombre', categorie: 'Visuel' },
  // IA & posture
  { key: 'miroir', label: 'Miroir réflexif', categorie: 'IA & posture' },
  { key: 'copilote', label: 'Co-pilote d’entretien', categorie: 'IA & posture' },
  { key: 'banque_questions', label: 'Banque de questions personnalisée', categorie: 'IA & posture' },
  { key: 'coach_posture', label: 'Coach de posture contextuel', categorie: 'IA & posture' },
  { key: 'debriefing', label: 'Débriefing réflexif à chaud', categorie: 'IA & posture' },
  { key: 'replay_annote', label: 'Auto-confrontation / replay annoté', categorie: 'IA & posture' },
  { key: 'bilan_pratique', label: 'Bilan de pratique global', categorie: 'IA & posture' },
  // Relationnel & émotionnel
  { key: 'meteo', label: 'Météo intérieure', categorie: 'Relationnel' },
  { key: 'roue_emotions', label: 'Roue des émotions', categorie: 'Relationnel' },
  { key: 'journal', label: 'Micro-journal', categorie: 'Relationnel' },
  // Émergence
  { key: 'fil_rouge', label: 'Fil rouge du mémoire', categorie: 'Émergence' },
  { key: 'moments_cles', label: 'Moments-clés', categorie: 'Émergence' },
  { key: 'nuage_themes', label: 'Nuage de thèmes', categorie: 'Émergence' },
  { key: 'problematisation', label: 'Assistant de problématisation', categorie: 'Émergence' },
  { key: 'resume_parcours', label: 'Résumé « où j’en suis »', categorie: 'Émergence' },
  // Pilotage & alertes
  { key: 'signaux_faibles', label: 'Détection de décrochage', categorie: 'Pilotage' },
  { key: 'tableau_impact', label: 'Tableau d’impact', categorie: 'Pilotage' },
  { key: 'digest_email', label: 'Digest hebdomadaire (email)', categorie: 'Pilotage' },
  // Collaboration
  { key: 'mutualisation', label: 'Mutualisation entre pairs', categorie: 'Collaboration' },
  // Éthique
  { key: 'transparence', label: 'Transparence RGPD', categorie: 'Éthique' },
  { key: 'carte_parcours', label: 'Carte du parcours', categorie: 'Éthique' },
  { key: 'attestation', label: 'Attestation de fin', categorie: 'Éthique' },
  // Confort & pratique
  { key: 'visio', label: 'Visio aux rendez-vous', categorie: 'Confort' },
  { key: 'pwa_push', label: 'PWA & notifications push', categorie: 'Confort' },
  { key: 'export_pdf', label: 'Export PDF complet', categorie: 'Confort' },
  // Adoption & accessibilité
  { key: 'onboarding', label: 'Tour guidé d’accueil', categorie: 'Adoption' },
  { key: 'falc', label: 'Mode « facile à lire » (FALC)', categorie: 'Adoption' },
]

export const ALL_FEATURE_KEYS = FEATURES.map((f) => f.key)
const VALID = new Set(ALL_FEATURE_KEYS)
export function sanitizeKeys(keys: unknown): string[] {
  if (!Array.isArray(keys)) return []
  return [...new Set(keys.map(String).filter((k) => VALID.has(k)))]
}

/** Fonctionnalités activées pour un utilisateur (selon son plan ; aucun plan = tout activé). */
export function userFeatures(userId: number): Set<string> {
  const row = db.prepare('SELECT p.features FROM users u JOIN plans p ON p.id=u.plan_id WHERE u.id=?').get(userId) as { features: string } | undefined
  if (!row) return new Set(ALL_FEATURE_KEYS) // pas de plan → niveau max
  try { return new Set(sanitizeKeys(JSON.parse(row.features))) } catch { return new Set(ALL_FEATURE_KEYS) }
}

/** Middleware : bloque l'accès à un endpoint si la fonctionnalité n'est pas dans l'offre de l'utilisateur. */
export function requireFeature(key: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const u = (req as Request & { user?: { id: number } }).user
    if (!u) { res.status(401).json({ error: 'Non authentifié' }); return }
    if (!userFeatures(u.id).has(key)) { res.status(403).json({ error: 'Fonctionnalité non disponible dans votre offre' }); return }
    next()
  }
}
