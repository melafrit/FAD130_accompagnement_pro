import { Session } from './api'
import { latestToken } from './db'

// Création / nettoyage de comptes de test JETABLES (suffixe @boussole.test) pour les
// scénarios destructifs (anonymisation, suppression, affectation de plan), afin de ne
// jamais altérer durablement les comptes de démo (vitrine Mohamed/Amine).

export interface TestUser { id: number; email: string; password: string; role: string }

const PASSWORD = 'TestBoussole2026!'
// Compteur monotone : garantit des e-mails UNIQUES même si deux appels partagent le même tag
// (sinon createTestUser supprimerait le résidu de même e-mail et casserait un bac à sable partagé).
let seq = 0

/** Crée un compte de test via l'admin, définit son mot de passe (jeton lu en base) et renvoie ses identifiants. */
export async function createTestUser(admin: Session, role: 'accompagnateur' | 'accompagne' | 'admin', tag: string): Promise<TestUser> {
  const email = `test-${tag}-${role}-${process.pid}-${++seq}@boussole.test`
  // Nettoyage préalable si un résidu existe
  await deleteByEmail(admin, email)
  const created = await admin.post('/api/admin/users', { email, role, prenom: 'Test', nom: tag })
  if (created.status !== 201) throw new Error(`Création du compte de test échouée (${created.status}) : ${JSON.stringify(created.json)}`)
  const id = created.json.id as number
  // L'admin a déclenché un jeton reset_mdp ; on le lit pour définir le mot de passe.
  const token = latestToken(email, 'reset_mdp')
  if (!token) throw new Error(`Jeton d'activation introuvable pour ${email}`)
  const s = new Session()
  const reset = await s.post('/api/auth/reset', { token, password: PASSWORD })
  if (reset.status !== 200) throw new Error(`Activation du compte de test échouée (${reset.status})`)
  return { id, email, password: PASSWORD, role }
}

/** Supprime un compte de test (RGPD admin), en cascade. Idempotent. */
export async function deleteTestUser(admin: Session, user: TestUser): Promise<void> {
  await admin.post(`/api/admin/rgpd/${user.id}`, { action: 'supprimer' })
}

async function deleteByEmail(admin: Session, email: string): Promise<void> {
  const list = await admin.get('/api/admin/users')
  const u = (list.json?.users || []).find((x: any) => x.email === email)
  if (u) await admin.post(`/api/admin/rgpd/${u.id}`, { action: 'supprimer' })
}

export { PASSWORD as TEST_PASSWORD }
