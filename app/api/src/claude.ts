// Intégration Claude (API Anthropic) pour le questionnaire initial adaptatif.
// Fonctionne avec une clé (ANTHROPIC_API_KEY) ; sinon, un parcours de secours
// déterministe prend le relais (l'app reste testable sans clé).

const KEY = process.env.ANTHROPIC_API_KEY
const MODEL = process.env.ANTHROPIC_MODEL_REALTIME || 'claude-sonnet-4-6'

export interface QA { question: string; answer: string }

export interface QuestionnaireStep {
  question: string
  propositions: string[]
  termine: boolean
  recapitulatif: string | null
}

const SYSTEM =
  "Tu aides une personne accompagnée (étudiant en alternance) à préparer son premier " +
  "rendez-vous d'accompagnement, en cadrant son besoin. Mène un dialogue BIENVEILLANT, une " +
  "question à la fois, en proposant à chaque fois 2 à 4 propositions de réponses (la personne " +
  "peut aussi répondre librement). Couvre progressivement : contexte du stage/alternance, sujet " +
  "du mémoire, problématique, enjeux, difficultés rencontrées, besoins. Ne juge pas, n'impose pas " +
  "de solution. Quand les 6 thèmes sont couverts, mets \"termine\" à true et fournis un " +
  "\"recapitulatif\" clair et structuré, à valider par la personne."

export const FALLBACK_STEPS: { question: string; propositions: string[] }[] = [
  { question: 'Dans quelle entreprise et sur quel poste se déroule ton alternance ?', propositions: [] },
  { question: 'Quel est le sujet (ou le thème pressenti) de ton mémoire ?', propositions: [] },
  { question: 'Quelle problématique cherches-tu à traiter ?', propositions: [] },
  { question: 'Quels sont les enjeux — pour toi et pour l’entreprise ?', propositions: [] },
  {
    question: 'Quelles difficultés rencontres-tu en ce moment ?',
    propositions: ['Trouver une problématique', 'Structurer le plan', 'Manque de temps', 'Rédaction', 'Relier théorie et pratique'],
  },
  {
    question: 'Qu’attends-tu de cet accompagnement ?',
    propositions: ['De la méthode', 'Un cadre et des échéances', 'Des retours sur mon travail', 'Reprendre confiance'],
  },
]

export function fallbackNext(history: QA[]): QuestionnaireStep {
  if (history.length < FALLBACK_STEPS.length) {
    return { ...FALLBACK_STEPS[history.length], termine: false, recapitulatif: null }
  }
  const recap =
    'Récapitulatif de ta situation (à valider) :\n\n' +
    history.map((h) => `• ${h.question}\n  → ${h.answer}`).join('\n')
  return { question: '', propositions: [], termine: true, recapitulatif: recap }
}

export function extractJson(text: string): string {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  return start >= 0 && end > start ? text.slice(start, end + 1) : text
}

export async function questionnaireNext(history: QA[]): Promise<QuestionnaireStep> {
  if (!KEY) return fallbackNext(history)
  const convo = history.map((h) => `Q: ${h.question}\nR: ${h.answer}`).join('\n\n') || '(aucun échange pour l’instant)'
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 700,
        system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
        messages: [
          {
            role: 'user',
            content:
              `Échanges jusqu'ici :\n${convo}\n\n` +
              `Donne UNIQUEMENT l'étape suivante au format JSON strict : ` +
              `{"question": string, "propositions": string[], "termine": boolean, "recapitulatif": string|null}.`,
          },
        ],
      }),
    })
    if (!res.ok) {
      console.error(`[claude] HTTP ${res.status} : ${await res.text()}`)
      return fallbackNext(history)
    }
    const data = (await res.json()) as { content?: { type: string; text?: string }[] }
    const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text || '').join('')
    const json = JSON.parse(extractJson(text)) as Partial<QuestionnaireStep>
    return {
      question: json.question || '',
      propositions: Array.isArray(json.propositions) ? json.propositions : [],
      termine: !!json.termine,
      recapitulatif: json.recapitulatif ?? null,
    }
  } catch (e) {
    console.error('[claude] erreur :', e)
    return fallbackNext(history)
  }
}
