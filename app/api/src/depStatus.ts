/**
 * Suivi PASSIF de l'état des dépendances externes : claude.ts et mailer.ts y déclarent le
 * succès/échec de leurs appels réels, monitoring.ts le lit. Module sans dépendance pour éviter
 * tout import circulaire (monitoring → mailer → … ).
 */
type Passive = { ok: boolean | null; at: number | null; lastError?: string }

const state: Record<'claude' | 'brevo', Passive> = {
  claude: { ok: null, at: null },
  brevo: { ok: null, at: null },
}

export function recordDependency(name: 'claude' | 'brevo', ok: boolean, error?: string): void {
  state[name] = { ok, at: Date.now(), lastError: ok ? undefined : String(error || '').slice(0, 200) }
}

export function getDependency(name: 'claude' | 'brevo'): Passive {
  return state[name]
}
