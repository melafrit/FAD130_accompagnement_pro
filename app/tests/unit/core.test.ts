import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import { makeToken, expiryHours } from '../../api/src/util'
import { sanitizeKeys, userFeatures, requireFeature, ALL_FEATURE_KEYS } from '../../api/src/features'
import { requireRole } from '../../api/src/auth'
import { db } from '../../api/src/db'

// Petit double de Response : capture le dernier status() et json() posés par le middleware.
function makeRes() {
  const res = {
    statusCode: 0 as number,
    body: undefined as unknown,
    status(code: number) {
      res.statusCode = code
      return res
    },
    json(obj: unknown) {
      res.body = obj
      return res
    },
  }
  return res
}

// Suivi de l'appel à next() (le middleware le réserve au cas « autorisé »).
function makeNext() {
  const state = { called: false }
  const next = (() => {
    state.called = true
  }) as unknown as NextFunction
  return { next, state }
}

// Cibles de seedage pour userFeatures() : ids élevés/uniques, nettoyés en fin de suite.
const USER_NO_PLAN = 990001 // utilisateur sans plan → niveau max
const USER_BAD_JSON = 990002 // utilisateur rattaché à un plan au features corrompu
const USER_LIMITED = 990003 // utilisateur dont le plan n'inclut PAS 'export_pdf'
const PLAN_BAD_JSON = 990101 // features = JSON invalide
const PLAN_LIMITED = 990102 // features = ['questionnaire'] (donc pas 'export_pdf')

describe('CORE — unitaires (util / features / auth)', () => {
  beforeAll(() => {
    // Plans : l'un avec un JSON invalide (déclenche le catch), l'autre limité à 'questionnaire'.
    db.prepare("INSERT INTO plans (id, nom, features) VALUES (?, 'PlanCorrompu', ?)").run(PLAN_BAD_JSON, '{ pas du json')
    db.prepare("INSERT INTO plans (id, nom, features) VALUES (?, 'PlanLimite', ?)").run(PLAN_LIMITED, JSON.stringify(['questionnaire']))
    // Utilisateurs : sans plan, avec plan corrompu, avec plan limité.
    db.prepare("INSERT INTO users (id, email, role, plan_id) VALUES (?, 'core-noplan@boussole.test', 'accompagne', NULL)").run(USER_NO_PLAN)
    db.prepare("INSERT INTO users (id, email, role, plan_id) VALUES (?, 'core-badjson@boussole.test', 'accompagne', ?)").run(USER_BAD_JSON, PLAN_BAD_JSON)
    db.prepare("INSERT INTO users (id, email, role, plan_id) VALUES (?, 'core-limited@boussole.test', 'accompagne', ?)").run(USER_LIMITED, PLAN_LIMITED)
  })

  afterAll(() => {
    db.prepare('DELETE FROM users WHERE id IN (?, ?, ?)').run(USER_NO_PLAN, USER_BAD_JSON, USER_LIMITED)
    db.prepare('DELETE FROM plans WHERE id IN (?, ?)').run(PLAN_BAD_JSON, PLAN_LIMITED)
  })

  // --- util.ts ---

  it('TC-AUTH-055 — makeToken() produit un jeton hex de 64 caractères, unique à chaque appel', () => {
    const a = makeToken()
    const b = makeToken()
    expect(a).toMatch(/^[0-9a-f]{64}$/) // 32 octets en hexadécimal
    expect(b).toMatch(/^[0-9a-f]{64}$/)
    expect(a).not.toBe(b)
  })

  it('TC-AUTH-056 — expiryHours() renvoie une date ISO future (≈48h, resp. ≈2h)', () => {
    const before = Date.now()
    const iso48 = expiryHours(48)
    const iso2 = expiryHours(2)
    const after = Date.now()

    // Chaîne ISO valide (re-sérialisation stable).
    expect(new Date(iso48).toISOString()).toBe(iso48)
    expect(new Date(iso2).toISOString()).toBe(iso2)

    // Écart attendu, avec une tolérance pour le temps écoulé pendant le test.
    const d48 = new Date(iso48).getTime()
    const d2 = new Date(iso2).getTime()
    expect(d48 - before).toBeGreaterThanOrEqual(48 * 3600 * 1000 - 5000)
    expect(d48 - after).toBeLessThanOrEqual(48 * 3600 * 1000 + 5000)
    expect(d2 - before).toBeGreaterThanOrEqual(2 * 3600 * 1000 - 5000)
    expect(d2 - after).toBeLessThanOrEqual(2 * 3600 * 1000 + 5000)
    // Lien verif_email (48h) strictement plus lointain que reset_mdp (2h).
    expect(d48).toBeGreaterThan(d2)
  })

  // --- features.ts : sanitizeKeys (pur) ---

  it('TC-AUTH-054 — sanitizeKeys() filtre les clés inconnues, déduplique et ignore les non-clés', () => {
    const out = sanitizeKeys(['questionnaire', 'questionnaire', 'cle_bidon', 42, null, 'miroir'])
    expect(out).toEqual(['questionnaire', 'miroir'])
    // Entrée non-tableau → [].
    expect(sanitizeKeys(null)).toEqual([])
    expect(sanitizeKeys('questionnaire')).toEqual([])
    expect(sanitizeKeys(undefined)).toEqual([])
    expect(sanitizeKeys({})).toEqual([])
  })

  // --- features.ts : userFeatures (db, seedage minimal) ---

  it('TC-AUTH-052 — userFeatures() renvoie toutes les clés (ALL_FEATURE_KEYS) quand l’utilisateur n’a pas de plan', () => {
    const set = userFeatures(USER_NO_PLAN)
    expect(set.size).toBe(ALL_FEATURE_KEYS.length)
    for (const k of ALL_FEATURE_KEYS) expect(set.has(k)).toBe(true)
  })

  it('TC-AUTH-053 — userFeatures() retombe sur ALL_FEATURE_KEYS si plans.features est un JSON invalide', () => {
    const set = userFeatures(USER_BAD_JSON)
    expect(set.size).toBe(ALL_FEATURE_KEYS.length)
    for (const k of ALL_FEATURE_KEYS) expect(set.has(k)).toBe(true)
  })

  // --- auth.ts : requireRole (middleware simulé) ---

  it('TC-AUTH-057 — requireRole() autorise le bon rôle et refuse les autres (403)', () => {
    const mw = requireRole('accompagnateur')

    // Cas autorisé : rôle attendu → next() appelé, pas de réponse d'erreur.
    {
      const req = { user: { id: 1, email: 'a@b.c', role: 'accompagnateur' } } as unknown as Request
      const res = makeRes()
      const { next, state } = makeNext()
      mw(req, res as unknown as Response, next)
      expect(state.called).toBe(true)
      expect(res.statusCode).toBe(0)
    }

    // Cas refusé : mauvais rôle → 403 { error: 'Accès refusé' }, next() NON appelé.
    {
      const req = { user: { id: 2, email: 'x@y.z', role: 'accompagne' } } as unknown as Request
      const res = makeRes()
      const { next, state } = makeNext()
      mw(req, res as unknown as Response, next)
      expect(state.called).toBe(false)
      expect(res.statusCode).toBe(403)
      expect(res.body).toEqual({ error: 'Accès refusé' })
    }

    // Cas utilisateur absent → 403, next() NON appelé.
    {
      const req = {} as unknown as Request
      const res = makeRes()
      const { next, state } = makeNext()
      mw(req, res as unknown as Response, next)
      expect(state.called).toBe(false)
      expect(res.statusCode).toBe(403)
      expect(res.body).toEqual({ error: 'Accès refusé' })
    }
  })

  // --- features.ts : requireFeature (middleware simulé, appuyé sur userFeatures seedé) ---

  it('TC-AUTH-058 — requireFeature() : passe sans plan, bloque (403) hors offre, 401 sans utilisateur', () => {
    const mw = requireFeature('export_pdf')

    // Cas A : utilisateur sans plan (toutes les features) → next().
    {
      const req = { user: { id: USER_NO_PLAN } } as unknown as Request
      const res = makeRes()
      const { next, state } = makeNext()
      mw(req, res as unknown as Response, next)
      expect(state.called).toBe(true)
      expect(res.statusCode).toBe(0)
    }

    // Cas B : plan ne contenant PAS 'export_pdf' → 403.
    {
      const req = { user: { id: USER_LIMITED } } as unknown as Request
      const res = makeRes()
      const { next, state } = makeNext()
      mw(req, res as unknown as Response, next)
      expect(state.called).toBe(false)
      expect(res.statusCode).toBe(403)
      expect(res.body).toEqual({ error: 'Fonctionnalité non disponible dans votre offre' })
    }

    // Cas C : pas d'utilisateur authentifié → 401.
    {
      const req = {} as unknown as Request
      const res = makeRes()
      const { next, state } = makeNext()
      mw(req, res as unknown as Response, next)
      expect(state.called).toBe(false)
      expect(res.statusCode).toBe(401)
      expect(res.body).toEqual({ error: 'Non authentifié' })
    }
  })
})
