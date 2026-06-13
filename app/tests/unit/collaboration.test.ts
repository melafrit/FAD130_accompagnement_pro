import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '../../api/src/db'
import { extractJson, resumeFallback, resumeContexte, PB_QUESTIONS } from '../../api/src/collaboration'

// ============================================================================
//  Tests unitaires Collaboration (logique pure : extractJson, PB_QUESTIONS)
//  + repli déterministe resumeFallback (sur seed minimal jetable).
//  Base redirigée vers ./.tmp-unit.sqlite par vitest.config.ts.
// ============================================================================

describe('COLLAB — unitaires (parsing JSON & constantes)', () => {
  // TC-COLLAB-045 — extractJson : du premier '{' au dernier '}', tolère le bruit, null si invalide.
  it('TC-COLLAB-045 — extractJson extrait le bloc JSON entouré de texte parasite', () => {
    const obj = extractJson<{ problematique: string; sous_questions: string[] }>(
      'préambule {"problematique":"Q","sous_questions":["a"]} fin',
    )
    expect(obj).toEqual({ problematique: 'Q', sous_questions: ['a'] })
  })

  it('TC-COLLAB-045 — extractJson renvoie null sans accolade', () => {
    expect(extractJson('texte sans accolade')).toBeNull()
  })

  it('TC-COLLAB-045 — extractJson renvoie null si JSON.parse échoue (catch)', () => {
    expect(extractJson('{cassé')).toBeNull()
  })

  it('TC-COLLAB-045 — extractJson renvoie null sur entrée null', () => {
    expect(extractJson(null)).toBeNull()
  })

  // TC-COLLAB-032 — la partie unitaire (forme) : PB_QUESTIONS = 4 chaînes non vides.
  it('TC-COLLAB-032 — PB_QUESTIONS expose exactement 4 questions guidées non vides', () => {
    expect(PB_QUESTIONS).toHaveLength(4)
    for (const q of PB_QUESTIONS) {
      expect(typeof q).toBe('string')
      expect(q.trim().length).toBeGreaterThan(0)
    }
  })
})

// ============================================================================
//  Repli heuristique resumeFallback : nécessite un dossier en base (FK ON).
//  On seede des lignes jetables à ids très élevés puis on nettoie.
// ============================================================================
const ACC = 990001 // accompagnateur
const USER = 990002 // accompagné
const D_VIDE = 990010 // dossier vierge (TC-COLLAB-050)
const D_PLEIN = 990011 // dossier garni (TC-COLLAB-051)

describe('COLLAB — unitaires (repli resumeFallback)', () => {
  beforeAll(() => {
    db.exec('PRAGMA foreign_keys = ON')
    const insUser = db.prepare("INSERT INTO users (id, email, role, nom, prenom) VALUES (?,?,?,?,?)")
    insUser.run(ACC, `acc-${ACC}@unit.test`, 'accompagnateur', 'Acc', 'Unit')
    insUser.run(USER, `usr-${USER}@unit.test`, 'accompagne', 'Usr', 'Unit')
    const insDoss = db.prepare('INSERT INTO dossiers (id, accompagne_id, accompagnateur_id, titre) VALUES (?,?,?,?)')
    insDoss.run(D_VIDE, USER, ACC, 'Dossier vierge')
    insDoss.run(D_PLEIN, USER, ACC, 'Dossier garni')

    // D_PLEIN : sessions (phase max = 2), 1 CR publié, questionnaire avec recap,
    // 5 actions ordonnées dont 1 'fait' (TC-COLLAB-051).
    db.prepare("INSERT INTO sessions (id, dossier_id, phase_atteinte, statut) VALUES (?,?,?,?)").run(990100, D_PLEIN, '0', 'clos')
    db.prepare("INSERT INTO sessions (id, dossier_id, phase_atteinte, statut) VALUES (?,?,?,?)").run(990101, D_PLEIN, '2', 'en_cours')
    db.prepare("INSERT INTO comptes_rendus (id, session_id, version, publie) VALUES (?,?,?,?)").run(990200, 990101, 1, 1)
    db.prepare("INSERT INTO comptes_rendus (id, session_id, version, publie) VALUES (?,?,?,?)").run(990201, 990100, 1, 0) // non publié : ignoré
    db.prepare("INSERT INTO questionnaires_initiaux (id, dossier_id, cr_recap) VALUES (?,?,?)").run(990300, D_PLEIN, 'Récap du questionnaire initial.')
    const insAct = db.prepare('INSERT INTO actions (id, dossier_id, libelle, statut, ordre) VALUES (?,?,?,?,?)')
    insAct.run(990400, D_PLEIN, 'Action faite', 'fait', 1)
    insAct.run(990401, D_PLEIN, 'Action A faire 1', 'a_faire', 2)
    insAct.run(990402, D_PLEIN, 'Action A faire 2', 'a_faire', 3)
    insAct.run(990403, D_PLEIN, 'Action A faire 3', 'a_faire', 4)
    insAct.run(990404, D_PLEIN, 'Action en cours', 'en_cours', 5)
  })

  afterAll(() => {
    // ON DELETE CASCADE depuis dossiers/users nettoie sessions, CR, actions, questionnaires.
    db.prepare('DELETE FROM dossiers WHERE id IN (?,?)').run(D_VIDE, D_PLEIN)
    db.prepare('DELETE FROM users WHERE id IN (?,?)').run(ACC, USER)
  })

  // TC-COLLAB-050 — parcours non démarré : phaseMax = -1, aucune action, aucun CR.
  it('TC-COLLAB-050 — resumeFallback : parcours non démarré (phaseMax < 0)', () => {
    const ctx = resumeContexte(D_VIDE)
    expect(ctx).toEqual({ phaseMax: -1, nbCr: 0, recap: null, actions: [] })

    const r = resumeFallback(D_VIDE)
    expect(r.etat).toBe('Ton parcours vient de démarrer.')
    expect(r.faits).toEqual(['Questionnaire initial à compléter.', 'Pas encore de compte rendu publié.'])
    expect(r.prochaines_etapes).toEqual(['Préparer le prochain entretien.'])
  })

  // TC-COLLAB-051 — agrégats actions (faites vs en cours) + troncature à 3.
  it('TC-COLLAB-051 — resumeFallback : agrégats actions et troncature des prochaines étapes à 3', () => {
    const ctx = resumeContexte(D_PLEIN)
    expect(ctx.phaseMax).toBe(2) // MAX(CAST(phase_atteinte AS INTEGER))
    expect(ctx.nbCr).toBe(1) // seul le CR publié compte
    expect(ctx.recap).toBe('Récap du questionnaire initial.')
    expect(ctx.actions).toHaveLength(5)

    const r = resumeFallback(D_PLEIN)
    // etat cite l'étape PHASES_FR[2], le nb de CR publiés et le nb d'actions 'fait' (1).
    expect(r.etat).toContain('Explorer l’expérience')
    expect(r.etat).toContain('1 compte(s) rendu publié(s)')
    expect(r.etat).toContain('1 action(s) réalisée(s)')
    // recap présent -> 1er fait positif ; CR publié -> 2e fait avec le compte.
    expect(r.faits[0]).toBe('Ton questionnaire initial est posé.')
    expect(r.faits[1]).toBe('1 compte(s) rendu disponible(s).')
    // prochaines_etapes : 3 premières actions non 'fait' (slice(0,3)), dans l'ordre (ordre, id).
    expect(r.prochaines_etapes).toEqual(['Action A faire 1', 'Action A faire 2', 'Action A faire 3'])
  })
})
