# Guide de déploiement — Boussole

**Application d'accompagnement « Boussole » · VPS OVH (Ubuntu) · Docker · derrière le reverse proxy Caddy déjà en place · `boussole.elafrit.com`**

> Procédure réelle, validée en production. Le VPS héberge déjà plusieurs applications (gérées par Coolify) ; **Boussole s'intègre sans rien casser** : elle ne prend pas les ports 80/443 et se branche sur le proxy Caddy existant.

---

## 0. Vue d'ensemble

```
Internet ─► DNS OVH (boussole.elafrit.com → IP du VPS) ─► Caddy de façade (formaplanner-caddy-1, ports 80/443, HTTPS Let's Encrypt)
                                                            │  (réseau Docker partagé : formaplanner_formaplanner)
                                                            └─► boussole-web   (Nginx :80, sert le React + proxifie /api)
                                                                   └─ réseau interne ─► boussole-api (Node :3000)
                                                                                         └─ volume ./data (base SQLite)
```

**Particularités du VPS (constatées) :**
- Le serveur est piloté par **Coolify**, mais le reverse proxy qui tient réellement **80/443** est un **Caddy** (container `formaplanner-caddy-1`) configuré par un **Caddyfile statique** : `/opt/FormaPlanner/Caddyfile`.
- Ce Caddy **ne lit pas les labels Docker** : on publie un nouveau site en **ajoutant un bloc** au Caddyfile.
- Boussole tourne dans son **propre `docker compose`** (comme l'app formaplanner) et attache son front au réseau du Caddy (`formaplanner_formaplanner`) pour être joignable.

**Comptes externes nécessaires :** OVH (DNS) · **Anthropic** (clé API Claude) · **Brevo** (emails, expéditeur `contact@elafrit.com`).

**Dépôt :** `https://github.com/melafrit/FAD130_accompagnement_pro` (privé → accès par clé SSH, §5).

---

## 1. DNS chez OVH

Faire pointer `boussole.elafrit.com` vers l'IP du VPS (**`217.182.67.124`**).

1. OVH Manager → univers **« Web Cloud »** → **Noms de domaine** → `elafrit.com` → **Zone DNS**.
2. **Ajouter une entrée** type **A** : sous-domaine `boussole` · cible `217.182.67.124`.
3. (Optionnel) entrée **AAAA** si le VPS a une IPv6.
4. Vérifier la propagation :
   ```bash
   dig boussole.elafrit.com +short      # doit renvoyer 217.182.67.124
   ```

> ⚠️ Le DNS **doit** pointer sur le VPS **avant** l'étape 9 : sans ça, Caddy ne peut pas obtenir le certificat HTTPS.

---

## 2. Clé API Anthropic (Claude)

1. https://console.anthropic.com → **Billing** : ajouter du crédit (sinon l'IA bascule sur le mode de secours déterministe, sans Claude).
2. (Recommandé) **Settings → Workspaces** : créer « Boussole FAD130 » + une **limite de dépense** mensuelle (ex. 20 €).
3. **Settings → API Keys → Create Key** → la copier (affichée une seule fois).

> 🔒 **Ne jamais** coller la clé dans un chat, un email ou Git. Uniquement dans `app/.env` sur le serveur (exclu de Git par `.gitignore`).

---

## 3. Emails (Brevo)

1. **Brevo → SMTP & API → API Keys** : créer une clé → `BREVO_API_KEY`.
2. **Vérifier l'expéditeur** `contact@elafrit.com`.
3. (Recommandé) **Brevo → Domaines** : authentifier `elafrit.com` → ajouter les enregistrements **DKIM/SPF** fournis dans la Zone DNS OVH (évite que les emails d'activation partent en spam).

---

## 4. Accès au VPS et repérage du proxy

```bash
docker --version && docker compose version
# Le proxy qui tient 80/443 (ici : Caddy) :
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}' | grep -Ei 'caddy|traefik|proxy'
# Réseau du Caddy (ici : formaplanner_formaplanner) :
docker inspect formaplanner-caddy-1 --format '{{json .NetworkSettings.Networks}}'
```
À retenir pour la suite : **réseau du Caddy = `formaplanner_formaplanner`** ; **Caddyfile = `/opt/FormaPlanner/Caddyfile`**.

---

## 5. Clé SSH de déploiement (dépôt privé)

Le dépôt est privé et GitHub n'accepte plus le mot de passe en HTTPS. On crée une **deploy key** en lecture seule, dédiée à ce dépôt.

```bash
# 1) Générer une clé dédiée sur le VPS (sans passphrase, pour l'automatisation)
ssh-keygen -t ed25519 -C "vps-boussole" -f ~/.ssh/id_ed25519_boussole -N ""
cat ~/.ssh/id_ed25519_boussole.pub        # copier toute la ligne
```
2. GitHub → dépôt `FAD130_accompagnement_pro` → **Settings → Deploy keys → Add deploy key** → coller la clé, **laisser « Allow write access » décoché** → Add.
3. Vérifier (doit répondre `Hi melafrit/FAD130_accompagnement_pro! …`) :
   ```bash
   ssh -i ~/.ssh/id_ed25519_boussole -o IdentitiesOnly=yes -T git@github.com
   ```

> ℹ️ Si d'autres clés SSH existent sur le VPS (ex. la deploy key de formaplanner), elles peuvent être prioritaires. On force donc la bonne clé au clone (étape 6) et on l'épingle dans le dépôt.

---

## 6. Cloner le dépôt (dans `/opt`, comme formaplanner)

```bash
sudo mkdir -p /opt/boussole && sudo chown "$USER":"$USER" /opt/boussole

# Cloner en forçant la clé boussole
GIT_SSH_COMMAND='ssh -i ~/.ssh/id_ed25519_boussole -o IdentitiesOnly=yes' \
  git clone git@github.com:melafrit/FAD130_accompagnement_pro.git /opt/boussole

# Épingler la clé pour tous les futurs git pull de ce dépôt
cd /opt/boussole
git config core.sshCommand 'ssh -i ~/.ssh/id_ed25519_boussole -o IdentitiesOnly=yes'
cd app
```

---

## 7. Variables d'environnement (`app/.env`)

```bash
cd /opt/boussole/app
cp .env.example .env
# Générer et insérer les 2 secrets :
sed -i "s|^SESSION_SECRET=.*|SESSION_SECRET=$(openssl rand -hex 32)|" .env
sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$(openssl rand -hex 32)|" .env
nano .env        # renseigner ANTHROPIC_API_KEY et BREVO_API_KEY
```
Contenu attendu :
```ini
DOMAIN=boussole.elafrit.com
APP_URL=https://boussole.elafrit.com
EDGE_NETWORK=formaplanner_formaplanner   # réseau du Caddy de façade
NODE_ENV=production

SESSION_SECRET=…                         # généré
JWT_SECRET=…                             # généré

ANTHROPIC_API_KEY=…                      # ta clé Claude
ANTHROPIC_MODEL_REALTIME=claude-sonnet-4-6
ANTHROPIC_MODEL_REPORT=claude-opus-4-8

BREVO_API_KEY=…
MAIL_FROM=contact@elafrit.com

ADMIN_EMAIL=mohamed@elafrit.com
ACCOMPAGNATEUR_EMAIL=elafrit.mohamed@gmail.com

# SEED_PASSWORD :
#  - DÉFINI (ex. BoussoleDemo2026) → charge le JEU DE DÉMO (2 accompagnateurs, 3 accompagnés,
#    6 dossiers), réinitialisé à chaque démarrage. Idéal pour une démonstration / l'oral.
#  - VIDE → production réelle : seuls admin + accompagnateur sont créés (activation par email).
SEED_PASSWORD=BoussoleDemo2026
```

---

## 8. Construire et lancer Boussole

```bash
cd /opt/boussole/app
docker compose up -d --build      # ~2-3 min (compilation native de better-sqlite3)
docker compose ps                 # boussole-api + boussole-web "Up"
docker compose logs --tail 20 boussole-api   # voir la ligne [seed:…]
```
Vérifier que le Caddy peut joindre Boussole (avant de toucher au Caddyfile) :
```bash
docker exec formaplanner-caddy-1 wget -qO- http://boussole-web:80/ | head -c 200   # doit renvoyer du HTML
```

---

## 9. Brancher Boussole au Caddy (bloc de site + reload)

Boussole ne prend pas 80/443 : on **ajoute un bloc** au Caddyfile partagé. **Sauvegarde d'abord.**

```bash
# 1) Sauvegarde
sudo cp /opt/FormaPlanner/Caddyfile /opt/FormaPlanner/Caddyfile.bak

# 2) Ajouter le bloc boussole à la fin (en dehors du bloc formaplanner)
sudo tee -a /opt/FormaPlanner/Caddyfile >/dev/null <<'EOF'

boussole.elafrit.com {
    reverse_proxy boussole-web:80
}
EOF

# 3) Valider PUIS recharger à chaud (zéro coupure pour formaplanner)
docker exec formaplanner-caddy-1 caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
docker exec formaplanner-caddy-1 caddy reload   --config /etc/caddy/Caddyfile --adapter caddyfile
```

> ⚠️ Si `validate` renvoie une **erreur**, **ne pas recharger** et restaurer :
> `sudo cp /opt/FormaPlanner/Caddyfile.bak /opt/FormaPlanner/Caddyfile`
> Tant que `reload` n'est pas lancé, formaplanner n'est pas impacté.

Le Caddy émet automatiquement le **certificat Let's Encrypt** pour `boussole.elafrit.com` à la première requête.

---

## 10. Vérifier

```bash
sleep 12
curl -I https://boussole.elafrit.com            # → HTTP/2 200
docker logs formaplanner-caddy-1 --tail 20      # → "certificate obtained successfully" pour boussole.elafrit.com
```
Puis dans le navigateur : **https://boussole.elafrit.com** (au besoin, vider le cache : Ctrl+Shift+R).

**Comptes de démo** (si `SEED_PASSWORD` est défini) — mot de passe commun **`BoussoleDemo2026`** :

| Rôle | Identifiant |
|---|---|
| Admin | `mohamed@elafrit.com` |
| Accompagnateur | `elafrit.mohamed@gmail.com` (Mohamed) |
| Accompagnateur | `camille.laurent@boussole.demo` (Camille) |
| Accompagné | `afrit_mohamed@yahoo.fr` (Amine) |
| Accompagné | `lea.martin@boussole.demo` (Léa) |
| Accompagné | `karim.benali@boussole.demo` (Karim) |

En production réelle (`SEED_PASSWORD` vide), définir les mots de passe via le **lien d'activation reçu par email** (ou « mot de passe oublié »).

---

## 11. Mises à jour : le script `deploy.sh`

Un script tout-en-un est versionné dans le dépôt (`/opt/boussole/deploy.sh`). Pour redéployer le dernier code :

```bash
/opt/boussole/deploy.sh
```
Il fait tout : `git pull` (et se relance s'il a été mis à jour) → `docker compose up -d --build` → nettoyage des images → contrôle HTTPS + logs. Il **ne touche ni au Caddy ni à formaplanner** (`boussole-web` est recréé avec le même nom, re-résolu automatiquement par Docker DNS). Le bloc Caddyfile reste en place.

> Rappel : avec `SEED_PASSWORD` défini, **chaque redéploiement réinitialise le jeu de démo**.

---

## 12. Exploitation : sauvegardes, sécurité, dépannage

**Sauvegarde de la base SQLite** (à automatiser via cron) :
```bash
mkdir -p ~/backups && cp /opt/boussole/app/data/boussole.sqlite ~/backups/boussole-$(date +%F).sqlite
```

**Rotation de la clé Anthropic** : modifier `app/.env`, puis `docker compose restart boussole-api`.

**Sécurité & RGPD :** HTTPS partout (Caddy + Let's Encrypt) · secrets uniquement dans `.env` (hors Git) · **aucun audio conservé**, données **texte** en conservation bornée · accès SSH restreint · mises à jour système (`sudo apt update && sudo apt upgrade`).

**Dépannage :**
```bash
docker compose ps                                  # état des containers Boussole
docker compose logs -f boussole-api                # logs de l'API
docker logs formaplanner-caddy-1 --tail 40         # logs du proxy (certificats…)
dig boussole.elafrit.com +short                    # le DNS pointe-t-il sur le VPS ?
docker exec formaplanner-caddy-1 wget -qO- http://boussole-web:80/ | head -c 200   # le proxy voit-il Boussole ?
```
- **`ERR_SSL_PROTOCOL_ERROR` / pas de certificat** : vérifier que le bloc est bien dans le Caddyfile et que `reload` a été lancé ; que le DNS pointe sur le VPS ; attendre ~15 s la délivrance du certificat.
- **502 après un redéploiement** : recharger une fois le proxy — `docker exec formaplanner-caddy-1 caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile`.
- **IA en mode secours** : crédit Anthropic épuisé ou `ANTHROPIC_API_KEY` absente.
- **Emails non reçus** : clé Brevo, expéditeur validé, DKIM/SPF.

---

### Récapitulatif des actions manuelles (côté Mohamed)
1. DNS `boussole` → IP du VPS (OVH). *(§1)*
2. Clé API Anthropic (workspace + limite), gardée **secrète**. *(§2)*
3. Clé API Brevo + authentification `elafrit.com` (DKIM/SPF). *(§3)*
4. Deploy key SSH ajoutée au dépôt GitHub. *(§5)*
5. `app/.env` renseigné sur le serveur. *(§7)*
6. Bloc `boussole.elafrit.com` ajouté au Caddyfile + `caddy reload`. *(§9)*
7. Ensuite, mises à jour en une commande : `/opt/boussole/deploy.sh`. *(§11)*
