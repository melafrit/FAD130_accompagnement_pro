import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, ShadingType,
} from 'docx'
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

/** Construit le contenu du compte rendu (Claude si clé, sinon repli depuis les notes par phase). */
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

function paras(text: string): Paragraph[] {
  return (text || '—').split('\n').map((line) => new Paragraph({ children: [new TextRun(line || ' ')] }))
}
function h2(t: string): Paragraph {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] })
}

/** Construit le fichier .docx (buffer) à partir du contenu. */
export async function construireDocx(content: CRContent, meta: CRMeta): Promise<Buffer> {
  const cell = (t: string, header = false) =>
    new TableCell({
      width: { size: 3120, type: WidthType.DXA },
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
      shading: header ? { fill: 'E7EEE8', type: ShadingType.CLEAR } : undefined,
      children: [new Paragraph({ children: [new TextRun({ text: t || '—', bold: header })] })],
    })

  const rows: TableRow[] = [
    new TableRow({ children: [cell('Étape', true), cell('Échéance', true), cell('Critère de réussite', true)] }),
    ...(content.planAction.length ? content.planAction : [{ etape: '—', echeance: '', critere: '' }]).map(
      (a) => new TableRow({ children: [cell(a.etape), cell(a.echeance), cell(a.critere)] }),
    ),
  ]

  const doc = new Document({
    styles: { default: { document: { run: { font: 'Arial', size: 22 } } } },
    sections: [
      {
        properties: { page: { size: { width: 11906, height: 16838 } } },
        children: [
          new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Compte rendu d’entretien — Boussole')] }),
          new Paragraph({ children: [new TextRun({ text: `Accompagné : ${meta.accompagne}  ·  Date : ${meta.date}`, italics: true })] }),
          h2('1. Contexte et demande'), ...paras(content.contexte),
          h2('2. Points clés exprimés'), ...paras(content.pointsCles),
          h2('3. Ce qui a émergé (sens, axes)'), ...paras(content.emergence),
          h2('4. Plan d’action'),
          new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [3120, 3120, 3120], rows }),
          h2('5. Propositions pour la suite'), ...paras(content.propositions),
          h2('6. Points de vigilance pour le prochain rendez-vous'), ...paras(content.vigilance),
        ],
      },
    ],
  })
  return Packer.toBuffer(doc)
}

/** DOCX simple à partir d'un texte (ex. récapitulatif du questionnaire initial). */
export async function docxFromText(titre: string, sousTitre: string, texte: string): Promise<Buffer> {
  const doc = new Document({
    styles: { default: { document: { run: { font: 'Arial', size: 22 } } } },
    sections: [
      {
        properties: { page: { size: { width: 11906, height: 16838 } } },
        children: [
          new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(titre)] }),
          new Paragraph({ children: [new TextRun({ text: sousTitre, italics: true })] }),
          ...paras(texte),
        ],
      },
    ],
  })
  return Packer.toBuffer(doc)
}
