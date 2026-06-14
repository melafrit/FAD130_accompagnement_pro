# Contribuer à Boussole

Merci de votre intérêt ! Ce projet est développé dans un cadre académique (UE FAD130, Cnam) et reste ouvert aux contributions.

## Avant de commencer

- **Licence** : le code est sous **AGPL-3.0**, la documentation sous **CC BY-NC-SA 4.0**. En contribuant, vous acceptez que votre contribution soit distribuée sous ces licences. L'auteur reste titulaire des droits et peut proposer des licences commerciales distinctes (double licence).
- **Code de conduite** : respect, bienveillance et esprit constructif.

## Signaler un bug / proposer une amélioration

Ouvrez une *issue* en décrivant : le contexte, les étapes de reproduction, le comportement attendu vs observé, et l'environnement.

Pour une **vulnérabilité de sécurité**, ne créez pas d'issue publique : voir [`SECURITY.md`](SECURITY.md).

## Proposer une modification (Pull Request)

1. *Forkez* le dépôt et créez une branche (`git checkout -b feat/ma-fonctionnalite`).
2. Installez et lancez en local (voir le [README](README.md#développement)).
3. Respectez le style existant (TypeScript, conventions françaises pour la donnée, noms explicites).
4. **Ajoutez/mettez à jour les tests** et faites passer la porte de non-régression :
   ```bash
   cd app/tests && bash run-all.sh   # doit être ✅ VERT
   ```
5. Rédigez un message de commit clair (en français), une PR décrivant le quoi et le pourquoi.

## Structure du dépôt

```
app/api    Backend Express + SQLite (routeurs par domaine)
app/web    Frontend React + Vite
app/tests  Batterie de tests (Vitest + Playwright) + documentation ISTQB
```

## Qualité

Toute évolution doit conserver la batterie de tests au vert. Les contributions touchant la sécurité, les données personnelles (RGPD) ou l'IA sont particulièrement examinées.

Merci 🙏
