import { Router, type Request, type Response } from 'express'
import { db } from './db'
import { requireAuth } from './auth'
import { sendEmail } from './mailer'

const router = Router()
function uid(req: Request): number {
  return (req as Request & { user?: { id: number } }).user!.id
}

const insNotif = db.prepare('INSERT INTO notifications (user_id, texte) VALUES (?, ?)')
const markRappelSent = db.prepare('UPDATE actions SET rappel_envoye=1 WHERE id=? AND rappel_envoye=0')

/**
 * Balaye les actions dont la date de rappel est atteinte et qui n'ont pas encore été notifiées,
 * crée une notification in-app + un e-mail pour l'accompagné ET l'accompagnateur, puis marque
 * le rappel comme envoyé (drapeau idempotent : pas de doublon même si appelé souvent).
 * Appelé paresseusement à chaque consultation des notifications (pas de planificateur dédié).
 */
export function sweepDueReminders(): void {
  const due = db
    .prepare(
      `SELECT a.id, a.libelle, a.echeance,
              acc.id AS acc_id, acc.email AS acc_email,
              tut.id AS tut_id, tut.email AS tut_email
       FROM actions a
       JOIN dossiers d ON d.id = a.dossier_id
       JOIN users acc ON acc.id = d.accompagne_id
       JOIN users tut ON tut.id = d.accompagnateur_id
       WHERE a.rappel_le IS NOT NULL AND a.rappel_envoye = 0 AND a.rappel_le <= date('now', 'localtime')`,
    )
    .all() as Array<{ id: number; libelle: string; echeance: string | null; acc_id: number; acc_email: string; tut_id: number; tut_email: string }>
  for (const a of due) {
    if (markRappelSent.run(a.id).changes !== 1) continue // déjà traité entre-temps
    const texte = `Rappel : « ${a.libelle} »${a.echeance ? ` — échéance le ${a.echeance}` : ''}.`
    insNotif.run(a.acc_id, texte)
    insNotif.run(a.tut_id, texte)
    const subject = 'Boussole — rappel d’une action'
    const html = `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:auto"><h2 style="color:#16324f">Boussole</h2><p>${texte}</p><p style="color:#888;font-size:12px">Plan d’action — UE FAD130 (Cnam).</p></div>`
    void sendEmail(a.acc_email, subject, html)
    void sendEmail(a.tut_email, subject, html)
  }
}

// Liste des notifications + nombre de non lues
router.get('/', requireAuth, (req: Request, res: Response) => {
  sweepDueReminders() // matérialise les rappels arrivés à échéance avant de lister
  const id = uid(req)
  const notifications = db
    .prepare('SELECT id, texte, lu, cree_le FROM notifications WHERE user_id=? ORDER BY cree_le DESC LIMIT 30')
    .all(id)
  const nl = db.prepare('SELECT COUNT(*) AS n FROM notifications WHERE user_id=? AND lu=0').get(id) as { n: number }
  res.json({ notifications, nonLues: nl.n })
})

// Tout marquer comme lu
router.post('/lues', requireAuth, (req: Request, res: Response) => {
  db.prepare('UPDATE notifications SET lu=1 WHERE user_id=?').run(uid(req))
  res.json({ ok: true })
})

export default router
