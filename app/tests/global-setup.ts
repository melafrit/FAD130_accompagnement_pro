import type { FullConfig } from '@playwright/test'

// Le mode FALC est désormais piloté par un réglage GLOBAL admin, désactivé par défaut. Plusieurs
// scénarios UI (bascule FALC, reformulation « facile à lire » d'un compte rendu) ont besoin qu'il
// soit ACTIF. On l'active pour toute la session UI, puis on le remet à OFF (teardown retourné).
const BASE = process.env.BOUSSOLE_BASE || 'http://localhost:8080'

async function setFalc(on: boolean): Promise<void> {
  const login = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'mohamed@elafrit.com', password: 'BoussoleDemo2026' }),
  })
  const setCookies: string[] = typeof (login.headers as { getSetCookie?: () => string[] }).getSetCookie === 'function'
    ? (login.headers as { getSetCookie: () => string[] }).getSetCookie()
    : login.headers.get('set-cookie') ? [login.headers.get('set-cookie') as string] : []
  const cookie = setCookies.map((c) => c.split(';')[0]).join('; ')
  await fetch(`${BASE}/api/admin/settings`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ falc_enabled: on }),
  })
}

export default async function globalSetup(_config: FullConfig): Promise<() => Promise<void>> {
  await setFalc(true)
  // Fonction de teardown : remet le réglage à son défaut après la session UI.
  return async () => { await setFalc(false) }
}
