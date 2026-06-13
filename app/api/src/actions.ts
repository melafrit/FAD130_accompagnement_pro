import { Router, type Request, type Response } from 'express'
import { db } from './db'
import { requireAuth, requireRole } from './auth'

const router = Router()
interface U { id: number; role: string }
function getUser(req: Request): U {
  return (req as Request & { user?: U }).user as U
}

const STATUTS = ['a_faire', 'en_cours', 'fait']
const PRIORITES = ['haute', 'moyenne', 'basse']
// Colonnes renvoyées au client (mêmes champs partout)
const COLS = 'id, libelle, echeance, critere, details, priorite, statut, rappel_le, cree_le, ordre'

// Texte optionnel -> valeur nettoyée ou null
export function opt(v: unknown): string | null {
  if (v == null) return null
  const t = String(v).trim()
  return t ? t : null
}

// Le dossier est-il accessible à cet utilisateur (accompagnateur OU accompagné) ?
function dossierForUser(userId: number, dossierId: number) {
  return db
    .prepare('SELECT id, accompagnateur_id, accompagne_id FROM dossiers WHERE id=? AND (accompagnateur_id=? OR accompagne_id=?)')
    .get(Number(dossierId), userId, userId) as { id: number; accompagnateur_id: number; accompagne_id: number } | undefined
}
// L'action est-elle accessible à cet utilisateur (via son dossier) ?
function actionForUser(userId: number, actionId: number) {
  return db
    .prepare('SELECT a.id, a.dossier_id FROM actions a JOIN dossiers d ON d.id=a.dossier_id WHERE a.id=? AND (d.accompagnateur_id=? OR d.accompagne_id=?)')
    .get(Number(actionId), userId, userId) as { id: number; dossier_id: number } | undefined
}

// Accompagné : les actions de SON dossier + l'id du dossier (pour ajouter/réordonner)
// (on cible un seul dossier pour que la liste affichée et l'id envoyé restent cohérents)
router.get('/mine', requireAuth, requireRole('accompagne'), (req: Request, res: Response) => {
  const me = getUser(req)
  const dossier = db.prepare('SELECT id FROM dossiers WHERE accompagne_id=? ORDER BY id DESC LIMIT 1').get(me.id) as { id: number } | undefined
  const actions = dossier
    ? db.prepare(`SELECT ${COLS} FROM actions WHERE dossier_id=? ORDER BY ordre ASC, id ASC`).all(dossier.id)
    : []
  res.json({ actions, dossierId: dossier ? dossier.id : null })
})

// Accompagnateur : actions d'un dossier
router.get('/', requireAuth, requireRole('accompagnateur'), (req: Request, res: Response) => {
  const me = getUser(req)
  const dossierId = Number(req.query.dossierId)
  const owns = db.prepare('SELECT id FROM dossiers WHERE id=? AND accompagnateur_id=?').get(dossierId, me.id)
  if (!owns) {
    res.status(404).json({ error: 'Dossier introuvable' })
    return
  }
  const actions = db.prepare(`SELECT ${COLS} FROM actions WHERE dossier_id=? ORDER BY ordre ASC, id ASC`).all(dossierId)
  res.json({ actions })
})

// Ajouter une action (accompagnateur OU accompagné du dossier)
router.post('/', requireAuth, (req: Request, res: Response) => {
  const me = getUser(req)
  const { dossierId, libelle, echeance, critere, details, priorite, rappel_le } = req.body || {}
  if (!dossierForUser(me.id, Number(dossierId))) {
    res.status(404).json({ error: 'Dossier introuvable' })
    return
  }
  const lib = opt(libelle)
  if (!lib) {
    res.status(400).json({ error: 'Libellé requis' })
    return
  }
  const prio = opt(priorite)
  if (prio && !PRIORITES.includes(prio)) {
    res.status(400).json({ error: 'Priorité invalide' })
    return
  }
  const next = db.prepare('SELECT COALESCE(MAX(ordre), 0) + 1 AS n FROM actions WHERE dossier_id=?').get(Number(dossierId)) as { n: number }
  const info = db
    .prepare('INSERT INTO actions (dossier_id, libelle, echeance, critere, details, priorite, rappel_le, ordre) VALUES (?,?,?,?,?,?,?,?)')
    .run(Number(dossierId), lib, opt(echeance), opt(critere), opt(details), prio, opt(rappel_le), next.n)
  res.status(201).json({ id: Number(info.lastInsertRowid) })
})

// Modifier une action (champs partiels) — accompagnateur OU accompagné du dossier
router.patch('/:id', requireAuth, (req: Request, res: Response) => {
  const me = getUser(req)
  const id = Number(req.params.id)
  if (!actionForUser(me.id, id)) {
    res.status(404).json({ error: 'Action introuvable' })
    return
  }
  const b = req.body || {}
  const sets: string[] = []
  const vals: (string | number | null)[] = []
  if (b.libelle != null) {
    const lib = opt(b.libelle)
    if (!lib) {
      res.status(400).json({ error: 'Libellé vide' })
      return
    }
    sets.push('libelle=?'); vals.push(lib)
  }
  if (b.statut != null) {
    const st = String(b.statut)
    if (!STATUTS.includes(st)) {
      res.status(400).json({ error: 'Statut invalide' })
      return
    }
    sets.push('statut=?'); vals.push(st)
  }
  if (b.priorite !== undefined) {
    const prio = opt(b.priorite)
    if (prio && !PRIORITES.includes(prio)) {
      res.status(400).json({ error: 'Priorité invalide' })
      return
    }
    sets.push('priorite=?'); vals.push(prio)
  }
  if (b.echeance !== undefined) { sets.push('echeance=?'); vals.push(opt(b.echeance)) }
  if (b.critere !== undefined) { sets.push('critere=?'); vals.push(opt(b.critere)) }
  if (b.details !== undefined) { sets.push('details=?'); vals.push(opt(b.details)) }
  // Toute modification du rappel ré-arme l'envoi (la notification repartira quand la date sera atteinte)
  if (b.rappel_le !== undefined) { sets.push('rappel_le=?', 'rappel_envoye=0'); vals.push(opt(b.rappel_le)) }
  if (sets.length === 0) {
    res.json({ ok: true })
    return
  }
  vals.push(id)
  db.prepare(`UPDATE actions SET ${sets.join(', ')} WHERE id=?`).run(...vals)
  res.json({ ok: true })
})

// Supprimer une action — accompagnateur OU accompagné du dossier
router.delete('/:id', requireAuth, (req: Request, res: Response) => {
  const me = getUser(req)
  const id = Number(req.params.id)
  if (!actionForUser(me.id, id)) {
    res.status(404).json({ error: 'Action introuvable' })
    return
  }
  db.prepare('DELETE FROM actions WHERE id=?').run(id)
  res.json({ ok: true })
})

// Réordonner les actions d'un dossier (glisser-déposer) — accompagnateur OU accompagné
router.post('/reorder', requireAuth, (req: Request, res: Response) => {
  const me = getUser(req)
  const { dossierId, ids } = req.body || {}
  if (!dossierForUser(me.id, Number(dossierId))) {
    res.status(404).json({ error: 'Dossier introuvable' })
    return
  }
  if (!Array.isArray(ids)) {
    res.status(400).json({ error: 'Ordre invalide' })
    return
  }
  const upd = db.prepare('UPDATE actions SET ordre=? WHERE id=? AND dossier_id=?')
  const tx = db.transaction((list: number[]) => {
    const seen = new Set<number>()
    list.forEach((aid, i) => { upd.run(i, Number(aid), Number(dossierId)); seen.add(Number(aid)) })
    // Renumérote à la suite les actions du dossier absentes de la liste (ordre contigu, sans collision)
    const rest = db.prepare('SELECT id FROM actions WHERE dossier_id=? ORDER BY ordre ASC, id ASC').all(Number(dossierId)) as { id: number }[]
    let n = list.length
    for (const r of rest) if (!seen.has(r.id)) upd.run(n++, r.id, Number(dossierId))
  })
  tx(ids)
  res.json({ ok: true })
})

export default router
