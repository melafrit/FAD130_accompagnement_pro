# Boussole 🧭

> Plateforme d'**accompagnement à la rédaction de mémoires** — l'IA aide l'accompagnateur à poser les bonnes questions et à tenir une posture juste, puis produit un compte rendu structuré et un plan d'action.

*A web app that helps mentors guide students writing their dissertations: AI-assisted interviews, structured reports, action plans and reflective tools. French UI. Open source.*

[![CI](https://github.com/melafrit/FAD130_accompagnement_pro/actions/workflows/ci.yml/badge.svg)](https://github.com/melafrit/FAD130_accompagnement_pro/actions/workflows/ci.yml)
[![Code : AGPL-3.0](https://img.shields.io/badge/code-AGPL--3.0-blue.svg)](LICENSE)
[![Docs : CC BY-NC-SA 4.0](https://img.shields.io/badge/docs-CC%20BY--NC--SA%204.0-lightgrey.svg)](LICENSE-CONTENT.txt)
[![Stack](https://img.shields.io/badge/stack-React%20%C2%B7%20Express%20%C2%B7%20SQLite-success.svg)](#pile-technique)
![Tests](https://img.shields.io/badge/tests-959%2F961%20✅-success.svg)

Projet développé dans le cadre de l'UE **FAD130** (Cnam) — *Accompagner le parcours de formation et de transition professionnelle*.

---

## Sommaire

- [Aperçu](#aperçu)
- [Fonctionnalités](#fonctionnalités)
- [Pile technique](#pile-technique)
- [Démarrage rapide (Docker)](#démarrage-rapide-docker)
- [Développement](#développement)
- [Tests](#tests)
- [Documentation](#documentation)
- [Sécurité](#sécurité)
- [Feuille de route](#feuille-de-route)
- [Contribuer](#contribuer)
- [Auteur & licence](#auteur--licence)

## Aperçu

Boussole s'adresse à deux profils :

- **L'accompagnateur** mène des entretiens guidés en 6 phases, avec un co‑pilote IA, un miroir réflexif de posture, et génère des comptes rendus + plans d'action.
- **L'accompagné** (étudiant·e / alternant·e) démarre un ou plusieurs parcours, répond à un questionnaire initial, prend rendez‑vous, suit sa progression sur une « boussole », et dispose d'outils d'émergence (problématisation, fil rouge, résumé « où j'en suis »).

Un **administrateur** gère les comptes, les offres d'abonnement (activation de fonctionnalités) et dispose d'un **wiki documentaire interne** complet (cadrage, architecture, sécurité, exploitation…).

L'IA utilisée est **Claude (Anthropic)** ; **chaque fonctionnalité IA possède un repli déterministe** pour ne jamais dépendre d'un service externe.

## Fonctionnalités

**Socle** — questionnaire initial, entretien guidé (6 phases), comptes rendus, rendez‑vous, plan d'action SMART, synthèse de parcours, grille d'auto‑évaluation, multi‑parcours.
**IA & posture** — miroir réflexif, co‑pilote d'entretien, banque de questions, coach de posture, débriefing à chaud, replay annoté, bilan de pratique.
**Relationnel & émergence** — météo intérieure, roue des émotions, micro‑journal, fil rouge, moments‑clés, nuage de thèmes, problématisation, résumé d'avancement.
**Pilotage** — détection de décrochage, tableau d'impact, digest hebdomadaire.
**Collaboration & éthique** — mutualisation entre pairs, transparence RGPD, carte du parcours, attestation de fin.
**Confort & adoption** — visio, PWA & notifications push, export PDF, tour guidé, mode FALC (« facile à lire et à comprendre »).

Soit **38 fonctionnalités**, activables par **plan d'abonnement** (Découverte / Essentiel / Pro).

## Pile technique

| Couche | Technologies |
|---|---|
| Frontend | React 18, Vite, TypeScript, react-router, contextes React, CSS maison |
| Backend | Node 20, Express, TypeScript, SQLite (better‑sqlite3), zod |
| Auth | JWT en cookie httpOnly, bcrypt |
| IA / Email | Claude (Anthropic) avec repli déterministe · Brevo |
| Déploiement | Docker, Traefik (reverse‑proxy + TLS) |
| Tests | Vitest (unitaire + intégration API) · Playwright (E2E) — **959/961 ✅** |

## Démarrage rapide (Docker)

```bash
git clone https://github.com/melafrit/FAD130_accompagnement_pro.git
cd FAD130_accompagnement_pro/app
cp .env.example .env      # renseigner les variables (voir ci-dessous)
docker compose -f docker-compose.local.yml up -d --build
```

Application : <http://localhost:8080>.

> **Comptes de démonstration** : créés par le jeu de démo en **local uniquement**. Ne déployez **jamais** ces comptes/identifiants en production (voir [Sécurité](#sécurité)).

Variables d'environnement principales (voir [`app/.env.example`](app/.env.example)) : `JWT_SECRET`, `ANTHROPIC_API_KEY`, clés Brevo et VAPID (web‑push), `DB_PATH`, `PORT`.

## Développement

```bash
# Backend
cd app/api && npm install && npm run dev      # http://localhost:3000

# Frontend
cd app/web && npm install && npm run dev      # http://localhost:5173
```

## Tests

La batterie de non‑régression (porte de qualité) se rejoue par une commande unique :

```bash
cd app/tests
bash run-all.sh        # reseed → unitaire → API → UI → rapport
```

Documentation de test conforme **ISTQB / IEEE 829** dans `app/tests/docs/` (plan, catalogue de 1204 cas, matrice de traçabilité, rapport, export Word).

## Documentation

La documentation projet complète vit dans un **wiki interne** (réservé aux administrateurs) accessible sous `/admin/wiki` : résumé exécutif, charte, cahier des charges, business case, études d'opportunité et de faisabilité, architecture (technique / données / API), sécurité, stratégie de tests, exploitation, déploiement, roadmap, registre des risques, ADR, guides et glossaire — avec diagrammes Mermaid et exports Markdown/DOCX/PDF.

## Sécurité

- Authentification par JWT en cookie httpOnly, mots de passe hachés (bcrypt), validation des entrées (zod), en‑têtes de sécurité (helmet), cloisonnement par propriétaire au niveau de l'API.
- **En production** : définir un `JWT_SECRET` fort, **ne pas** initialiser les comptes de démonstration, et changer tout mot de passe par défaut.
- Vulnérabilité détectée ? Voir [`SECURITY.md`](SECURITY.md).

## Feuille de route

Durcissement sécurité (rate‑limiting, CSRF, CSP, 2FA), CI, observabilité, partage public du wiki en lecture seule, i18n (EN), génération OpenAPI. Détail dans le wiki (`/admin/wiki/roadmap`).

## Contribuer

Les contributions sont les bienvenues — voir [`CONTRIBUTING.md`](CONTRIBUTING.md). Le projet est sous copyleft (AGPL‑3.0) : toute version modifiée distribuée, **y compris en service en ligne**, doit publier son code source.

## Auteur & licence

**Auteur unique et titulaire des droits : Mohamed El Afrit** — <https://www.mohamedelafrit.com>

Projet **open source** en **double licence** :

- **Code source** → [GNU AGPL‑3.0](LICENSE)
- **Documentation & contenu** (wiki, exports, dossiers) → [Creative Commons BY‑NC‑SA 4.0](LICENSE-CONTENT.txt) (attribution, **pas d'usage commercial**, partage à l'identique)

En tant que titulaire exclusif des droits, l'auteur se réserve le droit d'accorder des **licences commerciales distinctes** (double licence). Pour tout usage commercial : <https://www.mohamedelafrit.com>

© 2026 Mohamed El Afrit. Boussole.
