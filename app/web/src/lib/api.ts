export interface User {
  id: number
  email: string
  role: 'admin' | 'accompagnateur' | 'accompagne'
  nom?: string | null
  prenom?: string | null
}

/** Lit un cookie lisible par JS (ex. le jeton CSRF). */
function readCookie(name: string): string {
  const found = document.cookie.split('; ').find((c) => c.startsWith(name + '='))
  return found ? decodeURIComponent(found.slice(name.length + 1)) : ''
}

/** Appel JSON à l'API (même origine, cookie de session inclus + en-tête CSRF sur les mutations). */
export async function api<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || 'GET').toUpperCase()
  const headers: Record<string, string> = { 'content-type': 'application/json', ...(options.headers as Record<string, string> | undefined) }
  if (method !== 'GET' && method !== 'HEAD') {
    const token = readCookie('csrf_token')
    if (token) headers['x-csrf-token'] = token
  }
  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    ...options,
    headers, // après ...options pour ne pas être écrasé
  })
  const data: unknown = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = (data as { error?: string }).error || `Erreur ${res.status}`
    throw new Error(msg)
  }
  return data as T
}
