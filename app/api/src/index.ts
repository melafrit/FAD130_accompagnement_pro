import './env'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { db } from './db'
import authRouter from './auth'
import questionnaireRouter from './questionnaire'
import rdvRouter from './rdv'
import entretienRouter from './entretien'
import crRouter from './cr'
import notificationsRouter, { sweepDueReminders } from './notifications'
import actionsRouter from './actions'
import tagsRouter from './tags'
import adminRouter from './admin'
import dossierRouter from './dossier'
import autoevalRouter from './autoeval'
import syntheseRouter from './synthese'
import miroirRouter from './miroir'
import relationnelRouter from './relationnel'
import emergenceRouter from './emergence'
import transparenceRouter from './transparence'
import pilotageRouter, { sweepSignauxAlertes, sweepDigestsHebdo } from './pilotage'
import reflexiviteRouter from './reflexivite'
import collaborationRouter from './collaboration'
import visualisationRouter from './visualisation'
import confortRouter from './confort'
import ethiqueRouter, { sweepRetention } from './ethique'
import adoptionRouter from './adoption'
import wikiRouter, { seedWiki, publicWikiRouter } from './wiki'
import { globalLimiter, authLimiter, helmetConfig } from './security'
import { scheduleBackups } from './backups'
import { seed } from './seed'

const app = express()
app.use(helmet(helmetConfig))
app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())
app.use(globalLimiter) // garde-fou global anti-abus (désactivé si RATE_LIMIT_DISABLED=1)

// Authentification (limiteur strict anti brute-force sur login/inscription/réinitialisation)
app.use('/api/auth', authLimiter, authRouter)

// Questionnaire initial (Claude)
app.use('/api/questionnaire', questionnaireRouter)

// Rendez-vous (créneaux & réservation)
app.use('/api/rdv', rdvRouter)

// Entretien guidé (6 phases + suggestions IA)
app.use('/api/entretien', entretienRouter)

// Comptes rendus (génération IA en HTML, versions, publication, discussion, notes privées)
app.use('/api/cr', crRouter)

// Notifications & plan d'action
app.use('/api/notifications', notificationsRouter)
app.use('/api/actions', actionsRouter)

// Étiquettes (tags) sur les dossiers
app.use('/api/tags', tagsRouter)

// Administration (gestion des comptes)
app.use('/api/admin', adminRouter)

// Dossier / parcours (détail, clôture)
app.use('/api/dossiers', dossierRouter)

// Auto-évaluation de la pratique (grille interactive, IA, export)
app.use('/api/autoeval', autoevalRouter)

// Synthèse du parcours (document HTML IA, versions, publication, discussion)
app.use('/api/synthese', syntheseRouter)
app.use('/api/miroir', miroirRouter)
app.use('/api/relationnel', relationnelRouter)
app.use('/api/emergence', emergenceRouter)
app.use('/api/transparence', transparenceRouter)

// Pilotage & alertes (signaux faibles, tableau d'impact, digest hebdomadaire)
app.use('/api/pilotage', pilotageRouter)

// Réflexivité (bilan de pratique, coach de posture, débriefing, replay annoté)
app.use('/api/reflexivite', reflexiviteRouter)

// Collaboration & IA (mutualisation, problématisation, résumé « où j'en suis »)
app.use('/api/collab', collaborationRouter)

// Visualisation & émotionnel (nuage de thèmes, roue des émotions)
app.use('/api/viz', visualisationRouter)

// Confort & pratique (visio, PWA & push, export PDF)
app.use('/api/confort', confortRouter)

// Éthique (attestation de fin ; les actions RGPD admin sont dans /api/admin)
app.use('/api/ethique', ethiqueRouter)

// Adoption & accessibilité (reformulation FALC)
app.use('/api/adoption', adoptionRouter)

// Wiki documentaire interne : partage public (lecture seule, AVANT la garde admin), puis routeur admin
app.use('/api/wiki/public', publicWikiRouter)
app.use('/api/wiki', wikiRouter)

// Santé du service (checks de déploiement)
app.get('/api/health', (_req, res) => {
  const tables = db
    .prepare("SELECT count(*) AS n FROM sqlite_master WHERE type='table'")
    .get() as { n: number }
  res.json({ status: 'ok', service: 'boussole-api', version: '0.1.0', tables: tables.n, time: new Date().toISOString() })
})

// Contexte public (page d'accueil / onglet Aide)
app.get('/api/context', (_req, res) => {
  res.json({
    nom: 'Boussole',
    cadre: 'UE FAD130 — Cnam',
    objectif:
      "Aider l'accompagnateur à poser les bonnes questions et à tenir une posture juste, " +
      "avec l'appui de l'IA, puis produire un compte rendu structuré avec plan d'action.",
    publicCible: ['accompagnateurs', 'personnes accompagnées (étudiants, alternants)'],
  })
})

// Comptes initiaux (admin + accompagnateur)
seed().catch((e) => console.error('[seed] échec :', e))

// Contenu de référence du wiki documentaire (idempotent : n'écrase jamais les éditions)
try { seedWiki() } catch (e) { console.error('[wiki] seed échec :', e) }

// Sauvegardes locales horodatées de la base (quotidiennes, avec rétention)
scheduleBackups()

// Rappels d'action : balayage périodique côté serveur, indépendant des clients connectés
// (la consultation des notifications déclenche aussi un balayage immédiat, en complément).
setInterval(() => {
  try { sweepDueReminders() } catch (e) { console.error('[rappels] balayage échec :', e) }
}, 60 * 60 * 1000)

// Signaux faibles : alerte l'accompagnateur aux changements d'état (au démarrage puis toutes les heures).
// Digest hebdomadaire : envoi planifié (lundi 08h), actif uniquement si DIGEST_CRON=1.
setTimeout(() => { try { sweepSignauxAlertes() } catch (e) { console.error('[signaux] balayage échec :', e) } }, 6000)
setInterval(() => {
  try { sweepSignauxAlertes() } catch (e) { console.error('[signaux] balayage échec :', e) }
  void sweepDigestsHebdo().catch((e) => console.error('[digest] envoi échec :', e))
  try { sweepRetention() } catch (e) { console.error('[rétention] balayage échec :', e) }
}, 60 * 60 * 1000)

const port = Number(process.env.PORT) || 3000
app.listen(port, () => {
  console.log(`[Boussole] API à l'écoute sur le port ${port}`)
})
