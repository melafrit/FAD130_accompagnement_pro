# Boussole — application d'accompagnement

Compagnon d'entretien pour accompagner les personnes en transition professionnelle.
Projet développé dans le cadre de l'UE **FAD130** (Cnam). Voir le
[cahier des charges](../livrables/Cahier_des_charges_application_V2.md) et le
[guide de déploiement](../livrables/Guide_deploiement_Boussole.md).

## Structure (monorepo)

```
app/
├─ web/                 Frontend React (Vite + TypeScript) — interface "apaisant & confiance"
├─ api/                 Backend Node.js (Express + TypeScript) — SQLite, Claude, DOCX
├─ docker-compose.yml   Orchestration (coexiste avec le reverse proxy existant du VPS)
└─ .env.example         Variables d'environnement (copier en .env)
```

## Stack
- **Front** : React + Vite + TypeScript
- **Back** : Node.js + Express + TypeScript, base **SQLite** (better-sqlite3)
- **IA** : Claude API (Sonnet en temps réel, Opus pour les comptes rendus)
- **Emails** : Brevo · **Déploiement** : Docker + Traefik (HTTPS) sur VPS OVH

## Lancer en local (pour tester)

### Option A — Mode développement (Node)
Dans **deux terminaux** :
```bash
# Terminal 1 — API (port 3000)
cd app/api
npm install
npm run dev        # → http://localhost:3000/api/health

# Terminal 2 — Front (port 5173, proxifie /api vers 3000)
cd app/web
npm install
npm run dev        # → http://localhost:5173
```
Ouvre **http://localhost:5173**.

**Tester l'inscription sans clé email** : crée un compte → le lien d'activation s'affiche dans les **logs de l'API** (Terminal 1, ligne `[mailer:DEV] …`) → ouvre ce lien → connecte-toi.

> 🪟 **Windows** : si `npm install` de l'API échoue à compiler `better-sqlite3`, installe les outils de build C++ (Visual Studio Build Tools → « Desktop development with C++ »), **ou** utilise l'option B (Docker — aucune compilation locale).

### Option B — Docker en local (recommandé, comme en prod)
Aucune compilation native ; tout tourne en conteneurs Linux :
```bash
cd app
docker compose -f docker-compose.local.yml up --build      # → http://localhost:8080
docker compose -f docker-compose.local.yml logs -f boussole-api   # voir les liens d'email
docker compose -f docker-compose.local.yml down            # arrêter
```

> Les clés **Anthropic / Brevo** ne sont pas nécessaires pour tester l'inscription/connexion (emails journalisés). Elles le deviendront pour le questionnaire IA et l'envoi réel d'emails.

### Comptes de démo (local)
Avec `SEED_PASSWORD` défini (déjà le cas dans `docker-compose.local.yml`), trois comptes sont **prêts à l'emploi** — mot de passe : **`BoussoleDemo2026`** :

| Rôle | Email | Mot de passe |
|---|---|---|
| Admin | `mohamed@elafrit.com` | `BoussoleDemo2026` |
| Accompagnateur (Mohamed) | `elafrit.mohamed@gmail.com` | `BoussoleDemo2026` |
| Accompagné (Amine) | `afrit_mohamed@yahoo.fr` | `BoussoleDemo2026` |

> Sur une **base neuve**, un **jeu de données de démonstration** est chargé automatiquement : Amine a déjà rempli son questionnaire initial et passé **3 entretiens** (comptes rendus 1 & 2 générés), avec plan d'action, rendez-vous et **grille d'auto-évaluation pré-remplie**. Le dossier reste « en cours » pour montrer la clôture en direct. Pour repartir d'une base propre : `docker compose -f docker-compose.local.yml down && rm -rf data && docker compose -f docker-compose.local.yml up -d --build`.

> En **production**, laisse `SEED_PASSWORD` vide : les comptes seed s'activent alors via le lien reçu par email.

## Production (Docker)
```bash
cp .env.example .env   # puis remplir (clés, domaine, réseau du proxy)
docker compose build
docker compose up -d
```
> ⚠️ Boussole s'attache au **reverse proxy existant** du VPS (réseau `PROXY_NETWORK`) et ne prend pas les ports 80/443. Le nom du réseau/certresolver est à confirmer au déploiement (voir guide §2).

## État d'avancement
- [x] Squelette monorepo (web + api), page d'accueil contextuelle, schéma SQLite, Docker/compose
- [x] Auth (inscription + validation email Brevo + reset MDP + consentement RGPD), comptes seed, pages connexion/inscription/reset, mentions légales
- [x] Questionnaire initial adaptatif (Claude + parcours de secours), espace personnel par rôle, garde d'authentification, **prise de RDV** (créneaux accompagnateur, réservation accompagné, confirmations email + notifications)
- [x] Entretien guidé (6 phases) + transcription vocale (Web Speech) + suggestions IA (Claude + parcours de secours)
- [x] Génération du compte rendu DOCX (Claude + repli), téléchargement, ré-import, publication à l'accompagné
- [x] Tableau de bord (accompagnateur) + plan d'action (accompagnateur & accompagné) + notifications in-app + recherche par étiquettes (tags)
- [x] Page Méthode (les phases de l'entretien : 6 phases + 8 principes + garde-fous IA) + Onglet Aide (transparence + synthèse du cahier des charges)
- [x] Pages légales : mentions légales, CGU, politique de confidentialité (RGPD)
- [x] Espace administrateur (gestion des comptes : création, rôle, activation/désactivation, rattachement accompagné↔accompagnateur)
- [x] Parcours / Dossier : timeline (questionnaire → entretiens datés + CR → RDV → plan d'action → clôture), entretiens multiples, « reprendre plus tard » / « clôturer + CR » à toute phase, clôture de la démarche + synthèse finale, CR du questionnaire initial
