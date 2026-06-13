import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '../../api/src/db'
import { fallbackMiroir, OPEN_RE } from '../../api/src/miroir'

// Repli déterministe du Miroir réflexif (sans clé IA) : analyse heuristique de la
// posture à partir des questions posées (questions_entretien) et notes (reponses).
// fallbackMiroir lit la base via session_id ; la base a foreign_keys=ON, on sème donc la
// chaîne parente (users → dossier → sessions) à des ids élevés et uniques, puis on nettoie.

const ACC_ID = 990010
const ETU_ID = 990011
const DOSSIER_ID = 990012
const SID_PLEIN = 990001 // 2 ouvertes + 1 fermée + une note phase 0
const SID_RATIO = 990002 // 2 ouvertes + 1 fermée (sans note) pour le calcul de ratio/score 2.5
const SID_VIDE = 990003 // aucune question ni note
const SIDS = [SID_PLEIN, SID_RATIO, SID_VIDE]

beforeAll(() => {
  // Nettoyage défensif (base jetable potentiellement réutilisée d'un run précédent)
  db.prepare('DELETE FROM users WHERE id IN (?,?)').run(ACC_ID, ETU_ID)
  // Chaîne parente minimale (FK actives)
  const insU = db.prepare('INSERT INTO users (id, email, role) VALUES (?,?,?)')
  insU.run(ACC_ID, `acc-${ACC_ID}@test.local`, 'accompagnateur')
  insU.run(ETU_ID, `etu-${ETU_ID}@test.local`, 'accompagne')
  db.prepare('INSERT INTO dossiers (id, accompagne_id, accompagnateur_id, titre) VALUES (?,?,?,?)')
    .run(DOSSIER_ID, ETU_ID, ACC_ID, 'Dossier test miroir')
  const insS = db.prepare('INSERT INTO sessions (id, dossier_id) VALUES (?,?)')
  for (const sid of SIDS) insS.run(sid, DOSSIER_ID)

  const insQ = db.prepare('INSERT INTO questions_entretien (session_id, phase, texte, reponse) VALUES (?,?,?,?)')
  const insR = db.prepare('INSERT INTO reponses (session_id, phase, texte_reponse) VALUES (?,?,?)')

  // SID_PLEIN : 2 questions ouvertes, 1 fermée, + une note d'ouverture (phase 0)
  insQ.run(SID_PLEIN, '0', 'Comment as-tu vécu cette première étape ?', null)
  insQ.run(SID_PLEIN, '1', "Qu'est-ce qui te semble le plus difficile ?", 'la rédaction')
  insQ.run(SID_PLEIN, '2', 'As-tu terminé ton plan ?', null)
  insR.run(SID_PLEIN, '0', "On pose le cadre et l'alliance avant d'entrer dans le travail.")

  // SID_RATIO : 2 ouvertes + 1 fermée, AUCUNE note (pour isoler le calcul du score 2.5)
  insQ.run(SID_RATIO, '0', 'Comment te sens-tu aujourd’hui ?', null)
  insQ.run(SID_RATIO, '1', "Qu'attends-tu de cet entretien ?", null)
  insQ.run(SID_RATIO, '2', 'As-tu relu tes notes ?', null)

  // SID_VIDE : aucune question ni note (session présente mais sans contenu)
})

afterAll(() => {
  // ON DELETE CASCADE depuis users efface dossier/sessions/questions/reponses
  db.prepare('DELETE FROM users WHERE id IN (?,?)').run(ACC_ID, ETU_ID)
})

describe('MIROIR — repli heuristique (OPEN_RE + fallbackMiroir)', () => {
  // OPEN_RE est une regex pure : classification ouverte/fermée déterministe.
  it('TC-REL-081 — OPEN_RE reconnaît les amorces ouvertes et rejette les fermées', () => {
    expect(OPEN_RE.test('Comment as-tu vécu cette étape ?')).toBe(true)
    expect(OPEN_RE.test("Qu'est-ce qui te bloque ?")).toBe(true)
    expect(OPEN_RE.test('Quelle est ta prochaine étape ?')).toBe(true)
    expect(OPEN_RE.test('Pourquoi ce choix ?')).toBe(true)
    expect(OPEN_RE.test('Raconte-moi ta semaine.')).toBe(true)
    // Fermées / orientées : ne commencent par aucune amorce ouverte
    expect(OPEN_RE.test('As-tu terminé ton plan ?')).toBe(false)
    expect(OPEN_RE.test('Es-tu sûr de ta décision ?')).toBe(false)
    expect(OPEN_RE.test('Tu as fini ?')).toBe(false)
  })

  it('TC-REL-081 — fallbackMiroir : score 2.5 = round(45 + ratio*35) et glissement « Faire émerger » sur la fermée', () => {
    const m = fallbackMiroir(SID_RATIO)
    // 2 ouvertes / 3 questions → ratio ≈ 0.6667 → round(45 + 0.6667*35) = 68
    const s25 = m.scores.find((s) => s.indicateur === '2.5')
    expect(s25).toBeDefined()
    expect(s25!.score).toBe(68)
    // Une question fermée présente → glissement « Faire émerger » dont le verbatim cite la fermée
    const gFermee = m.glissements.find((g) => g.principe === 'Faire émerger')
    expect(gFermee).toBeDefined()
    expect(gFermee!.verbatim).toBe('As-tu relu tes notes ?')
  })

  it('TC-REL-080 — fallbackMiroir : forces, glissements, 6 scores aux bons indicateurs, note = moyenne arrondie', () => {
    const m = fallbackMiroir(SID_PLEIN)

    // Forces : questions ouvertes présentes → « Le geste écologique » ; note phase 0 → « Influencer par le cadre »
    expect(m.forces.length).toBeGreaterThanOrEqual(1)
    expect(m.forces.length).toBeLessThanOrEqual(3)
    expect(m.forces.some((f) => f.principe === 'Le geste écologique')).toBe(true)
    expect(m.forces.some((f) => f.principe === 'Influencer par le cadre')).toBe(true)
    // Le verbatim de la 1re force est une question réellement ouverte (issue des traces)
    const geste = m.forces.find((f) => f.principe === 'Le geste écologique')!
    expect(OPEN_RE.test(geste.verbatim)).toBe(true)

    // Glissements : ≥ 1, avec un conseil à la 1re personne, ici sur la question fermée
    expect(m.glissements.length).toBeGreaterThanOrEqual(1)
    const g = m.glissements[0]
    expect(g.principe).toBe('Faire émerger')
    expect(g.verbatim).toBe('As-tu terminé ton plan ?')
    expect(g.conseil.length).toBeGreaterThan(0)

    // 6 scores exactement, sur les indicateurs 1.1 / 1.4 / 2.1 / 2.4 / 2.5 / 2.6
    expect(m.scores.map((s) => s.indicateur)).toEqual(['1.1', '1.4', '2.1', '2.4', '2.5', '2.6'])
    // Note phase 0 présente → indicateur 1.1 valorisé à 80 ; question fermée présente → 2.4 = 55
    expect(m.scores.find((s) => s.indicateur === '1.1')!.score).toBe(80)
    expect(m.scores.find((s) => s.indicateur === '2.4')!.score).toBe(55)

    // note = moyenne arrondie des 6 scores
    const vals = m.scores.map((s) => s.score || 0)
    const attendue = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
    expect(m.note).toBe(attendue)
    expect(m.note).toBeGreaterThanOrEqual(0)
    expect(m.note).toBeLessThanOrEqual(100)
    // synthèse réflexive non vide
    expect(m.synthese.length).toBeGreaterThan(0)
  })

  it('TC-REL-082 — fallbackMiroir sur session vide : forces=[], glissement défaut (verbatim vide), score 2.5 = 45', () => {
    const m = fallbackMiroir(SID_VIDE)
    // Aucune question, aucune note → aucune force
    expect(m.forces).toEqual([])
    // Glissement « défaut » : verbatim vide, conseil présent
    expect(m.glissements.length).toBe(1)
    expect(m.glissements[0].principe).toBe('Faire émerger')
    expect(m.glissements[0].verbatim).toBe('')
    // ratio = 0 → score indicateur 2.5 = round(45) = 45
    expect(m.scores.find((s) => s.indicateur === '2.5')!.score).toBe(45)
    // 1.1 sans note d'ouverture → 60
    expect(m.scores.find((s) => s.indicateur === '1.1')!.score).toBe(60)
    // 2.4 sans question fermée → 66
    expect(m.scores.find((s) => s.indicateur === '2.4')!.score).toBe(66)
    // note reste dans [0,100]
    expect(m.note).toBeGreaterThanOrEqual(0)
    expect(m.note).toBeLessThanOrEqual(100)
  })
})
