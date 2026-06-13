# Sécurité

Ce dossier consolide la posture de sécurité applicative de **Boussole**. Il décrit les actifs sensibles, les surfaces d'attaque, les contrôles **effectivement implémentés** dans le code, ceux qui sont **partiels** ou **absents**, et propose une priorisation des remédiations. Boussole héberge des données personnelles d'accompagnés (étudiants/alternants de master) et des contenus de mémoire en cours de rédaction : la confidentialité et l'intégrité de ces données priment, dans un cadre académique (Cnam, UE FAD130) mono-instance, sans paiement réel ni traitement à grande échelle. L'objectif n'est pas une certification, mais une **maîtrise documentée et honnête** du risque, distinguant clairement le « fait » du « à faire ».

## Objectifs de la page

- Établir le **modèle de menace** : actifs sensibles, acteurs, surfaces d'attaque.
- Inventorier les **contrôles existants** au niveau code (authentification, autorisation, cloisonnement, durcissement HTTP, validation, rendu).
- Cartographier l'exposition au regard de l'**OWASP Top 10 (2021)**.
- Tenir un **registre des risques** sécurité avec criticité et recommandation.
- **Prioriser** les remédiations dans une logique effort/impact, exploitable pour la suite du projet.

---

## 1. Périmètre et hypothèses de déploiement

| Élément | Réalité (vérifiée dans le code) |
|---|---|
| Modèle d'hébergement | Mono-instance, conteneurs Docker, base **SQLite mono-fichier** (`./data/boussole.sqlite`, WAL, `foreign_keys ON`) |
| Exposition réseau | Front Vite + API Express derrière **Traefik** (reverse-proxy + TLS) en prod ; `boussole.elafrit.com` |
| Session | **JWT** signé, stocké en **cookie httpOnly** `boussole_token` (`sameSite=lax`, `secure` en prod, expiration 7 j) |
| Volumétrie | Faible (projet académique solo, jeu de démo : 2 accompagnateurs, 3 accompagnés, 6 dossiers) |
| Paiement | Aucun (les plans démontrent le *gating*, sans transaction réelle) |

> **Hypothèse — confiance : élevée** — La terminaison TLS et la redirection HTTPS sont assurées par Traefik en production ; l'application Express ne gère pas le TLS elle-même. *La configuration exacte du `docker-compose` de prod (labels Traefik, HSTS) n'a pas été inspectée dans cette page.*

---

## 2. Modèle de menace

### 2.1 Actifs sensibles

| Actif | Sensibilité | Localisation |
|---|---|---|
| Données personnelles des accompagnés (identité, e-mail, IP de consentement) | Élevée (RGPD) | Tables `users`, `consentements`, `journal_acces` |
| Contenus de mémoire (réponses d'entretien, comptes rendus, synthèses, journal intime) | Élevée (confidentialité forte, données potentiellement intimes) | `reponses`, `comptes_rendus`, `syntheses`, `journal_entrees`, `meteo_humeur`, `emotions_roue` |
| Comptes & secrets d'authentification | Critique | `users.password_hash` (bcrypt), `tokens`, cookie JWT, `JWT_SECRET` |
| Relations d'accompagnement | Moyenne | `liens_accompagnement`, `dossiers` (cloisonnement métier) |
| Notes privées de l'accompagnateur | Moyenne à élevée | `cr_notes_privees`, `auto_evaluations` |
| Configuration & clés tierces | Critique | `JWT_SECRET`, clé API Anthropic, clé Brevo, clés VAPID push (variables d'environnement) |

### 2.2 Acteurs de menace

| Acteur | Motivation | Vecteur principal |
|---|---|---|
| Utilisateur authentifié malveillant (accompagnateur ou accompagné) | Accéder aux dossiers d'autrui, élévation de rôle | API (IDOR, *broken access control*) |
| Attaquant non authentifié | Prise de compte, énumération, déni de service | Endpoints d'auth, `/api/context`, `/api/health` |
| Attaquant via contenu (XSS stocké) | Exécuter du script dans le navigateur d'un autre rôle | Contenus HTML (CR, synthèses) rendus côté front |
| Compromission d'un service tiers / fuite de secret | Usurpation, accès aux e-mails ou à l'IA | Anthropic, Brevo, variables d'environnement |

### 2.3 Surfaces d'attaque

```mermaid
flowchart LR
  subgraph Externe
    U[Utilisateur / Navigateur]
    A[Attaquant]
  end
  subgraph Bordure
    T[Traefik - TLS, reverse-proxy]
  end
  subgraph Application
    W[Front React / Vite]
    API[API Express]
  end
  subgraph Donnees
    DB[(SQLite - boussole.sqlite)]
  end
  subgraph Tiers
    AN[API Anthropic - Claude]
    BR[Brevo - e-mail]
  end

  U --> T --> W
  W -->|cookie httpOnly JWT| API
  A -. auth, IDOR, XSS .-> API
  A -. injection contenu .-> W
  API -->|requetes parametrees| DB
  API -->|prompts| AN
  API -->|mails transactionnels| BR
```

Ce schéma situe les quatre surfaces principales : (1) la **bordure** (Traefik/TLS), (2) l'**API Express** — surface majeure, qui porte l'authentification, l'autorisation et le cloisonnement métier, (3) le **rendu de contenu HTML** dans le front (risque XSS stocké via CR/synthèses), et (4) les **dépendances tierces** (Anthropic, Brevo) auxquelles transitent des contenus et des e-mails. La base SQLite n'est pas exposée au réseau : elle n'est atteignable que via le processus API.

---

## 3. Contrôles existants (vérifiés dans le code)

### 3.1 Authentification

| Contrôle | Implémentation | Fichier |
|---|---|---|
| Hachage des mots de passe | **bcrypt**, 10 rounds (`bcrypt.hash(..., 10)`) | `auth.ts` |
| Politique de mot de passe | Minimum **8 caractères** (zod `min(8)`) à l'inscription, au reset et au changement | `auth.ts` |
| Session sans état | **JWT** signé HS256, expiration **7 jours**, vérifié à chaque requête (`requireAuth`) | `auth.ts` |
| Transport du jeton | Cookie **httpOnly**, `sameSite=lax`, `secure` en prod, `maxAge` 7 j | `auth.ts` (`setAuthCookie`) |
| Vérification d'e-mail obligatoire | Login refusé si `email_verifie = 0` (jeton `verif_email`, expiration 48 h) | `auth.ts` |
| Compte désactivable | Login refusé si `actif = 0` | `auth.ts` |
| Réinitialisation de mot de passe | Jeton `reset_mdp` à usage unique, **expiration 2 h** | `auth.ts` |
| Anti-énumération (reset) | Réponse identique que le compte existe ou non (« Si un compte existe… ») | `auth.ts` |
| Changement d'e-mail sécurisé | Re-validation par lien envoyé à la **nouvelle** adresse, jeton portant l'adresse cible, anti-collision | `auth.ts` |
| Changement de mot de passe | Exige le mot de passe **actuel** (re-vérification bcrypt) | `auth.ts` |

### 3.2 Autorisation et cloisonnement

```mermaid
flowchart TD
  R[Requete API] --> C{Cookie JWT present ?}
  C -- non --> E401[401 Non authentifie]
  C -- oui --> V{JWT valide ?}
  V -- non --> E401b[401 Session invalide]
  V -- oui --> RR{Role autorise ?\nrequireRole}
  RR -- non --> E403[403 Acces refuse]
  RR -- oui --> RF{Feature dans l'offre ?\nrequireFeature}
  RF -- non --> E403b[403 Fonctionnalite non disponible]
  RF -- oui --> OWN{Proprietaire de la ressource ?\nWHERE accompagnateur_id = moi}
  OWN -- non --> E404[404 Parcours introuvable]
  OWN -- oui --> OK[Acces accorde]
```

Le contrôle d'accès est appliqué en **cascade** côté serveur, à chaque endpoint : authentification (`requireAuth`) → rôle (`requireRole`) → fonctionnalité activée par le plan (`requireFeature`) → **propriété de la ressource**. Le dernier maillon est le plus important contre les IDOR : l'appartenance d'un dossier est revérifiée en base par une clause `WHERE id=? AND accompagnateur_id=?` (fonction `owns` dans `dossier.ts`) ; un dossier non possédé renvoie **404** (et non 403), ce qui évite de divulguer son existence.

| Contrôle | Implémentation | Fichier |
|---|---|---|
| 3 rôles en base | Contrainte `CHECK` (`admin`, `accompagnateur`, `accompagne`) | `db.ts` |
| Garde d'authentification | `requireAuth` (vérifie le JWT du cookie) → 401 | `auth.ts` |
| Garde de rôle | `requireRole(...roles)` → 403 | `auth.ts` |
| *Gating* fonctionnel | `requireFeature(key)` → 403 si la feature n'est pas dans le plan | `features.ts` |
| Cloisonnement par propriétaire | Requête bornée au propriétaire (`owns`), **404** sinon | `dossier.ts` |
| Front défensif (non substitut) | `<Protected role>` redirige les non-autorisés vers `/espace` ou `/connexion` | `Protected.tsx` |

> Le contrôle front (`Protected`) est une **commodité d'expérience**, pas une frontière de sécurité : toute décision d'accès reste tranchée côté API.

### 3.3 Durcissement HTTP, validation et rendu

| Contrôle | Implémentation | Fichier |
|---|---|---|
| En-têtes de sécurité | **helmet()** (en-têtes par défaut) | `index.ts` |
| CORS avec credentials | `cors({ origin: true, credentials: true })` | `index.ts` |
| Limite de charge utile | `express.json({ limit: '1mb' })` (anti-DoS basique) | `index.ts` |
| Validation d'entrée | **zod** (`safeParse`) sur les corps de requête, retours 400 explicites | tous les routeurs |
| Requêtes paramétrées | `better-sqlite3` avec *prepared statements* → pas de concaténation SQL | tous les routeurs |
| Sanitisation du rendu HTML | **DOMPurify** sur tout contenu HTML affiché (CR, synthèses) | `web/src/components/HtmlContent.tsx` |
| Dégradation IA sans 500 | Repli déterministe systématique si l'IA est indisponible | `claude.ts` |

### 3.4 RGPD et traçabilité

| Contrôle | Statut | Détail |
|---|---|---|
| Consentement versionné | **Fait** | Table `consentements` (versions CGU/PC + IP), enregistré à l'inscription |
| Droit à l'effacement | **Fait** | `demandes_effacement` → admin traite par **anonymisation** (`users.anonymise=1`) ou **suppression** |
| Rétention automatique | **Fait** | Balayage périodique `sweepRetention` (anonymise les comptes éligibles) |
| Journal d'accès | **Partiel** | La table `journal_acces` existe mais n'est **écrite nulle part** dans le code (voir §6) |

---

## 4. Matrice OWASP Top 10 (2021)

| # | Risque | Exposition Boussole | Contrôle en place | Statut |
|---|---|---|---|---|
| A01 | Broken Access Control | IDOR sur dossiers/sessions/CR | `requireAuth`/`requireRole`/`requireFeature` + cloisonnement propriétaire (404) | **Fait** |
| A02 | Cryptographic Failures | Mots de passe, jetons, données au repos | bcrypt(10), TLS via Traefik ; SQLite **non chiffré au repos** | **Partiel** |
| A03 | Injection | SQL, XSS stocké | *Prepared statements* + zod ; DOMPurify au rendu | **Fait** |
| A04 | Insecure Design | Conception des flux d'auth/accès | Flux register→verify→login, reset à usage unique, repli IA | **Fait** |
| A05 | Security Misconfiguration | En-têtes, CORS, secrets | helmet par défaut ; **CSP non durcie** ; `JWT_SECRET` à défaut faible | **Partiel** |
| A06 | Vulnerable Components | Dépendances npm | Stack récente (Node 20, React 18) ; **pas d'audit automatisé documenté** | **Partiel** |
| A07 | Identification & Auth Failures | Brute force, énumération | Anti-énumération sur reset ; **pas de rate limiting ni de 2FA** | **Partiel** |
| A08 | Software & Data Integrity | Chaîne de build, intégrité | Build Docker reproductible | **Partiel** |
| A09 | Logging & Monitoring Failures | Détection d'incident | `journal_acces` **non alimenté** ; pas d'alerting sécurité | **À faire** |
| A10 | SSRF | Appels sortants (Anthropic, Brevo) | Destinations fixes, pas d'URL fournie par l'utilisateur | **Fait** |

> **Hypothèse — confiance : moyenne** — A10/SSRF est jugé maîtrisé car les seuls appels sortants visent des endpoints tiers codés en dur ; *aucune fonctionnalité de fetch d'URL arbitraire n'a été identifiée dans le code.*

---

## 5. Contrôles manquants ou à renforcer

| Contrôle | État | Pourquoi c'est attendu |
|---|---|---|
| **Rate limiting** (login, reset, register) | **Absent** | Sans limitation, le brute force et l'énumération restent possibles malgré bcrypt |
| **Jeton CSRF explicite** | **Absent** | `sameSite=lax` mitige l'essentiel, mais ne couvre pas toutes les navigations top-level ; un jeton anti-CSRF reste recommandé pour les mutations |
| **CSP stricte** | **Partiel** | helmet pose une CSP par défaut basique ; une CSP durcie (sources script/style maîtrisées) renforcerait l'anti-XSS en défense en profondeur |
| **Rotation des secrets** | **Absent** | `JWT_SECRET` a un défaut faible (`dev_secret_change_me`) ; pas de procédure de rotation ni d'invalidation de session documentée |
| **Audit log applicatif** | **Prévu** | Table `journal_acces` présente mais non écrite : à câbler sur les actions sensibles (login, accès dossier, actions admin RGPD) |
| **2FA / MFA** | **Absent** | Acceptable au stade académique, mais à prévoir pour des comptes accompagnateur en production réelle |
| **Chiffrement au repos (SQLite)** | **Absent** | Le fichier `.sqlite` est en clair ; un chiffrement (ex. SQLCipher) protégerait en cas de fuite du volume |

> **Hypothèse — confiance : élevée** — `JWT_SECRET` doit impérativement être surchargé en production via variable d'environnement ; le défaut `dev_secret_change_me` du code ne doit jamais être utilisé en prod. *La présence effective d'un secret fort dans l'environnement de prod n'est pas vérifiable depuis le code source.*

---

## 6. Registre des risques sécurité

Criticité = Impact × Probabilité (échelle qualitative Faible / Moyen / Élevé / Critique).

| Risque | Description | Impact | Probabilité | Criticité | Contrôle existant | Recommandation |
|---|---|---|---|---|---|---|
| R-S1 Brute force / énumération | Absence de rate limiting sur login/reset/register | Élevé | Moyenne | **Élevé** | bcrypt(10), anti-énumération reset | Ajouter un rate limiter (ex. `express-rate-limit`) sur les endpoints d'auth |
| R-S2 Secret JWT faible en prod | Défaut `dev_secret_change_me` si non surchargé | Critique | Faible | **Élevé** | Lecture via `process.env.JWT_SECRET` | Imposer un secret fort à l'amorçage ; refuser le démarrage prod si défaut |
| R-S3 Absence de journal d'accès | `journal_acces` non alimenté → pas de traçabilité d'incident | Moyen | Élevée | **Élevé** | Table présente, RGPD `consentements` | Câbler l'écriture sur actions sensibles (auth, accès dossier, RGPD admin) |
| R-S4 XSS stocké via CR/synthèses | HTML éditable (TipTap) rendu dans d'autres comptes | Élevé | Faible | **Moyen** | DOMPurify au rendu | Conserver DOMPurify ; durcir la CSP en défense en profondeur |
| R-S5 CSRF sur mutations | Cookie d'auth + mutations sans jeton anti-CSRF | Moyen | Faible | **Moyen** | `sameSite=lax`, CORS credentials | Ajouter un jeton CSRF (double-submit) pour les mutations |
| R-S6 SQLite non chiffré au repos | Fuite du volume = lecture intégrale des données | Élevé | Faible | **Moyen** | Isolation conteneur, accès via process API | Chiffrement au repos (SQLCipher) ou chiffrement du volume |
| R-S7 Dépendances vulnérables | Pas d'audit automatisé des dépendances npm | Moyen | Moyenne | **Moyen** | Stack récente | Intégrer `npm audit` / Dependabot à la CI |
| R-S8 Fuite de secrets tiers | Clés Anthropic/Brevo/VAPID en variables d'env | Élevé | Faible | **Moyen** | Secrets hors code, injectés par l'environnement | Procédure de rotation ; ne jamais committer de `.env` |
| R-S9 Absence de 2FA | Compte compromis = accès direct | Moyen | Faible | **Faible** | Vérification e-mail, mot de passe fort | 2FA optionnelle pour les accompagnateurs (post-académique) |

---

## 7. Priorisation des remédiations

```mermaid
quadrantChart
  title Effort vs Impact des remediations
  x-axis Effort faible --> Effort eleve
  y-axis Impact faible --> Impact eleve
  quadrant-1 Planifier
  quadrant-2 Faire en priorite
  quadrant-3 Differer
  quadrant-4 Quick wins
  R-S1 Rate limiting: [0.25, 0.82]
  R-S2 Secret JWT prod: [0.15, 0.88]
  R-S3 Journal d'acces: [0.45, 0.70]
  R-S4 CSP stricte: [0.40, 0.55]
  R-S5 Jeton CSRF: [0.55, 0.55]
  R-S6 Chiffrement repos: [0.70, 0.60]
  R-S7 Audit dependances: [0.20, 0.50]
  R-S8 Rotation secrets: [0.35, 0.60]
  R-S9 2FA: [0.75, 0.45]
```

Lecture : les **quick wins** (effort faible, impact élevé) — durcir `JWT_SECRET` en prod (R-S2), ajouter un rate limiter (R-S1), brancher `npm audit` (R-S7) — sont à traiter en premier car ils relèvent le niveau de sécurité pour un coût minime. Le **journal d'accès** (R-S3) et la **CSP** (R-S4) viennent ensuite. Le **chiffrement au repos** (R-S6) et la **2FA** (R-S9), plus coûteux, sont à planifier au-delà du cadre académique.

### Séquencement proposé

| Vague | Remédiations | Justification |
|---|---|---|
| **Immédiate** (avant prod réelle) | R-S2 (secret fort imposé), R-S1 (rate limiting) | Empêchent les abus d'auth les plus probables, effort minime |
| **Court terme** | R-S3 (journal d'accès câblé), R-S7 (audit dépendances) | Traçabilité et hygiène de chaîne, faciles à intégrer en CI |
| **Moyen terme** | R-S4 (CSP), R-S5 (CSRF), R-S8 (rotation secrets) | Défense en profondeur sur le front et les mutations |
| **Long terme / hors cadre** | R-S6 (chiffrement repos), R-S9 (2FA) | Pertinents pour une exploitation réelle à plus grande échelle |

---

## Hypothèses

> **Hypothèse — confiance : élevée** — La terminaison TLS, la redirection HTTPS et d'éventuels en-têtes HSTS sont gérés par Traefik en production, hors du code applicatif inspecté.

> **Hypothèse — confiance : élevée** — `JWT_SECRET` est surchargé par une valeur forte en production ; le défaut du code (`dev_secret_change_me`) n'est destiné qu'au développement local.

> **Hypothèse — confiance : moyenne** — Les seuls appels réseau sortants visent des destinations tierces fixes (Anthropic, Brevo) ; aucune fonctionnalité de récupération d'URL arbitraire n'a été repérée, d'où une exposition SSRF jugée faible.

> **Hypothèse — confiance : moyenne** — Les sauvegardes du fichier SQLite et la gestion des secrets (Anthropic, Brevo, VAPID) suivent une hygiène raisonnable côté exploitation. *Procédures non documentées dans le code.*

*Information non identifiée dans le code ou la conversation : configuration exacte des labels Traefik en prod, politique de sauvegarde/restauration, et présence d'un WAF en bordure.*

## Risques & points d'attention

- **Le cloisonnement par propriétaire est la frontière critique** : toute nouvelle route manipulant un dossier/une session/un CR doit impérativement rejouer la vérification de propriété (`owns`) côté API. Une route oubliant ce contrôle rouvrirait un IDOR (A01).
- **Le journal d'accès est inactif** : en l'état, un incident de sécurité serait difficile à reconstituer. C'est le principal angle mort de détection (A09).
- **Pas de rate limiting** : malgré bcrypt, les endpoints d'auth restent exposés au brute force et à l'énumération.
- **Secret par défaut** : un déploiement qui oublierait de surcharger `JWT_SECRET` exposerait toutes les sessions à la falsification — risque à fort impact, à verrouiller par un contrôle au démarrage.
- **Contenu HTML riche** : la sécurité anti-XSS repose entièrement sur DOMPurify côté rendu ; toute nouvelle surface affichant du HTML utilisateur doit réutiliser `HtmlContent` (jamais de `dangerouslySetInnerHTML` brut).

## Recommandations

1. **Verrouiller le secret en prod** (R-S2) : refuser le démarrage en `NODE_ENV=production` si `JWT_SECRET` vaut le défaut ou est absent.
2. **Introduire un rate limiter** (R-S1) sur `/api/auth/login`, `/request-reset`, `/register` et `/reset`.
3. **Câbler `journal_acces`** (R-S3) sur les actions sensibles : connexion, accès à un dossier, traitements RGPD admin, changements d'e-mail/mot de passe.
4. **Automatiser l'audit des dépendances** (R-S7) via `npm audit` / Dependabot dans la CI.
5. **Durcir la CSP** (R-S4) et **ajouter un jeton CSRF** (R-S5) pour la défense en profondeur du front et des mutations.
6. **Planifier** le chiffrement au repos (R-S6) et la 2FA (R-S9) pour une exploitation au-delà du cadre académique.
7. **Maintenir l'invariant de cloisonnement** : intégrer un cas de test de non-régression « accès cross-tenant → 404 » à la batterie ISTQB pour chaque nouvelle ressource.

## Pages liées

- [Architecture technique](technical-architecture) — stack, conteneurs, frontières de déploiement
- [Architecture des données](data-architecture) — modèle 33 tables, actifs sensibles, RGPD
- [Documentation de l'API](api-documentation) — endpoints, gardes d'accès par route
- [Stratégie de test](testing-strategy) — couverture ISTQB, tests d'accès par rôle
- [Opérations](operations) — exploitation, secrets, sauvegardes, rétention
- [Déploiement](deployment) — Traefik, TLS, conteneurs
- [Registre des risques](risk-register) — risques projet (dont sécurité)
- [Dette technique](technical-debt) — éléments partiels à consolider
- [Décisions d'architecture (ADR)](adr) — choix structurants (SQLite, cookie JWT, repli IA)
- [Matrice de traçabilité](traceability-matrix) — couverture exigences/contrôles
