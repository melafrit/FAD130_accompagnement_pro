# Rapport d'exécution — Boussole

> Identifiant : BOUSSOLE-RAP-001. Historique des exécutions de la batterie de non-régression (le plus récent en premier).

## Exécution du 2026-06-14 19:15:12

**Verdict : ✅ VERT** — 1025/1030 tests au vert.

| Couche | Total | Réussis | Échecs |
|---|---|---|---|
| Unitaire | 98 | 96 | 0 |
| API | 828 | 828 | 0 |
| UI (Playwright) | 104 | 101 | 0 |

## Exécution du 2026-06-14 18:57:44

**Verdict : ❌ ROUGE** — 1023/1030 tests au vert.

| Couche | Total | Réussis | Échecs |
|---|---|---|---|
| Unitaire | 98 | 96 | 0 |
| API | 828 | 827 | 1 |
| UI (Playwright) | 104 | 100 | 1 |

**Échecs :**
- collab — mutualisation, problématisation & résumé TC-COLLAB-042 — problématisation suggerer : repli heuristique déterministe (si IA indisponible) (collab.test.ts)

## Exécution du 2026-06-14 18:37:59

**Verdict : ✅ VERT** — 1025/1030 tests au vert.

| Couche | Total | Réussis | Échecs |
|---|---|---|---|
| Unitaire | 98 | 96 | 0 |
| API | 828 | 828 | 0 |
| UI (Playwright) | 104 | 101 | 0 |

## Exécution du 2026-06-14 18:23:20

**Verdict : ❌ ROUGE** — 1019/1030 tests au vert.

| Couche | Total | Réussis | Échecs |
|---|---|---|---|
| Unitaire | 98 | 96 | 0 |
| API | 828 | 828 | 0 |
| UI (Playwright) | 104 | 95 | 6 |

## Exécution du 2026-06-14 16:39:14

**Verdict : ✅ VERT** — 1019/1024 tests au vert.

| Couche | Total | Réussis | Échecs |
|---|---|---|---|
| Unitaire | 98 | 96 | 0 |
| API | 824 | 824 | 0 |
| UI (Playwright) | 102 | 99 | 0 |

## Exécution du 2026-06-14 16:23:07

**Verdict : ❌ ROUGE** — 1018/1024 tests au vert.

| Couche | Total | Réussis | Échecs |
|---|---|---|---|
| Unitaire | 98 | 96 | 0 |
| API | 824 | 823 | 1 |
| UI (Playwright) | 102 | 99 | 0 |

**Échecs :**
- WIKI — espace documentaire admin-only TC-WIKI-015 — export PDF via pandoc (200, signature %PDF) (wiki.test.ts)

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
