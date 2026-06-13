import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { icsStamp, icsEscape, icsNowUtc, formatFr, findAccompagnateurFor } from '../../api/src/rdv'
import { db } from '../../api/src/db'

// === Fonctions PURES déterministes (export iCalendar + formatage FR) ===
describe('RDV — unitaires (fonctions pures iCalendar / formatFr)', () => {
  it("TC-RDV-054 — icsStamp formate un ISO valide, complète les secondes, renvoie '' sinon", () => {
    expect(icsStamp('2026-07-01T10:00')).toBe('20260701T100000') // secondes par défaut '00'
    expect(icsStamp('2026-07-01T10:00:30')).toBe('20260701T100030')
    expect(icsStamp('pas-une-date')).toBe('')
    expect(icsStamp('')).toBe('')
  })

  it('TC-RDV-055 — icsEscape échappe \\ , ; et les retours ligne, gère vide/null', () => {
    expect(icsEscape('a,b;c\\d')).toBe('a\\,b\\;c\\\\d')
    expect(icsEscape('ligne1\nligne2')).toBe('ligne1\\nligne2')
    expect(icsEscape('ligne1\r\nligne2')).toBe('ligne1\\nligne2')
    expect(icsEscape('')).toBe('')
    expect(icsEscape(null as unknown as string)).toBe('')
  })

  it('TC-RDV-056 — icsNowUtc renvoie un horodatage UTC compact YYYYMMDDThhmmssZ', () => {
    expect(icsNowUtc()).toMatch(/^\d{8}T\d{6}Z$/)
  })

  it("TC-RDV-057 — formatFr met en forme l'ISO en JJ/MM/AAAA à HH:MM", () => {
    expect(formatFr('2026-07-01T10:05')).toBe('01/07/2026 à 10:05')
    expect(formatFr('2026-07-01T10:05:30')).toBe('01/07/2026 à 10:05') // heure tronquée à 5 car.
  })
})

// === findAccompagnateurFor : touche la base → seed minimal (ids élevés/uniques) puis nettoyage ===
// Table de décision : lien actif prioritaire > 1er accompagnateur actif (ORDER BY id) > null.
describe('RDV — findAccompagnateurFor (db, seed minimal)', () => {
  // Ids hauts et uniques pour ne percuter aucune donnée existante de la base jetable.
  const ACC = 990201 // accompagnateur dédié, lié
  const ACG = 990202 // accompagné avec lien actif
  const ACG_SANS = 990203 // accompagné sans lien

  function purge(): void {
    db.prepare('DELETE FROM liens_accompagnement WHERE accompagne_id IN (?, ?)').run(ACG, ACG_SANS)
    db.prepare('DELETE FROM users WHERE id IN (?, ?, ?)').run(ACC, ACG, ACG_SANS)
  }

  beforeAll(() => {
    purge() // au cas où un run précédent aurait laissé ces ids dans la base jetable
    const insUser = db.prepare(
      "INSERT INTO users (id, email, role, actif) VALUES (?, ?, ?, 1)",
    )
    insUser.run(ACC, `acc-${ACC}@unit.test`, 'accompagnateur')
    insUser.run(ACG, `acg-${ACG}@unit.test`, 'accompagne')
    insUser.run(ACG_SANS, `acg-${ACG_SANS}@unit.test`, 'accompagne')
    db.prepare(
      "INSERT INTO liens_accompagnement (accompagnateur_id, accompagne_id, statut) VALUES (?, ?, 'actif')",
    ).run(ACC, ACG)
  })

  afterAll(() => {
    purge()
  })

  it('TC-RDV-058 — Cas A : un lien actif est prioritaire → renvoie son accompagnateur', () => {
    expect(findAccompagnateurFor(ACG)).toBe(ACC)
  })

  it("TC-RDV-058 — Cas B : sans lien → 1er accompagnateur actif (ORDER BY id)", () => {
    // L'accompagné sans lien retombe sur le 1er accompagnateur actif global (plus petit id).
    const premier = db
      .prepare("SELECT id FROM users WHERE role='accompagnateur' AND actif=1 ORDER BY id LIMIT 1")
      .get() as { id: number } | undefined
    expect(premier).toBeDefined()
    expect(findAccompagnateurFor(ACG_SANS)).toBe(premier!.id)
  })

  it('TC-RDV-058 — Cas C : aucun accompagnateur actif → null', () => {
    // Désactive temporairement tous les accompagnateurs actifs, vérifie le repli null, puis restaure.
    const actifs = db
      .prepare("SELECT id FROM users WHERE role='accompagnateur' AND actif=1")
      .all() as { id: number }[]
    const ids = actifs.map((r) => r.id)
    try {
      if (ids.length) {
        const placeholders = ids.map(() => '?').join(',')
        db.prepare(`UPDATE users SET actif=0 WHERE id IN (${placeholders})`).run(...ids)
      }
      expect(findAccompagnateurFor(ACG_SANS)).toBeNull()
    } finally {
      if (ids.length) {
        const placeholders = ids.map(() => '?').join(',')
        db.prepare(`UPDATE users SET actif=1 WHERE id IN (${placeholders})`).run(...ids)
      }
    }
  })
})
