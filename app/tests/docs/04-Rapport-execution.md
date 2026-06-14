# Rapport d'exécution — Boussole

> Identifiant : BOUSSOLE-RAP-001. Historique des exécutions de la batterie de non-régression (le plus récent en premier).

## Exécution du 2026-06-14 14:09:12

**Verdict : ✅ VERT** — 1018/1022 tests au vert.

| Couche | Total | Réussis | Échecs |
|---|---|---|---|
| Unitaire | 98 | 96 | 0 |
| API | 822 | 822 | 0 |
| UI (Playwright) | 102 | 100 | 0 |

## Exécution du 2026-06-14 11:49:47

**Verdict : ✅ VERT** — 1001/1003 tests au vert.

| Couche | Total | Réussis | Échecs |
|---|---|---|---|
| Unitaire | 98 | 96 | 0 |
| API | 815 | 815 | 0 |
| UI (Playwright) | 90 | 90 | 0 |

## Exécution du 2026-06-14 11:10:52

**Verdict : ❌ ROUGE** — 1000/1003 tests au vert.

| Couche | Total | Réussis | Échecs |
|---|---|---|---|
| Unitaire | 98 | 96 | 0 |
| API | 815 | 814 | 1 |
| UI (Playwright) | 90 | 90 | 0 |

**Échecs :**
- quest — POST /api/questionnaire/next TC-QUEST-008 — corps JSON malformé → 400 du middleware express.json (pas de 500 applicatif) (quest.test.ts)

## Exécution du 2026-06-14 10:11:12

**Verdict : ✅ VERT** — 996/998 tests au vert.

| Couche | Total | Réussis | Échecs |
|---|---|---|---|
| Unitaire | 96 | 94 | 0 |
| API | 812 | 812 | 0 |
| UI (Playwright) | 90 | 90 | 0 |

## Exécution du 2026-06-14 09:44:13

**Verdict : ❌ ROUGE** — 991/994 tests au vert.

| Couche | Total | Réussis | Échecs |
|---|---|---|---|
| Unitaire | 92 | 90 | 0 |
| API | 812 | 812 | 0 |
| UI (Playwright) | 90 | 89 | 1 |

## Exécution du 2026-06-14 09:16:56

**Verdict : ✅ VERT** — 986/988 tests au vert.

| Couche | Total | Réussis | Échecs |
|---|---|---|---|
| Unitaire | 92 | 90 | 0 |
| API | 806 | 806 | 0 |
| UI (Playwright) | 90 | 90 | 0 |

## Exécution du 2026-06-14 08:51:07

**Verdict : ❌ ROUGE** — 981/984 tests au vert.

| Couche | Total | Réussis | Échecs |
|---|---|---|---|
| Unitaire | 90 | 88 | 0 |
| API | 804 | 803 | 1 |
| UI (Playwright) | 90 | 90 | 0 |

**Échecs :**
- adopt — POST /api/adoption/falc (FALC) TC-ADOPT-009 — FALC : champ non-string coercé par String() (nombre → 200, tableau → 200/400 sans crash) (adopt.test.ts)

## Exécution du 2026-06-14 08:41:01

**Verdict : ❌ ROUGE** — 953/976 tests au vert.

| Couche | Total | Réussis | Échecs |
|---|---|---|---|
| Unitaire | 90 | 88 | 0 |
| API | 796 | 795 | 1 |
| UI (Playwright) | 90 | 70 | 3 |

**Échecs :**
- adopt — POST /api/adoption/falc (FALC) TC-ADOPT-009 — FALC : champ non-string coercé par String() (nombre → 200, tableau → 200/400 sans crash) (adopt.test.ts)

## Exécution du 2026-06-13 23:18:13

**Verdict : ✅ VERT** — 959/961 tests au vert.

| Couche | Total | Réussis | Échecs |
|---|---|---|---|
| Unitaire | 90 | 88 | 0 |
| API | 781 | 781 | 0 |
| UI (Playwright) | 90 | 90 | 0 |

## Exécution du 2026-06-13 22:51:47

**Verdict : ❌ ROUGE** — 957/961 tests au vert.

| Couche | Total | Réussis | Échecs |
|---|---|---|---|
| Unitaire | 90 | 88 | 0 |
| API | 781 | 781 | 0 |
| UI (Playwright) | 90 | 88 | 2 |
