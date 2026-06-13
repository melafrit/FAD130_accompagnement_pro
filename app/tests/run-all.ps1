# Batterie de non-régression Boussole — exécution complète (Windows / PowerShell).
# 1) base propre (reseed)  2) unitaire  3) API  4) UI  5) rapport.
$ErrorActionPreference = 'Continue'
Set-Location -Path $PSScriptRoot

$base = $env:BOUSSOLE_BASE; if (-not $base) { $base = 'http://localhost:8080' }
$container = $env:BOUSSOLE_API_CONTAINER; if (-not $container) { $container = 'boussole-api-local' }
New-Item -ItemType Directory -Force -Path .results | Out-Null

Write-Host "[1/5] Réinitialisation de la base de démo (redémarrage de $container)…" -ForegroundColor Cyan
docker restart $container | Out-Null
# Attente de la santé de l'API
$ok = $false
for ($i = 0; $i -lt 40; $i++) {
  try { $h = Invoke-RestMethod -Uri "$base/api/health" -TimeoutSec 3; if ($h.status -eq 'ok') { $ok = $true; break } } catch {}
  Start-Sleep -Seconds 1
}
if (-not $ok) { Write-Host "API indisponible sur $base — abandon." -ForegroundColor Red; exit 2 }
Write-Host "API prête." -ForegroundColor Green

Write-Host "[2/5] Tests unitaires…" -ForegroundColor Cyan
npx vitest run unit --reporter=json --outputFile=.results/unit.json --reporter=default

Write-Host "[3/5] Tests d'intégration API…" -ForegroundColor Cyan
npx vitest run api --reporter=json --outputFile=.results/api.json --reporter=default

Write-Host "[4/5] Tests UI (Playwright)…" -ForegroundColor Cyan
npx playwright test --reporter=json | Out-File -FilePath .results/ui.json -Encoding utf8

Write-Host "[5/5] Rapport d'exécution…" -ForegroundColor Cyan
$env:RUN_STAMP = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
node scripts/report.mjs
exit $LASTEXITCODE
