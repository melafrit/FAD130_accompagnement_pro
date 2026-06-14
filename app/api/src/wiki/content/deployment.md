# Déploiement & intégration

Cette page décrit la **topologie de déploiement réelle** de l'application Boussole, sa chaîne de construction (build), ses variables d'environnement, ainsi que les procédures de **montée de version, de rollback et de continuité de service**. Elle reflète la production telle qu'elle est exploitée : un VPS OVH (Ubuntu) sous Docker, un front Nginx servant le build Vite, une API Node 20, une base **SQLite mono-fichier**, le tout publié sur `boussole.elafrit.com` derrière un **reverse-proxy Caddy mutualisé** déjà présent sur le serveur. La contrainte structurante — un **stockage SQLite mono-instance** qui interdit la mise à l'échelle horizontale sans changement de socle de données — est traitée explicitement. La page documente aussi le **pipeline d'intégration continue** désormais livré (GitHub Actions).

> **Note de cohérence — confiance : élevée.** La spécification projet mentionne « Traefik » comme reverse-proxy. **En production, le proxy de façade réel est Caddy** (container `formaplanner-caddy-1`, ports 80/443, certificats Let's Encrypt), mutualisé avec l'application *FormaPlanner*. Cette page documente l'état réellement déployé. Voir [ADR](adr) pour la décision et la [Dette technique](technical-debt) pour le suivi de l'écart documentaire.

## Objectifs de la page

- Donner une vue d'ensemble **exploitable** de la topologie de déploiement (qui parle à qui, sur quels ports, via quels réseaux Docker).
- Documenter la **chaîne de build** des deux images (API et web) et les **variables d'environnement** requises.
- Décrire les procédures de **mise à jour**, de **rollback** et de **continuité de service** (faible indisponibilité acceptée en mono-instance).
- Formaliser le **pipeline d'intégration et de livraison** (CI GitHub Actions → tests `run-all` → image → déploiement).
- Expliciter la **contrainte mono-instance SQLite** et ses implications de scalabilité.

## 1. Topologie de déploiement

### 1.1 Vue d'ensemble

L'architecture de production repose sur **trois acteurs Docker** : le proxy de façade Caddy (préexistant, mutualisé), le container `boussole-web` (Nginx + build React/Vite, qui proxifie aussi `/api`), et le container `boussole-api` (Node 20 + Express). La base SQLite est un **volume hôte** monté dans l'API.

```mermaid
flowchart TB
  user["Navigateur utilisateur"]
  dns["DNS OVH<br/>boussole.elafrit.com → IP VPS"]

  subgraph vps["VPS OVH (Ubuntu, Docker)"]
    caddy["Caddy de façade<br/>formaplanner-caddy-1<br/>:80 / :443 — TLS Let's Encrypt"]

    subgraph edge["réseau Docker 'edge' (formaplanner_formaplanner)"]
      web["boussole-web<br/>Nginx :80<br/>sert le build Vite + proxy /api"]
    end

    subgraph interne["réseau Docker 'interne' (bridge, privé)"]
      api["boussole-api<br/>Node 20 + Express :3000"]
      vol[("volume ./data<br/>boussole.sqlite (WAL)")]
    end

    caddy -->|"reverse_proxy boussole-web:80"| web
    web -->|"proxy_pass /api → :3000"| api
    api -->|"better-sqlite3 (synchrone)"| vol
  end

  user -->|HTTPS| dns --> caddy
  api -.->|"HTTPS sortant"| anthropic["API Anthropic (Claude)"]
  api -.->|"HTTPS sortant"| brevo["Brevo (emails transactionnels)"]
```

**Lecture du diagramme.** Le trafic entrant arrive en HTTPS sur Caddy, qui détient seul les ports 80/443 et gère les certificats Let's Encrypt. Caddy relaie vers `boussole-web` (Nginx) via le réseau `edge` partagé. Nginx sert les fichiers statiques du build React et proxifie tout `/api/` vers `boussole-api` sur le réseau `interne` privé. L'API accède à la base SQLite via un volume hôte monté (`./data`). Deux flux sortants existent : vers l'API Anthropic (IA, avec repli déterministe si indisponible) et vers Brevo (emails). **L'API n'est jamais exposée directement à Internet** : elle n'est joignable que depuis le réseau `interne`.

### 1.2 Inventaire des composants déployés

| Composant | Image / base | Port exposé | Réseau Docker | Rôle |
|---|---|---|---|---|
| `boussole-api` | `node:20-bookworm-slim` (build natif `better-sqlite3`) | `3000` (interne uniquement) | `interne` | API Express, logique métier, IA, base SQLite |
| `boussole-web` | build `node:20-alpine` → `nginx:alpine` | `80` (vers Caddy) | `interne` + `edge` | Sert le build Vite ; proxifie `/api` vers l'API |
| Caddy (façade) | `formaplanner-caddy-1` (préexistant) | `80` / `443` (publics) | `edge` (`formaplanner_formaplanner`) | TLS Let's Encrypt + routage HTTP(S) |
| Volume `./data` | volume hôte (`/opt/boussole/app/data`) | — | — | Persistance SQLite (`boussole.sqlite` + WAL) |

> **Hypothèse — confiance : moyenne.** Le proxy de façade est piloté par un **Caddyfile statique** (`/opt/FormaPlanner/Caddyfile`) qui **ne lit pas les labels Docker** : la publication d'un site se fait en ajoutant un bloc puis en rechargeant Caddy à chaud. C'est la raison pour laquelle le routage n'est pas déclaré via labels dans `docker-compose.yml`.

### 1.3 Réseaux Docker

| Réseau | Type | Membres | Justification |
|---|---|---|---|
| `interne` | `bridge` (créé par le compose) | `boussole-api`, `boussole-web` | Isole l'API ; seul le web la joint (`boussole-api:3000` via Docker DNS) |
| `edge` | `external` (`formaplanner_formaplanner`) | `boussole-web`, Caddy | Permet à Caddy d'atteindre le front sans publier de port public |

L'API **ne publie aucun port** : c'est un choix de sécurité (cf. [Sécurité](security)). En local, le compose `docker-compose.local.yml` publie en revanche le front sur `localhost:8080` et n'utilise pas le réseau `edge`.

## 2. Chaîne de build

### 2.1 Image API (`app/api/Dockerfile`)

Image **mono-étage** sur `node:20-bookworm-slim` (Debian) — choisie volontairement plutôt qu'Alpine pour **compiler nativement `better-sqlite3`** (toolchain `python3 make g++`).

| Étape | Commande | Effet |
|---|---|---|
| 1. Toolchain native | `apt-get install python3 make g++` | Permet la compilation de `better-sqlite3` |
| 2. Dépendances | `npm install` | Installe les paquets (lockfile copié d'abord pour le cache de couche) |
| 3. Compilation TS | `npm run build` (`tsc` → `dist/`) | Transpile TypeScript en JavaScript |
| 4. Exécution | `CMD ["node", "dist/index.js"]` | Démarre l'API sur le port `3000` |

### 2.2 Image web (`app/web/Dockerfile`)

Image **multi-étage** : un étage de build (`node:20-alpine`) qui produit le bundle Vite, puis un étage d'exécution **`nginx:alpine`** ne contenant que les fichiers statiques et la configuration Nginx.

| Étape | Base | Commande | Effet |
|---|---|---|---|
| 1. Build front | `node:20-alpine` | `npm install` puis `npm run build` | Produit le bundle statique dans `dist/` |
| 2. Runtime | `nginx:alpine` | copie `nginx.conf` + `dist/` → `/usr/share/nginx/html` | Sert le SPA et proxifie `/api` |

La configuration Nginx (`app/web/nginx.conf`) assure deux fonctions clés : le **fallback SPA** (`try_files $uri $uri/ /index.html`) pour le routage côté client (react-router), et le **proxy `/api/`** vers `http://boussole-api:3000` avec transmission des en-têtes `X-Forwarded-*`. Elle pose également les en-têtes de durcissement sur le document HTML de la SPA (CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` — cf. [Sécurité](security)).

```mermaid
flowchart LR
  subgraph build_web["Build image web (multi-étage)"]
    direction TB
    b1["node:20-alpine"] --> b2["npm install"] --> b3["npm run build (Vite)"] --> b4["dist/"]
    b4 --> n1["nginx:alpine + nginx.conf"]
  end
  subgraph build_api["Build image API (mono-étage)"]
    direction TB
    a1["node:20-bookworm-slim"] --> a2["apt: python3 make g++"] --> a3["npm install"] --> a4["npm run build (tsc → dist/)"] --> a5["node dist/index.js"]
  end
```

**Lecture du diagramme.** À gauche, l'image web compile le front avec Vite puis ne conserve que le résultat statique servi par Nginx (image finale légère, sans Node). À droite, l'image API installe la toolchain native, compile `better-sqlite3` à l'installation puis transpile le TypeScript ; l'image finale embarque Node et le binaire SQLite natif. Les deux builds sont orchestrés par `docker compose up -d --build`.

### 2.3 Durée et coût de build

> **Hypothèse — confiance : moyenne.** Le guide de déploiement indique un build complet d'environ **2 à 3 minutes**, dominé par la **compilation native de `better-sqlite3`**. Le cache de couches Docker (lockfiles copiés avant le code source) réduit fortement les rebuilds lorsque seules les sources changent.

## 3. Variables d'environnement

Les secrets et paramètres sont injectés via un fichier `app/.env` (hors Git, modèle : `app/.env.example`). En production, `docker-compose.yml` charge ce fichier (`env_file: .env`) pour l'API.

| Variable | Rôle | Production | Sensible |
|---|---|---|---|
| `DOMAIN` | Domaine public | `boussole.elafrit.com` | Non |
| `APP_URL` | Base des liens emails | `https://boussole.elafrit.com` | Non |
| `EDGE_NETWORK` | Réseau du Caddy de façade | `formaplanner_formaplanner` | Non |
| `NODE_ENV` | Mode d'exécution | `production` | Non |
| `PORT` | Port d'écoute de l'API | `3000` | Non |
| `DB_PATH` | Chemin du fichier SQLite | `/app/data/boussole.sqlite` | Non |
| `SESSION_SECRET` | Secret de session | `openssl rand -hex 32` | **Oui** |
| `JWT_SECRET` | Signature des cookies JWT | `openssl rand -hex 32` | **Oui** |
| `ANTHROPIC_API_KEY` | Clé Claude (IA) | clé Anthropic | **Oui** |
| `ANTHROPIC_MODEL_REALTIME` | Modèle temps réel | `claude-sonnet-4-6` | Non |
| `ANTHROPIC_MODEL_REPORT` | Modèle pour CR/synthèses | `claude-opus-4-8` | Non |
| `BREVO_API_KEY` | Clé emails transactionnels | clé Brevo | **Oui** |
| `MAIL_FROM` | Expéditeur des emails | `contact@elafrit.com` | Non |
| `ADMIN_EMAIL` | Compte admin initial (seed) | `mohamed@elafrit.com` | Non |
| `ACCOMPAGNATEUR_EMAIL` | Compte accompagnateur initial | `elafrit.mohamed@gmail.com` | Non |
| `SEED_PASSWORD` | Mode démo vs. production | **vide en prod réelle** | **Oui (si défini)** |
| `RATE_LIMIT_DISABLED` | Neutralise le rate-limiting | **vide/0 en prod** (activé) | Non |
| `CSRF_DISABLED` | Neutralise la protection CSRF | **vide/0 en prod** (activé) | Non |

> **Point d'attention `SEED_PASSWORD`.** S'il est **défini**, l'application charge un **jeu de démo complet réinitialisé à chaque démarrage** (2 accompagnateurs, 3 accompagnés, 6 dossiers) — idéal pour l'oral, **destructeur de toute donnée réelle**. En **production réelle, il doit rester vide** : seuls l'admin et l'accompagnateur sont créés, l'activation se fait par email. Voir [Guide d'administration](admin-guide).

> **Point d'attention `RATE_LIMIT_DISABLED` / `CSRF_DISABLED`.** Ces deux interrupteurs sont prévus pour **désactiver le rate-limiting et la protection CSRF en local et en test** (notamment pour la CI, qui rejoue les scénarios sans heurter les limiteurs). En **production, ils doivent rester vides** (mesures actives). Voir [Sécurité](security).

Sans `ANTHROPIC_API_KEY`, l'IA bascule sur son **repli déterministe** (jamais de 500). Sans `BREVO_API_KEY`, les emails sont journalisés dans les logs au lieu d'être envoyés. Ces dégradations sont gracieuses et permettent un fonctionnement minimal sans comptes externes — c'est aussi ce qui rend la **CI reproductible sans secret** (voir §6).

## 4. Montée de version, rollback et continuité de service

### 4.1 Montée de version (`deploy.sh`)

Un script versionné (`deploy.sh`, déployé en `/opt/boussole/deploy.sh`) automatise la mise à jour. Il est idempotent et **ne touche ni à Caddy ni à l'application voisine FormaPlanner**.

```mermaid
sequenceDiagram
  autonumber
  participant Op as Exploitant
  participant Sh as deploy.sh
  participant Git as GitHub (main)
  participant Dk as Docker Compose
  participant Px as Caddy (façade)

  Op->>Sh: /opt/boussole/deploy.sh
  Sh->>Git: git pull --ff-only origin main
  Note over Sh: si deploy.sh a changé,<br/>se relance (BOUSSOLE_REEXEC)
  Sh->>Sh: garde-fou : .env présent ?
  Sh->>Dk: docker compose up -d --build
  Dk-->>Sh: boussole-api + boussole-web recréés
  Sh->>Dk: docker image prune -f
  Sh->>Px: curl https://boussole.elafrit.com
  Px-->>Sh: HTTP 200 attendu
  Note over Sh,Px: si 502 → recharger Caddy une fois
```

**Lecture du diagramme.** Le script récupère le dernier code de `main`, se relance si lui-même a été modifié, vérifie la présence du `.env` (garde-fou), reconstruit et relance les containers, nettoie les images orphelines, puis teste l'URL HTTPS publique. Comme le container `boussole-web` est recréé **avec le même nom**, le Docker DNS le re-résout automatiquement : Caddy continue de router sans reconfiguration. En cas de `502` transitoire, un simple `caddy reload` suffit.

### 4.2 Rollback (image / commit précédent)

| Scénario | Procédure | Données |
|---|---|---|
| Régression applicative | `git checkout <commit_ok>` dans `/opt/boussole` puis `docker compose up -d --build` | Préservées (volume `./data` intact) |
| Image défaillante | Conserver l'image précédente (`docker images`) et relancer le container sur l'ancien tag | Préservées |
| Corruption de base | Restaurer la dernière sauvegarde SQLite (`cp ~/backups/boussole-AAAA-MM-JJ.sqlite data/boussole.sqlite`) | Restaurées à la date de sauvegarde |

> **Hypothèse — confiance : moyenne.** Le rollback applicatif repose aujourd'hui sur le **retour au commit précédent + rebuild**, et non sur un **registre d'images taguées** (pas de registry privé identifié dans le code). Un tagging d'images (`boussole-api:<sha>`) accélérerait le rollback sans rebuild. Voir [Recommandations](#recommandations).

### 4.3 Continuité de service (mono-instance)

L'architecture étant **mono-instance**, une montée de version implique une **brève indisponibilité** (recréation des containers, ~quelques secondes à dizaines de secondes selon le rebuild). Ce n'est **pas** du zéro-downtime au sens strict, mais une **faible indisponibilité maîtrisée**, acceptable pour le contexte académique et le volume d'usage attendu.

| Propriété | État réel | Commentaire |
|---|---|---|
| Zéro-downtime strict | **Non** | Mono-instance : recréation = court arrêt |
| Faible indisponibilité | **Oui** | Quelques secondes ; build à chaud côté serveur |
| Bascule sans coupure du proxy | **Oui** | Caddy non touché ; même nom de container re-résolu |
| Drain / health-check de bascule | *Information non identifiée dans le code ou la conversation.* | Pas d'orchestration blue-green détectée |

## 5. Intégration continue (CI/CD)

L'**intégration continue est désormais livrée** : un workflow **GitHub Actions** (`.github/workflows/ci.yml`) rejoue la **non-régression à chaque push** sur une **base fraîche**, **sans clé Anthropic**. C'est la concrétisation automatisée de la porte `run-all` décrite au §6.

### 5.1 Ce que rejoue la CI

| Lot | Contenu | Outil |
|---|---|---|
| Tests unitaires | Logique métier, services, utilitaires | Vitest |
| Intégration API | Endpoints Express sur base SQLite neuve | Vitest (supertest) |
| UI end-to-end | Parcours utilisateur dans un navigateur | Playwright |

La suite est jouée sur une **base de données fraîche** recréée par le workflow (reseed/migrations à blanc), ce qui garantit la **reproductibilité** d'un run à l'autre et détecte les régressions qui n'apparaissent pas sur une base déjà migrée localement.

### 5.2 Reproductibilité sans secret : repli IA déterministe

La CI tourne **sans `ANTHROPIC_API_KEY`** : l'IA bascule automatiquement sur son **repli déterministe**, ce qui rend les exécutions **reproductibles et indépendantes de tout secret**. Le drapeau **`CI_SKIP_IA`** neutralise par ailleurs **2 scénarios E2E** de génération IA (qui dépendraient d'un appel réel). De même, `RATE_LIMIT_DISABLED` et `CSRF_DISABLED` permettent aux scénarios de ne pas heurter les protections de production.

```mermaid
flowchart LR
  push["git push<br/>(toute branche / PR)"] --> ci["GitHub Actions<br/>.github/workflows/ci.yml"]
  ci --> base["Base SQLite FRAÎCHE<br/>(migrations / reseed à blanc)"]
  base --> unit["Tests unitaires<br/>(Vitest)"]
  unit --> apit["Intégration API<br/>(Vitest)"]
  apit --> e2e["UI E2E<br/>(Playwright)"]
  e2e -->|"vert"| ok["✅ build OK<br/>feu vert au déploiement"]
  e2e -->|"rouge"| ko["⛔ échec<br/>régression bloquée"]
  ci -. "sans ANTHROPIC_API_KEY<br/>→ repli IA déterministe<br/>CI_SKIP_IA = 2 scénarios" .- base
```

**Lecture du diagramme.** Chaque push déclenche le workflow, qui provisionne une base neuve puis enchaîne unitaires → API → E2E. Sans clé Anthropic, l'IA répond en mode repli déterministe ; deux scénarios E2E de génération IA sont neutralisés par `CI_SKIP_IA`. Un échec **bloque la régression** ; un run vert donne le feu vert au déploiement (`deploy.sh`).

> **La CI a déjà prouvé sa valeur.** Elle a détecté **2 bugs réels invisibles en local** : (1) l'anonymisation RGPD partait en **500 sur une base neuve** (colonnes `demandes_effacement.action` / `traite_le` ajoutées par un `ALTER` s'exécutant *avant* le `CREATE` correspondant) ; (2) un **middleware d'erreur** forçait un `500` sur des erreurs de parsing qui auraient dû rester en `400`. Ces deux défauts n'apparaissaient que sur une **base fraîche**, exactement le scénario rejoué par la CI.

> **Périmètre actuel — honnêteté.** Le pipeline couvre **l'intégration continue** (build + tests sur base fraîche, à chaque push). Le **déploiement continu (CD)** vers le VPS reste **manuel** : l'exploitant lance `deploy.sh` sur le serveur après un run vert. Le déclenchement automatique du déploiement n'est **pas encore livré**.

## 6. Pipeline de livraison

La porte de non-régression est **doublement assurée** : localement par la commande unique **`run-all`** (reseed base de démo → tests unitaires → API → UI E2E → rapport), et automatiquement par la **CI GitHub Actions** (§5) à chaque push. La batterie compte désormais **~1046 cas** (1204 d'origine + 5 nouveaux domaines : wiki, 2FA, sécurité, CSRF, observabilité), gate **`run-all` au vert**.

```mermaid
flowchart LR
  s1["Commit / push<br/>sur main"] --> ci["CI GitHub Actions<br/>(base fraîche, sans clé IA)"]
  ci -->|"vert"| s4["Construction image<br/>docker compose build"]
  ci -->|"rouge"| stop["⛔ blocage<br/>pas de déploiement"]
  s4 --> s5["Déploiement (manuel)<br/>deploy.sh (git pull + up -d)"]
  s5 --> s6["Contrôle HTTPS<br/>curl 200 + logs"]
```

**Lecture du diagramme.** L'**intégration** est automatisée (CI bloquante sur base fraîche). La **livraison** reste **opérée manuellement** : après un run vert, l'exploitant déclenche `deploy.sh` sur le serveur. L'automatisation complète du déploiement (CD déclenché sur `main`) est un objectif, pas encore un acquis.

| Étape | Outil actuel | Statut |
|---|---|---|
| Intégration continue (build + tests sur base fraîche, à chaque push) | GitHub Actions (`.github/workflows/ci.yml`) | **Développé** |
| Tests `run-all` (porte de non-régression locale) | Vitest + Playwright | **Développé** |
| Build des images | `docker compose build` | **Développé** |
| Image / runtime | `docker compose up --build` | **Développé** |
| Déploiement serveur | `deploy.sh` (manuel, après run vert) | **Développé** |
| Déploiement continu automatisé (CD déclenché sur `main`) | — | *Non livré.* (**prévu / absent**) |

## 7. Contrainte mono-instance SQLite

C'est la contrainte d'architecture la plus structurante pour le déploiement. SQLite via `better-sqlite3` est un moteur **embarqué mono-fichier, à accès synchrone**, lié au **système de fichiers local** de l'API (volume `./data`).

| Implication | Détail | Conséquence déploiement |
|---|---|---|
| Pas de scale horizontal | Plusieurs instances API → écritures concurrentes sur le même fichier → corruption / verrous | **Une seule instance API** |
| Couplage au volume hôte | La base vit sur le disque du VPS | Sauvegarde/restauration = **copie de fichier** |
| Pas de réplication native | Aucun cluster ni réplica | Disponibilité = celle de l'unique VPS |
| Mise à jour = court arrêt | Recréation de l'instance unique | Faible indisponibilité assumée |

Le passage à une mise à l'échelle horizontale (plusieurs API derrière un load-balancer) **exige un changement de socle de données** (PostgreSQL ou équivalent client-serveur). C'est un choix délibéré et documenté : la simplicité opérationnelle prime sur la scalabilité pour ce projet. Voir [Architecture des données](data-architecture) et l'[ADR](adr) correspondant.

## Hypothèses

> **Hypothèse — confiance : élevée.** Le reverse-proxy de production est **Caddy** (mutualisé `formaplanner-caddy-1`), pas Traefik comme l'indique la spécification. Cette page documente l'état déployé réel.

> **Hypothèse — confiance : moyenne.** Durée de build ~2-3 min (dominée par `better-sqlite3`) ; aucune métrique instrumentée dans le code.

> **Fait — confiance : élevée.** L'**intégration continue est livrée** (GitHub Actions, `.github/workflows/ci.yml`) : tests unitaires + API + UI E2E rejoués sur **base fraîche, sans clé Anthropic** (repli IA déterministe, `CI_SKIP_IA` neutralisant 2 scénarios). Le **déploiement reste manuel** (`deploy.sh` après run vert) : pas de CD automatisé ni de registry d'images privé identifiés.

> **Hypothèse — confiance : élevée.** Les sauvegardes SQLite sont des **copies de fichier** (sauvegarde « online » horodatée quotidienne avec rétention, `backups.ts`) ; l'ordonnancement précis (cron) côté hôte n'est pas figé dans le code. *Détail de l'automatisation hôte non identifié dans le code.*

## Risques & points d'attention

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| **SPOF VPS unique** (mono-instance, mono-serveur) | Moyenne | Élevé | Sauvegardes régulières ; `restart: unless-stopped` ; supervision |
| **Indisponibilité pendant la montée de version** | Élevée | Faible | Acceptée (court arrêt) ; déploiement hors heures de pointe |
| **`SEED_PASSWORD` laissé défini en prod** | Moyenne | **Critique** (efface les données réelles à chaque démarrage) | Garde-fou documentaire ; vérification au déploiement |
| **Protections désactivées en prod** (`RATE_LIMIT_DISABLED` / `CSRF_DISABLED` laissés à 1) | Faible | Élevé | Doivent rester vides en prod ; revue du `.env` au déploiement |
| **Perte de la base SQLite** (volume non sauvegardé) | Moyenne | Élevé | Sauvegarde automatisée + rétention hors VPS recommandée |
| **Couplage au proxy mutualisé** (Caddyfile partagé) | Faible | Moyen | Sauvegarde du Caddyfile avant modif ; `caddy validate` avant `reload` |
| **Fuite de secrets** (`.env`, clés Anthropic/Brevo) | Faible | Élevé | `.env` hors Git ; rotation possible (`docker compose restart`) |
| **502 après redéploiement** | Faible | Faible | `caddy reload` ponctuel ; `deploy.sh` le signale |
| **Absence de tag d'image** (rollback = rebuild) | Moyenne | Moyen | Tagging d'images recommandé |
| **Déploiement non automatisé** (CD manuel après CI verte) | Moyenne | Faible | CI bloquante en amont ; CD déclenché sur `main` recommandé |

## Recommandations

1. **Aligner la documentation sur la réalité** : corriger « Traefik » en « Caddy » dans la spécification, ou tracer l'écart dans la [Dette technique](technical-debt) et un [ADR](adr).
2. **Automatiser la sauvegarde SQLite côté hôte** : ordonnancement `cron` quotidien avec **rétention hors VPS** (copie chiffrée externe) ; tester une restauration. La sauvegarde « online » applicative (`backups.ts`) existe déjà.
3. **Taguer les images** (`boussole-api:<sha>`, `boussole-web:<sha>`) pour un rollback **sans rebuild** ; conserver les N dernières.
4. **Garde-fou `SEED_PASSWORD`** : ajouter au `deploy.sh` un avertissement bloquant si `SEED_PASSWORD` est non vide alors que `NODE_ENV=production`, afin de prévenir l'effacement accidentel de données réelles. Étendre le garde-fou à `RATE_LIMIT_DISABLED` / `CSRF_DISABLED`.
5. **Compléter la CI en CD** : déclencher automatiquement `deploy.sh` (ou un équivalent) après un run vert sur `main`, pour passer de l'intégration continue au **déploiement continu**.
6. **Documenter le seuil de bascule SQLite → PostgreSQL** : définir les critères (volume, concurrence, besoin de HA) qui justifieraient le changement de socle et la mise à l'échelle horizontale.

## Pages liées

- [Architecture technique](technical-architecture) — vue d'ensemble de la stack et des composants.
- [Architecture des données](data-architecture) — modèle SQLite, contrainte mono-fichier.
- [Exploitation](operations) — supervision, sauvegardes, incidents en production.
- [Sécurité](security) — secrets, isolation réseau, TLS, rate-limiting, CSRF, 2FA, RGPD.
- [Stratégie de tests](testing-strategy) — la porte `run-all` et la CI GitHub Actions.
- [Guide d'administration](admin-guide) — comptes seed, mode démo vs. production.
- [Registre des risques](risk-register) — risques d'exploitation consolidés.
- [Dette technique](technical-debt) — écart Traefik/Caddy, CD non automatisé.
- [Décisions d'architecture (ADR)](adr) — choix SQLite, reverse-proxy, mono-instance.
