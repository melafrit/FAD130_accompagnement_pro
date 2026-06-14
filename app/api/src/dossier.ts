import { Router, type Request, type Response } from 'express'
import { db } from './db'
import { requireAuth, requireRole } from './auth'
import { sendEmail } from './mailer'

const router = Router()
interface U { id: number; role: string }
function getUser(req: Request): U {
  return (req as Request & { user?: U }).user as U
}
function owns(accId: number, dossierId: number): { accompagne_id: number } | undefined {
  return db.prepare('SELECT accompagne_id FROM dossiers WHERE id=? AND accompagnateur_id=?').get(dossierId, accId) as
    | { accompagne_id: number }
    | undefined
}

// === Accompagné : parcours multiples (déclaré AVANT /:id pour la priorité de route) ===
// Liste des accompagnateurs disponibles (pour choisir au démarrage d'un parcours)
router.get('/accompagnateurs', requireAuth, requireRole('accompagne'), (_req: Request, res: Response) => {
  const accompagnateurs = db.prepare("SELECT id, prenom, nom, email FROM users WHERE role='accompagnateur' AND actif=1 ORDER BY prenom, email").all()
  res.json({ accompagnateurs })
})

// Démarrer un nouveau parcours (titre + accompagnateur choisi)
router.post('/start', requireAuth, requireRole('accompagne'), async (req: Request, res: Response) => {
  const me = getUser(req)
  const titre = String(req.body?.titre ?? '').trim()
  const accompagnateurId = Number(req.body?.accompagnateurId)
  if (!titre) { res.status(400).json({ error: 'Donne un titre à ton parcours.' }); return }
  const acc = db.prepare("SELECT id, email, prenom FROM users WHERE id=? AND role='accompagnateur' AND actif=1").get(accompagnateurId) as { id: number; email: string; prenom: string | null } | undefined
  if (!acc) { res.status(400).json({ error: 'Choisis un accompagnateur valide.' }); return }
  db.prepare('INSERT OR IGNORE INTO liens_accompagnement (accompagnateur_id, accompagne_id) VALUES (?, ?)').run(acc.id, me.id)
  const info = db.prepare('INSERT INTO dossiers (accompagne_id, accompagnateur_id, titre) VALUES (?, ?, ?)').run(me.id, acc.id, titre)
  const dossierId = Number(info.lastInsertRowid)
  const moi = db.prepare('SELECT prenom, email FROM users WHERE id=?').get(me.id) as { prenom: string | null; email: string }
  const qui = moi.prenom || moi.email
  db.prepare('INSERT INTO notifications (user_id, texte) VALUES (?, ?)').run(acc.id, `Nouveau parcours « ${titre} » démarré par ${qui}.`)
  await sendEmail(acc.email, 'Boussole — nouveau parcours d’accompagnement', `<p><strong>${qui}</strong> a démarré un nouveau parcours d’accompagnement : <strong>${titre}</strong>.</p><p>Connectez-vous à Boussole pour le suivre.</p>`)
  res.status(201).json({ dossierId })
})

// Liste des parcours de l'accompagné
router.get('/mine', requireAuth, requireRole('accompagne'), (req: Request, res: Response) => {
  const me = getUser(req)
  const dossiers = db.prepare(
    `SELECT d.id, d.titre, d.statut, d.cree_le,
            ua.prenom AS acc_prenom, ua.nom AS acc_nom, ua.email AS acc_email,
            (SELECT COUNT(*) FROM questionnaires_initiaux q WHERE q.dossier_id=d.id) AS has_questionnaire,
            (SELECT COUNT(*) FROM syntheses s WHERE s.dossier_id=d.id AND s.publie=1) AS synthese_publiee,
            (SELECT COUNT(*) FROM comptes_rendus cr JOIN sessions se ON se.id=cr.session_id WHERE se.dossier_id=d.id AND cr.publie=1) AS nb_cr,
            (SELECT COUNT(*) FROM rdv r JOIN creneaux c ON c.id=r.creneau_id WHERE r.dossier_id=d.id) AS nb_rdv
     FROM dossiers d JOIN users ua ON ua.id=d.accompagnateur_id
     WHERE d.accompagne_id=? ORDER BY d.cree_le DESC`,
  ).all(me.id)
  res.json({ dossiers })
})

// Détail d'un parcours pour l'accompagné (lecture seule)
router.get('/mine/:id', requireAuth, requireRole('accompagne'), (req: Request, res: Response) => {
  const me = getUser(req)
  const id = Number(req.params.id)
  const dossier = db.prepare(
    `SELECT d.id, d.titre, d.statut, d.cree_le, d.accompagnateur_id,
            ua.prenom AS acc_prenom, ua.nom AS acc_nom, ua.email AS acc_email
     FROM dossiers d JOIN users ua ON ua.id=d.accompagnateur_id
     WHERE d.id=? AND d.accompagne_id=?`,
  ).get(id, me.id)
  if (!dossier) { res.status(404).json({ error: 'Parcours introuvable' }); return }
  const questionnaire = db.prepare('SELECT cr_recap, contenu, complete_le FROM questionnaires_initiaux WHERE dossier_id=? ORDER BY id DESC LIMIT 1').get(id) || null
  const crs = db.prepare(
    `SELECT cr.id, cr.session_id, cr.publie_le, s.date AS entretien_date
     FROM comptes_rendus cr JOIN sessions s ON s.id=cr.session_id
     WHERE s.dossier_id=? AND cr.publie=1 ORDER BY cr.publie_le DESC`,
  ).all(id)
  const synthese_publiee = !!db.prepare('SELECT id FROM syntheses WHERE dossier_id=? AND publie=1 LIMIT 1').get(id)
  const prog = db.prepare("SELECT MAX(CAST(phase_atteinte AS INTEGER)) AS pmax, COUNT(*) AS n FROM sessions WHERE dossier_id=?").get(id) as { pmax: number | null; n: number }
  const actions = db.prepare('SELECT id, libelle, echeance, critere, details, priorite, statut, rappel_le, cree_le, ordre FROM actions WHERE dossier_id=? ORDER BY ordre ASC, id ASC').all(id)
  const rdvs = db.prepare('SELECT r.id, c.debut, c.fin, r.statut FROM rdv r JOIN creneaux c ON c.id=r.creneau_id WHERE r.dossier_id=? ORDER BY c.debut').all(id)
  res.json({ dossier, questionnaire, crs, synthese_publiee, phase_max: prog.pmax, nb_entretiens: prog.n, actions, rdvs })
})

// Détail complet d'un dossier (le « parcours »)
router.get('/:id', requireAuth, requireRole('accompagnateur'), (req: Request, res: Response) => {
  const me = getUser(req)
  const id = Number(req.params.id)
  if (!owns(me.id, id)) {
    res.status(404).json({ error: 'Dossier introuvable' })
    return
  }
  const dossier = db
    .prepare(
      `SELECT d.id, d.titre, d.contexte, d.statut, d.synthese, d.cree_le,
              u.prenom AS accompagne_prenom, u.email AS accompagne_email
       FROM dossiers d JOIN users u ON u.id = d.accompagne_id WHERE d.id=?`,
    )
    .get(id)
  const questionnaire = db.prepare('SELECT cr_recap, contenu, complete_le FROM questionnaires_initiaux WHERE dossier_id=? ORDER BY id DESC LIMIT 1').get(id) || null
  const sessions = db.prepare('SELECT id, date, phase_atteinte, statut FROM sessions WHERE dossier_id=? ORDER BY date').all(id) as { id: number }[]
  const sessionsAvecCR = sessions.map((s) => ({
    ...s,
    crs: db.prepare('SELECT id, version, genere_le, publie FROM comptes_rendus WHERE session_id=? ORDER BY version DESC').all(s.id),
  }))
  const actions = db
    .prepare('SELECT id, libelle, echeance, critere, details, priorite, statut, rappel_le, cree_le, ordre FROM actions WHERE dossier_id=? ORDER BY ordre ASC, id ASC')
    .all(id)
  // Isolation multi-parcours : on ne remonte QUE les RDV rattachés à CE dossier (et non
  // tous les RDV de l'accompagné, qui peuvent concerner d'autres parcours/accompagnateurs).
  const rdvs = db
    .prepare(
      `SELECT r.id, c.debut, c.fin, r.statut FROM rdv r JOIN creneaux c ON c.id=r.creneau_id
       WHERE r.dossier_id=? ORDER BY c.debut`,
    )
    .all(id)
  const synthese_publiee = !!db.prepare('SELECT id FROM syntheses WHERE dossier_id=? AND publie=1 LIMIT 1').get(id)
  res.json({ dossier, questionnaire, sessions: sessionsAvecCR, synthese_publiee, actions, rdvs })
})

// Synthèse complète du parcours (JSON, rendue à l'écran par SyntheseModal)
router.get('/:id/synthese', requireAuth, requireRole('accompagnateur'), (req: Request, res: Response) => {
  const me = getUser(req)
  const id = Number(req.params.id)
  const owned = owns(me.id, id)
  if (!owned) {
    res.status(404).json({ error: 'Dossier introuvable' })
    return
  }
  const dossier = db
    .prepare(
      `SELECT d.titre, d.contexte, d.statut, d.synthese, d.cree_le, u.prenom AS accompagne_prenom, u.email AS accompagne_email
       FROM dossiers d JOIN users u ON u.id=d.accompagne_id WHERE d.id=?`,
    )
    .get(id) as {
    titre: string | null; contexte: string | null; statut: string; synthese: string | null
    cree_le: string; accompagne_prenom: string | null; accompagne_email: string
  }
  const q = db
    .prepare('SELECT cr_recap, complete_le FROM questionnaires_initiaux WHERE dossier_id=? AND cr_recap IS NOT NULL ORDER BY id DESC LIMIT 1')
    .get(id) as { cr_recap: string; complete_le: string | null } | undefined
  const sessions = db
    .prepare('SELECT id, date, phase_atteinte, statut FROM sessions WHERE dossier_id=? ORDER BY date')
    .all(id) as { id: number; date: string; phase_atteinte: string | null; statut: string }[]
  const entretiens = sessions.map((s) => ({
    date: s.date,
    phase_atteinte: s.phase_atteinte,
    statut: s.statut,
    reponses: (
      db.prepare('SELECT phase, texte_reponse FROM reponses WHERE session_id=? ORDER BY id').all(s.id) as { phase: string; texte_reponse: string }[]
    ).map((r) => ({ phase: r.phase, texte: r.texte_reponse })),
  }))
  const actions = db
    .prepare('SELECT libelle, echeance, critere, statut FROM actions WHERE dossier_id=? ORDER BY ordre ASC, id ASC')
    .all(id) as { libelle: string; echeance: string | null; critere: string | null; statut: string }[]
  // Isolation multi-parcours : RDV de CE dossier uniquement (et non tous ceux de l'accompagné).
  const rdvs = db
    .prepare('SELECT c.debut, c.fin, r.statut FROM rdv r JOIN creneaux c ON c.id=r.creneau_id WHERE r.dossier_id=? ORDER BY c.debut')
    .all(id) as { debut: string; fin: string; statut: string }[]

  res.json({
    titre: dossier.titre || 'Dossier d’accompagnement',
    accompagne: dossier.accompagne_prenom || dossier.accompagne_email,
    statut: dossier.statut,
    creeLe: dossier.cree_le,
    editeLe: new Date().toISOString(),
    contexte: dossier.contexte || '—',
    questionnaire: q ? { cr_recap: q.cr_recap, complete_le: q.complete_le } : null,
    entretiens,
    actions,
    rdvs,
    synthese: dossier.synthese,
  })
})

// Clôturer la démarche (avec synthèse finale optionnelle)
router.post('/:id/cloturer', requireAuth, requireRole('accompagnateur'), (req: Request, res: Response) => {
  const me = getUser(req)
  const id = Number(req.params.id)
  if (!owns(me.id, id)) {
    res.status(404).json({ error: 'Dossier introuvable' })
    return
  }
  const synthese = req.body?.synthese != null ? String(req.body.synthese) : null
  db.prepare("UPDATE dossiers SET statut='cloture', synthese=? WHERE id=?").run(synthese, id)
  const acc = owns(me.id, id)!.accompagne_id
  db.prepare('INSERT INTO notifications (user_id, texte) VALUES (?, ?)').run(acc, 'Votre accompagnement a été clôturé. Merci pour ce parcours !')
  res.json({ ok: true })
})

// Rouvrir un dossier clôturé
router.post('/:id/rouvrir', requireAuth, requireRole('accompagnateur'), (req: Request, res: Response) => {
  const me = getUser(req)
  const id = Number(req.params.id)
  if (!owns(me.id, id)) {
    res.status(404).json({ error: 'Dossier introuvable' })
    return
  }
  db.prepare("UPDATE dossiers SET statut='en_cours' WHERE id=?").run(id)
  res.json({ ok: true })
})

export default router
