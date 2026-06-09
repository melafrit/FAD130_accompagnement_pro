#!/usr/bin/env bash
# =====================================================================
#  Boussole - lancement sur Linux (ex. VPS Ubuntu) - MODE TEST (port 8080)
#  Enchaine : git pull -> (verif/demarrage Docker) -> build -> run.
#  Serveur sans interface : n'ouvre pas de navigateur, affiche l'URL d'acces.
#
#  Usage :  ./lancer-linux.sh        (ou : bash lancer-linux.sh)
#
#  /!\ Ceci lance le MODE TEST (port 8080), comme en local.
#      Pour la PRODUCTION (Traefik + HTTPS + boussole.elafrit.com, en coexistence
#      avec tes autres apps), voir livrables/Guide_deploiement_Boussole.md.
# =====================================================================
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

bleu()  { printf "\033[1;34m%s\033[0m\n" "$*"; }
vert()  { printf "\033[1;32m%s\033[0m\n" "$*"; }
jaune() { printf "\033[1;33m%s\033[0m\n" "$*"; }
rouge() { printf "\033[1;31m%s\033[0m\n" "$*"; }

# ---------------------------------------------------------------------
# 1) Determiner la commande docker (avec sudo si besoin) et demarrer le demon
# ---------------------------------------------------------------------
DOCKER="docker"
if ! docker info >/dev/null 2>&1; then
  if sudo -n docker info >/dev/null 2>&1; then
    DOCKER="sudo docker"
  else
    jaune "Docker ne repond pas - tentative de demarrage du demon (systemctl)..."
    sudo systemctl start docker 2>/dev/null || true
    if docker info >/dev/null 2>&1; then
      DOCKER="docker"
    elif sudo docker info >/dev/null 2>&1; then
      DOCKER="sudo docker"
    else
      rouge "X Docker indisponible. Installe Docker, demarre-le (sudo systemctl start docker),"
      rouge "  ou ajoute ton utilisateur au groupe docker (sudo usermod -aG docker \$USER puis reconnecte-toi)."
      exit 1
    fi
  fi
fi
vert "OK - Docker operationnel ($DOCKER)."

# ---------------------------------------------------------------------
# 2) Dernier code
# ---------------------------------------------------------------------
bleu "> Recuperation du dernier code (git pull)..."
git pull --autostash --no-edit || jaune "! git pull a echoue - on continue avec le code local."

# ---------------------------------------------------------------------
# 3) app/.env
# ---------------------------------------------------------------------
if [ -f app/.env ]; then
  vert "OK - app/.env trouve (cles API prises en compte)."
else
  jaune "! app/.env absent -> MODE SECOURS (pas d'IA reelle ni d'emails)."
  jaune "  Cree app/.env avec ANTHROPIC_API_KEY / BREVO_API_KEY / MAIL_FROM pour les activer."
fi

# ---------------------------------------------------------------------
# 4) Nettoyer l'ancien projet "app" (sans toucher aux donnees : app/data)
# ---------------------------------------------------------------------
cd "$ROOT/app"
$DOCKER compose -p app -f docker-compose.local.yml down --remove-orphans >/dev/null 2>&1 || true

# ---------------------------------------------------------------------
# 5) Build + run
# ---------------------------------------------------------------------
bleu "> Construction et demarrage des conteneurs (quelques minutes la 1re fois)..."
if ! $DOCKER compose -f docker-compose.local.yml up -d --build; then
  rouge "X Echec du build/demarrage. Dernieres lignes de logs :"
  $DOCKER compose -f docker-compose.local.yml logs --tail 40
  exit 1
fi

# ---------------------------------------------------------------------
# 6) Attente de l'API + URL d'acces
# ---------------------------------------------------------------------
bleu "> Attente du demarrage de l'API..."
ready=""
for _ in $(seq 1 30); do
  if curl -fs "http://localhost:8080/api/health" >/dev/null 2>&1; then ready="1"; break; fi
  printf "."; sleep 2
done
echo
IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
[ -z "$IP" ] && IP="<IP-du-serveur>"
if [ -n "$ready" ]; then
  vert "OK - Boussole est en ligne."
else
  jaune "! L'API met du temps a repondre. Logs : (cd app && $DOCKER compose -f docker-compose.local.yml logs -f)"
fi
echo "   - Sur le serveur :    http://localhost:8080"
echo "   - Depuis l'exterieur : http://$IP:8080   (ouvre le port : sudo ufw allow 8080)"

echo
vert "Comptes de demo - mot de passe : BoussoleDemo2026"
echo "  - Accompagnateur (Mohamed) : elafrit.mohamed@gmail.com"
echo "  - Accompagne (Amine)       : afrit_mohamed@yahoo.fr"
echo "  - Admin                    : mohamed@elafrit.com"
echo
echo "Arreter :  cd app && $DOCKER compose -f docker-compose.local.yml down"
echo
jaune "i  MODE TEST (port 8080). Pour la PRODUCTION (Traefik + HTTPS + boussole.elafrit.com en"
jaune "   coexistence avec tes autres apps), voir livrables/Guide_deploiement_Boussole.md :"
jaune "   on aura besoin du port-check (ss -tulpn ; docker network ls) pour finaliser."
