import dotenv from 'dotenv'

// Charge les variables d'environnement depuis app/.env.
// - En mode dev (cwd = app/api) : ../.env = app/.env, puis .env (app/api/.env) en repli.
// - En conteneur : les variables sont déjà injectées (env_file / substitution), ces appels sont sans effet.
// dotenv n'écrase jamais une variable déjà définie.
dotenv.config({ path: '../.env' })
dotenv.config()
