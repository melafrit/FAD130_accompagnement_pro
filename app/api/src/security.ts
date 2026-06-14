import rateLimit from 'express-rate-limit'
import type { HelmetOptions } from 'helmet'

/**
 * Garde-fous de sécurité HTTP.
 *
 * Rate-limiting : désactivable via RATE_LIMIT_DISABLED=1 (mis à 1 sur la stack locale de test pour
 * ne pas bloquer la batterie qui se connecte des centaines de fois depuis la même IP). En production,
 * laisser la variable absente pour l'activer.
 */
const disabled = () => process.env.RATE_LIMIT_DISABLED === '1'

/** Limiteur global, généreux : protège contre l'abus massif sans gêner un usage normal. */
export const globalLimiter = rateLimit({
  windowMs: 60_000,
  limit: Number(process.env.RATE_LIMIT_GLOBAL_MAX) || 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: disabled,
})

/** Limiteur strict sur l'authentification (login, inscription, réinitialisation) : anti brute-force. */
export const authLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_AUTH_WINDOW_MS) || 10 * 60_000,
  limit: Number(process.env.RATE_LIMIT_AUTH_MAX) || 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Trop de tentatives. Réessayez dans quelques minutes.' },
  skip: disabled,
})

/**
 * Politique de sécurité du contenu (CSP) et en-têtes helmet.
 * styleSrc autorise 'unsafe-inline' : l'app utilise des styles inline (bannières, SVG Mermaid).
 * Les scripts restent en 'self' (aucun script inline ; Vite émet des modules bundlés).
 */
export const helmetConfig: HelmetOptions = {
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      fontSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'self'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false, // évite de bloquer des ressources tierces légitimes (ex. polices data:)
}
