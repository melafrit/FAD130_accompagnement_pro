#!/usr/bin/env node
// Génère seedData.ts à partir des fichiers content/<slug>.md + le manifeste ci-dessous.
// Usage : node app/api/src/wiki/build-seed.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const CONTENT = join(HERE, 'content')

// Manifeste : métadonnées de chaque page (le contenu vient du .md correspondant).
const MANIFEST = [
  { slug: 'executive-summary', categorie: 'Cadrage & stratégie', ordre: 1, statut: 'redige', titre: 'Résumé exécutif', resume: 'Dossier exécutif (vision, valeur, périmètre, état) pour comité de direction et investisseurs.' },
  { slug: 'project-charter', categorie: 'Cadrage & stratégie', ordre: 2, statut: 'redige', titre: 'Charte projet', resume: 'Cadrage : objectifs SMART, périmètre, jalons, gouvernance, contraintes et risques majeurs.' },
  { slug: 'business-case', categorie: 'Cadrage & stratégie', ordre: 3, statut: 'redige', titre: 'Business case', resume: 'Analyse de valeur, options, estimation économique et ROI (hypothèses) — orientée décision.' },
  { slug: 'opportunity-study', categorie: 'Cadrage & stratégie', ordre: 4, statut: 'redige', titre: 'Étude d’opportunité', resume: 'Opportunités, population cible, SWOT et PESTEL du projet d’accompagnement.' },
  { slug: 'feasibility-study', categorie: 'Cadrage & stratégie', ordre: 5, statut: 'redige', titre: 'Étude de faisabilité', resume: 'Faisabilité par axe (technique, économique, juridique, sécurité…) et verdict Go / No Go.' },
  { slug: 'requirements', categorie: 'Besoins & spécifications', ordre: 6, statut: 'redige', titre: 'Cahier des charges détaillé', resume: 'Besoins métier, exigences fonctionnelles et non fonctionnelles, user stories.' },
  { slug: 'functional-specifications', categorie: 'Besoins & spécifications', ordre: 7, statut: 'redige', titre: 'Spécifications fonctionnelles', resume: 'Cartographie fonctionnelle, cas d’utilisation et diagrammes de séquence.' },
  { slug: 'ux-ui', categorie: 'Besoins & spécifications', ordre: 8, statut: 'redige', titre: 'Dossier UX/UI', resume: 'Principes UX, design system, personas, user flows, accessibilité et navigation.' },
  { slug: 'traceability-matrix', categorie: 'Besoins & spécifications', ordre: 9, statut: 'redige', titre: 'Matrice de traçabilité', resume: 'Besoin → exigence → fonctionnalité → code → tests → statut.' },
  { slug: 'technical-architecture', categorie: 'Architecture', ordre: 10, statut: 'redige', titre: 'Architecture technique', resume: 'Vue d’ensemble, diagrammes C4, architecture applicative et de déploiement.' },
  { slug: 'data-architecture', categorie: 'Architecture', ordre: 11, statut: 'redige', titre: 'Architecture de données', resume: 'Modèle de données (33 tables), diagramme entité-relation et dictionnaire de données.' },
  { slug: 'api-documentation', categorie: 'Architecture', ordre: 12, statut: 'redige', titre: 'Documentation API', resume: 'Contrat REST et catalogue des 145 endpoints (auth, rôles, paramètres, réponses).' },
  { slug: 'security', categorie: 'Architecture', ordre: 13, statut: 'redige', titre: 'Sécurité', resume: 'Modèle de menace, contrôles existants/manquants, matrice OWASP et remédiations.' },
  { slug: 'testing-strategy', categorie: 'Qualité & exploitation', ordre: 14, statut: 'redige', titre: 'Stratégie de tests', resume: 'Niveaux de test, automatisation et porte de non-régression (959/961 verts).' },
  { slug: 'operations', categorie: 'Qualité & exploitation', ordre: 15, statut: 'redige', titre: 'Dossier d’exploitation', resume: 'Runbook : installation, configuration, supervision, sauvegardes, incidents.' },
  { slug: 'deployment', categorie: 'Qualité & exploitation', ordre: 16, statut: 'redige', titre: 'Déploiement', resume: 'Topologie Docker + Traefik, build, montée de version et rollback.' },
  { slug: 'roadmap', categorie: 'Pilotage produit', ordre: 17, statut: 'redige', titre: 'Roadmap produit', resume: 'Initiatives priorisées MoSCoW sur les horizons 3 à 36 mois.' },
  { slug: 'risk-register', categorie: 'Pilotage produit', ordre: 18, statut: 'redige', titre: 'Registre des risques', resume: 'Risques projet cotés (impact, probabilité, criticité) et mitigations.' },
  { slug: 'technical-debt', categorie: 'Pilotage produit', ordre: 19, statut: 'redige', titre: 'Dette technique', resume: 'Dette identifiée par domaine, impact, priorité, recommandation et effort.' },
  { slug: 'adr', categorie: 'Pilotage produit', ordre: 20, statut: 'redige', titre: 'Décisions d’architecture (ADR)', resume: 'Registre des décisions d’architecture structurantes du projet.' },
  { slug: 'admin-guide', categorie: 'Guides & référence', ordre: 21, statut: 'redige', titre: 'Guide administrateur', resume: 'Utilisateurs, rôles, plans, console RGPD et exploitation du wiki.' },
  { slug: 'user-guide', categorie: 'Guides & référence', ordre: 22, statut: 'redige', titre: 'Guide utilisateur', resume: 'Prise en main et parcours pas à pas (accompagnateur et accompagné).' },
  { slug: 'glossary', categorie: 'Guides & référence', ordre: 23, statut: 'redige', titre: 'Glossaire', resume: 'Définitions métier, produit, techniques, sécurité et projet.' },
]

const pages = []
let missing = 0
for (const m of MANIFEST) {
  const file = join(CONTENT, `${m.slug}.md`)
  let contenu_md = ''
  if (existsSync(file)) {
    contenu_md = readFileSync(file, 'utf8')
  } else {
    missing++
    contenu_md = `# ${m.titre}\n\n> **Statut : à enrichir.** Cette page est créée et éditable, mais son contenu de référence n'a pas encore été généré.\n`
    m.statut = 'partiel'
  }
  pages.push({ slug: m.slug, categorie: m.categorie, titre: m.titre, resume: m.resume, statut: m.statut, ordre: m.ordre, contenu_md })
}

const header = `// FICHIER GÉNÉRÉ — ne pas éditer à la main.
// Produit par app/api/src/wiki/build-seed.mjs à partir de app/api/src/wiki/content/*.md.
// Contenu de référence injecté au démarrage par seedWiki() (INSERT OR IGNORE).

export interface WikiSeedPage {
  slug: string
  categorie: string
  titre: string
  resume: string
  statut: 'redige' | 'partiel' | 'brouillon' | 'deprecie'
  ordre: number
  contenu_md: string
}

export const WIKI_SEED: WikiSeedPage[] = `

writeFileSync(join(HERE, 'seedData.ts'), header + JSON.stringify(pages, null, 2) + '\n', 'utf8')
console.log(`seedData.ts généré : ${pages.length} pages (${missing} manquante(s) -> placeholder).`)
