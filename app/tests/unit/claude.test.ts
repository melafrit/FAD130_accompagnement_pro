import { afterEach, describe, expect, it, vi } from 'vitest'
import { extractJson, fallbackNext, FALLBACK_STEPS, questionnaireNext, type QA } from '../../api/src/claude'

// Tests unitaires du questionnaire initial adaptatif (claude.ts).
// Logique pure (fallbackNext, extractJson) + repli déterministe de questionnaireNext.
// Sur l'hôte, ANTHROPIC_API_KEY est absente : questionnaireNext retombe sur fallbackNext.
describe('CLAUDE — unitaires (questionnaire : replis déterministes)', () => {
  // --- fallbackNext : étapes guidées ---
  it('TC-QUEST-010 — fallbackNext renvoie FALLBACK_STEPS[n] (termine=false, recap=null) pour n in [0..5]', () => {
    for (let n = 0; n < FALLBACK_STEPS.length; n++) {
      const history: QA[] = Array.from({ length: n }, (_, i) => ({
        question: `Q${i}`,
        answer: `R${i}`,
      }))
      const step = fallbackNext(history)
      expect(step.question).toBe(FALLBACK_STEPS[n].question)
      expect(step.propositions).toEqual(FALLBACK_STEPS[n].propositions)
      expect(step.termine).toBe(false)
      expect(step.recapitulatif).toBeNull()
    }
    // Étapes 0-3 : propositions vides ; étapes 4-5 : propositions non vides.
    expect(fallbackNext([]).propositions).toEqual([])
    expect(fallbackNext(Array.from({ length: 3 }, () => ({ question: 'q', answer: 'r' }))).propositions).toEqual([])
    expect(fallbackNext(Array.from({ length: 4 }, () => ({ question: 'q', answer: 'r' }))).propositions.length).toBeGreaterThan(0)
    expect(fallbackNext(Array.from({ length: 5 }, () => ({ question: 'q', answer: 'r' }))).propositions.length).toBeGreaterThan(0)
  })

  // --- fallbackNext : récapitulatif au seuil ---
  it('TC-QUEST-011 — fallbackNext à length>=6 renvoie termine=true et un récapitulatif agrégé', () => {
    const history: QA[] = Array.from({ length: 6 }, (_, i) => ({
      question: `Question ${i + 1}`,
      answer: `Réponse ${i + 1}`,
    }))
    const step = fallbackNext(history)
    expect(step.termine).toBe(true)
    expect(step.question).toBe('')
    expect(step.propositions).toEqual([])
    expect(step.recapitulatif).not.toBeNull()
    expect(step.recapitulatif!.startsWith('Récapitulatif de ta situation (à valider) :')).toBe(true)
    // Chaque paire apparaît sous la forme '• question\n  → answer'.
    for (const h of history) {
      expect(step.recapitulatif).toContain(`• ${h.question}\n  → ${h.answer}`)
    }

    // length 7 (> seuil) : même comportement, couvre toutes les paires.
    const history7: QA[] = Array.from({ length: 7 }, (_, i) => ({
      question: `Q${i + 1}`,
      answer: `A${i + 1}`,
    }))
    const step7 = fallbackNext(history7)
    expect(step7.termine).toBe(true)
    for (const h of history7) {
      expect(step7.recapitulatif).toContain(`• ${h.question}\n  → ${h.answer}`)
    }
  })

  // --- extractJson : extraction tolérante du bloc JSON ---
  it('TC-QUEST-012 — extractJson extrait le bloc JSON (du 1er { au dernier }), sinon renvoie le texte', () => {
    // Cas A : JSON entouré de texte parasite.
    expect(extractJson('blabla {"question":"x"} fin')).toBe('{"question":"x"}')
    // Cas B : aucune accolade -> texte original renvoyé tel quel.
    expect(extractJson('pas de json')).toBe('pas de json')
    // Cas C : du premier '{' au dernier '}' inclus (gère multiples/imbrication).
    expect(extractJson('{"a":1} et {"b":2}')).toBe('{"a":1} et {"b":2}')
  })

  // --- questionnaireNext : repli sans clé (cas réel sur l'hôte) ---
  it('TC-QUEST-013 — questionnaireNext bascule en repli (fallbackNext) sans clé API', async () => {
    // Sur l'hôte, ANTHROPIC_API_KEY est absente : aucun appel réseau, repli direct.
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const step = await questionnaireNext([])
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(step).toEqual(fallbackNext([]))
    expect(step.question).toBe(FALLBACK_STEPS[0].question)
    expect(step.termine).toBe(false)
    fetchSpy.mockRestore()
  })
})

// Branches qui nécessitent une clé : KEY est capturée à l'import du module.
// On réimporte un module neuf avec la clé définie (vi.resetModules) et on mocke fetch.
describe('CLAUDE — unitaires (questionnaireNext avec clé : chemins de repli/normalisation)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  async function importWithKey() {
    vi.resetModules()
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-test-fake-key')
    return import('../../api/src/claude')
  }

  it('TC-QUEST-014 — questionnaireNext retombe sur le repli si HTTP non-ok (500) ou JSON inattendu', async () => {
    const mod = await importWithKey()
    const history: QA[] = [{ question: 'q', answer: 'r' }]
    const expected = mod.fallbackNext(history)

    // Cas A : status 500 (res.ok=false).
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 500, text: async () => 'boom' }) as unknown as Response),
    )
    const a = await mod.questionnaireNext(history)
    expect(a).toEqual(expected)

    // Cas B : 200 mais corps sans bloc JSON parsable (JSON.parse échoue -> catch -> repli).
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        ({
          ok: true,
          status: 200,
          json: async () => ({ content: [{ type: 'text', text: 'aucune accolade ici' }] }),
        }) as unknown as Response,
      ),
    )
    const b = await mod.questionnaireNext(history)
    expect(b).toEqual(expected)
  })

  it('TC-QUEST-015 — questionnaireNext normalise les champs de la réponse IA (defaults sûrs)', async () => {
    const mod = await importWithKey()
    // content texte = JSON partiel : propositions/termine/recapitulatif absents.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        ({
          ok: true,
          status: 200,
          json: async () => ({ content: [{ type: 'text', text: '{"question":"Q?"}' }] }),
        }) as unknown as Response,
      ),
    )
    const step = await mod.questionnaireNext([])
    expect(step).toEqual({
      question: 'Q?',
      propositions: [], // défaut si non-array
      termine: false, // défaut !!undefined
      recapitulatif: null, // défaut ?? null
    })
  })
})
