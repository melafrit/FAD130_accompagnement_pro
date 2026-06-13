import { describe, it, expect } from 'vitest'
import { opt } from '../../api/src/actions'

// Repli déterministe de normalisation (Plan d'action) — fonction pure, aucune dépendance IA ni HTTP.
// opt(v) : null si v est null/undefined ou chaîne vide après trim ; sinon String(v).trim().
describe('ACT — unitaires (normalisation opt())', () => {
  it('TC-ACT-041 — opt() renvoie null pour null, undefined et chaîne vide', () => {
    expect(opt(null)).toBeNull()
    expect(opt(undefined)).toBeNull()
    expect(opt('')).toBeNull()
  })

  it('TC-ACT-041 — opt() renvoie null pour une chaîne composée uniquement d\'espaces (trim)', () => {
    expect(opt('   ')).toBeNull()
    expect(opt('\t\n  ')).toBeNull()
  })

  it('TC-ACT-041 — opt() applique trim et conserve le texte non vide', () => {
    expect(opt('  abc  ')).toBe('abc')
    expect(opt('abc')).toBe('abc')
  })

  it('TC-ACT-041 — opt() convertit les valeurs non-chaîne via String() puis trim', () => {
    expect(opt(42)).toBe('42')
    expect(opt(0)).toBe('0')
    expect(opt(false)).toBe('false')
  })
})
