import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '../../api/src/db'
import { retentionEligibles, anonymizeUser, deleteUser, processEffacement } from '../../api/src/ethique'

// Tests unitaires RGPD/éthique (ethique.ts) exécutés sur l'hôte contre une base SQLite jetable
// (DB_PATH=./.tmp-unit.sqlite, cf. vitest.config.ts). Toutes ces fonctions touchent la base : on
// procède à un seed minimal sous des ids très élevés et uniques (plage 90_000_0xx), puis on nettoie.
//
// Les ids sont déterministes (insertion explicite de la colonne id) pour des assertions exactes.

// Plage d'ids dédiée à ce fichier, hors de portée de tout jeu de données réel.
const BASE = 90_000_000

// Comptes de test
const A = BASE + 1 // accompagné éligible (tous dossiers clôturés, inactif > 36 mois)
const B = BASE + 2 // accompagné avec un dossier NON clôturé
const C = BASE + 3 // accompagné encore actif (session récente)
const D = BASE + 4 // accompagné déjà anonymisé
const E = BASE + 5 // accompagnateur (rôle exclu)
const F = BASE + 6 // accompagné sans aucun dossier
const G = BASE + 7 // accompagné inactif depuis ~10 mois
const H = BASE + 8 // accompagné « riche » pour anonymizeUser
const I = BASE + 9 // user simple pour deleteUser
const P1 = BASE + 10 // accompagné lié à une demande d'effacement (anonymiser)
const P2 = BASE + 11 // accompagné lié à une demande d'effacement (supprimer)
const ACC = BASE + 20 // accompagnateur de référence pour les dossiers

// Dossiers
const DOS_A = BASE + 100
const DOS_B1 = BASE + 101 // clôturé
const DOS_B2 = BASE + 102 // NON clôturé
const DOS_C = BASE + 103
const DOS_D = BASE + 104
const DOS_E = BASE + 105
const DOS_G = BASE + 106
const DOS_H = BASE + 107
const DOS_P1 = BASE + 108
const DOS_P2 = BASE + 109

// Demandes d'effacement
const DEM_P1 = BASE + 200
const DEM_P2 = BASE + 201

const allUserIds = [A, B, C, D, E, F, G, H, I, P1, P2, ACC]

function insUser(id: number, role: string, anonymise = 0, extra: Partial<{ nom: string; prenom: string; pwd: string }> = {}) {
  db.prepare(
    'INSERT INTO users (id, email, password_hash, role, nom, prenom, anonymise, actif) VALUES (?,?,?,?,?,?,?,1)',
  ).run(id, `u${id}@test.local`, extra.pwd ?? null, role, extra.nom ?? null, extra.prenom ?? null, anonymise)
}

// dossier avec une date de création contrôlée (offset SQLite, ex. '-40 months')
function insDossier(id: number, accompagneId: number, statut: string, creeOffset: string) {
  db.prepare(
    "INSERT INTO dossiers (id, accompagne_id, accompagnateur_id, titre, statut, cree_le) VALUES (?,?,?,?,?, datetime('now', ?))",
  ).run(id, accompagneId, ACC, 'Parcours test', statut, creeOffset)
}

function insSession(id: number, dossierId: number, dateOffset: string) {
  db.prepare("INSERT INTO sessions (id, dossier_id, date, statut) VALUES (?,?, datetime('now', ?), 'en_cours')").run(
    id,
    dossierId,
    dateOffset,
  )
}

beforeAll(() => {
  // Nettoyage préventif au cas où un run précédent aurait laissé des restes.
  cleanup()

  // ACC : accompagnateur porteur des dossiers de test
  insUser(ACC, 'accompagnateur')

  // --- A : éligible (un dossier clôturé créé il y a 40 mois, aucune session) ---
  insUser(A, 'accompagne')
  insDossier(DOS_A, A, 'cloture', '-40 months')

  // --- B : un dossier clôturé ancien + un dossier non clôturé → exclu ---
  insUser(B, 'accompagne')
  insDossier(DOS_B1, B, 'cloture', '-40 months')
  insDossier(DOS_B2, B, 'en_cours', '-40 months')

  // --- C : tous clôturés mais session récente (il y a 1 mois) → exclu ---
  insUser(C, 'accompagne')
  insDossier(DOS_C, C, 'cloture', '-40 months')
  insSession(BASE + 300, DOS_C, '-1 months')

  // --- D : accompagné déjà anonymisé, dossier clôturé ancien → exclu ---
  insUser(D, 'accompagne', 1)
  insDossier(DOS_D, D, 'cloture', '-40 months')

  // --- E : accompagnateur avec dossier clôturé ancien (en tant qu'accompagné fictif) → exclu (rôle) ---
  insUser(E, 'accompagnateur')
  insDossier(DOS_E, E, 'cloture', '-40 months')

  // --- F : accompagné sans aucun dossier → exclu (EXISTS) ---
  insUser(F, 'accompagne')

  // --- G : tous clôturés, inactif depuis ~10 mois (paramètre months) ---
  insUser(G, 'accompagne')
  insDossier(DOS_G, G, 'cloture', '-10 months')

  // --- H : accompagné « riche » pour anonymizeUser ---
  insUser(H, 'accompagne', 0, { nom: 'Durand', prenom: 'Alex', pwd: 'hash-secret' })
  insDossier(DOS_H, H, 'cloture', '-2 months')
  db.prepare('INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES (?,?,?,?)').run(
    H,
    `https://push.example/${H}`,
    'p256',
    'auth',
  )
  db.prepare("INSERT INTO tokens (user_id, type, valeur, expire_le) VALUES (?,'reset_mdp','tok', datetime('now','+1 day'))").run(H)
  db.prepare("INSERT INTO journal_entrees (dossier_id, accompagne_id, texte) VALUES (?,?,'mon journal intime')").run(DOS_H, H)
  db.prepare("INSERT INTO meteo_humeur (dossier_id, auteur_id, role, niveau, mot) VALUES (?,?,'accompagne',3,'fatigue')").run(DOS_H, H)
  db.prepare("INSERT INTO emotions_roue (dossier_id, auteur_id, role, emotions, note) VALUES (?,?,'accompagne','[\"joie\"]','une note libre')").run(DOS_H, H)

  // --- I : user simple pour deleteUser ---
  insUser(I, 'accompagne')

  // --- P1 / P2 : demandes d'effacement ---
  insUser(P1, 'accompagne')
  insDossier(DOS_P1, P1, 'en_cours', '-1 months')
  db.prepare("INSERT INTO demandes_effacement (id, dossier_id, accompagne_id, motif, statut) VALUES (?,?,?,'motif','en_attente')").run(DEM_P1, DOS_P1, P1)

  insUser(P2, 'accompagne')
  insDossier(DOS_P2, P2, 'en_cours', '-1 months')
  db.prepare("INSERT INTO demandes_effacement (id, dossier_id, accompagne_id, motif, statut) VALUES (?,?,?,'motif','en_attente')").run(DEM_P2, DOS_P2, P2)
})

function cleanup() {
  // L'ordre n'a pas d'importance grâce aux ON DELETE CASCADE, mais on est explicite.
  db.prepare('DELETE FROM demandes_effacement WHERE id IN (?,?)').run(DEM_P1, DEM_P2)
  for (const id of allUserIds) db.prepare('DELETE FROM users WHERE id=?').run(id)
}

afterAll(() => {
  cleanup()
})

describe('ETHIQUE — retentionEligibles (sélection des comptes à anonymiser)', () => {
  it('TC-ETHIQUE-033 / TC-UI-349 — sélectionne un accompagné dont tous les parcours sont clôturés et inactif > seuil', () => {
    const ids = retentionEligibles(36).map((r) => r.id)
    expect(ids).toContain(A)
    const row = retentionEligibles(36).find((r) => r.id === A)!
    expect(row.email).toBe(`u${A}@test.local`)
    expect(row.derniere_activite).not.toBeNull()
  })

  it('TC-ETHIQUE-034 — EXCLUT un accompagné ayant au moins un parcours non clôturé', () => {
    expect(retentionEligibles(36).map((r) => r.id)).not.toContain(B)
  })

  it('TC-ETHIQUE-035 — EXCLUT un accompagné encore actif (session récente < seuil)', () => {
    expect(retentionEligibles(36).map((r) => r.id)).not.toContain(C)
  })

  it('TC-ETHIQUE-036 — EXCLUT les comptes déjà anonymisés et les non-accompagnés', () => {
    const ids = retentionEligibles(36).map((r) => r.id)
    expect(ids).not.toContain(D) // anonymise=1
    expect(ids).not.toContain(E) // role=accompagnateur
  })

  it('TC-ETHIQUE-037 — EXCLUT un accompagné SANS aucun dossier', () => {
    expect(retentionEligibles(36).map((r) => r.id)).not.toContain(F)
  })

  it('TC-ETHIQUE-038 — le paramètre months déplace le seuil (G absent à 36, présent à 6)', () => {
    expect(retentionEligibles(36).map((r) => r.id)).not.toContain(G)
    expect(retentionEligibles(6).map((r) => r.id)).toContain(G)
  })
})

describe('ETHIQUE — anonymizeUser (efface l’identité, conserve les parcours)', () => {
  it('TC-ETHIQUE-039 / TC-UI-348 — efface identité et contenus libres, supprime tokens/push/journal, conserve les dossiers', () => {
    anonymizeUser(H)

    const u = db.prepare('SELECT email, nom, prenom, password_hash, actif, anonymise FROM users WHERE id=?').get(H) as {
      email: string
      nom: string | null
      prenom: string | null
      password_hash: string | null
      actif: number
      anonymise: number
    }
    expect(u.email).toBe(`anonyme-${H}@boussole.local`)
    expect(u.nom).toBeNull()
    expect(u.prenom).toBeNull()
    expect(u.password_hash).toBeNull()
    expect(u.actif).toBe(0)
    expect(u.anonymise).toBe(1)

    // Données effacées
    expect((db.prepare('SELECT COUNT(*) n FROM push_subscriptions WHERE user_id=?').get(H) as { n: number }).n).toBe(0)
    expect((db.prepare('SELECT COUNT(*) n FROM tokens WHERE user_id=?').get(H) as { n: number }).n).toBe(0)
    expect((db.prepare('SELECT COUNT(*) n FROM journal_entrees WHERE accompagne_id=?').get(H) as { n: number }).n).toBe(0)

    // Contenus libres mis à NULL (les lignes restent)
    const mot = db.prepare('SELECT mot FROM meteo_humeur WHERE auteur_id=?').get(H) as { mot: string | null }
    expect(mot.mot).toBeNull()
    const note = db.prepare('SELECT note FROM emotions_roue WHERE auteur_id=?').get(H) as { note: string | null }
    expect(note.note).toBeNull()

    // Parcours conservés
    expect((db.prepare('SELECT COUNT(*) n FROM dossiers WHERE accompagne_id=?').get(H) as { n: number }).n).toBe(1)
  })

  it('TC-ETHIQUE-040 — ne fait rien (sans erreur) sur un id inexistant', () => {
    const before = (db.prepare('SELECT COUNT(*) n FROM users').get() as { n: number }).n
    expect(() => anonymizeUser(99_999_999)).not.toThrow()
    const after = (db.prepare('SELECT COUNT(*) n FROM users').get() as { n: number }).n
    expect(after).toBe(before)
  })
})

describe('ETHIQUE — processEffacement / deleteUser', () => {
  it('TC-ETHIQUE-041 / TC-UI-350 — anonymiser : retourne true, anonymise le compte, marque la demande traitee', () => {
    const ok = processEffacement(DEM_P1, 'anonymiser')
    expect(ok).toBe(true)

    const u = db.prepare('SELECT email, anonymise FROM users WHERE id=?').get(P1) as { email: string; anonymise: number }
    expect(u.anonymise).toBe(1)
    expect(u.email).toBe(`anonyme-${P1}@boussole.local`)

    const dem = db.prepare('SELECT statut, action, traite_le FROM demandes_effacement WHERE id=?').get(DEM_P1) as {
      statut: string
      action: string | null
      traite_le: string | null
    }
    expect(dem.statut).toBe('traitee')
    expect(dem.action).toBe('anonymiser')
    expect(dem.traite_le).not.toBeNull()
  })

  it('TC-ETHIQUE-042 — supprimer : retourne true, supprime le compte (demande en cascade), aucun update de statut', () => {
    const ok = processEffacement(DEM_P2, 'supprimer')
    expect(ok).toBe(true)

    // Compte supprimé
    expect(db.prepare('SELECT id FROM users WHERE id=?').get(P2)).toBeUndefined()
    // La demande part en cascade (dossier supprimé via users → dossiers → demandes_effacement)
    expect(db.prepare('SELECT id FROM demandes_effacement WHERE id=?').get(DEM_P2)).toBeUndefined()
  })

  it('TC-ETHIQUE-043 — retourne false si la demande n’existe pas (aucun effacement)', () => {
    expect(processEffacement(99_999_999, 'anonymiser')).toBe(false)
  })

  it('TC-ETHIQUE-044 — deleteUser retire le compte de la table users', () => {
    expect(db.prepare('SELECT id FROM users WHERE id=?').get(I)).toBeDefined()
    deleteUser(I)
    expect(db.prepare('SELECT id FROM users WHERE id=?').get(I)).toBeUndefined()
  })
})
