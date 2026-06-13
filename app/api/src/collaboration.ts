import { Router, type Request, type Response } from 'express'
import { db } from './db'
import { requireAuth, requireRole } from './auth'
import { requireFeature } from './features'
import { makeToken } from './util'

// Collaboration & IA :
//  - Mutualisation entre pairs : ressources partagées par les accompagnateurs (interne + lien public)
//  - Assistant de problématisation (accompagné) : guidé puis libre
//  - Résumé « où j'en suis » (accompagné) : synthèse IA de l'avancement
const router = Router()
const KEY = process.env.ANTHROPIC_API_KEY
const MODEL = process.env.ANTHROPIC_MODEL_REPORT || 'claude-opus-4-8'
interface U { id: number; role: string }
const getUser = (req: Request) => (req as Request & { user?: U }).user as U
const ownDossier = (accId: number, did: number) => db.prepare('SELECT id FROM dossiers WHERE id=? AND accompagne_id=?').get(did, accId) as { id: number } | undefined

async function callClaude(system: string, user: string, maxTokens = 1200): Promise<string | null> {
  if (!KEY) return null
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, messages: [{ role: 'user', content: [
        { type: 'text', text: system, cache_control: { type: 'ephemeral' } }, { type: 'text', text: user },
      ] }] }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { content?: { type: string; text?: string }[] }
    return (data.content || []).filter((b) => b.type === 'text').map((b) => b.text || '').join('') || null
  } catch { return null }
}
function extractJson<T>(text: string | null): T | null {
  if (!text) return null
  const a = text.indexOf('{'), b = text.lastIndexOf('}')
  if (a < 0 || b < 0) return null
  try { return JSON.parse(text.slice(a, b + 1)) as T } catch { return null }
}

// ====================================================================================
//  1. Mutualisation entre pairs (accompagnateurs)
// ====================================================================================
const TYPES = ['question', 'methode', 'astuce']

// Lien PUBLIC (hors authentification) : lecture seule d'une ressource partagée publiquement.
router.get('/ressources/public/:token', (req: Request, res: Response) => {
  const r = db.prepare("SELECT r.titre, r.type, r.contenu, r.cree_le, u.prenom, u.nom FROM ressources_partagees r JOIN users u ON u.id=r.auteur_id WHERE r.token=? AND r.portee='public'").get(String(req.params.token)) as
    | { titre: string; type: string; contenu: string; cree_le: string; prenom: string | null; nom: string | null }
    | undefined
  if (!r) { res.status(404).json({ error: 'Ressource introuvable ou non publique' }); return }
  res.json({ ressource: { titre: r.titre, type: r.type, contenu: r.contenu, cree_le: r.cree_le, auteur: [r.prenom, r.nom].filter(Boolean).join(' ') || 'Un accompagnateur' } })
})

// Bibliothèque interne : toutes les ressources partagées entre accompagnateurs.
router.get('/ressources', requireAuth, requireRole('accompagnateur'), requireFeature('mutualisation'), (req: Request, res: Response) => {
  const me = getUser(req)
  const rows = db.prepare(
    `SELECT r.id, r.titre, r.type, r.contenu, r.portee, r.token, r.cree_le, r.auteur_id,
            u.prenom, u.nom, (r.auteur_id=?) AS mienne
     FROM ressources_partagees r JOIN users u ON u.id=r.auteur_id ORDER BY r.cree_le DESC`,
  ).all(me.id) as Array<{ prenom: string | null; nom: string | null; mienne: number }>
  const ressources = rows.map((r) => ({ ...r, auteur: [r.prenom, r.nom].filter(Boolean).join(' ') || 'Anonyme', mienne: !!r.mienne }))
  res.json({ ressources })
})

router.post('/ressources', requireAuth, requireRole('accompagnateur'), requireFeature('mutualisation'), (req: Request, res: Response) => {
  const me = getUser(req)
  const titre = String(req.body?.titre || '').trim()
  const contenu = String(req.body?.contenu || '').trim()
  const type = TYPES.includes(String(req.body?.type)) ? String(req.body.type) : 'astuce'
  if (!titre || !contenu) { res.status(400).json({ error: 'Titre et contenu requis' }); return }
  const info = db.prepare('INSERT INTO ressources_partagees (auteur_id, titre, type, contenu) VALUES (?,?,?,?)').run(me.id, titre, type, contenu)
  res.status(201).json({ id: Number(info.lastInsertRowid) })
})

// Basculer interne <-> public (génère/retire le jeton du lien public).
router.patch('/ressources/:id', requireAuth, requireRole('accompagnateur'), requireFeature('mutualisation'), (req: Request, res: Response) => {
  const me = getUser(req)
  const id = Number(req.params.id)
  const r = db.prepare('SELECT id, token FROM ressources_partagees WHERE id=? AND auteur_id=?').get(id, me.id) as { id: number; token: string | null } | undefined
  if (!r) { res.status(404).json({ error: 'Ressource introuvable' }); return }
  const public_ = req.body?.public === true
  if (public_) {
    const token = r.token || makeToken()
    db.prepare("UPDATE ressources_partagees SET portee='public', token=? WHERE id=?").run(token, id)
    res.json({ ok: true, portee: 'public', token })
  } else {
    db.prepare("UPDATE ressources_partagees SET portee='interne' WHERE id=?").run(id)
    res.json({ ok: true, portee: 'interne' })
  }
})

router.delete('/ressources/:id', requireAuth, requireRole('accompagnateur'), requireFeature('mutualisation'), (req: Request, res: Response) => {
  const me = getUser(req)
  const n = db.prepare('DELETE FROM ressources_partagees WHERE id=? AND auteur_id=?').run(Number(req.params.id), me.id).changes
  if (!n) { res.status(404).json({ error: 'Ressource introuvable' }); return }
  res.json({ ok: true })
})

// ====================================================================================
//  2. Assistant de problématisation (accompagné) — guidé puis libre
// ====================================================================================
const PB_QUESTIONS = [
  'Quel est le terrain professionnel de ton mémoire (où, avec qui, quoi) ?',
  'Quelle tension, difficulté ou question revient le plus souvent dans cette expérience ?',
  'Entre quoi et quoi se joue cette tension (ex. métier ↔ technique, autonomie ↔ contrôle) ?',
  'En quoi y répondre est-il utile — pour toi, ton organisation, ton champ professionnel ?',
]
function dossierContexte(did: number): string {
  const q = db.prepare('SELECT cr_recap FROM questionnaires_initiaux WHERE dossier_id=?').get(did) as { cr_recap: string | null } | undefined
  const fil = db.prepare("SELECT contenu FROM emergence WHERE dossier_id=? AND type='fil_rouge'").get(did) as { contenu: string } | undefined
  let ctx = ''
  if (q?.cr_recap) ctx += `Questionnaire initial :\n${q.cr_recap}\n`
  if (fil) { try { ctx += `\nFil rouge : ${(JSON.parse(fil.contenu) as { fil?: string }).fil || ''}` } catch { /* ignore */ } }
  return ctx || '(peu d’éléments disponibles)'
}

router.get('/problematisation/dossier/:id', requireAuth, requireRole('accompagne'), requireFeature('problematisation'), (req: Request, res: Response) => {
  const me = getUser(req)
  const did = Number(req.params.id)
  if (!ownDossier(me.id, did)) { res.status(404).json({ error: 'Parcours introuvable' }); return }
  const row = db.prepare('SELECT contenu, source, maj_le FROM problematisations WHERE dossier_id=?').get(did) as { contenu: string; source: string; maj_le: string } | undefined
  res.json({ questions: PB_QUESTIONS, data: row ? { ...JSON.parse(row.contenu), source: row.source, maj_le: row.maj_le } : null })
})

router.post('/problematisation/dossier/:id', requireAuth, requireRole('accompagne'), requireFeature('problematisation'), (req: Request, res: Response) => {
  const me = getUser(req)
  const did = Number(req.params.id)
  if (!ownDossier(me.id, did)) { res.status(404).json({ error: 'Parcours introuvable' }); return }
  const reponses = Array.isArray(req.body?.reponses) ? req.body.reponses.map((x: unknown) => String(x ?? '')) : []
  const problematique = String(req.body?.problematique || '')
  db.prepare(
    "INSERT INTO problematisations (dossier_id, contenu, source, maj_le) VALUES (?,?,?,datetime('now')) " +
    'ON CONFLICT(dossier_id) DO UPDATE SET contenu=excluded.contenu, source=excluded.source, maj_le=datetime(\'now\')',
  ).run(did, JSON.stringify({ reponses, problematique }), 'manuel')
  res.json({ ok: true })
})

// IA : propose une problématique (question de recherche) à partir des réponses guidées + contexte. Modifiable ensuite.
router.post('/problematisation/dossier/:id/suggerer', requireAuth, requireRole('accompagne'), requireFeature('problematisation'), async (req: Request, res: Response) => {
  const me = getUser(req)
  const did = Number(req.params.id)
  if (!ownDossier(me.id, did)) { res.status(404).json({ error: 'Parcours introuvable' }); return }
  const reponses = Array.isArray(req.body?.reponses) ? req.body.reponses.map((x: unknown) => String(x ?? '')) : []
  const system =
    "Tu aides un étudiant (UE FAD130, Cnam) à formuler la PROBLÉMATIQUE de son mémoire professionnel. " +
    'À partir de ses réponses guidées et du contexte, propose UNE question de recherche claire (la problématique) et 2-3 sous-questions. ' +
    'Tu proposes, l’étudiant décidera et reformulera. Pas de jargon inutile.'
  const data = `Contexte :\n${dossierContexte(did)}\n\nRéponses guidées :\n${PB_QUESTIONS.map((q, i) => `- ${q}\n  → ${reponses[i] || '(vide)'}`).join('\n')}\n\nJSON STRICT : {"problematique":"… une question …","sous_questions":["…","…"]}`
  const ai = extractJson<{ problematique: string; sous_questions: string[] }>(await callClaude(system, data, 700))
  if (ai?.problematique) {
    const sq = Array.isArray(ai.sous_questions) ? ai.sous_questions.slice(0, 3) : []
    res.json({ problematique: ai.problematique, sous_questions: sq, source: 'ia' })
    return
  }
  const terrain = reponses[0] || 'ton terrain professionnel'
  const tension = reponses[2] || 'les deux pôles en tension'
  res.json({
    problematique: `Comment, dans ${terrain}, concilier ${tension} ?`,
    sous_questions: ['Quels éléments concrets illustrent cette tension ?', 'Quels leviers permettent de la dépasser ?'],
    source: 'heuristique',
  })
})

// ====================================================================================
//  3. Résumé « où j'en suis » (accompagné)
// ====================================================================================
interface Resume { etat: string; faits: string[]; prochaines_etapes: string[] }
function resumeContexte(did: number): { phaseMax: number; nbCr: number; recap: string | null; actions: { libelle: string; statut: string }[] } {
  const phase = db.prepare('SELECT MAX(CAST(phase_atteinte AS INTEGER)) m FROM sessions WHERE dossier_id=?').get(did) as { m: number | null }
  const nbCr = (db.prepare("SELECT COUNT(*) n FROM comptes_rendus cr JOIN sessions s ON s.id=cr.session_id WHERE s.dossier_id=? AND cr.publie=1").get(did) as { n: number }).n
  const recap = (db.prepare('SELECT cr_recap FROM questionnaires_initiaux WHERE dossier_id=?').get(did) as { cr_recap: string | null } | undefined)?.cr_recap ?? null
  const actions = db.prepare("SELECT libelle, statut FROM actions WHERE dossier_id=? ORDER BY ordre, id").all(did) as { libelle: string; statut: string }[]
  return { phaseMax: phase.m ?? -1, nbCr, recap, actions }
}
const PHASES_FR = ['Accueil et mise en confiance', 'Clarifier le besoin', 'Explorer l’expérience', 'Relier et donner du sens', 'Plan d’action & engagement', 'Clôture et élan']
function resumeFallback(did: number): Resume {
  const c = resumeContexte(did)
  const enCours = c.actions.filter((a) => a.statut !== 'fait').map((a) => a.libelle)
  const faites = c.actions.filter((a) => a.statut === 'fait').length
  return {
    etat: c.phaseMax < 0 ? 'Ton parcours vient de démarrer.' : `Tu es à l’étape « ${PHASES_FR[c.phaseMax] || ''} ». ${c.nbCr} compte(s) rendu publié(s), ${faites} action(s) réalisée(s).`,
    faits: [c.recap ? 'Ton questionnaire initial est posé.' : 'Questionnaire initial à compléter.', c.nbCr ? `${c.nbCr} compte(s) rendu disponible(s).` : 'Pas encore de compte rendu publié.'],
    prochaines_etapes: enCours.slice(0, 3).length ? enCours.slice(0, 3) : ['Préparer le prochain entretien.'],
  }
}

router.get('/resume/dossier/:id', requireAuth, requireRole('accompagne'), requireFeature('resume_parcours'), (req: Request, res: Response) => {
  const me = getUser(req)
  const did = Number(req.params.id)
  if (!ownDossier(me.id, did)) { res.status(404).json({ error: 'Parcours introuvable' }); return }
  const row = db.prepare('SELECT contenu, source, genere_le FROM resumes_parcours WHERE dossier_id=?').get(did) as { contenu: string; source: string; genere_le: string } | undefined
  res.json({ resume: row ? { ...JSON.parse(row.contenu), source: row.source, genere_le: row.genere_le } : null })
})

router.post('/resume/dossier/:id', requireAuth, requireRole('accompagne'), requireFeature('resume_parcours'), async (req: Request, res: Response) => {
  const me = getUser(req)
  const did = Number(req.params.id)
  if (!ownDossier(me.id, did)) { res.status(404).json({ error: 'Parcours introuvable' }); return }
  const c = resumeContexte(did)
  const system =
    "Tu fais à un étudiant (UE FAD130) un point « OÙ J'EN SUIS » sur son accompagnement de mémoire. " +
    'Bienveillant, concret, à la 2e personne (« tu »). Tu valorises le chemin parcouru et tu clarifies les prochaines étapes.'
  const data = `Étape atteinte : ${c.phaseMax < 0 ? 'aucune' : PHASES_FR[c.phaseMax]}\nComptes rendus publiés : ${c.nbCr}\nQuestionnaire : ${c.recap || '(non complété)'}\nActions :\n${c.actions.map((a) => `- [${a.statut}] ${a.libelle}`).join('\n') || '(aucune)'}\n\nJSON STRICT : {"etat":"… 1-2 phrases …","faits":["…"],"prochaines_etapes":["…"]}`
  let resume = extractJson<Resume>(await callClaude(system, data, 700))
  let source = 'ia'
  if (!resume?.etat) { resume = resumeFallback(did); source = 'heuristique' }
  db.prepare(
    "INSERT INTO resumes_parcours (dossier_id, contenu, source, genere_le) VALUES (?,?,?,datetime('now')) " +
    'ON CONFLICT(dossier_id) DO UPDATE SET contenu=excluded.contenu, source=excluded.source, genere_le=datetime(\'now\')',
  ).run(did, JSON.stringify(resume), source)
  res.json({ ...resume, source })
})

export default router
