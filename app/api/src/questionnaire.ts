import { Router, type Request, type Response } from 'express'
import { db } from './db'
import { requireAuth } from './auth'
import { questionnaireNext, type QA } from './claude'

const router = Router()

interface AuthedUser { id: number; role: string }
function getUser(req: Request): AuthedUser {
  return (req as Request & { user?: AuthedUser }).user as AuthedUser
}

// Étape suivante du questionnaire (Claude ou parcours de secours)
router.post('/next', requireAuth, async (req: Request, res: Response) => {
  const history: QA[] = Array.isArray(req.body?.history) ? req.body.history : []
  try {
    res.json(await questionnaireNext(history))
  } catch {
    res.status(500).json({ error: 'Erreur lors de la génération de la question' })
  }
})

// Enregistrement du questionnaire complété (crée le dossier + notifie l'accompagnateur)
router.post('/save', requireAuth, (req: Request, res: Response) => {
  const user = getUser(req)
  if (user.role !== 'accompagne') {
    res.status(403).json({ error: 'Réservé aux personnes accompagnées' })
    return
  }
  const history = req.body?.history ?? []
  const recapitulatif: string | null = req.body?.recapitulatif ?? null
  const dossierIdIn = req.body?.dossierId ? Number(req.body.dossierId) : null

  let dossierId: number
  let accompagnateurId: number
  if (dossierIdIn) {
    // Questionnaire d'un parcours précis (multi-parcours)
    const d = db.prepare('SELECT id, accompagnateur_id FROM dossiers WHERE id=? AND accompagne_id=?').get(dossierIdIn, user.id) as { id: number; accompagnateur_id: number } | undefined
    if (!d) { res.status(404).json({ error: 'Parcours introuvable' }); return }
    dossierId = d.id
    accompagnateurId = d.accompagnateur_id
  } else {
    // Rétro-compatibilité : crée (ou réutilise) un dossier auto-assigné
    const acc = db.prepare("SELECT id FROM users WHERE role='accompagnateur' AND actif=1 ORDER BY id LIMIT 1").get() as { id: number } | undefined
    if (!acc) { res.status(400).json({ error: 'Aucun accompagnateur disponible' }); return }
    db.prepare('INSERT OR IGNORE INTO liens_accompagnement (accompagnateur_id, accompagne_id) VALUES (?, ?)').run(acc.id, user.id)
    let dossier = db.prepare('SELECT id FROM dossiers WHERE accompagne_id=? AND accompagnateur_id=? ORDER BY id LIMIT 1').get(user.id, acc.id) as { id: number } | undefined
    if (!dossier) {
      const info = db.prepare('INSERT INTO dossiers (accompagne_id, accompagnateur_id, titre) VALUES (?, ?, ?)').run(user.id, acc.id, 'Accompagnement mémoire')
      dossier = { id: Number(info.lastInsertRowid) }
    }
    dossierId = dossier.id
    accompagnateurId = acc.id
  }
  db.prepare("INSERT INTO questionnaires_initiaux (dossier_id, contenu, cr_recap, complete_le) VALUES (?, ?, ?, datetime('now'))")
    .run(dossierId, JSON.stringify(history), recapitulatif)
  db.prepare('INSERT INTO notifications (user_id, texte) VALUES (?, ?)').run(accompagnateurId, 'Un accompagné a complété son questionnaire initial.')
  res.json({ ok: true, dossierId })
})

export default router
