<#
  Boussole - lancement en local sur Windows (Docker Desktop)
  Enchaine : git pull -> (verif/lancement Docker) -> build -> run -> ouverture du navigateur.

  Usage :
    - Dans un terminal :  .\lancer-windows.ps1
    - Si l'execution de scripts est bloquee :
        powershell -ExecutionPolicy Bypass -File .\lancer-windows.ps1
#>

Set-Location -Path $PSScriptRoot

function Info($m) { Write-Host $m -ForegroundColor Cyan }
function Ok($m)   { Write-Host $m -ForegroundColor Green }
function Warn($m) { Write-Host $m -ForegroundColor Yellow }
function Err($m)  { Write-Host $m -ForegroundColor Red }
function Test-Docker { docker info 2>$null | Out-Null; return ($LASTEXITCODE -eq 0) }

$Url = 'http://localhost:8080'

# 1) Docker en marche ?
Info '> Verification de Docker...'
if (-not (Test-Docker)) {
  Warn 'Docker ne repond pas - tentative de lancement de Docker Desktop...'
  $dd = Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'
  if (Test-Path $dd) { Start-Process $dd | Out-Null }
  Write-Host -NoNewline '  Attente du moteur Docker '
  for ($i = 0; $i -lt 60; $i++) {
    if (Test-Docker) { break }
    Write-Host -NoNewline '.'; Start-Sleep -Seconds 2
  }
  Write-Host ''
  if (-not (Test-Docker)) {
    Err 'X Docker Desktop n''est pas demarre. Ouvre-le, attends "Engine running", puis relance ce script.'
    exit 1
  }
}
Ok 'OK - Docker operationnel.'

# 2) Dernier code
Info '> Recuperation du dernier code (git pull)...'
git pull --autostash --no-edit
if ($LASTEXITCODE -ne 0) { Warn 'git pull a echoue - on continue avec le code local.' }

# 3) app\.env
if (Test-Path 'app\.env') {
  Ok 'OK - app\.env trouve (cles API prises en compte).'
} else {
  Warn 'app\.env absent -> MODE SECOURS (pas d''IA reelle ni d''emails).'
  Warn '  Cree app\.env avec ANTHROPIC_API_KEY / BREVO_API_KEY / MAIL_FROM pour les activer.'
}

# 4) Nettoyer l'ancien projet "app" (avant le renommage en "boussole"), puis 5) build + run
Push-Location 'app'
docker compose -p app -f docker-compose.local.yml down --remove-orphans 2>$null | Out-Null

Info '> Construction et demarrage des conteneurs (quelques minutes la 1re fois)...'
docker compose -f docker-compose.local.yml up -d --build
if ($LASTEXITCODE -ne 0) {
  Err 'X Echec du build/demarrage. Dernieres lignes de logs :'
  docker compose -f docker-compose.local.yml logs --tail 40
  Pop-Location
  exit 1
}
Pop-Location

# 6) Attente de l'API puis ouverture du navigateur
Info '> Attente du demarrage de l''API...'
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
  try { $null = Invoke-WebRequest -UseBasicParsing -TimeoutSec 3 "$Url/api/health"; $ready = $true; break }
  catch { Start-Sleep -Seconds 2 }
}
if ($ready) { Ok "OK - Boussole est en ligne : $Url" }
else { Warn 'L''API met du temps a repondre. Suis les logs : cd app ; docker compose -f docker-compose.local.yml logs -f' }
Start-Process $Url | Out-Null

Write-Host ''
Ok 'Comptes de demo - mot de passe : BoussoleDemo2026'
Write-Host '  - Accompagnateur (Mohamed) : elafrit.mohamed@gmail.com'
Write-Host '  - Accompagne (Amine)       : afrit_mohamed@yahoo.fr'
Write-Host '  - Admin                    : mohamed@elafrit.com'
Write-Host ''
Write-Host 'Voir les logs : cd app ; docker compose -f docker-compose.local.yml logs -f'
Write-Host 'Arreter       : cd app ; docker compose -f docker-compose.local.yml down'
