import { Router, type Request, type Response } from 'express'
import { db } from './db'
import { requireAuth, requireRole } from './auth'
import { construireSyntheseDocx } from './compteRendu'

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
  const questionnaire = db.prepare('SELECT cr_recap, complete_le FROM questionnaires_initiaux WHERE dossier_id=? ORDER BY id DESC LIMIT 1').get(id) || null
  const sessions = db.prepare('SELECT id, date, phase_atteinte, statut FROM sessions WHERE dossier_id=? ORDER BY date').all(id) as { id: number }[]
  const sessionsAvecCR = sessions.map((s) => ({
    ...s,
    crs: db.prepare('SELECT id, version, genere_le, publie FROM comptes_rendus WHERE session_id=? ORDER BY version DESC').all(s.id),
  }))
  const actions = db.prepare('SELECT id, libelle, echeance, critere, statut FROM actions WHERE dossier_id=? ORDER BY id DESC').all(id)
  const acc = owns(me.id, id)!.accompagne_id
  const rdvs = db
    .prepare(
      `SELECT r.id, c.debut, c.fin, r.statut FROM rdv r JOIN creneaux c ON c.id=r.creneau_id
       WHERE r.accompagne_id=? ORDER BY c.debut`,
    )
    .all(acc)
  res.json({ dossier, questionnaire, sessions: sessionsAvecCR, actions, rdvs })
})

// Exporter la synthèse complète du parcours (.docx)
router.get('/:id/synthese.docx', requireAuth, requireRole('accompagnateur'), async (req: Request, res: Response) => {
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
    .prepare('SELECT libelle, echeance, critere, statut FROM actions WHERE dossier_id=? ORDER BY id')
    .all(id) as { libelle: string; echeance: string | null; critere: string | null; statut: string }[]
  const rdvs = db
    .prepare('SELECT c.debut, c.fin, r.statut FROM rdv r JOIN creneaux c ON c.id=r.creneau_id WHERE r.accompagne_id=? ORDER BY c.debut')
    .all(owned.accompagne_id) as { debut: string; fin: string; statut: string }[]

  const buf = await construireSyntheseDocx({
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
  res.setHeader('Content-Disposition', `attachment; filename="synthese-dossier-${id}.docx"`)
  res.type('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
  res.send(buf)
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
