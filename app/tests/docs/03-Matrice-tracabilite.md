# Matrice de traçabilité — Boussole

> Identifiant : BOUSSOLE-MAT-001 · 1256 cas · 1061 automatisés (84%).
> Régénérée à chaque exécution (un cas est « automatisé » dès que son ID apparaît dans le code de test).

## Synthèse de couverture par domaine

| Domaine | Cas | Automatisés | Couverture |
|---|---|---|---|
| AUTH | 69 | 58 | 84% |
| QUEST | 34 | 29 | 85% |
| RDV | 66 | 59 | 89% |
| ENTR | 84 | 76 | 90% |
| CR | 75 | 67 | 89% |
| ACTNOTIF | 74 | 66 | 89% |
| DOSSIER | 85 | 68 | 80% |
| RELEMERG | 100 | 86 | 86% |
| LOT1 | 63 | 53 | 84% |
| PILOT | 59 | 24 | 41% |
| REFLEX | 72 | 67 | 93% |
| COLLAB | 64 | 53 | 83% |
| VIZ | 49 | 44 | 90% |
| CONFORT | 50 | 42 | 84% |
| ETHIQUE | 50 | 44 | 88% |
| ADOPT | 26 | 20 | 77% |
| UI_ACC | 59 | 47 | 80% |
| UI_ACP | 72 | 56 | 78% |
| UI_ADMIN | 53 | 50 | 94% |
| WIKI | 23 | 23 | 100% |
| TWOFA | 6 | 6 | 100% |
| SECU | 4 | 4 | 100% |
| CSRF | 4 | 4 | 100% |
| OBS | 6 | 6 | 100% |
| A11Y | 9 | 9 | 100% |
| **Total** | **1256** | **1061** | **84%** |

## Détail (cas ↔ fonctionnalité/endpoint ↔ test automatisé)

| Cas | Niveau | Priorité | Traçabilité (feature / endpoint / UI) | Test automatisé |
|---|---|---|---|---|
| TC-AUTH-001 | API | haute | auth — POST /api/auth/register | ✅ api/auth.test.ts |
| TC-AUTH-002 | API | moyenne | auth — POST /api/auth/register | ✅ api/auth.test.ts |
| TC-AUTH-003 | API | haute | auth — POST /api/auth/register (registerSchema password.min(8)) | ✅ api/auth.test.ts |
| TC-AUTH-004 | API | haute | auth — POST /api/auth/register (registerSchema password.min(8)) | ✅ api/auth.test.ts |
| TC-AUTH-005 | API | haute | auth — POST /api/auth/register (registerSchema consent: z.literal(true)) | ✅ api/auth.test.ts |
| TC-AUTH-006 | API | haute | auth — POST /api/auth/register (registerSchema email) | ✅ api/auth.test.ts |
| TC-AUTH-007 | API | haute | auth — POST /api/auth/register (registerSchema role enum) | ✅ api/auth.test.ts |
| TC-AUTH-008 | API | haute | auth — POST /api/auth/register (SELECT id FROM users WHERE email=?) | ✅ api/auth.test.ts |
| TC-AUTH-009 | API | basse | auth — POST /api/auth/register (registerSchema nom.min(1).optional()) | ✅ api/auth.test.ts |
| TC-AUTH-010 | API | haute | auth — GET /api/auth/verify-email | ✅ api/auth.test.ts |
| TC-AUTH-011 | API | haute | auth — GET /api/auth/verify-email (row absent) | ✅ api/auth.test.ts |
| TC-AUTH-012 | API | haute | auth — GET /api/auth/verify-email (expire_le < now) | ✅ api/auth.test.ts |
| TC-AUTH-013 | API | moyenne | auth — GET /api/auth/verify-email (utilise=0 dans le WHERE) | ✅ api/auth.test.ts |
| TC-AUTH-014 | API | moyenne | auth — GET /api/auth/verify-email (String(req.query.token\|\|'')) | ✅ api/auth.test.ts |
| TC-AUTH-015 | API | haute | auth — GET /api/auth/verify-email (branche row.email_cible) | ✅ api/auth.test.ts |
| TC-AUTH-016 | API | moyenne | auth — GET /api/auth/verify-email (taken sur email_cible) | ✅ api/auth.test.ts |
| TC-AUTH-017 | API | haute | auth — POST /api/auth/login | ✅ api/auth.test.ts |
| TC-AUTH-018 | API | haute | auth — POST /api/auth/login (bcrypt.compare false) | ✅ api/auth.test.ts |
| TC-AUTH-019 | API | haute | auth — POST /api/auth/login (user absent) | ✅ api/auth.test.ts |
| TC-AUTH-020 | API | haute | auth — POST /api/auth/login (!user.email_verifie) | ✅ api/auth.test.ts |
| TC-AUTH-021 | API | moyenne | auth — POST /api/auth/login (!user.actif) | ✅ api/auth.test.ts |
| TC-AUTH-022 | API | moyenne | auth — POST /api/auth/login (zod safeParse) | ✅ api/auth.test.ts |
| TC-AUTH-023 | API | moyenne | auth — POST /api/auth/logout | ✅ api/auth.test.ts |
| TC-AUTH-024 | API | haute | auth — GET /api/auth/me (requireAuth) | ✅ api/auth.test.ts |
| TC-AUTH-025 | API | haute | auth — GET /api/auth/me (requireAuth, token absent) | ✅ api/auth.test.ts |
| TC-AUTH-026 | API | haute | auth — GET /api/auth/me (requireAuth, jwt.verify catch) | ✅ api/auth.test.ts |
| TC-AUTH-027 | API | haute | auth — GET /api/auth/me/features (userFeatures sans plan) | ✅ api/auth.test.ts |
| TC-AUTH-028 | API | moyenne | auth — GET /api/auth/me/features (userFeatures avec plan) | ✅ api/auth.test.ts |
| TC-AUTH-029 | API | haute | auth — GET /api/auth/me/features (requireAuth) | ✅ api/auth.test.ts |
| TC-AUTH-030 | API | moyenne | auth — PATCH /api/auth/me | ✅ api/auth.test.ts |
| TC-AUTH-031 | API | basse | auth — PATCH /api/auth/me (trim() \|\| null) | ✅ api/auth.test.ts |
| TC-AUTH-032 | API | moyenne | auth — PATCH /api/auth/me (prenom.max(80)) | ✅ api/auth.test.ts |
| TC-AUTH-033 | API | haute | auth — PATCH /api/auth/me (requireAuth) | ✅ api/auth.test.ts |
| TC-AUTH-034 | API | haute | auth — POST /api/auth/change-password | ✅ api/auth.test.ts |
| TC-AUTH-035 | API | haute | auth — POST /api/auth/change-password (bcrypt.compare ancien) | ✅ api/auth.test.ts |
| TC-AUTH-036 | API | haute | auth — POST /api/auth/change-password (nouveau.min(8)) | ✅ api/auth.test.ts |
| TC-AUTH-037 | API | haute | auth — POST /api/auth/change-password (requireAuth) | ✅ api/auth.test.ts |
| TC-AUTH-038 | API | haute | auth — POST /api/auth/change-email | ✅ api/auth.test.ts |
| TC-AUTH-039 | API | moyenne | auth — POST /api/auth/change-email (me.email == email) | ✅ api/auth.test.ts |
| TC-AUTH-040 | API | haute | auth — POST /api/auth/change-email (taken) | ✅ api/auth.test.ts |
| TC-AUTH-041 | API | moyenne | auth — POST /api/auth/change-email (z.string().email()) | ✅ api/auth.test.ts |
| TC-AUTH-042 | API | haute | auth — POST /api/auth/change-email (requireAuth) | ✅ api/auth.test.ts |
| TC-AUTH-043 | API | haute | auth — POST /api/auth/request-reset | ✅ api/auth.test.ts |
| TC-AUTH-044 | API | haute | auth — POST /api/auth/request-reset (user absent) | ✅ api/auth.test.ts |
| TC-AUTH-045 | API | moyenne | auth — POST /api/auth/request-reset (z.string().email()) | ✅ api/auth.test.ts |
| TC-AUTH-046 | API | haute | auth — POST /api/auth/reset | ✅ api/auth.test.ts |
| TC-AUTH-047 | API | haute | auth — POST /api/auth/reset (row absent) | ✅ api/auth.test.ts |
| TC-AUTH-048 | API | moyenne | auth — POST /api/auth/reset (expire_le < now) | ✅ api/auth.test.ts |
| TC-AUTH-049 | API | moyenne | auth — POST /api/auth/reset (utilise=0) | ✅ api/auth.test.ts |
| TC-AUTH-050 | API | haute | auth — POST /api/auth/reset (password.min(8)) | ✅ api/auth.test.ts |
| TC-AUTH-051 | API | basse | auth — POST /api/auth/reset (z.string() token requis) | ✅ api/auth.test.ts |
| TC-AUTH-052 | Unitaire | haute | features — userFeatures() (row undefined -> new Set(ALL_FEATURE_KEYS)) | ✅ unit/core.test.ts |
| TC-AUTH-053 | Unitaire | moyenne | features — userFeatures() (catch -> ALL_FEATURE_KEYS) | ✅ unit/core.test.ts |
| TC-AUTH-054 | Unitaire | moyenne | features — sanitizeKeys() | ✅ unit/core.test.ts |
| TC-AUTH-055 | Unitaire | basse | util — makeToken() (randomBytes(32).toString('hex')) | ✅ unit/core.test.ts |
| TC-AUTH-056 | Unitaire | basse | util — expiryHours() | ✅ unit/core.test.ts |
| TC-AUTH-057 | Unitaire | moyenne | auth — requireRole() | ✅ unit/core.test.ts |
| TC-AUTH-058 | Unitaire | moyenne | features — requireFeature() | ✅ unit/core.test.ts |
| TC-AUTH-059 | UI | haute | auth — page Register.tsx (POST /api/auth/register) | ⏳ |
| TC-AUTH-060 | UI | moyenne | auth — page Register.tsx (409 affiché) | ⏳ |
| TC-AUTH-061 | UI | haute | auth — page Login.tsx (POST /api/auth/login + refresh) | ⏳ |
| TC-AUTH-062 | UI | moyenne | auth — page Login.tsx (401 affiché) | ⏳ |
| TC-AUTH-063 | UI | moyenne | auth — page VerifyEmail.tsx (GET /api/auth/verify-email) | ⏳ |
| TC-AUTH-064 | UI | basse | auth — page VerifyEmail.tsx (état error) | ⏳ |
| TC-AUTH-065 | UI | moyenne | auth — page ForgotPassword.tsx (POST /api/auth/request-reset) | ⏳ |
| TC-AUTH-066 | UI | haute | auth — page ResetPassword.tsx (POST /api/auth/reset) | ⏳ |
| TC-AUTH-067 | UI | moyenne | auth — page Profil.tsx (POST /api/auth/change-password) | ⏳ |
| TC-AUTH-068 | UI | moyenne | auth — page Profil.tsx (POST /api/auth/change-email) | ⏳ |
| TC-AUTH-069 | UI | haute | auth — composant Protected.tsx + AuthContext (GET /api/auth/me 401) | ⏳ |
| TC-QUEST-001 | API | haute | questionnaire — POST /api/questionnaire/next | ✅ api/quest.test.ts |
| TC-QUEST-002 | API | haute | questionnaire — POST /api/questionnaire/next | ✅ api/quest.test.ts |
| TC-QUEST-003 | API | haute | questionnaire — POST /api/questionnaire/next (claude.ts fallbackNext) | ✅ api/quest.test.ts |
| TC-QUEST-004 | API | haute | questionnaire — POST /api/questionnaire/next (auth.ts requireAuth) | ✅ api/quest.test.ts |
| TC-QUEST-005 | API | moyenne | questionnaire — POST /api/questionnaire/next (auth.ts requireAuth) | ✅ api/quest.test.ts |
| TC-QUEST-006 | API | moyenne | questionnaire — POST /api/questionnaire/next | ✅ api/quest.test.ts |
| TC-QUEST-007 | API | moyenne | questionnaire — POST /api/questionnaire/next | ✅ api/quest.test.ts |
| TC-QUEST-008 | API | basse | questionnaire — POST /api/questionnaire/next | ✅ api/quest.test.ts |
| TC-QUEST-009 | API | basse | questionnaire — POST /api/questionnaire/next | ✅ api/quest.test.ts |
| TC-QUEST-010 | Unitaire | haute | questionnaire — claude.ts fallbackNext | ✅ unit/claude.test.ts |
| TC-QUEST-011 | Unitaire | haute | questionnaire — claude.ts fallbackNext | ✅ unit/claude.test.ts |
| TC-QUEST-012 | Unitaire | moyenne | questionnaire — claude.ts extractJson | ✅ unit/claude.test.ts |
| TC-QUEST-013 | Unitaire | haute | questionnaire — claude.ts questionnaireNext | ✅ unit/claude.test.ts |
| TC-QUEST-014 | Unitaire | moyenne | questionnaire — claude.ts questionnaireNext | ✅ unit/claude.test.ts |
| TC-QUEST-015 | Unitaire | moyenne | questionnaire — claude.ts questionnaireNext | ✅ unit/claude.test.ts |
| TC-QUEST-016 | API | haute | questionnaire — POST /api/questionnaire/save | ✅ api/quest.test.ts |
| TC-QUEST-017 | API | moyenne | questionnaire — POST /api/questionnaire/save | ✅ api/quest.test.ts |
| TC-QUEST-018 | API | haute | questionnaire — POST /api/questionnaire/save (multi_parcours) | ✅ api/quest.test.ts |
| TC-QUEST-019 | API | haute | questionnaire — POST /api/questionnaire/save | ✅ api/quest.test.ts |
| TC-QUEST-020 | API | moyenne | questionnaire — POST /api/questionnaire/save | ✅ api/quest.test.ts |
| TC-QUEST-021 | API | haute | questionnaire — POST /api/questionnaire/save | ✅ api/quest.test.ts |
| TC-QUEST-022 | API | moyenne | questionnaire — POST /api/questionnaire/save | ✅ api/quest.test.ts |
| TC-QUEST-023 | API | haute | questionnaire — POST /api/questionnaire/save (auth.ts requireAuth) | ✅ api/quest.test.ts |
| TC-QUEST-024 | API | moyenne | questionnaire — POST /api/questionnaire/save | ✅ api/quest.test.ts |
| TC-QUEST-025 | API | moyenne | questionnaire — POST /api/questionnaire/save | ✅ api/quest.test.ts |
| TC-QUEST-026 | API | basse | questionnaire — POST /api/questionnaire/save | ✅ api/quest.test.ts |
| TC-QUEST-027 | API | basse | questionnaire — POST /api/questionnaire/save | ✅ api/quest.test.ts |
| TC-QUEST-028 | API | haute | questionnaire — POST /api/questionnaire/save + GET /api/dossiers/.. (questionnaires_initiaux) | ✅ api/quest.test.ts |
| TC-QUEST-029 | API | moyenne | questionnaire — POST /api/questionnaire/save (notifications) | ✅ api/quest.test.ts |
| TC-QUEST-030 | UI | haute | questionnaire — app/web/src/pages/Questionnaire.tsx + POST /api/questionnaire/next | ⏳ |
| TC-QUEST-031 | UI | moyenne | questionnaire — Questionnaire.tsx (qa-prop) | ⏳ |
| TC-QUEST-032 | UI | moyenne | questionnaire — Questionnaire.tsx submit() | ⏳ |
| TC-QUEST-033 | UI | haute | questionnaire — Questionnaire.tsx save() + POST /api/questionnaire/save | ⏳ |
| TC-QUEST-034 | UI | basse | questionnaire — Questionnaire.tsx (AiProgress) | ⏳ |
| TC-RDV-001 | API | haute | features.ts:rdv ; POST /api/rdv/creneaux | ✅ api/rdv.test.ts |
| TC-RDV-002 | API | haute | features.ts:rdv ; POST /api/rdv/creneaux (rdv.ts:39-44) | ✅ api/rdv.test.ts |
| TC-RDV-003 | API | haute | features.ts:rdv ; POST /api/rdv/creneaux (rdv.ts:33-36) | ✅ api/rdv.test.ts |
| TC-RDV-004 | API | haute | features.ts:rdv ; POST /api/rdv/creneaux (rdv.ts:32-36) | ✅ api/rdv.test.ts |
| TC-RDV-005 | API | basse | features.ts:rdv ; POST /api/rdv/creneaux (rdv.ts:32-36) | ✅ api/rdv.test.ts |
| TC-RDV-006 | API | haute | auth.ts:requireAuth ; POST /api/rdv/creneaux | ✅ api/rdv.test.ts |
| TC-RDV-007 | API | haute | auth.ts:requireRole('accompagnateur') ; POST /api/rdv/creneaux | ✅ api/rdv.test.ts |
| TC-RDV-008 | API | moyenne | auth.ts:requireRole('accompagnateur') ; POST /api/rdv/creneaux | ✅ api/rdv.test.ts |
| TC-RDV-009 | API | haute | features.ts:rdv ; GET /api/rdv/creneaux/mine (rdv.ts:48-62) | ✅ api/rdv.test.ts |
| TC-RDV-010 | API | haute | features.ts:rdv ; GET /api/rdv/creneaux/mine (rdv.ts:57) | ✅ api/rdv.test.ts |
| TC-RDV-011 | API | haute | auth.ts:requireAuth ; GET /api/rdv/creneaux/mine | ✅ api/rdv.test.ts |
| TC-RDV-012 | API | moyenne | auth.ts:requireRole('accompagnateur') ; GET /api/rdv/creneaux/mine | ✅ api/rdv.test.ts |
| TC-RDV-013 | API | haute | features.ts:rdv ; DELETE /api/rdv/creneaux/:id (rdv.ts:64-78) | ✅ api/rdv.test.ts |
| TC-RDV-014 | API | haute | features.ts:rdv ; DELETE /api/rdv/creneaux/:id (rdv.ts:72-75) | ✅ api/rdv.test.ts |
| TC-RDV-015 | API | moyenne | features.ts:rdv ; DELETE /api/rdv/creneaux/:id (rdv.ts:67-71) | ✅ api/rdv.test.ts |
| TC-RDV-016 | API | haute | features.ts:rdv ; DELETE /api/rdv/creneaux/:id (rdv.ts:67) | ✅ api/rdv.test.ts |
| TC-RDV-017 | API | basse | features.ts:rdv ; DELETE /api/rdv/creneaux/:id (rdv.ts:66-67) | ✅ api/rdv.test.ts |
| TC-RDV-018 | API | moyenne | auth.ts:requireAuth ; DELETE /api/rdv/creneaux/:id | ✅ api/rdv.test.ts |
| TC-RDV-019 | API | moyenne | auth.ts:requireRole('accompagnateur') ; DELETE /api/rdv/creneaux/:id | ✅ api/rdv.test.ts |
| TC-RDV-020 | API | haute | features.ts:rdv ; GET /api/rdv/disponibles (rdv.ts:90-99) | ✅ api/rdv.test.ts |
| TC-RDV-021 | API | moyenne | features.ts:rdv ; GET /api/rdv/disponibles (rdv.ts:92-93, targetAccompagnateur/findAccompagnateurFor) | ✅ api/rdv.test.ts |
| TC-RDV-022 | API | haute | features.ts:rdv ; GET /api/rdv/disponibles (rdv.ts:96-97) | ✅ api/rdv.test.ts |
| TC-RDV-023 | API | haute | features.ts:rdv ; GET /api/rdv/disponibles (rdv.ts:82-87, 94) | ✅ api/rdv.test.ts |
| TC-RDV-024 | API | moyenne | auth.ts:requireRole('accompagne') ; GET /api/rdv/disponibles | ✅ api/rdv.test.ts |
| TC-RDV-025 | API | moyenne | auth.ts:requireAuth ; GET /api/rdv/disponibles | ✅ api/rdv.test.ts |
| TC-RDV-026 | API | haute | features.ts:rdv ; POST /api/rdv/reserver (rdv.ts:101-134) | ✅ api/rdv.test.ts |
| TC-RDV-027 | API | moyenne | features.ts:rdv ; POST /api/rdv/reserver (rdv.ts:116-120) | ✅ api/rdv.test.ts |
| TC-RDV-028 | API | haute | features.ts:rdv ; POST /api/rdv/reserver (rdv.ts:105-107) | ✅ api/rdv.test.ts |
| TC-RDV-029 | API | moyenne | features.ts:rdv ; POST /api/rdv/reserver (rdv.ts:105-107) | ✅ api/rdv.test.ts |
| TC-RDV-030 | API | moyenne | features.ts:rdv ; POST /api/rdv/reserver (rdv.ts:103-107) | ✅ api/rdv.test.ts |
| TC-RDV-031 | API | haute | features.ts:rdv ; POST /api/rdv/reserver (rdv.ts:112-115) | ✅ api/rdv.test.ts |
| TC-RDV-032 | API | haute | features.ts:rdv ; POST /api/rdv/reserver (rdv.ts:113-114) | ✅ api/rdv.test.ts |
| TC-RDV-033 | API | haute | features.ts:rdv ; POST /api/rdv/reserver (rdv.ts:116-117) | ✅ api/rdv.test.ts |
| TC-RDV-034 | API | moyenne | auth.ts:requireRole('accompagne') ; POST /api/rdv/reserver | ✅ api/rdv.test.ts |
| TC-RDV-035 | API | moyenne | auth.ts:requireAuth ; POST /api/rdv/reserver | ✅ api/rdv.test.ts |
| TC-RDV-036 | API | moyenne | features.ts:rdv ; POST /api/rdv/reserver (rdv.ts:122-128) | ✅ api/rdv.test.ts |
| TC-RDV-037 | API | haute | features.ts:rdv ; POST /api/rdv/demander (rdv.ts:137-150) | ✅ api/rdv.test.ts |
| TC-RDV-038 | API | haute | features.ts:rdv ; POST /api/rdv/demander (rdv.ts:142-148) | ✅ api/rdv.test.ts |
| TC-RDV-039 | API | haute | features.ts:rdv ; POST /api/rdv/demander (rdv.ts:140-141) | ✅ api/rdv.test.ts |
| TC-RDV-040 | API | moyenne | features.ts:rdv ; POST /api/rdv/demander (rdv.ts:139-141) | ✅ api/rdv.test.ts |
| TC-RDV-041 | API | moyenne | auth.ts:requireRole('accompagne') ; POST /api/rdv/demander | ✅ api/rdv.test.ts |
| TC-RDV-042 | API | moyenne | auth.ts:requireAuth ; POST /api/rdv/demander | ✅ api/rdv.test.ts |
| TC-RDV-043 | API | haute | features.ts:rdv ; GET /api/rdv/mine (rdv.ts:152-163) | ✅ api/rdv.test.ts |
| TC-RDV-044 | API | haute | features.ts:rdv ; GET /api/rdv/mine (rdv.ts:158) | ✅ api/rdv.test.ts |
| TC-RDV-045 | API | moyenne | auth.ts:requireRole('accompagne') ; GET /api/rdv/mine | ✅ api/rdv.test.ts |
| TC-RDV-046 | API | moyenne | auth.ts:requireAuth ; GET /api/rdv/mine | ✅ api/rdv.test.ts |
| TC-RDV-047 | API | haute | features.ts:rdv ; GET /api/rdv/:id/ics (rdv.ts:177-215) | ✅ api/rdv.test.ts |
| TC-RDV-048 | API | haute | features.ts:rdv ; GET /api/rdv/:id/ics (rdv.ts:194-200) | ✅ api/rdv.test.ts |
| TC-RDV-049 | API | haute | features.ts:rdv ; GET /api/rdv/:id/ics (rdv.ts:194-200) | ✅ api/rdv.test.ts |
| TC-RDV-050 | API | moyenne | features.ts:rdv ; GET /api/rdv/:id/ics (rdv.ts:194-200) | ✅ api/rdv.test.ts |
| TC-RDV-051 | API | moyenne | features.ts:rdv ; GET /api/rdv/:id/ics (rdv.ts:190-193) | ✅ api/rdv.test.ts |
| TC-RDV-052 | API | moyenne | auth.ts:requireAuth ; GET /api/rdv/:id/ics | ✅ api/rdv.test.ts |
| TC-RDV-053 | API | basse | features.ts:rdv ; GET /api/rdv/:id/ics (rdv.ts:179-193) | ✅ api/rdv.test.ts |
| TC-RDV-054 | Unitaire | moyenne | features.ts:rdv ; fonction icsStamp (rdv.ts:166-169) | ✅ unit/rdv.test.ts |
| TC-RDV-055 | Unitaire | moyenne | features.ts:rdv ; fonction icsEscape (rdv.ts:170-172) | ✅ unit/rdv.test.ts |
| TC-RDV-056 | Unitaire | basse | features.ts:rdv ; fonction icsNowUtc (rdv.ts:173-175) | ✅ unit/rdv.test.ts |
| TC-RDV-057 | Unitaire | basse | features.ts:rdv ; fonction formatFr (rdv.ts:23-27) | ✅ unit/rdv.test.ts |
| TC-RDV-058 | Unitaire | moyenne | features.ts:rdv ; fonction findAccompagnateurFor (rdv.ts:14-21) | ✅ unit/rdv.test.ts |
| TC-RDV-059 | UI | haute | RendezVous/Creneaux ; page Creneaux.tsx ; POST /api/rdv/creneaux + DELETE /api/rdv/creneaux/:id | ⏳ |
| TC-RDV-060 | UI | moyenne | RendezVous/Creneaux ; page Creneaux.tsx (lignes 85-94) ; GET /api/rdv/creneaux/mine | ⏳ |
| TC-RDV-061 | UI | haute | RendezVous/RendezVous ; page RendezVous.tsx ; POST /api/rdv/reserver + GET /rdv/mine + /rdv/disponibles | ⏳ |
| TC-RDV-062 | UI | basse | RendezVous/RendezVous ; page RendezVous.tsx (ligne 69) ; GET /rdv/disponibles | ⏳ |
| TC-RDV-063 | UI | moyenne | RendezVous ; ParcoursDetail.tsx (demander, lignes 61-64, 136) ; POST /api/rdv/demander puis POST /api/rdv/creneaux | ⏳ |
| TC-RDV-064 | UI | moyenne | RendezVous ; RendezVous.tsx ligne 59 / ParcoursDetail.tsx ligne 118 ; GET /api/rdv/:id/ics | ⏳ |
| TC-RDV-065 | UI | moyenne | RendezVous ; App.tsx Protected (lignes 113-114) ; pages Creneaux.tsx / RendezVous.tsx | ⏳ |
| TC-RDV-066 | API | basse | features.ts:rdv (clé définie mais non câblée) ; mount /api/rdv (index.ts:45) sans requireFeature | ✅ api/rdv.test.ts |
| TC-ENTR-001 | API | haute | entretien \| GET /api/entretien/phases | ✅ api/entr.test.ts |
| TC-ENTR-002 | API | moyenne | entretien \| GET /api/entretien/phases | ✅ api/entr.test.ts |
| TC-ENTR-003 | API | haute | entretien \| GET /api/entretien/phases | ✅ api/entr.test.ts |
| TC-ENTR-004 | API | moyenne | entretien \| GET /api/entretien/phases | ✅ api/entr.test.ts |
| TC-ENTR-005 | API | haute | entretien \| GET /api/entretien/dossiers | ✅ api/entr.test.ts |
| TC-ENTR-006 | API | haute | entretien \| GET /api/entretien/dossiers | ✅ api/entr.test.ts |
| TC-ENTR-007 | API | haute | entretien \| GET /api/entretien/dossiers | ✅ api/entr.test.ts |
| TC-ENTR-008 | API | moyenne | entretien \| GET /api/entretien/dossiers | ✅ api/entr.test.ts |
| TC-ENTR-009 | API | moyenne | entretien \| GET /api/entretien/dossiers | ✅ api/entr.test.ts |
| TC-ENTR-010 | API | haute | entretien \| GET /api/entretien/dashboard | ✅ api/entr.test.ts |
| TC-ENTR-011 | API | moyenne | entretien \| GET /api/entretien/dashboard | ✅ api/entr.test.ts |
| TC-ENTR-012 | API | basse | entretien \| GET /api/entretien/dashboard | ✅ api/entr.test.ts |
| TC-ENTR-013 | API | haute | entretien \| GET /api/entretien/dashboard | ✅ api/entr.test.ts |
| TC-ENTR-014 | API | moyenne | entretien \| GET /api/entretien/dashboard | ✅ api/entr.test.ts |
| TC-ENTR-015 | API | haute | entretien \| POST /api/entretien/sessions | ✅ api/entr.test.ts |
| TC-ENTR-016 | API | haute | entretien \| POST /api/entretien/sessions | ✅ api/entr.test.ts |
| TC-ENTR-017 | API | moyenne | entretien \| POST /api/entretien/sessions | ✅ api/entr.test.ts |
| TC-ENTR-018 | API | haute | entretien \| POST /api/entretien/sessions | ✅ api/entr.test.ts |
| TC-ENTR-019 | API | moyenne | entretien \| POST /api/entretien/sessions | ✅ api/entr.test.ts |
| TC-ENTR-020 | API | moyenne | entretien \| POST /api/entretien/sessions | ✅ api/entr.test.ts |
| TC-ENTR-021 | API | haute | entretien \| POST /api/entretien/sessions | ✅ api/entr.test.ts |
| TC-ENTR-022 | API | moyenne | entretien \| POST /api/entretien/sessions | ✅ api/entr.test.ts |
| TC-ENTR-023 | API | haute | entretien \| GET /api/entretien/sessions/:id | ✅ api/entr.test.ts |
| TC-ENTR-024 | API | haute | entretien \| GET /api/entretien/sessions/:id | ✅ api/entr.test.ts |
| TC-ENTR-025 | API | moyenne | entretien \| GET /api/entretien/sessions/:id | ✅ api/entr.test.ts |
| TC-ENTR-026 | API | basse | entretien \| GET /api/entretien/sessions/:id | ✅ api/entr.test.ts |
| TC-ENTR-027 | API | haute | entretien \| GET /api/entretien/sessions/:id | ✅ api/entr.test.ts |
| TC-ENTR-028 | API | moyenne | entretien \| GET /api/entretien/sessions/:id | ✅ api/entr.test.ts |
| TC-ENTR-029 | API | haute | entretien \| POST /api/entretien/sessions/:id/reponses | ✅ api/entr.test.ts |
| TC-ENTR-030 | API | haute | entretien \| POST /api/entretien/sessions/:id/reponses | ✅ api/entr.test.ts |
| TC-ENTR-031 | API | moyenne | entretien \| POST /api/entretien/sessions/:id/reponses | ✅ api/entr.test.ts |
| TC-ENTR-032 | API | moyenne | entretien \| POST /api/entretien/sessions/:id/reponses | ✅ api/entr.test.ts |
| TC-ENTR-033 | API | haute | entretien \| POST /api/entretien/sessions/:id/reponses | ✅ api/entr.test.ts |
| TC-ENTR-034 | API | moyenne | entretien \| POST /api/entretien/sessions/:id/reponses | ✅ api/entr.test.ts |
| TC-ENTR-035 | API | basse | entretien \| POST /api/entretien/sessions/:id/reponses | ✅ api/entr.test.ts |
| TC-ENTR-036 | API | haute | entretien \| POST /api/entretien/sessions/:id/questions | ✅ api/entr.test.ts |
| TC-ENTR-037 | API | basse | entretien \| POST /api/entretien/sessions/:id/questions | ✅ api/entr.test.ts |
| TC-ENTR-038 | API | haute | entretien \| POST /api/entretien/sessions/:id/questions | ✅ api/entr.test.ts |
| TC-ENTR-039 | API | haute | entretien \| POST /api/entretien/sessions/:id/questions | ✅ api/entr.test.ts |
| TC-ENTR-040 | API | moyenne | entretien \| POST /api/entretien/sessions/:id/questions | ✅ api/entr.test.ts |
| TC-ENTR-041 | API | basse | entretien \| POST /api/entretien/sessions/:id/questions | ✅ api/entr.test.ts |
| TC-ENTR-042 | API | haute | entretien \| PATCH /api/entretien/sessions/:id/questions/:qid | ✅ api/entr.test.ts |
| TC-ENTR-043 | API | haute | entretien \| PATCH /api/entretien/sessions/:id/questions/:qid | ✅ api/entr.test.ts |
| TC-ENTR-044 | API | moyenne | entretien \| PATCH /api/entretien/sessions/:id/questions/:qid | ✅ api/entr.test.ts |
| TC-ENTR-045 | API | moyenne | entretien \| PATCH /api/entretien/sessions/:id/questions/:qid | ✅ api/entr.test.ts |
| TC-ENTR-046 | API | moyenne | entretien \| PATCH /api/entretien/sessions/:id/questions/:qid | ✅ api/entr.test.ts |
| TC-ENTR-047 | API | haute | entretien \| PATCH /api/entretien/sessions/:id/questions/:qid | ✅ api/entr.test.ts |
| TC-ENTR-048 | API | moyenne | entretien \| PATCH /api/entretien/sessions/:id/questions/:qid | ✅ api/entr.test.ts |
| TC-ENTR-049 | API | haute | entretien \| PATCH /api/entretien/sessions/:id/questions/:qid | ✅ api/entr.test.ts |
| TC-ENTR-050 | API | moyenne | entretien \| PATCH /api/entretien/sessions/:id/questions/:qid | ✅ api/entr.test.ts |
| TC-ENTR-051 | API | basse | entretien \| PATCH /api/entretien/sessions/:id/questions/:qid | ✅ api/entr.test.ts |
| TC-ENTR-052 | API | haute | entretien \| DELETE /api/entretien/sessions/:id/questions/:qid | ✅ api/entr.test.ts |
| TC-ENTR-053 | API | basse | entretien \| DELETE /api/entretien/sessions/:id/questions/:qid | ✅ api/entr.test.ts |
| TC-ENTR-054 | API | moyenne | entretien \| DELETE /api/entretien/sessions/:id/questions/:qid | ✅ api/entr.test.ts |
| TC-ENTR-055 | API | haute | entretien \| DELETE /api/entretien/sessions/:id/questions/:qid | ✅ api/entr.test.ts |
| TC-ENTR-056 | API | moyenne | entretien \| DELETE /api/entretien/sessions/:id/questions/:qid | ✅ api/entr.test.ts |
| TC-ENTR-057 | API | basse | entretien \| DELETE /api/entretien/sessions/:id/questions/:qid | ✅ api/entr.test.ts |
| TC-ENTR-058 | API | haute | entretien \| POST /api/entretien/sessions/:id/cloturer | ✅ api/entr.test.ts |
| TC-ENTR-059 | API | basse | entretien \| POST /api/entretien/sessions/:id/cloturer | ✅ api/entr.test.ts |
| TC-ENTR-060 | API | moyenne | entretien \| POST /api/entretien/sessions/:id/cloturer | ✅ api/entr.test.ts |
| TC-ENTR-061 | API | haute | entretien \| POST /api/entretien/sessions/:id/cloturer | ✅ api/entr.test.ts |
| TC-ENTR-062 | API | moyenne | entretien \| POST /api/entretien/sessions/:id/cloturer | ✅ api/entr.test.ts |
| TC-ENTR-063 | API | basse | entretien \| POST /api/entretien/sessions/:id/cloturer | ✅ api/entr.test.ts |
| TC-ENTR-064 | API | haute | entretien \| POST /api/entretien/suggestions \| claudeSuggest.suggestForPhase | ✅ api/entr.test.ts |
| TC-ENTR-065 | API | haute | entretien \| POST /api/entretien/suggestions \| claudeSuggest.suggestForPhase (fallback) | ✅ api/entr.test.ts |
| TC-ENTR-066 | API | moyenne | entretien \| POST /api/entretien/suggestions \| claudeSuggest.suggestForPhase | ✅ api/entr.test.ts |
| TC-ENTR-067 | API | basse | entretien \| POST /api/entretien/suggestions \| claudeSuggest.suggestForPhase | ✅ api/entr.test.ts |
| TC-ENTR-068 | API | basse | entretien \| POST /api/entretien/suggestions | ✅ api/entr.test.ts |
| TC-ENTR-069 | API | haute | entretien \| POST /api/entretien/suggestions | ✅ api/entr.test.ts |
| TC-ENTR-070 | API | moyenne | entretien \| POST /api/entretien/suggestions | ✅ api/entr.test.ts |
| TC-ENTR-071 | API | basse | entretien \| POST /api/entretien/suggestions (catch → 500) | ✅ api/entr.test.ts |
| TC-ENTR-072 | Unitaire | haute | claudeSuggest.ts suggestForPhase (fallback) | ✅ unit/claudeSuggest.test.ts |
| TC-ENTR-073 | Unitaire | moyenne | claudeSuggest.ts suggestForPhase (fallback) ; phases.ts | ✅ unit/claudeSuggest.test.ts |
| TC-ENTR-074 | Unitaire | moyenne | claudeSuggest.ts suggestForPhase (?? PHASES[0]) | ✅ unit/claudeSuggest.test.ts |
| TC-ENTR-075 | Unitaire | basse | claudeSuggest.ts extractJson | ✅ unit/claudeSuggest.test.ts |
| TC-ENTR-076 | UI | haute | entretien \| GET /api/entretien/dashboard \| page Dashboard.tsx | ⏳ |
| TC-ENTR-077 | UI | haute | entretien \| POST /sessions + GET /sessions/:id \| page Entretien.tsx | ⏳ |
| TC-ENTR-078 | UI | haute | entretien \| POST /sessions/:id/reponses \| page Entretien.tsx (goTo/saveCurrent) | ⏳ |
| TC-ENTR-079 | UI | haute | entretien \| POST/PATCH/DELETE /sessions/:id/questions \| page Entretien.tsx | ⏳ |
| TC-ENTR-080 | UI | moyenne | entretien \| POST /suggestions \| page Entretien.tsx (askIA) | ⏳ |
| TC-ENTR-081 | UI | moyenne | entretien \| POST /sessions/:id/cloturer \| page Entretien.tsx (terminer) | ⏳ |
| TC-ENTR-082 | UI | moyenne | entretien \| POST /sessions (reprise) + POST /reponses \| page Entretien.tsx (pauseEtQuitter) | ⏳ |
| TC-ENTR-083 | UI | moyenne | entretien \| GET /dossiers, /dashboard \| gardes de rôle | ⏳ |
| TC-ENTR-084 | API | moyenne | entretien \| toutes routes (absence de requireFeature) \| features.ts requireFeature | ✅ api/entr.test.ts |
| TC-CR-001 | API | haute | comptes_rendus \| POST /api/cr/generer | ✅ api/cr.test.ts |
| TC-CR-002 | API | haute | comptes_rendus \| POST /api/cr/generer (latestVersion) | ✅ api/cr.test.ts |
| TC-CR-003 | API | haute | comptes_rendus,plan_action \| POST /api/cr/generer (bloc if(!prev)) | ✅ api/cr.test.ts |
| TC-CR-004 | API | moyenne | comptes_rendus \| POST /api/cr/generer → genererContenu (repli template) | ✅ api/cr.test.ts |
| TC-CR-005 | API | haute | comptes_rendus \| POST /api/cr/generer (requireAuth) | ✅ api/cr.test.ts |
| TC-CR-006 | API | haute | comptes_rendus \| POST /api/cr/generer (requireRole) | ✅ api/cr.test.ts |
| TC-CR-007 | API | moyenne | comptes_rendus \| POST /api/cr/generer (requireRole) | ✅ api/cr.test.ts |
| TC-CR-008 | API | haute | comptes_rendus \| POST /api/cr/generer (contrôle propriété) | ✅ api/cr.test.ts |
| TC-CR-009 | API | moyenne | comptes_rendus \| POST /api/cr/generer (sessionInfo) | ✅ api/cr.test.ts |
| TC-CR-010 | API | haute | comptes_rendus \| GET /api/cr/session/:sid | ✅ api/cr.test.ts |
| TC-CR-011 | API | haute | comptes_rendus \| GET /api/cr/session/:sid (branche accompagne) | ✅ api/cr.test.ts |
| TC-CR-012 | API | haute | comptes_rendus \| GET /api/cr/session/:sid (publishedVersion absente) | ✅ api/cr.test.ts |
| TC-CR-013 | API | haute | comptes_rendus \| GET /api/cr/session/:sid (requireAuth) | ✅ api/cr.test.ts |
| TC-CR-014 | API | haute | comptes_rendus \| GET /api/cr/session/:sid (canAccess) | ✅ api/cr.test.ts |
| TC-CR-015 | API | moyenne | comptes_rendus \| GET /api/cr/session/:sid (canAccess) | ✅ api/cr.test.ts |
| TC-CR-016 | API | basse | comptes_rendus \| GET /api/cr/session/:sid | ✅ api/cr.test.ts |
| TC-CR-017 | API | moyenne | comptes_rendus \| GET /api/cr/version/:id | ✅ api/cr.test.ts |
| TC-CR-018 | API | moyenne | comptes_rendus \| GET /api/cr/version/:id (requireAuth) | ✅ api/cr.test.ts |
| TC-CR-019 | API | haute | comptes_rendus \| GET /api/cr/version/:id (requireRole) | ✅ api/cr.test.ts |
| TC-CR-020 | API | haute | comptes_rendus \| GET /api/cr/version/:id (contrôle propriété) | ✅ api/cr.test.ts |
| TC-CR-021 | API | basse | comptes_rendus \| GET /api/cr/version/:id | ✅ api/cr.test.ts |
| TC-CR-022 | API | haute | comptes_rendus \| PATCH /api/cr/version/:id | ✅ api/cr.test.ts |
| TC-CR-023 | API | haute | comptes_rendus \| PATCH /api/cr/version/:id (édition version courante publiée) | ✅ api/cr.test.ts |
| TC-CR-024 | API | haute | comptes_rendus \| PATCH /api/cr/version/:id (latest.id !== cr.id) | ✅ api/cr.test.ts |
| TC-CR-025 | API | basse | comptes_rendus \| PATCH /api/cr/version/:id (String(req.body?.contenu_html ?? '')) | ✅ api/cr.test.ts |
| TC-CR-026 | API | moyenne | comptes_rendus \| PATCH /api/cr/version/:id (requireAuth) | ✅ api/cr.test.ts |
| TC-CR-027 | API | haute | comptes_rendus \| PATCH /api/cr/version/:id (requireRole) | ✅ api/cr.test.ts |
| TC-CR-028 | API | haute | comptes_rendus \| PATCH /api/cr/version/:id (contrôle propriété) | ✅ api/cr.test.ts |
| TC-CR-029 | API | basse | comptes_rendus \| PATCH /api/cr/version/:id | ✅ api/cr.test.ts |
| TC-CR-030 | API | haute | comptes_rendus \| POST /api/cr/version/:id/publier | ✅ api/cr.test.ts |
| TC-CR-031 | API | haute | comptes_rendus \| POST /api/cr/version/:id/publier (transaction dépublie d'abord) | ✅ api/cr.test.ts |
| TC-CR-032 | API | moyenne | comptes_rendus \| POST /api/cr/version/:id/publier (requireAuth) | ✅ api/cr.test.ts |
| TC-CR-033 | API | haute | comptes_rendus \| POST /api/cr/version/:id/publier (requireRole) | ✅ api/cr.test.ts |
| TC-CR-034 | API | haute | comptes_rendus \| POST /api/cr/version/:id/publier (contrôle propriété) | ✅ api/cr.test.ts |
| TC-CR-035 | API | basse | comptes_rendus \| POST /api/cr/version/:id/publier | ✅ api/cr.test.ts |
| TC-CR-036 | API | haute | comptes_rendus \| GET /api/cr/mine | ✅ api/cr.test.ts |
| TC-CR-037 | API | haute | comptes_rendus \| GET /api/cr/mine (filtre publie=1) | ✅ api/cr.test.ts |
| TC-CR-038 | API | basse | comptes_rendus \| GET /api/cr/mine | ✅ api/cr.test.ts |
| TC-CR-039 | API | moyenne | comptes_rendus \| GET /api/cr/mine (requireAuth) | ✅ api/cr.test.ts |
| TC-CR-040 | API | haute | comptes_rendus \| GET /api/cr/mine (requireRole) | ✅ api/cr.test.ts |
| TC-CR-041 | API | haute | comptes_rendus \| GET /api/cr/session/:sid/messages | ✅ api/cr.test.ts |
| TC-CR-042 | API | haute | comptes_rendus \| GET /api/cr/session/:sid/messages (canDiscuss) | ✅ api/cr.test.ts |
| TC-CR-043 | API | haute | comptes_rendus \| GET /api/cr/session/:sid/messages (canDiscuss accompagne) | ✅ api/cr.test.ts |
| TC-CR-044 | API | moyenne | comptes_rendus \| GET /api/cr/session/:sid/messages (requireAuth) | ✅ api/cr.test.ts |
| TC-CR-045 | API | haute | comptes_rendus \| GET /api/cr/session/:sid/messages (canAccess) | ✅ api/cr.test.ts |
| TC-CR-046 | API | haute | comptes_rendus \| POST /api/cr/session/:sid/messages | ✅ api/cr.test.ts |
| TC-CR-047 | API | haute | comptes_rendus \| POST /api/cr/session/:sid/messages (notif autre partie) | ✅ api/cr.test.ts |
| TC-CR-048 | API | haute | comptes_rendus \| POST /api/cr/session/:sid/messages (validation trim) | ✅ api/cr.test.ts |
| TC-CR-049 | API | haute | comptes_rendus \| POST /api/cr/session/:sid/messages (canDiscuss) | ✅ api/cr.test.ts |
| TC-CR-050 | API | moyenne | comptes_rendus \| POST /api/cr/session/:sid/messages (requireAuth) | ✅ api/cr.test.ts |
| TC-CR-051 | API | haute | comptes_rendus \| POST /api/cr/session/:sid/messages (canAccess) | ✅ api/cr.test.ts |
| TC-CR-052 | API | moyenne | comptes_rendus \| GET /api/cr/session/:sid/notes | ✅ api/cr.test.ts |
| TC-CR-053 | API | haute | comptes_rendus \| GET+PUT /api/cr/session/:sid/notes (requireRole) | ✅ api/cr.test.ts |
| TC-CR-054 | API | haute | comptes_rendus \| GET /api/cr/session/:sid/notes (contrôle propriété) | ✅ api/cr.test.ts |
| TC-CR-055 | API | basse | comptes_rendus \| GET /api/cr/session/:sid/notes (requireAuth) | ✅ api/cr.test.ts |
| TC-CR-056 | API | haute | comptes_rendus \| PUT /api/cr/session/:sid/notes (INSERT) | ✅ api/cr.test.ts |
| TC-CR-057 | API | haute | comptes_rendus \| PUT /api/cr/session/:sid/notes (upsert) | ✅ api/cr.test.ts |
| TC-CR-058 | API | basse | comptes_rendus \| PUT /api/cr/session/:sid/notes (String(req.body?.contenu_html ?? '')) | ✅ api/cr.test.ts |
| TC-CR-059 | API | moyenne | comptes_rendus \| PUT /api/cr/session/:sid/notes (contrôle propriété) | ✅ api/cr.test.ts |
| TC-CR-060 | API | haute | comptes_rendus \| cr_notes_privees vs GET /api/cr/session/:sid + /api/cr/mine | ✅ api/cr.test.ts |
| TC-CR-061 | Unitaire | haute | comptes_rendus \| compteRendu.ts genererContenu (repli template) | ✅ unit/compteRendu.test.ts |
| TC-CR-062 | Unitaire | moyenne | comptes_rendus \| compteRendu.ts genererContenu (defaults) | ✅ unit/compteRendu.test.ts |
| TC-CR-063 | Unitaire | haute | comptes_rendus \| compteRendu.ts contentToHtml | ✅ unit/compteRendu.test.ts |
| TC-CR-064 | Unitaire | haute | comptes_rendus \| compteRendu.ts esc | ✅ unit/compteRendu.test.ts |
| TC-CR-065 | Unitaire | basse | comptes_rendus \| compteRendu.ts parasHtml | ✅ unit/compteRendu.test.ts |
| TC-CR-066 | Unitaire | moyenne | comptes_rendus \| compteRendu.ts genererContenu (extraction JSON) | ✅ unit/compteRendu.test.ts |
| TC-CR-067 | Unitaire | haute | comptes_rendus \| compteRendu.ts genererContenu (repli erreur) | ✅ unit/compteRendu.test.ts |
| TC-CR-068 | UI | haute | comptes_rendus \| CompteRenduModal.tsx (generer) | ⏳ |
| TC-CR-069 | UI | haute | comptes_rendus \| CompteRenduModal.tsx (startEdit/save) | ⏳ |
| TC-CR-070 | UI | haute | comptes_rendus \| CompteRenduModal.tsx (publier) | ⏳ |
| TC-CR-071 | UI | moyenne | comptes_rendus \| CompteRenduModal.tsx (voirVersion/onHistory) | ⏳ |
| TC-CR-072 | UI | haute | comptes_rendus \| ComptesRendus.tsx + CompteRenduModal.tsx (role=accompagne) | ⏳ |
| TC-CR-073 | UI | haute | comptes_rendus \| CompteRenduModal.tsx (!cr, role accompagne) | ⏳ |
| TC-CR-074 | UI | haute | comptes_rendus \| CompteRenduModal.tsx (envoyer/loadMessages) | ⏳ |
| TC-CR-075 | UI | moyenne | comptes_rendus \| CompteRenduModal.tsx (!cr.publie && accompagnateur) | ⏳ |
| TC-ACT-001 | API | haute | plan_action — GET /api/actions/mine | ✅ api/actnotif.test.ts |
| TC-ACT-002 | API | moyenne | plan_action — GET /api/actions/mine | ✅ api/actnotif.test.ts |
| TC-ACT-003 | API | haute | plan_action — GET /api/actions/mine (requireAuth) | ✅ api/actnotif.test.ts |
| TC-ACT-004 | API | haute | plan_action — GET /api/actions/mine (requireRole accompagne) | ✅ api/actnotif.test.ts |
| TC-ACT-005 | API | moyenne | plan_action — GET /api/actions/mine (requireRole accompagne) | ✅ api/actnotif.test.ts |
| TC-ACT-006 | API | haute | plan_action — GET /api/actions | ✅ api/actnotif.test.ts |
| TC-ACT-007 | API | haute | plan_action — GET /api/actions (ownership accompagnateur_id) | ✅ api/actnotif.test.ts |
| TC-ACT-008 | API | moyenne | plan_action — GET /api/actions | ✅ api/actnotif.test.ts |
| TC-ACT-009 | API | haute | plan_action — GET /api/actions (requireAuth) | ✅ api/actnotif.test.ts |
| TC-ACT-010 | API | haute | plan_action — GET /api/actions (requireRole accompagnateur) | ✅ api/actnotif.test.ts |
| TC-ACT-011 | API | haute | plan_action — POST /api/actions | ✅ api/actnotif.test.ts |
| TC-ACT-012 | API | haute | plan_action — POST /api/actions | ✅ api/actnotif.test.ts |
| TC-ACT-013 | API | haute | plan_action — POST /api/actions | ✅ api/actnotif.test.ts |
| TC-ACT-014 | API | moyenne | plan_action — POST /api/actions | ✅ api/actnotif.test.ts |
| TC-ACT-015 | API | basse | plan_action — POST /api/actions | ✅ api/actnotif.test.ts |
| TC-ACT-016 | API | haute | plan_action — POST /api/actions (dossierForUser) | ✅ api/actnotif.test.ts |
| TC-ACT-017 | API | haute | plan_action — POST /api/actions (requireAuth) | ✅ api/actnotif.test.ts |
| TC-ACT-018 | API | moyenne | plan_action — POST /api/actions (ordre) | ✅ api/actnotif.test.ts |
| TC-ACT-019 | API | haute | plan_action — PATCH /api/actions/:id | ✅ api/actnotif.test.ts |
| TC-ACT-020 | API | haute | plan_action — PATCH /api/actions/:id | ✅ api/actnotif.test.ts |
| TC-ACT-021 | API | moyenne | plan_action — PATCH /api/actions/:id | ✅ api/actnotif.test.ts |
| TC-ACT-022 | API | moyenne | plan_action — PATCH /api/actions/:id | ✅ api/actnotif.test.ts |
| TC-ACT-023 | API | basse | plan_action — PATCH /api/actions/:id | ✅ api/actnotif.test.ts |
| TC-ACT-024 | API | basse | plan_action — PATCH /api/actions/:id | ✅ api/actnotif.test.ts |
| TC-ACT-025 | API | haute | plan_action — PATCH /api/actions/:id (rappel_envoye=0) | ✅ api/actnotif.test.ts |
| TC-ACT-026 | API | moyenne | plan_action — PATCH /api/actions/:id | ✅ api/actnotif.test.ts |
| TC-ACT-027 | API | haute | plan_action — PATCH /api/actions/:id (actionForUser) | ✅ api/actnotif.test.ts |
| TC-ACT-028 | API | moyenne | plan_action — PATCH /api/actions/:id | ✅ api/actnotif.test.ts |
| TC-ACT-029 | API | haute | plan_action — PATCH /api/actions/:id (requireAuth) | ✅ api/actnotif.test.ts |
| TC-ACT-030 | API | haute | plan_action — DELETE /api/actions/:id | ✅ api/actnotif.test.ts |
| TC-ACT-031 | API | haute | plan_action — DELETE /api/actions/:id (actionForUser) | ✅ api/actnotif.test.ts |
| TC-ACT-032 | API | moyenne | plan_action — DELETE /api/actions/:id | ✅ api/actnotif.test.ts |
| TC-ACT-033 | API | haute | plan_action — DELETE /api/actions/:id (requireAuth) | ✅ api/actnotif.test.ts |
| TC-ACT-034 | API | haute | plan_action — POST /api/actions/reorder | ✅ api/actnotif.test.ts |
| TC-ACT-035 | API | moyenne | plan_action — POST /api/actions/reorder (renumérotation du reste) | ✅ api/actnotif.test.ts |
| TC-ACT-036 | API | moyenne | plan_action — POST /api/actions/reorder (WHERE dossier_id) | ✅ api/actnotif.test.ts |
| TC-ACT-037 | API | haute | plan_action — POST /api/actions/reorder | ✅ api/actnotif.test.ts |
| TC-ACT-038 | API | basse | plan_action — POST /api/actions/reorder | ✅ api/actnotif.test.ts |
| TC-ACT-039 | API | haute | plan_action — POST /api/actions/reorder (dossierForUser) | ✅ api/actnotif.test.ts |
| TC-ACT-040 | API | haute | plan_action — POST /api/actions/reorder (requireAuth) | ✅ api/actnotif.test.ts |
| TC-ACT-041 | Unitaire | moyenne | plan_action — actions.ts opt() | ✅ unit/actions.test.ts |
| TC-ACT-042 | Unitaire | haute | — notifications.ts sweepDueReminders() | ✅ unit/notifications.test.ts |
| TC-ACT-043 | Unitaire | haute | — notifications.ts sweepDueReminders() (rappel_le <= date now) | ✅ unit/notifications.test.ts |
| TC-ACT-044 | Unitaire | moyenne | — notifications.ts sweepDueReminders() (composition du texte) | ✅ unit/notifications.test.ts |
| TC-ACT-045 | API | haute | — GET /api/notifications | ✅ api/actnotif.test.ts |
| TC-ACT-046 | API | haute | — GET /api/notifications (WHERE user_id) | ✅ api/actnotif.test.ts |
| TC-ACT-047 | API | basse | — GET /api/notifications (LIMIT 30) | ✅ api/actnotif.test.ts |
| TC-ACT-048 | API | haute | — GET /api/notifications (requireAuth) | ✅ api/actnotif.test.ts |
| TC-ACT-049 | API | haute | — POST /api/notifications/lues | ✅ api/actnotif.test.ts |
| TC-ACT-050 | API | moyenne | — POST /api/notifications/lues (WHERE user_id) | ✅ api/actnotif.test.ts |
| TC-ACT-051 | API | haute | — POST /api/notifications/lues (requireAuth) | ✅ api/actnotif.test.ts |
| TC-ACT-052 | API | haute | — GET /api/tags | ✅ api/actnotif.test.ts |
| TC-ACT-053 | API | basse | — GET /api/tags | ✅ api/actnotif.test.ts |
| TC-ACT-054 | API | haute | — GET /api/tags (requireRole accompagnateur) | ✅ api/actnotif.test.ts |
| TC-ACT-055 | API | haute | — GET /api/tags (requireAuth) | ✅ api/actnotif.test.ts |
| TC-ACT-056 | API | haute | — POST /api/tags/dossier/:dossierId | ✅ api/actnotif.test.ts |
| TC-ACT-057 | API | moyenne | — POST /api/tags/dossier/:dossierId (INSERT OR IGNORE) | ✅ api/actnotif.test.ts |
| TC-ACT-058 | API | haute | — POST /api/tags/dossier/:dossierId | ✅ api/actnotif.test.ts |
| TC-ACT-059 | API | haute | — POST /api/tags/dossier/:dossierId (ownsDossier) | ✅ api/actnotif.test.ts |
| TC-ACT-060 | API | haute | — POST /api/tags/dossier/:dossierId (requireRole accompagnateur) | ✅ api/actnotif.test.ts |
| TC-ACT-061 | API | haute | — POST /api/tags/dossier/:dossierId (requireAuth) | ✅ api/actnotif.test.ts |
| TC-ACT-062 | API | haute | — DELETE /api/tags/dossier/:dossierId/:tagId | ✅ api/actnotif.test.ts |
| TC-ACT-063 | API | haute | — DELETE /api/tags/dossier/:dossierId/:tagId (ownsDossier) | ✅ api/actnotif.test.ts |
| TC-ACT-064 | API | basse | — DELETE /api/tags/dossier/:dossierId/:tagId | ✅ api/actnotif.test.ts |
| TC-ACT-065 | API | moyenne | — DELETE /api/tags/dossier/:dossierId/:tagId (requireRole accompagnateur) | ✅ api/actnotif.test.ts |
| TC-ACT-066 | API | haute | — DELETE /api/tags/dossier/:dossierId/:tagId (requireAuth) | ✅ api/actnotif.test.ts |
| TC-ACT-067 | UI | haute | plan_action — PlanAction.tsx / POST /api/actions | ⏳ |
| TC-ACT-068 | UI | moyenne | plan_action — ActionList.tsx / PATCH /api/actions/:id | ⏳ |
| TC-ACT-069 | UI | haute | plan_action — MonPlanAction.tsx + ActionList.tsx / POST /api/actions, /api/actions/reorder | ⏳ |
| TC-ACT-070 | UI | haute | plan_action — ActionDetailModal.tsx / PATCH /api/actions/:id | ⏳ |
| TC-ACT-071 | UI | moyenne | plan_action — ActionDetailModal.tsx / PATCH+DELETE /api/actions/:id | ⏳ |
| TC-ACT-072 | UI | haute | — Dashboard.tsx / GET+POST+DELETE /api/tags | ⏳ |
| TC-ACT-073 | UI | haute | — NotificationsBell.tsx / GET /api/notifications + POST /api/notifications/lues | ⏳ |
| TC-ACT-074 | UI | haute | plan_action — ActionDetailModal.tsx → sweepDueReminders → NotificationsBell.tsx | ⏳ |
| TC-DOSS-001 | API | haute | multi_parcours · GET /api/dossiers/accompagnateurs | ✅ api/dossier.test.ts |
| TC-DOSS-002 | API | haute | requireAuth · GET /api/dossiers/accompagnateurs | ✅ api/dossier.test.ts |
| TC-DOSS-003 | API | haute | requireRole('accompagne') · GET /api/dossiers/accompagnateurs | ✅ api/dossier.test.ts |
| TC-DOSS-004 | API | haute | multi_parcours · POST /api/dossiers/start | ✅ api/dossier.test.ts |
| TC-DOSS-005 | API | haute | multi_parcours · POST /api/dossiers/start | ✅ api/dossier.test.ts |
| TC-DOSS-006 | API | haute | multi_parcours · POST /api/dossiers/start | ✅ api/dossier.test.ts |
| TC-DOSS-007 | API | moyenne | requireAuth · POST /api/dossiers/start | ✅ api/dossier.test.ts |
| TC-DOSS-008 | API | moyenne | requireRole('accompagne') · POST /api/dossiers/start | ✅ api/dossier.test.ts |
| TC-DOSS-009 | API | moyenne | multi_parcours · POST /api/dossiers/start | ✅ api/dossier.test.ts |
| TC-DOSS-010 | API | haute | multi_parcours · GET /api/dossiers/mine | ✅ api/dossier.test.ts |
| TC-DOSS-011 | API | haute | multi_parcours · GET /api/dossiers/mine | ✅ api/dossier.test.ts |
| TC-DOSS-012 | API | haute | multi_parcours · GET /api/dossiers/mine/:id | ✅ api/dossier.test.ts |
| TC-DOSS-013 | API | haute | multi_parcours · GET /api/dossiers/mine/:id | ✅ api/dossier.test.ts |
| TC-DOSS-014 | API | moyenne | requireRole('accompagne') · GET /api/dossiers/mine/:id | ✅ api/dossier.test.ts |
| TC-DOSS-015 | API | haute | synthese · GET /api/dossiers/:id | ✅ api/dossier.test.ts |
| TC-DOSS-016 | API | haute | owns() · GET /api/dossiers/:id | ✅ api/dossier.test.ts |
| TC-DOSS-017 | API | moyenne | owns() · GET /api/dossiers/:id | ✅ api/dossier.test.ts |
| TC-DOSS-018 | API | moyenne | requireRole('accompagnateur') · GET /api/dossiers/:id | ✅ api/dossier.test.ts |
| TC-DOSS-019 | API | moyenne | synthese · GET /api/dossiers/:id/synthese | ✅ api/dossier.test.ts |
| TC-DOSS-020 | API | moyenne | owns() · GET /api/dossiers/:id/synthese | ✅ api/dossier.test.ts |
| TC-DOSS-021 | API | haute | synthese · POST /api/dossiers/:id/cloturer | ✅ api/dossier.test.ts |
| TC-DOSS-022 | API | moyenne | synthese · POST /api/dossiers/:id/cloturer | ✅ api/dossier.test.ts |
| TC-DOSS-023 | API | haute | owns() · POST /api/dossiers/:id/cloturer | ✅ api/dossier.test.ts |
| TC-DOSS-024 | API | moyenne | requireRole('accompagnateur') · POST /api/dossiers/:id/cloturer | ✅ api/dossier.test.ts |
| TC-DOSS-025 | API | haute | synthese · POST /api/dossiers/:id/rouvrir | ✅ api/dossier.test.ts |
| TC-DOSS-026 | API | moyenne | owns() · POST /api/dossiers/:id/rouvrir | ✅ api/dossier.test.ts |
| TC-DOSS-027 | API | moyenne | synthese · POST /api/dossiers/:id/cloturer + /rouvrir | ✅ api/dossier.test.ts |
| TC-DOSS-028 | API | haute | auto_evaluation · GET /api/autoeval/grille | ✅ api/dossier.test.ts |
| TC-DOSS-029 | API | moyenne | requireRole('accompagnateur') · GET /api/autoeval/grille | ✅ api/dossier.test.ts |
| TC-DOSS-030 | API | basse | requireAuth · GET /api/autoeval/grille | ✅ api/dossier.test.ts |
| TC-DOSS-031 | API | haute | auto_evaluation · GET /api/autoeval/:id (getOrCreateDraft) | ✅ api/dossier.test.ts |
| TC-DOSS-032 | API | haute | owns() · GET /api/autoeval/:id | ✅ api/dossier.test.ts |
| TC-DOSS-033 | API | haute | auto_evaluation · POST /api/autoeval/:id | ✅ api/dossier.test.ts |
| TC-DOSS-034 | API | haute | auto_evaluation · clampScore · POST /api/autoeval/:id | ✅ api/dossier.test.ts |
| TC-DOSS-035 | API | moyenne | auto_evaluation · clampScore · POST /api/autoeval/:id | ✅ api/dossier.test.ts |
| TC-DOSS-036 | API | moyenne | auto_evaluation · INDICATEUR_IDS · POST /api/autoeval/:id | ✅ api/dossier.test.ts |
| TC-DOSS-037 | API | basse | auto_evaluation · POST /api/autoeval/:id | ✅ api/dossier.test.ts |
| TC-DOSS-038 | API | haute | owns() · POST /api/autoeval/:id | ✅ api/dossier.test.ts |
| TC-DOSS-039 | Unitaire | moyenne | auto_evaluation · computeNote() | ⏳ |
| TC-DOSS-040 | Unitaire | haute | auto_evaluation · computeNote() | ⏳ |
| TC-DOSS-041 | Unitaire | haute | auto_evaluation · clampScore() | ⏳ |
| TC-DOSS-042 | API | haute | auto_evaluation · POST /api/autoeval/:id/valider | ✅ api/dossier.test.ts |
| TC-DOSS-043 | API | moyenne | auto_evaluation · POST /api/autoeval/:id/valider | ✅ api/dossier.test.ts |
| TC-DOSS-044 | API | moyenne | owns() · POST /api/autoeval/:id/valider | ✅ api/dossier.test.ts |
| TC-DOSS-045 | API | haute | auto_evaluation · POST /api/autoeval/:id/ia | ✅ api/dossier.test.ts |
| TC-DOSS-046 | API | haute | auto_evaluation · suggererGrille() repli · POST /api/autoeval/:id/ia | ✅ api/dossier.test.ts |
| TC-DOSS-047 | Unitaire | moyenne | auto_evaluation · suggererGrille() (parsing) | ⏳ |
| TC-DOSS-048 | API | moyenne | owns() · POST /api/autoeval/:id/ia | ✅ api/dossier.test.ts |
| TC-DOSS-049 | API | moyenne | requireRole('accompagnateur') · /api/autoeval/* | ✅ api/dossier.test.ts |
| TC-DOSS-050 | API | haute | synthese · POST /api/synthese/generer | ✅ api/dossier.test.ts |
| TC-DOSS-051 | API | haute | synthese · dossierInfo+accompagnateur_id · POST /api/synthese/generer | ✅ api/dossier.test.ts |
| TC-DOSS-052 | API | moyenne | requireRole('accompagnateur') · POST /api/synthese/generer | ✅ api/dossier.test.ts |
| TC-DOSS-053 | Unitaire | haute | synthese · syntheseToHtml() | ⏳ |
| TC-DOSS-054 | Unitaire | haute | synthese · esc()/parasHtml() | ⏳ |
| TC-DOSS-055 | Unitaire | moyenne | synthese · frDate() | ⏳ |
| TC-DOSS-056 | API | haute | synthese · GET /api/synthese/dossier/:id | ✅ api/dossier.test.ts |
| TC-DOSS-057 | API | haute | synthese · GET /api/synthese/dossier/:id | ✅ api/dossier.test.ts |
| TC-DOSS-058 | API | haute | synthese · canAccess · GET /api/synthese/dossier/:id | ✅ api/dossier.test.ts |
| TC-DOSS-059 | API | moyenne | synthese · GET /api/synthese/version/:id | ✅ api/dossier.test.ts |
| TC-DOSS-060 | API | moyenne | synthese · GET /api/synthese/version/:id | ✅ api/dossier.test.ts |
| TC-DOSS-061 | API | basse | requireRole('accompagnateur') · GET /api/synthese/version/:id | ✅ api/dossier.test.ts |
| TC-DOSS-062 | API | haute | synthese · PATCH /api/synthese/version/:id | ✅ api/dossier.test.ts |
| TC-DOSS-063 | API | haute | synthese · PATCH /api/synthese/version/:id | ✅ api/dossier.test.ts |
| TC-DOSS-064 | API | moyenne | synthese · PATCH /api/synthese/version/:id | ✅ api/dossier.test.ts |
| TC-DOSS-065 | API | haute | synthese · POST /api/synthese/version/:id/publier | ✅ api/dossier.test.ts |
| TC-DOSS-066 | API | moyenne | synthese · POST /api/synthese/version/:id/publier | ✅ api/dossier.test.ts |
| TC-DOSS-067 | API | basse | requireRole('accompagnateur') · POST /api/synthese/version/:id/publier | ✅ api/dossier.test.ts |
| TC-DOSS-068 | API | moyenne | synthese · GET /api/synthese/mine | ✅ api/dossier.test.ts |
| TC-DOSS-069 | API | basse | requireRole('accompagne') · GET /api/synthese/mine | ✅ api/dossier.test.ts |
| TC-DOSS-070 | API | haute | synthese · canDiscuss · /api/synthese/dossier/:id/messages | ✅ api/dossier.test.ts |
| TC-DOSS-071 | API | moyenne | synthese · canDiscuss · POST /api/synthese/dossier/:id/messages | ✅ api/dossier.test.ts |
| TC-DOSS-072 | API | haute | synthese · /api/synthese/dossier/:id/messages | ✅ api/dossier.test.ts |
| TC-DOSS-073 | API | moyenne | synthese · POST /api/synthese/dossier/:id/messages | ✅ api/dossier.test.ts |
| TC-DOSS-074 | API | moyenne | synthese · canAccess/canDiscuss · /api/synthese/dossier/:id/messages | ✅ api/dossier.test.ts |
| TC-DOSS-075 | API | basse | requireAuth · /api/synthese/dossier/:id(+/messages) | ✅ api/dossier.test.ts |
| TC-DOSS-076 | UI | haute | multi_parcours · NouveauParcours.tsx + POST /api/dossiers/start | ⏳ |
| TC-DOSS-077 | UI | moyenne | multi_parcours · NouveauParcours.tsx | ⏳ |
| TC-DOSS-078 | UI | moyenne | multi_parcours · MesParcours.tsx + GET /api/dossiers/mine | ⏳ |
| TC-DOSS-079 | UI | moyenne | multi_parcours · ParcoursDetail.tsx + GET /api/dossiers/mine/:id | ⏳ |
| TC-DOSS-080 | UI | haute | synthese · Dossier.tsx + POST /api/dossiers/:id/cloturer + /rouvrir | ⏳ |
| TC-DOSS-081 | UI | haute | auto_evaluation · AutoEvaluation.tsx + POST /api/autoeval/:id(+/valider) | ⏳ |
| TC-DOSS-082 | UI | moyenne | auto_evaluation · AutoEvaluation.tsx + POST /api/autoeval/:id/ia | ⏳ |
| TC-DOSS-083 | UI | basse | auto_evaluation · AutoEvaluation.tsx (available:false) | ⏳ |
| TC-DOSS-084 | UI | haute | synthese · SyntheseModal.tsx + /api/synthese/* | ⏳ |
| TC-DOSS-085 | UI | haute | synthese · SyntheseModal.tsx + /api/synthese/dossier/:id/messages | ⏳ |
| TC-REL-001 | API | haute | meteo \| POST /api/relationnel/meteo | ✅ api/relemerg.test.ts |
| TC-REL-002 | API | moyenne | meteo \| POST /api/relationnel/meteo | ✅ api/relemerg.test.ts |
| TC-REL-003 | API | haute | meteo \| POST /api/relationnel/meteo | ✅ api/relemerg.test.ts |
| TC-REL-004 | API | haute | meteo \| POST /api/relationnel/meteo | ✅ api/relemerg.test.ts |
| TC-REL-005 | API | haute | meteo \| POST /api/relationnel/meteo | ✅ api/relemerg.test.ts |
| TC-REL-006 | API | basse | meteo \| POST /api/relationnel/meteo | ✅ api/relemerg.test.ts |
| TC-REL-007 | API | haute | requireAuth \| POST /api/relationnel/meteo | ✅ api/relemerg.test.ts |
| TC-REL-008 | API | haute | access() \| POST /api/relationnel/meteo | ✅ api/relemerg.test.ts |
| TC-REL-009 | API | moyenne | meteo \| POST /api/relationnel/meteo | ✅ api/relemerg.test.ts |
| TC-REL-010 | API | moyenne | access() \| POST /api/relationnel/meteo | ✅ api/relemerg.test.ts |
| TC-REL-011 | API | haute | meteo \| GET /api/relationnel/meteo/dossier/:id | ✅ api/relemerg.test.ts |
| TC-REL-012 | API | haute | meteo \| GET /api/relationnel/meteo/dossier/:id | ✅ api/relemerg.test.ts |
| TC-REL-013 | API | haute | access() \| GET /api/relationnel/meteo/dossier/:id | ✅ api/relemerg.test.ts |
| TC-REL-014 | API | haute | requireAuth \| GET /api/relationnel/meteo/dossier/:id | ✅ api/relemerg.test.ts |
| TC-REL-015 | API | haute | journal \| POST /api/relationnel/journal | ✅ api/relemerg.test.ts |
| TC-REL-016 | API | moyenne | journal \| POST /api/relationnel/journal | ✅ api/relemerg.test.ts |
| TC-REL-017 | API | haute | journal \| POST /api/relationnel/journal | ✅ api/relemerg.test.ts |
| TC-REL-018 | API | haute | access() \| POST /api/relationnel/journal | ✅ api/relemerg.test.ts |
| TC-REL-019 | API | haute | access() \| POST /api/relationnel/journal | ✅ api/relemerg.test.ts |
| TC-REL-020 | API | moyenne | requireAuth \| POST /api/relationnel/journal | ✅ api/relemerg.test.ts |
| TC-REL-021 | API | haute | journal \| GET /api/relationnel/journal/dossier/:id | ✅ api/relemerg.test.ts |
| TC-REL-022 | API | haute | journal \| GET /api/relationnel/journal/dossier/:id | ✅ api/relemerg.test.ts |
| TC-REL-023 | API | haute | access() \| GET /api/relationnel/journal/dossier/:id | ✅ api/relemerg.test.ts |
| TC-REL-024 | API | haute | journal \| PATCH /api/relationnel/journal/:id | ✅ api/relemerg.test.ts |
| TC-REL-025 | API | haute | journal \| PATCH /api/relationnel/journal/:id | ✅ api/relemerg.test.ts |
| TC-REL-026 | API | moyenne | journal \| PATCH /api/relationnel/journal/:id | ✅ api/relemerg.test.ts |
| TC-REL-027 | API | basse | journal \| PATCH /api/relationnel/journal/:id | ✅ api/relemerg.test.ts |
| TC-REL-028 | API | haute | journal \| PATCH /api/relationnel/journal/:id | ✅ api/relemerg.test.ts |
| TC-REL-029 | API | haute | journal \| DELETE /api/relationnel/journal/:id | ✅ api/relemerg.test.ts |
| TC-REL-030 | API | haute | journal \| DELETE /api/relationnel/journal/:id | ✅ api/relemerg.test.ts |
| TC-REL-031 | API | moyenne | requireAuth \| DELETE /api/relationnel/journal/:id | ✅ api/relemerg.test.ts |
| TC-REL-032 | UI | haute | meteo \| MeteoWidget (ParcoursDetail) | ⏳ |
| TC-REL-033 | UI | moyenne | meteo \| MeteoWidget useFeature | ⏳ |
| TC-REL-034 | UI | haute | journal \| MicroJournal (ParcoursDetail) | ⏳ |
| TC-REL-035 | UI | moyenne | journal \| MicroJournal role=accompagnateur (Dossier) | ⏳ |
| TC-REL-036 | API | haute | banque_questions \| POST /api/emergence/dossier/:did/banque | ✅ api/relemerg.test.ts |
| TC-REL-037 | Unitaire | haute | banque_questions \| fallbackBanque() | ✅ unit/emergence.test.ts |
| TC-REL-038 | API | moyenne | banque_questions \| POST /api/emergence/dossier/:did/banque | ✅ api/relemerg.test.ts |
| TC-REL-039 | API | haute | ownsDossier \| POST /api/emergence/dossier/:did/banque | ✅ api/relemerg.test.ts |
| TC-REL-040 | API | haute | requireRole \| POST /api/emergence/dossier/:did/banque | ✅ api/relemerg.test.ts |
| TC-REL-041 | API | moyenne | requireAuth \| POST /api/emergence/dossier/:did/banque | ✅ api/relemerg.test.ts |
| TC-REL-042 | API | moyenne | banque_questions \| GET /api/emergence/dossier/:did/banque | ✅ api/relemerg.test.ts |
| TC-REL-043 | UI | moyenne | banque_questions \| Entretien genBanque() | ⏳ |
| TC-REL-044 | API | haute | fil_rouge \| POST /api/emergence/dossier/:did/fil-rouge | ✅ api/relemerg.test.ts |
| TC-REL-045 | Unitaire | haute | fil_rouge \| repli inline POST /fil-rouge | ⏳ |
| TC-REL-046 | API | moyenne | fil_rouge \| GET /api/emergence/dossier/:did/fil-rouge | ✅ api/relemerg.test.ts |
| TC-REL-047 | API | basse | fil_rouge \| GET /api/emergence/dossier/:did/fil-rouge | ✅ api/relemerg.test.ts |
| TC-REL-048 | API | haute | fil_rouge \| PATCH /api/emergence/dossier/:did/fil-rouge/partage | ✅ api/relemerg.test.ts |
| TC-REL-049 | API | haute | ownsDossier \| /api/emergence/dossier/:did/fil-rouge* | ✅ api/relemerg.test.ts |
| TC-REL-050 | API | haute | requireRole \| POST /api/emergence/dossier/:did/fil-rouge | ✅ api/relemerg.test.ts |
| TC-REL-051 | UI | haute | fil_rouge \| FilRougeCard (Dossier) | ⏳ |
| TC-REL-052 | API | haute | moments_cles \| POST /api/emergence/session/:sid/moments | ✅ api/relemerg.test.ts |
| TC-REL-053 | Unitaire | haute | moments_cles \| fallbackMoments() | ✅ unit/emergence.test.ts |
| TC-REL-054 | Unitaire | moyenne | moments_cles \| fallbackMoments() | ✅ unit/emergence.test.ts |
| TC-REL-055 | API | moyenne | moments_cles \| POST /api/emergence/session/:sid/moments | ✅ api/relemerg.test.ts |
| TC-REL-056 | API | haute | ownsSession \| /api/emergence/session/:sid/moments* | ✅ api/relemerg.test.ts |
| TC-REL-057 | API | moyenne | requireRole \| POST /api/emergence/session/:sid/moments | ✅ api/relemerg.test.ts |
| TC-REL-058 | API | basse | moments_cles \| GET /api/emergence/session/:sid/moments | ✅ api/relemerg.test.ts |
| TC-REL-059 | API | moyenne | moments_cles \| PATCH /api/emergence/session/:sid/moments/partage | ✅ api/relemerg.test.ts |
| TC-REL-060 | API | haute | fil_rouge/moments_cles \| GET /api/emergence/mine/dossier/:did | ✅ api/relemerg.test.ts |
| TC-REL-061 | API | moyenne | fil_rouge/moments_cles \| GET /api/emergence/mine/dossier/:did | ✅ api/relemerg.test.ts |
| TC-REL-062 | API | haute | GET /api/emergence/mine/dossier/:did | ✅ api/relemerg.test.ts |
| TC-REL-063 | API | moyenne | requireRole \| GET /api/emergence/mine/dossier/:did | ✅ api/relemerg.test.ts |
| TC-REL-064 | UI | moyenne | fil_rouge/moments_cles \| EmergencePartage (ParcoursDetail) | ⏳ |
| TC-REL-065 | API | haute | transparence \| GET /api/transparence/dossier/:id | ✅ api/relemerg.test.ts |
| TC-REL-066 | API | haute | requireFeature('transparence') \| GET /api/transparence/dossier/:id | ✅ api/relemerg.test.ts |
| TC-REL-067 | API | haute | requireRole \| GET /api/transparence/dossier/:id | ✅ api/relemerg.test.ts |
| TC-REL-068 | API | haute | ownDossier \| GET /api/transparence/dossier/:id | ✅ api/relemerg.test.ts |
| TC-REL-069 | API | moyenne | requireAuth \| GET /api/transparence/dossier/:id | ✅ api/relemerg.test.ts |
| TC-REL-070 | API | moyenne | transparence \| GET /api/transparence/dossier/:id | ✅ api/relemerg.test.ts |
| TC-REL-071 | API | haute | transparence \| POST /api/transparence/effacement | ✅ api/relemerg.test.ts |
| TC-REL-072 | API | moyenne | transparence \| POST /api/transparence/effacement | ✅ api/relemerg.test.ts |
| TC-REL-073 | API | basse | transparence \| POST /api/transparence/effacement | ✅ api/relemerg.test.ts |
| TC-REL-074 | API | haute | ownDossier \| POST /api/transparence/effacement | ✅ api/relemerg.test.ts |
| TC-REL-075 | API | haute | requireFeature('transparence') \| POST /api/transparence/effacement | ✅ api/relemerg.test.ts |
| TC-REL-076 | API | moyenne | requireRole \| POST /api/transparence/effacement | ✅ api/relemerg.test.ts |
| TC-REL-077 | API | moyenne | transparence \| POST + GET /api/transparence/dossier/:id | ✅ api/relemerg.test.ts |
| TC-REL-078 | UI | haute | transparence \| TransparenceModal (ParcoursDetail) | ⏳ |
| TC-REL-079 | API | haute | miroir \| POST /api/miroir/session/:sid | ✅ api/relemerg.test.ts |
| TC-REL-080 | Unitaire | haute | miroir \| fallbackMiroir() | ✅ unit/miroir.test.ts |
| TC-REL-081 | Unitaire | moyenne | miroir \| OPEN_RE / fallbackMiroir scores | ✅ unit/miroir.test.ts |
| TC-REL-082 | Unitaire | moyenne | miroir \| fallbackMiroir() cas vide | ✅ unit/miroir.test.ts |
| TC-REL-083 | Unitaire | moyenne | miroir \| suggererMiroir() clamp note | ⏳ |
| TC-REL-084 | Unitaire | haute | miroir \| INDICATEUR_IDS filter POST /session/:sid | ⏳ |
| TC-REL-085 | API | moyenne | miroir \| POST /api/miroir/session/:sid | ✅ api/relemerg.test.ts |
| TC-REL-086 | API | haute | requireFeature('miroir') \| POST /api/miroir/session/:sid | ✅ api/relemerg.test.ts |
| TC-REL-087 | API | haute | requireRole \| POST /api/miroir/session/:sid | ✅ api/relemerg.test.ts |
| TC-REL-088 | API | haute | ownsSession \| /api/miroir/session/:sid | ✅ api/relemerg.test.ts |
| TC-REL-089 | API | moyenne | requireAuth \| POST /api/miroir/session/:sid | ✅ api/relemerg.test.ts |
| TC-REL-090 | API | basse | miroir \| GET /api/miroir/session/:sid | ✅ api/relemerg.test.ts |
| TC-REL-091 | API | haute | miroir \| POST /api/miroir/session/:sid/appliquer | ✅ api/relemerg.test.ts |
| TC-REL-092 | Unitaire | haute | miroir \| clamp + INDICATEUR_IDS POST /appliquer | ⏳ |
| TC-REL-093 | API | moyenne | miroir \| POST /appliquer (auto_evaluations brouillon) | ✅ api/relemerg.test.ts |
| TC-REL-094 | API | haute | miroir \| POST /api/miroir/session/:sid/appliquer | ✅ api/relemerg.test.ts |
| TC-REL-095 | API | haute | ownsSession \| POST /api/miroir/session/:sid/appliquer | ✅ api/relemerg.test.ts |
| TC-REL-096 | API | moyenne | requireFeature('miroir') \| POST /api/miroir/session/:sid/appliquer | ✅ api/relemerg.test.ts |
| TC-REL-097 | UI | haute | miroir \| MiroirReflexifModal (Dossier) | ⏳ |
| TC-REL-098 | UI | moyenne | miroir \| requireFeature côté serveur | ⏳ |
| TC-REL-099 | API | haute | meteo/journal/transparence \| isolation par dossier_id | ✅ api/relemerg.test.ts |
| TC-REL-100 | API | moyenne | transparence/fil_rouge \| GET /transparence + PATCH partage | ✅ api/relemerg.test.ts |
| TC-LOT1-001 | API | haute | userFeatures (features.ts) — GET /api/auth/me/features | ✅ api/lot1.test.ts |
| TC-LOT1-002 | API | haute | userFeatures (features.ts) — GET /api/auth/me/features | ✅ api/lot1.test.ts |
| TC-LOT1-003 | API | moyenne | userFeatures (features.ts) — GET /api/auth/me/features | ✅ api/lot1.test.ts |
| TC-LOT1-004 | API | haute | requireAuth (auth.ts) — GET /api/auth/me/features | ✅ api/lot1.test.ts |
| TC-LOT1-005 | API | moyenne | requireAuth (auth.ts) — GET /api/auth/me/features | ✅ api/lot1.test.ts |
| TC-LOT1-006 | Unitaire | moyenne | userFeatures catch (features.ts) — GET /api/auth/me/features | ⏳ |
| TC-LOT1-007 | API | haute | requireFeature('roue_emotions') (features.ts) — GET /api/visualisation/emotions/catalogue | ✅ api/lot1.test.ts |
| TC-LOT1-008 | API | haute | requireFeature('mutualisation') (features.ts) — GET /api/collaboration/ressources | ✅ api/lot1.test.ts |
| TC-LOT1-009 | API | haute | requireFeature('entretien') (features.ts) | ✅ api/lot1.test.ts |
| TC-LOT1-010 | API | moyenne | requireFeature('roue_emotions') (features.ts) — GET /api/visualisation/emotions/catalogue | ✅ api/lot1.test.ts |
| TC-LOT1-011 | API | moyenne | requireFeature branche !u (features.ts) | ✅ api/lot1.test.ts |
| TC-LOT1-012 | Unitaire | haute | sanitizeKeys (features.ts) | ⏳ |
| TC-LOT1-013 | Unitaire | moyenne | sanitizeKeys garde Array.isArray (features.ts) | ⏳ |
| TC-LOT1-014 | Unitaire | basse | sanitizeKeys (features.ts) | ⏳ |
| TC-LOT1-015 | API | haute | FEATURES/ALL_FEATURE_KEYS (features.ts) — GET /api/admin/features | ✅ api/lot1.test.ts |
| TC-LOT1-016 | API | moyenne | requireAuth — GET /api/admin/features | ✅ api/lot1.test.ts |
| TC-LOT1-017 | API | haute | requireRole('admin') — GET /api/admin/features | ✅ api/lot1.test.ts |
| TC-LOT1-018 | API | moyenne | requireRole('admin') — GET /api/admin/features | ✅ api/lot1.test.ts |
| TC-LOT1-019 | API | haute | admin GET /users — GET /api/admin/users | ✅ api/lot1.test.ts |
| TC-LOT1-020 | API | haute | requireRole('admin') — GET /api/admin/users | ✅ api/lot1.test.ts |
| TC-LOT1-021 | API | moyenne | requireAuth — GET /api/admin/users | ✅ api/lot1.test.ts |
| TC-LOT1-022 | API | haute | admin GET /plans — GET /api/admin/plans | ✅ api/lot1.test.ts |
| TC-LOT1-023 | API | basse | safeParse + sanitizeKeys (admin.ts) — GET /api/admin/plans | ✅ api/lot1.test.ts |
| TC-LOT1-024 | API | moyenne | requireAuth + requireRole('admin') — GET /api/admin/plans | ✅ api/lot1.test.ts |
| TC-LOT1-025 | API | haute | admin POST /plans — POST /api/admin/plans | ✅ api/lot1.test.ts |
| TC-LOT1-026 | API | haute | admin POST /plans validation nom — POST /api/admin/plans | ✅ api/lot1.test.ts |
| TC-LOT1-027 | API | moyenne | sanitizeKeys (admin POST /plans) — POST /api/admin/plans | ✅ api/lot1.test.ts |
| TC-LOT1-028 | API | basse | sanitizeKeys(req.body?.features) — POST /api/admin/plans | ✅ api/lot1.test.ts |
| TC-LOT1-029 | API | moyenne | requireAuth + requireRole('admin') — POST /api/admin/plans | ✅ api/lot1.test.ts |
| TC-LOT1-030 | API | haute | admin PATCH /plans/:id — PATCH /api/admin/plans/:id | ✅ api/lot1.test.ts |
| TC-LOT1-031 | API | moyenne | admin PATCH /plans/:id branches undefined — PATCH /api/admin/plans/:id | ✅ api/lot1.test.ts |
| TC-LOT1-032 | API | haute | admin PATCH /plans/:id validation nom — PATCH /api/admin/plans/:id | ✅ api/lot1.test.ts |
| TC-LOT1-033 | API | basse | admin PATCH /plans/:id description — PATCH /api/admin/plans/:id | ✅ api/lot1.test.ts |
| TC-LOT1-034 | API | haute | admin PATCH /plans/:id garde existence — PATCH /api/admin/plans/:id | ✅ api/lot1.test.ts |
| TC-LOT1-035 | API | moyenne | requireAuth + requireRole('admin') — PATCH /api/admin/plans/:id | ✅ api/lot1.test.ts |
| TC-LOT1-036 | API | haute | admin POST /plans/:id/duplication — POST /api/admin/plans/:id/duplication | ✅ api/lot1.test.ts |
| TC-LOT1-037 | API | moyenne | admin POST /plans/:id/duplication garde — POST /api/admin/plans/:id/duplication | ✅ api/lot1.test.ts |
| TC-LOT1-038 | API | basse | requireRole('admin') — POST /api/admin/plans/:id/duplication | ✅ api/lot1.test.ts |
| TC-LOT1-039 | API | haute | admin DELETE /plans/:id (UPDATE users plan_id=NULL) — DELETE /api/admin/plans/:id | ✅ api/lot1.test.ts |
| TC-LOT1-040 | API | moyenne | admin DELETE /plans/:id garde — DELETE /api/admin/plans/:id | ✅ api/lot1.test.ts |
| TC-LOT1-041 | API | moyenne | requireAuth + requireRole('admin') — DELETE /api/admin/plans/:id | ✅ api/lot1.test.ts |
| TC-LOT1-042 | API | haute | admin PATCH /users/:id plan_id — PATCH /api/admin/users/:id | ✅ api/lot1.test.ts |
| TC-LOT1-043 | API | haute | admin PATCH /users/:id plan_id NULL — PATCH /api/admin/users/:id | ✅ api/lot1.test.ts |
| TC-LOT1-044 | API | haute | admin PATCH /users/:id plan introuvable — PATCH /api/admin/users/:id | ✅ api/lot1.test.ts |
| TC-LOT1-045 | API | moyenne | admin PATCH /users/:id role — PATCH /api/admin/users/:id | ✅ api/lot1.test.ts |
| TC-LOT1-046 | API | moyenne | admin PATCH /users/:id role garde ROLES — PATCH /api/admin/users/:id | ✅ api/lot1.test.ts |
| TC-LOT1-047 | API | moyenne | admin PATCH /users/:id actif — PATCH /api/admin/users/:id | ✅ api/lot1.test.ts |
| TC-LOT1-048 | API | haute | admin PATCH /users/:id garde auto — PATCH /api/admin/users/:id | ✅ api/lot1.test.ts |
| TC-LOT1-049 | API | moyenne | admin PATCH /users/:id garde existence — PATCH /api/admin/users/:id | ✅ api/lot1.test.ts |
| TC-LOT1-050 | API | moyenne | requireAuth + requireRole('admin') — PATCH /api/admin/users/:id | ✅ api/lot1.test.ts |
| TC-LOT1-051 | API | moyenne | admin POST /users — POST /api/admin/users | ✅ api/lot1.test.ts |
| TC-LOT1-052 | API | haute | admin POST /users validation — POST /api/admin/users | ✅ api/lot1.test.ts |
| TC-LOT1-053 | API | haute | admin POST /users conflit — POST /api/admin/users | ✅ api/lot1.test.ts |
| TC-LOT1-054 | API | basse | requireAuth + requireRole('admin') — POST /api/admin/users | ✅ api/lot1.test.ts |
| TC-LOT1-055 | API | moyenne | admin POST /lien — POST /api/admin/lien | ✅ api/lot1.test.ts |
| TC-LOT1-056 | API | moyenne | admin POST /lien validation rôles — POST /api/admin/lien | ✅ api/lot1.test.ts |
| TC-LOT1-057 | API | basse | requireRole('admin') — POST /api/admin/lien | ✅ api/lot1.test.ts |
| TC-LOT1-058 | UI | haute | PlansManager.tsx — POST/PATCH /api/admin/plans | ⏳ |
| TC-LOT1-059 | UI | moyenne | PlansManager.tsx — POST /api/admin/plans/:id/duplication, DELETE /api/admin/plans/:id | ⏳ |
| TC-LOT1-060 | UI | haute | Admin.tsx setPlan — PATCH /api/admin/users/:id | ⏳ |
| TC-LOT1-061 | UI | haute | FeaturesContext.tsx useFeature — GET /api/auth/me/features | ⏳ |
| TC-LOT1-062 | UI | moyenne | FeaturesContext.tsx — GET /api/auth/me/features | ⏳ |
| TC-LOT1-063 | Unitaire | basse | userFeatures branche !row (features.ts) | ⏳ |
| TC-PILOT-001 | API | haute | signaux_faibles · GET /api/pilotage/signaux | ✅ api/pilot.test.ts |
| TC-PILOT-002 | API | haute | signaux_faibles · GET /api/pilotage/signaux | ✅ api/pilot.test.ts |
| TC-PILOT-003 | API | haute | requireAuth · GET /api/pilotage/signaux | ✅ api/pilot.test.ts |
| TC-PILOT-004 | API | moyenne | requireAuth · GET /api/pilotage/signaux | ✅ api/pilot.test.ts |
| TC-PILOT-005 | API | haute | requireRole · GET /api/pilotage/signaux | ✅ api/pilot.test.ts |
| TC-PILOT-006 | API | moyenne | requireRole · GET /api/pilotage/signaux | ✅ api/pilot.test.ts |
| TC-PILOT-007 | API | haute | requireFeature('signaux_faibles') · GET /api/pilotage/signaux | ✅ api/pilot.test.ts |
| TC-PILOT-008 | API | moyenne | requireFeature('signaux_faibles') · GET /api/pilotage/signaux | ✅ api/pilot.test.ts |
| TC-PILOT-009 | API | moyenne | signaux_faibles · GET /api/pilotage/signaux | ✅ api/pilot.test.ts |
| TC-PILOT-010 | Unitaire | haute | signaux_faibles · signauxDossier() | ⏳ |
| TC-PILOT-011 | Unitaire | haute | signaux_faibles · signauxDossier() | ⏳ |
| TC-PILOT-012 | Unitaire | haute | signaux_faibles · signauxDossier() | ⏳ |
| TC-PILOT-013 | Unitaire | moyenne | signaux_faibles · signauxDossier() | ⏳ |
| TC-PILOT-014 | Unitaire | moyenne | signaux_faibles · signauxDossier() | ⏳ |
| TC-PILOT-015 | Unitaire | haute | signaux_faibles · signauxDossier() | ⏳ |
| TC-PILOT-016 | Unitaire | moyenne | signaux_faibles · signauxDossier() | ⏳ |
| TC-PILOT-017 | Unitaire | moyenne | signaux_faibles · signauxDossier() | ⏳ |
| TC-PILOT-018 | Unitaire | moyenne | signaux_faibles · signauxDossier() (requête meteo_humeur) | ⏳ |
| TC-PILOT-019 | Unitaire | moyenne | signaux_faibles · signauxDossier() | ⏳ |
| TC-PILOT-020 | Unitaire | haute | signaux_faibles · signauxDossier() | ⏳ |
| TC-PILOT-021 | Unitaire | moyenne | signaux_faibles · signauxDossier() | ⏳ |
| TC-PILOT-022 | Unitaire | moyenne | signaux_faibles · joursDepuis() | ⏳ |
| TC-PILOT-023 | Unitaire | moyenne | signaux_faibles · computeSignaux() | ⏳ |
| TC-PILOT-024 | Unitaire | basse | signaux_faibles · computeSignaux() | ⏳ |
| TC-PILOT-025 | API | haute | tableau_impact · GET /api/pilotage/impact | ✅ api/pilot.test.ts |
| TC-PILOT-026 | API | haute | requireAuth · GET /api/pilotage/impact | ✅ api/pilot.test.ts |
| TC-PILOT-027 | API | haute | requireRole · GET /api/pilotage/impact | ✅ api/pilot.test.ts |
| TC-PILOT-028 | API | haute | requireFeature('tableau_impact') · GET /api/pilotage/impact | ✅ api/pilot.test.ts |
| TC-PILOT-029 | API | haute | tableau_impact · GET /api/pilotage/impact | ✅ api/pilot.test.ts |
| TC-PILOT-030 | Unitaire | haute | tableau_impact · computeImpact() | ⏳ |
| TC-PILOT-031 | Unitaire | moyenne | tableau_impact · computeImpact() | ⏳ |
| TC-PILOT-032 | Unitaire | moyenne | tableau_impact · computeImpact() | ⏳ |
| TC-PILOT-033 | Unitaire | moyenne | tableau_impact · computeImpact() | ⏳ |
| TC-PILOT-034 | Unitaire | moyenne | tableau_impact · computeImpact() | ⏳ |
| TC-PILOT-035 | Unitaire | moyenne | tableau_impact · computeImpact() | ⏳ |
| TC-PILOT-036 | Unitaire | moyenne | tableau_impact · computeImpact() | ⏳ |
| TC-PILOT-037 | API | haute | digest_email · GET /api/pilotage/digest | ✅ api/pilot.test.ts |
| TC-PILOT-038 | API | haute | requireAuth · GET /api/pilotage/digest | ✅ api/pilot.test.ts |
| TC-PILOT-039 | API | haute | requireRole · GET /api/pilotage/digest | ✅ api/pilot.test.ts |
| TC-PILOT-040 | API | haute | requireFeature('digest_email') · GET /api/pilotage/digest | ✅ api/pilot.test.ts |
| TC-PILOT-041 | Unitaire | moyenne | digest_email · buildDigest() | ⏳ |
| TC-PILOT-042 | Unitaire | moyenne | digest_email · buildDigest() | ⏳ |
| TC-PILOT-043 | Unitaire | basse | digest_email · buildDigest() | ⏳ |
| TC-PILOT-044 | Unitaire | basse | digest_email · buildDigest() | ⏳ |
| TC-PILOT-045 | Unitaire | haute | digest_email · esc() · buildDigest() | ⏳ |
| TC-PILOT-046 | Unitaire | basse | digest_email · buildDigest() | ⏳ |
| TC-PILOT-047 | API | haute | digest_email · POST /api/pilotage/digest/envoyer | ✅ api/pilot.test.ts |
| TC-PILOT-048 | API | haute | requireAuth · POST /api/pilotage/digest/envoyer | ✅ api/pilot.test.ts |
| TC-PILOT-049 | API | haute | requireRole · POST /api/pilotage/digest/envoyer | ✅ api/pilot.test.ts |
| TC-PILOT-050 | API | haute | requireFeature('digest_email') · POST /api/pilotage/digest/envoyer | ✅ api/pilot.test.ts |
| TC-PILOT-051 | API | moyenne | digest_email · POST /api/pilotage/digest/envoyer | ✅ api/pilot.test.ts |
| TC-PILOT-052 | UI | haute | signaux_faibles · Dashboard.tsx (GET /api/pilotage/signaux) | ⏳ |
| TC-PILOT-053 | UI | moyenne | signaux_faibles · Dashboard.tsx | ⏳ |
| TC-PILOT-054 | UI | haute | tableau_impact · PilotageBoard.tsx (GET /api/pilotage/impact) | ⏳ |
| TC-PILOT-055 | UI | haute | digest_email · PilotageBoard.tsx (GET /api/pilotage/digest, POST /api/pilotage/digest/envoyer) | ⏳ |
| TC-PILOT-056 | UI | moyenne | tableau_impact + digest_email · PilotageBoard.tsx | ⏳ |
| TC-PILOT-057 | API | moyenne | features.userFeatures · GET/POST /api/pilotage/* | ✅ api/pilot.test.ts |
| TC-PILOT-058 | Unitaire | moyenne | signaux_faibles · sweepSignauxAlertes() | ⏳ |
| TC-PILOT-059 | Unitaire | basse | digest_email · sweepDigestsHebdo() | ⏳ |
| TC-REFLEX-001 | API | haute | bilan_pratique — GET /api/reflexivite/bilan | ✅ api/reflex.test.ts |
| TC-REFLEX-002 | API | moyenne | bilan_pratique — GET /api/reflexivite/bilan | ✅ api/reflex.test.ts |
| TC-REFLEX-003 | API | haute | requireAuth — GET /api/reflexivite/bilan | ✅ api/reflex.test.ts |
| TC-REFLEX-004 | API | haute | requireRole('accompagnateur') — GET /api/reflexivite/bilan | ✅ api/reflex.test.ts |
| TC-REFLEX-005 | API | haute | requireFeature('bilan_pratique') — GET /api/reflexivite/bilan | ✅ api/reflex.test.ts |
| TC-REFLEX-006 | API | haute | bilan_pratique — POST /api/reflexivite/bilan | ✅ api/reflex.test.ts |
| TC-REFLEX-007 | API | haute | bilan_pratique — POST /api/reflexivite/bilan (bilanFallback) | ✅ api/reflex.test.ts |
| TC-REFLEX-008 | API | moyenne | bilan_pratique — POST /api/reflexivite/bilan | ✅ api/reflex.test.ts |
| TC-REFLEX-009 | API | haute | requireAuth — POST /api/reflexivite/bilan | ✅ api/reflex.test.ts |
| TC-REFLEX-010 | API | haute | requireRole('accompagnateur') — POST /api/reflexivite/bilan | ✅ api/reflex.test.ts |
| TC-REFLEX-011 | API | haute | requireFeature('bilan_pratique') — POST /api/reflexivite/bilan | ✅ api/reflex.test.ts |
| TC-REFLEX-012 | Unitaire | haute | bilan_pratique — bilanFallback (reflexivite.ts) | ✅ unit/reflexivite.test.ts |
| TC-REFLEX-013 | Unitaire | basse | bilan_pratique — bilanFallback / INDIC_LABEL | ✅ unit/reflexivite.test.ts |
| TC-REFLEX-014 | Unitaire | moyenne | bilan_pratique — extractJson (reflexivite.ts) | ✅ unit/reflexivite.test.ts |
| TC-REFLEX-015 | API | haute | coach_posture — GET /api/reflexivite/coach/phase/:phase | ✅ api/reflex.test.ts |
| TC-REFLEX-016 | API | moyenne | coach_posture — GET /api/reflexivite/coach/phase/:phase | ✅ api/reflex.test.ts |
| TC-REFLEX-017 | API | haute | coach_posture — GET /api/reflexivite/coach/phase/:phase | ✅ api/reflex.test.ts |
| TC-REFLEX-018 | API | moyenne | coach_posture — GET /api/reflexivite/coach/phase/:phase | ✅ api/reflex.test.ts |
| TC-REFLEX-019 | API | basse | coach_posture — GET /api/reflexivite/coach/phase/:phase | ✅ api/reflex.test.ts |
| TC-REFLEX-020 | API | haute | requireAuth — GET /api/reflexivite/coach/phase/:phase | ✅ api/reflex.test.ts |
| TC-REFLEX-021 | API | haute | requireRole('accompagnateur') — GET /api/reflexivite/coach/phase/:phase | ✅ api/reflex.test.ts |
| TC-REFLEX-022 | API | haute | requireFeature('coach_posture') — GET /api/reflexivite/coach/phase/:phase | ✅ api/reflex.test.ts |
| TC-REFLEX-023 | API | haute | coach_posture — POST /api/reflexivite/coach/analyser | ✅ api/reflex.test.ts |
| TC-REFLEX-024 | API | haute | coach_posture — POST /api/reflexivite/coach/analyser | ✅ api/reflex.test.ts |
| TC-REFLEX-025 | API | haute | requireAuth — POST /api/reflexivite/coach/analyser | ✅ api/reflex.test.ts |
| TC-REFLEX-026 | API | haute | requireRole('accompagnateur') — POST /api/reflexivite/coach/analyser | ✅ api/reflex.test.ts |
| TC-REFLEX-027 | API | haute | requireFeature('coach_posture') — POST /api/reflexivite/coach/analyser | ✅ api/reflex.test.ts |
| TC-REFLEX-028 | Unitaire | haute | coach_posture — analyseQuestionFallback / OPEN_RE (reflexivite.ts) | ✅ unit/reflexivite.test.ts |
| TC-REFLEX-029 | Unitaire | haute | coach_posture — analyseQuestionFallback / FERME_RE (reflexivite.ts) | ✅ unit/reflexivite.test.ts |
| TC-REFLEX-030 | Unitaire | haute | coach_posture — analyseQuestionFallback (reflexivite.ts) | ✅ unit/reflexivite.test.ts |
| TC-REFLEX-031 | Unitaire | moyenne | coach_posture — analyseQuestionFallback (OPEN_RE/FERME_RE) | ✅ unit/reflexivite.test.ts |
| TC-REFLEX-032 | Unitaire | basse | coach_posture — analyseQuestionFallback (reflexivite.ts) | ✅ unit/reflexivite.test.ts |
| TC-REFLEX-033 | API | haute | debriefing — GET /api/reflexivite/debriefing/session/:sid | ✅ api/reflex.test.ts |
| TC-REFLEX-034 | API | haute | ownsSession — GET /api/reflexivite/debriefing/session/:sid | ✅ api/reflex.test.ts |
| TC-REFLEX-035 | API | moyenne | ownsSession — GET /api/reflexivite/debriefing/session/:sid | ✅ api/reflex.test.ts |
| TC-REFLEX-036 | API | haute | requireAuth — GET /api/reflexivite/debriefing/session/:sid | ✅ api/reflex.test.ts |
| TC-REFLEX-037 | API | haute | requireRole('accompagnateur') — GET /api/reflexivite/debriefing/session/:sid | ✅ api/reflex.test.ts |
| TC-REFLEX-038 | API | haute | requireFeature('debriefing') — GET /api/reflexivite/debriefing/session/:sid | ✅ api/reflex.test.ts |
| TC-REFLEX-039 | API | haute | debriefing — POST /api/reflexivite/debriefing/session/:sid | ✅ api/reflex.test.ts |
| TC-REFLEX-040 | API | moyenne | debriefing — POST /api/reflexivite/debriefing/session/:sid | ✅ api/reflex.test.ts |
| TC-REFLEX-041 | API | basse | debriefing — POST /api/reflexivite/debriefing/session/:sid | ✅ api/reflex.test.ts |
| TC-REFLEX-042 | API | moyenne | debriefing — POST /api/reflexivite/debriefing/session/:sid | ✅ api/reflex.test.ts |
| TC-REFLEX-043 | API | haute | ownsSession — POST /api/reflexivite/debriefing/session/:sid | ✅ api/reflex.test.ts |
| TC-REFLEX-044 | API | haute | requireAuth — POST /api/reflexivite/debriefing/session/:sid | ✅ api/reflex.test.ts |
| TC-REFLEX-045 | API | moyenne | requireFeature('debriefing') — POST /api/reflexivite/debriefing/session/:sid | ✅ api/reflex.test.ts |
| TC-REFLEX-046 | API | haute | debriefing — POST /api/reflexivite/debriefing/session/:sid/suggerer | ✅ api/reflex.test.ts |
| TC-REFLEX-047 | API | haute | debriefing — POST /api/reflexivite/debriefing/session/:sid/suggerer (fallback) | ✅ api/reflex.test.ts |
| TC-REFLEX-048 | API | haute | ownsSession — POST /api/reflexivite/debriefing/session/:sid/suggerer | ✅ api/reflex.test.ts |
| TC-REFLEX-049 | API | moyenne | requireAuth — POST /api/reflexivite/debriefing/session/:sid/suggerer | ✅ api/reflex.test.ts |
| TC-REFLEX-050 | API | moyenne | requireRole/requireFeature('debriefing') — POST /api/reflexivite/debriefing/session/:sid/suggerer | ✅ api/reflex.test.ts |
| TC-REFLEX-051 | Unitaire | moyenne | debriefing — sessionTraces (reflexivite.ts) | ✅ unit/reflexivite.test.ts |
| TC-REFLEX-052 | API | haute | replay_annote — GET /api/reflexivite/replay/session/:sid | ✅ api/reflex.test.ts |
| TC-REFLEX-053 | API | moyenne | replay_annote — GET /api/reflexivite/replay/session/:sid | ✅ api/reflex.test.ts |
| TC-REFLEX-054 | API | haute | ownsSession — GET /api/reflexivite/replay/session/:sid | ✅ api/reflex.test.ts |
| TC-REFLEX-055 | API | moyenne | requireAuth/requireRole/requireFeature('replay_annote') — GET /api/reflexivite/replay/session/:sid | ✅ api/reflex.test.ts |
| TC-REFLEX-056 | API | haute | replay_annote — POST /api/reflexivite/replay/session/:sid | ✅ api/reflex.test.ts |
| TC-REFLEX-057 | API | moyenne | replay_annote — POST /api/reflexivite/replay/session/:sid | ✅ api/reflex.test.ts |
| TC-REFLEX-058 | API | basse | replay_annote — POST /api/reflexivite/replay/session/:sid | ✅ api/reflex.test.ts |
| TC-REFLEX-059 | API | moyenne | replay_annote — POST /api/reflexivite/replay/session/:sid | ✅ api/reflex.test.ts |
| TC-REFLEX-060 | API | haute | ownsSession — POST /api/reflexivite/replay/session/:sid | ✅ api/reflex.test.ts |
| TC-REFLEX-061 | API | moyenne | requireAuth/requireRole/requireFeature('replay_annote') — POST /api/reflexivite/replay/session/:sid | ✅ api/reflex.test.ts |
| TC-REFLEX-062 | API | haute | replay_annote — POST /api/reflexivite/replay/session/:sid/initialiser | ✅ api/reflex.test.ts |
| TC-REFLEX-063 | API | haute | replay_annote — POST /api/reflexivite/replay/session/:sid/initialiser (OPEN_RE fallback) | ✅ api/reflex.test.ts |
| TC-REFLEX-064 | API | moyenne | replay_annote — POST /api/reflexivite/replay/session/:sid/initialiser | ✅ api/reflex.test.ts |
| TC-REFLEX-065 | API | haute | ownsSession — POST /api/reflexivite/replay/session/:sid/initialiser | ✅ api/reflex.test.ts |
| TC-REFLEX-066 | API | moyenne | requireAuth/requireRole/requireFeature('replay_annote') — POST /api/reflexivite/replay/session/:sid/initialiser | ✅ api/reflex.test.ts |
| TC-REFLEX-067 | Unitaire | moyenne | replay_annote — momentsDeSession (reflexivite.ts) | ✅ unit/reflexivite.test.ts |
| TC-REFLEX-068 | UI | haute | bilan_pratique — page BilanPratique.tsx (/bilan-pratique) | ⏳ |
| TC-REFLEX-069 | UI | haute | coach_posture — composant CoachPosture.tsx / POST /coach/analyser | ⏳ |
| TC-REFLEX-070 | UI | moyenne | debriefing — composant DebriefingModal.tsx / GET+POST+suggerer | ⏳ |
| TC-REFLEX-071 | UI | moyenne | replay_annote — composant ReplayModal.tsx / GET+POST+initialiser | ⏳ |
| TC-REFLEX-072 | UI | moyenne | bilan_pratique — App.tsx Protected role='accompagnateur' (/bilan-pratique) | ⏳ |
| TC-COLLAB-001 | API | haute | (public) GET /api/collab/ressources/public/:token — page RessourcePublique.tsx | ✅ api/collab.test.ts |
| TC-COLLAB-002 | API | basse | (public) GET /api/collab/ressources/public/:token | ✅ api/collab.test.ts |
| TC-COLLAB-003 | API | haute | (public) GET /api/collab/ressources/public/:token | ✅ api/collab.test.ts |
| TC-COLLAB-004 | API | haute | (public) GET /api/collab/ressources/public/:token | ✅ api/collab.test.ts |
| TC-COLLAB-005 | API | moyenne | (public) GET /api/collab/ressources/public/:token | ✅ api/collab.test.ts |
| TC-COLLAB-006 | API | haute | mutualisation — GET /api/collab/ressources — page Mutualisation.tsx | ✅ api/collab.test.ts |
| TC-COLLAB-007 | API | basse | mutualisation — GET /api/collab/ressources | ✅ api/collab.test.ts |
| TC-COLLAB-008 | API | haute | mutualisation — GET /api/collab/ressources (requireAuth) | ✅ api/collab.test.ts |
| TC-COLLAB-009 | API | haute | mutualisation — GET /api/collab/ressources (requireRole) | ✅ api/collab.test.ts |
| TC-COLLAB-010 | API | moyenne | mutualisation — GET /api/collab/ressources (requireRole) | ✅ api/collab.test.ts |
| TC-COLLAB-011 | API | haute | mutualisation — GET /api/collab/ressources (requireFeature) | ✅ api/collab.test.ts |
| TC-COLLAB-012 | API | haute | mutualisation — POST /api/collab/ressources | ✅ api/collab.test.ts |
| TC-COLLAB-013 | API | moyenne | mutualisation — POST /api/collab/ressources | ✅ api/collab.test.ts |
| TC-COLLAB-014 | API | basse | mutualisation — POST /api/collab/ressources | ✅ api/collab.test.ts |
| TC-COLLAB-015 | API | haute | mutualisation — POST /api/collab/ressources | ✅ api/collab.test.ts |
| TC-COLLAB-016 | API | haute | mutualisation — POST /api/collab/ressources | ✅ api/collab.test.ts |
| TC-COLLAB-017 | API | moyenne | mutualisation — POST /api/collab/ressources | ✅ api/collab.test.ts |
| TC-COLLAB-018 | API | haute | mutualisation — POST /api/collab/ressources (requireAuth) | ✅ api/collab.test.ts |
| TC-COLLAB-019 | API | haute | mutualisation — POST /api/collab/ressources (requireRole) | ✅ api/collab.test.ts |
| TC-COLLAB-020 | API | moyenne | mutualisation — POST /api/collab/ressources (requireFeature) | ✅ api/collab.test.ts |
| TC-COLLAB-021 | API | haute | mutualisation — PATCH /api/collab/ressources/:id | ✅ api/collab.test.ts |
| TC-COLLAB-022 | API | moyenne | mutualisation — PATCH /api/collab/ressources/:id | ✅ api/collab.test.ts |
| TC-COLLAB-023 | API | moyenne | mutualisation — PATCH /api/collab/ressources/:id | ✅ api/collab.test.ts |
| TC-COLLAB-024 | API | moyenne | mutualisation — PATCH /api/collab/ressources/:id | ✅ api/collab.test.ts |
| TC-COLLAB-025 | API | haute | mutualisation — PATCH /api/collab/ressources/:id | ✅ api/collab.test.ts |
| TC-COLLAB-026 | API | moyenne | mutualisation — PATCH /api/collab/ressources/:id | ✅ api/collab.test.ts |
| TC-COLLAB-027 | API | moyenne | mutualisation — PATCH /api/collab/ressources/:id (requireAuth/Role/Feature) | ✅ api/collab.test.ts |
| TC-COLLAB-028 | API | haute | mutualisation — DELETE /api/collab/ressources/:id | ✅ api/collab.test.ts |
| TC-COLLAB-029 | API | haute | mutualisation — DELETE /api/collab/ressources/:id | ✅ api/collab.test.ts |
| TC-COLLAB-030 | API | moyenne | mutualisation — DELETE /api/collab/ressources/:id | ✅ api/collab.test.ts |
| TC-COLLAB-031 | API | moyenne | mutualisation — DELETE /api/collab/ressources/:id | ✅ api/collab.test.ts |
| TC-COLLAB-032 | API | haute | problematisation — GET /api/collab/problematisation/dossier/:id — ProblematisationCard.tsx | ✅ unit/collaboration.test.ts, api/collab.test.ts |
| TC-COLLAB-033 | API | haute | problematisation — GET /api/collab/problematisation/dossier/:id | ✅ api/collab.test.ts |
| TC-COLLAB-034 | API | haute | problematisation — GET /api/collab/problematisation/dossier/:id | ✅ api/collab.test.ts |
| TC-COLLAB-035 | API | haute | problematisation — POST /api/collab/problematisation/dossier/:id | ✅ api/collab.test.ts |
| TC-COLLAB-036 | API | moyenne | problematisation — POST /api/collab/problematisation/dossier/:id | ✅ api/collab.test.ts |
| TC-COLLAB-037 | API | moyenne | problematisation — POST /api/collab/problematisation/dossier/:id | ✅ api/collab.test.ts |
| TC-COLLAB-038 | API | basse | problematisation — POST /api/collab/problematisation/dossier/:id | ✅ api/collab.test.ts |
| TC-COLLAB-039 | API | haute | problematisation — POST /api/collab/problematisation/dossier/:id | ✅ api/collab.test.ts |
| TC-COLLAB-040 | API | moyenne | problematisation — POST /api/collab/problematisation/dossier/:id | ✅ api/collab.test.ts |
| TC-COLLAB-041 | API | haute | problematisation — POST /api/collab/problematisation/dossier/:id/suggerer | ✅ api/collab.test.ts |
| TC-COLLAB-042 | API | haute | problematisation — POST /api/collab/problematisation/dossier/:id/suggerer (repli) | ✅ api/collab.test.ts |
| TC-COLLAB-043 | Unitaire | moyenne | problematisation — branche heuristique de POST .../suggerer | ⏳ |
| TC-COLLAB-044 | API | haute | problematisation — POST .../suggerer (requireAuth/Role/Feature + ownDossier) | ✅ api/collab.test.ts |
| TC-COLLAB-045 | Unitaire | moyenne | problematisation/resume — fonction extractJson (collaboration.ts) | ✅ unit/collaboration.test.ts |
| TC-COLLAB-046 | API | haute | resume_parcours — GET /api/collab/resume/dossier/:id — ResumeParcoursCard.tsx | ✅ api/collab.test.ts |
| TC-COLLAB-047 | API | haute | resume_parcours — GET /api/collab/resume/dossier/:id | ✅ api/collab.test.ts |
| TC-COLLAB-048 | API | haute | resume_parcours — POST /api/collab/resume/dossier/:id | ✅ api/collab.test.ts |
| TC-COLLAB-049 | API | haute | resume_parcours — POST .../resume (resumeFallback) | ✅ api/collab.test.ts |
| TC-COLLAB-050 | Unitaire | moyenne | resume_parcours — fonction resumeFallback | ✅ unit/collaboration.test.ts |
| TC-COLLAB-051 | Unitaire | moyenne | resume_parcours — resumeFallback / PHASES_FR | ✅ unit/collaboration.test.ts |
| TC-COLLAB-052 | API | moyenne | resume_parcours — POST /api/collab/resume/dossier/:id | ✅ api/collab.test.ts |
| TC-COLLAB-053 | API | haute | resume_parcours — POST /api/collab/resume/dossier/:id | ✅ api/collab.test.ts |
| TC-COLLAB-054 | UI | haute | mutualisation — page Mutualisation.tsx (POST+GET /collab/ressources) | ⏳ |
| TC-COLLAB-055 | UI | haute | mutualisation — Mutualisation.tsx + RessourcePublique.tsx | ⏳ |
| TC-COLLAB-056 | UI | moyenne | mutualisation — Mutualisation.tsx (flag mienne) | ⏳ |
| TC-COLLAB-057 | UI | moyenne | mutualisation — Mutualisation.tsx (DELETE /collab/ressources/:id) | ⏳ |
| TC-COLLAB-058 | UI | moyenne | mutualisation — Dashboard.tsx (mutualisationActive) + App.tsx route | ⏳ |
| TC-COLLAB-059 | UI | haute | problematisation — ProblematisationCard.tsx (GET/POST/suggerer) | ⏳ |
| TC-COLLAB-060 | UI | basse | problematisation — ProblematisationCard.tsx (useFeature) | ⏳ |
| TC-COLLAB-061 | UI | haute | resume_parcours — ResumeParcoursCard.tsx (GET/POST) | ⏳ |
| TC-COLLAB-062 | UI | basse | resume_parcours — ResumeParcoursCard.tsx (useFeature) | ⏳ |
| TC-COLLAB-063 | UI | moyenne | (public) RessourcePublique.tsx — GET /collab/ressources/public/:token | ⏳ |
| TC-COLLAB-064 | API | moyenne | (public) GET /api/collab/ressources/public/:token | ✅ api/collab.test.ts |
| TC-VIZ-001 | API | haute | nuage_themes \| GET /api/viz/nuage/dossier/:id | ✅ api/viz.test.ts |
| TC-VIZ-002 | API | moyenne | nuage_themes \| GET /api/viz/nuage/dossier/:id | ✅ api/viz.test.ts |
| TC-VIZ-003 | API | haute | nuage_themes \| GET /api/viz/nuage/dossier/:id (requireAuth) | ✅ api/viz.test.ts |
| TC-VIZ-004 | API | haute | nuage_themes \| GET /api/viz/nuage/dossier/:id (requireFeature) | ✅ api/viz.test.ts |
| TC-VIZ-005 | API | haute | nuage_themes \| GET /api/viz/nuage/dossier/:id (ownEither) | ✅ api/viz.test.ts |
| TC-VIZ-006 | API | moyenne | nuage_themes \| GET /api/viz/nuage/dossier/:id | ✅ api/viz.test.ts |
| TC-VIZ-007 | API | haute | nuage_themes \| POST /api/viz/nuage/dossier/:id | ✅ api/viz.test.ts |
| TC-VIZ-008 | API | haute | nuage_themes \| POST + GET /api/viz/nuage/dossier/:id | ✅ api/viz.test.ts |
| TC-VIZ-009 | API | moyenne | nuage_themes \| POST /api/viz/nuage/dossier/:id | ✅ api/viz.test.ts |
| TC-VIZ-010 | API | moyenne | nuage_themes \| POST /api/viz/nuage/dossier/:id (branche fallback) | ✅ api/viz.test.ts |
| TC-VIZ-011 | API | haute | nuage_themes \| POST /api/viz/nuage/dossier/:id (requireAuth) | ✅ api/viz.test.ts |
| TC-VIZ-012 | API | haute | nuage_themes \| POST /api/viz/nuage/dossier/:id (requireFeature) | ✅ api/viz.test.ts |
| TC-VIZ-013 | API | haute | nuage_themes \| POST /api/viz/nuage/dossier/:id (ownEither) | ✅ api/viz.test.ts |
| TC-VIZ-014 | API | moyenne | nuage_themes \| POST /api/viz/nuage/dossier/:id (ownEither OR) | ✅ api/viz.test.ts |
| TC-VIZ-015 | Unitaire | haute | nuage_themes \| fonction nuageFallback | ✅ unit/visualisation.test.ts |
| TC-VIZ-016 | Unitaire | haute | nuage_themes \| fonction nuageFallback (STOP, longueur) | ✅ unit/visualisation.test.ts |
| TC-VIZ-017 | Unitaire | moyenne | nuage_themes \| fonction nuageFallback (normalize NFD) | ✅ unit/visualisation.test.ts |
| TC-VIZ-018 | Unitaire | moyenne | nuage_themes \| fonction nuageFallback | ✅ unit/visualisation.test.ts |
| TC-VIZ-019 | Unitaire | moyenne | nuage_themes \| fonction extractJson | ✅ unit/visualisation.test.ts |
| TC-VIZ-020 | Unitaire | basse | nuage_themes \| fonction strip | ✅ unit/visualisation.test.ts |
| TC-VIZ-021 | API | moyenne | nuage_themes \| POST /api/viz/nuage/dossier/:id (texteDossier filtres) | ✅ api/viz.test.ts |
| TC-VIZ-022 | API | haute | roue_emotions \| GET /api/viz/emotions/catalogue | ✅ api/viz.test.ts |
| TC-VIZ-023 | API | haute | roue_emotions \| GET /api/viz/emotions/catalogue (requireAuth) | ✅ api/viz.test.ts |
| TC-VIZ-024 | API | haute | roue_emotions \| GET /api/viz/emotions/catalogue (requireFeature) | ✅ api/viz.test.ts |
| TC-VIZ-025 | API | haute | roue_emotions \| GET /api/viz/emotions/dossier/:id | ✅ api/viz.test.ts |
| TC-VIZ-026 | API | moyenne | roue_emotions \| GET /api/viz/emotions/dossier/:id (agg) | ✅ api/viz.test.ts |
| TC-VIZ-027 | API | moyenne | roue_emotions \| GET /api/viz/emotions/dossier/:id | ✅ api/viz.test.ts |
| TC-VIZ-028 | API | basse | roue_emotions \| GET /api/viz/emotions/dossier/:id (LIMIT 30) | ✅ api/viz.test.ts |
| TC-VIZ-029 | API | haute | roue_emotions \| GET /api/viz/emotions/dossier/:id (requireAuth) | ✅ api/viz.test.ts |
| TC-VIZ-030 | API | haute | roue_emotions \| GET /api/viz/emotions/dossier/:id (requireFeature) | ✅ api/viz.test.ts |
| TC-VIZ-031 | API | haute | roue_emotions \| GET /api/viz/emotions/dossier/:id (ownEither) | ✅ api/viz.test.ts |
| TC-VIZ-032 | API | moyenne | roue_emotions \| GET /api/viz/emotions/dossier/:id (ownEither OR) | ✅ api/viz.test.ts |
| TC-VIZ-033 | API | haute | roue_emotions \| POST /api/viz/emotions/dossier/:id | ✅ api/viz.test.ts |
| TC-VIZ-034 | API | moyenne | roue_emotions \| POST /api/viz/emotions/dossier/:id (sanitizeEmotions) | ✅ api/viz.test.ts |
| TC-VIZ-035 | API | haute | roue_emotions \| POST /api/viz/emotions/dossier/:id (sanitizeEmotions, 400) | ✅ api/viz.test.ts |
| TC-VIZ-036 | API | haute | roue_emotions \| POST /api/viz/emotions/dossier/:id (sanitizeEmotions) | ✅ api/viz.test.ts |
| TC-VIZ-037 | API | haute | roue_emotions \| POST /api/viz/emotions/dossier/:id (400) | ✅ api/viz.test.ts |
| TC-VIZ-038 | API | basse | roue_emotions \| POST /api/viz/emotions/dossier/:id (note slice 200) | ✅ api/viz.test.ts |
| TC-VIZ-039 | API | basse | roue_emotions \| POST /api/viz/emotions/dossier/:id | ✅ api/viz.test.ts |
| TC-VIZ-040 | API | haute | roue_emotions \| POST /api/viz/emotions/dossier/:id (requireAuth) | ✅ api/viz.test.ts |
| TC-VIZ-041 | API | haute | roue_emotions \| POST /api/viz/emotions/dossier/:id (requireFeature) | ✅ api/viz.test.ts |
| TC-VIZ-042 | API | haute | roue_emotions \| POST /api/viz/emotions/dossier/:id (ownEither) | ✅ api/viz.test.ts |
| TC-VIZ-043 | API | basse | roue_emotions \| POST /api/viz/emotions/dossier/:id (role) | ✅ api/viz.test.ts |
| TC-VIZ-044 | Unitaire | haute | roue_emotions \| fonction sanitizeEmotions | ✅ unit/visualisation.test.ts |
| TC-VIZ-045 | UI | haute | nuage_themes \| composant NuageThemes.tsx / page ParcoursDetail | ⏳ |
| TC-VIZ-046 | UI | moyenne | nuage_themes \| composant NuageThemes.tsx (useFeature) | ⏳ |
| TC-VIZ-047 | UI | haute | roue_emotions \| composant RoueEmotions.tsx (role accompagne) | ⏳ |
| TC-VIZ-048 | UI | haute | roue_emotions \| composant RoueEmotions.tsx (role accompagnateur, readOnly) | ⏳ |
| TC-VIZ-049 | UI | moyenne | roue_emotions \| composant RoueEmotions.tsx (disabled) + POST 400 | ⏳ |
| TC-CONFORT-001 | API | haute | visio \| GET /api/confort/visio/rdv/:id | ✅ api/confort.test.ts |
| TC-CONFORT-002 | API | haute | visio \| GET /api/confort/visio/rdv/:id | ✅ api/confort.test.ts |
| TC-CONFORT-003 | API | moyenne | visio \| GET /api/confort/visio/rdv/:id | ✅ api/confort.test.ts |
| TC-CONFORT-004 | Unitaire | basse | visio \| GET /api/confort/visio/rdv/:id | ✅ unit/confort.test.ts, api/confort.test.ts |
| TC-CONFORT-005 | API | haute | visio \| GET /api/confort/visio/rdv/:id (requireAuth) | ✅ api/confort.test.ts |
| TC-CONFORT-006 | API | haute | visio \| requireFeature('visio') | ✅ api/confort.test.ts |
| TC-CONFORT-007 | API | haute | visio \| GET /api/confort/visio/rdv/:id (contrôle appartenance) | ✅ api/confort.test.ts |
| TC-CONFORT-008 | API | moyenne | visio \| GET /api/confort/visio/rdv/:id | ✅ api/confort.test.ts |
| TC-CONFORT-009 | API | basse | visio \| GET /api/confort/visio/rdv/:id | ✅ api/confort.test.ts |
| TC-CONFORT-010 | Unitaire | moyenne | visio \| génération salle (crypto.createHash) | ✅ unit/confort.test.ts |
| TC-CONFORT-011 | API | haute | pwa_push \| GET /api/confort/push/cle | ✅ api/confort.test.ts |
| TC-CONFORT-012 | API | haute | pwa_push \| requireAuth | ✅ api/confort.test.ts |
| TC-CONFORT-013 | API | haute | pwa_push \| requireFeature('pwa_push') | ✅ api/confort.test.ts |
| TC-CONFORT-014 | API | haute | pwa_push \| POST /api/confort/push/abonnement | ✅ api/confort.test.ts |
| TC-CONFORT-015 | API | moyenne | pwa_push \| POST /api/confort/push/abonnement | ✅ api/confort.test.ts |
| TC-CONFORT-016 | API | haute | pwa_push \| POST /api/confort/push/abonnement (upsert) | ✅ api/confort.test.ts |
| TC-CONFORT-017 | API | moyenne | pwa_push \| POST /api/confort/push/abonnement | ✅ api/confort.test.ts |
| TC-CONFORT-018 | API | haute | pwa_push \| POST /api/confort/push/abonnement (validation) | ✅ api/confort.test.ts |
| TC-CONFORT-019 | API | haute | pwa_push \| POST /api/confort/push/abonnement (validation) | ✅ api/confort.test.ts |
| TC-CONFORT-020 | API | haute | pwa_push \| POST /api/confort/push/abonnement (validation) | ✅ api/confort.test.ts |
| TC-CONFORT-021 | API | moyenne | pwa_push \| POST /api/confort/push/abonnement (validation) | ✅ api/confort.test.ts |
| TC-CONFORT-022 | API | haute | pwa_push \| requireAuth | ✅ api/confort.test.ts |
| TC-CONFORT-023 | API | haute | pwa_push \| requireFeature('pwa_push') | ✅ api/confort.test.ts |
| TC-CONFORT-024 | API | haute | pwa_push \| POST /api/confort/push/test | ✅ api/confort.test.ts |
| TC-CONFORT-025 | API | moyenne | pwa_push \| POST /api/confort/push/test | ✅ api/confort.test.ts |
| TC-CONFORT-026 | API | haute | pwa_push \| requireAuth | ✅ api/confort.test.ts |
| TC-CONFORT-027 | API | haute | pwa_push \| requireFeature('pwa_push') | ✅ api/confort.test.ts |
| TC-CONFORT-028 | Unitaire | moyenne | pwa_push \| pushToUser (purge 404/410) | ✅ unit/confort.test.ts |
| TC-CONFORT-029 | Unitaire | basse | pwa_push \| pushToUser | ✅ unit/confort.test.ts |
| TC-CONFORT-030 | API | haute | export_pdf \| GET /api/confort/export/dossier/:id | ✅ api/confort.test.ts |
| TC-CONFORT-031 | API | haute | export_pdf \| GET /api/confort/export/dossier/:id | ✅ api/confort.test.ts |
| TC-CONFORT-032 | API | moyenne | export_pdf \| GET /api/confort/export/dossier/:id | ✅ api/confort.test.ts |
| TC-CONFORT-033 | API | moyenne | export_pdf \| GET /api/confort/export/dossier/:id | ✅ api/confort.test.ts |
| TC-CONFORT-034 | API | basse | export_pdf \| GET /api/confort/export/dossier/:id | ✅ api/confort.test.ts |
| TC-CONFORT-035 | Unitaire | basse | export_pdf \| construction champ accompagne | ✅ unit/confort.test.ts |
| TC-CONFORT-036 | API | haute | export_pdf \| requireAuth | ✅ api/confort.test.ts |
| TC-CONFORT-037 | API | haute | export_pdf \| requireRole('accompagnateur') | ✅ api/confort.test.ts |
| TC-CONFORT-038 | API | moyenne | export_pdf \| requireRole('accompagnateur') | ✅ api/confort.test.ts |
| TC-CONFORT-039 | API | haute | export_pdf \| requireFeature('export_pdf') | ✅ api/confort.test.ts |
| TC-CONFORT-040 | API | haute | export_pdf \| GET /api/confort/export/dossier/:id (propriété) | ✅ api/confort.test.ts |
| TC-CONFORT-041 | API | moyenne | export_pdf \| GET /api/confort/export/dossier/:id | ✅ api/confort.test.ts |
| TC-CONFORT-042 | API | basse | export_pdf \| GET /api/confort/export/dossier/:id | ✅ api/confort.test.ts |
| TC-CONFORT-043 | UI | haute | visio \| composant VisioButton (pages/Dossier.tsx, ParcoursDetail.tsx) | ⏳ |
| TC-CONFORT-044 | UI | moyenne | visio \| VisioButton (useFeature) | ⏳ |
| TC-CONFORT-045 | UI | haute | pwa_push \| composant PushToggle (pages/Profil.tsx) | ⏳ |
| TC-CONFORT-046 | UI | moyenne | pwa_push \| PushToggle (useFeature) | ⏳ |
| TC-CONFORT-047 | UI | basse | pwa_push \| PushToggle (etat non_supporte) | ⏳ |
| TC-CONFORT-048 | UI | haute | export_pdf \| composant ExportDossierModal (pages/Dossier.tsx) | ⏳ |
| TC-CONFORT-049 | UI | moyenne | export_pdf \| Dossier.tsx (useFeature('export_pdf')) | ⏳ |
| TC-CONFORT-050 | UI | basse | export_pdf \| ExportDossierModal (gestion erreur) | ⏳ |
| TC-ETHIQUE-001 | API | haute | feature 'attestation' — GET /api/ethique/attestation/dossier/:id | ✅ api/ethique.test.ts |
| TC-ETHIQUE-002 | API | haute | feature 'attestation' — GET /api/ethique/attestation/dossier/:id | ✅ api/ethique.test.ts |
| TC-ETHIQUE-003 | API | moyenne | feature 'attestation' — GET /api/ethique/attestation/dossier/:id | ✅ api/ethique.test.ts |
| TC-ETHIQUE-004 | API | haute | feature 'attestation' — GET /api/ethique/attestation/dossier/:id | ✅ api/ethique.test.ts |
| TC-ETHIQUE-005 | API | haute | feature 'attestation' — GET /api/ethique/attestation/dossier/:id | ✅ api/ethique.test.ts |
| TC-ETHIQUE-006 | API | moyenne | feature 'attestation' — GET /api/ethique/attestation/dossier/:id | ✅ api/ethique.test.ts |
| TC-ETHIQUE-007 | API | basse | feature 'attestation' — GET /api/ethique/attestation/dossier/:id | ✅ api/ethique.test.ts |
| TC-ETHIQUE-008 | API | haute | requireAuth — GET /api/ethique/attestation/dossier/:id | ✅ api/ethique.test.ts |
| TC-ETHIQUE-009 | API | moyenne | requireAuth — GET /api/ethique/attestation/dossier/:id | ✅ api/ethique.test.ts |
| TC-ETHIQUE-010 | API | haute | requireFeature('attestation') — GET /api/ethique/attestation/dossier/:id | ✅ api/ethique.test.ts |
| TC-ETHIQUE-011 | API | moyenne | requireFeature('attestation') — GET /api/ethique/attestation/dossier/:id | ✅ api/ethique.test.ts |
| TC-ETHIQUE-012 | API | haute | console RGPD — GET /api/admin/effacements | ✅ api/ethique.test.ts |
| TC-ETHIQUE-013 | API | haute | requireAuth — GET /api/admin/effacements | ✅ api/ethique.test.ts |
| TC-ETHIQUE-014 | API | haute | requireRole('admin') — GET /api/admin/effacements | ✅ api/ethique.test.ts |
| TC-ETHIQUE-015 | API | moyenne | requireRole('admin') — GET /api/admin/effacements | ✅ api/ethique.test.ts |
| TC-ETHIQUE-016 | API | moyenne | requireRole('admin') sans requireFeature — GET /api/admin/effacements, GET /api/admin/retention | ✅ api/ethique.test.ts |
| TC-ETHIQUE-017 | API | haute | console RGPD — POST /api/admin/effacements/:id (processEffacement) | ✅ api/ethique.test.ts |
| TC-ETHIQUE-018 | API | haute | console RGPD — POST /api/admin/effacements/:id (processEffacement → deleteUser) | ✅ api/ethique.test.ts |
| TC-ETHIQUE-019 | API | haute | console RGPD — POST /api/admin/effacements/:id | ✅ api/ethique.test.ts |
| TC-ETHIQUE-020 | API | moyenne | console RGPD — POST /api/admin/effacements/:id | ✅ api/ethique.test.ts |
| TC-ETHIQUE-021 | API | haute | requireAuth + requireRole('admin') — POST /api/admin/effacements/:id | ✅ api/ethique.test.ts |
| TC-ETHIQUE-022 | API | haute | console RGPD — POST /api/admin/rgpd/:userId (anonymizeUser) | ✅ api/ethique.test.ts |
| TC-ETHIQUE-023 | API | haute | console RGPD — POST /api/admin/rgpd/:userId (deleteUser) | ✅ api/ethique.test.ts |
| TC-ETHIQUE-024 | API | haute | console RGPD — POST /api/admin/rgpd/:userId | ✅ api/ethique.test.ts |
| TC-ETHIQUE-025 | API | moyenne | console RGPD — POST /api/admin/rgpd/:userId | ✅ api/ethique.test.ts |
| TC-ETHIQUE-026 | API | moyenne | console RGPD — POST /api/admin/rgpd/:userId | ✅ api/ethique.test.ts |
| TC-ETHIQUE-027 | API | haute | requireAuth + requireRole('admin') — POST /api/admin/rgpd/:userId | ✅ api/ethique.test.ts |
| TC-ETHIQUE-028 | API | haute | console RGPD — GET /api/admin/retention | ✅ api/ethique.test.ts |
| TC-ETHIQUE-029 | API | moyenne | requireAuth + requireRole('admin') — GET /api/admin/retention | ✅ api/ethique.test.ts |
| TC-ETHIQUE-030 | API | haute | console RGPD — POST /api/admin/retention/appliquer (retentionEligibles + anonymizeUser) | ✅ api/ethique.test.ts |
| TC-ETHIQUE-031 | API | moyenne | console RGPD — POST /api/admin/retention/appliquer | ✅ api/ethique.test.ts |
| TC-ETHIQUE-032 | API | haute | requireAuth + requireRole('admin') — POST /api/admin/retention/appliquer | ✅ api/ethique.test.ts |
| TC-ETHIQUE-033 | Unitaire | haute | retentionEligibles() — app/api/src/ethique.ts | ✅ unit/ethique.test.ts |
| TC-ETHIQUE-034 | Unitaire | haute | retentionEligibles() — app/api/src/ethique.ts | ✅ unit/ethique.test.ts |
| TC-ETHIQUE-035 | Unitaire | haute | retentionEligibles() — app/api/src/ethique.ts | ✅ unit/ethique.test.ts |
| TC-ETHIQUE-036 | Unitaire | moyenne | retentionEligibles() — app/api/src/ethique.ts | ✅ unit/ethique.test.ts |
| TC-ETHIQUE-037 | Unitaire | basse | retentionEligibles() — app/api/src/ethique.ts | ✅ unit/ethique.test.ts |
| TC-ETHIQUE-038 | Unitaire | moyenne | retentionEligibles() — app/api/src/ethique.ts | ✅ unit/ethique.test.ts |
| TC-ETHIQUE-039 | Unitaire | haute | anonymizeUser() — app/api/src/ethique.ts | ✅ unit/ethique.test.ts |
| TC-ETHIQUE-040 | Unitaire | basse | anonymizeUser() — app/api/src/ethique.ts | ✅ unit/ethique.test.ts |
| TC-ETHIQUE-041 | Unitaire | haute | processEffacement() — app/api/src/ethique.ts | ✅ unit/ethique.test.ts |
| TC-ETHIQUE-042 | Unitaire | moyenne | processEffacement() — app/api/src/ethique.ts | ✅ unit/ethique.test.ts |
| TC-ETHIQUE-043 | Unitaire | moyenne | processEffacement() — app/api/src/ethique.ts | ✅ unit/ethique.test.ts |
| TC-ETHIQUE-044 | Unitaire | basse | deleteUser() — app/api/src/ethique.ts | ✅ unit/ethique.test.ts |
| TC-ETHIQUE-045 | UI | haute | feature 'attestation' — ParcoursDetail.tsx + AttestationModal.tsx (GET /api/ethique/attestation/dossier/:id) | ⏳ |
| TC-ETHIQUE-046 | UI | moyenne | feature 'attestation' — ParcoursDetail.tsx (gating UI) | ⏳ |
| TC-ETHIQUE-047 | UI | moyenne | feature 'attestation' — Dossier.tsx + AttestationModal.tsx (GET /api/ethique/attestation/dossier/:id) | ⏳ |
| TC-ETHIQUE-048 | UI | haute | console RGPD — Admin.tsx + RgpdConsole.tsx (GET /api/admin/effacements, GET /api/admin/retention) | ⏳ |
| TC-ETHIQUE-049 | UI | haute | Protected role='admin' — App.tsx + Admin.tsx / RgpdConsole.tsx | ⏳ |
| TC-ETHIQUE-050 | UI | moyenne | console RGPD — RgpdConsole.tsx (POST /api/admin/retention/appliquer) | ⏳ |
| TC-ADOPT-001 | API | haute | feature falc — POST /api/adoption/falc | ✅ api/adopt.test.ts |
| TC-ADOPT-002 | API | haute | feature falc — POST /api/adoption/falc (strip + champ html) | ✅ api/adopt.test.ts |
| TC-ADOPT-003 | API | moyenne | feature falc — POST /api/adoption/falc (texte ?? html) | ✅ api/adopt.test.ts |
| TC-ADOPT-004 | API | haute | feature falc — POST /api/adoption/falc (repli falcFallback) | ✅ api/adopt.test.ts |
| TC-ADOPT-005 | API | haute | feature falc — POST /api/adoption/falc (if (!texte)) | ✅ api/adopt.test.ts |
| TC-ADOPT-006 | API | haute | feature falc — POST /api/adoption/falc | ✅ api/adopt.test.ts |
| TC-ADOPT-007 | API | moyenne | feature falc — POST /api/adoption/falc (strip → '') | ✅ api/adopt.test.ts |
| TC-ADOPT-008 | API | basse | feature falc — POST /api/adoption/falc (slice(0,4000)) | ✅ api/adopt.test.ts |
| TC-ADOPT-009 | API | basse | feature falc — POST /api/adoption/falc (String(...)) | ✅ api/adopt.test.ts |
| TC-ADOPT-010 | API | haute | requireAuth — POST /api/adoption/falc | ✅ api/adopt.test.ts |
| TC-ADOPT-011 | API | moyenne | requireAuth — POST /api/adoption/falc | ✅ api/adopt.test.ts |
| TC-ADOPT-012 | API | haute | requireFeature('falc') — POST /api/adoption/falc | ✅ api/adopt.test.ts |
| TC-ADOPT-013 | API | haute | requireFeature('falc') / userFeatures — POST /api/adoption/falc | ✅ api/adopt.test.ts |
| TC-ADOPT-014 | API | moyenne | requireFeature('falc') — POST /api/adoption/falc | ✅ api/adopt.test.ts |
| TC-ADOPT-015 | API | moyenne | requireAuth + requireFeature('falc') — POST /api/adoption/falc | ✅ api/adopt.test.ts |
| TC-ADOPT-016 | Unitaire | haute | adoption.ts — falcFallback() | ✅ unit/adoption.test.ts |
| TC-ADOPT-017 | Unitaire | moyenne | adoption.ts — falcFallback() (filter p.length>3) | ✅ unit/adoption.test.ts |
| TC-ADOPT-018 | Unitaire | moyenne | adoption.ts — strip() | ✅ unit/adoption.test.ts |
| TC-ADOPT-019 | API | moyenne | feature falc — POST /api/adoption/falc (callClaude → null → fallback) | ✅ api/adopt.test.ts |
| TC-ADOPT-020 | API | moyenne | feature falc — POST /api/adoption/falc | ✅ api/adopt.test.ts |
| TC-ADOPT-021 | UI | haute | FalcButton.tsx — POST /api/adoption/falc | ⏳ |
| TC-ADOPT-022 | UI | haute | FalcButton.tsx — useFeature('falc') | ⏳ |
| TC-ADOPT-023 | UI | moyenne | FalcToggle.tsx — data-falc / localStorage | ⏳ |
| TC-ADOPT-024 | UI | haute | OnboardingManager.tsx / OnboardingTour.tsx — feature onboarding | ⏳ |
| TC-ADOPT-025 | UI | moyenne | OnboardingTour.tsx / OnboardingManager.tsx — bouton fab + Escape | ⏳ |
| TC-ADOPT-026 | UI | moyenne | OnboardingManager.tsx — useFeature('onboarding') | ⏳ |
| TC-UI-100 | UI | haute | (login) POST /api/auth/login + GET /api/auth/me — page Login.tsx, AuthContext | ✅ ui/accompagnateur.spec.ts |
| TC-UI-101 | UI | haute | (login) POST /api/auth/login — page Login.tsx | ✅ ui/accompagnateur.spec.ts |
| TC-UI-102 | UI | haute | (—) Protected.tsx — route /tableau-de-bord (role=accompagnateur) | ✅ ui/accompagnateur.spec.ts |
| TC-UI-103 | UI | haute | (—) Protected.tsx role=accompagnateur — route /tableau-de-bord | ✅ ui/accompagnateur.spec.ts |
| TC-UI-104 | UI | haute | (—) GET /api/entretien/dashboard — Dashboard.tsx | ✅ ui/accompagnateur.spec.ts |
| TC-UI-105 | UI | moyenne | (signaux_faibles) GET /api/pilotage/signaux — Dashboard.tsx | ✅ ui/accompagnateur.spec.ts |
| TC-UI-106 | UI | moyenne | (signaux_faibles) GET /api/pilotage/signaux — Dashboard.tsx, FeaturesContext | ⏳ |
| TC-UI-107 | UI | moyenne | (tableau_impact) GET /api/pilotage/impact — PilotageBoard.tsx | ✅ ui/accompagnateur.spec.ts |
| TC-UI-108 | UI | moyenne | (digest_email) GET /api/pilotage/digest + POST /api/pilotage/digest/envoyer — PilotageBoard.tsx | ✅ ui/accompagnateur.spec.ts |
| TC-UI-109 | UI | basse | (tableau_impact, digest_email) — PilotageBoard.tsx | ⏳ |
| TC-UI-110 | UI | moyenne | (—) GET /api/tags — Dashboard.tsx (filtre client) | ✅ ui/accompagnateur.spec.ts |
| TC-UI-111 | UI | moyenne | (—) POST/DELETE /api/tags/dossier — Dashboard.tsx | ✅ ui/accompagnateur.spec.ts |
| TC-UI-112 | UI | basse | (bilan_pratique, mutualisation) — Dashboard.tsx en-tête | ✅ ui/accompagnateur.spec.ts |
| TC-UI-113 | UI | haute | (—) GET /api/dossiers/:id — Dossier.tsx | ✅ ui/accompagnateur.spec.ts |
| TC-UI-114 | UI | haute | (—) GET /api/dossiers/:id — Dossier.tsx | ✅ ui/accompagnateur.spec.ts |
| TC-UI-115 | UI | haute | (entretien) POST /api/entretien/sessions — Entretien.tsx, Dossier.tsx | ✅ ui/accompagnateur.spec.ts |
| TC-UI-116 | UI | moyenne | (entretien) GET /api/entretien/sessions/:id + POST /reponses — Entretien.tsx | ✅ ui/accompagnateur.spec.ts |
| TC-UI-117 | UI | moyenne | (entretien) POST/PATCH/DELETE /api/entretien/sessions/:id/questions — Entretien.tsx | ✅ ui/accompagnateur.spec.ts |
| TC-UI-118 | UI | haute | (copilote) POST /api/entretien/suggestions — Entretien.tsx | ✅ ui/accompagnateur.spec.ts |
| TC-UI-119 | UI | moyenne | (copilote) POST /api/entretien/suggestions — Entretien.tsx | ⏳ |
| TC-UI-120 | UI | moyenne | (banque_questions) GET/POST /api/emergence/dossier/:id/banque — Entretien.tsx | ✅ ui/accompagnateur.spec.ts |
| TC-UI-121 | UI | moyenne | (entretien) POST /api/entretien/sessions/:id/reponses — Entretien.tsx | ✅ ui/accompagnateur.spec.ts |
| TC-UI-122 | UI | haute | (comptes_rendus) POST /api/entretien/.../cloturer + POST /api/cr/generer — Entretien.tsx, CompteRenduModal.tsx | ✅ ui/accompagnateur.spec.ts |
| TC-UI-123 | UI | haute | (comptes_rendus) PATCH /api/cr/version/:id + POST .../publier — CompteRenduModal.tsx | ✅ ui/accompagnateur.spec.ts |
| TC-UI-124 | UI | basse | (comptes_rendus) GET /api/cr/version/:id — CompteRenduModal.tsx | ✅ ui/accompagnateur.spec.ts |
| TC-UI-125 | UI | moyenne | (comptes_rendus) GET/POST /api/cr/session/:sid/messages — CompteRenduModal.tsx | ✅ ui/accompagnateur.spec.ts |
| TC-UI-126 | UI | haute | (miroir) GET/POST /api/miroir/session/:sid — MiroirReflexifModal.tsx | ✅ ui/accompagnateur.spec.ts |
| TC-UI-127 | UI | moyenne | (miroir) POST /api/miroir/session/:sid/appliquer — MiroirReflexifModal.tsx | ✅ ui/accompagnateur.spec.ts |
| TC-UI-128 | UI | basse | (miroir) — Dossier.tsx, MiroirReflexifModal.tsx | ⏳ |
| TC-UI-129 | UI | moyenne | (debriefing) GET/POST /api/reflexivite/debriefing/session/:sid(+/suggerer) — DebriefingModal.tsx | ✅ ui/accompagnateur.spec.ts |
| TC-UI-130 | UI | moyenne | (replay_annote) GET/POST /api/reflexivite/replay/session/:sid(+/initialiser) — ReplayModal.tsx | ✅ ui/accompagnateur.spec.ts |
| TC-UI-131 | UI | haute | (synthese) POST /api/synthese/generer, PATCH /version/:id, POST /version/:id/publier — SyntheseModal.tsx | ✅ ui/accompagnateur.spec.ts |
| TC-UI-132 | UI | moyenne | (fil_rouge) GET/POST /api/emergence/dossier/:id/fil-rouge + PATCH /partage — FilRougeCard.tsx | ✅ ui/accompagnateur.spec.ts |
| TC-UI-133 | UI | basse | (nuage_themes) GET/POST /api/viz/nuage/dossier/:id — NuageThemes.tsx | ✅ ui/accompagnateur.spec.ts |
| TC-UI-134 | UI | basse | (roue_emotions) GET /api/viz/emotions/dossier/:id — RoueEmotions.tsx | ✅ ui/accompagnateur.spec.ts |
| TC-UI-135 | UI | moyenne | (plan_action) POST /api/actions, PATCH /api/actions/:id, POST /api/actions/reorder — Dossier.tsx, ActionList | ✅ ui/accompagnateur.spec.ts |
| TC-UI-136 | UI | basse | (plan_action) — Dossier.tsx (cloture) | ✅ ui/accompagnateur.spec.ts |
| TC-UI-137 | UI | haute | (—) POST /api/dossiers/:id/cloturer + /rouvrir — Dossier.tsx | ✅ ui/accompagnateur.spec.ts |
| TC-UI-138 | UI | haute | (bilan_pratique) GET/POST /api/reflexivite/bilan — BilanPratique.tsx | ✅ ui/accompagnateur.spec.ts |
| TC-UI-139 | UI | moyenne | (bilan_pratique) GET /api/reflexivite/bilan — BilanPratique.tsx | ⏳ |
| TC-UI-140 | UI | moyenne | (mutualisation) GET/POST /api/collab/ressources — Mutualisation.tsx | ✅ ui/accompagnateur.spec.ts |
| TC-UI-141 | UI | moyenne | (mutualisation) POST /api/collab/ressources — Mutualisation.tsx | ✅ ui/accompagnateur.spec.ts |
| TC-UI-142 | UI | moyenne | (mutualisation) PATCH /api/collab/ressources/:id — Mutualisation.tsx, RessourcePublique | ✅ ui/accompagnateur.spec.ts |
| TC-UI-143 | UI | moyenne | (mutualisation) DELETE /api/collab/ressources/:id — Mutualisation.tsx | ✅ ui/accompagnateur.spec.ts |
| TC-UI-144 | UI | moyenne | (mutualisation) — Protected.tsx, route /mutualisation | ✅ ui/accompagnateur.spec.ts |
| TC-UI-145 | UI | moyenne | (export_pdf) GET /api/confort/export/dossier/:id — ExportDossierModal.tsx, Dossier.tsx | ✅ ui/accompagnateur.spec.ts |
| TC-UI-146 | UI | basse | (export_pdf) — Dossier.tsx, ExportDossierModal.tsx | ⏳ |
| TC-UI-147 | UI | haute | (attestation) GET /api/ethique/attestation/dossier/:id — AttestationModal.tsx, Dossier.tsx | ✅ ui/accompagnateur.spec.ts |
| TC-UI-148 | UI | moyenne | (attestation) — Dossier.tsx (cloture) | ✅ ui/accompagnateur.spec.ts |
| TC-UI-149 | UI | moyenne | (visio) GET /api/confort/visio/rdv/:id — VisioButton.tsx, Dossier.tsx | ✅ ui/accompagnateur.spec.ts |
| TC-UI-150 | UI | basse | (rdv) GET /api/rdv/:id/ics — Dossier.tsx (rdv-ics) | ✅ ui/accompagnateur.spec.ts |
| TC-UI-151 | UI | basse | (boussole) GET /api/dossiers/:id — Dossier.tsx, BoussoleParcours | ✅ ui/accompagnateur.spec.ts |
| TC-UI-152 | UI | basse | (questionnaire) — Dossier.tsx, QuestionnaireDetailModal, EntretienDetailModal | ✅ ui/accompagnateur.spec.ts |
| TC-UI-153 | UI | moyenne | (—) requireAuth (401) — Protected.tsx, AuthContext | ⏳ |
| TC-UI-154 | Unitaire | moyenne | (bilan_pratique) POST /api/reflexivite/bilan (branche repli) — reflexivite.ts | ⏳ |
| TC-UI-155 | Unitaire | moyenne | (miroir) POST /api/miroir/session/:sid (branche repli) — miroir.ts | ⏳ |
| TC-UI-156 | Unitaire | basse | (—) sanitizeKeys — features.ts | ⏳ |
| TC-UI-157 | Unitaire | basse | (—) parseTags — Dashboard.tsx | ⏳ |
| TC-UI-158 | Unitaire | moyenne | (—) userFeatures + requireFeature — features.ts | ⏳ |
| TC-UI-201 | UI | haute | Login.tsx + POST /auth/login ; Espace.tsx | ✅ ui/accompagne.spec.ts |
| TC-UI-202 | UI | haute | Login.tsx + POST /auth/login | ✅ ui/accompagne.spec.ts |
| TC-UI-203 | UI | haute | Protected.tsx (espace) | ✅ ui/accompagne.spec.ts |
| TC-UI-204 | UI | haute | Protected.tsx (parcours/questionnaire/mon-plan-action) | ✅ ui/accompagne.spec.ts |
| TC-UI-205 | UI | haute | MesParcours.tsx + GET /dossiers/mine | ✅ ui/accompagne.spec.ts |
| TC-UI-206 | UI | moyenne | MesParcours.tsx (état vide) | ⏳ |
| TC-UI-207 | UI | haute | NouveauParcours.tsx + GET /dossiers/accompagnateurs + POST /dossiers/start | ✅ ui/accompagne.spec.ts |
| TC-UI-208 | UI | moyenne | NouveauParcours.tsx (garde titre.trim()) | ✅ ui/accompagne.spec.ts |
| TC-UI-209 | UI | basse | NouveauParcours.tsx (accs.length===0) | ✅ ui/accompagne.spec.ts |
| TC-UI-210 | UI | haute | Questionnaire.tsx + POST /questionnaire/next | ✅ ui/accompagne.spec.ts |
| TC-UI-211 | UI | moyenne | Questionnaire.tsx (submit garde) | ✅ ui/accompagne.spec.ts |
| TC-UI-212 | UI | haute | Questionnaire.tsx + POST /questionnaire/save | ✅ ui/accompagne.spec.ts |
| TC-UI-213 | UI | haute | ParcoursDetail.tsx + GET /dossiers/mine/:id | ✅ ui/accompagne.spec.ts |
| TC-UI-214 | UI | haute | ParcoursDetail.tsx load() + GET /dossiers/mine/:id | ✅ ui/accompagne.spec.ts |
| TC-UI-215 | UI | haute | ParcoursDetail.tsx reserver() + POST /rdv/reserver + GET /rdv/disponibles | ✅ ui/accompagne.spec.ts |
| TC-UI-216 | UI | moyenne | ParcoursDetail.tsx reserver() catch + POST /rdv/reserver | ⏳ |
| TC-UI-217 | UI | moyenne | ParcoursDetail.tsx demander() + POST /rdv/demander | ✅ ui/accompagne.spec.ts |
| TC-UI-218 | UI | basse | ParcoursDetail.tsx (a.rdv-ics) + GET /rdv/:id/ics | ✅ ui/accompagne.spec.ts |
| TC-UI-219 | UI | haute | CompteRenduModal.tsx + GET /cr/session/:id | ✅ ui/accompagne.spec.ts |
| TC-UI-220 | UI | moyenne | CompteRenduModal.tsx (branche !cr accompagne) | ⏳ |
| TC-UI-221 | UI | moyenne | EcouterButton.tsx (feature audio) ; CompteRenduModal.tsx | ✅ ui/accompagne.spec.ts |
| TC-UI-222 | UI | moyenne | EcouterButton.tsx (useFeature('audio')) | ⏳ |
| TC-UI-223 | UI | haute | FalcButton.tsx + POST /adoption/falc | ✅ ui/accompagne.spec.ts |
| TC-UI-224 | UI | moyenne | FalcButton.tsx + FalcToggle.tsx (useFeature('falc')) | ⏳ |
| TC-UI-225 | UI | moyenne | CompteRenduModal.tsx envoyer() + POST /cr/session/:id/messages | ✅ ui/accompagne.spec.ts |
| TC-UI-226 | UI | basse | CompteRenduModal.tsx envoyer() garde | ✅ ui/accompagne.spec.ts |
| TC-UI-227 | UI | moyenne | ComptesRendus.tsx + GET /cr/mine | ✅ ui/accompagne.spec.ts |
| TC-UI-228 | UI | basse | ComptesRendus.tsx (état vide) | ✅ ui/accompagne.spec.ts |
| TC-UI-229 | UI | haute | SyntheseModal.tsx + GET /synthese/dossier/:id | ✅ ui/accompagne.spec.ts |
| TC-UI-230 | UI | moyenne | ParcoursDetail.tsx (section synthèse) | ✅ ui/accompagne.spec.ts |
| TC-UI-231 | UI | haute | ResumeParcoursCard.tsx + POST/GET /collab/resume/dossier/:id | ✅ ui/accompagne.spec.ts |
| TC-UI-232 | UI | moyenne | ResumeParcoursCard.tsx (useFeature('resume_parcours')) | ✅ ui/accompagne.spec.ts |
| TC-UI-233 | UI | haute | ProblematisationCard.tsx + GET/POST /collab/problematisation/dossier/:id(+/suggerer) | ✅ ui/accompagne.spec.ts |
| TC-UI-234 | UI | haute | MeteoWidget.tsx + POST /relationnel/meteo | ✅ ui/accompagne.spec.ts |
| TC-UI-235 | UI | moyenne | MeteoWidget.tsx (disabled !niveau) | ✅ ui/accompagne.spec.ts |
| TC-UI-236 | UI | haute | RoueEmotions.tsx + POST /viz/emotions/dossier/:id | ✅ ui/accompagne.spec.ts |
| TC-UI-237 | UI | basse | RoueEmotions.tsx (disabled !sel.length) | ✅ ui/accompagne.spec.ts |
| TC-UI-238 | UI | haute | MicroJournal.tsx + POST + PATCH /relationnel/journal | ✅ ui/accompagne.spec.ts |
| TC-UI-239 | UI | moyenne | MicroJournal.tsx supprimer() + DELETE /relationnel/journal/:id | ✅ ui/accompagne.spec.ts |
| TC-UI-240 | UI | basse | MicroJournal.tsx (garde texte.trim()) | ✅ ui/accompagne.spec.ts |
| TC-UI-241 | UI | moyenne | BoussoleParcours.tsx (useFeature('boussole')) | ✅ ui/accompagne.spec.ts |
| TC-UI-242 | UI | basse | BoussoleParcours.tsx (cur<0) | ✅ ui/accompagne.spec.ts |
| TC-UI-243 | UI | moyenne | EmergencePartage.tsx + GET /emergence/mine/dossier/:id | ✅ ui/accompagne.spec.ts |
| TC-UI-244 | UI | moyenne | NuageThemes.tsx + GET/POST /viz/nuage/dossier/:id | ✅ ui/accompagne.spec.ts |
| TC-UI-245 | UI | moyenne | CarteParcours.tsx + ParcoursDetail.tsx (carteActive) | ✅ ui/accompagne.spec.ts |
| TC-UI-246 | UI | moyenne | ParcoursDetail.tsx (carteActive && …) | ✅ ui/accompagne.spec.ts |
| TC-UI-247 | UI | haute | TransparenceModal.tsx + GET /transparence/dossier/:id | ✅ ui/accompagne.spec.ts |
| TC-UI-248 | UI | haute | TransparenceModal.tsx demander() + POST /transparence/effacement | ✅ ui/accompagne.spec.ts |
| TC-UI-249 | UI | basse | TransparenceModal.tsx (branche demande_effacement_en_cours) | ✅ ui/accompagne.spec.ts |
| TC-UI-250 | UI | moyenne | ParcoursDetail.tsx (transparenceActive && …) | ✅ ui/accompagne.spec.ts |
| TC-UI-251 | UI | haute | AttestationModal.tsx + ParcoursDetail.tsx + GET /ethique/attestation/dossier/:id | ✅ ui/accompagne.spec.ts |
| TC-UI-252 | UI | moyenne | ParcoursDetail.tsx (d.statut==='cloture') | ✅ ui/accompagne.spec.ts |
| TC-UI-253 | UI | basse | AttestationModal.tsx (catch err) + GET /ethique/attestation/dossier/:id | ⏳ |
| TC-UI-254 | UI | moyenne | VisioButton.tsx + GET /confort/visio/rdv/:id | ✅ ui/accompagne.spec.ts |
| TC-UI-255 | UI | basse | VisioButton.tsx (useFeature('visio')) | ⏳ |
| TC-UI-256 | UI | moyenne | FalcToggle.tsx (data-falc, localStorage) | ✅ ui/accompagne.spec.ts |
| TC-UI-257 | UI | moyenne | OnboardingManager.tsx + OnboardingTour.tsx (role accompagne) | ✅ ui/accompagne.spec.ts |
| TC-UI-258 | UI | basse | OnboardingManager.tsx (FAB) + OnboardingTour.tsx (navigation) | ✅ ui/accompagne.spec.ts |
| TC-UI-259 | UI | basse | OnboardingManager.tsx + FalcToggle.tsx (useFeature) | ⏳ |
| TC-UI-260 | UI | haute | MonPlanAction.tsx + GET /actions/mine + POST /actions + PATCH /actions/:id + POST /actions/reorder | ✅ ui/accompagne.spec.ts |
| TC-UI-261 | UI | basse | MonPlanAction.tsx (dossierId!=null) | ✅ ui/accompagne.spec.ts |
| TC-UI-262 | UI | moyenne | MonPlanAction.tsx (ActionDetailModal) | ✅ ui/accompagne.spec.ts |
| TC-UI-263 | UI | moyenne | ParcoursDetail.tsx + QuestionnaireDetailModal (data.questionnaire) | ✅ ui/accompagne.spec.ts |
| TC-UI-264 | UI | basse | ParcoursDetail.tsx (section questionnaire) | ⏳ |
| TC-UI-265 | UI | basse | ParcoursDetail.tsx (ErrorBoundary onReset) ; ComptesRendus.tsx | ⏳ |
| TC-UI-266 | Unitaire | haute | adoption.ts falcFallback() (repli déterministe de POST /adoption/falc) | ⏳ |
| TC-UI-267 | API | moyenne | falc + POST /adoption/falc | ⏳ |
| TC-UI-268 | API | moyenne | POST /adoption/falc (garde !texte) | ⏳ |
| TC-UI-269 | API | haute | features.ts requireFeature + POST /adoption/falc | ⏳ |
| TC-UI-270 | API | haute | requireAuth + POST /adoption/falc | ⏳ |
| TC-UI-271 | API | moyenne | POST /relationnel/meteo (validation niveau) | ⏳ |
| TC-UI-272 | API | haute | GET /dossiers/mine/:id et endpoints dossier-scopés (cloisonnement accompagné) | ✅ ui/accompagne.spec.ts |
| TC-UI-300 | UI | haute | GET /admin/users + page Admin.tsx | ✅ ui/admin.spec.ts |
| TC-UI-301 | UI | haute | Protected.tsx (route /admin) + GET /admin/users -> 401 | ✅ ui/admin.spec.ts |
| TC-UI-302 | UI | haute | Protected.tsx (role='admin') + GET /admin/users -> 403 | ✅ ui/admin.spec.ts |
| TC-UI-303 | UI | moyenne | Protected.tsx (role='admin') + GET /admin/users -> 403 | ✅ ui/admin.spec.ts |
| TC-UI-304 | UI | moyenne | GET /admin/users + Admin.tsx tbody | ✅ ui/admin.spec.ts |
| TC-UI-305 | UI | basse | Admin.tsx (className row-inactif) + PATCH /admin/users/:id | ✅ ui/admin.spec.ts |
| TC-UI-306 | UI | haute | PATCH /admin/users/:id {role} + Admin.tsx setRole | ✅ ui/admin.spec.ts |
| TC-UI-307 | UI | haute | PATCH /admin/users/:id {plan_id} + Admin.tsx setPlan | ✅ ui/admin.spec.ts |
| TC-UI-308 | UI | moyenne | PATCH /admin/users/:id {plan_id:null} + features.userFeatures | ✅ ui/admin.spec.ts |
| TC-UI-309 | UI | haute | PATCH /admin/users/:id {actif} + Admin.tsx toggleActif | ✅ ui/admin.spec.ts |
| TC-UI-310 | UI | haute | PATCH /admin/users/:id (garde id===meId) + Admin.tsx | ✅ ui/admin.spec.ts |
| TC-UI-311 | UI | haute | POST /admin/users + Admin.tsx createUser | ✅ ui/admin.spec.ts |
| TC-UI-312 | UI | moyenne | Admin.tsx (input email required)  | ✅ ui/admin.spec.ts |
| TC-UI-313 | UI | haute | POST /admin/users -> 409 + Admin.tsx catch(err) | ✅ ui/admin.spec.ts |
| TC-UI-314 | UI | haute | POST /admin/lien + Admin.tsx createLien | ✅ ui/admin.spec.ts |
| TC-UI-315 | UI | moyenne | POST /admin/lien -> 400 + Admin.tsx createLien | ✅ ui/admin.spec.ts |
| TC-UI-316 | UI | haute | POST /admin/plans + PlansManager create() | ✅ ui/admin.spec.ts |
| TC-UI-317 | UI | haute | PATCH /admin/plans/:id {features} + PlansManager toggle/save | ✅ ui/admin.spec.ts |
| TC-UI-318 | UI | moyenne | PlansManager toggleCat + PATCH /admin/plans/:id | ✅ ui/admin.spec.ts |
| TC-UI-319 | UI | moyenne | PATCH /admin/plans/:id {nom,description} + PlansManager save | ✅ ui/admin.spec.ts |
| TC-UI-320 | UI | moyenne | PATCH /admin/plans/:id -> 400 + PlansManager save catch | ⏳ |
| TC-UI-321 | UI | moyenne | POST /admin/plans/:id/duplication + PlansManager duplicate | ✅ ui/admin.spec.ts |
| TC-UI-322 | UI | moyenne | DELETE /admin/plans/:id + PlansManager remove | ✅ ui/admin.spec.ts |
| TC-UI-323 | UI | haute | DELETE /admin/plans/:id (UPDATE users plan_id=NULL) + PlansManager remove | ✅ ui/admin.spec.ts |
| TC-UI-324 | UI | basse | PlansManager remove (window.confirm) | ✅ ui/admin.spec.ts |
| TC-UI-325 | UI | basse | PlansManager (plans.length===0) + GET /admin/plans | ✅ ui/admin.spec.ts |
| TC-UI-326 | UI | basse | GET /admin/features + PlansManager categories | ✅ ui/admin.spec.ts |
| TC-UI-327 | UI | haute | GET /admin/effacements + RgpdConsole | ✅ ui/admin.spec.ts |
| TC-UI-328 | UI | basse | GET /admin/effacements (vide) + RgpdConsole | ✅ ui/admin.spec.ts |
| TC-UI-329 | UI | haute | POST /admin/effacements/:id + RgpdConsole traiter + ethique.processEffacement | ✅ ui/admin.spec.ts |
| TC-UI-330 | UI | haute | POST /admin/effacements/:id + ethique.deleteUser | ✅ ui/admin.spec.ts |
| TC-UI-331 | UI | basse | RgpdConsole traiter (window.confirm) | ✅ ui/admin.spec.ts |
| TC-UI-332 | UI | moyenne | GET /admin/retention + RgpdConsole + ethique.retentionEligibles | ✅ ui/admin.spec.ts |
| TC-UI-333 | UI | haute | POST /admin/retention/appliquer + RgpdConsole appliquerRetention | ✅ ui/admin.spec.ts |
| TC-UI-334 | UI | basse | RgpdConsole (eligibles.length>0 conditionnel) | ✅ ui/admin.spec.ts |
| TC-UI-335 | API | haute | GET /admin/users | ✅ ui/admin.spec.ts |
| TC-UI-336 | API | haute | requireAuth sur routes /admin/* | ✅ ui/admin.spec.ts |
| TC-UI-337 | API | haute | requireRole('admin') sur routes /admin/* | ✅ ui/admin.spec.ts |
| TC-UI-338 | API | moyenne | PATCH /admin/users/:id (verif plan existe) | ✅ ui/admin.spec.ts |
| TC-UI-339 | API | moyenne | PATCH/DELETE /admin/plans/:id + POST /admin/plans/:id/duplication | ✅ ui/admin.spec.ts |
| TC-UI-340 | API | moyenne | POST /admin/effacements/:id (garde action) | ✅ ui/admin.spec.ts |
| TC-UI-341 | API | basse | POST /admin/effacements/:id + ethique.processEffacement | ✅ ui/admin.spec.ts |
| TC-UI-342 | API | moyenne | POST /admin/rgpd/:userId (garde meId) | ✅ ui/admin.spec.ts |
| TC-UI-343 | API | basse | POST /admin/rgpd/:userId | ✅ ui/admin.spec.ts |
| TC-UI-344 | API | moyenne | POST /admin/plans (validation nom) | ✅ ui/admin.spec.ts |
| TC-UI-345 | API | moyenne | POST /admin/users (validation role) | ✅ ui/admin.spec.ts |
| TC-UI-346 | Unitaire | haute | features.sanitizeKeys | ⏳ |
| TC-UI-347 | Unitaire | haute | features.userFeatures | ⏳ |
| TC-UI-348 | Unitaire | haute | ethique.anonymizeUser | ✅ unit/ethique.test.ts |
| TC-UI-349 | Unitaire | haute | ethique.retentionEligibles | ✅ unit/ethique.test.ts |
| TC-UI-350 | Unitaire | moyenne | ethique.processEffacement | ✅ unit/ethique.test.ts |
| TC-UI-351 | UI | basse | Admin.tsx onChange (load + loadPlans) + DELETE /admin/plans/:id | ✅ ui/admin.spec.ts |
| TC-UI-352 | UI | moyenne | lib/api.ts (throw new Error(msg)) + Admin.tsx/PlansManager/RgpdConsole catch | ✅ ui/admin.spec.ts |
| TC-WIKI-001 | API | haute | GET /api/wiki/pages | ✅ api/wiki.test.ts |
| TC-WIKI-002 | API | haute | GET /api/wiki/pages | ✅ api/wiki.test.ts |
| TC-WIKI-003 | API | haute | GET /api/wiki/pages/:slug | ✅ api/wiki.test.ts |
| TC-WIKI-004 | API | haute | GET /api/wiki/pages | ✅ api/wiki.test.ts |
| TC-WIKI-005 | API | haute | GET /api/wiki/pages/:slug | ✅ api/wiki.test.ts |
| TC-WIKI-006 | API | moyenne | GET /api/wiki/pages/:slug | ✅ api/wiki.test.ts |
| TC-WIKI-007 | API | moyenne | GET /api/wiki/search | ✅ api/wiki.test.ts |
| TC-WIKI-008 | API | haute | POST /api/wiki/pages | ✅ api/wiki.test.ts |
| TC-WIKI-009 | API | moyenne | POST /api/wiki/pages | ✅ api/wiki.test.ts |
| TC-WIKI-010 | API | moyenne | POST /api/wiki/pages | ✅ api/wiki.test.ts |
| TC-WIKI-011 | API | haute | PATCH /api/wiki/pages/:slug ; GET /api/wiki/pages/:slug | ✅ api/wiki.test.ts |
| TC-WIKI-012 | API | haute | DELETE /api/wiki/pages/:slug ; GET /api/wiki/pages/:slug | ✅ api/wiki.test.ts |
| TC-WIKI-013 | API | moyenne | GET /api/wiki/export/:slug.md | ✅ api/wiki.test.ts |
| TC-WIKI-014 | API | moyenne | GET /api/wiki/export/:slug.docx | ✅ api/wiki.test.ts |
| TC-WIKI-015 | API | moyenne | GET /api/wiki/export/:slug.pdf | ✅ api/wiki.test.ts |
| TC-WIKI-016 | API | haute | POST /api/wiki/pages/:slug/share ; GET /api/wiki/public/:token | ✅ api/wiki-advanced.test.ts |
| TC-WIKI-017 | API | haute | GET /api/wiki/public/:token | ✅ api/wiki-advanced.test.ts |
| TC-WIKI-018 | API | haute | POST /api/wiki/pages/:slug/share ; DELETE /api/wiki/pages/:slug/share ; GET /api/wiki/public/:token | ✅ api/wiki-advanced.test.ts |
| TC-WIKI-019 | API | haute | POST /api/wiki/pages/:slug/share | ✅ api/wiki-advanced.test.ts |
| TC-WIKI-020 | API | haute | PATCH /api/wiki/pages/:slug ; GET /api/wiki/pages/:slug/versions | ✅ api/wiki-advanced.test.ts |
| TC-WIKI-021 | API | haute | GET /api/wiki/pages/:slug/versions ; GET /api/wiki/pages/:slug/versions/:version ; POST /api/wiki/pages/:slug/versions/:version/restore | ✅ api/wiki-advanced.test.ts |
| TC-WIKI-022 | API | moyenne | GET /api/wiki/export-all.md ; GET /api/wiki/export-all.docx | ✅ api/wiki-advanced.test.ts |
| TC-WIKI-023 | API | haute | GET /api/wiki/export-all.md | ✅ api/wiki-advanced.test.ts |
| TC-2FA-001 | API | moyenne | GET /api/auth/2fa/status | ✅ api/twofa.test.ts |
| TC-2FA-002 | API | haute | POST /api/auth/2fa/setup ; POST /api/auth/2fa/enable | ✅ api/twofa.test.ts |
| TC-2FA-003 | API | haute | POST /api/auth/login ; GET /api/auth/me | ✅ api/twofa.test.ts |
| TC-2FA-004 | API | haute | POST /api/auth/login ; GET /api/auth/me | ✅ api/twofa.test.ts |
| TC-2FA-005 | API | haute | POST /api/auth/login | ✅ api/twofa.test.ts |
| TC-2FA-006 | API | haute | POST /api/auth/2fa/disable ; POST /api/auth/login ; GET /api/auth/me | ✅ api/twofa.test.ts |
| TC-SEC-001 | API | haute | GET /api/health — middleware helmet/CSP (en-tête Content-Security-Policy) | ✅ api/security.test.ts |
| TC-SEC-002 | API | haute | GET /api/health — middleware helmet (en-têtes X-Content-Type-Options, X-Frame-Options / CSP) | ✅ api/security.test.ts |
| TC-SEC-010 | Unitaire | haute | Module api/src/backups — fonction backupNow(dir) | ✅ unit/security.test.ts |
| TC-SEC-011 | Unitaire | haute | Module api/src/backups — fonction purgeOldBackups(dir, retention) | ✅ unit/security.test.ts |
| TC-CSRF-001 | Unitaire | haute | Middleware csrfProtect (api/src/csrf.ts) — applique aux requetes /api/* | ✅ unit/security.test.ts |
| TC-CSRF-002 | Unitaire | haute | Middleware csrfProtect (api/src/csrf.ts) — methodes mutantes /api/* | ✅ unit/security.test.ts |
| TC-CSRF-003 | Unitaire | haute | Middleware csrfProtect (api/src/csrf.ts) — methodes mutantes /api/* | ✅ unit/security.test.ts |
| TC-CSRF-004 | Unitaire | haute | Middleware csrfProtect (api/src/csrf.ts) — methodes mutantes /api/* | ✅ unit/security.test.ts |
| TC-OBS-001 | API | haute | GET /api/metrics | ✅ api/observability.test.ts |
| TC-OBS-002 | API | haute | GET /api/metrics | ✅ api/observability.test.ts |
| TC-OBS-003 | API | haute | GET /api/metrics | ✅ api/observability.test.ts |
| TC-OBS-010 | Unitaire | moyenne | module api/src/observability — fonction metrics() | ✅ unit/observability.test.ts |
| TC-OBS-011 | Unitaire | moyenne | module api/src/observability — fonction reportError() / journal error_log | ✅ unit/observability.test.ts |
| TC-OBS-004 | API | moyenne | GET /api/metrics/errors | ✅ api/observability.test.ts |
| TC-A11Y-001 | UI | moyenne | UI / (accueil) — accessibilité | ✅ ui/accessibility.spec.ts |
| TC-A11Y-002 | UI | moyenne | UI /connexion — accessibilité | ✅ ui/accessibility.spec.ts |
| TC-A11Y-003 | UI | moyenne | UI /inscription — accessibilité | ✅ ui/accessibility.spec.ts |
| TC-A11Y-004 | UI | moyenne | UI /methode — accessibilité | ✅ ui/accessibility.spec.ts |
| TC-A11Y-005 | UI | moyenne | UI /presentation — accessibilité | ✅ ui/accessibility.spec.ts |
| TC-A11Y-006 | UI | moyenne | UI /accessibilite — accessibilité | ✅ ui/accessibility.spec.ts |
| TC-A11Y-010 | UI | moyenne | UI /espace — accessibilité | ✅ ui/accessibility.spec.ts |
| TC-A11Y-011 | UI | moyenne | UI /admin — accessibilité | ✅ ui/accessibility.spec.ts |
| TC-A11Y-012 | UI | moyenne | UI /admin/wiki — accessibilité | ✅ ui/accessibility.spec.ts |
