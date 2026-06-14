import { db } from './db'

// Réglages globaux administrables (clé/valeur en base). Source unique de vérité pour les bascules
// transversales (FALC, multilingue…), indépendantes des plans d'abonnement. Tout est OFF par défaut.

export type SettingKey = 'falc_enabled' | 'multilingue_enabled'

export const SETTING_KEYS: SettingKey[] = ['falc_enabled', 'multilingue_enabled']

// Valeur par défaut (en l'absence d'entrée en base) : désactivé pour tout le monde.
const DEFAULTS: Record<SettingKey, boolean> = {
  falc_enabled: false,
  multilingue_enabled: false,
}

/** Lit un drapeau global (false par défaut). */
export function getFlag(key: SettingKey): boolean {
  try {
    const row = db.prepare('SELECT valeur FROM settings WHERE cle=?').get(key) as { valeur: string } | undefined
    if (!row) return DEFAULTS[key]
    return row.valeur === '1' || row.valeur === 'true'
  } catch {
    return DEFAULTS[key]
  }
}

/** Écrit un drapeau global (upsert). */
export function setFlag(key: SettingKey, on: boolean): void {
  db.prepare(
    `INSERT INTO settings (cle, valeur, maj_le) VALUES (?,?,datetime('now'))
     ON CONFLICT(cle) DO UPDATE SET valeur=excluded.valeur, maj_le=datetime('now')`,
  ).run(key, on ? '1' : '0')
}

/** Tous les réglages (pour la console d'administration). */
export function allSettings(): Record<SettingKey, boolean> {
  return { falc_enabled: getFlag('falc_enabled'), multilingue_enabled: getFlag('multilingue_enabled') }
}

/** Drapeaux exposés publiquement au front (via /api/context), pour conditionner l'affichage. */
export function publicFlags() {
  return {
    falc: getFlag('falc_enabled'),
    multilingue: getFlag('multilingue_enabled'),
  }
}
