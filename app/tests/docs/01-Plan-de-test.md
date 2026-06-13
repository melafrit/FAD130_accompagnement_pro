# Plan de test — Boussole (UE FAD130)

> Document de niveau **Plan de test** conforme à la structure IEEE 829 / terminologie ISTQB.
> Application : **Boussole** — accompagnement des transitions (API Node/Express + front React/Vite + SQLite).

| Champ | Valeur |
|---|---|
| Identifiant du document | BOUSSOLE-PT-001 |
| Version | 1.0 |
| Auteur | Mohamed EL AFRIT |
| Statut | Approuvé |
| Périmètre | Socle applicatif + 8 lots fonctionnels (38 fonctionnalités) + administration |

## 1. Références

- Code source : `app/api/src/**` (API), `app/web/src/**` (front), `app/api/src/features.ts` (registre des 38 fonctionnalités).
- Catalogue de cas de test : `02-Catalogue-cas-de-test.md`.
- Matrice de traçabilité : `03-Matrice-tracabilite.md`.
- Rapport d'exécution : `04-Rapport-execution.md` (généré à chaque exécution).

## 2. Introduction et objectifs

L'objectif est de doter Boussole d'une **batterie de tests exhaustive et reproductible**, exécutable à la demande, servant de **porte de non-régression** : aucune évolution n'est livrée sans que l'intégralité de la suite soit au vert. La batterie couvre l'ensemble de l'application — du socle (authentification, questionnaire, entretien, comptes rendus, rendez-vous, plan d'action, synthèse, multi-parcours) jusqu'aux 8 lots (abonnements & activation, pilotage & alertes, réflexivité, collaboration & IA, visualisation & émotionnel, confort, éthique & admin, adoption & FALC).

## 3. Périmètre

### 3.1 Inclus
- **Tous les endpoints** de l'API (méthode, chemin, rôle requis, fonctionnalité requise, validation, propriété des ressources).
- **Toutes les fonctionnalités** du registre (`features.ts`), socle compris, avec leur **contrôle d'accès par abonnement**.
- **Le cycle d'authentification complet** (inscription → vérification e-mail → connexion, mot de passe oublié → réinitialisation, changement d'e-mail → confirmation), jeton lu en base.
- **Un scénario UI bout-en-bout par fonctionnalité** (les deux rôles + admin).
- **La logique déterministe** (replis sans IA, calculs de signaux, agrégats d'impact, assainissement) en tests unitaires.

### 3.2 Exclus
- L'exactitude **textuelle** des sorties IA (non déterministe) : on vérifie le **contrat** (statut, structure, non-vacuité, gating, persistance), pas le contenu mot pour mot.
- L'envoi **réel** d'e-mails (Brevo) et de **push** vers des terminaux réels (journalisés en local, jamais émis pendant les tests).
- Les tests de charge / performance et la compatibilité multi-navigateurs étendue (Playwright cible Chromium).

## 4. Approche et stratégie de test

### 4.1 Niveaux de test (ISTQB)
| Niveau | Cible | Outil |
|---|---|---|
| **Unitaire** | Fonctions pures (replis IA, calculs, assainissement) | Vitest (import direct du code API) |
| **Intégration / Système (API)** | Endpoints HTTP de bout en bout contre la stack `:8080` | Vitest + `fetch` |
| **Système (UI)** | Parcours utilisateur dans un vrai navigateur | Playwright (Chromium) |

### 4.2 Types de test
- **Fonctionnel** (cas nominal, 200/201 + forme correcte).
- **Contrôle d'accès / sécurité** : 401 (non authentifié), 403 (mauvais rôle **ou** offre sans la fonctionnalité), 404 (non-propriétaire d'une ressource).
- **Validation / négatif** : 400 sur entrée invalide, 409 sur conflit (e-mail déjà utilisé).
- **Non-régression** : exécution intégrale à chaque évolution.

### 4.3 Techniques de conception
- **Partition d'équivalence** (entrées valides / invalides).
- **Analyse des valeurs limites** (longueurs min/max, mot de passe ≥ 8, etc.).
- **Table de décision** (combinaisons rôle × fonctionnalité activée × propriété).
- **Test basé sur les rôles** (matrice accompagné / accompagnateur / admin / anonyme).
- **Test du contrat** (forme de réponse pour les endpoints IA).

## 5. Environnement de test

- **Cible** : stack Docker locale `docker-compose.local.yml` exposée sur `http://localhost:8080` (front + API + SQLite).
- **Base** : (ré)initialisée avant chaque exécution pour repartir d'un jeu de démo propre et reproductible (6 comptes, 3 plans, 6 dossiers).
- **Comptes de référence** (lecture seule) : admin, 2 accompagnateurs (Mohamed, Camille), 3 accompagnés (Amine, Léa, Karim) — mot de passe commun `BoussoleDemo2026`.
- **Comptes de test dédiés** : créés à la volée avec un suffixe `@boussole.test` pour tout scénario **destructif** (anonymisation, suppression, affectation de plan), puis nettoyés en fin d'exécution. La vitrine (Mohamed/Amine, dossier D1) n'est **jamais** altérée durablement.
- **Extraction de jeton** : pour les flux d'authentification, le jeton est lu dans la base du conteneur via `docker exec`.

## 6. Outils

| Besoin | Outil |
|---|---|
| Tests unitaires & intégration API | **Vitest** |
| Appels HTTP | `fetch` natif (Node 18+) |
| Tests UI E2E | **Playwright** (Chromium) |
| Lecture de jeton serveur | `docker exec boussole-api-local` |
| Orchestration | script unique `run-all` (PowerShell + Bash) |

## 7. Critères d'entrée / de sortie

### 7.1 Entrée
- Le code compile (typecheck API + web au vert).
- La stack `:8080` est démarrée et l'endpoint `/api/health` répond `ok`.

### 7.2 Sortie (porte de non-régression)
- **100 % des cas de priorité haute et moyenne au vert.**
- Aucun échec sur les tests de contrôle d'accès (sécurité).
- Le rapport d'exécution est généré et archivé.
- Toute régression détectée est corrigée **avant** la livraison de l'évolution en cours.

## 8. Gestion des données de test

- Fixtures créées/réinitialisées de façon idempotente ; nettoyage systématique (les comptes `@boussole.test` et les plans temporaires sont supprimés en `afterAll`).
- Les identifiants de ressources (dossiers, sessions, RDV) sont **découverts dynamiquement** via l'API, jamais codés en dur.

## 9. Gestion du non-déterminisme IA

Les endpoints IA (miroir, bilan, coach, nuage de thèmes, problématisation, résumé, FALC, débriefing, replay, banque de questions, suggestions d'entretien, comptes rendus, synthèse) sont testés **par contrat** : statut `200`, présence et type des champs attendus, non-vacuité, comportement du gating et persistance/relecture. Leur **logique de repli déterministe** est, en parallèle, couverte par des **tests unitaires** au texte près.

## 10. Livrables

1. Plan de test (ce document).
2. Catalogue de cas de test tracés (`02-Catalogue-cas-de-test.md`).
3. Matrice de traçabilité fonctionnalité ↔ cas ↔ test automatisé (`03-Matrice-tracabilite.md`).
4. Suite automatisée : `tests/unit/**`, `tests/api/**`, `tests/ui/**`.
5. Runner unique + rapport d'exécution daté (`04-Rapport-execution.md`) + rapport HTML Playwright.
6. Export Word professionnel de la documentation (`.docx`).

## 11. Convention d'identification et de nommage

- **Cas de test** : `TC-<DOMAINE>-<NNN>` (ex. `TC-AUTH-001`, `TC-LOT1-014`, `TC-PILOT-007`).
- **Domaines** : AUTH, QUEST, RDV, ENTR, CR, ACT, DOSS, EVAL, SYNT, REL, EMERG, TRANSP, MIROIR, LOT1 (plans), PILOT, REFLEX, COLLAB, VIZ, CONFORT, ETHIQUE, ADOPT, UI.
- **Traçabilité** : chaque cas référence la **clé de fonctionnalité** et l'**endpoint** (ou le composant UI) qu'il couvre.

## 12. Risques et mitigations

| Risque | Impact | Mitigation |
|---|---|---|
| Pollution du jeu de démo | Faux négatifs, vitrine abîmée | Comptes `@boussole.test` + nettoyage + réinitialisation avant exécution |
| Instabilité IA | Tests fragiles | Tests par contrat + units du repli |
| Fragilité des sélecteurs UI | Faux échecs Playwright | Attributs stables (`data-tour`, rôles ARIA), attentes explicites |
| Dépendance Docker (jeton) | Couplage | Helper d'extraction isolé, dégradable si l'auth à jeton est désactivée |
| Effets de bord e-mail/push | Spam | Aucune clé d'envoi en test ; push vers abonnements jetables purgés |

## 13. Porte de non-régression — processus à chaque évolution

1. Implémenter l'évolution demandée.
2. Mettre à jour / ajouter les cas de test impactés (catalogue + automatisation).
3. Exécuter la **commande unique** : réinitialisation base propre → unitaire → API → UI → rapport.
4. **Corriger tout échec** avant de déclarer l'évolution terminée.
5. Archiver le rapport d'exécution daté.

## 14. Rôles et responsabilités

| Rôle | Responsabilité |
|---|---|
| Concepteur de tests / Développeur | Conçoit, automatise et maintient les cas ; exécute la porte de non-régression |
| Propriétaire produit (Mohamed) | Valide le périmètre et les critères de sortie |
