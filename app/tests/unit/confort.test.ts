import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import crypto from 'node:crypto'
import { db } from '../../api/src/db'
// On importe l'instance web-push via confort (webpush ré-exporté) : c'est exactement celle que
// pushToUser appelle, et cela évite de résoudre le paquet 'web-push' depuis le dossier tests.
import { salleVisio, libelleAccompagne, pushToUser, webpush } from '../../api/src/confort'

// Tests unitaires du module « confort » (visio Jitsi déterministe, libellé accompagné, pushToUser).
// Exécutés sur l'hôte contre la base jetable './.tmp-unit.sqlite' (cf. vitest.config.ts).
//
// - salleVisio / libelleAccompagne : fonctions PURES → assertion exacte, sans base ni réseau.
// - pushToUser : touche la base (push_subscriptions) et appelle webpush.sendNotification. On stube
//   sendNotification via vi.spyOn (confort.ts et ce fichier partagent la même instance du module
//   'web-push'), donc aucun envoi réseau réel. On seede sous des ids très élevés puis on nettoie.

// Le module confort.ts fige JWT_SECRET au chargement avec la même expression : on la reproduit ici
// pour calculer le hash attendu indépendamment de l'application (déterminisme prouvé).
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me'
const hash10 = (id: number) => crypto.createHash('sha256').update(`${id}:${JWT_SECRET}`).digest('hex').slice(0, 10)

describe('CONFORT — salle visio déterministe (fonction pure)', () => {
  it('TC-CONFORT-010 — salleVisio calcule « Boussole-<id>-<hash10> » via sha256(id:JWT_SECRET)', () => {
    const attendu = `Boussole-1-${hash10(1)}`
    expect(salleVisio(1)).toBe(attendu)
    // hash de 10 caractères hexadécimaux
    const hash = salleVisio(1).split('-')[2]
    expect(hash).toMatch(/^[0-9a-f]{10}$/)
    // déterminisme : deux appels successifs identiques (URL stable par RDV)
    expect(salleVisio(1)).toBe(salleVisio(1))
  })

  it('TC-CONFORT-004 — deux RDV distincts donnent des salles distinctes, chacune portant son propre id', () => {
    const a = salleVisio(42)
    const b = salleVisio(43)
    expect(a).not.toBe(b)
    expect(a).toBe(`Boussole-42-${hash10(42)}`)
    expect(b).toBe(`Boussole-43-${hash10(43)}`)
    expect(a.startsWith('Boussole-42-')).toBe(true)
    expect(b.startsWith('Boussole-43-')).toBe(true)
  })
})

describe('CONFORT — libellé accompagné (fonction pure)', () => {
  it('TC-CONFORT-035 — prénom+nom absents (NULL) → repli sur l’email', () => {
    expect(libelleAccompagne(null, null, 'jane@boussole.local')).toBe('jane@boussole.local')
    // prénom seul
    expect(libelleAccompagne('Jane', null, 'jane@boussole.local')).toBe('Jane')
    // nom seul
    expect(libelleAccompagne(null, 'Doe', 'jane@boussole.local')).toBe('Doe')
    // prénom + nom : assemblés et séparés d'un espace, l'email n'est pas utilisé
    expect(libelleAccompagne('Jane', 'Doe', 'jane@boussole.local')).toBe('Jane Doe')
  })
})

// --- pushToUser : base + stub webpush -------------------------------------------------------------
const USER_ID = 9_700_001 // utilisateur de test (FK push_subscriptions.user_id → users.id)
const EP_DEAD = 'https://push.example/confort-dead' // abonnement « mort » (410 Gone) → purgé
const EP_KEEP = 'https://push.example/confort-keep' // abonnement en erreur transitoire (500) → conservé
const EP_OK = 'https://push.example/confort-ok' // abonnement valide pour le test de payload

function purge(): void {
  db.prepare('DELETE FROM push_subscriptions WHERE user_id=?').run(USER_ID)
  db.prepare('DELETE FROM users WHERE id=?').run(USER_ID)
}

describe('CONFORT — pushToUser (base jetable + stub webpush.sendNotification)', () => {
  beforeAll(() => {
    purge()
    db.prepare("INSERT INTO users (id, email, role) VALUES (?, ?, 'accompagne')").run(USER_ID, `push-${USER_ID}@test.local`)
  })

  afterAll(() => {
    vi.restoreAllMocks()
    purge()
  })

  it('TC-CONFORT-028 — purge les abonnements morts (410) et conserve ceux en erreur transitoire (500), sans lever', async () => {
    db.prepare('DELETE FROM push_subscriptions WHERE user_id=?').run(USER_ID)
    db.prepare('INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES (?,?,?,?)').run(USER_ID, EP_DEAD, 'pDead', 'aDead')
    db.prepare('INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES (?,?,?,?)').run(USER_ID, EP_KEEP, 'pKeep', 'aKeep')

    // Stub : 410 (Gone) pour l'abonnement mort, 500 pour l'autre.
    const spy = vi.spyOn(webpush, 'sendNotification').mockImplementation((sub: unknown) => {
      const endpoint = (sub as { endpoint: string }).endpoint
      const err = new Error('stub') as Error & { statusCode: number }
      err.statusCode = endpoint === EP_DEAD ? 410 : 500
      return Promise.reject(err)
    })

    await expect(pushToUser(USER_ID, { title: 'T', body: 'B' })).resolves.toBeUndefined() // best-effort : ne lève pas
    expect(spy).toHaveBeenCalledTimes(2)

    const restants = db.prepare('SELECT endpoint FROM push_subscriptions WHERE user_id=? ORDER BY endpoint').all(USER_ID) as { endpoint: string }[]
    expect(restants.map((r) => r.endpoint)).toEqual([EP_KEEP]) // EP_DEAD (410) supprimé, EP_KEEP (500) conservé

    spy.mockRestore()
  })

  it('TC-CONFORT-029 — appelle sendNotification une fois par abonnement avec la subscription et un payload JSON title/body/url', async () => {
    db.prepare('DELETE FROM push_subscriptions WHERE user_id=?').run(USER_ID)
    db.prepare('INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES (?,?,?,?)').run(USER_ID, EP_OK, 'pOK', 'aOK')

    const spy = vi.spyOn(webpush, 'sendNotification').mockResolvedValue(undefined as never)

    const payload = { title: 'Boussole', body: 'Coucou', url: '/espace' }
    await pushToUser(USER_ID, payload)

    expect(spy).toHaveBeenCalledTimes(1)
    const [subArg, bodyArg] = spy.mock.calls[0]
    expect(subArg).toEqual({ endpoint: EP_OK, keys: { p256dh: 'pOK', auth: 'aOK' } })
    expect(JSON.parse(bodyArg as string)).toEqual(payload) // title/body/url transmis exactement

    spy.mockRestore()
  })
})
