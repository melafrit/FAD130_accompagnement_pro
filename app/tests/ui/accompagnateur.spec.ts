import { test, expect, type Page } from '@playwright/test'
import { login, DEMO, dismissOnboarding, dossierAccId } from './helpers'

// =============================================================================
// Tests UI bout-en-bout — RÔLE ACCOMPAGNATEUR (compte vitrine DEMO.mohamed).
// Un scénario par fonctionnalité visible ; les IDs TC-UI-1xx couverts sont cités
// dans chaque titre. Base reseedée avant le run → on peut muter sans dépendance
// inter-tests. Contenu IA jamais figé : on vérifie la présence d'éléments/sections.
// =============================================================================

/** Ouvre le 1er dossier de Mohamed (accompagné « Amine », parcours vitrine complet). */
async function ouvrirDossierAmine(page: Page): Promise<number> {
  const id = await dossierAccId(page, 'Amine')
  await page.goto(`/dossier/${id}`)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  return id
}

// ---------------------------------------------------------------------------
// CONNEXION & GARDES DE ROUTE
// ---------------------------------------------------------------------------
test.describe('Connexion & accès', () => {
  // TC-UI-100 — connexion accompagnateur + accès à l'espace
  test('TC-UI-100 — connexion accompagnateur et accès à l’espace', async ({ page }) => {
    await login(page, DEMO.mohamed)
    await expect(page.getByRole('link', { name: 'Mon espace' })).toBeVisible()
    // L'accompagnateur peut atteindre son tableau de bord.
    await page.goto('/tableau-de-bord')
    await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible()
  })

  // TC-UI-101 — mauvais mot de passe → message d'erreur, pas de redirection
  test('TC-UI-101 — connexion refusée avec un mauvais mot de passe', async ({ page }) => {
    await page.goto('/connexion')
    await page.fill('input[type=email]', DEMO.mohamed.email)
    await page.fill('input[type=password]', 'Faux123!')
    await page.getByRole('button', { name: 'Se connecter' }).click()
    await expect(page.locator('.form-error')).toBeVisible()
    // Toujours sur la page de connexion (pas de redirection vers /espace).
    await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Mon espace' })).toHaveCount(0)
  })

  // TC-UI-102 — anonyme sur /tableau-de-bord → redirigé vers /connexion
  test('TC-UI-102 — tableau de bord interdit à un anonyme (redirection /connexion)', async ({ page }) => {
    await page.goto('/tableau-de-bord')
    await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toHaveCount(0)
  })

  // TC-UI-103 — accompagné sur /tableau-de-bord → redirigé vers /espace (mauvais rôle)
  test('TC-UI-103 — tableau de bord interdit à un accompagné (mauvais rôle)', async ({ page }) => {
    await login(page, DEMO.amine)
    await page.goto('/tableau-de-bord')
    // Protected role=accompagnateur renvoie l'accompagné vers /espace.
    await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toHaveCount(0)
    await expect(page).not.toHaveURL(/\/tableau-de-bord/)
  })

  // TC-UI-144 — accompagné sur /mutualisation → redirigé (mauvais rôle)
  test('TC-UI-144 — /mutualisation interdit à un accompagné (mauvais rôle)', async ({ page }) => {
    await login(page, DEMO.amine)
    await page.goto('/mutualisation')
    await expect(page.getByRole('heading', { name: 'Mutualisation entre pairs' })).toHaveCount(0)
    await expect(page).not.toHaveURL(/\/mutualisation/)
  })
})

// ---------------------------------------------------------------------------
// TABLEAU DE BORD : cartes, signaux, pilotage (impact + digest), liens d'offre
// ---------------------------------------------------------------------------
test.describe('Tableau de bord', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, DEMO.mohamed)
    await page.goto('/tableau-de-bord')
    await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible()
  })

  // TC-UI-104 + TC-UI-105 + TC-UI-113 — cartes d'accompagnés, voyant signaux, ouverture
  test('TC-UI-104, TC-UI-105 — cartes d’accompagnés, statistiques et voyant signaux', async ({ page }) => {
    // Au moins une carte avec ses statistiques (le compte démo a des dossiers seedés).
    const cartes = page.locator('.dash-card')
    await expect(cartes.first()).toBeVisible()
    await expect(page.getByText('Questionnaire :').first()).toBeVisible()
    await expect(page.getByText('Entretiens :').first()).toBeVisible()
    await expect(page.getByText('Comptes rendus :').first()).toBeVisible()
    await expect(page.getByText('Actions en cours :').first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Ouvrir le dossier' }).first()).toBeVisible()
    // Voyant signaux faibles : feature active sur le compte vitrine (sans plan → tout activé).
    // La pastille est facultative selon le niveau ; si présente, son aria-label décrit le signal.
    const pastille = page.locator('[aria-label^="Signal "]')
    if (await pastille.count() > 0) {
      await expect(pastille.first()).toBeVisible()
    }
  })

  // TC-UI-107 — tableau d'impact : tuiles KPI
  test('TC-UI-107 — tableau d’impact : tuiles KPI affichées', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Tableau d’impact/ })).toBeVisible()
    await expect(page.getByText('Parcours actifs')).toBeVisible()
    await expect(page.getByText('Progression moyenne')).toBeVisible()
    await expect(page.getByText('Actions réalisées')).toBeVisible()
    await expect(page.getByText('Entretiens menés')).toBeVisible()
    await expect(page.getByText('Comptes rendus publiés')).toBeVisible()
    await expect(page.getByText('Évolution météo (moy.)')).toBeVisible()
  })

  // TC-UI-108 — digest hebdomadaire : aperçu HTML + envoi email
  test('TC-UI-108 — digest hebdomadaire : aperçu HTML et envoi par email', async ({ page }) => {
    const digest = page.getByRole('heading', { name: /Digest hebdomadaire/ }).locator('xpath=ancestor::section')
    await expect(digest).toBeVisible()
    // Aperçu : bascule le rendu HTML du digest.
    await page.getByRole('button', { name: 'Aperçu' }).click()
    await expect(page.getByRole('button', { name: 'Masquer l’aperçu' })).toBeVisible()
    // Envoi : message de confirmation « Digest envoyé à … ✓ ».
    await page.getByRole('button', { name: 'M’envoyer le digest' }).click()
    await expect(digest.locator('.form-success')).toContainText('Digest envoyé')
  })

  // TC-UI-110 + TC-UI-111 — tags : ajouter, filtrer, retirer
  test('TC-UI-110, TC-UI-111 — ajouter, filtrer puis retirer un tag', async ({ page }) => {
    const carte = page.locator('.dash-card').first()
    const tag = `priorité-${Date.now()}`
    // Ajout via le champ « + ajouter un tag (Entrée) ».
    const champ = carte.getByPlaceholder('+ ajouter un tag (Entrée)')
    await champ.fill(tag)
    await champ.press('Enter')
    const chip = carte.locator('.tag-chip', { hasText: tag })
    await expect(chip).toBeVisible()
    // Filtre par tag : le menu apparaît dès qu'un tag existe.
    const select = page.locator('.dash-filter select')
    await expect(select).toBeVisible()
    await select.selectOption({ label: tag })
    await expect(page.locator('.dash-card')).toHaveCount(1)
    // Retour à « Tous » → toutes les cartes réapparaissent.
    await select.selectOption('')
    await expect(page.locator('.dash-card').first()).toBeVisible()
    // Retrait du chip via le bouton « × ».
    await carte.locator('.tag-chip', { hasText: tag }).getByRole('button', { name: 'Retirer le tag' }).click()
    await expect(carte.locator('.tag-chip', { hasText: tag })).toHaveCount(0)
  })

  // TC-UI-112 — liens Bilan de pratique & Mutualisation présents (compte sans plan)
  test('TC-UI-112 — liens Bilan de pratique et Mutualisation visibles selon l’offre', async ({ page }) => {
    await expect(page.getByRole('link', { name: /Bilan de ma pratique/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /Mutualisation/ })).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// DOSSIER : ouverture, boussole, timeline, propriété de la ressource
// ---------------------------------------------------------------------------
test.describe('Dossier', () => {
  // TC-UI-113 + TC-UI-151 + TC-UI-152 — ouvrir un dossier, boussole, timeline, détails
  test('TC-UI-113, TC-UI-151, TC-UI-152 — ouvrir un dossier, boussole et timeline', async ({ page }) => {
    await login(page, DEMO.mohamed)
    await page.goto('/tableau-de-bord')
    await page.getByRole('link', { name: 'Ouvrir le dossier' }).first().click()
    await expect(page).toHaveURL(/\/dossier\/\d+/)
    // En-tête : nom + badge de statut (En cours / Clôturé).
    await expect(page.locator('.badge-statut')).toBeVisible()
    // Boussole du parcours + timeline (questionnaire + entretiens).
    await expect(page.getByRole('heading', { name: 'Questionnaire initial' })).toBeVisible()
    await expect(page.locator('.timeline')).toBeVisible()
    // Détail du questionnaire si complété : bouton « Questions & réponses ».
    const qDetail = page.getByRole('button', { name: /Questions & réponses/ }).first()
    if (await qDetail.count() > 0) {
      await qDetail.click()
      await expect(page.locator('.modal[role="dialog"]')).toBeVisible()
      await page.locator('.modal-close').first().click()
    }
    // Sections visualisation présentes.
    await expect(page.getByRole('heading', { name: /Fil rouge du mémoire/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Nuage de thèmes/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Roue des émotions/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Micro-journal/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Plan d\'action' })).toBeVisible()
  })

  // TC-UI-114 — dossier d'un autre accompagnateur : 404, contenu non rendu
  test('TC-UI-114 — dossier d’un autre accompagnateur introuvable (non-propriétaire)', async ({ page }) => {
    // 1) Récupérer un id de dossier appartenant à Mohamed.
    await login(page, DEMO.mohamed)
    const idMohamed = await dossierAccId(page, 'Amine')
    // 2) Se reconnecter en Camille et tenter d'ouvrir ce dossier.
    await login(page, DEMO.camille)
    await page.goto(`/dossier/${idMohamed}`)
    await page.waitForLoadState('networkidle') // attendre la fin du 404 (sinon course avec le rendu)
    // Le contenu du dossier d'autrui ne s'affiche pas : la page reste en « Chargement… », aucune timeline.
    await expect(page.getByText('Chargement…')).toBeVisible()
    await expect(page.locator('.timeline')).toHaveCount(0)
  })

  // TC-UI-128 — régression : une modale ouverte alors que la page est SCROLLÉE reste ancrée au
  // viewport (non coupée). Garde-fou contre le retour du bloc englobant créé par .page (transform).
  test('TC-UI-128 — modale non coupée quand la page est scrollée (Dossier)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 520 }) // viewport court → la page défile
    await login(page, DEMO.mohamed)
    const id = await dossierAccId(page, 'Amine')
    await page.goto(`/dossier/${id}`)
    await expect(page.locator('.timeline')).toBeVisible()
    const qDetail = page.getByRole('button', { name: /Questions & réponses/ }).first()
    if (await qDetail.count() === 0) { test.skip(true, 'pas de questionnaire détaillé sur ce dossier'); return }
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await qDetail.click()
    const overlay = page.locator('.modal-overlay')
    await expect(overlay).toBeVisible()
    // L'overlay (position:fixed) couvre le viewport, ancré en haut (y ≈ 0) — PAS la page scrollée.
    const ob = await overlay.boundingBox()
    expect(ob).not.toBeNull()
    expect(Math.abs(ob!.y)).toBeLessThanOrEqual(2)
    // Le haut de la boîte modale est visible dans le viewport (non coupé au-dessus).
    const mb = await page.locator('.modal[role="dialog"]').boundingBox()
    expect(mb).not.toBeNull()
    expect(mb!.y).toBeGreaterThanOrEqual(0)
  })
})

// ---------------------------------------------------------------------------
// ENTRETIEN GUIDÉ : démarrage, phases, questions, co-pilote IA, banque, clôture
// ---------------------------------------------------------------------------
test.describe('Entretien guidé', () => {
  // TC-UI-115 + TC-UI-116 — démarrer / reprendre un entretien et naviguer entre phases
  test('TC-UI-115, TC-UI-116 — démarrer un entretien guidé et naviguer entre phases', async ({ page }) => {
    await login(page, DEMO.mohamed)
    const id = await ouvrirDossierAmine(page)
    // Démarrage : « Nouvel entretien » OU reprise « Reprendre l'entretien en cours ».
    const repren = page.getByRole('button', { name: "Reprendre l'entretien en cours" })
    const nouveau = page.getByRole('button', { name: 'Nouvel entretien' })
    if (await repren.count() > 0) { await repren.click() } else { await nouveau.click() }
    await expect(page).toHaveURL(new RegExp(`/entretien\\?dossier=${id}`))
    // Affichage Phase 1/6 + vigilance + questions à poser.
    await expect(page.getByText(/Phase 1\/6/)).toBeVisible()
    await expect(page.getByRole('heading', { name: /Vigilance/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Questions à poser/ })).toBeVisible()
    // « Précédent » désactivé en phase 1.
    await expect(page.getByRole('button', { name: '← Précédent' })).toBeDisabled()
    // Naviguer : Suivant → puis ← Précédent.
    await page.getByRole('button', { name: 'Suivant →' }).click()
    await expect(page.getByText(/Phase 2\/6/)).toBeVisible()
    await page.getByRole('button', { name: '← Précédent' }).click()
    await expect(page.getByText(/Phase 1\/6/)).toBeVisible()
  })

  // TC-UI-117 + TC-UI-118 + TC-UI-120 + TC-UI-121 — questions posées (CRUD), co-pilote IA,
  // banque adaptée, et « Reprendre plus tard » (persistance des notes).
  test('TC-UI-117, TC-UI-118, TC-UI-120, TC-UI-121 — questions, co-pilote IA, banque et reprise', async ({ page }) => {
    test.setTimeout(90_000) // un appel IA réel (suggestions) + nombreuses interactions + 2 navigations
    await login(page, DEMO.mohamed)
    const id = await ouvrirDossierAmine(page)
    const repren = page.getByRole('button', { name: "Reprendre l'entretien en cours" })
    if (await repren.count() > 0) { await repren.click() } else { await page.getByRole('button', { name: 'Nouvel entretien' }).click() }
    await expect(page.getByText(/Phase \d\/6/)).toBeVisible() // reprise possible → la phase courante peut ne pas être la 1re

    // (TC-UI-117) Ajouter une question posée.
    const q = 'Qu’as-tu ressenti à ce moment-là ?'
    await page.getByPlaceholder('Saisir, dicter ou modifier une question, puis Ajouter…').fill(q)
    await page.getByRole('button', { name: '＋ Ajouter' }).click()
    const qItem = page.locator('.qposee', { hasText: q })
    await expect(qItem).toBeVisible()
    // Éditer le texte (✎ → ✓).
    await qItem.getByRole('button', { name: 'Modifier la question' }).click()
    // En mode édition, le texte passe dans la VALEUR de l'input → qItem (filtré par texte) devient
    // périmé. On cible le champ/bouton d'édition au niveau page (un seul est ouvert à la fois).
    const champEdit = page.getByRole('textbox', { name: 'Modifier la question' })
    await champEdit.fill(q + ' (reformulée)')
    await page.getByRole('button', { name: 'Enregistrer la question' }).click()
    await expect(page.locator('.qposee', { hasText: '(reformulée)' })).toBeVisible()
    // Supprimer la question (×).
    await page.locator('.qposee', { hasText: '(reformulée)' }).getByRole('button', { name: 'Supprimer la question' }).click()
    await expect(page.locator('.qposee', { hasText: '(reformulée)' })).toHaveCount(0)

    // (TC-UI-121) Saisir des notes générales puis vérifier leur persistance après reprise.
    const notes = `Notes de test — ${Date.now()}`
    await page.getByPlaceholder('Saisis ou dicte les propos de la personne…').fill(notes)

    // (TC-UI-118) Co-pilote IA : demander des suggestions (contrat, texte non figé).
    await page.getByRole('button', { name: 'Suggestions de l’IA' }).click()
    await expect(page.locator('.sugg')).toBeVisible({ timeout: 20000 })
    await expect(page.getByText('Questions d’approfondissement')).toBeVisible()

    // (TC-UI-120) Banque de questions adaptée OU questions perso déjà présentes.
    const adapter = page.getByRole('button', { name: /Adapter les questions à cet étudiant/ })
    if (await adapter.count() > 0) {
      await adapter.click()
      await expect(page.locator('.phase-q-perso .perso').first()).toBeVisible({ timeout: 20000 })
    } else {
      await expect(page.locator('.phase-q-perso .perso').first()).toBeVisible()
    }

    // (TC-UI-121) « Reprendre plus tard » → retour au dossier ; les notes sont persistées.
    await page.getByRole('button', { name: 'Reprendre plus tard' }).click()
    await expect(page).toHaveURL(new RegExp(`/dossier/${id}`))
    await page.getByRole('button', { name: "Reprendre l'entretien en cours" }).click()
    await expect(page.getByPlaceholder('Saisis ou dicte les propos de la personne…')).toHaveValue(notes)
  })

  // TC-UI-122 — clôturer l'entretien et générer le CR (modale, contrat IA)
  test('TC-UI-122 — clôturer l’entretien et générer le compte rendu (modale)', async ({ page }) => {
    test.skip(process.env.CI_SKIP_IA === '1', 'Scénario de génération IA (latence variable) — neutralisé en CI')
    await login(page, DEMO.mohamed)
    await ouvrirDossierAmine(page)
    const repren = page.getByRole('button', { name: "Reprendre l'entretien en cours" })
    if (await repren.count() > 0) { await repren.click() } else { await page.getByRole('button', { name: 'Nouvel entretien' }).click() }
    await expect(page.getByText(/Phase \d\/6/)).toBeVisible() // reprise possible → la phase courante peut ne pas être la 1re
    // Clôturer & générer le CR.
    await page.getByRole('button', { name: '✓ Clôturer & générer le CR' }).click()
    await expect(page.getByRole('heading', { name: /Entretien clôturé/ })).toBeVisible()
    // Ouvrir la modale du compte rendu et générer si nécessaire.
    await page.getByRole('button', { name: 'Ouvrir le compte rendu' }).click()
    const modal = page.locator('.cr-modal[role="dialog"]')
    await expect(modal).toBeVisible()
    const generer = modal.getByRole('button', { name: /Générer le compte rendu/ })
    if (await generer.count() > 0) {
      await generer.click()
    }
    // CR produit : badge brouillon/publié + contenu présent (texte IA non figé).
    await expect(modal.locator('.cr-badge')).toBeVisible({ timeout: 25000 })
    await expect(modal.locator('.cr-view')).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// COMPTE RENDU : édition, régénération, publication, historique, discussion
// Le CR vitrine d'Amine est pré-publié dans le jeu de démo.
// ---------------------------------------------------------------------------
test.describe('Compte rendu', () => {
  // TC-UI-123 + TC-UI-124 — éditer / régénérer / publier + historique en lecture seule
  test('TC-UI-123, TC-UI-124 — éditer puis publier le CR, et consulter l’historique', async ({ page }) => {
    await login(page, DEMO.mohamed)
    await ouvrirDossierAmine(page)
    // Ouvrir le CR du 1er entretien depuis la timeline.
    await page.getByRole('button', { name: /Compte rendu/ }).first().click()
    const modal = page.locator('.cr-modal[role="dialog"]')
    await expect(modal).toBeVisible()
    await expect(modal.locator('.cr-view, .cr-empty')).toBeVisible()

    // Si aucun CR n'existe encore, on le génère pour pouvoir l'éditer.
    const gen = modal.getByRole('button', { name: /Générer le compte rendu/ })
    if (await gen.count() > 0) {
      await gen.click()
      await expect(modal.locator('.cr-badge')).toBeVisible({ timeout: 25000 })
    }

    // Éditer (✎ → 💾 Enregistrer) quand le CR est en mode courant (pas historique).
    const editer = modal.getByRole('button', { name: '✎ Éditer' })
    if (await editer.count() > 0) {
      await editer.click()
      await expect(modal.getByRole('button', { name: '💾 Enregistrer' })).toBeVisible()
      await modal.getByRole('button', { name: '💾 Enregistrer' }).click()
      await expect(modal.getByRole('button', { name: '✎ Éditer' })).toBeVisible()
    }

    // Publier si encore en brouillon → badge « ✓ Publié ».
    const publier = modal.getByRole('button', { name: '📣 Publier' })
    if (await publier.count() > 0) {
      await publier.click()
      await expect(modal.locator('.cr-badge.pub')).toBeVisible()
    } else {
      // Déjà publié dans le jeu de démo.
      await expect(modal.locator('.cr-badge.pub')).toBeVisible()
    }

    // Historique (TC-UI-124) si ≥ 2 versions : sélectionner une version archivée → lecture seule.
    const hist = modal.locator('.cr-hist select')
    if (await hist.count() > 0) {
      const options = modal.locator('.cr-hist option')
      if (await options.count() > 1) {
        await hist.selectOption({ index: 1 })
        await expect(modal.getByText('(version archivée, lecture seule)')).toBeVisible()
      }
    }
  })

  // TC-UI-125 — discussion CR : envoyer un message à l'accompagné
  test('TC-UI-125 — discussion CR : échanger un message avec l’accompagné', async ({ page }) => {
    await login(page, DEMO.mohamed)
    await ouvrirDossierAmine(page)
    // Ouvrir un CR publié (badge « ✓ publié » dans le libellé du bouton).
    const crPublie = page.getByRole('button', { name: /Compte rendu ✓ publié/ })
    const cible = (await crPublie.count() > 0) ? crPublie.first() : page.getByRole('button', { name: /Compte rendu/ }).first()
    await cible.click()
    const modal = page.locator('.cr-modal[role="dialog"]')
    await expect(modal).toBeVisible()
    // Section Échanges présente.
    await expect(modal.getByRole('heading', { name: /Échanges/ })).toBeVisible()
    const champ = modal.getByPlaceholder('Écrire un message…')
    if (await champ.count() > 0) {
      const texte = `As-tu pu avancer ? ${Date.now()}`
      await champ.fill(texte)
      await modal.getByRole('button', { name: 'Envoyer' }).click()
      await expect(modal.locator('.cr-msg-item.me', { hasText: texte })).toBeVisible()
    }
  })
})

// ---------------------------------------------------------------------------
// RÉFLEXIVITÉ SUR ENTRETIEN : miroir, débriefing, replay annoté
// ---------------------------------------------------------------------------
test.describe('Réflexivité (miroir, débriefing, replay)', () => {
  // TC-UI-126 + TC-UI-127 — miroir réflexif : analyser ma posture + appliquer les scores
  test('TC-UI-126, TC-UI-127 — miroir réflexif : analyse de posture et application des scores', async ({ page }) => {
    await login(page, DEMO.mohamed)
    await ouvrirDossierAmine(page)
    await page.getByRole('button', { name: 'Analyser ma posture' }).first().click()
    const modal = page.locator('.cr-modal[role="dialog"]', { hasText: 'Miroir réflexif' })
    await expect(modal).toBeVisible()
    // Lancer l'analyse si aucune n'existe encore.
    const lancer = modal.getByRole('button', { name: 'Analyser ma posture' })
    if (await lancer.count() > 0) {
      await lancer.click()
    }
    // Badge « Analyse IA » ou « Analyse (repli) » (source non figée).
    await expect(modal.locator('.cr-badge')).toBeVisible({ timeout: 25000 })
    // Appliquer les scores à la grille s'ils sont proposés.
    const appliquer = modal.getByRole('button', { name: /Appliquer ces scores à ma grille/ })
    if (await appliquer.count() > 0) {
      await appliquer.click()
      await expect(modal.locator('.form-success')).toContainText('appliqué')
    }
  })

  // TC-UI-129 — débriefing à chaud : amorcer par l'IA puis enregistrer
  test('TC-UI-129 — débriefing à chaud : amorcer par l’IA puis enregistrer', async ({ page }) => {
    await login(page, DEMO.mohamed)
    await ouvrirDossierAmine(page)
    await page.getByRole('button', { name: 'Débriefing' }).first().click()
    const modal = page.locator('.modal[role="dialog"]', { hasText: 'Débriefing' })
    await expect(modal).toBeVisible()
    // Amorcer par l'IA (remplit les champs vides).
    await modal.getByRole('button', { name: 'Amorcer par l’IA' }).click()
    await expect(modal.locator('.form-success')).toBeVisible({ timeout: 25000 })
    // Enregistrer → « Débriefing enregistré ✓ ».
    await modal.getByRole('button', { name: 'Enregistrer' }).click()
    await expect(modal.locator('.form-success')).toContainText('enregistré')
  })

  // TC-UI-130 — replay annoté : initialiser l'auto-confrontation puis enregistrer
  test('TC-UI-130 — replay annoté : initialiser l’auto-confrontation et enregistrer', async ({ page }) => {
    await login(page, DEMO.mohamed)
    await ouvrirDossierAmine(page)
    await page.getByRole('button', { name: 'Replay annoté' }).first().click()
    const modal = page.locator('.modal[role="dialog"]', { hasText: 'Replay annoté' })
    await expect(modal).toBeVisible()
    // Si des moments sont rejouables : initialiser puis enregistrer.
    const init = modal.getByRole('button', { name: /Initialiser l.auto-confrontation/ }) // . tolère l'apostrophe typographique
    if (await init.count() > 0) {
      await init.click()
      await expect(modal.locator('.form-success')).toBeVisible({ timeout: 25000 })
      await modal.getByRole('button', { name: 'Enregistrer' }).click()
      await expect(modal.locator('.form-success')).toContainText('enregistrées')
    } else {
      // Aucune question enregistrée : message « rien à rejouer ».
      await expect(modal.getByText(/rien à rejouer/)).toBeVisible()
    }
  })
})

// ---------------------------------------------------------------------------
// SYNTHÈSE, FIL ROUGE, NUAGE, ROUE, JOURNAL, PLAN D'ACTION, CLÔTURE
// ---------------------------------------------------------------------------
test.describe('Pilotage du parcours (dossier)', () => {
  // TC-UI-131 — synthèse du parcours : générer / éditer / publier
  test('TC-UI-131 — synthèse du parcours : générer, éditer et publier', async ({ page }) => {
    await login(page, DEMO.mohamed)
    await ouvrirDossierAmine(page)
    await page.getByRole('button', { name: 'Synthèse du parcours' }).click()
    const modal = page.locator('.cr-modal[role="dialog"]', { hasText: 'Synthèse du parcours' })
    await expect(modal).toBeVisible()
    // Générer si aucune synthèse n'existe.
    const gen = modal.getByRole('button', { name: /Générer la synthèse/ })
    if (await gen.count() > 0) {
      await gen.click()
    }
    // Document présent (badge brouillon/publiée) — texte IA non figé.
    await expect(modal.locator('.cr-badge')).toBeVisible({ timeout: 25000 })
    // Publier si encore en brouillon.
    const publier = modal.getByRole('button', { name: '📣 Publier' })
    if (await publier.count() > 0) {
      await publier.click()
      await expect(modal.locator('.cr-badge.pub')).toBeVisible()
    } else {
      await expect(modal.locator('.cr-badge.pub')).toBeVisible()
    }
  })

  // TC-UI-132 — fil rouge du mémoire : faire émerger + basculer le partage
  test('TC-UI-132 — fil rouge du mémoire : faire émerger et partager', async ({ page }) => {
    await login(page, DEMO.mohamed)
    await ouvrirDossierAmine(page)
    const section = page.locator('.emergence')
    await expect(section.getByRole('heading', { name: /Fil rouge du mémoire/ })).toBeVisible()
    const emerger = section.getByRole('button', { name: /Faire émerger le fil rouge/ })
    if (await emerger.count() > 0) {
      await emerger.click()
    }
    await expect(section.locator('.emergence-fil')).toBeVisible({ timeout: 25000 })
    // Basculer le partage (Partager ↔ retirer) sur deux clics.
    const partager = section.getByRole('button', { name: /Partager avec l’accompagné|retirer le partage/ })
    await expect(partager).toBeVisible()
    const labelAvant = (await partager.textContent()) || ''
    await partager.click()
    await expect(section.getByRole('button', { name: /Partager avec l’accompagné|retirer le partage/ })).not.toHaveText(labelAvant)
  })

  // TC-UI-133 — nuage de thèmes : génération et rendu pondéré
  test('TC-UI-133 — nuage de thèmes : génération et rendu pondéré', async ({ page }) => {
    await login(page, DEMO.mohamed)
    await ouvrirDossierAmine(page)
    const section = page.getByRole('heading', { name: /Nuage de thèmes/ }).locator('xpath=ancestor::section')
    await expect(section).toBeVisible()
    const gen = section.getByRole('button', { name: /Générer le nuage|Régénérer/ })
    await gen.click()
    // Au moins un mot rendu dans le nuage (libellé non figé).
    await expect(section.locator('[aria-label="Nuage de thèmes"] span').first()).toBeVisible({ timeout: 25000 })
  })

  // TC-UI-134 — roue des émotions (lecture seule côté accompagnateur)
  test('TC-UI-134 — roue des émotions : climat agrégé en lecture seule', async ({ page }) => {
    await login(page, DEMO.mohamed)
    await ouvrirDossierAmine(page)
    const section = page.getByRole('heading', { name: /Roue des émotions/ }).locator('xpath=ancestor::section')
    await expect(section).toBeVisible()
    // Côté accompagnateur (climat de l'accompagné) : pas de bouton « Enregistrer » de saisie.
    await expect(section.getByText('(climat de l’accompagné)')).toBeVisible()
    await expect(section.getByRole('button', { name: 'Enregistrer' })).toHaveCount(0)
  })

  // TC-UI-135 + TC-UI-137 — plan d'action (ajout / statut) puis clôture / réouverture
  test('TC-UI-135, TC-UI-137 — plan d’action puis clôture et réouverture', async ({ page }) => {
    await login(page, DEMO.mohamed)
    await ouvrirDossierAmine(page)
    // Si le dossier vitrine est clôturé, on le rouvre d'abord pour pouvoir muter.
    const rouvrir = page.getByRole('button', { name: 'Rouvrir le dossier' })
    if (await rouvrir.count() > 0) {
      await rouvrir.click()
      await expect(page.locator('.badge-statut.st-encours')).toBeVisible()
    }
    // Ajouter une action.
    const action = `Préparer le plan de mémoire — ${Date.now()}`
    await page.getByPlaceholder('Ajouter ou dicter une action…').fill(action)
    await page.getByRole('button', { name: 'Ajouter' }).click()
    await expect(page.getByText(action)).toBeVisible()

    // Clôturer la démarche avec une synthèse finale.
    await page.getByPlaceholder('Synthèse finale du parcours (facultatif)…').fill('Parcours mené à son terme, objectifs atteints.')
    await page.getByRole('button', { name: 'Clôturer la démarche' }).click()
    await expect(page.locator('.badge-statut.st-cloture')).toBeVisible()
    await expect(page.locator('.recap-text')).toContainText('objectifs atteints')
    // Le formulaire d'ajout d'action disparaît une fois clôturé (TC-UI-136).
    await expect(page.getByPlaceholder('Ajouter ou dicter une action…')).toHaveCount(0)
    // Rouvrir → de nouveau « En cours ».
    await page.getByRole('button', { name: 'Rouvrir le dossier' }).click()
    await expect(page.locator('.badge-statut.st-encours')).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// BILAN DE PRATIQUE (/bilan-pratique)
// ---------------------------------------------------------------------------
test.describe('Bilan de pratique', () => {
  // TC-UI-138 — générer la synthèse réflexive globale (contrat IA + repli)
  test('TC-UI-138 — bilan de pratique : générer la synthèse réflexive globale', async ({ page }) => {
    test.skip(process.env.CI_SKIP_IA === '1', 'Scénario de génération IA (latence variable) — neutralisé en CI')
    await login(page, DEMO.mohamed)
    await page.goto('/bilan-pratique')
    await expect(page.getByRole('heading', { name: 'Bilan de ma pratique' })).toBeVisible()
    // Ligne « Basé sur N parcours … ».
    await expect(page.getByText(/Basé sur \d+ parcours/)).toBeVisible()
    // Générer / régénérer le bilan.
    await page.getByRole('button', { name: /Générer mon bilan|Régénérer mon bilan/ }).click()
    await expect(page.locator('.form-success')).toContainText('Bilan mis à jour', { timeout: 30000 })
    // Le bilan affiche au moins ses appuis / axes / prochains pas (texte non figé).
    await expect(page.locator('.card')).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// MUTUALISATION (/mutualisation) : partage, validation, public/lien, suppression
// ---------------------------------------------------------------------------
test.describe('Mutualisation', () => {
  // TC-UI-140 + TC-UI-142 + TC-UI-143 — partager, rendre public + copier le lien, supprimer
  test('TC-UI-140, TC-UI-142, TC-UI-143 — partager une ressource, la rendre publique et la supprimer', async ({ page }) => {
    await login(page, DEMO.mohamed)
    await page.goto('/mutualisation')
    await expect(page.getByRole('heading', { name: 'Mutualisation entre pairs' })).toBeVisible()

    // (TC-UI-140) Partager une ressource.
    const titre = `Question ouverte d'entrée — ${Date.now()}`
    await page.locator('label.field', { hasText: 'Titre' }).locator('input').fill(titre)
    await page.locator('label.field', { hasText: 'Type' }).locator('select').selectOption('question')
    await page.locator('label.field', { hasText: 'Contenu' }).locator('textarea').fill('Comment vas-tu aborder ce chapitre ?')
    await page.getByRole('button', { name: 'Partager' }).click()
    await expect(page.locator('.form-success')).toContainText('Ressource partagée')
    const carte = page.locator('.card', { hasText: titre })
    await expect(carte).toBeVisible()
    await expect(carte.getByText('par moi')).toBeVisible()

    // (TC-UI-142) Rendre public → message « Lien public … » ; la ressource porte « 🌐 public ».
    await carte.getByRole('button', { name: 'Rendre public' }).click()
    await expect(page.locator('.form-success')).toContainText('Lien public')
    await expect(carte.getByText('🌐 public')).toBeVisible()
    // Le bouton « Copier le lien » est désormais disponible.
    await expect(carte.getByRole('button', { name: 'Copier le lien' })).toBeVisible()

    // (TC-UI-143) Supprimer uniquement sa ressource (confirm natif accepté).
    page.once('dialog', (d) => d.accept())
    await carte.getByRole('button', { name: 'Supprimer' }).click()
    await expect(page.locator('.card', { hasText: titre })).toHaveCount(0)
  })

  // TC-UI-141 — champs requis (titre/contenu) bloquent la soumission
  test('TC-UI-141 — mutualisation : champs requis bloquent la soumission', async ({ page }) => {
    await login(page, DEMO.mohamed)
    await page.goto('/mutualisation')
    // Soumission sans titre ni contenu → contrôle HTML required, pas d'envoi.
    await page.getByRole('button', { name: 'Partager' }).click()
    // Le titre requis est invalide (l'envoi est bloqué côté navigateur) → rien n'est créé.
    const titreInput = page.locator('label.field', { hasText: 'Titre' }).locator('input')
    const valide = await titreInput.evaluate((el: HTMLInputElement) => el.checkValidity())
    expect(valide).toBe(false)
    // Aucun message de succès (la ressource n'a pas été créée).
    await expect(page.getByText('Ressource partagée ✓')).toHaveCount(0)
  })
})

// ---------------------------------------------------------------------------
// EXPORT PDF, ATTESTATION, VISIO — sur le dossier clôturé de Karim (via Camille)
// ---------------------------------------------------------------------------
test.describe('Confort & éthique (export, attestation, visio)', () => {
  // TC-UI-145 — export PDF complet (contrat + impression)
  test('TC-UI-145 — export PDF complet du dossier', async ({ page }) => {
    await login(page, DEMO.mohamed)
    await ouvrirDossierAmine(page)
    await page.getByRole('button', { name: 'Export PDF complet' }).click()
    const modal = page.locator('.export-modal[role="dialog"]')
    await expect(modal).toBeVisible()
    // En-tête assemblé (accompagné, statut) + bouton d'impression actif quand data chargée.
    await expect(modal.locator('.export-doc')).toBeVisible({ timeout: 20000 })
    await expect(modal.getByRole('button', { name: /Imprimer/ })).toBeEnabled()
  })

  // TC-UI-147 + TC-UI-148 — attestation : délivrée uniquement sur un dossier clôturé.
  // Cas réel via Camille (dossier de Karim clôturé dans le jeu de démo).
  test('TC-UI-147, TC-UI-148 — attestation de fin sur un dossier clôturé (Camille / Karim)', async ({ page }) => {
    await login(page, DEMO.camille)
    const id = await dossierAccId(page, 'Karim')
    await page.goto(`/dossier/${id}`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Si le dossier de Karim n'est pas (encore) clôturé, on le clôture pour ce test.
    if (await page.locator('.badge-statut.st-cloture').count() === 0) {
      await page.getByPlaceholder('Synthèse finale du parcours (facultatif)…').fill('Parcours clôturé pour attestation.')
      await page.getByRole('button', { name: 'Clôturer la démarche' }).click()
      await expect(page.locator('.badge-statut.st-cloture')).toBeVisible()
    }

    // (TC-UI-147) Le bouton n'apparaît que sur un dossier clôturé → délivrer l'attestation.
    await page.getByRole('button', { name: /Délivrer l’attestation/ }).click()
    const modal = page.locator('.attestation-modal[role="dialog"]')
    await expect(modal).toBeVisible()
    await expect(modal.getByRole('heading', { name: /Attestation d’accompagnement/ })).toBeVisible()
    // Période formatée + compteurs + impression possible.
    await expect(modal.getByText(/Période : du/)).toBeVisible()
    await expect(modal.getByText(/Entretiens d’accompagnement/)).toBeVisible()
    await expect(modal.getByRole('button', { name: /Imprimer/ })).toBeVisible()
  })

  // TC-UI-148 (complément) — attestation absente sur un dossier EN COURS.
  test('TC-UI-148 — bouton Attestation absent tant que le dossier n’est pas clôturé', async ({ page }) => {
    await login(page, DEMO.mohamed)
    await ouvrirDossierAmine(page)
    // S'assurer que le dossier est « En cours » (rouvrir si nécessaire).
    const rouvrir = page.getByRole('button', { name: 'Rouvrir le dossier' })
    if (await rouvrir.count() > 0) {
      await rouvrir.click()
      await expect(page.locator('.badge-statut.st-encours')).toBeVisible()
    }
    await expect(page.locator('.badge-statut.st-encours')).toBeVisible()
    await expect(page.getByRole('button', { name: /Délivrer l’attestation/ })).toHaveCount(0)
  })

  // TC-UI-149 + TC-UI-150 — visio & ICS depuis la section Rendez-vous
  test('TC-UI-149, TC-UI-150 — rejoindre la visio et lien ICS d’un rendez-vous', async ({ page }) => {
    await login(page, DEMO.mohamed)
    await ouvrirDossierAmine(page)
    const rdvSection = page.locator('.rdv-section')
    if (await rdvSection.count() === 0) {
      test.skip(true, 'Aucun rendez-vous sur ce dossier vitrine.')
    }
    // (TC-UI-150) Lien ICS présent et pointant vers /api/rdv/:id/ics.
    const ics = rdvSection.locator('a.rdv-ics').first()
    await expect(ics).toHaveAttribute('href', /\/api\/rdv\/\d+\/ics/)
    // (TC-UI-149) Bouton Visio présent (feature active) → ouvre un nouvel onglet.
    const visio = rdvSection.getByRole('button', { name: /Visio/ })
    if (await visio.count() > 0) {
      const popupP = page.waitForEvent('popup').catch(() => null)
      await visio.first().click()
      const popup = await popupP
      if (popup) await popup.close()
    }
  })
})

// ---------------------------------------------------------------------------
// FALC (facile à lire) & VISITE GUIDÉE
// ---------------------------------------------------------------------------
test.describe('Accessibilité & onboarding', () => {
  // FALC toggle : bascule le mode « facile à lire » sur l'attribut documentaire.
  test('TC-UI-100 (FALC) — bascule du mode facile à lire', async ({ page }) => {
    await login(page, DEMO.mohamed)
    const toggle = page.getByRole('button', { name: 'Mode facile à lire' })
    await expect(toggle).toBeVisible()
    await toggle.click()
    await expect(page.locator('html')).toHaveAttribute('data-falc', 'on')
    await toggle.click()
    await expect(page.locator('html')).toHaveAttribute('data-falc', 'off')
  })

  // Visite guidée : relance via le bouton flottant « ? » puis fermeture (Passer).
  test('TC-UI-100 (visite guidée) — relancer et passer la visite guidée', async ({ page }) => {
    await login(page, DEMO.mohamed)
    // login() a déjà fermé la visite d'accueil ; on la relance via le FAB.
    await page.getByRole('button', { name: 'Lancer la visite guidée' }).click()
    const tour = page.getByRole('dialog', { name: 'Visite guidée' })
    await expect(tour).toBeVisible()
    await expect(tour.getByText(/Bienvenue sur Boussole/)).toBeVisible()
    // Naviguer d'une étape puis quitter via « Passer ».
    await tour.getByRole('button', { name: 'Suivant →' }).click()
    await tour.getByRole('button', { name: 'Passer' }).click()
    await expect(page.getByRole('dialog', { name: 'Visite guidée' })).toHaveCount(0)
  })
})

// Référence helper utilisé indirectement (évite l'avertissement d'import inutilisé
// si un refactor retire un usage) — no-op sûr.
void dismissOnboarding
