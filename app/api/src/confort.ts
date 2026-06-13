import { Router, type Request, type Response } from 'express'
import crypto from 'node:crypto'
import webpush from 'web-push'
import { db } from './db'
import { requireAuth, requireRole } from './auth'
import { requireFeature } from './features'

// Confort & pratique :
//  - Visio aux rendez-vous (salle Jitsi Meet, sans compte)
//  - PWA & notifications push (Web Push / VAPID)
//  - Export PDF complet d'un dossier (vue imprimable assemblée)
const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me'
interface U { id: number; role: string }
const getUser = (req: Request) => (req as Request & { user?: U }).user as U

// --- VAPID : clés stables via l'environnement, sinon éphémères (régénérées au démarrage) ---
let vapidPublic = process.env.VAPID_PUBLIC_KEY || ''
const vapidPrivate = process.env.VAPID_PRIVATE_KEY || ''
try {
  if (vapidPublic && vapidPrivate) {
    webpush.setVapidDetails('mailto:contact@elafrit.com', vapidPublic, vapidPrivate)
  } else {
    const keys = webpush.generateVAPIDKeys()
    vapidPublic = keys.publicKey
    webpush.setVapidDetails('mailto:contact@elafrit.com', keys.publicKey, keys.privateKey)
    console.log('[push] Clés VAPID éphémères générées. Définir VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY pour les rendre stables.')
  }
} catch (e) {
  console.error('[push] Initialisation VAPID impossible :', e)
}

/** Envoie une notification push à tous les appareils d'un utilisateur (best effort, purge les abonnements morts). */
export async function pushToUser(userId: number, payload: { title: string; body: string; url?: string }): Promise<void> {
  const subs = db.prepare('SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id=?').all(userId) as
    { id: number; endpoint: string; p256dh: string; auth: string }[]
  for (const s of subs) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload))
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode
      if (code === 404 || code === 410) db.prepare('DELETE FROM push_subscriptions WHERE id=?').run(s.id)
    }
  }
}

// ====================================================================================
//  1. Visio aux rendez-vous (Jitsi Meet)
// ====================================================================================
router.get('/visio/rdv/:id', requireAuth, requireFeature('visio'), (req: Request, res: Response) => {
  const me = getUser(req)
  const id = Number(req.params.id)
  const rdv = db.prepare('SELECT r.id, r.accompagne_id, c.accompagnateur_id FROM rdv r JOIN creneaux c ON c.id=r.creneau_id WHERE r.id=?').get(id) as
    { id: number; accompagne_id: number; accompagnateur_id: number } | undefined
  if (!rdv || (me.id !== rdv.accompagne_id && me.id !== rdv.accompagnateur_id)) { res.status(404).json({ error: 'Rendez-vous introuvable' }); return }
  const hash = crypto.createHash('sha256').update(`${rdv.id}:${JWT_SECRET}`).digest('hex').slice(0, 10)
  const salle = `Boussole-${rdv.id}-${hash}`
  res.json({ salle, url: `https://meet.jit.si/${salle}` })
})

// ====================================================================================
//  2. PWA & notifications push
// ====================================================================================
router.get('/push/cle', requireAuth, requireFeature('pwa_push'), (_req: Request, res: Response) => {
  res.json({ cle: vapidPublic })
})

router.post('/push/abonnement', requireAuth, requireFeature('pwa_push'), (req: Request, res: Response) => {
  const me = getUser(req)
  const sub = req.body?.subscription || req.body
  const endpoint = sub?.endpoint
  const p256dh = sub?.keys?.p256dh
  const auth = sub?.keys?.auth
  if (!endpoint || !p256dh || !auth) { res.status(400).json({ error: 'Abonnement invalide' }); return }
  db.prepare(
    'INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES (?,?,?,?) ' +
    'ON CONFLICT(endpoint) DO UPDATE SET user_id=excluded.user_id, p256dh=excluded.p256dh, auth=excluded.auth',
  ).run(me.id, String(endpoint), String(p256dh), String(auth))
  res.status(201).json({ ok: true })
})

router.post('/push/test', requireAuth, requireFeature('pwa_push'), async (req: Request, res: Response) => {
  const me = getUser(req)
  await pushToUser(me.id, { title: 'Boussole', body: 'Tes notifications push sont bien activées ✓', url: '/espace' })
  res.json({ ok: true })
})

// ====================================================================================
//  3. Export PDF complet (vue imprimable assemblée, côté accompagnateur)
// ====================================================================================
router.get('/export/dossier/:id', requireAuth, requireRole('accompagnateur'), requireFeature('export_pdf'), (req: Request, res: Response) => {
  const me = getUser(req)
  const id = Number(req.params.id)
  const dossier = db.prepare(
    'SELECT d.id, d.titre, d.statut, d.contexte, d.cree_le, u.prenom, u.nom, u.email FROM dossiers d JOIN users u ON u.id=d.accompagne_id WHERE d.id=? AND d.accompagnateur_id=?',
  ).get(id, me.id) as { id: number; titre: string | null; statut: string; contexte: string | null; cree_le: string; prenom: string | null; nom: string | null; email: string } | undefined
  if (!dossier) { res.status(404).json({ error: 'Dossier introuvable' }); return }

  const questionnaire = (db.prepare('SELECT cr_recap FROM questionnaires_initiaux WHERE dossier_id=?').get(id) as { cr_recap: string | null } | undefined)?.cr_recap ?? null
  const crs = db.prepare(
    "SELECT s.date AS date, cr.contenu_html AS html FROM comptes_rendus cr JOIN sessions s ON s.id=cr.session_id WHERE s.dossier_id=? AND cr.publie=1 ORDER BY s.date",
  ).all(id) as { date: string; html: string | null }[]
  const synthese = (db.prepare("SELECT contenu_html FROM syntheses WHERE dossier_id=? AND publie=1 ORDER BY version DESC LIMIT 1").get(id) as { contenu_html: string | null } | undefined)?.contenu_html ?? null
  const actions = db.prepare('SELECT libelle, statut, echeance, critere FROM actions WHERE dossier_id=? ORDER BY ordre, id').all(id) as { libelle: string; statut: string; echeance: string | null; critere: string | null }[]
  const grille = db.prepare("SELECT note_globale, commentaire_global FROM auto_evaluations WHERE dossier_id=? AND statut='validee' ORDER BY id DESC LIMIT 1").get(id) as { note_globale: number | null; commentaire_global: string | null } | undefined

  res.json({
    dossier: { titre: dossier.titre, statut: dossier.statut, contexte: dossier.contexte, cree_le: dossier.cree_le, accompagne: [dossier.prenom, dossier.nom].filter(Boolean).join(' ') || dossier.email },
    questionnaire,
    comptes_rendus: crs.map((c) => ({ date: c.date, html: c.html || '' })),
    synthese,
    actions,
    grille: grille ? { note: grille.note_globale, commentaire: grille.commentaire_global } : null,
  })
})

export default router
