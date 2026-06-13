import { PHASES } from './phases'

const KEY = process.env.ANTHROPIC_API_KEY
const MODEL = process.env.ANTHROPIC_MODEL_REPORT || 'claude-opus-4-8'

export interface PlanAction { etape: string; echeance: string; critere: string }
export interface CRContent {
  contexte: string
  pointsCles: string
  emergence: string
  planAction: PlanAction[]
  propositions: string
  vigilance: string
}
export interface CRMeta { accompagne: string; date: string }

/** Construit le contenu structuré du compte rendu (Claude si clé, sinon repli depuis les notes par phase). */
export async function genererContenu(notesByPhase: Record<number, string>): Promise<CRContent> {
  const template: CRContent = {
    contexte: [notesByPhase[0], notesByPhase[1]].filter(Boolean).join('\n') || '—',
    pointsCles: notesByPhase[2] || '—',
    emergence: notesByPhase[3] || '—',
    planAction: notesByPhase[4] ? [{ etape: notesByPhase[4], echeance: '', critere: '' }] : [],
    propositions: notesByPhase[5] || '—',
    vigilance: '—',
  }
  if (!KEY) return template
  try {
    const notes = PHASES.map((p) => `## ${p.titre}\n${notesByPhase[p.id] || '(rien)'}`).join('\n\n')
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1500,
        messages: [
          {
            role: 'user',
            content:
              `À partir des notes d'un entretien d'accompagnement (par phase), rédige un compte rendu fidèle à la ` +
              `parole de la personne (ne prescris rien à sa place ; restitue ses décisions).\n\nNotes :\n${notes}\n\n` +
              `Réponds en JSON strict : {"contexte": string, "pointsCles": string, "emergence": string, ` +
              `"planAction": [{"etape": string, "echeance": string, "critere": string}], "propositions": string, "vigilance": string}.`,
          },
        ],
      }),
    })
    if (!res.ok) return template
    const data = (await res.json()) as { content?: { type: string; text?: string }[] }
    const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text || '').join('')
    const a = text.indexOf('{')
    const b = text.lastIndexOf('}')
    const j = JSON.parse(text.slice(a, b + 1)) as Partial<CRContent>
    return {
      contexte: j.contexte || template.contexte,
      pointsCles: j.pointsCles || template.pointsCles,
      emergence: j.emergence || template.emergence,
      planAction: Array.isArray(j.planAction) ? j.planAction : template.planAction,
      propositions: j.propositions || template.propositions,
      vigilance: j.vigilance || template.vigilance,
    }
  } catch {
    return template
  }
}

export function esc(s: string): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
export function parasHtml(text: string): string {
  const lines = (text || '').split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length === 0) return '<p>—</p>'
  return lines.map((l) => `<p>${esc(l)}</p>`).join('')
}

/** Restitue le contenu structuré en HTML sémantique propre (éditable ensuite dans l'éditeur riche). */
export function contentToHtml(content: CRContent, meta: CRMeta): string {
  const plan = content.planAction && content.planAction.length
    ? `<ul>${content.planAction
        .filter((a) => a.etape && a.etape !== '—')
        .map((a) => `<li>${esc(a.etape)}${a.echeance ? ` — <em>échéance : ${esc(a.echeance)}</em>` : ''}${a.critere ? ` (${esc(a.critere)})` : ''}</li>`)
        .join('')}</ul>`
    : '<p>—</p>'
  return [
    `<p><em>Accompagné : ${esc(meta.accompagne)} · Date : ${esc(meta.date)}</em></p>`,
    `<h2>1. Contexte et demande</h2>${parasHtml(content.contexte)}`,
    `<h2>2. Points clés exprimés</h2>${parasHtml(content.pointsCles)}`,
    `<h2>3. Ce qui a émergé (sens, axes)</h2>${parasHtml(content.emergence)}`,
    `<h2>4. Plan d’action</h2>${plan}`,
    `<h2>5. Propositions pour la suite</h2>${parasHtml(content.propositions)}`,
    `<h2>6. Points de vigilance pour le prochain rendez-vous</h2>${parasHtml(content.vigilance)}`,
  ].join('\n')
}
