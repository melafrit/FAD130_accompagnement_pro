import { describe, it, expect } from 'vitest'
import { mkdtempSync, existsSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { backupNow, purgeOldBackups } from '../../api/src/backups'
import { csrfProtect, CSRF_COOKIE } from '../../api/src/csrf'

const BAK_RE = /boussole-.*\.sqlite$/

// Exerce le middleware CSRF avec des mocks (pas de serveur). Renvoie l'effet observé.
function runCsrf(method: string, cookie?: string, header?: string) {
  const req = {
    method,
    cookies: cookie ? { [CSRF_COOKIE]: cookie } : {},
    get: (h: string) => (h.toLowerCase() === 'x-csrf-token' ? header : undefined),
  }
  let status = 0
  let nexted = false
  const res = { status(c: number) { status = c; return res }, json() { return res } }
  // @ts-expect-error mocks partiels suffisants pour le middleware
  csrfProtect(req, res, () => { nexted = true })
  return { status, nexted }
}

describe('SEC — sauvegardes SQLite (repli déterministe, sans IA)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'boussole-bak-'))

  it('TC-SEC-010 — backupNow crée un fichier de sauvegarde horodaté', async () => {
    const f = await backupNow(dir)
    expect(existsSync(f)).toBe(true)
    expect(f).toMatch(BAK_RE)
  })

  it('TC-SEC-011 — purgeOldBackups respecte la rétention', async () => {
    await backupNow(dir)
    expect(readdirSync(dir).filter((f) => BAK_RE.test(f)).length).toBeGreaterThan(0)
    expect(purgeOldBackups(dir, 9999)).toBe(0) // rien d'assez ancien : aucune suppression
    const removed = purgeOldBackups(dir, -1) // tout est « trop ancien » : tout est purgé
    expect(removed).toBeGreaterThan(0)
    expect(readdirSync(dir).filter((f) => BAK_RE.test(f)).length).toBe(0)
  })
})

describe('SEC — protection CSRF (double-submit)', () => {
  it('TC-CSRF-001 — méthode sûre (GET) : laissée passer', () => {
    expect(runCsrf('GET')).toEqual({ status: 0, nexted: true })
  })
  it('TC-CSRF-002 — mutation sans en-tête → 403', () => {
    expect(runCsrf('POST', 'abc123')).toEqual({ status: 403, nexted: false })
  })
  it('TC-CSRF-003 — mutation avec en-tête différent du cookie → 403', () => {
    expect(runCsrf('POST', 'abc123', 'XXXXXX')).toEqual({ status: 403, nexted: false })
  })
  it('TC-CSRF-004 — mutation avec en-tête = cookie → laissée passer', () => {
    expect(runCsrf('POST', 'abc123', 'abc123')).toEqual({ status: 0, nexted: true })
  })
})

