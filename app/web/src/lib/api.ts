export interface User {
  id: number
  email: string
  role: 'admin' | 'accompagnateur' | 'accompagne'
  nom?: string | null
  prenom?: string | null
}

/** Appel JSON à l'API (même origine, cookie de session inclus). */
export async function api<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: { 'content-type': 'application/json', ...(options.headers || {}) },
    ...options,
  })
  const data: unknown = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = (data as { error?: string }).error || `Erreur ${res.status}`
    throw new Error(msg)
  }
  return data as T
}
