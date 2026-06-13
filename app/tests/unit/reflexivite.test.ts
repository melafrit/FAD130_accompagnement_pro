import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '../../api/src/db'
import {
  extractJson,
  analyseQuestionFallback,
  bilanFallback,
  sessionTraces,
  momentsDeSession,
} from '../../api/src/reflexivite'
import { GRILLE } from '../../api/src/grille'

// Tests unitaires du module « réflexivité » exécutés sur l'hôte.
// - Fonctions PURES (extractJson, analyseQuestionFallback) : assertions directes, déterministes.
// - Fonctions touchant la base (bilanFallback, sessionTraces, momentsDeSession) : seedage minimal
//   dans la base jetable './.tmp-unit.sqlite' (cf. vitest.config.ts) avec des ids très élevés et
//   uniques, nettoyés en fin de suite. Aucun appel réseau (pas de clé IA) : on teste les replis.

// ────────────────────────────────────────────────────────────────────────────
//  Fonctions PURES
// ────────────────────────────────────────────────────────────────────────────
describe('REFLEX — unitaires purs (extractJson, analyseQuestionFallback)', () => {
  it("TC-REFLEX-014 — extractJson isole le JSON encadré, sinon null (bruit, cassé, null)", () => {
    // 1) JSON noyé dans du texte : isolé du 1er '{' au dernier '}'.
    expect(extractJson<{ forces: string[]; axes: string[] }>('voici: {"forces":["a"],"axes":[]} merci'))
      .toEqual({ forces: ['a'], axes: [] })
    // 2) Pas d'accolade → null.
    expect(extractJson('pas de json')).toBeNull()
    // 3) JSON syntaxiquement invalide → null (catch sur JSON.parse).
    expect(extractJson('{cassé')).toBeNull()
    // 4) Entrée null → null.
    expect(extractJson(null)).toBeNull()
  })

  it("TC-REFLEX-028 — analyseQuestionFallback classe une question ouverte (OPEN_RE, pas FERME_RE)", () => {
    // NB : « as-tu » déclencherait FERME_RE → on choisit une amorce purement ouverte.
    const r = analyseQuestionFallback('Comment vis-tu cette situation ?')
    expect(r.type).toBe('ouverte')
    expect(r.ouverte).toBe(true)
    expect(r.remarque).toBe('Question ouverte et peu inductive : elle laisse la personne explorer.')
    expect(r.reformulation).toBeNull()
  })

  it("TC-REFLEX-029 — analyseQuestionFallback classe une question fermée (FERME_RE, non induite)", () => {
    const q = 'As-tu terminé ton plan ?'
    const r = analyseQuestionFallback(q)
    expect(r.type).toBe('fermée')
    expect(r.ouverte).toBe(false)
    expect(r.remarque.startsWith('Question plutôt fermée')).toBe(true)
    expect(r.reformulation).not.toBeNull()
    // La reformulation cite un extrait de la question.
    expect(r.reformulation).toContain('As-tu terminé ton plan')
  })

  it("TC-REFLEX-030 — analyseQuestionFallback classe une question inductive (« tu dois »)", () => {
    const r = analyseQuestionFallback('Tu dois revoir ton plan, non ?')
    expect(r.type).toBe('inductive')
    expect(r.ouverte).toBe(false)
    expect(r.remarque).toContain('induction')
    expect(r.reformulation).not.toBeNull()
  })

  it("TC-REFLEX-031 — OPEN_RE neutralisée par un marqueur fermé (ouverte && FERME_RE → non ouverte)", () => {
    const r = analyseQuestionFallback('Comment, est-ce que tu as fini ?')
    expect(r.ouverte).toBe(false)
    expect(r.type).not.toBe('ouverte')
  })

  it("TC-REFLEX-032 — reformulation : l'extrait de la question est tronqué à 60 caractères", () => {
    // Question fermée de plus de 60 caractères (déclenche la branche reformulation).
    const q = 'As-tu vraiment terminé la rédaction complète de ton mémoire de fin de cursus universitaire cette semaine ?'
    expect(q.length).toBeGreaterThan(60)
    const r = analyseQuestionFallback(q)
    expect(r.reformulation).not.toBeNull()
    // L'extrait inséré est q.slice(0,60) ; il est présent et le caractère 61 ne l'est pas en bloc.
    const extrait = q.slice(0, 60)
    expect(r.reformulation).toContain(extrait)
    // La portion au-delà de 60 caractères n'apparaît pas dans la reformulation.
    expect(r.reformulation).not.toContain(q.slice(0, 61))
  })
})

// ────────────────────────────────────────────────────────────────────────────
//  Fonctions touchant la base (seedage minimal dans la base jetable)
// ────────────────────────────────────────────────────────────────────────────

// Plage d'ids dédiée à ce fichier (élevée pour éviter toute collision).
const ACC_ID = 9_910_001 // accompagné
const TUT_ID = 9_910_002 // accompagnateur (cible de bilanFallback)
const DOS_ID = 9_910_010 // dossier liant les deux
const EVAL_ID = 9_910_020 // auto-évaluation rattachée au dossier
const SESS_ID = 9_910_030 // session (entretien) pour traces / moments

const insUser = db.prepare("INSERT INTO users (id, email, role) VALUES (?, ?, ?)")
const insDossier = db.prepare(
  'INSERT INTO dossiers (id, accompagne_id, accompagnateur_id, titre) VALUES (?, ?, ?, ?)',
)
const insEval = db.prepare("INSERT INTO auto_evaluations (id, dossier_id) VALUES (?, ?)")
const insScore = db.prepare('INSERT INTO auto_evaluation_scores (eval_id, indicateur, score) VALUES (?, ?, ?)')
const insSession = db.prepare('INSERT INTO sessions (id, dossier_id) VALUES (?, ?)')
const insQuestion = db.prepare(
  'INSERT INTO questions_entretien (id, session_id, phase, texte, reponse) VALUES (?, ?, ?, ?, ?)',
)
const insReponse = db.prepare(
  'INSERT INTO reponses (session_id, phase, texte_reponse) VALUES (?, ?, ?)',
)

function purge(): void {
  db.prepare('DELETE FROM auto_evaluation_scores WHERE eval_id=?').run(EVAL_ID)
  db.prepare('DELETE FROM auto_evaluations WHERE id=?').run(EVAL_ID)
  db.prepare('DELETE FROM questions_entretien WHERE session_id=?').run(SESS_ID)
  db.prepare('DELETE FROM reponses WHERE session_id=?').run(SESS_ID)
  db.prepare('DELETE FROM sessions WHERE id=?').run(SESS_ID)
  db.prepare('DELETE FROM dossiers WHERE id=?').run(DOS_ID)
  db.prepare('DELETE FROM users WHERE id IN (?, ?)').run(ACC_ID, TUT_ID)
}

// Libellé attendu d'un indicateur connu (miroir de INDIC_LABEL côté source).
const LBL = (id: string): string => {
  for (const c of GRILLE) for (const i of c.indicateurs) if (i.id === id) return i.texte
  return id
}

describe('REFLEX — unitaires base jetable (bilanFallback, sessionTraces, momentsDeSession)', () => {
  beforeAll(() => {
    purge()
    insUser.run(ACC_ID, `acc-${ACC_ID}@test.local`, 'accompagne')
    insUser.run(TUT_ID, `tut-${TUT_ID}@test.local`, 'accompagnateur')
    insDossier.run(DOS_ID, ACC_ID, TUT_ID, 'Dossier test réflexivité')
    insEval.run(EVAL_ID, DOS_ID)
    insSession.run(SESS_ID, DOS_ID)
  })

  afterAll(() => {
    purge()
  })

  it("TC-REFLEX-012 — bilanFallback : forces = top 3 (moy DESC), axes = bottom 3 (ordre inversé), conseils = 3", () => {
    // 6 indicateurs connus, moyennes distinctes 90,80,70,40,30,20 (un score par indicateur → AVG = score).
    const seed: [string, number][] = [
      ['1.1', 90],
      ['1.2', 80],
      ['1.3', 70],
      ['1.4', 40],
      ['1.5', 30],
      ['1.6', 20],
    ]
    for (const [ind, sc] of seed) insScore.run(EVAL_ID, ind, sc)

    const bilan = bilanFallback(TUT_ID)

    // forces : 3 plus hautes moyennes, ordre décroissant, format « <label> (<arrondi>/100) ».
    expect(bilan.forces).toEqual([
      `${LBL('1.1')} (90/100)`,
      `${LBL('1.2')} (80/100)`,
      `${LBL('1.3')} (70/100)`,
    ])
    // axes : 3 plus basses moyennes, ordre inversé (la plus basse d'abord).
    expect(bilan.axes).toEqual([
      `${LBL('1.6')} (20/100)`,
      `${LBL('1.5')} (30/100)`,
      `${LBL('1.4')} (40/100)`,
    ])
    // evolution / synthese non vides ; conseils = exactement 3 entrées.
    expect(bilan.evolution.length).toBeGreaterThan(0)
    expect(bilan.synthese.length).toBeGreaterThan(0)
    expect(bilan.conseils).toHaveLength(3)

    // Nettoyage des scores pour isoler le cas suivant.
    db.prepare('DELETE FROM auto_evaluation_scores WHERE eval_id=?').run(EVAL_ID)
  })

  it("TC-REFLEX-013 — bilanFallback : libellé inconnu → repli sur l'id brut (« inconnu_x (55/100) »)", () => {
    insScore.run(EVAL_ID, 'inconnu_x', 55)

    const bilan = bilanFallback(TUT_ID)
    // Un seul score : il apparaît à la fois en force et en axe, libellé = id brut.
    expect(bilan.forces).toContain('inconnu_x (55/100)')
    expect(bilan.axes).toContain('inconnu_x (55/100)')

    db.prepare('DELETE FROM auto_evaluation_scores WHERE eval_id=?').run(EVAL_ID)
  })

  it("TC-REFLEX-051 — sessionTraces agrège questions+notes par phase ; « (aucune trace) » si vide", () => {
    // Cas B d'abord : session sans aucune trace.
    expect(sessionTraces(SESS_ID)).toBe('(aucune trace)')

    // Cas A : questions + notes sur les phases 0 et 2 ; phase 1 sans contenu (doit être omise).
    insQuestion.run(9_910_101, SESS_ID, '0', 'Qu’est-ce qui t’amène ?', 'Mon mémoire')
    insQuestion.run(9_910_102, SESS_ID, '2', 'Raconte une situation.', null)
    insReponse.run(SESS_ID, '0', 'Notes phase accueil')
    insReponse.run(SESS_ID, '2', 'Notes exploration')

    const tr = sessionTraces(SESS_ID)
    // Titres des phases présentes.
    expect(tr).toContain('### Accueil et mise en confiance')
    expect(tr).toContain('### Explorer l’expérience')
    // Question avec réponse → « • question → reponse » ; sans réponse → juste « • question ».
    expect(tr).toContain('• Qu’est-ce qui t’amène ? → Mon mémoire')
    expect(tr).toContain('• Raconte une situation.')
    // Notes de phase.
    expect(tr).toContain('Notes : Notes phase accueil')
    expect(tr).toContain('Notes : Notes exploration')
    // Phase 1 (Clarifier le besoin) sans contenu → omise.
    expect(tr).not.toContain('Clarifier le besoin')

    db.prepare('DELETE FROM questions_entretien WHERE session_id=?').run(SESS_ID)
    db.prepare('DELETE FROM reponses WHERE session_id=?').run(SESS_ID)
  })

  it("TC-REFLEX-067 — momentsDeSession mappe les questions en moments (titre de phase, phase inconnue, reponse null)", () => {
    insQuestion.run(9_910_201, SESS_ID, '2', 'Raconte une situation dont tu es fier.', 'Une livraison réussie')
    insQuestion.run(9_910_202, SESS_ID, '9', 'Question hors phase connue', null)

    const moments = momentsDeSession(SESS_ID)
    expect(moments).toHaveLength(2)

    // Phase connue (2) → titre de PHASES[2] ; ref = « q<id> » ; reponse conservée.
    const m0 = moments.find((m) => m.ref === 'q9910201')
    expect(m0).toBeDefined()
    expect(m0?.phase).toBe(2)
    expect(m0?.titre).toBe('Explorer l’expérience')
    expect(m0?.question).toBe('Raconte une situation dont tu es fier.')
    expect(m0?.reponse).toBe('Une livraison réussie')
    expect(m0?.annotation).toBe('')

    // Phase inconnue (9) → titre « Phase <n+1> » = « Phase 10 » ; reponse null → ''.
    const m1 = moments.find((m) => m.ref === 'q9910202')
    expect(m1).toBeDefined()
    expect(m1?.phase).toBe(9)
    expect(m1?.titre).toBe('Phase 10')
    expect(m1?.reponse).toBe('')

    db.prepare('DELETE FROM questions_entretien WHERE session_id=?').run(SESS_ID)
  })
})
