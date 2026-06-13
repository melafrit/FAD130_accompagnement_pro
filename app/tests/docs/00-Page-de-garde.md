---
title: "Batterie de tests de non-régression — Application « Boussole »"
subtitle: "Documentation de test conforme ISTQB / IEEE 829"
author: "Mohamed El Afrit"
date: "Cnam — UE FAD130 · 13 juin 2026"
lang: fr
---

# Page de garde

| Rubrique | Valeur |
|---|---|
| **Projet** | Boussole — plateforme d'accompagnement à la rédaction de mémoires |
| **Cadre** | Cnam, UE **FAD130** |
| **Document** | Batterie de tests exhaustifs & porte de non-régression |
| **Référence** | BOUSSOLE-QA-2026 |
| **Auteur** | Mohamed El Afrit |
| **Date** | 13 juin 2026 |
| **Référentiels** | ISTQB (terminologie & techniques de conception), IEEE 829 (structure documentaire) |
| **Périmètre** | Couverture exhaustive : unitaire (repli déterministe), intégration API (contrat HTTP, contrôle d'accès, validation), bout-en-bout UI (Playwright, 3 rôles) |

## À propos de ce document

Ce dossier réunit la documentation de test complète de l'application Boussole. Il est conçu comme une **porte de non-régression** : l'ensemble des cas est rejoué par une commande unique (`run-all`) qui réinitialise une base de démonstration propre, exécute les trois couches de tests, puis produit le rapport d'exécution. Toute évolution fonctionnelle est validée par ce passage avant livraison.

Il se compose de quatre parties :

1. **Plan de test** — objectifs, périmètre, approche, environnement, critères d'entrée/sortie, risques (structure IEEE 829).
2. **Catalogue des cas de test** — l'intégralité des cas conçus, chacun avec identifiant, niveau, type, priorité, technique de conception, préconditions, données, étapes, résultat attendu, traçabilité et état d'automatisation.
3. **Matrice de traçabilité** — couverture des exigences/fonctionnalités par les cas de test et taux d'automatisation.
4. **Rapport d'exécution** — résultats de la dernière exécution complète (verdict, totaux par couche, éventuelles anomalies), horodaté.

\newpage
