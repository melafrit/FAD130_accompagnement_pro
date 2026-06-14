import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { db } from './db'
import { logger } from './observability'
import { sendEmail } from './mailer'
import { getDependency } from './depStatus'

/**
 * Supervision (monitoring).
 *  - Santé TECHNIQUE en temps réel : Claude/Brevo en passif (succès/échec des appels réels),
 *    base et sauvegardes en actif. Alertes EMAIL à l'admin sur changement d'état (anti-spam).
 *  - KPI MÉTIER historisés : instantané quotidien (metrics_daily) pour les tendances.
 */

export type DepState = { status: 'ok' | 'warn' | 'down' | 'unknown'; detail: string; since: string | null }

function minutesAgo(at: number | null): number { return at ? Math.round((Date.now() - at) / 60000) : 0 }

function passiveState(name: 'claude' | 'brevo', label: string): DepState {
  const p = getDependency(name)
  if (p.ok === null) return { status: 'unknown', detail: `${label} : aucun appel récent`, since: null }
  const since = p.at ? new Date(p.at).toISOString() : null
  if (p.ok) return { status: 'ok', detail: `Dernier appel réussi il y a ${minutesAgo(p.at)} min`, since }
  return { status: 'down', detail: `Dernier appel en échec il y a ${minutesAgo(p.at)} min : ${p.lastError || ''}`, since }
}

function dbState(): DepState {
  try { db.prepare('SELECT 1 AS ok').get(); return { status: 'ok', detail: 'Base SQLite accessible', since: null } }
  catch (e) { return { status: 'down', detail: `Base inaccessible : ${e instanceof Error ? e.message : String(e)}`, since: null } }
}

function backupsState(): DepState {
  const dir = process.env.BACKUP_DIR || './data/backups'
  try {
    const files = readdirSync(dir).filter((f) => /^boussole-.*\.sqlite$/.test(f))
    if (!files.length) return { status: 'warn', detail: 'Aucune sauvegarde trouvée', since: null }
    const latest = Math.max(...files.map((f) => statSync(join(dir, f)).mtimeMs))
    const ageH = Math.round((Date.now() - latest) / 3_600_000)
    const since = new Date(latest).toISOString()
    if (ageH > 36) return { status: 'warn', detail: `Dernière sauvegarde il y a ${ageH} h (> 36 h) — vérifier la planification`, since }
    return { status: 'ok', detail: `Dernière sauvegarde il y a ${ageH} h (${files.length} au total)`, since }
  } catch { return { status: 'warn', detail: 'Répertoire de sauvegarde introuvable', since: null } }
}

function errorRateState(): DepState {
  try {
    const recent = (db.prepare("SELECT COUNT(*) AS n FROM error_log WHERE cree_le >= datetime('now','-15 minutes')").get() as { n: number }).n
    const seuil = Number(process.env.ALERT_5XX_15MIN) || 10
    if (recent >= seuil) return { status: 'down', detail: `${recent} erreurs serveur sur 15 min (seuil ${seuil})`, since: null }
    if (recent > 0) return { status: 'warn', detail: `${recent} erreur(s) serveur sur 15 min`, since: null }
    return { status: 'ok', detail: 'Aucune erreur serveur récente', since: null }
  } catch { return { status: 'unknown', detail: 'Journal d’erreurs indisponible', since: null } }
}

export function healthStatus() {
  return {
    claude: passiveState('claude', 'IA Claude (Anthropic)'),
    brevo: passiveState('brevo', 'Email (Brevo)'),
    database: dbState(),
    backups: backupsState(),
    error_rate: errorRateState(),
    time: new Date().toISOString(),
  }
}

// ------------------------------------------------------------------
// Alertes email (sur changement d'état vers warn/down) — anti-spam via alert_state
// ------------------------------------------------------------------
const ALERT_KEYS: (keyof ReturnType<typeof healthStatus>)[] = ['claude', 'brevo', 'database', 'backups', 'error_rate']
const LABELS: Record<string, string> = { claude: 'IA Claude', brevo: 'Email (Brevo)', database: 'Base de données', backups: 'Sauvegardes', error_rate: 'Taux d’erreur serveur' }

export function evaluateAndAlert(): void {
  const h = healthStatus()
  const to = process.env.ADMIN_EMAIL
  for (const k of ALERT_KEYS) {
    const st = h[k] as DepState
    const prev = db.prepare('SELECT statut FROM alert_state WHERE cle=?').get(k) as { statut: string } | undefined
    const prevStatus = prev?.statut || 'ok'
    if (st.status === prevStatus) continue
    db.prepare(
      `INSERT INTO alert_state (cle, statut, depuis) VALUES (?,?,datetime('now'))
       ON CONFLICT(cle) DO UPDATE SET statut=excluded.statut, depuis=datetime('now')`,
    ).run(k, st.status)
    // Notifie uniquement les transitions VERS un état dégradé (warn/down).
    if ((st.status === 'down' || st.status === 'warn') && to) {
      const html = `<div style="font-family:system-ui,sans-serif">
        <h2 style="color:#16324f">Boussole — supervision</h2>
        <p>La dépendance <strong>${LABELS[k] || k}</strong> est passée à l'état <strong>${st.status.toUpperCase()}</strong>.</p>
        <p>${st.detail}</p>
        <p style="color:#888;font-size:12px">Tableau de bord : /admin/supervision</p></div>`
      sendEmail(to, `[Boussole] Alerte ${LABELS[k] || k} : ${st.status}`, html)
        .then(() => db.prepare("UPDATE alert_state SET dernier_mail=datetime('now') WHERE cle=?").run(k))
        .catch((e) => logger.error({ err: String(e) }, 'envoi alerte échec'))
    }
  }
}

// ------------------------------------------------------------------
// KPI métier : instantané quotidien + tendances
// ------------------------------------------------------------------
function count(sql: string): number {
  try { return (db.prepare(sql).get() as { n: number }).n } catch { return 0 }
}

/** Instantané live des KPI métier. */
export function snapshot() {
  return {
    inscriptions_total: count('SELECT COUNT(*) AS n FROM users'),
    accompagnateurs: count("SELECT COUNT(*) AS n FROM users WHERE role='accompagnateur'"),
    accompagnes: count("SELECT COUNT(*) AS n FROM users WHERE role='accompagne'"),
    actifs_30j: count("SELECT COUNT(*) AS n FROM users WHERE dernier_acces >= datetime('now','-30 days')"),
    parcours_total: count('SELECT COUNT(*) AS n FROM dossiers'),
    parcours_clotures: count("SELECT COUNT(*) AS n FROM dossiers WHERE statut='cloture'"),
    entretiens: count('SELECT COUNT(*) AS n FROM sessions'),
    rdv: count('SELECT COUNT(*) AS n FROM rdv'),
    cr_publies: count('SELECT COUNT(*) AS n FROM comptes_rendus WHERE publie=1'),
    syntheses_publiees: count('SELECT COUNT(*) AS n FROM syntheses WHERE publie=1'),
    actions: count('SELECT COUNT(*) AS n FROM actions'),
    actions_faites: count("SELECT COUNT(*) AS n FROM actions WHERE statut='fait'"),
    outils_journal: count('SELECT COUNT(*) AS n FROM journal_entrees'),
    outils_meteo: count('SELECT COUNT(*) AS n FROM meteo_humeur'),
  }
}

/** Capture (ou met à jour) l'instantané du jour pour les tendances. */
export function captureDailySnapshot(): void {
  try {
    const jour = new Date().toISOString().slice(0, 10)
    db.prepare(
      `INSERT INTO metrics_daily (jour, donnees) VALUES (?,?)
       ON CONFLICT(jour) DO UPDATE SET donnees=excluded.donnees`,
    ).run(jour, JSON.stringify(snapshot()))
  } catch (e) { logger.error({ err: String(e) }, 'capture KPI quotidien échec') }
}

/** KPI courants + taux dérivés + séries historiques sur `days` jours. */
export function businessKpis(days = 30) {
  const cur = snapshot()
  const rows = db
    .prepare("SELECT jour, donnees FROM metrics_daily WHERE jour >= date('now', ?) ORDER BY jour")
    .all(`-${Math.min(Math.max(1, days), 365)} days`) as { jour: string; donnees: string }[]
  const series = rows.map((r) => { try { return { jour: r.jour, ...JSON.parse(r.donnees) } } catch { return { jour: r.jour } } })
  return {
    current: {
      ...cur,
      taux_completion: cur.parcours_total ? Math.round((cur.parcours_clotures / cur.parcours_total) * 100) : 0,
      taux_actions_faites: cur.actions ? Math.round((cur.actions_faites / cur.actions) * 100) : 0,
    },
    series,
    days,
  }
}
