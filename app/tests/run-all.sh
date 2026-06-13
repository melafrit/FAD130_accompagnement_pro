#!/usr/bin/env bash
# Batterie de non-régression Boussole — exécution complète (bash).
# 1) base propre (reseed)  2) unitaire  3) API  4) UI  5) rapport.
cd "$(dirname "$0")"
BASE="${BOUSSOLE_BASE:-http://localhost:8080}"
CONTAINER="${BOUSSOLE_API_CONTAINER:-boussole-api-local}"
mkdir -p .results

echo "[1/5] Réinitialisation de la base de démo (redémarrage de $CONTAINER)…"
docker restart "$CONTAINER" >/dev/null
ok=""
for i in $(seq 1 40); do
  if curl -sf "$BASE/api/health" | grep -q '"status":"ok"'; then ok=1; break; fi
  sleep 1
done
[ -z "$ok" ] && { echo "API indisponible sur $BASE — abandon."; exit 2; }
echo "API prête."

echo "[2/5] Tests unitaires…"
npx vitest run unit --reporter=json --outputFile=.results/unit.json --reporter=default

echo "[3/5] Tests d'intégration API…"
npx vitest run api --reporter=json --outputFile=.results/api.json --reporter=default

echo "[4/5] Tests UI (Playwright)…"
npx playwright test --reporter=json > .results/ui.json

echo "[5/5] Rapport d'exécution…"
export RUN_STAMP="$(date '+%Y-%m-%d %H:%M:%S')"
node scripts/report.mjs
