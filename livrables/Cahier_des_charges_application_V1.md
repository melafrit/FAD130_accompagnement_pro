# Cahier des charges — Application web d'accompagnement (« Compagnon d'entretien »)

**FAD130 · Mohamed El Afrit · V1 — juin 2026**
*Document de spécification (Markdown). Sera mis en forme en DOCX professionnel, avec **encadrés verbatim** pour les prompts Claude.*

---

## 1. Contexte et objectifs

**Double finalité :**
1. **Livrable FAD130** — support vivant illustrant ma méthode d'accompagnement (présentable à l'oral).
2. **Outil opérationnel** — un assistant que j'utilise réellement dans mes missions d'accompagnement.

**Idée directrice :** une application web (mobile-friendly), **utilisée principalement par l'accompagnateur**, qui :
- le **guide pour poser les bonnes questions** et **vérifier qu'il applique les bonnes pratiques** d'accompagnement (posture, étapes, points de vigilance) ;
- **transcrit la parole** de la personne accompagnée (micro → texte) dans les zones de réponse ;
- avec l'**IA (Claude)**, aide à **reformuler** pour mieux comprendre et à **proposer des questions d'approfondissement** ;
- génère un **compte rendu DOCX** (téléchargeable, modifiable, ré-importable) structuré avec **plan d'action** et **propositions pour la suite** ;
- range les comptes rendus, **datés**, dans l'espace de la personne accompagnée.

**Principe non négociable (issu de la méthode) :** l'IA **assiste l'accompagnateur**, elle ne se substitue jamais à son jugement ni ne s'adresse directement à l'accompagné. Elle **suggère**, l'accompagnateur **décide**. Garde-fous = les 8 principes directeurs de la [méthode d'entretien](Methode_entretien_accompagnement_V1.md).

---

## 2. Périmètre, rôles et droits

| Rôle | Droits |
|---|---|
| **Admin** | Gérer les comptes (créer/désactiver accompagnateurs et accompagnés), rattacher un accompagné à un accompagnateur, superviser, gérer les paramètres légaux. Pas d'accès au contenu des entretiens sauf nécessité (à cadrer). |
| **Accompagnateur** | Voir et gérer les **dossiers et l'historique de TOUS ses accompagnés** ; mener les entretiens guidés ; générer/éditer les comptes rendus ; piloter le plan d'action. |
| **Accompagné** | Voir **uniquement son propre** historique et ses comptes rendus ; consulter/télécharger ses CR ; (option) compléter des éléments demandés. |

**Cloisonnement strict** : un accompagné ne voit jamais les données d'un autre ; un accompagnateur ne voit que ses propres accompagnés.

---

## 3. Parcours utilisateur (cas d'usage principaux)

**UC1 — Onboarding & consentement.** À la première connexion, l'utilisateur doit **accepter les CGU et la politique de confidentialité** (consentement horodaté) avant tout usage.

**UC2 — Conduite d'un entretien guidé (accompagnateur).**
1. L'accompagnateur ouvre/crée un dossier d'accompagné et démarre une **session d'entretien**.
2. L'app affiche l'**étape courante** (parmi les 6 phases) avec une **banque de questions** suggérées.
3. Pendant que l'accompagné répond, l'accompagnateur active le **micro** → la parole est **transcrite** dans la **zone de réponse** de la question.
4. À la demande, **Claude** propose : (a) une **reformulation** pour vérifier la compréhension, (b) **2–3 questions d'approfondissement** adaptées, en respectant la posture.
5. L'accompagnateur navigue entre les phases (avancer, revenir, reboucler).

**UC3 — Génération du compte rendu.** En fin de session, **Claude** aide à rédiger un **compte rendu** structuré → export **DOCX**. L'accompagnateur peut le **télécharger, le modifier hors ligne, puis le ré-importer** (versionné). Le CR validé est **daté et publié dans l'espace de l'accompagné**.

**UC4 — Espace accompagné.** L'accompagné se connecte, consulte/télécharge **ses** comptes rendus et son **plan d'action**.

**UC5 — Administration.** L'admin gère les comptes et les rattachements.

---

## 4. Fonctionnalités détaillées

### 4.1 Authentification & comptes
- Connexion par email + mot de passe (hash **bcrypt/argon2**), réinitialisation, sessions sécurisées.
- Gestion des rôles (admin/accompagnateur/accompagné) ; rattachement accompagné ↔ accompagnateur.
- Journalisation des accès (audit minimal).

### 4.2 Onboarding légal (RGPD)
- Écran de **consentement** (CGU + politique de confidentialité) bloquant, **horodaté et tracé**.
- Lien permanent vers **Mentions légales**, **CGU**, **Politique de confidentialité**.
- Mention du contact **dpo@elafrit.com** pour l'exercice des droits.

### 4.3 Entretien guidé (le cœur)
- Affichage de la **phase courante** (6 phases) + objectif + points de vigilance + **banque de questions**.
- **Zones de réponse** éditables par question (saisie manuelle **ou** dictée vocale).
- Indicateurs de posture (rappels discrets : « fais-tu parler l'autre ? », « as-tu reformulé le besoin ? »).
- Navigation non linéaire entre phases (retours, reboucles).

### 4.4 Transcription vocale (micro → texte)
- Bouton **micro** par zone de réponse ; **transcription en temps réel** de la parole de l'accompagné dans le champ.
- **Option A (v1, simple) :** API navigateur **Web Speech API** (gratuite, fonctionne sur mobile Chrome) — *à confirmer selon qualité/navigateurs*.
- **Option B (robuste) :** STT côté serveur (**Whisper** / API de transcription) — meilleure qualité, multilingue, mais coût et latence.
- Consentement explicite à l'enregistrement/transcription ; **aucun audio conservé** par défaut (seul le texte est gardé) — à confirmer.

### 4.5 Assistance IA (Claude API)
- **Reformulation** : à partir de la réponse transcrite, proposer une reformulation pour vérifier la compréhension + repérer **demande/besoin/décision** et le **niveau psychologique**.
- **Approfondissement** : proposer **2–3 questions ouvertes** adaptées à la phase et aux dernières réponses, respectant les garde-fous.
- **Garde-fous** : l'IA ne donne pas de solution à la place, ne juge pas, ne s'adresse pas à l'accompagné — voir prompts §7.
- L'accompagnateur **choisit** d'insérer ou non les suggestions (rien d'automatique).

### 4.6 Compte rendu DOCX
- Génération assistée par IA selon la **trame en 6 parties** : (1) Contexte & demande ; (2) Points clés exprimés ; (3) Ce qui a émergé (sens, axes) ; (4) **Plan d'action** (étapes, échéances, critères) ; (5) Propositions pour la suite ; (6) Points de vigilance pour le prochain RDV.
- Export **.docx** (mise en page propre, daté, en-tête). **Téléchargement → modification → ré-import** (conserver les versions).
- Publication dans l'espace de l'accompagné (consultable/téléchargeable).

### 4.7 Espace accompagné
- Liste **datée** de ses comptes rendus + plan d'action courant ; téléchargement DOCX/PDF.

### 4.8 Administration
- CRUD comptes, rattachements, désactivation, export/suppression de données (droits RGPD).

---

## 5. Modèle de données (SQLite — provisoire)

- **users** (id, email, mot_de_passe_hash, rôle, nom, prénom, actif, créé_le, dernier_accès)
- **consentements** (id, user_id, version_cgu, version_pc, accepté_le, ip)
- **liens_accompagnement** (id, accompagnateur_id, accompagné_id, statut, créé_le)
- **dossiers** (id, accompagné_id, accompagnateur_id, titre, contexte, créé_le)
- **sessions** (id, dossier_id, date, phase_atteinte, statut)
- **reponses** (id, session_id, phase, question, texte_reponse, source [saisie|dictée], créé_le)
- **comptes_rendus** (id, session_id, version, chemin_docx, généré_le, publié [bool], publié_le)
- **suggestions_ia** (id, session_id, type [reformulation|question|cr], prompt_ref, contenu, retenue [bool], créé_le) — *traçabilité IA*
- **journal_acces** (id, user_id, action, cible, horodatage)

*Chiffrement au repos des données sensibles à étudier ; sauvegardes régulières.*

---

## 6. Architecture technique (proposition — à confirmer au cadrage technique)

- **Frontend** : SPA **mobile-first**, **i18n-ready** (clés de traduction dès la v1, FR seul affiché), réutilisant le **design system FAD108** (accent violet `#6a36ff`/bleu). *(Framework à choisir : React/Vue/Svelte ou vanilla.)*
- **Backend** : API (Node.js ou Python — à choisir) gérant auth, métier, **intégration Claude API**, **génération DOCX** (lib `docx`/`python-docx`), accès SQLite.
- **STT** : Web Speech API (v1) ou Whisper serveur (option).
- **Conteneurisation** : **Docker** (image unique ou `docker-compose` app + reverse proxy).
- **Déploiement** : **VPS OVH**, **reverse proxy** (Nginx/Traefik), **HTTPS** (Let's Encrypt), sous-domaine de `mohamedelafrit.com` (ex. `accompagnement.mohamedelafrit.com`) — *à confirmer*.
- **Secrets** : clé **ANTHROPIC_API_KEY** côté serveur uniquement (jamais exposée au navigateur), variables d'environnement.
- **Bonnes pratiques Claude API** : modèle récent (Opus/Sonnet 4.x), **prompt caching** du *system prompt* (posture statique), température basse pour la reformulation, sorties structurées (JSON) pour les questions suggérées.

---

## 7. Prompts Claude optimisés (encadrés verbatim)

> *Ces blocs sont à reproduire tels quels dans le DOCX, en **encadrés verbatim**. Variables entre `{{...}}`. Le system prompt est mis en cache (prompt caching).*

### 7.1 System prompt — Posture & garde-fous (mis en cache)
```text
Tu es l'assistant d'un ACCOMPAGNATEUR professionnel qui mène un entretien d'accompagnement
en contexte de transition professionnelle (situation : accompagnement d'un étudiant en
alternance sur son mémoire professionnel).

Ton rôle : AIDER L'ACCOMPAGNATEUR à poser de bonnes questions et à tenir une posture juste.
Tu ne parles JAMAIS directement à la personne accompagnée. Tu t'adresses uniquement à
l'accompagnateur, en lui proposant des formulations qu'il pourra choisir d'utiliser ou non.

Règles de posture à respecter absolument (tu refuses ou reformules toute suggestion qui les
violerait) :
1. Faire parler la personne le plus possible ; l'accompagnateur parle peu.
2. Geste écologique : le moins d'induction et de suggestion possible. Questions OUVERTES et
   neutres ("questions bleues"), jamais orientées vers une réponse attendue.
3. Faire émerger plutôt que donner la solution. Ne propose JAMAIS de solution toute faite ni
   de conseil non sollicité.
4. Non-jugement : aucune évaluation, ni positive ni négative, de la personne. On peut
   questionner un travail, jamais juger la personne.
5. Distinguer demande / besoin / décision : aide à repérer si une décision est déjà prise et
   si la demande explicite recouvre un besoin plus profond.
6. Responsabilité des moyens, pas du résultat : on outille, on ne décide pas à la place.
7. Viser la croissance de l'autonomie de la personne.

Style : concis, en français, bienveillant et professionnel. Tu proposes, tu ne décides pas.
Si une demande sort du périmètre d'accompagnement (détresse psychologique, etc.), tu le
signales et tu suggères d'orienter vers une ressource adaptée.
```

### 7.2 Prompt — Suggestion de questions d'approfondissement
```text
Phase actuelle de l'entretien : {{phase}} (objectif : {{objectif_phase}}).
Points de vigilance de cette phase : {{points_vigilance}}.

Derniers échanges (réponses transcrites de la personne accompagnée) :
"""
{{transcription_recente}}
"""

Propose à l'accompagnateur 2 à 3 QUESTIONS OUVERTES d'approfondissement, adaptées à ce qui
vient d'être dit et à l'objectif de la phase, en respectant strictement les règles de posture.
Les questions doivent aider la personne à explorer, préciser ou mettre en sens — sans rien
suggérer ni induire.

Réponds en JSON :
{ "questions": ["...", "...", "..."], "a_surveiller": "un point de vigilance éventuel pour l'accompagnateur" }
```

### 7.3 Prompt — Reformulation & analyse de la réponse
```text
Réponse transcrite de la personne accompagnée :
"""
{{reponse_transcrite}}
"""

Aide l'accompagnateur à vérifier sa compréhension. Fournis :
1. Une REFORMULATION fidèle et neutre (à faire valider à la personne), à partir de SES mots,
   sans interprétation.
2. Ce que tu repères, prudemment, sur : la DEMANDE explicite, le BESOIN possible sous-jacent,
   une DÉCISION éventuellement déjà prise, et un éventuel NIVEAU PSYCHOLOGIQUE (ex. légitimité,
   confiance) — en restant hypothétique et non affirmatif.

Réponds en JSON :
{ "reformulation": "...", "demande": "...", "besoin_hypothese": "...", "decision_prise": "...",
  "niveau_psychologique": "...", "prudence": "rappel que ce sont des hypothèses à vérifier avec la personne" }
```

### 7.4 Prompt — Génération du compte rendu (DOCX)
```text
À partir des notes et réponses de la session d'accompagnement ci-dessous, rédige un COMPTE
RENDU professionnel, fidèle à la parole de la personne accompagnée (ne prescris rien à sa
place ; restitue ses décisions et ses propres formulations).

Données de session :
- Accompagné : {{prenom_accompagné}} | Date : {{date}} | Contexte : {{contexte}}
- Réponses par phase : {{reponses_structurees}}

Structure attendue (titres exacts) :
1. Contexte et demande
2. Points clés exprimés
3. Ce qui a émergé (sens, axes)
4. Plan d'action  (tableau : étape | échéance | critère de réussite)
5. Propositions pour la suite
6. Points de vigilance pour le prochain rendez-vous

Style : clair, factuel, bienveillant, en français. Le plan d'action doit refléter des
engagements RÉALISTES exprimés par la personne, pas des injonctions. Renvoie un contenu
structuré directement convertible en DOCX (titres + listes + tableau du plan d'action).
```

---

## 8. Sécurité & conformité (RGPD)

- **Documents légaux à produire** (livrables séparés) : **Mentions légales**, **CGU**, **Politique de confidentialité** (finalités, base légale, données collectées, durées de conservation, destinataires, sous-traitants dont Anthropic, droits, contact **dpo@elafrit.com**).
- **Consentement** obligatoire et tracé avant tout usage.
- **Minimisation** : ne collecter que le nécessaire ; **pas d'audio conservé** par défaut.
- **Sous-traitance IA** : informer que les contenus d'entretien sont traités via l'API Claude (Anthropic) ; vérifier la conformité (localisation, durée de rétention côté fournisseur, DPA).
- **Données sensibles** : un entretien peut révéler des informations personnelles → chiffrement, accès cloisonné, journalisation, droit à l'effacement.
- **Droits RGPD** : accès, rectification, effacement, portabilité, opposition — procédure via le DPO.

---

## 9. Exigences non fonctionnelles
- **Mobile-first**, responsive, accessible (contrastes, labels ARIA — réutiliser l'acquis FAD108).
- **i18n-ready** : externaliser les textes dès la v1 (FR affiché ; EN/AR plus tard).
- **Performance** : suggestions IA < quelques secondes ; transcription fluide.
- **Fiabilité** : sauvegardes SQLite, gestion des erreurs IA (fallback si l'API est indisponible).
- **Traçabilité** : conserver le lien suggestion IA → décision de l'accompagnateur.

---

## 10. Lots de réalisation (proposition)
1. **Socle** : auth, rôles, onboarding légal, modèle SQLite, Docker/déploiement OVH.
2. **Entretien guidé** : 6 phases, banques de questions, zones de réponse.
3. **Transcription vocale** (Web Speech API v1).
4. **Assistance Claude** : reformulation + questions (prompts §7).
5. **Compte rendu DOCX** : génération, édition, ré-import, publication.
6. **Espaces** accompagné & admin.
7. **Légal** : rédaction mentions/CGU/PC.
8. **i18n & robustesse** (STT serveur, multilingue) — ultérieur.

---

## 11. Points à cadrer ultérieurement (questions techniques détaillées)
Stack front/back définitive · STT navigateur vs serveur · schéma SQLite final · politique de rétention audio/texte · sous-domaine & certificats · stratégie de sauvegarde · modèle Claude (Opus/Sonnet) & budget tokens · authentification (sessions/JWT) · CI/CD.
