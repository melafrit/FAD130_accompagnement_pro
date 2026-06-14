# Stratégie de tests

La qualité de Boussole repose sur une **batterie de non-régression réelle, automatisée et reproductible**, conçue selon la terminologie ISTQB et la structure documentaire IEEE 829. Elle couvre trois niveaux (unitaire, intégration API, E2E UI), traite spécifiquement le non-déterminisme de l'IA Claude par **test de contrat + couverture unitaire du repli déterministe**, et constitue une **porte de non-régression** : aucune évolution n'est livrée sans que l'intégralité de la suite soit au vert. Elle est désormais doublée d'une **intégration continue GitHub Actions** qui rejoue la suite sur une **base fraîche, sans clé Anthropic** (l'IA bascule sur son repli déterministe), à chaque push. L'état de référence reste une porte locale **au vert** et une **CI verte** ; le catalogue conçu atteint désormais **~1046 cas catalogués** répartis sur les domaines fonctionnels et transverses (dont **5 nouveaux domaines** : wiki, 2FA, sécurité, CSRF, observabilité). Cette page décrit les objectifs, le périmètre, les niveaux, les jeux de données, l'environnement, l'automatisation, la CI et l'état chiffré ; le détail cas-par-cas est tenu dans la [matrice de traçabilité](traceability-matrix).

## Objectifs de la page

- Donner une **vision décisionnelle** de la stratégie de tests : quoi tester, à quel niveau, avec quel critère de sortie.
- Distinguer nettement ce qui est **couvert / partiellement couvert / hors périmètre**, sans surévaluer la couverture.
- Documenter la **gestion du non-déterminisme IA**, la **protection de la vitrine de démonstration** et l'**intégration continue** (base fraîche, sans clé, repli déterministe).
- Servir de référence pour le **rejeu avant livraison** (oral du 12/06, dépôt du 19/06/2026) et de point d'entrée vers la [matrice de traçabilité](traceability-matrix) et la [documentation API](api-documentation).

## 1. Objectifs et principes directeurs

| Objectif | Traduction concrète | Statut |
|---|---|---|
| Non-régression systématique | Suite intégrale rejouée à chaque évolution, base reseedée à neuf | Déjà livré |
| Intégration continue | GitHub Actions rejoue unitaire + API + UI sur base fraîche, sans clé, à chaque push | Déjà livré |
| Couverture du contrôle d'accès | 401 / 403 / 404 testés sur chaque endpoint sensible (rôle, offre, propriété) | Déjà livré |
| Robustesse de l'IA | Jamais de 500 : repli déterministe testé par contrat **et** au texte près | Déjà livré |
| Couverture de la sécurité durcie | Rate-limit, CSP/helmet, 2FA TOTP, CSRF double-submit testés | Déjà livré |
| Observabilité testée | Journalisation structurée, `error_log`, `GET /api/metrics` couverts | Déjà livré |
| Reproductibilité | Jeu de démo idempotent, identifiants découverts dynamiquement, repli déterministe en CI | Déjà livré |
| Protection de la vitrine | Comptes jetables `@boussole.test` pour les scénarios destructifs | Déjà livré |
| Traçabilité | Chaque cas relie une fonctionnalité, un endpoint (ou composant UI) et un test | Déjà livré |

Principe transverse : **on teste le contrat, pas l'implémentation littérale de l'IA**. La sortie textuelle de Claude n'est jamais vérifiée mot pour mot ; on contrôle le statut, la structure, la non-vacuité, le gating et la persistance. La logique de repli, elle, est déterministe et testée à l'identique — ce qui rend la CI **reproductible sans clé Anthropic**.

## 2. Périmètre

### 2.1 Inclus

- **Tous les endpoints** de l'API : méthode, chemin, rôle requis, fonctionnalité requise (`requireFeature`), validation `zod`, propriété de la ressource — y compris les endpoints ajoutés récemment (wiki, 2FA, métriques).
- **Les fonctionnalités** du registre `features.ts`, socle compris, avec leur **contrôle d'accès par abonnement** (plans Découverte / Essentiel / Pro, `plan_id NULL` = accès maximal).
- **Le cycle d'authentification complet** : inscription → vérification e-mail → connexion ; mot de passe oublié → réinitialisation ; changement d'e-mail → re-confirmation. Le jeton est lu en base réelle. Le **challenge 2FA** (`{ twofa:true }` au login tant que le code TOTP n'est pas fourni) est couvert.
- **Le wiki avancé** : partage public opt-in par lien tokenisé (route publique `GET /api/wiki/public/:token`, lecture seule, révocation), historique de versions (instantané avant modification, restauration), export global (`GET /api/wiki/export-all.{md,docx,pdf}`).
- **La sécurité durcie** : rate-limiting (limiteur global + strict sur `/api/auth`), en-têtes de durcissement (helmet/CSP), 2FA TOTP opt-in (setup/enable/disable/status), protection CSRF double-submit (cookie + en-tête `X-CSRF-Token` sur les mutations).
- **L'observabilité** : journalisation structurée pino, table `error_log` / `reportError()`, middleware d'erreur centralisé respectant le statut porté, endpoint admin `GET /api/metrics`.
- **Un scénario UI bout-en-bout par fonctionnalité**, pour les **3 rôles** (accompagnateur, accompagné, admin) plus l'anonyme.
- **La logique déterministe** : replis IA, calculs de signaux faibles, agrégats du tableau d'impact, assainissement HTML, génération ICS — en tests unitaires.

### 2.2 Exclus (hors périmètre assumé)

| Exclusion | Raison | Compensation |
|---|---|---|
| Exactitude **textuelle** des sorties IA | Non déterministe | Test de contrat + units du repli |
| Envoi **réel** d'e-mails (Brevo) et de **push** | Effets de bord externes | Journalisés en local, jamais émis en test |
| Tests de **charge / performance** | Hors objectif académique mono-instance | Voir §7 (hypothèses) |
| **Compatibilité multi-navigateurs** étendue | Coût/bénéfice | Playwright cible Chromium |
| **OpenAPI/Swagger interactif**, **audit RGAA** formel | Non encore livrés | Voir Recommandations |

## 3. Niveaux de test

```mermaid
flowchart TD
    subgraph Unit["Unitaire — Vitest (import direct)"]
        U1[Replis IA déterministes]
        U2[Calculs : signaux, impact, agrégats]
        U3[Assainissement HTML / ICS / tokens]
        U4[2FA TOTP / CSRF / tokens wiki]
    end
    subgraph API["Intégration API — Vitest + fetch contre :8080"]
        A1[Contrat HTTP : 200/201 + forme]
        A2[Controle d-acces : 401/403/404]
        A3[Validation zod : 400/409]
        A4[Contrat IA : structure, non-vacuite, persistance]
        A5[Wiki / 2FA / securite / CSRF / metrics]
    end
    subgraph UI["E2E UI — Playwright Chromium"]
        E1[Parcours accompagnateur]
        E2[Parcours accompagne]
        E3[Parcours admin]
    end
    Unit --> API --> UI --> Gate{{Porte run-all}}
    Gate -->|VERT| CI[CI GitHub Actions<br/>base fraiche, sans cle]
    CI -->|VERT| Livraison[Livraison autorisee]
    Gate -->|ROUGE| Correction[Correction obligatoire]
    CI -->|ROUGE| Correction
```

La pyramide est respectée dans l'esprit : une base d'unitaires rapides sur la logique pure, un cœur d'intégration API très dense (couche la plus volumineuse, car c'est là que vit le contrôle d'accès), et un sommet E2E ciblé sur les parcours des 3 rôles. Le flux ci-dessus est strictement séquentiel dans le runner : un échec à n'importe quelle étape fait basculer la porte au rouge. La **CI GitHub Actions** rejoue ce même flux sur une base neuve à chaque push.

### 3.1 Unitaire — repli déterministe

Cible : fonctions pures importées directement depuis le code API (`claude.ts`, `claudeSuggest.ts`, `compteRendu.ts`, `rdv.ts`, `features.ts`, calculs de pilotage et d'émergence). On y vérifie au **texte près** le comportement de repli activé quand l'IA est indisponible, ainsi que les fonctions techniques (génération/échappement ICS, `makeToken`, `sanitizeKeys`, `userFeatures`). S'y ajoutent désormais des unités sur les briques de sécurité (vérification d'un code TOTP `otplib`, validation du jeton double-submit CSRF) et sur les jetons publics du wiki.

> **Hypothèse — confiance : élevée** — 2 cas unitaires (`TC-CR-066`, `TC-CR-067`) sont marqués `it.skip` et explicitement documentés « couvert par intégration API » : la génération IA de compte rendu parsant du JSON entouré de prose est validée au niveau API plutôt qu'unitaire.

### 3.2 Intégration API — contrat HTTP, contrôle d'accès, validation

C'est le niveau le plus volumineux. Les suites (`auth`, `quest`, `rdv`, `entr`, `cr`, `actnotif`, `dossier`, `relemerg`, `lot1`, `pilot`, `reflex`, `collab`, `viz`, `confort`, `ethique`, `adopt`, ainsi que `wiki`, `2fa`, `securite`, `csrf`, `observabilite`) appellent l'API HTTP réelle via `fetch` contre la stack Docker. Une suite **smoke** (`smoke.test.ts`) valide d'abord la plomberie : santé, connexion + cookie, gating 401/403, cycle complet d'un compte jetable.

| Catégorie de contrôle | Statut attendu | Exemple |
|---|---|---|
| Cas nominal | 200 / 201 + forme correcte | inscription valide → 201 |
| Non authentifié | 401 | `GET /api/admin/users` sans cookie |
| Mauvais rôle **ou** offre sans la feature | 403 | accompagné sur route admin ; feature hors plan |
| Non-propriétaire d'une ressource | 404 | accès à un dossier d'autrui |
| Entrée invalide (`zod`) | 400 | mot de passe < 8 caractères |
| Conflit | 409 | e-mail déjà utilisé |
| Mutation sans jeton CSRF | 403 | `POST` sans en-tête `X-CSRF-Token` |
| Challenge 2FA actif | `{ twofa:true }` sans cookie | login d'un compte TOTP activé, code manquant |

### 3.3 E2E UI — Playwright, 3 rôles

Trois specs couvrent les parcours métier (`accompagnateur.spec.ts`, `accompagne.spec.ts`, `admin.spec.ts`) plus un `smoke.spec.ts`. Les sélecteurs s'appuient sur des **attributs stables** (`data-tour`, rôles ARIA) et des attentes explicites pour éviter la fragilité. La cible est Chromium.

### 3.4 Tests IA — contrat + units du repli

```mermaid
sequenceDiagram
    participant T as Test API
    participant API as Endpoint IA
    participant C as Claude (Anthropic)
    participant F as Repli déterministe
    T->>API: POST (corps valide, role/feature OK)
    alt IA disponible (clé présente)
        API->>C: appel modèle
        C-->>API: contenu (non déterministe)
    else IA indisponible / erreur / CI sans clé
        API->>F: bascule automatique
        F-->>API: contenu déterministe
    end
    API-->>T: 200 + structure attendue
    Note over T: assertions de CONTRAT :<br/>statut, champs, non-vacuité,<br/>gating, persistance — jamais le texte exact
```

Le test ne sait pas, et n'a pas besoin de savoir, si la réponse vient de Claude ou du repli : dans les deux cas le **contrat** (statut 200, structure, non-vacuité, persistance en base) doit tenir. La garantie « jamais de 500 » est ainsi vérifiée de bout en bout, et la logique de repli est doublée d'une couverture unitaire au texte près. C'est précisément ce repli déterministe qui rend la **CI reproductible sans clé Anthropic** ; deux scénarios E2E de génération IA sont en outre neutralisés en CI via le drapeau `CI_SKIP_IA`.

### 3.5 Sécurité, observabilité, performance, accessibilité

| Type | Couverture actuelle | Détail |
|---|---|---|
| **Sécurité (contrôle d'accès)** | Déjà livré | 401/403/404 systématiques ; anti-énumération sur `request-reset` ; propriété des ressources ; isolation par rôle |
| **Sécurité (assainissement)** | Déjà livré (unitaire) | Sanitisation HTML des CR/synthèses (dompurify côté front, esc/contentToHtml côté API) testée |
| **Sécurité (durcissement)** | Déjà livré | Rate-limiting (global + `/api/auth`), en-têtes helmet/CSP, désactivables en test via `RATE_LIMIT_DISABLED=1` |
| **Sécurité (2FA TOTP)** | Déjà livré | `setup`/`enable`/`disable`/`status`, challenge `{ twofa:true }` au login, QR code |
| **Sécurité (CSRF)** | Déjà livré | Double-submit cookie + en-tête `X-CSRF-Token` sur mutations, désactivable en test via `CSRF_DISABLED=1` |
| **Observabilité** | Déjà livré | Logs pino, table `error_log` / `reportError()`, middleware d'erreur centralisé, `GET /api/metrics` (admin) |
| **Performance / charge** | Hors périmètre | *Information non identifiée dans le code ou la conversation.* Voir Recommandations |
| **Accessibilité** | Partiel | Sélecteurs ARIA exploités par Playwright ; pas d'audit a11y/RGAA dédié (axe-core) identifié |
| **Non-régression** | Déjà livré | Porte `run-all` rejouée avant chaque livraison + CI GitHub Actions |

> **Hypothèse — confiance : moyenne** — l'accessibilité est *exercée indirectement* (rôles ARIA utilisés comme sélecteurs E2E) mais ne fait pas l'objet d'une suite d'audit dédiée. L'**audit RGAA** formel n'est **pas encore livré**. À ne pas présenter comme une couverture a11y formelle.

## 4. Jeux de données

```mermaid
graph LR
    subgraph Vitrine["Vitrine protégée (lecture seule)"]
        V1[admin]
        V2[Mohamed / Camille - accompagnateurs]
        V3[Amine / Lea / Karim - accompagnes]
        V4[6 dossiers / 3 plans]
    end
    subgraph Jetable["Comptes jetables (destructif)"]
        J1["*@boussole.test"]
        J2[Plans temporaires]
    end
    Reseed[Reseed avant exécution] --> Vitrine
    Tests[Scénarios destructifs] --> Jetable
    Jetable -->|afterAll| Nettoyage[Suppression / purge]
```

- **Base de démo reseedée** : (ré)initialisée avant chaque exécution pour repartir d'un état propre et reproductible — **6 comptes** (1 admin, 2 accompagnateurs, 3 accompagnés), **3 plans**, **6 dossiers**. Mot de passe commun de démo : `BoussoleDemo2026`.
- **Base fraîche en CI** : la CI crée une base **entièrement neuve** à chaque exécution, ce qui force la validation des `CREATE`/`ALTER` (voir §6.1, deux bugs ainsi détectés).
- **Comptes jetables** `@boussole.test` : créés à la volée pour tout scénario **destructif** (anonymisation RGPD, suppression, affectation de plan), puis nettoyés en `afterAll`.
- **Vitrine protégée** : le couple **Mohamed / Amine, dossier D1** n'est **jamais** altéré durablement — c'est l'état présenté à l'oral.
- **Identifiants dynamiques** : dossiers, sessions, RDV sont découverts via l'API, jamais codés en dur.
- **Extraction de jeton** : pour les flux d'authentification, le jeton (`verif_email`, `reset_mdp`) est lu dans la base du conteneur via `docker exec`.

## 5. Environnement

| Élément | Valeur |
|---|---|
| Cible | Stack Docker locale `docker-compose.local.yml` |
| URL | `http://localhost:8080` (front + API + SQLite) |
| Conteneur API | `boussole-api-local` (reseed par `docker restart`) |
| Pré-requis d'entrée | typecheck API + web au vert ; `GET /api/health` → `ok` |
| Lecture de jeton | `docker exec boussole-api-local` |
| CI | GitHub Actions (`.github/workflows/ci.yml`), base fraîche, **sans clé Anthropic**, `CI_SKIP_IA` actif |

L'environnement de test est **identique à la cible de déploiement** (mêmes images, même SQLite), ce qui élimine les écarts de comportement entre test et production décrits dans la page [déploiement](deployment). En local, le rate-limit et la protection CSRF sont neutralisés via `RATE_LIMIT_DISABLED=1` / `CSRF_DISABLED=1` ; ils sont **activés en production**.

## 6. Automatisation, porte de non-régression et CI

```mermaid
flowchart LR
    S1[1. Reseed base de démo<br/>docker restart + health] --> S2[2. Unitaire<br/>vitest run unit]
    S2 --> S3[3. API<br/>vitest run api]
    S3 --> S4[4. UI<br/>playwright test]
    S4 --> S5[5. Rapport daté<br/>report.mjs]
    S5 --> V{Verdict}
    V -->|VERT| OK[Livraison]
    V -->|ROUGE| KO[Correction avant livraison]
```

| Besoin | Outil |
|---|---|
| Unitaire & intégration API | **Vitest** |
| Appels HTTP | `fetch` natif (Node 18+) |
| E2E UI | **Playwright** (Chromium) |
| Orchestration locale | Script unique **`run-all`** (`run-all.ps1` Windows + `run-all.sh`) |
| Intégration continue | **GitHub Actions** (`.github/workflows/ci.yml`) |
| Rapport | `scripts/report.mjs` (rapport daté) + rapport HTML Playwright |

Le runner `run-all` enchaîne : **reseed → unitaire → API → UI → rapport**. C'est la **porte de non-régression** : rejouée avant chaque livraison, elle bloque toute évolution tant que la suite n'est pas au vert. Le processus normatif est : (1) implémenter, (2) mettre à jour le catalogue + l'automatisation, (3) lancer `run-all`, (4) corriger **tout** échec, (5) archiver le rapport daté.

### 6.1 Intégration continue (GitHub Actions)

La CI (`.github/workflows/ci.yml`) **rejoue la suite à chaque push** : tests unitaires + intégration API + UI (Playwright) sur une **base entièrement fraîche**, et **sans clé Anthropic**. Privée de clé, l'IA **bascule automatiquement sur son repli déterministe** — la CI est donc **reproductible** par construction. Le drapeau `CI_SKIP_IA` neutralise 2 scénarios E2E de génération IA qui n'apportent rien sans clé réelle.

> **Bugs réels détectés par la CI — confiance : élevée** — l'exécution sur base neuve a déjà mis au jour **deux bugs invisibles en local** :
> 1. **Anonymisation RGPD en 500 sur base neuve** : les colonnes `demandes_effacement.action` / `traite_le` n'étaient ajoutées que par un `ALTER` s'exécutant *avant* le `CREATE` de la table — sans effet sur une base fraîche.
> 2. **Middleware d'erreur** qui forçait un **500** sur des erreurs de **parsing (400)**, masquant le vrai statut.
>
> Ces deux régressions, indétectables sur une base déjà migrée en local, justifient à elles seules la CI sur base fraîche.

## 7. État chiffré (référence)

| Couche | Réussite | Commentaire |
|---|---|---|
| Unitaire | Au vert | 2 cas `it.skip` documentés (couverts en API) ; ajout 2FA/CSRF/tokens wiki |
| API | Au vert | Couche la plus dense (contrôle d'accès) ; +5 domaines (wiki, 2FA, sécurité, CSRF, observabilité) |
| UI (Playwright) | Au vert | 3 rôles, Chromium ; 2 scénarios IA neutralisés en CI (`CI_SKIP_IA`) |
| **Porte `run-all`** | **VERT** | Rejouée avant chaque livraison |
| **CI GitHub Actions** | **VERTE** | Base fraîche, sans clé, repli déterministe |

**Conception vs automatisation** — le catalogue ISTQB conçu est plus large que la suite exécutée : il décrit l'intention de test complète, dont une partie (notamment les cas UI de priorité basse/moyenne) reste à automatiser.

| Indicateur | Valeur |
|---|---|
| Cas de test conçus (catalogue) | **~1046 cas catalogués** |
| Nouveaux domaines couverts | **5** (wiki, 2FA, sécurité, CSRF, observabilité) |
| Porte de non-régression `run-all` | **VERT** |
| Intégration continue GitHub Actions | **VERTE** (base fraîche, sans clé) |

> **Hypothèse — confiance : élevée** — l'écart entre les cas conçus au catalogue et les tests exécutés n'est pas une régression : un fichier de test (ex. `auth.test.ts`) implémente plusieurs cas du catalogue, et certains cas conçus (UI basse priorité, PILOT) ne sont pas encore câblés. Conception vs exécution mesurent des choses différentes, mais cohérentes entre elles. Le catalogue est passé de 1204 à **~1046 cas catalogués** après réorganisation et ajout des 5 nouveaux domaines.

## 8. Conformité documentaire

La documentation suit la structure **IEEE 829** avec la terminologie **ISTQB**, et se compose de quatre livrables versionnés (`app/tests/docs/`), exportables en **Word via pandoc** :

| Document | Identifiant | Rôle |
|---|---|---|
| Plan de test | BOUSSOLE-PT-001 | Périmètre, niveaux, critères d'entrée/sortie, CI |
| Catalogue de cas | BOUSSOLE-CAT-001 | ~1046 cas catalogués, dont 5 nouveaux domaines |
| Matrice de traçabilité | BOUSSOLE-MAT-001 | Cas ↔ feature/endpoint ↔ test automatisé |
| Rapport d'exécution | BOUSSOLE-RAP-001 | Historique daté des verdicts (porte + CI) |

## Hypothèses

> **Hypothèse — confiance : élevée** — les chiffres reflètent l'état courant de la batterie (~1046 cas catalogués, porte `run-all` au vert, CI verte) ; ils évoluent à chaque rejeu de la porte et de la CI.

> **Hypothèse — confiance : moyenne** — l'absence de tests de performance/charge est un choix assumé lié au contexte mono-instance SQLite et académique, non un oubli. Aucun outil de charge (k6, Artillery) n'est identifié dans le dépôt.

> **Hypothèse — confiance : moyenne** — la couverture E2E vise « un scénario par fonctionnalité » ; les tests UI exécutés ne couvrent donc pas exhaustivement toutes les variantes UI conçues au catalogue (priorités basses non automatisées).

> **Hypothèse — confiance : élevée** — l'**OpenAPI/Swagger interactif** et l'**audit RGAA** ne sont **pas encore livrés** ; à ne pas présenter comme acquis.

## Risques & points d'attention

| Risque | Impact | Probabilité | Mitigation en place / à prévoir |
|---|---|---|---|
| Couverture PILOT faible | Régression non détectée sur signaux/digest | Moyenne | Prioriser l'automatisation des cas PILOT restants |
| Instabilité de l'IA | Tests fragiles | Faible | Test de contrat + units du repli ; repli déterministe forcé en CI |
| Fragilité des sélecteurs UI | Faux échecs Playwright | Moyenne | Attributs stables `data-tour` / ARIA, attentes explicites |
| Pollution du jeu de démo | Vitrine abîmée, faux négatifs | Faible | Comptes `@boussole.test` + reseed + nettoyage `afterAll` |
| Divergence base locale ↔ base neuve | Bugs de migration invisibles en local | Moyenne | **CI sur base fraîche** (a déjà détecté 2 bugs réels) |
| Dépendance Docker pour le jeton | Couplage du flux auth | Faible | Helper d'extraction isolé, dégradable |
| Mono-navigateur (Chromium) | Bugs spécifiques Firefox/Safari non vus | Faible | Hors périmètre assumé ; PWA testée sur Chromium |
| Absence d'audit a11y/RGAA formel | Non-conformité WCAG/RGAA non détectée | Moyenne | Voir [UX / UI](ux-ui) ; recommandation §ci-dessous (non encore livré) |

## Recommandations

1. **Combler l'angle mort PILOT** — porter la couverture de PILOT vers la cible des autres domaines : signaux faibles, tableau d'impact, digest hebdo sont des fonctionnalités de pilotage à enjeu.
2. **Ajouter un audit accessibilité automatisé (RGAA)** — intégrer `axe-core`/`@axe-core/playwright` dans les specs E2E pour transformer la couverture ARIA implicite en vérification WCAG/RGAA explicite (lien [UX / UI](ux-ui)). **Non encore livré.**
3. **Publier un OpenAPI/Swagger interactif** — documenter le contrat des endpoints de façon exécutable, en complément de la suite d'intégration. **Non encore livré.**
4. **Introduire un palier de performance léger** — un test de fumée de latence sur les endpoints chauds (`/api/health`, login, génération CR) suffirait à détecter une régression grossière sans viser un test de charge complet.
5. **Étendre l'automatisation des cas UI basse priorité** pour réduire l'écart conception/exécution et fiabiliser le chiffre de couverture.
6. **Surveiller la dérive du jeton Docker** — documenter une bascule si l'auth à jeton évolue, afin de ne pas coupler durablement la suite à `docker exec`.

## Pages liées

- [Matrice de traçabilité](traceability-matrix) — détail cas ↔ fonctionnalité/endpoint ↔ test automatisé
- [Spécifications fonctionnelles](functional-specifications) — les fonctionnalités testées
- [Architecture technique](technical-architecture) — stack et environnement Docker
- [Documentation API](api-documentation) — les endpoints sous contrat de test (dont wiki, 2FA, metrics)
- [Sécurité](security) — contrôle d'accès, RGPD, assainissement, rate-limit, CSP, 2FA, CSRF
- [UX / UI](ux-ui) — accessibilité et parcours E2E
- [Déploiement](deployment) — stack `:8080`, parité test/prod, CI GitHub Actions
- [Exploitation](operations) — supervision, observabilité (`/api/metrics`, `error_log`), rejeu de la porte
- [Dette technique](technical-debt) — angles morts de couverture (PILOT, a11y/RGAA, perf, OpenAPI)
