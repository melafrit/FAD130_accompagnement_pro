import { mkdirSync, readdirSync, statSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { db } from './db'

/**
 * Sauvegardes locales horodatées de la base SQLite (sauvegarde « online », cohérente même à chaud)
 * avec rétention. Configuration par variables d'environnement :
 *  - BACKUP_DIR (défaut ./data/backups)
 *  - BACKUP_RETENTION_DAYS (défaut 14)
 *  - BACKUP_ENABLED=0 pour désactiver la planification.
 */
const BACKUP_DIR = process.env.BACKUP_DIR || './data/backups'
const RETENTION_DAYS = Number(process.env.BACKUP_RETENTION_DAYS) || 14
const NAME_RE = /^boussole-.*\.sqlite$/

/** Crée immédiatement une sauvegarde et renvoie son chemin. */
export async function backupNow(dir: string = BACKUP_DIR): Promise<string> {
  mkdirSync(dir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const file = join(dir, `boussole-${stamp}.sqlite`)
  await db.backup(file)
  return file
}

/** Supprime les sauvegardes plus anciennes que la rétention. Renvoie le nombre de fichiers supprimés. */
export function purgeOldBackups(dir: string = BACKUP_DIR, retentionDays: number = RETENTION_DAYS): number {
  let removed = 0
  const cutoff = Date.now() - retentionDays * 86_400_000
  try {
    for (const f of readdirSync(dir)) {
      if (!NAME_RE.test(f)) continue
      const p = join(dir, f)
      if (statSync(p).mtimeMs < cutoff) { unlinkSync(p); removed++ }
    }
  } catch { /* répertoire absent : rien à purger */ }
  return removed
}

/** Planifie une sauvegarde quotidienne (différée au démarrage puis toutes les 24 h). */
export function scheduleBackups(): void {
  if (process.env.BACKUP_ENABLED === '0') return
  const run = () => {
    backupNow()
      .then((f) => { const n = purgeOldBackups(); console.log(`[backup] ${f}${n ? ` (+${n} ancienne(s) purgée(s))` : ''}`) })
      .catch((e) => console.error('[backup] échec :', e))
  }
  setTimeout(run, 30_000)
  setInterval(run, 24 * 60 * 60_000)
}
