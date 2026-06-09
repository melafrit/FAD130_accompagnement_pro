#!/usr/bin/env bash
# =====================================================================
#  Boussole — lancement en local sur macOS
#  Enchaîne : git pull → (vérif Docker) → build → run → ouverture du navigateur
#  Usage :  ./lancer-mac.sh        (ou : bash lancer-mac.sh)
# =====================================================================
set -uo pipefail

# Se placer à la racine du dépôt (dossier de ce script), quel que soit le répertoire d'appel
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

bleu()  { printf "\033[1;34m%s\033[0m\n" "$*"; }
vert()  { printf "\033[1;32m%s\033[0m\n" "$*"; }
jaune() { printf "\033[1;33m%s\033[0m\n" "$*"; }
rouge() { printf "\033[1;31m%s\033[0m\n" "$*"; }

URL="http://localhost:8080"

# ---------------------------------------------------------------------
# 1) Docker Desktop est-il démarré ?
# ---------------------------------------------------------------------
bleu "▶ Vérification de Docker…"
if ! docker info >/dev/null 2>&1; then
  jaune "Docker ne répond pas — tentative de lancement de Docker Desktop…"
  open -a Docker 2>/dev/null || true
  printf "  Attente du moteur Docker "
  for _ in $(seq 1 60); do
    docker info >/dev/null 2>&1 && break
    printf "."; sleep 2
  done
  echo
  if ! docker info >/dev/null 2>&1; then
    rouge "✗ Docker Desktop n'est pas démarré. Ouvre-le manuellement, attends « Engine running », puis relance ce script."
    exit 1
  fi
fi
vert "✓ Docker opérationnel."

# ---------------------------------------------------------------------
# 2) Récupérer le dernier code (réapplique automatiquement tes modifs locales)
# ---------------------------------------------------------------------
bleu "▶ Récupération du dernier code (git pull)…"
git pull --autostash --no-edit || jaune "⚠ git pull a échoué — on continue avec le code local."

# ---------------------------------------------------------------------
# 3) Vérifier app/.env (clés API)
# ---------------------------------------------------------------------
if [ -f app/.env ]; then
  vert "✓ app/.env trouvé (clés API prises en compte)."
else
  jaune "⚠ app/.env absent → MODE SECOURS : IA déterministe et emails affichés dans les logs (pas d'envoi réel)."
  jaune "  Pour activer l'IA réelle et les emails, crée app/.env avec ANTHROPIC_API_KEY / BREVO_API_KEY / MAIL_FROM."
fi

# ---------------------------------------------------------------------
# 4) Nettoyer l'ancien projet « app » (avant le renommage en « boussole »)
#    Sans effet s'il n'existe pas. Ne touche pas aux données (dossier app/data).
# ---------------------------------------------------------------------
cd "$ROOT/app"
docker compose -p app -f docker-compose.local.yml down --remove-orphans >/dev/null 2>&1 || true

# ---------------------------------------------------------------------
# 5) Construire et démarrer
# ---------------------------------------------------------------------
bleu "▶ Construction et démarrage des conteneurs (quelques minutes la 1ʳᵉ fois)…"
if ! docker compose -f docker-compose.local.yml up -d --build; then
  rouge "✗ Échec du build/démarrage. Dernières lignes de logs :"
  docker compose -f docker-compose.local.yml logs --tail 40
  exit 1
fi

# ---------------------------------------------------------------------
# 6) Attendre que l'API réponde, puis ouvrir le navigateur
# ---------------------------------------------------------------------
bleu "▶ Attente du démarrage de l'API…"
ready=""
for _ in $(seq 1 30); do
  if curl -fs "$URL/api/health" >/dev/null 2>&1; then ready="1"; break; fi
  printf "."; sleep 2
done
echo
if [ -n "$ready" ]; then
  vert "✓ Boussole est en ligne : $URL"
else
  jaune "⚠ L'API met du temps à répondre. Suis les logs : (cd app && docker compose -f docker-compose.local.yml logs -f)"
fi
open "$URL" 2>/dev/null || true

# ---------------------------------------------------------------------
# Rappels
# ---------------------------------------------------------------------
echo
vert "Comptes de démo — mot de passe : BoussoleDemo2026"
echo "  • Accompagnateur (Mohamed) : elafrit.mohamed@gmail.com"
echo "  • Accompagné (Amine)       : afrit_mohamed@yahoo.fr"
echo "  • Admin                    : mohamed@elafrit.com"
echo
echo "Voir les logs :  cd app && docker compose -f docker-compose.local.yml logs -f"
echo "Arrêter       :  cd app && docker compose -f docker-compose.local.yml down"
