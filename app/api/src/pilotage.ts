import { Router, type Request, type Response } from 'express'
import { db } from './db'
import { requireAuth, requireRole } from './auth'
import { requireFeature, userFeatures } from './features'
import { sendEmail, digestEmail } from './mailer'

// Pilotage & alertes (accompagnateur) :
//  - Signaux faibles : détection de décrochage par règles déterministes → voyant 🟢🟠🔴 + alerte
//  - Tableau d'impact : indicateurs agrégés sur tous les parcours suivis
//  - Digest hebdomadaire : email récapitulatif de la semaine
const router = Router()
interface U { id: number; role: string }
const getUser = (req: Request) => (req as Request & { user?: U }).user as U

const esc = (s: string) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))
function joursDepuis(iso: string | null): number | null {
  if (!iso) return null
  const t = Date.parse(iso.includes('T') ? iso : iso.replace(' ', 'T'))
  if (Number.isNaN(t)) return null
  return Math.floor((Date.now() - t) / 86400000)
}

interface DossierRow {
  id: number; statut: string; cree_le: string; prenom: string | null; email: string
  nb_sessions: number; last_session: string | null; phase_max: number | null
  questionnaire_complete: string | null; last_cr: string | null; nb_cr_publies: number
  actions_retard: number; actions_total: number; actions_faites: number
  syntheses_publiees: number; last_journal: string | null; demandes_rdv: number; rdv_avenir: number
}

const BASE_SQL = `
  SELECT d.id, d.statut, d.cree_le, u.prenom AS prenom, u.email AS email,
    (SELECT COUNT(*) FROM sessions s WHERE s.dossier_id=d.id) AS nb_sessions,
    (SELECT MAX(s.date) FROM sessions s WHERE s.dossier_id=d.id) AS last_session,
    (SELECT MAX(CAST(s.phase_atteinte AS INTEGER)) FROM sessions s WHERE s.dossier_id=d.id) AS phase_max,
    (SELECT q.complete_le FROM questionnaires_initiaux q WHERE q.dossier_id=d.id) AS questionnaire_complete,
    (SELECT MAX(cr.publie_le) FROM comptes_rendus cr JOIN sessions s2 ON s2.id=cr.session_id WHERE s2.dossier_id=d.id AND cr.publie=1) AS last_cr,
    (SELECT COUNT(*) FROM comptes_rendus cr JOIN sessions s3 ON s3.id=cr.session_id WHERE s3.dossier_id=d.id AND cr.publie=1) AS nb_cr_publies,
    (SELECT COUNT(*) FROM actions a WHERE a.dossier_id=d.id AND a.statut!='fait' AND a.echeance IS NOT NULL AND a.echeance < date('now')) AS actions_retard,
    (SELECT COUNT(*) FROM actions a WHERE a.dossier_id=d.id) AS actions_total,
    (SELECT COUNT(*) FROM actions a WHERE a.dossier_id=d.id AND a.statut='fait') AS actions_faites,
    (SELECT COUNT(*) FROM syntheses sy WHERE sy.dossier_id=d.id AND sy.publie=1) AS syntheses_publiees,
    (SELECT MAX(j.cree_le) FROM journal_entrees j WHERE j.dossier_id=d.id) AS last_journal,
    (SELECT COUNT(*) FROM demandes_rdv dr WHERE dr.dossier_id=d.id AND dr.statut='en_attente') AS demandes_rdv,
    (SELECT COUNT(*) FROM rdv r JOIN creneaux c ON c.id=r.creneau_id WHERE r.dossier_id=d.id AND c.debut > datetime('now')) AS rdv_avenir
  FROM dossiers d JOIN users u ON u.id=d.accompagne_id
  WHERE d.accompagnateur_id=?
  ORDER BY d.cree_le DESC`

interface Meteo { niveau: number; mot: string | null; cree_le: string }
type Niveau = 'vert' | 'orange' | 'rouge'
interface Signal { dossier_id: number; prenom: string; niveau: Niveau; raisons: string[]; signature: string }

// Règles déterministes de décrochage. Renvoie le voyant + la liste des raisons.
function signauxDossier(d: DossierRow): { niveau: Niveau; raisons: string[] } {
  if (d.statut === 'cloture') return { niveau: 'vert', raisons: ['Parcours clôturé'] }
  const rouges: string[] = []
  const oranges: string[] = []

  const derniereActivite = [d.last_session, d.last_cr, d.last_journal, d.cree_le].filter(Boolean) as string[]
  const inactif = derniereActivite.length ? Math.min(...derniereActivite.map((x) => joursDepuis(x) ?? 9999)) : null
  if (inactif != null) {
    if (inactif > 30) rouges.push(`Aucune activité depuis ${inactif} jours`)
    else if (inactif > 14) oranges.push(`Activité en baisse (${inactif} jours sans interaction)`)
  }

  const ageCreation = joursDepuis(d.cree_le)
  if (!d.questionnaire_complete && ageCreation != null && ageCreation > 7) oranges.push('Questionnaire initial non complété')

  if (d.actions_retard >= 3) rouges.push(`${d.actions_retard} actions en retard`)
  else if (d.actions_retard >= 1) oranges.push(`${d.actions_retard} action${d.actions_retard > 1 ? 's' : ''} en retard`)

  if (d.demandes_rdv > 0) oranges.push('Demande de rendez-vous en attente')

  const joursDernierEntretien = joursDepuis(d.last_session)
  if (d.nb_sessions > 0 && d.rdv_avenir === 0 && joursDernierEntretien != null && joursDernierEntretien > 14)
    oranges.push('Aucun rendez-vous planifié')

  // Météo : dernier niveau bas et/ou tendance à la baisse
  const meteo = db.prepare("SELECT niveau, mot, cree_le FROM meteo_humeur WHERE dossier_id=? AND role='accompagne' ORDER BY cree_le DESC LIMIT 2").all(d.id) as Meteo[]
  if (meteo.length) {
    if (meteo[0].niveau <= 2) oranges.push(`Météo au plus bas${meteo[0].mot ? ` (« ${meteo[0].mot} »)` : ''}`)
    else if (meteo.length === 2 && meteo[1].niveau - meteo[0].niveau >= 2) oranges.push('Moral en baisse')
  }

  const niveau: Niveau = rouges.length ? 'rouge' : oranges.length ? 'orange' : 'vert'
  const raisons = niveau === 'rouge' ? [...rouges, ...oranges] : niveau === 'orange' ? oranges : ['Parcours en bonne santé']
  return { niveau, raisons }
}

function computeSignaux(accId: number): Signal[] {
  const rows = db.prepare(BASE_SQL).all(accId) as DossierRow[]
  return rows.map((d) => {
    const { niveau, raisons } = signauxDossier(d)
    return { dossier_id: d.id, prenom: d.prenom || d.email, niveau, raisons, signature: `${niveau}|${[...raisons].sort().join(';')}` }
  })
}

const EMOJI: Record<Niveau, string> = { vert: '🟢', orange: '🟠', rouge: '🔴' }

// Indicateurs d'impact agrégés sur tous les parcours suivis par l'accompagnateur.
function computeImpact(accId: number) {
  const rows = db.prepare(BASE_SQL).all(accId) as DossierRow[]
  const actifs = rows.filter((d) => d.statut !== 'cloture')
  const actionsTotal = rows.reduce((a, d) => a + d.actions_total, 0)
  const actionsFaites = rows.reduce((a, d) => a + d.actions_faites, 0)
  const progressions = actifs.map((d) => (d.phase_max != null ? (d.phase_max + 1) / 6 : 0))
  const progressionMoy = progressions.length ? Math.round((progressions.reduce((a, b) => a + b, 0) / progressions.length) * 100) : 0

  // Évolution de la météo : premier vs dernier relevé par accompagné
  let deltas = 0, nDeltas = 0
  for (const d of rows) {
    const m = db.prepare("SELECT niveau, cree_le FROM meteo_humeur WHERE dossier_id=? AND role='accompagne' ORDER BY cree_le").all(d.id) as Meteo[]
    if (m.length >= 2) { deltas += m[m.length - 1].niveau - m[0].niveau; nDeltas++ }
  }
  const signaux = computeSignaux(accId)
  return {
    dossiers_actifs: actifs.length,
    dossiers_clotures: rows.length - actifs.length,
    entretiens_total: rows.reduce((a, d) => a + d.nb_sessions, 0),
    cr_publies: rows.reduce((a, d) => a + d.nb_cr_publies, 0),
    syntheses_publiees: rows.reduce((a, d) => a + d.syntheses_publiees, 0),
    actions_total: actionsTotal,
    actions_faites: actionsFaites,
    taux_actions: actionsTotal ? Math.round((actionsFaites / actionsTotal) * 100) : 0,
    progression_moyenne: progressionMoy,
    meteo_evolution: nDeltas ? Math.round((deltas / nDeltas) * 10) / 10 : null,
    signaux: {
      vert: signaux.filter((s) => s.niveau === 'vert').length,
      orange: signaux.filter((s) => s.niveau === 'orange').length,
      rouge: signaux.filter((s) => s.niveau === 'rouge').length,
    },
  }
}

interface DigestLigne {
  dossier_id: number; prenom: string; niveau: Niveau
  cr_semaine: number; meteo_semaine: number; journal_semaine: number; actions_retard: number; rdv_7j: number
}
function buildDigest(accId: number) {
  const rows = db.prepare(BASE_SQL).all(accId) as DossierRow[]
  const signaux = computeSignaux(accId)
  const niveauDe = (id: number) => signaux.find((s) => s.dossier_id === id)?.niveau || 'vert'
  const lignes: DigestLigne[] = rows.map((d) => {
    const cr = (db.prepare("SELECT COUNT(*) n FROM comptes_rendus cr JOIN sessions s ON s.id=cr.session_id WHERE s.dossier_id=? AND cr.publie=1 AND cr.publie_le >= date('now','-7 days')").get(d.id) as { n: number }).n
    const meteo = (db.prepare("SELECT COUNT(*) n FROM meteo_humeur WHERE dossier_id=? AND role='accompagne' AND cree_le >= date('now','-7 days')").get(d.id) as { n: number }).n
    const journal = (db.prepare("SELECT COUNT(*) n FROM journal_entrees WHERE dossier_id=? AND partage=1 AND cree_le >= date('now','-7 days')").get(d.id) as { n: number }).n
    const rdv7 = (db.prepare("SELECT COUNT(*) n FROM rdv r JOIN creneaux c ON c.id=r.creneau_id WHERE r.dossier_id=? AND c.debut BETWEEN datetime('now') AND datetime('now','+7 days')").get(d.id) as { n: number }).n
    return { dossier_id: d.id, prenom: d.prenom || d.email, niveau: niveauDe(d.id), cr_semaine: cr, meteo_semaine: meteo, journal_semaine: journal, actions_retard: d.actions_retard, rdv_7j: rdv7 }
  })
  const impact = computeImpact(accId)
  const alertes = lignes.filter((l) => l.niveau !== 'vert')
  const actives = lignes.filter((l) => l.cr_semaine || l.meteo_semaine || l.journal_semaine || l.rdv_7j || l.actions_retard)

  const html =
    `<p>Voici le récapitulatif de votre semaine d'accompagnement.</p>` +
    `<p><strong>${impact.dossiers_actifs}</strong> parcours actifs · <strong>${impact.taux_actions}%</strong> d'actions réalisées · progression moyenne <strong>${impact.progression_moyenne}%</strong>.</p>` +
    (alertes.length
      ? `<h4>Points de vigilance</h4><ul>${alertes.map((l) => `<li>${EMOJI[l.niveau]} <strong>${esc(l.prenom)}</strong> — ${l.actions_retard ? `${l.actions_retard} action(s) en retard` : 'à recontacter'}</li>`).join('')}</ul>`
      : `<p>✅ Aucun signal de décrochage cette semaine.</p>`) +
    (actives.length
      ? `<h4>Activité de la semaine</h4><ul>${actives.map((l) => {
          const bits = [l.cr_semaine ? `${l.cr_semaine} CR publié(s)` : '', l.meteo_semaine ? `${l.meteo_semaine} météo` : '', l.journal_semaine ? `${l.journal_semaine} note(s) partagée(s)` : '', l.rdv_7j ? `${l.rdv_7j} RDV à venir` : ''].filter(Boolean)
          return `<li><strong>${esc(l.prenom)}</strong> : ${bits.join(' · ')}</li>`
        }).join('')}</ul>`
      : `<p>Aucune nouvelle activité des accompagnés cette semaine.</p>`)

  return { periode: '7 derniers jours', lignes, impact, resume: { alertes: alertes.length, actifs: impact.dossiers_actifs }, html }
}

// --- Alerte (Option 3) : notifie l'accompagnateur aux CHANGEMENTS d'état (déduplication par signature) ---
export function sweepSignauxAlertes(): void {
  const accs = db.prepare("SELECT DISTINCT accompagnateur_id AS id FROM dossiers").all() as { id: number }[]
  const upsert = db.prepare(
    'INSERT INTO signaux_etat (dossier_id, niveau, signature, notifie_le) VALUES (?,?,?,datetime(\'now\')) ' +
    'ON CONFLICT(dossier_id) DO UPDATE SET niveau=excluded.niveau, signature=excluded.signature, notifie_le=datetime(\'now\')',
  )
  for (const a of accs) {
    if (!userFeatures(a.id).has('signaux_faibles')) continue
    for (const s of computeSignaux(a.id)) {
      const prev = db.prepare('SELECT signature FROM signaux_etat WHERE dossier_id=?').get(s.dossier_id) as { signature: string } | undefined
      if (prev && prev.signature === s.signature) continue
      const monte = s.niveau !== 'vert'
      upsert.run(s.dossier_id, s.niveau, s.signature)
      if (monte && (!prev || prev.signature.split('|')[0] !== s.signature.split('|')[0] || !prev.signature.startsWith(s.niveau))) {
        db.prepare('INSERT INTO notifications (user_id, texte) VALUES (?, ?)').run(a.id, `${EMOJI[s.niveau]} ${s.prenom} — signal de décrochage : ${s.raisons[0]}`)
      }
    }
  }
}

function isoSemaine(d = new Date()): string {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - day)
  const an = t.getUTCFullYear()
  const sem = Math.ceil(((t.getTime() - Date.UTC(an, 0, 1)) / 86400000 + 1) / 7)
  return `${an}-W${String(sem).padStart(2, '0')}`
}

// --- Digest hebdomadaire automatique (planificateur), un envoi par accompagnateur et par semaine ISO ---
export async function sweepDigestsHebdo(): Promise<void> {
  if (process.env.DIGEST_CRON !== '1') return // désactivé par défaut (évite l'envoi d'emails non sollicités)
  const now = new Date()
  if (now.getDay() !== 1 || now.getHours() !== 8) return // lundi 08h
  const semaine = isoSemaine(now)
  const accs = db.prepare("SELECT id, email, prenom FROM users WHERE role='accompagnateur' AND actif=1").all() as { id: number; email: string; prenom: string | null }[]
  for (const a of accs) {
    if (!userFeatures(a.id).has('digest_email')) continue
    const deja = db.prepare('SELECT 1 FROM digest_envois WHERE user_id=? AND semaine=?').get(a.id, semaine)
    if (deja) continue
    const { html } = buildDigest(a.id)
    const mail = digestEmail('Votre digest de la semaine', `<p>Bonjour ${esc(a.prenom || '')},</p>${html}`)
    await sendEmail(a.email, mail.subject, mail.html)
    db.prepare('INSERT OR IGNORE INTO digest_envois (user_id, semaine) VALUES (?, ?)').run(a.id, semaine)
  }
}

// ---- Routes -------------------------------------------------------------------------------

router.get('/signaux', requireAuth, requireRole('accompagnateur'), requireFeature('signaux_faibles'), (req: Request, res: Response) => {
  res.json({ signaux: computeSignaux(getUser(req).id) })
})

router.get('/impact', requireAuth, requireRole('accompagnateur'), requireFeature('tableau_impact'), (req: Request, res: Response) => {
  res.json(computeImpact(getUser(req).id))
})

router.get('/digest', requireAuth, requireRole('accompagnateur'), requireFeature('digest_email'), (req: Request, res: Response) => {
  res.json(buildDigest(getUser(req).id))
})

router.post('/digest/envoyer', requireAuth, requireRole('accompagnateur'), requireFeature('digest_email'), async (req: Request, res: Response) => {
  const me = getUser(req)
  const u = db.prepare('SELECT email, prenom FROM users WHERE id=?').get(me.id) as { email: string; prenom: string | null }
  const { html } = buildDigest(me.id)
  const mail = digestEmail('Votre digest de la semaine', `<p>Bonjour ${esc(u.prenom || '')},</p>${html}`)
  await sendEmail(u.email, mail.subject, mail.html)
  res.json({ ok: true, envoye_a: u.email })
})

export default router
