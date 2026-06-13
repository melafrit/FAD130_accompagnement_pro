import { describe, it, expect } from 'vitest'
import { strip, falcFallback } from '../../api/src/adoption'

// Repli déterministe FALC (Adoption) — aucune dépendance IA.
describe('ADOPT — unitaires (repli FALC)', () => {
  it('TC-ADOPT-016 — falcFallback découpe en phrases, préfixe « • », limite à 12 lignes', () => {
    const txt = Array.from({ length: 15 }, (_, i) => `Ceci est la phrase numero ${i + 1}.`).join(' ')
    const lignes = falcFallback(txt).split('\n')
    expect(lignes.length).toBe(12) // slice(0,12)
    for (const l of lignes) expect(l.startsWith('• ')).toBe(true)
  })

  it('TC-ADOPT-017 — falcFallback écarte les segments ≤ 3 caractères et applique trim', () => {
    expect(falcFallback('A. Ok. Voici une phrase complète.')).toBe('• Voici une phrase complète.')
  })

  it('TC-ADOPT-018 — strip retire balises et entités, normalise les espaces, gère null', () => {
    expect(strip('<p>Bonjour&nbsp;&amp;  bienvenue</p>\n\t<b>ici</b>')).toBe('Bonjour bienvenue ici')
    expect(strip(null as unknown as string)).toBe('')
  })
})
