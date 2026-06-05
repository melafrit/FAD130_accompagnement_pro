# Guide de déploiement — Boussole

**Application d'accompagnement « Boussole » · Déploiement sur VPS OVH (Ubuntu) · docker-compose + Traefik · `boussole.elafrit.com`**

> Document vivant : mis à jour au fur et à mesure du développement. Les commandes marquées *(provisoire)* seront finalisées quand le code de l'app sera en place.

---

## 0. Vue d'ensemble

```
Internet ──► [DNS OVH: boussole.elafrit.com] ──► [VPS OVH Ubuntu]
                                                   └─ Docker
                                                       ├─ Traefik  (reverse proxy, HTTPS Let's Encrypt, ports 80/443)
                                                       ├─ boussole-api   (Node.js / TypeScript)
                                                       └─ boussole-web   (React, servi en statique)
                                                   SQLite (fichier sur volume), sauvegardes locales
```

**Comptes externes nécessaires :** OVH (DNS + VPS) · **Anthropic** (clé API Claude) · **Brevo** (emails, expéditeur `contact@elafrit.com`).

---

## 1. Étape 1 — Configurer le DNS chez OVH

**But :** faire pointer `boussole.elafrit.com` vers l'IP de ton VPS.

### 1.1 Récupérer l'IP publique du VPS
Sur le VPS (SSH), exécute :
```bash
curl -4 ifconfig.me ; echo        # IPv4 (ex. 51.210.x.x)
curl -6 ifconfig.me ; echo        # IPv6 (si le VPS en a une, ex. 2001:41d0:...)
```
*(Ou : OVH Manager → univers « Bare Metal Cloud / VPS » → ton VPS → l'IP est affichée.)*

> ✅ **IP du VPS : `217.182.67.124`** → l'enregistrement à créer est : sous-domaine `boussole` → type **A** → cible **`217.182.67.124`**.

### 1.2 Créer l'enregistrement DNS dans le Manager OVH
1. Va sur **https://www.ovh.com/manager/** et connecte-toi.
2. En haut à gauche, choisis l'univers **« Web Cloud »**.
3. Menu de gauche → **« Noms de domaine »** → clique sur **`elafrit.com`**.
4. Onglet **« Zone DNS »**.
5. Clique **« Ajouter une entrée »**.
6. Choisis le type **`A`** (IPv4) :
   - **Sous-domaine** : `boussole`
   - **Cible** : l'**IPv4** du VPS (étape 1.1)
   - **TTL** : laisse par défaut
   - Valide.
7. *(Optionnel mais recommandé si le VPS a une IPv6)* Ajoute aussi une entrée **`AAAA`** :
   - **Sous-domaine** : `boussole` · **Cible** : l'**IPv6** du VPS.
8. Confirme. La propagation prend de quelques minutes à ~quelques heures.

### 1.3 Vérifier la propagation
Depuis ton PC ou le VPS :
```bash
dig boussole.elafrit.com +short      # doit renvoyer l'IPv4 du VPS
# (ou) nslookup boussole.elafrit.com
```

---

## 2. Étape 2 — Préparer et vérifier le VPS

### 2.1 Vérifier Docker
```bash
docker --version
docker compose version     # (plugin v2)  — ou: docker-compose --version
```

### 2.2 Identifier le reverse proxy existant — ⚠️ d'autres apps tournent déjà (formaplanne…)
**Important :** d'autres applications tournent déjà sur ce VPS et **doivent continuer à fonctionner**. Boussole ne doit donc **pas** accaparer les ports 80/443 : elle s'**intègre au reverse proxy déjà en place**.
```bash
# Qu'est-ce qui écoute sur 80/443 (quel proxy) ?
sudo ss -tlnp | grep -E ':80 |:443 '
# Containers en cours (repérer traefik / nginx-proxy / caddy + formaplanne)
docker ps
# Réseaux Docker (repérer le réseau partagé du proxy)
docker network ls
```
> ⏳ **À FAIRE AU MOMENT DU DÉPLOIEMENT** : Mohamed exécute ces 3 commandes et m'en donne le résultat. On en déduit le **type de reverse proxy** (Traefik ? nginx-proxy ? autre ?) et le **nom du réseau Docker partagé**, puis on règle `PROXY_NETWORK` / `CERT_RESOLVER` et les labels du `app/docker-compose.yml` en conséquence. **On ne touche pas** aux applications existantes (formaplanne, etc.).

### 2.3 Ouvrir les ports dans le pare-feu (si `ufw` est actif)
```bash
sudo ufw status
# Si "active" :
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow OpenSSH      # ne te coupe pas l'accès SSH !
```
> Pense aussi à vérifier le **pare-feu réseau OVH** (le « Firewall Network » dans le Manager OVH, s'il est activé sur ton VPS) pour autoriser 80/443.

---

## 3. Étape 3 — Créer et sécuriser la clé API Anthropic (Claude)

### 3.1 Créer la clé
1. Va sur **https://console.anthropic.com/** et connecte-toi.
2. **Billing** (Facturation) : ajoute un moyen de paiement ou achète des crédits prépayés — l'API ne fonctionne pas sans crédit.
3. *(Recommandé)* **Settings → Workspaces → Create Workspace** : crée un espace dédié **« Boussole FAD130 »** et fixe-lui une **limite de dépense mensuelle** (ex. 20 €) pour plafonner les coûts.
4. **Settings → API Keys → Create Key** :
   - Rattache la clé au workspace « Boussole FAD130 ».
   - Nomme-la **`boussole-fad130`**.
   - **Copie la clé maintenant** (elle ne sera affichée qu'une seule fois).

### 3.2 « Valable 60 jours » — comment faire
Les clés Anthropic **n'ont pas de date d'expiration automatique**. Pour la borner à ~60 jours :
- la **limite de dépense** du workspace plafonne déjà le risque financier ;
- **planifie un rappel** pour la **renouveler (rotation) sous 60 jours**. *(Je peux te programmer ce rappel si tu veux.)*

### 3.3 Sécuriser la clé — ⚠️ IMPORTANT
- **Ne colle JAMAIS la clé dans ce chat, un email, ou le dépôt Git.**
- Mets-la uniquement dans le fichier **`app/.env`** sur le serveur (ce fichier est exclu de Git par le `.gitignore`).
- Restreins l'accès SSH au VPS.

### 3.4 Renouveler / révoquer (rotation)
**Settings → API Keys** → supprime l'ancienne clé, crée-en une nouvelle → mets à jour `app/.env` sur le serveur → redémarre : `docker compose restart`.

---

## 4. Étape 4 — Emails (Brevo)

Tu as déjà un compte Brevo (expéditeur **`contact@elafrit.com`**).
1. **Brevo → SMTP & API → API Keys** : crée une clé API → `BREVO_API_KEY` (à mettre dans `.env`).
2. **Vérifie l'expéditeur** `contact@elafrit.com` (Brevo → Expéditeurs/Senders).
3. **Délivrabilité (recommandé)** : Brevo → *Domaines* → authentifie `elafrit.com` → Brevo te fournit des enregistrements **DKIM/SPF** (TXT/CNAME) à **ajouter dans la Zone DNS OVH** (même écran qu'à l'étape 1). Cela évite que les emails de validation tombent en spam.

---

## 5. Étape 5 — Variables d'environnement (`app/.env`)

Sur le VPS, dans le dossier de l'app, crée le fichier `.env` *(provisoire — la liste finale sera figée au développement)* :
```ini
# Domaine & TLS
DOMAIN=boussole.elafrit.com
LETSENCRYPT_EMAIL=contact@elafrit.com
NODE_ENV=production

# Secrets (génère-les : openssl rand -hex 32)
SESSION_SECRET=__a_generer__
JWT_SECRET=__a_generer__

# Anthropic (clé sur le serveur uniquement)
ANTHROPIC_API_KEY=__ta_cle__
ANTHROPIC_MODEL_REALTIME=claude-sonnet-4-6
ANTHROPIC_MODEL_REPORT=claude-opus-4-8

# Brevo (emails)
BREVO_API_KEY=__ta_cle_brevo__
MAIL_FROM=contact@elafrit.com

# Comptes initiaux (seed au premier démarrage)
ADMIN_EMAIL=mohamed@elafrit.com
ACCOMPAGNATEUR_EMAIL=elafrit.mohamed@gmail.com
```
Générer un secret :
```bash
openssl rand -hex 32
```

---

## 6. Étape 6 — Récupérer le code et lancer *(provisoire)*

```bash
# 1. Récupérer le dépôt
git clone https://github.com/melafrit/FAD130_accompagnement_pro.git
cd FAD130_accompagnement_pro/app

# 2. Créer le .env (étape 5) puis construire et lancer
docker compose build
docker compose up -d

# 3. Suivre les logs
docker compose logs -f
```
> Le `docker-compose.yml` inclura **Traefik** (HTTPS automatique via Let's Encrypt sur `boussole.elafrit.com`), l'**API Node** et le **front React**. Le contenu exact sera livré avec le squelette de l'app.

---

## 7. Étape 7 — Comptes initiaux

Au premier démarrage, l'app crée (seed) :
- **Admin** : `mohamed@elafrit.com`
- **Accompagnateur** : `elafrit.mohamed@gmail.com`

Tu définis leurs mots de passe via le **lien d'activation reçu par email** (ou « mot de passe oublié »).

---

## 8. Exploitation : sauvegardes, mises à jour, sécurité

### 8.1 Sauvegarde de la base SQLite *(provisoire)*
```bash
# Copie horodatée de la base (à automatiser via cron)
cp app/data/boussole.sqlite "backups/boussole-$(date +%F).sqlite"
```

### 8.2 Mettre à jour l'application
```bash
cd FAD130_accompagnement_pro
git pull
cd app
docker compose build
docker compose up -d
```

### 8.3 Rotation de la clé API (sous 60 jours)
Voir §3.4. Mets à jour `app/.env`, puis `docker compose restart`.

### 8.4 Sécurité & RGPD (rappels)
- HTTPS partout (Traefik + Let's Encrypt) · secrets uniquement dans `.env` (hors Git).
- **Aucun audio conservé** ; données **texte** en conservation **bornée**.
- Sauvegardes régulières de la base ; accès SSH restreint ; mises à jour système (`sudo apt update && sudo apt upgrade`).

---

## 9. Dépannage
```bash
docker compose ps                 # état des containers
docker compose logs -f traefik    # logs du reverse proxy (certificats…)
docker compose logs -f boussole-api
dig boussole.elafrit.com +short   # le DNS pointe-t-il bien sur le VPS ?
sudo ss -tlnp | grep -E ':80 |:443 '
```
- **Certificat HTTPS non émis** : vérifier que le DNS pointe bien sur le VPS (§1.3), que les ports 80/443 sont ouverts (§2.3), et l'email Let's Encrypt dans `.env`.
- **Emails non reçus** : vérifier la clé Brevo, l'expéditeur validé, et DKIM/SPF (§4).

---

### Récapitulatif des actions manuelles (côté Mohamed)
1. Créer l'enregistrement DNS `boussole` → IP du VPS (OVH). *(§1)*
2. Vérifier ports 80/443 libres + pare-feu (VPS + OVH). *(§2)*
3. Créer la clé API Anthropic (workspace + limite), la garder **secrète**. *(§3)*
4. Créer la clé API Brevo + authentifier `elafrit.com` (DKIM/SPF). *(§4)*
5. Renseigner `app/.env` sur le serveur. *(§5)*
