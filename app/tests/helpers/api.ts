// Client HTTP de test pour l'API Boussole (gestion manuelle du cookie de session httpOnly).
const BASE = process.env.BOUSSOLE_BASE || 'http://localhost:8080'

export interface ApiResponse<T = any> { status: number; json: T; headers: Headers }

export class Session {
  cookie = ''

  async request<T = any>(method: string, path: string, body?: unknown): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = { 'content-type': 'application/json' }
    if (this.cookie) headers.cookie = this.cookie
    const res = await fetch(BASE + path, {
      method,
      headers,
      body: body != null ? JSON.stringify(body) : undefined,
    })
    // Capture / efface le cookie de session boussole_token
    const setCookies: string[] = typeof (res.headers as any).getSetCookie === 'function'
      ? (res.headers as any).getSetCookie()
      : res.headers.get('set-cookie') ? [res.headers.get('set-cookie') as string] : []
    for (const c of setCookies) {
      if (/boussole_token=;/.test(c) || /boussole_token=\s*;/.test(c)) { this.cookie = ''; continue }
      const m = /(?:^|;\s*)(boussole_token=[^;]+)/.exec(c)
      if (m) this.cookie = m[1]
    }
    let json: any = null
    try { json = await res.json() } catch { /* corps vide / non JSON */ }
    return { status: res.status, json, headers: res.headers }
  }

  get<T = any>(p: string) { return this.request<T>('GET', p) }
  post<T = any>(p: string, b?: unknown) { return this.request<T>('POST', p, b) }
  patch<T = any>(p: string, b?: unknown) { return this.request<T>('PATCH', p, b) }
  del<T = any>(p: string, b?: unknown) { return this.request<T>('DELETE', p, b) }

  async login(email: string, password: string) {
    return this.post('/api/auth/login', { email, password })
  }
  async logout() { return this.post('/api/auth/logout') }
}

/** Comptes de démo (mot de passe commun). */
export const DEMO = {
  admin: { email: 'mohamed@elafrit.com', password: 'BoussoleDemo2026' },
  mohamed: { email: 'elafrit.mohamed@gmail.com', password: 'BoussoleDemo2026' }, // accompagnateur (vitrine)
  camille: { email: 'camille.laurent@boussole.demo', password: 'BoussoleDemo2026' }, // accompagnateur
  amine: { email: 'afrit_mohamed@yahoo.fr', password: 'BoussoleDemo2026' }, // accompagné (vitrine)
  lea: { email: 'lea.martin@boussole.demo', password: 'BoussoleDemo2026' }, // accompagné
  karim: { email: 'karim.benali@boussole.demo', password: 'BoussoleDemo2026' }, // accompagné
} as const

/** Ouvre une session connectée pour un compte de démo. */
export async function asUser(account: { email: string; password: string }): Promise<Session> {
  const s = new Session()
  const r = await s.login(account.email, account.password)
  if (r.status !== 200) throw new Error(`Connexion échouée pour ${account.email} (HTTP ${r.status})`)
  return s
}

export { BASE }
