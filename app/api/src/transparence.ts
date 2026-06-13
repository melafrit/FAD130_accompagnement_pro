import { Router, type Request, type Response } from 'express'
import { db } from './db'
import { requireAuth, requireRole } from './auth'
import { requireFeature } from './features'

// Transparence / RGPD (côté accompagné) : « voici tes données, ce que l'IA a vu et produit »,
// les sous-traitants, et une demande d'effacement (envoyée à l'accompagnateur, pas une suppression brutale).
const router = Router()
interface U { id: number; role: string }
const getUser = (req: Request) => (req as Request & { user?: U }).user as U
function ownDossier(accompagneId: number, dossierId: number) {
  return db.prepare('SELECT id, accompagnateur_id FROM dossiers WHERE id=? AND accompagne_id=?').get(dossierId, accompagneId) as { id: number; accompagnateur_id: number } | undefined
}
const count = (sql: string, ...args: unknown[]) => (db.prepare(sql).get(...args) as { n: number }).n

router.get('/dossier/:id', requireAuth, requireRole('accompagne'), requireFeature('transparence'), (req: Request, res: Response) => {
  const me = getUser(req)
  const id = Number(req.params.id)
  if (!ownDossier(me.id, id)) { res.status(404).json({ error: 'Parcours introuvable' }); return }
  const donnees = {
    questionnaire: count('SELECT COUNT(*) n FROM questionnaires_initiaux WHERE dossier_id=?', id),
    rdvs: count('SELECT COUNT(*) n FROM rdv r JOIN creneaux c ON c.id=r.creneau_id WHERE r.dossier_id=?', id),
    comptes_rendus_publies: count("SELECT COUNT(*) n FROM comptes_rendus cr JOIN sessions s ON s.id=cr.session_id WHERE s.dossier_id=? AND cr.publie=1", id),
    syntheses_publiees: count("SELECT COUNT(*) n FROM syntheses WHERE dossier_id=? AND publie=1", id),
    actions: count('SELECT COUNT(*) n FROM actions WHERE dossier_id=?', id),
    meteo: count("SELECT COUNT(*) n FROM meteo_humeur WHERE dossier_id=? AND role='accompagne'", id),
    journal: count('SELECT COUNT(*) n FROM journal_entrees WHERE dossier_id=? AND accompagne_id=?', id, me.id),
  }
  const ia = {
    comptes_rendus_generes: count("SELECT COUNT(*) n FROM comptes_rendus cr JOIN sessions s ON s.id=cr.session_id WHERE s.dossier_id=? AND cr.source='ia'", id),
    synthese_generee: count("SELECT COUNT(*) n FROM syntheses WHERE dossier_id=? AND source='ia'", id) > 0,
    fil_rouge_partage: count("SELECT COUNT(*) n FROM emergence WHERE dossier_id=? AND type='fil_rouge' AND partage=1", id) > 0,
    moments_partages: count('SELECT COUNT(*) n FROM moments_cles WHERE dossier_id=? AND partage=1', id),
  }
  const dejaDemande = count("SELECT COUNT(*) n FROM demandes_effacement WHERE dossier_id=? AND accompagne_id=? AND statut='en_attente'", id, me.id) > 0
  res.json({
    donnees, ia,
    ce_que_voit_lia: "L'IA reçoit le texte de ton questionnaire, des entretiens et des notes partagées pour générer des comptes rendus, une synthèse et des suggestions. Aucun enregistrement audio n'est conservé.",
    soustraitants: [
      { nom: 'Anthropic (Claude)', role: 'Génération de texte par IA (comptes rendus, synthèse, suggestions)' },
      { nom: 'Brevo', role: 'Envoi des emails (activation, notifications)' },
    ],
    demande_effacement_en_cours: dejaDemande,
  })
})

router.post('/effacement', requireAuth, requireRole('accompagne'), requireFeature('transparence'), (req: Request, res: Response) => {
  const me = getUser(req)
  const dossierId = Number(req.body?.dossierId)
  const d = ownDossier(me.id, dossierId)
  if (!d) { res.status(404).json({ error: 'Parcours introuvable' }); return }
  const motif = req.body?.motif != null ? String(req.body.motif).slice(0, 500).trim() || null : null
  const prenom = (db.prepare('SELECT prenom, email FROM users WHERE id=?').get(me.id) as { prenom: string | null; email: string }).prenom || 'Un accompagné'
  db.transaction(() => {
    db.prepare('INSERT INTO demandes_effacement (dossier_id, accompagne_id, motif) VALUES (?,?,?)').run(dossierId, me.id, motif)
    const txt = `${prenom} a demandé l'effacement de ses données sur un parcours.${motif ? ' Motif : ' + motif : ''}`
    db.prepare('INSERT INTO notifications (user_id, texte) VALUES (?, ?)').run(d.accompagnateur_id, txt)
    const admins = db.prepare("SELECT id FROM users WHERE role='admin'").all() as { id: number }[]
    admins.forEach((a) => db.prepare('INSERT INTO notifications (user_id, texte) VALUES (?, ?)').run(a.id, txt))
  })()
  res.status(201).json({ ok: true })
})

export default router
