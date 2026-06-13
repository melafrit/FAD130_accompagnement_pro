# Catalogue de cas de test — Boussole

> Généré automatiquement à partir de la conception ISTQB. 1204 cas de test sur 19 domaines.
> Identifiant : BOUSSOLE-CAT-001 · Voir le plan : [01-Plan-de-test.md](01-Plan-de-test.md) · La matrice : [03-Matrice-tracabilite.md](03-Matrice-tracabilite.md)

## Domaine AUTH — 69 cas

**Endpoints couverts :**

- `POST /api/auth/register` · feature: `auth` · rôle: anonyme — Inscription d'un nouvel utilisateur (accompagnateur ou accompagné), envoi d'un email de vérification
- `GET /api/auth/verify-email` · feature: `auth` · rôle: anonyme — Vérification de l'email via jeton (active le compte, ou confirme un changement d'adresse)
- `POST /api/auth/login` · feature: `auth` · rôle: anonyme — Connexion, pose le cookie de session JWT
- `POST /api/auth/logout` · feature: `auth` · rôle: anonyme — Déconnexion, efface le cookie de session
- `GET /api/auth/me` · feature: `auth` · rôle: authentifié — Profil de l'utilisateur courant
- `GET /api/auth/me/features` · feature: `auth` · rôle: authentifié — Liste des fonctionnalités actives selon le plan (aucun plan = toutes)
- `PATCH /api/auth/me` · feature: `auth` · rôle: authentifié — Mise à jour du profil (prénom / nom)
- `POST /api/auth/change-password` · feature: `auth` · rôle: authentifié — Changement de mot de passe depuis le profil (vérifie l'ancien)
- `POST /api/auth/change-email` · feature: `auth` · rôle: authentifié — Changement d'adresse e-mail avec re-validation par lien envoyé à la nouvelle adresse
- `POST /api/auth/request-reset` · feature: `auth` · rôle: anonyme — Demande de réinitialisation du mot de passe (réponse anti-énumération)
- `POST /api/auth/reset` · feature: `auth` · rôle: anonyme — Réinitialisation du mot de passe via jeton

### TC-AUTH-001 — Inscription nominale d'un accompagné valide retourne 201

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | partition d'équivalence (classe valide), test du contrat |

- **Préconditions :** Aucun compte avec l'email choisi n'existe en base.
- **Données :** { email: 'nouveau1@boussole.demo', password: 'MotDePasse1', role: 'accompagne', nom: 'Test', prenom: 'Nelly', consent: true }
- **Étapes :**
  1. POST /api/auth/register avec le corps valide
  2. Lire le statut et le corps JSON
- **Résultat attendu :** HTTP 201 ; corps { ok: true, message } avec message non vide mentionnant la vérification email ; une ligne users (email_verifie=0), une ligne consentements (version_cgu=1.0, version_pc=1.0) et un token type 'verif_email' non utilisé créés en base.
- **Traçabilité :** auth — POST /api/auth/register
- **Automatisation :** ✅ api/auth.test.ts

### TC-AUTH-002 — Inscription nominale d'un accompagnateur valide retourne 201

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | partition d'équivalence (valeur du rôle), test du contrat |

- **Préconditions :** Email inexistant en base.
- **Données :** { email: 'nouvelacc@boussole.demo', password: 'MotDePasse1', role: 'accompagnateur', consent: true } (nom/prenom omis)
- **Étapes :**
  1. POST /api/auth/register sans nom ni prénom
  2. Lire statut et base
- **Résultat attendu :** HTTP 201 ; utilisateur créé avec role='accompagnateur', nom=NULL, prenom=NULL ; token verif_email émis.
- **Traçabilité :** auth — POST /api/auth/register
- **Automatisation :** ✅ api/auth.test.ts

### TC-AUTH-003 — Inscription refusée si mot de passe trop court (7 caractères)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | haute | valeurs limites (longueur min=8, juste en-dessous) |

- **Préconditions :** Email inexistant.
- **Données :** { email: 'court@boussole.demo', password: 'Abcdef1', role: 'accompagne', consent: true } (7 caractères)
- **Étapes :**
  1. POST /api/auth/register
  2. Lire statut et corps
- **Résultat attendu :** HTTP 400 ; corps { error } mentionnant 'mot de passe ≥ 8 caractères, consentement requis' ; aucun utilisateur créé.
- **Traçabilité :** auth — POST /api/auth/register (registerSchema password.min(8))
- **Automatisation :** ✅ api/auth.test.ts

### TC-AUTH-004 — Inscription acceptée à la limite basse du mot de passe (8 caractères)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | haute | valeurs limites (longueur min=8, valeur limite valide) |

- **Préconditions :** Email inexistant.
- **Données :** { email: 'limite8@boussole.demo', password: 'Abcdefg1', role: 'accompagne', consent: true } (exactement 8)
- **Étapes :**
  1. POST /api/auth/register
  2. Lire statut
- **Résultat attendu :** HTTP 201 ; compte créé. Confirme que 8 caractères est accepté (frontière inclusive).
- **Traçabilité :** auth — POST /api/auth/register (registerSchema password.min(8))
- **Automatisation :** ✅ api/auth.test.ts

### TC-AUTH-005 — Inscription refusée si consentement absent ou false

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | haute | table de décision (consent ∈ {absent, false, true}), partition d'équivalence |

- **Préconditions :** Email inexistant.
- **Données :** Variante A: { email, password:'MotDePasse1', role:'accompagne' } sans consent. Variante B: même corps avec consent:false.
- **Étapes :**
  1. POST /api/auth/register variante A
  2. POST /api/auth/register variante B
  3. Lire statuts
- **Résultat attendu :** HTTP 400 dans les deux cas (z.literal(true) exige consent strictement true) ; aucun utilisateur créé.
- **Traçabilité :** auth — POST /api/auth/register (registerSchema consent: z.literal(true))
- **Automatisation :** ✅ api/auth.test.ts

### TC-AUTH-006 — Inscription refusée si email mal formé

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | haute | partition d'équivalence (email invalide), valeurs limites |

- **Préconditions :** Aucune.
- **Données :** { email: 'pasunemail', password: 'MotDePasse1', role: 'accompagne', consent: true }
- **Étapes :**
  1. POST /api/auth/register
  2. Lire statut
- **Résultat attendu :** HTTP 400 ; aucun utilisateur créé.
- **Traçabilité :** auth — POST /api/auth/register (registerSchema email)
- **Automatisation :** ✅ api/auth.test.ts

### TC-AUTH-007 — Inscription refusée si rôle invalide (ex. 'admin')

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | haute | partition d'équivalence (enum role: valeurs hors {accompagnateur, accompagne}) |

- **Préconditions :** Email inexistant.
- **Données :** { email: 'roleadmin@boussole.demo', password: 'MotDePasse1', role: 'admin', consent: true }
- **Étapes :**
  1. POST /api/auth/register avec role='admin'
  2. Idem avec role='inconnu'
  3. Lire statuts
- **Résultat attendu :** HTTP 400 dans les deux cas ; impossible de se créer un compte admin par l'inscription publique (le schéma n'accepte que accompagnateur/accompagne).
- **Traçabilité :** auth — POST /api/auth/register (registerSchema role enum)
- **Automatisation :** ✅ api/auth.test.ts

### TC-AUTH-008 — Inscription en conflit : email déjà existant retourne 409

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | haute | test du contrat (conflit), partition d'équivalence |

- **Préconditions :** Le compte démo afrit_mohamed@yahoo.fr existe déjà en base.
- **Données :** { email: 'afrit_mohamed@yahoo.fr', password: 'MotDePasse1', role: 'accompagne', consent: true }
- **Étapes :**
  1. POST /api/auth/register avec un email déjà pris
  2. Lire statut et corps
- **Résultat attendu :** HTTP 409 ; corps { error: 'Un compte existe déjà avec cet email' } ; aucun doublon créé.
- **Traçabilité :** auth — POST /api/auth/register (SELECT id FROM users WHERE email=?)
- **Automatisation :** ✅ api/auth.test.ts

### TC-AUTH-009 — Inscription : nom vide explicite ('') rejeté par min(1)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | basse | valeurs limites (chaîne optionnelle min(1) fournie vide) |

- **Préconditions :** Email inexistant.
- **Données :** { email: 'nomvide@boussole.demo', password: 'MotDePasse1', role: 'accompagne', nom: '', consent: true }
- **Étapes :**
  1. POST /api/auth/register avec nom=''
  2. Lire statut
- **Résultat attendu :** HTTP 400 (nom optionnel mais min(1) si présent) ; aucun utilisateur créé.
- **Traçabilité :** auth — POST /api/auth/register (registerSchema nom.min(1).optional())
- **Automatisation :** ✅ api/auth.test.ts

### TC-AUTH-010 — Vérification d'email nominale active le compte

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat, partition d'équivalence (jeton valide) |

- **Préconditions :** Un compte vient d'être inscrit (email_verifie=0). Récupérer en base via 'docker exec <api> sqlite3 /data/boussole.db "SELECT valeur FROM tokens WHERE user_id=<id> AND type='verif_email' AND utilise=0"'.
- **Données :** token = valeur lue en base ; email_cible NULL
- **Étapes :**
  1. GET /api/auth/verify-email?token=<token>
  2. Lire statut et corps
  3. Vérifier users.email_verifie et tokens.utilise
- **Résultat attendu :** HTTP 200 ; corps { ok:true, message:'Email vérifié. Vous pouvez vous connecter.' } ; users.email_verifie=1 ; tokens.utilise=1.
- **Traçabilité :** auth — GET /api/auth/verify-email
- **Automatisation :** ✅ api/auth.test.ts

### TC-AUTH-011 — Vérification d'email avec jeton inexistant/invalide retourne 400

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | haute | partition d'équivalence (jeton invalide), test du contrat |

- **Préconditions :** Aucune.
- **Données :** token = 'deadbeef000000' (n'existe pas)
- **Étapes :**
  1. GET /api/auth/verify-email?token=deadbeef000000
  2. Lire statut
- **Résultat attendu :** HTTP 400 ; corps { error: 'Lien invalide ou expiré' }.
- **Traçabilité :** auth — GET /api/auth/verify-email (row absent)
- **Automatisation :** ✅ api/auth.test.ts

### TC-AUTH-012 — Vérification d'email avec jeton expiré retourne 400

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | haute | valeurs limites (expire_le < maintenant), test du contrat |

- **Préconditions :** Inscrire un compte puis forcer l'expiration via docker exec : UPDATE tokens SET expire_le='2000-01-01T00:00:00.000Z' WHERE valeur=<token>.
- **Données :** token expiré valide en forme mais expire_le passé
- **Étapes :**
  1. GET /api/auth/verify-email?token=<token expiré>
  2. Lire statut
- **Résultat attendu :** HTTP 400 ; corps { error: 'Lien invalide ou expiré' } ; compte non activé.
- **Traçabilité :** auth — GET /api/auth/verify-email (expire_le < now)
- **Automatisation :** ✅ api/auth.test.ts

### TC-AUTH-013 — Vérification d'email avec jeton déjà utilisé retourne 400

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | test du contrat (rejouabilité interdite), partition d'équivalence |

- **Préconditions :** Jeton déjà consommé une fois (utilise=1).
- **Données :** token déjà utilisé (cf. TC-AUTH-010)
- **Étapes :**
  1. Rejouer GET /api/auth/verify-email?token=<token déjà utilisé>
  2. Lire statut
- **Résultat attendu :** HTTP 400 ; corps { error: 'Lien invalide ou expiré' } (la requête filtre utilise=0).
- **Traçabilité :** auth — GET /api/auth/verify-email (utilise=0 dans le WHERE)
- **Automatisation :** ✅ api/auth.test.ts

### TC-AUTH-014 — Vérification d'email sans paramètre token retourne 400

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | valeurs limites (token absent -> chaîne vide) |

- **Préconditions :** Aucune.
- **Données :** aucun query string
- **Étapes :**
  1. GET /api/auth/verify-email (sans ?token)
  2. Lire statut
- **Résultat attendu :** HTTP 400 ; corps { error: 'Lien invalide ou expiré' } (token coalescé en '' ne matche aucune ligne).
- **Traçabilité :** auth — GET /api/auth/verify-email (String(req.query.token||''))
- **Automatisation :** ✅ api/auth.test.ts

### TC-AUTH-015 — Confirmation de changement d'e-mail via jeton à email_cible met à jour l'adresse

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat (branche email_cible), table de décision |

- **Préconditions :** Un utilisateur authentifié a demandé un change-email (cf. TC-AUTH-035) ; un token verif_email avec email_cible existe. Lire la valeur en base via docker exec.
- **Données :** token = jeton de changement d'e-mail (email_cible='nouvelle@boussole.demo')
- **Étapes :**
  1. GET /api/auth/verify-email?token=<token email_cible>
  2. Lire statut et corps
  3. Vérifier users.email et users.email_pending
- **Résultat attendu :** HTTP 200 ; corps message='Nouvelle adresse e-mail confirmée.' ; users.email=nouvelle adresse, email_pending=NULL, email_verifie=1 ; token utilise=1.
- **Traçabilité :** auth — GET /api/auth/verify-email (branche row.email_cible)
- **Automatisation :** ✅ api/auth.test.ts

### TC-AUTH-016 — Confirmation de changement d'e-mail bloquée si l'adresse cible a été prise entre-temps (409)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | table de décision (email_cible existe + déjà pris par un autre compte) |

- **Préconditions :** Un token email_cible='collision@boussole.demo' existe ; entre-temps un AUTRE compte a été créé avec collision@boussole.demo.
- **Données :** token de changement vers une adresse désormais prise par un autre compte
- **Étapes :**
  1. GET /api/auth/verify-email?token=<token>
  2. Lire statut et corps
- **Résultat attendu :** HTTP 409 ; corps { error: 'Cette adresse e-mail est désormais utilisée par un autre compte.' } ; l'email courant inchangé, token NON marqué utilisé.
- **Traçabilité :** auth — GET /api/auth/verify-email (taken sur email_cible)
- **Automatisation :** ✅ api/auth.test.ts

### TC-AUTH-017 — Connexion nominale d'un compte vérifié pose le cookie et renvoie l'utilisateur

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat, partition d'équivalence (identifiants valides) |

- **Préconditions :** Le compte démo afrit_mohamed@yahoo.fr existe, est actif et email_verifie=1.
- **Données :** { email: 'afrit_mohamed@yahoo.fr', password: 'BoussoleDemo2026' }
- **Étapes :**
  1. POST /api/auth/login
  2. Lire statut, corps et en-tête Set-Cookie
- **Résultat attendu :** HTTP 200 ; corps { user: { id, email, role:'accompagne', nom, prenom } } ; en-tête Set-Cookie boussole_token (HttpOnly, SameSite=Lax) présent ; users.dernier_acces mis à jour.
- **Traçabilité :** auth — POST /api/auth/login
- **Automatisation :** ✅ api/auth.test.ts

### TC-AUTH-018 — Connexion refusée avec mot de passe incorrect retourne 401

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | partition d'équivalence (mot de passe invalide), test du contrat |

- **Préconditions :** Compte démo existant.
- **Données :** { email: 'afrit_mohamed@yahoo.fr', password: 'MauvaisMotDePasse' }
- **Étapes :**
  1. POST /api/auth/login
  2. Lire statut et corps
- **Résultat attendu :** HTTP 401 ; corps { error: 'Identifiants incorrects' } ; aucun cookie posé.
- **Traçabilité :** auth — POST /api/auth/login (bcrypt.compare false)
- **Automatisation :** ✅ api/auth.test.ts

### TC-AUTH-019 — Connexion refusée avec email inconnu retourne 401

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | partition d'équivalence (utilisateur inexistant) |

- **Préconditions :** Aucune.
- **Données :** { email: 'inexistant@boussole.demo', password: 'MotDePasse1' }
- **Étapes :**
  1. POST /api/auth/login
  2. Lire statut et corps
- **Résultat attendu :** HTTP 401 ; corps { error: 'Identifiants incorrects' } (même message que mauvais mot de passe : anti-énumération).
- **Traçabilité :** auth — POST /api/auth/login (user absent)
- **Automatisation :** ✅ api/auth.test.ts

### TC-AUTH-020 — Connexion refusée pour compte non vérifié retourne 403

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | table de décision (actif=1, password ok, email_verifie=0) |

- **Préconditions :** Inscrire un compte sans vérifier l'email (email_verifie=0).
- **Données :** { email: <compte non vérifié>, password: <son mot de passe> }
- **Étapes :**
  1. POST /api/auth/login avec identifiants corrects d'un compte non vérifié
  2. Lire statut et corps
- **Résultat attendu :** HTTP 403 ; corps { error: 'Email non vérifié. Consultez votre boîte mail.' } ; aucun cookie posé.
- **Traçabilité :** auth — POST /api/auth/login (!user.email_verifie)
- **Automatisation :** ✅ api/auth.test.ts

### TC-AUTH-021 — Connexion refusée pour compte désactivé retourne 403

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | table de décision (actif=0) |

- **Préconditions :** Forcer actif=0 sur un compte via docker exec : UPDATE users SET actif=0 WHERE email=<compte>.
- **Données :** { email: <compte désactivé>, password: <bon mot de passe> }
- **Étapes :**
  1. POST /api/auth/login avec identifiants corrects d'un compte désactivé
  2. Lire statut et corps
- **Résultat attendu :** HTTP 403 ; corps { error: 'Compte désactivé' }. Note : le contrôle actif précède la comparaison du mot de passe.
- **Traçabilité :** auth — POST /api/auth/login (!user.actif)
- **Automatisation :** ✅ api/auth.test.ts

### TC-AUTH-022 — Connexion refusée si corps invalide (email mal formé ou password manquant) retourne 400

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | partition d'équivalence (corps non conforme au schéma) |

- **Préconditions :** Aucune.
- **Données :** Variante A: { email: 'pasunemail', password: 'x' } ; Variante B: { email: 'a@b.fr' } sans password
- **Étapes :**
  1. POST /api/auth/login variante A
  2. POST /api/auth/login variante B
  3. Lire statuts
- **Résultat attendu :** HTTP 400 ; corps { error: 'Données invalides' } pour les deux variantes (schéma exige email valide + password string).
- **Traçabilité :** auth — POST /api/auth/login (zod safeParse)
- **Automatisation :** ✅ api/auth.test.ts

### TC-AUTH-023 — Déconnexion efface le cookie de session

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | test du contrat |

- **Préconditions :** Aucune (l'endpoint n'exige pas d'authentification).
- **Données :** aucun corps
- **Étapes :**
  1. POST /api/auth/logout
  2. Lire statut, corps et Set-Cookie
- **Résultat attendu :** HTTP 200 ; corps { ok:true } ; en-tête Set-Cookie qui efface boussole_token (Max-Age=0 / expiration passée).
- **Traçabilité :** auth — POST /api/auth/logout
- **Automatisation :** ✅ api/auth.test.ts

### TC-AUTH-024 — GET /me nominal renvoie le profil de l'utilisateur authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat (forme de réponse) |

- **Préconditions :** Cookie de session valide obtenu via login (TC-AUTH-017).
- **Données :** cookie boussole_token valide
- **Étapes :**
  1. GET /api/auth/me avec le cookie
  2. Lire statut et corps
- **Résultat attendu :** HTTP 200 ; corps { user: { id, email, role, nom, prenom } } correspondant au compte connecté ; pas de password_hash exposé.
- **Traçabilité :** auth — GET /api/auth/me (requireAuth)
- **Automatisation :** ✅ api/auth.test.ts

### TC-AUTH-025 — GET /me sans cookie retourne 401 Non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles (anonyme), test du contrat |

- **Préconditions :** Aucun cookie.
- **Données :** aucun cookie
- **Étapes :**
  1. GET /api/auth/me sans cookie
  2. Lire statut et corps
- **Résultat attendu :** HTTP 401 ; corps { error: 'Non authentifié' }.
- **Traçabilité :** auth — GET /api/auth/me (requireAuth, token absent)
- **Automatisation :** ✅ api/auth.test.ts

### TC-AUTH-026 — GET /me avec cookie/JWT altéré retourne 401 Session invalide

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | partition d'équivalence (jeton corrompu), test du contrat |

- **Préconditions :** Aucune.
- **Données :** Cookie boussole_token=eyJ.invalide.signature
- **Étapes :**
  1. GET /api/auth/me avec un cookie JWT falsifié
  2. Lire statut et corps
- **Résultat attendu :** HTTP 401 ; corps { error: 'Session invalide' } (jwt.verify échoue).
- **Traçabilité :** auth — GET /api/auth/me (requireAuth, jwt.verify catch)
- **Automatisation :** ✅ api/auth.test.ts

### TC-AUTH-027 — GET /me/features sans plan renvoie TOUTES les fonctionnalités

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat, partition d'équivalence (utilisateur sans plan) |

- **Préconditions :** Compte démo sans plan_id (cas par défaut). Login préalable.
- **Données :** cookie valide d'un compte sans plan
- **Étapes :**
  1. GET /api/auth/me/features
  2. Lire statut et corps
  3. Comparer au registre FEATURES (37 clés)
- **Résultat attendu :** HTTP 200 ; corps { features: [...] } tableau de chaînes ; contient toutes les clés de ALL_FEATURE_KEYS (ex. 'questionnaire', 'miroir', 'export_pdf') car aucun plan = niveau max.
- **Traçabilité :** auth — GET /api/auth/me/features (userFeatures sans plan)
- **Automatisation :** ✅ api/auth.test.ts

### TC-AUTH-028 — GET /me/features avec plan Découverte renvoie le sous-ensemble socle

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | test du contrat, partition d'équivalence (utilisateur avec plan limité) |

- **Préconditions :** Affecter le plan Découverte à un compte de test via docker exec : UPDATE users SET plan_id=(SELECT id FROM plans WHERE nom='Découverte') WHERE email=<compte>.
- **Données :** cookie d'un compte rattaché au plan Découverte
- **Étapes :**
  1. GET /api/auth/me/features
  2. Lire statut et corps
  3. Vérifier que la liste correspond aux features du plan
- **Résultat attendu :** HTTP 200 ; corps { features } = exactement les clés stockées dans plans.features du plan Découverte (sous-ensemble strict, p.ex. ne contient PAS 'export_pdf' si hors socle).
- **Traçabilité :** auth — GET /api/auth/me/features (userFeatures avec plan)
- **Automatisation :** ✅ api/auth.test.ts

### TC-AUTH-029 — GET /me/features sans authentification retourne 401

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles (anonyme) |

- **Préconditions :** Aucun cookie.
- **Données :** aucun cookie
- **Étapes :**
  1. GET /api/auth/me/features sans cookie
  2. Lire statut
- **Résultat attendu :** HTTP 401 ; corps { error: 'Non authentifié' }.
- **Traçabilité :** auth — GET /api/auth/me/features (requireAuth)
- **Automatisation :** ✅ api/auth.test.ts

### TC-AUTH-030 — PATCH /me met à jour prénom et nom

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | test du contrat, partition d'équivalence (valeurs valides) |

- **Préconditions :** Cookie valide.
- **Données :** { prenom: 'Amine', nom: 'El Afrit' }
- **Étapes :**
  1. PATCH /api/auth/me
  2. Lire statut et corps
  3. GET /api/auth/me pour confirmer la persistance
- **Résultat attendu :** HTTP 200 ; corps { user } reflétant prenom='Amine', nom='El Afrit' ; persistance confirmée en relecture.
- **Traçabilité :** auth — PATCH /api/auth/me
- **Automatisation :** ✅ api/auth.test.ts

### TC-AUTH-031 — PATCH /me normalise chaînes vides en NULL

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | basse | valeurs limites (chaîne vide / espaces -> null après trim) |

- **Préconditions :** Cookie valide.
- **Données :** { prenom: '   ', nom: '' }
- **Étapes :**
  1. PATCH /api/auth/me avec prénom espaces et nom vide
  2. Lire corps
  3. GET /api/auth/me
- **Résultat attendu :** HTTP 200 ; user.prenom=null et user.nom=null (trim() puis || null).
- **Traçabilité :** auth — PATCH /api/auth/me (trim() || null)
- **Automatisation :** ✅ api/auth.test.ts

### TC-AUTH-032 — PATCH /me refuse un prénom dépassant 80 caractères

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | valeurs limites (longueur max=80, juste au-dessus) |

- **Préconditions :** Cookie valide.
- **Données :** { prenom: '<chaîne de 81 caractères>' }
- **Étapes :**
  1. PATCH /api/auth/me avec prénom de 81 caractères
  2. Lire statut
- **Résultat attendu :** HTTP 400 ; corps { error: 'Données invalides' } (max(80)). Vérifier aussi que 80 caractères exactement passe (HTTP 200).
- **Traçabilité :** auth — PATCH /api/auth/me (prenom.max(80))
- **Automatisation :** ✅ api/auth.test.ts

### TC-AUTH-033 — PATCH /me sans authentification retourne 401

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles (anonyme) |

- **Préconditions :** Aucun cookie.
- **Données :** { prenom: 'X' }
- **Étapes :**
  1. PATCH /api/auth/me sans cookie
  2. Lire statut
- **Résultat attendu :** HTTP 401 ; corps { error: 'Non authentifié' }.
- **Traçabilité :** auth — PATCH /api/auth/me (requireAuth)
- **Automatisation :** ✅ api/auth.test.ts

### TC-AUTH-034 — Changement de mot de passe nominal avec ancien correct

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat, partition d'équivalence (ancien valide + nouveau valide) |

- **Préconditions :** Compte de test connecté dont on connaît le mot de passe actuel.
- **Données :** { ancien: '<mot de passe actuel>', nouveau: 'NouveauMdp1' }
- **Étapes :**
  1. POST /api/auth/change-password
  2. Lire statut
  3. Se déconnecter puis se reconnecter avec le nouveau mot de passe
- **Résultat attendu :** HTTP 200 ; corps { ok:true } ; reconnexion réussie avec 'NouveauMdp1' et échec avec l'ancien.
- **Traçabilité :** auth — POST /api/auth/change-password
- **Automatisation :** ✅ api/auth.test.ts

### TC-AUTH-035 — Changement de mot de passe refusé si ancien incorrect retourne 400

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | haute | table de décision (ancien faux + nouveau valide) |

- **Préconditions :** Compte de test connecté.
- **Données :** { ancien: 'PasLeBon', nouveau: 'NouveauMdp1' }
- **Étapes :**
  1. POST /api/auth/change-password avec ancien erroné
  2. Lire statut et corps
- **Résultat attendu :** HTTP 400 ; corps { error: 'Mot de passe actuel incorrect.' } ; mot de passe inchangé.
- **Traçabilité :** auth — POST /api/auth/change-password (bcrypt.compare ancien)
- **Automatisation :** ✅ api/auth.test.ts

### TC-AUTH-036 — Changement de mot de passe refusé si nouveau < 8 caractères retourne 400

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | haute | valeurs limites (nouveau.min(8), 7 caractères) |

- **Préconditions :** Compte de test connecté.
- **Données :** { ancien: '<mot de passe actuel>', nouveau: 'Court12' } (7 caractères)
- **Étapes :**
  1. POST /api/auth/change-password avec nouveau de 7 caractères
  2. Lire statut et corps
- **Résultat attendu :** HTTP 400 ; corps { error: 'Le nouveau mot de passe doit faire au moins 8 caractères.' } (la validation du schéma précède la vérification de l'ancien).
- **Traçabilité :** auth — POST /api/auth/change-password (nouveau.min(8))
- **Automatisation :** ✅ api/auth.test.ts

### TC-AUTH-037 — Changement de mot de passe sans authentification retourne 401

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles (anonyme) |

- **Préconditions :** Aucun cookie.
- **Données :** { ancien: 'x', nouveau: 'NouveauMdp1' }
- **Étapes :**
  1. POST /api/auth/change-password sans cookie
  2. Lire statut
- **Résultat attendu :** HTTP 401 ; corps { error: 'Non authentifié' }.
- **Traçabilité :** auth — POST /api/auth/change-password (requireAuth)
- **Automatisation :** ✅ api/auth.test.ts

### TC-AUTH-038 — Changement d'e-mail nominal émet un lien et met le nouvel e-mail en attente

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat (effets de bord en base) |

- **Préconditions :** Compte de test connecté ; adresse cible libre.
- **Données :** { email: 'nouvelle-adresse@boussole.demo' }
- **Étapes :**
  1. POST /api/auth/change-email
  2. Lire statut et corps
  3. Vérifier users.email_pending et le token verif_email avec email_cible en base
- **Résultat attendu :** HTTP 200 ; corps { ok:true, message } ; users.email courant inchangé, email_pending='nouvelle-adresse@boussole.demo' ; un token verif_email non utilisé avec email_cible=nouvelle adresse créé ; anciens tokens verif_email du même user marqués utilise=1.
- **Traçabilité :** auth — POST /api/auth/change-email
- **Automatisation :** ✅ api/auth.test.ts

### TC-AUTH-039 — Changement d'e-mail refusé si identique à l'adresse actuelle retourne 400

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | table de décision (email == adresse courante, insensible à la casse) |

- **Préconditions :** Compte de test connecté d'adresse afrit_mohamed@yahoo.fr.
- **Données :** { email: 'AFRIT_MOHAMED@YAHOO.FR' } (même adresse, casse différente)
- **Étapes :**
  1. POST /api/auth/change-email avec son adresse actuelle en majuscules
  2. Lire statut et corps
- **Résultat attendu :** HTTP 400 ; corps { error: 'C’est déjà votre adresse actuelle.' } (comparaison toLowerCase).
- **Traçabilité :** auth — POST /api/auth/change-email (me.email == email)
- **Automatisation :** ✅ api/auth.test.ts

### TC-AUTH-040 — Changement d'e-mail refusé si adresse déjà prise par un autre compte retourne 409

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | haute | test du contrat (conflit), partition d'équivalence |

- **Préconditions :** Compte de test connecté ; l'adresse cible appartient déjà à un autre compte (ex. lea.martin@boussole.demo).
- **Données :** { email: 'lea.martin@boussole.demo' }
- **Étapes :**
  1. POST /api/auth/change-email vers une adresse d'un autre utilisateur
  2. Lire statut et corps
- **Résultat attendu :** HTTP 409 ; corps { error: 'Cette adresse est déjà utilisée par un autre compte.' } ; aucun email_pending ni token émis.
- **Traçabilité :** auth — POST /api/auth/change-email (taken)
- **Automatisation :** ✅ api/auth.test.ts

### TC-AUTH-041 — Changement d'e-mail refusé si adresse mal formée retourne 400

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | partition d'équivalence (email invalide) |

- **Préconditions :** Compte de test connecté.
- **Données :** { email: 'pas-un-email' }
- **Étapes :**
  1. POST /api/auth/change-email avec email invalide
  2. Lire statut et corps
- **Résultat attendu :** HTTP 400 ; corps { error: 'Adresse e-mail invalide.' }.
- **Traçabilité :** auth — POST /api/auth/change-email (z.string().email())
- **Automatisation :** ✅ api/auth.test.ts

### TC-AUTH-042 — Changement d'e-mail sans authentification retourne 401

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles (anonyme) |

- **Préconditions :** Aucun cookie.
- **Données :** { email: 'x@boussole.demo' }
- **Étapes :**
  1. POST /api/auth/change-email sans cookie
  2. Lire statut
- **Résultat attendu :** HTTP 401 ; corps { error: 'Non authentifié' }.
- **Traçabilité :** auth — POST /api/auth/change-email (requireAuth)
- **Automatisation :** ✅ api/auth.test.ts

### TC-AUTH-043 — Demande de réinitialisation pour un compte existant émet un jeton et répond 200 générique

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat, partition d'équivalence (email existant) |

- **Préconditions :** Compte démo existant (afrit_mohamed@yahoo.fr).
- **Données :** { email: 'afrit_mohamed@yahoo.fr' }
- **Étapes :**
  1. POST /api/auth/request-reset
  2. Lire statut et corps
  3. Vérifier un token type 'reset_mdp' créé en base (expire dans 2h)
- **Résultat attendu :** HTTP 200 ; corps { ok:true, message:'Si un compte existe, un email a été envoyé.' } ; un token reset_mdp non utilisé créé avec expire_le ≈ now+2h.
- **Traçabilité :** auth — POST /api/auth/request-reset
- **Automatisation :** ✅ api/auth.test.ts

### TC-AUTH-044 — Demande de réinitialisation pour un email inconnu répond aussi 200 (anti-énumération)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | partition d'équivalence (email inexistant), test du contrat (réponse indistinguable) |

- **Préconditions :** Aucun compte avec l'email.
- **Données :** { email: 'jamais-vu@boussole.demo' }
- **Étapes :**
  1. POST /api/auth/request-reset avec email inconnu
  2. Lire statut et corps
  3. Vérifier qu'aucun token n'est créé
- **Résultat attendu :** HTTP 200 ; corps identique au cas existant { ok:true, message:'Si un compte existe, un email a été envoyé.' } ; aucun token créé (pas de fuite d'information).
- **Traçabilité :** auth — POST /api/auth/request-reset (user absent)
- **Automatisation :** ✅ api/auth.test.ts

### TC-AUTH-045 — Demande de réinitialisation avec email mal formé retourne 400

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | partition d'équivalence (email invalide) |

- **Préconditions :** Aucune.
- **Données :** { email: 'arobase-manquant' }
- **Étapes :**
  1. POST /api/auth/request-reset avec email invalide
  2. Lire statut et corps
- **Résultat attendu :** HTTP 400 ; corps { error: 'Email invalide' }.
- **Traçabilité :** auth — POST /api/auth/request-reset (z.string().email())
- **Automatisation :** ✅ api/auth.test.ts

### TC-AUTH-046 — Réinitialisation nominale change le mot de passe et vérifie l'email

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat, partition d'équivalence (jeton valide + mdp valide) |

- **Préconditions :** Un token reset_mdp non utilisé existe (cf. TC-AUTH-043). Lire sa valeur en base via docker exec.
- **Données :** { token: '<valeur reset_mdp>', password: 'ResetMdp123' }
- **Étapes :**
  1. POST /api/auth/reset
  2. Lire statut et corps
  3. Vérifier users.email_verifie=1 et tokens.utilise=1
  4. Se connecter avec le nouveau mot de passe
- **Résultat attendu :** HTTP 200 ; corps { ok:true, message } ; users.password_hash modifié, email_verifie=1 ; token utilise=1 ; connexion réussie avec 'ResetMdp123'.
- **Traçabilité :** auth — POST /api/auth/reset
- **Automatisation :** ✅ api/auth.test.ts

### TC-AUTH-047 — Réinitialisation refusée avec jeton invalide retourne 400

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | haute | partition d'équivalence (jeton inexistant) |

- **Préconditions :** Aucune.
- **Données :** { token: 'jetoninexistant', password: 'ResetMdp123' }
- **Étapes :**
  1. POST /api/auth/reset avec un jeton bidon
  2. Lire statut et corps
- **Résultat attendu :** HTTP 400 ; corps { error: 'Lien invalide ou expiré' }.
- **Traçabilité :** auth — POST /api/auth/reset (row absent)
- **Automatisation :** ✅ api/auth.test.ts

### TC-AUTH-048 — Réinitialisation refusée avec jeton expiré retourne 400

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | valeurs limites (expire_le < maintenant) |

- **Préconditions :** Forcer un token reset_mdp expiré via docker exec : UPDATE tokens SET expire_le='2000-01-01T00:00:00.000Z' WHERE valeur=<token>.
- **Données :** { token: '<token reset expiré>', password: 'ResetMdp123' }
- **Étapes :**
  1. POST /api/auth/reset avec token expiré
  2. Lire statut et corps
- **Résultat attendu :** HTTP 400 ; corps { error: 'Lien invalide ou expiré' } ; mot de passe inchangé.
- **Traçabilité :** auth — POST /api/auth/reset (expire_le < now)
- **Automatisation :** ✅ api/auth.test.ts

### TC-AUTH-049 — Réinitialisation refusée avec jeton déjà utilisé retourne 400

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | test du contrat (jeton à usage unique) |

- **Préconditions :** Un token reset_mdp déjà consommé (utilise=1) suite à TC-AUTH-046.
- **Données :** { token: '<même token reset déjà utilisé>', password: 'AutreMdp123' }
- **Étapes :**
  1. Rejouer POST /api/auth/reset avec le même token
  2. Lire statut et corps
- **Résultat attendu :** HTTP 400 ; corps { error: 'Lien invalide ou expiré' } (WHERE utilise=0 exclut le jeton consommé).
- **Traçabilité :** auth — POST /api/auth/reset (utilise=0)
- **Automatisation :** ✅ api/auth.test.ts

### TC-AUTH-050 — Réinitialisation refusée avec mot de passe trop court retourne 400

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | haute | valeurs limites (password.min(8), 7 caractères) |

- **Préconditions :** Un token reset_mdp valide existe.
- **Données :** { token: '<token valide>', password: 'Court12' } (7 caractères)
- **Étapes :**
  1. POST /api/auth/reset avec mot de passe de 7 caractères
  2. Lire statut et corps
- **Résultat attendu :** HTTP 400 ; corps { error: 'Mot de passe trop court (≥ 8 caractères)' } ; token NON consommé (validation du schéma en amont).
- **Traçabilité :** auth — POST /api/auth/reset (password.min(8))
- **Automatisation :** ✅ api/auth.test.ts

### TC-AUTH-051 — Réinitialisation refusée si token manquant dans le corps retourne 400

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | basse | partition d'équivalence (champ requis absent) |

- **Préconditions :** Aucune.
- **Données :** { password: 'ResetMdp123' } (token absent)
- **Étapes :**
  1. POST /api/auth/reset sans token
  2. Lire statut
- **Résultat attendu :** HTTP 400 (schéma exige token:z.string()).
- **Traçabilité :** auth — POST /api/auth/reset (z.string() token requis)
- **Automatisation :** ✅ api/auth.test.ts

### TC-AUTH-052 — Unitaire — userFeatures() renvoie toutes les clés quand l'utilisateur n'a pas de plan

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | haute | test du contrat (repli déterministe), partition d'équivalence (plan absent) |

- **Préconditions :** Un userId existant sans plan_id (jointure plans vide).
- **Données :** userId d'un compte sans plan
- **Étapes :**
  1. Appeler userFeatures(userId)
  2. Comparer le Set à ALL_FEATURE_KEYS
- **Résultat attendu :** Le Set retourné contient exactement les 37 clés de ALL_FEATURE_KEYS (repli 'niveau max' quand la jointure ne renvoie aucune ligne).
- **Traçabilité :** features — userFeatures() (row undefined -> new Set(ALL_FEATURE_KEYS))
- **Automatisation :** ✅ unit/core.test.ts

### TC-AUTH-053 — Unitaire — userFeatures() retombe sur toutes les clés si plans.features est un JSON invalide

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | moyenne | test du contrat (repli sur exception JSON.parse) |

- **Préconditions :** Un utilisateur rattaché à un plan dont features='{ pas du json'.
- **Données :** userId rattaché à un plan au features corrompu
- **Étapes :**
  1. Appeler userFeatures(userId)
  2. Inspecter le Set retourné
- **Résultat attendu :** Le catch renvoie new Set(ALL_FEATURE_KEYS) (37 clés) au lieu de planter (repli déterministe sur parse error).
- **Traçabilité :** features — userFeatures() (catch -> ALL_FEATURE_KEYS)
- **Automatisation :** ✅ unit/core.test.ts

### TC-AUTH-054 — Unitaire — sanitizeKeys() filtre les clés inconnues et déduplique

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | moyenne | partition d'équivalence (valides / invalides), test du contrat |

- **Préconditions :** Aucune.
- **Données :** ['questionnaire', 'questionnaire', 'cle_bidon', 42, null, 'miroir']
- **Étapes :**
  1. Appeler sanitizeKeys(entrée)
  2. Inspecter le tableau retourné
- **Résultat attendu :** Retourne ['questionnaire','miroir'] : ne garde que les clés présentes dans VALID, déduplique, ignore les non-clés. Sur entrée non-tableau, retourne [].
- **Traçabilité :** features — sanitizeKeys()
- **Automatisation :** ✅ unit/core.test.ts

### TC-AUTH-055 — Unitaire — makeToken() produit un jeton hex de 64 caractères unique

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | basse | test du contrat (forme et unicité) |

- **Préconditions :** Aucune.
- **Données :** deux appels successifs
- **Étapes :**
  1. Appeler makeToken() deux fois
  2. Vérifier longueur et alphabet
  3. Comparer les deux valeurs
- **Résultat attendu :** Chaque jeton fait 64 caractères hexadécimaux (32 octets) ; les deux valeurs diffèrent.
- **Traçabilité :** util — makeToken() (randomBytes(32).toString('hex'))
- **Automatisation :** ✅ unit/core.test.ts

### TC-AUTH-056 — Unitaire — expiryHours() renvoie une date ISO future cohérente

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | basse | valeurs limites (h=2 reset, h=48 verif), test du contrat |

- **Préconditions :** Aucune.
- **Données :** expiryHours(48) et expiryHours(2)
- **Étapes :**
  1. Appeler expiryHours(48) et expiryHours(2)
  2. Parser et comparer à Date.now()
- **Résultat attendu :** Chaîne ISO valide ; écart ≈ 48h (resp. 2h) par rapport à maintenant (tolérance quelques secondes). Confirme la durée des liens verif_email (48h) et reset_mdp (2h).
- **Traçabilité :** util — expiryHours()
- **Automatisation :** ✅ unit/core.test.ts

### TC-AUTH-057 — Unitaire — requireRole() autorise le bon rôle et refuse les autres (403)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | acces | moyenne | test basé sur les rôles, table de décision (rôle ∈ / ∉ liste autorisée) |

- **Préconditions :** Middleware requireRole('accompagnateur') ; objets req/res/next simulés.
- **Données :** req.user.role ∈ {'accompagnateur' (autorisé), 'accompagne' (refusé), undefined (refusé)}
- **Étapes :**
  1. Invoquer le middleware avec chaque rôle
  2. Observer next() ou res.status
- **Résultat attendu :** next() appelé pour 'accompagnateur' ; res.status(403).json({error:'Accès refusé'}) et next() NON appelé pour 'accompagne' et utilisateur absent.
- **Traçabilité :** auth — requireRole()
- **Automatisation :** ✅ unit/core.test.ts

### TC-AUTH-058 — Unitaire — requireFeature() bloque (403) quand la fonctionnalité n'est pas dans l'offre

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | acces | moyenne | table de décision (auth + feature présente/absente) |

- **Préconditions :** Middleware requireFeature('export_pdf') ; req.user.id simulé.
- **Données :** Cas A: user sans plan (toutes features) ; Cas B: user dont le plan n'inclut pas 'export_pdf' ; Cas C: req.user absent
- **Étapes :**
  1. Invoquer le middleware pour A, B, C
  2. Observer next()/status
- **Résultat attendu :** A: next() appelé. B: res.status(403).json({error:'Fonctionnalité non disponible dans votre offre'}). C: res.status(401).json({error:'Non authentifié'}).
- **Traçabilité :** features — requireFeature()
- **Automatisation :** ✅ unit/core.test.ts

### TC-AUTH-059 — UI — Inscription complète depuis le formulaire avec consentement coché

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test du contrat (parcours bout-en-bout), test basé sur les rôles (anonyme) |

- **Préconditions :** Front servi sur http://localhost:8080 ; email de test non utilisé.
- **Données :** Prénom 'Nelly', email 'ui-inscription@boussole.demo', mot de passe 'MotDePasse1', rôle 'Personne accompagnée', case CGU cochée
- **Étapes :**
  1. Ouvrir /inscription
  2. Remplir les champs
  3. Constater que le bouton est désactivé tant que la case CGU n'est pas cochée
  4. Cocher la case puis soumettre
- **Résultat attendu :** Le bouton 'Créer mon compte' passe d'inactif à actif après coche ; après soumission, écran de confirmation 'Compte créé' avec message d'activation par email et lien vers la connexion.
- **Traçabilité :** auth — page Register.tsx (POST /api/auth/register)
- **Automatisation :** ⏳ à automatiser

### TC-AUTH-060 — UI — Inscription affiche l'erreur serveur en cas d'email déjà utilisé

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | validation | moyenne | partition d'équivalence (conflit), test du contrat |

- **Préconditions :** Le compte afrit_mohamed@yahoo.fr existe.
- **Données :** email 'afrit_mohamed@yahoo.fr', mot de passe 'MotDePasse1', CGU cochée
- **Étapes :**
  1. Ouvrir /inscription
  2. Saisir un email déjà pris et un mot de passe ≥8
  3. Cocher CGU et soumettre
- **Résultat attendu :** Message d'erreur 'Un compte existe déjà avec cet email' affiché (form-error) ; pas de redirection vers l'écran de succès.
- **Traçabilité :** auth — page Register.tsx (409 affiché)
- **Automatisation :** ⏳ à automatiser

### TC-AUTH-061 — UI — Connexion réussie redirige vers l'espace

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test du contrat (bout-en-bout), test basé sur les rôles |

- **Préconditions :** Compte démo afrit_mohamed@yahoo.fr actif et vérifié.
- **Données :** email 'afrit_mohamed@yahoo.fr', mot de passe 'BoussoleDemo2026'
- **Étapes :**
  1. Ouvrir /connexion
  2. Saisir identifiants valides
  3. Soumettre
- **Résultat attendu :** Redirection vers /espace ; le contexte d'authentification est rafraîchi (utilisateur connecté visible dans le menu).
- **Traçabilité :** auth — page Login.tsx (POST /api/auth/login + refresh)
- **Automatisation :** ⏳ à automatiser

### TC-AUTH-062 — UI — Connexion en échec affiche 'Identifiants incorrects'

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | acces | moyenne | partition d'équivalence (mauvais mot de passe) |

- **Préconditions :** Compte démo existant.
- **Données :** email 'afrit_mohamed@yahoo.fr', mot de passe 'mauvais'
- **Étapes :**
  1. Ouvrir /connexion
  2. Saisir un mauvais mot de passe
  3. Soumettre
- **Résultat attendu :** Message 'Identifiants incorrects' affiché (form-error) ; pas de redirection ; aucun cookie de session.
- **Traçabilité :** auth — page Login.tsx (401 affiché)
- **Automatisation :** ⏳ à automatiser

### TC-AUTH-063 — UI — Page de vérification d'email confirme l'activation via le lien

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | test du contrat (bout-en-bout) |

- **Préconditions :** Un token verif_email valide pour un compte non vérifié (lu en base via docker exec).
- **Données :** URL /verifier-email?token=<token valide>
- **Étapes :**
  1. Ouvrir /verifier-email?token=<token>
  2. Observer l'évolution de l'état
- **Résultat attendu :** Affichage 'Vérification…' puis 'Email vérifié ✅' avec le message serveur et un lien 'Se connecter'.
- **Traçabilité :** auth — page VerifyEmail.tsx (GET /api/auth/verify-email)
- **Automatisation :** ⏳ à automatiser

### TC-AUTH-064 — UI — Page de vérification d'email affiche l'échec si lien invalide

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | validation | basse | partition d'équivalence (jeton invalide / absent) |

- **Préconditions :** Aucune.
- **Données :** URL /verifier-email?token=invalide puis /verifier-email (sans token)
- **Étapes :**
  1. Ouvrir /verifier-email?token=invalide
  2. Ouvrir /verifier-email sans paramètre
- **Résultat attendu :** Titre 'Échec' avec message d'erreur ('Lien invalide ou expiré' pour token invalide, 'Lien invalide.' si token absent) ; pas de lien 'Se connecter'.
- **Traçabilité :** auth — page VerifyEmail.tsx (état error)
- **Automatisation :** ⏳ à automatiser

### TC-AUTH-065 — UI — Mot de passe oublié affiche le message générique anti-énumération

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | test du contrat (réponse indistinguable), partition d'équivalence |

- **Préconditions :** Front accessible.
- **Données :** email existant puis email inexistant
- **Étapes :**
  1. Ouvrir /mot-de-passe-oublie
  2. Saisir un email existant et soumettre
  3. Recommencer avec un email inconnu
- **Résultat attendu :** Dans les deux cas, message 'Si un compte existe pour cet email, un lien de réinitialisation vient d'être envoyé.' (aucune distinction entre compte existant et inexistant).
- **Traçabilité :** auth — page ForgotPassword.tsx (POST /api/auth/request-reset)
- **Automatisation :** ⏳ à automatiser

### TC-AUTH-066 — UI — Réinitialisation du mot de passe via le lien aboutit

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test du contrat (bout-en-bout), valeurs limites (≥8) |

- **Préconditions :** Un token reset_mdp valide (lu en base via docker exec).
- **Données :** URL /reinitialiser?token=<token>, nouveau mot de passe 'ResetMdp123'
- **Étapes :**
  1. Ouvrir /reinitialiser?token=<token>
  2. Saisir un nouveau mot de passe ≥8
  3. Valider
  4. Puis se connecter avec le nouveau mot de passe
- **Résultat attendu :** Message 'Mot de passe mis à jour ✅' et lien 'Se connecter' ; la connexion ultérieure avec le nouveau mot de passe réussit.
- **Traçabilité :** auth — page ResetPassword.tsx (POST /api/auth/reset)
- **Automatisation :** ⏳ à automatiser

### TC-AUTH-067 — UI — Profil : changement de mot de passe depuis l'espace personnel

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | test du contrat (bout-en-bout), test basé sur les rôles (authentifié) |

- **Préconditions :** Utilisateur connecté dont on connaît le mot de passe actuel.
- **Données :** ancien = mot de passe actuel, nouveau = 'NouveauMdp1'
- **Étapes :**
  1. Ouvrir la page Profil
  2. Saisir l'ancien et le nouveau mot de passe (+ confirmation)
  3. Soumettre
- **Résultat attendu :** Message 'Mot de passe modifié ✅' ; les champs se vident ; la reconnexion avec le nouveau mot de passe fonctionne.
- **Traçabilité :** auth — page Profil.tsx (POST /api/auth/change-password)
- **Automatisation :** ⏳ à automatiser

### TC-AUTH-068 — UI — Profil : demande de changement d'e-mail affiche le message de confirmation

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | test du contrat (bout-en-bout) |

- **Préconditions :** Utilisateur connecté ; adresse cible libre.
- **Données :** nouvelle adresse 'profil-nouvelle@boussole.demo'
- **Étapes :**
  1. Ouvrir la page Profil, section e-mail
  2. Saisir la nouvelle adresse
  3. Cliquer 'Changer l'e-mail'
- **Résultat attendu :** Message 'Un lien de confirmation a été envoyé à votre nouvelle adresse.' (ou message serveur équivalent) ; l'adresse actuelle reste affichée inchangée tant que le lien n'est pas confirmé.
- **Traçabilité :** auth — page Profil.tsx (POST /api/auth/change-email)
- **Automatisation :** ⏳ à automatiser

### TC-AUTH-069 — UI — Routes protégées redirigent l'anonyme vers la connexion

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | acces | haute | test basé sur les rôles (anonyme), test du contrat |

- **Préconditions :** Aucun cookie de session (navigation privée).
- **Données :** URL d'une page protégée (ex. /espace ou /profil)
- **Étapes :**
  1. Sans être connecté, ouvrir directement /espace
  2. Observer le comportement du composant Protected
- **Résultat attendu :** L'utilisateur anonyme est redirigé vers /connexion (ou voit l'écran de connexion) ; le contenu protégé n'est pas rendu.
- **Traçabilité :** auth — composant Protected.tsx + AuthContext (GET /api/auth/me 401)
- **Automatisation :** ⏳ à automatiser

## Domaine QUEST — 34 cas

**Endpoints couverts :**

- `POST /api/questionnaire/next` · feature: `questionnaire` · rôle: authentifié (tout rôle) — Étape suivante du questionnaire initial : appelle Claude (questionnaireNext) et renvoie {question, propositions[], termine, recapitulatif}. Repli déterministe (fallbackNext) si pas de clé API ou erreur. Gating : requireAuth seulement (tout rôle authentifié).
- `POST /api/questionnaire/save` · feature: `questionnaire` · rôle: accompagne — Enregistre le questionnaire complété : crée/réutilise un dossier (auto-assigné ou parcours ciblé via dossierId), persiste contenu+cr_recap dans questionnaires_initiaux, notifie l'accompagnateur. Gating : requireAuth + rôle 'accompagne' (contrôlé en code, 403 sinon).

### TC-QUEST-001 — POST /next — première étape (history vide) renvoie une question et le contrat de forme

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat ; partition d'équivalence (history vide) |

- **Préconditions :** Utilisateur authentifié (accompagne Amine). Repli actif si pas de clé Claude.
- **Données :** { "history": [] }
- **Étapes :**
  1. Se connecter en tant qu'accompagné (afrit_mohamed@yahoo.fr)
  2. POST /api/questionnaire/next avec body { history: [] }
- **Résultat attendu :** 200. Corps JSON avec les 4 champs : question (string), propositions (array de string), termine (boolean=false), recapitulatif (null ou string). En repli, question = 'Dans quelle entreprise et sur quel poste se déroule ton alternance ?'.
- **Traçabilité :** questionnaire — POST /api/questionnaire/next
- **Automatisation :** ✅ api/quest.test.ts

### TC-QUEST-002 — POST /next — étape intermédiaire (history partiel) renvoie l'étape suivante non terminée

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat ; partition d'équivalence (history partiel) |

- **Préconditions :** Authentifié.
- **Données :** history avec 3 paires {question, answer} valides
- **Étapes :**
  1. POST /api/questionnaire/next avec history de longueur 3
- **Résultat attendu :** 200. termine=false, question non vide, propositions est un tableau. En repli, la question correspond à FALLBACK_STEPS[3] ('Quels sont les enjeux — pour toi et pour l'entreprise ?').
- **Traçabilité :** questionnaire — POST /api/questionnaire/next
- **Automatisation :** ✅ api/quest.test.ts

### TC-QUEST-003 — POST /next — fin de parcours (history complet) renvoie termine=true + récapitulatif non vide

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | valeurs limites (longueur = seuil 6) ; test du contrat |

- **Préconditions :** Authentifié.
- **Données :** history avec 6 paires {question, answer} valides (= FALLBACK_STEPS.length)
- **Étapes :**
  1. POST /api/questionnaire/next avec history de longueur 6
- **Résultat attendu :** 200. termine=true, recapitulatif est une string non vide (commence par 'Récapitulatif de ta situation' en repli) et contient le rappel des questions/réponses ; question = ''.
- **Traçabilité :** questionnaire — POST /api/questionnaire/next (claude.ts fallbackNext)
- **Automatisation :** ✅ api/quest.test.ts

### TC-QUEST-004 — POST /next — gating accès : non authentifié -> 401

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles ; test du contrat |

- **Préconditions :** Aucun cookie boussole_token.
- **Données :** { "history": [] }
- **Étapes :**
  1. POST /api/questionnaire/next sans cookie d'auth
- **Résultat attendu :** 401 { error: 'Non authentifié' } (requireAuth).
- **Traçabilité :** questionnaire — POST /api/questionnaire/next (auth.ts requireAuth)
- **Automatisation :** ✅ api/quest.test.ts

### TC-QUEST-005 — POST /next — cookie/jeton invalide -> 401 session invalide

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles ; partition d'équivalence (jeton invalide) |

- **Préconditions :** Cookie boussole_token présent mais non décodable.
- **Données :** Cookie boussole_token = 'jeton.bidon.invalide'
- **Étapes :**
  1. POST /api/questionnaire/next avec un JWT corrompu
- **Résultat attendu :** 401 { error: 'Session invalide' }.
- **Traçabilité :** questionnaire — POST /api/questionnaire/next (auth.ts requireAuth)
- **Automatisation :** ✅ api/quest.test.ts

### TC-QUEST-006 — POST /next — accessible aussi à l'accompagnateur et à l'admin (pas de restriction de rôle)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles (couverture de toutes les classes de rôle) |

- **Préconditions :** Comptes accompagnateur (camille.laurent@boussole.demo) et admin (mohamed@elafrit.com).
- **Données :** { "history": [] }
- **Étapes :**
  1. Se connecter en accompagnateur puis POST /api/questionnaire/next
  2. Se connecter en admin puis POST /api/questionnaire/next
- **Résultat attendu :** 200 dans les deux cas : /next n'impose aucun rôle ni requireFeature, seul requireAuth s'applique.
- **Traçabilité :** questionnaire — POST /api/questionnaire/next
- **Automatisation :** ✅ api/quest.test.ts

### TC-QUEST-007 — POST /next — history absent ou non-tableau est toléré (coercition vers [])

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | partition d'équivalence (valide vs invalide non rejeté) ; robustesse d'entrée |

- **Préconditions :** Authentifié.
- **Données :** Cas A : body {} (history absent). Cas B : { "history": "abc" }. Cas C : { "history": 123 }.
- **Étapes :**
  1. POST /api/questionnaire/next avec chacun des corps A/B/C
- **Résultat attendu :** 200 dans tous les cas : Array.isArray(history) faux -> history=[] -> renvoie la première étape (termine=false), pas de 400.
- **Traçabilité :** questionnaire — POST /api/questionnaire/next
- **Automatisation :** ✅ api/quest.test.ts

### TC-QUEST-008 — POST /next — corps JSON malformé géré par le parseur (400 du middleware JSON)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | basse | partition d'équivalence (entrée malformée) |

- **Préconditions :** Authentifié.
- **Données :** Corps brut non-JSON : '{ history: '
- **Étapes :**
  1. POST /api/questionnaire/next avec Content-Type application/json et un corps JSON invalide
- **Résultat attendu :** 400 (rejet par express.json avant d'atteindre le handler) ; pas de 500 applicatif.
- **Traçabilité :** questionnaire — POST /api/questionnaire/next
- **Automatisation :** ✅ api/quest.test.ts

### TC-QUEST-009 — POST /next — erreur interne de génération -> 500 contrat d'erreur

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | basse | test du contrat (chemin d'erreur) ; analyse des branches |

- **Préconditions :** Authentifié. Simuler que questionnaireNext rejette (ex. dépendance indisponible).
- **Données :** { "history": [] } avec questionnaireNext forcé en rejet
- **Étapes :**
  1. Provoquer une exception dans questionnaireNext (mock/stub)
  2. POST /api/questionnaire/next
- **Résultat attendu :** 500 { error: 'Erreur lors de la génération de la question' } (bloc catch du handler).
- **Traçabilité :** questionnaire — POST /api/questionnaire/next
- **Automatisation :** ✅ api/quest.test.ts

### TC-QUEST-010 — UNITAIRE fallbackNext — étape n renvoie FALLBACK_STEPS[n] tant que history.length < 6

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | haute | partition d'équivalence ; valeurs limites (n=0 et n=5) |

- **Préconditions :** Fonction fallbackNext(history) isolée (claude.ts), sans clé Claude.
- **Données :** history de longueurs 0,1,2,3,4,5
- **Étapes :**
  1. Appeler fallbackNext avec chaque longueur 0..5
  2. Comparer question/propositions à FALLBACK_STEPS[length]
- **Résultat attendu :** Pour chaque n in [0..5] : retourne {question: FALLBACK_STEPS[n].question, propositions: FALLBACK_STEPS[n].propositions, termine:false, recapitulatif:null}. Étapes 4 et 5 ont des propositions non vides, étapes 0-3 ont propositions=[].
- **Traçabilité :** questionnaire — claude.ts fallbackNext
- **Automatisation :** ✅ unit/claude.test.ts

### TC-QUEST-011 — UNITAIRE fallbackNext — à length>=6 renvoie termine=true et récapitulatif agrégé depuis l'historique

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | haute | valeurs limites (seuil exact =6 et >6) ; test du contrat |

- **Préconditions :** fallbackNext isolée.
- **Données :** history de longueur 6 (et 7) avec paires {question, answer} connues
- **Étapes :**
  1. Appeler fallbackNext avec history de longueur 6
  2. Vérifier la structure du recap
- **Résultat attendu :** termine=true, question='', propositions=[], recapitulatif commence par 'Récapitulatif de ta situation (à valider) :' et liste chaque '• question\n  → answer'. Pour length 7 (>seuil), même comportement (couvre toutes les paires).
- **Traçabilité :** questionnaire — claude.ts fallbackNext
- **Automatisation :** ✅ unit/claude.test.ts

### TC-QUEST-012 — UNITAIRE extractJson — extrait le bloc JSON entouré de texte parasite

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | moyenne | partition d'équivalence ; valeurs limites (absence d'accolade) |

- **Préconditions :** Fonction extractJson(text) isolée (claude.ts).
- **Données :** Cas A : 'blabla {"question":"x"} fin'. Cas B : 'pas de json'. Cas C : '{"a":1} et {"b":2}'.
- **Étapes :**
  1. Appeler extractJson avec chaque cas
- **Résultat attendu :** A -> '{"question":"x"}'. B (pas d'accolade) -> renvoie le texte original. C -> du premier '{' au dernier '}' inclus (gère imbrication/multiples).
- **Traçabilité :** questionnaire — claude.ts extractJson
- **Automatisation :** ✅ unit/claude.test.ts

### TC-QUEST-013 — UNITAIRE questionnaireNext — bascule en repli si pas de clé API

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | haute | table de décision (clé présente/absente x history) ; test du contrat |

- **Préconditions :** ANTHROPIC_API_KEY non défini.
- **Données :** history de longueur 0
- **Étapes :**
  1. S'assurer que KEY est vide
  2. Appeler questionnaireNext([])
- **Résultat attendu :** Retourne directement fallbackNext([]) (première étape), sans appel réseau.
- **Traçabilité :** questionnaire — claude.ts questionnaireNext
- **Automatisation :** ✅ unit/claude.test.ts

### TC-QUEST-014 — UNITAIRE questionnaireNext — repli si réponse HTTP non-ok ou JSON inattendu

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | moyenne | analyse des branches ; test du contrat (chemins de repli) |

- **Préconditions :** ANTHROPIC_API_KEY défini ; fetch mocké.
- **Données :** Cas A : fetch renvoie status 500. Cas B : fetch renvoie 200 mais corps sans bloc JSON parsable.
- **Étapes :**
  1. Mock fetch pour A (res.ok=false)
  2. Mock fetch pour B (text sans accolade -> JSON.parse échoue)
  3. Appeler questionnaireNext(history)
- **Résultat attendu :** Dans A et B : retombe sur fallbackNext(history) (jamais d'exception remontée).
- **Traçabilité :** questionnaire — claude.ts questionnaireNext
- **Automatisation :** ✅ unit/claude.test.ts

### TC-QUEST-015 — UNITAIRE questionnaireNext — normalise les champs de la réponse IA (defaults sûrs)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | moyenne | partition d'équivalence (champs manquants) ; test du contrat |

- **Préconditions :** Clé définie ; fetch mocké renvoyant un JSON partiel.
- **Données :** content texte = '{"question":"Q?"}' (propositions/termine/recapitulatif absents)
- **Étapes :**
  1. Mock fetch 200 avec ce contenu
  2. Appeler questionnaireNext
- **Résultat attendu :** Retourne {question:'Q?', propositions:[] (défaut si non-array), termine:false (défaut !!undefined), recapitulatif:null}.
- **Traçabilité :** questionnaire — claude.ts questionnaireNext
- **Automatisation :** ✅ unit/claude.test.ts

### TC-QUEST-016 — POST /save — nominal sans dossierId : crée dossier auto-assigné + persiste + notifie

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat ; partition d'équivalence (branche sans dossierId) |

- **Préconditions :** Accompagné authentifié SANS dossier préexistant. Au moins un accompagnateur actif existe.
- **Données :** { history:[{question,answer}...], recapitulatif:'Récap…' } (sans dossierId)
- **Étapes :**
  1. Se connecter en accompagné neuf
  2. POST /api/questionnaire/save
- **Résultat attendu :** 200 { ok:true, dossierId:<nombre> }. Un lien_accompagnement et un dossier 'Accompagnement mémoire' sont créés ; une ligne questionnaires_initiaux (cr_recap=recapitulatif) est insérée ; une notification 'Un accompagné a complété son questionnaire initial.' est créée pour l'accompagnateur.
- **Traçabilité :** questionnaire — POST /api/questionnaire/save
- **Automatisation :** ✅ api/quest.test.ts

### TC-QUEST-017 — POST /save — sans dossierId, ré-appel : réutilise le dossier auto-assigné existant (pas de doublon)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | test du contrat ; analyse des branches (réutilisation) |

- **Préconditions :** Accompagné ayant déjà un dossier auto-assigné avec un accompagnateur.
- **Données :** { history:[…], recapitulatif:'Récap 2' } sans dossierId
- **Étapes :**
  1. POST /api/questionnaire/save une 1re fois
  2. POST /api/questionnaire/save une 2e fois
- **Résultat attendu :** 200 et dossierId identique aux deux appels (SELECT dossier existant réutilisé via INSERT OR IGNORE sur le lien). Une nouvelle ligne questionnaires_initiaux est ajoutée (la lecture prend ORDER BY id DESC).
- **Traçabilité :** questionnaire — POST /api/questionnaire/save
- **Automatisation :** ✅ api/quest.test.ts

### TC-QUEST-018 — POST /save — avec dossierId valide appartenant à l'accompagné : rattache au parcours

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat ; partition d'équivalence (branche dossierId) |

- **Préconditions :** Accompagné (Amine) possédant un dossier D dont il est accompagne_id.
- **Données :** { history:[…], recapitulatif:'Récap', dossierId: <id de D> }
- **Étapes :**
  1. POST /api/questionnaire/save avec dossierId de D
- **Résultat attendu :** 200 { ok:true, dossierId:<id de D> }. La ligne questionnaires_initiaux est rattachée à D ; la notification va à l'accompagnateur de D (accompagnateur_id du dossier).
- **Traçabilité :** questionnaire — POST /api/questionnaire/save (multi_parcours)
- **Automatisation :** ✅ api/quest.test.ts

### TC-QUEST-019 — POST /save — dossierId d'un autre utilisateur : 404 Parcours introuvable

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles (non-propriétaire) ; test du contrat |

- **Préconditions :** Accompagné A authentifié ; dossier D appartenant à un AUTRE accompagné B.
- **Données :** { history:[…], recapitulatif:'x', dossierId: <id du dossier de B> }
- **Étapes :**
  1. Se connecter en accompagné A
  2. POST /api/questionnaire/save avec dossierId de B
- **Résultat attendu :** 404 { error: 'Parcours introuvable' } (WHERE id=? AND accompagne_id=? ne matche pas). Aucune insertion/notification.
- **Traçabilité :** questionnaire — POST /api/questionnaire/save
- **Automatisation :** ✅ api/quest.test.ts

### TC-QUEST-020 — POST /save — dossierId inexistant : 404 Parcours introuvable

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | valeurs limites (id hors domaine) ; partition d'équivalence |

- **Préconditions :** Accompagné authentifié.
- **Données :** { history:[], recapitulatif:'x', dossierId: 999999 }
- **Étapes :**
  1. POST /api/questionnaire/save avec un dossierId qui n'existe pas
- **Résultat attendu :** 404 { error: 'Parcours introuvable' }.
- **Traçabilité :** questionnaire — POST /api/questionnaire/save
- **Automatisation :** ✅ api/quest.test.ts

### TC-QUEST-021 — POST /save — gating rôle : accompagnateur -> 403 Réservé aux personnes accompagnées

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles ; test du contrat |

- **Préconditions :** Compte accompagnateur authentifié (camille.laurent@boussole.demo).
- **Données :** { history:[], recapitulatif:'x' }
- **Étapes :**
  1. Se connecter en accompagnateur
  2. POST /api/questionnaire/save
- **Résultat attendu :** 403 { error: 'Réservé aux personnes accompagnées' } (contrôle user.role !== 'accompagne').
- **Traçabilité :** questionnaire — POST /api/questionnaire/save
- **Automatisation :** ✅ api/quest.test.ts

### TC-QUEST-022 — POST /save — gating rôle : admin -> 403 Réservé aux personnes accompagnées

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles (couverture exhaustive des rôles) |

- **Préconditions :** Compte admin authentifié (mohamed@elafrit.com).
- **Données :** { history:[], recapitulatif:'x' }
- **Étapes :**
  1. Se connecter en admin
  2. POST /api/questionnaire/save
- **Résultat attendu :** 403 { error: 'Réservé aux personnes accompagnées' } (seul le rôle 'accompagne' passe).
- **Traçabilité :** questionnaire — POST /api/questionnaire/save
- **Automatisation :** ✅ api/quest.test.ts

### TC-QUEST-023 — POST /save — gating accès : non authentifié -> 401

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles ; test du contrat |

- **Préconditions :** Aucun cookie d'auth.
- **Données :** { history:[], recapitulatif:'x' }
- **Étapes :**
  1. POST /api/questionnaire/save sans cookie
- **Résultat attendu :** 401 { error: 'Non authentifié' } (requireAuth avant le contrôle de rôle).
- **Traçabilité :** questionnaire — POST /api/questionnaire/save (auth.ts requireAuth)
- **Automatisation :** ✅ api/quest.test.ts

### TC-QUEST-024 — POST /save — sans dossierId et aucun accompagnateur actif -> 400 Aucun accompagnateur disponible

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | analyse des branches ; partition d'équivalence (cas dégradé) |

- **Préconditions :** Accompagné authentifié ; AUCUN user role='accompagnateur' actif=1 en base (environnement contrôlé).
- **Données :** { history:[], recapitulatif:'x' } (sans dossierId)
- **Étapes :**
  1. Désactiver/supprimer tous les accompagnateurs actifs
  2. POST /api/questionnaire/save
- **Résultat attendu :** 400 { error: 'Aucun accompagnateur disponible' }. Aucune insertion de questionnaire ni notification.
- **Traçabilité :** questionnaire — POST /api/questionnaire/save
- **Automatisation :** ✅ api/quest.test.ts

### TC-QUEST-025 — POST /save — recapitulatif absent : persiste cr_recap = null

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | partition d'équivalence (champ optionnel manquant) ; valeurs limites (null) |

- **Préconditions :** Accompagné authentifié avec dossier auto-assignable ou dossierId valide.
- **Données :** { history:[{question:'q',answer:'r'}] } (recapitulatif omis)
- **Étapes :**
  1. POST /api/questionnaire/save sans champ recapitulatif
- **Résultat attendu :** 200 { ok:true, dossierId }. La ligne questionnaires_initiaux est créée avec cr_recap NULL (recapitulatif ?? null) et contenu = JSON de history.
- **Traçabilité :** questionnaire — POST /api/questionnaire/save
- **Automatisation :** ✅ api/quest.test.ts

### TC-QUEST-026 — POST /save — history absent : persiste contenu = '[]' (défaut)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | basse | partition d'équivalence (champ optionnel) ; robustesse |

- **Préconditions :** Accompagné authentifié avec dossierId valide.
- **Données :** { recapitulatif:'Récap', dossierId:<valide> } (history omis)
- **Étapes :**
  1. POST /api/questionnaire/save sans champ history
- **Résultat attendu :** 200 { ok:true, dossierId }. contenu stocké = JSON.stringify([]) car history = req.body?.history ?? [].
- **Traçabilité :** questionnaire — POST /api/questionnaire/save
- **Automatisation :** ✅ api/quest.test.ts

### TC-QUEST-027 — POST /save — dossierId non numérique : coercition Number() puis 404

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | basse | valeurs limites (0, NaN) ; table de décision (truthy/falsy) |

- **Préconditions :** Accompagné authentifié.
- **Données :** Cas A : { dossierId:'abc', history:[] } -> Number('abc')=NaN -> falsy -> branche auto-assignée. Cas B : { dossierId:'0', history:[] } -> Number('0')=0 -> falsy -> branche auto-assignée.
- **Étapes :**
  1. POST /api/questionnaire/save avec dossierId='abc'
  2. POST avec dossierId='0'
- **Résultat attendu :** Comme Number(...) donne NaN ou 0 (falsy), dossierIdIn est null -> on passe en branche auto-assignée (200 si accompagnateur dispo). Documente cette coercition (pas un 404).
- **Traçabilité :** questionnaire — POST /api/questionnaire/save
- **Automatisation :** ✅ api/quest.test.ts

### TC-QUEST-028 — POST /save — persistance relue : le récapitulatif réapparaît dans le détail du dossier

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | non-regression | haute | test du contrat (persistance/relecture) ; test de bout en bout |

- **Préconditions :** Accompagné ayant enregistré un questionnaire (cr_recap connu) sur dossier D.
- **Données :** recapitulatif='Récap unique 12345' enregistré sur D
- **Étapes :**
  1. POST /api/questionnaire/save avec recapitulatif sur D
  2. GET du détail du parcours/dossier D (route dossier accompagné)
- **Résultat attendu :** Le détail renvoie questionnaire.cr_recap = 'Récap unique 12345' et complete_le renseigné (relecture cohérente avec l'insertion).
- **Traçabilité :** questionnaire — POST /api/questionnaire/save + GET /api/dossiers/.. (questionnaires_initiaux)
- **Automatisation :** ✅ api/quest.test.ts

### TC-QUEST-029 — POST /save — la notification atteint le bon accompagnateur (ciblage)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | test du contrat ; test basé sur les rôles |

- **Préconditions :** Dossier D avec accompagnateur_id = celui de Mohamed ; compte Mohamed accompagnateur.
- **Données :** { history:[], recapitulatif:'x', dossierId:<id de D> }
- **Étapes :**
  1. Accompagné de D POST /api/questionnaire/save sur D
  2. Se connecter en tant qu'accompagnateur de D et lister ses notifications
- **Résultat attendu :** Une notification 'Un accompagné a complété son questionnaire initial.' apparaît pour l'accompagnateur du dossier D et pour aucun autre.
- **Traçabilité :** questionnaire — POST /api/questionnaire/save (notifications)
- **Automatisation :** ✅ api/quest.test.ts

### TC-QUEST-030 — UI — l'accompagné déroule le questionnaire et arrive au récapitulatif

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test de bout en bout ; test du contrat (UI<->API) |

- **Préconditions :** Accompagné connecté (Amine), repli déterministe actif. Page /questionnaire.
- **Données :** Réponses libres saisies à chaque étape
- **Étapes :**
  1. Ouvrir la page Questionnaire
  2. Répondre via le champ DictaInput puis 'Envoyer' à chaque question jusqu'à la fin
  3. Observer l'apparition du bloc Récapitulatif
- **Résultat attendu :** Chaque question s'affiche (qa-q-active), l'historique se remplit (qa-history). En fin, le bloc 'Récapitulatif' (pre.recap-text) et le bouton 'Valider et enregistrer' apparaissent.
- **Traçabilité :** questionnaire — app/web/src/pages/Questionnaire.tsx + POST /api/questionnaire/next
- **Automatisation :** ⏳ à automatiser

### TC-QUEST-031 — UI — choix d'une proposition pré-remplie soumet la réponse

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | test de bout en bout ; partition d'équivalence (réponse par bouton vs saisie) |

- **Préconditions :** Accompagné connecté, à une étape proposant des boutons (étapes 5/6 en repli).
- **Données :** Clic sur une proposition (ex. 'Trouver une problématique')
- **Étapes :**
  1. Atteindre une étape avec propositions (qa-props)
  2. Cliquer sur un bouton de proposition
- **Résultat attendu :** La proposition est ajoutée à l'historique comme réponse et l'étape suivante se charge (submit(p)).
- **Traçabilité :** questionnaire — Questionnaire.tsx (qa-prop)
- **Automatisation :** ⏳ à automatiser

### TC-QUEST-032 — UI — bouton Envoyer désactivé/sans effet si réponse vide

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | validation | moyenne | valeurs limites (chaîne vide / espaces) ; partition d'équivalence |

- **Préconditions :** Accompagné connecté, à une étape active, champ réponse vide.
- **Données :** Champ réponse = '' (ou espaces)
- **Étapes :**
  1. Soumettre le formulaire sans saisir de texte
- **Résultat attendu :** submit() retourne tôt (if !ans.trim()) : aucune nouvelle entrée d'historique, pas d'appel /next supplémentaire.
- **Traçabilité :** questionnaire — Questionnaire.tsx submit()
- **Automatisation :** ⏳ à automatiser

### TC-QUEST-033 — UI — 'Valider et enregistrer' persiste puis affiche la confirmation et le CTA parcours

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | table de décision (présence dossierId x cible de navigation) ; test de bout en bout |

- **Préconditions :** Accompagné au récapitulatif. Cas A : sans ?dossier (espace). Cas B : avec ?dossier=<id>.
- **Données :** URL /questionnaire (A) puis /questionnaire?dossier=<id valide> (B)
- **Étapes :**
  1. Cliquer 'Valider et enregistrer'
  2. Observer le message de succès et le bouton de navigation
- **Résultat attendu :** Appel POST /questionnaire/save ; message '✅ Enregistré…' ; bouton 'Retour à mon espace' (A, nav /espace) ou 'Voir mon parcours' (B, nav /parcours/<id>).
- **Traçabilité :** questionnaire — Questionnaire.tsx save() + POST /api/questionnaire/save
- **Automatisation :** ⏳ à automatiser

### TC-QUEST-034 — UI — indicateur de progression IA pendant le chargement de l'étape

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | basse | test de bout en bout (états transitoires) |

- **Préconditions :** Accompagné connecté, latence sur /next.
- **Données :** N/A
- **Étapes :**
  1. Soumettre une réponse
  2. Observer l'état pendant l'appel /next
- **Résultat attendu :** Le composant AiProgress (busy=true) s'affiche ('L'assistant prépare la prochaine question…'), puis l'étape suivante remplace l'indicateur quand busy repasse à false.
- **Traçabilité :** questionnaire — Questionnaire.tsx (AiProgress)
- **Automatisation :** ⏳ à automatiser

## Domaine RDV — 66 cas

**Endpoints couverts :**

- `POST /api/rdv/creneaux` · feature: `rdv` · rôle: accompagnateur — Créer un créneau de disponibilité (debut/fin) ; notifie et satisfait les demandes en attente de l'accompagnateur
- `GET /api/rdv/creneaux/mine` · feature: `rdv` · rôle: accompagnateur — Lister ses créneaux avec l'état de réservation et l'accompagné réservataire
- `DELETE /api/rdv/creneaux/:id` · feature: `rdv` · rôle: accompagnateur — Supprimer un créneau non réservé dont on est propriétaire (404 sinon, 409 si réservé)
- `GET /api/rdv/disponibles` · feature: `rdv` · rôle: accompagne — Lister les créneaux libres et futurs de l'accompagnateur cible (du parcours via dossierId, sinon par défaut)
- `POST /api/rdv/reserver` · feature: `rdv` · rôle: accompagne — Réserver un créneau (transaction : marque réservé, crée le rdv, notifie, envoie emails, satisfait la demande)
- `POST /api/rdv/demander` · feature: `rdv` · rôle: accompagne — Demander un RDV sur un parcours quand aucun créneau n'est disponible (dédupliqué en_attente, email + notif accompagnateur)
- `GET /api/rdv/mine` · feature: `rdv` · rôle: accompagne — Lister ses propres rendez-vous (date début/fin + statut)
- `GET /api/rdv/:id/ics` · feature: `rdv` · rôle: accompagne|accompagnateur — Exporter le rendez-vous au format iCalendar (.ics) si on en est une des parties (403 sinon, 404 introuvable)

### TC-RDV-001 — Créer un créneau valide (nominal)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat |

- **Préconditions :** Authentifié comme accompagnateur (camille.laurent@boussole.demo).
- **Données :** POST /api/rdv/creneaux body {debut:'2026-07-01T10:00', fin:'2026-07-01T10:45'}
- **Étapes :**
  1. Se connecter en accompagnateur
  2. POST /api/rdv/creneaux avec debut<fin
  3. Lire la réponse
- **Résultat attendu :** 201 ; corps JSON {id:number, debut, fin, reserve:0} ; le créneau apparaît ensuite dans GET /creneaux/mine.
- **Traçabilité :** features.ts:rdv ; POST /api/rdv/creneaux
- **Automatisation :** ✅ api/rdv.test.ts

### TC-RDV-002 — Créer un créneau notifie et satisfait les demandes en attente

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | table de décision |

- **Préconditions :** Un accompagné a une demande_rdv 'en_attente' pour cet accompagnateur (POST /rdv/demander au préalable).
- **Données :** POST /api/rdv/creneaux body {debut futur, fin>debut}
- **Étapes :**
  1. Accompagné poste une demande de RDV (aucun créneau)
  2. Accompagnateur crée un créneau
  3. Vérifier les notifications de l'accompagné
  4. Vérifier le statut des demandes_rdv
- **Résultat attendu :** 201 ; une notification 'De nouveaux créneaux... sont disponibles' est créée pour chaque demandeur distinct ; les demandes_rdv 'en_attente' de cet accompagnateur passent à 'satisfaite'.
- **Traçabilité :** features.ts:rdv ; POST /api/rdv/creneaux (rdv.ts:39-44)
- **Automatisation :** ✅ api/rdv.test.ts

### TC-RDV-003 — Refus création créneau si fin <= début (valeur limite)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | haute | valeurs limites |

- **Préconditions :** Authentifié accompagnateur.
- **Données :** Cas A fin==debut ('2026-07-01T10:00','2026-07-01T10:00') ; Cas B fin<debut ('...T10:00','...T09:00')
- **Étapes :**
  1. POST /api/rdv/creneaux avec fin==debut
  2. POST /api/rdv/creneaux avec fin<debut
- **Résultat attendu :** 400 dans les deux cas ; message 'Créneau invalide (la fin doit suivre le début)' ; aucun INSERT.
- **Traçabilité :** features.ts:rdv ; POST /api/rdv/creneaux (rdv.ts:33-36)
- **Automatisation :** ✅ api/rdv.test.ts

### TC-RDV-004 — Refus création créneau si debut ou fin manquant

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | haute | partition d'équivalence |

- **Préconditions :** Authentifié accompagnateur.
- **Données :** Cas A body {} ; Cas B {debut:'2026-07-01T10:00'} (fin manquant) ; Cas C {fin:'2026-07-01T10:45'} (debut manquant)
- **Étapes :**
  1. POST /api/rdv/creneaux sans debut et/ou sans fin
- **Résultat attendu :** 400 ; message 'Créneau invalide (la fin doit suivre le début)' ; aucun créneau créé.
- **Traçabilité :** features.ts:rdv ; POST /api/rdv/creneaux (rdv.ts:32-36)
- **Automatisation :** ✅ api/rdv.test.ts

### TC-RDV-005 — Création créneau — body absent / non-JSON

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | basse | partition d'équivalence |

- **Préconditions :** Authentifié accompagnateur.
- **Données :** POST /api/rdv/creneaux sans corps (req.body undefined → req.body||{} = {})
- **Étapes :**
  1. POST /api/rdv/creneaux sans corps
- **Résultat attendu :** 400 'Créneau invalide' (le garde `req.body || {}` évite tout crash 500).
- **Traçabilité :** features.ts:rdv ; POST /api/rdv/creneaux (rdv.ts:32-36)
- **Automatisation :** ✅ api/rdv.test.ts

### TC-RDV-006 — Création créneau refusée si non authentifié (401)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles |

- **Préconditions :** Aucun cookie boussole_token.
- **Données :** POST /api/rdv/creneaux body valide, sans cookie
- **Étapes :**
  1. Appeler POST /api/rdv/creneaux sans cookie d'auth
- **Résultat attendu :** 401 ; message 'Non authentifié'.
- **Traçabilité :** auth.ts:requireAuth ; POST /api/rdv/creneaux
- **Automatisation :** ✅ api/rdv.test.ts

### TC-RDV-007 — Création créneau refusée pour un accompagné (403 mauvais rôle)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles |

- **Préconditions :** Authentifié comme accompagné (afrit_mohamed@yahoo.fr).
- **Données :** POST /api/rdv/creneaux body valide
- **Étapes :**
  1. Se connecter en accompagné
  2. POST /api/rdv/creneaux
- **Résultat attendu :** 403 ; message 'Accès refusé' ; aucun créneau créé.
- **Traçabilité :** auth.ts:requireRole('accompagnateur') ; POST /api/rdv/creneaux
- **Automatisation :** ✅ api/rdv.test.ts

### TC-RDV-008 — Création créneau refusée pour un admin (403 mauvais rôle)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles |

- **Préconditions :** Authentifié comme admin (mohamed@elafrit.com).
- **Données :** POST /api/rdv/creneaux body valide
- **Étapes :**
  1. Se connecter en admin
  2. POST /api/rdv/creneaux
- **Résultat attendu :** 403 'Accès refusé' (requireRole n'autorise que 'accompagnateur').
- **Traçabilité :** auth.ts:requireRole('accompagnateur') ; POST /api/rdv/creneaux
- **Automatisation :** ✅ api/rdv.test.ts

### TC-RDV-009 — Lister ses créneaux (nominal, forme de réponse)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat |

- **Préconditions :** Authentifié accompagnateur avec au moins un créneau libre et un réservé.
- **Données :** GET /api/rdv/creneaux/mine
- **Étapes :**
  1. Se connecter en accompagnateur
  2. GET /api/rdv/creneaux/mine
- **Résultat attendu :** 200 ; {creneaux:[...]} trié par debut ; chaque item porte id, debut, fin, reserve, et pour un créneau réservé accompagne_email/accompagne_prenom renseignés (NULL si libre).
- **Traçabilité :** features.ts:rdv ; GET /api/rdv/creneaux/mine (rdv.ts:48-62)
- **Automatisation :** ✅ api/rdv.test.ts

### TC-RDV-010 — Lister ses créneaux — isolation par propriétaire

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles |

- **Préconditions :** Deux accompagnateurs (Mohamage/Camille) ont chacun des créneaux.
- **Données :** GET /api/rdv/creneaux/mine connecté en tant que Camille
- **Étapes :**
  1. Se connecter en Camille
  2. GET /api/rdv/creneaux/mine
- **Résultat attendu :** 200 ; ne contient QUE les créneaux où accompagnateur_id = Camille (filtre WHERE c.accompagnateur_id=?) ; aucun créneau d'un autre accompagnateur.
- **Traçabilité :** features.ts:rdv ; GET /api/rdv/creneaux/mine (rdv.ts:57)
- **Automatisation :** ✅ api/rdv.test.ts

### TC-RDV-011 — Lister ses créneaux refusé si non authentifié (401)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles |

- **Préconditions :** Sans cookie.
- **Données :** GET /api/rdv/creneaux/mine sans cookie
- **Étapes :**
  1. GET /api/rdv/creneaux/mine sans auth
- **Résultat attendu :** 401 'Non authentifié'.
- **Traçabilité :** auth.ts:requireAuth ; GET /api/rdv/creneaux/mine
- **Automatisation :** ✅ api/rdv.test.ts

### TC-RDV-012 — Lister ses créneaux refusé pour accompagné (403)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles |

- **Préconditions :** Authentifié accompagné.
- **Données :** GET /api/rdv/creneaux/mine
- **Étapes :**
  1. Se connecter en accompagné
  2. GET /api/rdv/creneaux/mine
- **Résultat attendu :** 403 'Accès refusé'.
- **Traçabilité :** auth.ts:requireRole('accompagnateur') ; GET /api/rdv/creneaux/mine
- **Automatisation :** ✅ api/rdv.test.ts

### TC-RDV-013 — Supprimer un créneau libre dont on est propriétaire (nominal)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat |

- **Préconditions :** Authentifié accompagnateur, créneau libre (reserve=0) lui appartenant.
- **Données :** DELETE /api/rdv/creneaux/{idLibre}
- **Étapes :**
  1. Créer un créneau libre
  2. DELETE /api/rdv/creneaux/:id
  3. GET /creneaux/mine pour vérifier
- **Résultat attendu :** 200 ; {ok:true} ; le créneau n'apparaît plus dans GET /creneaux/mine.
- **Traçabilité :** features.ts:rdv ; DELETE /api/rdv/creneaux/:id (rdv.ts:64-78)
- **Automatisation :** ✅ api/rdv.test.ts

### TC-RDV-014 — Supprimer un créneau réservé refusé (409)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | table de décision |

- **Préconditions :** Authentifié accompagnateur ; créneau lui appartenant et déjà réservé (reserve=1).
- **Données :** DELETE /api/rdv/creneaux/{idReserve}
- **Étapes :**
  1. Faire réserver un créneau par un accompagné
  2. Accompagnateur DELETE ce créneau
- **Résultat attendu :** 409 ; message 'Créneau déjà réservé' ; le créneau et son rdv restent intacts.
- **Traçabilité :** features.ts:rdv ; DELETE /api/rdv/creneaux/:id (rdv.ts:72-75)
- **Automatisation :** ✅ api/rdv.test.ts

### TC-RDV-015 — Supprimer un créneau inexistant (404)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | valeurs limites |

- **Préconditions :** Authentifié accompagnateur.
- **Données :** DELETE /api/rdv/creneaux/999999 (id inexistant)
- **Étapes :**
  1. DELETE /api/rdv/creneaux/999999
- **Résultat attendu :** 404 ; message 'Créneau introuvable'.
- **Traçabilité :** features.ts:rdv ; DELETE /api/rdv/creneaux/:id (rdv.ts:67-71)
- **Automatisation :** ✅ api/rdv.test.ts

### TC-RDV-016 — Supprimer le créneau d'un autre accompagnateur refusé (404 non-propriétaire)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles |

- **Préconditions :** Créneau appartenant à l'accompagnateur Mohamed ; on est connecté en Camille.
- **Données :** DELETE /api/rdv/creneaux/{idDeMohamed}
- **Étapes :**
  1. Identifier un créneau de Mohamed
  2. Se connecter en Camille
  3. DELETE ce créneau
- **Résultat attendu :** 404 'Créneau introuvable' (la requête filtre accompagnateur_id=me.id ; un non-propriétaire reçoit 404, pas 403).
- **Traçabilité :** features.ts:rdv ; DELETE /api/rdv/creneaux/:id (rdv.ts:67)
- **Automatisation :** ✅ api/rdv.test.ts

### TC-RDV-017 — Supprimer un créneau avec id non numérique

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | basse | partition d'équivalence |

- **Préconditions :** Authentifié accompagnateur.
- **Données :** DELETE /api/rdv/creneaux/abc (Number('abc')=NaN)
- **Étapes :**
  1. DELETE /api/rdv/creneaux/abc
- **Résultat attendu :** 404 'Créneau introuvable' (Number(NaN) ne matche aucune ligne) ; pas de 500.
- **Traçabilité :** features.ts:rdv ; DELETE /api/rdv/creneaux/:id (rdv.ts:66-67)
- **Automatisation :** ✅ api/rdv.test.ts

### TC-RDV-018 — Supprimer un créneau refusé si non authentifié (401)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles |

- **Préconditions :** Sans cookie.
- **Données :** DELETE /api/rdv/creneaux/1 sans cookie
- **Étapes :**
  1. DELETE /api/rdv/creneaux/1 sans auth
- **Résultat attendu :** 401 'Non authentifié'.
- **Traçabilité :** auth.ts:requireAuth ; DELETE /api/rdv/creneaux/:id
- **Automatisation :** ✅ api/rdv.test.ts

### TC-RDV-019 — Supprimer un créneau refusé pour accompagné (403)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles |

- **Préconditions :** Authentifié accompagné.
- **Données :** DELETE /api/rdv/creneaux/1
- **Étapes :**
  1. Se connecter en accompagné
  2. DELETE /api/rdv/creneaux/1
- **Résultat attendu :** 403 'Accès refusé'.
- **Traçabilité :** auth.ts:requireRole('accompagnateur') ; DELETE /api/rdv/creneaux/:id
- **Automatisation :** ✅ api/rdv.test.ts

### TC-RDV-020 — Lister les créneaux disponibles d'un parcours (nominal avec dossierId)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat |

- **Préconditions :** Accompagné (Amine) propriétaire d'un dossier dont l'accompagnateur a des créneaux libres futurs.
- **Données :** GET /api/rdv/disponibles?dossierId={idDossierAmine}
- **Étapes :**
  1. Se connecter en accompagné
  2. GET /api/rdv/disponibles?dossierId=...
- **Résultat attendu :** 200 ; {creneaux:[{id,debut,fin}]} ; uniquement les créneaux de l'accompagnateur du dossier, reserve=0 et debut>maintenant, triés par debut.
- **Traçabilité :** features.ts:rdv ; GET /api/rdv/disponibles (rdv.ts:90-99)
- **Automatisation :** ✅ api/rdv.test.ts

### TC-RDV-021 — Lister les créneaux disponibles sans dossierId (accompagnateur par défaut)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | partition d'équivalence |

- **Préconditions :** Accompagné lié à un accompagnateur (lien actif) qui a des créneaux libres.
- **Données :** GET /api/rdv/disponibles (sans query)
- **Étapes :**
  1. Se connecter en accompagné
  2. GET /api/rdv/disponibles
- **Résultat attendu :** 200 ; créneaux de l'accompagnateur déterminé par findAccompagnateurFor (lien actif sinon 1er accompagnateur actif).
- **Traçabilité :** features.ts:rdv ; GET /api/rdv/disponibles (rdv.ts:92-93, targetAccompagnateur/findAccompagnateurFor)
- **Automatisation :** ✅ api/rdv.test.ts

### TC-RDV-022 — Disponibles exclut créneaux passés et réservés (valeurs limites temporelles)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | valeurs limites |

- **Préconditions :** L'accompagnateur cible a : un créneau passé (debut<now), un réservé (reserve=1), un libre futur.
- **Données :** GET /api/rdv/disponibles?dossierId=...
- **Étapes :**
  1. Préparer les 3 types de créneaux
  2. GET /api/rdv/disponibles
- **Résultat attendu :** 200 ; seul le créneau libre ET futur (debut > now ISO) est listé ; le passé et le réservé sont exclus (filtre reserve=0 AND debut > now).
- **Traçabilité :** features.ts:rdv ; GET /api/rdv/disponibles (rdv.ts:96-97)
- **Automatisation :** ✅ api/rdv.test.ts

### TC-RDV-023 — Disponibles renvoie liste vide si dossier non possédé ou inexistant

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | table de décision |

- **Préconditions :** Authentifié accompagné Amine ; dossierId appartenant à un AUTRE accompagné (Léa).
- **Données :** GET /api/rdv/disponibles?dossierId={idDossierLea}
- **Étapes :**
  1. Se connecter en Amine
  2. GET /api/rdv/disponibles?dossierId=idDeLea
- **Résultat attendu :** 200 ; {creneaux:[]} (targetAccompagnateur filtre accompagne_id=meId → null → liste vide). Aucune fuite des créneaux d'autrui.
- **Traçabilité :** features.ts:rdv ; GET /api/rdv/disponibles (rdv.ts:82-87, 94)
- **Automatisation :** ✅ api/rdv.test.ts

### TC-RDV-024 — Disponibles refusé pour accompagnateur (403 mauvais rôle)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles |

- **Préconditions :** Authentifié accompagnateur.
- **Données :** GET /api/rdv/disponibles
- **Étapes :**
  1. Se connecter en accompagnateur
  2. GET /api/rdv/disponibles
- **Résultat attendu :** 403 'Accès refusé' (réservé au rôle 'accompagne').
- **Traçabilité :** auth.ts:requireRole('accompagne') ; GET /api/rdv/disponibles
- **Automatisation :** ✅ api/rdv.test.ts

### TC-RDV-025 — Disponibles refusé si non authentifié (401)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles |

- **Préconditions :** Sans cookie.
- **Données :** GET /api/rdv/disponibles sans cookie
- **Étapes :**
  1. GET /api/rdv/disponibles sans auth
- **Résultat attendu :** 401 'Non authentifié'.
- **Traçabilité :** auth.ts:requireAuth ; GET /api/rdv/disponibles
- **Automatisation :** ✅ api/rdv.test.ts

### TC-RDV-026 — Réserver un créneau libre par parcours (nominal)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat |

- **Préconditions :** Accompagné Amine, dossier dont l'accompagnateur a un créneau libre futur (idCreneau).
- **Données :** POST /api/rdv/reserver {creneauId:idCreneau, dossierId:idDossierAmine}
- **Étapes :**
  1. GET /disponibles?dossierId pour repérer un créneau
  2. POST /api/rdv/reserver
  3. Vérifier GET /rdv/mine et /creneaux/mine côté accompagnateur
- **Résultat attendu :** 200 ; {ok:true} ; le créneau passe reserve=1 ; une ligne rdv (statut 'confirme', dossier_id renseigné) ; 2 notifications (accompagnateur + accompagné) ; 2 emails envoyés ; la demande_rdv du dossier passe 'satisfaite'.
- **Traçabilité :** features.ts:rdv ; POST /api/rdv/reserver (rdv.ts:101-134)
- **Automatisation :** ✅ api/rdv.test.ts

### TC-RDV-027 — Réserver sans dossierId en mode hérité (accompagnateur lié)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | partition d'équivalence |

- **Préconditions :** Accompagné lié à l'accompagnateur propriétaire du créneau libre ; appel via /rendez-vous (sans dossierId).
- **Données :** POST /api/rdv/reserver {creneauId:idCreneauLibre}
- **Étapes :**
  1. GET /disponibles (sans dossierId)
  2. POST /api/rdv/reserver {creneauId}
- **Résultat attendu :** 200 ; {ok:true} ; rdv créé avec dossier_id = 1er dossier liant accompagné+accompagnateur (ou NULL si aucun) ; créneau réservé.
- **Traçabilité :** features.ts:rdv ; POST /api/rdv/reserver (rdv.ts:116-120)
- **Automatisation :** ✅ api/rdv.test.ts

### TC-RDV-028 — Double réservation refusée — créneau déjà réservé (409)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | table de décision |

- **Préconditions :** Un créneau déjà réservé (reserve=1).
- **Données :** POST /api/rdv/reserver {creneauId:idDejaReserve, dossierId}
- **Étapes :**
  1. Réserver un créneau (TC-RDV-026)
  2. Tenter une 2e réservation du même créneau
- **Résultat attendu :** 409 ; message 'Créneau indisponible' ; aucun nouveau rdv ; aucune nouvelle notification/email.
- **Traçabilité :** features.ts:rdv ; POST /api/rdv/reserver (rdv.ts:105-107)
- **Automatisation :** ✅ api/rdv.test.ts

### TC-RDV-029 — Réserver un créneau inexistant (409)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | valeurs limites |

- **Préconditions :** Authentifié accompagné.
- **Données :** POST /api/rdv/reserver {creneauId:999999}
- **Étapes :**
  1. POST /api/rdv/reserver avec creneauId inexistant
- **Résultat attendu :** 409 'Créneau indisponible' (c undefined → branche !c).
- **Traçabilité :** features.ts:rdv ; POST /api/rdv/reserver (rdv.ts:105-107)
- **Automatisation :** ✅ api/rdv.test.ts

### TC-RDV-030 — Réserver avec creneauId manquant/non numérique (409)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | partition d'équivalence |

- **Préconditions :** Authentifié accompagné.
- **Données :** Cas A body {} (creneauId undefined → NaN) ; Cas B {creneauId:'x'}
- **Étapes :**
  1. POST /api/rdv/reserver sans creneauId valide
- **Résultat attendu :** 409 'Créneau indisponible' (Number(undefined/'x')=NaN ne matche aucun créneau) ; pas de 500.
- **Traçabilité :** features.ts:rdv ; POST /api/rdv/reserver (rdv.ts:103-107)
- **Automatisation :** ✅ api/rdv.test.ts

### TC-RDV-031 — Réserver avec dossierId non possédé par l'accompagné (409)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | table de décision |

- **Préconditions :** Créneau libre de l'accompagnateur X ; dossierId appartenant à un AUTRE accompagné.
- **Données :** POST /api/rdv/reserver {creneauId:idLibre, dossierId:idDossierAutrui}
- **Étapes :**
  1. Se connecter en Amine
  2. POST /api/rdv/reserver avec dossierId de Léa
- **Résultat attendu :** 409 ; message 'Créneau indisponible pour ce parcours' (le dossier doit satisfaire accompagne_id=me.id). Aucun rdv créé.
- **Traçabilité :** features.ts:rdv ; POST /api/rdv/reserver (rdv.ts:112-115)
- **Automatisation :** ✅ api/rdv.test.ts

### TC-RDV-032 — Réserver avec dossierId d'un parcours dont l'accompagnateur ne correspond pas au créneau (409)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | haute | table de décision |

- **Préconditions :** Amine possède un dossier avec accompagnateur A ; le créneau visé appartient à l'accompagnateur B.
- **Données :** POST /api/rdv/reserver {creneauId:idCreneauDeB, dossierId:idDossierAvecA}
- **Étapes :**
  1. Repérer un créneau de B et un dossier d'Amine rattaché à A
  2. POST /api/rdv/reserver croisé
- **Résultat attendu :** 409 'Créneau indisponible pour ce parcours' (le SELECT exige accompagnateur_id=c.accompagnateur_id). Aucun rdv créé.
- **Traçabilité :** features.ts:rdv ; POST /api/rdv/reserver (rdv.ts:113-114)
- **Automatisation :** ✅ api/rdv.test.ts

### TC-RDV-033 — Réserver sans dossierId un créneau d'un accompagnateur non lié (409)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | table de décision |

- **Préconditions :** Accompagné dont l'accompagnateur par défaut (findAccompagnateurFor) != propriétaire du créneau visé.
- **Données :** POST /api/rdv/reserver {creneauId:idCreneauAutreAccompagnateur} (sans dossierId)
- **Étapes :**
  1. Repérer un créneau d'un accompagnateur non lié
  2. POST /api/rdv/reserver sans dossierId
- **Résultat attendu :** 409 'Créneau indisponible' (c.accompagnateur_id !== findAccompagnateurFor(me.id)).
- **Traçabilité :** features.ts:rdv ; POST /api/rdv/reserver (rdv.ts:116-117)
- **Automatisation :** ✅ api/rdv.test.ts

### TC-RDV-034 — Réserver refusé pour accompagnateur (403 mauvais rôle)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles |

- **Préconditions :** Authentifié accompagnateur.
- **Données :** POST /api/rdv/reserver {creneauId:1}
- **Étapes :**
  1. Se connecter en accompagnateur
  2. POST /api/rdv/reserver
- **Résultat attendu :** 403 'Accès refusé' (réservé à 'accompagne').
- **Traçabilité :** auth.ts:requireRole('accompagne') ; POST /api/rdv/reserver
- **Automatisation :** ✅ api/rdv.test.ts

### TC-RDV-035 — Réserver refusé si non authentifié (401)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles |

- **Préconditions :** Sans cookie.
- **Données :** POST /api/rdv/reserver {creneauId:1} sans cookie
- **Étapes :**
  1. POST /api/rdv/reserver sans auth
- **Résultat attendu :** 401 'Non authentifié'.
- **Traçabilité :** auth.ts:requireAuth ; POST /api/rdv/reserver
- **Automatisation :** ✅ api/rdv.test.ts

### TC-RDV-036 — Atomicité de la réservation (transaction)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | non-regression | moyenne | test du contrat |

- **Préconditions :** Réservation nominale réussie (TC-RDV-026).
- **Données :** Inspection post-réservation : creneaux.reserve, rdv, notifications
- **Étapes :**
  1. Réserver un créneau
  2. Vérifier la cohérence : reserve=1 ET rdv inséré ET 2 notifications, tous ensemble
- **Résultat attendu :** Les effets (UPDATE reserve, INSERT rdv, INSERT notifications, UPDATE demandes_rdv) sont appliqués atomiquement (db.transaction) : pas d'état partiel observable.
- **Traçabilité :** features.ts:rdv ; POST /api/rdv/reserver (rdv.ts:122-128)
- **Automatisation :** ✅ api/rdv.test.ts

### TC-RDV-037 — Demander un RDV sur un parcours (nominal)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat |

- **Préconditions :** Accompagné Amine, dossier lui appartenant, sans demande en_attente existante.
- **Données :** POST /api/rdv/demander {dossierId:idDossierAmine}
- **Étapes :**
  1. Se connecter en accompagné
  2. POST /api/rdv/demander
  3. Vérifier demandes_rdv et notifications côté accompagnateur
- **Résultat attendu :** 200 ; {ok:true} ; une demande_rdv 'en_attente' (dossier_id, accompagne_id, accompagnateur_id) ; une notification '<prénom/email> demande un rendez-vous' pour l'accompagnateur ; un email envoyé à l'accompagnateur.
- **Traçabilité :** features.ts:rdv ; POST /api/rdv/demander (rdv.ts:137-150)
- **Automatisation :** ✅ api/rdv.test.ts

### TC-RDV-038 — Demander un RDV deux fois — pas de doublon (idempotence)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | table de décision |

- **Préconditions :** Une demande 'en_attente' existe déjà pour ce dossier.
- **Données :** POST /api/rdv/demander {dossierId} (2e appel)
- **Étapes :**
  1. POST /api/rdv/demander une 1re fois
  2. POST /api/rdv/demander une 2e fois
- **Résultat attendu :** 200 'ok' ; AUCUNE 2e ligne demandes_rdv 'en_attente' insérée (garde `if (!exists)`) ; mais une notification et un email sont quand même envoyés à chaque appel.
- **Traçabilité :** features.ts:rdv ; POST /api/rdv/demander (rdv.ts:142-148)
- **Automatisation :** ✅ api/rdv.test.ts

### TC-RDV-039 — Demander un RDV sur un parcours non possédé / inexistant (404)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles |

- **Préconditions :** Authentifié Amine ; dossierId appartenant à Léa, ou dossierId inexistant.
- **Données :** Cas A dossierId de Léa ; Cas B dossierId 999999
- **Étapes :**
  1. Se connecter en Amine
  2. POST /api/rdv/demander avec dossierId d'autrui/inexistant
- **Résultat attendu :** 404 ; message 'Parcours introuvable' (SELECT exige accompagne_id=me.id). Aucune demande créée.
- **Traçabilité :** features.ts:rdv ; POST /api/rdv/demander (rdv.ts:140-141)
- **Automatisation :** ✅ api/rdv.test.ts

### TC-RDV-040 — Demander un RDV avec dossierId manquant/non numérique (404)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | partition d'équivalence |

- **Préconditions :** Authentifié accompagné.
- **Données :** Cas A body {} (dossierId NaN) ; Cas B {dossierId:'x'}
- **Étapes :**
  1. POST /api/rdv/demander sans dossierId valide
- **Résultat attendu :** 404 'Parcours introuvable' (Number(undefined/'x')=NaN ne matche aucun dossier) ; pas de 500.
- **Traçabilité :** features.ts:rdv ; POST /api/rdv/demander (rdv.ts:139-141)
- **Automatisation :** ✅ api/rdv.test.ts

### TC-RDV-041 — Demander un RDV refusé pour accompagnateur (403)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles |

- **Préconditions :** Authentifié accompagnateur.
- **Données :** POST /api/rdv/demander {dossierId:1}
- **Étapes :**
  1. Se connecter en accompagnateur
  2. POST /api/rdv/demander
- **Résultat attendu :** 403 'Accès refusé' (réservé à 'accompagne').
- **Traçabilité :** auth.ts:requireRole('accompagne') ; POST /api/rdv/demander
- **Automatisation :** ✅ api/rdv.test.ts

### TC-RDV-042 — Demander un RDV refusé si non authentifié (401)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles |

- **Préconditions :** Sans cookie.
- **Données :** POST /api/rdv/demander {dossierId:1} sans cookie
- **Étapes :**
  1. POST /api/rdv/demander sans auth
- **Résultat attendu :** 401 'Non authentifié'.
- **Traçabilité :** auth.ts:requireAuth ; POST /api/rdv/demander
- **Automatisation :** ✅ api/rdv.test.ts

### TC-RDV-043 — Lister mes rendez-vous (nominal, forme et tri)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat |

- **Préconditions :** Accompagné avec au moins un rdv confirmé (Amine en a après seed/réservation).
- **Données :** GET /api/rdv/mine
- **Étapes :**
  1. Se connecter en accompagné
  2. GET /api/rdv/mine
- **Résultat attendu :** 200 ; {rdv:[{id, debut, fin, statut}]} trié par debut ; ne contient que les rdv où accompagne_id=me.id.
- **Traçabilité :** features.ts:rdv ; GET /api/rdv/mine (rdv.ts:152-163)
- **Automatisation :** ✅ api/rdv.test.ts

### TC-RDV-044 — Lister mes rendez-vous — isolation entre accompagnés

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles |

- **Préconditions :** Amine et Léa ont chacun des rdv.
- **Données :** GET /api/rdv/mine connecté en Léa
- **Étapes :**
  1. Se connecter en Léa
  2. GET /api/rdv/mine
- **Résultat attendu :** 200 ; ne renvoie QUE les rdv de Léa (WHERE r.accompagne_id=me.id) ; aucun rdv d'Amine.
- **Traçabilité :** features.ts:rdv ; GET /api/rdv/mine (rdv.ts:158)
- **Automatisation :** ✅ api/rdv.test.ts

### TC-RDV-045 — Lister mes rendez-vous refusé pour accompagnateur (403)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles |

- **Préconditions :** Authentifié accompagnateur.
- **Données :** GET /api/rdv/mine
- **Étapes :**
  1. Se connecter en accompagnateur
  2. GET /api/rdv/mine
- **Résultat attendu :** 403 'Accès refusé'.
- **Traçabilité :** auth.ts:requireRole('accompagne') ; GET /api/rdv/mine
- **Automatisation :** ✅ api/rdv.test.ts

### TC-RDV-046 — Lister mes rendez-vous refusé si non authentifié (401)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles |

- **Préconditions :** Sans cookie.
- **Données :** GET /api/rdv/mine sans cookie
- **Étapes :**
  1. GET /api/rdv/mine sans auth
- **Résultat attendu :** 401 'Non authentifié'.
- **Traçabilité :** auth.ts:requireAuth ; GET /api/rdv/mine
- **Automatisation :** ✅ api/rdv.test.ts

### TC-RDV-047 — Export ICS d'un rdv par l'accompagné propriétaire (nominal)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat |

- **Préconditions :** Accompagné Amine propriétaire du rdv {id}.
- **Données :** GET /api/rdv/{id}/ics
- **Étapes :**
  1. Se connecter en Amine
  2. GET /api/rdv/:id/ics
  3. Inspecter en-têtes et corps
- **Résultat attendu :** 200 ; Content-Type text/calendar ; Content-Disposition attachment filename="rdv-boussole-<id>.ics" ; corps contient BEGIN:VCALENDAR, VEVENT, UID boussole-rdv-<id>@boussole.elafrit.com, DTSTART/DTEND, SUMMARY, DESCRIPTION avec le statut ; lignes séparées par CRLF.
- **Traçabilité :** features.ts:rdv ; GET /api/rdv/:id/ics (rdv.ts:177-215)
- **Automatisation :** ✅ api/rdv.test.ts

### TC-RDV-048 — Export ICS par l'accompagnateur partie au rdv (nominal)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test basé sur les rôles |

- **Préconditions :** Accompagnateur propriétaire du créneau du rdv {id}.
- **Données :** GET /api/rdv/{id}/ics
- **Étapes :**
  1. Se connecter en accompagnateur du rdv
  2. GET /api/rdv/:id/ics
- **Résultat attendu :** 200 ; fichier ICS valide (me.role='accompagnateur' ET accompagnateur_id=me.id autorisé).
- **Traçabilité :** features.ts:rdv ; GET /api/rdv/:id/ics (rdv.ts:194-200)
- **Automatisation :** ✅ api/rdv.test.ts

### TC-RDV-049 — Export ICS refusé pour un tiers non partie (403)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles |

- **Préconditions :** Rdv d'Amine avec accompagnateur A ; on est un autre accompagné (Léa) ou un autre accompagnateur (Camille).
- **Données :** GET /api/rdv/{idRdvAmine}/ics
- **Étapes :**
  1. Se connecter en Léa (ou Camille non partie)
  2. GET /api/rdv/:id/ics
- **Résultat attendu :** 403 ; message 'Accès refusé' (ni accompagné propriétaire ni accompagnateur du créneau). Aucune fuite du contenu ICS.
- **Traçabilité :** features.ts:rdv ; GET /api/rdv/:id/ics (rdv.ts:194-200)
- **Automatisation :** ✅ api/rdv.test.ts

### TC-RDV-050 — Export ICS refusé pour un admin non partie (403)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles |

- **Préconditions :** Authentifié admin (mohamed@elafrit.com), non partie au rdv.
- **Données :** GET /api/rdv/{id}/ics
- **Étapes :**
  1. Se connecter en admin
  2. GET /api/rdv/:id/ics
- **Résultat attendu :** 403 'Accès refusé' (la règle allowed ne couvre que accompagne/accompagnateur partie ; le rôle 'admin' n'est pas autorisé).
- **Traçabilité :** features.ts:rdv ; GET /api/rdv/:id/ics (rdv.ts:194-200)
- **Automatisation :** ✅ api/rdv.test.ts

### TC-RDV-051 — Export ICS d'un rdv inexistant (404)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | valeurs limites |

- **Préconditions :** Authentifié (rôle quelconque).
- **Données :** GET /api/rdv/999999/ics
- **Étapes :**
  1. GET /api/rdv/999999/ics
- **Résultat attendu :** 404 ; message 'Rendez-vous introuvable'.
- **Traçabilité :** features.ts:rdv ; GET /api/rdv/:id/ics (rdv.ts:190-193)
- **Automatisation :** ✅ api/rdv.test.ts

### TC-RDV-052 — Export ICS refusé si non authentifié (401)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles |

- **Préconditions :** Sans cookie.
- **Données :** GET /api/rdv/1/ics sans cookie
- **Étapes :**
  1. GET /api/rdv/1/ics sans auth
- **Résultat attendu :** 401 'Non authentifié' (requireAuth sans requireRole : ouvert à tout rôle authentifié).
- **Traçabilité :** auth.ts:requireAuth ; GET /api/rdv/:id/ics
- **Automatisation :** ✅ api/rdv.test.ts

### TC-RDV-053 — Export ICS avec id non numérique (404)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | basse | partition d'équivalence |

- **Préconditions :** Authentifié.
- **Données :** GET /api/rdv/abc/ics (Number('abc')=NaN)
- **Étapes :**
  1. GET /api/rdv/abc/ics
- **Résultat attendu :** 404 'Rendez-vous introuvable' ; pas de 500.
- **Traçabilité :** features.ts:rdv ; GET /api/rdv/:id/ics (rdv.ts:179-193)
- **Automatisation :** ✅ api/rdv.test.ts

### TC-RDV-054 — Unitaire — icsStamp formate un ISO valide et renvoie '' sur entrée non conforme

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | validation | moyenne | valeurs limites |

- **Préconditions :** Fonction déterministe icsStamp(iso) (rdv.ts:166-169).
- **Données :** Cas A '2026-07-01T10:00' → '20260701T100000' (secondes par défaut 00) ; Cas B '2026-07-01T10:00:30' → '20260701T100030' ; Cas C 'pas-une-date' → '' ; Cas D '' → ''
- **Étapes :**
  1. Appeler icsStamp pour chaque entrée
  2. Comparer la sortie
- **Résultat attendu :** Sorties exactement '20260701T100000', '20260701T100030', '', '' ; secondes complétées par '00' quand absentes.
- **Traçabilité :** features.ts:rdv ; fonction icsStamp (rdv.ts:166-169)
- **Automatisation :** ✅ unit/rdv.test.ts

### TC-RDV-055 — Unitaire — icsEscape échappe \ , ; et les retours ligne

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | validation | moyenne | partition d'équivalence |

- **Préconditions :** Fonction déterministe icsEscape(s) (rdv.ts:170-172).
- **Données :** Cas A 'a,b;c\\d' → 'a\\,b\\;c\\\\d' ; Cas B 'ligne1\nligne2' → 'ligne1\\nligne2' ; Cas C null/'' → ''
- **Étapes :**
  1. Appeler icsEscape pour chaque entrée
- **Résultat attendu :** Virgule, point-virgule et backslash préfixés par un backslash ; CR/LF remplacés par littéral \\n ; entrée vide/null → ''.
- **Traçabilité :** features.ts:rdv ; fonction icsEscape (rdv.ts:170-172)
- **Automatisation :** ✅ unit/rdv.test.ts

### TC-RDV-056 — Unitaire — icsNowUtc renvoie un horodatage UTC compact valide

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | basse | test du contrat |

- **Préconditions :** Fonction déterministe icsNowUtc() (rdv.ts:173-175).
- **Données :** Aucune (utilise new Date())
- **Étapes :**
  1. Appeler icsNowUtc()
  2. Vérifier le format par regex ^\d{8}T\d{6}Z$
- **Résultat attendu :** Chaîne de la forme YYYYMMDDThhmmssZ (tirets, deux-points et millisecondes retirés), suffixe 'Z'.
- **Traçabilité :** features.ts:rdv ; fonction icsNowUtc (rdv.ts:173-175)
- **Automatisation :** ✅ unit/rdv.test.ts

### TC-RDV-057 — Unitaire — formatFr met en forme l'ISO en JJ/MM/AAAA à HH:MM

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | basse | partition d'équivalence |

- **Préconditions :** Fonction déterministe formatFr(iso) (rdv.ts:23-27).
- **Données :** '2026-07-01T10:05' → '01/07/2026 à 10:05'
- **Étapes :**
  1. Appeler formatFr('2026-07-01T10:05')
- **Résultat attendu :** '01/07/2026 à 10:05' (jour/mois/année, heure tronquée à 5 caractères HH:MM).
- **Traçabilité :** features.ts:rdv ; fonction formatFr (rdv.ts:23-27)
- **Automatisation :** ✅ unit/rdv.test.ts

### TC-RDV-058 — Unitaire — findAccompagnateurFor : lien actif prioritaire, sinon accompagnateur par défaut, sinon null

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | moyenne | table de décision |

- **Préconditions :** Fonction déterministe findAccompagnateurFor(accompagneId) (rdv.ts:14-21).
- **Données :** Cas A accompagné avec lien 'actif' → renvoie l'accompagnateur du lien ; Cas B sans lien mais avec >=1 accompagnateur actif → 1er accompagnateur actif (ORDER BY id) ; Cas C aucun accompagnateur actif → null
- **Étapes :**
  1. Préparer chaque configuration en base
  2. Appeler la fonction
- **Résultat attendu :** Renvoie l'id du lien actif en priorité ; à défaut l'id du 1er accompagnateur actif ; null si aucun accompagnateur actif.
- **Traçabilité :** features.ts:rdv ; fonction findAccompagnateurFor (rdv.ts:14-21)
- **Automatisation :** ✅ unit/rdv.test.ts

### TC-RDV-059 — UI accompagnateur — ajouter puis supprimer un créneau

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test du contrat |

- **Préconditions :** Connecté en accompagnateur (camille.laurent@boussole.demo, BoussoleDemo2026), page /mes-creneaux.
- **Données :** Début = date/heure futures, Durée = 45 min
- **Étapes :**
  1. Aller sur /mes-creneaux
  2. Saisir une date de début et choisir 45 min
  3. Cliquer 'Ajouter le créneau'
  4. Vérifier l'apparition du créneau (debut → heure fin)
  5. Cliquer 'Supprimer' sur ce créneau
- **Résultat attendu :** Le créneau apparaît avec l'intervalle (fin = début + durée) puis disparaît après suppression ; aucun message d'erreur.
- **Traçabilité :** RendezVous/Creneaux ; page Creneaux.tsx ; POST /api/rdv/creneaux + DELETE /api/rdv/creneaux/:id
- **Automatisation :** ⏳ à automatiser

### TC-RDV-060 — UI accompagnateur — un créneau réservé affiche le réservataire et masque Supprimer

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | table de décision |

- **Préconditions :** Un accompagné a réservé un créneau de cet accompagnateur.
- **Données :** Page /mes-creneaux
- **Étapes :**
  1. Aller sur /mes-creneaux
  2. Repérer le créneau réservé
- **Résultat attendu :** Le créneau porte le badge 'Réservé · <prénom ou email de l'accompagné>' ; le bouton 'Supprimer' n'est PAS affiché pour ce créneau.
- **Traçabilité :** RendezVous/Creneaux ; page Creneaux.tsx (lignes 85-94) ; GET /api/rdv/creneaux/mine
- **Automatisation :** ⏳ à automatiser

### TC-RDV-061 — UI accompagné — réserver un créneau depuis /rendez-vous

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test du contrat |

- **Préconditions :** Connecté en accompagné (afrit_mohamed@yahoo.fr) ; au moins un créneau disponible chez l'accompagnateur lié.
- **Données :** Page /rendez-vous
- **Étapes :**
  1. Aller sur /rendez-vous
  2. Section 'Créneaux disponibles' : cliquer 'Réserver'
  3. Observer le message
- **Résultat attendu :** Message succès 'Rendez-vous confirmé ✅ ...' ; le créneau passe en section 'Mes rendez-vous' avec son statut ; il disparaît des disponibles.
- **Traçabilité :** RendezVous/RendezVous ; page RendezVous.tsx ; POST /api/rdv/reserver + GET /rdv/mine + /rdv/disponibles
- **Automatisation :** ⏳ à automatiser

### TC-RDV-062 — UI accompagné — état vide des créneaux disponibles

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | basse | partition d'équivalence |

- **Préconditions :** Aucun créneau libre futur chez l'accompagnateur cible.
- **Données :** Page /rendez-vous
- **Étapes :**
  1. Aller sur /rendez-vous sans créneau disponible
- **Résultat attendu :** Message 'Aucun créneau disponible pour l'instant — reviens un peu plus tard.' ; aucun bouton Réserver.
- **Traçabilité :** RendezVous/RendezVous ; page RendezVous.tsx (ligne 69) ; GET /rdv/disponibles
- **Automatisation :** ⏳ à automatiser

### TC-RDV-063 — UI accompagné (parcours) — demander un RDV quand aucun créneau, puis notification de retour

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | table de décision |

- **Préconditions :** Accompagné sur le détail d'un parcours dont l'accompagnateur n'a aucun créneau libre.
- **Données :** Page /parcours/:id (ParcoursDetail)
- **Étapes :**
  1. Ouvrir le détail d'un parcours sans créneau
  2. Section Rendez-vous : cliquer '📨 Demander un rendez-vous'
  3. Côté accompagnateur, ajouter un créneau
  4. Revenir côté accompagné consulter les notifications
- **Résultat attendu :** Message 'Demande envoyée à ton accompagnateur...' ; après ajout d'un créneau par l'accompagnateur, l'accompagné reçoit la notification 'De nouveaux créneaux... sont disponibles'.
- **Traçabilité :** RendezVous ; ParcoursDetail.tsx (demander, lignes 61-64, 136) ; POST /api/rdv/demander puis POST /api/rdv/creneaux
- **Automatisation :** ⏳ à automatiser

### TC-RDV-064 — UI — télécharger le .ics d'un rendez-vous (lien Agenda)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | test du contrat |

- **Préconditions :** Accompagné avec un rdv confirmé.
- **Données :** Lien 📅 Agenda dans 'Mes rendez-vous' (/rendez-vous ou /parcours/:id)
- **Étapes :**
  1. Aller sur /rendez-vous
  2. Cliquer le lien '📅 Agenda' du rdv (href /api/rdv/:id/ics)
- **Résultat attendu :** Téléchargement d'un fichier rdv-boussole-<id>.ics (Content-Disposition attachment) ; le fichier s'importe dans un agenda standard.
- **Traçabilité :** RendezVous ; RendezVous.tsx ligne 59 / ParcoursDetail.tsx ligne 118 ; GET /api/rdv/:id/ics
- **Automatisation :** ⏳ à automatiser

### TC-RDV-065 — UI — routes /mes-creneaux et /rendez-vous protégées par rôle

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | acces | moyenne | test basé sur les rôles |

- **Préconditions :** Comptes des deux rôles disponibles.
- **Données :** Navigation directe vers /mes-creneaux et /rendez-vous
- **Étapes :**
  1. Connecté en accompagné, naviguer vers /mes-creneaux
  2. Connecté en accompagnateur, naviguer vers /rendez-vous
- **Résultat attendu :** Le composant Protected role=... empêche l'accès croisé (accompagné bloqué sur /mes-creneaux, accompagnateur bloqué sur /rendez-vous) : redirection/refus, pas d'affichage de la page interdite.
- **Traçabilité :** RendezVous ; App.tsx Protected (lignes 113-114) ; pages Creneaux.tsx / RendezVous.tsx
- **Automatisation :** ⏳ à automatiser

### TC-RDV-066 — Non-régression — endpoints rdv accessibles avec un plan limité (pas de requireFeature)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | non-regression | basse | test basé sur les rôles |

- **Préconditions :** Accompagnateur affecté à un plan 'Découverte' (socle) ; accompagné affecté à un plan qui n'inclut pas 'rdv' dans ses features.
- **Données :** POST /api/rdv/creneaux (accompagnateur) et GET /api/rdv/disponibles (accompagné) avec plan restreint
- **Étapes :**
  1. Affecter un plan restreint aux comptes
  2. Appeler les endpoints rdv
- **Résultat attendu :** Les endpoints répondent normalement (200/201) : le routeur /api/rdv n'applique AUCUN requireFeature('rdv') ; le gating par offre n'est donc pas effectif sur ce domaine (écart à documenter). Aucune réponse 403 'Fonctionnalité non disponible'.
- **Traçabilité :** features.ts:rdv (clé définie mais non câblée) ; mount /api/rdv (index.ts:45) sans requireFeature
- **Automatisation :** ✅ api/rdv.test.ts

## Domaine ENTR — 84 cas

**Endpoints couverts :**

- `GET /api/entretien/phases` · feature: `entretien (non gardé par requireFeature)` · rôle: authentifié (tout rôle) — Référentiel des 6 phases de l'entretien
- `GET /api/entretien/dossiers` · feature: `entretien (non gardé)` · rôle: accompagnateur — Liste des dossiers de l'accompagnateur (ses accompagnés) avec recap questionnaire
- `GET /api/entretien/dashboard` · feature: `entretien (non gardé)` · rôle: accompagnateur — Tableau de bord : agrégats par accompagné (sessions, actions ouvertes, questionnaire, CR, tags)
- `POST /api/entretien/sessions` · feature: `entretien (non gardé)` · rôle: accompagnateur — Démarrer ou reprendre une session en_cours pour un dossier possédé
- `GET /api/entretien/sessions/:id` · feature: `entretien (non gardé)` · rôle: accompagnateur (propriétaire via ownsSession) — Détail d'une session + réponses par phase + questions posées
- `POST /api/entretien/sessions/:id/reponses` · feature: `entretien (non gardé)` · rôle: accompagnateur (propriétaire) — Enregistrer les notes d'une phase (delete+insert, source='saisie', maj phase_atteinte)
- `POST /api/entretien/sessions/:id/questions` · feature: `entretien (non gardé)` · rôle: accompagnateur (propriétaire) — Ajouter une question posée pendant l'entretien (201)
- `PATCH /api/entretien/sessions/:id/questions/:qid` · feature: `entretien (non gardé)` · rôle: accompagnateur (propriétaire) — Mise à jour partielle d'une question (texte et/ou reponse)
- `DELETE /api/entretien/sessions/:id/questions/:qid` · feature: `entretien (non gardé)` · rôle: accompagnateur (propriétaire) — Supprimer une question posée
- `POST /api/entretien/sessions/:id/cloturer` · feature: `entretien (non gardé)` · rôle: accompagnateur (propriétaire) — Clôturer la session (statut='terminee')
- `POST /api/entretien/suggestions` · feature: `entretien (non gardé) / copilote côté UI` · rôle: accompagnateur — Suggestions IA (reformulation + questions + a_surveiller) avec repli déterministe

### TC-ENTR-001 — GET /phases — nominal : 6 phases avec structure complète

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat |

- **Préconditions :** Authentifié (rôle accompagnateur).
- **Données :** GET /api/entretien/phases avec cookie valide.
- **Étapes :**
  1. Se connecter (accompagnateur)
  2. GET /api/entretien/phases
- **Résultat attendu :** 200 ; body { phases: [...] } de longueur 6 ; chaque phase a id (0..5), titre, soustitre, objectif, vigilance (array non vide), questions (array non vide).
- **Traçabilité :** entretien | GET /api/entretien/phases
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-002 — GET /phases — accessible aussi à l'accompagné (requireAuth seul)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles |

- **Préconditions :** Compte accompagné (afrit_mohamed@yahoo.fr).
- **Données :** GET /api/entretien/phases.
- **Étapes :**
  1. Se connecter (accompagné)
  2. GET /api/entretien/phases
- **Résultat attendu :** 200 (la route n'exige que requireAuth, aucun requireRole) ; 6 phases renvoyées.
- **Traçabilité :** entretien | GET /api/entretien/phases
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-003 — GET /phases — 401 non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles |

- **Préconditions :** Aucun cookie d'auth.
- **Données :** GET /api/entretien/phases sans cookie.
- **Étapes :**
  1. GET /api/entretien/phases sans cookie boussole_token
- **Résultat attendu :** 401 ; { error: 'Non authentifié' }.
- **Traçabilité :** entretien | GET /api/entretien/phases
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-004 — GET /phases — 401 jeton invalide/expiré

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | partition d'équivalence (jeton invalide) |

- **Préconditions :** Cookie boussole_token corrompu.
- **Données :** Cookie = chaîne JWT falsifiée.
- **Étapes :**
  1. GET /api/entretien/phases avec cookie boussole_token=abc.def.ghi
- **Résultat attendu :** 401 ; { error: 'Session invalide' }.
- **Traçabilité :** entretien | GET /api/entretien/phases
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-005 — GET /dossiers — nominal : liste des dossiers de l'accompagnateur

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat |

- **Préconditions :** Accompagnateur Mohamed (elafrit.mohamed@gmail.com) ayant des dossiers seedés.
- **Données :** GET /api/entretien/dossiers.
- **Étapes :**
  1. Se connecter (accompagnateur)
  2. GET /api/entretien/dossiers
- **Résultat attendu :** 200 ; { dossiers: [...] } ; chaque item a id, titre, accompagne_prenom, accompagne_email, recap (string|null) ; tri par cree_le DESC ; ne contient QUE les dossiers où accompagnateur_id = moi.
- **Traçabilité :** entretien | GET /api/entretien/dossiers
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-006 — GET /dossiers — isolation : ne voit pas les dossiers d'un autre accompagnateur

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles (isolation par propriétaire) |

- **Préconditions :** Deux accompagnateurs (Mohamed et Camille) avec dossiers distincts.
- **Données :** GET /api/entretien/dossiers en tant que Camille.
- **Étapes :**
  1. Se connecter (camille.laurent@boussole.demo)
  2. GET /api/entretien/dossiers
  3. Vérifier qu'aucun dossier de Mohamed n'apparaît
- **Résultat attendu :** 200 ; la liste ne contient que les dossiers de Camille (filtre WHERE accompagnateur_id = ?).
- **Traçabilité :** entretien | GET /api/entretien/dossiers
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-007 — GET /dossiers — 403 rôle accompagné

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles |

- **Préconditions :** Compte accompagné.
- **Données :** GET /api/entretien/dossiers.
- **Étapes :**
  1. Se connecter (accompagné)
  2. GET /api/entretien/dossiers
- **Résultat attendu :** 403 ; { error: 'Accès refusé' } (requireRole('accompagnateur')).
- **Traçabilité :** entretien | GET /api/entretien/dossiers
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-008 — GET /dossiers — 403 rôle admin

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles |

- **Préconditions :** Compte admin (mohamed@elafrit.com).
- **Données :** GET /api/entretien/dossiers.
- **Étapes :**
  1. Se connecter (admin)
  2. GET /api/entretien/dossiers
- **Résultat attendu :** 403 ; { error: 'Accès refusé' } (admin n'est pas dans la liste de rôles autorisés).
- **Traçabilité :** entretien | GET /api/entretien/dossiers
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-009 — GET /dossiers — 401 non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles |

- **Préconditions :** Aucun cookie.
- **Données :** GET /api/entretien/dossiers sans cookie.
- **Étapes :**
  1. GET /api/entretien/dossiers sans cookie
- **Résultat attendu :** 401 ; { error: 'Non authentifié' }.
- **Traçabilité :** entretien | GET /api/entretien/dossiers
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-010 — GET /dashboard — nominal : agrégats par accompagné

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat |

- **Préconditions :** Accompagnateur avec dossiers, sessions, actions, CR, tags seedés.
- **Données :** GET /api/entretien/dashboard.
- **Étapes :**
  1. Se connecter (accompagnateur)
  2. GET /api/entretien/dashboard
- **Résultat attendu :** 200 ; { dossiers: [...] } ; chaque item a id, accompagne_prenom, accompagne_email, nb_sessions (number), actions_ouvertes (compte statut!='fait'), questionnaire (0/1+), nb_cr (number), tags (string concaténée 'id|nom,...' ou null).
- **Traçabilité :** entretien | GET /api/entretien/dashboard
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-011 — GET /dashboard — actions_ouvertes exclut les actions 'fait'

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | partition d'équivalence (statut action) |

- **Préconditions :** Un dossier avec actions de statuts mixtes (fait / non fait).
- **Données :** GET /api/entretien/dashboard.
- **Étapes :**
  1. Préparer un dossier avec ≥1 action 'fait' et ≥1 action non 'fait'
  2. GET /api/entretien/dashboard
  3. Comparer actions_ouvertes au nombre d'actions statut != 'fait'
- **Résultat attendu :** actions_ouvertes = nombre d'actions du dossier dont statut != 'fait' ; les actions 'fait' sont exclues.
- **Traçabilité :** entretien | GET /api/entretien/dashboard
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-012 — GET /dashboard — format du champ tags (GROUP_CONCAT id|nom)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | basse | test du contrat |

- **Préconditions :** Un dossier avec ≥2 tags ; un dossier sans tag.
- **Données :** GET /api/entretien/dashboard.
- **Étapes :**
  1. GET /api/entretien/dashboard
  2. Inspecter le champ tags des deux dossiers
- **Résultat attendu :** Pour le dossier taggé : tags = 'id1|nom1,id2|nom2' (séparateur | entre id et nom, , entre tags) ; pour le dossier sans tag : tags = null.
- **Traçabilité :** entretien | GET /api/entretien/dashboard
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-013 — GET /dashboard — 403 rôle accompagné

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles |

- **Préconditions :** Compte accompagné.
- **Données :** GET /api/entretien/dashboard.
- **Étapes :**
  1. Se connecter (accompagné)
  2. GET /api/entretien/dashboard
- **Résultat attendu :** 403 ; { error: 'Accès refusé' }.
- **Traçabilité :** entretien | GET /api/entretien/dashboard
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-014 — GET /dashboard — 401 non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles |

- **Préconditions :** Aucun cookie.
- **Données :** GET /api/entretien/dashboard sans cookie.
- **Étapes :**
  1. GET /api/entretien/dashboard sans cookie
- **Résultat attendu :** 401 ; { error: 'Non authentifié' }.
- **Traçabilité :** entretien | GET /api/entretien/dashboard
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-015 — POST /sessions — nominal : création d'une session pour un dossier possédé

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat |

- **Préconditions :** Accompagnateur propriétaire d'un dossier sans session en_cours.
- **Données :** { dossierId: <id dossier possédé> }.
- **Étapes :**
  1. Se connecter (accompagnateur)
  2. POST /api/entretien/sessions avec body { dossierId }
- **Résultat attendu :** 200 ; { sessionId: <number> } ; une nouvelle session est insérée avec phase_atteinte='0' et statut par défaut 'en_cours'.
- **Traçabilité :** entretien | POST /api/entretien/sessions
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-016 — POST /sessions — reprise : renvoie la session 'en_cours' existante (pas de doublon)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | table de décision (session en_cours existe ? oui→reprendre, non→créer) |

- **Préconditions :** Un dossier possédé avec une session statut='en_cours'.
- **Données :** { dossierId } appelé deux fois.
- **Étapes :**
  1. POST /api/entretien/sessions { dossierId } → noter sessionId1
  2. POST /api/entretien/sessions { dossierId } à nouveau → noter sessionId2
- **Résultat attendu :** sessionId2 == sessionId1 (reprise de la session en_cours la plus récente, aucune nouvelle session créée).
- **Traçabilité :** entretien | POST /api/entretien/sessions
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-017 — POST /sessions — nouvelle session après clôture de la précédente

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | table de décision |

- **Préconditions :** Un dossier possédé dont la dernière session est 'terminee'.
- **Données :** { dossierId }.
- **Étapes :**
  1. Clôturer une session du dossier
  2. POST /api/entretien/sessions { dossierId }
- **Résultat attendu :** 200 ; sessionId différent de la session terminée (une nouvelle session en_cours est créée car aucune en_cours ne subsiste).
- **Traçabilité :** entretien | POST /api/entretien/sessions
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-018 — POST /sessions — 404 dossier d'un autre accompagnateur

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles (propriétaire de ressource) |

- **Préconditions :** Camille connectée ; dossierId appartient à Mohamed.
- **Données :** { dossierId: <dossier de Mohamed> }.
- **Étapes :**
  1. Se connecter (Camille)
  2. POST /api/entretien/sessions { dossierId d'un dossier de Mohamed }
- **Résultat attendu :** 404 ; { error: 'Dossier introuvable' } (filtre WHERE id=? AND accompagnateur_id=?).
- **Traçabilité :** entretien | POST /api/entretien/sessions
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-019 — POST /sessions — 404 dossierId inexistant

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | valeurs limites (id inexistant) |

- **Préconditions :** Accompagnateur connecté.
- **Données :** { dossierId: 999999 }.
- **Étapes :**
  1. POST /api/entretien/sessions { dossierId: 999999 }
- **Résultat attendu :** 404 ; { error: 'Dossier introuvable' }.
- **Traçabilité :** entretien | POST /api/entretien/sessions
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-020 — POST /sessions — 404 dossierId manquant ou non numérique (NaN)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | partition d'équivalence (entrée invalide → Number(...)=NaN) |

- **Préconditions :** Accompagnateur connecté.
- **Données :** {} ou { dossierId: 'abc' }.
- **Étapes :**
  1. POST /api/entretien/sessions avec body {} (ou dossierId='abc')
- **Résultat attendu :** 404 ; { error: 'Dossier introuvable' } (Number(undefined/'abc')=NaN ne correspond à aucun dossier).
- **Traçabilité :** entretien | POST /api/entretien/sessions
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-021 — POST /sessions — 403 rôle accompagné

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles |

- **Préconditions :** Compte accompagné.
- **Données :** { dossierId: 1 }.
- **Étapes :**
  1. Se connecter (accompagné)
  2. POST /api/entretien/sessions { dossierId: 1 }
- **Résultat attendu :** 403 ; { error: 'Accès refusé' }.
- **Traçabilité :** entretien | POST /api/entretien/sessions
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-022 — POST /sessions — 401 non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles |

- **Préconditions :** Aucun cookie.
- **Données :** { dossierId: 1 } sans cookie.
- **Étapes :**
  1. POST /api/entretien/sessions sans cookie
- **Résultat attendu :** 401 ; { error: 'Non authentifié' }.
- **Traçabilité :** entretien | POST /api/entretien/sessions
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-023 — GET /sessions/:id — nominal : détail + réponses + questions

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat |

- **Préconditions :** Accompagnateur propriétaire d'une session ayant des réponses et questions.
- **Données :** GET /api/entretien/sessions/<id possédé>.
- **Étapes :**
  1. Se connecter (accompagnateur)
  2. GET /api/entretien/sessions/:id
- **Résultat attendu :** 200 ; { session: { id, dossier_id, phase_atteinte, statut }, reponses: [{ phase, texte_reponse }] (tri par phase), questions: [{ id, phase, texte, reponse }] (tri par id) }.
- **Traçabilité :** entretien | GET /api/entretien/sessions/:id
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-024 — GET /sessions/:id — 404 session d'un autre accompagnateur

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles (propriétaire via ownsSession) |

- **Préconditions :** Camille connectée ; sessionId appartient à un dossier de Mohamed.
- **Données :** GET /api/entretien/sessions/<session de Mohamed>.
- **Étapes :**
  1. Se connecter (Camille)
  2. GET /api/entretien/sessions/:id (session de Mohamed)
- **Résultat attendu :** 404 ; { error: 'Session introuvable' } (ownsSession=false).
- **Traçabilité :** entretien | GET /api/entretien/sessions/:id
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-025 — GET /sessions/:id — 404 session inexistante

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | valeurs limites (id inexistant) |

- **Préconditions :** Accompagnateur connecté.
- **Données :** GET /api/entretien/sessions/999999.
- **Étapes :**
  1. GET /api/entretien/sessions/999999
- **Résultat attendu :** 404 ; { error: 'Session introuvable' }.
- **Traçabilité :** entretien | GET /api/entretien/sessions/:id
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-026 — GET /sessions/:id — 404 id non numérique

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | basse | partition d'équivalence (Number(:id)=NaN) |

- **Préconditions :** Accompagnateur connecté.
- **Données :** GET /api/entretien/sessions/abc.
- **Étapes :**
  1. GET /api/entretien/sessions/abc
- **Résultat attendu :** 404 ; { error: 'Session introuvable' } (NaN ne possède aucune session).
- **Traçabilité :** entretien | GET /api/entretien/sessions/:id
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-027 — GET /sessions/:id — 403 rôle accompagné

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles |

- **Préconditions :** Compte accompagné.
- **Données :** GET /api/entretien/sessions/1.
- **Étapes :**
  1. Se connecter (accompagné)
  2. GET /api/entretien/sessions/1
- **Résultat attendu :** 403 ; { error: 'Accès refusé' } (requireRole bloque avant ownsSession).
- **Traçabilité :** entretien | GET /api/entretien/sessions/:id
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-028 — GET /sessions/:id — 401 non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles |

- **Préconditions :** Aucun cookie.
- **Données :** GET /api/entretien/sessions/1 sans cookie.
- **Étapes :**
  1. GET /api/entretien/sessions/1 sans cookie
- **Résultat attendu :** 401 ; { error: 'Non authentifié' }.
- **Traçabilité :** entretien | GET /api/entretien/sessions/:id
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-029 — POST /sessions/:id/reponses — nominal : enregistre et met à jour phase_atteinte

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat |

- **Préconditions :** Session possédée.
- **Données :** { phase: '2', texte: 'Notes de la phase 2' }.
- **Étapes :**
  1. POST /api/entretien/sessions/:id/reponses { phase:'2', texte:'...' }
  2. GET /api/entretien/sessions/:id pour relire
- **Résultat attendu :** 200 ; { ok: true } ; à la relecture, reponses contient { phase:'2', texte_reponse:'Notes de la phase 2' } et session.phase_atteinte='2'.
- **Traçabilité :** entretien | POST /api/entretien/sessions/:id/reponses
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-030 — POST /sessions/:id/reponses — idempotence : remplace (delete+insert) sans doublon

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat (remplacement par clé session_id+phase) |

- **Préconditions :** Session possédée avec déjà une réponse en phase 1.
- **Données :** Deux POST successifs sur phase 1 avec textes différents.
- **Étapes :**
  1. POST .../reponses { phase:'1', texte:'A' }
  2. POST .../reponses { phase:'1', texte:'B' }
  3. GET /api/entretien/sessions/:id
- **Résultat attendu :** Une seule entrée pour la phase 1, texte_reponse='B' (l'ancienne est supprimée puis réinsérée).
- **Traçabilité :** entretien | POST /api/entretien/sessions/:id/reponses
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-031 — POST /sessions/:id/reponses — phase invalide : question stockée à null mais accepté

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | partition d'équivalence (phase hors 0..5) |

- **Préconditions :** Session possédée.
- **Données :** { phase: '99', texte: 'x' }.
- **Étapes :**
  1. POST .../reponses { phase:'99', texte:'x' }
  2. GET /api/entretien/sessions/:id
- **Résultat attendu :** 200 ; { ok: true } ; la réponse est enregistrée avec colonne question=null (PHASES.find échoue → phaseObj indéfini) ; phase_atteinte='99'. (Comportement permissif documenté.)
- **Traçabilité :** entretien | POST /api/entretien/sessions/:id/reponses
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-032 — POST /sessions/:id/reponses — texte manquant : coercition en chaîne vide (200)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | valeurs limites (texte absent → '') |

- **Préconditions :** Session possédée.
- **Données :** { phase: '0' } (sans texte).
- **Étapes :**
  1. POST .../reponses { phase:'0' }
- **Résultat attendu :** 200 ; { ok: true } ; texte_reponse enregistré = '' (String(undefined ?? '')). Aucune erreur 400 (pas de validation de non-vacuité sur les notes).
- **Traçabilité :** entretien | POST /api/entretien/sessions/:id/reponses
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-033 — POST /sessions/:id/reponses — 404 session d'autrui

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles (ownsSession) |

- **Préconditions :** Camille connectée ; session de Mohamed.
- **Données :** { phase:'0', texte:'x' }.
- **Étapes :**
  1. Se connecter (Camille)
  2. POST /api/entretien/sessions/<session Mohamed>/reponses
- **Résultat attendu :** 404 ; { error: 'Session introuvable' } ; aucune écriture en base.
- **Traçabilité :** entretien | POST /api/entretien/sessions/:id/reponses
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-034 — POST /sessions/:id/reponses — 403 rôle accompagné

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles |

- **Préconditions :** Compte accompagné.
- **Données :** { phase:'0', texte:'x' }.
- **Étapes :**
  1. Se connecter (accompagné)
  2. POST /api/entretien/sessions/1/reponses
- **Résultat attendu :** 403 ; { error: 'Accès refusé' }.
- **Traçabilité :** entretien | POST /api/entretien/sessions/:id/reponses
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-035 — POST /sessions/:id/reponses — 401 non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | basse | test basé sur les rôles |

- **Préconditions :** Aucun cookie.
- **Données :** { phase:'0', texte:'x' } sans cookie.
- **Étapes :**
  1. POST /api/entretien/sessions/1/reponses sans cookie
- **Résultat attendu :** 401 ; { error: 'Non authentifié' }.
- **Traçabilité :** entretien | POST /api/entretien/sessions/:id/reponses
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-036 — POST /sessions/:id/questions — nominal : 201 + écho id/phase/texte

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat |

- **Préconditions :** Session possédée.
- **Données :** { phase: '1', texte: 'Quelle situation t'a marqué ?' }.
- **Étapes :**
  1. POST /api/entretien/sessions/:id/questions { phase:'1', texte:'...' }
- **Résultat attendu :** 201 ; { id: <number>, phase: '1', texte: 'Quelle situation t'a marqué ?' } ; la question est persistée (relecture via GET sessions/:id).
- **Traçabilité :** entretien | POST /api/entretien/sessions/:id/questions
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-037 — POST /sessions/:id/questions — texte trimé (espaces de bord supprimés)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | basse | valeurs limites (espaces de bord) |

- **Préconditions :** Session possédée.
- **Données :** { phase:'0', texte: '   Bonjour   ' }.
- **Étapes :**
  1. POST .../questions { phase:'0', texte:'   Bonjour   ' }
- **Résultat attendu :** 201 ; texte renvoyé = 'Bonjour' (trim appliqué avant insertion).
- **Traçabilité :** entretien | POST /api/entretien/sessions/:id/questions
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-038 — POST /sessions/:id/questions — 400 texte vide

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | haute | valeurs limites / partition d'équivalence (texte vide ou espaces seuls) |

- **Préconditions :** Session possédée.
- **Données :** { phase:'0', texte:'   ' } ou texte absent.
- **Étapes :**
  1. POST .../questions { phase:'0', texte:'   ' }
- **Résultat attendu :** 400 ; { error: 'Question vide' } (texte.trim() falsy) ; aucune insertion.
- **Traçabilité :** entretien | POST /api/entretien/sessions/:id/questions
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-039 — POST /sessions/:id/questions — 404 session d'autrui

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles (ownsSession) |

- **Préconditions :** Camille connectée ; session de Mohamed.
- **Données :** { phase:'0', texte:'x' }.
- **Étapes :**
  1. Se connecter (Camille)
  2. POST /api/entretien/sessions/<session Mohamed>/questions
- **Résultat attendu :** 404 ; { error: 'Session introuvable' }.
- **Traçabilité :** entretien | POST /api/entretien/sessions/:id/questions
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-040 — POST /sessions/:id/questions — 403 rôle accompagné

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles |

- **Préconditions :** Compte accompagné.
- **Données :** { phase:'0', texte:'x' }.
- **Étapes :**
  1. Se connecter (accompagné)
  2. POST /api/entretien/sessions/1/questions
- **Résultat attendu :** 403 ; { error: 'Accès refusé' }.
- **Traçabilité :** entretien | POST /api/entretien/sessions/:id/questions
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-041 — POST /sessions/:id/questions — 401 non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | basse | test basé sur les rôles |

- **Préconditions :** Aucun cookie.
- **Données :** { phase:'0', texte:'x' } sans cookie.
- **Étapes :**
  1. POST /api/entretien/sessions/1/questions sans cookie
- **Résultat attendu :** 401 ; { error: 'Non authentifié' }.
- **Traçabilité :** entretien | POST /api/entretien/sessions/:id/questions
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-042 — PATCH questions/:qid — nominal : mise à jour du texte seul (réponse intacte)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | table de décision (texte présent / réponse absente) |

- **Préconditions :** Session possédée ; une question avec une réponse non vide.
- **Données :** { texte: 'Nouveau libellé' } (sans champ reponse).
- **Étapes :**
  1. PATCH .../questions/:qid { texte:'Nouveau libellé' }
  2. GET sessions/:id
- **Résultat attendu :** 200 ; { ok: true } ; texte mis à jour ; reponse INCHANGÉE (mise à jour partielle : seul le champ fourni est modifié).
- **Traçabilité :** entretien | PATCH /api/entretien/sessions/:id/questions/:qid
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-043 — PATCH questions/:qid — nominal : mise à jour de la réponse seule (texte intact)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | table de décision (réponse présente / texte absent) |

- **Préconditions :** Session possédée ; une question existante.
- **Données :** { reponse: 'Réponse de la personne' }.
- **Étapes :**
  1. PATCH .../questions/:qid { reponse:'Réponse de la personne' }
  2. GET sessions/:id
- **Résultat attendu :** 200 ; { ok: true } ; reponse mise à jour ; texte INCHANGÉ.
- **Traçabilité :** entretien | PATCH /api/entretien/sessions/:id/questions/:qid
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-044 — PATCH questions/:qid — texte ET réponse simultanés

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | table de décision (les deux champs présents) |

- **Préconditions :** Session possédée ; une question existante.
- **Données :** { texte: 'T2', reponse: 'R2' }.
- **Étapes :**
  1. PATCH .../questions/:qid { texte:'T2', reponse:'R2' }
  2. GET sessions/:id
- **Résultat attendu :** 200 ; { ok: true } ; texte='T2' ET reponse='R2'.
- **Traçabilité :** entretien | PATCH /api/entretien/sessions/:id/questions/:qid
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-045 — PATCH questions/:qid — réponse vide autorisée (efface la réponse)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | valeurs limites (reponse='' non null) |

- **Préconditions :** Session possédée ; question avec réponse non vide.
- **Données :** { reponse: '' }.
- **Étapes :**
  1. PATCH .../questions/:qid { reponse:'' }
  2. GET sessions/:id
- **Résultat attendu :** 200 ; { ok: true } ; reponse devient '' (req.body.reponse != null est vrai pour '', donc le champ est inclus). Texte inchangé.
- **Traçabilité :** entretien | PATCH /api/entretien/sessions/:id/questions/:qid
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-046 — PATCH questions/:qid — corps vide : no-op 200 (aucun champ touché)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | partition d'équivalence (sets.length===0) |

- **Préconditions :** Session possédée ; question existante.
- **Données :** {} (ni texte ni reponse).
- **Étapes :**
  1. PATCH .../questions/:qid {}
  2. GET sessions/:id
- **Résultat attendu :** 200 ; { ok: true } ; aucune modification en base (la branche sets.length===0 retourne ok sans UPDATE).
- **Traçabilité :** entretien | PATCH /api/entretien/sessions/:id/questions/:qid
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-047 — PATCH questions/:qid — 400 texte présent mais vide après trim

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | haute | valeurs limites (texte='   ') |

- **Préconditions :** Session possédée ; question existante.
- **Données :** { texte: '   ' }.
- **Étapes :**
  1. PATCH .../questions/:qid { texte:'   ' }
- **Résultat attendu :** 400 ; { error: 'Question vide' } ; aucune écriture (validation seulement quand le champ texte est fourni).
- **Traçabilité :** entretien | PATCH /api/entretien/sessions/:id/questions/:qid
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-048 — PATCH questions/:qid — qid d'une autre session du même propriétaire non modifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | test du contrat (clause WHERE id=? AND session_id=?) |

- **Préconditions :** Accompagnateur possédant deux sessions S1 et S2 ; une question qX appartient à S2.
- **Données :** PATCH /sessions/S1/questions/qX { texte:'X' }.
- **Étapes :**
  1. PATCH .../sessions/S1/questions/qX { texte:'X' }
  2. GET sessions/S2/:id
- **Résultat attendu :** 200 ; { ok: true } MAIS aucune ligne affectée (WHERE id=qX AND session_id=S1 ne correspond pas) ; la question qX de S2 reste inchangée.
- **Traçabilité :** entretien | PATCH /api/entretien/sessions/:id/questions/:qid
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-049 — PATCH questions/:qid — 404 session d'autrui

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles (ownsSession) |

- **Préconditions :** Camille connectée ; session de Mohamed.
- **Données :** { texte:'x' }.
- **Étapes :**
  1. Se connecter (Camille)
  2. PATCH /sessions/<session Mohamed>/questions/1
- **Résultat attendu :** 404 ; { error: 'Session introuvable' }.
- **Traçabilité :** entretien | PATCH /api/entretien/sessions/:id/questions/:qid
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-050 — PATCH questions/:qid — 403 rôle accompagné

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles |

- **Préconditions :** Compte accompagné.
- **Données :** { texte:'x' }.
- **Étapes :**
  1. Se connecter (accompagné)
  2. PATCH /sessions/1/questions/1
- **Résultat attendu :** 403 ; { error: 'Accès refusé' }.
- **Traçabilité :** entretien | PATCH /api/entretien/sessions/:id/questions/:qid
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-051 — PATCH questions/:qid — 401 non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | basse | test basé sur les rôles |

- **Préconditions :** Aucun cookie.
- **Données :** { texte:'x' } sans cookie.
- **Étapes :**
  1. PATCH /sessions/1/questions/1 sans cookie
- **Résultat attendu :** 401 ; { error: 'Non authentifié' }.
- **Traçabilité :** entretien | PATCH /api/entretien/sessions/:id/questions/:qid
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-052 — DELETE questions/:qid — nominal : suppression d'une question

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat |

- **Préconditions :** Session possédée avec une question qX.
- **Données :** DELETE /sessions/:id/questions/qX.
- **Étapes :**
  1. DELETE .../questions/qX
  2. GET sessions/:id
- **Résultat attendu :** 200 ; { ok: true } ; la question qX n'apparaît plus dans le tableau questions.
- **Traçabilité :** entretien | DELETE /api/entretien/sessions/:id/questions/:qid
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-053 — DELETE questions/:qid — qid inexistant : 200 idempotent

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | basse | valeurs limites (id inexistant) |

- **Préconditions :** Session possédée.
- **Données :** DELETE /sessions/:id/questions/999999.
- **Étapes :**
  1. DELETE .../questions/999999
- **Résultat attendu :** 200 ; { ok: true } (aucune ligne supprimée, opération idempotente sans erreur).
- **Traçabilité :** entretien | DELETE /api/entretien/sessions/:id/questions/:qid
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-054 — DELETE questions/:qid — qid appartenant à une autre session non supprimé

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | test du contrat (WHERE id=? AND session_id=?) |

- **Préconditions :** Accompagnateur avec S1 et S2 ; question qX dans S2.
- **Données :** DELETE /sessions/S1/questions/qX.
- **Étapes :**
  1. DELETE .../sessions/S1/questions/qX
  2. GET sessions/S2/:id
- **Résultat attendu :** 200 ; { ok: true } mais qX toujours présente dans S2 (clause session_id ne correspond pas).
- **Traçabilité :** entretien | DELETE /api/entretien/sessions/:id/questions/:qid
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-055 — DELETE questions/:qid — 404 session d'autrui

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles (ownsSession) |

- **Préconditions :** Camille connectée ; session de Mohamed.
- **Données :** DELETE /sessions/<session Mohamed>/questions/1.
- **Étapes :**
  1. Se connecter (Camille)
  2. DELETE /sessions/<session Mohamed>/questions/1
- **Résultat attendu :** 404 ; { error: 'Session introuvable' } ; aucune suppression.
- **Traçabilité :** entretien | DELETE /api/entretien/sessions/:id/questions/:qid
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-056 — DELETE questions/:qid — 403 rôle accompagné

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles |

- **Préconditions :** Compte accompagné.
- **Données :** DELETE /sessions/1/questions/1.
- **Étapes :**
  1. Se connecter (accompagné)
  2. DELETE /sessions/1/questions/1
- **Résultat attendu :** 403 ; { error: 'Accès refusé' }.
- **Traçabilité :** entretien | DELETE /api/entretien/sessions/:id/questions/:qid
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-057 — DELETE questions/:qid — 401 non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | basse | test basé sur les rôles |

- **Préconditions :** Aucun cookie.
- **Données :** DELETE /sessions/1/questions/1 sans cookie.
- **Étapes :**
  1. DELETE /sessions/1/questions/1 sans cookie
- **Résultat attendu :** 401 ; { error: 'Non authentifié' }.
- **Traçabilité :** entretien | DELETE /api/entretien/sessions/:id/questions/:qid
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-058 — POST /sessions/:id/cloturer — nominal : passe la session à 'terminee'

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat |

- **Préconditions :** Session possédée statut='en_cours'.
- **Données :** POST /sessions/:id/cloturer.
- **Étapes :**
  1. POST .../cloturer
  2. GET sessions/:id
- **Résultat attendu :** 200 ; { ok: true } ; session.statut='terminee'.
- **Traçabilité :** entretien | POST /api/entretien/sessions/:id/cloturer
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-059 — POST /sessions/:id/cloturer — clôture répétée idempotente

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | basse | partition d'équivalence (déjà terminée) |

- **Préconditions :** Session déjà 'terminee'.
- **Données :** POST /sessions/:id/cloturer.
- **Étapes :**
  1. POST .../cloturer une 2e fois
- **Résultat attendu :** 200 ; { ok: true } ; statut reste 'terminee' (UPDATE inconditionnel, sans effet de bord).
- **Traçabilité :** entretien | POST /api/entretien/sessions/:id/cloturer
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-060 — POST /sessions/:id/cloturer — après clôture, POST /sessions crée une nouvelle session

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | table de décision (enchaînement clôture→reprise) |

- **Préconditions :** Dossier possédé avec session en_cours.
- **Données :** Clôture puis POST /sessions { dossierId }.
- **Étapes :**
  1. POST .../cloturer
  2. POST /api/entretien/sessions { dossierId }
- **Résultat attendu :** La nouvelle session a un id différent (aucune session en_cours ne subsiste après clôture).
- **Traçabilité :** entretien | POST /api/entretien/sessions/:id/cloturer
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-061 — POST /sessions/:id/cloturer — 404 session d'autrui

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles (ownsSession) |

- **Préconditions :** Camille connectée ; session de Mohamed.
- **Données :** POST /sessions/<session Mohamed>/cloturer.
- **Étapes :**
  1. Se connecter (Camille)
  2. POST /sessions/<session Mohamed>/cloturer
- **Résultat attendu :** 404 ; { error: 'Session introuvable' } ; statut inchangé.
- **Traçabilité :** entretien | POST /api/entretien/sessions/:id/cloturer
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-062 — POST /sessions/:id/cloturer — 403 rôle accompagné

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles |

- **Préconditions :** Compte accompagné.
- **Données :** POST /sessions/1/cloturer.
- **Étapes :**
  1. Se connecter (accompagné)
  2. POST /sessions/1/cloturer
- **Résultat attendu :** 403 ; { error: 'Accès refusé' }.
- **Traçabilité :** entretien | POST /api/entretien/sessions/:id/cloturer
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-063 — POST /sessions/:id/cloturer — 401 non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | basse | test basé sur les rôles |

- **Préconditions :** Aucun cookie.
- **Données :** POST /sessions/1/cloturer sans cookie.
- **Étapes :**
  1. POST /sessions/1/cloturer sans cookie
- **Résultat attendu :** 401 ; { error: 'Non authentifié' }.
- **Traçabilité :** entretien | POST /api/entretien/sessions/:id/cloturer
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-064 — POST /suggestions — contrat : 200 avec questions[], reformulation, a_surveiller

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat (ne pas figer le texte) |

- **Préconditions :** Accompagnateur connecté.
- **Données :** { phase: 2, transcript: 'La personne raconte sa refonte de site...' }.
- **Étapes :**
  1. POST /api/entretien/suggestions { phase:2, transcript:'...' }
- **Résultat attendu :** 200 ; body { questions: string[] (non vide), reformulation: string|null, a_surveiller: string|null } ; questions typées chaînes, longueur ≥ 1. Pas d'assertion sur le contenu exact.
- **Traçabilité :** entretien | POST /api/entretien/suggestions | claudeSuggest.suggestForPhase
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-065 — POST /suggestions — repli déterministe sans ANTHROPIC_API_KEY

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat (repli) |

- **Préconditions :** Stack démarrée SANS ANTHROPIC_API_KEY (cas par défaut).
- **Données :** { phase: 0, transcript: '' }.
- **Étapes :**
  1. POST /api/entretien/suggestions { phase:0, transcript:'' }
- **Résultat attendu :** 200 ; questions = les 3 premières questions de PHASES[0] ('Accueil et mise en confiance') ; reformulation=null ; a_surveiller = PHASES[0].vigilance[0] ('Ne pas sauter l'étape pour gagner du temps').
- **Traçabilité :** entretien | POST /api/entretien/suggestions | claudeSuggest.suggestForPhase (fallback)
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-066 — POST /suggestions — phase invalide repli sur PHASES[0]

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | partition d'équivalence (phaseId hors 0..5 → ?? PHASES[0]) |

- **Préconditions :** Sans clé IA.
- **Données :** { phase: 42, transcript: 'x' }.
- **Étapes :**
  1. POST /api/entretien/suggestions { phase:42 }
- **Résultat attendu :** 200 ; suggestions issues de PHASES[0] (PHASES.find renvoie undefined → fallback ?? PHASES[0]) ; questions = 3 questions de la phase 0.
- **Traçabilité :** entretien | POST /api/entretien/suggestions | claudeSuggest.suggestForPhase
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-067 — POST /suggestions — phase non numérique (NaN) gérée par repli

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | basse | partition d'équivalence (Number(phase)=NaN) |

- **Préconditions :** Sans clé IA.
- **Données :** { phase: 'abc', transcript: 'x' }.
- **Étapes :**
  1. POST /api/entretien/suggestions { phase:'abc' }
- **Résultat attendu :** 200 ; Number('abc')=NaN ne matche aucune phase → fallback PHASES[0] ; structure de contrat respectée.
- **Traçabilité :** entretien | POST /api/entretien/suggestions | claudeSuggest.suggestForPhase
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-068 — POST /suggestions — transcript manquant traité comme chaîne vide

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | basse | valeurs limites (transcript absent → '') |

- **Préconditions :** Accompagnateur connecté.
- **Données :** { phase: 1 } (sans transcript).
- **Étapes :**
  1. POST /api/entretien/suggestions { phase:1 }
- **Résultat attendu :** 200 ; aucune erreur (String(undefined||'')='') ; suggestions de contrat renvoyées.
- **Traçabilité :** entretien | POST /api/entretien/suggestions
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-069 — POST /suggestions — 403 rôle accompagné

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles |

- **Préconditions :** Compte accompagné.
- **Données :** { phase:0, transcript:'x' }.
- **Étapes :**
  1. Se connecter (accompagné)
  2. POST /api/entretien/suggestions
- **Résultat attendu :** 403 ; { error: 'Accès refusé' } (requireRole('accompagnateur')).
- **Traçabilité :** entretien | POST /api/entretien/suggestions
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-070 — POST /suggestions — 401 non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles |

- **Préconditions :** Aucun cookie.
- **Données :** { phase:0, transcript:'x' } sans cookie.
- **Étapes :**
  1. POST /api/entretien/suggestions sans cookie
- **Résultat attendu :** 401 ; { error: 'Non authentifié' }.
- **Traçabilité :** entretien | POST /api/entretien/suggestions
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-071 — POST /suggestions — 500 si suggestForPhase lève (gestion d'erreur)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | basse | test du contrat (chemin d'erreur) |

- **Préconditions :** Environnement où suggestForPhase peut lever (ex. erreur interne simulée). Note : avec clé absente, suggestForPhase ne lève jamais (try/catch interne renvoie fallback), donc ce cas exige une injection de panne.
- **Données :** Condition forçant une exception non interceptée dans suggestForPhase.
- **Étapes :**
  1. Provoquer une exception interne
  2. POST /api/entretien/suggestions
- **Résultat attendu :** 500 ; { error: 'Erreur lors de la génération des suggestions' }.
- **Traçabilité :** entretien | POST /api/entretien/suggestions (catch → 500)
- **Automatisation :** ✅ api/entr.test.ts

### TC-ENTR-072 — Unitaire suggestForPhase(0,'') — repli exact phase 0

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | haute | test unitaire de repli (partition d'équivalence) |

- **Préconditions :** process.env.ANTHROPIC_API_KEY non défini ; import direct de suggestForPhase.
- **Données :** phaseId=0, transcript=''.
- **Étapes :**
  1. Appeler suggestForPhase(0, '')
- **Résultat attendu :** { questions: PHASES[0].questions.slice(0,3), reformulation: null, a_surveiller: PHASES[0].vigilance[0] } ; exactement 3 questions.
- **Traçabilité :** claudeSuggest.ts suggestForPhase (fallback)
- **Automatisation :** ✅ unit/claudeSuggest.test.ts

### TC-ENTR-073 — Unitaire suggestForPhase — chaque phase 0..5 renvoie ses 3 questions et sa 1re vigilance

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | moyenne | test unitaire de repli (partition d'équivalence sur 6 classes) |

- **Préconditions :** Sans clé IA.
- **Données :** phaseId ∈ {0,1,2,3,4,5}.
- **Étapes :**
  1. Pour chaque pid, appeler suggestForPhase(pid,'')
  2. Comparer aux PHASES[pid]
- **Résultat attendu :** Pour chaque phase : questions = PHASES[pid].questions.slice(0,3) ; a_surveiller = PHASES[pid].vigilance[0] ; reformulation=null. Phase 3 a 2 questions → renvoie 2 (slice(0,3) tolérant).
- **Traçabilité :** claudeSuggest.ts suggestForPhase (fallback) ; phases.ts
- **Automatisation :** ✅ unit/claudeSuggest.test.ts

### TC-ENTR-074 — Unitaire suggestForPhase — phaseId hors borne repli sur PHASES[0]

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | validation | moyenne | valeurs limites (phaseId = -1, 6, 999) |

- **Préconditions :** Sans clé IA.
- **Données :** phaseId ∈ {-1, 6, 999}.
- **Étapes :**
  1. Appeler suggestForPhase(999,'x')
- **Résultat attendu :** Repli sur PHASES[0] (find renvoie undefined → ?? PHASES[0]) ; questions = 3 questions de la phase 0.
- **Traçabilité :** claudeSuggest.ts suggestForPhase (?? PHASES[0])
- **Automatisation :** ✅ unit/claudeSuggest.test.ts

### TC-ENTR-075 — Unitaire extractJson — extraction de l'objet JSON dans un texte bruité

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | basse | valeurs limites (présence/absence d'accolades) |

- **Préconditions :** Fonction extractJson exportée ou testée indirectement.
- **Données :** 'blabla {"questions":[]} fin' ; texte sans accolade ; accolades inversées.
- **Étapes :**
  1. extractJson('xx {"a":1} yy') → '{"a":1}'
  2. extractJson('aucune accolade') → renvoie le texte tel quel
- **Résultat attendu :** Quand { et } présents et b>a : renvoie la sous-chaîne entre la 1re { et la dernière } ; sinon renvoie le texte original.
- **Traçabilité :** claudeSuggest.ts extractJson
- **Automatisation :** ✅ unit/claudeSuggest.test.ts

### TC-ENTR-076 — UI Dashboard accompagnateur — affichage des cartes et agrégats

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test du contrat (bout-en-bout) |

- **Préconditions :** Stack http://localhost:8080 ; connecté en accompagnateur (Mohamed, BoussoleDemo2026).
- **Données :** Navigation vers /tableau-de-bord.
- **Étapes :**
  1. Se connecter (accompagnateur)
  2. Ouvrir le Tableau de bord
  3. Observer les cartes accompagnés
- **Résultat attendu :** Chaque carte affiche prénom/email, Questionnaire (✓/—), Entretiens (nb_sessions), Comptes rendus (nb_cr), Actions en cours (actions_ouvertes) ; bouton 'Ouvrir le dossier' présent ; données issues de GET /entretien/dashboard.
- **Traçabilité :** entretien | GET /api/entretien/dashboard | page Dashboard.tsx
- **Automatisation :** ⏳ à automatiser

### TC-ENTR-077 — UI Entretien — sélection d'un accompagné et démarrage de session

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test du contrat (bout-en-bout, rôle accompagnateur) |

- **Préconditions :** Accompagnateur avec ≥1 dossier (Amine).
- **Données :** Page /entretien.
- **Étapes :**
  1. Ouvrir l'entretien guidé
  2. Cliquer 'Démarrer l'entretien' sur la carte d'un accompagné
- **Résultat attendu :** POST /entretien/sessions appelé ; la vue passe à la phase 1/6 ; les phases, notes et questions existantes sont chargées via GET /entretien/sessions/:id.
- **Traçabilité :** entretien | POST /sessions + GET /sessions/:id | page Entretien.tsx
- **Automatisation :** ⏳ à automatiser

### TC-ENTR-078 — UI Entretien — navigation entre phases sauvegarde les notes

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test du contrat (bout-en-bout) |

- **Préconditions :** Session démarrée.
- **Données :** Saisie de notes en phase 1 puis passage à la phase 2.
- **Étapes :**
  1. Saisir un texte dans 'Notes générales de la phase'
  2. Cliquer 'Suivant →'
  3. Revenir à la phase précédente
- **Résultat attendu :** Au changement de phase, POST /reponses sauvegarde les notes ; en revenant, le texte saisi est toujours présent (relu depuis la session).
- **Traçabilité :** entretien | POST /sessions/:id/reponses | page Entretien.tsx (goTo/saveCurrent)
- **Automatisation :** ⏳ à automatiser

### TC-ENTR-079 — UI Entretien — ajouter, modifier, supprimer une question posée

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test du contrat (CRUD bout-en-bout) |

- **Préconditions :** Session démarrée.
- **Données :** Question 'Comment t'es-tu senti ?' + réponse.
- **Étapes :**
  1. Saisir une question et cliquer '＋ Ajouter'
  2. Saisir une réponse dans la zone de la question
  3. Cliquer ✎ pour modifier le texte, valider
  4. Cliquer × pour supprimer
- **Résultat attendu :** Ajout → POST /questions (201) ; réponse → PATCH {reponse} ; édition texte → PATCH {texte} (réponse conservée) ; suppression → DELETE puis la question disparaît.
- **Traçabilité :** entretien | POST/PATCH/DELETE /sessions/:id/questions | page Entretien.tsx
- **Automatisation :** ⏳ à automatiser

### TC-ENTR-080 — UI Entretien — suggestions IA affichées et ajoutables

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | test du contrat (IA, ne pas figer le texte) |

- **Préconditions :** Session démarrée ; sans clé IA (repli).
- **Données :** Clic sur '✨ Suggestions de l'IA'.
- **Étapes :**
  1. Saisir des notes
  2. Cliquer '✨ Suggestions de l'IA'
  3. Cliquer une question suggérée pour l'ajouter
- **Résultat attendu :** POST /entretien/suggestions renvoie reformulation/questions/a_surveiller ; les questions s'affichent (effet machine à écrire) ; cliquer '＋' ajoute la question (POST /questions). En repli : questions = banque de la phase.
- **Traçabilité :** entretien | POST /suggestions | page Entretien.tsx (askIA)
- **Automatisation :** ⏳ à automatiser

### TC-ENTR-081 — UI Entretien — clôture et ouverture du compte rendu

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | test du contrat (bout-en-bout) |

- **Préconditions :** Session démarrée avec des notes.
- **Données :** Clic '✓ Clôturer & générer le CR'.
- **Étapes :**
  1. Cliquer 'Clôturer & générer le CR'
  2. Observer l'écran de clôture
  3. Cliquer 'Ouvrir le compte rendu'
- **Résultat attendu :** POST /sessions/:id/cloturer appelé ; écran 'Entretien clôturé ✅' ; le modal de compte rendu s'ouvre pour la session clôturée.
- **Traçabilité :** entretien | POST /sessions/:id/cloturer | page Entretien.tsx (terminer)
- **Automatisation :** ⏳ à automatiser

### TC-ENTR-082 — UI Entretien — 'Reprendre plus tard' conserve la session en_cours

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | non-regression | moyenne | test du contrat (reprise de session) |

- **Préconditions :** Session démarrée avec notes en phase 2.
- **Données :** Clic '💾 Reprendre plus tard' puis réouverture.
- **Étapes :**
  1. Saisir des notes
  2. Cliquer 'Reprendre plus tard' (retour au dossier)
  3. Rouvrir l'entretien pour le même accompagné
- **Résultat attendu :** POST /sessions renvoie la MÊME session (en_cours) ; les notes et la phase atteinte sont restaurées (pas de nouvelle session, pas de perte de saisie).
- **Traçabilité :** entretien | POST /sessions (reprise) + POST /reponses | page Entretien.tsx (pauseEtQuitter)
- **Automatisation :** ⏳ à automatiser

### TC-ENTR-083 — UI Entretien — accès interdit à l'accompagné (garde de route)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | acces | moyenne | test basé sur les rôles |

- **Préconditions :** Connecté en accompagné.
- **Données :** Tentative d'accès à /entretien et appels API associés.
- **Étapes :**
  1. Se connecter (accompagné)
  2. Tenter d'ouvrir /entretien ou de charger /entretien/dossiers
- **Résultat attendu :** Les appels GET /entretien/dossiers et /entretien/dashboard renvoient 403 ; l'UI ne présente pas l'entretien guidé à l'accompagné (rôle restreint).
- **Traçabilité :** entretien | GET /dossiers, /dashboard | gardes de rôle
- **Automatisation :** ⏳ à automatiser

### TC-ENTR-084 — Non-régression — entretien accessible sans plan (aucun requireFeature)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | non-regression | moyenne | test du contrat (gating de fonctionnalité) |

- **Préconditions :** Accompagnateur SANS plan (accès à tout) ET accompagnateur avec plan Découverte (socle incluant 'entretien').
- **Données :** Suite d'appels GET /dossiers, /dashboard, POST /sessions, /suggestions.
- **Étapes :**
  1. Avec un accompagnateur sans plan : appeler les endpoints entretien
  2. Répéter avec un plan Découverte
- **Résultat attendu :** Tous renvoient 2xx : aucune route entretien n'applique requireFeature, donc l'absence de la feature 'entretien' dans un plan ne bloquerait PAS (à documenter comme écart connu). Les seules gardes sont requireAuth + requireRole.
- **Traçabilité :** entretien | toutes routes (absence de requireFeature) | features.ts requireFeature
- **Automatisation :** ✅ api/entr.test.ts

## Domaine CR — 75 cas

**Endpoints couverts :**

- `POST /api/cr/generer` · feature: `comptes_rendus` · rôle: accompagnateur — Génère/régénère le CR d'une session via l'IA (repli déterministe sans clé). Crée une nouvelle version (publie=0, source=ia). À la 1re génération seulement, alimente le plan d'action du dossier.
- `GET /api/cr/session/:sid` · feature: `comptes_rendus` · rôle: accompagnateur|accompagne — État du CR : accompagnateur reçoit la version courante + l'historique ; accompagné reçoit uniquement la version publiée (ou null).
- `GET /api/cr/version/:id` · feature: `comptes_rendus` · rôle: accompagnateur — Lit une version précise (historique) du CR ; réservé à l'accompagnateur propriétaire du dossier.
- `PATCH /api/cr/version/:id` · feature: `comptes_rendus` · rôle: accompagnateur — Enregistre le contenu édité de la version COURANTE uniquement (source passe à 'edition'). 400 si la version visée n'est pas la dernière.
- `POST /api/cr/version/:id/publier` · feature: `comptes_rendus` · rôle: accompagnateur — Publie une version (dépublie les autres de la session, transaction) et notifie l'accompagné.
- `GET /api/cr/mine` · feature: `comptes_rendus` · rôle: accompagne — Liste les CR publiés de l'accompagné (avec date d'entretien et titre de dossier), triés par publie_le DESC.
- `GET /api/cr/session/:sid/messages` · feature: `comptes_rendus` · rôle: accompagnateur|accompagne — Liste les messages de discussion du CR de la session ; l'accompagné n'y accède que si un CR est publié (canDiscuss). Ajoute is_me par message.
- `POST /api/cr/session/:sid/messages` · feature: `comptes_rendus` · rôle: accompagnateur|accompagne — Poste un message de discussion (texte non vide après trim) et notifie l'autre partie. Accompagné gated par CR publié.
- `GET /api/cr/session/:sid/notes` · feature: `comptes_rendus` · rôle: accompagnateur — Lit les notes privées de l'accompagnateur pour la session (jamais publiées). Retourne chaîne vide si absente.
- `PUT /api/cr/session/:sid/notes` · feature: `comptes_rendus` · rôle: accompagnateur — Crée/met à jour (upsert ON CONFLICT session_id) les notes privées de l'accompagnateur pour la session.

### TC-CR-001 — Générer le CR — nominal (201 + forme de réponse)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat |

- **Préconditions :** Connecté en accompagnateur (Mohamed) propriétaire d'un dossier avec une session ayant des réponses par phase. Aucun CR encore généré pour cette session.
- **Données :** POST /api/cr/generer body {sessionId: <session du dossier de Mohamed>}
- **Étapes :**
  1. S'authentifier en accompagnateur
  2. Envoyer POST /api/cr/generer avec sessionId valide
  3. Observer le statut et le corps
- **Résultat attendu :** 201. Corps JSON {id:number, version:1, contenu_html:string non vide, source:'ia', publie:0}. Une ligne comptes_rendus créée avec version=1.
- **Traçabilité :** comptes_rendus | POST /api/cr/generer
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-002 — Régénérer le CR — incrémente la version, n'écrase pas l'historique

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | partition d'équivalence |

- **Préconditions :** Une session possède déjà un CR version 1 (prev existe).
- **Données :** POST /api/cr/generer body {sessionId}
- **Étapes :**
  1. Générer une 1re fois (v1)
  2. Renvoyer POST /api/cr/generer sur la même session
  3. Vérifier la version retournée et l'historique
- **Résultat attendu :** 201. version = (prev.version)+1 = 2. La v1 reste présente dans l'historique (ORDER BY version DESC). Nouvelle version source='ia', publie=0.
- **Traçabilité :** comptes_rendus | POST /api/cr/generer (latestVersion)
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-003 — Génération — alimente le plan d'action uniquement à la 1re fois

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | table de décision |

- **Préconditions :** Session avec réponse en phase 4 (plan d'action) non vide. Pas de CR existant (prev absent).
- **Données :** 1er appel POST /api/cr/generer puis 2e appel sur la même session
- **Étapes :**
  1. Compter les actions du dossier avant
  2. 1er POST /generer (prev absent → insertion d'actions)
  3. Compter les actions après
  4. 2e POST /generer (prev présent → AUCUNE insertion d'action)
  5. Recompter les actions
- **Résultat attendu :** Après le 1er appel, les étapes du plan d'action (etape != '—') sont insérées dans actions (ordre = MAX(ordre)+1+i). Après le 2e appel, le nombre d'actions est inchangé (pas de doublon).
- **Traçabilité :** comptes_rendus,plan_action | POST /api/cr/generer (bloc if(!prev))
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-004 — Génération — repli déterministe quand l'IA est indisponible (contrat)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | test du contrat |

- **Préconditions :** Stack sans ANTHROPIC_API_KEY (ou API Claude renvoyant une erreur). Session avec notes par phase.
- **Données :** POST /api/cr/generer body {sessionId}
- **Étapes :**
  1. S'assurer que la clé IA est absente côté stack de test
  2. POST /api/cr/generer
  3. Inspecter le HTML retourné
- **Résultat attendu :** 201 quand même. contenu_html non vide contenant les 6 sections (Contexte, Points clés, Émergence, Plan d'action, Propositions, Vigilance). Le contenu provient du repli (notes par phase). Pas d'échec serveur.
- **Traçabilité :** comptes_rendus | POST /api/cr/generer → genererContenu (repli template)
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-005 — Générer le CR — 401 non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles |

- **Préconditions :** Aucun cookie d'authentification.
- **Données :** POST /api/cr/generer body {sessionId:1}
- **Étapes :**
  1. Envoyer la requête sans cookie boussole_token
  2. Observer le statut
- **Résultat attendu :** 401 {error:'Non authentifié'}. Aucune version créée.
- **Traçabilité :** comptes_rendus | POST /api/cr/generer (requireAuth)
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-006 — Générer le CR — 403 mauvais rôle (accompagné)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles |

- **Préconditions :** Connecté en accompagné (Amine).
- **Données :** POST /api/cr/generer body {sessionId:<une session>}
- **Étapes :**
  1. S'authentifier en accompagné
  2. POST /api/cr/generer
  3. Observer le statut
- **Résultat attendu :** 403 {error:'Accès refusé'} (requireRole('accompagnateur')).
- **Traçabilité :** comptes_rendus | POST /api/cr/generer (requireRole)
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-007 — Générer le CR — 403 mauvais rôle (admin)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles |

- **Préconditions :** Connecté en admin (mohamed@elafrit.com).
- **Données :** POST /api/cr/generer body {sessionId:1}
- **Étapes :**
  1. S'authentifier en admin
  2. POST /api/cr/generer
- **Résultat attendu :** 403 {error:'Accès refusé'} : l'admin n'a pas le rôle accompagnateur.
- **Traçabilité :** comptes_rendus | POST /api/cr/generer (requireRole)
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-008 — Générer le CR — 404 session d'un autre accompagnateur

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles |

- **Préconditions :** Connecté en accompagnateur Camille ; cibler une session appartenant au dossier de Mohamed.
- **Données :** POST /api/cr/generer body {sessionId:<session de Mohamed>}
- **Étapes :**
  1. S'authentifier en accompagnateur Camille
  2. POST /api/cr/generer avec une sessionId non possédée
  3. Observer le statut
- **Résultat attendu :** 404 {error:'Session introuvable'} (s.accompagnateur_id !== me.id).
- **Traçabilité :** comptes_rendus | POST /api/cr/generer (contrôle propriété)
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-009 — Générer le CR — 404 sessionId inexistant / invalide

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | valeurs limites |

- **Préconditions :** Connecté en accompagnateur.
- **Données :** sessionId = 999999 ; puis sessionId absent (body vide) → Number(undefined)=NaN ; puis sessionId='abc'
- **Étapes :**
  1. POST /generer avec sessionId=999999
  2. POST /generer body {} (sessionId manquant)
  3. POST /generer body {sessionId:'abc'}
- **Résultat attendu :** 404 {error:'Session introuvable'} dans les trois cas (sessionInfo introuvable / NaN).
- **Traçabilité :** comptes_rendus | POST /api/cr/generer (sessionInfo)
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-010 — État du CR (accompagnateur) — courant + historique

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat |

- **Préconditions :** Accompagnateur propriétaire ; session avec au moins 2 versions de CR.
- **Données :** GET /api/cr/session/:sid
- **Étapes :**
  1. S'authentifier en accompagnateur
  2. GET /api/cr/session/<sid>
  3. Inspecter le corps
- **Résultat attendu :** 200 {role:'accompagnateur', cr:{id,version,contenu_html,source,genere_le,publie}, versions:[...] triés par version DESC, chaque item {id,version,source,genere_le,publie}}.
- **Traçabilité :** comptes_rendus | GET /api/cr/session/:sid
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-011 — État du CR (accompagné) — version publiée uniquement

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | table de décision |

- **Préconditions :** Accompagné Amine ; session de son dossier avec un CR publié.
- **Données :** GET /api/cr/session/:sid
- **Étapes :**
  1. S'authentifier en accompagné
  2. GET /api/cr/session/<sid de son dossier>
  3. Inspecter le corps
- **Résultat attendu :** 200 {role:'accompagne', cr:{id,version,contenu_html,genere_le,publie:1}, versions:[]}. L'historique n'est jamais exposé à l'accompagné (versions vide).
- **Traçabilité :** comptes_rendus | GET /api/cr/session/:sid (branche accompagne)
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-012 — État du CR (accompagné) — aucune version publiée → cr null (visibilité avant publication)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | table de décision |

- **Préconditions :** Accompagné ; session de son dossier avec un CR existant mais NON publié (brouillon).
- **Données :** GET /api/cr/session/:sid
- **Étapes :**
  1. L'accompagnateur a généré un CR sans le publier
  2. S'authentifier en accompagné
  3. GET /api/cr/session/<sid>
- **Résultat attendu :** 200 {role:'accompagne', cr:null, versions:[]}. L'accompagné NE voit PAS le brouillon avant publication.
- **Traçabilité :** comptes_rendus | GET /api/cr/session/:sid (publishedVersion absente)
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-013 — État du CR — 401 non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles |

- **Préconditions :** Aucun cookie.
- **Données :** GET /api/cr/session/1
- **Étapes :**
  1. GET sans cookie
- **Résultat attendu :** 401 {error:'Non authentifié'}.
- **Traçabilité :** comptes_rendus | GET /api/cr/session/:sid (requireAuth)
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-014 — État du CR — 404 session d'un autre utilisateur (non rattaché)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles |

- **Préconditions :** Accompagné Léa connecté ; cibler une session du dossier d'Amine (autre accompagné).
- **Données :** GET /api/cr/session/<sid du dossier d'Amine>
- **Étapes :**
  1. S'authentifier en accompagné Léa
  2. GET /api/cr/session/<sid non rattaché>
- **Résultat attendu :** 404 {error:'Session introuvable'} (canAccess false).
- **Traçabilité :** comptes_rendus | GET /api/cr/session/:sid (canAccess)
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-015 — État du CR — 404 accompagnateur non propriétaire

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles |

- **Préconditions :** Accompagnateur Camille ; session d'un dossier de Mohamed.
- **Données :** GET /api/cr/session/<sid de Mohamed>
- **Étapes :**
  1. S'authentifier en accompagnateur Camille
  2. GET /api/cr/session/<sid non possédé>
- **Résultat attendu :** 404 {error:'Session introuvable'} (canAccess false car accompagnateur_id != me.id).
- **Traçabilité :** comptes_rendus | GET /api/cr/session/:sid (canAccess)
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-016 — État du CR — 404 sid inexistant

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | basse | valeurs limites |

- **Préconditions :** Connecté (n'importe quel rôle valide).
- **Données :** GET /api/cr/session/999999 ; GET /api/cr/session/abc
- **Étapes :**
  1. GET avec sid inexistant
  2. GET avec sid non numérique
- **Résultat attendu :** 404 {error:'Session introuvable'} (sessionInfo undefined / NaN).
- **Traçabilité :** comptes_rendus | GET /api/cr/session/:sid
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-017 — Lire une version d'historique — nominal

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | test du contrat |

- **Préconditions :** Accompagnateur propriétaire ; il existe une version d'historique (id connu).
- **Données :** GET /api/cr/version/:id
- **Étapes :**
  1. S'authentifier en accompagnateur
  2. GET /api/cr/version/<id existant du dossier>
- **Résultat attendu :** 200 {cr:{id, session_id, version, contenu_html, source, genere_le, publie, accompagnateur_id}}.
- **Traçabilité :** comptes_rendus | GET /api/cr/version/:id
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-018 — Lire une version — 401 non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles |

- **Préconditions :** Aucun cookie.
- **Données :** GET /api/cr/version/1
- **Étapes :**
  1. GET sans cookie
- **Résultat attendu :** 401 {error:'Non authentifié'}.
- **Traçabilité :** comptes_rendus | GET /api/cr/version/:id (requireAuth)
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-019 — Lire une version — 403 rôle accompagné

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles |

- **Préconditions :** Accompagné connecté (même propriétaire d'un CR publié).
- **Données :** GET /api/cr/version/<id d'une version publiée de son dossier>
- **Étapes :**
  1. S'authentifier en accompagné
  2. GET /api/cr/version/<id>
- **Résultat attendu :** 403 {error:'Accès refusé'} : l'endpoint version est réservé à requireRole('accompagnateur'). L'accompagné ne peut pas naviguer l'historique par id.
- **Traçabilité :** comptes_rendus | GET /api/cr/version/:id (requireRole)
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-020 — Lire une version — 404 version d'un autre accompagnateur

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles |

- **Préconditions :** Accompagnateur Camille ; id d'une version appartenant au dossier de Mohamed.
- **Données :** GET /api/cr/version/<id de Mohamed>
- **Étapes :**
  1. S'authentifier en accompagnateur Camille
  2. GET /api/cr/version/<id non possédé>
- **Résultat attendu :** 404 {error:'Compte rendu introuvable'} (cr.accompagnateur_id != me.id).
- **Traçabilité :** comptes_rendus | GET /api/cr/version/:id (contrôle propriété)
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-021 — Lire une version — 404 id inexistant

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | basse | valeurs limites |

- **Préconditions :** Accompagnateur connecté.
- **Données :** GET /api/cr/version/999999 ; GET /api/cr/version/abc
- **Étapes :**
  1. GET id inexistant
  2. GET id non numérique
- **Résultat attendu :** 404 {error:'Compte rendu introuvable'}.
- **Traçabilité :** comptes_rendus | GET /api/cr/version/:id
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-022 — Éditer la version courante — nominal (source→edition)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat |

- **Préconditions :** Accompagnateur propriétaire ; CR courant (dernière version) existant et identifié.
- **Données :** PATCH /api/cr/version/:id body {contenu_html:'<h2>Modifié</h2><p>texte</p>'}
- **Étapes :**
  1. S'authentifier en accompagnateur
  2. PATCH la version courante avec un nouveau HTML
  3. GET /api/cr/session/:sid pour relecture
- **Résultat attendu :** 200 {ok:true}. Après relecture, contenu_html = nouveau HTML et source='edition'. La modification est immédiatement visible.
- **Traçabilité :** comptes_rendus | PATCH /api/cr/version/:id
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-023 — Éditer une version publiée courante — reste publiée, modif visible aussitôt

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | table de décision |

- **Préconditions :** Accompagnateur ; la version COURANTE est aussi la version publiée (publie=1).
- **Données :** PATCH /api/cr/version/:id body {contenu_html:'<p>correction post-publication</p>'}
- **Étapes :**
  1. Publier la version courante
  2. PATCH cette même version courante
  3. GET /api/cr/session/:sid côté accompagné
- **Résultat attendu :** 200 {ok:true}. Le statut publié n'est pas modifié (publie reste 1). L'accompagné voit aussitôt le contenu mis à jour.
- **Traçabilité :** comptes_rendus | PATCH /api/cr/version/:id (édition version courante publiée)
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-024 — Éditer une version d'historique (non courante) — 400 figée

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | haute | table de décision |

- **Préconditions :** Accompagnateur ; il existe au moins 2 versions ; cibler une version ANCIENNE (non latest).
- **Données :** PATCH /api/cr/version/<id version 1> alors que latest est version 2
- **Étapes :**
  1. Générer v1 puis régénérer v2
  2. PATCH /api/cr/version/<id de v1>
- **Résultat attendu :** 400 {error:'Seule la version courante est modifiable (les versions de l’historique sont figées).'}. Contenu de v1 inchangé.
- **Traçabilité :** comptes_rendus | PATCH /api/cr/version/:id (latest.id !== cr.id)
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-025 — Éditer — contenu_html manquant → enregistre chaîne vide

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | basse | valeurs limites |

- **Préconditions :** Accompagnateur ; CR courant.
- **Données :** PATCH /api/cr/version/:id body {} (pas de contenu_html)
- **Étapes :**
  1. PATCH sans champ contenu_html
  2. GET /api/cr/session/:sid
- **Résultat attendu :** 200 {ok:true}. String(undefined ?? '') = '' : contenu_html devient '' (pas d'erreur). À documenter comme comportement permissif (pas de validation Zod).
- **Traçabilité :** comptes_rendus | PATCH /api/cr/version/:id (String(req.body?.contenu_html ?? ''))
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-026 — Éditer — 401 non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles |

- **Préconditions :** Aucun cookie.
- **Données :** PATCH /api/cr/version/1 body {contenu_html:'x'}
- **Étapes :**
  1. PATCH sans cookie
- **Résultat attendu :** 401 {error:'Non authentifié'}.
- **Traçabilité :** comptes_rendus | PATCH /api/cr/version/:id (requireAuth)
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-027 — Éditer — 403 rôle accompagné

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles |

- **Préconditions :** Accompagné connecté.
- **Données :** PATCH /api/cr/version/<id d'un CR publié de son dossier> body {contenu_html:'piratage'}
- **Étapes :**
  1. S'authentifier en accompagné
  2. PATCH /api/cr/version/<id>
- **Résultat attendu :** 403 {error:'Accès refusé'}. L'accompagné ne peut jamais éditer un CR.
- **Traçabilité :** comptes_rendus | PATCH /api/cr/version/:id (requireRole)
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-028 — Éditer — 404 version d'un autre accompagnateur

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles |

- **Préconditions :** Accompagnateur Camille ; id d'une version du dossier de Mohamed.
- **Données :** PATCH /api/cr/version/<id de Mohamed> body {contenu_html:'x'}
- **Étapes :**
  1. S'authentifier en accompagnateur Camille
  2. PATCH /api/cr/version/<id non possédé>
- **Résultat attendu :** 404 {error:'Compte rendu introuvable'}.
- **Traçabilité :** comptes_rendus | PATCH /api/cr/version/:id (contrôle propriété)
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-029 — Éditer — 404 id inexistant

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | basse | valeurs limites |

- **Préconditions :** Accompagnateur connecté.
- **Données :** PATCH /api/cr/version/999999 body {contenu_html:'x'}
- **Étapes :**
  1. PATCH id inexistant
- **Résultat attendu :** 404 {error:'Compte rendu introuvable'}.
- **Traçabilité :** comptes_rendus | PATCH /api/cr/version/:id
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-030 — Publier une version — nominal (notif + dépublication des autres)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat |

- **Préconditions :** Accompagnateur propriétaire ; CR brouillon (publie=0) existant.
- **Données :** POST /api/cr/version/:id/publier
- **Étapes :**
  1. S'authentifier en accompagnateur
  2. POST /api/cr/version/<id>/publier
  3. Vérifier le statut publie via GET session
  4. Vérifier la notification de l'accompagné
- **Résultat attendu :** 200 {ok:true}. La version visée passe publie=1 avec publie_le renseigné ; toutes les autres versions de la session passent publie=0, publie_le=NULL. Une notification 'Un compte rendu a été publié dans votre espace.' est insérée pour l'accompagné.
- **Traçabilité :** comptes_rendus | POST /api/cr/version/:id/publier
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-031 — Publier une autre version — bascule l'unique publiée (exclusivité)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | table de décision |

- **Préconditions :** Session avec v1 publiée et v2 brouillon.
- **Données :** POST /api/cr/version/<id v2>/publier
- **Étapes :**
  1. Publier v1
  2. Publier v2
  3. GET /api/cr/session/:sid (accompagné)
- **Résultat attendu :** 200. Après publication de v2 : v2 publie=1, v1 publie=0. L'accompagné voit désormais v2 (publishedVersion = la plus haute version publiée).
- **Traçabilité :** comptes_rendus | POST /api/cr/version/:id/publier (transaction dépublie d'abord)
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-032 — Publier — 401 non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles |

- **Préconditions :** Aucun cookie.
- **Données :** POST /api/cr/version/1/publier
- **Étapes :**
  1. POST sans cookie
- **Résultat attendu :** 401 {error:'Non authentifié'}.
- **Traçabilité :** comptes_rendus | POST /api/cr/version/:id/publier (requireAuth)
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-033 — Publier — 403 rôle accompagné

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles |

- **Préconditions :** Accompagné connecté.
- **Données :** POST /api/cr/version/<id d'un CR de son dossier>/publier
- **Étapes :**
  1. S'authentifier en accompagné
  2. POST /publier
- **Résultat attendu :** 403 {error:'Accès refusé'}. Seul l'accompagnateur publie.
- **Traçabilité :** comptes_rendus | POST /api/cr/version/:id/publier (requireRole)
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-034 — Publier — 404 version d'un autre accompagnateur

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles |

- **Préconditions :** Accompagnateur Camille ; id du dossier de Mohamed.
- **Données :** POST /api/cr/version/<id de Mohamed>/publier
- **Étapes :**
  1. S'authentifier en accompagnateur Camille
  2. POST /publier sur id non possédé
- **Résultat attendu :** 404 {error:'Compte rendu introuvable'}. Aucune publication ni notification.
- **Traçabilité :** comptes_rendus | POST /api/cr/version/:id/publier (contrôle propriété)
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-035 — Publier — 404 id inexistant

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | basse | valeurs limites |

- **Préconditions :** Accompagnateur connecté.
- **Données :** POST /api/cr/version/999999/publier
- **Étapes :**
  1. POST /publier id inexistant
- **Résultat attendu :** 404 {error:'Compte rendu introuvable'}.
- **Traçabilité :** comptes_rendus | POST /api/cr/version/:id/publier
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-036 — Mes comptes rendus publiés — nominal (accompagné)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat |

- **Préconditions :** Accompagné Amine avec au moins un CR publié.
- **Données :** GET /api/cr/mine
- **Étapes :**
  1. S'authentifier en accompagné
  2. GET /api/cr/mine
  3. Inspecter le corps
- **Résultat attendu :** 200 {comptesRendus:[{id, session_id, genere_le, publie_le, entretien_date, dossier_titre}...]} triés par publie_le DESC. Seuls les CR avec publie=1 et appartenant à l'accompagné apparaissent.
- **Traçabilité :** comptes_rendus | GET /api/cr/mine
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-037 — Mes comptes rendus — exclut les brouillons non publiés

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | partition d'équivalence |

- **Préconditions :** Accompagné avec un CR brouillon (non publié) ET un CR publié.
- **Données :** GET /api/cr/mine
- **Étapes :**
  1. GET /api/cr/mine
- **Résultat attendu :** 200. La liste ne contient QUE le CR publié ; le brouillon est absent (WHERE cr.publie=1).
- **Traçabilité :** comptes_rendus | GET /api/cr/mine (filtre publie=1)
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-038 — Mes comptes rendus — liste vide si aucun CR publié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | basse | valeurs limites |

- **Préconditions :** Accompagné (ex. Karim) sans aucun CR publié.
- **Données :** GET /api/cr/mine
- **Étapes :**
  1. GET /api/cr/mine
- **Résultat attendu :** 200 {comptesRendus:[]}.
- **Traçabilité :** comptes_rendus | GET /api/cr/mine
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-039 — Mes comptes rendus — 401 non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles |

- **Préconditions :** Aucun cookie.
- **Données :** GET /api/cr/mine
- **Étapes :**
  1. GET sans cookie
- **Résultat attendu :** 401 {error:'Non authentifié'}.
- **Traçabilité :** comptes_rendus | GET /api/cr/mine (requireAuth)
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-040 — Mes comptes rendus — 403 rôle accompagnateur

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles |

- **Préconditions :** Accompagnateur connecté.
- **Données :** GET /api/cr/mine
- **Étapes :**
  1. S'authentifier en accompagnateur
  2. GET /api/cr/mine
- **Résultat attendu :** 403 {error:'Accès refusé'} (requireRole('accompagne')).
- **Traçabilité :** comptes_rendus | GET /api/cr/mine (requireRole)
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-041 — Lire les messages de discussion — nominal accompagnateur (is_me)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat |

- **Préconditions :** Accompagnateur propriétaire ; session avec quelques messages.
- **Données :** GET /api/cr/session/:sid/messages
- **Étapes :**
  1. S'authentifier en accompagnateur
  2. GET /api/cr/session/<sid>/messages
- **Résultat attendu :** 200 {messages:[{id, auteur_id, texte, cree_le, auteur_prenom, auteur_role, is_me}...]} triés par cree_le ASC, id ASC. is_me=true pour les messages de l'accompagnateur courant.
- **Traçabilité :** comptes_rendus | GET /api/cr/session/:sid/messages
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-042 — Lire les messages — accompagné autorisé seulement si CR publié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | table de décision |

- **Préconditions :** Accompagné ; session de son dossier AVEC un CR publié.
- **Données :** GET /api/cr/session/:sid/messages
- **Étapes :**
  1. L'accompagnateur publie un CR
  2. S'authentifier en accompagné
  3. GET /api/cr/session/<sid>/messages
- **Résultat attendu :** 200 {messages:[...]}. is_me=true pour les messages de l'accompagné.
- **Traçabilité :** comptes_rendus | GET /api/cr/session/:sid/messages (canDiscuss)
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-043 — Lire les messages — accompagné bloqué tant qu'aucun CR publié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | table de décision |

- **Préconditions :** Accompagné ; session de son dossier SANS CR publié (brouillon ou rien).
- **Données :** GET /api/cr/session/:sid/messages
- **Étapes :**
  1. S'authentifier en accompagné
  2. GET /api/cr/session/<sid>/messages
- **Résultat attendu :** 404 {error:'Discussion indisponible'} (canDiscuss false : publishedVersion absente).
- **Traçabilité :** comptes_rendus | GET /api/cr/session/:sid/messages (canDiscuss accompagne)
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-044 — Lire les messages — 401 non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles |

- **Préconditions :** Aucun cookie.
- **Données :** GET /api/cr/session/1/messages
- **Étapes :**
  1. GET sans cookie
- **Résultat attendu :** 401 {error:'Non authentifié'}.
- **Traçabilité :** comptes_rendus | GET /api/cr/session/:sid/messages (requireAuth)
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-045 — Lire les messages — 404 utilisateur non rattaché à la session

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles |

- **Préconditions :** Accompagnateur Camille ou accompagné Léa ; session non rattachée.
- **Données :** GET /api/cr/session/<sid d'un autre dossier>/messages
- **Étapes :**
  1. S'authentifier en utilisateur non rattaché
  2. GET /messages
- **Résultat attendu :** 404 {error:'Discussion indisponible'} (canDiscuss → canAccess false).
- **Traçabilité :** comptes_rendus | GET /api/cr/session/:sid/messages (canAccess)
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-046 — Poster un message — nominal accompagnateur (201 + notif accompagné)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat |

- **Préconditions :** Accompagnateur propriétaire de la session.
- **Données :** POST /api/cr/session/:sid/messages body {texte:'Bonjour, voici mon retour.'}
- **Étapes :**
  1. S'authentifier en accompagnateur
  2. POST /messages avec texte valide
  3. GET /messages pour relecture
- **Résultat attendu :** 201 {id:number}. Le message apparaît à la relecture. Une notification 'Nouveau message sur un compte rendu.' est insérée pour l'accompagné (autre partie).
- **Traçabilité :** comptes_rendus | POST /api/cr/session/:sid/messages
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-047 — Poster un message — nominal accompagné (CR publié) + notif accompagnateur

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat |

- **Préconditions :** Accompagné ; session de son dossier avec CR publié.
- **Données :** POST /api/cr/session/:sid/messages body {texte:'Merci, j'ai une question.'}
- **Étapes :**
  1. S'authentifier en accompagné
  2. POST /messages
  3. Relire la discussion
- **Résultat attendu :** 201 {id:number}. La notification est destinée à l'accompagnateur (autre = accompagnateur_id).
- **Traçabilité :** comptes_rendus | POST /api/cr/session/:sid/messages (notif autre partie)
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-048 — Poster un message — 400 texte vide / espaces uniquement

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | haute | valeurs limites |

- **Préconditions :** Accompagnateur ou accompagné autorisé.
- **Données :** POST /messages body {texte:'   '} ; puis body {} (texte absent)
- **Étapes :**
  1. POST avec texte=espaces
  2. POST sans champ texte
- **Résultat attendu :** 400 {error:'Message vide'} dans les deux cas (String(...).trim() vide). Aucun message inséré.
- **Traçabilité :** comptes_rendus | POST /api/cr/session/:sid/messages (validation trim)
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-049 — Poster un message — accompagné bloqué si CR non publié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | table de décision |

- **Préconditions :** Accompagné ; session de son dossier SANS CR publié.
- **Données :** POST /messages body {texte:'test'}
- **Étapes :**
  1. S'authentifier en accompagné
  2. POST /messages
- **Résultat attendu :** 404 {error:'Discussion indisponible'} (canDiscuss false). Vérifie que la validation de propriété précède celle du texte.
- **Traçabilité :** comptes_rendus | POST /api/cr/session/:sid/messages (canDiscuss)
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-050 — Poster un message — 401 non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles |

- **Préconditions :** Aucun cookie.
- **Données :** POST /api/cr/session/1/messages body {texte:'x'}
- **Étapes :**
  1. POST sans cookie
- **Résultat attendu :** 401 {error:'Non authentifié'}.
- **Traçabilité :** comptes_rendus | POST /api/cr/session/:sid/messages (requireAuth)
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-051 — Poster un message — 404 session non rattachée

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles |

- **Préconditions :** Utilisateur authentifié non rattaché à la session ciblée.
- **Données :** POST /api/cr/session/<sid d'un autre dossier>/messages body {texte:'x'}
- **Étapes :**
  1. S'authentifier en accompagnateur Camille (non propriétaire)
  2. POST /messages
- **Résultat attendu :** 404 {error:'Discussion indisponible'} (canAccess false).
- **Traçabilité :** comptes_rendus | POST /api/cr/session/:sid/messages (canAccess)
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-052 — Lire les notes privées — nominal (vide si absente)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | test du contrat |

- **Préconditions :** Accompagnateur propriétaire ; aucune note encore saisie pour la session.
- **Données :** GET /api/cr/session/:sid/notes
- **Étapes :**
  1. S'authentifier en accompagnateur
  2. GET /api/cr/session/<sid>/notes
- **Résultat attendu :** 200 {contenu_html:'', maj_le:null} si aucune note ; sinon {contenu_html:<html>, maj_le:<date>}.
- **Traçabilité :** comptes_rendus | GET /api/cr/session/:sid/notes
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-053 — Notes privées — jamais visibles par l'accompagné (403)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles |

- **Préconditions :** Accompagné ; session de son dossier (même avec CR publié).
- **Données :** GET /api/cr/session/:sid/notes ; PUT /api/cr/session/:sid/notes body {contenu_html:'x'}
- **Étapes :**
  1. S'authentifier en accompagné
  2. GET /notes
  3. PUT /notes
- **Résultat attendu :** 403 {error:'Accès refusé'} sur GET et PUT (requireRole('accompagnateur')). Les notes privées restent confidentielles.
- **Traçabilité :** comptes_rendus | GET+PUT /api/cr/session/:sid/notes (requireRole)
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-054 — Lire les notes privées — 404 accompagnateur non propriétaire

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles |

- **Préconditions :** Accompagnateur Camille ; session du dossier de Mohamed.
- **Données :** GET /api/cr/session/<sid de Mohamed>/notes
- **Étapes :**
  1. S'authentifier en accompagnateur Camille
  2. GET /notes sur sid non possédé
- **Résultat attendu :** 404 {error:'Session introuvable'} (s.accompagnateur_id != me.id).
- **Traçabilité :** comptes_rendus | GET /api/cr/session/:sid/notes (contrôle propriété)
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-055 — Lire les notes privées — 401 non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | basse | test basé sur les rôles |

- **Préconditions :** Aucun cookie.
- **Données :** GET /api/cr/session/1/notes
- **Étapes :**
  1. GET sans cookie
- **Résultat attendu :** 401 {error:'Non authentifié'}.
- **Traçabilité :** comptes_rendus | GET /api/cr/session/:sid/notes (requireAuth)
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-056 — Écrire les notes privées — création puis relecture

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat |

- **Préconditions :** Accompagnateur propriétaire ; aucune note existante.
- **Données :** PUT /api/cr/session/:sid/notes body {contenu_html:'<p>Penser à explorer X</p>'}
- **Étapes :**
  1. S'authentifier en accompagnateur
  2. PUT /notes avec contenu
  3. GET /notes pour relecture
- **Résultat attendu :** 200 {ok:true}. À la relecture, contenu_html correspond et maj_le est renseigné (datetime now).
- **Traçabilité :** comptes_rendus | PUT /api/cr/session/:sid/notes (INSERT)
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-057 — Écrire les notes privées — mise à jour (upsert ON CONFLICT)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | table de décision |

- **Préconditions :** Accompagnateur ; une note existe déjà pour la session.
- **Données :** PUT /api/cr/session/:sid/notes body {contenu_html:'<p>Nouvelle note remplaçante</p>'}
- **Étapes :**
  1. PUT une 1re fois
  2. PUT une 2e fois avec un autre contenu
  3. GET /notes
- **Résultat attendu :** 200 {ok:true}. Le contenu est remplacé (pas de doublon : une seule ligne par session_id), maj_le actualisé (ON CONFLICT DO UPDATE).
- **Traçabilité :** comptes_rendus | PUT /api/cr/session/:sid/notes (upsert)
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-058 — Écrire les notes privées — contenu vide accepté

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | basse | valeurs limites |

- **Préconditions :** Accompagnateur propriétaire.
- **Données :** PUT /api/cr/session/:sid/notes body {} (contenu_html absent)
- **Étapes :**
  1. PUT sans contenu_html
  2. GET /notes
- **Résultat attendu :** 200 {ok:true}. contenu_html enregistré = '' (String(undefined ?? '')). Pas de validation Zod, comportement permissif documenté.
- **Traçabilité :** comptes_rendus | PUT /api/cr/session/:sid/notes (String(req.body?.contenu_html ?? ''))
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-059 — Écrire les notes privées — 404 accompagnateur non propriétaire

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles |

- **Préconditions :** Accompagnateur Camille ; session du dossier de Mohamed.
- **Données :** PUT /api/cr/session/<sid de Mohamed>/notes body {contenu_html:'x'}
- **Étapes :**
  1. S'authentifier en accompagnateur Camille
  2. PUT /notes sur sid non possédé
- **Résultat attendu :** 404 {error:'Session introuvable'}. Aucune note écrite.
- **Traçabilité :** comptes_rendus | PUT /api/cr/session/:sid/notes (contrôle propriété)
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-060 — Notes privées — non incluses dans le CR publié / non exposées à l'accompagné

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | non-regression | haute | test du contrat |

- **Préconditions :** Accompagnateur a saisi des notes privées ET publié un CR sur la même session.
- **Données :** GET /api/cr/session/:sid (accompagné) ; GET /api/cr/mine (accompagné)
- **Étapes :**
  1. Saisir des notes privées
  2. Publier le CR
  3. Côté accompagné : GET /api/cr/session/:sid et /api/cr/mine
- **Résultat attendu :** Le contenu des notes privées n'apparaît dans aucune réponse côté accompagné. Les notes sont une table distincte (cr_notes_privees), jamais jointe aux endpoints accompagné.
- **Traçabilité :** comptes_rendus | cr_notes_privees vs GET /api/cr/session/:sid + /api/cr/mine
- **Automatisation :** ✅ api/cr.test.ts

### TC-CR-061 — Repli déterministe genererContenu — structure des 6 champs sans clé IA

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | haute | test du contrat |

- **Préconditions :** ANTHROPIC_API_KEY non définie (KEY falsy). Appel direct de genererContenu(notesByPhase).
- **Données :** notesByPhase = {0:'Contexte intro',1:'Demande',2:'Point clé',3:'Émergence',4:'Étape plan',5:'Proposition'}
- **Étapes :**
  1. Appeler genererContenu(notes)
  2. Inspecter l'objet CRContent retourné
- **Résultat attendu :** Retour synchrone du template : contexte='Contexte intro\nDemande', pointsCles='Point clé', emergence='Émergence', planAction=[{etape:'Étape plan',echeance:'',critere:''}], propositions='Proposition', vigilance='—'.
- **Traçabilité :** comptes_rendus | compteRendu.ts genererContenu (repli template)
- **Automatisation :** ✅ unit/compteRendu.test.ts

### TC-CR-062 — Repli genererContenu — valeurs par défaut '—' quand phases manquantes

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | moyenne | valeurs limites |

- **Préconditions :** KEY absente. notesByPhase = {} (aucune note).
- **Données :** notesByPhase = {}
- **Étapes :**
  1. Appeler genererContenu({})
  2. Inspecter le retour
- **Résultat attendu :** contexte='—', pointsCles='—', emergence='—', planAction=[] (phase 4 absente), propositions='—', vigilance='—'. Aucune exception.
- **Traçabilité :** comptes_rendus | compteRendu.ts genererContenu (defaults)
- **Automatisation :** ✅ unit/compteRendu.test.ts

### TC-CR-063 — contentToHtml — restitue 6 sections h2 et liste de plan d'action

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | haute | test du contrat |

- **Préconditions :** Fonction contentToHtml(content, meta) pure.
- **Données :** content avec planAction=[{etape:'Faire X',echeance:'2026-07-01',critere:'mesurable'}], meta={accompagne:'Amine',date:'2026-06-13'}
- **Étapes :**
  1. Appeler contentToHtml(content, meta)
  2. Inspecter le HTML
- **Résultat attendu :** HTML contenant les 6 <h2> numérotés (1. Contexte... 6. Points de vigilance...), une <ul><li> pour le plan d'action affichant l'étape + 'échéance : 2026-07-01' + '(mesurable)', et l'en-tête '<em>Accompagné : Amine · Date : 2026-06-13</em>'.
- **Traçabilité :** comptes_rendus | compteRendu.ts contentToHtml
- **Automatisation :** ✅ unit/compteRendu.test.ts

### TC-CR-064 — contentToHtml/esc — échappement des caractères HTML (anti-injection)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | validation | haute | partition d'équivalence |

- **Préconditions :** Fonction esc utilisée par contentToHtml/parasHtml.
- **Données :** content.contexte = '<script>alert(1)</script> & "guillemets"' ; meta.accompagne = '<b>x</b>'
- **Étapes :**
  1. Appeler contentToHtml avec du contenu contenant <, >, &
  2. Inspecter la sortie
- **Résultat attendu :** Les caractères &, <, > sont échappés en &amp; &lt; &gt;. Aucun tag <script> brut n'apparaît dans le HTML produit.
- **Traçabilité :** comptes_rendus | compteRendu.ts esc
- **Automatisation :** ✅ unit/compteRendu.test.ts

### TC-CR-065 — parasHtml — plan d'action vide et paragraphes multi-lignes

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | basse | valeurs limites |

- **Préconditions :** contentToHtml avec planAction=[] et un champ multi-lignes.
- **Données :** planAction=[] ; pointsCles='ligne1\n\nligne2\n  ' (lignes vides/espaces)
- **Étapes :**
  1. Appeler contentToHtml
  2. Inspecter section 4 et section 2
- **Résultat attendu :** Section 4 Plan d'action affiche '<p>—</p>' (liste vide). Les lignes vides sont filtrées : pointsCles produit <p>ligne1</p><p>ligne2</p>. Texte vide → '<p>—</p>'.
- **Traçabilité :** comptes_rendus | compteRendu.ts parasHtml
- **Automatisation :** ✅ unit/compteRendu.test.ts

### TC-CR-066 — genererContenu (IA) — parsing JSON robuste avec texte autour

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | moyenne | test du contrat |

- **Préconditions :** KEY définie ; fetch simulé renvoyant un bloc texte contenant du JSON entouré de prose (préambule + JSON + suffixe).
- **Données :** Réponse Claude simulée: 'Voici le compte rendu: {"contexte":"C","pointsCles":"P","emergence":"E","planAction":[],"propositions":"PR","vigilance":"V"} fin.'
- **Étapes :**
  1. Stubber fetch pour renvoyer res.ok + ce texte
  2. Appeler genererContenu(notes)
- **Résultat attendu :** Le JSON est extrait via indexOf('{')..lastIndexOf('}') et parsé. Champs renseignés depuis Claude ; les champs absents retombent sur le template (|| template.*).
- **Traçabilité :** comptes_rendus | compteRendu.ts genererContenu (extraction JSON)
- **Automatisation :** ✅ unit/compteRendu.test.ts

### TC-CR-067 — genererContenu (IA) — repli sur exception/réponse non-ok

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | non-regression | haute | table de décision |

- **Préconditions :** KEY définie ; fetch simulé renvoie res.ok=false OU lève une exception OU renvoie un JSON invalide.
- **Données :** Cas A: res.ok=false ; Cas B: fetch throw ; Cas C: texte sans accolade valide
- **Étapes :**
  1. Stubber chaque cas
  2. Appeler genererContenu(notes)
- **Résultat attendu :** Dans les trois cas, retour du template de repli (try/catch + if(!res.ok)). Aucune exception propagée ; le flux POST /generer reste en 201.
- **Traçabilité :** comptes_rendus | compteRendu.ts genererContenu (repli erreur)
- **Automatisation :** ✅ unit/compteRendu.test.ts

### TC-CR-068 — UI accompagnateur — générer puis voir le CR dans la modale

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test basé sur les rôles |

- **Préconditions :** Connecté en accompagnateur Mohamed sur http://localhost:8080 ; entretien sans CR.
- **Données :** Compte mohamed / elafrit.mohamed@gmail.com, mdp BoussoleDemo2026
- **Étapes :**
  1. Se connecter en accompagnateur
  2. Ouvrir la modale Compte rendu d'un entretien sans CR
  3. Cliquer '✨ Générer le compte rendu (IA)'
  4. Attendre la fin de génération
- **Résultat attendu :** La modale affiche le CR généré avec badge '• Brouillon', mention 'v1 · généré IA', et les 6 sections. Boutons Éditer / Régénérer / Publier visibles.
- **Traçabilité :** comptes_rendus | CompteRenduModal.tsx (generer)
- **Automatisation :** ⏳ à automatiser

### TC-CR-069 — UI accompagnateur — éditer et enregistrer la version courante

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test du contrat |

- **Préconditions :** Accompagnateur ; CR courant affiché dans la modale.
- **Données :** Modification de texte dans l'éditeur riche
- **Étapes :**
  1. Cliquer '✎ Éditer'
  2. Modifier le contenu dans RichTextEditor
  3. Cliquer '💾 Enregistrer'
- **Résultat attendu :** La modale repasse en lecture, le badge passe la source à 'édité', le contenu modifié est affiché. PATCH /cr/version/:id renvoie ok et le rechargement reflète la modification.
- **Traçabilité :** comptes_rendus | CompteRenduModal.tsx (startEdit/save)
- **Automatisation :** ⏳ à automatiser

### TC-CR-070 — UI accompagnateur — publier le CR et confirmation

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test du contrat |

- **Préconditions :** Accompagnateur ; CR brouillon affiché.
- **Données :** Action Publier
- **Étapes :**
  1. Cliquer '📣 Publier'
- **Résultat attendu :** Le badge passe à '✓ Publié', le bouton Publier disparaît, message 'Compte rendu publié — l'accompagné peut le consulter.' affiché.
- **Traçabilité :** comptes_rendus | CompteRenduModal.tsx (publier)
- **Automatisation :** ⏳ à automatiser

### TC-CR-071 — UI accompagnateur — navigation dans l'historique des versions (lecture seule)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | test du contrat |

- **Préconditions :** Accompagnateur ; session avec au moins 2 versions.
- **Données :** Sélecteur 'Historique'
- **Étapes :**
  1. Régénérer pour créer une 2e version
  2. Ouvrir la modale
  3. Sélectionner une version archivée dans le menu Historique
- **Résultat attendu :** La version archivée s'affiche avec la mention '(version archivée, lecture seule)'. Les boutons Éditer/Régénérer/Publier sont masqués en mode historique.
- **Traçabilité :** comptes_rendus | CompteRenduModal.tsx (voirVersion/onHistory)
- **Automatisation :** ⏳ à automatiser

### TC-CR-072 — UI accompagné — page Mes comptes rendus et consultation

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test basé sur les rôles |

- **Préconditions :** Connecté en accompagné Amine (afrit_mohamed@yahoo.fr) ; au moins un CR publié (jeu démo).
- **Données :** Compte Amine, mdp BoussoleDemo2026
- **Étapes :**
  1. Se connecter en accompagné
  2. Aller sur 'Mes comptes rendus'
  3. Cliquer 'Consulter' sur un CR
- **Résultat attendu :** La liste montre les CR publiés (date d'entretien + date de publication). La modale affiche le CR publié, sans bouton d'édition/publication (vue accompagné en lecture seule).
- **Traçabilité :** comptes_rendus | ComptesRendus.tsx + CompteRenduModal.tsx (role=accompagne)
- **Automatisation :** ⏳ à automatiser

### TC-CR-073 — UI accompagné — message 'pas encore disponible' avant publication

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | acces | haute | table de décision |

- **Préconditions :** Accompagné ; entretien dont le CR est en brouillon (non publié).
- **Données :** Vue accompagné de la modale d'un CR non publié
- **Étapes :**
  1. Côté accompagnateur, générer un CR sans publier
  2. Côté accompagné, ouvrir la modale pour cette session
- **Résultat attendu :** La modale affiche 'Le compte rendu n'est pas encore disponible.' (cr null) et n'expose ni le brouillon ni la discussion.
- **Traçabilité :** comptes_rendus | CompteRenduModal.tsx (!cr, role accompagne)
- **Automatisation :** ⏳ à automatiser

### TC-CR-074 — UI discussion — échange bidirectionnel après publication

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test du contrat |

- **Préconditions :** CR publié ; accompagnateur Mohamed et accompagné Amine.
- **Données :** Saisie de messages des deux côtés
- **Étapes :**
  1. Côté accompagnateur, envoyer un message dans la zone '💬 Échanges'
  2. Côté accompagné, ouvrir la modale et répondre
  3. Recharger des deux côtés
- **Résultat attendu :** Les messages apparaissent dans l'ordre chronologique, alignés (is_me) selon l'auteur. Chaque envoi crée une notification pour l'autre partie.
- **Traçabilité :** comptes_rendus | CompteRenduModal.tsx (envoyer/loadMessages)
- **Automatisation :** ⏳ à automatiser

### TC-CR-075 — UI discussion — masquée côté accompagnateur avant publication (avertissement)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | acces | moyenne | table de décision |

- **Préconditions :** Accompagnateur ; CR en brouillon.
- **Données :** Modale CR non publié
- **Étapes :**
  1. Ouvrir la modale d'un CR brouillon côté accompagnateur
- **Résultat attendu :** La section discussion affiche 'La discussion sera visible par l'accompagné une fois le compte rendu publié.' L'accompagnateur peut écrire mais sait que l'accompagné ne verra rien tant que non publié.
- **Traçabilité :** comptes_rendus | CompteRenduModal.tsx (!cr.publie && accompagnateur)
- **Automatisation :** ⏳ à automatiser

## Domaine ACTNOTIF — 74 cas

**Endpoints couverts :**

- `GET /api/actions/mine` · feature: `plan_action` · rôle: accompagne — Liste les actions du dossier le plus récent de l'accompagné connecté + l'id du dossier (pour ajout/réordonnancement).
- `GET /api/actions` · feature: `plan_action` · rôle: accompagnateur — Liste les actions d'un dossier (query dossierId) appartenant à l'accompagnateur connecté, triées par ordre puis id.
- `POST /api/actions` · feature: `plan_action` · rôle: accompagnateur|accompagne — Ajoute une action à un dossier accessible (accompagnateur OU accompagné du dossier). Calcule ordre = MAX(ordre)+1.
- `PATCH /api/actions/:id` · feature: `plan_action` · rôle: accompagnateur|accompagne — Modifie partiellement une action (libelle, statut, priorite, echeance, critere, details, rappel_le). Toute modif de rappel_le ré-arme rappel_envoye=0.
- `DELETE /api/actions/:id` · feature: `plan_action` · rôle: accompagnateur|accompagne — Supprime une action d'un dossier accessible à l'utilisateur.
- `POST /api/actions/reorder` · feature: `plan_action` · rôle: accompagnateur|accompagne — Réordonne les actions d'un dossier (glisser-déposer) ; transaction qui renumérote de façon contiguë sans collision.
- `GET /api/tags` · feature: `—` · rôle: accompagnateur — Liste distincte des tags utilisés sur les dossiers de l'accompagnateur connecté (pour le filtre).
- `POST /api/tags/dossier/:dossierId` · feature: `—` · rôle: accompagnateur — Ajoute un tag (nom trim+minuscule) à un dossier de l'accompagnateur ; crée le tag s'il n'existe pas ; liaison idempotente (INSERT OR IGNORE).
- `DELETE /api/tags/dossier/:dossierId/:tagId` · feature: `—` · rôle: accompagnateur — Retire un tag d'un dossier de l'accompagnateur (supprime la liaison dossier_tags).
- `GET /api/notifications` · feature: `—` · rôle: accompagnateur|accompagne|admin — Déclenche sweepDueReminders() puis renvoie les 30 dernières notifications de l'utilisateur + le compte de non lues (nonLues).
- `POST /api/notifications/lues` · feature: `—` · rôle: accompagnateur|accompagne|admin — Marque toutes les notifications de l'utilisateur comme lues (lu=1).

### TC-ACT-001 — GET /actions/mine — nominal : l'accompagné récupère ses actions et le dossierId

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Test du contrat ; test basé sur les rôles |

- **Préconditions :** Connecté en accompagné (afrit_mohamed@yahoo.fr) ayant au moins un dossier avec actions.
- **Données :** Cookie de session accompagné. GET /api/actions/mine
- **Étapes :**
  1. Se connecter en accompagné
  2. Appeler GET /api/actions/mine
- **Résultat attendu :** 200. Corps { actions: [...], dossierId: <number> }. Chaque action expose id, libelle, echeance, critere, details, priorite, statut, rappel_le, cree_le, ordre. Actions triées par ordre ASC puis id ASC.
- **Traçabilité :** plan_action — GET /api/actions/mine
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-002 — GET /actions/mine — accompagné sans dossier : liste vide et dossierId null

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | Partition d'équivalence (classe : utilisateur sans dossier) ; valeurs limites (0 dossier) |

- **Préconditions :** Compte accompagné sans aucun dossier (compte fraîchement créé).
- **Données :** Cookie accompagné sans dossier. GET /api/actions/mine
- **Étapes :**
  1. Se connecter en accompagné sans dossier
  2. Appeler GET /api/actions/mine
- **Résultat attendu :** 200. Corps { actions: [], dossierId: null }.
- **Traçabilité :** plan_action — GET /api/actions/mine
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-003 — GET /actions/mine — 401 non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles (anonyme) |

- **Préconditions :** Aucun cookie de session.
- **Données :** Sans cookie boussole_token. GET /api/actions/mine
- **Étapes :**
  1. Appeler GET /api/actions/mine sans cookie
- **Résultat attendu :** 401 { error: 'Non authentifié' }.
- **Traçabilité :** plan_action — GET /api/actions/mine (requireAuth)
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-004 — GET /actions/mine — 403 mauvais rôle (accompagnateur)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles |

- **Préconditions :** Connecté en accompagnateur (elafrit.mohamed@gmail.com).
- **Données :** Cookie accompagnateur. GET /api/actions/mine
- **Étapes :**
  1. Se connecter en accompagnateur
  2. Appeler GET /api/actions/mine
- **Résultat attendu :** 403 { error: 'Accès refusé' } (requireRole('accompagne')).
- **Traçabilité :** plan_action — GET /api/actions/mine (requireRole accompagne)
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-005 — GET /actions/mine — 403 mauvais rôle (admin)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | Test basé sur les rôles |

- **Préconditions :** Connecté en admin (mohamed@elafrit.com).
- **Données :** Cookie admin. GET /api/actions/mine
- **Étapes :**
  1. Se connecter en admin
  2. Appeler GET /api/actions/mine
- **Résultat attendu :** 403 { error: 'Accès refusé' }.
- **Traçabilité :** plan_action — GET /api/actions/mine (requireRole accompagne)
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-006 — GET /actions — nominal : l'accompagnateur liste les actions de son dossier

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Test du contrat ; test basé sur les rôles |

- **Préconditions :** Connecté en accompagnateur propriétaire du dossier ciblé.
- **Données :** GET /api/actions?dossierId=<id détenu>
- **Étapes :**
  1. Se connecter en accompagnateur
  2. Identifier un dossierId détenu
  3. Appeler GET /api/actions?dossierId=<id>
- **Résultat attendu :** 200. Corps { actions: [...] } trié par ordre ASC puis id ASC ; chaque action avec les 10 colonnes COLS.
- **Traçabilité :** plan_action — GET /api/actions
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-007 — GET /actions — 404 dossier non détenu par l'accompagnateur

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles (non-propriétaire) ; partition d'équivalence |

- **Préconditions :** Connecté en accompagnateur (Camille) ; dossierId appartenant à un AUTRE accompagnateur (Mohamed).
- **Données :** GET /api/actions?dossierId=<id d'un autre accompagnateur>
- **Étapes :**
  1. Se connecter en accompagnateur Camille
  2. Appeler GET /api/actions?dossierId=<dossier de Mohamed>
- **Résultat attendu :** 404 { error: 'Dossier introuvable' }.
- **Traçabilité :** plan_action — GET /api/actions (ownership accompagnateur_id)
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-008 — GET /actions — 404 dossierId inexistant ou manquant (NaN)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | Valeurs limites (NaN / id inexistant) ; partition d'équivalence (invalide) |

- **Préconditions :** Connecté en accompagnateur.
- **Données :** GET /api/actions (sans dossierId → Number(undefined)=NaN) et GET /api/actions?dossierId=999999
- **Étapes :**
  1. Se connecter en accompagnateur
  2. Appeler GET /api/actions sans param
  3. Appeler GET /api/actions?dossierId=999999
- **Résultat attendu :** 404 { error: 'Dossier introuvable' } dans les deux cas (aucune correspondance owns).
- **Traçabilité :** plan_action — GET /api/actions
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-009 — GET /actions — 401 non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles (anonyme) |

- **Préconditions :** Aucun cookie.
- **Données :** GET /api/actions?dossierId=1 sans cookie
- **Étapes :**
  1. Appeler GET /api/actions?dossierId=1 sans cookie
- **Résultat attendu :** 401 { error: 'Non authentifié' }.
- **Traçabilité :** plan_action — GET /api/actions (requireAuth)
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-010 — GET /actions — 403 mauvais rôle (accompagné)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles |

- **Préconditions :** Connecté en accompagné.
- **Données :** Cookie accompagné. GET /api/actions?dossierId=<son dossier>
- **Étapes :**
  1. Se connecter en accompagné
  2. Appeler GET /api/actions?dossierId=<son dossier>
- **Résultat attendu :** 403 { error: 'Accès refusé' } (requireRole('accompagnateur')).
- **Traçabilité :** plan_action — GET /api/actions (requireRole accompagnateur)
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-011 — POST /actions — nominal : l'accompagnateur ajoute une action complète

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Test du contrat ; persistance/relecture |

- **Préconditions :** Connecté en accompagnateur propriétaire du dossier.
- **Données :** POST /api/actions { dossierId, libelle:'Préparer le pitch', echeance:'2026-07-01', critere:'Pitch prêt', details:'…', priorite:'haute', rappel_le:'2026-06-30' }
- **Étapes :**
  1. Se connecter en accompagnateur
  2. POST /api/actions avec tous les champs valides
  3. GET /api/actions?dossierId=<id> pour relire
- **Résultat attendu :** 201 { id: <number> }. À la relecture, l'action existe avec les valeurs envoyées et ordre = MAX(ordre précédent)+1 (1 si dossier vide).
- **Traçabilité :** plan_action — POST /api/actions
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-012 — POST /actions — nominal : l'accompagné ajoute une action dans SON dossier (libellé seul)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Test du contrat ; test basé sur les rôles (accompagné autorisé sur son dossier) |

- **Préconditions :** Connecté en accompagné, dossierId = celui retourné par /actions/mine.
- **Données :** POST /api/actions { dossierId:<mine>, libelle:'Réviser le mémoire' }
- **Étapes :**
  1. Se connecter en accompagné
  2. Récupérer dossierId via /actions/mine
  3. POST /api/actions { dossierId, libelle }
- **Résultat attendu :** 201 { id }. Champs optionnels non fournis stockés à null ; statut par défaut 'a_faire'.
- **Traçabilité :** plan_action — POST /api/actions
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-013 — POST /actions — 400 libellé manquant ou vide (après trim)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | haute | Valeurs limites (chaîne vide / espaces) ; partition d'équivalence (invalide) |

- **Préconditions :** Connecté en accompagnateur propriétaire du dossier.
- **Données :** POST /api/actions { dossierId, libelle:'   ' } puis { dossierId } sans libelle
- **Étapes :**
  1. Se connecter
  2. POST avec libelle composé d'espaces
  3. POST sans champ libelle
- **Résultat attendu :** 400 { error: 'Libellé requis' } dans les deux cas (opt() renvoie null).
- **Traçabilité :** plan_action — POST /api/actions
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-014 — POST /actions — 400 priorité hors énumération

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | Partition d'équivalence (priorité invalide) ; table de décision (libellé valide + priorité invalide) |

- **Préconditions :** Connecté en accompagnateur propriétaire du dossier.
- **Données :** POST /api/actions { dossierId, libelle:'X', priorite:'urgente' }
- **Étapes :**
  1. Se connecter
  2. POST avec priorite='urgente' (hors haute/moyenne/basse)
- **Résultat attendu :** 400 { error: 'Priorité invalide' }.
- **Traçabilité :** plan_action — POST /api/actions
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-015 — POST /actions — priorité vide/espaces acceptée (normalisée à null)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | basse | Valeurs limites (espaces) ; partition d'équivalence (valeur frontière acceptée) |

- **Préconditions :** Connecté en accompagnateur propriétaire du dossier.
- **Données :** POST /api/actions { dossierId, libelle:'X', priorite:'  ' }
- **Étapes :**
  1. Se connecter
  2. POST avec priorite composée d'espaces
  3. Relire l'action
- **Résultat attendu :** 201 ; priorite stockée à null (opt() neutralise, pas d'erreur car prio est falsy donc non testé contre PRIORITES).
- **Traçabilité :** plan_action — POST /api/actions
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-016 — POST /actions — 404 dossier non accessible à l'utilisateur

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles (non-propriétaire) ; partition d'équivalence |

- **Préconditions :** Connecté en accompagné A ; dossierId appartenant à un autre accompagné/accompagnateur.
- **Données :** POST /api/actions { dossierId:<dossier d'autrui>, libelle:'X' }
- **Étapes :**
  1. Se connecter en accompagné A
  2. POST avec un dossierId ne référençant ni accompagnateur_id ni accompagne_id = A
- **Résultat attendu :** 404 { error: 'Dossier introuvable' } (dossierForUser échoue avant validation du libellé).
- **Traçabilité :** plan_action — POST /api/actions (dossierForUser)
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-017 — POST /actions — 401 non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles (anonyme) |

- **Préconditions :** Aucun cookie.
- **Données :** POST /api/actions { dossierId:1, libelle:'X' } sans cookie
- **Étapes :**
  1. POST /api/actions sans cookie
- **Résultat attendu :** 401 { error: 'Non authentifié' }.
- **Traçabilité :** plan_action — POST /api/actions (requireAuth)
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-018 — POST /actions — ordre = MAX(ordre)+1 sur ajouts successifs

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | Valeurs limites (incrément d'ordre) ; test du contrat |

- **Préconditions :** Connecté en accompagnateur ; dossier avec une action d'ordre N existant.
- **Données :** Deux POST consécutifs sur le même dossier.
- **Étapes :**
  1. POST action A
  2. POST action B
  3. GET /api/actions?dossierId=<id>
- **Résultat attendu :** Les nouvelles actions reçoivent des ordres strictement croissants et contigus à partir de MAX(ordre)+1 ; tri stable de la liste.
- **Traçabilité :** plan_action — POST /api/actions (ordre)
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-019 — PATCH /actions/:id — nominal : changement de statut valide

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Partition d'équivalence (statut valide) ; persistance/relecture |

- **Préconditions :** Connecté propriétaire (accompagnateur ou accompagné) d'une action existante.
- **Données :** PATCH /api/actions/<id> { statut:'en_cours' }
- **Étapes :**
  1. Se connecter
  2. PATCH avec statut='en_cours'
  3. Relire l'action
- **Résultat attendu :** 200 { ok: true } ; à la relecture statut='en_cours'.
- **Traçabilité :** plan_action — PATCH /api/actions/:id
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-020 — PATCH /actions/:id — 400 statut hors énumération

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | haute | Partition d'équivalence (statut invalide) ; valeurs limites (juste hors ensemble) |

- **Préconditions :** Connecté propriétaire d'une action existante.
- **Données :** PATCH /api/actions/<id> { statut:'termine' }
- **Étapes :**
  1. PATCH avec statut='termine' (hors a_faire/en_cours/fait)
- **Résultat attendu :** 400 { error: 'Statut invalide' }.
- **Traçabilité :** plan_action — PATCH /api/actions/:id
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-021 — PATCH /actions/:id — 400 libellé fourni mais vide

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | Valeurs limites (chaîne d'espaces) ; partition d'équivalence |

- **Préconditions :** Connecté propriétaire d'une action existante.
- **Données :** PATCH /api/actions/<id> { libelle:'   ' }
- **Étapes :**
  1. PATCH avec libelle composé d'espaces
- **Résultat attendu :** 400 { error: 'Libellé vide' } (b.libelle != null mais opt() → null).
- **Traçabilité :** plan_action — PATCH /api/actions/:id
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-022 — PATCH /actions/:id — 400 priorité invalide (non vide)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | Partition d'équivalence (priorité invalide) |

- **Préconditions :** Connecté propriétaire d'une action existante.
- **Données :** PATCH /api/actions/<id> { priorite:'critique' }
- **Étapes :**
  1. PATCH avec priorite='critique'
- **Résultat attendu :** 400 { error: 'Priorité invalide' }.
- **Traçabilité :** plan_action — PATCH /api/actions/:id
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-023 — PATCH /actions/:id — priorité explicitement vidée (null) acceptée

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | basse | Valeurs limites (effacement) ; table de décision (priorite défini=true, valeur falsy) |

- **Préconditions :** Connecté propriétaire d'une action ayant une priorité 'haute'.
- **Données :** PATCH /api/actions/<id> { priorite:'' }
- **Étapes :**
  1. PATCH avec priorite='' (chaîne vide)
  2. Relire l'action
- **Résultat attendu :** 200 { ok: true } ; priorite remise à null (opt() → null, prio falsy donc non rejeté).
- **Traçabilité :** plan_action — PATCH /api/actions/:id
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-024 — PATCH /actions/:id — corps vide : 200 ok sans modification (sets.length===0)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | basse | Valeurs limites (0 champ) ; partition d'équivalence (no-op) |

- **Préconditions :** Connecté propriétaire d'une action existante.
- **Données :** PATCH /api/actions/<id> {} (aucun champ)
- **Étapes :**
  1. PATCH avec corps {} 
  2. Relire l'action
- **Résultat attendu :** 200 { ok: true } ; action inchangée (aucune requête UPDATE émise).
- **Traçabilité :** plan_action — PATCH /api/actions/:id
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-025 — PATCH /actions/:id — modif de rappel_le ré-arme rappel_envoye=0

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Table de décision (rappel_le défini → réarmement) ; test du contrat |

- **Préconditions :** Connecté propriétaire d'une action dont rappel_envoye=1 (rappel déjà notifié).
- **Données :** PATCH /api/actions/<id> { rappel_le:'<date future>' }
- **Étapes :**
  1. Préparer une action avec rappel_envoye=1
  2. PATCH avec un nouveau rappel_le
  3. Atteindre/forcer la date puis GET /api/notifications
- **Résultat attendu :** 200 { ok: true } ; rappel_envoye repassé à 0 (clause SET rappel_envoye=0), de sorte qu'une nouvelle notification pourra être générée à échéance.
- **Traçabilité :** plan_action — PATCH /api/actions/:id (rappel_envoye=0)
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-026 — PATCH /actions/:id — mise à jour multi-champs partielle

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | Test du contrat ; persistance/relecture |

- **Préconditions :** Connecté propriétaire d'une action.
- **Données :** PATCH /api/actions/<id> { libelle:'Maj', echeance:'2026-08-01', critere:'OK', details:'note' }
- **Étapes :**
  1. PATCH avec plusieurs champs valides
  2. Relire l'action
- **Résultat attendu :** 200 { ok: true } ; tous les champs fournis mis à jour, les autres inchangés.
- **Traçabilité :** plan_action — PATCH /api/actions/:id
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-027 — PATCH /actions/:id — 404 action d'un dossier non accessible

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles (non-propriétaire) |

- **Préconditions :** Connecté en utilisateur A ; action appartenant au dossier d'un autre utilisateur.
- **Données :** PATCH /api/actions/<id d'autrui> { statut:'fait' }
- **Étapes :**
  1. Se connecter en A
  2. PATCH une action dont le dossier n'a ni accompagnateur_id ni accompagne_id = A
- **Résultat attendu :** 404 { error: 'Action introuvable' } (actionForUser échoue).
- **Traçabilité :** plan_action — PATCH /api/actions/:id (actionForUser)
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-028 — PATCH /actions/:id — 404 action inexistante

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | Partition d'équivalence (id inexistant) ; valeurs limites |

- **Préconditions :** Connecté en utilisateur authentifié.
- **Données :** PATCH /api/actions/999999 { statut:'fait' }
- **Étapes :**
  1. PATCH sur un id d'action inexistant
- **Résultat attendu :** 404 { error: 'Action introuvable' }.
- **Traçabilité :** plan_action — PATCH /api/actions/:id
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-029 — PATCH /actions/:id — 401 non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles (anonyme) |

- **Préconditions :** Aucun cookie.
- **Données :** PATCH /api/actions/1 { statut:'fait' } sans cookie
- **Étapes :**
  1. PATCH sans cookie
- **Résultat attendu :** 401 { error: 'Non authentifié' }.
- **Traçabilité :** plan_action — PATCH /api/actions/:id (requireAuth)
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-030 — DELETE /actions/:id — nominal : suppression d'une action accessible

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Test du contrat ; persistance/relecture |

- **Préconditions :** Connecté propriétaire d'une action existante.
- **Données :** DELETE /api/actions/<id>
- **Étapes :**
  1. Créer une action
  2. DELETE /api/actions/<id>
  3. GET /api/actions(... ) pour vérifier l'absence
- **Résultat attendu :** 200 { ok: true } ; l'action n'apparaît plus dans la liste.
- **Traçabilité :** plan_action — DELETE /api/actions/:id
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-031 — DELETE /actions/:id — 404 action d'un dossier non accessible

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles (non-propriétaire) |

- **Préconditions :** Connecté en utilisateur A ; action d'un autre utilisateur.
- **Données :** DELETE /api/actions/<id d'autrui>
- **Étapes :**
  1. Se connecter en A
  2. DELETE une action d'un dossier non lié à A
- **Résultat attendu :** 404 { error: 'Action introuvable' } ; aucune suppression effectuée.
- **Traçabilité :** plan_action — DELETE /api/actions/:id (actionForUser)
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-032 — DELETE /actions/:id — 404 action inexistante

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | Partition d'équivalence (id inexistant) |

- **Préconditions :** Connecté authentifié.
- **Données :** DELETE /api/actions/999999
- **Étapes :**
  1. DELETE sur id inexistant
- **Résultat attendu :** 404 { error: 'Action introuvable' }.
- **Traçabilité :** plan_action — DELETE /api/actions/:id
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-033 — DELETE /actions/:id — 401 non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles (anonyme) |

- **Préconditions :** Aucun cookie.
- **Données :** DELETE /api/actions/1 sans cookie
- **Étapes :**
  1. DELETE sans cookie
- **Résultat attendu :** 401 { error: 'Non authentifié' }.
- **Traçabilité :** plan_action — DELETE /api/actions/:id (requireAuth)
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-034 — POST /actions/reorder — nominal : réordonnancement complet d'un dossier

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Test du contrat ; persistance/relecture |

- **Préconditions :** Connecté propriétaire d'un dossier avec >=3 actions [A,B,C].
- **Données :** POST /api/actions/reorder { dossierId, ids:[C.id, A.id, B.id] }
- **Étapes :**
  1. Lister les actions
  2. POST reorder avec un ordre inversé
  3. Relire la liste
- **Résultat attendu :** 200 { ok: true } ; à la relecture l'ordre suit la liste fournie (ordre 0,1,2…) ; tri ASC cohérent.
- **Traçabilité :** plan_action — POST /api/actions/reorder
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-035 — POST /actions/reorder — liste partielle : actions absentes renumérotées à la suite sans collision

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | Valeurs limites (sous-ensemble) ; test du contrat (renumérotation contiguë) |

- **Préconditions :** Connecté propriétaire d'un dossier avec actions [A,B,C,D].
- **Données :** POST /api/actions/reorder { dossierId, ids:[B.id, A.id] } (C et D omis)
- **Étapes :**
  1. POST reorder avec seulement 2 des 4 ids
  2. Relire la liste triée par ordre
- **Résultat attendu :** 200 { ok: true } ; B=0, A=1 puis C et D renumérotés à partir de 2 dans leur ordre courant ; ordres contigus, aucune collision/duplication.
- **Traçabilité :** plan_action — POST /api/actions/reorder (renumérotation du reste)
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-036 — POST /actions/reorder — ids contenant un id d'un autre dossier : ignoré (clause dossier_id)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | Partition d'équivalence (id hors dossier) ; test du contrat (isolation par dossier) |

- **Préconditions :** Connecté propriétaire du dossier D1 ; un id d'action appartient à D2 (autre dossier du même user).
- **Données :** POST /api/actions/reorder { dossierId:D1, ids:[actionD1.id, actionD2.id] }
- **Étapes :**
  1. POST reorder mélangeant un id d'un autre dossier
  2. Relire D1 et D2
- **Résultat attendu :** 200 { ok: true } ; seules les actions de D1 sont mises à jour (UPDATE ... AND dossier_id=D1) ; l'action de D2 n'est pas déplacée vers D1.
- **Traçabilité :** plan_action — POST /api/actions/reorder (WHERE dossier_id)
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-037 — POST /actions/reorder — 400 ids non-tableau

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | haute | Partition d'équivalence (type invalide) ; valeurs limites |

- **Préconditions :** Connecté propriétaire du dossier.
- **Données :** POST /api/actions/reorder { dossierId, ids:'abc' } et { dossierId } sans ids
- **Étapes :**
  1. POST reorder avec ids string
  2. POST reorder sans ids
- **Résultat attendu :** 400 { error: 'Ordre invalide' } (Array.isArray(ids) faux).
- **Traçabilité :** plan_action — POST /api/actions/reorder
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-038 — POST /actions/reorder — ids tableau vide : 200 sans modification d'ordre des actions existantes

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | basse | Valeurs limites (tableau vide) ; test du contrat |

- **Préconditions :** Connecté propriétaire d'un dossier avec actions.
- **Données :** POST /api/actions/reorder { dossierId, ids:[] }
- **Étapes :**
  1. POST reorder avec ids=[]
  2. Relire la liste
- **Résultat attendu :** 200 { ok: true } ; toutes les actions renumérotées à partir de 0 dans leur ordre courant (rest renuméroté), aucune collision.
- **Traçabilité :** plan_action — POST /api/actions/reorder
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-039 — POST /actions/reorder — 404 dossier non accessible

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles (non-propriétaire) |

- **Préconditions :** Connecté en A ; dossierId d'un autre utilisateur.
- **Données :** POST /api/actions/reorder { dossierId:<autrui>, ids:[1] }
- **Étapes :**
  1. POST reorder sur un dossier non lié à A
- **Résultat attendu :** 404 { error: 'Dossier introuvable' } (dossierForUser échoue avant le contrôle ids).
- **Traçabilité :** plan_action — POST /api/actions/reorder (dossierForUser)
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-040 — POST /actions/reorder — 401 non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles (anonyme) |

- **Préconditions :** Aucun cookie.
- **Données :** POST /api/actions/reorder { dossierId:1, ids:[1] } sans cookie
- **Étapes :**
  1. POST reorder sans cookie
- **Résultat attendu :** 401 { error: 'Non authentifié' }.
- **Traçabilité :** plan_action — POST /api/actions/reorder (requireAuth)
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-041 — Unitaire — opt() nettoie le texte (trim → null si vide)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | validation | moyenne | Partition d'équivalence (null/vide/non vide) ; valeurs limites (espaces) ; test unitaire de repli déterministe |

- **Préconditions :** Fonction opt(v) de actions.ts isolable.
- **Données :** Entrées : null, undefined, '', '   ', '  abc  ', 42
- **Étapes :**
  1. Appeler opt(null)
  2. opt(undefined)
  3. opt('')
  4. opt('   ')
  5. opt('  abc  ')
  6. opt(42)
- **Résultat attendu :** null pour null/undefined/''/'   ' ; 'abc' pour '  abc  ' ; '42' pour 42 (String + trim).
- **Traçabilité :** plan_action — actions.ts opt()
- **Automatisation :** ✅ unit/actions.test.ts

### TC-ACT-042 — Unitaire — sweepDueReminders() idempotent : un seul couple de notifications par rappel dû

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | non-regression | haute | Test unitaire de repli déterministe ; test du contrat (idempotence) |

- **Préconditions :** Action avec rappel_le <= aujourd'hui et rappel_envoye=0, dossier liant un accompagné et un accompagnateur.
- **Données :** Appeler sweepDueReminders() deux fois de suite.
- **Étapes :**
  1. Préparer l'action due
  2. Invoquer sweepDueReminders()
  3. Invoquer à nouveau sweepDueReminders()
  4. Compter les notifications créées
- **Résultat attendu :** Exactement 2 notifications créées au total (1 accompagné + 1 accompagnateur) au 1er passage ; 0 nouvelle au 2e (markRappelSent.changes!==1 → continue). rappel_envoye=1.
- **Traçabilité :** — notifications.ts sweepDueReminders()
- **Automatisation :** ✅ unit/notifications.test.ts

### TC-ACT-043 — Unitaire — sweepDueReminders() : seuil de date (échéance future ignorée, passée déclenchée)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | haute | Valeurs limites (hier/aujourd'hui/demain) ; partition d'équivalence (dû / non dû) |

- **Préconditions :** Deux actions : rappel_le hier (due) et rappel_le demain (non due), rappel_envoye=0.
- **Données :** date('now','localtime') comme borne.
- **Étapes :**
  1. Préparer action passée et action future
  2. Invoquer sweepDueReminders()
  3. Vérifier les notifications et les drapeaux
- **Résultat attendu :** Seule l'action dont rappel_le <= aujourd'hui génère des notifications et passe rappel_envoye=1 ; l'action future reste rappel_envoye=0 sans notification.
- **Traçabilité :** — notifications.ts sweepDueReminders() (rappel_le <= date now)
- **Automatisation :** ✅ unit/notifications.test.ts

### TC-ACT-044 — Unitaire — sweepDueReminders() : texte de notification avec et sans échéance

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | moyenne | Table de décision (echeance présente/absente) ; test du contrat |

- **Préconditions :** Action due avec echeance renseignée, et une autre due sans echeance.
- **Données :** libelle='Pitch', echeance='2026-06-10' vs echeance=null.
- **Étapes :**
  1. Invoquer sweepDueReminders()
  2. Lire le texte des notifications créées
- **Résultat attendu :** Avec échéance : « Rappel : « Pitch » — échéance le 2026-06-10. » ; sans échéance : « Rappel : « Pitch ». » (segment échéance omis). Vérifier la présence du libellé, non figer le reste.
- **Traçabilité :** — notifications.ts sweepDueReminders() (composition du texte)
- **Automatisation :** ✅ unit/notifications.test.ts

### TC-ACT-045 — GET /notifications — nominal : liste + nonLues, déclenche le balayage des rappels

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Test du contrat ; persistance/relecture (effet du sweep) |

- **Préconditions :** Connecté (accompagné ou accompagnateur) avec un rappel d'action arrivé à échéance non encore notifié.
- **Données :** GET /api/notifications
- **Étapes :**
  1. Préparer une action avec rappel_le échu et rappel_envoye=0
  2. GET /api/notifications
- **Résultat attendu :** 200 { notifications:[{id, texte, lu, cree_le}...], nonLues:<number> } ; <=30 entrées triées par cree_le DESC ; la notification du rappel apparaît (sweep exécuté en amont) et nonLues>=1.
- **Traçabilité :** — GET /api/notifications
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-046 — GET /notifications — isolement par utilisateur (on ne voit que les siennes)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles (cloisonnement par utilisateur) ; partition d'équivalence |

- **Préconditions :** Deux utilisateurs distincts ayant chacun des notifications.
- **Données :** GET /api/notifications connecté en user A puis en user B.
- **Étapes :**
  1. GET en A
  2. GET en B
  3. Comparer les jeux de notifications
- **Résultat attendu :** Chaque réponse ne contient que les notifications dont user_id = utilisateur connecté ; aucune fuite d'un utilisateur à l'autre.
- **Traçabilité :** — GET /api/notifications (WHERE user_id)
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-047 — GET /notifications — limite à 30 entrées les plus récentes

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | basse | Valeurs limites (30/31) ; test du contrat |

- **Préconditions :** Utilisateur avec plus de 30 notifications.
- **Données :** GET /api/notifications.
- **Étapes :**
  1. Créer >30 notifications pour l'utilisateur
  2. GET /api/notifications
- **Résultat attendu :** Le tableau notifications contient exactement 30 éléments (LIMIT 30), triés cree_le DESC ; nonLues reflète le total réel de non lues (sans limite).
- **Traçabilité :** — GET /api/notifications (LIMIT 30)
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-048 — GET /notifications — 401 non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles (anonyme) |

- **Préconditions :** Aucun cookie.
- **Données :** GET /api/notifications sans cookie.
- **Étapes :**
  1. GET /api/notifications sans cookie
- **Résultat attendu :** 401 { error: 'Non authentifié' }.
- **Traçabilité :** — GET /api/notifications (requireAuth)
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-049 — POST /notifications/lues — nominal : marque toutes les notifications comme lues

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Test du contrat ; persistance/relecture |

- **Préconditions :** Connecté avec au moins une notification non lue.
- **Données :** POST /api/notifications/lues.
- **Étapes :**
  1. GET /api/notifications (nonLues>0)
  2. POST /api/notifications/lues
  3. GET /api/notifications de nouveau
- **Résultat attendu :** 200 { ok: true } ; au GET suivant nonLues=0 et toutes les notifications ont lu=1.
- **Traçabilité :** — POST /api/notifications/lues
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-050 — POST /notifications/lues — n'affecte que l'utilisateur courant

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | Test basé sur les rôles (cloisonnement) ; partition d'équivalence |

- **Préconditions :** Deux utilisateurs A et B chacun avec des non lues.
- **Données :** POST /api/notifications/lues connecté en A.
- **Étapes :**
  1. A appelle /lues
  2. B fait GET /api/notifications
- **Résultat attendu :** 200 pour A ; les notifications de B restent inchangées (nonLues de B inchangé). UPDATE limité à user_id=A.
- **Traçabilité :** — POST /api/notifications/lues (WHERE user_id)
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-051 — POST /notifications/lues — 401 non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles (anonyme) |

- **Préconditions :** Aucun cookie.
- **Données :** POST /api/notifications/lues sans cookie.
- **Étapes :**
  1. POST /api/notifications/lues sans cookie
- **Résultat attendu :** 401 { error: 'Non authentifié' }.
- **Traçabilité :** — POST /api/notifications/lues (requireAuth)
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-052 — GET /tags — nominal : tags distincts des dossiers de l'accompagnateur

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Test du contrat ; test basé sur les rôles |

- **Préconditions :** Connecté en accompagnateur ayant taggé au moins un dossier.
- **Données :** GET /api/tags.
- **Étapes :**
  1. Ajouter quelques tags à ses dossiers
  2. GET /api/tags
- **Résultat attendu :** 200 { tags:[{id, nom}...] } ; tags distincts (DISTINCT), triés par nom, limités aux dossiers dont accompagnateur_id = utilisateur.
- **Traçabilité :** — GET /api/tags
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-053 — GET /tags — accompagnateur sans tag : liste vide

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | basse | Valeurs limites (0 tag) ; partition d'équivalence |

- **Préconditions :** Accompagnateur dont aucun dossier n'a de tag.
- **Données :** GET /api/tags.
- **Étapes :**
  1. GET /api/tags sans tags posés
- **Résultat attendu :** 200 { tags: [] }.
- **Traçabilité :** — GET /api/tags
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-054 — GET /tags — 403 mauvais rôle (accompagné)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles |

- **Préconditions :** Connecté en accompagné.
- **Données :** GET /api/tags.
- **Étapes :**
  1. Se connecter en accompagné
  2. GET /api/tags
- **Résultat attendu :** 403 { error: 'Accès refusé' } (requireRole('accompagnateur')).
- **Traçabilité :** — GET /api/tags (requireRole accompagnateur)
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-055 — GET /tags — 401 non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles (anonyme) |

- **Préconditions :** Aucun cookie.
- **Données :** GET /api/tags sans cookie.
- **Étapes :**
  1. GET /api/tags sans cookie
- **Résultat attendu :** 401 { error: 'Non authentifié' }.
- **Traçabilité :** — GET /api/tags (requireAuth)
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-056 — POST /tags/dossier/:dossierId — nominal : crée et associe un tag (normalisé en minuscules)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Test du contrat ; valeurs limites (espaces/casse) ; persistance/relecture |

- **Préconditions :** Connecté en accompagnateur propriétaire du dossier.
- **Données :** POST /api/tags/dossier/<id> { nom:'  Alternance  ' }
- **Étapes :**
  1. POST avec nom comportant majuscules et espaces
  2. GET /api/tags pour relire
- **Résultat attendu :** 201 { id:<number>, nom:'alternance' } ; le tag apparaît en minuscules trimées et est lié au dossier.
- **Traçabilité :** — POST /api/tags/dossier/:dossierId
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-057 — POST /tags/dossier/:dossierId — idempotence : réutilise un tag existant, pas de doublon de liaison

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | non-regression | moyenne | Test du contrat (idempotence) ; partition d'équivalence (existant vs nouveau) |

- **Préconditions :** Connecté en accompagnateur ; tag 'alternance' déjà lié au dossier.
- **Données :** POST /api/tags/dossier/<id> { nom:'alternance' } (2e fois)
- **Étapes :**
  1. POST 'alternance' une 1re fois
  2. POST 'alternance' une 2e fois
  3. GET /api/tags
- **Résultat attendu :** 201 renvoyant le même id de tag ; la table dossier_tags ne contient qu'une seule liaison (INSERT OR IGNORE), pas de doublon ni de nouveau tag (nom UNIQUE).
- **Traçabilité :** — POST /api/tags/dossier/:dossierId (INSERT OR IGNORE)
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-058 — POST /tags/dossier/:dossierId — 400 nom vide après trim

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | haute | Valeurs limites (chaîne vide/espaces) ; partition d'équivalence (invalide) |

- **Préconditions :** Connecté en accompagnateur propriétaire du dossier.
- **Données :** POST /api/tags/dossier/<id> { nom:'   ' } et POST sans nom
- **Étapes :**
  1. POST avec nom composé d'espaces
  2. POST sans champ nom
- **Résultat attendu :** 400 { error: 'Données invalides' } (nom falsy).
- **Traçabilité :** — POST /api/tags/dossier/:dossierId
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-059 — POST /tags/dossier/:dossierId — 400 dossier non détenu (même message que validation)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles (non-propriétaire) ; table de décision (ownsDossier x nom) |

- **Préconditions :** Connecté en accompagnateur Camille ; dossierId appartenant à Mohamed.
- **Données :** POST /api/tags/dossier/<dossier de Mohamed> { nom:'test' }
- **Étapes :**
  1. Se connecter Camille
  2. POST tag sur un dossier d'un autre accompagnateur
- **Résultat attendu :** 400 { error: 'Données invalides' } (ownsDossier faux → condition combinée renvoie 400 ; aucun tag/liaison créés).
- **Traçabilité :** — POST /api/tags/dossier/:dossierId (ownsDossier)
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-060 — POST /tags/dossier/:dossierId — 403 mauvais rôle (accompagné)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles |

- **Préconditions :** Connecté en accompagné.
- **Données :** POST /api/tags/dossier/<id> { nom:'x' }
- **Étapes :**
  1. Se connecter en accompagné
  2. POST tag
- **Résultat attendu :** 403 { error: 'Accès refusé' } (requireRole('accompagnateur')).
- **Traçabilité :** — POST /api/tags/dossier/:dossierId (requireRole accompagnateur)
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-061 — POST /tags/dossier/:dossierId — 401 non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles (anonyme) |

- **Préconditions :** Aucun cookie.
- **Données :** POST /api/tags/dossier/1 { nom:'x' } sans cookie.
- **Étapes :**
  1. POST tag sans cookie
- **Résultat attendu :** 401 { error: 'Non authentifié' }.
- **Traçabilité :** — POST /api/tags/dossier/:dossierId (requireAuth)
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-062 — DELETE /tags/dossier/:dossierId/:tagId — nominal : retire la liaison tag-dossier

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Test du contrat ; persistance/relecture |

- **Préconditions :** Connecté en accompagnateur ; dossier détenu lié au tag.
- **Données :** DELETE /api/tags/dossier/<id>/<tagId>
- **Étapes :**
  1. Lier un tag
  2. DELETE la liaison
  3. GET /api/tags / relire le dossier
- **Résultat attendu :** 200 { ok: true } ; la liaison dossier_tags est supprimée ; si plus aucun dossier n'utilise le tag, il disparaît du GET /tags.
- **Traçabilité :** — DELETE /api/tags/dossier/:dossierId/:tagId
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-063 — DELETE /tags/dossier/:dossierId/:tagId — 404 dossier non détenu

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles (non-propriétaire) |

- **Préconditions :** Connecté en accompagnateur ; dossierId appartenant à un autre accompagnateur.
- **Données :** DELETE /api/tags/dossier/<dossier d'autrui>/<tagId>
- **Étapes :**
  1. DELETE liaison sur un dossier non détenu
- **Résultat attendu :** 404 { error: 'Dossier introuvable' } (ownsDossier faux) ; aucune suppression.
- **Traçabilité :** — DELETE /api/tags/dossier/:dossierId/:tagId (ownsDossier)
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-064 — DELETE /tags/dossier/:dossierId/:tagId — liaison inexistante : 200 idempotent

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | non-regression | basse | Valeurs limites (liaison absente) ; partition d'équivalence (no-op) |

- **Préconditions :** Connecté en accompagnateur propriétaire du dossier ; tagId non lié (ou inexistant).
- **Données :** DELETE /api/tags/dossier/<id détenu>/999999
- **Étapes :**
  1. DELETE une liaison inexistante sur un dossier détenu
- **Résultat attendu :** 200 { ok: true } (DELETE sans correspondance ne fait rien) ; aucune erreur.
- **Traçabilité :** — DELETE /api/tags/dossier/:dossierId/:tagId
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-065 — DELETE /tags/dossier/:dossierId/:tagId — 403 mauvais rôle (accompagné)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | Test basé sur les rôles |

- **Préconditions :** Connecté en accompagné.
- **Données :** DELETE /api/tags/dossier/1/1.
- **Étapes :**
  1. Se connecter en accompagné
  2. DELETE liaison
- **Résultat attendu :** 403 { error: 'Accès refusé' } (requireRole('accompagnateur')).
- **Traçabilité :** — DELETE /api/tags/dossier/:dossierId/:tagId (requireRole accompagnateur)
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-066 — DELETE /tags/dossier/:dossierId/:tagId — 401 non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles (anonyme) |

- **Préconditions :** Aucun cookie.
- **Données :** DELETE /api/tags/dossier/1/1 sans cookie.
- **Étapes :**
  1. DELETE liaison sans cookie
- **Résultat attendu :** 401 { error: 'Non authentifié' }.
- **Traçabilité :** — DELETE /api/tags/dossier/:dossierId/:tagId (requireAuth)
- **Automatisation :** ✅ api/actnotif.test.ts

### TC-ACT-067 — UI — Accompagnateur : ajouter une action depuis la page Plan d'action

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | Test de bout en bout basé sur les rôles ; test du contrat (UI→API) |

- **Préconditions :** Connecté en accompagnateur (elafrit.mohamed@gmail.com), sur /plan-action/<dossierId> d'un dossier détenu.
- **Données :** Libellé='Préparer le pitch', Échéance='2026-07-01', Critère='Pitch prêt'.
- **Étapes :**
  1. Ouvrir la page Plan d'action du dossier
  2. Saisir libellé/échéance/critère
  3. Cliquer 'Ajouter'
- **Résultat attendu :** L'action apparaît dans la liste sous le formulaire ; les champs du formulaire sont réinitialisés ; un POST /api/actions a été émis (201).
- **Traçabilité :** plan_action — PlanAction.tsx / POST /api/actions
- **Automatisation :** ⏳ à automatiser

### TC-ACT-068 — UI — Accompagnateur : changer le statut d'une action via le sélecteur

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | Test de bout en bout ; partition d'équivalence (statut) |

- **Préconditions :** Sur /plan-action/<dossierId> avec au moins une action 'a_faire'.
- **Données :** Sélectionner 'Fait' dans le menu de statut d'une action.
- **Étapes :**
  1. Ouvrir le sélecteur de statut d'une action
  2. Choisir 'Fait'
- **Résultat attendu :** PATCH /api/actions/<id> {statut:'fait'} émis ; l'action prend le style 'statut-fait' (opacité réduite) après rechargement.
- **Traçabilité :** plan_action — ActionList.tsx / PATCH /api/actions/:id
- **Automatisation :** ⏳ à automatiser

### TC-ACT-069 — UI — Accompagné : ajouter, dicter et réordonner ses actions (Mon plan d'action)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | Test de bout en bout basé sur les rôles ; test du contrat (reorder) |

- **Préconditions :** Connecté en accompagné (afrit_mohamed@yahoo.fr) avec un dossier ; page /mon-plan-action.
- **Données :** Ajout d'une action puis glisser-déposer de la poignée ⠿ (ou flèches ↑/↓).
- **Étapes :**
  1. Ouvrir Mon plan d'action
  2. Saisir une action et cliquer 'Ajouter'
  3. Glisser la poignée ⠿ d'une action vers le haut
  4. Vérifier l'ordre après rechargement
- **Résultat attendu :** L'action est créée (POST /api/actions) ; après glisser, POST /api/actions/reorder est émis et le nouvel ordre persiste au rechargement ; la réorganisation au clavier (↑/↓) fonctionne aussi.
- **Traçabilité :** plan_action — MonPlanAction.tsx + ActionList.tsx / POST /api/actions, /api/actions/reorder
- **Automatisation :** ⏳ à automatiser

### TC-ACT-070 — UI — Accompagné : éditer une action (priorité, échéance, rappel) via la modale de détail

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | Test de bout en bout ; test du contrat (UI→API) ; table de décision (champs affichés) |

- **Préconditions :** Sur /mon-plan-action avec au moins une action ; ouverture de ActionDetailModal au clic sur l'action.
- **Données :** Priorité='Haute', Échéance='2026-07-01', Rappel='2026-06-30', Indicateur='Pitch prêt', Notes='…'.
- **Étapes :**
  1. Cliquer une action pour ouvrir le détail
  2. Renseigner priorité/échéance/rappel/indicateur/notes
  3. Cliquer 'Enregistrer'
- **Résultat attendu :** PATCH /api/actions/<id> émis avec ces champs ; la modale se ferme ; la liste se recharge en montrant la pastille de priorité, l'échéance et la cloche 🔔 du rappel.
- **Traçabilité :** plan_action — ActionDetailModal.tsx / PATCH /api/actions/:id
- **Automatisation :** ⏳ à automatiser

### TC-ACT-071 — UI — Modale de détail : validation du libellé obligatoire et suppression confirmée

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | validation | moyenne | Test de bout en bout ; valeurs limites (libellé vide) ; test du contrat (suppression) |

- **Préconditions :** ActionDetailModal ouverte sur une action existante.
- **Données :** Vider le libellé puis Enregistrer ; puis cliquer 'Supprimer' et confirmer.
- **Étapes :**
  1. Effacer le champ libellé
  2. Cliquer 'Enregistrer'
  3. Observer le message d'erreur
  4. Cliquer '🗑 Supprimer' et confirmer la boîte de dialogue
- **Résultat attendu :** À l'enregistrement vide : message 'Le libellé est obligatoire.' et aucun PATCH. À la suppression confirmée : DELETE /api/actions/<id> émis, la modale se ferme et l'action disparaît de la liste.
- **Traçabilité :** plan_action — ActionDetailModal.tsx / PATCH+DELETE /api/actions/:id
- **Automatisation :** ⏳ à automatiser

### TC-ACT-072 — UI — Accompagnateur : ajouter/retirer un tag et filtrer le tableau de bord

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | Test de bout en bout basé sur les rôles ; test du contrat (UI→API) |

- **Préconditions :** Connecté en accompagnateur sur /dashboard avec au moins un dossier.
- **Données :** Ajouter le tag 'Prioritaire' sur un dossier, puis filtrer, puis le retirer.
- **Étapes :**
  1. Saisir 'Prioritaire' dans le champ tag d'un dossier et valider
  2. Sélectionner 'prioritaire' dans 'Filtrer par tag'
  3. Retirer le tag du dossier
- **Résultat attendu :** POST /api/tags/dossier/<id> (tag affiché en minuscules) ; le filtre 'Filtrer par tag' liste le tag (GET /api/tags) et ne montre que les dossiers correspondants ; le retrait émet DELETE et le tag disparaît du dossier.
- **Traçabilité :** — Dashboard.tsx / GET+POST+DELETE /api/tags
- **Automatisation :** ⏳ à automatiser

### TC-ACT-073 — UI — Cloche de notifications : badge non lues, ouverture, marquage lu

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | Test de bout en bout ; test du contrat (UI→API) ; table de décision (non lues>0) |

- **Préconditions :** Connecté (accompagné ou accompagnateur) avec au moins une notification non lue (ex. rappel d'action échu).
- **Données :** Cloche 🔔 dans la barre ; clic pour ouvrir le menu.
- **Étapes :**
  1. Observer le badge de non lues sur la cloche
  2. Cliquer la cloche pour ouvrir le menu
  3. Vérifier la liste et l'absence de badge ensuite
- **Résultat attendu :** Le badge affiche le nombre de non lues (GET /api/notifications) ; à l'ouverture, POST /api/notifications/lues est émis, le badge disparaît (unread=0) ; les notifications s'affichent avec texte et date ; menu vide → 'Aucune notification.'.
- **Traçabilité :** — NotificationsBell.tsx / GET /api/notifications + POST /api/notifications/lues
- **Automatisation :** ⏳ à automatiser

### TC-ACT-074 — Bout-en-bout — rappel d'action : échéance atteinte → notification in-app pour accompagné ET accompagnateur

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | Test de bout en bout ; test du contrat (effet du sweep) ; non-régression (idempotence) |

- **Préconditions :** Dossier liant l'accompagné Amine et l'accompagnateur Mohamed ; une action avec rappel_le = aujourd'hui ou passé, rappel_envoye=0.
- **Données :** Action 'Préparer le pitch' rappel_le échu.
- **Étapes :**
  1. Définir un rappel échu via la modale de détail
  2. Ouvrir la cloche de notifications côté accompagné
  3. Se connecter côté accompagnateur et ouvrir la cloche
- **Résultat attendu :** À la consultation des notifications (sweepDueReminders), une notification de rappel apparaît côté accompagné ET côté accompagnateur ; un seul exemplaire chacun (idempotence) même après rechargements répétés.
- **Traçabilité :** plan_action — ActionDetailModal.tsx → sweepDueReminders → NotificationsBell.tsx
- **Automatisation :** ⏳ à automatiser

## Domaine DOSSIER — 85 cas

**Endpoints couverts :**

- `GET /api/dossiers/accompagnateurs` · feature: `multi_parcours` · rôle: accompagne — Liste des accompagnateurs actifs disponibles pour démarrer un parcours
- `POST /api/dossiers/start` · feature: `multi_parcours` · rôle: accompagne — Démarrer un nouveau parcours (titre + accompagnateur), crée lien + dossier + notif + email
- `GET /api/dossiers/mine` · feature: `multi_parcours` · rôle: accompagne — Liste des parcours de l'accompagné avec compteurs (questionnaire, synthèse publiée, CR, RDV)
- `GET /api/dossiers/mine/:id` · feature: `multi_parcours` · rôle: accompagne — Détail lecture seule d'un parcours de l'accompagné (questionnaire, CR publiés, synthèse, actions, RDV)
- `GET /api/dossiers/:id` · feature: `synthese` · rôle: accompagnateur — Détail complet d'un dossier pour l'accompagnateur propriétaire (sessions+CR, actions, RDV)
- `GET /api/dossiers/:id/synthese` · feature: `synthese` · rôle: accompagnateur — Synthèse JSON complète du parcours (rendue par SyntheseModal export/print)
- `POST /api/dossiers/:id/cloturer` · feature: `synthese` · rôle: accompagnateur — Clôturer la démarche avec synthèse finale optionnelle, notifie l'accompagné
- `POST /api/dossiers/:id/rouvrir` · feature: `synthese` · rôle: accompagnateur — Rouvrir un dossier clôturé (statut en_cours)
- `GET /api/autoeval/grille` · feature: `auto_evaluation` · rôle: accompagnateur — Structure statique de la grille (3 critères × 7 indicateurs, 4 zones)
- `GET /api/autoeval/:id` · feature: `auto_evaluation` · rôle: accompagnateur — Brouillon courant (scores 21 indicateurs, note, commentaires) + historique des versions validées
- `POST /api/autoeval/:id` · feature: `auto_evaluation` · rôle: accompagnateur — Enregistrer le brouillon (upsert scores, clamp 0–100, recalcule note_globale)
- `POST /api/autoeval/:id/valider` · feature: `auto_evaluation` · rôle: accompagnateur — Valider : fige la version courante (statut validee) et repart d'un nouveau brouillon copié
- `POST /api/autoeval/:id/ia` · feature: `auto_evaluation` · rôle: accompagnateur — Pré-remplissage IA (Opus) des 21 indicateurs : suggère sans sauvegarder, repli available:false
- `POST /api/synthese/generer` · feature: `synthese` · rôle: accompagnateur — Générer/régénérer la synthèse HTML (IA narrative ou repli déterministe), nouvelle version
- `GET /api/synthese/dossier/:id` · feature: `synthese` · rôle: accompagnateur|accompagne — État de la synthèse (acc: courant+historique ; accompagné: version publiée seule)
- `GET /api/synthese/version/:id` · feature: `synthese` · rôle: accompagnateur — Lire une version archivée par son id (propriétaire)
- `PATCH /api/synthese/version/:id` · feature: `synthese` · rôle: accompagnateur — Enregistrer le contenu de la version courante (source=edition), seule la courante est modifiable
- `POST /api/synthese/version/:id/publier` · feature: `synthese` · rôle: accompagnateur — Publier une version (dépublie les autres du dossier), notifie l'accompagné
- `GET /api/synthese/mine` · feature: `synthese` · rôle: accompagne — Liste des synthèses publiées de l'accompagné (une par dossier)
- `GET /api/synthese/dossier/:id/messages` · feature: `synthese` · rôle: accompagnateur|accompagne — Messages de discussion sur la synthèse (accompagné ssi synthèse publiée)
- `POST /api/synthese/dossier/:id/messages` · feature: `synthese` · rôle: accompagnateur|accompagne — Poster un message de discussion, notifie l'autre partie

### TC-DOSS-001 — Lister les accompagnateurs disponibles (nominal)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat |

- **Préconditions :** Connecté en accompagné (afrit_mohamed@yahoo.fr). Au moins 2 accompagnateurs actifs seedés.
- **Données :** GET /api/dossiers/accompagnateurs
- **Étapes :**
  1. S'authentifier en accompagné
  2. Appeler GET /api/dossiers/accompagnateurs
- **Résultat attendu :** 200 ; corps { accompagnateurs: [...] } ; chaque item a id, prenom, nom, email ; triés par prenom puis email ; seuls les accompagnateurs actifs (actif=1) y figurent.
- **Traçabilité :** multi_parcours · GET /api/dossiers/accompagnateurs
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-002 — Accès accompagnateurs refusé sans authentification

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles |

- **Préconditions :** Aucun cookie de session.
- **Données :** GET /api/dossiers/accompagnateurs sans cookie
- **Étapes :**
  1. Appeler l'endpoint sans cookie boussole_token
- **Résultat attendu :** 401 { error: 'Non authentifié' }
- **Traçabilité :** requireAuth · GET /api/dossiers/accompagnateurs
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-003 — Accès accompagnateurs refusé pour rôle accompagnateur

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles |

- **Préconditions :** Connecté en accompagnateur (camille.laurent@boussole.demo).
- **Données :** GET /api/dossiers/accompagnateurs
- **Étapes :**
  1. S'authentifier en accompagnateur
  2. Appeler l'endpoint
- **Résultat attendu :** 403 { error: 'Accès refusé' } (requireRole('accompagne'))
- **Traçabilité :** requireRole('accompagne') · GET /api/dossiers/accompagnateurs
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-004 — Démarrer un parcours (nominal, 201)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat |

- **Préconditions :** Connecté en accompagné ; un accompagnateur actif valide (id connu).
- **Données :** POST /api/dossiers/start { titre:'Mémoire — refonte appli', accompagnateurId: <id valide> }
- **Étapes :**
  1. Récupérer un accompagnateurId via /accompagnateurs
  2. POST /start avec titre et accompagnateurId
- **Résultat attendu :** 201 { dossierId: <number> } ; un dossier est créé (accompagne_id=moi, accompagnateur_id choisi, statut en_cours) ; lien INSERT OR IGNORE créé ; une notification et un email sont émis vers l'accompagnateur.
- **Traçabilité :** multi_parcours · POST /api/dossiers/start
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-005 — Démarrer un parcours : titre manquant/vide → 400

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | haute | partition d'équivalence + valeurs limites |

- **Préconditions :** Connecté en accompagné ; accompagnateur valide.
- **Données :** Cas A: { titre:'', accompagnateurId:valide } ; Cas B: { titre:'   ', accompagnateurId:valide } ; Cas C: corps sans titre
- **Étapes :**
  1. POST /start avec titre vide ou espaces ou absent
- **Résultat attendu :** 400 { error: 'Donne un titre à ton parcours.' } pour chaque cas (trim côté serveur).
- **Traçabilité :** multi_parcours · POST /api/dossiers/start
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-006 — Démarrer un parcours : accompagnateur invalide/inexistant/inactif → 400

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | haute | partition d'équivalence (classe invalide) + test basé sur les rôles |

- **Préconditions :** Connecté en accompagné.
- **Données :** Cas A: accompagnateurId=999999 (inexistant) ; Cas B: id d'un utilisateur de rôle 'accompagne' ; Cas C: id d'un accompagnateur actif=0 ; Cas D: accompagnateurId absent (NaN)
- **Étapes :**
  1. POST /start avec titre valide et accompagnateurId non éligible
- **Résultat attendu :** 400 { error: 'Choisis un accompagnateur valide.' } ; aucun dossier créé.
- **Traçabilité :** multi_parcours · POST /api/dossiers/start
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-007 — Démarrer un parcours : non authentifié → 401

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles |

- **Préconditions :** Aucun cookie.
- **Données :** POST /api/dossiers/start sans cookie
- **Étapes :**
  1. POST /start sans session
- **Résultat attendu :** 401 { error: 'Non authentifié' }
- **Traçabilité :** requireAuth · POST /api/dossiers/start
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-008 — Démarrer un parcours : rôle accompagnateur → 403

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles |

- **Préconditions :** Connecté en accompagnateur.
- **Données :** POST /api/dossiers/start { titre:'x', accompagnateurId:valide }
- **Étapes :**
  1. S'authentifier en accompagnateur
  2. POST /start
- **Résultat attendu :** 403 { error: 'Accès refusé' }
- **Traçabilité :** requireRole('accompagne') · POST /api/dossiers/start
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-009 — Lien d'accompagnement non dupliqué au re-démarrage (INSERT OR IGNORE)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | non-regression | moyenne | test du contrat (idempotence) |

- **Préconditions :** Connecté en accompagné ayant déjà un parcours avec l'accompagnateur A.
- **Données :** POST /start { titre:'Second parcours', accompagnateurId: A }
- **Étapes :**
  1. Démarrer un 1er parcours avec A
  2. Démarrer un 2e parcours avec le même A
- **Résultat attendu :** 201 ; un nouveau dossier est créé ; la table liens_accompagnement contient toujours une seule ligne (accompagnateur_id, accompagne_id) — pas de doublon.
- **Traçabilité :** multi_parcours · POST /api/dossiers/start
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-010 — Lister mes parcours (nominal + compteurs)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat |

- **Préconditions :** Connecté en accompagné (Amine) avec ≥1 dossier ayant questionnaire, CR publié, synthèse publiée et RDV.
- **Données :** GET /api/dossiers/mine
- **Étapes :**
  1. GET /api/dossiers/mine
- **Résultat attendu :** 200 { dossiers:[...] } trié par cree_le DESC ; chaque item: id, titre, statut, cree_le, acc_prenom/nom/email, has_questionnaire, synthese_publiee, nb_cr (seulement CR publie=1), nb_rdv ; n'inclut QUE les dossiers de l'accompagné.
- **Traçabilité :** multi_parcours · GET /api/dossiers/mine
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-011 — Lister mes parcours : isolation entre accompagnés

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles (isolation des données) |

- **Préconditions :** Deux accompagnés (Amine, Léa) ayant chacun des dossiers.
- **Données :** GET /api/dossiers/mine connecté en Léa
- **Étapes :**
  1. Se connecter en Léa
  2. GET /mine
- **Résultat attendu :** 200 ; seuls les dossiers de Léa apparaissent ; aucun dossier d'Amine.
- **Traçabilité :** multi_parcours · GET /api/dossiers/mine
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-012 — Détail d'un parcours côté accompagné (nominal)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat |

- **Préconditions :** Connecté en accompagné, propriétaire du dossier <id>.
- **Données :** GET /api/dossiers/mine/:id
- **Étapes :**
  1. GET /api/dossiers/mine/<id du dossier d'Amine>
- **Résultat attendu :** 200 ; corps { dossier{ id,titre,statut,cree_le,accompagnateur_id,acc_prenom,acc_nom,acc_email }, questionnaire, crs (publie=1, triés publie_le DESC), synthese_publiee:boolean, phase_max, nb_entretiens, actions (triées ordre,id), rdvs }.
- **Traçabilité :** multi_parcours · GET /api/dossiers/mine/:id
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-013 — Détail parcours accompagné : dossier d'autrui ou inexistant → 404

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles (non-propriétaire) |

- **Préconditions :** Connecté en accompagné Léa.
- **Données :** GET /api/dossiers/mine/:id avec id = dossier d'Amine ; et id = 999999
- **Étapes :**
  1. GET /mine/<id du dossier d'Amine> en tant que Léa
  2. GET /mine/999999
- **Résultat attendu :** 404 { error: 'Parcours introuvable' } dans les deux cas (filtre accompagne_id=me.id).
- **Traçabilité :** multi_parcours · GET /api/dossiers/mine/:id
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-014 — Détail parcours accompagné : rôle accompagnateur → 403

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles |

- **Préconditions :** Connecté en accompagnateur.
- **Données :** GET /api/dossiers/mine/1
- **Étapes :**
  1. GET /mine/1 en accompagnateur
- **Résultat attendu :** 403 { error: 'Accès refusé' }
- **Traçabilité :** requireRole('accompagne') · GET /api/dossiers/mine/:id
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-015 — Détail complet dossier côté accompagnateur (nominal)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat |

- **Préconditions :** Connecté en accompagnateur propriétaire (Camille) du dossier <id>.
- **Données :** GET /api/dossiers/:id
- **Étapes :**
  1. GET /api/dossiers/<id possédé>
- **Résultat attendu :** 200 ; { dossier{ id,titre,contexte,statut,synthese,cree_le,accompagne_prenom,accompagne_email }, questionnaire, sessions[] chaque session avec crs[] (id,version,genere_le,publie triés version DESC), synthese_publiee, actions, rdvs }.
- **Traçabilité :** synthese · GET /api/dossiers/:id
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-016 — Détail dossier : non-propriétaire → 404

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles (propriété) |

- **Préconditions :** Deux accompagnateurs ; Camille tente d'accéder à un dossier appartenant à Mohamed.
- **Données :** GET /api/dossiers/:id (id d'un dossier d'un autre accompagnateur)
- **Étapes :**
  1. Se connecter en Camille
  2. GET /:id d'un dossier de Mohamed
- **Résultat attendu :** 404 { error: 'Dossier introuvable' } (owns() faux).
- **Traçabilité :** owns() · GET /api/dossiers/:id
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-017 — Détail dossier : id inexistant → 404

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | valeurs limites (ressource absente) |

- **Préconditions :** Connecté en accompagnateur.
- **Données :** GET /api/dossiers/999999
- **Étapes :**
  1. GET /:id inexistant
- **Résultat attendu :** 404 { error: 'Dossier introuvable' }
- **Traçabilité :** owns() · GET /api/dossiers/:id
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-018 — Détail dossier : rôle accompagné → 403

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles |

- **Préconditions :** Connecté en accompagné.
- **Données :** GET /api/dossiers/1
- **Étapes :**
  1. GET /:id en accompagné
- **Résultat attendu :** 403 { error: 'Accès refusé' }
- **Traçabilité :** requireRole('accompagnateur') · GET /api/dossiers/:id
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-019 — Synthèse JSON du dossier (nominal)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | test du contrat |

- **Préconditions :** Connecté en accompagnateur propriétaire d'un dossier avec questionnaire (cr_recap), sessions/réponses, actions, RDV.
- **Données :** GET /api/dossiers/:id/synthese
- **Étapes :**
  1. GET /api/dossiers/<id>/synthese
- **Résultat attendu :** 200 ; { titre (défaut 'Dossier d'accompagnement' si null), accompagne, statut, creeLe, editeLe (ISO du moment), contexte (défaut '—'), questionnaire {cr_recap,complete_le}|null, entretiens[] avec reponses{phase,texte}, actions[], rdvs[], synthese }.
- **Traçabilité :** synthese · GET /api/dossiers/:id/synthese
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-020 — Synthèse JSON dossier : non-propriétaire → 404

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles (propriété) |

- **Préconditions :** Accompagnateur non propriétaire.
- **Données :** GET /api/dossiers/:id/synthese (dossier d'autrui)
- **Étapes :**
  1. GET /:id/synthese sur dossier non possédé
- **Résultat attendu :** 404 { error: 'Dossier introuvable' }
- **Traçabilité :** owns() · GET /api/dossiers/:id/synthese
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-021 — Clôturer la démarche avec synthèse finale (nominal)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat |

- **Préconditions :** Connecté en accompagnateur propriétaire d'un dossier en_cours.
- **Données :** POST /api/dossiers/:id/cloturer { synthese:'Beau parcours, autonomie acquise.' }
- **Étapes :**
  1. POST /:id/cloturer avec texte de synthèse
- **Résultat attendu :** 200 { ok:true } ; dossier.statut='cloture' et dossier.synthese=texte ; une notification est créée pour l'accompagné.
- **Traçabilité :** synthese · POST /api/dossiers/:id/cloturer
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-022 — Clôturer sans synthèse (synthese null accepté)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | partition d'équivalence (valeur facultative absente) |

- **Préconditions :** Accompagnateur propriétaire d'un dossier en_cours.
- **Données :** POST /api/dossiers/:id/cloturer {} (corps sans champ synthese)
- **Étapes :**
  1. POST /:id/cloturer sans champ synthese
- **Résultat attendu :** 200 { ok:true } ; statut='cloture' ; synthese=NULL (req.body.synthese != null faux → null).
- **Traçabilité :** synthese · POST /api/dossiers/:id/cloturer
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-023 — Clôturer : non-propriétaire → 404

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles (propriété) |

- **Préconditions :** Accompagnateur non propriétaire.
- **Données :** POST /api/dossiers/:id/cloturer (dossier d'autrui)
- **Étapes :**
  1. POST /:id/cloturer sur dossier non possédé
- **Résultat attendu :** 404 { error: 'Dossier introuvable' } ; aucune modification.
- **Traçabilité :** owns() · POST /api/dossiers/:id/cloturer
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-024 — Clôturer : rôle accompagné → 403

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles |

- **Préconditions :** Connecté en accompagné.
- **Données :** POST /api/dossiers/1/cloturer { synthese:'x' }
- **Étapes :**
  1. POST /:id/cloturer en accompagné
- **Résultat attendu :** 403 { error: 'Accès refusé' }
- **Traçabilité :** requireRole('accompagnateur') · POST /api/dossiers/:id/cloturer
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-025 — Rouvrir un dossier clôturé (nominal)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | table de décision (transition statut) |

- **Préconditions :** Accompagnateur propriétaire d'un dossier statut='cloture'.
- **Données :** POST /api/dossiers/:id/rouvrir
- **Étapes :**
  1. Clôturer un dossier
  2. POST /:id/rouvrir
- **Résultat attendu :** 200 { ok:true } ; dossier.statut repasse à 'en_cours' (la synthèse finale saisie reste inchangée).
- **Traçabilité :** synthese · POST /api/dossiers/:id/rouvrir
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-026 — Rouvrir : non-propriétaire → 404

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles (propriété) |

- **Préconditions :** Accompagnateur non propriétaire.
- **Données :** POST /api/dossiers/:id/rouvrir (dossier d'autrui)
- **Étapes :**
  1. POST /:id/rouvrir sur dossier non possédé
- **Résultat attendu :** 404 { error: 'Dossier introuvable' }
- **Traçabilité :** owns() · POST /api/dossiers/:id/rouvrir
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-027 — Cycle clôturer puis rouvrir (non-régression d'état)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | non-regression | moyenne | transition d'états |

- **Préconditions :** Accompagnateur propriétaire, dossier en_cours.
- **Données :** POST /cloturer puis /rouvrir puis GET /:id
- **Étapes :**
  1. Clôturer
  2. Rouvrir
  3. GET /:id
- **Résultat attendu :** Après le cycle statut='en_cours' ; aucune perte de sessions/actions/RDV ; deux notifications cohérentes émises côté accompagné (clôture).
- **Traçabilité :** synthese · POST /api/dossiers/:id/cloturer + /rouvrir
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-028 — Grille statique d'auto-évaluation (nominal)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat |

- **Préconditions :** Connecté en accompagnateur.
- **Données :** GET /api/autoeval/grille
- **Étapes :**
  1. GET /api/autoeval/grille
- **Résultat attendu :** 200 { criteres:[3 critères], zones:[4 zones] } ; 3 critères × 7 indicateurs = 21 indicateurs au total ; chaque critère a id,titre,resume,indicateurs[{id,texte}] ; zones ordonnées min 0/25/50/75 (Émergent/En développement/Maîtrisé/Expert).
- **Traçabilité :** auto_evaluation · GET /api/autoeval/grille
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-029 — Grille : rôle accompagné → 403

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles |

- **Préconditions :** Connecté en accompagné.
- **Données :** GET /api/autoeval/grille
- **Étapes :**
  1. GET /api/autoeval/grille en accompagné
- **Résultat attendu :** 403 { error: 'Accès refusé' }
- **Traçabilité :** requireRole('accompagnateur') · GET /api/autoeval/grille
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-030 — Grille : non authentifié → 401

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | basse | test basé sur les rôles |

- **Préconditions :** Sans cookie.
- **Données :** GET /api/autoeval/grille
- **Étapes :**
  1. GET sans session
- **Résultat attendu :** 401 { error: 'Non authentifié' }
- **Traçabilité :** requireAuth · GET /api/autoeval/grille
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-031 — Charger l'auto-évaluation courante crée un brouillon (nominal)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat |

- **Préconditions :** Accompagnateur propriétaire d'un dossier sans auto-évaluation existante.
- **Données :** GET /api/autoeval/:id
- **Étapes :**
  1. GET /api/autoeval/<id possédé>
- **Résultat attendu :** 200 ; { eval:{ id, statut:'brouillon', note_globale (null si vierge), commentaire_global, analyse_questions, maj_le, scores } , historique:[] } ; scores contient les 21 clés d'indicateurs initialisées {score:null,commentaire:null} ; un brouillon est créé si absent.
- **Traçabilité :** auto_evaluation · GET /api/autoeval/:id (getOrCreateDraft)
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-032 — Charger auto-évaluation : non-propriétaire → 404

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles (propriété) |

- **Préconditions :** Accompagnateur non propriétaire.
- **Données :** GET /api/autoeval/:id (dossier d'autrui)
- **Étapes :**
  1. GET /api/autoeval/<dossier non possédé>
- **Résultat attendu :** 404 { error: 'Dossier introuvable' }
- **Traçabilité :** owns() · GET /api/autoeval/:id
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-033 — Enregistrer le brouillon avec scores valides (nominal + note)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat + valeurs limites (calcul note) |

- **Préconditions :** Accompagnateur propriétaire ; brouillon existant.
- **Données :** POST /api/autoeval/:id { scores:[{indicateur:'1.1',score:80,commentaire:'ok'},{indicateur:'2.1',score:60,commentaire:null}], commentaire_global:'Forces…', analyse_questions:'Questions ouvertes…' }
- **Étapes :**
  1. POST /api/autoeval/<id> avec 2 scores
- **Résultat attendu :** 200 { ok:true, note_globale: 1.4 } ; note = round((80+60)/2/5*10)/10 = 1.4 ; relecture GET /:id renvoie les scores upsertés et commentaires globaux persistés.
- **Traçabilité :** auto_evaluation · POST /api/autoeval/:id
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-034 — Enregistrer : clamp des scores hors bornes [0,100]

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | haute | valeurs limites (clamp) |

- **Préconditions :** Accompagnateur propriétaire ; brouillon existant.
- **Données :** POST /api/autoeval/:id { scores:[{indicateur:'1.1',score:150},{indicateur:'1.2',score:-20},{indicateur:'1.3',score:0},{indicateur:'1.4',score:100}] }
- **Étapes :**
  1. Enregistrer des scores hors bornes et aux limites
- **Résultat attendu :** 200 ; après relecture 1.1=100, 1.2=0, 1.3=0, 1.4=100 (clampScore borne à [0,100]).
- **Traçabilité :** auto_evaluation · clampScore · POST /api/autoeval/:id
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-035 — Enregistrer : score non numérique/NaN/Infinity → null

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | partition d'équivalence (classe invalide) |

- **Préconditions :** Accompagnateur propriétaire ; brouillon.
- **Données :** POST /api/autoeval/:id { scores:[{indicateur:'1.1',score:'abc'},{indicateur:'1.2',score:null}] }
- **Étapes :**
  1. Enregistrer un score non-numérique et null
- **Résultat attendu :** 200 ; après relecture score 1.1=null et 1.2=null (clampScore renvoie null si non fini/non number) ; ces indicateurs ne comptent pas dans la moyenne.
- **Traçabilité :** auto_evaluation · clampScore · POST /api/autoeval/:id
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-036 — Enregistrer : indicateur inconnu ignoré

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | partition d'équivalence (filtrage liste blanche) |

- **Préconditions :** Accompagnateur propriétaire ; brouillon.
- **Données :** POST /api/autoeval/:id { scores:[{indicateur:'9.9',score:50},{indicateur:'1.1',score:50}] }
- **Étapes :**
  1. Enregistrer un indicateur hors des 21 + un valide
- **Résultat attendu :** 200 ; '9.9' n'est pas persisté (INDICATEUR_IDS.includes filtre) ; seul '1.1' est enregistré.
- **Traçabilité :** auto_evaluation · INDICATEUR_IDS · POST /api/autoeval/:id
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-037 — Enregistrer : corps sans scores (tableau vide accepté)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | basse | partition d'équivalence (valeur absente) |

- **Préconditions :** Accompagnateur propriétaire ; brouillon avec scores existants.
- **Données :** POST /api/autoeval/:id { commentaire_global:'maj' } (pas de tableau scores)
- **Étapes :**
  1. POST sans champ scores
- **Résultat attendu :** 200 { ok:true, note_globale } ; scores existants inchangés (scores=[] si non tableau) ; commentaire_global mis à jour.
- **Traçabilité :** auto_evaluation · POST /api/autoeval/:id
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-038 — Enregistrer : non-propriétaire → 404

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles (propriété) |

- **Préconditions :** Accompagnateur non propriétaire.
- **Données :** POST /api/autoeval/:id (dossier d'autrui)
- **Étapes :**
  1. POST /api/autoeval/<dossier non possédé>
- **Résultat attendu :** 404 { error: 'Dossier introuvable' } ; aucune écriture.
- **Traçabilité :** owns() · POST /api/autoeval/:id
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-039 — Note globale null quand aucun score numérique

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | moyenne | partition d'équivalence (ensemble vide) |

- **Préconditions :** Fonction computeNote isolée (ou via POST avec scores tous null).
- **Données :** map avec tous score=null OU aucun indicateur noté
- **Étapes :**
  1. Appeler computeNote sur une map sans valeur numérique
- **Résultat attendu :** computeNote renvoie null ; côté API note_globale=null.
- **Traçabilité :** auto_evaluation · computeNote()
- **Automatisation :** ⏳ à automatiser

### TC-DOSS-040 — Unitaire computeNote : moyenne /5 arrondie à 0,1

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | haute | valeurs limites + table de décision |

- **Préconditions :** Fonction computeNote isolée.
- **Données :** Cas A: {a:100} → 20/… attention : 100/5=20 → round(20*10)/10=20.0 ? (vérifier formule : avg/5 → 20) ; Cas B: {a:80,b:60} → avg=70, /5=14 → 14.0 ; Cas C: {a:55,b:60,c:65} → avg=60 → 12.0
- **Étapes :**
  1. Calculer computeNote sur jeux connus
- **Résultat attendu :** Résultat = Math.round(avg/5*10)/10 ; ex {80,60} → 14.0 ; {55,65}→ avg 60 → 12.0 ; arrondi au dixième.
- **Traçabilité :** auto_evaluation · computeNote()
- **Automatisation :** ⏳ à automatiser

### TC-DOSS-041 — Unitaire clampScore : partition et limites

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | haute | valeurs limites + partition d'équivalence |

- **Préconditions :** Fonction clampScore isolée.
- **Données :** -1→0 ; 0→0 ; 50→50 ; 100→100 ; 101→100 ; 'x'→null ; NaN→null ; Infinity→null ; null→null
- **Étapes :**
  1. Évaluer clampScore sur chaque valeur
- **Résultat attendu :** Bornes respectées [0,100] ; valeurs non finies/non-number → null.
- **Traçabilité :** auto_evaluation · clampScore()
- **Automatisation :** ⏳ à automatiser

### TC-DOSS-042 — Valider fige la version et crée un nouveau brouillon copié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | transition d'états + test du contrat |

- **Préconditions :** Accompagnateur propriétaire ; brouillon avec scores saisis.
- **Données :** POST /api/autoeval/:id/valider { scores:[…], commentaire_global, analyse_questions }
- **Étapes :**
  1. Saisir des scores
  2. POST /:id/valider
  3. GET /:id
- **Résultat attendu :** 200 { ok:true } ; l'ancien brouillon devient statut='validee' et apparaît dans historique ; un NOUVEAU brouillon est créé reprenant note_globale/commentaires et les scores copiés ; GET /:id renvoie le nouveau brouillon + historique contenant la version validée (note_globale, maj_le).
- **Traçabilité :** auto_evaluation · POST /api/autoeval/:id/valider
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-043 — Valider plusieurs fois : historique croissant et trié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | test du contrat (historisation) |

- **Préconditions :** Accompagnateur propriétaire.
- **Données :** Deux validations successives avec notes différentes
- **Étapes :**
  1. Saisir+valider (note A)
  2. Modifier+valider (note B)
  3. GET /:id
- **Résultat attendu :** historique contient 2 entrées triées par maj_le,id ; chaque entrée a id, note_globale, maj_le ; le brouillon courant est distinct des versions validées.
- **Traçabilité :** auto_evaluation · POST /api/autoeval/:id/valider
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-044 — Valider : non-propriétaire → 404

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles (propriété) |

- **Préconditions :** Accompagnateur non propriétaire.
- **Données :** POST /api/autoeval/:id/valider (dossier d'autrui)
- **Étapes :**
  1. POST /:id/valider sur dossier non possédé
- **Résultat attendu :** 404 { error: 'Dossier introuvable' } ; aucune version figée.
- **Traçabilité :** owns() · POST /api/autoeval/:id/valider
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-045 — Pré-remplissage IA grille : contrat de réponse disponible

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat (endpoint IA) |

- **Préconditions :** Accompagnateur propriétaire d'un dossier riche (questionnaire+entretiens+questions) ; ANTHROPIC_API_KEY configurée et service joignable.
- **Données :** POST /api/autoeval/:id/ia
- **Étapes :**
  1. POST /api/autoeval/<id possédé>/ia
- **Résultat attendu :** 200 { available:true, scores:[...], commentaire_global:string, analyse_questions:string } ; chaque score a indicateur ∈ 21 IDs, score ∈ [0,100]|null (clampé), commentaire string|null ; ne sauvegarde RIEN en base (GET /:id du brouillon inchangé). NE PAS figer le texte.
- **Traçabilité :** auto_evaluation · POST /api/autoeval/:id/ia
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-046 — Pré-remplissage IA : repli déterministe sans clé API

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat (branche de repli) |

- **Préconditions :** ANTHROPIC_API_KEY absente (ou service injoignable / réponse non-ok).
- **Données :** POST /api/autoeval/:id/ia
- **Étapes :**
  1. Configurer l'environnement sans clé
  2. POST /:id/ia
- **Résultat attendu :** 200 { available:false, message:"L'assistant IA n'est pas disponible (clé API absente ou service injoignable)." } ; aucune exception ; aucune écriture.
- **Traçabilité :** auto_evaluation · suggererGrille() repli · POST /api/autoeval/:id/ia
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-047 — Unitaire : filtrage des scores IA (indicateurs valides + clamp)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | moyenne | partition d'équivalence + valeurs limites |

- **Préconditions :** Fonction suggererGrille / parsing isolé ; réponse IA simulée contenant un indicateur hors-liste et des scores hors bornes.
- **Données :** JSON IA simulé { scores:[{indicateur:'1.1',score:120},{indicateur:'X',score:50}], commentaire_global:'…', analyse_questions:'…' }
- **Étapes :**
  1. Fournir la réponse IA simulée au parseur
- **Résultat attendu :** Seuls les indicateurs ∈ INDICATEUR_IDS sont conservés ; scores clampés [0,100] (120→100) ; commentaire_global/analyse_questions par défaut '' si absents.
- **Traçabilité :** auto_evaluation · suggererGrille() (parsing)
- **Automatisation :** ⏳ à automatiser

### TC-DOSS-048 — Pré-remplissage IA : non-propriétaire → 404

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles (propriété) |

- **Préconditions :** Accompagnateur non propriétaire.
- **Données :** POST /api/autoeval/:id/ia (dossier d'autrui)
- **Étapes :**
  1. POST /:id/ia sur dossier non possédé
- **Résultat attendu :** 404 { error: 'Dossier introuvable' }
- **Traçabilité :** owns() · POST /api/autoeval/:id/ia
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-049 — Endpoints autoeval : rôle accompagné → 403

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles |

- **Préconditions :** Connecté en accompagné.
- **Données :** GET /api/autoeval/:id ; POST /api/autoeval/:id ; POST /:id/valider ; POST /:id/ia
- **Étapes :**
  1. Appeler chaque endpoint autoeval en accompagné
- **Résultat attendu :** 403 { error: 'Accès refusé' } sur tous (requireRole('accompagnateur')).
- **Traçabilité :** requireRole('accompagnateur') · /api/autoeval/*
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-050 — Générer la synthèse (nominal, 201, nouvelle version)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat (endpoint IA, sans figer le texte) |

- **Préconditions :** Accompagnateur propriétaire d'un dossier ; clé API présente OU absente (les deux acceptés par contrat).
- **Données :** POST /api/synthese/generer { dossierId:<possédé> }
- **Étapes :**
  1. POST /api/synthese/generer
- **Résultat attendu :** 201 { id, version:(latest+1), contenu_html:non vide (HTML), source:'ia', publie:0 } ; une ligne syntheses est créée ; version s'incrémente à chaque appel.
- **Traçabilité :** synthese · POST /api/synthese/generer
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-051 — Générer : dossierId d'autrui/inexistant → 404

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles (propriété) |

- **Préconditions :** Accompagnateur ; dossierId non possédé ou inexistant.
- **Données :** POST /api/synthese/generer { dossierId:<autrui ou 999999> }
- **Étapes :**
  1. POST /generer avec dossierId non possédé
- **Résultat attendu :** 404 { error: 'Dossier introuvable' } ; aucune version créée.
- **Traçabilité :** synthese · dossierInfo+accompagnateur_id · POST /api/synthese/generer
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-052 — Générer : rôle accompagné → 403

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles |

- **Préconditions :** Connecté en accompagné.
- **Données :** POST /api/synthese/generer { dossierId:<le sien> }
- **Étapes :**
  1. POST /generer en accompagné
- **Résultat attendu :** 403 { error: 'Accès refusé' }
- **Traçabilité :** requireRole('accompagnateur') · POST /api/synthese/generer
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-053 — Unitaire repli déterministe syntheseToHtml : structure et fidélité

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | haute | test du contrat (repli déterministe) |

- **Préconditions :** Fonction syntheseToHtml isolée avec un SyntheseData connu (accompagné, contexte, 2 entretiens, actions, RDV, synthèse).
- **Données :** SyntheseData renseigné
- **Étapes :**
  1. Appeler syntheseToHtml(data)
- **Résultat attendu :** HTML contenant les 6 sections (1. Contexte, 2. Questionnaire initial, 3. Entretiens, 4. Plan d'action, 5. Rendez-vous, 6. Synthèse finale) ; entretiens et actions reflètent les données ; section synthèse = 'Démarche en cours.' si statut≠cloture et synthese null.
- **Traçabilité :** synthese · syntheseToHtml()
- **Automatisation :** ⏳ à automatiser

### TC-DOSS-054 — Unitaire esc() : échappement HTML anti-injection

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | validation | haute | test de validation (échappement) |

- **Préconditions :** Fonction esc/syntheseToHtml isolée ; contexte contenant '<script>alert(1)</script> & "x"'.
- **Données :** contexte = '<script>alert(1)</script> & test'
- **Étapes :**
  1. Générer le HTML de repli avec ce contexte
- **Résultat attendu :** '&' → '&amp;', '<' → '&lt;', '>' → '&gt;' dans la sortie ; aucune balise script active injectée.
- **Traçabilité :** synthese · esc()/parasHtml()
- **Automatisation :** ⏳ à automatiser

### TC-DOSS-055 — Unitaire frDate() : formatage et cas limites

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | moyenne | valeurs limites + partition d'équivalence |

- **Préconditions :** Fonction frDate isolée.
- **Données :** '' → '—' ; '2026-06-12' → '12/06/2026' ; '2026-06-12T14:30:00' → '12/06/2026 à 14:30' ; chaîne non ISO → renvoyée telle quelle
- **Étapes :**
  1. Évaluer frDate sur chaque entrée
- **Résultat attendu :** Conforme : vide→'—', date seule→jj/mm/aaaa, datetime→'jj/mm/aaaa à hh:mm', format inattendu→valeur d'origine.
- **Traçabilité :** synthese · frDate()
- **Automatisation :** ⏳ à automatiser

### TC-DOSS-056 — État synthèse côté accompagnateur (courant + historique)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat (réponse selon rôle) |

- **Préconditions :** Accompagnateur propriétaire ayant généré ≥2 versions.
- **Données :** GET /api/synthese/dossier/:id
- **Étapes :**
  1. Générer 2 versions
  2. GET /synthese/dossier/<id>
- **Résultat attendu :** 200 { role:'accompagnateur', doc:(latest), versions:[...] triées version DESC, chaque version a id,version,source,genere_le,publie }.
- **Traçabilité :** synthese · GET /api/synthese/dossier/:id
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-057 — État synthèse côté accompagné : version publiée seule

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | table de décision (rôle × publication) |

- **Préconditions :** Accompagné propriétaire ; une synthèse a été publiée par l'accompagnateur.
- **Données :** GET /api/synthese/dossier/:id
- **Étapes :**
  1. GET /synthese/dossier/<id> en accompagné après publication
- **Résultat attendu :** 200 { role:'accompagne', doc:{ id,version,contenu_html,genere_le,publie:1 }, versions:[] } ; si aucune publication, doc:null.
- **Traçabilité :** synthese · GET /api/synthese/dossier/:id
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-058 — État synthèse : accès non autorisé (ni acc ni accompagné) → 404

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles (propriété mixte) |

- **Préconditions :** Utilisateur tiers (autre accompagné/accompagnateur non lié au dossier).
- **Données :** GET /api/synthese/dossier/:id (dossier d'autrui)
- **Étapes :**
  1. GET /synthese/dossier/<id non lié>
- **Résultat attendu :** 404 { error: 'Dossier introuvable' } (canAccess faux).
- **Traçabilité :** synthese · canAccess · GET /api/synthese/dossier/:id
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-059 — Lire une version archivée (propriétaire)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | test du contrat |

- **Préconditions :** Accompagnateur propriétaire ; ≥1 version existante.
- **Données :** GET /api/synthese/version/:id
- **Étapes :**
  1. GET /synthese/version/<id de version possédée>
- **Résultat attendu :** 200 { doc:{ id, version, contenu_html } }.
- **Traçabilité :** synthese · GET /api/synthese/version/:id
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-060 — Lire une version : version d'un dossier d'autrui → 404

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles (propriété via jointure) |

- **Préconditions :** Accompagnateur non propriétaire du dossier de la version.
- **Données :** GET /api/synthese/version/:id (version liée à un dossier d'autrui)
- **Étapes :**
  1. GET /synthese/version/<id d'autrui>
- **Résultat attendu :** 404 { error: 'Introuvable' } (v.accompagnateur_id ≠ me.id).
- **Traçabilité :** synthese · GET /api/synthese/version/:id
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-061 — Lire une version : rôle accompagné → 403

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | basse | test basé sur les rôles |

- **Préconditions :** Connecté en accompagné.
- **Données :** GET /api/synthese/version/1
- **Étapes :**
  1. GET /synthese/version/1 en accompagné
- **Résultat attendu :** 403 { error: 'Accès refusé' }
- **Traçabilité :** requireRole('accompagnateur') · GET /api/synthese/version/:id
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-062 — Éditer la version courante (PATCH, nominal)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat |

- **Préconditions :** Accompagnateur propriétaire ; doc courant existant.
- **Données :** PATCH /api/synthese/version/:id { contenu_html:'<h2>Édité</h2><p>…</p>' }
- **Étapes :**
  1. PATCH la version courante avec nouveau HTML
- **Résultat attendu :** 200 { ok:true } ; relecture: contenu_html mis à jour, source devient 'edition' ; statut publié inchangé.
- **Traçabilité :** synthese · PATCH /api/synthese/version/:id
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-063 — Éditer une version NON courante → 400

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | haute | table de décision (latest vs archivée) |

- **Préconditions :** Accompagnateur propriétaire ; ≥2 versions, on cible une version archivée (pas la plus récente).
- **Données :** PATCH /api/synthese/version/:id (id d'une version non-latest)
- **Étapes :**
  1. Générer v1 puis v2
  2. PATCH sur v1
- **Résultat attendu :** 400 { error: 'Seule la version courante est modifiable.' } ; v1 inchangée.
- **Traçabilité :** synthese · PATCH /api/synthese/version/:id
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-064 — Éditer : version d'autrui → 404

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles (propriété) |

- **Préconditions :** Accompagnateur non propriétaire.
- **Données :** PATCH /api/synthese/version/:id (dossier d'autrui)
- **Étapes :**
  1. PATCH une version d'un dossier non possédé
- **Résultat attendu :** 404 { error: 'Introuvable' }
- **Traçabilité :** synthese · PATCH /api/synthese/version/:id
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-065 — Publier une version (nominal, unicité du publié)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | table de décision (exclusivité) + test du contrat |

- **Préconditions :** Accompagnateur propriétaire ; ≥1 version, idéalement une déjà publiée.
- **Données :** POST /api/synthese/version/:id/publier
- **Étapes :**
  1. Publier v1
  2. Publier v2
  3. GET /synthese/dossier/:id
- **Résultat attendu :** 200 { ok:true } ; après publication de v2, v2.publie=1 avec publie_le renseigné et TOUTES les autres versions du dossier publie=0/publie_le=NULL (une seule publiée) ; notification créée pour l'accompagné.
- **Traçabilité :** synthese · POST /api/synthese/version/:id/publier
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-066 — Publier : version d'autrui → 404

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles (propriété) |

- **Préconditions :** Accompagnateur non propriétaire.
- **Données :** POST /api/synthese/version/:id/publier (dossier d'autrui)
- **Étapes :**
  1. Publier une version d'un dossier non possédé
- **Résultat attendu :** 404 { error: 'Introuvable' } ; rien publié, pas de notification.
- **Traçabilité :** synthese · POST /api/synthese/version/:id/publier
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-067 — Publier : rôle accompagné → 403

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | basse | test basé sur les rôles |

- **Préconditions :** Connecté en accompagné.
- **Données :** POST /api/synthese/version/1/publier
- **Étapes :**
  1. POST publier en accompagné
- **Résultat attendu :** 403 { error: 'Accès refusé' }
- **Traçabilité :** requireRole('accompagnateur') · POST /api/synthese/version/:id/publier
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-068 — Synthèses publiées de l'accompagné (mine)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | test du contrat |

- **Préconditions :** Accompagné (Amine) avec une synthèse publiée sur au moins un dossier.
- **Données :** GET /api/synthese/mine
- **Étapes :**
  1. GET /api/synthese/mine en accompagné
- **Résultat attendu :** 200 { syntheses:[{ id, dossier_id, publie_le, dossier_titre }] } triées publie_le DESC ; uniquement les publie=1 des dossiers de l'accompagné ; une par dossier.
- **Traçabilité :** synthese · GET /api/synthese/mine
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-069 — Synthèses mine : rôle accompagnateur → 403

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | basse | test basé sur les rôles |

- **Préconditions :** Connecté en accompagnateur.
- **Données :** GET /api/synthese/mine
- **Étapes :**
  1. GET /synthese/mine en accompagnateur
- **Résultat attendu :** 403 { error: 'Accès refusé' }
- **Traçabilité :** requireRole('accompagne') · GET /api/synthese/mine
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-070 — Discussion synthèse : accompagné bloqué tant que non publiée → 404

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | table de décision (rôle × publication) |

- **Préconditions :** Accompagné propriétaire d'un dossier SANS synthèse publiée.
- **Données :** GET /api/synthese/dossier/:id/messages ; POST .../messages { texte:'Bonjour' }
- **Étapes :**
  1. S'assurer qu'aucune synthèse n'est publiée
  2. GET puis POST messages en accompagné
- **Résultat attendu :** 404 { error: 'Discussion indisponible' } sur GET et POST (canDiscuss: accompagné requiert published).
- **Traçabilité :** synthese · canDiscuss · /api/synthese/dossier/:id/messages
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-071 — Discussion synthèse : accompagnateur autorisé même non publié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | table de décision (accompagnateur toujours autorisé) |

- **Préconditions :** Accompagnateur propriétaire ; synthèse non encore publiée.
- **Données :** POST /api/synthese/dossier/:id/messages { texte:'Note interne' } puis GET
- **Étapes :**
  1. POST un message en accompagnateur (non publié)
  2. GET les messages
- **Résultat attendu :** POST 201 { id } ; GET 200 { messages:[...] } avec is_me=true pour l'auteur ; une notification est créée pour l'accompagné.
- **Traçabilité :** synthese · canDiscuss · POST /api/synthese/dossier/:id/messages
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-072 — Discussion : accompagné autorisé après publication (échange complet)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat (flux bout-en-bout API) |

- **Préconditions :** Synthèse publiée sur le dossier ; accompagné propriétaire.
- **Données :** POST .../messages { texte:'Merci pour cette synthèse' } puis GET
- **Étapes :**
  1. Publier la synthèse (accompagnateur)
  2. POST un message (accompagné)
  3. GET les messages
- **Résultat attendu :** POST 201 { id } ; GET 200 ; messages ordonnés cree_le,id ASC ; champ is_me correct selon l'appelant ; auteur_prenom/auteur_role exposés ; notification créée pour l'accompagnateur.
- **Traçabilité :** synthese · /api/synthese/dossier/:id/messages
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-073 — Discussion : message vide → 400

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | partition d'équivalence (entrée vide) + valeurs limites |

- **Préconditions :** Discussion autorisée (accompagnateur, ou accompagné avec synthèse publiée).
- **Données :** POST .../messages { texte:'   ' } et { } (sans texte)
- **Étapes :**
  1. POST un message vide ou composé d'espaces
- **Résultat attendu :** 400 { error: 'Message vide' } (trim côté serveur) ; aucun message inséré, aucune notification.
- **Traçabilité :** synthese · POST /api/synthese/dossier/:id/messages
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-074 — Discussion : tiers non lié au dossier → 404

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles (isolation) |

- **Préconditions :** Utilisateur ni accompagnateur ni accompagné du dossier.
- **Données :** GET/POST /api/synthese/dossier/:id/messages (dossier d'autrui)
- **Étapes :**
  1. Appeler messages sur un dossier non lié
- **Résultat attendu :** 404 { error: 'Discussion indisponible' } (canAccess faux).
- **Traçabilité :** synthese · canAccess/canDiscuss · /api/synthese/dossier/:id/messages
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-075 — Endpoints messages/dossier synthese : non authentifié → 401

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | basse | test basé sur les rôles |

- **Préconditions :** Sans cookie.
- **Données :** GET /api/synthese/dossier/:id ; GET /:id/messages ; POST /:id/messages
- **Étapes :**
  1. Appeler chaque endpoint sans session
- **Résultat attendu :** 401 { error: 'Non authentifié' }
- **Traçabilité :** requireAuth · /api/synthese/dossier/:id(+/messages)
- **Automatisation :** ✅ api/dossier.test.ts

### TC-DOSS-076 — UI accompagné : démarrer un nouveau parcours bout-en-bout

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test du contrat (parcours utilisateur) |

- **Préconditions :** Connecté en accompagné sur http://localhost:8080 ; ≥1 accompagnateur disponible.
- **Données :** Page /nouveau-parcours
- **Étapes :**
  1. Aller sur Mon espace, cliquer '+ Démarrer un nouveau parcours'
  2. Saisir un titre
  3. Choisir un accompagnateur dans la liste
  4. Cliquer 'Démarrer et remplir le questionnaire'
- **Résultat attendu :** Redirection vers /questionnaire?dossier=<id> ; le nouveau parcours apparaît ensuite dans 'Mes parcours' avec badge 'Questionnaire à faire'.
- **Traçabilité :** multi_parcours · NouveauParcours.tsx + POST /api/dossiers/start
- **Automatisation :** ⏳ à automatiser

### TC-DOSS-077 — UI accompagné : titre vide ou aucun accompagnateur bloque la soumission

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | validation | moyenne | partition d'équivalence (formulaire) |

- **Préconditions :** Connecté en accompagné.
- **Données :** Page /nouveau-parcours
- **Étapes :**
  1. Laisser le titre vide et soumettre
  2. (Variante) cas où aucun accompagnateur n'est disponible
- **Résultat attendu :** Message 'Renseigne un titre et choisis un accompagnateur.' ; le bouton est désactivé si accs.length===0 ; aucune navigation.
- **Traçabilité :** multi_parcours · NouveauParcours.tsx
- **Automatisation :** ⏳ à automatiser

### TC-DOSS-078 — UI accompagné : liste 'Mes parcours' avec badges et état vide

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | test du contrat (rendu liste) |

- **Préconditions :** Connecté en accompagné.
- **Données :** Composant MesParcours (page Espace)
- **Étapes :**
  1. Ouvrir Mon espace
  2. Observer les cartes parcours
- **Résultat attendu :** Chaque carte affiche titre, accompagnateur, statut (En cours/Clôturé), badges (Questionnaire, n comptes rendus, Synthèse ✓) ; si aucun parcours, message d'invitation à démarrer ; bouton 'Ouvrir le parcours' → /parcours/:id.
- **Traçabilité :** multi_parcours · MesParcours.tsx + GET /api/dossiers/mine
- **Automatisation :** ⏳ à automatiser

### TC-DOSS-079 — UI accompagné : détail parcours lecture seule (ParcoursDetail)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | test du contrat (rendu détail) |

- **Préconditions :** Accompagné propriétaire d'un parcours avec questionnaire, CR publié, RDV.
- **Données :** Page /parcours/:id
- **Étapes :**
  1. Ouvrir un parcours depuis Mes parcours
- **Résultat attendu :** Affiche boussole/progression, questionnaire (ou bouton 'Remplir le questionnaire'), CR publiés, RDV, état synthèse ; bouton synthèse ouvre SyntheseModal en rôle accompagné.
- **Traçabilité :** multi_parcours · ParcoursDetail.tsx + GET /api/dossiers/mine/:id
- **Automatisation :** ⏳ à automatiser

### TC-DOSS-080 — UI accompagnateur : clôturer puis rouvrir un dossier

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | transition d'états (UI) |

- **Préconditions :** Connecté en accompagnateur propriétaire d'un dossier en_cours (page /dossier/:id).
- **Données :** Section clôture de Dossier.tsx
- **Étapes :**
  1. Saisir une synthèse finale (facultatif)
  2. Cliquer 'Clôturer la démarche'
  3. Observer le badge 'Clôturé'
  4. Cliquer 'Rouvrir le dossier'
- **Résultat attendu :** Après clôture: badge 'Clôturé', synthèse finale affichée en lecture seule, bouton 'Rouvrir le dossier' présent ; après réouverture: badge 'En cours', zone de saisie de synthèse de nouveau éditable.
- **Traçabilité :** synthese · Dossier.tsx + POST /api/dossiers/:id/cloturer + /rouvrir
- **Automatisation :** ⏳ à automatiser

### TC-DOSS-081 — UI accompagnateur : remplir et valider la grille d'auto-évaluation

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test du contrat (parcours UI) |

- **Préconditions :** Connecté en accompagnateur propriétaire ; page /dossier/:id/autoeval (AutoEvaluation.tsx).
- **Données :** Grille 21 indicateurs
- **Étapes :**
  1. Régler plusieurs curseurs (GradientSlider)
  2. Saisir des commentaires
  3. Cliquer '💾 Enregistrer'
  4. Cliquer '✓ Valider cette version'
- **Résultat attendu :** Jauge 'Score global' et radar par critère se mettent à jour ; compteur 'x/21 notés' et note globale cohérents ; message 'Enregistré ✅' puis 'Version validée et archivée dans l'historique ✅' ; après validation un nouveau brouillon repart.
- **Traçabilité :** auto_evaluation · AutoEvaluation.tsx + POST /api/autoeval/:id(+/valider)
- **Automatisation :** ⏳ à automatiser

### TC-DOSS-082 — UI accompagnateur : pré-remplissage IA de la grille (confirmation + badges)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | test du contrat (UI IA) + table de décision (confirmation) |

- **Préconditions :** Connecté en accompagnateur propriétaire ; dossier avec données ; clé API présente.
- **Données :** Bouton '✨ Pré-remplir avec l'IA'
- **Étapes :**
  1. Saisir au préalable un score
  2. Cliquer 'Pré-remplir avec l'IA'
  3. Confirmer le remplacement dans la boîte de dialogue
  4. Attendre la fin de l'animation AiProgress
- **Résultat attendu :** Confirmation demandée si saisie existante ; les curseurs/commentaires se peuplent ; badge '✨ suggéré par l'IA' sur les indicateurs proposés ; commentaire global et analyse des questions renseignés ; rien n'est sauvegardé tant que l'utilisateur n'enregistre/valide pas. Ne pas figer le texte généré.
- **Traçabilité :** auto_evaluation · AutoEvaluation.tsx + POST /api/autoeval/:id/ia
- **Automatisation :** ⏳ à automatiser

### TC-DOSS-083 — UI accompagnateur : IA indisponible affiche un message non bloquant

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | basse | test du contrat (branche de repli UI) |

- **Préconditions :** Clé API absente côté serveur ; accompagnateur sur la grille.
- **Données :** Bouton '✨ Pré-remplir avec l'IA'
- **Étapes :**
  1. Cliquer 'Pré-remplir avec l'IA'
- **Résultat attendu :** Message d'indisponibilité affiché (r.message) ; la grille reste saisissable manuellement ; aucune erreur bloquante.
- **Traçabilité :** auto_evaluation · AutoEvaluation.tsx (available:false)
- **Automatisation :** ⏳ à automatiser

### TC-DOSS-084 — UI accompagnateur : générer, éditer, publier la synthèse

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test du contrat (parcours UI versions) |

- **Préconditions :** Connecté en accompagnateur propriétaire ; SyntheseModal ouverte depuis /dossier/:id.
- **Données :** SyntheseModal role=accompagnateur
- **Étapes :**
  1. Cliquer '✨ Générer la synthèse (IA)'
  2. Cliquer '✎ Éditer' et modifier le contenu, Enregistrer
  3. Cliquer '📣 Publier'
- **Résultat attendu :** Après génération: badge '• Brouillon', contenu HTML affiché ; après édition+enregistrement: badge éditée, contenu mis à jour ; après publication: badge '✓ Publiée' et message 'Synthèse publiée — l'accompagné peut la consulter.' ; l'historique liste les versions.
- **Traçabilité :** synthese · SyntheseModal.tsx + /api/synthese/*
- **Automatisation :** ⏳ à automatiser

### TC-DOSS-085 — UI : discussion de synthèse entre accompagnateur et accompagné

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test du contrat (collaboration bout-en-bout) |

- **Préconditions :** Synthèse publiée ; deux sessions (accompagnateur et accompagné).
- **Données :** Section '💬 Échanges' de SyntheseModal
- **Étapes :**
  1. Accompagnateur: ouvrir la synthèse, écrire un message, Envoyer
  2. Accompagné: ouvrir sa synthèse publiée, lire le message, répondre, Envoyer
  3. Accompagnateur: recharger et lire la réponse
- **Résultat attendu :** Les messages s'affichent dans l'ordre chronologique, alignés selon is_me ; chaque partie reçoit une notification ; côté accompagné la discussion n'est disponible qu'après publication (sinon message d'attente côté accompagnateur 'visible une fois publiée').
- **Traçabilité :** synthese · SyntheseModal.tsx + /api/synthese/dossier/:id/messages
- **Automatisation :** ⏳ à automatiser

## Domaine RELEMERG — 100 cas

**Endpoints couverts :**

- `POST /api/relationnel/meteo` · feature: `meteo (gating client uniquement, pas requireFeature serveur)` · rôle: accompagne|accompagnateur — Enregistre un relevé de météo intérieure (niveau 1-5 + mot facultatif) sur un dossier dont on est accompagné ou accompagnateur
- `GET /api/relationnel/meteo/dossier/:id` · feature: `meteo (gating client)` · rôle: accompagne|accompagnateur — Liste la météo : accompagné voit la sienne ; accompagnateur voit ses propres relevés privés + ceux de l'accompagné
- `POST /api/relationnel/journal` · feature: `journal (gating client)` · rôle: accompagne — Crée une note de micro-journal (privée ou partagée) — réservé à l'accompagné propriétaire du dossier
- `GET /api/relationnel/journal/dossier/:id` · feature: `journal (gating client)` · rôle: accompagne|accompagnateur — Liste les notes : accompagné voit toutes les siennes ; accompagnateur voit uniquement les notes partagées
- `PATCH /api/relationnel/journal/:id` · feature: `journal (gating client)` · rôle: accompagne — Modifie le texte et/ou le partage d'une note dont on est l'auteur accompagné
- `DELETE /api/relationnel/journal/:id` · feature: `journal (gating client)` · rôle: accompagne — Supprime une note dont on est l'auteur accompagné
- `POST /api/emergence/dossier/:did/banque` · feature: `banque_questions (IA contrat — pas de requireFeature serveur)` · rôle: accompagnateur — Génère (IA ou repli) la banque de questions par phase pour un dossier possédé, persistée en upsert
- `GET /api/emergence/dossier/:did/banque` · feature: `banque_questions` · rôle: accompagnateur — Relit la banque de questions persistée d'un dossier possédé (null si absente)
- `POST /api/emergence/dossier/:did/fil-rouge` · feature: `fil_rouge (IA contrat)` · rôle: accompagnateur — Fait émerger (IA ou repli) le fil rouge du mémoire, persisté en upsert ; renvoie fil/axes/explication + partage + source
- `GET /api/emergence/dossier/:did/fil-rouge` · feature: `fil_rouge` · rôle: accompagnateur — Relit le fil rouge persisté d'un dossier possédé (null si absent)
- `PATCH /api/emergence/dossier/:did/fil-rouge/partage` · feature: `fil_rouge` · rôle: accompagnateur — Active/désactive le partage du fil rouge avec l'accompagné
- `POST /api/emergence/session/:sid/moments` · feature: `moments_cles (IA contrat)` · rôle: accompagnateur — Génère (IA ou repli) les moments-clés d'un entretien possédé, persistés en upsert (1 par session)
- `GET /api/emergence/session/:sid/moments` · feature: `moments_cles` · rôle: accompagnateur — Relit les moments-clés persistés d'un entretien possédé (null si absent)
- `PATCH /api/emergence/session/:sid/moments/partage` · feature: `moments_cles` · rôle: accompagnateur — Active/désactive le partage des moments-clés d'un entretien avec l'accompagné
- `GET /api/emergence/mine/dossier/:did` · feature: `fil_rouge/moments_cles (lecture, pas de requireFeature)` · rôle: accompagne — Côté accompagné : lit fil rouge et moments-clés UNIQUEMENT s'ils sont partagés (partage=1)
- `GET /api/transparence/dossier/:id` · feature: `transparence (requireFeature serveur)` · rôle: accompagne — Tableau RGPD : décompte des données du dossier, ce que l'IA a vu/produit, sous-traitants, demande d'effacement en cours
- `POST /api/transparence/effacement` · feature: `transparence (requireFeature serveur)` · rôle: accompagne — Crée une demande d'effacement (motif facultatif) et notifie l'accompagnateur + les admins (transaction)
- `POST /api/miroir/session/:sid` · feature: `miroir (requireFeature serveur, IA contrat)` · rôle: accompagnateur — Génère (IA ou repli heuristique) l'analyse réflexive de la posture de l'accompagnateur sur un entretien possédé, persistée (upsert)
- `GET /api/miroir/session/:sid` · feature: `miroir (requireFeature serveur)` · rôle: accompagnateur — Relit l'analyse de posture persistée d'un entretien possédé (null si absente)
- `POST /api/miroir/session/:sid/appliquer` · feature: `miroir (requireFeature serveur)` · rôle: accompagnateur — Applique les scores proposés (filtrés sur INDICATEUR_IDS, clampés 0-100) au brouillon d'auto-évaluation du dossier et recalcule la note globale

### TC-REL-001 — Enregistrer un relevé de météo valide (accompagné)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Partition d'équivalence (niveau valide) |

- **Préconditions :** Connecté en accompagné (afrit_mohamed@yahoo.fr), propriétaire du dossierId
- **Données :** {dossierId: <dossier d'Amine>, niveau: 4, mot: 'serein'}
- **Étapes :**
  1. POST /api/relationnel/meteo avec le corps
  2. Vérifier le statut et le corps
- **Résultat attendu :** 201 ; corps {id:number, niveau:4, mot:'serein'} ; le relevé est inséré avec role='accompagne'
- **Traçabilité :** meteo | POST /api/relationnel/meteo
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-002 — Météo sans le mot facultatif

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | Partition d'équivalence (champ optionnel absent) |

- **Préconditions :** Connecté en accompagné propriétaire
- **Données :** {dossierId, niveau: 3}
- **Étapes :**
  1. POST /api/relationnel/meteo
  2. Vérifier
- **Résultat attendu :** 201 ; mot=null dans la réponse et en base
- **Traçabilité :** meteo | POST /api/relationnel/meteo
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-003 — Météo : bornes du niveau (1 et 5 acceptés)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | haute | Valeurs limites (bornes basse/haute incluses) |

- **Préconditions :** Connecté en accompagné propriétaire
- **Données :** niveau=1 ; puis niveau=5
- **Étapes :**
  1. POST avec niveau=1
  2. POST avec niveau=5
- **Résultat attendu :** 201 dans les deux cas ; niveau renvoyé 1 puis 5
- **Traçabilité :** meteo | POST /api/relationnel/meteo
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-004 — Météo : niveau hors plage écrêté (clamp 1-5)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | haute | Valeurs limites (au-delà des bornes, écrêtage) |

- **Préconditions :** Connecté en accompagné propriétaire
- **Données :** niveau=9 ; puis niveau=-2
- **Étapes :**
  1. POST niveau=9 → attendu niveau=5
  2. POST niveau=-2 → écrêté à 1 (Math.max(1,...)) donc 400? vérifier
- **Résultat attendu :** niveau=9 → 201 avec niveau=5 (Math.min(5,...)); niveau=-2 → écrêté à 1 par Math.max donc 201 niveau=1
- **Traçabilité :** meteo | POST /api/relationnel/meteo
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-005 — Météo : niveau manquant/non numérique → 400

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | haute | Partition d'équivalence (invalide) + valeur limite 0 |

- **Préconditions :** Connecté en accompagné propriétaire
- **Données :** {dossierId} sans niveau ; puis niveau:'abc' ; puis niveau:0
- **Étapes :**
  1. POST sans niveau
  2. POST niveau='abc'
  3. POST niveau=0
- **Résultat attendu :** 400 {error:'Niveau requis (1-5)'} (Number(...)||0 → 0 → falsy)
- **Traçabilité :** meteo | POST /api/relationnel/meteo
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-006 — Météo : mot tronqué à 120 caractères

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | basse | Valeurs limites (longueur max) |

- **Préconditions :** Connecté en accompagné propriétaire
- **Données :** mot de 200 caractères
- **Étapes :**
  1. POST avec mot long
  2. Relire via GET
- **Résultat attendu :** 201 ; mot stocké tronqué à 120 caractères (slice(0,120).trim())
- **Traçabilité :** meteo | POST /api/relationnel/meteo
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-007 — Météo : accès non authentifié → 401

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles (anonyme) |

- **Préconditions :** Aucun cookie d'auth
- **Données :** {dossierId, niveau:3}
- **Étapes :**
  1. POST /api/relationnel/meteo sans cookie
- **Résultat attendu :** 401 {error:'Non authentifié'}
- **Traçabilité :** requireAuth | POST /api/relationnel/meteo
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-008 — Météo : dossier d'autrui → 404 (access null)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test du contrôle d'accès (404 non-propriétaire) |

- **Préconditions :** Connecté en accompagné (Amine) ; dossierId appartenant à Léa/Karim
- **Données :** {dossierId: <dossier de Léa>, niveau:3}
- **Étapes :**
  1. POST /api/relationnel/meteo
- **Résultat attendu :** 404 {error:'Dossier introuvable'} (access() renvoie null pour un non-propriétaire)
- **Traçabilité :** access() | POST /api/relationnel/meteo
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-009 — Météo : accompagnateur enregistre son propre check privé

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | Test basé sur les rôles |

- **Préconditions :** Connecté en accompagnateur (Mohamed) sur un dossier qu'il accompagne
- **Données :** {dossierId: D1, niveau:2, mot:'fatigué'}
- **Étapes :**
  1. POST /api/relationnel/meteo
  2. GET /api/relationnel/meteo/dossier/D1
- **Résultat attendu :** 201 ; relevé inséré avec role='accompagnateur' ; visible dans 'mine' filtré par auteur_id
- **Traçabilité :** meteo | POST /api/relationnel/meteo
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-010 — Météo : dossierId non numérique/absent → 404

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | Partition d'équivalence (entrée invalide) |

- **Préconditions :** Connecté en accompagné
- **Données :** {niveau:3} sans dossierId ; puis dossierId:'x'
- **Étapes :**
  1. POST sans dossierId
  2. POST dossierId='x'
- **Résultat attendu :** 404 'Dossier introuvable' (Number(undefined)=NaN → access null)
- **Traçabilité :** access() | POST /api/relationnel/meteo
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-011 — Lire la météo côté accompagné (mine peuplé, autre vide)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Test du contrat (forme de réponse + tri/limite) |

- **Préconditions :** Accompagné propriétaire avec ≥1 relevé
- **Données :** GET /api/relationnel/meteo/dossier/:id
- **Étapes :**
  1. GET
  2. Vérifier la forme
- **Résultat attendu :** 200 ; {mine:[{id,niveau,mot,cree_le},...], autre:[]} ; mine trié desc, ≤30
- **Traçabilité :** meteo | GET /api/relationnel/meteo/dossier/:id
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-012 — Lire la météo côté accompagnateur (mine privé + autre = météo accompagné)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Table de décision (rôle × visibilité) |

- **Préconditions :** Accompagnateur du dossier ; accompagné et accompagnateur ont chacun des relevés
- **Données :** GET /api/relationnel/meteo/dossier/:id
- **Étapes :**
  1. GET
  2. Vérifier mine et autre
- **Résultat attendu :** 200 ; mine = uniquement relevés role='accompagnateur' ET auteur_id=moi ; autre = relevés role='accompagne'
- **Traçabilité :** meteo | GET /api/relationnel/meteo/dossier/:id
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-013 — Lire la météo d'un dossier d'autrui → 404

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test du contrôle d'accès |

- **Préconditions :** Connecté ; dossier non lié à l'utilisateur
- **Données :** GET /api/relationnel/meteo/dossier/<autre>
- **Étapes :**
  1. GET
- **Résultat attendu :** 404 {error:'Dossier introuvable'}
- **Traçabilité :** access() | GET /api/relationnel/meteo/dossier/:id
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-014 — Lire la météo non authentifié → 401

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles (anonyme) |

- **Préconditions :** Aucun cookie
- **Données :** GET /api/relationnel/meteo/dossier/1
- **Étapes :**
  1. GET sans cookie
- **Résultat attendu :** 401
- **Traçabilité :** requireAuth | GET /api/relationnel/meteo/dossier/:id
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-015 — Créer une note de micro-journal partagée

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Partition d'équivalence (entrée valide) |

- **Préconditions :** Connecté en accompagné propriétaire du dossier
- **Données :** {dossierId, texte:'Avancée sur le plan', partage:true}
- **Étapes :**
  1. POST /api/relationnel/journal
  2. Vérifier
- **Résultat attendu :** 201 ; {id, texte, partage:1, cree_le:ISO} ; note insérée
- **Traçabilité :** journal | POST /api/relationnel/journal
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-016 — Créer une note privée (partage absent → 0)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | Table de décision (partage truthy/falsy) |

- **Préconditions :** Accompagné propriétaire
- **Données :** {dossierId, texte:'Note perso'}
- **Étapes :**
  1. POST
  2. Vérifier partage
- **Résultat attendu :** 201 ; partage:0 (req.body.partage falsy → 0)
- **Traçabilité :** journal | POST /api/relationnel/journal
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-017 — Note de journal vide → 400

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | haute | Valeurs limites (chaîne vide après trim) |

- **Préconditions :** Accompagné propriétaire
- **Données :** {dossierId, texte:'   '} ; puis texte absent
- **Étapes :**
  1. POST texte espaces
  2. POST sans texte
- **Résultat attendu :** 400 {error:'Note vide'} (trim() vide)
- **Traçabilité :** journal | POST /api/relationnel/journal
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-018 — Journal : un accompagnateur ne peut pas créer de note → 404

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles (rôle interdit côté écriture) |

- **Préconditions :** Connecté en accompagnateur sur un dossier qu'il accompagne
- **Données :** {dossierId: D1, texte:'test'}
- **Étapes :**
  1. POST /api/relationnel/journal
- **Résultat attendu :** 404 {error:'Parcours introuvable'} (access !== 'accompagne')
- **Traçabilité :** access() | POST /api/relationnel/journal
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-019 — Journal : créer sur dossier d'autrui → 404

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test du contrôle d'accès (non-propriétaire) |

- **Préconditions :** Accompagné connecté ; dossierId d'un autre accompagné
- **Données :** {dossierId:<autre>, texte:'x'}
- **Étapes :**
  1. POST
- **Résultat attendu :** 404 'Parcours introuvable'
- **Traçabilité :** access() | POST /api/relationnel/journal
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-020 — Journal : création non authentifiée → 401

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | Test basé sur les rôles (anonyme) |

- **Préconditions :** Aucun cookie
- **Données :** {dossierId,texte}
- **Étapes :**
  1. POST sans cookie
- **Résultat attendu :** 401
- **Traçabilité :** requireAuth | POST /api/relationnel/journal
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-021 — Lister le journal côté accompagné (toutes ses notes)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Test du contrat (forme + périmètre des données) |

- **Préconditions :** Accompagné propriétaire avec notes privées + partagées
- **Données :** GET /api/relationnel/journal/dossier/:id
- **Étapes :**
  1. GET
  2. Vérifier
- **Résultat attendu :** 200 ; {entrees:[...]} inclut notes privées ET partagées de l'auteur, tri desc
- **Traçabilité :** journal | GET /api/relationnel/journal/dossier/:id
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-022 — Lister le journal côté accompagnateur (notes partagées uniquement)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Table de décision (rôle × partage) |

- **Préconditions :** Accompagnateur du dossier ; l'accompagné a 1 note privée + 1 partagée
- **Données :** GET /api/relationnel/journal/dossier/:id
- **Étapes :**
  1. GET en tant qu'accompagnateur
- **Résultat attendu :** 200 ; entrees ne contient QUE les notes partage=1 ; la note privée est absente
- **Traçabilité :** journal | GET /api/relationnel/journal/dossier/:id
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-023 — Lister le journal d'un dossier d'autrui → 404

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test du contrôle d'accès |

- **Préconditions :** Connecté ; dossier non lié
- **Données :** GET /api/relationnel/journal/dossier/<autre>
- **Étapes :**
  1. GET
- **Résultat attendu :** 404 'Dossier introuvable'
- **Traçabilité :** access() | GET /api/relationnel/journal/dossier/:id
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-024 — Modifier le texte d'une note dont je suis l'auteur

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Partition d'équivalence (mise à jour valide) |

- **Préconditions :** Accompagné, note existante lui appartenant
- **Données :** PATCH {texte:'Texte révisé'}
- **Étapes :**
  1. PATCH /api/relationnel/journal/:id
  2. Relire via GET
- **Résultat attendu :** 200 {ok:true} ; texte mis à jour ; maj_le renseigné
- **Traçabilité :** journal | PATCH /api/relationnel/journal/:id
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-025 — Basculer le partage d'une note via PATCH

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Table de décision (transition d'état partagé/privé) |

- **Préconditions :** Accompagné, note privée existante
- **Données :** PATCH {partage:1} puis {partage:0}
- **Étapes :**
  1. PATCH partage:1
  2. Vérifier visible côté accompagnateur
  3. PATCH partage:0
  4. Vérifier masquée
- **Résultat attendu :** 200 {ok:true} ; partage bascule 0/1 ; la note (dé)apparaît côté accompagnateur
- **Traçabilité :** journal | PATCH /api/relationnel/journal/:id
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-026 — PATCH note avec texte vide → 400

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | Valeurs limites (chaîne vide après trim) |

- **Préconditions :** Accompagné, note existante
- **Données :** PATCH {texte:'   '}
- **Étapes :**
  1. PATCH
- **Résultat attendu :** 400 {error:'Note vide'}
- **Traçabilité :** journal | PATCH /api/relationnel/journal/:id
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-027 — PATCH note sans aucun champ → no-op 200

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | basse | Partition d'équivalence (cas dégénéré sans changement) |

- **Préconditions :** Accompagné, note existante
- **Données :** PATCH {} (ni texte ni partage)
- **Étapes :**
  1. PATCH
- **Résultat attendu :** 200 {ok:true} sans modification (sets vide → retour anticipé)
- **Traçabilité :** journal | PATCH /api/relationnel/journal/:id
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-028 — PATCH note d'un autre utilisateur → 404

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test du contrôle d'accès (non-propriétaire) |

- **Préconditions :** Accompagné A ; note appartenant à l'accompagné B
- **Données :** PATCH /api/relationnel/journal/<id de B> {texte:'hack'}
- **Étapes :**
  1. PATCH
- **Résultat attendu :** 404 {error:'Note introuvable'} (WHERE accompagne_id=me.id)
- **Traçabilité :** journal | PATCH /api/relationnel/journal/:id
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-029 — Supprimer une note dont je suis l'auteur

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Partition d'équivalence (suppression valide) |

- **Préconditions :** Accompagné, note existante lui appartenant
- **Données :** DELETE /api/relationnel/journal/:id
- **Étapes :**
  1. DELETE
  2. Relire la liste
- **Résultat attendu :** 200 {ok:true} ; note supprimée (info.changes>0)
- **Traçabilité :** journal | DELETE /api/relationnel/journal/:id
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-030 — Supprimer une note inexistante/d'autrui → 404

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test du contrôle d'accès + partition (id inexistant) |

- **Préconditions :** Accompagné ; id inexistant ou appartenant à un autre
- **Données :** DELETE /api/relationnel/journal/999999
- **Étapes :**
  1. DELETE
- **Résultat attendu :** 404 {error:'Note introuvable'} (changes=0)
- **Traçabilité :** journal | DELETE /api/relationnel/journal/:id
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-031 — DELETE note non authentifié → 401

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | Test basé sur les rôles (anonyme) |

- **Préconditions :** Aucun cookie
- **Données :** DELETE /api/relationnel/journal/1
- **Étapes :**
  1. DELETE sans cookie
- **Résultat attendu :** 401
- **Traçabilité :** requireAuth | DELETE /api/relationnel/journal/:id
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-032 — Météo (UI) : check-in d'humeur côté accompagné

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | Test bout-en-bout (parcours nominal UI) |

- **Préconditions :** Connecté en accompagné, feature 'meteo' active, page ParcoursDetail ouverte
- **Données :** Émoji niveau 4 + mot 'serein'
- **Étapes :**
  1. Ouvrir le parcours
  2. Cliquer l'émoji 🙂 (niveau 4)
  3. Saisir 'serein'
  4. Cliquer Enregistrer
- **Résultat attendu :** Message « C'est noté ✓ » ; le relevé apparaît dans 'Mon historique'
- **Traçabilité :** meteo | MeteoWidget (ParcoursDetail)
- **Automatisation :** ⏳ à automatiser

### TC-REL-033 — Météo (UI) : feature désactivée masque le widget

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | acces | moyenne | Test basé sur l'offre (requireFeature côté client) |

- **Préconditions :** -
- **Données :** -
- **Étapes :**
  1. Ouvrir ParcoursDetail
- **Résultat attendu :** Le widget Météo n'est pas rendu (useFeature('meteo') false → return null)
- **Traçabilité :** meteo | MeteoWidget useFeature
- **Automatisation :** ⏳ à automatiser

### TC-REL-034 — Micro-journal (UI) : ajouter, partager, supprimer une note

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | Test bout-en-bout (cycle de vie d'une note) |

- **Préconditions :** Connecté en accompagné, feature 'journal' active
- **Données :** texte 'Idée de plan', case Partager cochée
- **Étapes :**
  1. Saisir le texte
  2. Cocher 'Partager avec mon accompagnateur'
  3. Cliquer ＋ Ajouter
  4. Cliquer le tag pour basculer privé/partagé
  5. Cliquer × et confirmer la suppression
- **Résultat attendu :** La note s'ajoute (tag 🔓 partagée), bascule en 🔒 privée, puis disparaît après confirmation
- **Traçabilité :** journal | MicroJournal (ParcoursDetail)
- **Automatisation :** ⏳ à automatiser

### TC-REL-035 — Micro-journal (UI) : accompagnateur en lecture seule des notes partagées

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | Test basé sur les rôles (UI lecture seule) |

- **Préconditions :** Connecté en accompagnateur, l'accompagné a 1 note partagée
- **Données :** -
- **Étapes :**
  1. Ouvrir Dossier
  2. Repérer le bloc Micro-journal
- **Résultat attendu :** Notes partagées affichées avec tag 'partagée' ; aucun champ d'ajout ni bouton supprimer (readOnly)
- **Traçabilité :** journal | MicroJournal role=accompagnateur (Dossier)
- **Automatisation :** ⏳ à automatiser

### TC-REL-036 — Générer la banque de questions (contrat IA + persistance)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Test du contrat (champs présents/typés, persistance/relecture) |

- **Préconditions :** Accompagnateur propriétaire du dossier
- **Données :** POST /api/emergence/dossier/:did/banque
- **Étapes :**
  1. POST
  2. Vérifier la forme
  3. GET pour relecture
- **Résultat attendu :** 200 ; {banque: objet avec clés '0'..'5' → tableaux de chaînes non vides, source:'ia'|'heuristique'} ; relecture GET renvoie la même banque (upsert)
- **Traçabilité :** banque_questions | POST /api/emergence/dossier/:did/banque
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-037 — Banque : repli déterministe fallbackBanque (sans clé API)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | haute | Test unitaire de la fonction de repli (sortie déterministe) |

- **Préconditions :** ANTHROPIC_API_KEY absente (callClaude→null) OU test direct de fallbackBanque(dossierId)
- **Données :** dossierId d'Amine (prenom='Amine')
- **Étapes :**
  1. Appeler fallbackBanque(did)
- **Résultat attendu :** Objet {'0':[...],...,'5':[...]} ; chaque clé a ≥1 question ; la clé '0' contient le prénom de l'accompagné ('Amine, qu'est-ce qui...') ; source persistée='heuristique'
- **Traçabilité :** banque_questions | fallbackBanque()
- **Automatisation :** ✅ unit/emergence.test.ts

### TC-REL-038 — Banque : régénération écrase la précédente (ON CONFLICT)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | Test du contrat (idempotence d'upsert) |

- **Préconditions :** Accompagnateur, banque déjà générée
- **Données :** 2x POST /api/emergence/dossier/:did/banque
- **Étapes :**
  1. POST
  2. POST à nouveau
  3. GET
- **Résultat attendu :** Une seule ligne emergence type='banque' ; genere_le mis à jour ; contenu = dernière génération
- **Traçabilité :** banque_questions | POST /api/emergence/dossier/:did/banque
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-039 — Banque : non-propriétaire du dossier → 404

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test du contrôle d'accès (non-propriétaire) |

- **Préconditions :** Accompagnateur Camille ; dossier accompagné uniquement par Mohamed
- **Données :** POST /api/emergence/dossier/<dossier de Mohamed>/banque
- **Étapes :**
  1. POST
- **Résultat attendu :** 404 {error:'Dossier introuvable'} (ownsDossier false)
- **Traçabilité :** ownsDossier | POST /api/emergence/dossier/:did/banque
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-040 — Banque : rôle accompagné interdit → 403

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles |

- **Préconditions :** Connecté en accompagné
- **Données :** POST /api/emergence/dossier/:did/banque
- **Étapes :**
  1. POST
- **Résultat attendu :** 403 {error:'Accès refusé'} (requireRole('accompagnateur'))
- **Traçabilité :** requireRole | POST /api/emergence/dossier/:did/banque
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-041 — Banque : non authentifié → 401

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | Test basé sur les rôles (anonyme) |

- **Préconditions :** Aucun cookie
- **Données :** POST /api/emergence/dossier/1/banque
- **Étapes :**
  1. POST sans cookie
- **Résultat attendu :** 401
- **Traçabilité :** requireAuth | POST /api/emergence/dossier/:did/banque
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-042 — Lire la banque avant génération → null

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | Test du contrat (état initial vide) |

- **Préconditions :** Accompagnateur propriétaire, aucune banque générée
- **Données :** GET /api/emergence/dossier/:did/banque
- **Étapes :**
  1. GET
- **Résultat attendu :** 200 {banque:null}
- **Traçabilité :** banque_questions | GET /api/emergence/dossier/:did/banque
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-043 — Banque (UI) : adapter les questions à l'étudiant pendant l'entretien

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | Test bout-en-bout (génération IA via UI) |

- **Préconditions :** Accompagnateur, page Entretien ouverte sur une phase
- **Données :** -
- **Étapes :**
  1. Aller sur une phase
  2. Cliquer « ✨ Adapter les questions à cet étudiant »
- **Résultat attendu :** Des questions personnalisées s'affichent sous la phase (liste phase-q-perso non vide)
- **Traçabilité :** banque_questions | Entretien genBanque()
- **Automatisation :** ⏳ à automatiser

### TC-REL-044 — Générer le fil rouge (contrat IA + champs)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Test du contrat (champs présents/typés) |

- **Préconditions :** Accompagnateur propriétaire du dossier
- **Données :** POST /api/emergence/dossier/:did/fil-rouge
- **Étapes :**
  1. POST
  2. Vérifier la forme
- **Résultat attendu :** 200 ; {fil:string non vide, axes:tableau, explication:string, partage:0|1, source:'ia'|'heuristique'}
- **Traçabilité :** fil_rouge | POST /api/emergence/dossier/:did/fil-rouge
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-045 — Fil rouge : repli déterministe (sans IA / j.fil absent)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | haute | Test unitaire de la branche de repli (valeur par défaut) |

- **Préconditions :** callClaude renvoie null ou un objet sans 'fil'
- **Données :** -
- **Étapes :**
  1. POST avec IA indisponible
- **Résultat attendu :** contenu = {fil:'Relier l'expérience vécue...', axes:['Diagnostic','Démarche','Résultats & recul'], explication:...} ; source='heuristique'
- **Traçabilité :** fil_rouge | repli inline POST /fil-rouge
- **Automatisation :** ⏳ à automatiser

### TC-REL-046 — Fil rouge : relecture après génération

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | Test du contrat (persistance/relecture) |

- **Préconditions :** Accompagnateur, fil rouge généré
- **Données :** GET /api/emergence/dossier/:did/fil-rouge
- **Étapes :**
  1. GET
- **Résultat attendu :** 200 ; {filRouge:{fil,axes,explication,partage}}
- **Traçabilité :** fil_rouge | GET /api/emergence/dossier/:did/fil-rouge
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-047 — Fil rouge : relecture avant génération → null

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | basse | Test du contrat (état initial) |

- **Préconditions :** Accompagnateur propriétaire, aucun fil rouge
- **Données :** GET /api/emergence/dossier/:did/fil-rouge
- **Étapes :**
  1. GET
- **Résultat attendu :** 200 {filRouge:null}
- **Traçabilité :** fil_rouge | GET /api/emergence/dossier/:did/fil-rouge
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-048 — Fil rouge : basculer le partage (PATCH)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Table de décision (transition d'état de partage) |

- **Préconditions :** Accompagnateur, fil rouge généré
- **Données :** PATCH {partage:1} puis {partage:0}
- **Étapes :**
  1. PATCH partage:1
  2. GET côté accompagné /mine
  3. PATCH partage:0
  4. GET côté accompagné
- **Résultat attendu :** 200 {ok:true} ; le fil devient (in)visible côté accompagné
- **Traçabilité :** fil_rouge | PATCH /api/emergence/dossier/:did/fil-rouge/partage
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-049 — Fil rouge : non-propriétaire → 404 (POST/GET/PATCH)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test du contrôle d'accès (non-propriétaire) |

- **Préconditions :** Accompagnateur non propriétaire du dossier
- **Données :** POST/GET/PATCH /api/emergence/dossier/<autre>/fil-rouge
- **Étapes :**
  1. POST
  2. GET
  3. PATCH partage
- **Résultat attendu :** 404 'Dossier introuvable' pour les trois
- **Traçabilité :** ownsDossier | /api/emergence/dossier/:did/fil-rouge*
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-050 — Fil rouge : rôle accompagné → 403

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles |

- **Préconditions :** Connecté en accompagné
- **Données :** POST /api/emergence/dossier/:did/fil-rouge
- **Étapes :**
  1. POST
- **Résultat attendu :** 403 'Accès refusé'
- **Traçabilité :** requireRole | POST /api/emergence/dossier/:did/fil-rouge
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-051 — Fil rouge (UI) : faire émerger puis partager

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | Test bout-en-bout (génération + partage) |

- **Préconditions :** Accompagnateur, feature 'fil_rouge' active, page Dossier
- **Données :** -
- **Étapes :**
  1. Cliquer « ✨ Faire émerger le fil rouge »
  2. Cliquer « 📣 Partager avec l'accompagné »
- **Résultat attendu :** Le fil/axes/explication s'affichent ; le bouton bascule en « 🔓 Partagé — retirer le partage »
- **Traçabilité :** fil_rouge | FilRougeCard (Dossier)
- **Automatisation :** ⏳ à automatiser

### TC-REL-052 — Générer les moments-clés d'un entretien (contrat IA)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Test du contrat (structure moments, typage) |

- **Préconditions :** Accompagnateur propriétaire de la session (entretien avec réponses)
- **Données :** POST /api/emergence/session/:sid/moments
- **Étapes :**
  1. POST
  2. Vérifier la forme
- **Résultat attendu :** 200 ; {moments:[{verbatim:string, pourquoi:string},...], partage:0|1, source}
- **Traçabilité :** moments_cles | POST /api/emergence/session/:sid/moments
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-053 — Moments-clés : repli déterministe fallbackMoments

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | haute | Test unitaire de la fonction de repli (extraction déterministe) |

- **Préconditions :** callClaude renvoie null ; session avec ≥1 réponse non vide
- **Données :** sid d'un entretien rempli
- **Étapes :**
  1. Appeler fallbackMoments(sid) / POST sans IA
- **Résultat attendu :** {moments:[...]} avec ≤2 entrées issues des réponses (verbatim tronqué à 160), pourquoi='Passage potentiellement pivot de l'entretien.' ; source='heuristique'
- **Traçabilité :** moments_cles | fallbackMoments()
- **Automatisation :** ✅ unit/emergence.test.ts

### TC-REL-054 — Moments-clés : session sans réponse → fallback moments vide

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | validation | moyenne | Valeurs limites (jeu de données vide) |

- **Préconditions :** Session sans réponse non vide, sans IA
- **Données :** sid d'un entretien vide
- **Étapes :**
  1. POST /api/emergence/session/:sid/moments
- **Résultat attendu :** 200 ; {moments:[]} (fallbackMoments retourne tableau vide)
- **Traçabilité :** moments_cles | fallbackMoments()
- **Automatisation :** ✅ unit/emergence.test.ts

### TC-REL-055 — Moments-clés : régénération (ON CONFLICT session_id)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | Test du contrat (idempotence upsert par session) |

- **Préconditions :** Accompagnateur, moments déjà générés sur la session
- **Données :** 2x POST /api/emergence/session/:sid/moments
- **Étapes :**
  1. POST
  2. POST
- **Résultat attendu :** Une seule ligne moments_cles par session ; genere_le mis à jour
- **Traçabilité :** moments_cles | POST /api/emergence/session/:sid/moments
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-056 — Moments-clés : session d'autrui → 404

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test du contrôle d'accès (non-propriétaire de session) |

- **Préconditions :** Accompagnateur ; session appartenant au dossier d'un autre accompagnateur
- **Données :** POST/GET/PATCH /api/emergence/session/<autre>/moments
- **Étapes :**
  1. POST
  2. GET
  3. PATCH partage
- **Résultat attendu :** 404 {error:'Entretien introuvable'} (ownsSession undefined)
- **Traçabilité :** ownsSession | /api/emergence/session/:sid/moments*
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-057 — Moments-clés : rôle accompagné → 403

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | Test basé sur les rôles |

- **Préconditions :** Connecté en accompagné
- **Données :** POST /api/emergence/session/:sid/moments
- **Étapes :**
  1. POST
- **Résultat attendu :** 403 'Accès refusé'
- **Traçabilité :** requireRole | POST /api/emergence/session/:sid/moments
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-058 — Lire les moments-clés avant génération → null

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | basse | Test du contrat (état initial) |

- **Préconditions :** Accompagnateur propriétaire, aucun moment généré
- **Données :** GET /api/emergence/session/:sid/moments
- **Étapes :**
  1. GET
- **Résultat attendu :** 200 {moments:null, partage:0}
- **Traçabilité :** moments_cles | GET /api/emergence/session/:sid/moments
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-059 — Moments-clés : basculer le partage

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | Table de décision (transition de partage) |

- **Préconditions :** Accompagnateur, moments générés
- **Données :** PATCH {partage:1} puis {partage:0}
- **Étapes :**
  1. PATCH 1
  2. GET /mine côté accompagné
  3. PATCH 0
- **Résultat attendu :** 200 {ok:true} ; moments (in)visibles côté accompagné
- **Traçabilité :** moments_cles | PATCH /api/emergence/session/:sid/moments/partage
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-060 — Lecture accompagné /mine : seul le partagé est visible

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Table de décision (partage × visibilité accompagné) |

- **Préconditions :** Accompagné propriétaire ; fil rouge partage=1, 1 session moments partage=1, 1 session moments partage=0
- **Données :** GET /api/emergence/mine/dossier/:did
- **Étapes :**
  1. GET
- **Résultat attendu :** 200 ; {filRouge: objet (car partagé), moments: [...] uniquement issus des sessions partagées} ; les moments non partagés sont absents
- **Traçabilité :** fil_rouge/moments_cles | GET /api/emergence/mine/dossier/:did
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-061 — Lecture accompagné /mine : rien de partagé → champs nuls/vides

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | Test du contrat (état vide après filtrage partage=1) |

- **Préconditions :** Accompagné propriétaire ; aucun partage actif
- **Données :** GET /api/emergence/mine/dossier/:did
- **Étapes :**
  1. GET
- **Résultat attendu :** 200 {filRouge:null, moments:[]}
- **Traçabilité :** fil_rouge/moments_cles | GET /api/emergence/mine/dossier/:did
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-062 — Lecture accompagné /mine : dossier d'autrui → 404

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test du contrôle d'accès (non-propriétaire) |

- **Préconditions :** Accompagné ; dossierId d'un autre accompagné
- **Données :** GET /api/emergence/mine/dossier/<autre>
- **Étapes :**
  1. GET
- **Résultat attendu :** 404 {error:'Parcours introuvable'}
- **Traçabilité :** GET /api/emergence/mine/dossier/:did
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-063 — Lecture accompagné /mine : rôle accompagnateur → 403

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | Test basé sur les rôles |

- **Préconditions :** Connecté en accompagnateur
- **Données :** GET /api/emergence/mine/dossier/:did
- **Étapes :**
  1. GET
- **Résultat attendu :** 403 'Accès refusé' (requireRole('accompagne'))
- **Traçabilité :** requireRole | GET /api/emergence/mine/dossier/:did
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-064 — Émergence partagée (UI) : l'accompagné voit fil rouge + moments

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | Test bout-en-bout (lecture conditionnelle) |

- **Préconditions :** Accompagné (Amine) ; fil rouge déjà partagé côté démo
- **Données :** -
- **Étapes :**
  1. Ouvrir ParcoursDetail du parcours vitrine
- **Résultat attendu :** Section « 🧵 Le fil rouge de ton mémoire » avec axes ; moments-clés affichés si partagés ; section masquée si rien n'est partagé
- **Traçabilité :** fil_rouge/moments_cles | EmergencePartage (ParcoursDetail)
- **Automatisation :** ⏳ à automatiser

### TC-REL-065 — Transparence : tableau RGPD nominal

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Test du contrat (forme exhaustive + typage des agrégats) |

- **Préconditions :** Accompagné propriétaire ; feature 'transparence' active (plan absent ou Essentiel/Pro)
- **Données :** GET /api/transparence/dossier/:id
- **Étapes :**
  1. GET
  2. Vérifier la forme
- **Résultat attendu :** 200 ; {donnees:{questionnaire,rdvs,comptes_rendus_publies,syntheses_publiees,actions,meteo,journal}(nombres), ia:{comptes_rendus_generes:number, synthese_generee:bool, fil_rouge_partage:bool, moments_partages:number}, ce_que_voit_lia:string, soustraitants:[{nom,role}x2], demande_effacement_en_cours:bool}
- **Traçabilité :** transparence | GET /api/transparence/dossier/:id
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-066 — Transparence : feature absente → 403 (requireFeature)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur l'offre (requireFeature serveur) |

- **Préconditions :** Accompagné avec plan SANS 'transparence' (ex. plan Découverte)
- **Données :** GET /api/transparence/dossier/:id
- **Étapes :**
  1. Admin applique le plan Découverte au compte
  2. GET
- **Résultat attendu :** 403 {error:'Fonctionnalité non disponible dans votre offre'}
- **Traçabilité :** requireFeature('transparence') | GET /api/transparence/dossier/:id
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-067 — Transparence : rôle accompagnateur → 403

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles |

- **Préconditions :** Connecté en accompagnateur
- **Données :** GET /api/transparence/dossier/:id
- **Étapes :**
  1. GET
- **Résultat attendu :** 403 'Accès refusé' (requireRole('accompagne'))
- **Traçabilité :** requireRole | GET /api/transparence/dossier/:id
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-068 — Transparence : dossier d'autrui → 404

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test du contrôle d'accès (non-propriétaire) |

- **Préconditions :** Accompagné ; dossierId d'un autre accompagné ; feature active
- **Données :** GET /api/transparence/dossier/<autre>
- **Étapes :**
  1. GET
- **Résultat attendu :** 404 {error:'Parcours introuvable'} (ownDossier undefined)
- **Traçabilité :** ownDossier | GET /api/transparence/dossier/:id
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-069 — Transparence : non authentifié → 401

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | Test basé sur les rôles (anonyme) |

- **Préconditions :** Aucun cookie
- **Données :** GET /api/transparence/dossier/1
- **Étapes :**
  1. GET sans cookie
- **Résultat attendu :** 401
- **Traçabilité :** requireAuth | GET /api/transparence/dossier/:id
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-070 — Transparence : cohérence des compteurs avec les données réelles

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | Test du contrat (exactitude des agrégats) |

- **Préconditions :** Accompagné avec N relevés météo et M notes journal connus
- **Données :** GET /api/transparence/dossier/:id
- **Étapes :**
  1. Compter les relevés/notes en base
  2. GET
  3. Comparer
- **Résultat attendu :** donnees.meteo == N (role='accompagne'), donnees.journal == M (accompagne_id=moi)
- **Traçabilité :** transparence | GET /api/transparence/dossier/:id
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-071 — Demande d'effacement : création + notifications

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Test du contrat (effet de bord transactionnel) |

- **Préconditions :** Accompagné propriétaire ; feature 'transparence' active
- **Données :** POST {dossierId, motif:'Je quitte le dispositif'}
- **Étapes :**
  1. POST /api/transparence/effacement
  2. Vérifier la demande et les notifications
- **Résultat attendu :** 201 {ok:true} ; ligne demandes_effacement (statut en_attente) ; notification créée pour l'accompagnateur ET pour chaque admin (transaction)
- **Traçabilité :** transparence | POST /api/transparence/effacement
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-072 — Demande d'effacement sans motif (facultatif)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | Partition d'équivalence (champ optionnel absent) |

- **Préconditions :** Accompagné propriétaire ; feature active
- **Données :** POST {dossierId}
- **Étapes :**
  1. POST
- **Résultat attendu :** 201 {ok:true} ; motif=null ; texte de notification sans « Motif : »
- **Traçabilité :** transparence | POST /api/transparence/effacement
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-073 — Demande d'effacement : motif tronqué à 500 caractères

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | basse | Valeurs limites (longueur max du motif) |

- **Préconditions :** Accompagné propriétaire ; feature active
- **Données :** POST {dossierId, motif: chaîne de 700 caractères}
- **Étapes :**
  1. POST
- **Résultat attendu :** 201 ; motif stocké tronqué à 500 (slice(0,500).trim())
- **Traçabilité :** transparence | POST /api/transparence/effacement
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-074 — Demande d'effacement : dossier d'autrui → 404

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test du contrôle d'accès |

- **Préconditions :** Accompagné ; dossierId d'un autre accompagné ; feature active
- **Données :** POST {dossierId:<autre>}
- **Étapes :**
  1. POST
- **Résultat attendu :** 404 {error:'Parcours introuvable'}
- **Traçabilité :** ownDossier | POST /api/transparence/effacement
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-075 — Demande d'effacement : feature absente → 403

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur l'offre |

- **Préconditions :** Accompagné avec plan SANS 'transparence'
- **Données :** POST {dossierId}
- **Étapes :**
  1. POST
- **Résultat attendu :** 403 'Fonctionnalité non disponible dans votre offre'
- **Traçabilité :** requireFeature('transparence') | POST /api/transparence/effacement
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-076 — Demande d'effacement : rôle accompagnateur → 403

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | Test basé sur les rôles |

- **Préconditions :** Connecté en accompagnateur
- **Données :** POST {dossierId}
- **Étapes :**
  1. POST
- **Résultat attendu :** 403 'Accès refusé'
- **Traçabilité :** requireRole | POST /api/transparence/effacement
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-077 — Effacement : 2e demande pendant qu'une est en_attente → drapeau déjà en cours

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | Table de décision (état de demande) |

- **Préconditions :** Accompagné ayant déjà une demande en_attente
- **Données :** POST {dossierId} puis GET /api/transparence/dossier/:id
- **Étapes :**
  1. POST (1re demande)
  2. GET le tableau
- **Résultat attendu :** GET renvoie demande_effacement_en_cours:true (dejaDemande). Note : le POST n'empêche pas un doublon — comportement à vérifier vs spec
- **Traçabilité :** transparence | POST + GET /api/transparence/dossier/:id
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-078 — Transparence (UI) : consulter ses données et demander l'effacement

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | Test bout-en-bout (consultation + demande RGPD) |

- **Préconditions :** Accompagné (Amine), feature 'transparence' active, page ParcoursDetail
- **Données :** motif 'Test'
- **Étapes :**
  1. Ouvrir la modale « Mes données & transparence »
  2. Vérifier les sections (données, IA, sous-traitants, droits)
  3. Cliquer « Demander l'effacement »
  4. Saisir un motif
  5. Cliquer « Envoyer la demande »
- **Résultat attendu :** Les 4 sections s'affichent ; message de confirmation « Ta demande a été envoyée... » ; l'option d'effacement bascule en « demande déjà en cours »
- **Traçabilité :** transparence | TransparenceModal (ParcoursDetail)
- **Automatisation :** ⏳ à automatiser

### TC-REL-079 — Miroir : générer l'analyse de posture (contrat IA + persistance)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Test du contrat (structure, bornes de note, persistance/relecture) |

- **Préconditions :** Accompagnateur propriétaire de la session ; feature 'miroir' active
- **Données :** POST /api/miroir/session/:sid
- **Étapes :**
  1. POST
  2. Vérifier la forme
  3. GET pour relecture
- **Résultat attendu :** 200 ; {forces:[{principe,observation,verbatim}](≤3), glissements:[{...,conseil}](≤3), synthese:string, scores:[{indicateur,score,commentaire}], note:number|null (0-100), source:'ia'|'heuristique'} ; GET relit l'analyse persistée
- **Traçabilité :** miroir | POST /api/miroir/session/:sid
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-080 — Miroir : repli heuristique fallbackMiroir (sans clé API)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | haute | Test unitaire de la fonction de repli (calcul déterministe) |

- **Préconditions :** ANTHROPIC_API_KEY absente OU test direct ; session avec questions ouvertes et fermées
- **Données :** sid d'un entretien rempli
- **Étapes :**
  1. Appeler fallbackMiroir(sid) / POST sans IA
- **Résultat attendu :** forces (1-3 selon questions/notes), glissements (≥1, ajout d'un défaut si aucune fermée), 6 scores aux indicateurs 1.1/1.4/2.1/2.4/2.5/2.6, note = moyenne arrondie des scores ; source='heuristique'
- **Traçabilité :** miroir | fallbackMiroir()
- **Automatisation :** ✅ unit/miroir.test.ts

### TC-REL-081 — Miroir : OPEN_RE classe correctement ouvertes/fermées (score 2.5)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | moyenne | Table de décision (regex ouverte/fermée → score calculé) |

- **Préconditions :** Test de fallbackMiroir avec un jeu connu de questions
- **Données :** 3 questions dont 2 commençant par 'Comment'/'Qu'' et 1 fermée ('As-tu...')
- **Étapes :**
  1. Appeler fallbackMiroir(sid)
- **Résultat attendu :** ratio=2/3 ; score indicateur 2.5 = round(45 + 0.666*35) ≈ 68 ; glissement 'Faire émerger' présent à cause de la fermée
- **Traçabilité :** miroir | OPEN_RE / fallbackMiroir scores
- **Automatisation :** ✅ unit/miroir.test.ts

### TC-REL-082 — Miroir : session sans aucune note ni question (repli dégradé)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | validation | moyenne | Valeurs limites (jeu de données vide) |

- **Préconditions :** Session vide, sans IA
- **Données :** sid d'un entretien vide
- **Étapes :**
  1. POST /api/miroir/session/:sid
- **Résultat attendu :** 200 ; forces=[] (aucune question), glissements contient le défaut 'Faire émerger' (verbatim vide), scores calculés avec ratio=0 → 2.5=round(45)=45
- **Traçabilité :** miroir | fallbackMiroir() cas vide
- **Automatisation :** ✅ unit/miroir.test.ts

### TC-REL-083 — Miroir : note IA écrêtée à [0,100]

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | validation | moyenne | Valeurs limites (clamp de la note) |

- **Préconditions :** Réponse IA simulée avec note=150 puis note=-10
- **Données :** -
- **Étapes :**
  1. suggererMiroir avec note hors bornes
- **Résultat attendu :** note = Math.max(0, Math.min(100, j.note)) → 100 puis 0
- **Traçabilité :** miroir | suggererMiroir() clamp note
- **Automatisation :** ⏳ à automatiser

### TC-REL-084 — Miroir : scores filtrés sur INDICATEUR_IDS valides

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | validation | haute | Partition d'équivalence (indicateur valide/invalide) |

- **Préconditions :** Réponse IA simulée contenant un indicateur invalide (ex '9.9') + valides
- **Données :** scores=[{indicateur:'2.5'...},{indicateur:'9.9'...}]
- **Étapes :**
  1. POST /api/miroir/session/:sid
- **Résultat attendu :** Le score '9.9' est éliminé (result.scores filtré par INDICATEUR_IDS.includes) ; seuls les indicateurs de la grille (21) subsistent
- **Traçabilité :** miroir | INDICATEUR_IDS filter POST /session/:sid
- **Automatisation :** ⏳ à automatiser

### TC-REL-085 — Miroir : régénération écrase l'analyse (ON CONFLICT session_id)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | Test du contrat (idempotence upsert) |

- **Préconditions :** Accompagnateur, analyse déjà générée
- **Données :** 2x POST /api/miroir/session/:sid
- **Étapes :**
  1. POST
  2. POST
- **Résultat attendu :** Une seule ligne analyses_posture par session ; contenu/source/genere_le mis à jour
- **Traçabilité :** miroir | POST /api/miroir/session/:sid
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-086 — Miroir : feature absente → 403 (requireFeature)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur l'offre (requireFeature serveur) |

- **Préconditions :** Accompagnateur avec plan SANS 'miroir' (ex. Découverte/Essentiel)
- **Données :** POST /api/miroir/session/:sid
- **Étapes :**
  1. POST
- **Résultat attendu :** 403 {error:'Fonctionnalité non disponible dans votre offre'}
- **Traçabilité :** requireFeature('miroir') | POST /api/miroir/session/:sid
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-087 — Miroir : rôle accompagné → 403

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles |

- **Préconditions :** Connecté en accompagné
- **Données :** POST /api/miroir/session/:sid
- **Étapes :**
  1. POST
- **Résultat attendu :** 403 'Accès refusé' (requireRole('accompagnateur'))
- **Traçabilité :** requireRole | POST /api/miroir/session/:sid
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-088 — Miroir : session d'autrui → 404

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test du contrôle d'accès (non-propriétaire de session) |

- **Préconditions :** Accompagnateur ; session d'un dossier non accompagné par lui ; feature active
- **Données :** POST/GET /api/miroir/session/<autre>
- **Étapes :**
  1. POST
  2. GET
- **Résultat attendu :** 404 {error:'Entretien introuvable'} (ownsSession undefined)
- **Traçabilité :** ownsSession | /api/miroir/session/:sid
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-089 — Miroir : non authentifié → 401

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | Test basé sur les rôles (anonyme) |

- **Préconditions :** Aucun cookie
- **Données :** POST /api/miroir/session/1
- **Étapes :**
  1. POST sans cookie
- **Résultat attendu :** 401
- **Traçabilité :** requireAuth | POST /api/miroir/session/:sid
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-090 — Miroir : relire l'analyse avant génération → null

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | basse | Test du contrat (état initial) |

- **Préconditions :** Accompagnateur propriétaire, aucune analyse ; feature active
- **Données :** GET /api/miroir/session/:sid
- **Étapes :**
  1. GET
- **Résultat attendu :** 200 {analyse:null}
- **Traçabilité :** miroir | GET /api/miroir/session/:sid
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-091 — Miroir : appliquer les scores au brouillon d'auto-évaluation

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Test du contrat (effet sur la grille + recalcul) |

- **Préconditions :** Accompagnateur, analyse générée avec scores ; feature active
- **Données :** POST /api/miroir/session/:sid/appliquer
- **Étapes :**
  1. POST appliquer
  2. Vérifier le brouillon auto_evaluations
- **Résultat attendu :** 200 {ok:true, appliques:n>0} ; un brouillon (statut='brouillon') est créé/réutilisé ; scores upsertés dans auto_evaluation_scores ; note_globale recalculée (moyenne/5 arrondie 1 décimale)
- **Traçabilité :** miroir | POST /api/miroir/session/:sid/appliquer
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-092 — Appliquer : scores clampés 0-100 et indicateurs invalides ignorés

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | validation | haute | Valeurs limites + partition (validité d'indicateur) |

- **Préconditions :** Analyse stockée avec un score=120 et un indicateur '9.9'
- **Données :** contenu analyses_posture forgé
- **Étapes :**
  1. POST /appliquer
- **Résultat attendu :** Le score 120 est clampé à 100 ; l'indicateur '9.9' n'est pas appliqué (INDICATEUR_IDS.includes) ; appliques compte uniquement les indicateurs valides
- **Traçabilité :** miroir | clamp + INDICATEUR_IDS POST /appliquer
- **Automatisation :** ⏳ à automatiser

### TC-REL-093 — Appliquer : réutilise le brouillon existant (pas de doublon)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | Table de décision (brouillon existant vs création) |

- **Préconditions :** Accompagnateur, un brouillon d'auto-évaluation existe déjà pour le dossier
- **Données :** POST /appliquer 2 fois (depuis 2 sessions du même dossier)
- **Étapes :**
  1. POST appliquer session A
  2. POST appliquer session B
- **Résultat attendu :** Le même brouillon est mis à jour (ORDER BY id DESC LIMIT 1) ; les scores fusionnent par ON CONFLICT(eval_id, indicateur)
- **Traçabilité :** miroir | POST /appliquer (auto_evaluations brouillon)
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-094 — Appliquer : sans analyse préalable → 404

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | haute | Partition d'équivalence (précondition manquante) |

- **Préconditions :** Accompagnateur propriétaire ; aucune analyse stockée pour la session
- **Données :** POST /api/miroir/session/:sid/appliquer
- **Étapes :**
  1. POST
- **Résultat attendu :** 404 {error:'Aucune analyse à appliquer'}
- **Traçabilité :** miroir | POST /api/miroir/session/:sid/appliquer
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-095 — Appliquer : session d'autrui → 404

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test du contrôle d'accès |

- **Préconditions :** Accompagnateur ; session non possédée ; feature active
- **Données :** POST /api/miroir/session/<autre>/appliquer
- **Étapes :**
  1. POST
- **Résultat attendu :** 404 {error:'Entretien introuvable'} (ownsSession undefined avant lecture de l'analyse)
- **Traçabilité :** ownsSession | POST /api/miroir/session/:sid/appliquer
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-096 — Appliquer : feature 'miroir' absente → 403

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | Test basé sur l'offre |

- **Préconditions :** Accompagnateur avec plan SANS 'miroir'
- **Données :** POST /api/miroir/session/:sid/appliquer
- **Étapes :**
  1. POST
- **Résultat attendu :** 403 'Fonctionnalité non disponible dans votre offre'
- **Traçabilité :** requireFeature('miroir') | POST /api/miroir/session/:sid/appliquer
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-097 — Miroir (UI) : analyser sa posture puis appliquer les scores

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | Test bout-en-bout (génération + application) |

- **Préconditions :** Accompagnateur, feature 'miroir' active, page Dossier, entretien existant
- **Données :** -
- **Étapes :**
  1. Ouvrir la modale Miroir réflexif d'un entretien
  2. Cliquer « ✨ Analyser ma posture »
  3. Vérifier badge source, note/100, forces, glissements, scores
  4. Cliquer « ↳ Appliquer ces scores à ma grille »
- **Résultat attendu :** L'analyse s'affiche (badge 'Analyse IA' ou 'Analyse (repli)') ; message « ✓ n indicateur(s) appliqué(s) au brouillon »
- **Traçabilité :** miroir | MiroirReflexifModal (Dossier)
- **Automatisation :** ⏳ à automatiser

### TC-REL-098 — Miroir (UI) : feature désactivée bloque l'accès

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | acces | moyenne | Test basé sur l'offre (cohérence front/serveur) |

- **Préconditions :** Accompagnateur avec plan sans 'miroir' (ex. Découverte appliqué par admin)
- **Données :** -
- **Étapes :**
  1. Tenter d'ouvrir le miroir / observer l'appel API
- **Résultat attendu :** L'appel POST/GET /api/miroir/... renvoie 403 ; la fonctionnalité n'est pas exploitable
- **Traçabilité :** miroir | requireFeature côté serveur
- **Automatisation :** ⏳ à automatiser

### TC-REL-099 — Persistance multi-parcours : les données d'un dossier ne fuient pas sur un autre

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | non-regression | haute | Test de non-régression (isolation par dossier) |

- **Préconditions :** Accompagné avec 2 parcours (D1 avec Mohamed, D2 avec Camille)
- **Données :** Relevés météo/journal créés sur D1 uniquement
- **Étapes :**
  1. GET /relationnel/meteo/dossier/D1
  2. GET /relationnel/meteo/dossier/D2
  3. GET /transparence/dossier/D1 et D2
- **Résultat attendu :** Les relevés de D1 n'apparaissent pas dans D2 ; les compteurs de transparence sont distincts par dossier
- **Traçabilité :** meteo/journal/transparence | isolation par dossier_id
- **Automatisation :** ✅ api/relemerg.test.ts

### TC-REL-100 — Cohérence transparence ↔ partage émergence

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | non-regression | moyenne | Test de non-régression (cohérence inter-modules) |

- **Préconditions :** Accompagné ; fil rouge passé de non-partagé à partagé par l'accompagnateur
- **Données :** -
- **Étapes :**
  1. GET /transparence/dossier/:id (fil_rouge_partage=false)
  2. Accompagnateur PATCH fil-rouge/partage=1
  3. GET /transparence/dossier/:id à nouveau
- **Résultat attendu :** ia.fil_rouge_partage bascule false→true ; cohérent avec /emergence/mine
- **Traçabilité :** transparence/fil_rouge | GET /transparence + PATCH partage
- **Automatisation :** ✅ api/relemerg.test.ts

## Domaine LOT1 — 63 cas

**Endpoints couverts :**

- `GET /api/auth/me/features` · feature: `(socle session)` · rôle: authentifié (tout rôle) — Liste des clés de fonctionnalités activées pour l'utilisateur courant selon son plan (aucun plan = toutes)
- `GET /api/admin/users` · feature: `(admin)` · rôle: admin — Liste de tous les comptes avec leur plan d'abonnement éventuel
- `GET /api/admin/features` · feature: `(admin)` · rôle: admin — Registre complet des fonctionnalités (FEATURES + ALL_FEATURE_KEYS) pour construire les plans
- `GET /api/admin/plans` · feature: `(admin)` · rôle: admin — Liste des plans avec features assainies et nombre d'utilisateurs rattachés (nb_users)
- `POST /api/admin/plans` · feature: `(admin)` · rôle: admin — Créer un plan (nom requis, features assainies)
- `PATCH /api/admin/plans/:id` · feature: `(admin)` · rôle: admin — Modifier un plan (nom non vide, description, features assainies)
- `POST /api/admin/plans/:id/duplication` · feature: `(admin)` · rôle: admin — Dupliquer un plan (nom suffixé « (copie) », mêmes features)
- `DELETE /api/admin/plans/:id` · feature: `(admin)` · rôle: admin — Supprimer un plan ; les utilisateurs rattachés repassent à plan_id NULL (niveau max)
- `POST /api/admin/users` · feature: `(admin)` · rôle: admin — Créer un compte sans mot de passe + envoi d'un lien d'activation (email + role requis, 409 si email pris)
- `PATCH /api/admin/users/:id` · feature: `(admin)` · rôle: admin — Modifier un compte (actif, role, plan_id) ; refuse l'auto-modification de l'admin
- `POST /api/admin/lien` · feature: `(admin)` · rôle: admin — Rattacher un accompagné à un accompagnateur
- `GET /api/visualisation/emotions/catalogue` · feature: `roue_emotions` · rôle: authentifié + requireFeature(roue_emotions) — Endpoint hors-socle utilisé pour la matrice de gating (403 sous plan Découverte)
- `GET /api/collaboration/ressources` · feature: `mutualisation` · rôle: accompagnateur + requireFeature(mutualisation) — Endpoint hors-socle utilisé pour la matrice de gating (403 sous plan Découverte)
- `GET /api/entretien/...` · feature: `entretien` · rôle: authentifié + requireFeature(entretien) — Référence d'une fonctionnalité SOCLE pour la matrice de gating (200 sous plan Découverte)

### TC-LOT1-001 — GET /auth/me/features — utilisateur sans plan reçoit TOUTES les clés

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat ; partition d'équivalence (classe : sans plan) |

- **Préconditions :** Compte accompagnateur Mohamed (elafrit.mohamed@gmail.com) sans plan_id (NULL), connecté.
- **Données :** Cookie de session valide ; plan_id = NULL
- **Étapes :**
  1. Se connecter (POST /api/auth/login)
  2. GET /api/auth/me/features
- **Résultat attendu :** 200 ; body { features: string[] } ; longueur = 37 (= ALL_FEATURE_KEYS) ; contient 'questionnaire' et 'mutualisation' (hors-socle).
- **Traçabilité :** userFeatures (features.ts) — GET /api/auth/me/features
- **Automatisation :** ✅ api/lot1.test.ts

### TC-LOT1-002 — GET /auth/me/features — utilisateur sur plan Découverte ne reçoit QUE le socle

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | partition d'équivalence (classe : plan socle) ; test du contrat |

- **Préconditions :** Un accompagné (ex. lea.martin@boussole.demo) rattaché au plan 'Découverte' (8 clés socle) via PATCH /admin/users/:id.
- **Données :** plan_id = id(Découverte) ; SOCLE = questionnaire,entretien,comptes_rendus,rdv,plan_action,synthese,auto_evaluation,multi_parcours
- **Étapes :**
  1. Admin : PATCH /api/admin/users/:id { plan_id: idDecouverte }
  2. Se connecter en accompagné
  3. GET /api/auth/me/features
- **Résultat attendu :** 200 ; features de longueur 8 ; contient 'questionnaire' ; NE contient PAS 'roue_emotions' ni 'mutualisation'.
- **Traçabilité :** userFeatures (features.ts) — GET /api/auth/me/features
- **Automatisation :** ✅ api/lot1.test.ts

### TC-LOT1-003 — GET /auth/me/features — plan Pro renvoie l'intégralité des clés

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | test du contrat ; partition d'équivalence (classe : plan complet) |

- **Préconditions :** Compte rattaché au plan 'Pro' (= ALL_FEATURE_KEYS).
- **Données :** plan_id = id(Pro)
- **Étapes :**
  1. Admin : PATCH /api/admin/users/:id { plan_id: idPro }
  2. Se connecter
  3. GET /api/auth/me/features
- **Résultat attendu :** 200 ; features identiques (ensemble) à GET /admin/features → all (37 clés).
- **Traçabilité :** userFeatures (features.ts) — GET /api/auth/me/features
- **Automatisation :** ✅ api/lot1.test.ts

### TC-LOT1-004 — GET /auth/me/features — non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles (anonyme) ; requireAuth |

- **Préconditions :** Aucun cookie de session.
- **Données :** Pas de cookie boussole_token
- **Étapes :**
  1. GET /api/auth/me/features sans cookie
- **Résultat attendu :** 401 ; { error: 'Non authentifié' }.
- **Traçabilité :** requireAuth (auth.ts) — GET /api/auth/me/features
- **Automatisation :** ✅ api/lot1.test.ts

### TC-LOT1-005 — GET /auth/me/features — cookie/JWT invalide ou expiré

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | valeurs limites (jeton corrompu) ; requireAuth |

- **Préconditions :** Cookie boussole_token présent mais falsifié.
- **Données :** boussole_token = 'abc.invalid.token'
- **Étapes :**
  1. GET /api/auth/me/features avec cookie altéré
- **Résultat attendu :** 401 ; { error: 'Session invalide' }.
- **Traçabilité :** requireAuth (auth.ts) — GET /api/auth/me/features
- **Automatisation :** ✅ api/lot1.test.ts

### TC-LOT1-006 — GET /auth/me/features — repli toutes-fonctionnalités si features du plan JSON corrompu

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | non-regression | moyenne | test unitaire de repli déterministe ; partition d'équivalence (JSON valide / invalide) |

- **Préconditions :** En base, un plan dont la colonne features n'est pas un JSON valide, rattaché à un user.
- **Données :** plans.features = 'not-json' ; user.plan_id = ce plan
- **Étapes :**
  1. Appeler userFeatures(userId)
- **Résultat attendu :** Renvoie un Set = ALL_FEATURE_KEYS (catch JSON.parse → niveau max).
- **Traçabilité :** userFeatures catch (features.ts) — GET /api/auth/me/features
- **Automatisation :** ⏳ à automatiser

### TC-LOT1-007 — Gating MATRICE — Découverte : 403 sur fonctionnalité HORS socle (roue_emotions)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | table de décision (plan × feature) ; requireFeature |

- **Préconditions :** Accompagnateur/accompagné rattaché au plan 'Découverte'.
- **Données :** plan = Découverte ; clé requise = 'roue_emotions' (hors socle)
- **Étapes :**
  1. Se connecter
  2. GET /api/visualisation/emotions/catalogue
- **Résultat attendu :** 403 ; { error: 'Fonctionnalité non disponible dans votre offre' }.
- **Traçabilité :** requireFeature('roue_emotions') (features.ts) — GET /api/visualisation/emotions/catalogue
- **Automatisation :** ✅ api/lot1.test.ts

### TC-LOT1-008 — Gating MATRICE — Découverte : 403 sur mutualisation (hors socle, accompagnateur)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | table de décision (rôle × plan × feature) ; requireFeature |

- **Préconditions :** Accompagnateur (camille.laurent@boussole.demo) rattaché au plan 'Découverte'.
- **Données :** plan = Découverte ; clé = 'mutualisation'
- **Étapes :**
  1. Se connecter en accompagnateur
  2. GET /api/collaboration/ressources
- **Résultat attendu :** 403 ; { error: 'Fonctionnalité non disponible dans votre offre' } (requireRole passe, requireFeature bloque).
- **Traçabilité :** requireFeature('mutualisation') (features.ts) — GET /api/collaboration/ressources
- **Automatisation :** ✅ api/lot1.test.ts

### TC-LOT1-009 — Gating MATRICE — Découverte : 200 sur fonctionnalité DU socle (entretien)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | table de décision (plan socle × feature socle = autorisé) |

- **Préconditions :** Compte rattaché au plan 'Découverte' (entretien ∈ socle).
- **Données :** plan = Découverte ; clé = 'entretien'
- **Étapes :**
  1. Se connecter
  2. Appeler un endpoint protégé par requireFeature('entretien')
- **Résultat attendu :** Pas de 403 lié au gating (200 ou 404 ressource selon données, mais jamais 'Fonctionnalité non disponible').
- **Traçabilité :** requireFeature('entretien') (features.ts)
- **Automatisation :** ✅ api/lot1.test.ts

### TC-LOT1-010 — Gating MATRICE — sans plan : 200 sur fonctionnalité hors socle

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | table de décision (sans plan = tout autorisé) |

- **Préconditions :** Compte sans plan (plan_id NULL).
- **Données :** plan_id = NULL ; clé = 'roue_emotions'
- **Étapes :**
  1. Se connecter
  2. GET /api/visualisation/emotions/catalogue
- **Résultat attendu :** 200 (aucun blocage de gating ; userFeatures = niveau max).
- **Traçabilité :** requireFeature('roue_emotions') (features.ts) — GET /api/visualisation/emotions/catalogue
- **Automatisation :** ✅ api/lot1.test.ts

### TC-LOT1-011 — requireFeature — non authentifié renvoie 401 (avant le 403 de gating)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles (anonyme) ; couverture de branche |

- **Préconditions :** Endpoint protégé par requireFeature mais appelé sans requireAuth en amont OU sans session.
- **Données :** Pas de user en req
- **Étapes :**
  1. Appeler un endpoint requireFeature sans cookie
- **Résultat attendu :** 401 ; { error: 'Non authentifié' } (branche !u du middleware requireFeature).
- **Traçabilité :** requireFeature branche !u (features.ts)
- **Automatisation :** ✅ api/lot1.test.ts

### TC-LOT1-012 — sanitizeKeys — dédoublonne, filtre les clés inconnues, conserve l'ordre

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | validation | haute | partition d'équivalence (valide/invalide/doublon) ; test unitaire |

- **Préconditions :** Fonction sanitizeKeys importable.
- **Données :** ['rdv','rdv','inconnu','synthese', 42, 'falc']
- **Étapes :**
  1. Appeler sanitizeKeys(['rdv','rdv','inconnu','synthese',42,'falc'])
- **Résultat attendu :** Retourne ['rdv','synthese','falc'] : doublon supprimé, 'inconnu' et 42 (non-clé) filtrés.
- **Traçabilité :** sanitizeKeys (features.ts)
- **Automatisation :** ⏳ à automatiser

### TC-LOT1-013 — sanitizeKeys — entrée non-tableau renvoie []

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | validation | moyenne | valeurs limites / partition d'équivalence (type) ; test unitaire |

- **Préconditions :** Fonction sanitizeKeys importable.
- **Données :** null ; undefined ; 'rdv' (string) ; { a:1 } ; 5
- **Étapes :**
  1. Appeler sanitizeKeys avec chacune de ces valeurs
- **Résultat attendu :** Retourne [] pour toute entrée non-Array (garde !Array.isArray).
- **Traçabilité :** sanitizeKeys garde Array.isArray (features.ts)
- **Automatisation :** ⏳ à automatiser

### TC-LOT1-014 — sanitizeKeys — tableau vide et toutes clés valides

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | validation | basse | valeurs limites (vide / ensemble complet) ; test unitaire |

- **Préconditions :** Fonction sanitizeKeys importable.
- **Données :** [] ; ALL_FEATURE_KEYS
- **Étapes :**
  1. sanitizeKeys([])
  2. sanitizeKeys(ALL_FEATURE_KEYS)
- **Résultat attendu :** [] pour le vide ; un tableau de 37 clés (toutes conservées, sans doublon) pour ALL_FEATURE_KEYS.
- **Traçabilité :** sanitizeKeys (features.ts)
- **Automatisation :** ⏳ à automatiser

### TC-LOT1-015 — GET /admin/features — nominal (registre complet)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat (forme et typage) |

- **Préconditions :** Admin connecté (mohamed@elafrit.com).
- **Données :** Cookie admin
- **Étapes :**
  1. GET /api/admin/features
- **Résultat attendu :** 200 ; { features: Feature[], all: string[] } ; chaque Feature a {key,label,categorie} non vides ; all.length === features.length === 37 ; catégories incluent 'Socle','Visuel','IA & posture'.
- **Traçabilité :** FEATURES/ALL_FEATURE_KEYS (features.ts) — GET /api/admin/features
- **Automatisation :** ✅ api/lot1.test.ts

### TC-LOT1-016 — GET /admin/features — 401 non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles (anonyme) ; requireAuth |

- **Préconditions :** Aucun cookie.
- **Données :** —
- **Étapes :**
  1. GET /api/admin/features sans session
- **Résultat attendu :** 401 ; { error: 'Non authentifié' }.
- **Traçabilité :** requireAuth — GET /api/admin/features
- **Automatisation :** ✅ api/lot1.test.ts

### TC-LOT1-017 — GET /admin/features — 403 rôle non admin (accompagnateur)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles ; requireRole('admin') |

- **Préconditions :** Connecté en accompagnateur (Mohamed).
- **Données :** Cookie role=accompagnateur
- **Étapes :**
  1. GET /api/admin/features
- **Résultat attendu :** 403 ; { error: 'Accès refusé' }.
- **Traçabilité :** requireRole('admin') — GET /api/admin/features
- **Automatisation :** ✅ api/lot1.test.ts

### TC-LOT1-018 — GET /admin/features — 403 rôle accompagné

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles ; requireRole('admin') |

- **Préconditions :** Connecté en accompagné (Amine).
- **Données :** Cookie role=accompagne
- **Étapes :**
  1. GET /api/admin/features
- **Résultat attendu :** 403 ; { error: 'Accès refusé' }.
- **Traçabilité :** requireRole('admin') — GET /api/admin/features
- **Automatisation :** ✅ api/lot1.test.ts

### TC-LOT1-019 — GET /admin/users — nominal (liste + plan)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat ; jointure LEFT JOIN plans |

- **Préconditions :** Admin connecté ; jeu de démo (≥ 6 comptes).
- **Données :** Cookie admin
- **Étapes :**
  1. GET /api/admin/users
- **Résultat attendu :** 200 ; { users: [...] } trié par cree_le DESC ; chaque user expose id,email,role,nom,prenom,actif,email_verifie,plan_id,plan_nom ; plan_nom NULL si aucun plan.
- **Traçabilité :** admin GET /users — GET /api/admin/users
- **Automatisation :** ✅ api/lot1.test.ts

### TC-LOT1-020 — GET /admin/users — 403 rôle non admin

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles ; requireRole('admin') |

- **Préconditions :** Connecté en accompagnateur.
- **Données :** Cookie role=accompagnateur
- **Étapes :**
  1. GET /api/admin/users
- **Résultat attendu :** 403 ; { error: 'Accès refusé' }.
- **Traçabilité :** requireRole('admin') — GET /api/admin/users
- **Automatisation :** ✅ api/lot1.test.ts

### TC-LOT1-021 — GET /admin/users — 401 non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles (anonyme) ; requireAuth |

- **Préconditions :** Aucun cookie.
- **Données :** —
- **Étapes :**
  1. GET /api/admin/users sans session
- **Résultat attendu :** 401 ; { error: 'Non authentifié' }.
- **Traçabilité :** requireAuth — GET /api/admin/users
- **Automatisation :** ✅ api/lot1.test.ts

### TC-LOT1-022 — GET /admin/plans — nominal (features assainies + nb_users)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat ; sanitizeStockées via sanitizeKeys(safeParse) |

- **Préconditions :** Admin connecté ; plans seedés (Découverte, Essentiel, Pro).
- **Données :** Cookie admin
- **Étapes :**
  1. GET /api/admin/plans
- **Résultat attendu :** 200 ; { plans: [...] } trié par cree_le ASC ; chaque plan a id,nom,description,features (tableau de clés valides), cree_le, nb_users (entier ≥ 0) ; Découverte.features.length === 8 ; Pro.features.length === 37.
- **Traçabilité :** admin GET /plans — GET /api/admin/plans
- **Automatisation :** ✅ api/lot1.test.ts

### TC-LOT1-023 — GET /admin/plans — features stockées corrompues assainies à []

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | non-regression | basse | test du contrat ; gestion d'erreur safeParse |

- **Préconditions :** Admin ; un plan dont features = JSON invalide en base.
- **Données :** plans.features = 'broken'
- **Étapes :**
  1. GET /api/admin/plans
- **Résultat attendu :** 200 ; le plan concerné a features: [] (safeParse → [] → sanitizeKeys → []) sans erreur 500.
- **Traçabilité :** safeParse + sanitizeKeys (admin.ts) — GET /api/admin/plans
- **Automatisation :** ✅ api/lot1.test.ts

### TC-LOT1-024 — GET /admin/plans — 403 non admin / 401 anonyme

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles ; requireAuth + requireRole |

- **Préconditions :** Accompagnateur connecté, puis sans cookie.
- **Données :** Cookie accompagnateur / aucun
- **Étapes :**
  1. GET /api/admin/plans en accompagnateur
  2. GET /api/admin/plans sans session
- **Résultat attendu :** 403 'Accès refusé' (accompagnateur) ; 401 'Non authentifié' (anonyme).
- **Traçabilité :** requireAuth + requireRole('admin') — GET /api/admin/plans
- **Automatisation :** ✅ api/lot1.test.ts

### TC-LOT1-025 — POST /admin/plans — création nominale

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat ; partition d'équivalence (entrée valide) |

- **Préconditions :** Admin connecté.
- **Données :** { nom: 'Test QA', description: 'desc', features: ['rdv','synthese'] }
- **Étapes :**
  1. POST /api/admin/plans avec le corps
  2. GET /api/admin/plans
- **Résultat attendu :** 201 ; { id: <number> } ; le plan apparaît dans la liste avec features ['rdv','synthese'] et nb_users 0.
- **Traçabilité :** admin POST /plans — POST /api/admin/plans
- **Automatisation :** ✅ api/lot1.test.ts

### TC-LOT1-026 — POST /admin/plans — nom manquant ou vide → 400

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | haute | valeurs limites (chaîne vide / espaces) ; partition d'équivalence |

- **Préconditions :** Admin connecté.
- **Données :** {} ; { nom: '' } ; { nom: '   ' }
- **Étapes :**
  1. POST /api/admin/plans pour chaque variante
- **Résultat attendu :** 400 ; { error: 'Le nom du plan est requis' } pour chaque cas (trim donne '').
- **Traçabilité :** admin POST /plans validation nom — POST /api/admin/plans
- **Automatisation :** ✅ api/lot1.test.ts

### TC-LOT1-027 — POST /admin/plans — features invalides assainies (clés inconnues ignorées)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | partition d'équivalence (clés valides/invalides) ; test du contrat |

- **Préconditions :** Admin connecté.
- **Données :** { nom: 'Mix', features: ['rdv','inconnu','rdv', 7] }
- **Étapes :**
  1. POST /api/admin/plans
  2. GET /api/admin/plans
- **Résultat attendu :** 201 ; le plan créé a features ['rdv'] (dédoublonné, 'inconnu'/7 filtrés par sanitizeKeys).
- **Traçabilité :** sanitizeKeys (admin POST /plans) — POST /api/admin/plans
- **Automatisation :** ✅ api/lot1.test.ts

### TC-LOT1-028 — POST /admin/plans — features absent → plan sans fonctionnalité

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | basse | valeurs limites (champ optionnel absent) |

- **Préconditions :** Admin connecté.
- **Données :** { nom: 'Vide' } (pas de features)
- **Étapes :**
  1. POST /api/admin/plans
  2. Relire le plan
- **Résultat attendu :** 201 ; features = [] (sanitizeKeys(undefined) → []).
- **Traçabilité :** sanitizeKeys(req.body?.features) — POST /api/admin/plans
- **Automatisation :** ✅ api/lot1.test.ts

### TC-LOT1-029 — POST /admin/plans — 403 non admin / 401 anonyme

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles |

- **Préconditions :** Accompagnateur, puis anonyme.
- **Données :** { nom: 'X' }
- **Étapes :**
  1. POST /api/admin/plans en accompagnateur
  2. POST sans session
- **Résultat attendu :** 403 'Accès refusé' puis 401 'Non authentifié' ; aucun plan créé.
- **Traçabilité :** requireAuth + requireRole('admin') — POST /api/admin/plans
- **Automatisation :** ✅ api/lot1.test.ts

### TC-LOT1-030 — PATCH /admin/plans/:id — modification nominale (nom + description + features)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | table de décision (présence/absence de chaque champ) ; test du contrat |

- **Préconditions :** Admin connecté ; un plan existant (ex. créé en TC-LOT1-025).
- **Données :** { nom: 'Test QA v2', description: 'maj', features: ['rdv','synthese','falc'] }
- **Étapes :**
  1. PATCH /api/admin/plans/:id
  2. GET /api/admin/plans
- **Résultat attendu :** 200 ; { ok: true } ; le plan reflète nom/description/features mis à jour (features assainies).
- **Traçabilité :** admin PATCH /plans/:id — PATCH /api/admin/plans/:id
- **Automatisation :** ✅ api/lot1.test.ts

### TC-LOT1-031 — PATCH /admin/plans/:id — mise à jour partielle (description seule)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | table de décision (champ undefined → pas d'UPDATE) |

- **Préconditions :** Admin ; plan existant avec nom et features connus.
- **Données :** { description: 'nouvelle desc' } (nom et features non fournis)
- **Étapes :**
  1. PATCH /api/admin/plans/:id
  2. Relire
- **Résultat attendu :** 200 ; seule la description change ; nom et features inchangés (champs undefined ignorés).
- **Traçabilité :** admin PATCH /plans/:id branches undefined — PATCH /api/admin/plans/:id
- **Automatisation :** ✅ api/lot1.test.ts

### TC-LOT1-032 — PATCH /admin/plans/:id — nom fourni mais vide → 400

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | haute | valeurs limites (chaîne d'espaces après trim) |

- **Préconditions :** Admin ; plan existant.
- **Données :** { nom: '   ' }
- **Étapes :**
  1. PATCH /api/admin/plans/:id
- **Résultat attendu :** 400 ; { error: 'Le nom du plan ne peut pas être vide' } ; plan inchangé.
- **Traçabilité :** admin PATCH /plans/:id validation nom — PATCH /api/admin/plans/:id
- **Automatisation :** ✅ api/lot1.test.ts

### TC-LOT1-033 — PATCH /admin/plans/:id — description null efface la description

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | basse | partition d'équivalence (null vs valeur) |

- **Préconditions :** Admin ; plan avec description existante.
- **Données :** { description: null }
- **Étapes :**
  1. PATCH /api/admin/plans/:id
  2. Relire
- **Résultat attendu :** 200 ; description devient NULL (branche description != null ? String : null).
- **Traçabilité :** admin PATCH /plans/:id description — PATCH /api/admin/plans/:id
- **Automatisation :** ✅ api/lot1.test.ts

### TC-LOT1-034 — PATCH /admin/plans/:id — plan inexistant → 404

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | haute | valeurs limites (id inexistant) ; partition d'équivalence |

- **Préconditions :** Admin connecté.
- **Données :** id = 999999
- **Étapes :**
  1. PATCH /api/admin/plans/999999 { nom: 'X' }
- **Résultat attendu :** 404 ; { error: 'Plan introuvable' }.
- **Traçabilité :** admin PATCH /plans/:id garde existence — PATCH /api/admin/plans/:id
- **Automatisation :** ✅ api/lot1.test.ts

### TC-LOT1-035 — PATCH /admin/plans/:id — 403 non admin / 401 anonyme

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles |

- **Préconditions :** Accompagnateur puis anonyme.
- **Données :** id valide ; { nom: 'X' }
- **Étapes :**
  1. PATCH en accompagnateur
  2. PATCH sans session
- **Résultat attendu :** 403 'Accès refusé' puis 401 'Non authentifié' ; plan inchangé.
- **Traçabilité :** requireAuth + requireRole('admin') — PATCH /api/admin/plans/:id
- **Automatisation :** ✅ api/lot1.test.ts

### TC-LOT1-036 — POST /admin/plans/:id/duplication — nominal (copie suffixée)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat ; test fonctionnel de duplication |

- **Préconditions :** Admin ; plan 'Essentiel' existant.
- **Données :** id = id(Essentiel)
- **Étapes :**
  1. POST /api/admin/plans/:id/duplication
  2. GET /api/admin/plans
- **Résultat attendu :** 201 ; { id: <number> nouveau } ; nouveau plan nommé 'Essentiel (copie)' avec mêmes description et features ; nb_users 0.
- **Traçabilité :** admin POST /plans/:id/duplication — POST /api/admin/plans/:id/duplication
- **Automatisation :** ✅ api/lot1.test.ts

### TC-LOT1-037 — POST /admin/plans/:id/duplication — plan source inexistant → 404

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | valeurs limites (id inexistant) |

- **Préconditions :** Admin connecté.
- **Données :** id = 999999
- **Étapes :**
  1. POST /api/admin/plans/999999/duplication
- **Résultat attendu :** 404 ; { error: 'Plan introuvable' } ; aucun plan créé.
- **Traçabilité :** admin POST /plans/:id/duplication garde — POST /api/admin/plans/:id/duplication
- **Automatisation :** ✅ api/lot1.test.ts

### TC-LOT1-038 — POST /admin/plans/:id/duplication — 403 non admin

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | basse | test basé sur les rôles |

- **Préconditions :** Accompagnateur connecté.
- **Données :** id valide
- **Étapes :**
  1. POST /api/admin/plans/:id/duplication en accompagnateur
- **Résultat attendu :** 403 ; { error: 'Accès refusé' }.
- **Traçabilité :** requireRole('admin') — POST /api/admin/plans/:id/duplication
- **Automatisation :** ✅ api/lot1.test.ts

### TC-LOT1-039 — DELETE /admin/plans/:id — suppression réaffecte les utilisateurs à NULL (niveau max)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test fonctionnel ; test du contrat (effet de bord UPDATE plan_id=NULL) |

- **Préconditions :** Admin ; un plan ayant ≥ 1 utilisateur rattaché (préparer via PATCH /admin/users/:id).
- **Données :** id = plan rattaché à userX ; userX.plan_id = id
- **Étapes :**
  1. DELETE /api/admin/plans/:id
  2. GET /api/admin/users
  3. GET /api/auth/me/features (userX)
- **Résultat attendu :** 200 ; { ok: true } ; plan absent de /admin/plans ; userX.plan_id devient NULL et plan_nom NULL ; userX obtient désormais 37 features (niveau max).
- **Traçabilité :** admin DELETE /plans/:id (UPDATE users plan_id=NULL) — DELETE /api/admin/plans/:id
- **Automatisation :** ✅ api/lot1.test.ts

### TC-LOT1-040 — DELETE /admin/plans/:id — plan inexistant → 404

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | valeurs limites (id inexistant) |

- **Préconditions :** Admin connecté.
- **Données :** id = 999999
- **Étapes :**
  1. DELETE /api/admin/plans/999999
- **Résultat attendu :** 404 ; { error: 'Plan introuvable' }.
- **Traçabilité :** admin DELETE /plans/:id garde — DELETE /api/admin/plans/:id
- **Automatisation :** ✅ api/lot1.test.ts

### TC-LOT1-041 — DELETE /admin/plans/:id — 403 non admin / 401 anonyme

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles |

- **Préconditions :** Accompagnateur puis anonyme.
- **Données :** id valide
- **Étapes :**
  1. DELETE en accompagnateur
  2. DELETE sans session
- **Résultat attendu :** 403 'Accès refusé' puis 401 'Non authentifié' ; plan non supprimé.
- **Traçabilité :** requireAuth + requireRole('admin') — DELETE /api/admin/plans/:id
- **Automatisation :** ✅ api/lot1.test.ts

### TC-LOT1-042 — PATCH /admin/users/:id — affecter un plan à un utilisateur

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat ; test fonctionnel d'affectation |

- **Préconditions :** Admin ; un accompagné cible distinct de l'admin ; plan 'Découverte' existant.
- **Données :** { plan_id: idDecouverte }
- **Étapes :**
  1. PATCH /api/admin/users/:id { plan_id: idDecouverte }
  2. GET /api/admin/users
- **Résultat attendu :** 200 ; { ok: true } ; user.plan_id = idDecouverte, plan_nom = 'Découverte'.
- **Traçabilité :** admin PATCH /users/:id plan_id — PATCH /api/admin/users/:id
- **Automatisation :** ✅ api/lot1.test.ts

### TC-LOT1-043 — PATCH /admin/users/:id — retirer le plan (plan_id null ou '') → niveau max

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | partition d'équivalence (null, chaîne vide) ; valeurs limites |

- **Préconditions :** Admin ; user actuellement sur un plan.
- **Données :** { plan_id: null } puis { plan_id: '' }
- **Étapes :**
  1. PATCH /api/admin/users/:id { plan_id: null }
  2. Relire
  3. Répéter avec ''
- **Résultat attendu :** 200 dans les deux cas ; user.plan_id devient NULL (branche plan_id === null || === '') ; GET /auth/me/features de ce user renvoie 37 clés.
- **Traçabilité :** admin PATCH /users/:id plan_id NULL — PATCH /api/admin/users/:id
- **Automatisation :** ✅ api/lot1.test.ts

### TC-LOT1-044 — PATCH /admin/users/:id — plan_id inexistant → 400

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | haute | valeurs limites (id inexistant) ; table de décision |

- **Préconditions :** Admin ; user cible ≠ admin.
- **Données :** { plan_id: 999999 }
- **Étapes :**
  1. PATCH /api/admin/users/:id { plan_id: 999999 }
- **Résultat attendu :** 400 ; { error: 'Plan introuvable' } ; plan_id du user inchangé.
- **Traçabilité :** admin PATCH /users/:id plan introuvable — PATCH /api/admin/users/:id
- **Automatisation :** ✅ api/lot1.test.ts

### TC-LOT1-045 — PATCH /admin/users/:id — changement de rôle valide

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | partition d'équivalence (rôle ∈ ROLES) |

- **Préconditions :** Admin ; un user cible ≠ admin.
- **Données :** { role: 'accompagnateur' }
- **Étapes :**
  1. PATCH /api/admin/users/:id { role: 'accompagnateur' }
  2. Relire
- **Résultat attendu :** 200 ; { ok: true } ; user.role = 'accompagnateur'.
- **Traçabilité :** admin PATCH /users/:id role — PATCH /api/admin/users/:id
- **Automatisation :** ✅ api/lot1.test.ts

### TC-LOT1-046 — PATCH /admin/users/:id — rôle invalide ignoré (pas d'erreur, pas de changement)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | partition d'équivalence (rôle hors liste) ; couverture de branche |

- **Préconditions :** Admin ; user cible avec role connu (ex. 'accompagne').
- **Données :** { role: 'superadmin' }
- **Étapes :**
  1. PATCH /api/admin/users/:id { role: 'superadmin' }
  2. Relire
- **Résultat attendu :** 200 ; { ok: true } ; role inchangé (condition ROLES.includes false → pas d'UPDATE).
- **Traçabilité :** admin PATCH /users/:id role garde ROLES — PATCH /api/admin/users/:id
- **Automatisation :** ✅ api/lot1.test.ts

### TC-LOT1-047 — PATCH /admin/users/:id — activer / désactiver un compte

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | partition d'équivalence (valeur truthy/falsy de actif) |

- **Préconditions :** Admin ; user cible ≠ admin, actif=1.
- **Données :** { actif: 0 } puis { actif: 1 }
- **Étapes :**
  1. PATCH { actif: 0 }
  2. Relire
  3. PATCH { actif: 1 }
- **Résultat attendu :** 200 ; actif passe à 0 (désactivé) puis 1 (réactivé) ; un user désactivé voit son login renvoyer 403 'Compte désactivé'.
- **Traçabilité :** admin PATCH /users/:id actif — PATCH /api/admin/users/:id
- **Automatisation :** ✅ api/lot1.test.ts

### TC-LOT1-048 — PATCH /admin/users/:id — auto-modification de l'admin refusée → 400

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | haute | table de décision (id === meId) ; test basé sur les rôles |

- **Préconditions :** Admin connecté (mohamed@elafrit.com), id = son propre id.
- **Données :** id = meId ; { actif: 0 }
- **Étapes :**
  1. PATCH /api/admin/users/<monId> { actif: 0 }
- **Résultat attendu :** 400 ; { error: 'Vous ne pouvez pas modifier votre propre compte administrateur' } ; aucun changement.
- **Traçabilité :** admin PATCH /users/:id garde auto — PATCH /api/admin/users/:id
- **Automatisation :** ✅ api/lot1.test.ts

### TC-LOT1-049 — PATCH /admin/users/:id — utilisateur inexistant → 404

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | valeurs limites (id inexistant) |

- **Préconditions :** Admin connecté.
- **Données :** id = 999999 ; { actif: 1 }
- **Étapes :**
  1. PATCH /api/admin/users/999999
- **Résultat attendu :** 404 ; { error: 'Utilisateur introuvable' }.
- **Traçabilité :** admin PATCH /users/:id garde existence — PATCH /api/admin/users/:id
- **Automatisation :** ✅ api/lot1.test.ts

### TC-LOT1-050 — PATCH /admin/users/:id — 403 non admin / 401 anonyme

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles |

- **Préconditions :** Accompagnateur puis anonyme.
- **Données :** id valide ; { plan_id: null }
- **Étapes :**
  1. PATCH en accompagnateur
  2. PATCH sans session
- **Résultat attendu :** 403 'Accès refusé' puis 401 'Non authentifié'.
- **Traçabilité :** requireAuth + requireRole('admin') — PATCH /api/admin/users/:id
- **Automatisation :** ✅ api/lot1.test.ts

### TC-LOT1-051 — POST /admin/users — création nominale + lien d'activation

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | test du contrat ; test fonctionnel |

- **Préconditions :** Admin connecté ; email non utilisé.
- **Données :** { email: 'qa.lot1@boussole.demo', role: 'accompagne', prenom: 'QA', nom: 'Lot1' }
- **Étapes :**
  1. POST /api/admin/users
  2. GET /api/admin/users
- **Résultat attendu :** 201 ; { id: <number> } ; compte créé email_verifie=1, sans mot de passe ; un token reset_mdp est émis (lien d'activation envoyé).
- **Traçabilité :** admin POST /users — POST /api/admin/users
- **Automatisation :** ✅ api/lot1.test.ts

### TC-LOT1-052 — POST /admin/users — données invalides (email manquant ou rôle hors liste) → 400

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | haute | table de décision (email présent × rôle valide) ; partition d'équivalence |

- **Préconditions :** Admin connecté.
- **Données :** { role: 'accompagne' } (email absent) ; { email: 'x@y.z', role: 'superadmin' }
- **Étapes :**
  1. POST /api/admin/users pour chaque variante
- **Résultat attendu :** 400 ; { error: 'Données invalides' } pour chaque cas (email falsy OU role ∉ ROLES).
- **Traçabilité :** admin POST /users validation — POST /api/admin/users
- **Automatisation :** ✅ api/lot1.test.ts

### TC-LOT1-053 — POST /admin/users — email déjà utilisé → 409

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | haute | test de conflit (409) ; partition d'équivalence |

- **Préconditions :** Admin ; email existant (ex. afrit_mohamed@yahoo.fr).
- **Données :** { email: 'afrit_mohamed@yahoo.fr', role: 'accompagne' }
- **Étapes :**
  1. POST /api/admin/users
- **Résultat attendu :** 409 ; { error: 'Email déjà utilisé' } ; pas de doublon créé.
- **Traçabilité :** admin POST /users conflit — POST /api/admin/users
- **Automatisation :** ✅ api/lot1.test.ts

### TC-LOT1-054 — POST /admin/users — 403 non admin / 401 anonyme

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | basse | test basé sur les rôles |

- **Préconditions :** Accompagnateur puis anonyme.
- **Données :** { email: 'z@z.z', role: 'accompagne' }
- **Étapes :**
  1. POST /api/admin/users en accompagnateur
  2. POST sans session
- **Résultat attendu :** 403 'Accès refusé' puis 401 'Non authentifié' ; aucun compte créé.
- **Traçabilité :** requireAuth + requireRole('admin') — POST /api/admin/users
- **Automatisation :** ✅ api/lot1.test.ts

### TC-LOT1-055 — POST /admin/lien — rattachement nominal accompagné ↔ accompagnateur

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | test du contrat ; test fonctionnel |

- **Préconditions :** Admin ; un accompagnateur et un accompagné existants.
- **Données :** { accompagnateurId: idAcc, accompagneId: idAcp }
- **Étapes :**
  1. POST /api/admin/lien
- **Résultat attendu :** 200 ; { ok: true } ; lien inséré (INSERT OR IGNORE, idempotent).
- **Traçabilité :** admin POST /lien — POST /api/admin/lien
- **Automatisation :** ✅ api/lot1.test.ts

### TC-LOT1-056 — POST /admin/lien — sélection invalide (rôles incohérents) → 400

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | table de décision (rôle attendu côté chaque id) ; partition d'équivalence |

- **Préconditions :** Admin connecté.
- **Données :** { accompagnateurId: idAccompagne, accompagneId: idAccompagnateur } (rôles inversés)
- **Étapes :**
  1. POST /api/admin/lien
- **Résultat attendu :** 400 ; { error: 'Sélection invalide (accompagnateur et accompagné requis)' }.
- **Traçabilité :** admin POST /lien validation rôles — POST /api/admin/lien
- **Automatisation :** ✅ api/lot1.test.ts

### TC-LOT1-057 — POST /admin/lien — 403 non admin

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | basse | test basé sur les rôles |

- **Préconditions :** Accompagnateur connecté.
- **Données :** { accompagnateurId, accompagneId } valides
- **Étapes :**
  1. POST /api/admin/lien en accompagnateur
- **Résultat attendu :** 403 ; { error: 'Accès refusé' }.
- **Traçabilité :** requireRole('admin') — POST /api/admin/lien
- **Automatisation :** ✅ api/lot1.test.ts

### TC-LOT1-058 — UI Admin — l'admin gère les plans (créer, cocher catégorie, enregistrer)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test bout-en-bout basé sur les rôles (admin) |

- **Préconditions :** Admin connecté ; page /admin affichée (PlansManager).
- **Données :** Compte admin
- **Étapes :**
  1. Ouvrir l'onglet Administration
  2. Cliquer '+ Nouveau plan'
  3. Déplier le plan créé
  4. Cliquer 'Tout cocher' sur la catégorie 'Visuel'
  5. Saisir un nom
  6. Cliquer 'Enregistrer'
- **Résultat attendu :** Message de succès « Plan … enregistré. » ; la pastille du nombre de fonctionnalités reflète les clés de la catégorie Visuel ; rechargement de la liste OK.
- **Traçabilité :** PlansManager.tsx — POST/PATCH /api/admin/plans
- **Automatisation :** ⏳ à automatiser

### TC-LOT1-059 — UI Admin — dupliquer puis supprimer un plan (confirmation et réaffectation)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | test bout-en-bout ; table de décision (nb_users 0 vs > 0 dans le message) |

- **Préconditions :** Admin connecté ; un plan avec ≥ 1 utilisateur rattaché.
- **Données :** Plan 'Essentiel'
- **Étapes :**
  1. Déplier 'Essentiel'
  2. Cliquer 'Dupliquer'
  3. Sur la copie cliquer 'Supprimer'
  4. Confirmer la boîte window.confirm
- **Résultat attendu :** Une copie « Essentiel (copie) » apparaît ; après suppression confirmée, le plan disparaît ; le texte de confirmation mentionne la réaffectation au niveau max si nb_users > 0.
- **Traçabilité :** PlansManager.tsx — POST /api/admin/plans/:id/duplication, DELETE /api/admin/plans/:id
- **Automatisation :** ⏳ à automatiser

### TC-LOT1-060 — UI Admin — affecter un plan à un utilisateur dans le tableau des comptes

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test bout-en-bout ; partition d'équivalence (Niveau max vs plan) |

- **Préconditions :** Admin connecté ; page /admin ; un accompagné cible.
- **Données :** User cible ; plan 'Découverte'
- **Étapes :**
  1. Dans la colonne Abonnement, choisir 'Découverte' pour la ligne du user
  2. Observer le rechargement
- **Résultat attendu :** La sélection persiste après reload ; le user a désormais l'abonnement 'Découverte' ; option 'Niveau max' correspond à plan NULL.
- **Traçabilité :** Admin.tsx setPlan — PATCH /api/admin/users/:id
- **Automatisation :** ⏳ à automatiser

### TC-LOT1-061 — UI gating — une fonctionnalité hors offre est masquée pour l'utilisateur restreint

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | acces | haute | test bout-en-bout de gating ; test basé sur les rôles/offre |

- **Préconditions :** Un accompagnateur rattaché au plan 'Découverte' (pas 'mutualisation').
- **Données :** Compte sous Découverte
- **Étapes :**
  1. Se connecter en accompagnateur restreint
  2. Naviguer vers les écrans dépendant de useFeature (ex. mutualisation/ressources)
- **Résultat attendu :** Le bloc/entrée de menu gardé par useFeature('mutualisation') n'est pas rendu (has() false une fois ready) ; aucun appel d'API hors offre déclenché.
- **Traçabilité :** FeaturesContext.tsx useFeature — GET /api/auth/me/features
- **Automatisation :** ⏳ à automatiser

### TC-LOT1-062 — UI gating — utilisateur sans plan voit toutes les fonctionnalités

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | test bout-en-bout ; partition d'équivalence (sans plan) |

- **Préconditions :** Compte sans plan (plan_id NULL).
- **Données :** Compte niveau max
- **Étapes :**
  1. Se connecter
  2. Vérifier l'affichage des sections gardées par useFeature
- **Résultat attendu :** Toutes les sections gardées sont rendues (features = 37 clés ; has() true).
- **Traçabilité :** FeaturesContext.tsx — GET /api/auth/me/features
- **Automatisation :** ⏳ à automatiser

### TC-LOT1-063 — userFeatures — utilisateur inexistant / sans jointure plan renvoie niveau max

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | non-regression | basse | test unitaire ; couverture de branche (row undefined) |

- **Préconditions :** Fonction userFeatures importable ; userId sans plan_id (NULL) ou inexistant.
- **Données :** userId d'un compte plan_id NULL
- **Étapes :**
  1. Appeler userFeatures(userId)
- **Résultat attendu :** La requête JOIN ne renvoie aucune ligne (pas de plan) → Set = ALL_FEATURE_KEYS (niveau max).
- **Traçabilité :** userFeatures branche !row (features.ts)
- **Automatisation :** ⏳ à automatiser

## Domaine PILOT — 59 cas

**Endpoints couverts :**

- `GET /api/pilotage/signaux` · feature: `signaux_faibles` · rôle: accompagnateur — Signaux faibles de décrochage par dossier (voyant vert/orange/rouge + raisons) pour tous les parcours suivis
- `GET /api/pilotage/impact` · feature: `tableau_impact` · rôle: accompagnateur — Tableau d'impact : indicateurs agrégés (dossiers actifs/clôturés, entretiens, CR, actions, progression, météo, répartition des signaux)
- `GET /api/pilotage/digest` · feature: `digest_email` · rôle: accompagnateur — Aperçu du digest hebdomadaire (période, lignes par dossier, impact, résumé, HTML)
- `POST /api/pilotage/digest/envoyer` · feature: `digest_email` · rôle: accompagnateur — Envoie par email à l'accompagnateur connecté le digest de la semaine

### TC-PILOT-001 — GET /pilotage/signaux — réponse nominale 200 et forme de la réponse

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Test du contrat |

- **Préconditions :** Connecté en accompagnateur (Mohamed elafrit.mohamed@gmail.com), sans plan (accès à tout), avec au moins un dossier suivi
- **Données :** Cookie de session accompagnateur valide
- **Étapes :**
  1. GET /api/pilotage/signaux avec cookie accompagnateur
- **Résultat attendu :** 200 ; corps { signaux: [...] } ; chaque élément a dossier_id (number), prenom (string non vide), niveau ∈ {vert,orange,rouge}, raisons (array non vide de strings), signature (string de forme 'niveau|...')
- **Traçabilité :** signaux_faibles · GET /api/pilotage/signaux
- **Automatisation :** ✅ api/pilot.test.ts

### TC-PILOT-002 — GET /pilotage/signaux — ne renvoie que les dossiers de l'accompagnateur connecté

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles |

- **Préconditions :** Deux accompagnateurs (Mohamed et Camille) ont chacun leurs dossiers
- **Données :** Session de Camille (camille.laurent@boussole.demo)
- **Étapes :**
  1. Se connecter en Camille
  2. GET /api/pilotage/signaux
  3. Vérifier les dossier_id retournés
- **Résultat attendu :** 200 ; seuls les dossiers dont accompagnateur_id = id de Camille sont présents (BASE_SQL filtre WHERE d.accompagnateur_id=?) ; aucun dossier de Mohamed
- **Traçabilité :** signaux_faibles · GET /api/pilotage/signaux
- **Automatisation :** ✅ api/pilot.test.ts

### TC-PILOT-003 — GET /pilotage/signaux — 401 si non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles |

- **Préconditions :** Aucune session
- **Données :** Aucun cookie boussole_token
- **Étapes :**
  1. GET /api/pilotage/signaux sans cookie
- **Résultat attendu :** 401 ; { error: 'Non authentifié' }
- **Traçabilité :** requireAuth · GET /api/pilotage/signaux
- **Automatisation :** ✅ api/pilot.test.ts

### TC-PILOT-004 — GET /pilotage/signaux — 401 si jeton invalide/expiré

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | Partition d'équivalence (jeton invalide) |

- **Préconditions :** Cookie présent mais corrompu
- **Données :** boussole_token = 'jeton.bidon.123'
- **Étapes :**
  1. GET /api/pilotage/signaux avec cookie corrompu
- **Résultat attendu :** 401 ; { error: 'Session invalide' }
- **Traçabilité :** requireAuth · GET /api/pilotage/signaux
- **Automatisation :** ✅ api/pilot.test.ts

### TC-PILOT-005 — GET /pilotage/signaux — 403 si rôle accompagné

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles |

- **Préconditions :** Connecté en accompagné (Amine afrit_mohamed@yahoo.fr)
- **Données :** Session accompagné
- **Étapes :**
  1. Se connecter en accompagné
  2. GET /api/pilotage/signaux
- **Résultat attendu :** 403 ; { error: 'Accès refusé' } (requireRole('accompagnateur'))
- **Traçabilité :** requireRole · GET /api/pilotage/signaux
- **Automatisation :** ✅ api/pilot.test.ts

### TC-PILOT-006 — GET /pilotage/signaux — 403 si rôle admin

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | Test basé sur les rôles |

- **Préconditions :** Connecté en admin (mohamed@elafrit.com)
- **Données :** Session admin
- **Étapes :**
  1. Se connecter en admin
  2. GET /api/pilotage/signaux
- **Résultat attendu :** 403 ; { error: 'Accès refusé' } (le rôle admin n'est pas autorisé, seul 'accompagnateur')
- **Traçabilité :** requireRole · GET /api/pilotage/signaux
- **Automatisation :** ✅ api/pilot.test.ts

### TC-PILOT-007 — GET /pilotage/signaux — 403 si offre sans la fonctionnalité signaux_faibles

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Table de décision (rôle OK × feature absente) |

- **Préconditions :** Accompagnateur affecté à un plan (ex. Découverte/Essentiel) ne contenant pas 'signaux_faibles'
- **Données :** plan_id pointant vers un plan dont features n'inclut pas signaux_faibles
- **Étapes :**
  1. Affecter à l'accompagnateur un plan sans signaux_faibles
  2. GET /api/pilotage/signaux
- **Résultat attendu :** 403 ; { error: 'Fonctionnalité non disponible dans votre offre' } (requireFeature)
- **Traçabilité :** requireFeature('signaux_faibles') · GET /api/pilotage/signaux
- **Automatisation :** ✅ api/pilot.test.ts

### TC-PILOT-008 — GET /pilotage/signaux — accès OK avec plan Pro (signaux_faibles inclus)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | Table de décision (rôle OK × feature présente) |

- **Préconditions :** Accompagnateur affecté au plan Pro (toutes features)
- **Données :** plan_id = Pro
- **Étapes :**
  1. Affecter le plan Pro à l'accompagnateur
  2. GET /api/pilotage/signaux
- **Résultat attendu :** 200 ; corps { signaux: [...] }
- **Traçabilité :** requireFeature('signaux_faibles') · GET /api/pilotage/signaux
- **Automatisation :** ✅ api/pilot.test.ts

### TC-PILOT-009 — GET /pilotage/signaux — accompagnateur sans aucun dossier renvoie une liste vide

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | Valeurs limites (0 dossier) |

- **Préconditions :** Accompagnateur (rôle correct, accès feature) sans dossier suivi
- **Données :** Compte accompagnateur fraîchement créé sans dossiers
- **Étapes :**
  1. Se connecter avec un accompagnateur sans dossiers
  2. GET /api/pilotage/signaux
- **Résultat attendu :** 200 ; { signaux: [] }
- **Traçabilité :** signaux_faibles · GET /api/pilotage/signaux
- **Automatisation :** ✅ api/pilot.test.ts

### TC-PILOT-010 — Unitaire signauxDossier — dossier clôturé renvoie toujours vert 'Parcours clôturé'

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | haute | Table de décision (règle prioritaire) |

- **Préconditions :** Fonction signauxDossier accessible en test (import direct du module pilotage)
- **Données :** DossierRow avec statut='cloture' et toutes valeurs d'alerte fortes (actions_retard=5, inactif>30, etc.)
- **Étapes :**
  1. Appeler signauxDossier(d) avec statut='cloture'
- **Résultat attendu :** { niveau:'vert', raisons:['Parcours clôturé'] } — court-circuit en début de fonction, aucune autre règle évaluée
- **Traçabilité :** signaux_faibles · signauxDossier()
- **Automatisation :** ⏳ à automatiser

### TC-PILOT-011 — Unitaire signauxDossier — inactivité > 30 jours déclenche un rouge

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | haute | Valeurs limites (seuil 30 jours) |

- **Préconditions :** Pas de relevé météo (ou neutre)
- **Données :** last_session/last_cr/last_journal null, cree_le il y a 40 jours, statut='actif'
- **Étapes :**
  1. Appeler signauxDossier(d)
- **Résultat attendu :** niveau='rouge' ; raisons contient 'Aucune activité depuis 40 jours' (inactif>30 → rouge)
- **Traçabilité :** signaux_faibles · signauxDossier()
- **Automatisation :** ⏳ à automatiser

### TC-PILOT-012 — Unitaire signauxDossier — valeurs limites du seuil d'inactivité (14 et 30)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | validation | haute | Valeurs limites |

- **Préconditions :** Aucune autre règle déclenchée
- **Données :** Cas A inactif=14j (limite basse), Cas B inactif=15j, Cas C inactif=30j, Cas D inactif=31j
- **Étapes :**
  1. Appeler signauxDossier pour chaque cas en fixant la dernière activité
- **Résultat attendu :** 14j → ni orange ni rouge (vert) ; 15j → orange 'Activité en baisse (15 jours...)' ; 30j → orange ; 31j → rouge 'Aucune activité depuis 31 jours' (>14 et >30 stricts)
- **Traçabilité :** signaux_faibles · signauxDossier()
- **Automatisation :** ⏳ à automatiser

### TC-PILOT-013 — Unitaire signauxDossier — questionnaire non complété et âge > 7 jours → orange

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | moyenne | Valeurs limites (seuil 7 jours) |

- **Préconditions :** Aucune règle rouge active
- **Données :** questionnaire_complete=null, cree_le il y a 10 jours, activité récente pour ne pas déclencher l'inactivité
- **Étapes :**
  1. Appeler signauxDossier(d)
- **Résultat attendu :** raisons contient 'Questionnaire initial non complété' ; niveau au moins orange
- **Traçabilité :** signaux_faibles · signauxDossier()
- **Automatisation :** ⏳ à automatiser

### TC-PILOT-014 — Unitaire signauxDossier — questionnaire non complété mais âge ≤ 7 jours → pas d'alerte

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | validation | moyenne | Valeurs limites (juste sous le seuil 7) |

- **Préconditions :** Aucune autre règle active
- **Données :** questionnaire_complete=null, cree_le il y a 5 jours, activité récente
- **Étapes :**
  1. Appeler signauxDossier(d)
- **Résultat attendu :** La raison 'Questionnaire initial non complété' n'apparaît pas (ageCreation>7 strict) ; niveau='vert' avec raisons ['Parcours en bonne santé']
- **Traçabilité :** signaux_faibles · signauxDossier()
- **Automatisation :** ⏳ à automatiser

### TC-PILOT-015 — Unitaire signauxDossier — partition du nombre d'actions en retard (0 / 1-2 / ≥3)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | haute | Partition d'équivalence + valeurs limites + accord singulier/pluriel |

- **Préconditions :** Aucune règle d'inactivité active
- **Données :** Cas A actions_retard=0, Cas B=1, Cas C=2, Cas D=3
- **Étapes :**
  1. Appeler signauxDossier pour chaque valeur
- **Résultat attendu :** 0 → pas de raison action ; 1 → orange '1 action en retard' (singulier) ; 2 → orange '2 actions en retard' (pluriel) ; 3 → rouge '3 actions en retard'
- **Traçabilité :** signaux_faibles · signauxDossier()
- **Automatisation :** ⏳ à automatiser

### TC-PILOT-016 — Unitaire signauxDossier — demande de RDV en attente → orange

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | moyenne | Partition d'équivalence |

- **Préconditions :** Aucune règle rouge active
- **Données :** demandes_rdv=1, reste neutre
- **Étapes :**
  1. Appeler signauxDossier(d)
- **Résultat attendu :** raisons contient 'Demande de rendez-vous en attente' ; niveau='orange'
- **Traçabilité :** signaux_faibles · signauxDossier()
- **Automatisation :** ⏳ à automatiser

### TC-PILOT-017 — Unitaire signauxDossier — aucun RDV planifié après dernier entretien > 14 jours → orange

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | moyenne | Table de décision (3 conditions combinées) |

- **Préconditions :** nb_sessions>0, rdv_avenir=0
- **Données :** nb_sessions=2, rdv_avenir=0, last_session il y a 20 jours (mais autre activité récente pour ne pas déclencher l'inactivité globale)
- **Étapes :**
  1. Appeler signauxDossier(d)
- **Résultat attendu :** raisons contient 'Aucun rendez-vous planifié' ; condition (nb_sessions>0 && rdv_avenir===0 && joursDernierEntretien>14)
- **Traçabilité :** signaux_faibles · signauxDossier()
- **Automatisation :** ⏳ à automatiser

### TC-PILOT-018 — Unitaire signauxDossier — météo au plus bas (niveau ≤ 2) → orange avec mot cité

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | moyenne | Valeurs limites (seuil météo ≤ 2) |

- **Préconditions :** Table meteo_humeur avec un relevé récent role='accompagne'
- **Données :** Dernier relevé niveau=2, mot='fatigué'
- **Étapes :**
  1. Insérer le relevé météo
  2. Appeler signauxDossier(d)
- **Résultat attendu :** raisons contient 'Météo au plus bas (« fatigué »)' ; niveau='orange'
- **Traçabilité :** signaux_faibles · signauxDossier() (requête meteo_humeur)
- **Automatisation :** ⏳ à automatiser

### TC-PILOT-019 — Unitaire signauxDossier — tendance météo à la baisse (delta ≥ 2 entre 2 derniers relevés) → 'Moral en baisse'

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | moyenne | Valeurs limites (delta ≥ 2) |

- **Préconditions :** Deux relevés météo, le dernier en premier (ORDER BY cree_le DESC LIMIT 2)
- **Données :** meteo[0].niveau=3 (récent), meteo[1].niveau=5 (précédent) → 5-3=2
- **Étapes :**
  1. Insérer 2 relevés météo
  2. Appeler signauxDossier(d)
- **Résultat attendu :** raisons contient 'Moral en baisse' (branche else-if : meteo[0].niveau>2 mais meteo[1]-meteo[0]>=2) ; niveau='orange'
- **Traçabilité :** signaux_faibles · signauxDossier()
- **Automatisation :** ⏳ à automatiser

### TC-PILOT-020 — Unitaire signauxDossier — dossier sain → vert avec raison 'Parcours en bonne santé'

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | haute | Partition d'équivalence (classe nominale) |

- **Préconditions :** Aucune règle déclenchée
- **Données :** statut='actif', activité récente (<14j), questionnaire complété, 0 action en retard, 0 demande RDV, RDV à venir, météo haute
- **Étapes :**
  1. Appeler signauxDossier(d)
- **Résultat attendu :** { niveau:'vert', raisons:['Parcours en bonne santé'] }
- **Traçabilité :** signaux_faibles · signauxDossier()
- **Automatisation :** ⏳ à automatiser

### TC-PILOT-021 — Unitaire signauxDossier — niveau rouge agrège rouges PUIS oranges dans raisons

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | moyenne | Table de décision (priorité + ordre de concaténation) |

- **Préconditions :** Au moins une cause rouge et une cause orange simultanées
- **Données :** actions_retard=3 (rouge) + demandes_rdv=1 (orange)
- **Étapes :**
  1. Appeler signauxDossier(d)
- **Résultat attendu :** niveau='rouge' ; raisons = [...rouges, ...oranges] : '3 actions en retard' avant 'Demande de rendez-vous en attente'
- **Traçabilité :** signaux_faibles · signauxDossier()
- **Automatisation :** ⏳ à automatiser

### TC-PILOT-022 — Unitaire joursDepuis — robustesse (null, date invalide, date valide)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | validation | moyenne | Partition d'équivalence + cas limites de parsing |

- **Préconditions :** Fonction joursDepuis testable
- **Données :** Cas A null, Cas B 'pas-une-date', Cas C une date ISO il y a ~5 jours, Cas D format 'YYYY-MM-DD HH:MM:SS' (espace)
- **Étapes :**
  1. Appeler joursDepuis pour chaque entrée
- **Résultat attendu :** null → null ; date invalide → null (Number.isNaN) ; date valide → entier ≈5 ; format avec espace converti en T et parsé correctement
- **Traçabilité :** signaux_faibles · joursDepuis()
- **Automatisation :** ⏳ à automatiser

### TC-PILOT-023 — Unitaire computeSignaux — signature stable et triée pour la déduplication

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | moyenne | Test du contrat (idempotence de la signature) |

- **Préconditions :** Un dossier avec plusieurs raisons
- **Données :** Dossier produisant niveau='orange' avec raisons multiples
- **Étapes :**
  1. Appeler computeSignaux(accId)
  2. Inspecter signature
- **Résultat attendu :** signature = 'niveau|raisons triées jointes par ;' ; déterministe et indépendante de l'ordre d'insertion des raisons (sort())
- **Traçabilité :** signaux_faibles · computeSignaux()
- **Automatisation :** ⏳ à automatiser

### TC-PILOT-024 — Unitaire computeSignaux — prenom retombe sur l'email si prenom null

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | validation | basse | Partition d'équivalence (valeur nulle) |

- **Préconditions :** Accompagné sans prénom
- **Données :** DossierRow prenom=null, email='lea.martin@boussole.demo'
- **Étapes :**
  1. Appeler computeSignaux(accId)
- **Résultat attendu :** signal.prenom === email de l'accompagné (fallback d.prenom || d.email)
- **Traçabilité :** signaux_faibles · computeSignaux()
- **Automatisation :** ⏳ à automatiser

### TC-PILOT-025 — GET /pilotage/impact — réponse nominale 200 et contrat des indicateurs

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Test du contrat |

- **Préconditions :** Accompagnateur connecté, accès tableau_impact, dossiers suivis
- **Données :** Session accompagnateur (sans plan)
- **Étapes :**
  1. GET /api/pilotage/impact
- **Résultat attendu :** 200 ; corps contient dossiers_actifs, dossiers_clotures, entretiens_total, cr_publies, syntheses_publiees, actions_total, actions_faites, taux_actions, progression_moyenne (tous number), meteo_evolution (number|null), signaux {vert,orange,rouge} (number)
- **Traçabilité :** tableau_impact · GET /api/pilotage/impact
- **Automatisation :** ✅ api/pilot.test.ts

### TC-PILOT-026 — GET /pilotage/impact — 401 non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles |

- **Préconditions :** Aucune session
- **Données :** Aucun cookie
- **Étapes :**
  1. GET /api/pilotage/impact sans cookie
- **Résultat attendu :** 401 ; { error: 'Non authentifié' }
- **Traçabilité :** requireAuth · GET /api/pilotage/impact
- **Automatisation :** ✅ api/pilot.test.ts

### TC-PILOT-027 — GET /pilotage/impact — 403 mauvais rôle (accompagné)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles |

- **Préconditions :** Connecté en accompagné
- **Données :** Session Amine afrit_mohamed@yahoo.fr
- **Étapes :**
  1. GET /api/pilotage/impact
- **Résultat attendu :** 403 ; { error: 'Accès refusé' }
- **Traçabilité :** requireRole · GET /api/pilotage/impact
- **Automatisation :** ✅ api/pilot.test.ts

### TC-PILOT-028 — GET /pilotage/impact — 403 si offre sans tableau_impact

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Table de décision (rôle OK × feature absente) |

- **Préconditions :** Accompagnateur sur plan sans 'tableau_impact'
- **Données :** plan_id sans tableau_impact
- **Étapes :**
  1. Affecter le plan restreint
  2. GET /api/pilotage/impact
- **Résultat attendu :** 403 ; { error: 'Fonctionnalité non disponible dans votre offre' }
- **Traçabilité :** requireFeature('tableau_impact') · GET /api/pilotage/impact
- **Automatisation :** ✅ api/pilot.test.ts

### TC-PILOT-029 — GET /pilotage/impact — agrégats restreints aux dossiers de l'accompagnateur

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles (isolation des données) |

- **Préconditions :** Deux accompagnateurs avec dossiers distincts
- **Données :** Session Camille
- **Étapes :**
  1. GET /api/pilotage/impact en Camille
  2. Comparer aux dossiers d'un autre accompagnateur
- **Résultat attendu :** 200 ; les totaux ne comptent que les dossiers accompagnateur_id=Camille ; aucun chevauchement avec Mohamed
- **Traçabilité :** tableau_impact · GET /api/pilotage/impact
- **Automatisation :** ✅ api/pilot.test.ts

### TC-PILOT-030 — Unitaire computeImpact — taux_actions = 0 quand actions_total = 0 (pas de division par zéro)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | validation | haute | Valeurs limites (dénominateur nul) |

- **Préconditions :** Dossiers sans aucune action
- **Données :** Tous dossiers actions_total=0
- **Étapes :**
  1. Appeler computeImpact(accId)
- **Résultat attendu :** taux_actions=0 (garde actionsTotal ? ... : 0) ; pas de NaN
- **Traçabilité :** tableau_impact · computeImpact()
- **Automatisation :** ⏳ à automatiser

### TC-PILOT-031 — Unitaire computeImpact — taux_actions calculé et arrondi

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | moyenne | Valeurs limites (arrondi) |

- **Préconditions :** Dossiers avec actions
- **Données :** actions_total cumulé=8, actions_faites cumulé=3 → 37.5%
- **Étapes :**
  1. Appeler computeImpact(accId)
- **Résultat attendu :** taux_actions = Math.round(3/8*100) = 38
- **Traçabilité :** tableau_impact · computeImpact()
- **Automatisation :** ⏳ à automatiser

### TC-PILOT-032 — Unitaire computeImpact — progression_moyenne basée sur phase_max des dossiers actifs uniquement

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | moyenne | Partition d'équivalence (actif vs clôturé, phase null) |

- **Préconditions :** Mix de dossiers actifs/clôturés
- **Données :** 2 actifs phase_max=2 et 5 ((2+1)/6 et (5+1)/6) ; 1 clôturé ignoré
- **Étapes :**
  1. Appeler computeImpact(accId)
- **Résultat attendu :** progressions calculées sur les actifs seulement ; phase_max null → 0 ; progression_moyenne = round(moyenne*100)
- **Traçabilité :** tableau_impact · computeImpact()
- **Automatisation :** ⏳ à automatiser

### TC-PILOT-033 — Unitaire computeImpact — progression_moyenne = 0 quand aucun dossier actif

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | validation | moyenne | Valeurs limites (0 dossier actif) |

- **Préconditions :** Tous les dossiers clôturés
- **Données :** actifs = []
- **Étapes :**
  1. Appeler computeImpact(accId)
- **Résultat attendu :** progression_moyenne=0 (progressions.length ? ... : 0) ; dossiers_actifs=0 ; dossiers_clotures = nombre total
- **Traçabilité :** tableau_impact · computeImpact()
- **Automatisation :** ⏳ à automatiser

### TC-PILOT-034 — Unitaire computeImpact — meteo_evolution null si aucun dossier n'a ≥ 2 relevés

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | validation | moyenne | Valeurs limites (pas de delta calculable) |

- **Préconditions :** Relevés météo absents ou ≤ 1 par dossier
- **Données :** Chaque dossier a 0 ou 1 relevé météo accompagné
- **Étapes :**
  1. Appeler computeImpact(accId)
- **Résultat attendu :** meteo_evolution = null (nDeltas=0)
- **Traçabilité :** tableau_impact · computeImpact()
- **Automatisation :** ⏳ à automatiser

### TC-PILOT-035 — Unitaire computeImpact — meteo_evolution = moyenne des (dernier - premier) arrondie au dixième

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | moyenne | Valeurs limites (arrondi au dixième, delta négatif/positif) |

- **Préconditions :** Au moins un dossier avec ≥ 2 relevés (ORDER BY cree_le ASC)
- **Données :** Dossier A : premier=2, dernier=4 → +2 ; Dossier B : premier=3, dernier=3 → 0 ; moyenne=1.0
- **Étapes :**
  1. Insérer les relevés
  2. Appeler computeImpact(accId)
- **Résultat attendu :** meteo_evolution = Math.round((deltas/nDeltas)*10)/10 = 1 ; signe positif possible
- **Traçabilité :** tableau_impact · computeImpact()
- **Automatisation :** ⏳ à automatiser

### TC-PILOT-036 — Unitaire computeImpact — répartition des signaux cohérente avec computeSignaux

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | moyenne | Test du contrat (cohérence d'agrégat) |

- **Préconditions :** Dossiers de niveaux mixtes
- **Données :** Dossiers produisant 1 vert, 1 orange, 1 rouge
- **Étapes :**
  1. Appeler computeImpact(accId)
- **Résultat attendu :** signaux = {vert:1, orange:1, rouge:1} ; somme = nombre total de dossiers (clôturés inclus, comptés vert)
- **Traçabilité :** tableau_impact · computeImpact()
- **Automatisation :** ⏳ à automatiser

### TC-PILOT-037 — GET /pilotage/digest — réponse nominale 200 et contrat de l'aperçu

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Test du contrat |

- **Préconditions :** Accompagnateur connecté, accès digest_email
- **Données :** Session accompagnateur
- **Étapes :**
  1. GET /api/pilotage/digest
- **Résultat attendu :** 200 ; corps { periode:'7 derniers jours', lignes:[...], impact:{...}, resume:{alertes, actifs}, html:string non vide } ; chaque ligne a dossier_id, prenom, niveau, cr_semaine, meteo_semaine, journal_semaine, actions_retard, rdv_7j
- **Traçabilité :** digest_email · GET /api/pilotage/digest
- **Automatisation :** ✅ api/pilot.test.ts

### TC-PILOT-038 — GET /pilotage/digest — 401 non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles |

- **Préconditions :** Aucune session
- **Données :** Aucun cookie
- **Étapes :**
  1. GET /api/pilotage/digest sans cookie
- **Résultat attendu :** 401 ; { error: 'Non authentifié' }
- **Traçabilité :** requireAuth · GET /api/pilotage/digest
- **Automatisation :** ✅ api/pilot.test.ts

### TC-PILOT-039 — GET /pilotage/digest — 403 mauvais rôle (accompagné)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles |

- **Préconditions :** Connecté en accompagné
- **Données :** Session Léa lea.martin@boussole.demo
- **Étapes :**
  1. GET /api/pilotage/digest
- **Résultat attendu :** 403 ; { error: 'Accès refusé' }
- **Traçabilité :** requireRole · GET /api/pilotage/digest
- **Automatisation :** ✅ api/pilot.test.ts

### TC-PILOT-040 — GET /pilotage/digest — 403 si offre sans digest_email

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Table de décision (rôle OK × feature absente) |

- **Préconditions :** Accompagnateur sur plan sans 'digest_email'
- **Données :** plan_id sans digest_email
- **Étapes :**
  1. Affecter le plan restreint
  2. GET /api/pilotage/digest
- **Résultat attendu :** 403 ; { error: 'Fonctionnalité non disponible dans votre offre' }
- **Traçabilité :** requireFeature('digest_email') · GET /api/pilotage/digest
- **Automatisation :** ✅ api/pilot.test.ts

### TC-PILOT-041 — Unitaire buildDigest — fenêtre 7 jours pour CR/météo/journal/RDV

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | moyenne | Valeurs limites (fenêtre temporelle) |

- **Préconditions :** Données réparties autour de la limite des 7 jours
- **Données :** CR publié il y a 3j (compté) et il y a 10j (exclu) ; journal partagé (partage=1) <7j ; RDV dans 5j (compté) et dans 9j (exclu)
- **Étapes :**
  1. Appeler buildDigest(accId)
  2. Inspecter la ligne du dossier
- **Résultat attendu :** cr_semaine ne compte que les CR publie=1 ET publie_le >= -7 days ; journal_semaine ne compte que partage=1 ; rdv_7j ne compte que c.debut entre now et +7 days
- **Traçabilité :** digest_email · buildDigest()
- **Automatisation :** ⏳ à automatiser

### TC-PILOT-042 — Unitaire buildDigest — section 'Points de vigilance' présente quand au moins une alerte (niveau ≠ vert)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | moyenne | Table de décision (présence/absence d'alerte) |

- **Préconditions :** Au moins un dossier orange/rouge
- **Données :** 1 dossier rouge avec actions_retard=2
- **Étapes :**
  1. Appeler buildDigest(accId)
  2. Inspecter html et resume.alertes
- **Résultat attendu :** html contient '<h4>Points de vigilance</h4>' et une ligne avec l'emoji du niveau et '2 action(s) en retard' ; resume.alertes >= 1
- **Traçabilité :** digest_email · buildDigest()
- **Automatisation :** ⏳ à automatiser

### TC-PILOT-043 — Unitaire buildDigest — message 'Aucun signal' quand tous les dossiers sont verts

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | basse | Partition d'équivalence (0 alerte) |

- **Préconditions :** Tous les dossiers verts
- **Données :** Dossiers sains uniquement
- **Étapes :**
  1. Appeler buildDigest(accId)
- **Résultat attendu :** html contient '✅ Aucun signal de décrochage cette semaine.' ; resume.alertes=0
- **Traçabilité :** digest_email · buildDigest()
- **Automatisation :** ⏳ à automatiser

### TC-PILOT-044 — Unitaire buildDigest — message 'Aucune nouvelle activité' quand aucune activité sur 7j

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | validation | basse | Valeurs limites (aucune activité) |

- **Préconditions :** Aucune activité récente, aucune action en retard
- **Données :** cr_semaine=meteo_semaine=journal_semaine=rdv_7j=0 et actions_retard=0 pour tous
- **Étapes :**
  1. Appeler buildDigest(accId)
- **Résultat attendu :** html contient 'Aucune nouvelle activité des accompagnés cette semaine.' (actives.length=0)
- **Traçabilité :** digest_email · buildDigest()
- **Automatisation :** ⏳ à automatiser

### TC-PILOT-045 — Unitaire esc — échappement HTML du prénom (anti-injection dans le digest)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | validation | haute | Test du contrat (sanitization) + sécurité XSS |

- **Préconditions :** Fonction esc testable ; prénom contenant des caractères spéciaux
- **Données :** prenom = '<script>&"x'
- **Étapes :**
  1. Appeler buildDigest avec un accompagné dont le prénom contient des balises
  2. Inspecter html
- **Résultat attendu :** Le prénom est échappé : < → &lt; , > → &gt; , & → &amp; , " → &quot; ; aucune balise <script> brute dans le HTML
- **Traçabilité :** digest_email · esc() · buildDigest()
- **Automatisation :** ⏳ à automatiser

### TC-PILOT-046 — Unitaire buildDigest — en-tête reprend les indicateurs d'impact

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | basse | Test du contrat (cohérence digest ↔ impact) |

- **Préconditions :** computeImpact retourne des valeurs connues
- **Données :** impact.dossiers_actifs=2, taux_actions=50, progression_moyenne=33
- **Étapes :**
  1. Appeler buildDigest(accId)
  2. Inspecter html
- **Résultat attendu :** html contient '2' parcours actifs, '50%' d'actions réalisées et 'progression moyenne 33%'
- **Traçabilité :** digest_email · buildDigest()
- **Automatisation :** ⏳ à automatiser

### TC-PILOT-047 — POST /pilotage/digest/envoyer — envoi nominal 200 { ok:true, envoye_a }

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Test du contrat |

- **Préconditions :** Accompagnateur connecté, accès digest_email ; mailer disponible (SMTP dev/maildev)
- **Données :** Session accompagnateur (email connu)
- **Étapes :**
  1. POST /api/pilotage/digest/envoyer
- **Résultat attendu :** 200 ; { ok:true, envoye_a:<email de l'accompagnateur connecté> } ; un email 'Boussole — Votre digest de la semaine' est émis vers cet email
- **Traçabilité :** digest_email · POST /api/pilotage/digest/envoyer
- **Automatisation :** ✅ api/pilot.test.ts

### TC-PILOT-048 — POST /pilotage/digest/envoyer — 401 non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles |

- **Préconditions :** Aucune session
- **Données :** Aucun cookie
- **Étapes :**
  1. POST /api/pilotage/digest/envoyer sans cookie
- **Résultat attendu :** 401 ; { error: 'Non authentifié' } ; aucun email envoyé
- **Traçabilité :** requireAuth · POST /api/pilotage/digest/envoyer
- **Automatisation :** ✅ api/pilot.test.ts

### TC-PILOT-049 — POST /pilotage/digest/envoyer — 403 mauvais rôle (accompagné)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles |

- **Préconditions :** Connecté en accompagné
- **Données :** Session Karim karim.benali@boussole.demo
- **Étapes :**
  1. POST /api/pilotage/digest/envoyer
- **Résultat attendu :** 403 ; { error: 'Accès refusé' } ; aucun email envoyé
- **Traçabilité :** requireRole · POST /api/pilotage/digest/envoyer
- **Automatisation :** ✅ api/pilot.test.ts

### TC-PILOT-050 — POST /pilotage/digest/envoyer — 403 si offre sans digest_email

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Table de décision (rôle OK × feature absente) |

- **Préconditions :** Accompagnateur sur plan sans 'digest_email'
- **Données :** plan_id sans digest_email
- **Étapes :**
  1. Affecter le plan restreint
  2. POST /api/pilotage/digest/envoyer
- **Résultat attendu :** 403 ; { error: 'Fonctionnalité non disponible dans votre offre' } ; aucun email envoyé
- **Traçabilité :** requireFeature('digest_email') · POST /api/pilotage/digest/envoyer
- **Automatisation :** ✅ api/pilot.test.ts

### TC-PILOT-051 — POST /pilotage/digest/envoyer — envoie au PROPRE email, pas à celui d'un autre accompagnateur

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | Test basé sur les rôles (isolation destinataire) |

- **Préconditions :** Deux accompagnateurs distincts
- **Données :** Session Camille
- **Étapes :**
  1. POST /api/pilotage/digest/envoyer en Camille
- **Résultat attendu :** envoye_a = email de Camille (SELECT email WHERE id = me.id) ; jamais l'email de Mohamed
- **Traçabilité :** digest_email · POST /api/pilotage/digest/envoyer
- **Automatisation :** ✅ api/pilot.test.ts

### TC-PILOT-052 — UI Signaux faibles — voyant coloré et raisons sur les cartes du tableau de bord

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | Test bout-en-bout basé sur le rôle |

- **Préconditions :** Accompagnateur (Mohamed) connecté avec feature signaux_faibles, au moins un dossier orange/rouge
- **Données :** Compte démo Mohamed (mdp BoussoleDemo2026)
- **Étapes :**
  1. Se connecter en accompagnateur
  2. Ouvrir /tableau-de-bord
  3. Observer la pastille colorée à côté du nom d'un accompagné
  4. Survoler la pastille (title) et lire la première raison sous le nom
- **Résultat attendu :** Une pastille de couleur (vert/orange/rouge) s'affiche par dossier ; pour orange/rouge la 1re raison est visible ; aria-label et title listent les raisons
- **Traçabilité :** signaux_faibles · Dashboard.tsx (GET /api/pilotage/signaux)
- **Automatisation :** ⏳ à automatiser

### TC-PILOT-053 — UI Signaux faibles — pastilles masquées quand la feature est absente

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | acces | moyenne | Test bout-en-bout (gating UI) |

- **Préconditions :** Accompagnateur sur un plan sans signaux_faibles
- **Données :** Plan Découverte/Essentiel sans signaux_faibles
- **Étapes :**
  1. Se connecter
  2. Ouvrir /tableau-de-bord
  3. Observer les cartes des dossiers
- **Résultat attendu :** Aucune pastille de signal n'est affichée (useFeature('signaux_faibles') faux ; l'appel /pilotage/signaux n'est pas déclenché)
- **Traçabilité :** signaux_faibles · Dashboard.tsx
- **Automatisation :** ⏳ à automatiser

### TC-PILOT-054 — UI Tableau d'impact — tuiles d'indicateurs affichées

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | Test bout-en-bout basé sur le rôle |

- **Préconditions :** Accompagnateur connecté avec feature tableau_impact
- **Données :** Compte démo Mohamed
- **Étapes :**
  1. Ouvrir /tableau-de-bord
  2. Repérer la section '📊 Tableau d’impact'
  3. Lire les tuiles
- **Résultat attendu :** Section visible avec tuiles : Parcours actifs, Progression moyenne %, Actions réalisées %, Entretiens menés, Comptes rendus publiés, Évolution météo (— si null), et la répartition 🟢🟠🔴 + clôturés/synthèses
- **Traçabilité :** tableau_impact · PilotageBoard.tsx (GET /api/pilotage/impact)
- **Automatisation :** ⏳ à automatiser

### TC-PILOT-055 — UI Digest — aperçu et envoi du digest hebdomadaire

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | Test bout-en-bout basé sur le rôle |

- **Préconditions :** Accompagnateur connecté avec feature digest_email
- **Données :** Compte démo Mohamed
- **Étapes :**
  1. Ouvrir /tableau-de-bord
  2. Section '✉️ Digest hebdomadaire'
  3. Cliquer 'Aperçu' pour afficher le HTML
  4. Cliquer 'M’envoyer le digest'
- **Résultat attendu :** Le bouton Aperçu affiche/masque le contenu HTML du digest ; après envoi, message 'Digest envoyé à <email> ✓' ; le bouton est désactivé pendant l'envoi (busy)
- **Traçabilité :** digest_email · PilotageBoard.tsx (GET /api/pilotage/digest, POST /api/pilotage/digest/envoyer)
- **Automatisation :** ⏳ à automatiser

### TC-PILOT-056 — UI Pilotage — section entièrement masquée si ni tableau_impact ni digest_email

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | acces | moyenne | Test bout-en-bout (gating UI combiné) |

- **Préconditions :** Accompagnateur sur un plan sans tableau_impact ni digest_email
- **Données :** Plan restreint
- **Étapes :**
  1. Ouvrir /tableau-de-bord
  2. Chercher les sections impact et digest
- **Résultat attendu :** PilotageBoard ne rend rien (if !impactActif && !digestActif return null) ; aucune section impact/digest affichée
- **Traçabilité :** tableau_impact + digest_email · PilotageBoard.tsx
- **Automatisation :** ⏳ à automatiser

### TC-PILOT-057 — Non-régression — accès pilotage inchangé pour un accompagnateur sans plan (accès à tout)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | non-regression | moyenne | Test du contrat (configuration par défaut) |

- **Préconditions :** Accompagnateur sans plan_id (userFeatures renvoie ALL_FEATURE_KEYS)
- **Données :** Compte démo Mohamed (sans plan)
- **Étapes :**
  1. GET /api/pilotage/signaux
  2. GET /api/pilotage/impact
  3. GET /api/pilotage/digest
  4. POST /api/pilotage/digest/envoyer
- **Résultat attendu :** Les 4 endpoints répondent 200 (aucun plan → toutes features activées)
- **Traçabilité :** features.userFeatures · GET/POST /api/pilotage/*
- **Automatisation :** ✅ api/pilot.test.ts

### TC-PILOT-058 — Unitaire sweepSignauxAlertes — déduplication par signature et gating signaux_faibles

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | moyenne | Table de décision (changement d'état × gating) |

- **Préconditions :** Table signaux_etat et notifications accessibles ; au moins un accompagnateur avec feature signaux_faibles
- **Données :** Un dossier passant de vert à rouge, puis sweep relancé sans changement
- **Étapes :**
  1. Appeler sweepSignauxAlertes() une 1re fois (montée vert→rouge)
  2. Relancer sweepSignauxAlertes() sans changement d'état
- **Résultat attendu :** 1er passage : upsert signaux_etat + 1 notification insérée (montée) ; 2e passage : prev.signature === s.signature → aucune nouvelle notification ; accompagnateur sans 'signaux_faibles' ignoré (continue)
- **Traçabilité :** signaux_faibles · sweepSignauxAlertes()
- **Automatisation :** ⏳ à automatiser

### TC-PILOT-059 — Unitaire sweepDigestsHebdo — désactivé par défaut et un envoi par semaine ISO

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | validation | basse | Table de décision (cron × créneau × idempotence) |

- **Préconditions :** Fonction sweepDigestsHebdo testable ; contrôle de DIGEST_CRON et de l'heure
- **Données :** Cas A DIGEST_CRON non défini ; Cas B DIGEST_CRON=1 un lundi 08h avec digest_envois déjà présent pour la semaine
- **Étapes :**
  1. Appeler sweepDigestsHebdo() sans DIGEST_CRON
  2. Appeler avec DIGEST_CRON=1 hors lundi 08h
  3. Appeler lundi 08h avec envoi déjà enregistré
- **Résultat attendu :** Sans DIGEST_CRON ou hors lundi 08h → retour immédiat, aucun email ; lundi 08h mais déjà envoyé (digest_envois) → skip (continue) ; gating digest_email respecté
- **Traçabilité :** digest_email · sweepDigestsHebdo()
- **Automatisation :** ⏳ à automatiser

## Domaine REFLEX — 72 cas

**Endpoints couverts :**

- `GET /api/reflexivite/bilan` · feature: `bilan_pratique` · rôle: accompagnateur — Relit le bilan de pratique global persisté (ou null) + compteurs de base (nbDossiers, nbEntretiens, miroirs, indicateurs)
- `POST /api/reflexivite/bilan` · feature: `bilan_pratique` · rôle: accompagnateur — Génère/regénère le bilan réflexif global (IA si scores présents, sinon repli heuristique bilanFallback) et le persiste (upsert) ; renvoie forces/axes/evolution/synthese/conseils/source
- `GET /api/reflexivite/coach/phase/:phase` · feature: `coach_posture` · rôle: accompagnateur — Rappels de posture pour une phase (titre, objectif, vigilance, questions) ; 404 si phase inconnue
- `POST /api/reflexivite/coach/analyser` · feature: `coach_posture` · rôle: accompagnateur — Analyse une question (ouverte/fermée/inductive) via IA, repli déterministe analyseQuestionFallback (OPEN_RE/FERME_RE) ; 400 si question vide
- `GET /api/reflexivite/debriefing/session/:sid` · feature: `debriefing` · rôle: accompagnateur — Relit le débriefing d'un entretien + les 3 questions guidées ; 404 si session non possédée
- `POST /api/reflexivite/debriefing/session/:sid` · feature: `debriefing` · rôle: accompagnateur — Enregistre (upsert) les réponses du débriefing (source=manuel) ; 404 si session non possédée
- `POST /api/reflexivite/debriefing/session/:sid/suggerer` · feature: `debriefing` · rôle: accompagnateur — Amorce IA du débriefing à partir des traces de session ; repli heuristique 3 réponses ; 404 si session non possédée
- `GET /api/reflexivite/replay/session/:sid` · feature: `replay_annote` · rôle: accompagnateur — Relit le replay annoté (moments construits depuis questions_entretien + annotations sauvées) ; 404 si session non possédée
- `POST /api/reflexivite/replay/session/:sid` · feature: `replay_annote` · rôle: accompagnateur — Enregistre (upsert) les annotations par moment (ref/annotation, source=manuel) ; 404 si session non possédée
- `POST /api/reflexivite/replay/session/:sid/initialiser` · feature: `replay_annote` · rôle: accompagnateur — Amorce IA d'une annotation par moment ; repli déterministe via OPEN_RE ; si aucun moment renvoie liste vide source=heuristique ; 404 si session non possédée

### TC-REFLEX-001 — GET /bilan — relecture nominale (accompagnateur, bilan pré-publié)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Test du contrat |

- **Préconditions :** Connecté en accompagnateur (Mohamed elafrit.mohamed@gmail.com) possédant des parcours/auto-évaluations ; un bilan déjà persisté dans bilans_pratique.
- **Données :** Cookie accompagnateur valide.
- **Étapes :**
  1. GET /api/reflexivite/bilan avec cookie accompagnateur
- **Résultat attendu :** 200 ; corps {bilan, base} ; bilan non null avec forces[], axes[], evolution, synthese, conseils[], source, genere_le ; base contient nbDossiers, nbEntretiens, miroirs, indicateurs (entiers ≥0).
- **Traçabilité :** bilan_pratique — GET /api/reflexivite/bilan
- **Automatisation :** ✅ api/reflex.test.ts

### TC-REFLEX-002 — GET /bilan — bilan null si jamais généré

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | Partition d'équivalence (présence/absence de bilan) |

- **Préconditions :** Accompagnateur sans ligne dans bilans_pratique (camille.laurent@boussole.demo si bilan non généré).
- **Données :** Cookie accompagnateur valide sans bilan persisté.
- **Étapes :**
  1. GET /api/reflexivite/bilan
- **Résultat attendu :** 200 ; bilan=null ; base présent avec compteurs cohérents.
- **Traçabilité :** bilan_pratique — GET /api/reflexivite/bilan
- **Automatisation :** ✅ api/reflex.test.ts

### TC-REFLEX-003 — GET /bilan — 401 non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles |

- **Préconditions :** Aucun cookie de session.
- **Données :** Requête sans cookie boussole_token.
- **Étapes :**
  1. GET /api/reflexivite/bilan sans cookie
- **Résultat attendu :** 401 ; {error:'Non authentifié'}.
- **Traçabilité :** requireAuth — GET /api/reflexivite/bilan
- **Automatisation :** ✅ api/reflex.test.ts

### TC-REFLEX-004 — GET /bilan — 403 mauvais rôle (accompagné)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles |

- **Préconditions :** Connecté en accompagné (Amine afrit_mohamed@yahoo.fr).
- **Données :** Cookie accompagné valide.
- **Étapes :**
  1. GET /api/reflexivite/bilan avec cookie accompagné
- **Résultat attendu :** 403 ; {error:'Accès refusé'}.
- **Traçabilité :** requireRole('accompagnateur') — GET /api/reflexivite/bilan
- **Automatisation :** ✅ api/reflex.test.ts

### TC-REFLEX-005 — GET /bilan — 403 plan sans la fonctionnalité bilan_pratique

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Table de décision (rôle OK x feature absente) |

- **Préconditions :** Accompagnateur affecté à un plan (ex. Découverte/Essentiel) dont les features n'incluent pas 'bilan_pratique'.
- **Données :** Cookie accompagnateur avec plan_id restreint.
- **Étapes :**
  1. GET /api/reflexivite/bilan
- **Résultat attendu :** 403 ; {error:'Fonctionnalité non disponible dans votre offre'}.
- **Traçabilité :** requireFeature('bilan_pratique') — GET /api/reflexivite/bilan
- **Automatisation :** ✅ api/reflex.test.ts

### TC-REFLEX-006 — POST /bilan — génération nominale et persistance (contrat IA)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Test du contrat + persistance/relecture |

- **Préconditions :** Accompagnateur avec au moins un indicateur d'auto-évaluation noté (scores.length>0) ; clé ANTHROPIC_API_KEY présente.
- **Données :** Cookie accompagnateur ; corps vide.
- **Étapes :**
  1. POST /api/reflexivite/bilan
  2. Puis GET /api/reflexivite/bilan
- **Résultat attendu :** 200 ; corps {forces[3], axes[3], evolution, synthese, conseils[], source} ; champs string non vides, tableaux typés ; source ∈ {'ia','heuristique'} ; le GET suivant relit le même contenu persisté (genere_le récent).
- **Traçabilité :** bilan_pratique — POST /api/reflexivite/bilan
- **Automatisation :** ✅ api/reflex.test.ts

### TC-REFLEX-007 — POST /bilan — repli heuristique quand pas de scores

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Partition d'équivalence (avec/sans scores) + test du contrat |

- **Préconditions :** Accompagnateur sans aucun score d'auto-évaluation (scores.length===0).
- **Données :** Cookie accompagnateur sans auto_evaluation_scores rattachés.
- **Étapes :**
  1. POST /api/reflexivite/bilan
- **Résultat attendu :** 200 ; source='heuristique' ; structure complète (forces, axes, evolution, synthese, conseils) renseignée par bilanFallback même si forces/axes peuvent être vides faute de scores.
- **Traçabilité :** bilan_pratique — POST /api/reflexivite/bilan (bilanFallback)
- **Automatisation :** ✅ api/reflex.test.ts

### TC-REFLEX-008 — POST /bilan — upsert idempotent (un seul bilan par accompagnateur)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | non-regression | moyenne | Test du contrat (idempotence upsert) |

- **Préconditions :** Accompagnateur ayant déjà généré un bilan.
- **Données :** Cookie accompagnateur.
- **Étapes :**
  1. POST /api/reflexivite/bilan deux fois de suite
  2. GET /api/reflexivite/bilan
- **Résultat attendu :** 200 aux deux POST ; le second remplace le premier (ON CONFLICT accompagnateur_id) ; GET ne renvoie qu'un bilan avec genere_le mis à jour.
- **Traçabilité :** bilan_pratique — POST /api/reflexivite/bilan
- **Automatisation :** ✅ api/reflex.test.ts

### TC-REFLEX-009 — POST /bilan — 401 non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles |

- **Préconditions :** Aucun cookie.
- **Données :** Requête sans cookie.
- **Étapes :**
  1. POST /api/reflexivite/bilan
- **Résultat attendu :** 401 ; {error:'Non authentifié'}.
- **Traçabilité :** requireAuth — POST /api/reflexivite/bilan
- **Automatisation :** ✅ api/reflex.test.ts

### TC-REFLEX-010 — POST /bilan — 403 mauvais rôle (accompagné)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles |

- **Préconditions :** Connecté en accompagné.
- **Données :** Cookie accompagné valide.
- **Étapes :**
  1. POST /api/reflexivite/bilan
- **Résultat attendu :** 403 ; {error:'Accès refusé'}.
- **Traçabilité :** requireRole('accompagnateur') — POST /api/reflexivite/bilan
- **Automatisation :** ✅ api/reflex.test.ts

### TC-REFLEX-011 — POST /bilan — 403 offre sans bilan_pratique

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Table de décision (gating feature) |

- **Préconditions :** Accompagnateur sur plan sans feature bilan_pratique.
- **Données :** Cookie accompagnateur plan restreint.
- **Étapes :**
  1. POST /api/reflexivite/bilan
- **Résultat attendu :** 403 ; {error:'Fonctionnalité non disponible dans votre offre'}.
- **Traçabilité :** requireFeature('bilan_pratique') — POST /api/reflexivite/bilan
- **Automatisation :** ✅ api/reflex.test.ts

### TC-REFLEX-012 — Unitaire — bilanFallback construit forces/axes top et bottom des scores

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | haute | Valeurs limites + partition d'équivalence |

- **Préconditions :** Jeu de scores agrégés connu (≥4 indicateurs avec moyennes distinctes), labels présents dans INDIC_LABEL.
- **Données :** scores triés par moy DESC ; ex. moyennes 90,80,70,40,30,20.
- **Étapes :**
  1. Appeler bilanContexte/bilanFallback avec ces scores mockés
  2. Inspecter forces (top 3) et axes (bottom 3)
- **Résultat attendu :** forces = 3 premiers (moy DESC) au format '<label> (<arrondi>/100)' ; axes = 3 derniers (ordre inversé) ; evolution/synthese/conseils non vides ; conseils contient 3 entrées.
- **Traçabilité :** bilan_pratique — bilanFallback (reflexivite.ts)
- **Automatisation :** ✅ unit/reflexivite.test.ts

### TC-REFLEX-013 — Unitaire — bilanFallback avec label inconnu (repli sur l'id)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | validation | basse | Partition d'équivalence (label connu/inconnu) |

- **Préconditions :** Un indicateur dont l'id n'existe pas dans INDIC_LABEL.
- **Données :** score {indicateur:'inconnu_x', moy:55, n:1}.
- **Étapes :**
  1. Appeler bilanFallback
  2. Lire l'entrée correspondante
- **Résultat attendu :** Le libellé utilisé est l'id brut ('inconnu_x (55/100)') sans crash (lbl renvoie id si absent).
- **Traçabilité :** bilan_pratique — bilanFallback / INDIC_LABEL
- **Automatisation :** ✅ unit/reflexivite.test.ts

### TC-REFLEX-014 — Unitaire — extractJson parse un JSON noyé dans du texte

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | moyenne | Valeurs limites + partition d'équivalence |

- **Préconditions :** Fonction extractJson disponible.
- **Données :** Texte 'voici: {"forces":["a"],"axes":[]} merci' ; et texte 'pas de json' ; et '{cassé'.
- **Étapes :**
  1. extractJson sur chaque entrée
- **Résultat attendu :** 1er: objet {forces:['a'],axes:[]} ; 2e: null (pas d'accolades) ; 3e: null (JSON.parse échoue) ; entrée null -> null.
- **Traçabilité :** bilan_pratique — extractJson (reflexivite.ts)
- **Automatisation :** ✅ unit/reflexivite.test.ts

### TC-REFLEX-015 — GET /coach/phase/:phase — nominale phase valide

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Test du contrat |

- **Préconditions :** Connecté en accompagnateur avec feature coach_posture.
- **Données :** phase=0.
- **Étapes :**
  1. GET /api/reflexivite/coach/phase/0
- **Résultat attendu :** 200 ; {phase:0, titre:'Accueil et mise en confiance', objectif:string, vigilance:[…], questions:[…]} ; vigilance et questions non vides.
- **Traçabilité :** coach_posture — GET /api/reflexivite/coach/phase/:phase
- **Automatisation :** ✅ api/reflex.test.ts

### TC-REFLEX-016 — GET /coach/phase/:phase — toutes les phases 0..5

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | Partition d'équivalence (classe valide) |

- **Préconditions :** Accompagnateur avec coach_posture.
- **Données :** phase ∈ {0,1,2,3,4,5}.
- **Étapes :**
  1. GET /api/reflexivite/coach/phase/{i} pour i de 0 à 5
- **Résultat attendu :** 200 pour chaque ; phase renvoyée = i ; titre correspond à PHASES[i].
- **Traçabilité :** coach_posture — GET /api/reflexivite/coach/phase/:phase
- **Automatisation :** ✅ api/reflex.test.ts

### TC-REFLEX-017 — GET /coach/phase/:phase — 404 phase hors plage (6)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | haute | Valeurs limites (borne supérieure +1) |

- **Préconditions :** Accompagnateur avec coach_posture.
- **Données :** phase=6 (au-delà du max 5).
- **Étapes :**
  1. GET /api/reflexivite/coach/phase/6
- **Résultat attendu :** 404 ; {error:'Phase inconnue'}.
- **Traçabilité :** coach_posture — GET /api/reflexivite/coach/phase/:phase
- **Automatisation :** ✅ api/reflex.test.ts

### TC-REFLEX-018 — GET /coach/phase/:phase — 404 phase non numérique

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | Partition d'équivalence (entrée invalide) |

- **Préconditions :** Accompagnateur avec coach_posture.
- **Données :** phase='abc' (Number('abc')=NaN).
- **Étapes :**
  1. GET /api/reflexivite/coach/phase/abc
- **Résultat attendu :** 404 ; {error:'Phase inconnue'} (aucune phase ne matche NaN).
- **Traçabilité :** coach_posture — GET /api/reflexivite/coach/phase/:phase
- **Automatisation :** ✅ api/reflex.test.ts

### TC-REFLEX-019 — GET /coach/phase/:phase — 404 phase négative (-1)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | basse | Valeurs limites (borne inférieure -1) |

- **Préconditions :** Accompagnateur avec coach_posture.
- **Données :** phase=-1.
- **Étapes :**
  1. GET /api/reflexivite/coach/phase/-1
- **Résultat attendu :** 404 ; {error:'Phase inconnue'}.
- **Traçabilité :** coach_posture — GET /api/reflexivite/coach/phase/:phase
- **Automatisation :** ✅ api/reflex.test.ts

### TC-REFLEX-020 — GET /coach/phase/:phase — 401 non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles |

- **Préconditions :** Aucun cookie.
- **Données :** phase=0.
- **Étapes :**
  1. GET /api/reflexivite/coach/phase/0 sans cookie
- **Résultat attendu :** 401 ; {error:'Non authentifié'}.
- **Traçabilité :** requireAuth — GET /api/reflexivite/coach/phase/:phase
- **Automatisation :** ✅ api/reflex.test.ts

### TC-REFLEX-021 — GET /coach/phase/:phase — 403 mauvais rôle (accompagné)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles |

- **Préconditions :** Connecté en accompagné.
- **Données :** phase=0.
- **Étapes :**
  1. GET /api/reflexivite/coach/phase/0 cookie accompagné
- **Résultat attendu :** 403 ; {error:'Accès refusé'}.
- **Traçabilité :** requireRole('accompagnateur') — GET /api/reflexivite/coach/phase/:phase
- **Automatisation :** ✅ api/reflex.test.ts

### TC-REFLEX-022 — GET /coach/phase/:phase — 403 offre sans coach_posture

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Table de décision (gating feature) |

- **Préconditions :** Accompagnateur sur plan sans coach_posture.
- **Données :** phase=0.
- **Étapes :**
  1. GET /api/reflexivite/coach/phase/0
- **Résultat attendu :** 403 ; {error:'Fonctionnalité non disponible dans votre offre'}.
- **Traçabilité :** requireFeature('coach_posture') — GET /api/reflexivite/coach/phase/:phase
- **Automatisation :** ✅ api/reflex.test.ts

### TC-REFLEX-023 — POST /coach/analyser — nominale (contrat, question ouverte)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Test du contrat |

- **Préconditions :** Accompagnateur avec coach_posture.
- **Données :** {question:'Comment as-tu vécu cette situation ?'}.
- **Étapes :**
  1. POST /api/reflexivite/coach/analyser
- **Résultat attendu :** 200 ; {type, ouverte, remarque, reformulation} ; type ∈ {'ouverte','fermée','inductive'} ; ouverte booléen ; remarque non vide ; reformulation string ou null.
- **Traçabilité :** coach_posture — POST /api/reflexivite/coach/analyser
- **Automatisation :** ✅ api/reflex.test.ts

### TC-REFLEX-024 — POST /coach/analyser — 400 question vide

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | haute | Valeurs limites (chaîne vide) + partition d'équivalence |

- **Préconditions :** Accompagnateur avec coach_posture.
- **Données :** {question:'   '} (trim -> '') ou corps sans question.
- **Étapes :**
  1. POST /api/reflexivite/coach/analyser avec question vide
- **Résultat attendu :** 400 ; {error:'Question vide'}.
- **Traçabilité :** coach_posture — POST /api/reflexivite/coach/analyser
- **Automatisation :** ✅ api/reflex.test.ts

### TC-REFLEX-025 — POST /coach/analyser — 401 non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles |

- **Préconditions :** Aucun cookie.
- **Données :** {question:'Comment ?'}.
- **Étapes :**
  1. POST /api/reflexivite/coach/analyser sans cookie
- **Résultat attendu :** 401 ; {error:'Non authentifié'}.
- **Traçabilité :** requireAuth — POST /api/reflexivite/coach/analyser
- **Automatisation :** ✅ api/reflex.test.ts

### TC-REFLEX-026 — POST /coach/analyser — 403 mauvais rôle (accompagné)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles |

- **Préconditions :** Connecté en accompagné.
- **Données :** {question:'Comment ?'}.
- **Étapes :**
  1. POST /api/reflexivite/coach/analyser cookie accompagné
- **Résultat attendu :** 403 ; {error:'Accès refusé'}.
- **Traçabilité :** requireRole('accompagnateur') — POST /api/reflexivite/coach/analyser
- **Automatisation :** ✅ api/reflex.test.ts

### TC-REFLEX-027 — POST /coach/analyser — 403 offre sans coach_posture

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Table de décision (gating feature) |

- **Préconditions :** Accompagnateur plan sans coach_posture.
- **Données :** {question:'Comment ?'}.
- **Étapes :**
  1. POST /api/reflexivite/coach/analyser
- **Résultat attendu :** 403 ; {error:'Fonctionnalité non disponible dans votre offre'}.
- **Traçabilité :** requireFeature('coach_posture') — POST /api/reflexivite/coach/analyser
- **Automatisation :** ✅ api/reflex.test.ts

### TC-REFLEX-028 — Unitaire — analyseQuestionFallback classe une question ouverte

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | haute | Partition d'équivalence (classe ouverte) — OPEN_RE |

- **Préconditions :** Fonction analyseQuestionFallback / OPEN_RE accessibles.
- **Données :** q='Comment as-tu vécu cette situation ?' (matche OPEN_RE, pas FERME_RE).
- **Étapes :**
  1. Appeler analyseQuestionFallback(q)
- **Résultat attendu :** {type:'ouverte', ouverte:true, remarque:'Question ouverte et peu inductive…', reformulation:null}.
- **Traçabilité :** coach_posture — analyseQuestionFallback / OPEN_RE (reflexivite.ts)
- **Automatisation :** ✅ unit/reflexivite.test.ts

### TC-REFLEX-029 — Unitaire — analyseQuestionFallback classe une question fermée

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | haute | Partition d'équivalence (classe fermée) — FERME_RE |

- **Préconditions :** Fonction accessible.
- **Données :** q='As-tu terminé ton plan ?' (matche FERME_RE, pas induite).
- **Étapes :**
  1. Appeler analyseQuestionFallback(q)
- **Résultat attendu :** {type:'fermée', ouverte:false, remarque commençant par 'Question plutôt fermée', reformulation non null contenant un extrait de q}.
- **Traçabilité :** coach_posture — analyseQuestionFallback / FERME_RE (reflexivite.ts)
- **Automatisation :** ✅ unit/reflexivite.test.ts

### TC-REFLEX-030 — Unitaire — analyseQuestionFallback classe une question inductive

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | haute | Table de décision (induite vs fermée) |

- **Préconditions :** Fonction accessible.
- **Données :** q='Tu dois revoir ton plan, non ?' (matche regex induite 'tu dois').
- **Étapes :**
  1. Appeler analyseQuestionFallback(q)
- **Résultat attendu :** {type:'inductive', ouverte:false, remarque mentionnant 'induction', reformulation non null}.
- **Traçabilité :** coach_posture — analyseQuestionFallback (reflexivite.ts)
- **Automatisation :** ✅ unit/reflexivite.test.ts

### TC-REFLEX-031 — Unitaire — OPEN_RE neutralisée par marqueur fermé (ouverte+FERME_RE -> non ouverte)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | validation | moyenne | Table de décision (OPEN_RE && !FERME_RE) |

- **Préconditions :** Fonction accessible.
- **Données :** q='Comment, est-ce que tu as fini ?' (OPEN_RE ET FERME_RE matchent).
- **Étapes :**
  1. Appeler analyseQuestionFallback(q)
- **Résultat attendu :** ouverte=false (la présence d'un marqueur fermé annule la classification ouverte) ; type non 'ouverte'.
- **Traçabilité :** coach_posture — analyseQuestionFallback (OPEN_RE/FERME_RE)
- **Automatisation :** ✅ unit/reflexivite.test.ts

### TC-REFLEX-032 — Unitaire — reformulation tronquée à 60 caractères

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | validation | basse | Valeurs limites (longueur 60) |

- **Préconditions :** Fonction accessible.
- **Données :** q fermée de plus de 60 caractères.
- **Étapes :**
  1. Appeler analyseQuestionFallback(q)
  2. Mesurer l'extrait inséré dans reformulation
- **Résultat attendu :** L'extrait de q dans la reformulation est limité aux 60 premiers caractères (t.slice(0,60)).
- **Traçabilité :** coach_posture — analyseQuestionFallback (reflexivite.ts)
- **Automatisation :** ✅ unit/reflexivite.test.ts

### TC-REFLEX-033 — GET /debriefing/session/:sid — nominale (propriétaire)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Test du contrat |

- **Préconditions :** Accompagnateur propriétaire d'une session sid (via dossier.accompagnateur_id) avec feature debriefing.
- **Données :** sid = session appartenant à l'accompagnateur.
- **Étapes :**
  1. GET /api/reflexivite/debriefing/session/{sid}
- **Résultat attendu :** 200 ; {questions:[3 questions DEBRIEF], debriefing:null ou {reponses:[…],source,maj_le}} ; questions = 3 entrées non vides.
- **Traçabilité :** debriefing — GET /api/reflexivite/debriefing/session/:sid
- **Automatisation :** ✅ api/reflex.test.ts

### TC-REFLEX-034 — GET /debriefing/session/:sid — 404 session d'un autre accompagnateur

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles (propriété de ressource) |

- **Préconditions :** Connecté accompagnateur A ; sid appartient à accompagnateur B (Camille).
- **Données :** sid de B.
- **Étapes :**
  1. GET /api/reflexivite/debriefing/session/{sid_de_B} avec cookie A
- **Résultat attendu :** 404 ; {error:'Entretien introuvable'} (ownsSession faux).
- **Traçabilité :** ownsSession — GET /api/reflexivite/debriefing/session/:sid
- **Automatisation :** ✅ api/reflex.test.ts

### TC-REFLEX-035 — GET /debriefing/session/:sid — 404 session inexistante

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | Partition d'équivalence (id inexistant) |

- **Préconditions :** Accompagnateur avec debriefing.
- **Données :** sid=999999 inexistant.
- **Étapes :**
  1. GET /api/reflexivite/debriefing/session/999999
- **Résultat attendu :** 404 ; {error:'Entretien introuvable'}.
- **Traçabilité :** ownsSession — GET /api/reflexivite/debriefing/session/:sid
- **Automatisation :** ✅ api/reflex.test.ts

### TC-REFLEX-036 — GET /debriefing/session/:sid — 401 non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles |

- **Préconditions :** Aucun cookie.
- **Données :** sid quelconque.
- **Étapes :**
  1. GET /api/reflexivite/debriefing/session/1 sans cookie
- **Résultat attendu :** 401 ; {error:'Non authentifié'}.
- **Traçabilité :** requireAuth — GET /api/reflexivite/debriefing/session/:sid
- **Automatisation :** ✅ api/reflex.test.ts

### TC-REFLEX-037 — GET /debriefing/session/:sid — 403 mauvais rôle (accompagné)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles |

- **Préconditions :** Connecté en accompagné.
- **Données :** sid quelconque.
- **Étapes :**
  1. GET /api/reflexivite/debriefing/session/1 cookie accompagné
- **Résultat attendu :** 403 ; {error:'Accès refusé'}.
- **Traçabilité :** requireRole('accompagnateur') — GET /api/reflexivite/debriefing/session/:sid
- **Automatisation :** ✅ api/reflex.test.ts

### TC-REFLEX-038 — GET /debriefing/session/:sid — 403 offre sans debriefing

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Table de décision (gating feature) |

- **Préconditions :** Accompagnateur plan sans debriefing.
- **Données :** sid possédé.
- **Étapes :**
  1. GET /api/reflexivite/debriefing/session/{sid}
- **Résultat attendu :** 403 ; {error:'Fonctionnalité non disponible dans votre offre'} (gating avant contrôle propriété).
- **Traçabilité :** requireFeature('debriefing') — GET /api/reflexivite/debriefing/session/:sid
- **Automatisation :** ✅ api/reflex.test.ts

### TC-REFLEX-039 — POST /debriefing/session/:sid — enregistrement nominal + relecture

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Test du contrat + persistance/relecture |

- **Préconditions :** Accompagnateur propriétaire de sid, feature debriefing.
- **Données :** {reponses:['ok cadre','un doute','ouvrir mes questions']}.
- **Étapes :**
  1. POST /api/reflexivite/debriefing/session/{sid}
  2. GET /api/reflexivite/debriefing/session/{sid}
- **Résultat attendu :** 200 {ok:true} ; le GET relit debriefing.reponses identiques, source='manuel', maj_le récent.
- **Traçabilité :** debriefing — POST /api/reflexivite/debriefing/session/:sid
- **Automatisation :** ✅ api/reflex.test.ts

### TC-REFLEX-040 — POST /debriefing/session/:sid — body sans reponses (coerce en [])

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | Partition d'équivalence (entrée non-tableau) |

- **Préconditions :** Accompagnateur propriétaire de sid.
- **Données :** {} (reponses absent) puis {reponses:'pas-un-tableau'}.
- **Étapes :**
  1. POST /api/reflexivite/debriefing/session/{sid} sans reponses
  2. GET /api/reflexivite/debriefing/session/{sid}
- **Résultat attendu :** 200 {ok:true} ; reponses stockées = [] (Array.isArray faux -> tableau vide) ; pas d'erreur 500.
- **Traçabilité :** debriefing — POST /api/reflexivite/debriefing/session/:sid
- **Automatisation :** ✅ api/reflex.test.ts

### TC-REFLEX-041 — POST /debriefing/session/:sid — coercition des éléments en chaîne

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | basse | Partition d'équivalence (types mixtes) |

- **Préconditions :** Accompagnateur propriétaire de sid.
- **Données :** {reponses:[1,null,{a:1}]}.
- **Étapes :**
  1. POST puis GET /api/reflexivite/debriefing/session/{sid}
- **Résultat attendu :** 200 ; chaque élément stocké comme String(x ?? '') ; null -> '' ; pas de crash.
- **Traçabilité :** debriefing — POST /api/reflexivite/debriefing/session/:sid
- **Automatisation :** ✅ api/reflex.test.ts

### TC-REFLEX-042 — POST /debriefing/session/:sid — upsert idempotent (ON CONFLICT session_id)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | non-regression | moyenne | Test du contrat (upsert) |

- **Préconditions :** Accompagnateur propriétaire de sid.
- **Données :** Deux POST avec contenus différents.
- **Étapes :**
  1. POST reponses A
  2. POST reponses B
  3. GET /api/reflexivite/debriefing/session/{sid}
- **Résultat attendu :** Le second remplace le premier ; GET renvoie reponses B uniquement.
- **Traçabilité :** debriefing — POST /api/reflexivite/debriefing/session/:sid
- **Automatisation :** ✅ api/reflex.test.ts

### TC-REFLEX-043 — POST /debriefing/session/:sid — 404 non-propriétaire

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles (propriété) |

- **Préconditions :** Accompagnateur A ; sid de B.
- **Données :** {reponses:['x']}.
- **Étapes :**
  1. POST /api/reflexivite/debriefing/session/{sid_de_B} cookie A
- **Résultat attendu :** 404 ; {error:'Entretien introuvable'} ; aucune écriture.
- **Traçabilité :** ownsSession — POST /api/reflexivite/debriefing/session/:sid
- **Automatisation :** ✅ api/reflex.test.ts

### TC-REFLEX-044 — POST /debriefing/session/:sid — 401 non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles |

- **Préconditions :** Aucun cookie.
- **Données :** {reponses:['x']}.
- **Étapes :**
  1. POST sans cookie
- **Résultat attendu :** 401 ; {error:'Non authentifié'}.
- **Traçabilité :** requireAuth — POST /api/reflexivite/debriefing/session/:sid
- **Automatisation :** ✅ api/reflex.test.ts

### TC-REFLEX-045 — POST /debriefing/session/:sid — 403 offre sans debriefing

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | Table de décision (gating feature) |

- **Préconditions :** Accompagnateur plan sans debriefing.
- **Données :** {reponses:['x']} sur sid possédé.
- **Étapes :**
  1. POST /api/reflexivite/debriefing/session/{sid}
- **Résultat attendu :** 403 ; {error:'Fonctionnalité non disponible dans votre offre'}.
- **Traçabilité :** requireFeature('debriefing') — POST /api/reflexivite/debriefing/session/:sid
- **Automatisation :** ✅ api/reflex.test.ts

### TC-REFLEX-046 — POST /debriefing/session/:sid/suggerer — amorce IA (contrat)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Test du contrat |

- **Préconditions :** Accompagnateur propriétaire de sid avec traces (questions_entretien/reponses), feature debriefing, KEY présente.
- **Données :** sid possédé avec traces non vides.
- **Étapes :**
  1. POST /api/reflexivite/debriefing/session/{sid}/suggerer
- **Résultat attendu :** 200 ; {reponses:[…], source} ; reponses tableau de 3 entrées au plus (slice(0,3)), chaînes non vides ; source ∈ {'ia','heuristique'}.
- **Traçabilité :** debriefing — POST /api/reflexivite/debriefing/session/:sid/suggerer
- **Automatisation :** ✅ api/reflex.test.ts

### TC-REFLEX-047 — POST /debriefing/session/:sid/suggerer — repli heuristique (3 amorces)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Partition d'équivalence (IA off) + test du contrat |

- **Préconditions :** Accompagnateur propriétaire de sid ; IA indisponible (KEY absente ou réponse non parsable).
- **Données :** sid possédé.
- **Étapes :**
  1. POST /api/reflexivite/debriefing/session/{sid}/suggerer (sans clé IA)
- **Résultat attendu :** 200 ; source='heuristique' ; reponses = exactement 3 amorces par défaut non vides.
- **Traçabilité :** debriefing — POST /api/reflexivite/debriefing/session/:sid/suggerer (fallback)
- **Automatisation :** ✅ api/reflex.test.ts

### TC-REFLEX-048 — POST /debriefing/session/:sid/suggerer — 404 non-propriétaire

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles (propriété) |

- **Préconditions :** Accompagnateur A ; sid de B.
- **Données :** sid de B.
- **Étapes :**
  1. POST /api/reflexivite/debriefing/session/{sid_de_B}/suggerer cookie A
- **Résultat attendu :** 404 ; {error:'Entretien introuvable'}.
- **Traçabilité :** ownsSession — POST /api/reflexivite/debriefing/session/:sid/suggerer
- **Automatisation :** ✅ api/reflex.test.ts

### TC-REFLEX-049 — POST /debriefing/session/:sid/suggerer — 401 non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | Test basé sur les rôles |

- **Préconditions :** Aucun cookie.
- **Données :** sid quelconque.
- **Étapes :**
  1. POST .../suggerer sans cookie
- **Résultat attendu :** 401 ; {error:'Non authentifié'}.
- **Traçabilité :** requireAuth — POST /api/reflexivite/debriefing/session/:sid/suggerer
- **Automatisation :** ✅ api/reflex.test.ts

### TC-REFLEX-050 — POST /debriefing/session/:sid/suggerer — 403 mauvais rôle / offre

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | Table de décision (rôle x feature) |

- **Préconditions :** Accompagné connecté OU accompagnateur sans feature debriefing.
- **Données :** sid quelconque.
- **Étapes :**
  1. POST .../suggerer dans chaque condition
- **Résultat attendu :** 403 ; 'Accès refusé' (rôle) ou 'Fonctionnalité non disponible dans votre offre' (feature).
- **Traçabilité :** requireRole/requireFeature('debriefing') — POST /api/reflexivite/debriefing/session/:sid/suggerer
- **Automatisation :** ✅ api/reflex.test.ts

### TC-REFLEX-051 — Unitaire — sessionTraces agrège questions+notes par phase, '(aucune trace)' si vide

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | moyenne | Partition d'équivalence (avec/sans traces) |

- **Préconditions :** Fonction sessionTraces accessible avec DB mockée.
- **Données :** Cas A: session avec questions et notes sur phases 0 et 2 ; Cas B: session sans aucune trace.
- **Étapes :**
  1. Appeler sessionTraces(sid) pour A et B
- **Résultat attendu :** A: chaîne contenant les titres de phases présentes, lignes '• question → reponse' et 'Notes : …', phases sans contenu omises ; B: '(aucune trace)'.
- **Traçabilité :** debriefing — sessionTraces (reflexivite.ts)
- **Automatisation :** ✅ unit/reflexivite.test.ts

### TC-REFLEX-052 — GET /replay/session/:sid — nominale (moments construits depuis questions)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Test du contrat |

- **Préconditions :** Accompagnateur propriétaire de sid avec questions_entretien, feature replay_annote.
- **Données :** sid possédé avec ≥1 question.
- **Étapes :**
  1. GET /api/reflexivite/replay/session/{sid}
- **Résultat attendu :** 200 ; {moments:[{ref,phase,titre,question,reponse,annotation}], source, maj_le} ; un moment par question ; ref='q<id>' ; annotation='' si aucune sauvegarde ; source/maj_le null si pas de replay enregistré.
- **Traçabilité :** replay_annote — GET /api/reflexivite/replay/session/:sid
- **Automatisation :** ✅ api/reflex.test.ts

### TC-REFLEX-053 — GET /replay/session/:sid — fusion des annotations sauvegardées

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | Test du contrat (fusion base/sauvegarde) |

- **Préconditions :** Accompagnateur propriétaire ; un replay déjà enregistré avec annotation sur q<id>.
- **Données :** sid avec replay persisté.
- **Étapes :**
  1. GET /api/reflexivite/replay/session/{sid}
- **Résultat attendu :** 200 ; le moment correspondant porte l'annotation sauvée (jointure par ref) ; les autres restent '' ; source et maj_le non null.
- **Traçabilité :** replay_annote — GET /api/reflexivite/replay/session/:sid
- **Automatisation :** ✅ api/reflex.test.ts

### TC-REFLEX-054 — GET /replay/session/:sid — 404 non-propriétaire

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles (propriété) |

- **Préconditions :** Accompagnateur A ; sid de B.
- **Données :** sid de B.
- **Étapes :**
  1. GET /api/reflexivite/replay/session/{sid_de_B} cookie A
- **Résultat attendu :** 404 ; {error:'Entretien introuvable'}.
- **Traçabilité :** ownsSession — GET /api/reflexivite/replay/session/:sid
- **Automatisation :** ✅ api/reflex.test.ts

### TC-REFLEX-055 — GET /replay/session/:sid — 401 / 403 (accès)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | Table de décision (auth x rôle x feature) |

- **Préconditions :** Sans cookie ; accompagné ; accompagnateur sans replay_annote.
- **Données :** sid quelconque.
- **Étapes :**
  1. GET sans cookie
  2. GET cookie accompagné
  3. GET accompagnateur sans feature
- **Résultat attendu :** 401 'Non authentifié' ; 403 'Accès refusé' ; 403 'Fonctionnalité non disponible dans votre offre'.
- **Traçabilité :** requireAuth/requireRole/requireFeature('replay_annote') — GET /api/reflexivite/replay/session/:sid
- **Automatisation :** ✅ api/reflex.test.ts

### TC-REFLEX-056 — POST /replay/session/:sid — enregistrement annotations + relecture

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Test du contrat + persistance/relecture |

- **Préconditions :** Accompagnateur propriétaire de sid, feature replay_annote.
- **Données :** {moments:[{ref:'q1',annotation:'ici je questionne ouvert'}]}.
- **Étapes :**
  1. POST /api/reflexivite/replay/session/{sid}
  2. GET /api/reflexivite/replay/session/{sid}
- **Résultat attendu :** 200 {ok:true} ; GET renvoie l'annotation sur le moment ref='q1', source='manuel', maj_le récent.
- **Traçabilité :** replay_annote — POST /api/reflexivite/replay/session/:sid
- **Automatisation :** ✅ api/reflex.test.ts

### TC-REFLEX-057 — POST /replay/session/:sid — body sans moments (coerce en [])

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | Partition d'équivalence (entrée non-tableau) |

- **Préconditions :** Accompagnateur propriétaire de sid.
- **Données :** {} puis {moments:'x'} (non tableau).
- **Étapes :**
  1. POST /api/reflexivite/replay/session/{sid}
  2. GET /api/reflexivite/replay/session/{sid}
- **Résultat attendu :** 200 {ok:true} ; moments persistés=[] ; GET renvoie annotations vides ; pas de 500.
- **Traçabilité :** replay_annote — POST /api/reflexivite/replay/session/:sid
- **Automatisation :** ✅ api/reflex.test.ts

### TC-REFLEX-058 — POST /replay/session/:sid — coercition ref/annotation en chaîne

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | basse | Partition d'équivalence (types mixtes) |

- **Préconditions :** Accompagnateur propriétaire de sid.
- **Données :** {moments:[{ref:null,annotation:42},{}]}.
- **Étapes :**
  1. POST puis GET /api/reflexivite/replay/session/{sid}
- **Résultat attendu :** 200 ; chaque entrée stockée {ref:String(ref ?? ''), annotation:String(annotation ?? '')} ; null/undefined -> '' ; pas de crash.
- **Traçabilité :** replay_annote — POST /api/reflexivite/replay/session/:sid
- **Automatisation :** ✅ api/reflex.test.ts

### TC-REFLEX-059 — POST /replay/session/:sid — upsert idempotent (ON CONFLICT session_id)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | non-regression | moyenne | Test du contrat (upsert) |

- **Préconditions :** Accompagnateur propriétaire de sid.
- **Données :** Deux POST avec annotations différentes.
- **Étapes :**
  1. POST moments A
  2. POST moments B
  3. GET /api/reflexivite/replay/session/{sid}
- **Résultat attendu :** Le second remplace le premier ; GET reflète B uniquement.
- **Traçabilité :** replay_annote — POST /api/reflexivite/replay/session/:sid
- **Automatisation :** ✅ api/reflex.test.ts

### TC-REFLEX-060 — POST /replay/session/:sid — 404 non-propriétaire

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles (propriété) |

- **Préconditions :** Accompagnateur A ; sid de B.
- **Données :** {moments:[{ref:'q1',annotation:'x'}]}.
- **Étapes :**
  1. POST /api/reflexivite/replay/session/{sid_de_B} cookie A
- **Résultat attendu :** 404 ; {error:'Entretien introuvable'} ; aucune écriture.
- **Traçabilité :** ownsSession — POST /api/reflexivite/replay/session/:sid
- **Automatisation :** ✅ api/reflex.test.ts

### TC-REFLEX-061 — POST /replay/session/:sid — 401 / 403 (accès)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | Table de décision (auth x rôle x feature) |

- **Préconditions :** Sans cookie ; accompagné ; accompagnateur sans replay_annote.
- **Données :** {moments:[]}.
- **Étapes :**
  1. POST sans cookie
  2. POST cookie accompagné
  3. POST accompagnateur sans feature
- **Résultat attendu :** 401 'Non authentifié' ; 403 'Accès refusé' ; 403 'Fonctionnalité non disponible dans votre offre'.
- **Traçabilité :** requireAuth/requireRole/requireFeature('replay_annote') — POST /api/reflexivite/replay/session/:sid
- **Automatisation :** ✅ api/reflex.test.ts

### TC-REFLEX-062 — POST /replay/session/:sid/initialiser — amorce IA par moment (contrat)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Test du contrat |

- **Préconditions :** Accompagnateur propriétaire de sid avec ≥1 question, feature replay_annote, KEY présente.
- **Données :** sid possédé avec moments.
- **Étapes :**
  1. POST /api/reflexivite/replay/session/{sid}/initialiser
- **Résultat attendu :** 200 ; {moments:[…], source} ; une annotation non vide par moment ; source ∈ {'ia','heuristique'} ; moments conservent ref/phase/titre/question/reponse.
- **Traçabilité :** replay_annote — POST /api/reflexivite/replay/session/:sid/initialiser
- **Automatisation :** ✅ api/reflex.test.ts

### TC-REFLEX-063 — POST /replay/session/:sid/initialiser — repli déterministe via OPEN_RE

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Partition d'équivalence (OPEN_RE) + test du contrat (fallback) |

- **Préconditions :** Accompagnateur propriétaire ; IA indisponible ou non parsable ; moments avec questions ouvertes ET fermées.
- **Données :** sid possédé ; questions mixtes.
- **Étapes :**
  1. POST /api/reflexivite/replay/session/{sid}/initialiser (IA off)
- **Résultat attendu :** 200 ; source='heuristique' ; annotation des questions matchant OPEN_RE = 'Ici je pose une question ouverte qui laisse explorer.' ; sinon 'Ici ma question est plutôt fermée : je pourrais l’ouvrir davantage.'
- **Traçabilité :** replay_annote — POST /api/reflexivite/replay/session/:sid/initialiser (OPEN_RE fallback)
- **Automatisation :** ✅ api/reflex.test.ts

### TC-REFLEX-064 — POST /replay/session/:sid/initialiser — session sans moment (liste vide, heuristique)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | Valeurs limites (0 moment) |

- **Préconditions :** Accompagnateur propriétaire d'une session sans question_entretien.
- **Données :** sid possédé, base.length===0.
- **Étapes :**
  1. POST /api/reflexivite/replay/session/{sid}/initialiser
- **Résultat attendu :** 200 ; {moments:[], source:'heuristique'} ; aucun appel IA effectué.
- **Traçabilité :** replay_annote — POST /api/reflexivite/replay/session/:sid/initialiser
- **Automatisation :** ✅ api/reflex.test.ts

### TC-REFLEX-065 — POST /replay/session/:sid/initialiser — 404 non-propriétaire

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles (propriété) |

- **Préconditions :** Accompagnateur A ; sid de B.
- **Données :** sid de B.
- **Étapes :**
  1. POST .../initialiser cookie A
- **Résultat attendu :** 404 ; {error:'Entretien introuvable'}.
- **Traçabilité :** ownsSession — POST /api/reflexivite/replay/session/:sid/initialiser
- **Automatisation :** ✅ api/reflex.test.ts

### TC-REFLEX-066 — POST /replay/session/:sid/initialiser — 401 / 403 (accès)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | Table de décision (auth x rôle x feature) |

- **Préconditions :** Sans cookie ; accompagné ; accompagnateur sans replay_annote.
- **Données :** sid quelconque.
- **Étapes :**
  1. POST .../initialiser sans cookie
  2. cookie accompagné
  3. accompagnateur sans feature
- **Résultat attendu :** 401 'Non authentifié' ; 403 'Accès refusé' ; 403 'Fonctionnalité non disponible dans votre offre'.
- **Traçabilité :** requireAuth/requireRole/requireFeature('replay_annote') — POST /api/reflexivite/replay/session/:sid/initialiser
- **Automatisation :** ✅ api/reflex.test.ts

### TC-REFLEX-067 — Unitaire — momentsDeSession mappe questions en moments avec titre de phase

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | moyenne | Partition d'équivalence (phase connue/inconnue) |

- **Préconditions :** Fonction momentsDeSession accessible avec DB mockée.
- **Données :** questions_entretien {id:7,phase:'2',texte:'Raconte…',reponse:'…'} et une phase hors PHASES (phase:'9').
- **Étapes :**
  1. Appeler momentsDeSession(sid)
- **Résultat attendu :** Moment {ref:'q7',phase:2,titre:'Explorer l’expérience',question,reponse,annotation:''} ; pour phase inconnue titre='Phase <n+1>' ; reponse '' si null.
- **Traçabilité :** replay_annote — momentsDeSession (reflexivite.ts)
- **Automatisation :** ✅ unit/reflexivite.test.ts

### TC-REFLEX-068 — UI — Bilan de pratique : générer puis relire (accompagnateur)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | Test bout-en-bout basé sur les rôles |

- **Préconditions :** Connecté en accompagnateur (Mohamed) avec feature bilan_pratique ; stack http://localhost:8080.
- **Données :** Compte elafrit.mohamed@gmail.com / BoussoleDemo2026.
- **Étapes :**
  1. Aller sur /bilan-pratique
  2. Cliquer sur le bouton de génération du bilan
  3. Attendre le rendu
  4. Recharger la page
- **Résultat attendu :** La page affiche forces, axes, évolution, synthèse, conseils et la source (IA/heuristique) ; après rechargement le bilan persiste (relu via GET /bilan).
- **Traçabilité :** bilan_pratique — page BilanPratique.tsx (/bilan-pratique)
- **Automatisation :** ⏳ à automatiser

### TC-REFLEX-069 — UI — Coach de posture : analyser une question dans l'entretien

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | Test bout-en-bout (test du contrat UI) |

- **Préconditions :** Accompagnateur avec coach_posture ; un entretien ouvert affichant le composant CoachPosture.
- **Données :** Question saisie : 'Est-ce que tu as fini ?'.
- **Étapes :**
  1. Ouvrir l'entretien (page Entretien)
  2. Saisir une question dans le coach de posture
  3. Lancer l'analyse
- **Résultat attendu :** Le composant affiche le type (ouverte/fermée/inductive), la remarque et, le cas échéant, une reformulation suggérée.
- **Traçabilité :** coach_posture — composant CoachPosture.tsx / POST /coach/analyser
- **Automatisation :** ⏳ à automatiser

### TC-REFLEX-070 — UI — Débriefing à chaud : suggérer (IA) puis enregistrer

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | Test bout-en-bout + persistance |

- **Préconditions :** Accompagnateur propriétaire d'un entretien terminé, feature debriefing.
- **Données :** Modale DebriefingModal ouverte sur une session possédée.
- **Étapes :**
  1. Ouvrir le débriefing de l'entretien
  2. Cliquer 'Suggérer' (amorce IA)
  3. Modifier les 3 réponses
  4. Enregistrer
  5. Rouvrir la modale
- **Résultat attendu :** Les 3 amorces se remplissent ; après enregistrement et réouverture, les réponses saisies sont relues (persistance).
- **Traçabilité :** debriefing — composant DebriefingModal.tsx / GET+POST+suggerer
- **Automatisation :** ⏳ à automatiser

### TC-REFLEX-071 — UI — Replay annoté : initialiser (IA), annoter, enregistrer

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | Test bout-en-bout + persistance |

- **Préconditions :** Accompagnateur propriétaire d'un entretien avec questions, feature replay_annote.
- **Données :** Modale ReplayModal ouverte sur une session possédée.
- **Étapes :**
  1. Ouvrir le replay annoté
  2. Cliquer 'Initialiser' (amorces IA par moment)
  3. Modifier une annotation
  4. Enregistrer
  5. Rouvrir le replay
- **Résultat attendu :** Chaque moment reçoit une amorce d'annotation ; après enregistrement et réouverture, les annotations modifiées sont relues (fusion par ref).
- **Traçabilité :** replay_annote — composant ReplayModal.tsx / GET+POST+initialiser
- **Automatisation :** ⏳ à automatiser

### TC-REFLEX-072 — UI — Accès refusé côté accompagné aux fonctions de réflexivité

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | acces | moyenne | Test basé sur les rôles (garde de route) |

- **Préconditions :** Connecté en accompagné (Amine).
- **Données :** Compte afrit_mohamed@yahoo.fr / BoussoleDemo2026.
- **Étapes :**
  1. Tenter d'accéder à /bilan-pratique
- **Résultat attendu :** La route protégée (Protected role='accompagnateur') redirige/refuse l'accès ; la page bilan n'est pas affichée.
- **Traçabilité :** bilan_pratique — App.tsx Protected role='accompagnateur' (/bilan-pratique)
- **Automatisation :** ⏳ à automatiser

## Domaine COLLAB — 64 cas

**Endpoints couverts :**

- `GET /api/collab/ressources/public/:token` · feature: `(aucune — lien public hors auth)` · rôle: anonyme — Lecture seule d'une ressource partagée publiquement, identifiée par son jeton. Aucune authentification ni feature requise. 404 si introuvable ou portee != public.
- `GET /api/collab/ressources` · feature: `mutualisation` · rôle: accompagnateur — Bibliothèque interne : liste de toutes les ressources partagées entre accompagnateurs, avec flag mienne et auteur calculé.
- `POST /api/collab/ressources` · feature: `mutualisation` · rôle: accompagnateur — Créer une ressource partagée (titre+contenu requis ; type ∈ {question,methode,astuce} sinon 'astuce'). 201 + {id}.
- `PATCH /api/collab/ressources/:id` · feature: `mutualisation` · rôle: accompagnateur — Basculer une ressource dont on est l'auteur entre interne et public ; génère/réutilise le jeton du lien public. 404 si non-propriétaire.
- `DELETE /api/collab/ressources/:id` · feature: `mutualisation` · rôle: accompagnateur — Supprimer une ressource dont on est l'auteur. 404 si non-propriétaire (aucune ligne supprimée).
- `GET /api/collab/problematisation/dossier/:id` · feature: `problematisation` · rôle: accompagne — Récupère les questions guidées + l'état enregistré de la problématique pour un parcours possédé. 404 si parcours non possédé.
- `POST /api/collab/problematisation/dossier/:id` · feature: `problematisation` · rôle: accompagne — Enregistre (upsert) les réponses guidées + la problématique (source=manuel). 404 si parcours non possédé.
- `POST /api/collab/problematisation/dossier/:id/suggerer` · feature: `problematisation` · rôle: accompagne — IA : propose une problématique + sous-questions à partir des réponses guidées et du contexte ; repli heuristique déterministe si IA indisponible. 404 si parcours non possédé.
- `GET /api/collab/resume/dossier/:id` · feature: `resume_parcours` · rôle: accompagne — Récupère le dernier résumé « où j'en suis » enregistré pour un parcours possédé (ou null). 404 si parcours non possédé.
- `POST /api/collab/resume/dossier/:id` · feature: `resume_parcours` · rôle: accompagne — IA : génère et persiste (upsert) le résumé d'avancement ; repli heuristique resumeFallback si IA indisponible. 404 si parcours non possédé.

### TC-COLLAB-001 — Lien public d'une ressource : lecture sans authentification (nominal)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat (lien public sans auth ni feature) |

- **Préconditions :** Ressource démo publique de Mohamed (token=demo-question-exploration, portee=public). Aucune session/cookie.
- **Données :** GET /api/collab/ressources/public/demo-question-exploration, sans cookie d'auth.
- **Étapes :**
  1. Envoyer la requête GET sur le token public sans aucun en-tête d'authentification
- **Résultat attendu :** 200 ; body {ressource:{titre, type, contenu, cree_le, auteur}} ; aucun id ni token n'est exposé ; auteur = 'Mohamed ...' (prénom+nom joints).
- **Traçabilité :** (public) GET /api/collab/ressources/public/:token — page RessourcePublique.tsx
- **Automatisation :** ✅ api/collab.test.ts

### TC-COLLAB-002 — Lien public : repli auteur 'Un accompagnateur' quand prénom/nom vides

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | basse | partition d'équivalence (auteur nommé vs anonyme) |

- **Préconditions :** Ressource publique dont l'auteur n'a ni prénom ni nom renseignés.
- **Données :** GET /api/collab/ressources/public/<token-d-une-ressource-auteur-anonyme>.
- **Étapes :**
  1. Créer/préparer une ressource publique avec auteur sans prénom/nom
  2. Appeler le lien public
- **Résultat attendu :** 200 ; ressource.auteur == 'Un accompagnateur'.
- **Traçabilité :** (public) GET /api/collab/ressources/public/:token
- **Automatisation :** ✅ api/collab.test.ts

### TC-COLLAB-003 — Lien public : token inexistant -> 404

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | haute | partition d'équivalence (token valide / invalide) |

- **Préconditions :** Aucune ressource avec ce token.
- **Données :** GET /api/collab/ressources/public/token-inexistant-xyz
- **Étapes :**
  1. Appeler le lien public avec un token aléatoire inexistant
- **Résultat attendu :** 404 ; body {error:'Ressource introuvable ou non publique'}.
- **Traçabilité :** (public) GET /api/collab/ressources/public/:token
- **Automatisation :** ✅ api/collab.test.ts

### TC-COLLAB-004 — Lien public : ressource existante mais portee=interne -> 404 (pas de fuite)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test du contrat (le filtre portee='public' borne l'exposition) |

- **Préconditions :** Ressource interne de Mohamed (ex. 'Distinguer la demande du besoin réel', portee=interne, token=NULL).
- **Données :** GET /api/collab/ressources/public/<token-d-une-ressource-interne> (ou tenter via id).
- **Étapes :**
  1. Tenter d'accéder par le lien public à une ressource non publique
- **Résultat attendu :** 404 ; {error:'Ressource introuvable ou non publique'} ; le filtre WHERE portee='public' empêche toute fuite d'une ressource interne.
- **Traçabilité :** (public) GET /api/collab/ressources/public/:token
- **Automatisation :** ✅ api/collab.test.ts

### TC-COLLAB-005 — Lien public : aucune feature exigée même avec compte connecté limité

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles (route hors-garde) |

- **Préconditions :** Ressource publique existante. Optionnellement un cookie d'un compte sans la feature mutualisation.
- **Données :** GET /api/collab/ressources/public/<token-public> avec et sans cookie.
- **Étapes :**
  1. Appeler le lien public sans cookie
  2. Rappeler avec un cookie d'un accompagné/compte limité
- **Résultat attendu :** 200 dans les deux cas ; le endpoint public ne traverse ni requireAuth, ni requireRole, ni requireFeature.
- **Traçabilité :** (public) GET /api/collab/ressources/public/:token
- **Automatisation :** ✅ api/collab.test.ts

### TC-COLLAB-006 — Bibliothèque interne : liste nominale pour un accompagnateur

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat (forme et typage de la réponse) |

- **Préconditions :** Session accompagnateur (Mohamed elafrit.mohamed@gmail.com), sans plan (= toutes features). 3 ressources démo seedées.
- **Données :** GET /api/collab/ressources
- **Étapes :**
  1. Se connecter en accompagnateur
  2. Appeler GET /api/collab/ressources
- **Résultat attendu :** 200 ; {ressources:[...]} trié par cree_le DESC ; chaque item a id, titre, type, contenu, portee, token, cree_le, auteur (string), mienne (boolean) ; mienne=true pour les ressources de Mohamed, false pour celles de Camille.
- **Traçabilité :** mutualisation — GET /api/collab/ressources — page Mutualisation.tsx
- **Automatisation :** ✅ api/collab.test.ts

### TC-COLLAB-007 — Bibliothèque interne : auteur 'Anonyme' si prénom/nom vides

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | basse | valeurs limites (chaîne vide vs renseignée) |

- **Préconditions :** Au moins une ressource dont l'auteur n'a ni prénom ni nom.
- **Données :** GET /api/collab/ressources
- **Étapes :**
  1. Appeler la liste interne
- **Résultat attendu :** 200 ; pour la ressource concernée, auteur == 'Anonyme' (alors que le lien public renvoie 'Un accompagnateur').
- **Traçabilité :** mutualisation — GET /api/collab/ressources
- **Automatisation :** ✅ api/collab.test.ts

### TC-COLLAB-008 — Bibliothèque interne : 401 si non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles (anonyme) |

- **Préconditions :** Aucun cookie d'authentification.
- **Données :** GET /api/collab/ressources sans cookie.
- **Étapes :**
  1. Appeler l'endpoint sans session
- **Résultat attendu :** 401 ; {error:'Non authentifié'}.
- **Traçabilité :** mutualisation — GET /api/collab/ressources (requireAuth)
- **Automatisation :** ✅ api/collab.test.ts

### TC-COLLAB-009 — Bibliothèque interne : 403 mauvais rôle (accompagné)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles (accompagné interdit) |

- **Préconditions :** Session accompagné (Amine afrit_mohamed@yahoo.fr).
- **Données :** GET /api/collab/ressources avec cookie accompagné.
- **Étapes :**
  1. Se connecter en accompagné
  2. Appeler GET /api/collab/ressources
- **Résultat attendu :** 403 ; {error:'Accès refusé'} (requireRole('accompagnateur')).
- **Traçabilité :** mutualisation — GET /api/collab/ressources (requireRole)
- **Automatisation :** ✅ api/collab.test.ts

### TC-COLLAB-010 — Bibliothèque interne : 403 admin (rôle non autorisé)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | test basé sur les rôles (admin non listé) |

- **Préconditions :** Session admin (mohamed@elafrit.com).
- **Données :** GET /api/collab/ressources avec cookie admin.
- **Étapes :**
  1. Se connecter en admin
  2. Appeler GET /api/collab/ressources
- **Résultat attendu :** 403 ; {error:'Accès refusé'} : seul le rôle 'accompagnateur' est autorisé, pas 'admin'.
- **Traçabilité :** mutualisation — GET /api/collab/ressources (requireRole)
- **Automatisation :** ✅ api/collab.test.ts

### TC-COLLAB-011 — Bibliothèque interne : 403 si offre sans la feature mutualisation

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | table de décision (rôle OK × feature absente) |

- **Préconditions :** Accompagnateur dont le plan (ex. Découverte/Essentiel) n'inclut PAS 'mutualisation'.
- **Données :** GET /api/collab/ressources avec cookie d'un accompagnateur au plan limité.
- **Étapes :**
  1. Affecter à l'accompagnateur un plan sans 'mutualisation'
  2. Appeler l'endpoint
- **Résultat attendu :** 403 ; {error:'Fonctionnalité non disponible dans votre offre'} (requireFeature('mutualisation')).
- **Traçabilité :** mutualisation — GET /api/collab/ressources (requireFeature)
- **Automatisation :** ✅ api/collab.test.ts

### TC-COLLAB-012 — Créer une ressource : cas nominal (type valide)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | partition d'équivalence (entrée valide) + test du contrat |

- **Préconditions :** Session accompagnateur avec feature mutualisation.
- **Données :** POST /api/collab/ressources {titre:'Reformuler la demande', type:'methode', contenu:'Distinguer demande explicite et besoin réel.'}
- **Étapes :**
  1. Poster la ressource valide
- **Résultat attendu :** 201 ; {id:<number>} ; relecture via GET /ressources montre la ressource avec type='methode', portee='interne' par défaut, mienne=true.
- **Traçabilité :** mutualisation — POST /api/collab/ressources
- **Automatisation :** ✅ api/collab.test.ts

### TC-COLLAB-013 — Créer une ressource : type inconnu -> repli 'astuce'

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | partition d'équivalence (type valide / invalide -> défaut) |

- **Préconditions :** Session accompagnateur avec feature mutualisation.
- **Données :** POST /api/collab/ressources {titre:'T', contenu:'C', type:'banane'}
- **Étapes :**
  1. Poster avec un type hors {question,methode,astuce}
- **Résultat attendu :** 201 ; relecture: type=='astuce' (TYPES.includes échoue -> défaut). Pas d'erreur.
- **Traçabilité :** mutualisation — POST /api/collab/ressources
- **Automatisation :** ✅ api/collab.test.ts

### TC-COLLAB-014 — Créer une ressource : type absent -> repli 'astuce'

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | basse | valeurs limites (champ optionnel absent) |

- **Préconditions :** Session accompagnateur avec feature mutualisation.
- **Données :** POST /api/collab/ressources {titre:'T', contenu:'C'} (sans champ type)
- **Étapes :**
  1. Poster sans champ type
- **Résultat attendu :** 201 ; type=='astuce'.
- **Traçabilité :** mutualisation — POST /api/collab/ressources
- **Automatisation :** ✅ api/collab.test.ts

### TC-COLLAB-015 — Créer une ressource : titre manquant -> 400

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | haute | partition d'équivalence (champ requis manquant) |

- **Préconditions :** Session accompagnateur avec feature mutualisation.
- **Données :** POST /api/collab/ressources {contenu:'C', type:'astuce'} (titre absent)
- **Étapes :**
  1. Poster sans titre
- **Résultat attendu :** 400 ; {error:'Titre et contenu requis'} ; aucune insertion.
- **Traçabilité :** mutualisation — POST /api/collab/ressources
- **Automatisation :** ✅ api/collab.test.ts

### TC-COLLAB-016 — Créer une ressource : titre/contenu vides ou espaces -> 400

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | haute | valeurs limites (chaîne d'espaces -> vide après trim) |

- **Préconditions :** Session accompagnateur avec feature mutualisation.
- **Données :** POST /api/collab/ressources {titre:'   ', contenu:'\n\t '} (après trim => vides)
- **Étapes :**
  1. Poster titre et contenu composés uniquement d'espaces
- **Résultat attendu :** 400 ; {error:'Titre et contenu requis'} : trim() ramène à chaîne vide -> rejet.
- **Traçabilité :** mutualisation — POST /api/collab/ressources
- **Automatisation :** ✅ api/collab.test.ts

### TC-COLLAB-017 — Créer une ressource : contenu manquant -> 400

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | partition d'équivalence (champ requis manquant) |

- **Préconditions :** Session accompagnateur avec feature mutualisation.
- **Données :** POST /api/collab/ressources {titre:'T'} (contenu absent)
- **Étapes :**
  1. Poster sans contenu
- **Résultat attendu :** 400 ; {error:'Titre et contenu requis'}.
- **Traçabilité :** mutualisation — POST /api/collab/ressources
- **Automatisation :** ✅ api/collab.test.ts

### TC-COLLAB-018 — Créer une ressource : 401 non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles (anonyme) |

- **Préconditions :** Aucun cookie.
- **Données :** POST /api/collab/ressources {titre:'T', contenu:'C'} sans cookie.
- **Étapes :**
  1. Poster sans session
- **Résultat attendu :** 401 ; {error:'Non authentifié'}.
- **Traçabilité :** mutualisation — POST /api/collab/ressources (requireAuth)
- **Automatisation :** ✅ api/collab.test.ts

### TC-COLLAB-019 — Créer une ressource : 403 mauvais rôle (accompagné)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles |

- **Préconditions :** Session accompagné.
- **Données :** POST /api/collab/ressources {titre:'T', contenu:'C'} en accompagné.
- **Étapes :**
  1. Poster en accompagné
- **Résultat attendu :** 403 ; {error:'Accès refusé'}.
- **Traçabilité :** mutualisation — POST /api/collab/ressources (requireRole)
- **Automatisation :** ✅ api/collab.test.ts

### TC-COLLAB-020 — Créer une ressource : 403 sans la feature mutualisation

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | table de décision (rôle OK × feature absente) |

- **Préconditions :** Accompagnateur au plan sans 'mutualisation'.
- **Données :** POST /api/collab/ressources {titre:'T', contenu:'C'}.
- **Étapes :**
  1. Poster avec un plan dépourvu de la feature
- **Résultat attendu :** 403 ; {error:'Fonctionnalité non disponible dans votre offre'}.
- **Traçabilité :** mutualisation — POST /api/collab/ressources (requireFeature)
- **Automatisation :** ✅ api/collab.test.ts

### TC-COLLAB-021 — Basculer en public : génération du jeton (nominal)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat + transition d'état (interne -> public) |

- **Préconditions :** Accompagnateur propriétaire d'une ressource interne (token=NULL).
- **Données :** PATCH /api/collab/ressources/<id-propre-interne> {public:true}
- **Étapes :**
  1. Patcher la ressource avec public:true
- **Résultat attendu :** 200 ; {ok:true, portee:'public', token:<hex 64 car.>} ; le lien public GET /ressources/public/<token> renvoie alors 200.
- **Traçabilité :** mutualisation — PATCH /api/collab/ressources/:id
- **Automatisation :** ✅ api/collab.test.ts

### TC-COLLAB-022 — Basculer en public deux fois : le jeton est réutilisé (idempotence du token)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | test du contrat (idempotence du jeton) |

- **Préconditions :** Ressource déjà publique avec un token connu T.
- **Données :** PATCH /api/collab/ressources/<id> {public:true} (re-publication)
- **Étapes :**
  1. Patcher public:true une 1re fois et noter token T
  2. Patcher public:true une 2e fois
- **Résultat attendu :** 200 ; token renvoyé == T (réutilisation de r.token existant via 'r.token || makeToken()'), pas de nouveau jeton généré.
- **Traçabilité :** mutualisation — PATCH /api/collab/ressources/:id
- **Automatisation :** ✅ api/collab.test.ts

### TC-COLLAB-023 — Repasser en interne : portee mise à 'interne', token conservé en base

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | transition d'état (public -> interne) |

- **Préconditions :** Ressource publique de l'accompagnateur (token T).
- **Données :** PATCH /api/collab/ressources/<id> {public:false}
- **Étapes :**
  1. Patcher public:false
- **Résultat attendu :** 200 ; {ok:true, portee:'interne'} (token non renvoyé) ; ensuite le lien public sur T renvoie 404 (filtre portee='public').
- **Traçabilité :** mutualisation — PATCH /api/collab/ressources/:id
- **Automatisation :** ✅ api/collab.test.ts

### TC-COLLAB-024 — Bascule : 'public' absent ou non strictement true -> interne

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | valeurs limites / table de décision (true strict vs valeurs truthy) |

- **Préconditions :** Ressource publique de l'accompagnateur.
- **Données :** PATCH /api/collab/ressources/<id> {} puis {public:'true'} (chaîne) puis {public:1}
- **Étapes :**
  1. Patcher avec body vide
  2. Patcher avec public:'true' (string)
  3. Patcher avec public:1 (number)
- **Résultat attendu :** 200 dans chaque cas, portee=='interne' : seul le booléen strict true (=== true) active le mode public.
- **Traçabilité :** mutualisation — PATCH /api/collab/ressources/:id
- **Automatisation :** ✅ api/collab.test.ts

### TC-COLLAB-025 — Bascule : ressource d'un autre accompagnateur -> 404 (non-propriétaire)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles (propriété) — contrôle d'accès horizontal |

- **Préconditions :** Session Mohame... non : session accompagnateur Camille ; ressource appartenant à Mohamed.
- **Données :** PATCH /api/collab/ressources/<id-de-Mohamed> {public:true} en tant que Camille.
- **Étapes :**
  1. Se connecter en Camille
  2. Patcher une ressource de Mohamed
- **Résultat attendu :** 404 ; {error:'Ressource introuvable'} (clause WHERE auteur_id=me.id) ; aucune modification de la ressource d'autrui.
- **Traçabilité :** mutualisation — PATCH /api/collab/ressources/:id
- **Automatisation :** ✅ api/collab.test.ts

### TC-COLLAB-026 — Bascule : id inexistant -> 404

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | partition d'équivalence (id existant / inexistant) |

- **Préconditions :** Session accompagnateur avec feature.
- **Données :** PATCH /api/collab/ressources/999999 {public:true}
- **Étapes :**
  1. Patcher un id inexistant
- **Résultat attendu :** 404 ; {error:'Ressource introuvable'}.
- **Traçabilité :** mutualisation — PATCH /api/collab/ressources/:id
- **Automatisation :** ✅ api/collab.test.ts

### TC-COLLAB-027 — Bascule : 401 / 403 (accès)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | table de décision (auth × rôle × feature) |

- **Préconditions :** a) sans cookie ; b) accompagné ; c) accompagnateur sans feature mutualisation.
- **Données :** PATCH /api/collab/ressources/<id> {public:true} pour chaque cas.
- **Étapes :**
  1. Patcher sans session
  2. Patcher en accompagné
  3. Patcher avec plan sans mutualisation
- **Résultat attendu :** a) 401 'Non authentifié' ; b) 403 'Accès refusé' ; c) 403 'Fonctionnalité non disponible dans votre offre'.
- **Traçabilité :** mutualisation — PATCH /api/collab/ressources/:id (requireAuth/Role/Feature)
- **Automatisation :** ✅ api/collab.test.ts

### TC-COLLAB-028 — Supprimer une ressource : cas nominal (propriétaire)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat (suppression effective) |

- **Préconditions :** Accompagnateur propriétaire d'une ressource (créée pour le test).
- **Données :** DELETE /api/collab/ressources/<id-propre>
- **Étapes :**
  1. Créer une ressource
  2. La supprimer
- **Résultat attendu :** 200 ; {ok:true} ; relecture via GET /ressources : elle n'apparaît plus.
- **Traçabilité :** mutualisation — DELETE /api/collab/ressources/:id
- **Automatisation :** ✅ api/collab.test.ts

### TC-COLLAB-029 — Supprimer : ressource d'un autre accompagnateur -> 404

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles (propriété) — accès horizontal |

- **Préconditions :** Session Camille ; ressource de Mohamed.
- **Données :** DELETE /api/collab/ressources/<id-de-Mohamed> en tant que Camille.
- **Étapes :**
  1. Se connecter en Camille
  2. Supprimer une ressource de Mohamed
- **Résultat attendu :** 404 ; {error:'Ressource introuvable'} (changes=0 car WHERE auteur_id=me.id) ; la ressource de Mohamed existe toujours.
- **Traçabilité :** mutualisation — DELETE /api/collab/ressources/:id
- **Automatisation :** ✅ api/collab.test.ts

### TC-COLLAB-030 — Supprimer : id inexistant ou déjà supprimé -> 404

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | partition d'équivalence + idempotence |

- **Préconditions :** Session accompagnateur avec feature.
- **Données :** DELETE /api/collab/ressources/999999 ; puis re-DELETE d'un id déjà supprimé.
- **Étapes :**
  1. Supprimer un id inexistant
  2. Supprimer deux fois une même ressource
- **Résultat attendu :** 404 ; {error:'Ressource introuvable'} (changes=0) à chaque fois.
- **Traçabilité :** mutualisation — DELETE /api/collab/ressources/:id
- **Automatisation :** ✅ api/collab.test.ts

### TC-COLLAB-031 — Supprimer : 401 / 403 (accès)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | table de décision (auth × rôle × feature) |

- **Préconditions :** a) sans cookie ; b) accompagné ; c) accompagnateur sans feature.
- **Données :** DELETE /api/collab/ressources/<id> pour chaque cas.
- **Étapes :**
  1. Supprimer sans session
  2. Supprimer en accompagné
  3. Supprimer avec plan sans mutualisation
- **Résultat attendu :** a) 401 'Non authentifié' ; b) 403 'Accès refusé' ; c) 403 'Fonctionnalité non disponible dans votre offre'.
- **Traçabilité :** mutualisation — DELETE /api/collab/ressources/:id
- **Automatisation :** ✅ api/collab.test.ts

### TC-COLLAB-032 — Problématisation GET : questions + données nominales

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat (forme de réponse) |

- **Préconditions :** Accompagné Amine, propriétaire du dossier vitrine D1, feature problematisation active.
- **Données :** GET /api/collab/problematisation/dossier/<D1>
- **Étapes :**
  1. Se connecter en Amine
  2. Appeler le GET sur son dossier
- **Résultat attendu :** 200 ; {questions:[4 chaînes PB_QUESTIONS], data: null (si jamais enregistré) ou {reponses[], problematique, source, maj_le}} ; questions.length==4.
- **Traçabilité :** problematisation — GET /api/collab/problematisation/dossier/:id — ProblematisationCard.tsx
- **Automatisation :** ✅ unit/collaboration.test.ts, api/collab.test.ts

### TC-COLLAB-033 — Problématisation GET : dossier d'un autre accompagné -> 404

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles (propriété ressource) — accès horizontal |

- **Préconditions :** Accompagné Léa ; dossier D1 appartenant à Amine.
- **Données :** GET /api/collab/problematisation/dossier/<D1-d-Amine> en tant que Léa.
- **Étapes :**
  1. Se connecter en Léa
  2. Appeler le GET sur le dossier d'Amine
- **Résultat attendu :** 404 ; {error:'Parcours introuvable'} (ownDossier KO).
- **Traçabilité :** problematisation — GET /api/collab/problematisation/dossier/:id
- **Automatisation :** ✅ api/collab.test.ts

### TC-COLLAB-034 — Problématisation GET : 401 / 403 rôle / 403 feature

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | table de décision (auth × rôle × feature) |

- **Préconditions :** a) sans cookie ; b) accompagnateur ; c) accompagné sans feature problematisation.
- **Données :** GET /api/collab/problematisation/dossier/<id> pour chaque cas.
- **Étapes :**
  1. Appeler sans session
  2. Appeler en accompagnateur
  3. Appeler en accompagné au plan sans problematisation
- **Résultat attendu :** a) 401 'Non authentifié' ; b) 403 'Accès refusé' ; c) 403 'Fonctionnalité non disponible dans votre offre'.
- **Traçabilité :** problematisation — GET /api/collab/problematisation/dossier/:id
- **Automatisation :** ✅ api/collab.test.ts

### TC-COLLAB-035 — Problématisation POST : enregistrement manuel (upsert insert)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat (persistance/relecture) |

- **Préconditions :** Accompagné Amine, dossier D1, feature active, aucune problématisation préexistante.
- **Données :** POST /api/collab/problematisation/dossier/<D1> {reponses:['terrain','tension','pôles','utilité'], problematique:'Comment ... ?'}
- **Étapes :**
  1. Poster réponses + problématique
  2. Relire via GET
- **Résultat attendu :** 200 {ok:true} ; GET renvoie data.problematique == valeur postée, data.reponses == tableau posté, source=='manuel', maj_le renseigné.
- **Traçabilité :** problematisation — POST /api/collab/problematisation/dossier/:id
- **Automatisation :** ✅ api/collab.test.ts

### TC-COLLAB-036 — Problématisation POST : ré-enregistrement (upsert update sur conflit dossier_id)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | transition d'état (upsert) + non-régression |

- **Préconditions :** Une problématisation existe déjà pour D1.
- **Données :** POST /api/collab/problematisation/dossier/<D1> {reponses:['v2'], problematique:'Nouvelle formulation'}
- **Étapes :**
  1. Poster une 1re fois
  2. Poster une 2e fois avec d'autres valeurs
  3. Relire via GET
- **Résultat attendu :** 200 {ok:true} ; une seule ligne par dossier (ON CONFLICT(dossier_id) DO UPDATE) ; GET renvoie les dernières valeurs et maj_le actualisé.
- **Traçabilité :** problematisation — POST /api/collab/problematisation/dossier/:id
- **Automatisation :** ✅ api/collab.test.ts

### TC-COLLAB-037 — Problématisation POST : champs absents -> persistance de valeurs vides (pas de 400)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | partition d'équivalence (entrée manquante tolérée) |

- **Préconditions :** Accompagné Amine, dossier D1, feature active.
- **Données :** POST /api/collab/problematisation/dossier/<D1> {} (corps vide)
- **Étapes :**
  1. Poster un corps vide
  2. Relire via GET
- **Résultat attendu :** 200 {ok:true} ; reponses==[] (non tableau -> []), problematique=='' (String(undefined||'')) ; aucun rejet 400, le endpoint tolère l'absence.
- **Traçabilité :** problematisation — POST /api/collab/problematisation/dossier/:id
- **Automatisation :** ✅ api/collab.test.ts

### TC-COLLAB-038 — Problématisation POST : reponses non-tableau normalisé à []

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | basse | partition d'équivalence (type invalide -> coercition/repli) |

- **Préconditions :** Accompagné Amine, dossier D1, feature active.
- **Données :** POST /api/collab/problematisation/dossier/<D1> {reponses:'pas un tableau', problematique:42}
- **Étapes :**
  1. Poster reponses sous forme de chaîne et problematique numérique
  2. Relire via GET
- **Résultat attendu :** 200 ; reponses==[] (Array.isArray false), problematique=='42' (coercition String). Robustesse aux types.
- **Traçabilité :** problematisation — POST /api/collab/problematisation/dossier/:id
- **Automatisation :** ✅ api/collab.test.ts

### TC-COLLAB-039 — Problématisation POST : dossier non possédé -> 404

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles (propriété) — accès horizontal |

- **Préconditions :** Accompagné Léa ; dossier D1 d'Amine.
- **Données :** POST /api/collab/problematisation/dossier/<D1> en tant que Léa.
- **Étapes :**
  1. Poster sur le dossier d'autrui
- **Résultat attendu :** 404 ; {error:'Parcours introuvable'} ; aucune écriture.
- **Traçabilité :** problematisation — POST /api/collab/problematisation/dossier/:id
- **Automatisation :** ✅ api/collab.test.ts

### TC-COLLAB-040 — Problématisation POST : 401 / 403 rôle / 403 feature

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | table de décision (auth × rôle × feature) |

- **Préconditions :** a) sans cookie ; b) accompagnateur ; c) accompagné sans feature.
- **Données :** POST /api/collab/problematisation/dossier/<id> pour chaque cas.
- **Étapes :**
  1. Poster sans session
  2. Poster en accompagnateur
  3. Poster en accompagné au plan limité
- **Résultat attendu :** a) 401 ; b) 403 'Accès refusé' ; c) 403 'Fonctionnalité non disponible dans votre offre'.
- **Traçabilité :** problematisation — POST /api/collab/problematisation/dossier/:id
- **Automatisation :** ✅ api/collab.test.ts

### TC-COLLAB-041 — Problématisation suggerer (IA) : contrat de réponse

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat (champs présents/typés, non-vacuité, gating) |

- **Préconditions :** Accompagné Amine, dossier D1, feature active. (Avec ou sans clé Claude.)
- **Données :** POST /api/collab/problematisation/dossier/<D1>/suggerer {reponses:['terrain métier/technique','...','autonomie vs contrôle','utilité']}
- **Étapes :**
  1. Poster les réponses guidées
  2. Vérifier la structure de la réponse
- **Résultat attendu :** 200 ; {problematique:<string non vide>, sous_questions:<array, longueur 0..3>, source:'ia'|'heuristique'} ; sous_questions tronqué à 3 max. Ne pas figer le texte.
- **Traçabilité :** problematisation — POST /api/collab/problematisation/dossier/:id/suggerer
- **Automatisation :** ✅ api/collab.test.ts

### TC-COLLAB-042 — Problématisation suggerer : repli heuristique déterministe (IA indisponible)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | table de décision (IA OK / repli) + test du contrat sur le repli |

- **Préconditions :** ANTHROPIC_API_KEY absente OU API renvoyant un texte sans JSON exploitable (callClaude=null -> extractJson=null).
- **Données :** POST .../suggerer {reponses:['un cabinet de conseil','x','autonomie ↔ contrôle','y']}
- **Étapes :**
  1. Forcer l'indisponibilité IA (clé absente)
  2. Poster les réponses
  3. Lire la réponse
- **Résultat attendu :** 200 ; source=='heuristique' ; problematique == 'Comment, dans un cabinet de conseil, concilier autonomie ↔ contrôle ?' (reponses[0] et reponses[2]) ; sous_questions == ['Quels éléments concrets illustrent cette tension ?','Quels leviers permettent de la dépasser ?'].
- **Traçabilité :** problematisation — POST /api/collab/problematisation/dossier/:id/suggerer (repli)
- **Automatisation :** ✅ api/collab.test.ts

### TC-COLLAB-043 — Problématisation suggerer : repli avec reponses vides -> libellés par défaut

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | moyenne | valeurs limites (réponses absentes -> défauts) — test unitaire du repli |

- **Préconditions :** IA indisponible ; reponses == [] ou indices manquants.
- **Données :** reponses[0] et reponses[2] undefined.
- **Étapes :**
  1. Appeler la branche heuristique avec un tableau de réponses vide
- **Résultat attendu :** problematique == 'Comment, dans ton terrain professionnel, concilier les deux pôles en tension ?' (valeurs par défaut quand reponses[0]/reponses[2] sont vides).
- **Traçabilité :** problematisation — branche heuristique de POST .../suggerer
- **Automatisation :** ⏳ à automatiser

### TC-COLLAB-044 — Problématisation suggerer : 404 dossier non possédé ; 401/403 accès

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | table de décision (auth × rôle × feature × propriété) |

- **Préconditions :** a) Léa sur dossier d'Amine ; b) sans cookie ; c) accompagnateur ; d) accompagné sans feature.
- **Données :** POST .../dossier/<id>/suggerer pour chaque cas.
- **Étapes :**
  1. Appeler avec un dossier d'autrui
  2. Appeler sans session
  3. Appeler en accompagnateur
  4. Appeler en accompagné au plan limité
- **Résultat attendu :** a) 404 'Parcours introuvable' ; b) 401 'Non authentifié' ; c) 403 'Accès refusé' ; d) 403 'Fonctionnalité non disponible dans votre offre'. (Le gating est vérifié AVANT tout appel IA.)
- **Traçabilité :** problematisation — POST .../suggerer (requireAuth/Role/Feature + ownDossier)
- **Automatisation :** ✅ api/collab.test.ts

### TC-COLLAB-045 — extractJson : extraction du premier '{' au dernier '}' (unitaire)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | moyenne | partition d'équivalence + valeurs limites (test unitaire de parsing) |

- **Préconditions :** Fonction helper extractJson de collaboration.ts.
- **Données :** Entrées : 'préambule {"problematique":"Q","sous_questions":["a"]} fin' ; 'texte sans accolade' ; '{cassé' ; null.
- **Étapes :**
  1. Appeler extractJson sur chaque entrée
- **Résultat attendu :** 1) objet {problematique:'Q', sous_questions:['a']} ; 2) null (pas d'accolade) ; 3) null (JSON.parse échoue, catch) ; 4) null (texte null).
- **Traçabilité :** problematisation/resume — fonction extractJson (collaboration.ts)
- **Automatisation :** ✅ unit/collaboration.test.ts

### TC-COLLAB-046 — Résumé GET : état nominal (null si jamais généré)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat (forme de réponse, état initial) |

- **Préconditions :** Accompagné Amine, dossier D1, feature resume_parcours active.
- **Données :** GET /api/collab/resume/dossier/<D1>
- **Étapes :**
  1. Se connecter en Amine
  2. Appeler le GET avant toute génération
- **Résultat attendu :** 200 ; {resume: null} si aucune génération, sinon {resume:{etat, faits[], prochaines_etapes[], source, genere_le}}.
- **Traçabilité :** resume_parcours — GET /api/collab/resume/dossier/:id — ResumeParcoursCard.tsx
- **Automatisation :** ✅ api/collab.test.ts

### TC-COLLAB-047 — Résumé GET : dossier non possédé -> 404 ; 401/403 accès

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | table de décision (auth × rôle × feature × propriété) |

- **Préconditions :** a) Léa sur dossier d'Amine ; b) sans cookie ; c) accompagnateur ; d) accompagné sans feature resume_parcours.
- **Données :** GET /api/collab/resume/dossier/<id> pour chaque cas.
- **Étapes :**
  1. Appeler avec dossier d'autrui
  2. sans session
  3. en accompagnateur
  4. en accompagné au plan limité
- **Résultat attendu :** a) 404 'Parcours introuvable' ; b) 401 ; c) 403 'Accès refusé' ; d) 403 'Fonctionnalité non disponible dans votre offre'.
- **Traçabilité :** resume_parcours — GET /api/collab/resume/dossier/:id
- **Automatisation :** ✅ api/collab.test.ts

### TC-COLLAB-048 — Résumé POST (IA) : contrat de réponse + persistance

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat (champs typés, non-vacuité, persistance/relecture) |

- **Préconditions :** Accompagné Amine, dossier D1 (a des sessions, CR publiés, actions), feature active.
- **Données :** POST /api/collab/resume/dossier/<D1>
- **Étapes :**
  1. Poster pour générer
  2. Vérifier la forme
  3. Relire via GET
- **Résultat attendu :** 200 ; {etat:<string non vide>, faits:<array>, prochaines_etapes:<array>, source:'ia'|'heuristique'} ; GET renvoie ensuite le même contenu + genere_le (persisté via upsert). Ne pas figer le texte.
- **Traçabilité :** resume_parcours — POST /api/collab/resume/dossier/:id
- **Automatisation :** ✅ api/collab.test.ts

### TC-COLLAB-049 — Résumé POST : repli heuristique resumeFallback (IA indisponible)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | table de décision (IA / repli) + test du contrat sur le repli |

- **Préconditions :** ANTHROPIC_API_KEY absente (callClaude=null) ; dossier D1 d'Amine avec phase max, CR publiés et actions seedés.
- **Données :** POST /api/collab/resume/dossier/<D1>
- **Étapes :**
  1. Forcer l'indisponibilité IA
  2. Poster la génération
  3. Lire la réponse
- **Résultat attendu :** 200 ; source=='heuristique' ; etat mentionne l'étape PHASES_FR[phaseMax], le nombre de CR publiés et d'actions faites ; faits[] contient l'état du questionnaire et des CR ; prochaines_etapes[] = jusqu'à 3 actions non 'fait' (ou ['Préparer le prochain entretien.'] si aucune).
- **Traçabilité :** resume_parcours — POST .../resume (resumeFallback)
- **Automatisation :** ✅ api/collab.test.ts

### TC-COLLAB-050 — resumeFallback : parcours non démarré (phaseMax < 0)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | moyenne | valeurs limites (phaseMax=-1, listes vides) — test unitaire du repli |

- **Préconditions :** Dossier sans aucune session (MAX(phase_atteinte)=NULL -> phaseMax=-1), sans CR publié, sans action.
- **Données :** resumeContexte renvoie {phaseMax:-1, nbCr:0, recap:null, actions:[]}.
- **Étapes :**
  1. Appeler resumeFallback sur un dossier vierge
- **Résultat attendu :** etat == 'Ton parcours vient de démarrer.' ; faits == ['Questionnaire initial à compléter.','Pas encore de compte rendu publié.'] ; prochaines_etapes == ['Préparer le prochain entretien.'].
- **Traçabilité :** resume_parcours — fonction resumeFallback
- **Automatisation :** ✅ unit/collaboration.test.ts

### TC-COLLAB-051 — resumeFallback : agrégats actions (faites vs en cours) et troncature à 3

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | moyenne | partition d'équivalence (statut fait/non-fait) + valeurs limites (troncature 3) |

- **Préconditions :** Dossier avec 5 actions dont 2 'fait' et 4 non-'fait' (statuts variés a_faire/en_cours), phaseMax=2, nbCr=1.
- **Données :** actions: [fait, a_faire×3, en_cours] ; recap renseigné.
- **Étapes :**
  1. Appeler resumeFallback
  2. Vérifier le décompte et la troncature
- **Résultat attendu :** etat cite PHASES_FR[2]='Explorer l’expérience', '1 compte(s) rendu publié(s)', et le nombre d'actions réalisées (filtre statut=='fait') ; prochaines_etapes = 3 premières actions non-'fait' (slice(0,3)) ; faits[0] = 'Ton questionnaire initial est posé.' car recap présent.
- **Traçabilité :** resume_parcours — resumeFallback / PHASES_FR
- **Automatisation :** ✅ unit/collaboration.test.ts

### TC-COLLAB-052 — Résumé POST : ré-génération met à jour (upsert, une seule ligne)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | non-regression | moyenne | transition d'état (upsert) + non-régression |

- **Préconditions :** Un résumé existe déjà pour D1.
- **Données :** POST /api/collab/resume/dossier/<D1> (2e appel)
- **Étapes :**
  1. Générer une 1re fois
  2. Re-générer
  3. Relire via GET
- **Résultat attendu :** 200 ; ON CONFLICT(dossier_id) DO UPDATE : une seule ligne en base, genere_le actualisé, contenu remplacé (pas de doublon).
- **Traçabilité :** resume_parcours — POST /api/collab/resume/dossier/:id
- **Automatisation :** ✅ api/collab.test.ts

### TC-COLLAB-053 — Résumé POST : dossier non possédé -> 404 ; 401/403 accès

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | table de décision (auth × rôle × feature × propriété) |

- **Préconditions :** a) Léa sur dossier d'Amine ; b) sans cookie ; c) accompagnateur ; d) accompagné sans feature.
- **Données :** POST /api/collab/resume/dossier/<id> pour chaque cas.
- **Étapes :**
  1. Appeler avec dossier d'autrui
  2. sans session
  3. en accompagnateur
  4. en accompagné au plan limité
- **Résultat attendu :** a) 404 'Parcours introuvable' ; b) 401 'Non authentifié' ; c) 403 'Accès refusé' ; d) 403 'Fonctionnalité non disponible dans votre offre'.
- **Traçabilité :** resume_parcours — POST /api/collab/resume/dossier/:id
- **Automatisation :** ✅ api/collab.test.ts

### TC-COLLAB-054 — UI Mutualisation : partager une ressource et la voir dans la bibliothèque

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test bout-en-bout basé sur les rôles (accompagnateur) |

- **Préconditions :** Accompagnateur Mohamed connecté (BoussoleDemo2026), feature mutualisation active.
- **Données :** Page /mutualisation ; formulaire {Titre:'Mon astuce', Type:'Astuce', Contenu:'...'}.
- **Étapes :**
  1. Ouvrir le tableau de bord
  2. Cliquer '🤝 Mutualisation'
  3. Remplir le formulaire 'Partager une ressource'
  4. Cliquer 'Partager'
- **Résultat attendu :** Message 'Ressource partagée ✓' ; la ressource apparaît dans 'Bibliothèque partagée', marquée 'par moi', avec les boutons Rendre public / Supprimer ; le compteur (n) s'incrémente.
- **Traçabilité :** mutualisation — page Mutualisation.tsx (POST+GET /collab/ressources)
- **Automatisation :** ⏳ à automatiser

### TC-COLLAB-055 — UI Mutualisation : rendre public, copier le lien, ouvrir en navigation privée

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test bout-en-bout (transition interne->public + lien public anonyme) |

- **Préconditions :** Accompagnateur connecté, propriétaire d'une ressource interne.
- **Données :** Ressource 'Mon astuce' ; action 'Rendre public' puis ouverture du lien /ressource/<token>.
- **Étapes :**
  1. Cliquer '🌐 Rendre public' sur sa ressource
  2. Récupérer le lien copié (message 'Lien public copié : ...')
  3. Ouvrir l'URL dans une session non authentifiée
- **Résultat attendu :** Le badge '🌐 public' apparaît ; la page RessourcePublique affiche titre, type, contenu et 'Partagé par <auteur>' SANS authentification ; le bouton '🔗 Copier le lien' est disponible.
- **Traçabilité :** mutualisation — Mutualisation.tsx + RessourcePublique.tsx
- **Automatisation :** ⏳ à automatiser

### TC-COLLAB-056 — UI Mutualisation : actions limitées aux ressources 'mienne'

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | acces | moyenne | test basé sur les rôles (propriété) au niveau UI |

- **Préconditions :** Bibliothèque contenant des ressources de Mohamed et de Camille ; connecté en Mohamed.
- **Données :** Page /mutualisation.
- **Étapes :**
  1. Observer une ressource d'un autre auteur (ex. Camille)
  2. Observer une de ses propres ressources
- **Résultat attendu :** Les ressources d'autrui affichent 'par <auteur>' sans boutons Rendre public/Copier/Supprimer (rendus uniquement si r.mienne) ; ses propres ressources affichent 'par moi' avec les actions.
- **Traçabilité :** mutualisation — Mutualisation.tsx (flag mienne)
- **Automatisation :** ⏳ à automatiser

### TC-COLLAB-057 — UI Mutualisation : suppression avec confirmation

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | test bout-en-bout (chemin nominal + annulation) |

- **Préconditions :** Accompagnateur propriétaire d'une ressource.
- **Données :** Bouton 'Supprimer' sur une ressource 'mienne'.
- **Étapes :**
  1. Cliquer 'Supprimer'
  2. Confirmer la fenêtre window.confirm
- **Résultat attendu :** Après confirmation, la ressource disparaît de la liste (rechargement) ; si annulation, rien ne change.
- **Traçabilité :** mutualisation — Mutualisation.tsx (DELETE /collab/ressources/:id)
- **Automatisation :** ⏳ à automatiser

### TC-COLLAB-058 — UI Mutualisation : entrée masquée si feature absente

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | acces | moyenne | test basé sur les rôles + gating de feature (UI) |

- **Préconditions :** Accompagnateur dont le plan n'inclut pas 'mutualisation'.
- **Données :** Tableau de bord.
- **Étapes :**
  1. Se connecter avec un plan sans mutualisation
  2. Observer le tableau de bord
- **Résultat attendu :** Le lien '🤝 Mutualisation' n'est pas affiché (mutualisationActive=false) ; un accès direct à /mutualisation aboutit à des appels API 403.
- **Traçabilité :** mutualisation — Dashboard.tsx (mutualisationActive) + App.tsx route
- **Automatisation :** ⏳ à automatiser

### TC-COLLAB-059 — UI Problématisation : parcours guidé puis suggestion IA puis enregistrement

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test bout-en-bout basé sur les rôles (accompagné) + contrat IA |

- **Préconditions :** Accompagné Amine connecté, dossier D1, feature problematisation active.
- **Données :** Carte '🎯 Ma problématique' sur la page du parcours.
- **Étapes :**
  1. Déplier 'Construire ma problématique'
  2. Renseigner les 4 réponses guidées
  3. Cliquer '✨ Proposer une problématique (IA)'
  4. Ajuster le texte proposé
  5. Cliquer 'Enregistrer'
- **Résultat attendu :** Après IA : message 'Proposition générée — à toi de l’ajuster.', champ problématique pré-rempli, éventuelles sous-questions listées ; après Enregistrer : 'Enregistré ✓' ; au rechargement, la problématique enregistrée s'affiche en italique (mode réduit).
- **Traçabilité :** problematisation — ProblematisationCard.tsx (GET/POST/suggerer)
- **Automatisation :** ⏳ à automatiser

### TC-COLLAB-060 — UI Problématisation : carte masquée si feature absente

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | acces | basse | gating de feature (UI) |

- **Préconditions :** Accompagné dont le plan n'inclut pas 'problematisation'.
- **Données :** Page du parcours.
- **Étapes :**
  1. Se connecter avec un plan sans problematisation
  2. Ouvrir le parcours
- **Résultat attendu :** La carte '🎯 Ma problématique' n'est pas rendue (useFeature('problematisation') faux -> return null) ; aucun appel /collab/problematisation n'est émis.
- **Traçabilité :** problematisation — ProblematisationCard.tsx (useFeature)
- **Automatisation :** ⏳ à automatiser

### TC-COLLAB-061 — UI Résumé : générer puis mettre à jour 'Où j'en suis'

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test bout-en-bout basé sur les rôles (accompagné) + contrat IA |

- **Préconditions :** Accompagné Amine connecté, dossier D1, feature resume_parcours active.
- **Données :** Carte '🧭 Où j’en suis'.
- **Étapes :**
  1. Cliquer '✨ Faire le point'
  2. Observer le résumé
  3. Cliquer '↻ Mettre à jour'
- **Résultat attendu :** Pendant l'appel le bouton affiche 'Analyse…' ; le résumé montre etat, une liste 'faits' et 'Mes prochaines étapes' (➡️) ; après mise à jour le contenu est régénéré ; au rechargement le dernier résumé persiste (GET).
- **Traçabilité :** resume_parcours — ResumeParcoursCard.tsx (GET/POST)
- **Automatisation :** ⏳ à automatiser

### TC-COLLAB-062 — UI Résumé : carte masquée si feature absente

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | acces | basse | gating de feature (UI) |

- **Préconditions :** Accompagné dont le plan n'inclut pas 'resume_parcours'.
- **Données :** Page du parcours.
- **Étapes :**
  1. Se connecter avec un plan sans resume_parcours
  2. Ouvrir le parcours
- **Résultat attendu :** La carte '🧭 Où j’en suis' n'est pas rendue (useFeature faux -> return null) ; aucun appel /collab/resume n'est émis.
- **Traçabilité :** resume_parcours — ResumeParcoursCard.tsx (useFeature)
- **Automatisation :** ⏳ à automatiser

### TC-COLLAB-063 — UI Ressource publique : token invalide affiche un message d'erreur convivial

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | validation | moyenne | test bout-en-bout (chemin d'erreur, route hors-auth) |

- **Préconditions :** Aucune session ; token inexistant ou ressource repassée en interne.
- **Données :** Navigation vers /ressource/token-invalide.
- **Étapes :**
  1. Ouvrir l'URL publique avec un token erroné, déconnecté
- **Résultat attendu :** La page affiche 'Cette ressource n’existe pas ou n’est plus partagée publiquement.' (catch sur 404) et propose le lien 'Découvrir Boussole' ; aucune redirection vers la connexion (route publique).
- **Traçabilité :** (public) RessourcePublique.tsx — GET /collab/ressources/public/:token
- **Automatisation :** ⏳ à automatiser

### TC-COLLAB-064 — Sécurité : injection SQL inopérante via token public (paramétrage)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | partition d'équivalence (entrée malveillante) — test de robustesse |

- **Préconditions :** Aucune.
- **Données :** GET /api/collab/ressources/public/' OR '1'='1 (token avec charge SQL).
- **Étapes :**
  1. Appeler le lien public avec une charge d'injection dans le token
- **Résultat attendu :** 404 'Ressource introuvable ou non publique' ; les requêtes utilisent des paramètres liés (prepare/get), pas de concaténation : aucune ressource n'est divulguée.
- **Traçabilité :** (public) GET /api/collab/ressources/public/:token
- **Automatisation :** ✅ api/collab.test.ts

## Domaine VIZ — 49 cas

**Endpoints couverts :**

- `GET /api/viz/nuage/dossier/:id` · feature: `nuage_themes` · rôle: accompagne|accompagnateur (propriétaire du dossier) — Relit le nuage de thèmes persisté d'un parcours (ou null s'il n'a jamais été généré).
- `POST /api/viz/nuage/dossier/:id` · feature: `nuage_themes` · rôle: accompagne|accompagnateur (propriétaire du dossier) — Génère/regénère le nuage de thèmes via IA (repli heuristique par fréquence), persiste en upsert et renvoie themes + source.
- `GET /api/viz/emotions/catalogue` · feature: `roue_emotions` · rôle: tout authentifié avec la feature — Renvoie le catalogue des 16 émotions catégorisées (cle + famille).
- `GET /api/viz/emotions/dossier/:id` · feature: `roue_emotions` · rôle: accompagne|accompagnateur (propriétaire du dossier) — Renvoie les 30 derniers relevés d'émotions du parcours + agrégat de fréquence par émotion.
- `POST /api/viz/emotions/dossier/:id` · feature: `roue_emotions` · rôle: accompagne|accompagnateur (propriétaire du dossier) — Enregistre un relevé d'émotions (sanitize contre le catalogue, note tronquée à 200), 201 ok.

### TC-VIZ-001 — GET nuage existant - relecture nominale (200, forme du nuage)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Test du contrat (forme et typage de la réponse) |

- **Préconditions :** Connecté en accompagné Amine (afrit_mohamed@yahoo.fr) propriétaire d'un dossier did dont le nuage a déjà été généré (POST préalable).
- **Données :** GET /api/viz/nuage/dossier/{did}
- **Étapes :**
  1. Se connecter (mdp BoussoleDemo2026)
  2. Générer le nuage via POST une fois
  3. Appeler GET /api/viz/nuage/dossier/{did}
- **Résultat attendu :** 200. Corps { nuage: { themes:[{mot:string, poids:number 1..10}], source:'ia'|'heuristique', genere_le:ISO } }. themes est un tableau non vide, chaque poids entier dans [1,10].
- **Traçabilité :** nuage_themes | GET /api/viz/nuage/dossier/:id
- **Automatisation :** ✅ api/viz.test.ts

### TC-VIZ-002 — GET nuage jamais généré - renvoie nuage:null (200)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | Partition d'équivalence (présence vs absence de la ressource) |

- **Préconditions :** Connecté en propriétaire d'un dossier did pour lequel aucun nuage n'a été persisté (aucune ligne dans nuages_themes).
- **Données :** GET /api/viz/nuage/dossier/{did}
- **Étapes :**
  1. Se connecter en propriétaire
  2. Choisir un dossier sans nuage
  3. Appeler GET /api/viz/nuage/dossier/{did}
- **Résultat attendu :** 200 avec { nuage: null }. Aucune erreur, branche row=undefined couverte.
- **Traçabilité :** nuage_themes | GET /api/viz/nuage/dossier/:id
- **Automatisation :** ✅ api/viz.test.ts

### TC-VIZ-003 — GET nuage - non authentifié (401)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles (rôle anonyme) |

- **Préconditions :** Aucun cookie d'authentification (anonyme).
- **Données :** GET /api/viz/nuage/dossier/1 sans cookie boussole_token
- **Étapes :**
  1. Ne pas se connecter
  2. Appeler GET /api/viz/nuage/dossier/1
- **Résultat attendu :** 401 { error:'Non authentifié' }. requireAuth bloque avant requireFeature.
- **Traçabilité :** nuage_themes | GET /api/viz/nuage/dossier/:id (requireAuth)
- **Automatisation :** ✅ api/viz.test.ts

### TC-VIZ-004 — GET nuage - feature absente de l'offre (403 requireFeature)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Table de décision (authentifié x feature présente/absente) |

- **Préconditions :** Admin a affecté à l'accompagné un plan (ex. Découverte/socle) dont les features n'incluent PAS 'nuage_themes' (PATCH /api/admin/users/:id { plan_id }).
- **Données :** GET /api/viz/nuage/dossier/{did} avec utilisateur rattaché à un plan sans nuage_themes
- **Étapes :**
  1. Admin: créer/choisir un plan sans 'nuage_themes'
  2. Admin: affecter ce plan à l'utilisateur
  3. Se connecter en cet utilisateur
  4. Appeler GET /api/viz/nuage/dossier/{did}
- **Résultat attendu :** 403 { error:'Fonctionnalité non disponible dans votre offre' }.
- **Traçabilité :** nuage_themes | GET /api/viz/nuage/dossier/:id (requireFeature)
- **Automatisation :** ✅ api/viz.test.ts

### TC-VIZ-005 — GET nuage - dossier d'un autre utilisateur (404 propriété)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles (contrôle de propriété ownEither) |

- **Préconditions :** Connecté en accompagné Léa (lea.martin@boussole.demo) ; did appartient à un dossier dont elle n'est ni accompagne_id ni accompagnateur_id.
- **Données :** GET /api/viz/nuage/dossier/{did_autrui}
- **Étapes :**
  1. Se connecter en Léa
  2. Identifier un dossier d'Amine
  3. Appeler GET /api/viz/nuage/dossier/{did_autrui}
- **Résultat attendu :** 404 { error:'Parcours introuvable' }. ownEither renvoie undefined.
- **Traçabilité :** nuage_themes | GET /api/viz/nuage/dossier/:id (ownEither)
- **Automatisation :** ✅ api/viz.test.ts

### TC-VIZ-006 — GET nuage - id non numérique / inexistant (404)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | Valeurs limites / partition d'équivalence (id invalide vs inexistant) |

- **Préconditions :** Connecté en accompagnateur Mohamed (elafrit.mohamed@gmail.com).
- **Données :** GET /api/viz/nuage/dossier/abc puis GET /api/viz/nuage/dossier/999999
- **Étapes :**
  1. Se connecter
  2. Appeler avec :id='abc' (Number -> NaN)
  3. Appeler avec :id=999999 (inexistant)
- **Résultat attendu :** 404 { error:'Parcours introuvable' } dans les deux cas (ownEither ne trouve aucune ligne).
- **Traçabilité :** nuage_themes | GET /api/viz/nuage/dossier/:id
- **Automatisation :** ✅ api/viz.test.ts

### TC-VIZ-007 — POST nuage - génération nominale par contrat (200, themes + source)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Test du contrat (champs présents, typés, non vides ; gating IA/repli) |

- **Préconditions :** Connecté en propriétaire d'un dossier did riche en contenu (questionnaire récap, CR publiés, notes, journal partagé, fil rouge) > 80 caractères agrégés.
- **Données :** POST /api/viz/nuage/dossier/{did} (body vide)
- **Étapes :**
  1. Se connecter en propriétaire
  2. Appeler POST /api/viz/nuage/dossier/{did}
- **Résultat attendu :** 200 { themes:[{mot:string non vide, poids:int 1..10}], source:'ia'|'heuristique' }. <=24 thèmes. Sans clé API ou si l'IA échoue, source='heuristique' mais le contrat reste respecté (NE PAS figer le texte des mots).
- **Traçabilité :** nuage_themes | POST /api/viz/nuage/dossier/:id
- **Automatisation :** ✅ api/viz.test.ts

### TC-VIZ-008 — POST nuage - persistance et relecture (upsert puis GET cohérent)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Test du contrat (persistance/relecture) |

- **Préconditions :** Connecté en propriétaire d'un dossier did.
- **Données :** POST puis GET /api/viz/nuage/dossier/{did}
- **Étapes :**
  1. POST /api/viz/nuage/dossier/{did}
  2. Noter themes/source renvoyés
  3. GET /api/viz/nuage/dossier/{did}
- **Résultat attendu :** Le GET renvoie nuage.themes identiques à ceux du POST, plus source et genere_le (datetime now). Une seule ligne en base (ON CONFLICT(dossier_id) DO UPDATE).
- **Traçabilité :** nuage_themes | POST + GET /api/viz/nuage/dossier/:id
- **Automatisation :** ✅ api/viz.test.ts

### TC-VIZ-009 — POST nuage - régénération met à jour sans doublon (idempotence upsert)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | non-regression | moyenne | Test du contrat (conflit/upsert ON CONFLICT) |

- **Préconditions :** Connecté en propriétaire d'un dossier did déjà doté d'un nuage.
- **Données :** POST /api/viz/nuage/dossier/{did} appelé deux fois
- **Étapes :**
  1. POST une 1re fois
  2. POST une 2e fois
  3. Vérifier en base nuages_themes WHERE dossier_id={did}
- **Résultat attendu :** Toujours exactement 1 ligne pour ce dossier ; genere_le mis à jour. Pas de violation de contrainte d'unicité.
- **Traçabilité :** nuage_themes | POST /api/viz/nuage/dossier/:id
- **Automatisation :** ✅ api/viz.test.ts

### TC-VIZ-010 — POST nuage - dossier quasi vide => repli heuristique (source='heuristique')

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | Valeurs limites (seuil de longueur 80) + partition (contenu suffisant/insuffisant) |

- **Préconditions :** Connecté en propriétaire d'un dossier did dont le texte agrégé fait <= 80 caractères (branche txt.trim().length>80 fausse).
- **Données :** POST /api/viz/nuage/dossier/{did}
- **Étapes :**
  1. Choisir/créer un dossier sans contenu textuel
  2. Appeler POST /api/viz/nuage/dossier/{did}
- **Résultat attendu :** 200. L'IA n'est pas appelée ; result vient de nuageFallback ; source='heuristique'. themes peut être vide si aucun mot >=4 lettres.
- **Traçabilité :** nuage_themes | POST /api/viz/nuage/dossier/:id (branche fallback)
- **Automatisation :** ✅ api/viz.test.ts

### TC-VIZ-011 — POST nuage - 401 non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles (anonyme) |

- **Préconditions :** Anonyme.
- **Données :** POST /api/viz/nuage/dossier/1 sans cookie
- **Étapes :**
  1. Ne pas se connecter
  2. Appeler POST /api/viz/nuage/dossier/1
- **Résultat attendu :** 401 { error:'Non authentifié' }.
- **Traçabilité :** nuage_themes | POST /api/viz/nuage/dossier/:id (requireAuth)
- **Automatisation :** ✅ api/viz.test.ts

### TC-VIZ-012 — POST nuage - 403 feature non disponible

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Table de décision (feature absente) |

- **Préconditions :** Utilisateur rattaché à un plan sans 'nuage_themes'.
- **Données :** POST /api/viz/nuage/dossier/{did}
- **Étapes :**
  1. Admin: affecter un plan sans nuage_themes
  2. Se connecter
  3. Appeler POST /api/viz/nuage/dossier/{did}
- **Résultat attendu :** 403 { error:'Fonctionnalité non disponible dans votre offre' }. Aucune écriture en base.
- **Traçabilité :** nuage_themes | POST /api/viz/nuage/dossier/:id (requireFeature)
- **Automatisation :** ✅ api/viz.test.ts

### TC-VIZ-013 — POST nuage - 404 dossier d'autrui

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles (propriété ownEither) |

- **Préconditions :** Connecté en accompagné Karim (karim.benali@boussole.demo) ; did appartient à un autre utilisateur.
- **Données :** POST /api/viz/nuage/dossier/{did_autrui}
- **Étapes :**
  1. Se connecter en Karim
  2. Appeler POST sur un dossier d'Amine
- **Résultat attendu :** 404 { error:'Parcours introuvable' }. Aucune génération ni écriture.
- **Traçabilité :** nuage_themes | POST /api/viz/nuage/dossier/:id (ownEither)
- **Automatisation :** ✅ api/viz.test.ts

### TC-VIZ-014 — POST nuage - accès par l'accompagnateur du dossier (ownEither côté accompagnateur)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | Partition d'équivalence (les deux parties propriétaires) |

- **Préconditions :** Connecté en accompagnateur Mohamed, propriétaire (accompagnateur_id) du dossier did d'Amine.
- **Données :** POST /api/viz/nuage/dossier/{did}
- **Étapes :**
  1. Se connecter en accompagnateur
  2. Appeler POST sur le dossier qu'il suit
- **Résultat attendu :** 200 (génération autorisée). Confirme que ownEither accepte aussi l'accompagnateur, pas seulement l'accompagné.
- **Traçabilité :** nuage_themes | POST /api/viz/nuage/dossier/:id (ownEither OR)
- **Automatisation :** ✅ api/viz.test.ts

### TC-VIZ-015 — UNITAIRE nuageFallback - calcul des poids normalisés (max -> 10)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | haute | Test unitaire de repli déterministe + valeurs limites (poids min=1, max=10) |

- **Préconditions :** Fonction nuageFallback(did) testable avec un texteDossier connu/mocké contenant des mots répétés.
- **Données :** Texte où 'memoire' apparaît 10x, 'projet' 5x, 'écriture' 2x, plus des stopwords.
- **Étapes :**
  1. Construire un dossier avec ce texte agrégé
  2. Appeler nuageFallback(did)
  3. Inspecter themes
- **Résultat attendu :** Le mot le plus fréquent reçoit poids=10 (Math.round((n/max)*10)). Les autres poids = max(1, round(ratio*10)). themes triés par fréquence décroissante, <=24 entrées.
- **Traçabilité :** nuage_themes | fonction nuageFallback
- **Automatisation :** ✅ unit/visualisation.test.ts

### TC-VIZ-016 — UNITAIRE nuageFallback - exclusion stopwords et mots < 4 lettres

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | validation | haute | Partition d'équivalence (mot retenu vs filtré) + valeurs limites (longueur 3 vs 4) |

- **Préconditions :** nuageFallback testable.
- **Données :** Texte: 'le la les pour avec' (stopwords) + 'mot oui job' (<4 lettres) + 'parcours parcours'.
- **Étapes :**
  1. Préparer le texte
  2. Appeler nuageFallback
  3. Lister les mots retenus
- **Résultat attendu :** Seul 'parcours' est retenu. Les stopwords du Set STOP et tout mot de longueur <4 sont écartés (m.length<4 || STOP.has(m)).
- **Traçabilité :** nuage_themes | fonction nuageFallback (STOP, longueur)
- **Automatisation :** ✅ unit/visualisation.test.ts

### TC-VIZ-017 — UNITAIRE nuageFallback - normalisation accents et casse

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | moyenne | Partition d'équivalence (variantes orthographiques équivalentes) |

- **Préconditions :** nuageFallback testable.
- **Données :** Texte: 'Mémoire mémoire MEMOIRE mémorisé' (accents + casses mêlées).
- **Étapes :**
  1. Préparer le texte
  2. Appeler nuageFallback
  3. Vérifier le regroupement
- **Résultat attendu :** 'mémoire'/'MEMOIRE' sont normalisés en 'memoire' (toLowerCase + NFD + suppression diacritiques) et comptés ensemble (poids agrégé), distinct de 'memorise'.
- **Traçabilité :** nuage_themes | fonction nuageFallback (normalize NFD)
- **Automatisation :** ✅ unit/visualisation.test.ts

### TC-VIZ-018 — UNITAIRE nuageFallback - texte vide => themes:[]

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | validation | moyenne | Valeurs limites (cas vide / borne inférieure) |

- **Préconditions :** Dossier sans aucun contenu textuel exploitable.
- **Données :** texteDossier renvoie '' ou uniquement stopwords.
- **Étapes :**
  1. Préparer un dossier vide
  2. Appeler nuageFallback(did)
- **Résultat attendu :** { themes: [] } (sorted vide, map vide). max=1 par défaut, aucune exception.
- **Traçabilité :** nuage_themes | fonction nuageFallback
- **Automatisation :** ✅ unit/visualisation.test.ts

### TC-VIZ-019 — UNITAIRE extractJson - parse JSON encadré et tolère le bruit

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | moyenne | Test unitaire de repli + partition d'équivalence (valide/invalide/null) |

- **Préconditions :** Fonction extractJson testable (repli de parsing de la réponse IA).
- **Données :** Entrées: 'bla {\"themes\":[{\"mot\":\"x\",\"poids\":3}]} fin' ; 'aucun json' ; null ; '{cassé'
- **Étapes :**
  1. Appeler extractJson sur chaque entrée
- **Résultat attendu :** 1) Renvoie l'objet { themes:[...] } en isolant du 1er '{' au dernier '}'. 2) 'aucun json' (pas d'accolade) -> null. 3) null -> null. 4) JSON invalide -> null (catch).
- **Traçabilité :** nuage_themes | fonction extractJson
- **Automatisation :** ✅ unit/visualisation.test.ts

### TC-VIZ-020 — UNITAIRE strip - retire balises HTML et entités

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | basse | Test unitaire de sanitize |

- **Préconditions :** Fonction strip testable (utilisée par texteDossier sur les CR publiés).
- **Données :** '<p>Bonjour&nbsp;<b>monde</b></p>'
- **Étapes :**
  1. Appeler strip sur l'entrée
- **Résultat attendu :** Le texte ne contient plus de balises <...> ni d'entités &xxx; ; ne reste que le texte ' Bonjour  monde '. Sécurise l'extraction des thèmes.
- **Traçabilité :** nuage_themes | fonction strip
- **Automatisation :** ✅ unit/visualisation.test.ts

### TC-VIZ-021 — POST nuage - texteDossier n'inclut que les CR publiés et le journal partagé

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | non-regression | moyenne | Table de décision (publie x partage) - confidentialité de l'agrégation |

- **Préconditions :** Dossier did avec au moins un CR publie=0 (brouillon) et une entrée de journal partage=0 (privée).
- **Données :** POST /api/viz/nuage/dossier/{did}
- **Étapes :**
  1. Préparer un CR non publié contenant un mot rare 'xylophone'
  2. Préparer un journal privé contenant 'crocodile'
  3. POST le nuage (cas repli déterministe)
- **Résultat attendu :** Les mots issus du CR brouillon (publie=0) et du journal privé (partage=0) n'apparaissent pas dans les thèmes : texteDossier filtre cr.publie=1 et journal partage=1.
- **Traçabilité :** nuage_themes | POST /api/viz/nuage/dossier/:id (texteDossier filtres)
- **Automatisation :** ✅ api/viz.test.ts

### TC-VIZ-022 — GET catalogue émotions - nominal (200, 16 émotions catégorisées)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Test du contrat (forme + complétude du catalogue) |

- **Préconditions :** Connecté en utilisateur disposant de la feature roue_emotions (par défaut, sans plan).
- **Données :** GET /api/viz/emotions/catalogue
- **Étapes :**
  1. Se connecter
  2. Appeler GET /api/viz/emotions/catalogue
- **Résultat attendu :** 200 { emotions:[{cle:string, famille:string}] } de 16 entrées couvrant les familles joie, peur, tristesse, colere, surprise, calme. Chaque famille appartient à l'ensemble attendu.
- **Traçabilité :** roue_emotions | GET /api/viz/emotions/catalogue
- **Automatisation :** ✅ api/viz.test.ts

### TC-VIZ-023 — GET catalogue émotions - 401 non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles (anonyme) |

- **Préconditions :** Anonyme.
- **Données :** GET /api/viz/emotions/catalogue sans cookie
- **Étapes :**
  1. Ne pas se connecter
  2. Appeler GET /api/viz/emotions/catalogue
- **Résultat attendu :** 401 { error:'Non authentifié' }.
- **Traçabilité :** roue_emotions | GET /api/viz/emotions/catalogue (requireAuth)
- **Automatisation :** ✅ api/viz.test.ts

### TC-VIZ-024 — GET catalogue émotions - 403 feature non disponible

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Table de décision (feature absente) |

- **Préconditions :** Utilisateur rattaché à un plan sans 'roue_emotions'.
- **Données :** GET /api/viz/emotions/catalogue
- **Étapes :**
  1. Admin: affecter un plan sans roue_emotions
  2. Se connecter
  3. Appeler GET /api/viz/emotions/catalogue
- **Résultat attendu :** 403 { error:'Fonctionnalité non disponible dans votre offre' }.
- **Traçabilité :** roue_emotions | GET /api/viz/emotions/catalogue (requireFeature)
- **Automatisation :** ✅ api/viz.test.ts

### TC-VIZ-025 — GET émotions dossier - nominal entries + aggregate (200)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Test du contrat (forme + agrégat de fréquence) |

- **Préconditions :** Connecté en propriétaire d'un dossier did avec plusieurs relevés d'émotions enregistrés.
- **Données :** GET /api/viz/emotions/dossier/{did}
- **Étapes :**
  1. Se connecter en propriétaire
  2. Avoir au moins 2 POST d'émotions
  3. Appeler GET /api/viz/emotions/dossier/{did}
- **Résultat attendu :** 200 { entries:[{id, role, emotions:string[], note:string|null, cree_le}], aggregate:{ <emotion>:count } }. entries triées cree_le DESC, max 30. aggregate compte chaque occurrence d'émotion sur tous les relevés.
- **Traçabilité :** roue_emotions | GET /api/viz/emotions/dossier/:id
- **Automatisation :** ✅ api/viz.test.ts

### TC-VIZ-026 — GET émotions dossier - agrégat correct (table de décision multi-relevés)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | Table de décision / partition (occurrences cumulées) |

- **Préconditions :** Connecté en propriétaire d'un dossier did vierge de tout relevé.
- **Données :** POST {emotions:['fier','stresse']}, POST {emotions:['fier','curieux']}, puis GET
- **Étapes :**
  1. POST relevé 1: fier+stresse
  2. POST relevé 2: fier+curieux
  3. GET /api/viz/emotions/dossier/{did}
- **Résultat attendu :** aggregate = { fier:2, stresse:1, curieux:1 }. entries.length=2. Vérifie l'agrégation par accumulation.
- **Traçabilité :** roue_emotions | GET /api/viz/emotions/dossier/:id (agg)
- **Automatisation :** ✅ api/viz.test.ts

### TC-VIZ-027 — GET émotions dossier - dossier sans relevé (200, listes vides)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | Valeurs limites (collection vide) |

- **Préconditions :** Connecté en propriétaire d'un dossier did sans aucun relevé d'émotions.
- **Données :** GET /api/viz/emotions/dossier/{did}
- **Étapes :**
  1. Choisir un dossier vierge
  2. Appeler GET
- **Résultat attendu :** 200 { entries:[], aggregate:{} }. Aucune erreur.
- **Traçabilité :** roue_emotions | GET /api/viz/emotions/dossier/:id
- **Automatisation :** ✅ api/viz.test.ts

### TC-VIZ-028 — GET émotions dossier - limite 30 derniers relevés

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | non-regression | basse | Valeurs limites (borne 30) |

- **Préconditions :** Connecté en propriétaire d'un dossier did avec plus de 30 relevés enregistrés.
- **Données :** GET /api/viz/emotions/dossier/{did} après 31 POST
- **Étapes :**
  1. Enregistrer 31 relevés
  2. Appeler GET
- **Résultat attendu :** entries.length === 30 (LIMIT 30), tri cree_le DESC (les plus récents). L'agrégat ne porte que sur ces 30 entries renvoyées.
- **Traçabilité :** roue_emotions | GET /api/viz/emotions/dossier/:id (LIMIT 30)
- **Automatisation :** ✅ api/viz.test.ts

### TC-VIZ-029 — GET émotions dossier - 401 non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles (anonyme) |

- **Préconditions :** Anonyme.
- **Données :** GET /api/viz/emotions/dossier/1 sans cookie
- **Étapes :**
  1. Ne pas se connecter
  2. Appeler GET /api/viz/emotions/dossier/1
- **Résultat attendu :** 401 { error:'Non authentifié' }.
- **Traçabilité :** roue_emotions | GET /api/viz/emotions/dossier/:id (requireAuth)
- **Automatisation :** ✅ api/viz.test.ts

### TC-VIZ-030 — GET émotions dossier - 403 feature non disponible

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Table de décision (feature absente) |

- **Préconditions :** Utilisateur rattaché à un plan sans 'roue_emotions'.
- **Données :** GET /api/viz/emotions/dossier/{did}
- **Étapes :**
  1. Admin: affecter un plan sans roue_emotions
  2. Se connecter
  3. Appeler GET
- **Résultat attendu :** 403 { error:'Fonctionnalité non disponible dans votre offre' }.
- **Traçabilité :** roue_emotions | GET /api/viz/emotions/dossier/:id (requireFeature)
- **Automatisation :** ✅ api/viz.test.ts

### TC-VIZ-031 — GET émotions dossier - 404 dossier d'autrui

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles (propriété ownEither) |

- **Préconditions :** Connecté en accompagné Léa ; did appartient à un autre utilisateur.
- **Données :** GET /api/viz/emotions/dossier/{did_autrui}
- **Étapes :**
  1. Se connecter en Léa
  2. Appeler GET sur un dossier d'Amine
- **Résultat attendu :** 404 { error:'Parcours introuvable' }.
- **Traçabilité :** roue_emotions | GET /api/viz/emotions/dossier/:id (ownEither)
- **Automatisation :** ✅ api/viz.test.ts

### TC-VIZ-032 — GET émotions dossier - accès accompagnateur du dossier autorisé

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | Partition d'équivalence (les deux parties propriétaires) |

- **Préconditions :** Connecté en accompagnateur Mohamed, accompagnateur_id du dossier did d'Amine.
- **Données :** GET /api/viz/emotions/dossier/{did}
- **Étapes :**
  1. Se connecter en accompagnateur
  2. Appeler GET sur le dossier suivi
- **Résultat attendu :** 200. L'accompagnateur visualise le climat (entries+aggregate). Confirme ownEither OR côté accompagnateur.
- **Traçabilité :** roue_emotions | GET /api/viz/emotions/dossier/:id (ownEither OR)
- **Automatisation :** ✅ api/viz.test.ts

### TC-VIZ-033 — POST émotions - enregistrement nominal (201 ok)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Test du contrat (création + persistance) |

- **Préconditions :** Connecté en accompagné Amine, propriétaire du dossier did.
- **Données :** POST /api/viz/emotions/dossier/{did} body { emotions:['fier','serein'], note:'bonne semaine' }
- **Étapes :**
  1. Se connecter
  2. POST avec émotions valides et note
- **Résultat attendu :** 201 { ok:true }. Une ligne insérée dans emotions_roue avec auteur_id=me.id, role=me.role, emotions=JSON dédupliqué, note tronquée. GET ultérieur reflète l'ajout.
- **Traçabilité :** roue_emotions | POST /api/viz/emotions/dossier/:id
- **Automatisation :** ✅ api/viz.test.ts

### TC-VIZ-034 — POST émotions - sanitize dédoublonne les émotions valides

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | Partition d'équivalence (déduplication) |

- **Préconditions :** Connecté en propriétaire d'un dossier did.
- **Données :** POST body { emotions:['fier','fier','serein'] }
- **Étapes :**
  1. POST avec doublon 'fier'
  2. GET le dossier
- **Résultat attendu :** 201. L'entrée enregistrée contient ['fier','serein'] (Set de déduplication dans sanitizeEmotions). Le doublon n'est pas compté deux fois.
- **Traçabilité :** roue_emotions | POST /api/viz/emotions/dossier/:id (sanitizeEmotions)
- **Automatisation :** ✅ api/viz.test.ts

### TC-VIZ-035 — POST émotions - sanitize filtre les émotions hors catalogue (400)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | haute | Partition d'équivalence (entrée invalide) + sanitize serveur |

- **Préconditions :** Connecté en propriétaire d'un dossier did.
- **Données :** POST body { emotions:['licorne','hs_42','<script>'] } (aucune dans EMOTIONS)
- **Étapes :**
  1. Se connecter
  2. POST avec uniquement des clés invalides
- **Résultat attendu :** 400 { error:'Sélectionne au moins une émotion' }. sanitizeEmotions filtre toutes les clés absentes de EMOTIONS -> tableau vide -> 400. Aucune insertion.
- **Traçabilité :** roue_emotions | POST /api/viz/emotions/dossier/:id (sanitizeEmotions, 400)
- **Automatisation :** ✅ api/viz.test.ts

### TC-VIZ-036 — POST émotions - mélange valide/invalide ne garde que les valides (201)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | haute | Table de décision (valide x invalide) + sanitize |

- **Préconditions :** Connecté en propriétaire d'un dossier did.
- **Données :** POST body { emotions:['fier','licorne','curieux','xxx'] }
- **Étapes :**
  1. POST le mélange
  2. GET le dossier
- **Résultat attendu :** 201. L'entrée ne contient que ['fier','curieux'] ; 'licorne' et 'xxx' sont écartés. Robustesse de la sanitize.
- **Traçabilité :** roue_emotions | POST /api/viz/emotions/dossier/:id (sanitizeEmotions)
- **Automatisation :** ✅ api/viz.test.ts

### TC-VIZ-037 — POST émotions - corps sans émotions / emotions absent (400)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | haute | Partition d'équivalence (champ manquant/vide/mauvais type) + valeurs limites (0 émotion) |

- **Préconditions :** Connecté en propriétaire d'un dossier did.
- **Données :** POST body {} ; POST body { emotions:[] } ; POST body { emotions:'fier' } (non tableau)
- **Étapes :**
  1. POST sans champ emotions
  2. POST avec tableau vide
  3. POST avec emotions string
- **Résultat attendu :** 400 { error:'Sélectionne au moins une émotion' } dans les trois cas (sanitizeEmotions renvoie [] si non-tableau ou vide).
- **Traçabilité :** roue_emotions | POST /api/viz/emotions/dossier/:id (400)
- **Automatisation :** ✅ api/viz.test.ts

### TC-VIZ-038 — POST émotions - note tronquée à 200 caractères

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | basse | Valeurs limites (longueur 200 ; 199/200/201) |

- **Préconditions :** Connecté en propriétaire d'un dossier did.
- **Données :** POST body { emotions:['fier'], note: chaîne de 250 caractères }
- **Étapes :**
  1. POST avec note longue
  2. GET le dossier
  3. Inspecter la note de l'entrée
- **Résultat attendu :** 201. La note stockée fait exactement 200 caractères (String(note).slice(0,200)). Pas d'erreur.
- **Traçabilité :** roue_emotions | POST /api/viz/emotions/dossier/:id (note slice 200)
- **Automatisation :** ✅ api/viz.test.ts

### TC-VIZ-039 — POST émotions - note absente => null (facultative)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | basse | Partition d'équivalence (note présente/absente) |

- **Préconditions :** Connecté en propriétaire d'un dossier did.
- **Données :** POST body { emotions:['serein'] } sans note
- **Étapes :**
  1. POST sans note
  2. GET le dossier
- **Résultat attendu :** 201. L'entrée a note=null (req.body.note == null -> null). Aucune chaîne 'undefined' stockée.
- **Traçabilité :** roue_emotions | POST /api/viz/emotions/dossier/:id
- **Automatisation :** ✅ api/viz.test.ts

### TC-VIZ-040 — POST émotions - 401 non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles (anonyme) |

- **Préconditions :** Anonyme.
- **Données :** POST /api/viz/emotions/dossier/1 sans cookie body { emotions:['fier'] }
- **Étapes :**
  1. Ne pas se connecter
  2. Appeler POST
- **Résultat attendu :** 401 { error:'Non authentifié' }. Aucune insertion.
- **Traçabilité :** roue_emotions | POST /api/viz/emotions/dossier/:id (requireAuth)
- **Automatisation :** ✅ api/viz.test.ts

### TC-VIZ-041 — POST émotions - 403 feature non disponible

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Table de décision (feature absente) |

- **Préconditions :** Utilisateur rattaché à un plan sans 'roue_emotions'.
- **Données :** POST /api/viz/emotions/dossier/{did} body { emotions:['fier'] }
- **Étapes :**
  1. Admin: affecter un plan sans roue_emotions
  2. Se connecter
  3. Appeler POST
- **Résultat attendu :** 403 { error:'Fonctionnalité non disponible dans votre offre' }. Aucune insertion (requireFeature avant le handler).
- **Traçabilité :** roue_emotions | POST /api/viz/emotions/dossier/:id (requireFeature)
- **Automatisation :** ✅ api/viz.test.ts

### TC-VIZ-042 — POST émotions - 404 dossier d'autrui

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles (propriété ownEither) |

- **Préconditions :** Connecté en accompagné Karim ; did appartient à un autre utilisateur.
- **Données :** POST /api/viz/emotions/dossier/{did_autrui} body { emotions:['fier'] }
- **Étapes :**
  1. Se connecter en Karim
  2. Appeler POST sur un dossier d'Amine
- **Résultat attendu :** 404 { error:'Parcours introuvable' }. Vérification de propriété avant sanitize/insertion.
- **Traçabilité :** roue_emotions | POST /api/viz/emotions/dossier/:id (ownEither)
- **Automatisation :** ✅ api/viz.test.ts

### TC-VIZ-043 — POST émotions - rôle de l'auteur enregistré dans le relevé

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | basse | Partition d'équivalence (rôle de l'auteur) |

- **Préconditions :** Connecté en accompagnateur Mohamed, propriétaire (accompagnateur_id) du dossier did.
- **Données :** POST /api/viz/emotions/dossier/{did} body { emotions:['serein'] }
- **Étapes :**
  1. Se connecter en accompagnateur
  2. POST un relevé
  3. GET le dossier
- **Résultat attendu :** 201. L'entrée créée porte role='accompagnateur' (me.role). Permet de distinguer l'origine du relevé dans entries.
- **Traçabilité :** roue_emotions | POST /api/viz/emotions/dossier/:id (role)
- **Automatisation :** ✅ api/viz.test.ts

### TC-VIZ-044 — UNITAIRE sanitizeEmotions - contrat de filtrage et déduplication

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | validation | haute | Test unitaire de sanitize + partition (valide/invalide/non-tableau) |

- **Préconditions :** Fonction sanitizeEmotions testable contre le registre EMOTIONS.
- **Données :** Entrées: ['fier','fier','licorne'] ; 'fier' (non tableau) ; null ; [123,'serein'] ; []
- **Étapes :**
  1. Appeler sanitizeEmotions sur chaque entrée
- **Résultat attendu :** ['fier'] (dédup + filtre licorne) ; [] (non tableau) ; [] (null) ; ['serein'] (123 stringifié '123' absent du catalogue, filtré) ; [].
- **Traçabilité :** roue_emotions | fonction sanitizeEmotions
- **Automatisation :** ✅ unit/visualisation.test.ts

### TC-VIZ-045 — UI - Accompagné génère le nuage de thèmes depuis le parcours

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | Test bout-en-bout basé sur les rôles (accompagné) |

- **Préconditions :** Connecté en accompagné Amine sur la page détail de son parcours ; feature nuage_themes active ; parcours doté de contenu.
- **Données :** http://localhost:8080 - composant NuageThemes
- **Étapes :**
  1. Se connecter en Amine
  2. Ouvrir le détail du parcours
  3. Repérer la section '🗂️ Nuage de thèmes'
  4. Cliquer '✨ Générer le nuage'
  5. Attendre la fin (bouton 'Analyse…')
- **Résultat attendu :** Le bouton passe en 'Analyse…' (disabled) puis revient à '↻ Régénérer'. Les thèmes s'affichent dimensionnés par poids (fontSize/opacité). Au rechargement de la page, le nuage persisté est rechargé via GET.
- **Traçabilité :** nuage_themes | composant NuageThemes.tsx / page ParcoursDetail
- **Automatisation :** ⏳ à automatiser

### TC-VIZ-046 — UI - Section nuage masquée si feature inactive

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | acces | moyenne | Test basé sur les rôles (gating UI cohérent avec le back) |

- **Préconditions :** Utilisateur rattaché à un plan sans nuage_themes (useFeature('nuage_themes') = false).
- **Données :** Page détail parcours - NuageThemes
- **Étapes :**
  1. Affecter un plan sans nuage_themes
  2. Se connecter
  3. Ouvrir le détail du parcours
- **Résultat attendu :** La section Nuage de thèmes n'est pas rendue (return null si !actif) ; aucun appel réseau /viz/nuage.
- **Traçabilité :** nuage_themes | composant NuageThemes.tsx (useFeature)
- **Automatisation :** ⏳ à automatiser

### TC-VIZ-047 — UI - Accompagné saisit ses émotions sur la roue

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | Test bout-en-bout basé sur les rôles (accompagné, saisie) |

- **Préconditions :** Connecté en accompagné Amine sur le détail du parcours ; feature roue_emotions active.
- **Données :** Composant RoueEmotions role='accompagne'
- **Étapes :**
  1. Se connecter en Amine
  2. Ouvrir la section '🎡 Roue des émotions'
  3. Cliquer des pastilles (ex. Fier·e, Serein·e) -> aria-pressed=true
  4. Saisir une note facultative
  5. Cliquer 'Enregistrer'
- **Résultat attendu :** Message 'C'est noté ✓'. Sélection et note réinitialisées. La section 'Mon climat émotionnel' affiche l'agrégat mis à jour. Le bouton Enregistrer est désactivé tant qu'aucune émotion n'est sélectionnée.
- **Traçabilité :** roue_emotions | composant RoueEmotions.tsx (role accompagne)
- **Automatisation :** ⏳ à automatiser

### TC-VIZ-048 — UI - Accompagnateur visualise le climat émotionnel en lecture seule

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | Test basé sur les rôles (accompagnateur, lecture seule) |

- **Préconditions :** Connecté en accompagnateur Mohamed sur le dossier d'Amine qui a des relevés ; feature roue_emotions active.
- **Données :** Composant RoueEmotions role='accompagnateur'
- **Étapes :**
  1. Se connecter en accompagnateur
  2. Ouvrir le dossier suivi
  3. Repérer '🎡 Roue des émotions (climat de l'accompagné)'
- **Résultat attendu :** Pas de pastilles de saisie ni de bouton Enregistrer (readOnly). Affiche 'Émotions les plus exprimées' (agrégat) et l'historique des 6 derniers relevés. Si aucun relevé : message 'L'accompagné n'a pas encore utilisé la roue des émotions.'
- **Traçabilité :** roue_emotions | composant RoueEmotions.tsx (role accompagnateur, readOnly)
- **Automatisation :** ⏳ à automatiser

### TC-VIZ-049 — UI - Bouton Enregistrer désactivé sans sélection (garde front cohérente avec 400)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | validation | moyenne | Valeurs limites (0 sélection) - cohérence garde UI/API |

- **Préconditions :** Connecté en accompagné, roue affichée, aucune émotion sélectionnée.
- **Données :** Composant RoueEmotions
- **Étapes :**
  1. Ouvrir la roue
  2. Ne sélectionner aucune émotion
  3. Observer le bouton 'Enregistrer'
- **Résultat attendu :** Le bouton est disabled (disabled={busy || !sel.length}) ; envoyer() retourne tôt si !sel.length. Cohérent avec le 400 serveur 'Sélectionne au moins une émotion'.
- **Traçabilité :** roue_emotions | composant RoueEmotions.tsx (disabled) + POST 400
- **Automatisation :** ⏳ à automatiser

## Domaine CONFORT — 50 cas

**Endpoints couverts :**

- `GET /api/confort/visio/rdv/:id` · feature: `visio` · rôle: accompagne|accompagnateur — Renvoie la salle Jitsi déterministe { salle, url } pour un RDV dont l'utilisateur est l'accompagné ou l'accompagnateur. requireAuth + requireFeature('visio'). 404 si RDV inexistant ou non-participant.
- `GET /api/confort/push/cle` · feature: `pwa_push` · rôle: authentifié — Renvoie la clé publique VAPID { cle } pour s'abonner aux notifications push. requireAuth + requireFeature('pwa_push').
- `POST /api/confort/push/abonnement` · feature: `pwa_push` · rôle: authentifié — Enregistre/met à jour (upsert sur endpoint) l'abonnement push de l'appareil. 400 si endpoint/p256dh/auth manquants, 201 { ok:true }.
- `POST /api/confort/push/test` · feature: `pwa_push` · rôle: authentifié — Envoie une notification de test à tous les appareils abonnés de l'utilisateur (best-effort, purge des abonnements morts). 200 { ok:true }.
- `GET /api/confort/export/dossier/:id` · feature: `export_pdf` · rôle: accompagnateur — Assemble la vue imprimable complète d'un dossier (dossier, questionnaire, CR publiés, synthèse publiée, plan d'action, grille validée). requireAuth + requireRole('accompagnateur') + requireFeature('export_pdf'). 404 si dossier inexistant ou non-propriétaire.

### TC-CONFORT-001 — Visio RDV - nominal accompagnateur : salle + url Jitsi

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Test du contrat |

- **Préconditions :** Connecté en accompagnateur (sans plan = toutes features). Un RDV existe dont je suis l'accompagnateur (via creneaux.accompagnateur_id).
- **Données :** GET /api/confort/visio/rdv/{rdvId} (rdvId d'un RDV m'appartenant)
- **Étapes :**
  1. S'authentifier en accompagnateur
  2. Récupérer un rdvId rattaché à un de mes créneaux
  3. Appeler GET /api/confort/visio/rdv/{rdvId}
- **Résultat attendu :** 200 ; corps JSON { salle, url } ; salle de forme 'Boussole-<id>-<hash10>' ; url = 'https://meet.jit.si/' + salle ; champs string non vides.
- **Traçabilité :** visio | GET /api/confort/visio/rdv/:id
- **Automatisation :** ✅ api/confort.test.ts

### TC-CONFORT-002 — Visio RDV - nominal accompagné : accès à sa propre visio

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Test basé sur les rôles |

- **Préconditions :** Connecté en accompagné (Amine, afrit_mohamed@yahoo.fr, sans plan). Un RDV existe dont rdv.accompagne_id = mon id.
- **Données :** GET /api/confort/visio/rdv/{rdvId}
- **Étapes :**
  1. S'authentifier en accompagné
  2. Récupérer un rdvId où je suis l'accompagné
  3. Appeler GET /api/confort/visio/rdv/{rdvId}
- **Résultat attendu :** 200 ; { salle, url } identiques à ce que verrait l'accompagnateur du même RDV (salle partagée).
- **Traçabilité :** visio | GET /api/confort/visio/rdv/:id
- **Automatisation :** ✅ api/confort.test.ts

### TC-CONFORT-003 — Visio RDV - URL déterministe (stabilité du hash)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | Test du contrat |

- **Préconditions :** Connecté, RDV m'appartenant.
- **Données :** 2 appels successifs GET /api/confort/visio/rdv/{rdvId}
- **Étapes :**
  1. Appeler l'endpoint une première fois et noter salle/url
  2. Rappeler l'endpoint pour le même rdvId
- **Résultat attendu :** 200 aux deux appels ; salle et url strictement identiques entre les deux appels (URL stable par RDV, dérivée de sha256(id:JWT_SECRET)).
- **Traçabilité :** visio | GET /api/confort/visio/rdv/:id
- **Automatisation :** ✅ api/confort.test.ts

### TC-CONFORT-004 — Visio RDV - salles distinctes pour deux RDV différents

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | basse | Partition d'équivalence |

- **Préconditions :** Deux RDV distincts (id A != id B) m'appartenant.
- **Données :** GET sur rdv A puis rdv B
- **Étapes :**
  1. Récupérer la salle du RDV A
  2. Récupérer la salle du RDV B
- **Résultat attendu :** 200 sur les deux ; salle(A) != salle(B) ; chaque salle contient son propre id de RDV (pas de collision).
- **Traçabilité :** visio | GET /api/confort/visio/rdv/:id
- **Automatisation :** ✅ unit/confort.test.ts, api/confort.test.ts

### TC-CONFORT-005 — Visio RDV - 401 non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles |

- **Préconditions :** Aucun cookie de session (anonyme).
- **Données :** GET /api/confort/visio/rdv/1 sans cookie
- **Étapes :**
  1. Sans authentification, appeler GET /api/confort/visio/rdv/1
- **Résultat attendu :** 401 ; { error: 'Non authentifié' } ; aucune donnée de salle renvoyée.
- **Traçabilité :** visio | GET /api/confort/visio/rdv/:id (requireAuth)
- **Automatisation :** ✅ api/confort.test.ts

### TC-CONFORT-006 — Visio RDV - 403 feature 'visio' absente du plan

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles |

- **Préconditions :** Compte affecté par l'admin à un plan SANS 'visio' (ex. plan Découverte ou Essentiel, qui n'incluent pas visio).
- **Données :** GET /api/confort/visio/rdv/{rdvId} (RDV m'appartenant)
- **Étapes :**
  1. Affecter au compte un plan dépourvu de 'visio' (PUT admin du plan)
  2. S'authentifier avec ce compte
  3. Appeler GET /api/confort/visio/rdv/{rdvId}
- **Résultat attendu :** 403 ; { error: 'Fonctionnalité non disponible dans votre offre' } ; le contrôle requireFeature s'applique AVANT toute lecture du RDV.
- **Traçabilité :** visio | requireFeature('visio')
- **Automatisation :** ✅ api/confort.test.ts

### TC-CONFORT-007 — Visio RDV - 404 RDV d'un autre utilisateur (non-participant)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles |

- **Préconditions :** Connecté en accompagnateur Camille (camille.laurent). Il existe un RDV qui n'implique ni Camille comme accompagnateur ni comme accompagné (RDV de Mohamed/Amine).
- **Données :** GET /api/confort/visio/rdv/{rdvIdAutrui}
- **Étapes :**
  1. S'authentifier en Camille
  2. Identifier un rdvId rattaché à un autre accompagnateur et un autre accompagné
  3. Appeler GET /api/confort/visio/rdv/{rdvIdAutrui}
- **Résultat attendu :** 404 ; { error: 'Rendez-vous introuvable' } (le RDV existe mais l'utilisateur n'en est ni accompagné ni accompagnateur).
- **Traçabilité :** visio | GET /api/confort/visio/rdv/:id (contrôle appartenance)
- **Automatisation :** ✅ api/confort.test.ts

### TC-CONFORT-008 — Visio RDV - 404 RDV inexistant

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | Valeurs limites |

- **Préconditions :** Connecté (feature visio disponible).
- **Données :** GET /api/confort/visio/rdv/99999999 (id inexistant)
- **Étapes :**
  1. Appeler GET /api/confort/visio/rdv/99999999
- **Résultat attendu :** 404 ; { error: 'Rendez-vous introuvable' }.
- **Traçabilité :** visio | GET /api/confort/visio/rdv/:id
- **Automatisation :** ✅ api/confort.test.ts

### TC-CONFORT-009 — Visio RDV - id non numérique (NaN) traité comme introuvable

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | basse | Partition d'équivalence (entrée invalide) |

- **Préconditions :** Connecté, feature visio disponible.
- **Données :** GET /api/confort/visio/rdv/abc
- **Étapes :**
  1. Appeler GET /api/confort/visio/rdv/abc
- **Résultat attendu :** 404 ; { error: 'Rendez-vous introuvable' } (Number('abc')=NaN, aucune ligne trouvée). Pas d'erreur 500.
- **Traçabilité :** visio | GET /api/confort/visio/rdv/:id
- **Automatisation :** ✅ api/confort.test.ts

### TC-CONFORT-010 — Visio RDV - unitaire calcul déterministe salle/hash

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | moyenne | Test du contrat (fonction pure) |

- **Préconditions :** Connaître JWT_SECRET effectif de l'environnement de test.
- **Données :** rdv.id connu (ex. 1) ; calcul attendu sha256('1:'+JWT_SECRET).hex.slice(0,10)
- **Étapes :**
  1. Calculer indépendamment hash = sha256(`${id}:${JWT_SECRET}`).slice(0,10)
  2. Comparer salle attendue 'Boussole-1-<hash>' à la valeur renvoyée par l'API
- **Résultat attendu :** La salle renvoyée par l'API égale exactement 'Boussole-<id>-<hash>' calculé hors application (hash de 10 caractères hex). Confirme le déterminisme du repli sans appel externe.
- **Traçabilité :** visio | génération salle (crypto.createHash)
- **Automatisation :** ✅ unit/confort.test.ts

### TC-CONFORT-011 — Push clé - nominal : renvoie la clé publique VAPID

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Test du contrat |

- **Préconditions :** Connecté (feature pwa_push disponible).
- **Données :** GET /api/confort/push/cle
- **Étapes :**
  1. S'authentifier
  2. Appeler GET /api/confort/push/cle
- **Résultat attendu :** 200 ; { cle: <string> } ; cle non vide (chaîne base64url VAPID). Si VAPID_PUBLIC_KEY défini en env, c'est cette valeur ; sinon clé éphémère générée au démarrage.
- **Traçabilité :** pwa_push | GET /api/confort/push/cle
- **Automatisation :** ✅ api/confort.test.ts

### TC-CONFORT-012 — Push clé - 401 non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles |

- **Préconditions :** Anonyme.
- **Données :** GET /api/confort/push/cle sans cookie
- **Étapes :**
  1. Appeler GET /api/confort/push/cle sans session
- **Résultat attendu :** 401 ; { error: 'Non authentifié' }.
- **Traçabilité :** pwa_push | requireAuth
- **Automatisation :** ✅ api/confort.test.ts

### TC-CONFORT-013 — Push clé - 403 feature 'pwa_push' absente du plan

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Table de décision (rôle x feature) |

- **Préconditions :** Compte affecté à un plan sans 'pwa_push' (Découverte/Essentiel).
- **Données :** GET /api/confort/push/cle
- **Étapes :**
  1. Affecter un plan sans pwa_push
  2. S'authentifier
  3. Appeler GET /api/confort/push/cle
- **Résultat attendu :** 403 ; { error: 'Fonctionnalité non disponible dans votre offre' }.
- **Traçabilité :** pwa_push | requireFeature('pwa_push')
- **Automatisation :** ✅ api/confort.test.ts

### TC-CONFORT-014 — Push abonnement - nominal : création (201)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Test du contrat |

- **Préconditions :** Connecté (pwa_push disponible). Aucun abonnement existant pour cet endpoint.
- **Données :** POST /api/confort/push/abonnement body { subscription: { endpoint:'https://push.example/ep1', keys:{ p256dh:'BPp...', auth:'a1b2' } } }
- **Étapes :**
  1. Construire un objet subscription valide
  2. POST /api/confort/push/abonnement avec ce corps
- **Résultat attendu :** 201 ; { ok: true } ; une ligne push_subscriptions créée (user_id = moi, endpoint, p256dh, auth).
- **Traçabilité :** pwa_push | POST /api/confort/push/abonnement
- **Automatisation :** ✅ api/confort.test.ts

### TC-CONFORT-015 — Push abonnement - accepte le format plat (sans clé 'subscription')

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | Partition d'équivalence (deux formats équivalents) |

- **Préconditions :** Connecté, pwa_push disponible.
- **Données :** POST body directement { endpoint:'https://push.example/ep2', keys:{ p256dh:'BPp...', auth:'xy' } } (sans enveloppe 'subscription')
- **Étapes :**
  1. POST /api/confort/push/abonnement avec le corps plat
- **Résultat attendu :** 201 ; { ok: true } (le code lit req.body.subscription || req.body).
- **Traçabilité :** pwa_push | POST /api/confort/push/abonnement
- **Automatisation :** ✅ api/confort.test.ts

### TC-CONFORT-016 — Push abonnement - upsert idempotent sur endpoint existant

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | non-regression | haute | Test du contrat (ON CONFLICT) |

- **Préconditions :** Un abonnement existe déjà pour endpoint 'https://push.example/ep1'.
- **Données :** POST même endpoint avec p256dh/auth modifiés
- **Étapes :**
  1. Créer l'abonnement (TC-014)
  2. Re-POSTer le même endpoint avec de nouvelles clés
  3. Vérifier le nombre de lignes pour cet endpoint
- **Résultat attendu :** 201 ; { ok: true } ; une seule ligne pour cet endpoint (ON CONFLICT(endpoint) DO UPDATE) ; user_id/p256dh/auth mis à jour. Aucun doublon créé.
- **Traçabilité :** pwa_push | POST /api/confort/push/abonnement (upsert)
- **Automatisation :** ✅ api/confort.test.ts

### TC-CONFORT-017 — Push abonnement - réattribution de l'endpoint à l'utilisateur courant

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | Test du contrat |

- **Préconditions :** Endpoint déjà abonné par l'utilisateur A. Se connecter ensuite en utilisateur B et réutiliser le même endpoint (même navigateur partagé).
- **Données :** POST /api/confort/push/abonnement (même endpoint) en tant que B
- **Étapes :**
  1. A s'abonne avec endpoint E
  2. B se connecte et POST le même endpoint E
- **Résultat attendu :** 201 ; ON CONFLICT met user_id = B (excluded.user_id) ; l'abonnement n'est plus rattaché à A. Pas de doublon.
- **Traçabilité :** pwa_push | POST /api/confort/push/abonnement
- **Automatisation :** ✅ api/confort.test.ts

### TC-CONFORT-018 — Push abonnement - 400 endpoint manquant

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | haute | Partition d'équivalence (champ requis absent) |

- **Préconditions :** Connecté, pwa_push disponible.
- **Données :** POST body { subscription:{ keys:{ p256dh:'x', auth:'y' } } } (pas d'endpoint)
- **Étapes :**
  1. POST sans endpoint
- **Résultat attendu :** 400 ; { error: 'Abonnement invalide' } ; aucune ligne insérée.
- **Traçabilité :** pwa_push | POST /api/confort/push/abonnement (validation)
- **Automatisation :** ✅ api/confort.test.ts

### TC-CONFORT-019 — Push abonnement - 400 p256dh manquant

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | haute | Partition d'équivalence |

- **Préconditions :** Connecté, pwa_push disponible.
- **Données :** POST body { endpoint:'https://push.example/ep', keys:{ auth:'y' } }
- **Étapes :**
  1. POST sans keys.p256dh
- **Résultat attendu :** 400 ; { error: 'Abonnement invalide' }.
- **Traçabilité :** pwa_push | POST /api/confort/push/abonnement (validation)
- **Automatisation :** ✅ api/confort.test.ts

### TC-CONFORT-020 — Push abonnement - 400 auth manquant

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | haute | Partition d'équivalence |

- **Préconditions :** Connecté, pwa_push disponible.
- **Données :** POST body { endpoint:'https://push.example/ep', keys:{ p256dh:'x' } }
- **Étapes :**
  1. POST sans keys.auth
- **Résultat attendu :** 400 ; { error: 'Abonnement invalide' }.
- **Traçabilité :** pwa_push | POST /api/confort/push/abonnement (validation)
- **Automatisation :** ✅ api/confort.test.ts

### TC-CONFORT-021 — Push abonnement - 400 corps vide / sans keys

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | Valeurs limites (corps minimal) |

- **Préconditions :** Connecté, pwa_push disponible.
- **Données :** POST body {} (objet vide)
- **Étapes :**
  1. POST avec un corps {} ou sans champ keys
- **Résultat attendu :** 400 ; { error: 'Abonnement invalide' } (sub.keys?.p256dh est undefined). Pas de 500.
- **Traçabilité :** pwa_push | POST /api/confort/push/abonnement (validation)
- **Automatisation :** ✅ api/confort.test.ts

### TC-CONFORT-022 — Push abonnement - 401 non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles |

- **Préconditions :** Anonyme.
- **Données :** POST /api/confort/push/abonnement (corps valide) sans cookie
- **Étapes :**
  1. POST sans session
- **Résultat attendu :** 401 ; { error: 'Non authentifié' } ; aucune écriture en base.
- **Traçabilité :** pwa_push | requireAuth
- **Automatisation :** ✅ api/confort.test.ts

### TC-CONFORT-023 — Push abonnement - 403 feature 'pwa_push' absente

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles |

- **Préconditions :** Compte sur un plan sans pwa_push.
- **Données :** POST /api/confort/push/abonnement (corps valide)
- **Étapes :**
  1. S'authentifier sur le compte restreint
  2. POST l'abonnement
- **Résultat attendu :** 403 ; { error: 'Fonctionnalité non disponible dans votre offre' } ; aucune insertion.
- **Traçabilité :** pwa_push | requireFeature('pwa_push')
- **Automatisation :** ✅ api/confort.test.ts

### TC-CONFORT-024 — Push test - nominal sans abonnement (best-effort)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Test du contrat |

- **Préconditions :** Connecté (pwa_push disponible), aucun abonnement push enregistré pour l'utilisateur.
- **Données :** POST /api/confort/push/test
- **Étapes :**
  1. S'assurer qu'aucun push_subscriptions n'existe pour l'utilisateur
  2. POST /api/confort/push/test
- **Résultat attendu :** 200 ; { ok: true } même sans abonnement (boucle vide, best-effort, aucune erreur).
- **Traçabilité :** pwa_push | POST /api/confort/push/test
- **Automatisation :** ✅ api/confort.test.ts

### TC-CONFORT-025 — Push test - nominal avec abonnement enregistré

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | Test du contrat |

- **Préconditions :** Connecté, pwa_push disponible, au moins un abonnement (endpoint factice) enregistré.
- **Données :** POST /api/confort/push/test
- **Étapes :**
  1. Créer un abonnement (TC-014)
  2. POST /api/confort/push/test
- **Résultat attendu :** 200 ; { ok: true }. L'envoi est best-effort : un endpoint factice peut échouer côté webpush sans faire échouer la réponse HTTP (les erreurs sont avalées).
- **Traçabilité :** pwa_push | POST /api/confort/push/test
- **Automatisation :** ✅ api/confort.test.ts

### TC-CONFORT-026 — Push test - 401 non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles |

- **Préconditions :** Anonyme.
- **Données :** POST /api/confort/push/test sans cookie
- **Étapes :**
  1. POST sans session
- **Résultat attendu :** 401 ; { error: 'Non authentifié' }.
- **Traçabilité :** pwa_push | requireAuth
- **Automatisation :** ✅ api/confort.test.ts

### TC-CONFORT-027 — Push test - 403 feature 'pwa_push' absente

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles |

- **Préconditions :** Compte sur un plan sans pwa_push.
- **Données :** POST /api/confort/push/test
- **Étapes :**
  1. S'authentifier sur le compte restreint
  2. POST le test
- **Résultat attendu :** 403 ; { error: 'Fonctionnalité non disponible dans votre offre' } ; aucun envoi.
- **Traçabilité :** pwa_push | requireFeature('pwa_push')
- **Automatisation :** ✅ api/confort.test.ts

### TC-CONFORT-028 — pushToUser - unitaire : purge des abonnements morts (404/410)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | moyenne | Table de décision (codes de statut webpush) |

- **Préconditions :** Stub de webpush.sendNotification qui lève une erreur avec statusCode 410 (Gone) pour un abonnement, et 500 pour un autre.
- **Données :** Deux abonnements en base pour le même user : sub A (renvoie 410), sub B (renvoie 500)
- **Étapes :**
  1. Insérer deux abonnements
  2. Appeler pushToUser(userId, payload) avec le stub
  3. Inspecter push_subscriptions après exécution
- **Résultat attendu :** sub A (404/410) est SUPPRIMÉ de push_subscriptions ; sub B (500) est CONSERVÉ ; la fonction ne lève pas (best-effort).
- **Traçabilité :** pwa_push | pushToUser (purge 404/410)
- **Automatisation :** ✅ unit/confort.test.ts

### TC-CONFORT-029 — pushToUser - unitaire : payload titre/body/url transmis

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | basse | Test du contrat |

- **Préconditions :** Stub de webpush.sendNotification capturant ses arguments. Un abonnement valide en base.
- **Données :** pushToUser(id, { title:'Boussole', body:'...', url:'/espace' })
- **Étapes :**
  1. Appeler pushToUser avec un payload
  2. Inspecter l'argument JSON passé à sendNotification
- **Résultat attendu :** sendNotification appelé une fois par abonnement, avec subscription { endpoint, keys:{p256dh,auth} } et un payload JSON contenant exactement title, body, url.
- **Traçabilité :** pwa_push | pushToUser
- **Automatisation :** ✅ unit/confort.test.ts

### TC-CONFORT-030 — Export dossier - nominal accompagnateur propriétaire

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Test du contrat |

- **Préconditions :** Connecté en accompagnateur (Mohamed). Un dossier m'appartient (accompagnateur_id = moi) avec questionnaire, CR publiés, synthèse publiée, actions, grille validée.
- **Données :** GET /api/confort/export/dossier/{dossierId}
- **Étapes :**
  1. S'authentifier en accompagnateur propriétaire
  2. Appeler GET /api/confort/export/dossier/{dossierId}
- **Résultat attendu :** 200 ; JSON avec clés dossier{titre,statut,contexte,cree_le,accompagne}, questionnaire, comptes_rendus[] (date,html), synthese, actions[] (libelle,statut,echeance,critere), grille|null. Tous champs typés conformément au contrat.
- **Traçabilité :** export_pdf | GET /api/confort/export/dossier/:id
- **Automatisation :** ✅ api/confort.test.ts

### TC-CONFORT-031 — Export dossier - n'inclut que les CR publiés

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Partition d'équivalence (publie=1 vs publie=0) |

- **Préconditions :** Dossier m'appartenant comportant des comptes_rendus publie=1 ET au moins un publie=0.
- **Données :** GET /api/confort/export/dossier/{dossierId}
- **Étapes :**
  1. Vérifier en base les CR publiés/non publiés du dossier
  2. Appeler l'export
- **Résultat attendu :** 200 ; comptes_rendus ne contient QUE les CR avec publie=1, triés par s.date croissante ; les CR non publiés sont exclus.
- **Traçabilité :** export_pdf | GET /api/confort/export/dossier/:id
- **Automatisation :** ✅ api/confort.test.ts

### TC-CONFORT-032 — Export dossier - synthèse : seule la dernière version publiée

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | Valeurs limites (ORDER BY version DESC LIMIT 1) |

- **Préconditions :** Dossier avec plusieurs syntheses publie=1 de versions différentes (+ éventuellement une non publiée plus récente).
- **Données :** GET /api/confort/export/dossier/{dossierId}
- **Étapes :**
  1. Constituer plusieurs versions de synthèse
  2. Appeler l'export
- **Résultat attendu :** 200 ; synthese = contenu_html de la version publiée la plus élevée (version DESC, publie=1) ; ignore les versions non publiées.
- **Traçabilité :** export_pdf | GET /api/confort/export/dossier/:id
- **Automatisation :** ✅ api/confort.test.ts

### TC-CONFORT-033 — Export dossier - grille : seule l'auto-évaluation validée la plus récente

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | Table de décision (statut='validee') |

- **Préconditions :** Dossier avec une auto_evaluation statut='validee' (note_globale, commentaire_global) et éventuellement des brouillons non validés.
- **Données :** GET /api/confort/export/dossier/{dossierId}
- **Étapes :**
  1. Préparer une grille validée + un brouillon
  2. Appeler l'export
- **Résultat attendu :** 200 ; grille = { note, commentaire } de la dernière validée (id DESC) ; si aucune validée, grille = null.
- **Traçabilité :** export_pdf | GET /api/confort/export/dossier/:id
- **Automatisation :** ✅ api/confort.test.ts

### TC-CONFORT-034 — Export dossier - dossier vide : sections null/listes vides

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | basse | Valeurs limites (ensembles vides) |

- **Préconditions :** Dossier m'appartenant sans questionnaire, sans CR publié, sans synthèse publiée, sans action, sans grille validée.
- **Données :** GET /api/confort/export/dossier/{dossierId}
- **Étapes :**
  1. Créer un dossier minimal m'appartenant
  2. Appeler l'export
- **Résultat attendu :** 200 ; questionnaire=null ; comptes_rendus=[] ; synthese=null ; actions=[] ; grille=null ; bloc dossier renseigné (accompagne = prénom+nom ou, à défaut, email).
- **Traçabilité :** export_pdf | GET /api/confort/export/dossier/:id
- **Automatisation :** ✅ api/confort.test.ts

### TC-CONFORT-035 — Export dossier - libellé 'accompagne' : fallback sur email

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | basse | Test du contrat (calcul du champ) |

- **Préconditions :** Dossier dont l'accompagné a prénom ET nom NULL (uniquement un email).
- **Données :** GET /api/confort/export/dossier/{dossierId}
- **Étapes :**
  1. Préparer un accompagné sans prénom ni nom
  2. Appeler l'export
- **Résultat attendu :** 200 ; dossier.accompagne = email de l'accompagné (car [prenom,nom].filter(Boolean).join(' ') est vide).
- **Traçabilité :** export_pdf | construction champ accompagne
- **Automatisation :** ✅ unit/confort.test.ts

### TC-CONFORT-036 — Export dossier - 401 non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles |

- **Préconditions :** Anonyme.
- **Données :** GET /api/confort/export/dossier/1 sans cookie
- **Étapes :**
  1. Appeler l'export sans session
- **Résultat attendu :** 401 ; { error: 'Non authentifié' }.
- **Traçabilité :** export_pdf | requireAuth
- **Automatisation :** ✅ api/confort.test.ts

### TC-CONFORT-037 — Export dossier - 403 rôle accompagné (mauvais rôle)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles |

- **Préconditions :** Connecté en accompagné (Amine, sans plan, donc export_pdf disponible côté feature).
- **Données :** GET /api/confort/export/dossier/{dossierId}
- **Étapes :**
  1. S'authentifier en accompagné
  2. Appeler GET /api/confort/export/dossier/{dossierId}
- **Résultat attendu :** 403 ; { error: 'Accès refusé' } (requireRole('accompagnateur') bloque avant requireFeature et avant toute requête dossier).
- **Traçabilité :** export_pdf | requireRole('accompagnateur')
- **Automatisation :** ✅ api/confort.test.ts

### TC-CONFORT-038 — Export dossier - 403 rôle admin (non-accompagnateur)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | Test basé sur les rôles |

- **Préconditions :** Connecté en admin (mohamed@elafrit.com).
- **Données :** GET /api/confort/export/dossier/{dossierId}
- **Étapes :**
  1. S'authentifier en admin
  2. Appeler l'export
- **Résultat attendu :** 403 ; { error: 'Accès refusé' } (seul le rôle accompagnateur est autorisé).
- **Traçabilité :** export_pdf | requireRole('accompagnateur')
- **Automatisation :** ✅ api/confort.test.ts

### TC-CONFORT-039 — Export dossier - 403 feature 'export_pdf' absente du plan

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Table de décision (rôle OK x feature KO) |

- **Préconditions :** Accompagnateur affecté à un plan SANS export_pdf (Découverte/Essentiel).
- **Données :** GET /api/confort/export/dossier/{dossierId} (dossier m'appartenant)
- **Étapes :**
  1. Affecter à l'accompagnateur un plan sans export_pdf
  2. S'authentifier
  3. Appeler l'export
- **Résultat attendu :** 403 ; { error: 'Fonctionnalité non disponible dans votre offre' } (rôle OK mais requireFeature('export_pdf') bloque).
- **Traçabilité :** export_pdf | requireFeature('export_pdf')
- **Automatisation :** ✅ api/confort.test.ts

### TC-CONFORT-040 — Export dossier - 404 dossier d'un autre accompagnateur

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles (propriété ressource) |

- **Préconditions :** Connecté en accompagnateur Camille. Un dossier appartient à un AUTRE accompagnateur (Mohamed).
- **Données :** GET /api/confort/export/dossier/{dossierIdAutrui}
- **Étapes :**
  1. S'authentifier en Camille
  2. Identifier un dossier dont accompagnateur_id != Camille
  3. Appeler l'export
- **Résultat attendu :** 404 ; { error: 'Dossier introuvable' } (requête filtrée par accompagnateur_id = moi).
- **Traçabilité :** export_pdf | GET /api/confort/export/dossier/:id (propriété)
- **Automatisation :** ✅ api/confort.test.ts

### TC-CONFORT-041 — Export dossier - 404 dossier inexistant

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | Valeurs limites |

- **Préconditions :** Connecté en accompagnateur (export_pdf disponible).
- **Données :** GET /api/confort/export/dossier/99999999
- **Étapes :**
  1. Appeler l'export avec un id inexistant
- **Résultat attendu :** 404 ; { error: 'Dossier introuvable' }.
- **Traçabilité :** export_pdf | GET /api/confort/export/dossier/:id
- **Automatisation :** ✅ api/confort.test.ts

### TC-CONFORT-042 — Export dossier - id non numérique traité comme introuvable

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | basse | Partition d'équivalence (entrée invalide) |

- **Préconditions :** Connecté en accompagnateur, export_pdf disponible.
- **Données :** GET /api/confort/export/dossier/abc
- **Étapes :**
  1. Appeler l'export avec id 'abc'
- **Résultat attendu :** 404 ; { error: 'Dossier introuvable' } (Number('abc')=NaN). Pas de 500.
- **Traçabilité :** export_pdf | GET /api/confort/export/dossier/:id
- **Automatisation :** ✅ api/confort.test.ts

### TC-CONFORT-043 — UI Visio - le bouton 'Visio' ouvre la salle Jitsi depuis le dossier

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | Test du contrat (bout-en-bout) |

- **Préconditions :** Connecté en accompagnateur (feature visio active). Sur la page Dossier, un RDV à venir est listé.
- **Données :** Page Dossier > carte RDV > bouton '🎥 Visio'
- **Étapes :**
  1. Ouvrir http://localhost:8080 et se connecter en accompagnateur
  2. Ouvrir un dossier comportant un RDV
  3. Cliquer sur le bouton '🎥 Visio'
- **Résultat attendu :** Un nouvel onglet s'ouvre sur https://meet.jit.si/Boussole-<id>-<hash> (window.open noopener). Le bouton est désactivé pendant l'appel (busy).
- **Traçabilité :** visio | composant VisioButton (pages/Dossier.tsx, ParcoursDetail.tsx)
- **Automatisation :** ⏳ à automatiser

### TC-CONFORT-044 — UI Visio - bouton masqué si feature 'visio' indisponible

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | acces | moyenne | Test basé sur les rôles (gating UI) |

- **Préconditions :** Connecté avec un compte dont le plan n'inclut pas 'visio'.
- **Données :** Page Dossier / ParcoursDetail avec RDV
- **Étapes :**
  1. Se connecter avec le compte restreint
  2. Ouvrir un dossier/parcours avec RDV
- **Résultat attendu :** Le bouton VisioButton n'est pas rendu (return null si !useFeature('visio')).
- **Traçabilité :** visio | VisioButton (useFeature)
- **Automatisation :** ⏳ à automatiser

### TC-CONFORT-045 — UI Push - activer puis tester les notifications depuis le profil

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | Test du contrat (bout-en-bout) |

- **Préconditions :** Connecté (feature pwa_push active), navigateur supportant ServiceWorker + PushManager, permission accordée.
- **Données :** Page Profil > carte '🔔 Notifications push'
- **Étapes :**
  1. Aller sur Profil
  2. Cliquer 'Activer les notifications' et accorder la permission
  3. Cliquer 'Envoyer un test'
- **Résultat attendu :** Après activation : message 'Notifications activées sur cet appareil ✓', boutons 'Envoyer un test' et 'Désactiver' affichés. Le test appelle POST /confort/push/test et affiche 'Notification de test envoyée'. L'abonnement est persité (POST /confort/push/abonnement renvoyé 201).
- **Traçabilité :** pwa_push | composant PushToggle (pages/Profil.tsx)
- **Automatisation :** ⏳ à automatiser

### TC-CONFORT-046 — UI Push - carte masquée si feature 'pwa_push' indisponible

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | acces | moyenne | Test basé sur les rôles (gating UI) |

- **Préconditions :** Compte sans pwa_push dans son plan.
- **Données :** Page Profil
- **Étapes :**
  1. Se connecter avec le compte restreint
  2. Ouvrir Profil
- **Résultat attendu :** La carte 'Notifications push' n'est pas rendue (PushToggle return null si !useFeature('pwa_push')).
- **Traçabilité :** pwa_push | PushToggle (useFeature)
- **Automatisation :** ⏳ à automatiser

### TC-CONFORT-047 — UI Push - message si navigateur non supporté

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | basse | Partition d'équivalence (environnement) |

- **Préconditions :** Navigateur sans 'serviceWorker' ou sans 'PushManager' (ou contexte non sécurisé).
- **Données :** Page Profil > carte Notifications push
- **Étapes :**
  1. Ouvrir Profil dans un environnement sans support push
- **Résultat attendu :** État 'non_supporte' : message 'Ton navigateur ne prend pas en charge les notifications push.' et aucun bouton d'activation.
- **Traçabilité :** pwa_push | PushToggle (etat non_supporte)
- **Automatisation :** ⏳ à automatiser

### TC-CONFORT-048 — UI Export - ouvrir l'export PDF complet et imprimer

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | Test du contrat (bout-en-bout) |

- **Préconditions :** Connecté en accompagnateur (feature export_pdf active) sur un dossier m'appartenant et garni (synthèse, CR publiés, actions, grille).
- **Données :** Page Dossier > bouton '📄 Export PDF complet'
- **Étapes :**
  1. Ouvrir le dossier
  2. Cliquer '📄 Export PDF complet'
  3. Vérifier le contenu de la modale assemblée
  4. Cliquer '🖨️ Imprimer / enregistrer en PDF'
- **Résultat attendu :** La modale s'ouvre et charge GET /confort/export/dossier/{id} ; affiche en-tête (titre, accompagné, statut, date), questionnaire, synthèse, CR publiés (compte affiché), plan d'action et bilan (note/20) lorsque présents. Le bouton Imprimer est actif une fois les données chargées et déclenche window.print().
- **Traçabilité :** export_pdf | composant ExportDossierModal (pages/Dossier.tsx)
- **Automatisation :** ⏳ à automatiser

### TC-CONFORT-049 — UI Export - bouton masqué si feature 'export_pdf' indisponible

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | acces | moyenne | Test basé sur les rôles (gating UI) |

- **Préconditions :** Accompagnateur sur un plan sans export_pdf.
- **Données :** Page Dossier
- **Étapes :**
  1. Se connecter avec l'accompagnateur restreint
  2. Ouvrir un dossier
- **Résultat attendu :** Le bouton '📄 Export PDF complet' n'est pas affiché (exportActif = useFeature('export_pdf') faux).
- **Traçabilité :** export_pdf | Dossier.tsx (useFeature('export_pdf'))
- **Automatisation :** ⏳ à automatiser

### TC-CONFORT-050 — UI Export - message d'erreur si chargement impossible

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | non-regression | basse | Partition d'équivalence (réponse en erreur) |

- **Préconditions :** Modale d'export ouverte alors que l'API renvoie une erreur (ex. dossier non-propriétaire -> 404, ou réseau).
- **Données :** ExportDossierModal avec un dossierId provoquant une erreur
- **Étapes :**
  1. Forcer une réponse en erreur sur GET /confort/export/dossier/{id}
  2. Ouvrir la modale
- **Résultat attendu :** Affichage du message 'Chargement impossible.' (form-error) ; le bouton Imprimer reste désactivé (data null).
- **Traçabilité :** export_pdf | ExportDossierModal (gestion erreur)
- **Automatisation :** ⏳ à automatiser

## Domaine ETHIQUE — 50 cas

**Endpoints couverts :**

- `GET /api/ethique/attestation/dossier/:id` · feature: `attestation` · rôle: accompagne|accompagnateur — Attestation de fin pour un parcours cloturé (accompagné ou accompagnateur du dossier). requireAuth + requireFeature('attestation'). 404 si introuvable/non-propriétaire, 400 si non cloturé.
- `GET /api/admin/effacements` · feature: `(non gatée par plan)` · rôle: admin — Liste des demandes d'effacement en_attente avec accompagné et parcours. requireRole('admin').
- `POST /api/admin/effacements/:id` · feature: `(non gatée par plan)` · rôle: admin — Traite une demande d'effacement : anonymiser OU supprimer. 400 action invalide, 404 demande introuvable.
- `POST /api/admin/rgpd/:userId` · feature: `(non gatée par plan)` · rôle: admin — Action RGPD directe sur un compte (hors demande) : anonymiser/supprimer. 400 sur propre compte, 404 user introuvable, 400 action invalide.
- `GET /api/admin/retention` · feature: `(non gatée par plan)` · rôle: admin — Politique de rétention : months, auto, liste des comptes éligibles. requireRole('admin').
- `POST /api/admin/retention/appliquer` · feature: `(non gatée par plan)` · rôle: admin — Applique la rétention : anonymise les comptes éligibles, retourne {ok, anonymises}. requireRole('admin').

### TC-ETHIQUE-001 — Attestation d'un parcours cloturé (accompagné propriétaire) renvoie 200 et la forme attendue

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Test du contrat ; partition d'équivalence (parcours cloturé valide) |

- **Préconditions :** Compte accompagné Karim (karim.benali@boussole.demo) propriétaire du parcours D5 (VAE) clôturé. Aucun plan (accès à tout, dont 'attestation').
- **Données :** GET /api/ethique/attestation/dossier/{id_D5} avec cookie de Karim
- **Étapes :**
  1. Se connecter comme karim.benali@boussole.demo / BoussoleDemo2026
  2. GET /api/ethique/attestation/dossier/{id_D5}
- **Résultat attendu :** 200 ; JSON contient titre, accompagne (string non vide), accompagnateur (string non vide), debut (date), fin (date|null), nb_entretiens (number>=0), nb_comptes_rendus (number>=0)
- **Traçabilité :** feature 'attestation' — GET /api/ethique/attestation/dossier/:id
- **Automatisation :** ✅ api/ethique.test.ts

### TC-ETHIQUE-002 — Attestation accessible aussi à l'accompagnateur du dossier cloturé

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Test basé sur les rôles ; test du contrat |

- **Préconditions :** Camille (camille.laurent@boussole.demo) accompagnatrice du parcours D5 clôturé de Karim.
- **Données :** GET /api/ethique/attestation/dossier/{id_D5} avec cookie de Camille
- **Étapes :**
  1. Se connecter comme camille.laurent@boussole.demo
  2. GET /api/ethique/attestation/dossier/{id_D5}
- **Résultat attendu :** 200 ; mêmes champs que TC-ETHIQUE-001 ; accompagnateur correspond à Camille
- **Traçabilité :** feature 'attestation' — GET /api/ethique/attestation/dossier/:id
- **Automatisation :** ✅ api/ethique.test.ts

### TC-ETHIQUE-003 — Champs agrégés de l'attestation cohérents (nb_entretiens, nb_comptes_rendus publiés, fin = max synthèse publiée)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | Test du contrat (vérification d'agrégats) |

- **Préconditions :** Parcours D5 clôturé avec sessions, CR publiés et synthèse publiée connus en base.
- **Données :** GET /api/ethique/attestation/dossier/{id_D5}
- **Étapes :**
  1. Compter en base les sessions du dossier, les CR publiés (cr.publie=1), la synthèse publiée la plus récente
  2. GET /api/ethique/attestation/dossier/{id_D5}
  3. Comparer nb_entretiens, nb_comptes_rendus et fin
- **Résultat attendu :** nb_entretiens = COUNT(sessions du dossier) ; nb_comptes_rendus = COUNT(CR publiés) ; fin = MAX(syntheses.publie_le où publie=1) ou null si aucune
- **Traçabilité :** feature 'attestation' — GET /api/ethique/attestation/dossier/:id
- **Automatisation :** ✅ api/ethique.test.ts

### TC-ETHIQUE-004 — Attestation : 400 si le parcours n'est pas clôturé

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | haute | Partition d'équivalence (statut invalide) ; table de décision (propriétaire=oui, cloturé=non → 400) |

- **Préconditions :** Léa (lea.martin@boussole.demo) propriétaire du parcours D4 (exploratoire) NON clôturé (statut != 'cloture'). Accès feature 'attestation' (aucun plan).
- **Données :** GET /api/ethique/attestation/dossier/{id_D4}
- **Étapes :**
  1. Se connecter comme lea.martin@boussole.demo
  2. GET /api/ethique/attestation/dossier/{id_D4}
- **Résultat attendu :** 400 ; error = « L'attestation n'est disponible qu'une fois le parcours clôturé. »
- **Traçabilité :** feature 'attestation' — GET /api/ethique/attestation/dossier/:id
- **Automatisation :** ✅ api/ethique.test.ts

### TC-ETHIQUE-005 — Attestation : 404 si le dossier n'appartient pas à l'utilisateur

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles / contrôle de propriété ; table de décision (propriétaire=non → 404 avant test du statut) |

- **Préconditions :** Léa (accompagnée) tente d'accéder à l'attestation du parcours D5 (clôturé) de Karim, dont elle n'est ni accompagnée ni accompagnatrice.
- **Données :** GET /api/ethique/attestation/dossier/{id_D5} avec cookie de Léa
- **Étapes :**
  1. Se connecter comme lea.martin@boussole.demo
  2. GET /api/ethique/attestation/dossier/{id_D5} (dossier de Karim)
- **Résultat attendu :** 404 ; error = « Parcours introuvable » (la requête filtre accompagne_id=me OR accompagnateur_id=me)
- **Traçabilité :** feature 'attestation' — GET /api/ethique/attestation/dossier/:id
- **Automatisation :** ✅ api/ethique.test.ts

### TC-ETHIQUE-006 — Attestation : 404 si l'identifiant de dossier est inexistant

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | Valeurs limites (id hors plage existante) ; partition d'équivalence |

- **Préconditions :** Accompagné authentifié avec accès feature 'attestation'.
- **Données :** GET /api/ethique/attestation/dossier/99999999
- **Étapes :**
  1. Se connecter comme accompagné
  2. GET /api/ethique/attestation/dossier/99999999
- **Résultat attendu :** 404 ; error = « Parcours introuvable »
- **Traçabilité :** feature 'attestation' — GET /api/ethique/attestation/dossier/:id
- **Automatisation :** ✅ api/ethique.test.ts

### TC-ETHIQUE-007 — Attestation : id non numérique → Number(id)=NaN → 404

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | basse | Partition d'équivalence (entrée invalide) ; valeurs limites |

- **Préconditions :** Accompagné authentifié avec accès feature 'attestation'.
- **Données :** GET /api/ethique/attestation/dossier/abc
- **Étapes :**
  1. GET /api/ethique/attestation/dossier/abc
- **Résultat attendu :** 404 ; error = « Parcours introuvable » (le paramètre devient NaN, aucune ligne trouvée)
- **Traçabilité :** feature 'attestation' — GET /api/ethique/attestation/dossier/:id
- **Automatisation :** ✅ api/ethique.test.ts

### TC-ETHIQUE-008 — Attestation : 401 si non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles (anonyme) ; test du contrat (requireAuth) |

- **Préconditions :** Aucun cookie de session.
- **Données :** GET /api/ethique/attestation/dossier/1 sans cookie
- **Étapes :**
  1. GET /api/ethique/attestation/dossier/1 sans cookie boussole_token
- **Résultat attendu :** 401 ; error = « Non authentifié »
- **Traçabilité :** requireAuth — GET /api/ethique/attestation/dossier/:id
- **Automatisation :** ✅ api/ethique.test.ts

### TC-ETHIQUE-009 — Attestation : 401 si cookie/jeton invalide

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | Test du contrat (requireAuth, branche catch jwt.verify) |

- **Préconditions :** Cookie boussole_token présent mais corrompu/expiré.
- **Données :** GET /api/ethique/attestation/dossier/1 avec jeton invalide
- **Étapes :**
  1. Envoyer un cookie boussole_token=xxx invalide
  2. GET /api/ethique/attestation/dossier/1
- **Résultat attendu :** 401 ; error = « Session invalide »
- **Traçabilité :** requireAuth — GET /api/ethique/attestation/dossier/:id
- **Automatisation :** ✅ api/ethique.test.ts

### TC-ETHIQUE-010 — Attestation : 403 si l'offre d'abonnement ne contient pas la fonctionnalité 'attestation'

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test du contrat (requireFeature) ; test basé sur l'offre/plan |

- **Préconditions :** Un compte accompagné rattaché à un plan (ex. plan 'Découverte' ou 'Essentiel') NE comportant PAS la clé 'attestation', propriétaire d'un parcours clôturé.
- **Données :** GET /api/ethique/attestation/dossier/{id_cloturé}
- **Étapes :**
  1. L'admin rattache le compte à un plan sans 'attestation'
  2. Se connecter avec ce compte
  3. GET /api/ethique/attestation/dossier/{id_cloturé}
- **Résultat attendu :** 403 ; error = « Fonctionnalité non disponible dans votre offre »
- **Traçabilité :** requireFeature('attestation') — GET /api/ethique/attestation/dossier/:id
- **Automatisation :** ✅ api/ethique.test.ts

### TC-ETHIQUE-011 — Attestation : 403 prioritaire sur 400/404 (gating feature avant lecture du dossier)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | Table de décision (ordre des middlewares) ; test du contrat |

- **Préconditions :** Compte rattaché à un plan sans 'attestation'.
- **Données :** GET /api/ethique/attestation/dossier/99999999 (id inexistant)
- **Étapes :**
  1. Se connecter avec le compte sans 'attestation'
  2. GET /api/ethique/attestation/dossier/99999999
- **Résultat attendu :** 403 (requireFeature s'exécute avant le handler) et non 404
- **Traçabilité :** requireFeature('attestation') — GET /api/ethique/attestation/dossier/:id
- **Automatisation :** ✅ api/ethique.test.ts

### TC-ETHIQUE-012 — Console RGPD — liste des demandes d'effacement (admin) renvoie 200 et la demande seedée de Léa

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Test du contrat ; test basé sur les rôles (admin) |

- **Préconditions :** Admin (mohamed@elafrit.com). Demande d'effacement en_attente seedée pour Léa sur le parcours D4 exploratoire.
- **Données :** GET /api/admin/effacements
- **Étapes :**
  1. Se connecter comme admin
  2. GET /api/admin/effacements
- **Résultat attendu :** 200 ; { demandes: [...] } ; chaque item porte id, motif, statut='en_attente', cree_le, accompagne_id, email, prenom, nom, anonymise, dossier_titre ; la demande de Léa (D4) est présente
- **Traçabilité :** console RGPD — GET /api/admin/effacements
- **Automatisation :** ✅ api/ethique.test.ts

### TC-ETHIQUE-013 — Liste des effacements : 401 si non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test du contrat (requireAuth) |

- **Préconditions :** Aucune session.
- **Données :** GET /api/admin/effacements sans cookie
- **Étapes :**
  1. GET /api/admin/effacements sans cookie
- **Résultat attendu :** 401 ; error = « Non authentifié »
- **Traçabilité :** requireAuth — GET /api/admin/effacements
- **Automatisation :** ✅ api/ethique.test.ts

### TC-ETHIQUE-014 — Liste des effacements : 403 pour un accompagnateur (mauvais rôle)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles ; partition d'équivalence (rôle non-admin) |

- **Préconditions :** Accompagnateur Mohamen (elafrit.mohamed@gmail.com) authentifié.
- **Données :** GET /api/admin/effacements avec cookie accompagnateur
- **Étapes :**
  1. Se connecter comme elafrit.mohamed@gmail.com
  2. GET /api/admin/effacements
- **Résultat attendu :** 403 ; error = « Accès refusé »
- **Traçabilité :** requireRole('admin') — GET /api/admin/effacements
- **Automatisation :** ✅ api/ethique.test.ts

### TC-ETHIQUE-015 — Liste des effacements : 403 pour un accompagné (mauvais rôle)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | Test basé sur les rôles |

- **Préconditions :** Accompagné (afrit_mohamed@yahoo.fr) authentifié.
- **Données :** GET /api/admin/effacements avec cookie accompagné
- **Étapes :**
  1. Se connecter comme afrit_mohamed@yahoo.fr
  2. GET /api/admin/effacements
- **Résultat attendu :** 403 ; error = « Accès refusé »
- **Traçabilité :** requireRole('admin') — GET /api/admin/effacements
- **Automatisation :** ✅ api/ethique.test.ts

### TC-ETHIQUE-016 — Console RGPD non gatée par plan : un admin rattaché à un plan minimal y accède quand même

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | Test du contrat (absence de gating par plan) ; test basé sur les rôles |

- **Préconditions :** Admin rattaché à un plan 'Découverte' (socle, sans features admin). Aucun requireFeature sur les routes admin.
- **Données :** GET /api/admin/effacements ; GET /api/admin/retention
- **Étapes :**
  1. Rattacher l'admin à un plan minimal
  2. Se connecter comme admin
  3. GET /api/admin/effacements puis GET /api/admin/retention
- **Résultat attendu :** 200 sur les deux (les routes admin ne dépendent que du rôle, jamais de requireFeature)
- **Traçabilité :** requireRole('admin') sans requireFeature — GET /api/admin/effacements, GET /api/admin/retention
- **Automatisation :** ✅ api/ethique.test.ts

### TC-ETHIQUE-017 — Traiter une demande d'effacement par anonymisation (admin) — sur compte @boussole.test

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Table de décision (action=anonymiser) ; test du contrat |

- **Préconditions :** Compte de test accompagné (ex. *@boussole.test) avec une demande d'effacement en_attente. Action destructive → réservée aux comptes @boussole.test.
- **Données :** POST /api/admin/effacements/{idDemande} body {"action":"anonymiser"}
- **Étapes :**
  1. Créer/identifier une demande en_attente sur un compte @boussole.test
  2. Se connecter comme admin
  3. POST /api/admin/effacements/{idDemande} {action:'anonymiser'}
  4. Vérifier la demande et le compte en base
- **Résultat attendu :** 200 ; { ok:true, action:'anonymiser' } ; demande passée à statut='traitee' avec action et traite_le renseignés ; user.email = anonyme-{id}@boussole.local, nom/prenom NULL, actif=0, anonymise=1
- **Traçabilité :** console RGPD — POST /api/admin/effacements/:id (processEffacement)
- **Automatisation :** ✅ api/ethique.test.ts

### TC-ETHIQUE-018 — Traiter une demande d'effacement par suppression (admin) — cascade — sur compte @boussole.test

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Table de décision (action=supprimer) ; test du contrat |

- **Préconditions :** Compte de test accompagné (@boussole.test) avec une demande d'effacement en_attente.
- **Données :** POST /api/admin/effacements/{idDemande} body {"action":"supprimer"}
- **Étapes :**
  1. Identifier une demande en_attente sur un compte @boussole.test
  2. Se connecter comme admin
  3. POST /api/admin/effacements/{idDemande} {action:'supprimer'}
  4. Vérifier en base
- **Résultat attendu :** 200 ; { ok:true, action:'supprimer' } ; le user est supprimé (DELETE) et la demande disparaît en cascade (pas de mise à jour de statut côté code pour 'supprimer')
- **Traçabilité :** console RGPD — POST /api/admin/effacements/:id (processEffacement → deleteUser)
- **Automatisation :** ✅ api/ethique.test.ts

### TC-ETHIQUE-019 — Traiter un effacement : 400 si action absente ou invalide

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | haute | Partition d'équivalence (valeurs hors {anonymiser,supprimer}) ; table de décision |

- **Préconditions :** Admin authentifié ; une demande existante.
- **Données :** POST /api/admin/effacements/{id} body {} ; puis {"action":"foo"}
- **Étapes :**
  1. Se connecter comme admin
  2. POST /api/admin/effacements/{id} avec body vide
  3. POST /api/admin/effacements/{id} avec action='foo'
- **Résultat attendu :** 400 dans les deux cas ; error = « Action invalide (anonymiser | supprimer) » ; aucune donnée modifiée
- **Traçabilité :** console RGPD — POST /api/admin/effacements/:id
- **Automatisation :** ✅ api/ethique.test.ts

### TC-ETHIQUE-020 — Traiter un effacement : 404 si la demande est introuvable

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | Valeurs limites (id inexistant) ; test du contrat |

- **Préconditions :** Admin authentifié.
- **Données :** POST /api/admin/effacements/99999999 body {"action":"anonymiser"}
- **Étapes :**
  1. Se connecter comme admin
  2. POST /api/admin/effacements/99999999 {action:'anonymiser'}
- **Résultat attendu :** 404 ; error = « Demande introuvable » (processEffacement renvoie false)
- **Traçabilité :** console RGPD — POST /api/admin/effacements/:id
- **Automatisation :** ✅ api/ethique.test.ts

### TC-ETHIQUE-021 — Traiter un effacement : 401 non authentifié / 403 mauvais rôle

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles ; test du contrat (requireAuth puis requireRole) |

- **Préconditions :** Sans session, puis session accompagnateur.
- **Données :** POST /api/admin/effacements/1 {action:'anonymiser'}
- **Étapes :**
  1. POST sans cookie
  2. POST avec cookie accompagnateur (elafrit.mohamed@gmail.com)
- **Résultat attendu :** Sans cookie → 401 « Non authentifié » ; rôle accompagnateur → 403 « Accès refusé » ; aucune anonymisation/suppression effectuée
- **Traçabilité :** requireAuth + requireRole('admin') — POST /api/admin/effacements/:id
- **Automatisation :** ✅ api/ethique.test.ts

### TC-ETHIQUE-022 — Action RGPD directe : anonymiser un compte hors demande (admin) — compte @boussole.test

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Table de décision ; test du contrat |

- **Préconditions :** Admin ; un compte cible accompagné @boussole.test différent de l'admin.
- **Données :** POST /api/admin/rgpd/{userIdTest} body {"action":"anonymiser"}
- **Étapes :**
  1. Identifier un user @boussole.test
  2. Se connecter comme admin
  3. POST /api/admin/rgpd/{userIdTest} {action:'anonymiser'}
  4. Vérifier en base
- **Résultat attendu :** 200 ; { ok:true, action:'anonymiser' } ; user anonymisé (email anonyme-{id}@boussole.local, nom/prenom NULL, actif=0, anonymise=1) ; push_subscriptions/tokens/journal_entrees supprimés, meteo_humeur.mot et emotions_roue.note effacés
- **Traçabilité :** console RGPD — POST /api/admin/rgpd/:userId (anonymizeUser)
- **Automatisation :** ✅ api/ethique.test.ts

### TC-ETHIQUE-023 — Action RGPD directe : supprimer un compte hors demande (admin) — compte @boussole.test

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Table de décision ; test du contrat |

- **Préconditions :** Admin ; compte cible @boussole.test.
- **Données :** POST /api/admin/rgpd/{userIdTest} body {"action":"supprimer"}
- **Étapes :**
  1. Identifier un user @boussole.test
  2. Se connecter comme admin
  3. POST /api/admin/rgpd/{userIdTest} {action:'supprimer'}
  4. Vérifier en base
- **Résultat attendu :** 200 ; { ok:true, action:'supprimer' } ; le user est supprimé (DELETE FROM users)
- **Traçabilité :** console RGPD — POST /api/admin/rgpd/:userId (deleteUser)
- **Automatisation :** ✅ api/ethique.test.ts

### TC-ETHIQUE-024 — Action RGPD directe : 400 si l'admin cible son propre compte

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | haute | Table de décision (userId == meId) ; test du contrat (garde-fou) |

- **Préconditions :** Admin authentifié (mohamed@elafrit.com).
- **Données :** POST /api/admin/rgpd/{idAdminLuiMeme} body {"action":"anonymiser"}
- **Étapes :**
  1. Récupérer l'id de l'admin connecté
  2. POST /api/admin/rgpd/{idAdmin} {action:'anonymiser'}
- **Résultat attendu :** 400 ; error = « Action impossible sur votre propre compte » ; le contrôle a lieu AVANT la recherche du user, aucune anonymisation
- **Traçabilité :** console RGPD — POST /api/admin/rgpd/:userId
- **Automatisation :** ✅ api/ethique.test.ts

### TC-ETHIQUE-025 — Action RGPD directe : 404 si l'utilisateur cible n'existe pas

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | Valeurs limites (id inexistant) ; test du contrat |

- **Préconditions :** Admin authentifié.
- **Données :** POST /api/admin/rgpd/99999999 body {"action":"anonymiser"}
- **Étapes :**
  1. Se connecter comme admin
  2. POST /api/admin/rgpd/99999999 {action:'anonymiser'}
- **Résultat attendu :** 404 ; error = « Utilisateur introuvable »
- **Traçabilité :** console RGPD — POST /api/admin/rgpd/:userId
- **Automatisation :** ✅ api/ethique.test.ts

### TC-ETHIQUE-026 — Action RGPD directe : 400 si action invalide (sur un user existant ≠ soi)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | Partition d'équivalence (action hors {anonymiser,supprimer}) ; table de décision |

- **Préconditions :** Admin ; user cible @boussole.test existant ≠ admin.
- **Données :** POST /api/admin/rgpd/{userIdTest} body {"action":"effacer"}
- **Étapes :**
  1. Se connecter comme admin
  2. POST /api/admin/rgpd/{userIdTest} {action:'effacer'}
- **Résultat attendu :** 400 ; error = « Action invalide » ; aucune modification du compte (la branche else échoue après vérification d'existence)
- **Traçabilité :** console RGPD — POST /api/admin/rgpd/:userId
- **Automatisation :** ✅ api/ethique.test.ts

### TC-ETHIQUE-027 — Action RGPD directe : 401 non authentifié / 403 mauvais rôle

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles ; test du contrat |

- **Préconditions :** Sans session, puis session accompagné.
- **Données :** POST /api/admin/rgpd/2 {action:'supprimer'}
- **Étapes :**
  1. POST sans cookie
  2. POST avec cookie accompagné (afrit_mohamed@yahoo.fr)
- **Résultat attendu :** Sans cookie → 401 « Non authentifié » ; accompagné → 403 « Accès refusé » ; aucune suppression
- **Traçabilité :** requireAuth + requireRole('admin') — POST /api/admin/rgpd/:userId
- **Automatisation :** ✅ api/ethique.test.ts

### TC-ETHIQUE-028 — Politique de rétention (admin) renvoie months, auto et la liste des éligibles

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Test du contrat ; partition d'équivalence |

- **Préconditions :** Admin authentifié. RETENTION_MONTHS par défaut 36, RETENTION_AUTO non '1'.
- **Données :** GET /api/admin/retention
- **Étapes :**
  1. Se connecter comme admin
  2. GET /api/admin/retention
- **Résultat attendu :** 200 ; { months:number (36 par défaut), auto:false, eligibles:[{id,email,derniere_activite}...] } ; eligibles est un tableau (typage cohérent)
- **Traçabilité :** console RGPD — GET /api/admin/retention
- **Automatisation :** ✅ api/ethique.test.ts

### TC-ETHIQUE-029 — Rétention : 401 non authentifié / 403 mauvais rôle

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | Test basé sur les rôles |

- **Préconditions :** Sans session, puis accompagnateur.
- **Données :** GET /api/admin/retention
- **Étapes :**
  1. GET sans cookie
  2. GET avec cookie accompagnateur
- **Résultat attendu :** Sans cookie → 401 « Non authentifié » ; accompagnateur → 403 « Accès refusé »
- **Traçabilité :** requireAuth + requireRole('admin') — GET /api/admin/retention
- **Automatisation :** ✅ api/ethique.test.ts

### TC-ETHIQUE-030 — Appliquer la rétention (admin) anonymise les comptes éligibles et renvoie le décompte

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Test du contrat ; partition d'équivalence (≥1 éligible) |

- **Préconditions :** Admin ; au moins un compte @boussole.test éligible (accompagné, tous parcours clôturés, dernière activité > 36 mois). Action destructive → comptes @boussole.test.
- **Données :** POST /api/admin/retention/appliquer
- **Étapes :**
  1. Préparer un compte @boussole.test éligible (parcours clôturé + dernière activité ancienne)
  2. Se connecter comme admin
  3. GET /api/admin/retention pour noter le nombre d'éligibles N
  4. POST /api/admin/retention/appliquer
  5. GET /api/admin/retention de nouveau
- **Résultat attendu :** 200 ; { ok:true, anonymises:N } cohérent avec la liste précédente ; après application les comptes traités sont anonymise=1 et ne figurent plus dans eligibles (anonymise=0 requis)
- **Traçabilité :** console RGPD — POST /api/admin/retention/appliquer (retentionEligibles + anonymizeUser)
- **Automatisation :** ✅ api/ethique.test.ts

### TC-ETHIQUE-031 — Appliquer la rétention quand aucun compte n'est éligible

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | Valeurs limites (ensemble vide) ; test du contrat |

- **Préconditions :** Admin ; aucun compte éligible (base de démo récente).
- **Données :** POST /api/admin/retention/appliquer
- **Étapes :**
  1. Se connecter comme admin
  2. S'assurer que GET /api/admin/retention renvoie eligibles=[]
  3. POST /api/admin/retention/appliquer
- **Résultat attendu :** 200 ; { ok:true, anonymises:0 } ; aucun compte modifié
- **Traçabilité :** console RGPD — POST /api/admin/retention/appliquer
- **Automatisation :** ✅ api/ethique.test.ts

### TC-ETHIQUE-032 — Appliquer la rétention : 401 non authentifié / 403 mauvais rôle

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles ; test du contrat |

- **Préconditions :** Sans session, puis accompagné.
- **Données :** POST /api/admin/retention/appliquer
- **Étapes :**
  1. POST sans cookie
  2. POST avec cookie accompagné
- **Résultat attendu :** Sans cookie → 401 « Non authentifié » ; accompagné → 403 « Accès refusé » ; aucune anonymisation déclenchée
- **Traçabilité :** requireAuth + requireRole('admin') — POST /api/admin/retention/appliquer
- **Automatisation :** ✅ api/ethique.test.ts

### TC-ETHIQUE-033 — Unitaire — retentionEligibles() : sélectionne un accompagné dont TOUS les parcours sont clôturés et inactif > seuil

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | haute | Test unitaire ; partition d'équivalence (classe éligible) |

- **Préconditions :** Base de test ; un accompagné A avec ≥1 dossier, tous statut='cloture', anonymise=0, dernière activité (max session.date / max dossier.cree_le) antérieure à now-36 mois.
- **Données :** Appel retentionEligibles(36)
- **Étapes :**
  1. Insérer A et ses dossiers clôturés anciens
  2. Appeler retentionEligibles(36)
- **Résultat attendu :** Le résultat contient A avec id, email et derniere_activite non NULL (< now-36 mois)
- **Traçabilité :** retentionEligibles() — app/api/src/ethique.ts
- **Automatisation :** ✅ unit/ethique.test.ts

### TC-ETHIQUE-034 — Unitaire — retentionEligibles() : EXCLUT un accompagné ayant au moins un parcours non clôturé

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | haute | Table de décision (tous clôturés=non → exclu) ; test unitaire |

- **Préconditions :** Accompagné B avec un dossier clôturé ancien ET un dossier statut != 'cloture'.
- **Données :** Appel retentionEligibles(36)
- **Étapes :**
  1. Insérer B avec un dossier non clôturé
  2. Appeler retentionEligibles(36)
- **Résultat attendu :** B est absent du résultat (clause NOT EXISTS dossier non cloturé)
- **Traçabilité :** retentionEligibles() — app/api/src/ethique.ts
- **Automatisation :** ✅ unit/ethique.test.ts

### TC-ETHIQUE-035 — Unitaire — retentionEligibles() : EXCLUT un accompagné encore actif (dernière activité < seuil)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | haute | Valeurs limites (autour du seuil de rétention) ; test unitaire |

- **Préconditions :** Accompagné C, tous parcours clôturés, mais une session récente (< 36 mois).
- **Données :** Appel retentionEligibles(36)
- **Étapes :**
  1. Insérer C avec une session datée d'il y a 1 mois
  2. Appeler retentionEligibles(36)
- **Résultat attendu :** C est absent (derniere_activite >= now-36 mois)
- **Traçabilité :** retentionEligibles() — app/api/src/ethique.ts
- **Automatisation :** ✅ unit/ethique.test.ts

### TC-ETHIQUE-036 — Unitaire — retentionEligibles() : EXCLUT les comptes déjà anonymisés et les non-accompagnés

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | moyenne | Partition d'équivalence (classes exclues : anonymisé, rôle non accompagné) ; test unitaire |

- **Préconditions :** Compte D accompagné anonymise=1 (parcours clôturés anciens) ; compte E accompagnateur avec parcours clôturés anciens.
- **Données :** Appel retentionEligibles(36)
- **Étapes :**
  1. Insérer D (anonymise=1) et E (role accompagnateur)
  2. Appeler retentionEligibles(36)
- **Résultat attendu :** Ni D (anonymise=0 requis) ni E (role='accompagne' requis) ne figurent dans le résultat
- **Traçabilité :** retentionEligibles() — app/api/src/ethique.ts
- **Automatisation :** ✅ unit/ethique.test.ts

### TC-ETHIQUE-037 — Unitaire — retentionEligibles() : EXCLUT un accompagné SANS aucun dossier

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | basse | Valeurs limites (ensemble de dossiers vide) ; test unitaire |

- **Préconditions :** Accompagné F sans aucun dossier.
- **Données :** Appel retentionEligibles(36)
- **Étapes :**
  1. Insérer F sans dossier
  2. Appeler retentionEligibles(36)
- **Résultat attendu :** F absent (clause EXISTS dossier) ; derniere_activite serait NULL de toute façon (filtre IS NOT NULL)
- **Traçabilité :** retentionEligibles() — app/api/src/ethique.ts
- **Automatisation :** ✅ unit/ethique.test.ts

### TC-ETHIQUE-038 — Unitaire — retentionEligibles(months) : le paramètre months déplace le seuil

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | moyenne | Valeurs limites (frontière du seuil) ; partition d'équivalence |

- **Préconditions :** Accompagné G, tous parcours clôturés, dernière activité il y a ~10 mois.
- **Données :** retentionEligibles(36) puis retentionEligibles(6)
- **Étapes :**
  1. Insérer G inactif depuis ~10 mois
  2. Appeler retentionEligibles(36)
  3. Appeler retentionEligibles(6)
- **Résultat attendu :** G absent pour months=36 ; G présent pour months=6 (seuil now-6 mois franchi)
- **Traçabilité :** retentionEligibles() — app/api/src/ethique.ts
- **Automatisation :** ✅ unit/ethique.test.ts

### TC-ETHIQUE-039 — Unitaire — anonymizeUser() : efface l'identité et les contenus libres, conserve les parcours

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | haute | Test unitaire ; test du contrat (effet attendu d'anonymisation) |

- **Préconditions :** User H accompagné avec email/nom/prenom/password_hash, push_subscriptions, tokens, journal_entrees, meteo_humeur(mot), emotions_roue(note) et des dossiers.
- **Données :** Appel anonymizeUser(H.id)
- **Étapes :**
  1. Préparer H et ses données associées
  2. Appeler anonymizeUser(H.id)
  3. Inspecter la base
- **Résultat attendu :** users : email=anonyme-{id}@boussole.local, nom/prenom/password_hash NULL, actif=0, anonymise=1 ; push_subscriptions/tokens/journal_entrees supprimés ; meteo_humeur.mot NULL et emotions_roue.note NULL ; dossiers conservés
- **Traçabilité :** anonymizeUser() — app/api/src/ethique.ts
- **Automatisation :** ✅ unit/ethique.test.ts

### TC-ETHIQUE-040 — Unitaire — anonymizeUser() : ne fait rien (sans erreur) sur un id inexistant

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | basse | Valeurs limites (id inexistant) ; test unitaire (robustesse) |

- **Préconditions :** Aucun user avec l'id 99999999.
- **Données :** Appel anonymizeUser(99999999)
- **Étapes :**
  1. Appeler anonymizeUser(99999999)
- **Résultat attendu :** Aucune exception ; aucune modification (return anticipé si user introuvable)
- **Traçabilité :** anonymizeUser() — app/api/src/ethique.ts
- **Automatisation :** ✅ unit/ethique.test.ts

### TC-ETHIQUE-041 — Unitaire — processEffacement('anonymiser') : marque la demande traitee avec action et traite_le

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | haute | Table de décision (action=anonymiser → update statut) ; test unitaire |

- **Préconditions :** Demande d'effacement en_attente liée à un accompagné de test.
- **Données :** Appel processEffacement(idDemande, 'anonymiser')
- **Étapes :**
  1. Préparer une demande en_attente
  2. Appeler processEffacement(idDemande,'anonymiser')
  3. Inspecter demandes_effacement
- **Résultat attendu :** Retourne true ; le compte est anonymisé ; demandes_effacement.statut='traitee', action='anonymiser', traite_le renseigné
- **Traçabilité :** processEffacement() — app/api/src/ethique.ts
- **Automatisation :** ✅ unit/ethique.test.ts

### TC-ETHIQUE-042 — Unitaire — processEffacement('supprimer') : supprime le compte sans marquer la demande

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | moyenne | Table de décision (action=supprimer) ; test unitaire |

- **Préconditions :** Demande d'effacement en_attente liée à un accompagné de test.
- **Données :** Appel processEffacement(idDemande, 'supprimer')
- **Étapes :**
  1. Préparer une demande en_attente
  2. Appeler processEffacement(idDemande,'supprimer')
  3. Inspecter la base
- **Résultat attendu :** Retourne true ; le user est supprimé (deleteUser) ; aucune mise à jour de statut n'est tentée (branche 'anonymiser' seule met à jour)
- **Traçabilité :** processEffacement() — app/api/src/ethique.ts
- **Automatisation :** ✅ unit/ethique.test.ts

### TC-ETHIQUE-043 — Unitaire — processEffacement() : retourne false si la demande n'existe pas

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | moyenne | Valeurs limites (demande inexistante) ; test unitaire |

- **Préconditions :** Aucune demande avec l'id 99999999.
- **Données :** Appel processEffacement(99999999, 'anonymiser')
- **Étapes :**
  1. Appeler processEffacement(99999999,'anonymiser')
- **Résultat attendu :** Retourne false ; aucune anonymisation/suppression effectuée
- **Traçabilité :** processEffacement() — app/api/src/ethique.ts
- **Automatisation :** ✅ unit/ethique.test.ts

### TC-ETHIQUE-044 — Unitaire — deleteUser() : retire le compte de la table users

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | basse | Test unitaire ; test du contrat |

- **Préconditions :** User de test I existant.
- **Données :** Appel deleteUser(I.id)
- **Étapes :**
  1. Insérer I
  2. Appeler deleteUser(I.id)
  3. SELECT users WHERE id=I.id
- **Résultat attendu :** Aucune ligne restante pour I.id
- **Traçabilité :** deleteUser() — app/api/src/ethique.ts
- **Automatisation :** ✅ unit/ethique.test.ts

### TC-ETHIQUE-045 — UI — L'accompagné télécharge son attestation depuis le détail d'un parcours clôturé

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | Test bout-en-bout basé sur les rôles (accompagné) ; test du contrat UI |

- **Préconditions :** Karim (accompagné, feature 'attestation' active) connecté ; parcours D5 clôturé. Stack http://localhost:8080.
- **Données :** Page ParcoursDetail du parcours D5
- **Étapes :**
  1. Se connecter comme karim.benali@boussole.demo
  2. Ouvrir le parcours clôturé D5 (/espace puis détail)
  3. Vérifier la présence du bouton « 📜 Mon attestation »
  4. Cliquer dessus
  5. Vérifier la modale Attestation (titre, accompagné, accompagnateur, période, nb entretiens, nb CR) et le bouton Imprimer
- **Résultat attendu :** Le bouton « Mon attestation » est visible (gating attestationActive && statut==='cloture') ; la modale affiche les données et propose l'impression/PDF
- **Traçabilité :** feature 'attestation' — ParcoursDetail.tsx + AttestationModal.tsx (GET /api/ethique/attestation/dossier/:id)
- **Automatisation :** ⏳ à automatiser

### TC-ETHIQUE-046 — UI — Le bouton attestation est absent pour un parcours NON clôturé

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | acces | moyenne | Table de décision (cloturé=non → bouton masqué) ; test bout-en-bout |

- **Préconditions :** Léa (accompagnée) connectée ; parcours D4 exploratoire non clôturé ; feature 'attestation' active.
- **Données :** Page ParcoursDetail du parcours D4
- **Étapes :**
  1. Se connecter comme lea.martin@boussole.demo
  2. Ouvrir le parcours D4 (non clôturé)
  3. Chercher le bouton « Mon attestation »
- **Résultat attendu :** Le bouton « Mon attestation » n'apparaît pas (condition d.statut === 'cloture' fausse)
- **Traçabilité :** feature 'attestation' — ParcoursDetail.tsx (gating UI)
- **Automatisation :** ⏳ à automatiser

### TC-ETHIQUE-047 — UI — L'accompagnateur délivre l'attestation depuis le dossier clôturé

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | Test bout-en-bout basé sur les rôles (accompagnateur) |

- **Préconditions :** Camille (accompagnatrice, feature 'attestation' active) connectée ; dossier D5 clôturé de Karim.
- **Données :** Page Dossier D5
- **Étapes :**
  1. Se connecter comme camille.laurent@boussole.demo
  2. Ouvrir le dossier clôturé D5
  3. Vérifier le bouton « 📜 Délivrer l'attestation »
  4. Cliquer et vérifier la modale
- **Résultat attendu :** Bouton visible (attestationActif && cloture) ; modale affichée avec le contenu de l'attestation côté accompagnateur
- **Traçabilité :** feature 'attestation' — Dossier.tsx + AttestationModal.tsx (GET /api/ethique/attestation/dossier/:id)
- **Automatisation :** ⏳ à automatiser

### TC-ETHIQUE-048 — UI — La console RGPD admin affiche la demande d'effacement de Léa et permet anonymiser/supprimer

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | Test bout-en-bout basé sur les rôles (admin) ; test du contrat UI |

- **Préconditions :** Admin (mohamed@elafrit.com) connecté ; demande d'effacement de Léa (D4) seedée en_attente. Pour traiter réellement, opérer sur un compte @boussole.test.
- **Données :** Page /admin → section « Confidentialité & RGPD »
- **Étapes :**
  1. Se connecter comme admin
  2. Aller sur /admin
  3. Repérer la section RGPD, le compteur de demandes et la carte de Léa (motif, parcours)
  4. Vérifier les boutons « 🕶️ Anonymiser » et « 🗑️ Supprimer » et la confirmation window.confirm
  5. Vérifier le bloc Rétention (mois, auto/manuel, liste des éligibles, bouton Appliquer)
- **Résultat attendu :** La demande de Léa est listée (nom/email/motif/parcours) ; les deux actions déclenchent une confirmation ; le bloc rétention affiche months et la liste des éligibles
- **Traçabilité :** console RGPD — Admin.tsx + RgpdConsole.tsx (GET /api/admin/effacements, GET /api/admin/retention)
- **Automatisation :** ⏳ à automatiser

### TC-ETHIQUE-049 — UI — La page /admin (et la console RGPD) est inaccessible à un non-admin

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | acces | haute | Test basé sur les rôles ; test bout-en-bout (garde de route) |

- **Préconditions :** Accompagnateur (elafrit.mohamed@gmail.com) connecté.
- **Données :** Navigation vers /admin
- **Étapes :**
  1. Se connecter comme elafrit.mohamed@gmail.com
  2. Naviguer vers /admin
- **Résultat attendu :** La route Protected role='admin' redirige/refuse l'accès ; la console RGPD n'est jamais rendue ; côté API tout appel /api/admin/* renverrait 403
- **Traçabilité :** Protected role='admin' — App.tsx + Admin.tsx / RgpdConsole.tsx
- **Automatisation :** ⏳ à automatiser

### TC-ETHIQUE-050 — UI — Appliquer la rétention depuis la console (avec confirmation) met à jour le décompte

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | Test bout-en-bout ; test du contrat UI (POST /api/admin/retention/appliquer) |

- **Préconditions :** Admin connecté ; au moins un compte @boussole.test éligible à la rétention.
- **Données :** Page /admin → bloc Rétention → « Appliquer la rétention maintenant »
- **Étapes :**
  1. Préparer un compte @boussole.test éligible
  2. Se connecter comme admin et ouvrir /admin
  3. Dans le bloc Rétention, cliquer « Appliquer la rétention maintenant »
  4. Confirmer la boîte de dialogue
  5. Observer le message de succès et la liste rechargée
- **Résultat attendu :** Message « N compte(s) anonymisé(s) par rétention. » ; la liste des éligibles se vide des comptes traités après rechargement
- **Traçabilité :** console RGPD — RgpdConsole.tsx (POST /api/admin/retention/appliquer)
- **Automatisation :** ⏳ à automatiser

## Domaine ADOPT — 26 cas

**Endpoints couverts :**

- `POST /api/adoption/falc` · feature: `falc` · rôle: authentifié + feature 'falc' — Reformule un texte (ou du HTML nettoyé) en FALC (Facile À Lire et à Comprendre) via Claude, avec repli déterministe falcFallback si l'IA est indisponible. Réponse { texte, source }.

### TC-ADOPT-001 — FALC nominal : reformulation d'un texte brut renvoie 200 avec texte non vide

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Test du contrat |

- **Préconditions :** Connecté en tant qu'accompagne (afrit_mohamed@yahoo.fr) sans plan (accès à 'falc') ; clé ANTHROPIC_API_KEY configurée sur la stack.
- **Données :** Body JSON { "texte": "L'accompagnement vise à développer l'autonomie réflexive de la personne accompagnée dans la rédaction de son mémoire professionnel." }
- **Étapes :**
  1. POST /api/adoption/falc avec le cookie de session et le body texte
  2. Lire le corps de la réponse
- **Résultat attendu :** HTTP 200 ; corps = objet JSON contenant les champs 'texte' (string non vide) et 'source' (string) ; quand l'IA répond, source='ia'. Ne pas figer le contenu textuel.
- **Traçabilité :** feature falc — POST /api/adoption/falc
- **Automatisation :** ✅ api/adopt.test.ts

### TC-ADOPT-002 — FALC nominal via champ 'html' : le HTML est accepté et nettoyé

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Test du contrat |

- **Préconditions :** Connecté accompagne avec accès 'falc'.
- **Données :** Body { "html": "<h2>Bilan</h2><p>Vous avez bien progress&eacute;.</p><ul><li>Point 1</li></ul>" }
- **Étapes :**
  1. POST /api/adoption/falc avec le body html
  2. Inspecter la réponse
- **Résultat attendu :** HTTP 200 ; 'texte' présent et non vide ; aucune balise HTML (<...>) ni entité (&...;) résiduelle dans le texte renvoyé (preuve indirecte que strip() a été appliqué en amont).
- **Traçabilité :** feature falc — POST /api/adoption/falc (strip + champ html)
- **Automatisation :** ✅ api/adopt.test.ts

### TC-ADOPT-003 — FALC : priorité du champ 'texte' sur 'html' quand les deux sont fournis

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | Table de décision |

- **Préconditions :** Connecté accompagne avec accès 'falc'.
- **Données :** Body { "texte": "Phrase issue de texte.", "html": "<p>Phrase issue de html.</p>" }
- **Étapes :**
  1. POST /api/adoption/falc avec texte ET html
  2. Vérifier la réponse
- **Résultat attendu :** HTTP 200 ; le traitement repose sur la valeur de 'texte' (req.body.texte ?? req.body.html), pas sur 'html'. Réponse { texte, source } valide.
- **Traçabilité :** feature falc — POST /api/adoption/falc (texte ?? html)
- **Automatisation :** ✅ api/adopt.test.ts

### TC-ADOPT-004 — FALC repli heuristique : sans clé IA, source='heuristique' et puces générées

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | Test du contrat (repli) |

- **Préconditions :** Stack démarrée SANS ANTHROPIC_API_KEY (ou clé invalide entraînant !res.ok) ; connecté accompagne avec accès 'falc'.
- **Données :** Body { "texte": "Première idée. Deuxième idée importante. Troisième idée à retenir." }
- **Étapes :**
  1. POST /api/adoption/falc
  2. Lire texte et source
- **Résultat attendu :** HTTP 200 ; source='heuristique' ; 'texte' = liste à puces (lignes préfixées par '• ') correspondant aux phrases découpées par falcFallback.
- **Traçabilité :** feature falc — POST /api/adoption/falc (repli falcFallback)
- **Automatisation :** ✅ api/adopt.test.ts

### TC-ADOPT-005 — FALC validation : texte vide (chaîne vide) renvoie 400

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | haute | Valeurs limites / partition d'équivalence (classe invalide) |

- **Préconditions :** Connecté accompagne avec accès 'falc'.
- **Données :** Body { "texte": "" }
- **Étapes :**
  1. POST /api/adoption/falc avec texte vide
  2. Lire le statut et le corps
- **Résultat attendu :** HTTP 400 ; corps { error: 'Texte vide' }.
- **Traçabilité :** feature falc — POST /api/adoption/falc (if (!texte))
- **Automatisation :** ✅ api/adopt.test.ts

### TC-ADOPT-006 — FALC validation : body absent / aucun champ texte ni html renvoie 400

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | haute | Partition d'équivalence (entrée manquante) |

- **Préconditions :** Connecté accompagne avec accès 'falc'.
- **Données :** Body {} (objet vide) ; et variante sans body du tout
- **Étapes :**
  1. POST /api/adoption/falc avec {}
  2. POST /api/adoption/falc sans body
- **Résultat attendu :** HTTP 400 ; { error: 'Texte vide' } dans les deux cas (req.body?.texte ?? req.body?.html ?? '' → chaîne vide après strip).
- **Traçabilité :** feature falc — POST /api/adoption/falc
- **Automatisation :** ✅ api/adopt.test.ts

### TC-ADOPT-007 — FALC validation : HTML/whitespace uniquement réduit à vide → 400

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | Valeurs limites (frontière vide après nettoyage) |

- **Préconditions :** Connecté accompagne avec accès 'falc'.
- **Données :** Body { "html": "<br>   <span> &nbsp; </span>\n\t" }
- **Étapes :**
  1. POST /api/adoption/falc avec du HTML sans contenu textuel
  2. Lire le statut
- **Résultat attendu :** HTTP 400 ; { error: 'Texte vide' } : strip() ne laisse que des espaces puis trim() → chaîne vide.
- **Traçabilité :** feature falc — POST /api/adoption/falc (strip → '')
- **Automatisation :** ✅ api/adopt.test.ts

### TC-ADOPT-008 — FALC : troncature à 4000 caractères pour l'appel IA

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | basse | Valeurs limites (borne supérieure de longueur) |

- **Préconditions :** Connecté accompagne avec accès 'falc' ; clé IA présente.
- **Données :** Body texte de >4000 caractères (ex. 6000 caractères de phrases valides)
- **Étapes :**
  1. POST /api/adoption/falc avec un texte très long
  2. Vérifier que la requête aboutit
- **Résultat attendu :** HTTP 200 ; réponse { texte, source } valide ; pas d'erreur 413/500 (le code applique texte.slice(0,4000) avant l'appel Claude).
- **Traçabilité :** feature falc — POST /api/adoption/falc (slice(0,4000))
- **Automatisation :** ✅ api/adopt.test.ts

### TC-ADOPT-009 — FALC : type de champ non-string coercé par String()

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | basse | Partition d'équivalence (types d'entrée) |

- **Préconditions :** Connecté accompagne avec accès 'falc'.
- **Données :** Body { "texte": 12345 } (nombre) puis { "texte": ["a","b"] }
- **Étapes :**
  1. POST /api/adoption/falc avec texte numérique
  2. POST avec texte tableau
- **Résultat attendu :** HTTP 200 si la valeur coercée par String() donne un texte non vide (ex. '12345'), sinon 400 ; pas de crash 500. Comportement cohérent avec String(req.body.texte).
- **Traçabilité :** feature falc — POST /api/adoption/falc (String(...))
- **Automatisation :** ✅ api/adopt.test.ts

### TC-ADOPT-010 — FALC contrôle d'accès : non authentifié → 401

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles |

- **Préconditions :** Aucune session (pas de cookie boussole_token).
- **Données :** Body { "texte": "Texte de test." }
- **Étapes :**
  1. POST /api/adoption/falc sans cookie d'authentification
  2. Lire le statut
- **Résultat attendu :** HTTP 401 ; { error: 'Non authentifié' } (requireAuth bloque avant requireFeature).
- **Traçabilité :** requireAuth — POST /api/adoption/falc
- **Automatisation :** ✅ api/adopt.test.ts

### TC-ADOPT-011 — FALC contrôle d'accès : cookie/token invalide → 401 session invalide

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | Test basé sur les rôles |

- **Préconditions :** Envoyer un cookie boussole_token falsifié/expiré.
- **Données :** Cookie boussole_token=eyJ.invalide.signature ; body { "texte": "x." }
- **Étapes :**
  1. POST /api/adoption/falc avec un JWT invalide
  2. Lire le statut
- **Résultat attendu :** HTTP 401 ; { error: 'Session invalide' } (jwt.verify échoue dans requireAuth).
- **Traçabilité :** requireAuth — POST /api/adoption/falc
- **Automatisation :** ✅ api/adopt.test.ts

### TC-ADOPT-012 — FALC gating : utilisateur sur plan sans 'falc' → 403

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles / requireFeature |

- **Préconditions :** Un compte affecté à un plan dont la liste de features NE contient PAS 'falc' (ex. plan Découverte/socle si falc absent, ou plan créé sans 'falc'). Connecté avec ce compte.
- **Données :** Body { "texte": "Texte de test." }
- **Étapes :**
  1. POST /api/adoption/falc avec une session valide mais sans la feature falc dans le plan
  2. Lire le statut et le corps
- **Résultat attendu :** HTTP 403 ; { error: 'Fonctionnalité non disponible dans votre offre' } (requireFeature('falc') bloque).
- **Traçabilité :** requireFeature('falc') — POST /api/adoption/falc
- **Automatisation :** ✅ api/adopt.test.ts

### TC-ADOPT-013 — FALC gating positif : compte sans plan a accès (aucun plan = tout activé)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | Test basé sur les rôles (cas par défaut) |

- **Préconditions :** Compte démo sans plan affecté (ex. accompagne Amine) — userFeatures renvoie ALL_FEATURE_KEYS.
- **Données :** Body { "texte": "Texte de test." }
- **Étapes :**
  1. POST /api/adoption/falc avec ce compte
  2. Lire le statut
- **Résultat attendu :** HTTP 200 (la feature 'falc' est implicitement accordée car userFeatures renvoie toutes les clés quand u.plan_id est nul).
- **Traçabilité :** requireFeature('falc') / userFeatures — POST /api/adoption/falc
- **Automatisation :** ✅ api/adopt.test.ts

### TC-ADOPT-014 — FALC gating positif : plan Pro (toutes features) a accès

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | Test basé sur les rôles |

- **Préconditions :** Compte affecté au plan Pro qui inclut 'falc'.
- **Données :** Body { "texte": "Texte de test." }
- **Étapes :**
  1. POST /api/adoption/falc avec un compte sur plan Pro
  2. Lire le statut
- **Résultat attendu :** HTTP 200 ; réponse { texte, source } valide.
- **Traçabilité :** requireFeature('falc') — POST /api/adoption/falc
- **Automatisation :** ✅ api/adopt.test.ts

### TC-ADOPT-015 — FALC accès multi-rôles : accompagnateur et admin (sans plan) peuvent appeler

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | moyenne | Test basé sur les rôles |

- **Préconditions :** Connecté en accompagnateur (camille.laurent@boussole.demo) puis en admin (mohamed@elafrit.com), comptes sans plan restreint.
- **Données :** Body { "texte": "Texte de test." }
- **Étapes :**
  1. POST /api/adoption/falc en accompagnateur
  2. POST /api/adoption/falc en admin
- **Résultat attendu :** HTTP 200 dans les deux cas : l'endpoint n'impose pas de rôle précis (requireAuth + requireFeature seulement), aucun requireRole.
- **Traçabilité :** requireAuth + requireFeature('falc') — POST /api/adoption/falc
- **Automatisation :** ✅ api/adopt.test.ts

### TC-ADOPT-016 — falcFallback unitaire : découpe en phrases et formate en puces (max 12)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | haute | Valeurs limites (12) + partition d'équivalence |

- **Préconditions :** Test unitaire sur la fonction falcFallback(texte) de adoption.ts.
- **Données :** Texte de 15 phrases séparées par '. ' / '! ' / '? '
- **Étapes :**
  1. Appeler falcFallback avec le texte
  2. Compter les lignes et vérifier le préfixe
- **Résultat attendu :** Au plus 12 lignes (slice(0,12)) ; chaque ligne préfixée par '• ' ; lignes jointes par '\n' ; les phrases ≤3 caractères sont éliminées (filter length>3).
- **Traçabilité :** adoption.ts — falcFallback()
- **Automatisation :** ✅ unit/adoption.test.ts

### TC-ADOPT-017 — falcFallback unitaire : phrases courtes (≤3 car.) filtrées et trim appliqué

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | validation | moyenne | Valeurs limites (frontière length>3) |

- **Préconditions :** Test unitaire sur falcFallback.
- **Données :** Texte 'A. Ok. Voici une phrase complète.' (segments 'A' et 'Ok' ont ≤3 caractères)
- **Étapes :**
  1. Appeler falcFallback('A. Ok. Voici une phrase complète.')
  2. Inspecter les puces produites
- **Résultat attendu :** Seule la phrase >3 caractères est conservée ('• Voici une phrase complète.') ; les segments 'A' et 'Ok' (longueur ≤3) sont écartés.
- **Traçabilité :** adoption.ts — falcFallback() (filter p.length>3)
- **Automatisation :** ✅ unit/adoption.test.ts

### TC-ADOPT-018 — strip unitaire : retire balises, entités et normalise les espaces

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | validation | moyenne | Partition d'équivalence (sanitize) |

- **Préconditions :** Test unitaire sur strip(html) de adoption.ts.
- **Données :** '<p>Bonjour&nbsp;&amp;  bienvenue</p>\n\t<b>ici</b>'
- **Étapes :**
  1. Appeler strip(...)
  2. Comparer la sortie
- **Résultat attendu :** Sortie sans balises ni entités, espaces multiples réduits à un seul, trim aux extrémités (ex. 'Bonjour bienvenue ici'). Entrée null/undefined → chaîne vide (html || '').
- **Traçabilité :** adoption.ts — strip()
- **Automatisation :** ✅ unit/adoption.test.ts

### TC-ADOPT-019 — FALC robustesse : panne IA (timeout/exception) bascule sur le repli sans 500

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | non-regression | moyenne | Test du contrat (résilience) |

- **Préconditions :** Clé IA présente mais l'appel Claude échoue (réseau coupé / réponse non-ok / exception) — callClaude renvoie null.
- **Données :** Body { "texte": "Une phrase. Une autre phrase." }
- **Étapes :**
  1. Simuler l'indisponibilité de l'API Claude
  2. POST /api/adoption/falc
- **Résultat attendu :** HTTP 200 (pas de 500) ; source='heuristique' ; texte = repli falcFallback. Le try/catch de callClaude absorbe l'erreur.
- **Traçabilité :** feature falc — POST /api/adoption/falc (callClaude → null → fallback)
- **Automatisation :** ✅ api/adopt.test.ts

### TC-ADOPT-020 — FALC non-régression : la forme { texte, source } reste stable

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | non-regression | moyenne | Test du contrat |

- **Préconditions :** Connecté accompagne avec accès 'falc'.
- **Données :** Body { "texte": "Phrase de référence pour le contrat." }
- **Étapes :**
  1. POST /api/adoption/falc
  2. Valider le schéma de la réponse
- **Résultat attendu :** HTTP 200 ; le corps contient exactement les clés 'texte' (string) et 'source' (valeur dans {'ia','heuristique'}) ; aucune fuite d'autres champs sensibles.
- **Traçabilité :** feature falc — POST /api/adoption/falc
- **Automatisation :** ✅ api/adopt.test.ts

### TC-ADOPT-021 — UI FALC : le bouton 'Facile à lire' affiche une version simplifiée

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | Test bout-en-bout basé sur les rôles |

- **Préconditions :** Connecté accompagne avec feature 'falc' active ; sur une page affichant un contenu (ex. compte rendu / synthèse) où FalcButton est rendu.
- **Données :** Compte démo afrit_mohamed@yahoo.fr / BoussoleDemo2026
- **Étapes :**
  1. Ouvrir http://localhost:8080 et se connecter
  2. Naviguer vers un contenu doté du bouton '📖 Facile à lire'
  3. Cliquer sur le bouton
  4. Observer le panneau qui s'ouvre
- **Résultat attendu :** Pendant le chargement le label devient '…' et le bouton est désactivé ; ensuite un encart 'Version facile à lire et à comprendre' s'affiche (aria-expanded passe à true) avec le texte reformulé ligne par ligne ; un second clic referme le panneau.
- **Traçabilité :** FalcButton.tsx — POST /api/adoption/falc
- **Automatisation :** ⏳ à automatiser

### TC-ADOPT-022 — UI FALC : le bouton est masqué quand la feature 'falc' n'est pas active

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | acces | haute | Test basé sur les rôles (gating UI) |

- **Préconditions :** Connecté avec un compte dont le plan n'inclut PAS 'falc'.
- **Données :** Compte sur plan sans falc
- **Étapes :**
  1. Se connecter
  2. Ouvrir une page contenant normalement FalcButton
  3. Vérifier la présence du bouton
- **Résultat attendu :** Le bouton '📖 Facile à lire' n'est pas rendu (useFeature('falc') false → return null) ; aucun appel à /adoption/falc déclenchable.
- **Traçabilité :** FalcButton.tsx — useFeature('falc')
- **Automatisation :** ⏳ à automatiser

### TC-ADOPT-023 — UI FALC : la bascule mode lecture (FalcToggle) modifie l'interface et persiste

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | Test bout-en-bout (état persistant) |

- **Préconditions :** Connecté avec feature 'falc' active ; FalcToggle présent dans la barre.
- **Données :** Compte démo accompagne
- **Étapes :**
  1. Cliquer sur le bouton de bascule '📘/📖'
  2. Observer l'attribut data-falc sur <html> et l'aspect (texte plus grand/aéré)
  3. Recharger la page
- **Résultat attendu :** L'attribut data-falc de documentElement passe à 'on' (aria-pressed=true, icône 📖) ; la valeur est persistée dans localStorage('falc') ; après rechargement l'état est conservé. Masqué si feature 'falc' absente.
- **Traçabilité :** FalcToggle.tsx — data-falc / localStorage
- **Automatisation :** ⏳ à automatiser

### TC-ADOPT-024 — UI Onboarding : la visite guidée se lance à la première connexion selon le rôle

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | Test bout-en-bout basé sur les rôles |

- **Préconditions :** Feature 'onboarding' active ; localStorage 'boussole_onboarding_<role>' absent (première venue).
- **Données :** Connexion accompagne (Amine) puis accompagnateur (Camille) puis admin (Mohamed)
- **Étapes :**
  1. Vider localStorage de la clé boussole_onboarding_<role>
  2. Se connecter
  3. Observer le lancement automatique du tour
- **Résultat attendu :** Le modal OnboardingTour s'ouvre automatiquement avec les étapes propres au rôle (accompagne=4 étapes, accompagnateur=4, admin=1) ; la clé localStorage boussole_onboarding_<role> est posée à '1' pour éviter un relancement automatique ultérieur.
- **Traçabilité :** OnboardingManager.tsx / OnboardingTour.tsx — feature onboarding
- **Automatisation :** ⏳ à automatiser

### TC-ADOPT-025 — UI Onboarding : navigation des étapes, surlignage de cible, fermeture (Passer/Échap/Terminer)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | Test bout-en-bout (parcours / table de décision étapes) |

- **Préconditions :** Feature 'onboarding' active ; tour ouvert (auto ou via le bouton flottant '?').
- **Données :** Connexion accompagne
- **Étapes :**
  1. Cliquer sur le bouton flottant '?' pour relancer le tour
  2. Parcourir Suivant → / ← Précédent
  3. Vérifier le surlignage de l'élément data-tour='espace'
  4. Fermer via 'Passer', via la touche Échap, puis arriver à 'Terminer'
- **Résultat attendu :** Le compteur 'Étape i / N' évolue ; un encadré met en valeur l'élément ciblé par selector quand il existe ; 'Précédent' apparaît à partir de l'étape 2 ; le dernier bouton affiche 'Terminer' et ferme le tour ; 'Passer' et la touche Échap ferment immédiatement.
- **Traçabilité :** OnboardingTour.tsx / OnboardingManager.tsx — bouton fab + Escape
- **Automatisation :** ⏳ à automatiser

### TC-ADOPT-026 — UI Onboarding : masqué et non relancé quand la feature 'onboarding' est absente

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | acces | moyenne | Test basé sur les rôles (gating UI) |

- **Préconditions :** Connecté avec un compte dont le plan n'inclut PAS 'onboarding'.
- **Données :** Compte sur plan sans onboarding
- **Étapes :**
  1. Se connecter
  2. Observer l'absence du tour et du bouton flottant '?'
- **Résultat attendu :** Ni le tour automatique ni le bouton flottant ne s'affichent (useFeature('onboarding') false → return null dans OnboardingManager).
- **Traçabilité :** OnboardingManager.tsx — useFeature('onboarding')
- **Automatisation :** ⏳ à automatiser

## Domaine UI_ACC — 59 cas

**Endpoints couverts :**

- `POST /api/auth/login` · feature: `—` · rôle: anonyme — Connexion accompagnateur (cookie httpOnly)
- `GET /api/auth/me` · feature: `—` · rôle: tous — Profil courant (rôle) après refresh()
- `GET /api/auth/me/features` · feature: `—` · rôle: tous — Liste des features activées (gating front)
- `GET /api/entretien/dashboard` · feature: `—` · rôle: accompagnateur — Cartes accompagnés du tableau de bord
- `GET /api/tags` · feature: `—` · rôle: accompagnateur — Liste des tags pour le filtre
- `POST /api/tags/dossier/:dossierId` · feature: `—` · rôle: accompagnateur — Ajouter un tag à un dossier
- `DELETE /api/tags/dossier/:dossierId/:tagId` · feature: `—` · rôle: accompagnateur — Retirer un tag d'un dossier
- `GET /api/pilotage/signaux` · feature: `signaux_faibles` · rôle: accompagnateur — Voyants signaux faibles (vert/orange/rouge)
- `GET /api/pilotage/impact` · feature: `tableau_impact` · rôle: accompagnateur — Tableau d'impact (KPI agrégés)
- `GET /api/pilotage/digest` · feature: `digest_email` · rôle: accompagnateur — Aperçu du digest hebdomadaire (HTML)
- `POST /api/pilotage/digest/envoyer` · feature: `digest_email` · rôle: accompagnateur — Envoi du digest par email
- `GET /api/dossiers/:id` · feature: `—` · rôle: accompagnateur — Détail du dossier (timeline, sessions, CR, rdvs, actions)
- `POST /api/dossiers/:id/cloturer` · feature: `—` · rôle: accompagnateur — Clôturer la démarche (synthèse finale)
- `POST /api/dossiers/:id/rouvrir` · feature: `—` · rôle: accompagnateur — Rouvrir un dossier clôturé
- `POST /api/actions` · feature: `plan_action` · rôle: accompagnateur — Ajouter une action au plan
- `PATCH /api/actions/:id` · feature: `plan_action` · rôle: accompagnateur — Changer le statut d'une action
- `POST /api/actions/reorder` · feature: `plan_action` · rôle: accompagnateur — Réordonner les actions (drag)
- `POST /api/entretien/sessions` · feature: `entretien` · rôle: accompagnateur — Démarrer / reprendre une session d'entretien
- `GET /api/entretien/sessions/:id` · feature: `entretien` · rôle: accompagnateur — Charger session (réponses, questions, phase)
- `GET /api/entretien/phases` · feature: `entretien` · rôle: accompagnateur — Les 6 phases du guide d'entretien
- `GET /api/entretien/dossiers` · feature: `entretien` · rôle: accompagnateur — Liste des accompagnés pour démarrer un entretien
- `POST /api/entretien/sessions/:id/reponses` · feature: `entretien` · rôle: accompagnateur — Sauver les notes générales d'une phase
- `POST /api/entretien/sessions/:id/questions` · feature: `entretien` · rôle: accompagnateur — Ajouter une question posée
- `PATCH /api/entretien/sessions/:id/questions/:qid` · feature: `entretien` · rôle: accompagnateur — Modifier texte/réponse d'une question
- `DELETE /api/entretien/sessions/:id/questions/:qid` · feature: `entretien` · rôle: accompagnateur — Supprimer une question posée
- `POST /api/entretien/suggestions` · feature: `copilote` · rôle: accompagnateur — Co-pilote IA : suggestions de questions/reformulation
- `POST /api/entretien/sessions/:id/cloturer` · feature: `entretien` · rôle: accompagnateur — Clôturer l'entretien (avant génération CR)
- `GET /api/emergence/dossier/:id/banque` · feature: `banque_questions` · rôle: accompagnateur — Banque de questions personnalisée (lecture)
- `POST /api/emergence/dossier/:id/banque` · feature: `banque_questions` · rôle: accompagnateur — Générer la banque de questions adaptée
- `GET /api/cr/session/:sid` · feature: `comptes_rendus` · rôle: tous (proprio) — CR courant + versions d'une session
- `POST /api/cr/generer` · feature: `comptes_rendus` · rôle: accompagnateur — Générer le CR par IA (nouvelle version)
- `PATCH /api/cr/version/:id` · feature: `comptes_rendus` · rôle: accompagnateur — Éditer le contenu HTML du CR
- `POST /api/cr/version/:id/publier` · feature: `comptes_rendus` · rôle: accompagnateur — Publier le CR à l'accompagné
- `GET /api/cr/version/:id` · feature: `comptes_rendus` · rôle: accompagnateur — Lire une version archivée du CR
- `GET /api/cr/session/:sid/messages` · feature: `comptes_rendus` · rôle: tous (proprio) — Discussion liée au CR
- `POST /api/cr/session/:sid/messages` · feature: `comptes_rendus` · rôle: tous (proprio) — Envoyer un message dans la discussion CR
- `GET /api/synthese/dossier/:id` · feature: `synthese` · rôle: accompagnateur — Document synthèse + versions
- `POST /api/synthese/generer` · feature: `synthese` · rôle: accompagnateur — Générer la synthèse du parcours (IA)
- `PATCH /api/synthese/version/:id` · feature: `synthese` · rôle: accompagnateur — Éditer la synthèse
- `POST /api/synthese/version/:id/publier` · feature: `synthese` · rôle: accompagnateur — Publier la synthèse
- `GET /api/miroir/session/:sid` · feature: `miroir` · rôle: accompagnateur — Lire l'analyse de posture (miroir réflexif)
- `POST /api/miroir/session/:sid` · feature: `miroir` · rôle: accompagnateur — Générer l'analyse de posture (IA + repli)
- `POST /api/miroir/session/:sid/appliquer` · feature: `miroir` · rôle: accompagnateur — Appliquer les scores au brouillon de grille
- `GET /api/reflexivite/debriefing/session/:sid` · feature: `debriefing` · rôle: accompagnateur — Questions + débriefing existant
- `POST /api/reflexivite/debriefing/session/:sid` · feature: `debriefing` · rôle: accompagnateur — Enregistrer le débriefing
- `POST /api/reflexivite/debriefing/session/:sid/suggerer` · feature: `debriefing` · rôle: accompagnateur — Amorcer le débriefing par l'IA
- `GET /api/reflexivite/replay/session/:sid` · feature: `replay_annote` · rôle: accompagnateur — Moments du replay annoté
- `POST /api/reflexivite/replay/session/:sid` · feature: `replay_annote` · rôle: accompagnateur — Enregistrer les annotations du replay
- `POST /api/reflexivite/replay/session/:sid/initialiser` · feature: `replay_annote` · rôle: accompagnateur — Amorcer l'auto-confrontation (IA)
- `GET /api/reflexivite/bilan` · feature: `bilan_pratique` · rôle: accompagnateur — Bilan de pratique global + base de calcul
- `POST /api/reflexivite/bilan` · feature: `bilan_pratique` · rôle: accompagnateur — Générer/régénérer le bilan (IA + repli heuristique)
- `GET /api/collab/ressources` · feature: `mutualisation` · rôle: accompagnateur — Bibliothèque partagée de ressources
- `POST /api/collab/ressources` · feature: `mutualisation` · rôle: accompagnateur — Partager une ressource
- `PATCH /api/collab/ressources/:id` · feature: `mutualisation` · rôle: accompagnateur — Basculer public/interne (lien token)
- `DELETE /api/collab/ressources/:id` · feature: `mutualisation` · rôle: accompagnateur — Supprimer sa ressource
- `GET /api/emergence/dossier/:id/fil-rouge` · feature: `fil_rouge` · rôle: accompagnateur — Fil rouge du mémoire (lecture)
- `POST /api/emergence/dossier/:id/fil-rouge` · feature: `fil_rouge` · rôle: accompagnateur — Faire émerger le fil rouge (IA)
- `PATCH /api/emergence/dossier/:id/fil-rouge/partage` · feature: `fil_rouge` · rôle: accompagnateur — Partager / retirer le fil rouge
- `GET /api/viz/nuage/dossier/:id` · feature: `nuage_themes` · rôle: tous (proprio) — Nuage de thèmes (lecture)
- `POST /api/viz/nuage/dossier/:id` · feature: `nuage_themes` · rôle: tous (proprio) — Générer le nuage de thèmes (IA)
- `GET /api/viz/emotions/dossier/:id` · feature: `roue_emotions` · rôle: tous (proprio) — Roue des émotions (agrégat + historique)
- `GET /api/confort/visio/rdv/:id` · feature: `visio` · rôle: tous (proprio rdv) — URL de la salle de visioconférence
- `GET /api/confort/export/dossier/:id` · feature: `export_pdf` · rôle: accompagnateur — Données d'export PDF complet
- `GET /api/ethique/attestation/dossier/:id` · feature: `attestation` · rôle: tous (proprio) — Attestation de fin (dossier clôturé)
- `GET /api/rdv/:id/ics` · feature: `rdv` · rôle: tous (proprio) — Fichier ICS d'un rendez-vous

### TC-UI-100 — Connexion accompagnateur et redirection vers l'espace

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test du contrat ; test basé sur les rôles |

- **Préconditions :** Compte accompagnateur seedé elafrit.mohamed@gmail.com / BoussoleDemo2026. Stack Docker http://localhost:8080 démarrée.
- **Données :** email=elafrit.mohamed@gmail.com, mot de passe=BoussoleDemo2026
- **Étapes :**
  1. Ouvrir /connexion
  2. Saisir l'email et le mot de passe
  3. Cliquer « Se connecter »
  4. Observer la redirection et l'en-tête
- **Résultat attendu :** POST /api/auth/login renvoie 200 ; redirection vers /espace ; le menu affiche l'utilisateur connecté ; un cookie httpOnly boussole_token est posé. /api/auth/me retourne role=accompagnateur.
- **Traçabilité :** (login) POST /api/auth/login + GET /api/auth/me — page Login.tsx, AuthContext
- **Automatisation :** ✅ ui/accompagnateur.spec.ts

### TC-UI-101 — Connexion refusée avec mauvais mot de passe

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | validation | haute | partition d'équivalence (identifiants invalides) |

- **Préconditions :** Compte accompagnateur existant.
- **Données :** email=elafrit.mohamed@gmail.com, mot de passe=Faux123!
- **Étapes :**
  1. Ouvrir /connexion
  2. Saisir un mot de passe erroné
  3. Cliquer « Se connecter »
- **Résultat attendu :** POST /api/auth/login renvoie 401 ; un message d'erreur « Identifiants incorrects » s'affiche (form-error) ; aucune redirection.
- **Traçabilité :** (login) POST /api/auth/login — page Login.tsx
- **Automatisation :** ✅ ui/accompagnateur.spec.ts

### TC-UI-102 — Accès au tableau de bord interdit à un anonyme

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | acces | haute | test basé sur les rôles ; test du contrat (garde de route) |

- **Préconditions :** Aucune session active (déconnecté).
- **Données :** URL /tableau-de-bord
- **Étapes :**
  1. Sans être connecté, naviguer vers /tableau-de-bord
- **Résultat attendu :** Le garde Protected redirige vers /connexion (Navigate replace) ; le tableau de bord n'est pas rendu.
- **Traçabilité :** (—) Protected.tsx — route /tableau-de-bord (role=accompagnateur)
- **Automatisation :** ✅ ui/accompagnateur.spec.ts

### TC-UI-103 — Accès au tableau de bord interdit à un accompagné (mauvais rôle)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | acces | haute | test basé sur les rôles |

- **Préconditions :** Connecté en accompagné (afrit_mohamed@yahoo.fr / BoussoleDemo2026).
- **Données :** URL /tableau-de-bord
- **Étapes :**
  1. Se connecter en accompagné
  2. Naviguer vers /tableau-de-bord
- **Résultat attendu :** Protected détecte role ≠ accompagnateur et redirige vers /espace ; le tableau de bord n'est pas affiché.
- **Traçabilité :** (—) Protected.tsx role=accompagnateur — route /tableau-de-bord
- **Automatisation :** ✅ ui/accompagnateur.spec.ts

### TC-UI-104 — Tableau de bord : affichage des cartes d'accompagnés et statistiques

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test du contrat (forme de réponse) ; partition d'équivalence |

- **Préconditions :** Accompagnateur Mohamed connecté, possède des dossiers seedés.
- **Données :** —
- **Étapes :**
  1. Aller sur /tableau-de-bord
  2. Observer les cartes générées
- **Résultat attendu :** GET /api/entretien/dashboard 200 ; une carte par accompagné avec prénom/email, Questionnaire ✓/—, nb entretiens, nb comptes rendus, actions en cours (gras) ; bouton « Ouvrir le dossier » présent.
- **Traçabilité :** (—) GET /api/entretien/dashboard — Dashboard.tsx
- **Automatisation :** ✅ ui/accompagnateur.spec.ts

### TC-UI-105 — Tableau de bord : voyant signaux faibles affiché selon le niveau

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | table de décision (niveau→couleur/raison) ; test du contrat |

- **Préconditions :** Accompagnateur sans plan (feature signaux_faibles active) avec au moins un dossier.
- **Données :** —
- **Étapes :**
  1. Aller sur /tableau-de-bord
  2. Observer les pastilles colorées sur les cartes
  3. Survoler une pastille orange/rouge
- **Résultat attendu :** GET /api/pilotage/signaux 200 ; une pastille colorée (vert/orange/rouge) précède le nom ; aria-label et title listent les raisons ; pour orange/rouge la 1re raison s'affiche sous le titre.
- **Traçabilité :** (signaux_faibles) GET /api/pilotage/signaux — Dashboard.tsx
- **Automatisation :** ✅ ui/accompagnateur.spec.ts

### TC-UI-106 — Voyant signaux masqué quand la feature est absente de l'offre

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | acces | moyenne | test du contrat (gating front via useFeature) ; test basé sur l'offre |

- **Préconditions :** Accompagnateur sur un plan SANS signaux_faibles (ex. Découverte).
- **Données :** —
- **Étapes :**
  1. Aller sur /tableau-de-bord avec un plan limité
  2. Observer les cartes
- **Résultat attendu :** Aucun appel à /api/pilotage/signaux (signauxActifs=false) ; aucune pastille de signal n'est rendue ; le reste du tableau de bord fonctionne.
- **Traçabilité :** (signaux_faibles) GET /api/pilotage/signaux — Dashboard.tsx, FeaturesContext
- **Automatisation :** ⏳ à automatiser

### TC-UI-107 — Tableau d'impact : tuiles KPI affichées

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | test du contrat (champs typés) ; valeurs limites (0%, 100%, météo null→'—') |

- **Préconditions :** Accompagnateur sans plan (tableau_impact actif).
- **Données :** —
- **Étapes :**
  1. Aller sur /tableau-de-bord
  2. Observer la section « 📊 Tableau d'impact »
- **Résultat attendu :** GET /api/pilotage/impact 200 ; tuiles Parcours actifs, Progression moyenne %, Actions réalisées %, Entretiens menés, CR publiés, Évolution météo ; compteurs 🟢🟠🔴 et nb clôturés/synthèses.
- **Traçabilité :** (tableau_impact) GET /api/pilotage/impact — PilotageBoard.tsx
- **Automatisation :** ✅ ui/accompagnateur.spec.ts

### TC-UI-108 — Digest hebdomadaire : aperçu HTML et envoi par email

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | test du contrat ; test basé sur l'état (toggle aperçu) |

- **Préconditions :** Accompagnateur sans plan (digest_email actif).
- **Données :** —
- **Étapes :**
  1. Aller sur /tableau-de-bord
  2. Cliquer « Aperçu » dans la section Digest
  3. Cliquer « M'envoyer le digest »
- **Résultat attendu :** GET /api/pilotage/digest 200 (resume.alertes affiché) ; l'aperçu rend le HTML du digest ; POST /api/pilotage/digest/envoyer 200 → message « Digest envoyé à <email> ✓ ».
- **Traçabilité :** (digest_email) GET /api/pilotage/digest + POST /api/pilotage/digest/envoyer — PilotageBoard.tsx
- **Automatisation :** ✅ ui/accompagnateur.spec.ts

### TC-UI-109 — Section Pilotage entièrement masquée sans impact ni digest

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | acces | basse | test du contrat (gating combiné) ; table de décision (2 features → rendu) |

- **Préconditions :** Accompagnateur sur un plan sans tableau_impact ni digest_email.
- **Données :** —
- **Étapes :**
  1. Aller sur /tableau-de-bord avec ce plan
- **Résultat attendu :** PilotageBoard retourne null : aucune section impact/digest n'est rendue ; aucun appel /api/pilotage/impact ni /digest.
- **Traçabilité :** (tableau_impact, digest_email) — PilotageBoard.tsx
- **Automatisation :** ⏳ à automatiser

### TC-UI-110 — Filtrer les accompagnés par tag

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | partition d'équivalence (filtre actif / Tous) ; test basé sur l'état |

- **Préconditions :** Au moins un dossier possède un tag.
- **Données :** Tag existant à sélectionner
- **Étapes :**
  1. Aller sur /tableau-de-bord
  2. Choisir un tag dans le menu « Filtrer par tag »
  3. Revenir à « Tous »
- **Résultat attendu :** GET /api/tags 200 ; seules les cartes portant ce tag restent affichées ; « Tous » réaffiche l'ensemble ; si aucune carte, message « Aucun accompagné avec ce tag ».
- **Traçabilité :** (—) GET /api/tags — Dashboard.tsx (filtre client)
- **Automatisation :** ✅ ui/accompagnateur.spec.ts

### TC-UI-111 — Ajouter puis retirer un tag sur une carte d'accompagné

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | valeurs limites (libellé vide ignoré) ; test du contrat |

- **Préconditions :** Accompagnateur connecté avec au moins un dossier.
- **Données :** Nouveau tag : « priorité »
- **Étapes :**
  1. Sur une carte, saisir « priorité » dans le champ et valider (Entrée)
  2. Vérifier l'apparition du chip
  3. Cliquer « × » du chip pour le retirer
- **Résultat attendu :** POST /api/tags/dossier/:id 200 → le chip apparaît après rechargement ; DELETE /api/tags/dossier/:id/:tagId 200 → le chip disparaît. Champ vide n'envoie rien (addTag retourne tôt).
- **Traçabilité :** (—) POST/DELETE /api/tags/dossier — Dashboard.tsx
- **Automatisation :** ✅ ui/accompagnateur.spec.ts

### TC-UI-112 — Liens Bilan de pratique et Mutualisation visibles selon l'offre

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | acces | basse | table de décision (feature → lien) ; test basé sur l'offre |

- **Préconditions :** 1) Accompagnateur sans plan ; 2) Accompagnateur sur plan sans bilan_pratique ni mutualisation.
- **Données :** —
- **Étapes :**
  1. Cas 1 : aller sur /tableau-de-bord (sans plan)
  2. Cas 2 : aller sur /tableau-de-bord (plan limité)
- **Résultat attendu :** Cas 1 : les liens « 🪞 Bilan de ma pratique » et « 🤝 Mutualisation » sont présents. Cas 2 : ils sont absents (useFeature false).
- **Traçabilité :** (bilan_pratique, mutualisation) — Dashboard.tsx en-tête
- **Automatisation :** ✅ ui/accompagnateur.spec.ts

### TC-UI-113 — Ouvrir un dossier depuis le tableau de bord

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test du contrat (composition de la page) ; test basé sur les rôles |

- **Préconditions :** Accompagnateur connecté, dossier existant.
- **Données :** —
- **Étapes :**
  1. Sur une carte, cliquer « Ouvrir le dossier »
  2. Observer la page /dossier/:id
- **Résultat attendu :** Navigation vers /dossier/:id ; GET /api/dossiers/:id 200 ; titre = prénom/email + badge « En cours »/« Clôturé » ; boussole du parcours, timeline (questionnaire + entretiens), sections fil rouge/nuage/météo/roue/journal/plan d'action.
- **Traçabilité :** (—) GET /api/dossiers/:id — Dossier.tsx
- **Automatisation :** ✅ ui/accompagnateur.spec.ts

### TC-UI-114 — Dossier d'un autre accompagnateur introuvable (non-propriétaire)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | acces | haute | test basé sur les rôles (propriété de la ressource) |

- **Préconditions :** Connecté en accompagnateur Camille ; ID d'un dossier appartenant à Mohamed.
- **Données :** URL /dossier/<id_de_Mohamed>
- **Étapes :**
  1. Se connecter en Camille (camille.laurent@boussole.demo)
  2. Naviguer vers /dossier/<id_de_Mohamed>
- **Résultat attendu :** GET /api/dossiers/:id renvoie 404 (ressource d'un autre accompagnateur) ; la page reste en « Chargement… » / n'affiche pas le contenu du dossier d'autrui.
- **Traçabilité :** (—) GET /api/dossiers/:id — Dossier.tsx
- **Automatisation :** ✅ ui/accompagnateur.spec.ts

### TC-UI-115 — Démarrer un nouvel entretien guidé depuis le dossier

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test du contrat ; partition d'équivalence (nouvel entretien vs reprise) |

- **Préconditions :** Dossier en cours sans entretien en cours.
- **Données :** —
- **Étapes :**
  1. Sur /dossier/:id, cliquer « Nouvel entretien »
  2. Observer l'écran d'entretien (phase 1/6)
- **Résultat attendu :** Navigation /entretien?dossier=:id ; POST /api/entretien/sessions 200 (sessionId) ; GET /api/entretien/sessions/:id, /phases, /dossiers 200 ; affichage Phase 1/6, vigilance, questions à poser.
- **Traçabilité :** (entretien) POST /api/entretien/sessions — Entretien.tsx, Dossier.tsx
- **Automatisation :** ✅ ui/accompagnateur.spec.ts

### TC-UI-116 — Reprendre un entretien en cours et naviguer entre phases

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | valeurs limites (phase 0 → Précédent désactivé) ; test basé sur l'état |

- **Préconditions :** Dossier avec une session en_cours (phase_atteinte > 0).
- **Données :** —
- **Étapes :**
  1. Sur /dossier/:id, cliquer « Reprendre l'entretien en cours »
  2. Vérifier la phase ouverte et les notes pré-remplies
  3. Cliquer « Suivant → » puis « ← Précédent »
- **Résultat attendu :** La session reprend à phase_atteinte ; notes et questions par phase restaurées ; le changement de phase déclenche POST /reponses (saveCurrent) ; le bouton « Précédent » est désactivé en phase 1.
- **Traçabilité :** (entretien) GET /api/entretien/sessions/:id + POST /reponses — Entretien.tsx
- **Automatisation :** ✅ ui/accompagnateur.spec.ts

### TC-UI-117 — Ajouter, modifier et supprimer une question posée pendant l'entretien

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | valeurs limites (texte vide) ; test du contrat (CRUD) |

- **Préconditions :** Session d'entretien ouverte.
- **Données :** Question : « Qu'as-tu ressenti à ce moment-là ? »
- **Étapes :**
  1. Saisir la question et cliquer « ＋ Ajouter »
  2. Cliquer ✎ pour éditer le texte, modifier, valider ✓
  3. Saisir une réponse dans la zone de notes (blur)
  4. Cliquer × pour supprimer la question
- **Résultat attendu :** POST /questions 200 (la question apparaît) ; PATCH /questions/:qid {texte} 200 ; PATCH /questions/:qid {reponse} 200 au blur ; DELETE /questions/:qid 200 (retrait). Texte vide à l'édition garde l'éditeur ouvert (saveQTexte retourne tôt).
- **Traçabilité :** (entretien) POST/PATCH/DELETE /api/entretien/sessions/:id/questions — Entretien.tsx
- **Automatisation :** ✅ ui/accompagnateur.spec.ts

### TC-UI-118 — Co-pilote IA : demander des suggestions de questions (contrat)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test du contrat (champs présents/typés, non-vacuité) ; ne pas figer le texte IA |

- **Préconditions :** Session ouverte, feature copilote active, notes saisies dans la phase.
- **Données :** Notes phase : un paragraphe sur la difficulté de l'étudiant
- **Étapes :**
  1. Saisir des notes dans la zone de phase
  2. Cliquer « ✨ Suggestions de l'IA »
  3. Observer la réponse (typewriter)
- **Résultat attendu :** POST /api/entretien/suggestions 200 ; objet { questions: string[], reformulation: string|null, a_surveiller: string|null } ; questions non vide et typées ; affichage de l'ancrage théorique de la phase ; chaque suggestion offre ＋ ajouter / ✎ modifier. Le texte exact n'est pas figé.
- **Traçabilité :** (copilote) POST /api/entretien/suggestions — Entretien.tsx
- **Automatisation :** ✅ ui/accompagnateur.spec.ts

### TC-UI-119 — Co-pilote indisponible sur une offre sans la feature

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | acces | moyenne | test basé sur l'offre (requireFeature) ; gestion d'erreur |

- **Préconditions :** Accompagnateur sur un plan sans copilote.
- **Données :** —
- **Étapes :**
  1. Ouvrir un entretien
  2. Cliquer « ✨ Suggestions de l'IA »
- **Résultat attendu :** POST /api/entretien/suggestions renvoie 403 (requireFeature copilote) ; aucune suggestion n'est affichée ; l'app reste stable (busy retombe à false).
- **Traçabilité :** (copilote) POST /api/entretien/suggestions — Entretien.tsx
- **Automatisation :** ⏳ à automatiser

### TC-UI-120 — Banque de questions personnalisée : génération et insertion (contrat)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | test du contrat (structure, non-vacuité) ; test du repli à figer côté API |

- **Préconditions :** Session ouverte, feature banque_questions active.
- **Données :** —
- **Étapes :**
  1. Dans une phase, cliquer « ✨ Adapter les questions à cet étudiant »
  2. Cliquer une question proposée (perso) pour l'ajouter
  3. Cliquer ✎ pour la modifier avant ajout
- **Résultat attendu :** POST /api/emergence/dossier/:id/banque 200 ; objet banque (Record<phase, string[]>) non vide pour au moins une phase ; clic ＋ ajoute la question (POST /questions) ; ✎ recopie dans le champ de saisie. GET banque relue au chargement de session.
- **Traçabilité :** (banque_questions) GET/POST /api/emergence/dossier/:id/banque — Entretien.tsx
- **Automatisation :** ✅ ui/accompagnateur.spec.ts

### TC-UI-121 — Pause et reprise : « Reprendre plus tard » sauvegarde la phase

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | test basé sur l'état (persistance/relecture) |

- **Préconditions :** Session ouverte avec des notes saisies.
- **Données :** Notes en cours dans la phase
- **Étapes :**
  1. Saisir des notes
  2. Cliquer « 💾 Reprendre plus tard »
  3. Rouvrir l'entretien et vérifier les notes
- **Résultat attendu :** POST /reponses (saveCurrent) effectué ; navigation retour vers /dossier/:id ; à la réouverture, les notes de la phase sont restaurées.
- **Traçabilité :** (entretien) POST /api/entretien/sessions/:id/reponses — Entretien.tsx
- **Automatisation :** ✅ ui/accompagnateur.spec.ts

### TC-UI-122 — Clôturer l'entretien et générer le compte rendu (contrat IA)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test du contrat (génération + relecture) ; ne pas figer le texte IA |

- **Préconditions :** Session ouverte avec questions/réponses saisies, feature comptes_rendus active.
- **Données :** —
- **Étapes :**
  1. Cliquer « ✓ Clôturer & générer le CR »
  2. Sur l'écran « Entretien clôturé », cliquer « 📄 Ouvrir le compte rendu »
  3. Cliquer « ✨ Générer le compte rendu (IA) »
- **Résultat attendu :** POST /entretien/sessions/:id/cloturer 200 ; écran de clôture affiché ; POST /api/cr/generer 200 puis GET /api/cr/session/:sid renvoie cr avec contenu_html non vide, version=1, publie=0, badge « • Brouillon ». Texte non figé.
- **Traçabilité :** (comptes_rendus) POST /api/entretien/.../cloturer + POST /api/cr/generer — Entretien.tsx, CompteRenduModal.tsx
- **Automatisation :** ✅ ui/accompagnateur.spec.ts

### TC-UI-123 — Éditer, régénérer puis publier le compte rendu

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test du contrat (versionnement) ; test basé sur l'état (brouillon→publié) |

- **Préconditions :** Un CR brouillon existe sur une session du dossier.
- **Données :** Édition : ajout d'un paragraphe dans l'éditeur riche
- **Étapes :**
  1. Ouvrir le CR depuis la timeline du dossier (📄 Compte rendu)
  2. Cliquer « ✎ Éditer », modifier, « 💾 Enregistrer »
  3. Cliquer « ↻ Régénérer (IA) » et confirmer
  4. Cliquer « 📣 Publier »
- **Résultat attendu :** PATCH /api/cr/version/:id 200 (source devient 'édité') ; régénération POST /api/cr/generer crée une nouvelle version (historique > 1, sélecteur visible) ; POST /api/cr/version/:id/publier 200 → badge « ✓ Publié », message de confirmation.
- **Traçabilité :** (comptes_rendus) PATCH /api/cr/version/:id + POST .../publier — CompteRenduModal.tsx
- **Automatisation :** ✅ ui/accompagnateur.spec.ts

### TC-UI-124 — Historique du CR : consulter une version archivée en lecture seule

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | basse | test basé sur l'état (mode historique) ; test du contrat |

- **Préconditions :** Un CR ayant au moins 2 versions.
- **Données :** —
- **Étapes :**
  1. Ouvrir le CR
  2. Sélectionner une ancienne version dans « Historique »
- **Résultat attendu :** GET /api/cr/version/:id 200 ; le contenu de la version archivée s'affiche avec la mention « (version archivée, lecture seule) » ; pas de boutons Éditer/Publier en mode historique.
- **Traçabilité :** (comptes_rendus) GET /api/cr/version/:id — CompteRenduModal.tsx
- **Automatisation :** ✅ ui/accompagnateur.spec.ts

### TC-UI-125 — Discussion CR : échanger un message avec l'accompagné

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | test du contrat ; partition d'équivalence (message vide ignoré) |

- **Préconditions :** CR publié sur une session.
- **Données :** Message : « As-tu pu avancer sur l'action n°1 ? »
- **Étapes :**
  1. Ouvrir le CR publié
  2. Saisir un message dans « 💬 Échanges » et « Envoyer »
- **Résultat attendu :** POST /api/cr/session/:sid/messages 200 ; le message apparaît avec is_me=true ; GET /messages 200 recharge la liste ; auto-scroll vers le dernier message.
- **Traçabilité :** (comptes_rendus) GET/POST /api/cr/session/:sid/messages — CompteRenduModal.tsx
- **Automatisation :** ✅ ui/accompagnateur.spec.ts

### TC-UI-126 — Miroir réflexif : analyser ma posture sur un entretien (contrat IA + repli)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test du contrat (champs typés, gating) ; cas de repli déterministe (source='repli') |

- **Préconditions :** Entretien existant avec questions/notes, feature miroir active.
- **Données :** —
- **Étapes :**
  1. Sur la timeline, cliquer « 🪞 Analyser ma posture »
  2. Dans le modal, cliquer « ✨ Analyser ma posture »
- **Résultat attendu :** POST /api/miroir/session/:sid 200 ; objet { forces[], glissements[], synthese, scores[], note, source } ; badge « Analyse IA » ou « Analyse (repli) » selon source ; note/100 et zone (Émergent…Expert) affichées si présentes. GET /api/miroir/session/:sid relit. Texte non figé.
- **Traçabilité :** (miroir) GET/POST /api/miroir/session/:sid — MiroirReflexifModal.tsx
- **Automatisation :** ✅ ui/accompagnateur.spec.ts

### TC-UI-127 — Miroir : appliquer les scores proposés au brouillon de la grille

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | test du contrat ; persistance/relecture (vérif côté auto-évaluation) |

- **Préconditions :** Une analyse miroir avec des scores existe.
- **Données :** —
- **Étapes :**
  1. Ouvrir le miroir d'un entretien analysé
  2. Cliquer « ↳ Appliquer ces scores à ma grille »
- **Résultat attendu :** POST /api/miroir/session/:sid/appliquer 200 → { appliques: N } ; message « ✓ N indicateur(s) appliqué(s) au brouillon… » ; les scores se retrouvent en brouillon dans « Mon auto-évaluation ».
- **Traçabilité :** (miroir) POST /api/miroir/session/:sid/appliquer — MiroirReflexifModal.tsx
- **Automatisation :** ✅ ui/accompagnateur.spec.ts

### TC-UI-128 — Bouton Miroir absent sur une offre sans la feature

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | acces | basse | test basé sur l'offre (useFeature + requireFeature) |

- **Préconditions :** Accompagnateur sur un plan sans miroir.
- **Données :** —
- **Étapes :**
  1. Ouvrir un dossier
  2. Observer les boutons sous chaque entretien
- **Résultat attendu :** Le bouton « 🪞 Analyser ma posture » n'est pas rendu (miroirActif false) ; idem si l'API était appelée elle renverrait 403.
- **Traçabilité :** (miroir) — Dossier.tsx, MiroirReflexifModal.tsx
- **Automatisation :** ⏳ à automatiser

### TC-UI-129 — Débriefing à chaud : amorcer par l'IA puis enregistrer (contrat)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | test du contrat (amorçage non destructif) ; persistance/relecture |

- **Préconditions :** Entretien existant, feature debriefing active.
- **Données :** Réponses ajustées sur les 3 questions
- **Étapes :**
  1. Cliquer « 💬 Débriefing » sous un entretien
  2. Cliquer « ✨ Amorcer par l'IA »
  3. Ajuster une réponse et cliquer « Enregistrer »
- **Résultat attendu :** GET /reflexivite/debriefing/session/:sid 200 (questions[]) ; POST .../suggerer 200 { reponses[], source } remplit uniquement les champs vides ; POST .../session/:sid 200 → « Débriefing enregistré ✓ » ; relecture restaure les réponses.
- **Traçabilité :** (debriefing) GET/POST /api/reflexivite/debriefing/session/:sid(+/suggerer) — DebriefingModal.tsx
- **Automatisation :** ✅ ui/accompagnateur.spec.ts

### TC-UI-130 — Replay annoté : initialiser l'auto-confrontation et enregistrer (contrat)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | test du contrat ; valeurs limites (0 moment) ; persistance/relecture |

- **Préconditions :** Entretien comportant des questions enregistrées, feature replay_annote active.
- **Données :** Annotations ajustées sur 1-2 moments
- **Étapes :**
  1. Cliquer « 🎬 Replay annoté » sous un entretien
  2. Cliquer « ✨ Initialiser l'auto-confrontation (IA) »
  3. Ajuster une annotation et « Enregistrer »
- **Résultat attendu :** GET /reflexivite/replay/session/:sid 200 (moments[]) ; POST .../initialiser 200 amorce les annotations vides sans écraser les saisies ; POST .../session/:sid 200 → « Annotations enregistrées ✓ ». Si aucune question : message « rien à rejouer » et pas de boutons.
- **Traçabilité :** (replay_annote) GET/POST /api/reflexivite/replay/session/:sid(+/initialiser) — ReplayModal.tsx
- **Automatisation :** ✅ ui/accompagnateur.spec.ts

### TC-UI-131 — Synthèse du parcours : générer, éditer et publier (contrat IA)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test du contrat (génération+versionnement) ; ne pas figer le texte IA |

- **Préconditions :** Dossier avec entretiens, feature synthese active.
- **Données :** —
- **Étapes :**
  1. Sur /dossier/:id, cliquer « 📋 Synthèse du parcours »
  2. Cliquer « ✨ Générer la synthèse (IA) »
  3. Éditer puis « 💾 Enregistrer », puis « 📣 Publier »
- **Résultat attendu :** POST /api/synthese/generer 200 ; GET /api/synthese/dossier/:id renvoie doc avec contenu_html non vide ; PATCH /api/synthese/version/:id 200 ; POST .../publier 200 → badge « ✓ Publiée » ; la boussole du parcours passe synthese_publiee=true.
- **Traçabilité :** (synthese) POST /api/synthese/generer, PATCH /version/:id, POST /version/:id/publier — SyntheseModal.tsx
- **Automatisation :** ✅ ui/accompagnateur.spec.ts

### TC-UI-132 — Fil rouge du mémoire : faire émerger et partager (contrat IA)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | test du contrat ; test basé sur l'état (partage on/off) |

- **Préconditions :** Dossier ouvert, feature fil_rouge active.
- **Données :** —
- **Étapes :**
  1. Sur /dossier/:id, cliquer « ✨ Faire émerger le fil rouge »
  2. Cliquer « 📣 Partager avec l'accompagné »
  3. Cliquer à nouveau pour retirer le partage
- **Résultat attendu :** POST /api/emergence/dossier/:id/fil-rouge 200 { fil, axes[], explication, partage } ; PATCH .../partage {partage:1} 200 puis {partage:0} 200 ; le libellé du bouton bascule (Partager ↔ retirer). GET relit l'état. Texte non figé.
- **Traçabilité :** (fil_rouge) GET/POST /api/emergence/dossier/:id/fil-rouge + PATCH /partage — FilRougeCard.tsx
- **Automatisation :** ✅ ui/accompagnateur.spec.ts

### TC-UI-133 — Nuage de thèmes : génération et rendu pondéré (contrat IA)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | basse | test du contrat (structure, mapping poids→style) ; ne pas figer le texte IA |

- **Préconditions :** Dossier avec matière (questionnaire/CR/notes), feature nuage_themes active.
- **Données :** —
- **Étapes :**
  1. Sur /dossier/:id, cliquer « ✨ Générer le nuage » (section Nuage de thèmes)
- **Résultat attendu :** POST /api/viz/nuage/dossier/:id 200 { themes: [{mot, poids}] } non vide ; chaque mot rendu avec une taille proportionnelle au poids ; GET au chargement relit. Texte non figé.
- **Traçabilité :** (nuage_themes) GET/POST /api/viz/nuage/dossier/:id — NuageThemes.tsx
- **Automatisation :** ✅ ui/accompagnateur.spec.ts

### TC-UI-134 — Roue des émotions (vue accompagnateur) : climat agrégé en lecture seule

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | basse | test basé sur les rôles (lecture seule) ; valeurs limites (0 entrée) |

- **Préconditions :** Feature roue_emotions active ; l'accompagné a saisi des émotions (ou non).
- **Données :** —
- **Étapes :**
  1. Ouvrir /dossier/:id
  2. Observer la section « 🎡 Roue des émotions (climat de l'accompagné) »
- **Résultat attendu :** GET /api/viz/emotions/dossier/:id 200 ; côté accompagnateur (readOnly) : pas de sélecteur d'émotions, affichage de l'agrégat trié et des 6 derniers relevés ; si aucun relevé, message « L'accompagné n'a pas encore utilisé la roue ».
- **Traçabilité :** (roue_emotions) GET /api/viz/emotions/dossier/:id — RoueEmotions.tsx
- **Automatisation :** ✅ ui/accompagnateur.spec.ts

### TC-UI-135 — Plan d'action : ajouter, changer le statut et réordonner

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | test du contrat (CRUD + tri) ; valeurs limites (libellé vide) |

- **Préconditions :** Dossier en cours (non clôturé).
- **Données :** Action : « Préparer le plan de mémoire »
- **Étapes :**
  1. Saisir une action et cliquer « Ajouter »
  2. Changer son statut (à faire→en cours→fait)
  3. Glisser la poignée ⠿ pour réordonner
- **Résultat attendu :** POST /api/actions 200 (action ajoutée) ; PATCH /api/actions/:id {statut} 200 ; POST /api/actions/reorder 200 conserve le nouvel ordre après rechargement. Libellé vide n'envoie rien.
- **Traçabilité :** (plan_action) POST /api/actions, PATCH /api/actions/:id, POST /api/actions/reorder — Dossier.tsx, ActionList
- **Automatisation :** ✅ ui/accompagnateur.spec.ts

### TC-UI-136 — Formulaire d'action masqué quand le dossier est clôturé

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | validation | basse | table de décision (statut→UI) ; test basé sur l'état |

- **Préconditions :** Dossier clôturé.
- **Données :** —
- **Étapes :**
  1. Ouvrir un dossier clôturé
  2. Observer la section Plan d'action
- **Résultat attendu :** Le formulaire d'ajout d'action n'est pas rendu (cloture=true) ; la liste reste consultable ; la section Clôture affiche la synthèse finale et le bouton « Rouvrir le dossier ».
- **Traçabilité :** (plan_action) — Dossier.tsx (cloture)
- **Automatisation :** ✅ ui/accompagnateur.spec.ts

### TC-UI-137 — Clôturer puis rouvrir une démarche

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test basé sur l'état (en cours↔clôturé) ; test du contrat |

- **Préconditions :** Dossier en cours.
- **Données :** Synthèse finale : « Parcours mené à son terme, objectifs atteints. »
- **Étapes :**
  1. Saisir la synthèse finale dans la section Clôture
  2. Cliquer « Clôturer la démarche »
  3. Cliquer « Rouvrir le dossier »
- **Résultat attendu :** POST /api/dossiers/:id/cloturer 200 → badge « Clôturé », synthèse affichée en <pre>, boutons Export/Attestation conditionnels apparaissent ; POST /api/dossiers/:id/rouvrir 200 → badge « En cours », formulaire d'action réactivé.
- **Traçabilité :** (—) POST /api/dossiers/:id/cloturer + /rouvrir — Dossier.tsx
- **Automatisation :** ✅ ui/accompagnateur.spec.ts

### TC-UI-138 — Bilan de pratique : générer la synthèse réflexive globale (contrat IA + repli)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test du contrat (champs typés, non-vacuité) ; cas de repli heuristique (source='heuristique') |

- **Préconditions :** Accompagnateur connecté, feature bilan_pratique active, au moins quelques données (auto-évaluations / miroirs).
- **Données :** —
- **Étapes :**
  1. Aller sur /bilan-pratique
  2. Cliquer « ✨ Générer mon bilan »
  3. Observer le bilan et la ligne « Basé sur … »
- **Résultat attendu :** GET /api/reflexivite/bilan 200 { bilan, base } ; POST /api/reflexivite/bilan 200 → { forces[], axes[], evolution, synthese, conseils[], source } ; affichage des appuis/axes/évolution/prochains pas ; ligne « Basé sur N parcours · … ». Si source='heuristique', mention « Bilan généré sans IA ». Texte non figé.
- **Traçabilité :** (bilan_pratique) GET/POST /api/reflexivite/bilan — BilanPratique.tsx
- **Automatisation :** ✅ ui/accompagnateur.spec.ts

### TC-UI-139 — Accès /bilan-pratique refusé sans la feature (offre)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | acces | moyenne | test basé sur l'offre (requireFeature) ; gestion d'erreur |

- **Préconditions :** Accompagnateur sur un plan sans bilan_pratique.
- **Données :** URL /bilan-pratique
- **Étapes :**
  1. Naviguer directement vers /bilan-pratique
  2. Observer le chargement du bilan
- **Résultat attendu :** La route est accessible (role=accompagnateur) mais GET /api/reflexivite/bilan renvoie 403 (requireFeature) ; le bilan reste vide (catch silencieux) ; aucune donnée affichée. Côté tableau de bord, le lien d'entrée est d'ailleurs masqué.
- **Traçabilité :** (bilan_pratique) GET /api/reflexivite/bilan — BilanPratique.tsx
- **Automatisation :** ⏳ à automatiser

### TC-UI-140 — Mutualisation : partager une ressource et la voir dans la bibliothèque

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | test du contrat ; partition d'équivalence (types astuce/question/methode) |

- **Préconditions :** Accompagnateur connecté, feature mutualisation active.
- **Données :** titre=« Question ouverte d'entrée », type=question, contenu=« Comment vas-tu aborder… »
- **Étapes :**
  1. Aller sur /mutualisation
  2. Remplir le formulaire « Partager une ressource » et cliquer « Partager »
- **Résultat attendu :** POST /api/collab/ressources 200 → message « Ressource partagée ✓ » ; GET /api/collab/ressources recharge ; la ressource apparaît avec « par moi » et son type (❓/🧭/💡) ; compteur de bibliothèque incrémenté.
- **Traçabilité :** (mutualisation) GET/POST /api/collab/ressources — Mutualisation.tsx
- **Automatisation :** ✅ ui/accompagnateur.spec.ts

### TC-UI-141 — Mutualisation : champs requis (titre/contenu) bloquent la soumission

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | validation | moyenne | valeurs limites (champs vides) ; partition d'équivalence (valide/invalide) |

- **Préconditions :** Page /mutualisation ouverte.
- **Données :** Titre vide, contenu vide
- **Étapes :**
  1. Laisser le titre et le contenu vides
  2. Cliquer « Partager »
- **Résultat attendu :** Les champs HTML required empêchent l'envoi (contrôle natif) ; si contourné, POST /api/collab/ressources renvoie 400 (validation serveur) et le message d'erreur s'affiche.
- **Traçabilité :** (mutualisation) POST /api/collab/ressources — Mutualisation.tsx
- **Automatisation :** ✅ ui/accompagnateur.spec.ts

### TC-UI-142 — Mutualisation : rendre une ressource publique et copier le lien

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | test du contrat (génération token) ; test basé sur l'état (interne↔public) |

- **Préconditions :** Une ressource « mienne » existe (interne).
- **Données :** —
- **Étapes :**
  1. Cliquer « 🌐 Rendre public » sur sa ressource
  2. Cliquer « 🔗 Copier le lien »
  3. Ouvrir le lien /ressource/:token dans un onglet anonyme
- **Résultat attendu :** PATCH /api/collab/ressources/:id {public:true} 200 renvoie un token ; le lien public /ressource/:token est copié (message) ; la ressource porte « 🌐 public » ; le lien est consultable sans authentification.
- **Traçabilité :** (mutualisation) PATCH /api/collab/ressources/:id — Mutualisation.tsx, RessourcePublique
- **Automatisation :** ✅ ui/accompagnateur.spec.ts

### TC-UI-143 — Mutualisation : supprimer uniquement ses propres ressources

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | acces | moyenne | test basé sur les rôles (propriété) ; test du contrat |

- **Préconditions :** Bibliothèque contenant une ressource d'un autre accompagnateur et une ressource « mienne ».
- **Données :** —
- **Étapes :**
  1. Observer une ressource d'autrui
  2. Supprimer une ressource « mienne » (confirmation)
- **Résultat attendu :** Les boutons (public/supprimer) n'apparaissent que sur les ressources où mienne=true ; DELETE /api/collab/ressources/:id 200 sur la sienne (après confirm) la retire ; une suppression sur la ressource d'autrui serait refusée côté API (404/403).
- **Traçabilité :** (mutualisation) DELETE /api/collab/ressources/:id — Mutualisation.tsx
- **Automatisation :** ✅ ui/accompagnateur.spec.ts

### TC-UI-144 — Accès /mutualisation refusé à un accompagné (mauvais rôle)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | acces | moyenne | test basé sur les rôles |

- **Préconditions :** Connecté en accompagné.
- **Données :** URL /mutualisation
- **Étapes :**
  1. Naviguer vers /mutualisation en accompagné
- **Résultat attendu :** Protected role=accompagnateur redirige vers /espace ; la page n'est pas rendue. Côté API, /api/collab/ressources renverrait 403.
- **Traçabilité :** (mutualisation) — Protected.tsx, route /mutualisation
- **Automatisation :** ✅ ui/accompagnateur.spec.ts

### TC-UI-145 — Export PDF complet du dossier (contrat + impression)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | test du contrat (sections conditionnelles) ; test basé sur l'offre |

- **Préconditions :** Dossier avec questionnaire/CR/synthèse/actions ; feature export_pdf active.
- **Données :** —
- **Étapes :**
  1. Sur /dossier/:id, cliquer « 📄 Export PDF complet »
  2. Vérifier les sections assemblées
  3. Cliquer « 🖨️ Imprimer / enregistrer en PDF »
- **Résultat attendu :** GET /api/confort/export/dossier/:id 200 ; le document assemble en-tête (accompagné, statut), questionnaire, synthèse, comptes rendus (n), plan d'action, bilan/grille si note ; bouton d'impression actif quand data chargée ; window.print() ouvre la boîte d'impression.
- **Traçabilité :** (export_pdf) GET /api/confort/export/dossier/:id — ExportDossierModal.tsx, Dossier.tsx
- **Automatisation :** ✅ ui/accompagnateur.spec.ts

### TC-UI-146 — Export PDF indisponible sans la feature (bouton masqué / 403)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | acces | basse | test basé sur l'offre (useFeature + requireFeature) |

- **Préconditions :** Accompagnateur sur un plan sans export_pdf.
- **Données :** —
- **Étapes :**
  1. Ouvrir un dossier
  2. Chercher le bouton « 📄 Export PDF complet »
- **Résultat attendu :** Le bouton n'est pas rendu (exportActif false) ; un appel direct GET /api/confort/export/dossier/:id renverrait 403 (requireFeature export_pdf).
- **Traçabilité :** (export_pdf) — Dossier.tsx, ExportDossierModal.tsx
- **Automatisation :** ⏳ à automatiser

### TC-UI-147 — Attestation de fin : délivrée uniquement sur un dossier clôturé

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test du contrat (champs présents, formatage date) ; table de décision (statut→bouton) |

- **Préconditions :** Dossier clôturé ; feature attestation active.
- **Données :** —
- **Étapes :**
  1. Ouvrir un dossier clôturé
  2. Cliquer « 📜 Délivrer l'attestation »
  3. Vérifier le contenu puis « 🖨️ Imprimer / enregistrer en PDF »
- **Résultat attendu :** GET /api/ethique/attestation/dossier/:id 200 { accompagne, accompagnateur, debut, fin, nb_entretiens, nb_comptes_rendus } ; le document affiche le nom de l'accompagné, la période formatée jj/mm/aaaa, les compteurs et la signature ; impression possible.
- **Traçabilité :** (attestation) GET /api/ethique/attestation/dossier/:id — AttestationModal.tsx, Dossier.tsx
- **Automatisation :** ✅ ui/accompagnateur.spec.ts

### TC-UI-148 — Bouton Attestation absent tant que le dossier n'est pas clôturé

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | validation | moyenne | table de décision (cloture × feature → bouton) ; valeurs limites |

- **Préconditions :** Dossier en cours ; feature attestation active.
- **Données :** —
- **Étapes :**
  1. Ouvrir un dossier EN COURS
  2. Chercher le bouton « 📜 Délivrer l'attestation »
- **Résultat attendu :** Le bouton n'apparaît pas (condition attestationActif && cloture) ; il n'apparaît qu'après clôture. L'API attestation refuserait/serait incohérente sur un dossier non clôturé.
- **Traçabilité :** (attestation) — Dossier.tsx (cloture)
- **Automatisation :** ✅ ui/accompagnateur.spec.ts

### TC-UI-149 — Visio : rejoindre la salle depuis un rendez-vous du dossier

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | test du contrat ; test basé sur l'offre |

- **Préconditions :** Dossier avec au moins un rdv ; feature visio active.
- **Données :** —
- **Étapes :**
  1. Sur /dossier/:id, dans la section Rendez-vous, cliquer « 🎥 Visio »
- **Résultat attendu :** GET /api/confort/visio/rdv/:id 200 { url } ; un nouvel onglet s'ouvre sur l'URL de la salle (window.open noopener). En l'absence de feature, le bouton n'est pas rendu (VisioButton retourne null).
- **Traçabilité :** (visio) GET /api/confort/visio/rdv/:id — VisioButton.tsx, Dossier.tsx
- **Automatisation :** ✅ ui/accompagnateur.spec.ts

### TC-UI-150 — Rendez-vous : télécharger le fichier ICS pour l'agenda

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | basse | test du contrat (téléchargement ICS) |

- **Préconditions :** Dossier avec un rdv.
- **Données :** —
- **Étapes :**
  1. Sur /dossier/:id, cliquer l'icône 📅 d'un rendez-vous
- **Résultat attendu :** GET /api/rdv/:id/ics 200 ; un fichier .ics est servi (Content-Type text/calendar) avec le créneau du rendez-vous ; l'aria-label décrit la date.
- **Traçabilité :** (rdv) GET /api/rdv/:id/ics — Dossier.tsx (rdv-ics)
- **Automatisation :** ✅ ui/accompagnateur.spec.ts

### TC-UI-151 — Boussole du parcours : progression reflétant l'état du dossier

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | basse | test du contrat (calcul d'agrégats front) ; valeurs limites (0 entretien → phaseMax=-1) |

- **Préconditions :** Dossier avec questionnaire complété, ≥1 entretien, ≥1 CR publié, synthèse publiée.
- **Données :** —
- **Étapes :**
  1. Ouvrir /dossier/:id
  2. Observer la BoussoleParcours en haut
- **Résultat attendu :** La boussole reçoit phaseMax (max phases atteintes), questionnaire=true, nb entretiens, crPublies (somme des CR publiés), synthesePubliee, cloture ; l'avancement visuel correspond à ces valeurs dérivées des sessions.
- **Traçabilité :** (boussole) GET /api/dossiers/:id — Dossier.tsx, BoussoleParcours
- **Automatisation :** ✅ ui/accompagnateur.spec.ts

### TC-UI-152 — Consulter le détail du questionnaire et d'un entretien depuis la timeline

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | basse | test du contrat ; table de décision (complété / non complété) |

- **Préconditions :** Dossier dont le questionnaire est complété et comportant ≥1 entretien.
- **Données :** —
- **Étapes :**
  1. Sur /dossier/:id, cliquer « 🔎 Questions & réponses » du questionnaire
  2. Cliquer « 🔎 Questions & réponses » d'un entretien
- **Résultat attendu :** Le modal questionnaire affiche récap/contenu/date de complétion ; le modal entretien charge les questions/réponses de la session. Si le questionnaire n'est pas complété, le bloc affiche « Pas encore complété par l'accompagné ».
- **Traçabilité :** (questionnaire) — Dossier.tsx, QuestionnaireDetailModal, EntretienDetailModal
- **Automatisation :** ✅ ui/accompagnateur.spec.ts

### TC-UI-153 — Session expirée pendant la navigation accompagnateur

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | acces | moyenne | test basé sur les rôles (authentification) ; gestion d'erreur |

- **Préconditions :** Accompagnateur connecté puis cookie/JWT invalidé (expiré ou supprimé).
- **Données :** —
- **Étapes :**
  1. Être sur /tableau-de-bord
  2. Invalider la session (supprimer le cookie)
  3. Déclencher une action appelant l'API (recharger, ouvrir un dossier)
- **Résultat attendu :** Les appels protégés renvoient 401 (Non authentifié / Session invalide) ; l'app gère l'erreur sans planter ; la navigation vers une route Protected redirige vers /connexion.
- **Traçabilité :** (—) requireAuth (401) — Protected.tsx, AuthContext
- **Automatisation :** ⏳ à automatiser

### TC-UI-154 — Repli déterministe du bilan de pratique sans IA (unitaire)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | moyenne | test du contrat (repli déterministe) ; partition d'équivalence (avec/sans données) |

- **Préconditions :** Provider IA indisponible ou clé absente côté API (reflexivite.ts) ; données d'accompagnement présentes.
- **Données :** Auto-évaluations/miroirs/indicateurs renseignés
- **Étapes :**
  1. Appeler la fonction de génération de bilan en forçant l'absence d'IA
  2. Inspecter l'objet retourné
- **Résultat attendu :** La fonction de repli renvoie un bilan complet et déterministe avec source='heuristique' : forces[], axes[], synthese non vide, conseils[] ; les agrégats (nbDossiers, nbEntretiens, miroirs, indicateurs) sont cohérents avec les données. Aucun appel réseau IA.
- **Traçabilité :** (bilan_pratique) POST /api/reflexivite/bilan (branche repli) — reflexivite.ts
- **Automatisation :** ⏳ à automatiser

### TC-UI-155 — Repli déterministe de l'analyse miroir sans IA (unitaire)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | moyenne | test du contrat (repli déterministe, bornes) ; valeurs limites (note 0..100) |

- **Préconditions :** Provider IA indisponible côté API (miroir.ts) ; entretien avec questions/notes.
- **Données :** Une session d'entretien renseignée
- **Étapes :**
  1. Déclencher la génération du miroir en forçant l'absence d'IA
  2. Inspecter l'objet analyse retourné
- **Résultat attendu :** L'analyse de repli est cohérente : source='repli', forces[]/glissements[] structurés (principe/observation), synthese non vide, scores[] avec indicateurs valides et note ∈ [0,100] ou null. Persistée et relisible via GET /miroir/session/:sid.
- **Traçabilité :** (miroir) POST /api/miroir/session/:sid (branche repli) — miroir.ts
- **Automatisation :** ⏳ à automatiser

### TC-UI-156 — sanitizeKeys filtre les clés de features inconnues (unitaire)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | validation | basse | partition d'équivalence (valide/invalide) ; valeurs limites (vide, non-tableau, doublons) |

- **Préconditions :** —
- **Données :** ['miroir','inconnue','miroir', 42, null, 'export_pdf']
- **Étapes :**
  1. Appeler sanitizeKeys avec l'entrée mixte (valides, doublons, invalides, non-tableau)
- **Résultat attendu :** Renvoie un tableau dédupliqué ne contenant que les clés valides ('miroir','export_pdf') ; une entrée non-tableau renvoie [] ; sert de base au gating front/serveur du domaine accompagnateur.
- **Traçabilité :** (—) sanitizeKeys — features.ts
- **Automatisation :** ⏳ à automatiser

### TC-UI-157 — parseTags décode la chaîne tags du tableau de bord (unitaire)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | validation | basse | valeurs limites (null, nom contenant le séparateur) ; partition d'équivalence |

- **Préconditions :** —
- **Données :** '12|priorité,7|à relancer,3|tag|avec|pipe' et null
- **Étapes :**
  1. Appeler parseTags avec une chaîne id|nom séparée par des virgules
  2. Appeler parseTags(null)
- **Résultat attendu :** Renvoie [{id:12,nom:'priorité'},{id:7,nom:'à relancer'},{id:3,nom:'tag|avec|pipe'}] (le nom conserve les pipes via rest.join) ; parseTags(null) renvoie [].
- **Traçabilité :** (—) parseTags — Dashboard.tsx
- **Automatisation :** ⏳ à automatiser

### TC-UI-158 — userFeatures : aucun plan = accès à toutes les fonctionnalités (unitaire)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | acces | moyenne | test basé sur l'offre ; table de décision (plan présent/absent) |

- **Préconditions :** Utilisateur accompagnateur sans plan_id (cas par défaut des comptes démo).
- **Données :** userId d'un accompagnateur sans plan
- **Étapes :**
  1. Appeler userFeatures(userId) pour un compte sans plan
  2. Appeler userFeatures(userId) pour un compte sur plan « Découverte »
- **Résultat attendu :** Sans plan : renvoie l'ensemble ALL_FEATURE_KEYS (tout activé), ce qui explique pourquoi les comptes démo voient miroir/bilan/mutualisation/export. Sur un plan : renvoie seulement les clés de features du plan ; les middlewares requireFeature en découlent (200 vs 403).
- **Traçabilité :** (—) userFeatures + requireFeature — features.ts
- **Automatisation :** ⏳ à automatiser

## Domaine UI_ACP — 72 cas

**Endpoints couverts :**

- `POST /api/auth/login` · feature: `-` · rôle: anonyme — Connexion (page Login) ; redirige vers /espace
- `GET /api/auth/me/features` · feature: `-` · rôle: authentifié — Liste des fonctionnalités actives (gating UI)
- `GET /api/dossiers/mine` · feature: `multi_parcours` · rôle: accompagne — Liste des parcours de l'accompagné (MesParcours / Espace)
- `GET /api/dossiers/accompagnateurs` · feature: `multi_parcours` · rôle: accompagne — Accompagnateurs disponibles (NouveauParcours)
- `POST /api/dossiers/start` · feature: `multi_parcours` · rôle: accompagne — Démarrer un nouveau parcours
- `GET /api/dossiers/mine/:id` · feature: `multi_parcours` · rôle: accompagne — Détail d'un parcours (ParcoursDetail)
- `POST /api/questionnaire/next` · feature: `questionnaire` · rôle: accompagne — Question suivante du questionnaire (IA)
- `POST /api/questionnaire/save` · feature: `questionnaire` · rôle: accompagne — Enregistrer le questionnaire
- `GET /api/rdv/disponibles?dossierId=:id` · feature: `rdv` · rôle: accompagne — Créneaux réservables (ParcoursDetail)
- `POST /api/rdv/reserver` · feature: `rdv` · rôle: accompagne — Réserver un créneau
- `POST /api/rdv/demander` · feature: `rdv` · rôle: accompagne — Demander un rendez-vous (aucun créneau)
- `GET /api/rdv/:id/ics` · feature: `rdv` · rôle: accompagne — Export ICS d'un RDV
- `GET /api/cr/mine` · feature: `comptes_rendus` · rôle: accompagne — Comptes rendus de l'accompagné (ComptesRendus)
- `GET /api/cr/session/:id` · feature: `comptes_rendus` · rôle: accompagne — CR d'une session (CompteRenduModal)
- `GET /api/cr/session/:id/messages` · feature: `comptes_rendus` · rôle: accompagne — Discussion du CR
- `POST /api/cr/session/:id/messages` · feature: `comptes_rendus` · rôle: accompagne — Envoyer un message sur le CR
- `GET /api/synthese/dossier/:id` · feature: `synthese` · rôle: accompagne — Synthèse du parcours (SyntheseModal)
- `GET /api/synthese/dossier/:id/messages` · feature: `synthese` · rôle: accompagne — Discussion de la synthèse
- `POST /api/synthese/dossier/:id/messages` · feature: `synthese` · rôle: accompagne — Envoyer un message sur la synthèse
- `POST /api/adoption/falc` · feature: `falc` · rôle: accompagne — Reformulation FALC (bouton Facile à lire) + repli déterministe
- `GET /api/collab/resume/dossier/:id` · feature: `resume_parcours` · rôle: accompagne — Résumé 'où j'en suis' existant
- `POST /api/collab/resume/dossier/:id` · feature: `resume_parcours` · rôle: accompagne — Générer/MAJ le résumé (IA)
- `GET /api/collab/problematisation/dossier/:id` · feature: `problematisation` · rôle: accompagne — Questions + données de problématisation
- `POST /api/collab/problematisation/dossier/:id/suggerer` · feature: `problematisation` · rôle: accompagne — Suggérer une problématique (IA)
- `POST /api/collab/problematisation/dossier/:id` · feature: `problematisation` · rôle: accompagne — Enregistrer réponses + problématique
- `GET /api/relationnel/meteo/dossier/:id` · feature: `meteo` · rôle: accompagne — Météo (mine/autre)
- `POST /api/relationnel/meteo` · feature: `meteo` · rôle: accompagne — Enregistrer un relevé de météo
- `GET /api/viz/emotions/dossier/:id` · feature: `roue_emotions` · rôle: accompagne — Roue des émotions (entries + agrégat)
- `POST /api/viz/emotions/dossier/:id` · feature: `roue_emotions` · rôle: accompagne — Enregistrer des émotions
- `GET /api/viz/nuage/dossier/:id` · feature: `nuage_themes` · rôle: accompagne — Nuage de thèmes existant
- `POST /api/viz/nuage/dossier/:id` · feature: `nuage_themes` · rôle: accompagne — Générer le nuage de thèmes (IA)
- `GET /api/relationnel/journal/dossier/:id` · feature: `journal` · rôle: accompagne — Micro-journal (entrées)
- `POST /api/relationnel/journal` · feature: `journal` · rôle: accompagne — Ajouter une note de journal
- `PATCH /api/relationnel/journal/:id` · feature: `journal` · rôle: accompagne — Basculer privé/partagé une note
- `DELETE /api/relationnel/journal/:id` · feature: `journal` · rôle: accompagne — Supprimer une note de journal
- `GET /api/emergence/mine/dossier/:id` · feature: `fil_rouge` · rôle: accompagne — Fil rouge + moments-clés partagés (EmergencePartage / Carte)
- `GET /api/transparence/dossier/:id` · feature: `transparence` · rôle: accompagne — Tableau de transparence RGPD
- `POST /api/transparence/effacement` · feature: `transparence` · rôle: accompagne — Demande d'effacement RGPD
- `GET /api/ethique/attestation/dossier/:id` · feature: `attestation` · rôle: accompagne — Attestation de fin (parcours clôturé)
- `GET /api/confort/visio/rdv/:id` · feature: `visio` · rôle: accompagne — URL de la salle de visio (Jitsi)
- `GET /api/actions/mine` · feature: `plan_action` · rôle: accompagne — Plan d'action de l'accompagné (MonPlanAction)
- `POST /api/actions` · feature: `plan_action` · rôle: accompagne — Ajouter une action
- `PATCH /api/actions/:id` · feature: `plan_action` · rôle: accompagne — Changer le statut d'une action
- `POST /api/actions/reorder` · feature: `plan_action` · rôle: accompagne — Réordonner les actions

### TC-UI-201 — Connexion accompagné réussie et redirection vers Mon espace

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | partition d'équivalence (identifiants valides), test du contrat (flux login→/espace) |

- **Préconditions :** App ouverte sur /connexion ; compte accompagné Amine (afrit_mohamed@yahoo.fr / BoussoleDemo2026) actif.
- **Données :** email=afrit_mohamed@yahoo.fr ; password=BoussoleDemo2026
- **Étapes :**
  1. Ouvrir http://localhost:8080/connexion
  2. Saisir l'email et le mot de passe
  3. Cliquer « Se connecter »
- **Résultat attendu :** POST /auth/login en succès, refresh du contexte auth, navigation vers /espace ; le titre « Bonjour Amine » et la section « Mes parcours » s'affichent.
- **Traçabilité :** Login.tsx + POST /auth/login ; Espace.tsx
- **Automatisation :** ✅ ui/accompagne.spec.ts

### TC-UI-202 — Connexion avec mauvais mot de passe : message d'erreur, pas de redirection

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | validation | haute | partition d'équivalence (classe invalide), test du contrat (gestion d'erreur api()) |

- **Préconditions :** Page /connexion.
- **Données :** email=afrit_mohamed@yahoo.fr ; password=MAUVAIS
- **Étapes :**
  1. Saisir un email valide et un mot de passe incorrect
  2. Cliquer « Se connecter »
- **Résultat attendu :** Le composant reste sur /connexion ; un bloc .form-error affiche le message d'erreur renvoyé par l'API ; le bouton repasse de « … » à « Se connecter ».
- **Traçabilité :** Login.tsx + POST /auth/login
- **Automatisation :** ✅ ui/accompagne.spec.ts

### TC-UI-203 — Accès direct à /espace sans session : redirection vers /connexion

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | acces | haute | test basé sur les rôles (anonyme) |

- **Préconditions :** Aucune session (cookie supprimé / navigation privée).
- **Données :** URL=/espace
- **Étapes :**
  1. Ouvrir directement http://localhost:8080/espace
- **Résultat attendu :** Protected détecte user=null et redirige (Navigate replace) vers /connexion.
- **Traçabilité :** Protected.tsx (espace)
- **Automatisation :** ✅ ui/accompagne.spec.ts

### TC-UI-204 — Accompagnateur tente d'ouvrir une route réservée à l'accompagné : redirection /espace

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | acces | haute | test basé sur les rôles (mauvais rôle) |

- **Préconditions :** Connecté en accompagnateur (camille.laurent@boussole.demo).
- **Données :** URL=/parcours/1 ; URL=/questionnaire ; URL=/mon-plan-action
- **Étapes :**
  1. Se connecter en accompagnateur
  2. Ouvrir directement /parcours/1 (role accompagne requis)
- **Résultat attendu :** Protected role='accompagne' avec user.role='accompagnateur' → Navigate replace vers /espace ; le parcours n'est pas affiché.
- **Traçabilité :** Protected.tsx (parcours/questionnaire/mon-plan-action)
- **Automatisation :** ✅ ui/accompagne.spec.ts

### TC-UI-205 — Mon espace accompagné : liste des parcours avec badges d'avancement

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test du contrat (forme de réponse → rendu) |

- **Préconditions :** Connecté en accompagné Amine ayant au moins 1 parcours seedé.
- **Données :** -
- **Étapes :**
  1. Aller sur /espace
  2. Observer la section « Mes parcours »
- **Résultat attendu :** GET /dossiers/mine peuple les cartes ; chaque carte affiche titre, accompagnateur, statut (En cours/Clôturé) et badges (Questionnaire ✓/à faire, N comptes rendus, Synthèse ✓) ; bouton « Ouvrir le parcours ».
- **Traçabilité :** MesParcours.tsx + GET /dossiers/mine
- **Automatisation :** ✅ ui/accompagne.spec.ts

### TC-UI-206 — Espace sans parcours : message d'invitation à démarrer

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | valeurs limites (liste vide) |

- **Préconditions :** Compte accompagné neuf, 0 parcours.
- **Données :** GET /dossiers/mine → { dossiers: [] }
- **Étapes :**
  1. Se connecter avec un accompagné sans parcours
  2. Aller sur /espace
- **Résultat attendu :** Après chargement (loaded=true) et dossiers vide, le texte « Tu n'as pas encore de parcours… » s'affiche ; le bouton « + Démarrer un nouveau parcours » reste présent.
- **Traçabilité :** MesParcours.tsx (état vide)
- **Automatisation :** ⏳ à automatiser

### TC-UI-207 — Démarrer un nouveau parcours et enchaîner sur le questionnaire

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test du contrat (start→navigation), partition d'équivalence (saisie valide) |

- **Préconditions :** Connecté en accompagné ; au moins un accompagnateur disponible.
- **Données :** titre='Mémoire — test E2E' ; accompagnateur=premier de la liste
- **Étapes :**
  1. /espace → « + Démarrer un nouveau parcours »
  2. Saisir un titre
  3. Vérifier qu'un accompagnateur est présélectionné
  4. Cliquer « Démarrer et remplir le questionnaire »
- **Résultat attendu :** GET /dossiers/accompagnateurs préremplit le select ; POST /dossiers/start renvoie dossierId ; navigation vers /questionnaire?dossier=<id>.
- **Traçabilité :** NouveauParcours.tsx + GET /dossiers/accompagnateurs + POST /dossiers/start
- **Automatisation :** ✅ ui/accompagne.spec.ts

### TC-UI-208 — Nouveau parcours : titre manquant bloque la soumission

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | validation | moyenne | valeurs limites (chaîne vide/espaces) |

- **Préconditions :** Page /nouveau-parcours, accompagnateur sélectionné.
- **Données :** titre='   ' (vide après trim)
- **Étapes :**
  1. Laisser le titre vide
  2. Cliquer « Démarrer et remplir le questionnaire »
- **Résultat attendu :** Aucun appel POST /dossiers/start ; message .form-error « Renseigne un titre et choisis un accompagnateur. ».
- **Traçabilité :** NouveauParcours.tsx (garde titre.trim())
- **Automatisation :** ✅ ui/accompagne.spec.ts

### TC-UI-209 — Nouveau parcours : aucun accompagnateur disponible désactive le bouton

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | validation | basse | valeurs limites (collection vide), table de décision |

- **Préconditions :** GET /dossiers/accompagnateurs renvoie liste vide.
- **Données :** accompagnateurs=[]
- **Étapes :**
  1. Ouvrir /nouveau-parcours dans un contexte sans accompagnateur
- **Résultat attendu :** Le select affiche « Aucun accompagnateur disponible » ; le bouton « Démarrer… » est désactivé (disabled).
- **Traçabilité :** NouveauParcours.tsx (accs.length===0)
- **Automatisation :** ✅ ui/accompagne.spec.ts

### TC-UI-210 — Questionnaire adaptatif : enchaîner questions et propositions jusqu'au récapitulatif

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test du contrat (forme de Step), partition d'équivalence (proposition vs saisie) |

- **Préconditions :** Connecté en accompagné ; /questionnaire?dossier=<id>.
- **Données :** Réponses libres + clic sur propositions
- **Étapes :**
  1. Ouvrir /questionnaire?dossier=<id>
  2. Observer l'indicateur IA pendant le chargement
  3. Répondre via une proposition puis via le champ libre + « Envoyer »
  4. Répéter jusqu'à step.termine
- **Résultat attendu :** POST /questionnaire/next renvoie {question, propositions[], termine, recapitulatif} ; l'historique Q/R s'empile ; AiProgress visible pendant busy ; à termine=true, le bloc Récapitulatif s'affiche.
- **Traçabilité :** Questionnaire.tsx + POST /questionnaire/next
- **Automatisation :** ✅ ui/accompagne.spec.ts

### TC-UI-211 — Questionnaire : réponse vide n'envoie rien

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | validation | moyenne | valeurs limites (entrée vide) |

- **Préconditions :** Une question active affichée (step non terminé).
- **Données :** answer='   '
- **Étapes :**
  1. Laisser le champ réponse vide
  2. Cliquer « Envoyer » (submit)
- **Résultat attendu :** submit() retourne immédiatement (garde !ans.trim()) ; pas d'appel /questionnaire/next supplémentaire ; l'historique n'évolue pas.
- **Traçabilité :** Questionnaire.tsx (submit garde)
- **Automatisation :** ✅ ui/accompagne.spec.ts

### TC-UI-212 — Questionnaire : enregistrement et redirection vers le parcours

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test du contrat (save→navigation), table de décision (avec/sans dossierId) |

- **Préconditions :** step.termine=true avec récapitulatif ; dossierId présent en query.
- **Données :** dossier=<id>
- **Étapes :**
  1. Atteindre le récapitulatif
  2. Cliquer « Valider et enregistrer »
  3. Cliquer « Voir mon parcours »
- **Résultat attendu :** POST /questionnaire/save avec {history, recapitulatif, dossierId} ; message succès affiché ; le bouton mène vers /parcours/<id> (ou /espace si pas de dossier).
- **Traçabilité :** Questionnaire.tsx + POST /questionnaire/save
- **Automatisation :** ✅ ui/accompagne.spec.ts

### TC-UI-213 — Détail parcours : chargement complet de toutes les sections

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test du contrat (Detail→rendu) |

- **Préconditions :** Connecté en accompagné Amine, parcours pré-rempli (questionnaire, CR, synthèse publiée seedés).
- **Données :** /parcours/<id d'Amine>
- **Étapes :**
  1. Ouvrir /parcours/<id>
  2. Faire défiler toute la page
- **Résultat attendu :** GET /dossiers/mine/:id alimente l'en-tête (titre, accompagnateur, statut) et la Boussole ; les sections Résumé, Problématique, Émergence, Nuage, Météo, Roue, Questionnaire, RDV, Comptes rendus, Synthèse, Micro-journal, Plan d'action sont rendues sans erreur.
- **Traçabilité :** ParcoursDetail.tsx + GET /dossiers/mine/:id
- **Automatisation :** ✅ ui/accompagne.spec.ts

### TC-UI-214 — Détail parcours d'un autre accompagné : non trouvé / chargement impossible

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | acces | haute | test basé sur les rôles (non-propriétaire / 404), test du contrat (gestion erreur) |

- **Préconditions :** Connecté en accompagné Léa ; <id> appartient à Amine.
- **Données :** /parcours/<id d'Amine>
- **Étapes :**
  1. Forcer l'URL /parcours/<id d'un autre accompagné>
- **Résultat attendu :** GET /dossiers/mine/:id renvoie 404 (non-propriétaire) ; le catch affiche « Chargement impossible. » ; aucune donnée du parcours d'autrui n'est exposée.
- **Traçabilité :** ParcoursDetail.tsx load() + GET /dossiers/mine/:id
- **Automatisation :** ✅ ui/accompagne.spec.ts

### TC-UI-215 — Réserver un créneau de rendez-vous

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test du contrat (réservation), table de décision (créneaux>0) |

- **Préconditions :** L'accompagnateur du parcours a publié au moins un créneau libre.
- **Données :** creneauId du premier slot
- **Étapes :**
  1. Ouvrir /parcours/<id>
  2. Section Rendez-vous → « Réserver » sur un créneau
- **Résultat attendu :** POST /rdv/reserver {creneauId, dossierId} en succès ; message « Rendez-vous réservé ✅ » ; rechargement : le RDV apparaît dans la liste, le créneau disparaît des disponibles.
- **Traçabilité :** ParcoursDetail.tsx reserver() + POST /rdv/reserver + GET /rdv/disponibles
- **Automatisation :** ✅ ui/accompagne.spec.ts

### TC-UI-216 — Réservation en conflit (créneau déjà pris) : message d'erreur

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | validation | moyenne | test du contrat (gestion 4xx/409) |

- **Préconditions :** Un créneau réservé entre l'affichage et le clic (course / 409).
- **Données :** creneauId obsolète
- **Étapes :**
  1. Cliquer « Réserver » sur un créneau devenu indisponible
- **Résultat attendu :** POST /rdv/reserver renvoie une erreur (4xx) ; le message d'erreur de l'API s'affiche en .form-error ; pas de RDV ajouté.
- **Traçabilité :** ParcoursDetail.tsx reserver() catch + POST /rdv/reserver
- **Automatisation :** ⏳ à automatiser

### TC-UI-217 — Aucun créneau disponible : demander un rendez-vous

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | table de décision (créneaux=0) |

- **Préconditions :** L'accompagnateur n'a aucun créneau libre (creneaux=[]).
- **Données :** -
- **Étapes :**
  1. Ouvrir /parcours/<id> sans créneaux
  2. Cliquer « 📨 Demander un rendez-vous »
- **Résultat attendu :** Le bloc « Aucun créneau disponible… » s'affiche ; POST /rdv/demander {dossierId} en succès ; message « Demande envoyée à ton accompagnateur… ».
- **Traçabilité :** ParcoursDetail.tsx demander() + POST /rdv/demander
- **Automatisation :** ✅ ui/accompagne.spec.ts

### TC-UI-218 — Ajout d'un RDV à l'agenda (lien ICS)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | basse | test du contrat (téléchargement ICS) |

- **Préconditions :** Au moins un RDV existe dans la section Rendez-vous.
- **Données :** rdvId
- **Étapes :**
  1. Sur une ligne RDV, cliquer l'icône 📅 (lien /api/rdv/:id/ics)
- **Résultat attendu :** Le navigateur télécharge/ouvre un fichier .ics valide pour ce RDV.
- **Traçabilité :** ParcoursDetail.tsx (a.rdv-ics) + GET /rdv/:id/ics
- **Automatisation :** ✅ ui/accompagne.spec.ts

### TC-UI-219 — Consulter un compte rendu publié depuis le parcours

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test du contrat, test basé sur les rôles (vue accompagné) |

- **Préconditions :** Le parcours d'Amine a au moins un CR publié.
- **Données :** -
- **Étapes :**
  1. Section Comptes rendus → « Consulter »
- **Résultat attendu :** CompteRenduModal (role=accompagne) s'ouvre ; GET /cr/session/:id renvoie le CR ; le contenu HTML est rendu en lecture seule (pas de barre d'édition accompagnateur) ; verrou de défilement actif.
- **Traçabilité :** CompteRenduModal.tsx + GET /cr/session/:id
- **Automatisation :** ✅ ui/accompagne.spec.ts

### TC-UI-220 — CR non publié côté accompagné : message indisponible, pas d'actions

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | acces | moyenne | test basé sur les rôles, table de décision (cr=null × rôle) |

- **Préconditions :** Session sans CR publié pour l'accompagné.
- **Données :** cr=null
- **Étapes :**
  1. Ouvrir le modal d'un CR non encore publié
- **Résultat attendu :** Quand cr=null et role=accompagne : « Le compte rendu n'est pas encore disponible. » ; aucun bouton Générer/Éditer/Publier n'est visible (réservés à l'accompagnateur).
- **Traçabilité :** CompteRenduModal.tsx (branche !cr accompagne)
- **Automatisation :** ⏳ à automatiser

### TC-UI-221 — Écouter le compte rendu (synthèse vocale navigateur)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | test du contrat (toggle TTS), test basé sur les rôles (feature audio) |

- **Préconditions :** CR publié ouvert ; feature 'audio' active ; navigateur avec speechSynthesis.
- **Données :** -
- **Étapes :**
  1. Dans le modal CR, cliquer « 🔊 Écouter le compte rendu »
  2. Cliquer à nouveau pour arrêter
- **Résultat attendu :** La lecture démarre (texte extrait du HTML, lang fr-FR) ; le bouton bascule en « ⏹ Arrêter » ; un second clic appelle speechSynthesis.cancel() ; la fermeture du modal coupe la lecture.
- **Traçabilité :** EcouterButton.tsx (feature audio) ; CompteRenduModal.tsx
- **Automatisation :** ✅ ui/accompagne.spec.ts

### TC-UI-222 — Bouton « Écouter » masqué si feature audio absente du plan

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | acces | moyenne | test basé sur les rôles (gating requireFeature côté UI), table de décision |

- **Préconditions :** Accompagné rattaché à un plan SANS 'audio' (ex. Découverte).
- **Données :** GET /auth/me/features ne contient pas 'audio'
- **Étapes :**
  1. Ouvrir un CR publié
- **Résultat attendu :** EcouterButton retourne null : aucun bouton « Écouter » n'est rendu.
- **Traçabilité :** EcouterButton.tsx (useFeature('audio'))
- **Automatisation :** ⏳ à automatiser

### TC-UI-223 — Mode « Facile à lire » (FALC) sur un compte rendu

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test du contrat (champ texte présent/non vide, pas de figeage de contenu) |

- **Préconditions :** CR publié ouvert ; feature 'falc' active.
- **Données :** html du CR
- **Étapes :**
  1. Cliquer « 📖 Facile à lire »
  2. Attendre la reformulation
  3. Recliquer pour replier
- **Résultat attendu :** POST /adoption/falc {html} renvoie {texte} non vide ; un encart « Version facile à lire et à comprendre » affiche le texte ligne par ligne ; aria-expanded bascule true/false.
- **Traçabilité :** FalcButton.tsx + POST /adoption/falc
- **Automatisation :** ✅ ui/accompagne.spec.ts

### TC-UI-224 — Bouton FALC masqué si feature falc absente

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | acces | moyenne | test basé sur les rôles (gating UI) |

- **Préconditions :** Plan sans 'falc'.
- **Données :** features sans 'falc'
- **Étapes :**
  1. Ouvrir un CR publié
- **Résultat attendu :** FalcButton retourne null ; aucun bouton « Facile à lire » ; le FalcToggle d'en-tête est également absent.
- **Traçabilité :** FalcButton.tsx + FalcToggle.tsx (useFeature('falc'))
- **Automatisation :** ⏳ à automatiser

### TC-UI-225 — Discussion sur un CR publié (accompagné envoie un message)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | test du contrat (POST→relecture) |

- **Préconditions :** CR publié ouvert côté accompagné.
- **Données :** texte='Merci, c'est clair.'
- **Étapes :**
  1. Dans la section « 💬 Échanges », saisir un message
  2. Cliquer « Envoyer »
- **Résultat attendu :** POST /cr/session/:id/messages en succès ; le message apparaît marqué is_me ; le champ se vide ; la liste défile vers le bas.
- **Traçabilité :** CompteRenduModal.tsx envoyer() + POST /cr/session/:id/messages
- **Automatisation :** ✅ ui/accompagne.spec.ts

### TC-UI-226 — Discussion : message vide non envoyé

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | validation | basse | valeurs limites (entrée vide) |

- **Préconditions :** Section Échanges visible.
- **Données :** newMsg='   '
- **Étapes :**
  1. Laisser le champ vide
  2. Cliquer « Envoyer »
- **Résultat attendu :** envoyer() retourne (garde !t) ; aucun appel réseau ; aucun message ajouté.
- **Traçabilité :** CompteRenduModal.tsx envoyer() garde
- **Automatisation :** ✅ ui/accompagne.spec.ts

### TC-UI-227 — Page « Mes comptes rendus » : liste globale et consultation

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | test du contrat (liste→modal) |

- **Préconditions :** Connecté en accompagné avec ≥1 CR.
- **Données :** /mes-comptes-rendus
- **Étapes :**
  1. Aller sur /mes-comptes-rendus
  2. Cliquer « Consulter » sur un CR
- **Résultat attendu :** GET /cr/mine peuple la liste (date d'entretien + date de publication) ; le modal CR s'ouvre ; à la fermeture, load() rafraîchit la liste.
- **Traçabilité :** ComptesRendus.tsx + GET /cr/mine
- **Automatisation :** ✅ ui/accompagne.spec.ts

### TC-UI-228 — Mes comptes rendus vide : message neutre

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | basse | valeurs limites (liste vide) |

- **Préconditions :** Accompagné sans aucun CR.
- **Données :** comptesRendus=[]
- **Étapes :**
  1. Aller sur /mes-comptes-rendus
- **Résultat attendu :** Affiche « Aucun compte rendu pour l'instant. ».
- **Traçabilité :** ComptesRendus.tsx (état vide)
- **Automatisation :** ✅ ui/accompagne.spec.ts

### TC-UI-229 — Consulter la synthèse du parcours publiée

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test du contrat, test basé sur les rôles |

- **Préconditions :** Parcours d'Amine avec synthèse publiée (synthese_publiee=true).
- **Données :** -
- **Étapes :**
  1. Section « Synthèse du parcours » → « Consulter ma synthèse »
- **Résultat attendu :** SyntheseModal (role=accompagne) ouvre ; GET /synthese/dossier/:id renvoie le doc publié ; contenu HTML en lecture seule + bouton « Écouter la synthèse » ; discussion disponible.
- **Traçabilité :** SyntheseModal.tsx + GET /synthese/dossier/:id
- **Automatisation :** ✅ ui/accompagne.spec.ts

### TC-UI-230 — Synthèse non publiée : message d'attente, pas de bouton

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | acces | moyenne | table de décision (synthese_publiee) |

- **Préconditions :** Parcours sans synthèse publiée.
- **Données :** synthese_publiee=false
- **Étapes :**
  1. Ouvrir /parcours/<id> ; section Synthèse
- **Résultat attendu :** Affiche « Pas encore disponible (publiée par ton accompagnateur). » ; le bouton « Consulter ma synthèse » est absent.
- **Traçabilité :** ParcoursDetail.tsx (section synthèse)
- **Automatisation :** ✅ ui/accompagne.spec.ts

### TC-UI-231 — Résumé « Où j'en suis » : générer puis relire

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test du contrat (champs présents/typés + persistance/relecture) |

- **Préconditions :** Parcours ouvert ; feature 'resume_parcours' active.
- **Données :** -
- **Étapes :**
  1. Section « 🧭 Où j'en suis » → « ✨ Faire le point »
  2. Attendre l'analyse
  3. Cliquer « ↻ Mettre à jour »
- **Résultat attendu :** POST /collab/resume/dossier/:id renvoie {etat, faits[], prochaines_etapes[]} ; etat affiché en paragraphe, faits et étapes en listes ; au rechargement de page, GET /collab/resume/dossier/:id relit le résumé persistant.
- **Traçabilité :** ResumeParcoursCard.tsx + POST/GET /collab/resume/dossier/:id
- **Automatisation :** ✅ ui/accompagne.spec.ts

### TC-UI-232 — Carte Résumé absente si feature resume_parcours non incluse

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | acces | moyenne | test basé sur les rôles (gating UI), table de décision |

- **Préconditions :** Plan sans 'resume_parcours'.
- **Données :** features sans 'resume_parcours'
- **Étapes :**
  1. Ouvrir /parcours/<id>
- **Résultat attendu :** ResumeParcoursCard retourne null ; aucune section « Où j'en suis » ; aucun appel /collab/resume.
- **Traçabilité :** ResumeParcoursCard.tsx (useFeature('resume_parcours'))
- **Automatisation :** ✅ ui/accompagne.spec.ts

### TC-UI-233 — Problématisation : répondre aux questions, proposer puis enregistrer

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test du contrat (champs + persistance/relecture) |

- **Préconditions :** Parcours ouvert ; feature 'problematisation' active.
- **Données :** réponses guidées + édition libre de la problématique
- **Étapes :**
  1. Section « 🎯 Ma problématique » → « Construire ma problématique »
  2. Renseigner les réponses aux questions
  3. « ✨ Proposer une problématique (IA) »
  4. Ajuster le texte
  5. « Enregistrer »
- **Résultat attendu :** GET …/problematisation préremplit questions/réponses ; POST …/suggerer renvoie {problematique, sous_questions[]} et remplit la zone ; POST …/problematisation enregistre ; message « Enregistré ✓ » ; après rechargement, la problématique est relue (mode replié « Revoir »).
- **Traçabilité :** ProblematisationCard.tsx + GET/POST /collab/problematisation/dossier/:id(+/suggerer)
- **Automatisation :** ✅ ui/accompagne.spec.ts

### TC-UI-234 — Météo intérieure : enregistrer un check-in d'humeur + mot

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | partition d'équivalence (niveau 1-5), test du contrat |

- **Préconditions :** Parcours ouvert ; feature 'meteo' active.
- **Données :** niveau=4 (🙂) ; mot='motivé'
- **Étapes :**
  1. Section « 🌤️ Comment te sens-tu ? » → choisir un emoji
  2. Saisir un mot facultatif
  3. Cliquer « Enregistrer »
- **Résultat attendu :** POST /relationnel/meteo {dossierId, niveau, mot} ; message « C'est noté ✓ » ; le relevé apparaît en tête de l'historique ; le formulaire se réinitialise (niveau null).
- **Traçabilité :** MeteoWidget.tsx + POST /relationnel/meteo
- **Automatisation :** ✅ ui/accompagne.spec.ts

### TC-UI-235 — Météo : bouton Enregistrer désactivé sans niveau sélectionné

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | validation | moyenne | valeurs limites (sélection obligatoire) |

- **Préconditions :** Section météo affichée, aucun emoji sélectionné.
- **Données :** niveau=null
- **Étapes :**
  1. Ne sélectionner aucun emoji
  2. Observer le bouton « Enregistrer »
- **Résultat attendu :** Le bouton est disabled (!niveau) ; aucun POST possible tant qu'un niveau n'est pas choisi.
- **Traçabilité :** MeteoWidget.tsx (disabled !niveau)
- **Automatisation :** ✅ ui/accompagne.spec.ts

### TC-UI-236 — Roue des émotions : sélectionner plusieurs émotions et enregistrer

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test du contrat, partition d'équivalence (multi-sélection) |

- **Préconditions :** Parcours ouvert ; feature 'roue_emotions' active.
- **Données :** émotions=['confiant','curieux'] ; note='ça avance'
- **Étapes :**
  1. Section « 🎡 Roue des émotions »
  2. Cliquer plusieurs pastilles d'émotions (multi-sélection)
  3. Saisir une note facultative
  4. « Enregistrer »
- **Résultat attendu :** toggle bascule aria-pressed ; POST /viz/emotions/dossier/:id {emotions[], note} ; « C'est noté ✓ » ; l'agrégat « Mon climat émotionnel » se met à jour et trie par fréquence.
- **Traçabilité :** RoueEmotions.tsx + POST /viz/emotions/dossier/:id
- **Automatisation :** ✅ ui/accompagne.spec.ts

### TC-UI-237 — Roue des émotions : Enregistrer désactivé sans sélection

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | validation | basse | valeurs limites (collection vide) |

- **Préconditions :** Aucune émotion cochée.
- **Données :** sel=[]
- **Étapes :**
  1. Ne cocher aucune émotion
  2. Observer le bouton « Enregistrer »
- **Résultat attendu :** Bouton disabled (!sel.length) ; envoyer() retourne même si appelé.
- **Traçabilité :** RoueEmotions.tsx (disabled !sel.length)
- **Automatisation :** ✅ ui/accompagne.spec.ts

### TC-UI-238 — Micro-journal : ajouter une note privée puis la partager

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | table de décision (privé/partagé), test du contrat |

- **Préconditions :** Parcours ouvert ; feature 'journal' active.
- **Données :** texte='Blocage sur le plan' ; partage=false puis bascule
- **Étapes :**
  1. Section « 📓 Micro-journal » → saisir une note
  2. Laisser « Partager » décoché → « Ajouter »
  3. Sur la note créée, cliquer « 🔒 privée » pour la passer en partagée
- **Résultat attendu :** POST /relationnel/journal {dossierId, texte, partage:false} crée la note (tag 🔒 privée) ; PATCH /relationnel/journal/:id bascule partage→1 (tag 🔓 partagée) ; la liste se recharge.
- **Traçabilité :** MicroJournal.tsx + POST + PATCH /relationnel/journal
- **Automatisation :** ✅ ui/accompagne.spec.ts

### TC-UI-239 — Micro-journal : supprimer une note avec confirmation

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | table de décision (confirm oui/non) |

- **Préconditions :** Au moins une note de journal existe.
- **Données :** id de la note
- **Étapes :**
  1. Cliquer le « × » de suppression d'une note
  2. Confirmer la boîte window.confirm
- **Résultat attendu :** Après confirmation, DELETE /relationnel/journal/:id ; la note disparaît après rechargement. (Annuler la confirmation n'appelle pas l'API.)
- **Traçabilité :** MicroJournal.tsx supprimer() + DELETE /relationnel/journal/:id
- **Automatisation :** ✅ ui/accompagne.spec.ts

### TC-UI-240 — Micro-journal : note vide non ajoutée

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | validation | basse | valeurs limites (chaîne vide) |

- **Préconditions :** Champ texte vide.
- **Données :** texte='   '
- **Étapes :**
  1. Laisser la zone vide
  2. Observer « ＋ Ajouter »
- **Résultat attendu :** Bouton disabled (!texte.trim()) ; ajouter() retourne sans appel réseau.
- **Traçabilité :** MicroJournal.tsx (garde texte.trim())
- **Automatisation :** ✅ ui/accompagne.spec.ts

### TC-UI-241 — Boussole du parcours : aiguille, pourcentage et jalons cohérents

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | valeurs limites (phaseMax -1..5, pct), test du contrat |

- **Préconditions :** Parcours d'Amine avec entretiens (phase_max≥0), CR et synthèse.
- **Données :** phaseMax, questionnaire, entretiens, crPublies, synthesePubliee, cloture issus de /dossiers/mine/:id
- **Étapes :**
  1. Ouvrir /parcours/<id>
  2. Observer la boussole en haut
- **Résultat attendu :** feature 'boussole' active : SVG rendu avec aria-label décrivant la phase courante et le % vers l'autonomie ; aiguille pointe la phase ; jalons (Questionnaire/Entretiens/CR/Synthèse/Clôture) cochés selon les données.
- **Traçabilité :** BoussoleParcours.tsx (useFeature('boussole'))
- **Automatisation :** ✅ ui/accompagne.spec.ts

### TC-UI-242 — Boussole : parcours sans entretien (phaseMax=-1) affiche 0% et état d'attente

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | basse | valeurs limites (borne basse -1) |

- **Préconditions :** Parcours neuf, aucun entretien.
- **Données :** phaseMax=-1
- **Étapes :**
  1. Ouvrir un parcours sans entretien
- **Résultat attendu :** pct=0% ; texte « Parcours ouvert — en attente du premier entretien » ; pas d'aiguille (cur<0).
- **Traçabilité :** BoussoleParcours.tsx (cur<0)
- **Automatisation :** ✅ ui/accompagne.spec.ts

### TC-UI-243 — Émergence : fil rouge et moments-clés partagés s'affichent

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | test du contrat, table de décision (fil/moments présents ou non) |

- **Préconditions :** Parcours d'Amine : l'accompagnateur a partagé un fil rouge + moments-clés.
- **Données :** -
- **Étapes :**
  1. Ouvrir /parcours/<id>
  2. Observer la section « 🧵 Le fil rouge… »
- **Résultat attendu :** GET /emergence/mine/dossier/:id renvoie filRouge + moments ; le fil, ses axes, l'explication et les moments (verbatim + pourquoi) sont affichés. Si rien n'est partagé, la section entière est masquée.
- **Traçabilité :** EmergencePartage.tsx + GET /emergence/mine/dossier/:id
- **Automatisation :** ✅ ui/accompagne.spec.ts

### TC-UI-244 — Nuage de thèmes : générer puis relire

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | test du contrat (champs themes + persistance) |

- **Préconditions :** Parcours ouvert ; feature 'nuage_themes' active.
- **Données :** -
- **Étapes :**
  1. Section « 🗂️ Nuage de thèmes » → « ✨ Générer le nuage »
  2. Recharger la page
- **Résultat attendu :** POST /viz/nuage/dossier/:id renvoie {themes:[{mot,poids}]} ; les mots sont dimensionnés par poids ; GET /viz/nuage relit le nuage persistant au rechargement.
- **Traçabilité :** NuageThemes.tsx + GET/POST /viz/nuage/dossier/:id
- **Automatisation :** ✅ ui/accompagne.spec.ts

### TC-UI-245 — Carte du parcours : ouverture, fil rouge et impression

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | test basé sur les rôles (gating), test du contrat |

- **Préconditions :** Parcours ouvert ; feature 'carte_parcours' active.
- **Données :** -
- **Étapes :**
  1. Pied de page parcours → « 🖨️ Carte du parcours »
  2. Observer la carte
  3. Cliquer « Imprimer / enregistrer en PDF »
- **Résultat attendu :** Bouton visible car carteActive ; modal carte affiche titre, accompagnateur, nb entretiens, 6 phases (cochées ≤ phaseMax) ; GET /emergence/mine/dossier/:id alimente le fil rouge ; window.print() déclenché ; Échap ferme.
- **Traçabilité :** CarteParcours.tsx + ParcoursDetail.tsx (carteActive)
- **Automatisation :** ✅ ui/accompagne.spec.ts

### TC-UI-246 — Carte du parcours masquée si feature carte_parcours absente

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | acces | moyenne | test basé sur les rôles (gating UI), table de décision |

- **Préconditions :** Plan sans 'carte_parcours'.
- **Données :** features sans 'carte_parcours'
- **Étapes :**
  1. Ouvrir /parcours/<id> ; observer le pied de page
- **Résultat attendu :** Le bouton « 🖨️ Carte du parcours » n'est pas rendu (carteActive=false).
- **Traçabilité :** ParcoursDetail.tsx (carteActive && …)
- **Automatisation :** ✅ ui/accompagne.spec.ts

### TC-UI-247 — Transparence RGPD : consulter le tableau des données et sous-traitants

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test du contrat (forme de réponse → rendu) |

- **Préconditions :** Parcours ouvert ; feature 'transparence' active.
- **Données :** -
- **Étapes :**
  1. Pied de page → « 🔒 Mes données & transparence »
- **Résultat attendu :** GET /transparence/dossier/:id renvoie {donnees, ia, ce_que_voit_lia, soustraitants, demande_effacement_en_cours} ; le modal liste les compteurs de données, ce que l'IA a vu/produit, les sous-traitants et les droits.
- **Traçabilité :** TransparenceModal.tsx + GET /transparence/dossier/:id
- **Automatisation :** ✅ ui/accompagne.spec.ts

### TC-UI-248 — Transparence : demander l'effacement de ses données

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test du contrat, table de décision (demande en cours/non) |

- **Préconditions :** Modal transparence ouvert ; aucune demande en cours.
- **Données :** motif='Fin de mission'
- **Étapes :**
  1. Cliquer « 🗑 Demander l'effacement de mes données »
  2. Saisir un motif (facultatif)
  3. « Envoyer la demande »
- **Résultat attendu :** POST /transparence/effacement {dossierId, motif} ; message « Ta demande a été envoyée… rien n'est supprimé sans validation. » ; l'état passe à demande_effacement_en_cours et le formulaire disparaît.
- **Traçabilité :** TransparenceModal.tsx demander() + POST /transparence/effacement
- **Automatisation :** ✅ ui/accompagne.spec.ts

### TC-UI-249 — Transparence : demande d'effacement déjà en cours masque le formulaire

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | basse | table de décision |

- **Préconditions :** demande_effacement_en_cours=true.
- **Données :** -
- **Étapes :**
  1. Ouvrir le modal transparence avec une demande déjà en cours
- **Résultat attendu :** Affiche « Une demande d'effacement est déjà en cours pour ce parcours. » ; pas de bouton/formulaire de nouvelle demande.
- **Traçabilité :** TransparenceModal.tsx (branche demande_effacement_en_cours)
- **Automatisation :** ✅ ui/accompagne.spec.ts

### TC-UI-250 — Bouton Transparence masqué si feature transparence absente

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | acces | moyenne | test basé sur les rôles (gating UI) |

- **Préconditions :** Plan sans 'transparence'.
- **Données :** features sans 'transparence'
- **Étapes :**
  1. Ouvrir /parcours/<id> ; pied de page
- **Résultat attendu :** Le bouton « 🔒 Mes données & transparence » n'est pas rendu (transparenceActive=false).
- **Traçabilité :** ParcoursDetail.tsx (transparenceActive && …)
- **Automatisation :** ✅ ui/accompagne.spec.ts

### TC-UI-251 — Attestation de fin : disponible et imprimable sur parcours clôturé

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | table de décision (clôturé × feature), test du contrat |

- **Préconditions :** Parcours clôturé (statut='cloture') ; feature 'attestation' active.
- **Données :** -
- **Étapes :**
  1. Ouvrir un parcours clôturé
  2. Pied de page → « 📜 Mon attestation »
  3. « Imprimer / enregistrer en PDF »
- **Résultat attendu :** Bouton visible (attestationActive && statut==='cloture') ; GET /ethique/attestation/dossier/:id renvoie accompagné, accompagnateur, période, nb entretiens, nb CR ; l'attestation est rendue ; window.print() disponible.
- **Traçabilité :** AttestationModal.tsx + ParcoursDetail.tsx + GET /ethique/attestation/dossier/:id
- **Automatisation :** ✅ ui/accompagne.spec.ts

### TC-UI-252 — Attestation masquée si parcours non clôturé

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | acces | moyenne | table de décision (statut) |

- **Préconditions :** Parcours en cours (statut≠'cloture'), feature attestation active.
- **Données :** statut='en_cours'
- **Étapes :**
  1. Ouvrir un parcours en cours ; observer le pied de page
- **Résultat attendu :** Le bouton « 📜 Mon attestation » n'apparaît pas (condition statut==='cloture' non remplie).
- **Traçabilité :** ParcoursDetail.tsx (d.statut==='cloture')
- **Automatisation :** ✅ ui/accompagne.spec.ts

### TC-UI-253 — Attestation : erreur si le parcours n'est pas éligible (403/404)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | validation | basse | test du contrat (gestion d'erreur) |

- **Préconditions :** Forçage d'ouverture du modal sur un dossier non éligible.
- **Données :** -
- **Étapes :**
  1. Ouvrir AttestationModal pour un dossier sans attestation valide
- **Résultat attendu :** GET /ethique/attestation/dossier/:id rejette ; le message d'erreur (e.message ou « Indisponible. ») s'affiche en .form-error ; aucune attestation rendue.
- **Traçabilité :** AttestationModal.tsx (catch err) + GET /ethique/attestation/dossier/:id
- **Automatisation :** ⏳ à automatiser

### TC-UI-254 — Visio : rejoindre la salle d'un rendez-vous

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | test du contrat (champ url → ouverture) |

- **Préconditions :** Un RDV existe ; feature 'visio' active.
- **Données :** rdvId
- **Étapes :**
  1. Section Rendez-vous → bouton « 🎥 Visio » d'une ligne RDV
- **Résultat attendu :** GET /confort/visio/rdv/:id renvoie {url} ; window.open ouvre l'URL Jitsi dans un nouvel onglet (noopener,noreferrer).
- **Traçabilité :** VisioButton.tsx + GET /confort/visio/rdv/:id
- **Automatisation :** ✅ ui/accompagne.spec.ts

### TC-UI-255 — Bouton Visio masqué si feature visio absente

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | acces | basse | test basé sur les rôles (gating UI) |

- **Préconditions :** Plan sans 'visio'.
- **Données :** features sans 'visio'
- **Étapes :**
  1. Ouvrir un parcours avec un RDV ; observer la ligne RDV
- **Résultat attendu :** VisioButton retourne null ; aucun bouton « 🎥 Visio » sur les lignes RDV.
- **Traçabilité :** VisioButton.tsx (useFeature('visio'))
- **Automatisation :** ⏳ à automatiser

### TC-UI-256 — Mode FALC global : activer/désactiver l'affichage facile à lire

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | test du contrat (toggle + persistance), test basé sur les rôles (feature falc) |

- **Préconditions :** Connecté ; feature 'falc' active.
- **Données :** -
- **Étapes :**
  1. Dans l'en-tête, cliquer la bascule FALC (📘/📖)
  2. Recharger la page
- **Résultat attendu :** document.documentElement reçoit data-falc='on' (texte plus grand/aéré) ; aria-pressed=true ; la préférence est persistée en localStorage('falc') ; un nouveau clic repasse en 'off'.
- **Traçabilité :** FalcToggle.tsx (data-falc, localStorage)
- **Automatisation :** ✅ ui/accompagne.spec.ts

### TC-UI-257 — Visite guidée : lancement auto à la première connexion accompagné

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | test basé sur les rôles (steps par rôle), test du contrat (premier lancement) |

- **Préconditions :** feature 'onboarding' active ; clé localStorage 'boussole_onboarding_accompagne' absente.
- **Données :** -
- **Étapes :**
  1. Vider localStorage
  2. Se connecter en accompagné
  3. Observer l'ouverture automatique du tour
- **Résultat attendu :** OnboardingTour s'affiche avec les étapes du rôle accompagne (Bienvenue, Mon espace surligné via [data-tour=espace], Parcours guidé, Tes outils) ; la clé localStorage est posée pour ne pas réafficher au prochain login.
- **Traçabilité :** OnboardingManager.tsx + OnboardingTour.tsx (role accompagne)
- **Automatisation :** ✅ ui/accompagne.spec.ts

### TC-UI-258 — Visite guidée : relance via le bouton flottant et navigation des étapes

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | basse | partition d'équivalence (navigation étapes), valeurs limites (première/dernière étape) |

- **Préconditions :** Connecté en accompagné ; feature onboarding active ; tour déjà vu (clé posée).
- **Données :** -
- **Étapes :**
  1. Cliquer le FAB « ? » (Lancer la visite guidée)
  2. Naviguer avec « Suivant → » / « ← Précédent »
  3. Cliquer « Terminer » à la dernière étape
- **Résultat attendu :** Le tour se rouvre ; Précédent/Suivant changent d'étape (compteur « Étape i / N ») ; « Passer » ou « Terminer » ferme le tour ; Échap ferme aussi.
- **Traçabilité :** OnboardingManager.tsx (FAB) + OnboardingTour.tsx (navigation)
- **Automatisation :** ✅ ui/accompagne.spec.ts

### TC-UI-259 — Visite guidée et bascule FALC absentes sans les features correspondantes

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | acces | basse | test basé sur les rôles (gating UI), table de décision |

- **Préconditions :** Plan sans 'onboarding' ni 'falc'.
- **Données :** features sans 'onboarding' et sans 'falc'
- **Étapes :**
  1. Se connecter ; observer l'en-tête et le FAB
- **Résultat attendu :** OnboardingManager retourne null (pas de FAB ni de tour auto) ; FalcToggle retourne null (pas de bascule dans l'en-tête).
- **Traçabilité :** OnboardingManager.tsx + FalcToggle.tsx (useFeature)
- **Automatisation :** ⏳ à automatiser

### TC-UI-260 — Plan d'action (accompagné) : ajouter, cocher, réordonner ses étapes

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test du contrat (CRUD plan d'action) |

- **Préconditions :** Connecté en accompagné ; /mon-plan-action ; dossierId non null.
- **Données :** libelle='Relire le chapitre 2'
- **Étapes :**
  1. Aller sur /mon-plan-action
  2. Saisir une action → « Ajouter »
  3. Cocher/changer le statut d'une action
  4. Glisser la poignée ⠿ pour réordonner
- **Résultat attendu :** GET /actions/mine charge {actions, dossierId} ; POST /actions ajoute (champ vidé, liste rechargée) ; PATCH /actions/:id change le statut ; POST /actions/reorder persiste l'ordre.
- **Traçabilité :** MonPlanAction.tsx + GET /actions/mine + POST /actions + PATCH /actions/:id + POST /actions/reorder
- **Automatisation :** ✅ ui/accompagne.spec.ts

### TC-UI-261 — Plan d'action : formulaire d'ajout masqué sans dossier rattaché

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | validation | basse | table de décision (dossierId null/non null) |

- **Préconditions :** Accompagné sans dossier (dossierId null).
- **Données :** dossierId=null
- **Étapes :**
  1. Aller sur /mon-plan-action sans parcours
- **Résultat attendu :** Le formulaire d'ajout n'est pas rendu (dossierId!=null faux) ; addAction() retourne sans appel si déclenché.
- **Traçabilité :** MonPlanAction.tsx (dossierId!=null)
- **Automatisation :** ✅ ui/accompagne.spec.ts

### TC-UI-262 — Plan d'action : ouvrir le détail d'une action (échéance/priorité/rappel/notes)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | test du contrat (ouverture/persistance détail) |

- **Préconditions :** Au moins une action existe.
- **Données :** -
- **Étapes :**
  1. Cliquer sur une action pour ouvrir son détail
  2. Modifier des champs et enregistrer
- **Résultat attendu :** ActionDetailModal s'ouvre (key=action.id) ; après enregistrement, onSaved=load() rafraîchit la liste ; la fermeture remet selected à null.
- **Traçabilité :** MonPlanAction.tsx (ActionDetailModal)
- **Automatisation :** ✅ ui/accompagne.spec.ts

### TC-UI-263 — Voir mes réponses au questionnaire depuis le parcours

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | test du contrat (relecture persistée) |

- **Préconditions :** Questionnaire déjà complété pour le parcours.
- **Données :** -
- **Étapes :**
  1. Ouvrir /parcours/<id>
  2. Section Questionnaire initial → « 🔎 Voir mes réponses »
- **Résultat attendu :** QuestionnaireDetailModal affiche le récapitulatif et le contenu enregistré (cr_recap/contenu) + date de complétion ; fermeture sans erreur.
- **Traçabilité :** ParcoursDetail.tsx + QuestionnaireDetailModal (data.questionnaire)
- **Automatisation :** ✅ ui/accompagne.spec.ts

### TC-UI-264 — Questionnaire non rempli : invitation à le remplir

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | basse | table de décision (questionnaire null/présent) |

- **Préconditions :** Parcours sans questionnaire (data.questionnaire=null).
- **Données :** -
- **Étapes :**
  1. Ouvrir un parcours sans questionnaire ; section Questionnaire
- **Résultat attendu :** Affiche « Pas encore rempli. » + lien « Remplir le questionnaire » vers /questionnaire?dossier=<id>.
- **Traçabilité :** ParcoursDetail.tsx (section questionnaire)
- **Automatisation :** ⏳ à automatiser

### TC-UI-265 — Robustesse modale : ErrorBoundary récupère un échec d'ouverture de CR/synthèse

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | non-regression | basse | test du contrat (résilience), test négatif |

- **Préconditions :** Modal CR ou synthèse en lazy load ; provoquer une erreur de rendu.
- **Données :** -
- **Étapes :**
  1. Ouvrir un CR/synthèse dans des conditions provoquant une erreur du composant lazy
- **Résultat attendu :** L'ErrorBoundary capte l'erreur ; onReset remet crSession/showSyn à null ; la page parcours reste utilisable (pas d'écran blanc).
- **Traçabilité :** ParcoursDetail.tsx (ErrorBoundary onReset) ; ComptesRendus.tsx
- **Automatisation :** ⏳ à automatiser

### TC-UI-266 — Repli FALC déterministe (unitaire) : découpe en puces de phrases courtes

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | haute | partition d'équivalence (séparateurs . ! ?), valeurs limites (longueur >3, max 12) |

- **Préconditions :** Tester la fonction falcFallback de adoption.ts (chemin sans IA).
- **Données :** texte='Bonjour. Voici un point important ! Et une question ? ok',
- **Étapes :**
  1. Appeler falcFallback(texte)
  2. Vérifier le découpage par ponctuation finale (. ! ?)
  3. Vérifier le filtre des fragments ≤3 caractères et la limite à 12 puces
- **Résultat attendu :** Retourne une liste de lignes préfixées « • », une phrase par puce ; les fragments de longueur ≤3 (ex. 'ok') sont écartés ; au plus 12 puces.
- **Traçabilité :** adoption.ts falcFallback() (repli déterministe de POST /adoption/falc)
- **Automatisation :** ⏳ à automatiser

### TC-UI-267 — Contrat FALC : champ source 'ia' ou 'heuristique' selon disponibilité de Claude

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | moyenne | test du contrat (champs présents/typés, gating, repli) |

- **Préconditions :** Accompagné authentifié ; feature 'falc' ; html non vide.
- **Données :** { html:'<p>Un texte à simplifier. Une autre phrase.</p>' }
- **Étapes :**
  1. POST /adoption/falc avec un html valide
  2. Inspecter la réponse
- **Résultat attendu :** 200 avec {texte:string non vide, source:'ia'|'heuristique'} ; si Claude indisponible, texte provient du repli (source='heuristique') et reste non vide.
- **Traçabilité :** falc + POST /adoption/falc
- **Automatisation :** ⏳ à automatiser

### TC-UI-268 — FALC : texte vide rejeté (400)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | valeurs limites (entrée vide) |

- **Préconditions :** Accompagné authentifié ; feature 'falc'.
- **Données :** { html:'' } ou {} 
- **Étapes :**
  1. POST /adoption/falc avec un contenu vide
- **Résultat attendu :** 400 avec {error:'Texte vide'} ; aucune reformulation.
- **Traçabilité :** POST /adoption/falc (garde !texte)
- **Automatisation :** ⏳ à automatiser

### TC-UI-269 — Gating serveur FALC : 403 si la fonctionnalité n'est pas dans l'offre

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles (requireFeature) |

- **Préconditions :** Accompagné rattaché à un plan SANS 'falc'.
- **Données :** { html:'<p>texte</p>' }
- **Étapes :**
  1. POST /adoption/falc en étant authentifié mais sans la feature
- **Résultat attendu :** 403 {error:'Fonctionnalité non disponible dans votre offre'} (requireFeature('falc')).
- **Traçabilité :** features.ts requireFeature + POST /adoption/falc
- **Automatisation :** ⏳ à automatiser

### TC-UI-270 — Gating serveur FALC : 401 si non authentifié

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles (anonyme) |

- **Préconditions :** Aucune session.
- **Données :** { html:'<p>texte</p>' }
- **Étapes :**
  1. POST /adoption/falc sans cookie de session
- **Résultat attendu :** 401 {error:'Non authentifié'} (requireAuth/requireFeature).
- **Traçabilité :** requireAuth + POST /adoption/falc
- **Automatisation :** ⏳ à automatiser

### TC-UI-271 — Météo : niveau hors bornes rejeté (validation serveur)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | valeurs limites (bornes 1 et 5) |

- **Préconditions :** Accompagné authentifié ; feature 'meteo'.
- **Données :** { dossierId:<id>, niveau:0 } puis { niveau:6 }
- **Étapes :**
  1. POST /relationnel/meteo avec niveau=0 puis niveau=6
- **Résultat attendu :** Réponse 400 (niveau hors 1..5) ; aucun relevé créé ; l'historique météo inchangé.
- **Traçabilité :** POST /relationnel/meteo (validation niveau)
- **Automatisation :** ⏳ à automatiser

### TC-UI-272 — Accès aux données d'un parcours d'autrui : 404 (cloisonnement)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test basé sur les rôles (non-propriétaire / 404) |

- **Préconditions :** Connecté en accompagné Léa ; <id> appartient à Amine.
- **Données :** dossierId d'Amine
- **Étapes :**
  1. GET /dossiers/mine/:id avec un id non possédé
  2. Idem pour /collab/resume, /relationnel/meteo, /viz/emotions sur ce dossier
- **Résultat attendu :** 404 (ou 403) systématique : aucun contenu d'un parcours d'un autre accompagné n'est servi ; côté UI le catch affiche « Chargement impossible ».
- **Traçabilité :** GET /dossiers/mine/:id et endpoints dossier-scopés (cloisonnement accompagné)
- **Automatisation :** ✅ ui/accompagne.spec.ts

## Domaine UI_ADMIN — 53 cas

**Endpoints couverts :**

- `GET /api/admin/users` · feature: `—` · rôle: admin — Liste de tous les comptes avec plan eventuel (alimente le tableau de gestion des comptes)
- `POST /api/admin/users` · feature: `—` · rôle: admin — Creer un compte (email + role) et envoyer un lien d activation
- `PATCH /api/admin/users/:id` · feature: `—` · rôle: admin — Modifier actif / role / plan_id d un compte (selects et bouton Activer-Desactiver)
- `POST /api/admin/lien` · feature: `—` · rôle: admin — Rattacher un accompagne a un accompagnateur
- `GET /api/admin/features` · feature: `—` · rôle: admin — Registre des fonctionnalites activables (cases par categorie du PlansManager)
- `GET /api/admin/plans` · feature: `—` · rôle: admin — Liste des plans avec nb_users et features sanitises
- `POST /api/admin/plans` · feature: `—` · rôle: admin — Creer un plan (bouton + Nouveau plan)
- `PATCH /api/admin/plans/:id` · feature: `—` · rôle: admin — Enregistrer nom / description / features d un plan
- `POST /api/admin/plans/:id/duplication` · feature: `—` · rôle: admin — Dupliquer un plan (suffixe (copie))
- `DELETE /api/admin/plans/:id` · feature: `—` · rôle: admin — Supprimer un plan (les users rattaches repassent au niveau max)
- `GET /api/admin/effacements` · feature: `transparence` · rôle: admin — Demandes d effacement en attente (console RGPD)
- `POST /api/admin/effacements/:id` · feature: `transparence` · rôle: admin — Traiter une demande : anonymiser ou supprimer
- `POST /api/admin/rgpd/:userId` · feature: `transparence` · rôle: admin — Action RGPD directe (hors demande) sur un compte : anonymiser ou supprimer
- `GET /api/admin/retention` · feature: `transparence` · rôle: admin — Politique de retention : comptes eligibles a l anonymisation
- `POST /api/admin/retention/appliquer` · feature: `transparence` · rôle: admin — Appliquer la retention maintenant (anonymise les comptes eligibles)

### TC-UI-300 — Acces a /admin en tant qu admin : la page Gestion des comptes s affiche

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test du contrat (forme de page), test base sur les roles |

- **Préconditions :** Connecte en admin (mohamed@elafrit.com / BoussoleDemo2026)
- **Données :** URL http://localhost:8080/admin
- **Étapes :**
  1. Se connecter avec le compte admin
  2. Naviguer vers /admin
  3. Observer le titre, le tableau des comptes, les cartes de creation, le PlansManager et la console RGPD
- **Résultat attendu :** Le titre 'Gestion des comptes' s affiche ; le tableau liste les comptes (colonnes Email, Nom, Role, Abonnement, Valide, Statut) ; les sections 'Plans d abonnement' et 'Confidentialite & RGPD' sont presentes.
- **Traçabilité :** GET /admin/users + page Admin.tsx
- **Automatisation :** ✅ ui/admin.spec.ts

### TC-UI-301 — Acces a /admin en anonyme : redirection vers /connexion

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | acces | haute | test base sur les roles (role anonyme) |

- **Préconditions :** Aucune session active (deconnecte)
- **Données :** URL /admin
- **Étapes :**
  1. S assurer d etre deconnecte
  2. Saisir directement l URL /admin dans le navigateur
- **Résultat attendu :** Redirection vers /connexion (Protected sans user -> Navigate to /connexion) ; la page Admin n est jamais rendue.
- **Traçabilité :** Protected.tsx (route /admin) + GET /admin/users -> 401
- **Automatisation :** ✅ ui/admin.spec.ts

### TC-UI-302 — Acces a /admin en accompagnateur : redirection vers /espace

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | acces | haute | test base sur les roles (mauvais role) |

- **Préconditions :** Connecte en accompagnateur (camille.laurent@boussole.demo)
- **Données :** URL /admin
- **Étapes :**
  1. Se connecter en accompagnateur
  2. Saisir directement l URL /admin
- **Résultat attendu :** Redirection vers /espace (Protected role='admin' avec role different) ; la console admin n est pas affichee.
- **Traçabilité :** Protected.tsx (role='admin') + GET /admin/users -> 403
- **Automatisation :** ✅ ui/admin.spec.ts

### TC-UI-303 — Acces a /admin en accompagne : redirection vers /espace

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | acces | moyenne | test base sur les roles (mauvais role) |

- **Préconditions :** Connecte en accompagne (afrit_mohamed@yahoo.fr)
- **Données :** URL /admin
- **Étapes :**
  1. Se connecter en accompagne
  2. Saisir directement l URL /admin
- **Résultat attendu :** Redirection vers /espace ; aucun appel admin abouti.
- **Traçabilité :** Protected.tsx (role='admin') + GET /admin/users -> 403
- **Automatisation :** ✅ ui/admin.spec.ts

### TC-UI-304 — Tableau des comptes : tri par date de creation descendante et colonnes peuplees

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | test du contrat (mapping reponse->tableau) |

- **Préconditions :** Admin connecte, plusieurs comptes seedes
- **Données :** Jeu de demo (2 accompagnateurs, 3 accompagnes, 1 admin)
- **Étapes :**
  1. Ouvrir /admin
  2. Lire les lignes du tableau
- **Résultat attendu :** Chaque ligne montre email, nom (prenom+nom ou '—'), un select de role positionne sur le role courant, un select d abonnement positionne sur le plan (ou 'Niveau max'), '✓' ou '—' pour Valide, et un bouton Desactiver/Activer ; ordre par cree_le DESC.
- **Traçabilité :** GET /admin/users + Admin.tsx tbody
- **Automatisation :** ✅ ui/admin.spec.ts

### TC-UI-305 — Ligne inactive : style 'row-inactif' applique quand actif=0

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | basse | partition d equivalence (actif=0 vs actif=1) |

- **Préconditions :** Admin connecte, au moins un compte desactive
- **Données :** Un compte avec actif=0
- **Étapes :**
  1. Desactiver un compte de test
  2. Observer sa ligne dans le tableau
- **Résultat attendu :** La ligne du compte desactive recoit la classe 'row-inactif' (style grise) et le bouton affiche 'Activer'.
- **Traçabilité :** Admin.tsx (className row-inactif) + PATCH /admin/users/:id
- **Automatisation :** ✅ ui/admin.spec.ts

### TC-UI-306 — Changer le role d un compte via le select : persistance apres rechargement

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test du contrat + table de decision (champ role seul) |

- **Préconditions :** Admin connecte, un compte cible distinct de l admin
- **Données :** Cible : lea.martin@boussole.demo ; nouveau role : accompagnateur
- **Étapes :**
  1. Ouvrir /admin
  2. Sur la ligne de la cible, choisir 'Accompagnateur' dans le select Role
  3. Attendre le rechargement du tableau (load())
  4. Rafraichir la page
- **Résultat attendu :** Le PATCH part avec {role:'accompagnateur'} ; apres reload le select reste sur Accompagnateur ; le changement persiste apres rafraichissement.
- **Traçabilité :** PATCH /admin/users/:id {role} + Admin.tsx setRole
- **Automatisation :** ✅ ui/admin.spec.ts

### TC-UI-307 — Affecter un plan d abonnement via le select Abonnement

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test du contrat (jointure plan) |

- **Préconditions :** Admin connecte, au moins un plan existant (ex. Essentiel)
- **Données :** Cible : karim.benali@boussole.demo ; plan : Essentiel
- **Étapes :**
  1. Ouvrir /admin
  2. Sur la ligne cible, selectionner 'Essentiel' dans le select Abonnement
  3. Observer la colonne apres reload
- **Résultat attendu :** PATCH {plan_id:<id Essentiel>} ; apres reload la colonne Abonnement affiche Essentiel ; le compte voit desormais ses fonctionnalites filtrees.
- **Traçabilité :** PATCH /admin/users/:id {plan_id} + Admin.tsx setPlan
- **Automatisation :** ✅ ui/admin.spec.ts

### TC-UI-308 — Retirer le plan (Niveau max) : plan_id repasse a NULL = acces a tout

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | valeurs limites (valeur vide -> null) |

- **Préconditions :** Admin connecte, compte cible deja rattache a un plan
- **Données :** Cible avec plan ; choix 'Niveau max' (valeur '')
- **Étapes :**
  1. Sur la ligne cible (avec plan), choisir l option 'Niveau max'
  2. Observer apres reload
- **Résultat attendu :** setPlan envoie plan_id=null (planId==='' -> null) ; backend met plan_id=NULL ; colonne affiche 'Niveau max' ; userFeatures renvoie ALL_FEATURE_KEYS.
- **Traçabilité :** PATCH /admin/users/:id {plan_id:null} + features.userFeatures
- **Automatisation :** ✅ ui/admin.spec.ts

### TC-UI-309 — Activer / desactiver un compte via le bouton bascule

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test du contrat + table de decision (bascule) |

- **Préconditions :** Admin connecte, compte cible actif distinct de l admin
- **Données :** Cible : un accompagne actif
- **Étapes :**
  1. Cliquer 'Desactiver' sur la ligne cible
  2. Observer la bascule du libelle et le style de la ligne
  3. Cliquer 'Activer' pour rebasculer
- **Résultat attendu :** Premier clic : PATCH {actif:0}, libelle -> 'Activer', ligne grisee ; second clic : PATCH {actif:1}, retour a l etat actif. Un compte desactive ne peut plus se connecter (login 403).
- **Traçabilité :** PATCH /admin/users/:id {actif} + Admin.tsx toggleActif
- **Automatisation :** ✅ ui/admin.spec.ts

### TC-UI-310 — Auto-modification interdite : modifier son propre compte admin renvoie une erreur

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | validation | haute | table de decision (id == meId) |

- **Préconditions :** Admin connecte (mohamed@elafrit.com)
- **Données :** Ligne de l admin lui-meme
- **Étapes :**
  1. Sur la ligne correspondant a l admin connecte, tenter de changer son role ou cliquer Desactiver
- **Résultat attendu :** Le backend renvoie 400 'Vous ne pouvez pas modifier votre propre compte administrateur' ; le changement n est pas applique (apres reload, l etat est inchange).
- **Traçabilité :** PATCH /admin/users/:id (garde id===meId) + Admin.tsx
- **Automatisation :** ✅ ui/admin.spec.ts

### TC-UI-311 — Creer un compte : email + role valides -> message de succes et ligne ajoutee

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | partition d equivalence (entree valide) |

- **Préconditions :** Admin connecte
- **Données :** email=nouveau.test+TC311@boussole.demo, prenom=Test, nom=Compte, role=Accompagne
- **Étapes :**
  1. Renseigner le formulaire 'Creer un compte'
  2. Cliquer 'Creer et envoyer l activation'
- **Résultat attendu :** POST /admin/users 201 ; message 'Compte cree, email d activation envoye.' ; le formulaire se reinitialise ; le tableau se recharge et contient le nouveau compte (email_verifie=1, sans mot de passe).
- **Traçabilité :** POST /admin/users + Admin.tsx createUser
- **Automatisation :** ✅ ui/admin.spec.ts

### TC-UI-312 — Creer un compte : email vide bloque par la validation HTML5 (champ required)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | validation | moyenne | valeurs limites (champ obligatoire vide) |

- **Préconditions :** Admin connecte
- **Données :** email vide, role=Accompagne
- **Étapes :**
  1. Laisser le champ Email vide
  2. Cliquer 'Creer et envoyer l activation'
- **Résultat attendu :** Le navigateur bloque la soumission (input type=email required) ; aucun appel reseau n est emis.
- **Traçabilité :** Admin.tsx (input email required) 
- **Automatisation :** ✅ ui/admin.spec.ts

### TC-UI-313 — Creer un compte : email deja utilise -> message d erreur 409 affiche

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | validation | haute | partition d equivalence (doublon) ; test du contrat (409) |

- **Préconditions :** Admin connecte ; l email cible existe deja
- **Données :** email=afrit_mohamed@yahoo.fr (deja existant), role=Accompagne
- **Étapes :**
  1. Saisir un email deja present en base
  2. Soumettre le formulaire
- **Résultat attendu :** POST /admin/users 409 ; le bloc msg affiche 'Email deja utilise' ; aucune nouvelle ligne ; le formulaire n est pas reinitialise.
- **Traçabilité :** POST /admin/users -> 409 + Admin.tsx catch(err)
- **Automatisation :** ✅ ui/admin.spec.ts

### TC-UI-314 — Rattacher un accompagne a un accompagnateur : succes

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test du contrat (lien) |

- **Préconditions :** Admin connecte ; au moins un accompagnateur et un accompagne
- **Données :** accompagnateur=camille.laurent@boussole.demo, accompagne=lea.martin@boussole.demo
- **Étapes :**
  1. Dans la carte 'Rattacher un accompagne', selectionner l accompagnateur puis l accompagne
  2. Cliquer 'Rattacher'
- **Résultat attendu :** POST /admin/lien 200 ; message 'Rattachement effectue.' ; le lien est cree (INSERT OR IGNORE, idempotent si deja existant).
- **Traçabilité :** POST /admin/lien + Admin.tsx createLien
- **Automatisation :** ✅ ui/admin.spec.ts

### TC-UI-315 — Rattacher : selection incomplete (accompagnateur ou accompagne manquant) -> erreur

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | validation | moyenne | table de decision (les deux ids requis) |

- **Préconditions :** Admin connecte
- **Données :** accompagnateurId vide ('—') et/ou accompagneId vide
- **Étapes :**
  1. Laisser un des deux selects sur '—'
  2. Cliquer 'Rattacher'
- **Résultat attendu :** Number('') -> NaN cote front ; backend renvoie 400 'Selection invalide (accompagnateur et accompagne requis)' ; le message d erreur s affiche.
- **Traçabilité :** POST /admin/lien -> 400 + Admin.tsx createLien
- **Automatisation :** ✅ ui/admin.spec.ts

### TC-UI-316 — Gestionnaire de plans : creation d un plan via '+ Nouveau plan'

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test du contrat (creation) |

- **Préconditions :** Admin connecte sur /admin
- **Données :** Aucune (defaut nom='Nouveau plan', features=[])
- **Étapes :**
  1. Dans la section 'Plans d abonnement', cliquer '+ Nouveau plan'
  2. Observer la liste et l accordeon
- **Résultat attendu :** POST /admin/plans 201 ; un plan 'Nouveau plan' apparait avec '0 fonctionnalite' et '0 utilisateur' ; l accordeon du nouveau plan s ouvre automatiquement (setOpen(d.id)).
- **Traçabilité :** POST /admin/plans + PlansManager create()
- **Automatisation :** ✅ ui/admin.spec.ts

### TC-UI-317 — Plan : cocher/decocher une fonctionnalite individuelle puis Enregistrer

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test du contrat (toggle feature) |

- **Préconditions :** Admin connecte, un plan ouvert (accordeon deplie)
- **Données :** Feature 'audio' (categorie Visuel)
- **Étapes :**
  1. Ouvrir un plan
  2. Cocher la case 'Lecture audio (CR / synthese)'
  3. Cliquer 'Enregistrer'
  4. Recharger la page et rouvrir le plan
- **Résultat attendu :** Le compteur de fonctionnalites augmente ; PATCH {features:[...,'audio']} ; message 'Plan ... enregistre.' ; apres reload la case reste cochee (persistance).
- **Traçabilité :** PATCH /admin/plans/:id {features} + PlansManager toggle/save
- **Automatisation :** ✅ ui/admin.spec.ts

### TC-UI-318 — Plan : 'Tout cocher' / 'Tout decocher' une categorie

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | table de decision (allOn -> on/off de categorie) |

- **Préconditions :** Admin connecte, un plan ouvert
- **Données :** Categorie 'IA & posture' (7 fonctionnalites)
- **Étapes :**
  1. Ouvrir le plan
  2. Dans la fieldset 'IA & posture', cliquer 'Tout cocher'
  3. Verifier que les 7 cases sont cochees et le libelle bascule en 'Tout decocher'
  4. Cliquer 'Tout decocher' puis Enregistrer
- **Résultat attendu :** toggleCat ajoute/retire l ensemble des cles de la categorie ; le bouton bascule selon allOn ; apres Enregistrer + reload l etat est conforme.
- **Traçabilité :** PlansManager toggleCat + PATCH /admin/plans/:id
- **Automatisation :** ✅ ui/admin.spec.ts

### TC-UI-319 — Plan : modifier le nom et la description puis Enregistrer

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | partition d equivalence (entree valide) |

- **Préconditions :** Admin connecte, un plan ouvert
- **Données :** nom='Essentiel+', description='Offre intermediaire'
- **Étapes :**
  1. Ouvrir le plan
  2. Modifier le champ 'Nom du plan' et la zone Description
  3. Cliquer 'Enregistrer'
- **Résultat attendu :** PATCH {nom,description,features} 200 ; message succes ; apres reload le nouveau nom apparait dans l en-tete et dans le select Abonnement du tableau des comptes.
- **Traçabilité :** PATCH /admin/plans/:id {nom,description} + PlansManager save
- **Automatisation :** ✅ ui/admin.spec.ts

### TC-UI-320 — Plan : nom vide a l enregistrement -> erreur backend affichee

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | validation | moyenne | valeurs limites (chaine vide apres trim) |

- **Préconditions :** Admin connecte, un plan ouvert
- **Données :** nom=' ' (espaces uniquement)
- **Étapes :**
  1. Vider le champ 'Nom du plan' (ou ne laisser que des espaces)
  2. Cliquer 'Enregistrer'
- **Résultat attendu :** PATCH renvoie 400 'Le nom du plan ne peut pas etre vide' ; le bloc msg affiche l erreur ; le plan n est pas renomme.
- **Traçabilité :** PATCH /admin/plans/:id -> 400 + PlansManager save catch
- **Automatisation :** ⏳ à automatiser

### TC-UI-321 — Plan : duplication cree une copie suffixee '(copie)'

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | test du contrat (duplication) |

- **Préconditions :** Admin connecte, un plan existant (ex. Pro)
- **Données :** Plan source : Pro
- **Étapes :**
  1. Ouvrir le plan Pro
  2. Cliquer 'Dupliquer'
- **Résultat attendu :** POST /admin/plans/:id/duplication 201 ; un nouveau plan 'Pro (copie)' apparait avec les memes fonctionnalites et 0 utilisateur ; son accordeon s ouvre.
- **Traçabilité :** POST /admin/plans/:id/duplication + PlansManager duplicate
- **Automatisation :** ✅ ui/admin.spec.ts

### TC-UI-322 — Plan : suppression d un plan sans utilisateur (confirmation)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | table de decision (nb_users===0) |

- **Préconditions :** Admin connecte, un plan sans utilisateur rattache (nb_users=0)
- **Données :** Plan jetable cree pour le test
- **Étapes :**
  1. Ouvrir le plan
  2. Cliquer 'Supprimer'
  3. Verifier le texte de la boite de confirmation puis confirmer (OK)
- **Résultat attendu :** Le confirm indique 'Aucun utilisateur n y est rattache.' ; apres OK, DELETE /admin/plans/:id 200 ; le plan disparait de la liste et du select Abonnement.
- **Traçabilité :** DELETE /admin/plans/:id + PlansManager remove
- **Automatisation :** ✅ ui/admin.spec.ts

### TC-UI-323 — Plan : suppression d un plan avec utilisateurs -> message d avertissement et rattachement perdu

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | table de decision (nb_users>0) ; test du contrat (cascade plan_id=NULL) |

- **Préconditions :** Admin connecte, un plan avec nb_users > 0
- **Données :** Plan rattache a >=1 utilisateur
- **Étapes :**
  1. Affecter le plan a un compte de test (TC-UI-307)
  2. Cliquer 'Supprimer' sur ce plan
  3. Lire le confirm puis confirmer
- **Résultat attendu :** Le confirm precise 'Les N utilisateur(s) rattache(s) repasseront au niveau maximum' ; apres OK, le backend met plan_id=NULL pour ces comptes puis supprime le plan ; le compte de test affiche 'Niveau max'.
- **Traçabilité :** DELETE /admin/plans/:id (UPDATE users plan_id=NULL) + PlansManager remove
- **Automatisation :** ✅ ui/admin.spec.ts

### TC-UI-324 — Plan : annulation de la suppression dans la boite de confirmation

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | basse | table de decision (confirm=false) |

- **Préconditions :** Admin connecte, un plan ouvert
- **Données :** N importe quel plan
- **Étapes :**
  1. Cliquer 'Supprimer'
  2. Cliquer 'Annuler' dans la boite de confirmation
- **Résultat attendu :** Aucun appel DELETE n est emis (remove retourne si !ok) ; le plan reste present.
- **Traçabilité :** PlansManager remove (window.confirm)
- **Automatisation :** ✅ ui/admin.spec.ts

### TC-UI-325 — PlansManager : etat vide quand aucun plan

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | basse | partition d equivalence (liste vide) |

- **Préconditions :** Admin connecte, base sans aucun plan
- **Données :** Table plans vide
- **Étapes :**
  1. Supprimer tous les plans
  2. Observer la section 'Plans d abonnement'
- **Résultat attendu :** Le message 'Aucun plan pour l instant. Tous les utilisateurs ont acces a toutes les fonctionnalites.' s affiche ; le select Abonnement du tableau ne propose que 'Niveau max'.
- **Traçabilité :** PlansManager (plans.length===0) + GET /admin/plans
- **Automatisation :** ✅ ui/admin.spec.ts

### TC-UI-326 — PlansManager : les categories sont affichees dans l ordre du registre features

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | basse | test du contrat (registre features) |

- **Préconditions :** Admin connecte, un plan ouvert
- **Données :** GET /admin/features
- **Étapes :**
  1. Ouvrir un plan
  2. Lister l ordre des fieldsets de categories
- **Résultat attendu :** Les categories apparaissent dans l ordre de premiere occurrence du registre (Socle, Visuel, IA & posture, Relationnel, Emergence, Pilotage, Collaboration, Ethique, Confort, Adoption) ; chaque feature est sous sa categorie.
- **Traçabilité :** GET /admin/features + PlansManager categories
- **Automatisation :** ✅ ui/admin.spec.ts

### TC-UI-327 — Console RGPD : affichage des demandes d effacement en attente

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test du contrat (mapping demande->carte) |

- **Préconditions :** Admin connecte ; au moins une demande_effacement statut='en_attente'
- **Données :** Une demande seedee avec motif et parcours
- **Étapes :**
  1. Faire emettre une demande d effacement par un accompagne
  2. Ouvrir /admin et la section 'Confidentialite & RGPD'
- **Résultat attendu :** Le compteur 'Demandes d effacement (N)' est correct ; chaque carte montre nom/email, date (10 caracteres), parcours eventuel, motif entre guillemets, et boutons 'Anonymiser' / 'Supprimer'.
- **Traçabilité :** GET /admin/effacements + RgpdConsole
- **Automatisation :** ✅ ui/admin.spec.ts

### TC-UI-328 — Console RGPD : etat vide quand aucune demande

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | basse | partition d equivalence (liste vide) |

- **Préconditions :** Admin connecte, aucune demande en attente
- **Données :** Table demandes_effacement sans statut en_attente
- **Étapes :**
  1. Ouvrir la section RGPD sans demande en attente
- **Résultat attendu :** Le message 'Aucune demande en attente.' s affiche ; aucune carte de demande.
- **Traçabilité :** GET /admin/effacements (vide) + RgpdConsole
- **Automatisation :** ✅ ui/admin.spec.ts

### TC-UI-329 — Console RGPD : anonymiser une demande (confirmation) puis disparition de la liste

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test du contrat (action anonymiser) |

- **Préconditions :** Admin connecte ; une demande en attente
- **Données :** Demande d un accompagne de test ; action=anonymiser
- **Étapes :**
  1. Cliquer 'Anonymiser' sur la carte
  2. Confirmer la boite 'Confirmer : anonymiser les donnees de ...'
  3. Observer le message et la liste
- **Résultat attendu :** POST /admin/effacements/:id {action:'anonymiser'} 200 ; message 'Demande traitee (anonymiser).' ; la demande passe a 'traitee' et disparait de la liste ; le compte est anonymise (email anonyme-<id>@boussole.local, actif=0, anonymise=1).
- **Traçabilité :** POST /admin/effacements/:id + RgpdConsole traiter + ethique.processEffacement
- **Automatisation :** ✅ ui/admin.spec.ts

### TC-UI-330 — Console RGPD : supprimer une demande (confirmation) -> suppression definitive du compte

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test du contrat (action supprimer) |

- **Préconditions :** Admin connecte ; une demande en attente
- **Données :** Demande d un accompagne jetable ; action=supprimer
- **Étapes :**
  1. Cliquer 'Supprimer' sur la carte
  2. Confirmer la boite 'Confirmer : SUPPRIMER definitivement les donnees de ...'
  3. Observer le message et la liste
- **Résultat attendu :** POST /admin/effacements/:id {action:'supprimer'} 200 ; message 'Demande traitee (supprimer).' ; le compte est supprime (cascade) et la demande disparait ; il n apparait plus dans GET /admin/users.
- **Traçabilité :** POST /admin/effacements/:id + ethique.deleteUser
- **Automatisation :** ✅ ui/admin.spec.ts

### TC-UI-331 — Console RGPD : annuler la boite de confirmation laisse la demande intacte

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | basse | table de decision (confirm=false) |

- **Préconditions :** Admin connecte ; une demande en attente
- **Données :** Action anonymiser, confirm=Annuler
- **Étapes :**
  1. Cliquer 'Anonymiser'
  2. Cliquer 'Annuler' dans la boite de confirmation
- **Résultat attendu :** Aucun appel POST n est emis (traiter retourne si !confirm) ; la demande reste en attente.
- **Traçabilité :** RgpdConsole traiter (window.confirm)
- **Automatisation :** ✅ ui/admin.spec.ts

### TC-UI-332 — Retention : affichage du seuil, du mode (auto/manuel) et de la liste des eligibles

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | moyenne | test du contrat (parametres retention) |

- **Préconditions :** Admin connecte ; au moins un compte eligible a la retention
- **Données :** RETENTION_MONTHS=36 (defaut) ; un accompagne dont tous les parcours sont clotures et inactifs > 36 mois
- **Étapes :**
  1. Ouvrir le bloc 'Retention des donnees'
- **Résultat attendu :** Le texte indique le seuil en mois (36) et '(automatique activee)' ou '(anonymisation manuelle)' selon RETENTION_AUTO ; le nombre d eligibles est correct ; la liste montre email + date de derniere activite (10 caracteres).
- **Traçabilité :** GET /admin/retention + RgpdConsole + ethique.retentionEligibles
- **Automatisation :** ✅ ui/admin.spec.ts

### TC-UI-333 — Retention : appliquer maintenant anonymise les comptes eligibles (confirmation)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | haute | test du contrat (application retention) |

- **Préconditions :** Admin connecte ; eligibles.length > 0
- **Données :** N comptes eligibles
- **Étapes :**
  1. Cliquer 'Appliquer la retention maintenant'
  2. Confirmer la boite 'Anonymiser N compte(s) inactif(s) au-dela de M mois ?'
  3. Observer le message
- **Résultat attendu :** POST /admin/retention/appliquer 200 {anonymises:N} ; message 'N compte(s) anonymise(s) par retention.' ; apres reload la liste des eligibles se vide (comptes desormais anonymise=1).
- **Traçabilité :** POST /admin/retention/appliquer + RgpdConsole appliquerRetention
- **Automatisation :** ✅ ui/admin.spec.ts

### TC-UI-334 — Retention : bouton 'Appliquer' absent quand aucun eligible

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | fonctionnel | basse | partition d equivalence (liste vide) |

- **Préconditions :** Admin connecte ; aucun compte eligible
- **Données :** eligibles.length === 0
- **Étapes :**
  1. Ouvrir le bloc Retention sans eligibles
- **Résultat attendu :** Le texte affiche '0 compte(s) eligible(s) aujourd hui.' ; la liste et le bouton 'Appliquer la retention maintenant' ne sont pas rendus.
- **Traçabilité :** RgpdConsole (eligibles.length>0 conditionnel)
- **Automatisation :** ✅ ui/admin.spec.ts

### TC-UI-335 — GET /admin/users nominal : 200 et structure de chaque compte

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | fonctionnel | haute | test du contrat |

- **Préconditions :** Cookie de session admin valide
- **Données :** GET /api/admin/users
- **Étapes :**
  1. Appeler GET /api/admin/users avec le cookie admin
- **Résultat attendu :** 200 ; { users: [...] } ; chaque user porte id, email, role, nom, prenom, actif, email_verifie, plan_id, plan_nom (null si pas de plan) ; tri cree_le DESC.
- **Traçabilité :** GET /admin/users
- **Automatisation :** ✅ ui/admin.spec.ts

### TC-UI-336 — Endpoints admin non authentifie -> 401

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test base sur les roles (anonyme) |

- **Préconditions :** Aucun cookie de session
- **Données :** GET /api/admin/users, /admin/plans, /admin/features, /admin/effacements, /admin/retention
- **Étapes :**
  1. Appeler chaque endpoint admin sans cookie
- **Résultat attendu :** 401 'Non authentifie' (requireAuth) pour tous ; aucune donnee renvoyee.
- **Traçabilité :** requireAuth sur routes /admin/*
- **Automatisation :** ✅ ui/admin.spec.ts

### TC-UI-337 — Endpoints admin avec role non-admin -> 403

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | acces | haute | test base sur les roles (mauvais role) |

- **Préconditions :** Cookie de session accompagnateur ou accompagne
- **Données :** GET /api/admin/plans (et autres routes /admin/*)
- **Étapes :**
  1. S authentifier en accompagnateur
  2. Appeler GET /api/admin/plans et POST /api/admin/plans
- **Résultat attendu :** 403 'Acces refuse' (requireRole('admin')) ; aucune lecture/ecriture effectuee.
- **Traçabilité :** requireRole('admin') sur routes /admin/*
- **Automatisation :** ✅ ui/admin.spec.ts

### TC-UI-338 — PATCH /admin/users/:id avec plan_id inexistant -> 400 'Plan introuvable'

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | partition d equivalence (id invalide) |

- **Préconditions :** Cookie admin ; compte cible distinct de l admin
- **Données :** PATCH {plan_id: 999999} (id inexistant)
- **Étapes :**
  1. Appeler PATCH /api/admin/users/<cible> avec un plan_id inexistant
- **Résultat attendu :** 400 'Plan introuvable' ; le plan_id du compte n est pas modifie.
- **Traçabilité :** PATCH /admin/users/:id (verif plan existe)
- **Automatisation :** ✅ ui/admin.spec.ts

### TC-UI-339 — PATCH/DELETE /admin/plans/:id sur id inexistant -> 404

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | partition d equivalence (ressource inexistante) |

- **Préconditions :** Cookie admin
- **Données :** id=999999 inexistant
- **Étapes :**
  1. Appeler PATCH /api/admin/plans/999999
  2. Appeler DELETE /api/admin/plans/999999
  3. Appeler POST /api/admin/plans/999999/duplication
- **Résultat attendu :** 404 'Plan introuvable' pour les trois cas ; aucune modification.
- **Traçabilité :** PATCH/DELETE /admin/plans/:id + POST /admin/plans/:id/duplication
- **Automatisation :** ✅ ui/admin.spec.ts

### TC-UI-340 — POST /admin/effacements/:id avec action invalide -> 400

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | partition d equivalence (valeur hors domaine) |

- **Préconditions :** Cookie admin ; une demande en attente
- **Données :** POST {action:'effacer'} (valeur hors {anonymiser,supprimer})
- **Étapes :**
  1. Appeler POST /api/admin/effacements/<id> avec action invalide
- **Résultat attendu :** 400 'Action invalide (anonymiser | supprimer)' ; demande inchangee.
- **Traçabilité :** POST /admin/effacements/:id (garde action)
- **Automatisation :** ✅ ui/admin.spec.ts

### TC-UI-341 — POST /admin/effacements/:id sur demande inexistante -> 404

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | basse | partition d equivalence (ressource inexistante) |

- **Préconditions :** Cookie admin
- **Données :** id=999999 inexistant, action=anonymiser
- **Étapes :**
  1. Appeler POST /api/admin/effacements/999999 {action:'anonymiser'}
- **Résultat attendu :** 404 'Demande introuvable' (processEffacement retourne false).
- **Traçabilité :** POST /admin/effacements/:id + ethique.processEffacement
- **Automatisation :** ✅ ui/admin.spec.ts

### TC-UI-342 — POST /admin/rgpd/:userId sur son propre compte -> 400

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | table de decision (userId===meId) |

- **Préconditions :** Cookie admin
- **Données :** userId = id de l admin connecte, action=anonymiser
- **Étapes :**
  1. Appeler POST /api/admin/rgpd/<monId> {action:'anonymiser'}
- **Résultat attendu :** 400 'Action impossible sur votre propre compte' ; aucun changement.
- **Traçabilité :** POST /admin/rgpd/:userId (garde meId)
- **Automatisation :** ✅ ui/admin.spec.ts

### TC-UI-343 — POST /admin/rgpd/:userId sur compte inexistant -> 404 ; action invalide -> 400

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | basse | partition d equivalence (id et action) |

- **Préconditions :** Cookie admin
- **Données :** userId inexistant ; puis userId valide avec action='xxx'
- **Étapes :**
  1. POST /api/admin/rgpd/999999 {action:'supprimer'}
  2. POST /api/admin/rgpd/<valide> {action:'xxx'}
- **Résultat attendu :** Cas 1 : 404 'Utilisateur introuvable' ; cas 2 : 400 'Action invalide'.
- **Traçabilité :** POST /admin/rgpd/:userId
- **Automatisation :** ✅ ui/admin.spec.ts

### TC-UI-344 — POST /admin/plans nom vide -> 400

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | valeurs limites (chaine vide apres trim) |

- **Préconditions :** Cookie admin
- **Données :** POST {nom:'   ', features:[]}
- **Étapes :**
  1. Appeler POST /api/admin/plans avec un nom vide apres trim
- **Résultat attendu :** 400 'Le nom du plan est requis' ; aucun plan cree.
- **Traçabilité :** POST /admin/plans (validation nom)
- **Automatisation :** ✅ ui/admin.spec.ts

### TC-UI-345 — POST /admin/users role hors liste -> 400 'Donnees invalides'

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| API | validation | moyenne | partition d equivalence (role hors domaine) |

- **Préconditions :** Cookie admin
- **Données :** POST {email:'x@y.z', role:'superadmin'}
- **Étapes :**
  1. Appeler POST /api/admin/users avec un role hors {admin,accompagnateur,accompagne}
- **Résultat attendu :** 400 'Donnees invalides' (ROLES.includes false) ; aucun compte cree.
- **Traçabilité :** POST /admin/users (validation role)
- **Automatisation :** ✅ ui/admin.spec.ts

### TC-UI-346 — Unitaire repli deterministe : sanitizeKeys filtre les cles inconnues et deduplique

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | validation | haute | partition d equivalence + valeurs limites (entree non-tableau) |

- **Préconditions :** Module features.ts importable en test
- **Données :** sanitizeKeys(['audio','audio','inconnue','dark_mode', 42]) ; sanitizeKeys('nope') ; sanitizeKeys(null)
- **Étapes :**
  1. Appeler sanitizeKeys avec un tableau melange valides/invalides/doublons
  2. Appeler avec une non-liste
- **Résultat attendu :** Resultat = ['audio','dark_mode'] (cles invalides 'inconnue' et 42 retirees, doublon supprime, ordre preserve) ; pour une non-liste -> [] ; pour null -> [].
- **Traçabilité :** features.sanitizeKeys
- **Automatisation :** ⏳ à automatiser

### TC-UI-347 — Unitaire repli deterministe : userFeatures renvoie ALL si pas de plan, le sous-ensemble sinon

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | haute | table de decision (presence plan / parsing) |

- **Préconditions :** DB de test ; un user sans plan, un user avec plan {features:['audio']}
- **Données :** userFeatures(idSansPlan) ; userFeatures(idAvecPlan)
- **Étapes :**
  1. Appeler userFeatures pour un compte sans plan_id
  2. Appeler userFeatures pour un compte rattache a un plan limite
  3. Appeler avec un plan dont features est un JSON corrompu
- **Résultat attendu :** Sans plan -> Set(ALL_FEATURE_KEYS) ; avec plan -> Set(['audio']) ; JSON corrompu -> Set(ALL_FEATURE_KEYS) (catch -> niveau max).
- **Traçabilité :** features.userFeatures
- **Automatisation :** ⏳ à automatiser

### TC-UI-348 — Unitaire repli deterministe : anonymizeUser efface l identite et les contenus libres

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | haute | test du contrat (effets de l anonymisation) |

- **Préconditions :** DB de test avec un user, des journal_entrees, meteo_humeur, emotions_roue, tokens, push_subscriptions
- **Données :** anonymizeUser(userId)
- **Étapes :**
  1. Appeler anonymizeUser(userId)
  2. Relire les tables impactees
- **Résultat attendu :** users : email='anonyme-<id>@boussole.local', nom/prenom/password_hash NULL, actif=0, anonymise=1 ; push_subscriptions et tokens du user supprimes ; journal_entrees supprimees ; meteo_humeur.mot et emotions_roue.note mis a NULL ; transaction atomique.
- **Traçabilité :** ethique.anonymizeUser
- **Automatisation :** ✅ unit/ethique.test.ts

### TC-UI-349 — Unitaire repli deterministe : retentionEligibles ne retient que les accompagnes clotures et inactifs

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | haute | table de decision (criteres de retention) + valeurs limites (seuil) |

- **Préconditions :** DB de test : accompagne A (tous dossiers clotures, activite > seuil), B (un dossier non cloture), C (sans dossier), D (deja anonymise)
- **Données :** retentionEligibles(36)
- **Étapes :**
  1. Preparer les 4 comptes de profils differents
  2. Appeler retentionEligibles(36)
- **Résultat attendu :** Seul A est retourne (role=accompagne, anonymise=0, EXISTS dossiers, AUCUN dossier non 'cloture', derniere_activite < now-36 mois) ; B, C, D exclus ; chaque element porte id, email, derniere_activite.
- **Traçabilité :** ethique.retentionEligibles
- **Automatisation :** ✅ unit/ethique.test.ts

### TC-UI-350 — Unitaire repli deterministe : processEffacement marque 'traitee' (anonymiser) ou cascade (supprimer)

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| Unitaire | fonctionnel | moyenne | table de decision (action x existence) |

- **Préconditions :** DB de test avec une demande_effacement liee a un accompagne
- **Données :** processEffacement(idDem,'anonymiser') ; processEffacement(idDem2,'supprimer') ; processEffacement(999,'anonymiser')
- **Étapes :**
  1. Appeler avec action anonymiser sur une demande valide
  2. Appeler avec action supprimer sur une autre demande valide
  3. Appeler avec un id de demande inexistant
- **Résultat attendu :** anonymiser -> true, compte anonymise, demande statut='traitee' avec action et traite_le ; supprimer -> true, compte supprime (la demande part en cascade) ; id inexistant -> false.
- **Traçabilité :** ethique.processEffacement
- **Automatisation :** ✅ unit/ethique.test.ts

### TC-UI-351 — Non-regression : retirer un plan du tableau des comptes ne casse pas les autres lignes

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | non-regression | basse | test base sur les roles + non-regression |

- **Préconditions :** Admin connecte, plusieurs comptes dont certains avec plan
- **Données :** Suppression d un plan utilise (via PlansManager)
- **Étapes :**
  1. Supprimer un plan rattache a un compte (TC-UI-323)
  2. Verifier le tableau des comptes apres le double reload (load + loadPlans via onChange)
- **Résultat attendu :** Le tableau se recharge sans erreur ; seuls les comptes du plan supprime passent a 'Niveau max' ; les autres conservent leur plan et leur role.
- **Traçabilité :** Admin.tsx onChange (load + loadPlans) + DELETE /admin/plans/:id
- **Automatisation :** ✅ ui/admin.spec.ts

### TC-UI-352 — Non-regression : message d erreur surface dans l UI quand un appel admin echoue

| Niveau | Type | Priorité | Technique |
|---|---|---|---|
| UI | non-regression | moyenne | test du contrat (propagation d erreur api.ts) |

- **Préconditions :** Admin connecte
- **Données :** Provoquer un 409 (creation email existant) ou un 400 (lien incomplet)
- **Étapes :**
  1. Declencher une erreur cote backend depuis un formulaire admin
  2. Observer le bloc msg
- **Résultat attendu :** Le helper api() leve une Error portant le champ 'error' du backend ; le composant l affiche (form-success/msg) sans crash de page.
- **Traçabilité :** lib/api.ts (throw new Error(msg)) + Admin.tsx/PlansManager/RgpdConsole catch
- **Automatisation :** ✅ ui/admin.spec.ts

