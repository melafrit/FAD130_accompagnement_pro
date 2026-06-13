import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '../../api/src/db'
import { sweepDueReminders } from '../../api/src/notifications'

// Tests unitaires de sweepDueReminders() exécutés sur l'hôte : la base est la base jetable
// './.tmp-unit.sqlite' (cf. vitest.config.ts env.DB_PATH). On seede un dossier minimal
// (1 accompagné + 1 accompagnateur) avec des ids très élevés et uniques pour ne croiser
// aucune autre donnée, puis on nettoie. sendEmail retombe sur son repli (pas de BREVO_API_KEY),
// donc aucun appel réseau réel.

// Plage d'ids dédiée à ce fichier (élevée pour éviter toute collision).
const ACC_ID = 9_900_001 // accompagné
const TUT_ID = 9_900_002 // accompagnateur
const DOS_ID = 9_900_010 // dossier liant les deux

// Ids d'actions (un par scénario, pour rester indépendants).
const ACT_DUE = 9_900_100 // rappel échu, avec échéance
const ACT_DUE_BIS = 9_900_101 // 2e action échue (idempotence : compte exact)
const ACT_FUTURE = 9_900_110 // rappel futur (ne doit pas déclencher)
const ACT_NO_ECH = 9_900_120 // rappel échu, sans échéance

const insUser = db.prepare("INSERT INTO users (id, email, role) VALUES (?, ?, ?)")
const insDossier = db.prepare(
  'INSERT INTO dossiers (id, accompagne_id, accompagnateur_id, titre) VALUES (?, ?, ?, ?)',
)
const insAction = db.prepare(
  'INSERT INTO actions (id, dossier_id, libelle, echeance, rappel_le, rappel_envoye) VALUES (?, ?, ?, ?, ?, 0)',
)
const countNotifs = db.prepare(
  'SELECT COUNT(*) AS n FROM notifications WHERE user_id IN (?, ?)',
)
const getRappelEnvoye = db.prepare('SELECT rappel_envoye AS r FROM actions WHERE id=?')
const notifsTextes = db.prepare(
  'SELECT texte FROM notifications WHERE user_id=? ORDER BY id ASC',
)

function purge(): void {
  // Ordre : notifications/actions/dossier d'abord, puis users (FK ON DELETE CASCADE couvrirait,
  // mais on reste explicite pour ne dépendre d'aucun pragma).
  db.prepare('DELETE FROM notifications WHERE user_id IN (?, ?)').run(ACC_ID, TUT_ID)
  db.prepare('DELETE FROM actions WHERE dossier_id=?').run(DOS_ID)
  db.prepare('DELETE FROM dossiers WHERE id=?').run(DOS_ID)
  db.prepare('DELETE FROM users WHERE id IN (?, ?)').run(ACC_ID, TUT_ID)
}

describe('ACTNOTIF — unitaires (sweepDueReminders, base jetable)', () => {
  beforeAll(() => {
    purge()
    insUser.run(ACC_ID, `acc-${ACC_ID}@test.local`, 'accompagne')
    insUser.run(TUT_ID, `tut-${TUT_ID}@test.local`, 'accompagnateur')
    insDossier.run(DOS_ID, ACC_ID, TUT_ID, 'Dossier test rappels')
  })

  afterAll(() => {
    purge()
  })

  it("TC-ACT-042 — sweepDueReminders() idempotent : 2 notifications au 1er passage, 0 au 2e, rappel_envoye=1", () => {
    // Une seule action échue → exactement 1 notif accompagné + 1 notif accompagnateur.
    insAction.run(ACT_DUE_BIS, DOS_ID, 'Action idempotente', null, '2000-01-01')

    sweepDueReminders()
    const apres1 = (countNotifs.get(ACC_ID, TUT_ID) as { n: number }).n
    expect(apres1).toBe(2) // 1 accompagné + 1 accompagnateur

    sweepDueReminders() // 2e passage : rappel_envoye déjà à 1 → aucune nouvelle notif
    const apres2 = (countNotifs.get(ACC_ID, TUT_ID) as { n: number }).n
    expect(apres2).toBe(2)

    expect((getRappelEnvoye.get(ACT_DUE_BIS) as { r: number }).r).toBe(1)

    // Nettoyage de ce cas pour isoler les suivants.
    db.prepare('DELETE FROM notifications WHERE user_id IN (?, ?)').run(ACC_ID, TUT_ID)
    db.prepare('DELETE FROM actions WHERE id=?').run(ACT_DUE_BIS)
  })

  it("TC-ACT-043 — sweepDueReminders() : seuil de date (échue déclenchée, future ignorée)", () => {
    insAction.run(ACT_DUE, DOS_ID, 'Action passée', '2026-06-10', '2000-01-01') // échu
    insAction.run(ACT_FUTURE, DOS_ID, 'Action future', '2999-12-31', '2999-12-31') // non échu

    sweepDueReminders()

    // L'action échue a notifié (2 entrées) et passe rappel_envoye=1 ;
    // l'action future reste à 0 et n'ajoute rien.
    const total = (countNotifs.get(ACC_ID, TUT_ID) as { n: number }).n
    expect(total).toBe(2)
    expect((getRappelEnvoye.get(ACT_DUE) as { r: number }).r).toBe(1)
    expect((getRappelEnvoye.get(ACT_FUTURE) as { r: number }).r).toBe(0)

    db.prepare('DELETE FROM notifications WHERE user_id IN (?, ?)').run(ACC_ID, TUT_ID)
    db.prepare('DELETE FROM actions WHERE id IN (?, ?)').run(ACT_DUE, ACT_FUTURE)
  })

  it("TC-ACT-044 — sweepDueReminders() : texte de notification avec et sans échéance", () => {
    // Cas 1 : avec échéance → segment « — échéance le … » présent.
    insAction.run(ACT_DUE, DOS_ID, 'Pitch', '2026-06-10', '2000-01-01')
    sweepDueReminders()
    const avecEch = (notifsTextes.get(ACC_ID) as { texte: string }).texte
    expect(avecEch).toBe('Rappel : « Pitch » — échéance le 2026-06-10.')

    db.prepare('DELETE FROM notifications WHERE user_id IN (?, ?)').run(ACC_ID, TUT_ID)
    db.prepare('DELETE FROM actions WHERE id=?').run(ACT_DUE)

    // Cas 2 : sans échéance → segment échéance omis.
    insAction.run(ACT_NO_ECH, DOS_ID, 'Pitch', null, '2000-01-01')
    sweepDueReminders()
    const sansEch = (notifsTextes.get(ACC_ID) as { texte: string }).texte
    expect(sansEch).toBe('Rappel : « Pitch ».')
    expect(sansEch).toContain('Pitch') // présence du libellé

    db.prepare('DELETE FROM notifications WHERE user_id IN (?, ?)').run(ACC_ID, TUT_ID)
    db.prepare('DELETE FROM actions WHERE id=?').run(ACT_NO_ECH)
  })
})
