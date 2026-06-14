// Validation « fail-fast » de la configuration au démarrage.
// En production (NODE_ENV=production), une configuration de sécurité incorrecte EMPÊCHE le
// démarrage (process.exit(1)) : mieux vaut un conteneur qui redémarre en boucle (et alerte)
// qu'une production silencieusement non sécurisée. En dev/test, tout reste permissif.

const PROD = process.env.NODE_ENV === 'production'
// Valeurs par défaut/exemples notoirement faibles, à refuser en production.
const WEAK_JWT_SECRETS = new Set(['dev_secret_change_me', 'change_me', 'changeme', 'secret', 'test', 'changeit'])

function fatal(msg: string): never {
  // stderr garanti (les logs pino peuvent ne pas être branchés au tout premier instant).
  console.error(`\n[BOUSSOLE][DÉMARRAGE] ERREUR : ${msg}\n`)
  process.exit(1)
}

function resolveJwtSecret(): string {
  const s = process.env.JWT_SECRET
  if (PROD) {
    if (!s || s.length < 32 || WEAK_JWT_SECRETS.has(s)) {
      fatal('JWT_SECRET manquant ou trop faible en production (requis : ≥ 32 caractères et ≠ valeur par défaut). Génère-en un avec : openssl rand -hex 32')
    }
    return s
  }
  // Dev/test : repli stable (pas de secret réel nécessaire).
  return s || 'dev_secret_change_me'
}

/** Secret JWT validé (fort en production ; repli de développement sinon). */
export const JWT_SECRET = resolveJwtSecret()

function resolveAllowedOrigins(): string[] {
  const explicit = (process.env.ALLOWED_ORIGINS || '')
    .split(',').map((o) => o.trim()).filter(Boolean)
  if (explicit.length) return explicit
  const appUrl = (process.env.APP_URL || '').trim()
  if (appUrl) return [appUrl]
  // Dev : origines locales usuelles (Vite + stack Docker locale + API directe).
  if (!PROD) return ['http://localhost:5173', 'http://localhost:8080', 'http://localhost:3000']
  return []
}

/** Origines autorisées pour CORS (allowlist dérivée d'ALLOWED_ORIGINS, sinon d'APP_URL). */
export const ALLOWED_ORIGINS = resolveAllowedOrigins()

/** Fonction `origin` du middleware `cors` : remplace l'ancien `origin: true` (toute origine). */
export function corsOrigin(
  origin: string | undefined,
  cb: (err: Error | null, allow?: boolean) => void,
): void {
  if (!origin) return cb(null, true)                                   // same-origin / curl / sondes (pas d'en-tête Origin)
  if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true)
  if (!PROD && /^https?:\/\/localhost(:\d+)?$/i.test(origin)) return cb(null, true) // tout localhost en dev
  return cb(null, false)                                               // refus : aucun en-tête CORS renvoyé
}

/**
 * Validations restantes (flags de sécurité, origines CORS). Appelée explicitement au démarrage,
 * après le chargement de l'environnement. Le secret JWT est déjà validé au chargement du module.
 */
export function validateEnv(): void {
  if (!PROD) return
  if (process.env.CSRF_DISABLED === '1') fatal('CSRF_DISABLED=1 est interdit en production (réservé aux tests locaux).')
  if (process.env.RATE_LIMIT_DISABLED === '1') fatal('RATE_LIMIT_DISABLED=1 est interdit en production (réservé aux tests locaux).')
  if (!ALLOWED_ORIGINS.length) fatal('Aucune origine CORS : définis ALLOWED_ORIGINS (liste séparée par des virgules) ou APP_URL en production.')
  for (const o of ALLOWED_ORIGINS) {
    if (!/^https:\/\//i.test(o)) fatal(`Origine CORS non sécurisée (HTTPS requis en production) : ${o}`)
  }
  if (!process.env.ANTHROPIC_API_KEY) console.warn('[BOUSSOLE][DÉMARRAGE] ANTHROPIC_API_KEY absente — l’IA bascule sur le repli déterministe.')
  if (!process.env.BREVO_API_KEY) console.warn('[BOUSSOLE][DÉMARRAGE] BREVO_API_KEY absente — les emails sont journalisés, non envoyés.')
}
