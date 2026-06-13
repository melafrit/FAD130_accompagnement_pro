// Suggestions IA pendant l'entretien (reformulation + questions d'approfondissement).
// Avec ANTHROPIC_API_KEY : Claude génère ; sinon, repli sur la banque de questions de la phase.
import { PHASES } from './phases'

const KEY = process.env.ANTHROPIC_API_KEY
const MODEL = process.env.ANTHROPIC_MODEL_REALTIME || 'claude-sonnet-4-6'

export interface Suggestion {
  questions: string[]
  reformulation: string | null
  a_surveiller: string | null
}

const SYSTEM =
  "Tu es l'assistant d'un ACCOMPAGNATEUR professionnel qui mène un entretien d'accompagnement en " +
  "contexte de transition (étudiant en alternance, mémoire professionnel). Tu AIDES l'accompagnateur ; " +
  "tu ne parles jamais à la personne accompagnée à sa place. Règles de posture : faire parler l'autre ; " +
  "questions OUVERTES et neutres, sans induction ; faire émerger plutôt que donner la solution ; " +
  "non-jugement ; distinguer demande/besoin/décision ; responsabilité des moyens, pas du résultat ; " +
  "viser l'autonomie. Tu proposes, tu ne décides pas."

export function extractJson(text: string): string {
  const a = text.indexOf('{')
  const b = text.lastIndexOf('}')
  return a >= 0 && b > a ? text.slice(a, b + 1) : text
}

export async function suggestForPhase(phaseId: number, transcript: string): Promise<Suggestion> {
  const phase = PHASES.find((p) => p.id === phaseId) ?? PHASES[0]
  const fallback: Suggestion = {
    questions: phase.questions.slice(0, 3),
    reformulation: null,
    a_surveiller: phase.vigilance[0] ?? null,
  }
  if (!KEY) return fallback
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 600,
        system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
        messages: [
          {
            role: 'user',
            content:
              `Phase : ${phase.titre} — objectif : ${phase.objectif}\n` +
              `Points de vigilance : ${phase.vigilance.join(' ; ')}\n\n` +
              `Notes de l'accompagnateur / propos de la personne :\n"""${transcript || "(rien pour l'instant)"}"""\n\n` +
              `Réponds en JSON strict : {"reformulation": string|null, "questions": string[], "a_surveiller": string|null}. ` +
              `La reformulation reprend les mots de la personne sans interpréter. Les 2 à 3 questions sont OUVERTES, sans suggestion.`,
          },
        ],
      }),
    })
    if (!res.ok) return fallback
    const data = (await res.json()) as { content?: { type: string; text?: string }[] }
    const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text || '').join('')
    const j = JSON.parse(extractJson(text)) as Partial<Suggestion>
    return {
      questions: Array.isArray(j.questions) && j.questions.length ? j.questions : fallback.questions,
      reformulation: j.reformulation ?? null,
      a_surveiller: j.a_surveiller ?? fallback.a_surveiller,
    }
  } catch {
    return fallback
  }
}
