import { Router, type Request, type Response } from 'express'
import { db } from './db'
import { requireAuth, requireRole } from './auth'
import { PHASES } from './phases'

const KEY = process.env.ANTHROPIC_API_KEY
const MODEL = process.env.ANTHROPIC_MODEL_REPORT || 'claude-opus-4-8'

const router = Router()
interface U { id: number; role: string }
function getUser(req: Request): U { return (req as Request & { user?: U }).user as U }

interface DossInfo { accompagnateur_id: number; accompagne_id: number }
function dossierInfo(id: number): DossInfo | undefined {
  return db.prepare('SELECT accompagnateur_id, accompagne_id FROM dossiers WHERE id=?').get(id) as DossInfo | undefined
}
function canAccess(u: U, d: DossInfo): boolean {
  return (u.role === 'accompagnateur' && d.accompagnateur_id === u.id) || (u.role === 'accompagne' && d.accompagne_id === u.id)
}

// ---- Données du parcours (pour la génération) ----
interface SyntheseData {
  titre: string; accompagne: string; statut: string; creeLe: string; contexte: string
  questionnaire: { cr_recap: string; complete_le: string | null } | null
  entretiens: { date: string; phase_atteinte: string | null; statut: string; reponses: { phase: string; texte: string }[] }[]
  actions: { libelle: string; echeance: string | null; critere: string | null; statut: string }[]
  rdvs: { debut: string; fin: string; statut: string }[]
  synthese: string | null
}
function syntheseData(dossierId: number): SyntheseData {
  const dossier = db.prepare(
    `SELECT d.titre, d.contexte, d.statut, d.synthese, d.cree_le, d.accompagne_id, u.prenom AS accompagne_prenom, u.email AS accompagne_email
     FROM dossiers d JOIN users u ON u.id=d.accompagne_id WHERE d.id=?`,
  ).get(dossierId) as { titre: string | null; contexte: string | null; statut: string; synthese: string | null; cree_le: string; accompagne_id: number; accompagne_prenom: string | null; accompagne_email: string }
  const q = db.prepare('SELECT cr_recap, complete_le FROM questionnaires_initiaux WHERE dossier_id=? AND cr_recap IS NOT NULL ORDER BY id DESC LIMIT 1').get(dossierId) as { cr_recap: string; complete_le: string | null } | undefined
  const sessions = db.prepare('SELECT id, date, phase_atteinte, statut FROM sessions WHERE dossier_id=? ORDER BY date').all(dossierId) as { id: number; date: string; phase_atteinte: string | null; statut: string }[]
  const entretiens = sessions.map((s) => ({
    date: s.date, phase_atteinte: s.phase_atteinte, statut: s.statut,
    reponses: (db.prepare('SELECT phase, texte_reponse FROM reponses WHERE session_id=? ORDER BY id').all(s.id) as { phase: string; texte_reponse: string }[]).map((r) => ({ phase: r.phase, texte: r.texte_reponse })),
  }))
  const actions = db.prepare('SELECT libelle, echeance, critere, statut FROM actions WHERE dossier_id=? ORDER BY ordre ASC, id ASC').all(dossierId) as { libelle: string; echeance: string | null; critere: string | null; statut: string }[]
  const rdvs = db.prepare('SELECT c.debut, c.fin, r.statut FROM rdv r JOIN creneaux c ON c.id=r.creneau_id WHERE r.accompagne_id=? ORDER BY c.debut').all(dossier.accompagne_id) as { debut: string; fin: string; statut: string }[]
  return {
    titre: dossier.titre || 'Parcours d’accompagnement',
    accompagne: dossier.accompagne_prenom || dossier.accompagne_email,
    statut: dossier.statut, creeLe: dossier.cree_le, contexte: dossier.contexte || '—',
    questionnaire: q ? { cr_recap: q.cr_recap, complete_le: q.complete_le } : null,
    entretiens, actions, rdvs, synthese: dossier.synthese,
  }
}

// ---- HTML déterministe (repli sans IA) ----
const STATUT_FR: Record<string, string> = { en_cours: 'En cours', cloture: 'Clôturé', terminee: 'Terminé', a_faire: 'À faire', fait: 'Fait' }
const sf = (s: string) => STATUT_FR[s] || s || '—'
function frDate(iso: string): string {
  if (!iso) return '—'
  const [d, t] = String(iso).split('T'); const [y, m, day] = (d || '').split('-')
  if (!y) return String(iso)
  return t ? `${day}/${m}/${y} à ${t.slice(0, 5)}` : `${day}/${m}/${y}`
}
const phaseTitre = (p: string | null) => PHASES.find((x) => String(x.id) === String(p))?.titre || `Phase ${Number(p) + 1}`
function esc(s: string): string { return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }
function parasHtml(text: string): string {
  const lines = (text || '').split('\n').map((l) => l.trim()).filter(Boolean)
  return lines.length ? lines.map((l) => `<p>${esc(l)}</p>`).join('') : '<p>—</p>'
}
function syntheseToHtml(d: SyntheseData): string {
  const parts: string[] = []
  parts.push(`<p><em>Accompagné : ${esc(d.accompagne)} · Statut : ${esc(sf(d.statut))} · Ouvert le ${esc(frDate(d.creeLe))}</em></p>`)
  parts.push(`<h2>1. Contexte</h2>${parasHtml(d.contexte)}`)
  parts.push('<h2>2. Questionnaire initial</h2>')
  parts.push(d.questionnaire ? `<p><em>Complété le ${esc(frDate(d.questionnaire.complete_le || ''))}</em></p>${parasHtml(d.questionnaire.cr_recap)}` : '<p>Non complété.</p>')
  parts.push('<h2>3. Entretiens</h2>')
  if (!d.entretiens.length) parts.push('<p>Aucun entretien.</p>')
  else d.entretiens.forEach((e, i) => {
    parts.push(`<h3>Entretien ${i + 1} — ${esc(frDate(e.date))} · ${esc(sf(e.statut))}</h3>`)
    if (!e.reponses.length) parts.push('<p><em>(pas de notes saisies)</em></p>')
    else e.reponses.forEach((r) => parts.push(`<p><strong>${esc(phaseTitre(r.phase))} :</strong> ${esc(r.texte)}</p>`))
  })
  parts.push('<h2>4. Plan d’action</h2>')
  parts.push(d.actions.length ? `<ul>${d.actions.map((a) => `<li>${esc(a.libelle)}${a.echeance ? ` — échéance ${esc(a.echeance)}` : ''}${a.critere ? ` (${esc(a.critere)})` : ''} — <em>${esc(sf(a.statut))}</em></li>`).join('')}</ul>` : '<p>Aucune action.</p>')
  parts.push('<h2>5. Rendez-vous</h2>')
  parts.push(d.rdvs.length ? `<ul>${d.rdvs.map((r) => `<li>${esc(frDate(r.debut))} (${esc(sf(r.statut))})</li>`).join('')}</ul>` : '<p>Aucun rendez-vous.</p>')
  parts.push('<h2>6. Synthèse finale</h2>')
  parts.push(parasHtml(d.synthese || (d.statut === 'cloture' ? '—' : 'Démarche en cours.')))
  return parts.join('\n')
}

// ---- Génération IA narrative (sinon repli déterministe) ----
async function genererSyntheseHtml(d: SyntheseData): Promise<string> {
  const fallback = syntheseToHtml(d)
  if (!KEY) return fallback
  try {
    const entretiens = d.entretiens.map((e, i) => `Entretien ${i + 1} (${e.date}) :\n` + e.reponses.map((r) => `- ${phaseTitre(r.phase)} : ${r.texte}`).join('\n')).join('\n\n')
    const actions = d.actions.map((a) => `- ${a.libelle} [${sf(a.statut)}]${a.echeance ? ` (échéance ${a.echeance})` : ''}`).join('\n')
    const contenu =
      `Rédige une SYNTHÈSE DE PARCOURS d'accompagnement, narrative et structurée, fidèle aux faits (n'invente rien).\n` +
      `Format : HTML simple (<h2>, <h3>, <p>, <ul><li>), sans <html>/<body>, sans CSS. Sections : Contexte & demande ; Cheminement au fil des entretiens ; Plan d'action et progression ; Perspectives.\n\n` +
      `Accompagné : ${d.accompagne}\nTitre : ${d.titre}\nContexte : ${d.contexte}\n\n` +
      `Questionnaire initial : ${d.questionnaire?.cr_recap || '(non complété)'}\n\nEntretiens :\n${entretiens || '(aucun)'}\n\nPlan d'action :\n${actions || '(aucun)'}\n\n` +
      `Synthèse finale saisie : ${d.synthese || '(aucune)'}`
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: MODEL, max_tokens: 2000, messages: [{ role: 'user', content: contenu }] }),
    })
    if (!res.ok) return fallback
    const data = (await res.json()) as { content?: { type: string; text?: string }[] }
    let text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text || '').join('').trim()
    text = text.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
    return text || fallback
  } catch {
    return fallback
  }
}

// ---- Versions ----
function latest(dossierId: number) {
  return db.prepare('SELECT id, version, contenu_html, source, genere_le, publie FROM syntheses WHERE dossier_id=? ORDER BY version DESC LIMIT 1').get(dossierId) as
    | { id: number; version: number; contenu_html: string | null; source: string; genere_le: string; publie: number } | undefined
}
function published(dossierId: number) {
  return db.prepare('SELECT id, version, contenu_html, genere_le, publie_le FROM syntheses WHERE dossier_id=? AND publie=1 ORDER BY version DESC LIMIT 1').get(dossierId) as
    | { id: number; version: number; contenu_html: string | null; genere_le: string; publie_le: string | null } | undefined
}

// Générer/régénérer (accompagnateur propriétaire)
router.post('/generer', requireAuth, requireRole('accompagnateur'), async (req: Request, res: Response) => {
  const me = getUser(req)
  const dossierId = Number(req.body?.dossierId)
  const d = dossierInfo(dossierId)
  if (!d || d.accompagnateur_id !== me.id) { res.status(404).json({ error: 'Dossier introuvable' }); return }
  const html = await genererSyntheseHtml(syntheseData(dossierId))
  const version = (latest(dossierId)?.version ?? 0) + 1
  const info = db.prepare("INSERT INTO syntheses (dossier_id, version, contenu_html, source, publie, genere_le) VALUES (?,?,?,'ia',0,datetime('now'))").run(dossierId, version, html)
  res.status(201).json({ id: Number(info.lastInsertRowid), version, contenu_html: html, source: 'ia', publie: 0 })
})

// État (accompagnateur : courant + historique ; accompagné : version publiée)
router.get('/dossier/:id', requireAuth, (req: Request, res: Response) => {
  const me = getUser(req)
  const id = Number(req.params.id)
  const d = dossierInfo(id)
  if (!d || !canAccess(me, d)) { res.status(404).json({ error: 'Dossier introuvable' }); return }
  if (me.role === 'accompagne') {
    const pub = published(id)
    res.json({ role: 'accompagne', doc: pub ? { id: pub.id, version: pub.version, contenu_html: pub.contenu_html, genere_le: pub.genere_le, publie: 1 } : null, versions: [] })
    return
  }
  res.json({ role: 'accompagnateur', doc: latest(id) || null, versions: db.prepare('SELECT id, version, source, genere_le, publie FROM syntheses WHERE dossier_id=? ORDER BY version DESC').all(id) })
})

// Lire une version (historique) — accompagnateur propriétaire
router.get('/version/:id', requireAuth, requireRole('accompagnateur'), (req: Request, res: Response) => {
  const me = getUser(req)
  const v = db.prepare('SELECT s.id, s.version, s.contenu_html, d.accompagnateur_id FROM syntheses s JOIN dossiers d ON d.id=s.dossier_id WHERE s.id=?').get(Number(req.params.id)) as { id: number; version: number; contenu_html: string | null; accompagnateur_id: number } | undefined
  if (!v || v.accompagnateur_id !== me.id) { res.status(404).json({ error: 'Introuvable' }); return }
  res.json({ doc: v })
})

// Enregistrer la version courante (accompagnateur)
router.patch('/version/:id', requireAuth, requireRole('accompagnateur'), (req: Request, res: Response) => {
  const me = getUser(req)
  const v = db.prepare('SELECT s.id, s.dossier_id, d.accompagnateur_id FROM syntheses s JOIN dossiers d ON d.id=s.dossier_id WHERE s.id=?').get(Number(req.params.id)) as { id: number; dossier_id: number; accompagnateur_id: number } | undefined
  if (!v || v.accompagnateur_id !== me.id) { res.status(404).json({ error: 'Introuvable' }); return }
  if (latest(v.dossier_id)?.id !== v.id) { res.status(400).json({ error: 'Seule la version courante est modifiable.' }); return }
  db.prepare("UPDATE syntheses SET contenu_html=?, source='edition' WHERE id=?").run(String(req.body?.contenu_html ?? ''), v.id)
  res.json({ ok: true })
})

// Publier (accompagnateur)
router.post('/version/:id/publier', requireAuth, requireRole('accompagnateur'), (req: Request, res: Response) => {
  const me = getUser(req)
  const v = db.prepare('SELECT s.id, s.dossier_id, d.accompagnateur_id, d.accompagne_id FROM syntheses s JOIN dossiers d ON d.id=s.dossier_id WHERE s.id=?').get(Number(req.params.id)) as { id: number; dossier_id: number; accompagnateur_id: number; accompagne_id: number } | undefined
  if (!v || v.accompagnateur_id !== me.id) { res.status(404).json({ error: 'Introuvable' }); return }
  db.transaction(() => {
    db.prepare('UPDATE syntheses SET publie=0, publie_le=NULL WHERE dossier_id=?').run(v.dossier_id)
    db.prepare("UPDATE syntheses SET publie=1, publie_le=datetime('now') WHERE id=?").run(v.id)
    db.prepare('INSERT INTO notifications (user_id, texte) VALUES (?, ?)').run(v.accompagne_id, 'Votre synthèse de parcours a été publiée.')
  })()
  res.json({ ok: true })
})

// Synthèses publiées de l'accompagné (une par dossier)
router.get('/mine', requireAuth, requireRole('accompagne'), (req: Request, res: Response) => {
  const me = getUser(req)
  const items = db.prepare(
    `SELECT s.id, s.dossier_id, s.publie_le, d.titre AS dossier_titre
     FROM syntheses s JOIN dossiers d ON d.id=s.dossier_id
     WHERE d.accompagne_id=? AND s.publie=1 ORDER BY s.publie_le DESC`,
  ).all(me.id)
  res.json({ syntheses: items })
})

// ---- Discussion (accompagné ssi une synthèse est publiée) ----
function canDiscuss(u: U, d: DossInfo, dossierId: number): boolean {
  if (!canAccess(u, d)) return false
  if (u.role === 'accompagne') return !!published(dossierId)
  return true
}
router.get('/dossier/:id/messages', requireAuth, (req: Request, res: Response) => {
  const me = getUser(req)
  const id = Number(req.params.id)
  const d = dossierInfo(id)
  if (!d || !canDiscuss(me, d, id)) { res.status(404).json({ error: 'Discussion indisponible' }); return }
  const messages = db.prepare(
    `SELECT m.id, m.auteur_id, m.texte, m.cree_le, u.prenom AS auteur_prenom, u.role AS auteur_role
     FROM synthese_messages m JOIN users u ON u.id=m.auteur_id WHERE m.dossier_id=? ORDER BY m.cree_le ASC, m.id ASC`,
  ).all(id) as { id: number; auteur_id: number; texte: string; cree_le: string; auteur_prenom: string | null; auteur_role: string }[]
  res.json({ messages: messages.map((m) => ({ ...m, is_me: m.auteur_id === me.id })) })
})
router.post('/dossier/:id/messages', requireAuth, (req: Request, res: Response) => {
  const me = getUser(req)
  const id = Number(req.params.id)
  const d = dossierInfo(id)
  if (!d || !canDiscuss(me, d, id)) { res.status(404).json({ error: 'Discussion indisponible' }); return }
  const texte = String(req.body?.texte ?? '').trim()
  if (!texte) { res.status(400).json({ error: 'Message vide' }); return }
  const info = db.prepare('INSERT INTO synthese_messages (dossier_id, auteur_id, texte) VALUES (?,?,?)').run(id, me.id, texte)
  const autre = me.id === d.accompagnateur_id ? d.accompagne_id : d.accompagnateur_id
  db.prepare('INSERT INTO notifications (user_id, texte) VALUES (?, ?)').run(autre, 'Nouveau message sur une synthèse de parcours.')
  res.status(201).json({ id: Number(info.lastInsertRowid) })
})

export default router
