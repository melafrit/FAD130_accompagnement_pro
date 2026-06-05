import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { db } from './db'
import authRouter from './auth'
import questionnaireRouter from './questionnaire'
import rdvRouter from './rdv'
import entretienRouter from './entretien'
import { seed } from './seed'

const app = express()
app.use(helmet())
app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())

// Authentification
app.use('/api/auth', authRouter)

// Questionnaire initial (Claude)
app.use('/api/questionnaire', questionnaireRouter)

// Rendez-vous (créneaux & réservation)
app.use('/api/rdv', rdvRouter)

// Entretien guidé (6 phases + suggestions IA)
app.use('/api/entretien', entretienRouter)

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

const port = Number(process.env.PORT) || 3000
app.listen(port, () => {
  console.log(`[Boussole] API à l'écoute sur le port ${port}`)
})
