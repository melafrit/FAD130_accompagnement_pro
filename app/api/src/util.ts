import { randomBytes } from 'node:crypto'

/** Jeton aléatoire (validation email, réinitialisation de mot de passe). */
export function makeToken(): string {
  return randomBytes(32).toString('hex')
}

/** Date ISO d'expiration dans `hours` heures. */
export function expiryHours(hours: number): string {
  return new Date(Date.now() + hours * 3600 * 1000).toISOString()
}
