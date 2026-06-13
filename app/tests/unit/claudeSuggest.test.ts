import { describe, it, expect } from 'vitest'
import { suggestForPhase, extractJson } from '../../api/src/claudeSuggest'
import { PHASES } from '../../api/src/phases'

// Repli déterministe des suggestions d'entretien (sans clé ANTHROPIC_API_KEY sur l'hôte).
// suggestForPhase est async mais, sans clé, retombe immédiatement sur la banque de questions
// de la phase (PHASES) : on teste donc ce repli pur, au texte près.
describe('claudeSuggest — unitaires (repli sans IA + extractJson)', () => {
  it("TC-ENTR-072 — suggestForPhase(0,'') renvoie le repli exact de la phase 0 (3 questions, vigilance[0], reformulation null)", async () => {
    const s = await suggestForPhase(0, '')
    expect(s.questions).toEqual(PHASES[0].questions.slice(0, 3))
    expect(s.questions.length).toBe(3)
    expect(s.reformulation).toBeNull()
    expect(s.a_surveiller).toBe(PHASES[0].vigilance[0])
  })

  it('TC-ENTR-073 — chaque phase 0..5 renvoie ses 3 (ou 2) questions et sa 1re vigilance, reformulation null', async () => {
    for (const pid of [0, 1, 2, 3, 4, 5]) {
      const phase = PHASES[pid]
      const s = await suggestForPhase(pid, '')
      expect(s.questions).toEqual(phase.questions.slice(0, 3))
      expect(s.a_surveiller).toBe(phase.vigilance[0] ?? null)
      expect(s.reformulation).toBeNull()
    }
    // La phase 3 ne contient que 2 questions : slice(0,3) en renvoie 2 (tolérant).
    const p3 = await suggestForPhase(3, '')
    expect(p3.questions.length).toBe(2)
  })

  it('TC-ENTR-074 — phaseId hors borne (-1, 6, 999) retombe sur PHASES[0]', async () => {
    for (const pid of [-1, 6, 999]) {
      const s = await suggestForPhase(pid, 'x')
      expect(s.questions).toEqual(PHASES[0].questions.slice(0, 3))
      expect(s.questions.length).toBe(3)
      expect(s.a_surveiller).toBe(PHASES[0].vigilance[0])
      expect(s.reformulation).toBeNull()
    }
  })

  it("TC-ENTR-075 — extractJson extrait l'objet JSON encadré, sinon renvoie le texte tel quel", () => {
    expect(extractJson('xx {"a":1} yy')).toBe('{"a":1}')
    expect(extractJson('blabla {"questions":[]} fin')).toBe('{"questions":[]}')
    // Pas d'accolade : renvoie le texte original.
    expect(extractJson('aucune accolade')).toBe('aucune accolade')
    // Accolades inversées (b <= a) : renvoie le texte original.
    expect(extractJson('} avant {')).toBe('} avant {')
    // De la 1re { jusqu'à la dernière } (englobe l'imbrication).
    expect(extractJson('pre {"x":{"y":2}} post')).toBe('{"x":{"y":2}}')
  })
})
