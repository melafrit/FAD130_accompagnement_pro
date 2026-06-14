#!/bin/sh
set -e
# Le volume de données (base SQLite + sauvegardes) est monté depuis l'hôte : on s'assure qu'il est
# accessible en écriture au compte non privilégié `node` (no-op si déjà bon, ex. Docker Desktop).
mkdir -p /app/data
chown -R node:node /app/data 2>/dev/null || true
# Lance le processus applicatif en tant qu'utilisateur non-root.
exec gosu node "$@"
