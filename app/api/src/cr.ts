import { Router, type Request, type Response } from 'express'
import { mkdirSync, writeFileSync, renameSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import multer from 'multer'
import { db } from './db'
import { requireAuth, requireRole } from './auth'
import { genererContenu, construireDocx } from './compteRendu'

const CR_DIR = process.env.CR_DIR || './data/cr'
mkdirSync(CR_DIR, { recursive: true })
const upload = multer({ dest: CR_DIR, limits: { fileSize: 5 * 1024 * 1024 } })

const router = Router()

interface AuthedUser { id: number; role: string }
function getUser(req: Request): AuthedUser {
  return (req as Request & { user?: AuthedUser }).user as AuthedUser
}

// Générer un compte rendu pour une session (accompagnateur)
router.post('/generer', requireAuth, requireRole('accompagnateur'), async (req: Request, res: Response) => {
  const me = getUser(req)
  const sessionId = Number(req.body?.sessionId)
  const s = db
    .prepare(
      `SELECT s.id, s.dossier_id, d.accompagne_id, u.prenom, u.email
       FROM sessions s JOIN dossiers d ON d.id = s.dossier_id JOIN users u ON u.id = d.accompagne_id
       WHERE s.id = ? AND d.accompagnateur_id = ?`,
    )
    .get(sessionId, me.id) as { id: number; dossier_id: number; accompagne_id: number; prenom: string | null; email: string } | undefined
  if (!s) {
    res.status(404).json({ error: 'Session introuvable' })
    return
  }
  const reps = db.prepare('SELECT phase, texte_reponse FROM reponses WHERE session_id = ?').all(sessionId) as { phase: string; texte_reponse: string }[]
  const notes: Record<number, string> = {}
  reps.forEach((r) => (notes[Number(r.phase)] = r.texte_reponse))

  const content = await genererContenu(notes)
  const meta = { accompagne: s.prenom || s.email, date: new Date().toISOString().slice(0, 10) }
  const buf = await construireDocx(content, meta)

  const version = (db.prepare('SELECT COALESCE(MAX(version),0)+1 AS v FROM comptes_rendus WHERE session_id=?').get(sessionId) as { v: number }).v
  const info = db.prepare("INSERT INTO comptes_rendus (session_id, version, publie, publie_le) VALUES (?, ?, 1, datetime('now'))").run(sessionId, version)
  const crId = Number(info.lastInsertRowid)
  const filename = `cr-${crId}.docx`
  writeFileSync(join(CR_DIR, filename), buf)
  db.prepare('UPDATE comptes_rendus SET chemin=? WHERE id=?').run(filename, crId)

  // Plan d'action -> table actions
  content.planAction.forEach((a) => {
    if (a.etape && a.etape !== '—') {
      db.prepare('INSERT INTO actions (dossier_id, libelle, echeance, critere) VALUES (?, ?, ?, ?)').run(s.dossier_id, a.etape, a.echeance || null, a.critere || null)
    }
  })
  // Notifier l'accompagné
  db.prepare('INSERT INTO notifications (user_id, texte) VALUES (?, ?)').run(s.accompagne_id, 'Un nouveau compte rendu est disponible dans votre espace.')

  res.json({ id: crId, version })
})

// Liste des CR d'une session (accompagnateur)
router.get('/session/:sid', requireAuth, requireRole('accompagnateur'), (req: Request, res: Response) => {
  const me = getUser(req)
  const sid = Number(req.params.sid)
  const owns = db.prepare('SELECT s.id FROM sessions s JOIN dossiers d ON d.id=s.dossier_id WHERE s.id=? AND d.accompagnateur_id=?').get(sid, me.id)
  if (!owns) {
    res.status(404).json({ error: 'Session introuvable' })
    return
  }
  const comptesRendus = db.prepare('SELECT id, version, genere_le, publie FROM comptes_rendus WHERE session_id=? ORDER BY genere_le DESC').all(sid)
  res.json({ comptesRendus })
})

// Liste des CR publiés (accompagné)
router.get('/mine', requireAuth, requireRole('accompagne'), (req: Request, res: Response) => {
  const me = getUser(req)
  const comptesRendus = db
    .prepare(
      `SELECT cr.id, cr.version, cr.genere_le
       FROM comptes_rendus cr JOIN sessions s ON s.id=cr.session_id JOIN dossiers d ON d.id=s.dossier_id
       WHERE d.accompagne_id=? AND cr.publie=1 ORDER BY cr.genere_le DESC`,
    )
    .all(me.id)
  res.json({ comptesRendus })
})

// Télécharger un CR (accompagnateur propriétaire ou accompagné si publié)
router.get('/:id/download', requireAuth, (req: Request, res: Response) => {
  const me = getUser(req)
  const id = Number(req.params.id)
  const cr = db
    .prepare(
      `SELECT cr.id, cr.chemin, cr.publie, d.accompagnateur_id, d.accompagne_id
       FROM comptes_rendus cr JOIN sessions s ON s.id=cr.session_id JOIN dossiers d ON d.id=s.dossier_id
       WHERE cr.id=?`,
    )
    .get(id) as { id: number; chemin: string | null; publie: number; accompagnateur_id: number; accompagne_id: number } | undefined
  if (!cr || !cr.chemin || !existsSync(join(CR_DIR, cr.chemin))) {
    res.status(404).json({ error: 'Compte rendu introuvable' })
    return
  }
  const allowed =
    (me.role === 'accompagnateur' && cr.accompagnateur_id === me.id) ||
    (me.role === 'accompagne' && cr.accompagne_id === me.id && cr.publie === 1)
  if (!allowed) {
    res.status(403).json({ error: 'Accès refusé' })
    return
  }
  res.download(join(CR_DIR, cr.chemin), `compte-rendu-${id}.docx`)
})

// Ré-importer une version modifiée (accompagnateur)
router.post('/:id/reimport', requireAuth, requireRole('accompagnateur'), upload.single('fichier'), (req: Request, res: Response) => {
  const me = getUser(req)
  const id = Number(req.params.id)
  const file = (req as Request & { file?: { path: string } }).file
  const cr = db
    .prepare(
      `SELECT cr.id, cr.chemin, d.accompagnateur_id
       FROM comptes_rendus cr JOIN sessions s ON s.id=cr.session_id JOIN dossiers d ON d.id=s.dossier_id
       WHERE cr.id=?`,
    )
    .get(id) as { id: number; chemin: string | null; accompagnateur_id: number } | undefined
  if (!cr || cr.accompagnateur_id !== me.id) {
    res.status(404).json({ error: 'Compte rendu introuvable' })
    return
  }
  if (!file) {
    res.status(400).json({ error: 'Aucun fichier reçu' })
    return
  }
  const filename = cr.chemin || `cr-${id}.docx`
  renameSync(file.path, join(CR_DIR, filename))
  db.prepare("UPDATE comptes_rendus SET version=version+1, genere_le=datetime('now') WHERE id=?").run(id)
  res.json({ ok: true })
})

export default router
