import { Router, type Request, type Response } from 'express'
import { db } from './db'
import { requireAuth } from './auth'
import { requireFeature } from './features'

// Éthique & admin :
//  - Helpers RGPD partagés (anonymisation / suppression) utilisés par la console admin
//  - Rétention automatique des données
//  - Attestation de fin d'accompagnement (gérée par la fonctionnalité 'attestation')
const router = Router()
interface U { id: number; role: string }
const getUser = (req: Request) => (req as Request & { user?: U }).user as U
const RETENTION_MONTHS = Number(process.env.RETENTION_MONTHS) || 36

// --- Anonymisation : on conserve les parcours (anonymisés) mais on efface l'identité ---
export function anonymizeUser(userId: number): void {
  const u = db.prepare('SELECT id, role FROM users WHERE id=?').get(userId) as { id: number; role: string } | undefined
  if (!u) return
  db.transaction(() => {
    db.prepare("UPDATE users SET email=?, nom=NULL, prenom=NULL, password_hash=NULL, actif=0, anonymise=1 WHERE id=?")
      .run(`anonyme-${userId}@boussole.local`, userId)
    db.prepare('DELETE FROM push_subscriptions WHERE user_id=?').run(userId)
    db.prepare('DELETE FROM tokens WHERE user_id=?').run(userId)
    // Efface les contenus en texte libre rédigés par la personne (journal, météo, émotions)
    db.prepare('DELETE FROM journal_entrees WHERE accompagne_id=?').run(userId)
    db.prepare("UPDATE meteo_humeur SET mot=NULL WHERE auteur_id=?").run(userId)
    db.prepare("UPDATE emotions_roue SET note=NULL WHERE auteur_id=?").run(userId)
  })()
}

// --- Suppression : retrait complet du compte et de ses données (cascade) ---
export function deleteUser(userId: number): void {
  db.prepare('DELETE FROM users WHERE id=?').run(userId)
}

// --- Traitement d'une demande d'effacement (par l'admin) ---
export function processEffacement(demandeId: number, action: 'anonymiser' | 'supprimer'): boolean {
  const dem = db.prepare('SELECT id, accompagne_id, statut FROM demandes_effacement WHERE id=?').get(demandeId) as
    { id: number; accompagne_id: number; statut: string } | undefined
  if (!dem) return false
  if (action === 'supprimer') deleteUser(dem.accompagne_id)
  else anonymizeUser(dem.accompagne_id)
  // Si le compte est supprimé, la demande part en cascade ; sinon on la marque traitée.
  if (action === 'anonymiser') db.prepare("UPDATE demandes_effacement SET statut='traitee', action=?, traite_le=datetime('now') WHERE id=?").run(action, demandeId)
  return true
}

// --- Rétention : comptes accompagnés dont TOUS les parcours sont clôturés et inactifs au-delà du seuil ---
export function retentionEligibles(months: number = RETENTION_MONTHS): { id: number; email: string; derniere_activite: string | null }[] {
  return db.prepare(
    `SELECT * FROM (
       SELECT u.id AS id, u.email AS email,
              (SELECT MAX(x) FROM (
                 SELECT MAX(s.date) AS x FROM sessions s JOIN dossiers d2 ON d2.id=s.dossier_id WHERE d2.accompagne_id=u.id
                 UNION ALL SELECT MAX(d3.cree_le) FROM dossiers d3 WHERE d3.accompagne_id=u.id
              )) AS derniere_activite
       FROM users u
       WHERE u.role='accompagne' AND u.anonymise=0
         AND EXISTS (SELECT 1 FROM dossiers d WHERE d.accompagne_id=u.id)
         AND NOT EXISTS (SELECT 1 FROM dossiers d WHERE d.accompagne_id=u.id AND d.statut!='cloture')
     )
     WHERE derniere_activite IS NOT NULL AND derniere_activite < datetime('now', ?)`,
  ).all(`-${months} months`) as { id: number; email: string; derniere_activite: string | null }[]
}

// Balayage périodique (actif seulement si RETENTION_AUTO=1) : anonymise les comptes éligibles.
export function sweepRetention(): void {
  if (process.env.RETENTION_AUTO !== '1') return
  for (const u of retentionEligibles()) anonymizeUser(u.id)
}

// ====================================================================================
//  Attestation de fin d'accompagnement (accompagné ou accompagnateur du dossier clôturé)
// ====================================================================================
router.get('/attestation/dossier/:id', requireAuth, requireFeature('attestation'), (req: Request, res: Response) => {
  const me = getUser(req)
  const id = Number(req.params.id)
  const d = db.prepare(
    `SELECT d.id, d.titre, d.statut, d.cree_le,
            ac.prenom AS ac_prenom, ac.nom AS ac_nom, ac.email AS ac_email,
            an.prenom AS an_prenom, an.nom AS an_nom, an.email AS an_email
     FROM dossiers d
     JOIN users ac ON ac.id=d.accompagnateur_id
     JOIN users an ON an.id=d.accompagne_id
     WHERE d.id=? AND (d.accompagne_id=? OR d.accompagnateur_id=?)`,
  ).get(id, me.id, me.id) as
    | { id: number; titre: string | null; statut: string; cree_le: string; ac_prenom: string | null; ac_nom: string | null; ac_email: string; an_prenom: string | null; an_nom: string | null; an_email: string }
    | undefined
  if (!d) { res.status(404).json({ error: 'Parcours introuvable' }); return }
  if (d.statut !== 'cloture') { res.status(400).json({ error: 'L’attestation n’est disponible qu’une fois le parcours clôturé.' }); return }
  const nbEntretiens = (db.prepare('SELECT COUNT(*) n FROM sessions WHERE dossier_id=?').get(id) as { n: number }).n
  const nbCr = (db.prepare("SELECT COUNT(*) n FROM comptes_rendus cr JOIN sessions s ON s.id=cr.session_id WHERE s.dossier_id=? AND cr.publie=1").get(id) as { n: number }).n
  const fin = (db.prepare("SELECT MAX(publie_le) m FROM syntheses WHERE dossier_id=? AND publie=1").get(id) as { m: string | null }).m
  res.json({
    titre: d.titre,
    accompagne: [d.an_prenom, d.an_nom].filter(Boolean).join(' ') || d.an_email,
    accompagnateur: [d.ac_prenom, d.ac_nom].filter(Boolean).join(' ') || d.ac_email,
    debut: d.cree_le, fin: fin || null, nb_entretiens: nbEntretiens, nb_comptes_rendus: nbCr,
  })
})

export default router
