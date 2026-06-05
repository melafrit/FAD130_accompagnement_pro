# Cahier des charges — Application « Boussole »

**FAD130 · Mohamed El Afrit · Version 2 — juin 2026**
*Compagnon d'entretien d'accompagnement, assisté par l'IA. Document mis en forme ensuite en DOCX (encadrés verbatim pour les prompts).*

---

## 1. Présentation & objectifs

**Boussole** est une application web (mobile-friendly) à **double finalité** :
1. **Livrable FAD130** — illustre et rend public (onglet *Aide*) ma méthode d'accompagnement et l'arbre de décision, pour l'évaluation.
2. **Outil opérationnel** — un assistant que j'utilise réellement pour accompagner mes étudiants.

**Principe directeur :** l'application est **utilisée principalement par l'accompagnateur** ; l'IA **assiste** (suggère questions et reformulations, aide à rédiger le compte rendu) mais **ne décide jamais à sa place** et **ne s'adresse pas** directement à l'accompagné pendant l'entretien. Garde-fous = les 8 principes de la [méthode d'entretien](Methode_entretien_accompagnement_V1.md). Finalité : **faire croître l'autonomie** de l'accompagné.

---

## 2. Décisions techniques (cadrées)

| Domaine | Choix |
|---|---|
| Nom / URL | **Boussole** · `boussole.elafrit.com` |
| Backend | **Node.js (TypeScript)** + Express |
| Frontend | **React (Vite + TypeScript)**, design dédié « apaisant & confiance » |
| Dépôt | Monorepo FAD130, dossier `app/` |
| Base de données | **SQLite** (better-sqlite3) |
| IA | **Claude API** — Sonnet (temps réel) + Opus (comptes rendus) |
| Transcription | **Web Speech API** (navigateur) |
| Emails | **Brevo** (expéditeur `contact@elafrit.com`) |
| RDV | Réservation **intégrée sur-mesure** |
| Notifications | **Email + in-app** |
| Données | **Texte seul**, conservation **bornée**, pas d'audio |
| Déploiement | **docker-compose + Traefik** (HTTPS), **coexistant** avec les apps existantes du VPS |
| Langue | **FR** en v1, **i18n-ready** |

---

## 3. Rôles & droits

| Rôle | Compte initial | Droits |
|---|---|---|
| **Admin** | `mohamed@elafrit.com` | Gérer les comptes (créer/désactiver, rattacher accompagné↔accompagnateur), paramètres légaux. |
| **Accompagnateur** | `elafrit.mohamed@gmail.com` | Voir/gérer **tous ses accompagnés** ; mener les entretiens guidés ; générer/éditer les comptes rendus ; piloter le plan d'action ; définir ses disponibilités. |
| **Accompagné** | (auto-inscription) | Voir **uniquement** son historique et ses comptes rendus ; remplir le questionnaire initial ; réserver un RDV. |

**Cloisonnement strict** entre accompagnés.

---

## 4. Fonctionnalités détaillées

### 4.1 Comptes & sécurité
- **Auto-inscription** (accompagnateur ou accompagné) ; **validation par email** (lien, via Brevo) ; **réinitialisation du mot de passe** par email ; mise à jour du profil.
- Mots de passe hachés (bcrypt/argon2) ; sessions sécurisées ; journal d'accès.
- **Comptes seed** au premier démarrage (admin + accompagnateur ci-dessus).

### 4.2 Onboarding légal (RGPD)
- **Consentement** bloquant (CGU + politique de confidentialité), **horodaté et tracé**, avant tout usage.
- Liens permanents : Mentions légales · CGU · Politique de confidentialité.
- Droits RGPD via **dpo@elafrit.com**.

### 4.3 Page d'accueil *(implémentée)*
Rappelle le **contexte** (app développée dans le cadre du **Cnam / FAD130** pour illustrer l'accompagnement d'étudiants de master en transition), **l'objectif** et **le public cible**.

### 4.4 Questionnaire initial pré-RDV (adaptatif, piloté par Claude)
- L'accompagné, avant le 1er RDV, renseigne quelques champs de base puis Claude mène un **dialogue question par question avec propositions de réponses** pour cadrer : **contexte du stage, sujet du mémoire, problématique, enjeux, difficultés, besoins**.
- À la fin : Claude propose un **1er compte rendu récapitulatif** + l'accompagné **réserve un RDV** (créneaux définis par l'accompagnateur).

### 4.5 Prise de rendez-vous (calendrier intégré)
- L'accompagnateur définit ses **créneaux** ; l'accompagné en choisit un ; **confirmation par email** + notification in-app.

### 4.6 Entretien guidé (le cœur)
- Déroulé en **6 phases** (Cadre & alliance → Demande/besoin → Exploration → Mise en sens → Plan d'action → Clôture), avec objectif, points de vigilance et **banque de questions** par phase.
- **Zones de réponse** par question (saisie **ou** dictée).
- **Transcription vocale** (Web Speech API) : le micro transcrit la parole de l'accompagné dans la zone de réponse.
- **Assistance Claude** : reformulation (vérifier la compréhension) + 2-3 **questions d'approfondissement** adaptées, dans le respect de la posture.
- Rappels de posture discrets (« fais-tu parler l'autre ? », « as-tu reformulé le besoin ? »).

### 4.7 Compte rendu DOCX
- Génération assistée (trame 6 parties : contexte/demande · points clés · ce qui a émergé · **plan d'action** · propositions · vigilance).
- Export **.docx** daté ; **téléchargement → modification → ré-import** (versionné) ; **publication** dans l'espace de l'accompagné.

### 4.8 Suivi du plan d'action
- Actions (libellé, échéance, critère, statut) ; **rappels** (email + in-app).

### 4.9 Tableau de bord & recherche
- Vue d'ensemble (accompagnés, sessions, actions en cours) ; **recherche par étiquettes/tags**.

### 4.10 Notifications
- **Email** (Brevo) + **centre de notifications in-app** (cloche).

### 4.11 Onglet Aide / transparence *(pour la prof FAD130)*
- Explique le **fonctionnement** de l'app en toute transparence ; affiche le **cahier des charges** ; présente **l'arbre de décision** (les 6 phases) et la **méthode d'accompagnement assistée par IA** (dont les prompts §7).

### 4.12 Administration
- CRUD comptes, rattachements, export/suppression de données (droits RGPD).

---

## 5. Modèle de données (SQLite)
Implémenté dans `app/api/src/db.ts`. Tables : `users`, `tokens` (validation email / reset), `consentements`, `liens_accompagnement`, `dossiers`, `questionnaires_initiaux`, `sessions`, `reponses`, `suggestions_ia`, `comptes_rendus`, `actions`, `creneaux`, `rdv`, `tags`, `dossier_tags`, `notifications`, `journal_acces`.

---

## 6. Architecture technique
- **Monorepo `app/`** : `web/` (React/Vite/TS, servi par Nginx qui proxifie `/api`), `api/` (Express/TS, SQLite, Claude, DOCX), `docker-compose.yml`, `.env`.
- **Déploiement** : Docker + **Traefik**, **coexistant** avec le reverse proxy existant du VPS OVH (réseau externe `PROXY_NETWORK`, pas de prise des ports 80/443). Voir [Guide de déploiement](Guide_deploiement_Boussole.md).
- **Secrets** : `ANTHROPIC_API_KEY`, `BREVO_API_KEY`, `SESSION_SECRET`, `JWT_SECRET` — uniquement dans `.env` côté serveur (hors Git).
- **Bonnes pratiques Claude** : modèles Sonnet/Opus selon la tâche, **prompt caching** du system prompt (posture statique), température basse pour la reformulation, **sorties JSON** pour les suggestions.

---

## 7. Prompts Claude optimisés (encadrés verbatim)

> Variables entre `{{...}}`. System prompt mis en cache.

### 7.1 System prompt — Posture & garde-fous (mis en cache)
```text
Tu es l'assistant d'un ACCOMPAGNATEUR professionnel qui mène un entretien d'accompagnement
en contexte de transition professionnelle (accompagnement d'un étudiant en alternance sur son
mémoire professionnel).

Ton rôle : AIDER L'ACCOMPAGNATEUR à poser de bonnes questions et à tenir une posture juste.
Tu ne parles JAMAIS directement à la personne accompagnée. Tu t'adresses uniquement à
l'accompagnateur, en lui proposant des formulations qu'il pourra choisir d'utiliser ou non.

Règles de posture (tu refuses ou reformules toute suggestion qui les violerait) :
1. Faire parler la personne le plus possible ; l'accompagnateur parle peu.
2. Geste écologique : le moins d'induction et de suggestion possible. Questions OUVERTES et
   neutres ("questions bleues"), jamais orientées vers une réponse attendue.
3. Faire émerger plutôt que donner la solution. Ne propose JAMAIS de solution toute faite ni
   de conseil non sollicité.
4. Non-jugement : aucune évaluation, positive ou négative, de la personne.
5. Distinguer demande / besoin / décision.
6. Responsabilité des moyens, pas du résultat : on outille, on ne décide pas à la place.
7. Viser la croissance de l'autonomie de la personne.

Style : concis, en français, bienveillant et professionnel. Tu proposes, tu ne décides pas.
Si une demande sort du périmètre (détresse psychologique, etc.), signale-le et suggère
d'orienter vers une ressource adaptée.
```

### 7.2 Prompt — Suggestion de questions d'approfondissement
```text
Phase actuelle : {{phase}} (objectif : {{objectif_phase}}).
Points de vigilance : {{points_vigilance}}.

Derniers échanges (réponses transcrites de la personne) :
"""
{{transcription_recente}}
"""

Propose 2 à 3 QUESTIONS OUVERTES d'approfondissement, adaptées à ce qui vient d'être dit et à
l'objectif de la phase, en respectant strictement les règles de posture (aucune suggestion ni
induction).

Réponds en JSON :
{ "questions": ["...", "...", "..."], "a_surveiller": "un point de vigilance éventuel" }
```

### 7.3 Prompt — Reformulation & analyse de la réponse
```text
Réponse transcrite de la personne :
"""
{{reponse_transcrite}}
"""

Fournis :
1. Une REFORMULATION fidèle et neutre (à faire valider à la personne), à partir de SES mots,
   sans interprétation.
2. Ce que tu repères, prudemment : la DEMANDE explicite, le BESOIN possible sous-jacent, une
   DÉCISION éventuellement déjà prise, un éventuel NIVEAU PSYCHOLOGIQUE (légitimité, confiance) —
   en restant hypothétique.

Réponds en JSON :
{ "reformulation": "...", "demande": "...", "besoin_hypothese": "...", "decision_prise": "...",
  "niveau_psychologique": "...", "prudence": "hypothèses à vérifier avec la personne" }
```

### 7.4 Prompt — Génération du compte rendu (DOCX)
```text
À partir des notes et réponses ci-dessous, rédige un COMPTE RENDU professionnel, fidèle à la
parole de la personne (ne prescris rien à sa place ; restitue ses décisions et ses formulations).

Données : Accompagné : {{prenom}} | Date : {{date}} | Contexte : {{contexte}}
Réponses par phase : {{reponses_structurees}}

Structure (titres exacts) :
1. Contexte et demande
2. Points clés exprimés
3. Ce qui a émergé (sens, axes)
4. Plan d'action  (tableau : étape | échéance | critère de réussite)
5. Propositions pour la suite
6. Points de vigilance pour le prochain rendez-vous

Style clair, factuel, bienveillant, en français. Le plan d'action reflète des engagements
RÉALISTES exprimés par la personne. Contenu directement convertible en DOCX.
```

### 7.5 Prompt — Questionnaire initial adaptatif (pré-RDV)
```text
Tu aides une personne accompagnée à préparer son premier rendez-vous, en cadrant son besoin.
Mène un dialogue BIENVEILLANT, une question à la fois, en proposant à chaque fois 2-4
propositions de réponses (la personne peut aussi répondre librement). Couvre progressivement :
contexte du stage, sujet du mémoire, problématique, enjeux, difficultés rencontrées, besoins.
Ne juge pas, n'impose pas de solution. Quand tu as assez d'éléments, produis un COMPTE RENDU
récapitulatif clair et structuré, à valider par la personne.

Réponds en JSON :
{ "question": "...", "propositions": ["...", "..."], "termine": false, "recapitulatif": null }
```

---

## 8. Sécurité & conformité (RGPD)
- **Documents légaux à produire** : Mentions légales, CGU, Politique de confidentialité (finalités, base légale, données, durées, destinataires, **sous-traitants : Anthropic & Brevo**, droits, **dpo@elafrit.com**).
- Consentement obligatoire et tracé ; **minimisation** (texte seul, pas d'audio) ; **conservation bornée** ; chiffrement des secrets ; HTTPS ; cloisonnement par rôle ; droit à l'effacement.

## 9. Exigences non fonctionnelles
Mobile-first · i18n-ready (textes externalisés dès la v1) · accessibilité (ARIA, contrastes) · suggestions IA en quelques secondes · sauvegardes SQLite · fallback si l'API IA est indisponible · traçabilité suggestion IA → décision.

## 10. Lots de réalisation
1. ✅ Socle (structure, page d'accueil, schéma SQLite, Docker/Traefik coexistant).
2. Auth (inscription + validation email + reset) + comptes seed + consentement.
3. Questionnaire initial (Claude) + prise de RDV.
4. Entretien guidé (6 phases) + transcription + suggestions IA.
5. Compte rendu DOCX (génération / édition / ré-import / publication).
6. Suivi plan d'action + notifications + tableau de bord + tags.
7. Onglet Aide (transparence) + pages légales.
8. i18n & robustesse (STT serveur, multilingue) — ultérieur.
