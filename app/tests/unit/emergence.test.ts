import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '../../api/src/db'
import { fallbackBanque, fallbackMoments } from '../../api/src/emergence'

// Replis déterministes d'Émergence (banque de questions + moments-clés).
// Ces fonctions lisent la base : on seed un jeu minimal avec des ids très élevés
// (collision improbable avec le jeu de démo) puis on nettoie en fin de suite.
// Aucune clé ANTHROPIC : seul le repli heuristique est sollicité ici.

const ACC = 990001 // accompagnateur
const AMINE = 990002 // accompagné AVEC prénom
const ANON = 990003 // accompagné SANS prénom (NULL)
const DOS_AMINE = 990010 // dossier d'Amine
const DOS_ANON = 990011 // dossier sans prénom d'accompagné
const SESS_PLEINE = 990020 // session avec réponses
const SESS_VIDE = 990021 // session sans réponse non vide

const LONG = 'x'.repeat(200) // > 160 → doit être tronqué

beforeAll(() => {
  const u = db.prepare("INSERT INTO users (id, email, role, prenom) VALUES (?,?,?,?)")
  u.run(ACC, `acc.${ACC}@test.local`, 'accompagnateur', 'Accomp')
  u.run(AMINE, `amine.${AMINE}@test.local`, 'accompagne', 'Amine')
  u.run(ANON, `anon.${ANON}@test.local`, 'accompagne', null)

  const d = db.prepare('INSERT INTO dossiers (id, accompagne_id, accompagnateur_id, titre) VALUES (?,?,?,?)')
  d.run(DOS_AMINE, AMINE, ACC, 'Parcours Amine')
  d.run(DOS_ANON, ANON, ACC, 'Parcours anonyme')

  const s = db.prepare('INSERT INTO sessions (id, dossier_id) VALUES (?,?)')
  s.run(SESS_PLEINE, DOS_AMINE)
  s.run(SESS_VIDE, DOS_AMINE)

  // questions_entretien : la colonne `reponse` est ajoutée par migration légère.
  const q = db.prepare('INSERT INTO questions_entretien (id, session_id, phase, texte, reponse) VALUES (?,?,?,?,?)')
  // Session pleine : 1ère et 2e réponses non vides retenues (ORDER BY id LIMIT 2),
  // une réponse vide (TRIM='') et une NULL doivent être ignorées.
  q.run(990030, SESS_PLEINE, '2', 'Q1 ?', 'Première réponse marquante.')
  q.run(990031, SESS_PLEINE, '2', 'Q2 ?', '   ') // TRIM vide → ignorée
  q.run(990032, SESS_PLEINE, '3', 'Q3 ?', LONG) // 2e retenue, tronquée à 160
  q.run(990033, SESS_PLEINE, '4', 'Q4 ?', 'Troisième réponse (au-delà de la limite de 2).')
  q.run(990034, SESS_PLEINE, '5', 'Q5 ?', null) // NULL → ignorée
  // Session vide : aucune réponse exploitable.
  q.run(990035, SESS_VIDE, '0', 'Qv1 ?', null)
  q.run(990036, SESS_VIDE, '0', 'Qv2 ?', '') // vide
})

afterAll(() => {
  db.prepare('DELETE FROM questions_entretien WHERE session_id IN (?,?)').run(SESS_PLEINE, SESS_VIDE)
  db.prepare('DELETE FROM sessions WHERE id IN (?,?)').run(SESS_PLEINE, SESS_VIDE)
  db.prepare('DELETE FROM dossiers WHERE id IN (?,?)').run(DOS_AMINE, DOS_ANON)
  db.prepare('DELETE FROM users WHERE id IN (?,?,?)').run(ACC, AMINE, ANON)
})

describe('EMERGENCE — unitaires (replis déterministes)', () => {
  it("TC-REL-037 — fallbackBanque renvoie 6 phases, chacune ≥1 question, et la phase '0' contient le prénom de l'accompagné", () => {
    const b = fallbackBanque(DOS_AMINE)
    // Clés '0'..'5' présentes, chacune avec au moins une question non vide.
    for (const k of ['0', '1', '2', '3', '4', '5']) {
      expect(Array.isArray(b[k])).toBe(true)
      expect(b[k].length).toBeGreaterThanOrEqual(1)
      expect(b[k][0].length).toBeGreaterThan(0)
    }
    // La phase '0' est personnalisée avec le prénom de l'accompagné.
    expect(b['0'][0]).toBe("Amine, qu'est-ce qui t'amène précisément aujourd'hui ?")
    expect(b['0'][0].startsWith('Amine,')).toBe(true)
  })

  it("TC-REL-037 — fallbackBanque retombe sur « la personne » quand le prénom est absent (NULL)", () => {
    const b = fallbackBanque(DOS_ANON)
    expect(b['0'][0]).toBe("la personne, qu'est-ce qui t'amène précisément aujourd'hui ?")
  })

  it('TC-REL-053 — fallbackMoments extrait ≤2 verbatims (ORDER BY id LIMIT 2), tronque à 160 et fixe le « pourquoi »', () => {
    const { moments } = fallbackMoments(SESS_PLEINE)
    // Au plus 2 entrées, issues des réponses non vides dans l'ordre des ids.
    expect(moments.length).toBe(2)
    expect(moments[0].verbatim).toBe('Première réponse marquante.')
    // 2e réponse non vide = la longue (la réponse '   ' est ignorée) → tronquée à 160.
    expect(moments[1].verbatim).toBe(LONG.slice(0, 160))
    expect(moments[1].verbatim.length).toBe(160)
    // « pourquoi » est un libellé déterministe identique pour chaque moment.
    for (const m of moments) {
      expect(m.pourquoi).toBe("Passage potentiellement pivot de l'entretien.")
    }
  })

  it('TC-REL-054 — fallbackMoments renvoie un tableau vide quand la session n’a aucune réponse non vide', () => {
    const { moments } = fallbackMoments(SESS_VIDE)
    expect(moments).toEqual([])
  })
})
