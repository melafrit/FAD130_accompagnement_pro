import { Router, type Request, type Response } from 'express'
import { db } from './db'
import { requireAuth, requireRole } from './auth'
import { genererContenu, contentToHtml } from './compteRendu'

const router = Router()

interface AuthedUser { id: number; role: string }
function getUser(req: Request): AuthedUser {
  return (req as Request & { user?: AuthedUser }).user as AuthedUser
}

interface SessInfo { dossier_id: number; accompagnateur_id: number; accompagne_id: number; accompagne_prenom: string | null; accompagne_email: string }
function sessionInfo(sessionId: number): SessInfo | undefined {
  return db
    .prepare(
      `SELECT s.dossier_id, d.accompagnateur_id, d.accompagne_id, u.prenom AS accompagne_prenom, u.email AS accompagne_email
       FROM sessions s JOIN dossiers d ON d.id = s.dossier_id JOIN users u ON u.id = d.accompagne_id
       WHERE s.id = ?`,
    )
    .get(sessionId) as SessInfo | undefined
}
// Accès à la session pour cet utilisateur (accompagnateur propriétaire ou accompagné du dossier)
function canAccess(user: AuthedUser, s: SessInfo): boolean {
  return (user.role === 'accompagnateur' && s.accompagnateur_id === user.id) || (user.role === 'accompagne' && s.accompagne_id === user.id)
}
function publishedVersion(sessionId: number) {
  return db.prepare('SELECT id, version, contenu_html, genere_le, publie_le FROM comptes_rendus WHERE session_id=? AND publie=1 ORDER BY version DESC LIMIT 1').get(sessionId) as
    | { id: number; version: number; contenu_html: string | null; genere_le: string; publie_le: string | null }
    | undefined
}
function latestVersion(sessionId: number) {
  return db.prepare('SELECT id, version, contenu_html, source, genere_le, publie FROM comptes_rendus WHERE session_id=? ORDER BY version DESC LIMIT 1').get(sessionId) as
    | { id: number; version: number; contenu_html: string | null; source: string; genere_le: string; publie: number }
    | undefined
}

// Générer (ou régénérer) le compte rendu d'une session via l'IA — crée une nouvelle version
router.post('/generer', requireAuth, requireRole('accompagnateur'), async (req: Request, res: Response) => {
  const me = getUser(req)
  const sessionId = Number(req.body?.sessionId)
  const s = sessionInfo(sessionId)
  if (!s || s.accompagnateur_id !== me.id) {
    res.status(404).json({ error: 'Session introuvable' })
    return
  }
  const reps = db.prepare('SELECT phase, texte_reponse FROM reponses WHERE session_id = ?').all(sessionId) as { phase: string; texte_reponse: string }[]
  const notes: Record<number, string> = {}
  reps.forEach((r) => (notes[Number(r.phase)] = r.texte_reponse))

  const content = await genererContenu(notes)
  const html = contentToHtml(content, { accompagne: s.accompagne_prenom || s.accompagne_email, date: new Date().toISOString().slice(0, 10) })

  const prev = latestVersion(sessionId)
  const version = (prev?.version ?? 0) + 1
  const info = db
    .prepare("INSERT INTO comptes_rendus (session_id, version, contenu_html, source, publie, genere_le) VALUES (?, ?, ?, 'ia', 0, datetime('now'))")
    .run(sessionId, version, html)
  const crId = Number(info.lastInsertRowid)

  // À la PREMIÈRE génération seulement, alimente le plan d'action (évite les doublons aux régénérations)
  if (!prev) {
    const next = (db.prepare('SELECT COALESCE(MAX(ordre),0)+1 AS n FROM actions WHERE dossier_id=?').get(s.dossier_id) as { n: number }).n
    content.planAction.forEach((a, i) => {
      if (a.etape && a.etape !== '—') {
        db.prepare('INSERT INTO actions (dossier_id, libelle, echeance, critere, ordre) VALUES (?, ?, ?, ?, ?)').run(s.dossier_id, a.etape, a.echeance || null, a.critere || null, next + i)
      }
    })
  }
  res.status(201).json({ id: crId, version, contenu_html: html, source: 'ia', publie: 0 })
})

// État du compte rendu d'une session (accompagnateur : courant + historique ; accompagné : version publiée)
router.get('/session/:sid', requireAuth, (req: Request, res: Response) => {
  const me = getUser(req)
  const sid = Number(req.params.sid)
  const s = sessionInfo(sid)
  if (!s || !canAccess(me, s)) {
    res.status(404).json({ error: 'Session introuvable' })
    return
  }
  if (me.role === 'accompagne') {
    const pub = publishedVersion(sid)
    res.json({ role: 'accompagne', cr: pub ? { id: pub.id, version: pub.version, contenu_html: pub.contenu_html, genere_le: pub.genere_le, publie: 1 } : null, versions: [] })
    return
  }
  const current = latestVersion(sid)
  const versions = db.prepare('SELECT id, version, source, genere_le, publie FROM comptes_rendus WHERE session_id=? ORDER BY version DESC').all(sid)
  res.json({ role: 'accompagnateur', cr: current || null, versions })
})

// Lire une version précise (historique) — accompagnateur propriétaire
router.get('/version/:id', requireAuth, requireRole('accompagnateur'), (req: Request, res: Response) => {
  const me = getUser(req)
  const id = Number(req.params.id)
  const cr = db
    .prepare('SELECT cr.id, cr.session_id, cr.version, cr.contenu_html, cr.source, cr.genere_le, cr.publie, d.accompagnateur_id FROM comptes_rendus cr JOIN sessions s ON s.id=cr.session_id JOIN dossiers d ON d.id=s.dossier_id WHERE cr.id=?')
    .get(id) as { id: number; session_id: number; version: number; contenu_html: string | null; source: string; genere_le: string; publie: number; accompagnateur_id: number } | undefined
  if (!cr || cr.accompagnateur_id !== me.id) {
    res.status(404).json({ error: 'Compte rendu introuvable' })
    return
  }
  res.json({ cr })
})

// Enregistrer le contenu édité (uniquement la version courante) — accompagnateur
router.patch('/version/:id', requireAuth, requireRole('accompagnateur'), (req: Request, res: Response) => {
  const me = getUser(req)
  const id = Number(req.params.id)
  const cr = db
    .prepare('SELECT cr.id, cr.session_id, cr.version, d.accompagnateur_id FROM comptes_rendus cr JOIN sessions s ON s.id=cr.session_id JOIN dossiers d ON d.id=s.dossier_id WHERE cr.id=?')
    .get(id) as { id: number; session_id: number; version: number; accompagnateur_id: number } | undefined
  if (!cr || cr.accompagnateur_id !== me.id) {
    res.status(404).json({ error: 'Compte rendu introuvable' })
    return
  }
  const latest = latestVersion(cr.session_id)
  if (!latest || latest.id !== cr.id) {
    res.status(400).json({ error: 'Seule la version courante est modifiable (les versions de l’historique sont figées).' })
    return
  }
  const html = String(req.body?.contenu_html ?? '')
  db.prepare("UPDATE comptes_rendus SET contenu_html=?, source='edition' WHERE id=?").run(html, id)
  res.json({ ok: true })
})

// Publier une version (visible par l'accompagné) — accompagnateur
router.post('/version/:id/publier', requireAuth, requireRole('accompagnateur'), (req: Request, res: Response) => {
  const me = getUser(req)
  const id = Number(req.params.id)
  const cr = db
    .prepare('SELECT cr.id, cr.session_id, d.accompagnateur_id, d.accompagne_id FROM comptes_rendus cr JOIN sessions s ON s.id=cr.session_id JOIN dossiers d ON d.id=s.dossier_id WHERE cr.id=?')
    .get(id) as { id: number; session_id: number; accompagnateur_id: number; accompagne_id: number } | undefined
  if (!cr || cr.accompagnateur_id !== me.id) {
    res.status(404).json({ error: 'Compte rendu introuvable' })
    return
  }
  db.transaction(() => {
    db.prepare('UPDATE comptes_rendus SET publie=0, publie_le=NULL WHERE session_id=?').run(cr.session_id)
    db.prepare("UPDATE comptes_rendus SET publie=1, publie_le=datetime('now') WHERE id=?").run(id)
    db.prepare('INSERT INTO notifications (user_id, texte) VALUES (?, ?)').run(cr.accompagne_id, 'Un compte rendu a été publié dans votre espace.')
  })()
  res.json({ ok: true })
})

// Comptes rendus publiés (accompagné)
router.get('/mine', requireAuth, requireRole('accompagne'), (req: Request, res: Response) => {
  const me = getUser(req)
  const comptesRendus = db
    .prepare(
      `SELECT cr.id, cr.session_id, cr.genere_le, cr.publie_le, s.date AS entretien_date, d.titre AS dossier_titre
       FROM comptes_rendus cr JOIN sessions s ON s.id=cr.session_id JOIN dossiers d ON d.id=s.dossier_id
       WHERE d.accompagne_id=? AND cr.publie=1 ORDER BY cr.publie_le DESC`,
    )
    .all(me.id)
  res.json({ comptesRendus })
})

// ---- Discussion sur le compte rendu (accompagné ↔ accompagnateur) ----
// L'accompagné n'accède à la discussion que si un compte rendu est publié pour cette session.
function canDiscuss(user: AuthedUser, s: SessInfo, sid: number): boolean {
  if (!canAccess(user, s)) return false
  if (user.role === 'accompagne') return !!publishedVersion(sid)
  return true
}

router.get('/session/:sid/messages', requireAuth, (req: Request, res: Response) => {
  const me = getUser(req)
  const sid = Number(req.params.sid)
  const s = sessionInfo(sid)
  if (!s || !canDiscuss(me, s, sid)) {
    res.status(404).json({ error: 'Discussion indisponible' })
    return
  }
  const messages = db
    .prepare(
      `SELECT m.id, m.auteur_id, m.texte, m.cree_le, u.prenom AS auteur_prenom, u.role AS auteur_role
       FROM cr_messages m JOIN users u ON u.id=m.auteur_id WHERE m.session_id=? ORDER BY m.cree_le ASC, m.id ASC`,
    )
    .all(sid) as { id: number; auteur_id: number; texte: string; cree_le: string; auteur_prenom: string | null; auteur_role: string }[]
  res.json({ messages: messages.map((m) => ({ ...m, is_me: m.auteur_id === me.id })) })
})

router.post('/session/:sid/messages', requireAuth, (req: Request, res: Response) => {
  const me = getUser(req)
  const sid = Number(req.params.sid)
  const s = sessionInfo(sid)
  if (!s || !canDiscuss(me, s, sid)) {
    res.status(404).json({ error: 'Discussion indisponible' })
    return
  }
  const texte = String(req.body?.texte ?? '').trim()
  if (!texte) {
    res.status(400).json({ error: 'Message vide' })
    return
  }
  const info = db.prepare('INSERT INTO cr_messages (session_id, auteur_id, texte) VALUES (?,?,?)').run(sid, me.id, texte)
  // Notifie l'autre partie
  const autre = me.id === s.accompagnateur_id ? s.accompagne_id : s.accompagnateur_id
  db.prepare('INSERT INTO notifications (user_id, texte) VALUES (?, ?)').run(autre, 'Nouveau message sur un compte rendu.')
  res.status(201).json({ id: Number(info.lastInsertRowid) })
})

// ---- Notes privées de l'accompagnateur (jamais publiées) ----
router.get('/session/:sid/notes', requireAuth, requireRole('accompagnateur'), (req: Request, res: Response) => {
  const me = getUser(req)
  const sid = Number(req.params.sid)
  const s = sessionInfo(sid)
  if (!s || s.accompagnateur_id !== me.id) {
    res.status(404).json({ error: 'Session introuvable' })
    return
  }
  const note = db.prepare('SELECT contenu_html, maj_le FROM cr_notes_privees WHERE session_id=?').get(sid) as { contenu_html: string | null; maj_le: string } | undefined
  res.json({ contenu_html: note?.contenu_html ?? '', maj_le: note?.maj_le ?? null })
})

router.put('/session/:sid/notes', requireAuth, requireRole('accompagnateur'), (req: Request, res: Response) => {
  const me = getUser(req)
  const sid = Number(req.params.sid)
  const s = sessionInfo(sid)
  if (!s || s.accompagnateur_id !== me.id) {
    res.status(404).json({ error: 'Session introuvable' })
    return
  }
  const html = String(req.body?.contenu_html ?? '')
  db.prepare(
    `INSERT INTO cr_notes_privees (session_id, contenu_html, maj_le) VALUES (?, ?, datetime('now'))
     ON CONFLICT(session_id) DO UPDATE SET contenu_html=excluded.contenu_html, maj_le=datetime('now')`,
  ).run(sid, html)
  res.json({ ok: true })
})

export default router
