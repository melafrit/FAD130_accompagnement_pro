import { Router, type Request, type Response } from 'express'
import { db } from './db'
import { requireAuth, requireRole } from './auth'
import { sendEmail } from './mailer'

const router = Router()

interface AuthedUser { id: number; email: string; role: string }
function getUser(req: Request): AuthedUser {
  return (req as Request & { user?: AuthedUser }).user as AuthedUser
}

/** Accompagnateur rattaché à un accompagné (via lien) ou, à défaut, l'accompagnateur par défaut. */
function findAccompagnateurFor(accompagneId: number): number | null {
  const lien = db
    .prepare("SELECT accompagnateur_id AS id FROM liens_accompagnement WHERE accompagne_id=? AND statut='actif' ORDER BY id LIMIT 1")
    .get(accompagneId) as { id: number } | undefined
  if (lien) return lien.id
  const def = db.prepare("SELECT id FROM users WHERE role='accompagnateur' AND actif=1 ORDER BY id LIMIT 1").get() as { id: number } | undefined
  return def ? def.id : null
}

function formatFr(iso: string): string {
  const [d, t] = iso.split('T')
  const [y, m, day] = (d || '').split('-')
  return `${day}/${m}/${y} à ${(t || '').slice(0, 5)}`
}

// === Accompagnateur : gérer ses créneaux ===
router.post('/creneaux', requireAuth, requireRole('accompagnateur'), (req: Request, res: Response) => {
  const me = getUser(req)
  const { debut, fin } = req.body || {}
  if (!debut || !fin || String(fin) <= String(debut)) {
    res.status(400).json({ error: 'Créneau invalide (la fin doit suivre le début)' })
    return
  }
  const info = db.prepare('INSERT INTO creneaux (accompagnateur_id, debut, fin) VALUES (?, ?, ?)').run(me.id, debut, fin)
  // Prévient les accompagnés qui avaient demandé un RDV (faute de créneau) qu'il y en a maintenant
  const demandeurs = db.prepare("SELECT DISTINCT accompagne_id FROM demandes_rdv WHERE accompagnateur_id=? AND statut='en_attente'").all(me.id) as { accompagne_id: number }[]
  if (demandeurs.length) {
    const insN = db.prepare('INSERT INTO notifications (user_id, texte) VALUES (?, ?)')
    demandeurs.forEach((d) => insN.run(d.accompagne_id, 'De nouveaux créneaux de rendez-vous sont disponibles chez votre accompagnateur.'))
    db.prepare("UPDATE demandes_rdv SET statut='satisfaite' WHERE accompagnateur_id=? AND statut='en_attente'").run(me.id)
  }
  res.status(201).json({ id: Number(info.lastInsertRowid), debut, fin, reserve: 0 })
})

router.get('/creneaux/mine', requireAuth, requireRole('accompagnateur'), (req: Request, res: Response) => {
  const me = getUser(req)
  const creneaux = db
    .prepare(
      `SELECT c.id, c.debut, c.fin, c.reserve,
              u.email AS accompagne_email, u.prenom AS accompagne_prenom
       FROM creneaux c
       LEFT JOIN rdv r ON r.creneau_id = c.id
       LEFT JOIN users u ON u.id = r.accompagne_id
       WHERE c.accompagnateur_id = ?
       ORDER BY c.debut`,
    )
    .all(me.id)
  res.json({ creneaux })
})

router.delete('/creneaux/:id', requireAuth, requireRole('accompagnateur'), (req: Request, res: Response) => {
  const me = getUser(req)
  const id = Number(req.params.id)
  const c = db.prepare('SELECT reserve FROM creneaux WHERE id=? AND accompagnateur_id=?').get(id, me.id) as { reserve: number } | undefined
  if (!c) {
    res.status(404).json({ error: 'Créneau introuvable' })
    return
  }
  if (c.reserve) {
    res.status(409).json({ error: 'Créneau déjà réservé' })
    return
  }
  db.prepare('DELETE FROM creneaux WHERE id=?').run(id)
  res.json({ ok: true })
})

// === Accompagné : réserver un créneau (par parcours) ===
// Accompagnateur cible : celui du parcours (dossierId) si fourni, sinon l'accompagnateur par défaut.
function targetAccompagnateur(meId: number, dossierId: number | null): number | null {
  if (dossierId) {
    const d = db.prepare('SELECT accompagnateur_id FROM dossiers WHERE id=? AND accompagne_id=?').get(dossierId, meId) as { accompagnateur_id: number } | undefined
    return d ? d.accompagnateur_id : null
  }
  return findAccompagnateurFor(meId)
}

router.get('/disponibles', requireAuth, requireRole('accompagne'), (req: Request, res: Response) => {
  const me = getUser(req)
  const dossierId = req.query.dossierId ? Number(req.query.dossierId) : null
  const accId = targetAccompagnateur(me.id, dossierId)
  if (!accId) { res.json({ creneaux: [] }); return }
  const creneaux = db
    .prepare('SELECT id, debut, fin FROM creneaux WHERE accompagnateur_id=? AND reserve=0 AND debut > ? ORDER BY debut')
    .all(accId, new Date().toISOString())
  res.json({ creneaux })
})

router.post('/reserver', requireAuth, requireRole('accompagne'), async (req: Request, res: Response) => {
  const me = getUser(req)
  const creneauId = Number(req.body?.creneauId)
  const dossierIdIn = req.body?.dossierId ? Number(req.body.dossierId) : null
  const c = db.prepare('SELECT id, accompagnateur_id, debut, reserve FROM creneaux WHERE id=?').get(creneauId) as
    | { id: number; accompagnateur_id: number; debut: string; reserve: number } | undefined
  if (!c || c.reserve) { res.status(409).json({ error: 'Créneau indisponible' }); return }
  // On exige un parcours de l'accompagné avec CET accompagnateur (sécurité + rattachement du RDV)
  const dossier = dossierIdIn
    ? db.prepare('SELECT id FROM dossiers WHERE id=? AND accompagne_id=? AND accompagnateur_id=?').get(dossierIdIn, me.id, c.accompagnateur_id) as { id: number } | undefined
    : db.prepare('SELECT id FROM dossiers WHERE accompagne_id=? AND accompagnateur_id=? ORDER BY id LIMIT 1').get(me.id, c.accompagnateur_id) as { id: number } | undefined
  if (!dossier) { res.status(409).json({ error: 'Créneau indisponible pour ce parcours' }); return }

  db.transaction(() => {
    db.prepare('UPDATE creneaux SET reserve=1 WHERE id=?').run(creneauId)
    db.prepare('INSERT INTO rdv (creneau_id, accompagne_id, dossier_id) VALUES (?, ?, ?)').run(creneauId, me.id, dossier.id)
    db.prepare('INSERT INTO notifications (user_id, texte) VALUES (?, ?)').run(c.accompagnateur_id, `Nouveau rendez-vous réservé le ${formatFr(c.debut)}.`)
    db.prepare('INSERT INTO notifications (user_id, texte) VALUES (?, ?)').run(me.id, `Votre rendez-vous du ${formatFr(c.debut)} est confirmé.`)
    db.prepare("UPDATE demandes_rdv SET statut='satisfaite' WHERE dossier_id=? AND statut='en_attente'").run(dossier.id)
  })()

  const acc = db.prepare('SELECT email FROM users WHERE id=?').get(c.accompagnateur_id) as { email: string } | undefined
  await sendEmail(me.email, 'Boussole — rendez-vous confirmé', `<p>Votre rendez-vous est confirmé le <strong>${formatFr(c.debut)}</strong>.</p>`)
  if (acc) await sendEmail(acc.email, 'Boussole — nouveau rendez-vous', `<p>${me.email} a réservé un rendez-vous le <strong>${formatFr(c.debut)}</strong>.</p>`)
  res.json({ ok: true })
})

// Demander un rendez-vous quand aucun créneau n'est disponible
router.post('/demander', requireAuth, requireRole('accompagne'), async (req: Request, res: Response) => {
  const me = getUser(req)
  const dossierId = Number(req.body?.dossierId)
  const d = db.prepare('SELECT id, accompagnateur_id FROM dossiers WHERE id=? AND accompagne_id=?').get(dossierId, me.id) as { id: number; accompagnateur_id: number } | undefined
  if (!d) { res.status(404).json({ error: 'Parcours introuvable' }); return }
  const exists = db.prepare("SELECT id FROM demandes_rdv WHERE dossier_id=? AND statut='en_attente'").get(dossierId)
  if (!exists) db.prepare('INSERT INTO demandes_rdv (dossier_id, accompagne_id, accompagnateur_id) VALUES (?,?,?)').run(dossierId, me.id, d.accompagnateur_id)
  const moi = db.prepare('SELECT prenom, email FROM users WHERE id=?').get(me.id) as { prenom: string | null; email: string }
  const qui = moi.prenom || moi.email
  db.prepare('INSERT INTO notifications (user_id, texte) VALUES (?, ?)').run(d.accompagnateur_id, `${qui} demande un rendez-vous (aucun créneau disponible).`)
  const acc = db.prepare('SELECT email FROM users WHERE id=?').get(d.accompagnateur_id) as { email: string } | undefined
  if (acc) await sendEmail(acc.email, 'Boussole — demande de rendez-vous', `<p><strong>${qui}</strong> souhaite un rendez-vous mais aucun créneau n’est disponible. Ajoutez des créneaux dans Boussole : l’accompagné sera notifié automatiquement.</p>`)
  res.json({ ok: true })
})

router.get('/mine', requireAuth, requireRole('accompagne'), (req: Request, res: Response) => {
  const me = getUser(req)
  const rdv = db
    .prepare(
      `SELECT r.id, c.debut, c.fin, r.statut
       FROM rdv r JOIN creneaux c ON c.id = r.creneau_id
       WHERE r.accompagne_id=?
       ORDER BY c.debut`,
    )
    .all(me.id)
  res.json({ rdv })
})

// === Export iCalendar (.ics) d'un rendez-vous ===
function icsStamp(iso: string): string {
  const m = String(iso).match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/)
  return m ? `${m[1]}${m[2]}${m[3]}T${m[4]}${m[5]}${m[6] || '00'}` : ''
}
function icsEscape(s: string): string {
  return String(s || '').replace(/([\\,;])/g, '\\$1').replace(/\r?\n/g, '\\n')
}
function icsNowUtc(): string {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

router.get('/:id/ics', requireAuth, (req: Request, res: Response) => {
  const me = getUser(req)
  const id = Number(req.params.id)
  const r = db
    .prepare(
      `SELECT r.id, r.statut, r.accompagne_id, c.debut, c.fin, c.accompagnateur_id,
              ua.prenom AS acc_prenom, ua.email AS acc_email
       FROM rdv r JOIN creneaux c ON c.id=r.creneau_id JOIN users ua ON ua.id=c.accompagnateur_id
       WHERE r.id=?`,
    )
    .get(id) as
    | { id: number; statut: string; accompagne_id: number; debut: string; fin: string; accompagnateur_id: number; acc_prenom: string | null; acc_email: string }
    | undefined
  if (!r) {
    res.status(404).json({ error: 'Rendez-vous introuvable' })
    return
  }
  const allowed =
    (me.role === 'accompagne' && r.accompagne_id === me.id) ||
    (me.role === 'accompagnateur' && r.accompagnateur_id === me.id)
  if (!allowed) {
    res.status(403).json({ error: 'Accès refusé' })
    return
  }
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Boussole//Accompagnement//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:boussole-rdv-${r.id}@boussole.elafrit.com`,
    `DTSTAMP:${icsNowUtc()}`,
    `DTSTART:${icsStamp(r.debut)}`,
    `DTEND:${icsStamp(r.fin)}`,
    `SUMMARY:${icsEscape('Rendez-vous d’accompagnement — Boussole')}`,
    `DESCRIPTION:${icsEscape(`Accompagnement avec ${r.acc_prenom || r.acc_email}. Statut : ${r.statut}.`)}`,
    'END:VEVENT', 'END:VCALENDAR', '',
  ].join('\r\n')
  res.setHeader('Content-Disposition', `attachment; filename="rdv-boussole-${id}.ics"`)
  res.type('text/calendar')
  res.send(ics)
})

export default router
