import pino from 'pino'
import type { Request, Response, NextFunction } from 'express'
import { db } from './db'

/**
 * Observabilité AUTO-HÉBERGÉE (sans tiers) : logs structurés (pino), compteurs en mémoire,
 * journal d'erreurs persistant (table error_log) et endpoint /api/metrics.
 *
 * reportError() est le POINT UNIQUE de remontée d'erreur : un adaptateur tiers (ex. Sentry)
 * pourrait y être branché plus tard, derrière une variable d'environnement, sans toucher au reste.
 */
export const logger = pino({ level: process.env.LOG_LEVEL || 'info' })

const startedAt = Date.now()
const counters = { total: 0, c2xx: 0, c3xx: 0, c4xx: 0, c5xx: 0, sumMs: 0 }

/** Journalise chaque requête (méthode, chemin, statut, durée) et alimente les compteurs. */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const t0 = Date.now()
  res.on('finish', () => {
    const ms = Date.now() - t0
    counters.total++
    counters.sumMs += ms
    const c = res.statusCode
    if (c >= 500) counters.c5xx++
    else if (c >= 400) counters.c4xx++
    else if (c >= 300) counters.c3xx++
    else counters.c2xx++
    const line = { method: req.method, path: req.path, status: c, ms }
    if (c >= 500) logger.error(line, 'réponse 5xx')
    else logger.info(line)
  })
  next()
}

interface ErrCtx { method?: string; path?: string; status?: number; userId?: number | null }

/** Point unique de remontée d'erreur : log structuré + persistance (error_log). Ne lève jamais. */
export function reportError(err: unknown, ctx: ErrCtx = {}): void {
  const message = err instanceof Error ? err.message : String(err)
  const stack = err instanceof Error ? err.stack : undefined
  logger.error({ ...ctx, err: message, stack }, 'erreur applicative')
  // (Brancher ici un adaptateur Sentry plus tard, p.ex. if (process.env.SENTRY_DSN) Sentry.captureException(err))
  try {
    db.prepare('INSERT INTO error_log (methode, chemin, statut, message, user_id) VALUES (?,?,?,?,?)')
      .run(ctx.method || null, ctx.path || null, ctx.status || 500, message.slice(0, 1000), ctx.userId ?? null)
  } catch { /* base indisponible : on ne casse pas le flux de réponse */ }
}

/**
 * Middleware d'erreur Express (à monter EN DERNIER) : capte les exceptions.
 * Respecte un statut porté par l'erreur (ex. body-parser pose 400 sur un JSON malformé) ;
 * ne journalise dans error_log que les vraies erreurs serveur (5xx).
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const e = err as { status?: number; statusCode?: number } | null
  const status = Number(e?.status || e?.statusCode) || 500
  const userId = (req as Request & { user?: { id: number } }).user?.id ?? null
  if (status >= 500) reportError(err, { method: req.method, path: req.path, status, userId })
  if (res.headersSent) return
  res.status(status).json({ error: status >= 500 ? 'Erreur interne' : 'Requête invalide' })
}

function dbCount(sql: string): number {
  try { return (db.prepare(sql).get() as { n: number }).n } catch { return -1 }
}

/** Instantané des métriques de service (lu par GET /api/metrics, admin). */
export function metrics() {
  const total = counters.total
  const mem = process.memoryUsage()
  return {
    service: 'boussole-api',
    version: '0.1.0',
    node: process.version,
    started_at: new Date(startedAt).toISOString(),
    uptime_s: Math.round((Date.now() - startedAt) / 1000),
    memory_mb: { rss: Math.round(mem.rss / 1048576), heap_used: Math.round(mem.heapUsed / 1048576) },
    requests: {
      total,
      '2xx': counters.c2xx,
      '3xx': counters.c3xx,
      '4xx': counters.c4xx,
      '5xx': counters.c5xx,
      avg_ms: total ? Math.round(counters.sumMs / total) : 0,
      error_rate: total ? Number((counters.c5xx / total).toFixed(4)) : 0,
    },
    errors_logged: dbCount('SELECT COUNT(*) AS n FROM error_log'),
    db: {
      users: dbCount('SELECT COUNT(*) AS n FROM users'),
      dossiers: dbCount('SELECT COUNT(*) AS n FROM dossiers'),
      sessions: dbCount('SELECT COUNT(*) AS n FROM sessions'),
      wiki_pages: dbCount('SELECT COUNT(*) AS n FROM wiki_pages'),
      error_log: dbCount('SELECT COUNT(*) AS n FROM error_log'),
    },
    time: new Date().toISOString(),
  }
}

/** Dernières erreurs serveur journalisées (les plus récentes d'abord). */
export function recentErrors(limit = 20) {
  try {
    return db
      .prepare('SELECT id, methode, chemin, statut, message, user_id, cree_le FROM error_log ORDER BY id DESC LIMIT ?')
      .all(Math.min(Math.max(1, limit), 100))
  } catch { return [] }
}

/** Répartition des erreurs par chemin (endpoints les plus en erreur). */
export function errorsByPath(limit = 10) {
  try {
    return db
      .prepare('SELECT chemin, COUNT(*) AS n FROM error_log GROUP BY chemin ORDER BY n DESC LIMIT ?')
      .all(Math.min(Math.max(1, limit), 50))
  } catch { return [] }
}
