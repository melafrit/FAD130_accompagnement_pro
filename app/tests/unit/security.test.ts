import { describe, it, expect } from 'vitest'
import { mkdtempSync, existsSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { backupNow, purgeOldBackups } from '../../api/src/backups'

const BAK_RE = /boussole-.*\.sqlite$/

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

