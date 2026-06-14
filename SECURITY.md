# Politique de sécurité

## Signaler une vulnérabilité

Merci de **ne pas** ouvrir d'issue publique pour une vulnérabilité de sécurité.

Contactez l'auteur en privé via <https://www.mohamedelafrit.com> en décrivant :

- la nature de la vulnérabilité et son impact potentiel ;
- les étapes de reproduction ;
- la version / le commit concerné.

Une réponse est visée sous **5 jours ouvrés**. Merci de laisser un délai raisonnable de correction avant toute divulgation publique (*responsible disclosure*).

## Périmètre

Sont concernés : le code de l'application (backend `app/api`, frontend `app/web`) et sa configuration de déploiement.

## Bonnes pratiques de déploiement

Pour une instance en production :

- définir un `JWT_SECRET` long et aléatoire ;
- **ne pas** initialiser les comptes de démonstration (réservés au local) et changer tout mot de passe par défaut ;
- conserver les secrets (clés Anthropic, Brevo, VAPID) hors du dépôt (`.env` non versionné) ;
- servir l'application en HTTPS (Traefik + TLS) ;
- appliquer les durcissements prévus (rate-limiting, CSRF, CSP, 2FA administrateur) — voir la feuille de route.

## Remerciements

Les signalements responsables seront crédités (sauf demande contraire).
