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

## Développement local
```bash
# API (port 3000)
cd api && npm install && npm run dev

# Front (port 5173, proxifie /api vers 3000)
cd web && npm install && npm run dev
```
Front : http://localhost:5173 · Santé API : http://localhost:3000/api/health

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
- [ ] Questionnaire initial adaptatif (Claude) + prise de RDV
- [ ] Entretien guidé (6 phases) + transcription + suggestions IA
- [ ] Génération du compte rendu DOCX (download / modif / ré-import)
- [ ] Tableau de bord, suivi du plan d'action + notifications, recherche par tags
- [ ] Onglet Aide (transparence + cahier des charges + arbre de décision)
- [ ] Pages légales (mentions, CGU, politique de confidentialité)
