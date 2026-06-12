#!/usr/bin/env bash
#
# Boussole — mise à jour & redéploiement automatique (VPS OVH).
#
# Récupère le dernier code (branche main) puis reconstruit et redémarre les
# containers Docker. Le reverse proxy Caddy (formaplanner-caddy-1) n'est PAS
# touché : il route déjà boussole.elafrit.com vers le container `boussole-web`,
# recréé avec le même nom → Docker DNS le re-résout tout seul. formaplanner
# n'est jamais impacté.
#
# Usage :  /opt/boussole/deploy.sh
#
set -euo pipefail

REPO_DIR="/opt/boussole"
APP_DIR="$REPO_DIR/app"
DOMAIN="boussole.elafrit.com"

# --- 1) Récupérer le dernier code, PUIS se relancer si ce script a changé -----
#     (la clé SSH est déjà épinglée dans le dépôt via core.sshCommand)
if [ -z "${BOUSSOLE_REEXEC:-}" ]; then
  echo "==> Boussole — déploiement ($(date '+%Y-%m-%d %H:%M:%S'))"
  echo "==> [1/4] Récupération du code (git pull)…"
  BEFORE="$(git -C "$REPO_DIR" rev-parse --short HEAD)"
  git -C "$REPO_DIR" pull --ff-only origin main
  AFTER="$(git -C "$REPO_DIR" rev-parse --short HEAD)"
  if [ "$BEFORE" = "$AFTER" ]; then
    echo "    Déjà à jour ($AFTER) — reconstruction quand même."
  else
    echo "    Mis à jour : $BEFORE -> $AFTER"
  fi
  export BOUSSOLE_REEXEC=1
  exec bash "$REPO_DIR/deploy.sh" "$@"
fi

cd "$APP_DIR"

# --- 2) Garde-fou : le .env doit exister (clés, secrets, EDGE_NETWORK) --------
if [ ! -f "$APP_DIR/.env" ]; then
  echo "!! Fichier .env introuvable dans $APP_DIR — déploiement annulé." >&2
  echo "   Crée-le d'abord : cp .env.example .env  (puis remplis les clés)." >&2
  exit 1
fi

# --- 3) Reconstruire et relancer les containers ------------------------------
echo "==> [2/4] Construction des images et redémarrage des containers…"
docker compose up -d --build
docker image prune -f >/dev/null 2>&1 || true   # nettoie les images orphelines

# --- 4) Vérifications --------------------------------------------------------
echo "==> [3/4] État des containers :"
docker compose ps

echo "==> [4/4] Test HTTPS public…"
sleep 4
CODE="$(curl -s -o /dev/null -w '%{http_code}' "https://$DOMAIN" || echo 000)"
if [ "$CODE" = "200" ]; then
  echo "    ✅ https://$DOMAIN répond (HTTP $CODE)."
else
  echo "    ⚠️  https://$DOMAIN a renvoyé HTTP $CODE."
  echo "       Si c'est un 502, recharge une fois le proxy (sans risque pour formaplanner) :"
  echo "       docker exec formaplanner-caddy-1 caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile"
fi

echo
echo "Logs récents de l'API (dont la ligne [seed:…]) :"
docker compose logs --tail 8 boussole-api || true

echo
echo "==> Déploiement terminé. 🚀  https://$DOMAIN"
