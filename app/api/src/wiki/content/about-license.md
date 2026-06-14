# À propos, auteur & licence

Cette page établit l'**auteur**, le **statut open source** et les **licences** applicables au projet Boussole et à sa documentation.

## Objectifs de la page

- Identifier sans ambiguïté l'auteur et le titulaire des droits.
- Préciser le modèle open source et les licences (code et contenu).
- Indiquer les conditions de réutilisation et d'usage commercial.

## Auteur

**Mohamed El Afrit** — auteur unique et **titulaire exclusif des droits** du système Boussole (application, architecture, contenu documentaire).

- Site : <https://www.mohamedelafrit.com>
- Cadre : UE **FAD130**, Cnam.

## Projet open source

Boussole est un projet **open source**. Il est publié sous une **double licence** distinguant le code de la documentation :

| Élément | Licence | Réutilisation | Usage commercial par un tiers |
|---|---|---|---|
| **Code source** de l'application | **GNU AGPL-3.0** | Libre, avec publication du code des versions modifiées — y compris servies en ligne (clause réseau) | Autorisé uniquement si le code dérivé reste publié sous AGPL-3.0 |
| **Documentation & contenu** (wiki, exports, dossiers) | **CC BY-NC-SA 4.0** | Libre pour un usage **non commercial**, avec attribution et partage à l'identique | **Interdit** sans accord de l'auteur |

> **Hypothèse — confiance : élevée.** Le choix AGPL-3.0 + CC BY-NC-SA 4.0 vise à protéger les intérêts de l'auteur : attribution garantie, exploitation commerciale par des tiers verrouillée, et impossibilité d'en faire une version fermée (y compris en SaaS).

## Conditions d'attribution

Toute réutilisation autorisée doit créditer : **« Mohamed El Afrit — Boussole (UE FAD130, Cnam) »** avec un lien vers <https://www.mohamedelafrit.com>.

## Usage commercial et double licence

En tant que **titulaire exclusif des droits**, l'auteur n'est pas lié par les restrictions ci-dessus et se réserve le droit d'accorder des **licences commerciales distinctes**. Toute demande d'usage commercial (intégration dans un produit payant, exploitation en service, etc.) doit lui être adressée via <https://www.mohamedelafrit.com>.

## Fichiers de référence

- `LICENSE` — texte intégral de la licence du code (AGPL-3.0).
- `LICENSE-CONTENT.txt` — texte intégral de la licence de la documentation (CC BY-NC-SA 4.0).
- `README.md` — section « Auteur & licence ».

## Mentions

© 2026 **Mohamed El Afrit**. Tous droits réservés dans la limite des licences ci-dessus. « Boussole » désigne l'application décrite dans ce wiki.

## Risques & points d'attention

- **CC BY-NC-SA** n'est pas reconnue comme licence « libre » au sens de l'OSI (clause non commerciale) ; c'est un choix assumé de protection.
- L'**AGPL-3.0** peut freiner l'adoption par des organisations qui refusent le copyleft réseau — compromis volontaire.
- Conserver la cohérence des mentions de licence à chaque nouvel export ou livrable.

## Recommandations

- Ajouter un en-tête de licence court en tête des nouveaux fichiers de code (`SPDX-License-Identifier: AGPL-3.0-or-later`).
- Conserver l'attribution dans tout document dérivé.
- Pour un partenariat commercial, formaliser une licence dédiée plutôt que de modifier la licence publique.

## Pages liées

- [Résumé exécutif](executive-summary)
- [Charte projet](project-charter)
- [Glossaire](glossary)
