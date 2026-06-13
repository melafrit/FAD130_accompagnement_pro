import { defineConfig } from 'vitest/config'

// Tests unitaires (logique pure) + intégration API (HTTP contre la stack :8080).
// Exécution séquentielle (pas de parallélisme de fichiers) : la cible est une base partagée,
// certains scénarios mutent des données — on évite toute course.
export default defineConfig({
  test: {
    include: ['unit/**/*.test.ts', 'api/**/*.test.ts'],
    // 90 s : certains tests API enchaînent PLUSIEURS appels IA réels (ex. régénération de la
    // banque de questions ou de la synthèse) et plusieurs `docker exec` de mise en place.
    testTimeout: 90000,
    hookTimeout: 120000,
    fileParallelism: false,
    pool: 'forks',
    reporters: ['default'],
    // Les tests unitaires importent du code API qui ouvre une base SQLite : on la redirige
    // vers un fichier jetable pour ne jamais toucher de données réelles.
    env: { DB_PATH: './.tmp-unit.sqlite' },
  },
})
