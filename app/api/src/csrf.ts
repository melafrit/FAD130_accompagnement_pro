import type { Request, Response, NextFunction } from 'express'
import { randomBytes } from 'node:crypto'

/**
 * Protection CSRF par « double-submit cookie ».
 *  - csrfIssue : pose un cookie `csrf_token` lisible par JS (non httpOnly) s'il est absent.
 *  - csrfProtect : pour les méthodes mutantes, exige que l'en-tête X-CSRF-Token soit égal au cookie.
 *
 * Le frontend lit le cookie et renvoie l'en-tête. Un site tiers ne peut pas lire le cookie
 * (same-origin policy), donc ne peut pas forger l'en-tête → la requête est rejetée.
 *
 * Désactivable via CSRF_DISABLED=1 (mis à 1 sur la stack locale de test : le helper et les
 * fetch bruts Playwright n'envoient pas l'en-tête). En production : laisser activé.
 */
export const CSRF_COOKIE = 'csrf_token'
const SAFE = new Set(['GET', 'HEAD', 'OPTIONS'])
const disabled = () => process.env.CSRF_DISABLED === '1'

type ReqC = Request & { cookies?: Record<string, string> }

export function csrfIssue(req: Request, res: Response, next: NextFunction): void {
  if (!(req as ReqC).cookies?.[CSRF_COOKIE]) {
    const token = randomBytes(24).toString('hex')
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false, // doit être lisible par le JS du front pour être renvoyé en en-tête
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 3600 * 1000,
    })
  }
  next()
}

export function csrfProtect(req: Request, res: Response, next: NextFunction): void {
  if (disabled() || SAFE.has(req.method)) { next(); return }
  const cookie = (req as ReqC).cookies?.[CSRF_COOKIE]
  const header = req.get('x-csrf-token')
  if (!cookie || !header || cookie !== header) {
    res.status(403).json({ error: 'Jeton CSRF manquant ou invalide' })
    return
  }
  next()
}
