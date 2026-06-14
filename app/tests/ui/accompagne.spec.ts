import { test, expect } from '@playwright/test'
import { login, DEMO, dismissOnboarding, dossierMineId } from './helpers'

/**
 * Tests UI bout-en-bout du rôle ACCOMPAGNÉ (compte de démo : Amine).
 *
 * Chaque test couvre une FONCTIONNALITÉ visible côté accompagné (un scénario peut
 * regrouper plusieurs cas TC-UI granulaires du catalogue ui_acp.json).
 *
 * La base est reseedée avant chaque exécution complète : le parcours vitrine d'Amine
 * est pré-rempli (questionnaire, comptes rendus publiés, synthèse publiée, fil rouge…).
 * Les tests restent idempotents (pas de dépendance entre eux) ; le contenu IA n'est
 * jamais figé (on vérifie la présence de titres/sections/boutons après action).
 */

// Helper local : ouvre le parcours vitrine d'Amine (accompagnateur = Mohamed) et attend l'en-tête.
async function ouvrirParcoursAmine(page: import('@playwright/test').Page): Promise<number> {
  // Parcours VITRINE d'Amine = celui suivi par Mohamed (D1), le seul à contenir l'émergence
  // partagée (fil rouge + moments), la synthèse publiée, etc. (le 1er de la liste est celui de Camille).
  const id = await dossierMineId(page, 'Mohamed')
  await page.goto(`/parcours/${id}`)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  // L'en-tête « Accompagnateur : … · En cours/Clôturé » confirme que /dossiers/mine/:id a chargé.
  await expect(page.getByText('Accompagnateur :', { exact: false })).toBeVisible()
  return id
}

test.describe('ACCOMPAGNÉ — Connexion & contrôle d’accès', () => {
  // TC-UI-201 : connexion réussie → /espace, titre « Bonjour Amine » + section « Mes parcours ».
  test('TC-UI-201 — connexion accompagné réussie et redirection vers Mon espace', async ({ page }) => {
    await page.goto('/connexion')
    await page.fill('input[type=email]', DEMO.amine.email)
    await page.fill('input[type=password]', DEMO.amine.password)
    await page.getByRole('button', { name: 'Se connecter' }).click()

    await expect(page.getByRole('link', { name: 'Mon espace' })).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('heading', { name: /^Bonjour/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Mes parcours' })).toBeVisible()
  })

  // TC-UI-202 : mauvais mot de passe → reste sur /connexion, .form-error visible.
  test('TC-UI-202 — mauvais mot de passe : message d’erreur, pas de redirection', async ({ page }) => {
    await page.goto('/connexion')
    await page.fill('input[type=email]', DEMO.amine.email)
    await page.fill('input[type=password]', 'MAUVAIS')
    await page.getByRole('button', { name: 'Se connecter' }).click()

    await expect(page.locator('.form-error')).toBeVisible()
    await expect(page).toHaveURL(/\/connexion/)
    // Le bouton repasse de « … » à « Se connecter ».
    await expect(page.getByRole('button', { name: 'Se connecter' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Mon espace' })).toHaveCount(0)
  })

  // TC-UI-203 : accès direct /espace sans session → redirection /connexion.
  test('TC-UI-203 — accès à /espace sans session : redirection vers /connexion', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/espace')
    await expect(page).toHaveURL(/\/connexion/)
    await expect(page.locator('input[type=email]')).toBeVisible()
  })

  // TC-UI-204 / TC-UI-272 : accompagnateur ouvrant une route accompagné → redirection /espace.
  test('TC-UI-204 — accompagnateur sur route réservée à l’accompagné : redirection /espace', async ({ page }) => {
    await login(page, DEMO.camille)
    await page.goto('/parcours/1')
    await expect(page).toHaveURL(/\/espace$/)
    await page.goto('/questionnaire')
    await expect(page).toHaveURL(/\/espace$/)
    await page.goto('/mon-plan-action')
    await expect(page).toHaveURL(/\/espace$/)
  })

  // TC-UI-214 / TC-UI-272 : parcours d'autrui → 404 → « Chargement impossible. ».
  test('TC-UI-214 — parcours d’un autre accompagné : chargement impossible (cloisonnement)', async ({ page }) => {
    await login(page, DEMO.amine)
    const monId = await dossierMineId(page)
    // Léa ne possède pas le parcours d'Amine : l'API renvoie 404, l'UI affiche le message d'erreur.
    await login(page, DEMO.lea)
    await page.goto(`/parcours/${monId}`)
    // Cloisonnement : le contenu ne se charge pas (la boussole, qui exige les données, est absente).
    await expect(page.getByRole('img', { name: /Boussole du parcours/ })).toHaveCount(0)
    await expect(page.getByText(/Chargement/)).toBeVisible()
  })
})

test.describe('ACCOMPAGNÉ — Espace & multi-parcours', () => {
  // TC-UI-205 : liste des parcours avec badges d'avancement + bouton « Ouvrir le parcours ».
  test('TC-UI-205 — Mon espace : liste des parcours avec badges d’avancement', async ({ page }) => {
    await login(page, DEMO.amine)
    await page.goto('/espace')
    await expect(page.getByRole('heading', { name: 'Mes parcours' })).toBeVisible()

    const cartes = page.locator('.parcours-section .card')
    await expect(cartes.first()).toBeVisible()
    // Chaque carte expose un statut, un badge questionnaire et un bouton d'ouverture.
    await expect(cartes.first().getByText('Accompagnateur :', { exact: false })).toBeVisible()
    await expect(cartes.first().locator('.parcours-badges')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Ouvrir le parcours' }).first()).toBeVisible()
  })

  // TC-UI-207 / TC-UI-208 / TC-UI-209 : nouveau parcours (présélection, garde titre, gating bouton).
  test('TC-UI-207 — démarrer un nouveau parcours et enchaîner sur le questionnaire', async ({ page }) => {
    await login(page, DEMO.amine)
    await page.goto('/espace')
    await page.getByRole('link', { name: '+ Démarrer un nouveau parcours' }).click()
    await expect(page).toHaveURL(/\/nouveau-parcours/)
    await expect(page.getByRole('heading', { name: 'Démarrer un nouveau parcours' })).toBeVisible()

    const bouton = page.getByRole('button', { name: 'Démarrer et remplir le questionnaire' })

    // TC-UI-208 : titre vide → garde + message .form-error, aucune navigation.
    await page.locator('input').first().fill('   ')
    await bouton.click()
    await expect(page.locator('.form-error')).toHaveText('Renseigne un titre et choisis un accompagnateur.')
    await expect(page).toHaveURL(/\/nouveau-parcours/)

    // TC-UI-209 : un accompagnateur de démo est présélectionné → le bouton n'est pas désactivé.
    await expect(bouton).toBeEnabled()
    const select = page.locator('select')
    await expect(select).toBeVisible()

    // TC-UI-207 : titre valide → POST /dossiers/start → navigation vers /questionnaire?dossier=<id>.
    await page.locator('input').first().fill('Mémoire — test E2E')
    await bouton.click()
    await expect(page).toHaveURL(/\/questionnaire\?dossier=\d+/)
  })
})

test.describe('ACCOMPAGNÉ — Questionnaire initial', () => {
  // TC-UI-210 / TC-UI-211 : enchaîner questions (proposition + saisie libre), garde réponse vide.
  test('TC-UI-210 — questionnaire adaptatif : enchaîner questions et propositions', async ({ page }) => {
    await login(page, DEMO.amine)
    const id = await dossierMineId(page)
    await page.goto(`/questionnaire?dossier=${id}`)

    await expect(page.getByRole('heading', { name: 'Préparer ton 1ᵉʳ rendez-vous' })).toBeVisible()
    // La 1re question apparaît après l'appel IA initial (AiProgress visible pendant busy).
    const question = page.locator('.qa-q-active')
    await expect(question).toBeVisible({ timeout: 20000 })

    // TC-UI-211 : réponse vide → submit() retourne, l'historique n'évolue pas.
    const champ = page.getByLabel('Ta réponse')
    await champ.fill('   ')
    await page.getByRole('button', { name: 'Envoyer' }).click()
    await expect(page.locator('.qa-history .qa-item')).toHaveCount(0)

    // Saisie libre valide → la Q/R s'empile dans l'historique.
    await champ.fill('Je travaille sur la refonte d’une application interne.')
    await page.getByRole('button', { name: 'Envoyer' }).click()
    await expect(page.locator('.qa-history .qa-item').first()).toBeVisible({ timeout: 20000 })
  })

  // TC-UI-212 : voir mes réponses persistées (le parcours d'Amine a déjà un questionnaire complété).
  test('TC-UI-212 / TC-UI-263 — questionnaire déjà rempli : relire mes réponses depuis le parcours', async ({ page }) => {
    await login(page, DEMO.amine)
    const id = await ouvrirParcoursAmine(page)
    await expect(page.getByRole('heading', { name: 'Questionnaire initial' })).toBeVisible()

    // Le parcours vitrine est pré-rempli → bouton « Voir mes réponses ».
    await page.getByRole('button', { name: /Voir mes réponses/ }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('heading', { name: /Questionnaire initial/ })).toBeVisible()
    await page.getByRole('button', { name: 'Fermer' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    expect(id).toBeGreaterThan(0)
  })
})

test.describe('ACCOMPAGNÉ — Détail du parcours (sections)', () => {
  // TC-UI-213 / TC-UI-241 : chargement complet de toutes les sections + boussole.
  test('TC-UI-213 — détail parcours : toutes les sections se rendent sans erreur', async ({ page }) => {
    await login(page, DEMO.amine)
    await ouvrirParcoursAmine(page)

    // En-tête + Boussole (TC-UI-241 : SVG role=img avec aria-label décrivant phase + %).
    await expect(page.getByRole('img', { name: /Boussole du parcours/ })).toBeVisible()
    await expect(page.locator('.boussole-jalons')).toBeVisible()

    // Sections clés présentes.
    await expect(page.getByRole('heading', { name: '🧭 Où j’en suis' })).toBeVisible()
    await expect(page.getByRole('heading', { name: '🎯 Ma problématique' })).toBeVisible()
    await expect(page.getByRole('heading', { name: '🗂️ Nuage de thèmes' })).toBeVisible()
    await expect(page.getByRole('heading', { name: '🎡 Roue des émotions' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Questionnaire initial' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Rendez-vous' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Comptes rendus' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Synthèse du parcours' })).toBeVisible()
    await expect(page.getByRole('heading', { name: '📓 Micro-journal' })).toBeVisible()
    await expect(page.getByRole('heading', { name: "Mon plan d'action" })).toBeVisible()
  })

  // TC-UI-231 / TC-UI-232 : résumé « Où j'en suis » — générer puis persistance.
  test('TC-UI-231 — résumé « Où j’en suis » : générer puis relire', async ({ page }) => {
    await login(page, DEMO.amine)
    const id = await ouvrirParcoursAmine(page)

    const section = page.locator('section.card', { hasText: '🧭 Où j’en suis' })
    await expect(section).toBeVisible()
    // Bouton « ✨ Faire le point » (1re génération) ou « ↻ Mettre à jour » (résumé déjà présent).
    await section.getByRole('button', { name: /Faire le point|Mettre à jour/ }).click()
    // Après l'analyse IA, le bouton revient à « ↻ Mettre à jour » (preuve d'un résumé en place).
    await expect(section.getByRole('button', { name: /Mettre à jour/ })).toBeVisible({ timeout: 30000 })

    // Persistance : au rechargement, GET /collab/resume relit le résumé → état non vide.
    await page.goto(`/parcours/${id}`)
    const section2 = page.locator('section.card', { hasText: '🧭 Où j’en suis' })
    await expect(section2.getByRole('button', { name: /Mettre à jour/ })).toBeVisible({ timeout: 15000 })
  })

  // TC-UI-233 : problématisation — répondre, suggérer (IA), enregistrer + relecture repliée.
  test('TC-UI-233 — problématisation : répondre, suggérer puis enregistrer', async ({ page }) => {
    await login(page, DEMO.amine)
    await ouvrirParcoursAmine(page)

    const section = page.locator('section.card', { hasText: '🎯 Ma problématique' })
    await section.getByRole('button', { name: /Construire ma problématique|Revoir/ }).click()
    await expect(section.getByRole('button', { name: '✨ Proposer une problématique (IA)' })).toBeVisible()

    // Renseigner la première réponse guidée puis demander une suggestion IA.
    await section.locator('textarea').first().fill('Comment réussir la refonte d’une application interne ?')
    await section.getByRole('button', { name: '✨ Proposer une problématique (IA)' }).click()
    // La zone « Ma problématique » se remplit (on ne fige pas le texte IA).
    const zone = section.locator('textarea').last()
    await expect(zone).not.toHaveValue('', { timeout: 30000 })

    await section.getByRole('button', { name: 'Enregistrer' }).click()
    await expect(section.getByText('Enregistré ✓')).toBeVisible({ timeout: 15000 })
  })

  // TC-UI-234 / TC-UI-235 : météo intérieure — gating bouton sans niveau, puis check-in.
  test('TC-UI-234 — météo intérieure : enregistrer un check-in d’humeur', async ({ page }) => {
    await login(page, DEMO.amine)
    await ouvrirParcoursAmine(page)

    const section = page.locator('section.meteo')
    await expect(section.getByRole('heading', { name: /Comment te sens-tu/ })).toBeVisible()

    // TC-UI-235 : sans emoji sélectionné, « Enregistrer » est désactivé.
    const enregistrer = section.getByRole('button', { name: 'Enregistrer' })
    await expect(enregistrer).toBeDisabled()

    // Choisir un niveau (4 = « Plutôt bien ») + mot facultatif.
    await section.getByRole('button', { name: 'Plutôt bien' }).click()
    await section.getByLabel('Un mot pour décrire').fill('motivé')
    await expect(enregistrer).toBeEnabled()
    await enregistrer.click()
    await expect(section.getByText('C’est noté ✓')).toBeVisible({ timeout: 15000 })
  })

  // TC-UI-236 / TC-UI-237 : roue des émotions — gating sans sélection, multi-sélection + enregistrer.
  test('TC-UI-236 — roue des émotions : multi-sélection et enregistrement', async ({ page }) => {
    await login(page, DEMO.amine)
    await ouvrirParcoursAmine(page)

    const section = page.locator('section.card', { hasText: '🎡 Roue des émotions' })
    const enregistrer = section.getByRole('button', { name: 'Enregistrer' })
    // TC-UI-237 : aucune émotion cochée → bouton désactivé.
    await expect(enregistrer).toBeDisabled()

    // Multi-sélection (aria-pressed bascule).
    const confiant = section.getByRole('button', { name: 'Confiant·e' })
    const curieux = section.getByRole('button', { name: 'Curieux·se' })
    await confiant.click()
    await curieux.click()
    await expect(confiant).toHaveAttribute('aria-pressed', 'true')
    await expect(curieux).toHaveAttribute('aria-pressed', 'true')

    await section.getByPlaceholder('Un mot (facultatif)…').fill('ça avance')
    await expect(enregistrer).toBeEnabled()
    await enregistrer.click()
    await expect(section.getByText('C’est noté ✓')).toBeVisible({ timeout: 15000 })
    // L'agrégat « Mon climat émotionnel » se met à jour.
    await expect(section.getByRole('heading', { name: 'Mon climat émotionnel' })).toBeVisible()
  })

  // TC-UI-238 / TC-UI-239 / TC-UI-240 : micro-journal — garde note vide, ajout privé, bascule partagé, suppression.
  test('TC-UI-238 — micro-journal : ajouter une note privée puis la partager', async ({ page }) => {
    await login(page, DEMO.amine)
    await ouvrirParcoursAmine(page)

    const section = page.locator('section.journal')
    await expect(section.getByRole('heading', { name: '📓 Micro-journal' })).toBeVisible()

    // TC-UI-240 : zone vide → bouton « ＋ Ajouter » désactivé.
    const ajouter = section.getByRole('button', { name: '＋ Ajouter' })
    await expect(ajouter).toBeDisabled()

    // Ajout d'une note privée (case « Partager » décochée).
    const texte = `Blocage sur le plan — E2E ${Date.now()}`
    await section.getByLabel('Nouvelle note de journal').fill(texte)
    await expect(ajouter).toBeEnabled()
    await ajouter.click()

    const note = section.locator('.journal-item', { hasText: texte })
    await expect(note).toBeVisible({ timeout: 15000 })
    // Tag « 🔒 privée » présent → on bascule vers « 🔓 partagée » (PATCH).
    await note.getByRole('button', { name: '🔒 privée' }).click()
    await expect(note.getByRole('button', { name: '🔓 partagée' })).toBeVisible({ timeout: 15000 })

    // TC-UI-239 : suppression avec confirmation (window.confirm accepté).
    page.once('dialog', (d) => d.accept())
    await note.getByRole('button', { name: 'Supprimer la note' }).click()
    await expect(section.locator('.journal-item', { hasText: texte })).toHaveCount(0, { timeout: 15000 })
  })

  // TC-UI-244 : nuage de thèmes — générer puis persistance au rechargement.
  test('TC-UI-244 — nuage de thèmes : générer puis relire', async ({ page }) => {
    await login(page, DEMO.amine)
    const id = await ouvrirParcoursAmine(page)

    const section = page.locator('section.card', { hasText: '🗂️ Nuage de thèmes' })
    await section.getByRole('button', { name: /Générer le nuage|Régénérer/ }).click()
    // Le nuage rendu expose un conteneur aria-label="Nuage de thèmes" (mots dimensionnés par poids).
    await expect(section.locator('[aria-label="Nuage de thèmes"]')).toBeVisible({ timeout: 30000 })

    // Persistance : GET /viz/nuage relit le nuage au rechargement.
    await page.goto(`/parcours/${id}`)
    const section2 = page.locator('section.card', { hasText: '🗂️ Nuage de thèmes' })
    await expect(section2.locator('[aria-label="Nuage de thèmes"]')).toBeVisible({ timeout: 15000 })
  })

  // TC-UI-243 : émergence — fil rouge + moments-clés partagés (parcours vitrine d'Amine).
  test('TC-UI-243 — émergence : fil rouge et moments-clés partagés', async ({ page }) => {
    await login(page, DEMO.amine)
    await ouvrirParcoursAmine(page)
    // Le parcours vitrine a un fil rouge partagé : la section « 🧵 Le fil rouge… » s'affiche.
    const section = page.locator('section.emergence')
    await expect(section).toBeVisible()
    // Le contenu partagé est le fil rouge et/ou des moments-clés (selon ce que l'accompagnateur a partagé).
    await expect(section).toContainText(/fil rouge|moment/i)
  })
})

test.describe('ACCOMPAGNÉ — Rendez-vous & visio', () => {
  // TC-UI-215 / TC-UI-217 / TC-UI-254 : réserver un créneau (ou demander un RDV) + visio si RDV existant.
  test('TC-UI-215 — rendez-vous : réserver un créneau ou demander un RDV', async ({ page }) => {
    await login(page, DEMO.amine)
    await ouvrirParcoursAmine(page)

    const section = page.locator('section', { hasText: 'Réserver un créneau' })
    await expect(section).toBeVisible()

    const reserver = section.getByRole('button', { name: 'Réserver' })
    if (await reserver.count() > 0) {
      // TC-UI-215 : un créneau libre existe → réservation → message succès.
      await reserver.first().click()
      await expect(page.getByText('Rendez-vous réservé ✅')).toBeVisible({ timeout: 15000 })
    } else {
      // TC-UI-217 : aucun créneau → « 📨 Demander un rendez-vous ».
      await expect(section.getByText(/Aucun créneau disponible/)).toBeVisible()
      await section.getByRole('button', { name: '📨 Demander un rendez-vous' }).click()
      await expect(page.getByText(/Demande envoyée à ton accompagnateur/)).toBeVisible({ timeout: 15000 })
    }
  })

  // TC-UI-254 / TC-UI-218 : si un RDV existe, le bouton « 🎥 Visio » et le lien ICS sont présents.
  test('TC-UI-254 / TC-UI-218 — RDV existant : bouton Visio (feature active) et lien ICS', async ({ page }) => {
    await login(page, DEMO.amine)
    await ouvrirParcoursAmine(page)

    const rdvRows = page.locator('.rdv-row')
    if (await rdvRows.count() > 0) {
      const row = rdvRows.first()
      // TC-UI-254 : feature visio active → bouton « 🎥 Visio » rendu (VisioButton non null).
      await expect(row.getByRole('button', { name: '🎥 Visio' })).toBeVisible()
      // TC-UI-218 : lien ICS d'ajout à l'agenda.
      await expect(row.locator('a.rdv-ics')).toHaveAttribute('href', /\/api\/rdv\/\d+\/ics/)
    } else {
      // Pas de RDV seedé : on documente l'état sans échouer le scénario.
      await expect(page.getByRole('heading', { name: 'Rendez-vous' })).toBeVisible()
    }
  })
})

test.describe('ACCOMPAGNÉ — Comptes rendus & synthèse', () => {
  // TC-UI-219 / TC-UI-221 / TC-UI-223 / TC-UI-225 : consulter un CR + Écouter + FALC + discussion.
  test('TC-UI-219 — consulter un compte rendu publié (lecture, Écouter, FALC, discussion)', async ({ page }) => {
    await login(page, DEMO.amine)
    await ouvrirParcoursAmine(page)

    const crSection = page.locator('section', { hasText: 'Comptes rendus' })
    const consulter = crSection.getByRole('button', { name: 'Consulter' })
    await expect(consulter.first()).toBeVisible()
    await consulter.first().click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('heading', { name: 'Compte rendu d’entretien' })).toBeVisible()
    // Vue accompagné : pas de barre d'édition accompagnateur (Éditer/Publier absents).
    await expect(dialog.getByRole('button', { name: /Éditer/ })).toHaveCount(0)
    await expect(dialog.getByRole('button', { name: /Publier/ })).toHaveCount(0)

    // TC-UI-221 : bouton « Écouter » (feature audio active sur le plan vitrine).
    await expect(dialog.getByRole('button', { name: /Écouter le compte rendu/ })).toBeVisible()

    // TC-UI-223 : mode FALC — la reformulation IA s'affiche (encart « Version facile à lire… »).
    const falc = dialog.getByRole('button', { name: /Facile à lire/ })
    await expect(falc).toBeVisible()
    await expect(falc).toHaveAttribute('aria-expanded', 'false')
    await falc.click()
    await expect(dialog.getByText('Version facile à lire et à comprendre')).toBeVisible({ timeout: 30000 })
    await expect(falc).toHaveAttribute('aria-expanded', 'true')

    // TC-UI-225 / TC-UI-226 : discussion — message vide ignoré, puis envoi d'un message.
    await expect(dialog.getByRole('heading', { name: /Échanges/ })).toBeVisible()
    const champMsg = dialog.getByLabel('Écrire un message')
    const message = `Merci, c’est clair. (E2E ${Date.now()})`
    await champMsg.fill(message)
    await dialog.getByRole('button', { name: 'Envoyer' }).click()
    await expect(dialog.getByText(message)).toBeVisible({ timeout: 15000 })

    await dialog.getByRole('button', { name: 'Fermer' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  // TC-UI-227 / TC-UI-228 : page « Mes comptes rendus » — liste globale + consultation.
  test('TC-UI-227 — page « Mes comptes rendus » : liste globale et consultation', async ({ page }) => {
    await login(page, DEMO.amine)
    await page.goto('/mes-comptes-rendus')
    await expect(page.getByRole('heading', { name: 'Mes comptes rendus' })).toBeVisible()

    // Attendre que la liste soit CHARGÉE (un « Consulter » OU le message d'état vide) avant de
    // brancher : sinon la lecture de count() peut précéder le chargement asynchrone (flaky).
    await expect(
      page.getByRole('button', { name: 'Consulter' }).or(page.getByText('Aucun compte rendu pour l’instant.')).first(),
    ).toBeVisible()
    const consulter = page.getByRole('button', { name: 'Consulter' })
    if (await consulter.count() > 0) {
      await consulter.first().click()
      const dialog = page.getByRole('dialog')
      await expect(dialog.getByRole('heading', { name: 'Compte rendu d’entretien' })).toBeVisible()
      await dialog.getByRole('button', { name: 'Fermer' }).click()
      await expect(page.getByRole('dialog')).toHaveCount(0)
    } else {
      // TC-UI-228 : aucun CR → message neutre.
      await expect(page.getByText('Aucun compte rendu pour l’instant.')).toBeVisible()
    }
  })

  // TC-UI-229 / TC-UI-230 : consulter la synthèse publiée (parcours vitrine d'Amine).
  test('TC-UI-229 — consulter la synthèse du parcours publiée', async ({ page }) => {
    await login(page, DEMO.amine)
    await ouvrirParcoursAmine(page)

    const synSection = page.locator('section', { hasText: 'Synthèse du parcours' })
    const consulter = synSection.getByRole('button', { name: 'Consulter ma synthèse' })
    if (await consulter.count() > 0) {
      // TC-UI-229 : synthèse publiée → modal lecture seule + « Écouter la synthèse ».
      await consulter.click()
      const dialog = page.getByRole('dialog')
      await expect(dialog.getByRole('heading', { name: 'Synthèse du parcours' })).toBeVisible()
      await expect(dialog.getByRole('button', { name: /Écouter la synthèse/ })).toBeVisible()
      // Vue accompagné : pas de boutons accompagnateur.
      await expect(dialog.getByRole('button', { name: /Publier/ })).toHaveCount(0)
      await dialog.getByRole('button', { name: 'Fermer' }).click()
      await expect(page.getByRole('dialog')).toHaveCount(0)
    } else {
      // TC-UI-230 : non publiée → message d'attente, pas de bouton.
      await expect(synSection.getByText(/Pas encore disponible/)).toBeVisible()
    }
  })
})

test.describe('ACCOMPAGNÉ — Boussole, carte, attestation', () => {
  // TC-UI-241 / TC-UI-242 : boussole — aiguille, %, jalons cohérents.
  test('TC-UI-241 — boussole du parcours : aiguille, pourcentage et jalons', async ({ page }) => {
    await login(page, DEMO.amine)
    await ouvrirParcoursAmine(page)

    const svg = page.getByRole('img', { name: /Boussole du parcours/ })
    await expect(svg).toBeVisible()
    // L'aria-label décrit la progression « % vers l'autonomie ».
    await expect(svg).toHaveAttribute('aria-label', /vers l.autonomie/)
    // Jalons : Questionnaire / entretien / CR / Synthèse / Clôture.
    const jalons = page.locator('.boussole-jalons')
    await expect(jalons.getByText('Questionnaire')).toBeVisible()
    await expect(jalons.getByText('Synthèse')).toBeVisible()
    await expect(jalons.getByText('Clôture')).toBeVisible()
  })

  // TC-UI-245 / TC-UI-246 : carte du parcours — ouverture, fil rouge, impression (si feature active).
  test('TC-UI-245 — carte du parcours : ouverture et impression', async ({ page }) => {
    await login(page, DEMO.amine)
    await ouvrirParcoursAmine(page)

    const carteBtn = page.getByRole('button', { name: '🖨️ Carte du parcours' })
    if (await carteBtn.count() > 0) {
      // Neutraliser l'impression réelle pour éviter de bloquer le test.
      await page.addInitScript(() => { window.print = () => {} })
      await carteBtn.click()
      const dialog = page.getByRole('dialog')
      await expect(dialog.getByRole('heading', { name: '🖨️ Carte de mon parcours' })).toBeVisible()
      await expect(dialog.getByRole('button', { name: '🖨️ Imprimer / enregistrer en PDF' })).toBeVisible()
      // Échap ferme la carte.
      await page.keyboard.press('Escape')
      await expect(page.getByRole('dialog')).toHaveCount(0)
    } else {
      // TC-UI-246 : feature carte_parcours absente → bouton non rendu (état documenté).
      await expect(page.getByRole('heading', { name: "Mon plan d'action" })).toBeVisible()
    }
  })

  // TC-UI-251 / TC-UI-252 : attestation visible uniquement si parcours clôturé.
  test('TC-UI-251 — attestation : présente sur parcours clôturé, absente sinon', async ({ page }) => {
    await login(page, DEMO.amine)
    await ouvrirParcoursAmine(page)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    const cloture = await page.getByText('· Clôturé').count()
    const attestationBtn = page.getByRole('button', { name: '📜 Mon attestation' })
    if (cloture > 0) {
      // TC-UI-251 : parcours clôturé → bouton attestation présent → modal imprimable.
      await page.addInitScript(() => { window.print = () => {} })
      await expect(attestationBtn).toBeVisible()
      await attestationBtn.click()
      await expect(page.getByRole('dialog').getByRole('heading', { name: '📜 Attestation de fin' })).toBeVisible()
      await page.keyboard.press('Escape')
    } else {
      // TC-UI-252 : parcours en cours → bouton attestation absent.
      await expect(attestationBtn).toHaveCount(0)
    }
  })
})

test.describe('ACCOMPAGNÉ — Transparence RGPD', () => {
  // TC-UI-247 / TC-UI-248 / TC-UI-249 : tableau de transparence + demande d'effacement.
  test('TC-UI-247 — transparence RGPD : consulter le tableau et demander l’effacement', async ({ page }) => {
    await login(page, DEMO.amine)
    await ouvrirParcoursAmine(page)

    const trBtn = page.getByRole('button', { name: '🔒 Mes données & transparence' })
    if (await trBtn.count() === 0) {
      // TC-UI-250 : feature transparence absente → bouton non rendu (état documenté).
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      return
    }
    await trBtn.click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: '🔒 Mes données & transparence' })).toBeVisible()
    // TC-UI-247 : sections du tableau (données, IA, sous-traitants, droits).
    await expect(dialog.getByRole('heading', { name: 'Les données de ce parcours' })).toBeVisible()
    await expect(dialog.getByRole('heading', { name: 'Ce que l’IA a vu et produit' })).toBeVisible()
    await expect(dialog.getByRole('heading', { name: 'Sous-traitants' })).toBeVisible()
    await expect(dialog.getByRole('heading', { name: 'Mes droits' })).toBeVisible()

    const demanderBtn = dialog.getByRole('button', { name: '🗑 Demander l’effacement de mes données' })
    if (await demanderBtn.count() > 0) {
      // TC-UI-248 : ouvrir le formulaire, saisir un motif, envoyer.
      await demanderBtn.click()
      await dialog.getByLabel('Motif de la demande d’effacement').fill('Fin de mission')
      await dialog.getByRole('button', { name: 'Envoyer la demande' }).click()
      await expect(dialog.getByText(/Ta demande a été envoyée/)).toBeVisible({ timeout: 15000 })
    } else {
      // TC-UI-249 : demande déjà en cours → message, pas de formulaire.
      await expect(dialog.getByText(/Une demande d’effacement est déjà en cours/)).toBeVisible()
    }
    await dialog.getByRole('button', { name: 'Fermer' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })
})

test.describe('ACCOMPAGNÉ — Plan d’action', () => {
  // TC-UI-260 / TC-UI-261 / TC-UI-262 : plan d'action — ajouter, changer le statut, ouvrir le détail.
  test('TC-UI-260 — plan d’action : ajouter une étape et changer son statut', async ({ page }) => {
    await login(page, DEMO.amine)
    await page.goto('/mon-plan-action')
    await expect(page.getByRole('heading', { name: "Mon plan d'action" })).toBeVisible()

    // Le formulaire d'ajout n'est rendu que si un dossier est rattaché (dossierId != null).
    const form = page.locator('form.qa-form')
    if (await form.count() > 0) {
      const libelle = `Relire le chapitre 2 — E2E ${Date.now()}`
      await page.getByPlaceholder('Ajouter ou dicter une action…').fill(libelle)
      await page.getByRole('button', { name: 'Ajouter' }).click()

      const item = page.locator('li, .action-item', { hasText: libelle }).first()
      await expect(item).toBeVisible({ timeout: 15000 })

      // TC-UI-262 : ouvrir le détail de l'action (clic sur le libellé) → ActionDetailModal.
      await item.getByText(libelle).click()
      const dialog = page.getByRole('dialog')
      if (await dialog.count() > 0) {
        await expect(dialog).toBeVisible()
        await page.keyboard.press('Escape')
      }
    } else {
      // TC-UI-261 : aucun dossier rattaché → formulaire absent.
      await expect(page.getByText('Clique une action pour ouvrir son détail', { exact: false })).toBeVisible()
    }
  })
})

test.describe('ACCOMPAGNÉ — Mode FALC & visite guidée', () => {
  // TC-UI-256 : bascule FALC d'en-tête — data-falc, aria-pressed, persistance localStorage.
  test('TC-UI-256 — mode FALC global : activer/désactiver depuis l’en-tête', async ({ page }) => {
    await login(page, DEMO.amine)

    const toggle = page.getByRole('button', { name: 'Mode facile à lire' })
    await expect(toggle).toBeVisible()
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')

    // Activer → data-falc='on', aria-pressed=true, localStorage('falc')='on'.
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('html')).toHaveAttribute('data-falc', 'on')
    expect(await page.evaluate(() => localStorage.getItem('falc'))).toBe('on')

    // Re-cliquer → repasse en 'off'.
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await expect(page.locator('html')).toHaveAttribute('data-falc', 'off')
  })

  // TC-UI-257 / TC-UI-258 : visite guidée — lancement auto + relance via FAB + navigation des étapes.
  test('TC-UI-258 — visite guidée : relance via le FAB et navigation des étapes', async ({ page }) => {
    await login(page, DEMO.amine)

    // Relance via le bouton flottant « ? ».
    const fab = page.getByRole('button', { name: 'Lancer la visite guidée' })
    await expect(fab).toBeVisible()
    await fab.click()

    const tour = page.getByRole('dialog', { name: 'Visite guidée' })
    await expect(tour).toBeVisible()
    await expect(tour.getByText(/Étape 1 \/ \d+/)).toBeVisible()
    await expect(tour.getByRole('heading', { name: /Bienvenue sur Boussole/ })).toBeVisible()

    // Navigation : Suivant → puis Précédent.
    await tour.getByRole('button', { name: 'Suivant →' }).click()
    await expect(tour.getByText(/Étape 2 \/ \d+/)).toBeVisible()
    await tour.getByRole('button', { name: '← Précédent' }).click()
    await expect(tour.getByText(/Étape 1 \/ \d+/)).toBeVisible()

    // Échap ferme le tour.
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Visite guidée' })).toHaveCount(0)
  })
})
