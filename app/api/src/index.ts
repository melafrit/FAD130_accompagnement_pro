import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { initDb } from './db'

const app = express()
app.use(helmet())
app.use(cors())
app.use(express.json({ limit: '1mb' }))

const db = initDb()

// Santé du service (utilisé pour les checks de déploiement)
app.get('/api/health', (_req, res) => {
  const tables = db
    .prepare("SELECT count(*) AS n FROM sqlite_master WHERE type='table'")
    .get() as { n: number }
  res.json({
    status: 'ok',
    service: 'boussole-api',
    version: '0.1.0',
    tables: tables.n,
    time: new Date().toISOString(),
  })
})

// Contexte public (alimente la page d'accueil / l'onglet Aide)
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

const port = Number(process.env.PORT) || 3000
app.listen(port, () => {
  console.log(`[Boussole] API à l'écoute sur le port ${port}`)
})
