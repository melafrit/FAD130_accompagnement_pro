import { execSync } from 'node:child_process'

const CONTAINER = process.env.BOUSSOLE_API_CONTAINER || 'boussole-api-local'

/**
 * Exécute un script Node DANS le conteneur API (lecture seule sur la base SQLite).
 * Le script est passé sur stdin (évite tout problème de quoting shell).
 * Le script doit écrire son résultat sur stdout.
 */
function runInContainer(js: string): string {
  return execSync(`docker exec -i ${CONTAINER} node`, { input: js, encoding: 'utf8' }).trim()
}

const OPEN_DB = `const db=require('better-sqlite3')(process.env.DB_PATH||'./data/boussole.sqlite',{readonly:true});`

/** Dernier jeton non utilisé d'un type donné pour un e-mail (vérif e-mail, reset, etc.). */
export function latestToken(email: string, type: 'verif_email' | 'reset_mdp'): string {
  const js = `${OPEN_DB}const r=db.prepare("SELECT valeur FROM tokens WHERE user_id=(SELECT id FROM users WHERE email=?) AND type=? AND utilise=0 ORDER BY id DESC LIMIT 1").get(${JSON.stringify(email)}, ${JSON.stringify(type)});process.stdout.write(r?r.valeur:'')`
  return runInContainer(js)
}

/** Lit une valeur scalaire arbitraire (requête SELECT renvoyant une colonne). Utilitaire de diagnostic.
 *  Une absence de ligne OU une valeur SQL NULL renvoient une chaîne vide (jamais la chaîne 'null'). */
export function scalar(sql: string, ...params: unknown[]): string {
  const js = `${OPEN_DB}const r=db.prepare(${JSON.stringify(sql)}).get(${params.map((p) => JSON.stringify(p)).join(',')});const v=r?Object.values(r)[0]:null;process.stdout.write(v==null?'':String(v))`
  return runInContainer(js)
}

export { CONTAINER }
