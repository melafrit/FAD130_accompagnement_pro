import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, ShadingType,
} from 'docx'
import { PHASES } from './phases'
import { GRILLE, zoneFor } from './grille'

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

// ---- Synthèse du parcours (dossier complet) ----
export interface SyntheseEntretien {
  date: string
  phase_atteinte: string | null
  statut: string
  reponses: { phase: string; texte: string }[]
}
export interface SyntheseData {
  titre: string
  accompagne: string
  statut: string
  creeLe: string
  editeLe: string
  contexte: string
  questionnaire: { cr_recap: string; complete_le: string | null } | null
  entretiens: SyntheseEntretien[]
  actions: { libelle: string; echeance: string | null; critere: string | null; statut: string }[]
  rdvs: { debut: string; fin: string; statut: string }[]
  synthese: string | null
}

const STATUT_FR: Record<string, string> = {
  en_cours: 'En cours', cloture: 'Clôturé', terminee: 'Terminé', a_faire: 'À faire', fait: 'Fait',
}
function statutFr(s: string): string {
  return STATUT_FR[s] || s || '—'
}
function frDate(iso: string): string {
  if (!iso) return '—'
  const [d, t] = String(iso).split('T')
  const [y, m, day] = (d || '').split('-')
  if (!y) return String(iso)
  return t ? `${day}/${m}/${y} à ${t.slice(0, 5)}` : `${day}/${m}/${y}`
}
function phaseTitre(phaseId: string | null): string {
  const p = PHASES.find((x) => String(x.id) === String(phaseId))
  return p ? p.titre : `Phase ${Number(phaseId) + 1}`
}
function h3(t: string): Paragraph {
  return new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(t)] })
}

/** Construit le .docx récapitulant tout le parcours (questionnaire → entretiens → plan d'action → clôture). */
export async function construireSyntheseDocx(d: SyntheseData): Promise<Buffer> {
  const cell = (t: string, header = false) =>
    new TableCell({
      width: { size: 2340, type: WidthType.DXA },
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
      shading: header ? { fill: 'E7EEE8', type: ShadingType.CLEAR } : undefined,
      children: [new Paragraph({ children: [new TextRun({ text: t || '—', bold: header })] })],
    })

  const body: (Paragraph | Table)[] = [
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Synthèse du parcours d’accompagnement — Boussole')] }),
    new Paragraph({ children: [new TextRun({ text: d.titre, bold: true })] }),
    new Paragraph({ children: [new TextRun({ text: `Accompagné : ${d.accompagne}  ·  Statut : ${statutFr(d.statut)}  ·  Ouvert le ${frDate(d.creeLe)}  ·  Édité le ${frDate(d.editeLe)}`, italics: true })] }),
    h2('1. Contexte'), ...paras(d.contexte),
    h2('2. Questionnaire initial'),
    ...(d.questionnaire
      ? [new Paragraph({ children: [new TextRun({ text: `Complété le ${frDate(d.questionnaire.complete_le || '')}`, italics: true })] }), ...paras(d.questionnaire.cr_recap)]
      : [new Paragraph({ children: [new TextRun('Non complété par l’accompagné.')] })]),
    h2('3. Entretiens'),
  ]

  if (d.entretiens.length === 0) {
    body.push(new Paragraph({ children: [new TextRun('Aucun entretien pour l’instant.')] }))
  } else {
    d.entretiens.forEach((e, i) => {
      body.push(h3(`Entretien ${i + 1} — ${frDate(e.date)} · phase atteinte : ${phaseTitre(e.phase_atteinte)} · ${statutFr(e.statut)}`))
      if (e.reponses.length === 0) {
        body.push(new Paragraph({ children: [new TextRun({ text: '(pas de notes saisies)', italics: true })] }))
      } else {
        e.reponses.forEach((r) => {
          body.push(new Paragraph({ children: [new TextRun({ text: phaseTitre(r.phase), bold: true })] }))
          paras(r.texte).forEach((p) => body.push(p))
        })
      }
    })
  }

  body.push(h2('4. Plan d’action'))
  const arows: TableRow[] = [
    new TableRow({ children: [cell('Étape', true), cell('Échéance', true), cell('Critère', true), cell('Statut', true)] }),
    ...(d.actions.length ? d.actions : [{ libelle: '—', echeance: '', critere: '', statut: '' }]).map(
      (a) => new TableRow({ children: [cell(a.libelle), cell(a.echeance || ''), cell(a.critere || ''), cell(statutFr(a.statut))] }),
    ),
  ]
  body.push(new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [2340, 2340, 2340, 2340], rows: arows }))

  body.push(h2('5. Rendez-vous'))
  if (d.rdvs.length === 0) body.push(new Paragraph({ children: [new TextRun('Aucun rendez-vous.')] }))
  else d.rdvs.forEach((r) => body.push(new Paragraph({ children: [new TextRun(`• ${frDate(r.debut)} → ${String(r.fin || '').slice(11, 16)}  (${statutFr(r.statut)})`)] })))

  body.push(h2('6. Synthèse finale'))
  paras(d.synthese || (d.statut === 'cloture' ? '—' : 'Démarche en cours.')).forEach((p) => body.push(p))

  const doc = new Document({
    styles: { default: { document: { run: { font: 'Arial', size: 22 } } } },
    sections: [{ properties: { page: { size: { width: 11906, height: 16838 } } }, children: body }],
  })
  return Packer.toBuffer(doc)
}

// ---- Auto-évaluation de la pratique (grille) ----
export interface GrilleDocxData {
  accompagne: string
  titre: string
  noteGlobale: number | null
  commentaireGlobal: string | null
  analyseQuestions?: string | null
  majLe: string
  scores: Record<string, { score: number | null; commentaire: string | null }>
}

export async function construireGrilleDocx(d: GrilleDocxData): Promise<Buffer> {
  const cw = [640, 3560, 820, 1680, 2660] // somme = 9360
  const cell = (t: string, w: number, header = false) =>
    new TableCell({
      width: { size: w, type: WidthType.DXA },
      margins: { top: 50, bottom: 50, left: 90, right: 90 },
      shading: header ? { fill: 'E7EEE8', type: ShadingType.CLEAR } : undefined,
      children: [new Paragraph({ children: [new TextRun({ text: t || '—', bold: header })] })],
    })

  const body: (Paragraph | Table)[] = [
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Auto-évaluation de ma pratique d’accompagnement — Boussole')] }),
    new Paragraph({ children: [new TextRun({ text: `Dossier : ${d.titre}  ·  Accompagné : ${d.accompagne}  ·  Mise à jour : ${frDate(d.majLe)}`, italics: true })] }),
    new Paragraph({ children: [new TextRun({ text: `Note globale : ${d.noteGlobale != null ? d.noteGlobale.toFixed(1) : '—'} / 20`, bold: true })] }),
  ]

  for (const c of GRILLE) {
    const vals = c.indicateurs.map((i) => d.scores[i.id]?.score).filter((v): v is number => typeof v === 'number')
    const moy = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null
    body.push(h2(`Critère ${c.id} — ${c.titre}${moy != null ? `  (moyenne ${moy}/100)` : ''}`))
    const rows: TableRow[] = [
      new TableRow({ children: [cell('#', cw[0], true), cell('Indicateur', cw[1], true), cell('Score', cw[2], true), cell('Niveau', cw[3], true), cell('Commentaire', cw[4], true)] }),
    ]
    for (const ind of c.indicateurs) {
      const sc = d.scores[ind.id]?.score
      const z = typeof sc === 'number' ? zoneFor(sc) : null
      rows.push(
        new TableRow({
          children: [
            cell(ind.id, cw[0]),
            cell(ind.texte, cw[1]),
            cell(typeof sc === 'number' ? String(Math.round(sc)) : '—', cw[2]),
            cell(z ? z.label : '—', cw[3]),
            cell(d.scores[ind.id]?.commentaire || '', cw[4]),
          ],
        }),
      )
    }
    body.push(new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: cw, rows }))
  }

  if (d.analyseQuestions && d.analyseQuestions.trim()) {
    body.push(h2('Analyse de mes questions'))
    paras(d.analyseQuestions).forEach((p) => body.push(p))
  }

  body.push(h2('Synthèse'))
  paras(d.commentaireGlobal || '—').forEach((p) => body.push(p))

  const doc = new Document({
    styles: { default: { document: { run: { font: 'Arial', size: 20 } } } },
    sections: [{ properties: { page: { size: { width: 11906, height: 16838 } } }, children: body }],
  })
  return Packer.toBuffer(doc)
}
