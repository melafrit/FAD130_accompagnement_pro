# Conventions d'écriture des tests API (Vitest) — Boussole

Ces règles garantissent des fichiers cohérents, déterministes et sans régression sur la stack `:8080`.

## Emplacement & imports
- Un fichier par domaine : `app/tests/api/<domaine>.test.ts`.
- Imports autorisés :
  ```ts
  import { describe, it, expect, beforeAll, afterAll } from 'vitest'
  import { Session, asUser, DEMO } from '../helpers/api'
  import { createTestUser, deleteTestUser, type TestUser } from '../helpers/fixtures'
  import { latestToken } from '../helpers/db'
  ```
- Le client renvoie `{ status, json, headers }`. Ex. : `const r = await s.get('/api/auth/me'); expect(r.status).toBe(200)`.
- Méthodes de session : `s.get(path)`, `s.post(path, body)`, `s.patch(path, body)`, `s.del(path, body)`, `s.login(email, password)`, `s.logout()`.
- `asUser(DEMO.xxx)` ouvre une session connectée. Comptes : `DEMO.admin`, `DEMO.mohamed` (accompagnateur vitrine), `DEMO.camille` (accompagnateur), `DEMO.amine` (accompagné vitrine), `DEMO.lea`, `DEMO.karim`.

## Traçabilité (OBLIGATOIRE)
- Chaque `it(...)` commence par l'ID de cas couvert : `it('TC-AUTH-001 — inscription nominale 201', async () => {...})`.
- Si un test couvre plusieurs cas, lister tous les IDs dans le titre ou un commentaire `// couvre TC-X, TC-Y` (la matrice détecte tout `TC-XXX-NNN` présent dans le fichier).
- Couvre EXHAUSTIVEMENT les cas de niveau `api` du fichier de catalogue du domaine. Ignore les cas `unitaire` et `ui` (traités ailleurs).

## Déterminisme & isolation
- **Exécution séquentielle** (un seul worker). Pas de dépendance à l'ordre entre fichiers.
- **Découverte dynamique des identifiants** : ne JAMAIS coder en dur un id numérique. Récupère les dossiers via `/api/entretien/dashboard` (accompagnateur) ou `/api/dossiers/mine` (accompagné), les sessions via `/api/dossiers/:id`, les RDV via le détail du dossier, les plans via `/api/admin/plans`.
- **Auto-nettoyage** : toute ressource créée (compte, plan, ressource mutualisée…) est supprimée en `afterAll`. Pour tout scénario DESTRUCTIF (anonymisation, suppression, affectation de plan, modification d'un compte démo), utiliser un **compte de test jetable** via `createTestUser(admin, role, tag)` puis `deleteTestUser(admin, user)`. NE JAMAIS dégrader durablement un compte démo (surtout Mohamed/Amine, dossier vitrine D1).
- La base est réinitialisée AVANT chaque exécution complète : tu peux supposer le jeu de démo présent, mais privilégie des assertions **structurelles** (forme, statut) plutôt que des comptages exacts susceptibles de dériver.

## Profondeur (rappel)
Pour chaque endpoint : cas **nominal** (200/201 + forme), **accès** (401 sans cookie ; 403 mauvais rôle OU offre sans la fonctionnalité ; 404 ressource d'autrui), **validation** (400 entrée invalide ; 409 conflit). 

## Gating par abonnement (403 feature)
Pour tester qu'une fonctionnalité hors socle renvoie 403 quand l'offre ne l'inclut pas :
```ts
const admin = await asUser(DEMO.admin)
const decouverte = (await admin.get('/api/admin/plans')).json.plans.find((p: any) => p.nom === 'Découverte')
const u = await createTestUser(admin, 'accompagnateur', 'gate-pilot')
await admin.patch(`/api/admin/users/${u.id}`, { plan_id: decouverte.id }) // plan socle, sans la feature
const s = await asUser({ email: u.email, password: u.password })
expect((await s.get('/api/pilotage/signaux')).status).toBe(403)
// afterAll : await deleteTestUser(admin, u)
```
Le plan « Découverte » ne contient que le socle (questionnaire, entretien, comptes_rendus, rdv, plan_action, synthese, auto_evaluation, multi_parcours). Toute autre clé y est absente → 403.

## Endpoints IA (contrat seulement)
Pour les endpoints qui appellent l'IA (miroir, bilan, coach, nuage, problématisation, résumé, FALC, débriefing, suggestions, CR, synthèse, banque…) : vérifier `status===200`, la **présence et le type** des champs attendus, la **non-vacuité**, le **gating** et la **persistance/relecture**. NE PAS figer le texte renvoyé.

## Auth à jeton
`latestToken(email, 'verif_email' | 'reset_mdp')` lit le dernier jeton non utilisé en base (via `docker exec`). Exemple reset complet :
```ts
const s = new Session()
await s.post('/api/auth/request-reset', { email })
const token = latestToken(email, 'reset_mdp')
expect((await s.post('/api/auth/reset', { token, password: 'NouveauMdp1' })).status).toBe(200)
```
