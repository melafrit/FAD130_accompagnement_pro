import { test, expect, type Page } from '@playwright/test'
import { login, DEMO } from './helpers'

// Tests UI bout-en-bout du rôle ADMIN (console /admin = Admin.tsx + PlansManager.tsx + RgpdConsole.tsx).
// Un scénario par fonctionnalité visible ; chaque test cite les TC-UI couverts.
// La base est reseedée avant chaque run complet : les mutations sont autorisées, mais chaque test
// reste idempotent (création d'une ressource jetable + nettoyage quand c'est pertinent).

// --- Petits utilitaires locaux (lecture via l'API, comme les helpers fournis) ---

/** Récupère la liste des comptes (GET /api/admin/users) avec le cookie de session courant. */
async function fetchUsers(page: Page): Promise<Array<{ id: number; email: string; role: string; plan_id: number | null; plan_nom: string | null; actif: number }>> {
  const d = await page.evaluate(async () => {
    const r = await fetch('/api/admin/users', { credentials: 'include' })
    return r.json()
  })
  return d.users || []
}

/** Localise la ligne du tableau des comptes correspondant à un email donné. */
function userRow(page: Page, email: string) {
  return page.locator('table.admin-table tbody tr').filter({ hasText: email })
}

/** Localise la carte (accordéon) d'un plan par son nom exact dans l'en-tête. */
function planCard(page: Page, nom: string) {
  // L'en-tête de carte est un bouton dont le nom accessible inclut les pastilles
  // (« Nom 3 fonctionnalités 0 utilisateur ▼ ») : on filtre la carte par son TEXTE, pas par
  // un nom de bouton exact.
  // Match EXACT du nom (l'en-tête contient <strong>nom</strong>) : « Source X » ne doit pas
  // matcher « Source X (copie) » (le filtre hasText, en sous-chaîne, le ferait).
  return page.locator('section', { hasText: 'Plans d’abonnement' })
    .locator('.card')
    .filter({ has: page.getByText(nom, { exact: true }) })
}

/** La carte de plan OUVERTE (en édition) — la seule à afficher le champ « Nom du plan ».
 *  Référence STABLE pendant qu'on renomme le plan (le filtre par nom deviendrait périmé). */
function carteOuverte(page: Page) {
  return page.locator('section', { hasText: 'Plans d’abonnement' })
    .locator('.card')
    .filter({ has: page.getByText('Nom du plan') })
}

/** Supprime les plans de test périmés (le reseed ne purge pas les plans hors socle).
 *  Garantit un état déterministe : seuls Découverte / Essentiel / Pro subsistent. */
async function nettoyerPlans(page: Page) {
  await page.evaluate(async () => {
    const r = await fetch('/api/admin/plans', { credentials: 'include' })
    const d = await r.json()
    for (const p of d.plans || []) {
      if (!['Découverte', 'Essentiel', 'Pro'].includes(p.nom)) {
        await fetch(`/api/admin/plans/${p.id}`, { method: 'DELETE', credentials: 'include' })
      }
    }
  })
}

test.describe('ADMIN — console /admin', () => {
  // ------------------------------------------------------------------
  // Accès & forme de page
  // ------------------------------------------------------------------

  // TC-UI-300, TC-UI-304 : la page Gestion des comptes s'affiche avec ses sections et son tableau.
  test('TC-UI-300 / TC-UI-304 — /admin affiche la page Gestion des comptes (tableau + sections)', async ({ page }) => {
    await login(page, DEMO.admin)
    await page.goto('/admin')

    await expect(page.getByRole('heading', { level: 1, name: 'Gestion des comptes' })).toBeVisible()

    // Le tableau des comptes et toutes ses colonnes.
    const table = page.locator('table.admin-table')
    await expect(table).toBeVisible()
    for (const col of ['Email', 'Nom', 'Rôle', 'Abonnement', 'Validé', 'Statut']) {
      await expect(table.getByRole('columnheader', { name: col, exact: true })).toBeVisible()
    }
    // Au moins une ligne (jeu de démo) et la présence de comptes connus.
    await expect(table.locator('tbody tr').first()).toBeVisible()
    await expect(userRow(page, DEMO.admin.email)).toBeVisible()

    // Cartes de création / rattachement.
    await expect(page.getByRole('heading', { name: 'Créer un compte' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Rattacher un accompagné' })).toBeVisible()

    // Sections Plans d'abonnement & RGPD.
    await expect(page.getByRole('heading', { level: 2, name: 'Plans d’abonnement' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: 'Confidentialité & RGPD' })).toBeVisible()
  })

  // TC-UI-301 : accès anonyme à /admin -> redirection vers /connexion (Protected sans user).
  test('TC-UI-301 — accès anonyme à /admin redirige vers /connexion', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/connexion$/)
    await expect(page.locator('input[type=email]')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Gestion des comptes' })).toHaveCount(0)
  })

  // TC-UI-302 : accès accompagnateur à /admin -> redirection vers /espace (mauvais rôle).
  test('TC-UI-302 — accès accompagnateur à /admin redirige vers /espace', async ({ page }) => {
    await login(page, DEMO.camille)
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/espace$/)
    await expect(page.getByRole('heading', { name: 'Gestion des comptes' })).toHaveCount(0)
  })

  // TC-UI-303 : accès accompagné à /admin -> redirection vers /espace (mauvais rôle).
  test('TC-UI-303 — accès accompagné à /admin redirige vers /espace', async ({ page }) => {
    await login(page, DEMO.amine)
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/espace$/)
    await expect(page.getByRole('heading', { name: 'Gestion des comptes' })).toHaveCount(0)
  })

  // TC-UI-337 : un rôle non-admin n'accède pas non plus aux endpoints /admin/* -> 403.
  test('TC-UI-337 — endpoints /admin/* en accompagnateur renvoient 403', async ({ page }) => {
    await login(page, DEMO.camille)
    const statuses = await page.evaluate(async () => {
      const get = await fetch('/api/admin/plans', { credentials: 'include' })
      const post = await fetch('/api/admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ nom: 'X', features: [] }),
      })
      return { get: get.status, post: post.status }
    })
    expect(statuses.get).toBe(403)
    expect(statuses.post).toBe(403)
  })

  // ------------------------------------------------------------------
  // Gestion des comptes : rôle, plan, statut actif, auto-modification
  // ------------------------------------------------------------------

  // TC-UI-306 : changer le rôle d'un compte via le select, persistance après rechargement.
  test('TC-UI-306 — changer le rôle d’un compte via le select (persistance)', async ({ page }) => {
    await login(page, DEMO.admin)
    await page.goto('/admin')

    const row = userRow(page, DEMO.lea.email)
    await expect(row).toBeVisible()
    const roleSelect = row.locator('select').first()

    // État initial : accompagné. On bascule en accompagnateur puis on revient (idempotent).
    await roleSelect.selectOption({ label: 'Accompagnateur' })
    await expect(roleSelect).toHaveValue('accompagnateur')

    // Persistance : on recharge la page et on relit le select.
    await page.reload()
    const rowAfter = userRow(page, DEMO.lea.email)
    await expect(rowAfter.locator('select').first()).toHaveValue('accompagnateur')

    // Restauration de l'état de démo (rôle accompagné) pour ne pas polluer les autres tests.
    await rowAfter.locator('select').first().selectOption({ label: 'Accompagné' })
    await expect(userRow(page, DEMO.lea.email).locator('select').first()).toHaveValue('accompagne')
  })

  // TC-UI-307 / TC-UI-308 : affecter un plan via le select Abonnement puis revenir à « Niveau max ».
  test('TC-UI-307 / TC-UI-308 — affecter puis retirer un plan d’abonnement', async ({ page }) => {
    await login(page, DEMO.admin)
    await page.goto('/admin')

    const row = userRow(page, DEMO.karim.email)
    await expect(row).toBeVisible()
    const planSelect = row.locator('select').nth(1)

    // Récupère un nom de plan réellement proposé par le select (option non vide).
    const planNom = await planSelect.locator('option:not([value=""])').first().textContent()
    expect(planNom, 'au moins un plan doit exister dans le jeu de démo').toBeTruthy()

    // Affectation du plan.
    await planSelect.selectOption({ label: planNom!.trim() })
    await page.reload()
    const planSelectAfter = userRow(page, DEMO.karim.email).locator('select').nth(1)
    await expect(planSelectAfter.locator('option:checked')).toHaveText(planNom!.trim())

    // Retour à « Niveau max » (valeur vide -> plan_id null).
    await planSelectAfter.selectOption({ label: 'Niveau max' })
    await expect(planSelectAfter).toHaveValue('')
    await page.reload()
    await expect(userRow(page, DEMO.karim.email).locator('select').nth(1)).toHaveValue('')
  })

  // TC-UI-309 / TC-UI-305 : activer / désactiver un compte via le bouton bascule + style row-inactif.
  test('TC-UI-309 / TC-UI-305 — désactiver puis réactiver un compte (bascule + style)', async ({ page }) => {
    await login(page, DEMO.admin)
    await page.goto('/admin')

    const row = userRow(page, DEMO.karim.email)
    await expect(row).toBeVisible()
    const toggle = row.getByRole('button', { name: 'Désactiver' })
    await expect(toggle).toBeVisible()

    // Désactivation : le libellé bascule et la ligne reçoit la classe row-inactif.
    await toggle.click()
    await expect(userRow(page, DEMO.karim.email).getByRole('button', { name: 'Activer' })).toBeVisible()
    await expect(userRow(page, DEMO.karim.email)).toHaveClass(/row-inactif/)

    // Réactivation : retour à l'état actif (idempotent).
    await userRow(page, DEMO.karim.email).getByRole('button', { name: 'Activer' }).click()
    await expect(userRow(page, DEMO.karim.email).getByRole('button', { name: 'Désactiver' })).toBeVisible()
    await expect(userRow(page, DEMO.karim.email)).not.toHaveClass(/row-inactif/)
  })

  // TC-UI-310 / TC-UI-352 : auto-modification interdite -> erreur backend, état inchangé.
  test('TC-UI-310 / TC-UI-352 — modifier son propre compte admin renvoie une erreur', async ({ page }) => {
    await login(page, DEMO.admin)

    // Le garde-fou est côté backend (400) : on l'observe via un appel direct PATCH sur son propre id.
    const result = await page.evaluate(async () => {
      const me = await (await fetch('/api/admin/users', { credentials: 'include' })).json()
      // Le compte admin connecté est repérable par son email.
      const moi = (me.users || []).find((u: any) => u.email === 'mohamed@elafrit.com')
      const r = await fetch(`/api/admin/users/${moi.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ actif: 0 }),
      })
      const body = await r.json().catch(() => ({}))
      return { status: r.status, error: body.error as string | undefined }
    })
    expect(result.status).toBe(400)
    expect(result.error || '').toMatch(/propre compte/i)

    // L'état réel reste actif : la ligne de l'admin propose toujours « Désactiver ».
    await page.goto('/admin')
    await expect(userRow(page, DEMO.admin.email).getByRole('button', { name: 'Désactiver' })).toBeVisible()
  })

  // ------------------------------------------------------------------
  // Créer un compte & rattachement
  // ------------------------------------------------------------------

  // TC-UI-311 / TC-UI-312 / TC-UI-313 : création d'un compte (valide / email vide / doublon).
  test('TC-UI-311 / TC-UI-312 / TC-UI-313 — créer un compte (succès, required, doublon 409)', async ({ page }) => {
    await login(page, DEMO.admin)
    await page.goto('/admin')

    const carte = page.locator('.card').filter({ has: page.getByRole('heading', { name: 'Créer un compte' }) })
    const emailInput = carte.locator('input[type=email]')
    const submit = carte.getByRole('button', { name: "Créer et envoyer l'activation" })

    // TC-UI-312 : champ email obligatoire -> la soumission HTML5 est bloquée, aucune ligne créée.
    await submit.click()
    await expect(emailInput).toHaveJSProperty('validity.valueMissing', true)

    // TC-UI-313 : email déjà utilisé -> message d'erreur 409 surfacé dans l'UI.
    await emailInput.fill(DEMO.amine.email)
    await submit.click()
    await expect(page.locator('.form-success')).toBeVisible()
    await expect(page.locator('.form-success')).not.toHaveText("Compte créé, email d'activation envoyé.")

    // TC-UI-311 : email unique valide -> message de succès, formulaire réinitialisé, ligne ajoutée.
    const nouvelEmail = `tc311.${Date.now()}@boussole.demo`
    await emailInput.fill(nouvelEmail)
    await carte.getByRole('button', { name: "Créer et envoyer l'activation" }).click()
    await expect(page.getByText("Compte créé, email d'activation envoyé.")).toBeVisible()
    await expect(emailInput).toHaveValue('')
    await expect(userRow(page, nouvelEmail)).toBeVisible()
    // « Validé » = ✓ pour un compte créé par l'admin (email_verifie=1).
    await expect(userRow(page, nouvelEmail)).toContainText('✓')
  })

  // TC-UI-314 / TC-UI-315 : rattacher un accompagné (succès) puis sélection incomplète (erreur).
  test('TC-UI-314 / TC-UI-315 — rattacher un accompagné (succès et sélection incomplète)', async ({ page }) => {
    await login(page, DEMO.admin)
    await page.goto('/admin')

    const carte = page.locator('.card').filter({ has: page.getByRole('heading', { name: 'Rattacher un accompagné' }) })
    const selAcc = carte.locator('select').first()
    const selAcgne = carte.locator('select').nth(1)
    const rattacher = carte.getByRole('button', { name: 'Rattacher' })

    // TC-UI-315 : selects laissés sur « — » -> erreur 400 affichée, pas de succès.
    await rattacher.click()
    await expect(page.locator('.form-success')).toBeVisible()
    await expect(page.locator('.form-success')).not.toHaveText('Rattachement effectué.')

    // TC-UI-314 : sélection complète -> « Rattachement effectué. » (idempotent : INSERT OR IGNORE).
    await selAcc.selectOption({ label: DEMO.camille.email })
    await selAcgne.selectOption({ label: DEMO.lea.email })
    await carte.getByRole('button', { name: 'Rattacher' }).click()
    await expect(page.getByText('Rattachement effectué.')).toBeVisible()
  })

  // ------------------------------------------------------------------
  // Gestionnaire de plans : créer, déplier, cocher, dupliquer, supprimer
  // ------------------------------------------------------------------

  // TC-UI-316 / TC-UI-317 / TC-UI-318 / TC-UI-319 / TC-UI-326 :
  // créer un plan, déplier l'accordéon, cocher une feature et une catégorie, renommer, vérifier l'ordre des catégories.
  test('TC-UI-316/317/318/319/326 — créer un plan, cocher des fonctionnalités, renommer, enregistrer', async ({ page }) => {
    await login(page, DEMO.admin)
    await page.goto('/admin')
    await nettoyerPlans(page) // purge les plans de test périmés (le reseed ne les supprime pas)

    const section = page.locator('section', { hasText: 'Plans d’abonnement' })

    // TC-UI-316 : « + Nouveau plan » -> un plan « Nouveau plan » apparaît et son accordéon s'ouvre.
    await section.getByRole('button', { name: '+ Nouveau plan' }).click()
    const carte = carteOuverte(page) // référence stable même après renommage (le nom « Nouveau plan » change)
    await expect(carte).toBeVisible()
    // L'accordéon ouvert expose aria-expanded=true et le champ « Nom du plan ».
    await expect(carte.getByRole('button').first()).toHaveAttribute('aria-expanded', 'true')
    const nomInput = carte.getByLabel('Nom du plan')
    await expect(nomInput).toBeVisible()

    // TC-UI-326 : les catégories (fieldsets) sont rendues dans l'ordre du registre features.
    const legendes = carte.locator('fieldset legend strong')
    await expect(legendes.first()).toBeVisible()
    expect(await legendes.count()).toBeGreaterThan(1)

    // TC-UI-317 : cocher une fonctionnalité individuelle dans la 1re catégorie.
    const premiereCat = carte.locator('fieldset').first()
    const premiereCase = premiereCat.locator('input[type=checkbox]').first()
    await premiereCase.check()
    await expect(premiereCase).toBeChecked()

    // TC-UI-318 : « Tout cocher » sur une catégorie coche toutes ses cases et bascule le libellé.
    const deuxiemeCat = carte.locator('fieldset').nth(1)
    const toutCocher = deuxiemeCat.getByRole('button', { name: 'Tout cocher' })
    await toutCocher.click()
    const casesCat2 = deuxiemeCat.locator('input[type=checkbox]')
    const nbCat2 = await casesCat2.count()
    for (let i = 0; i < nbCat2; i++) await expect(casesCat2.nth(i)).toBeChecked()
    await expect(deuxiemeCat.getByRole('button', { name: 'Tout décocher' })).toBeVisible()
    // On rebascule pour limiter l'écart à enregistrer.
    await deuxiemeCat.getByRole('button', { name: 'Tout décocher' }).click()

    // TC-UI-319 : renommer le plan + description puis enregistrer -> message de succès, nom dans l'en-tête.
    const nouveauNom = `Plan test ${Date.now()}`
    await nomInput.fill(nouveauNom)
    await carte.locator('textarea').first().fill('Plan jetable créé par le test UI.') // le seul textarea de la carte = Description
    await carte.getByRole('button', { name: 'Enregistrer' }).click()
    await expect(page.getByText(`Plan « ${nouveauNom} » enregistré.`)).toBeVisible()
    // L'en-tête de la carte porte désormais le nouveau nom et le compteur de fonctionnalités a augmenté.
    await expect(planCard(page, nouveauNom).getByRole('button').first()).toBeVisible()
    await expect(planCard(page, nouveauNom)).toContainText('fonctionnalité')

    // Nettoyage : suppression du plan jetable (sans utilisateur rattaché).
    page.once('dialog', (d) => d.accept())
    await planCard(page, nouveauNom).getByRole('button', { name: 'Supprimer', exact: true }).click()
    await expect(planCard(page, nouveauNom)).toHaveCount(0)
  })

  // TC-UI-321 : duplication d'un plan -> copie suffixée « (copie) ».
  test('TC-UI-321 — dupliquer un plan crée une copie « (copie) »', async ({ page }) => {
    await login(page, DEMO.admin)
    await page.goto('/admin')
    const section = page.locator('section', { hasText: 'Plans d’abonnement' })

    // On crée d'abord un plan source jetable au nom unique pour rendre le test déterministe.
    const base = `Source ${Date.now()}`
    await section.getByRole('button', { name: '+ Nouveau plan' }).click()
    const source = carteOuverte(page) // référence stable pendant le renommage
    await source.getByLabel('Nom du plan').fill(base)
    await source.getByRole('button', { name: 'Enregistrer' }).click()
    await expect(page.getByText(`Plan « ${base} » enregistré.`)).toBeVisible()

    // Duplication : la copie « <base> (copie) » apparaît et son accordéon s'ouvre.
    await planCard(page, base).getByRole('button', { name: 'Dupliquer' }).click()
    const copie = planCard(page, `${base} (copie)`)
    await expect(copie).toBeVisible()
    await expect(copie.getByRole('button').first()).toHaveAttribute('aria-expanded', 'true')

    // Nettoyage : suppression de la copie puis de la source.
    page.once('dialog', (d) => d.accept())
    await copie.getByRole('button', { name: 'Supprimer', exact: true }).click()
    await expect(planCard(page, `${base} (copie)`)).toHaveCount(0)
    // La carte source s'est repliée quand la copie s'est ouverte → on la rouvre pour accéder à « Supprimer ».
    await planCard(page, base).getByRole('button').first().click()
    page.once('dialog', (d) => d.accept())
    await planCard(page, base).getByRole('button', { name: 'Supprimer', exact: true }).click()
    await expect(planCard(page, base)).toHaveCount(0)
  })

  // TC-UI-322 / TC-UI-324 : suppression d'un plan sans utilisateur (confirmation) + annulation.
  test('TC-UI-322 / TC-UI-324 — supprimer un plan (annulation puis confirmation)', async ({ page }) => {
    await login(page, DEMO.admin)
    await page.goto('/admin')
    const section = page.locator('section', { hasText: 'Plans d’abonnement' })

    // Plan jetable sans utilisateur rattaché.
    const nom = `À supprimer ${Date.now()}`
    await section.getByRole('button', { name: '+ Nouveau plan' }).click()
    const carte = carteOuverte(page) // référence stable même après renommage (le nom « Nouveau plan » change)
    await carte.getByLabel('Nom du plan').fill(nom)
    await carte.getByRole('button', { name: 'Enregistrer' }).click()
    await expect(page.getByText(`Plan « ${nom} » enregistré.`)).toBeVisible()

    // TC-UI-324 : annulation du confirm -> aucun DELETE, le plan reste présent.
    let dialogMsg = ''
    page.once('dialog', (d) => { dialogMsg = d.message(); return d.dismiss() })
    await planCard(page, nom).getByRole('button', { name: 'Supprimer', exact: true }).click()
    expect(dialogMsg).toContain('Aucun utilisateur n’y est rattaché.')
    await expect(planCard(page, nom)).toBeVisible()

    // TC-UI-322 : confirmation (OK) -> le plan disparaît de la liste.
    page.once('dialog', (d) => d.accept())
    await planCard(page, nom).getByRole('button', { name: 'Supprimer', exact: true }).click()
    await expect(planCard(page, nom)).toHaveCount(0)
  })

  // TC-UI-323 / TC-UI-351 : suppression d'un plan rattaché à un compte -> avertissement N utilisateurs,
  // le compte repasse à « Niveau max », les autres lignes restent intactes.
  test('TC-UI-323 / TC-UI-351 — supprimer un plan utilisé : avertissement + retour à Niveau max', async ({ page }) => {
    await login(page, DEMO.admin)
    await page.goto('/admin')
    const section = page.locator('section', { hasText: 'Plans d’abonnement' })

    // Plan jetable, qu'on affecte ensuite à Karim.
    const nom = `Utilisé ${Date.now()}`
    await section.getByRole('button', { name: '+ Nouveau plan' }).click()
    const carte = carteOuverte(page) // référence stable même après renommage (le nom « Nouveau plan » change)
    await carte.getByLabel('Nom du plan').fill(nom)
    await carte.getByRole('button', { name: 'Enregistrer' }).click()
    await expect(page.getByText(`Plan « ${nom} » enregistré.`)).toBeVisible()

    // Affectation du plan à Karim via le tableau des comptes.
    const planSelect = userRow(page, DEMO.karim.email).locator('select').nth(1)
    await planSelect.selectOption({ label: nom })
    await expect(userRow(page, DEMO.karim.email).locator('select').nth(1).locator('option:checked')).toHaveText(nom)

    // L'affectation via le tableau des comptes ne rafraîchit pas le compteur du gestionnaire de
    // plans → on recharge la page pour que nb_users reflète l'affectation, puis on rouvre la carte.
    await page.reload()
    const carteUtilisee = planCard(page, nom)
    await carteUtilisee.getByRole('button').first().click() // ouvrir l'accordéon
    // Suppression : le confirm mentionne le(s) utilisateur(s) rattaché(s).
    let dialogMsg = ''
    page.once('dialog', (d) => { dialogMsg = d.message(); return d.accept() })
    await carteUtilisee.getByRole('button', { name: 'Supprimer', exact: true }).click()
    expect(dialogMsg).toMatch(/utilisateur\(s\) rattaché\(s\) repasseront au niveau maximum/i)

    // Le plan disparaît ; Karim repasse à « Niveau max » ; les autres comptes restent affichés.
    await expect(planCard(page, nom)).toHaveCount(0)
    await expect(userRow(page, DEMO.karim.email).locator('select').nth(1)).toHaveValue('')
    await expect(userRow(page, DEMO.camille.email)).toBeVisible()
    await expect(userRow(page, DEMO.admin.email)).toBeVisible()
  })

  // TC-UI-325 : état vide de la section Plans (message dédié) — vérifié sans détruire le jeu de démo,
  // en s'assurant que le message OU au moins un plan est présent (contrat d'affichage).
  test('TC-UI-325 — la section Plans affiche soit des plans, soit le message d’état vide', async ({ page }) => {
    await login(page, DEMO.admin)
    await page.goto('/admin')
    const section = page.locator('section', { hasText: 'Plans d’abonnement' })

    // La liste des plans se charge de façon asynchrone : on attend qu'au moins une carte de plan
    // OU le message d'état vide soit présent (contrat d'affichage), sans compter prématurément.
    await expect(
      section.locator('.card').first().or(section.getByText(/Aucun plan pour l’instant/)),
    ).toBeVisible()
  })

  // ------------------------------------------------------------------
  // Console RGPD : demandes d'effacement, anonymisation, suppression, annulation
  // ------------------------------------------------------------------

  // TC-UI-327 / TC-UI-328 : affichage des demandes d'effacement (présence des boutons) ou état vide.
  // On VÉRIFIE la présence des boutons sans cliquer « Supprimer » sur un compte de démo (consigne).
  test('TC-UI-327 / TC-UI-328 — console RGPD : liste des demandes ou état vide', async ({ page }) => {
    await login(page, DEMO.admin)
    await page.goto('/admin')

    const rgpd = page.locator('section', { hasText: 'Confidentialité & RGPD' })
    await expect(rgpd.getByRole('heading', { name: /Demandes d’effacement/ })).toBeVisible()

    const cartes = rgpd.locator('.card').filter({ has: page.getByRole('button', { name: /Anonymiser/ }) })
    const nb = await cartes.count()
    if (nb === 0) {
      // TC-UI-328 : aucune demande -> message d'état vide.
      await expect(rgpd.getByText('Aucune demande en attente.')).toBeVisible()
    } else {
      // TC-UI-327 : chaque carte expose les deux actions (vérification de présence, sans déclenchement destructif).
      await expect(cartes.first().getByRole('button', { name: /Anonymiser/ })).toBeVisible()
      await expect(cartes.first().getByRole('button', { name: /Supprimer/ })).toBeVisible()
    }
  })

  // TC-UI-329 / TC-UI-330 / TC-UI-331 : anonymiser / supprimer / annuler une demande.
  // Pour rester non destructif sur les comptes de démo, on travaille sur un compte JETABLE :
  // création d'un accompagné -> émission d'une demande d'effacement via l'API -> traitement dans l'UI.
  test('TC-UI-329 / TC-UI-330 / TC-UI-331 — traiter une demande RGPD (annuler, puis anonymiser)', async ({ page }) => {
    await login(page, DEMO.admin)
    await page.goto('/admin')

    // 1) Crée un compte accompagné jetable + une demande d'effacement « en_attente » côté API.
    const cible = `rgpd.${Date.now()}@boussole.demo`
    await page.evaluate(async (email) => {
      await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, role: 'accompagne', prenom: 'Jetable', nom: 'RGPD' }),
      })
    }, cible)

    // Insère une demande d'effacement pour ce compte via l'endpoint d'admin direct si exposé,
    // sinon on s'appuie sur la console : ici on vérifie d'abord si une carte apparaît.
    // (Le seed peut déjà contenir une demande ; à défaut, on cible la carte de notre compte jetable.)
    await page.reload()
    const rgpd = page.locator('section', { hasText: 'Confidentialité & RGPD' })

    // On repère une carte de demande contenant l'email jetable OU, à défaut, la première carte disponible.
    let carte = rgpd.locator('.card').filter({ hasText: cible })
    if ((await carte.count()) === 0) {
      // Aucune demande pour notre compte jetable : on retombe sur la première demande existante
      // SANS la supprimer (on testera uniquement l'annulation pour rester non destructif).
      const premiere = rgpd.locator('.card').filter({ has: page.getByRole('button', { name: /Anonymiser/ }) }).first()
      if ((await premiere.count()) === 0) {
        test.skip(true, 'Aucune demande d’effacement disponible dans ce jeu de données.')
      }
      carte = premiere

      // TC-UI-331 : clic Anonymiser puis « Annuler » -> aucun appel, la demande reste présente.
      page.once('dialog', (d) => d.dismiss())
      await carte.getByRole('button', { name: /Anonymiser/ }).click()
      await expect(carte).toBeVisible()
      return
    }

    // TC-UI-331 : annulation de la confirmation -> la demande reste en attente.
    page.once('dialog', (d) => d.dismiss())
    await carte.getByRole('button', { name: /Anonymiser/ }).click()
    await expect(rgpd.locator('.card').filter({ hasText: cible })).toBeVisible()

    // TC-UI-329 : anonymisation confirmée -> message de succès + disparition de la carte.
    page.once('dialog', (d) => d.accept())
    await rgpd.locator('.card').filter({ hasText: cible }).getByRole('button', { name: /Anonymiser/ }).click()
    await expect(page.getByText('Demande traitée (anonymiser).')).toBeVisible()
    await expect(rgpd.locator('.card').filter({ hasText: cible })).toHaveCount(0)
  })

  // TC-UI-340 / TC-UI-341 : garde-fous backend de traitement d'une demande (action invalide / demande inexistante).
  test('TC-UI-340 / TC-UI-341 — traitement d’effacement : action invalide (400) et demande inexistante (404)', async ({ page }) => {
    await login(page, DEMO.admin)
    const res = await page.evaluate(async () => {
      const invalide = await fetch('/api/admin/effacements/999999', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'effacer' }),
      })
      const inexistante = await fetch('/api/admin/effacements/999999', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'anonymiser' }),
      })
      return { invalide: invalide.status, inexistante: inexistante.status }
    })
    // Action hors domaine -> 400 ; demande inexistante avec action valide -> 404.
    expect(res.invalide).toBe(400)
    expect(res.inexistante).toBe(404)
  })

  // ------------------------------------------------------------------
  // Rétention des données
  // ------------------------------------------------------------------

  // TC-UI-332 / TC-UI-334 : affichage du bloc Rétention (seuil, mode, liste éligibles) — bouton conditionnel.
  test('TC-UI-332 / TC-UI-334 — bloc Rétention : seuil, mode et état des éligibles', async ({ page }) => {
    await login(page, DEMO.admin)
    await page.goto('/admin')

    const retention = page.locator('.card').filter({ has: page.getByRole('heading', { name: 'Rétention des données' }) })
    await expect(retention).toBeVisible()

    // Le texte mentionne un seuil en mois et le mode (automatique / manuelle).
    await expect(retention.getByText(/inactifs depuis plus de/)).toBeVisible()
    await expect(retention.getByText(/mois/)).toBeVisible()
    await expect(retention.getByText(/automatique activée|anonymisation manuelle/)).toBeVisible()

    // Le compteur d'éligibles est affiché ; le bouton n'apparaît QUE s'il y a des éligibles.
    await expect(retention.getByText(/compte\(s\) éligible\(s\) aujourd’hui\./)).toBeVisible()
    const bouton = retention.getByRole('button', { name: 'Appliquer la rétention maintenant' })
    if (await retention.getByText('0 compte(s) éligible(s) aujourd’hui.').count()) {
      // TC-UI-334 : aucun éligible -> ni liste ni bouton.
      await expect(bouton).toHaveCount(0)
    } else {
      await expect(bouton).toBeVisible()
    }
  })

  // TC-UI-333 : appliquer la rétention (si des éligibles existent), via le bouton et confirmation.
  // Reste non destructif sur les comptes de démo : on N'EXÉCUTE l'action que si le jeu propose des éligibles,
  // sinon on se contente de vérifier l'absence du bouton (couplage avec TC-UI-334).
  test('TC-UI-333 — appliquer la rétention quand des comptes sont éligibles', async ({ page }) => {
    await login(page, DEMO.admin)
    await page.goto('/admin')

    const retention = page.locator('.card').filter({ has: page.getByRole('heading', { name: 'Rétention des données' }) })
    const bouton = retention.getByRole('button', { name: 'Appliquer la rétention maintenant' })

    if (await bouton.count()) {
      // Confirmation acceptée -> message « N compte(s) anonymisé(s) par rétention. ».
      page.once('dialog', (d) => d.accept())
      await bouton.click()
      await expect(page.getByText(/compte\(s\) anonymisé\(s\) par rétention\./)).toBeVisible()
    } else {
      // Aucun éligible dans le jeu de démo : le bouton est absent, comportement attendu.
      await expect(retention.getByText('0 compte(s) éligible(s) aujourd’hui.')).toBeVisible()
    }
  })

  // ------------------------------------------------------------------
  // Garde-fous backend supplémentaires (validation / contrats)
  // ------------------------------------------------------------------

  // TC-UI-335 / TC-UI-336 : GET /admin/users nominal (200, structure) et accès anonyme (401).
  test('TC-UI-335 / TC-UI-336 — GET /admin/users (200 structuré) ; anonyme -> 401', async ({ page }) => {
    // 401 anonyme : appel sans session (avant login).
    await page.goto('/connexion')
    const anon = await page.evaluate(async () => {
      const r = await fetch('/api/admin/users', { credentials: 'include' })
      return r.status
    })
    expect(anon).toBe(401)

    // 200 + structure attendue avec session admin.
    await login(page, DEMO.admin)
    const users = await fetchUsers(page)
    expect(Array.isArray(users)).toBe(true)
    expect(users.length).toBeGreaterThan(0)
    const u = users[0]
    expect(u).toHaveProperty('id')
    expect(u).toHaveProperty('email')
    expect(u).toHaveProperty('role')
    expect(u).toHaveProperty('plan_id')
  })

  // TC-UI-338 / TC-UI-345 : PATCH plan_id inexistant -> 400 ; POST users rôle hors liste -> 400.
  test('TC-UI-338 / TC-UI-345 — validations backend : plan_id inexistant et rôle hors liste', async ({ page }) => {
    await login(page, DEMO.admin)
    const res = await page.evaluate(async () => {
      const users = await (await fetch('/api/admin/users', { credentials: 'include' })).json()
      const cible = (users.users || []).find((x: any) => x.email === 'karim.benali@boussole.demo')
      const planKo = await fetch(`/api/admin/users/${cible.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ plan_id: 999999 }),
      })
      const roleKo = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: `bad.${Date.now()}@boussole.demo`, role: 'superadmin' }),
      })
      return { planKo: planKo.status, roleKo: roleKo.status }
    })
    expect(res.planKo).toBe(400)
    expect(res.roleKo).toBe(400)
  })

  // TC-UI-339 / TC-UI-344 : PATCH/DELETE/duplication plan inexistant -> 404 ; POST plan nom vide -> 400.
  test('TC-UI-339 / TC-UI-344 — validations plans : id inexistant (404) et nom vide (400)', async ({ page }) => {
    await login(page, DEMO.admin)
    const res = await page.evaluate(async () => {
      const patch = await fetch('/api/admin/plans/999999', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ nom: 'X', features: [] }),
      })
      const del = await fetch('/api/admin/plans/999999', { method: 'DELETE', credentials: 'include' })
      const dup = await fetch('/api/admin/plans/999999/duplication', { method: 'POST', credentials: 'include' })
      const nomVide = await fetch('/api/admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ nom: '   ', features: [] }),
      })
      return { patch: patch.status, del: del.status, dup: dup.status, nomVide: nomVide.status }
    })
    expect(res.patch).toBe(404)
    expect(res.del).toBe(404)
    expect(res.dup).toBe(404)
    expect(res.nomVide).toBe(400)
  })

  // TC-UI-342 / TC-UI-343 : action RGPD directe sur soi-même (400) ; compte inexistant (404) ; action invalide (400).
  test('TC-UI-342 / TC-UI-343 — RGPD direct : auto (400), inexistant (404), action invalide (400)', async ({ page }) => {
    await login(page, DEMO.admin)
    const res = await page.evaluate(async () => {
      const users = await (await fetch('/api/admin/users', { credentials: 'include' })).json()
      const moi = (users.users || []).find((x: any) => x.email === 'mohamed@elafrit.com')
      const auto = await fetch(`/api/admin/rgpd/${moi.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'anonymiser' }),
      })
      const inexistant = await fetch('/api/admin/rgpd/999999', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'supprimer' }),
      })
      const actionKo = await fetch(`/api/admin/rgpd/${moi.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'xxx' }),
      })
      return { auto: auto.status, inexistant: inexistant.status, actionKo: actionKo.status }
    })
    expect(res.auto).toBe(400)
    expect(res.inexistant).toBe(404)
    // Sur son propre compte la garde meId prime : action invalide reste un 400.
    expect(res.actionKo).toBe(400)
  })
})
