import { db } from './db'
import { contentToHtml, type CRContent } from './compteRendu'
import { syntheseData, syntheseToHtml } from './synthese'

function dayOffset(days: number, hhmm = '14:00'): string {
  const d = new Date(Date.now() + days * 86400000)
  return d.toISOString().slice(0, 10) + 'T' + hhmm
}
function dateOnly(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10)
}

// ======================================================================
//  Contenu — Dossier vitrine : Amine + Mohamed (refonte appli commandes)
// ======================================================================
const CONTEXTE_AMINE =
  'Amine, alternant développeur full-stack chez Téaxis (PME de distribution B2B, ~80 personnes), 2ᵉ année de master. ' +
  'Mémoire professionnel sur la refonte et la mise en production de l’application interne de gestion des commandes ' +
  '(migration d’un legacy PHP vers une stack React/Node). Enjeu : concilier contraintes métier, qualité technique et ' +
  'autonomie de l’équipe ; et, en filigrane, apprendre à se reconnaître comme professionnel légitime et à valoriser son travail.'

const QA_AMINE = [
  { question: 'Dans quel cadre se déroule ton alternance ?', answer: 'Alternant développeur full-stack chez Téaxis, une PME de distribution B2B.' },
  { question: 'Quel est le sujet de ton mémoire ?', answer: 'La refonte et la mise en production de l’application de gestion des commandes (legacy PHP → React/Node).' },
  { question: 'Quelle problématique pressens-tu ?', answer: 'Comment mener une refonte applicative en PME en conciliant contraintes métier, qualité technique et autonomie de l’équipe ?' },
  { question: 'Quelles difficultés rencontres-tu ?', answer: 'Je sais coder, mais j’ai du mal à prendre du recul et à raconter ce que je fais ; je crains de ne pas paraître légitime à l’écrit.' },
  { question: 'Qu’attends-tu de cet accompagnement ?', answer: 'Être aidé à structurer mon mémoire et à mettre en valeur ma démarche.' },
]
const RECAP_AMINE =
  'Contexte — Alternant développeur full-stack chez Téaxis (distribution B2B).\n' +
  'Sujet — Refonte et mise en production de l’application de gestion des commandes (legacy PHP → React/Node).\n' +
  'Problématique pressentie — Comment mener une refonte applicative en PME en conciliant contraintes métier, qualité technique et autonomie de l’équipe ?\n' +
  'Difficultés — « Je sais coder, mais j’ai du mal à prendre du recul et à raconter ce que je fais » ; crainte de ne pas paraître légitime à l’écrit.\n' +
  'Attentes — Être aidé à structurer le mémoire et à mettre en valeur sa démarche.'

const CR_AMINE_1: CRContent = {
  contexte: 'Amine, alternant développeur full-stack chez Téaxis. Demande explicite : réussir son mémoire ; besoin réel entendu : se sentir légitime et savoir valoriser son travail.',
  pointsCles: 'Refonte du module commandes (legacy PHP → React/Node) : audit, choix de la stack, migration progressive, mise en production sans interruption de service. Beaucoup de maîtrise technique, peu de recul sur le sens.',
  emergence: 'Prise de conscience que l’enjeu n’est pas que technique : il s’agit aussi de raconter et de légitimer sa démarche.',
  planAction: [{ etape: 'Repérer 2-3 situations marquantes de la refonte à décrire', echeance: dateOnly(-21), critere: 'Situations notées' }],
  propositions: 'Explorer l’expérience en profondeur avant de structurer ; ne pas se précipiter sur le plan.',
  vigilance: 'Veiller à faire émerger plutôt qu’à apporter mes propres analyses.',
}
const CR_AMINE_2: CRContent = {
  contexte: 'Deuxième entretien. Mise en sens de l’expérience de refonte au regard de la problématique du mémoire.',
  pointsCles: 'Trois axes dégagés par Amine lui-même : diagnostic de la dette technique, choix d’architecture justifiés, conduite du changement et autonomie de l’équipe.',
  emergence: 'Amine voit désormais son travail comme une démarche structurée, plus seulement du code ; le fil rouge « concilier métier et technique » s’impose.',
  planAction: [
    { etape: 'Rédiger l’introduction et la problématique', echeance: dateOnly(-4), critere: 'Intro validée' },
    { etape: 'Formaliser le plan en 3 parties', echeance: dateOnly(-4), critere: 'Plan validé' },
  ],
  propositions: 'Passer au plan d’action de rédaction au prochain entretien.',
  vigilance: 'Laisser Amine structurer lui-même ; ne pas imposer mon plan.',
}

// Grille d'auto-évaluation de Mohamed (21 indicateurs) — pour le dossier vitrine
const GRILLE_SCORES: { id: string; score: number; commentaire: string }[] = [
  { id: '1.1', score: 85, commentaire: 'J’ai posé le cadre et mis Amine en confiance dès le départ ; mon ancrage professionnel rassure.' },
  { id: '1.2', score: 65, commentaire: 'Je l’ai reconnu comme auteur de son mémoire, mais j’ai dû me retenir de trop outiller à sa place.' },
  { id: '1.3', score: 80, commentaire: 'Disponible sans fusion : le « lien élastique » a bien fonctionné avec Amine.' },
  { id: '1.4', score: 72, commentaire: 'J’ai accueilli son travail brut sans le dévaloriser — je questionne le livrable, jamais la personne.' },
  { id: '1.5', score: 48, commentaire: 'J’ai entendu le besoin de légitimité derrière sa demande, mais ma tendance factuelle me ramène vite au concret.' },
  { id: '1.6', score: 66, commentaire: 'Mes propres transitions ont nourri mon empathie, sans m’exposer.' },
  { id: '1.7', score: 70, commentaire: 'J’ai cherché à le rendre autonome plutôt que dépendant — encore à consolider.' },
  { id: '2.1', score: 70, commentaire: 'J’ai fait formuler la demande et le besoin réel, et reformulé avant d’agir.' },
  { id: '2.2', score: 88, commentaire: 'Jalons, échéances et critères clairs : j’influence par le cadre plutôt que par l’autorité.' },
  { id: '2.3', score: 72, commentaire: 'J’ai déroulé les phases de ma méthode, du cadre à la clôture.' },
  { id: '2.4', score: 55, commentaire: 'Le dosage du conseil reste mon point sensible : l’envie de donner la solution revient vite.' },
  { id: '2.5', score: 44, commentaire: 'À travailler en priorité : j’apporte parfois mes analyses au lieu de les faire émerger.' },
  { id: '2.6', score: 85, commentaire: 'Micro-objectifs, critères et feedback réguliers : mon point fort pédagogique (sentiment d’efficacité).' },
  { id: '2.7', score: 68, commentaire: 'J’ai adapté l’entretien et les outils à Amine, sans les croire universels.' },
  { id: '3.1', score: 50, commentaire: 'Je dois rendre mes filtres plus conscients : mon modèle de réussite n’est pas le sien.' },
  { id: '3.2', score: 62, commentaire: 'Je me détache du résultat sans me désinvestir — en progrès.' },
  { id: '3.3', score: 82, commentaire: 'Je connais mes limites et je protège la soutenabilité de la relation.' },
  { id: '3.4', score: 60, commentaire: 'J’utilise mieux les émotions comme boussole, les siennes et les miennes.' },
  { id: '3.5', score: 86, commentaire: 'Je sais expliciter et justifier mes choix : je n’accompagne pas dans le doute.' },
  { id: '3.6', score: 68, commentaire: 'Je situe le sens social de ma fonction tout en restant critique sur l’injonction à l’autonomie.' },
  { id: '3.7', score: 88, commentaire: 'FAD108, FAD130, analyse de pratiques : je m’engage dans un travail continu.' },
]
const GRILLE_GLOBAL =
  'Des appuis solides côté cadre, conviction et structuration (1.1, 2.2, 2.6, 3.5, 3.7). Mes axes de progrès assumés, ' +
  'visibles avec Amine : résister au réflexe consultant et faire émerger (2.5), écouter le niveau psychologique et accueillir ' +
  'l’émotionnel (1.5), rendre mes filtres conscients (3.1). Ce contraste — forces sur le cadre, progrès sur l’émergence — ' +
  'est le cœur de mon positionnement d’accompagnateur des transitions.'
const GRILLE_ANALYSE_Q =
  'Mes questions sont majoritairement ouvertes et bien posées pour faire raconter l’expérience (« Raconte-moi une mission dont tu es fier… »). ' +
  'En phase de structuration, je glisse parfois vers des questions un peu orientées qui suggèrent ma propre lecture (induction). ' +
  'Axe de progrès : transformer davantage mes propositions en questions ouvertes pour faire émerger le plan d’Amine plutôt que de l’induire.'

function noteFromScores(scores: number[]): number {
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length / 5) * 10) / 10
}
function buildGrille(dossierId: number): void {
  const insEval = db.prepare('INSERT INTO auto_evaluations (dossier_id, statut, note_globale, commentaire_global, analyse_questions, cree_le, maj_le) VALUES (?,?,?,?,?,?,?)')
  const insScore = db.prepare('INSERT INTO auto_evaluation_scores (eval_id, indicateur, score, commentaire) VALUES (?,?,?,?)')
  const scoresV2 = GRILLE_SCORES.map((g) => g.score)
  const scoresV1 = scoresV2.map((s) => Math.max(0, s - 7))
  const write = (evalId: number, useComments: boolean, vals: number[]) =>
    GRILLE_SCORES.forEach((g, i) => insScore.run(evalId, g.id, vals[i], useComments ? g.commentaire : null))
  const v1 = Number(insEval.run(dossierId, 'validee', noteFromScores(scoresV1), GRILLE_GLOBAL, GRILLE_ANALYSE_Q, dayOffset(-20, '18:00'), dayOffset(-20, '18:00')).lastInsertRowid)
  write(v1, false, scoresV1)
  const v2 = Number(insEval.run(dossierId, 'validee', noteFromScores(scoresV2), GRILLE_GLOBAL, GRILLE_ANALYSE_Q, dayOffset(-6, '18:00'), dayOffset(-6, '18:00')).lastInsertRowid)
  write(v2, true, scoresV2)
  const draft = Number(insEval.run(dossierId, 'brouillon', noteFromScores(scoresV2), GRILLE_GLOBAL, GRILLE_ANALYSE_Q, dayOffset(-6, '18:00'), dayOffset(-1, '09:00')).lastInsertRowid)
  write(draft, true, scoresV2)
}

// ======================================================================
//  Constructeur générique de parcours (dossier complet à partir d'une spec)
// ======================================================================
interface Rep { phase: string; q: string; r: string }
interface EntretienSpec { dayOff: number; phaseAtteinte: string; reponses: Rep[] }
interface CRSpec { sessionIndex: number; content: CRContent; publie: boolean; dayOff: number }
interface ActionSpec { libelle: string; echeance?: string; critere?: string; statut: string; priorite?: string; details?: string; rappel?: string }
interface RdvSpec { dayOff: number; reserve: boolean }
interface MsgSpec { from: 'acc' | 'p'; texte: string; dayOff: number }
interface ParcoursSpec {
  accompagne: number; accompagnateur: number; accompagneNom: string
  titre: string; contexte: string; statut: 'en_cours' | 'cloture'; creeOff: number
  questionnaire?: { qa: { question: string; answer: string }[]; recap: string; completeOff: number }
  entretiens?: EntretienSpec[]
  crs?: CRSpec[]
  actions?: ActionSpec[]
  rdvs?: RdvSpec[]
  synthese?: { publie: boolean; off: number }
  syntheseCloture?: string
  grille?: boolean
  discussionCR?: MsgSpec[]
  discussionSynthese?: MsgSpec[]
  demandeRdv?: boolean
}

function buildParcours(spec: ParcoursSpec): number {
  const dossierId = Number(db.prepare(
    'INSERT INTO dossiers (accompagne_id, accompagnateur_id, titre, contexte, statut, synthese, cree_le) VALUES (?,?,?,?,?,?,?)',
  ).run(spec.accompagne, spec.accompagnateur, spec.titre, spec.contexte, spec.statut, spec.syntheseCloture || null, dayOffset(spec.creeOff, '09:00')).lastInsertRowid)

  if (spec.questionnaire) {
    db.prepare('INSERT INTO questionnaires_initiaux (dossier_id, contenu, cr_recap, complete_le) VALUES (?,?,?,?)')
      .run(dossierId, JSON.stringify(spec.questionnaire.qa), spec.questionnaire.recap, dayOffset(spec.questionnaire.completeOff, '10:00'))
  }

  const insSession = db.prepare('INSERT INTO sessions (dossier_id, date, phase_atteinte, statut) VALUES (?,?,?, ?)')
  const insRep = db.prepare("INSERT INTO reponses (session_id, phase, texte_reponse, source) VALUES (?,?,?, 'saisie')")
  const insQ = db.prepare('INSERT INTO questions_entretien (session_id, phase, texte, reponse) VALUES (?,?,?,?)')
  const sessionIds: number[] = []
  for (const e of spec.entretiens || []) {
    const sid = Number(insSession.run(dossierId, dayOffset(e.dayOff, '14:00'), e.phaseAtteinte, 'terminee').lastInsertRowid)
    sessionIds.push(sid)
    for (const rep of e.reponses) { insRep.run(sid, rep.phase, rep.r); insQ.run(sid, rep.phase, rep.q, rep.r) }
  }

  const insCR = db.prepare("INSERT INTO comptes_rendus (session_id, version, contenu_html, source, publie, publie_le, genere_le) VALUES (?, 1, ?, 'ia', ?, ?, ?)")
  for (const cr of spec.crs || []) {
    const sid = sessionIds[cr.sessionIndex]
    if (sid == null) continue
    const html = contentToHtml(cr.content, { accompagne: spec.accompagneNom, date: dayOffset(cr.dayOff).slice(0, 10) })
    insCR.run(sid, html, cr.publie ? 1 : 0, cr.publie ? dayOffset(cr.dayOff) : null, dayOffset(cr.dayOff))
  }

  const insAction = db.prepare('INSERT INTO actions (dossier_id, libelle, echeance, critere, statut, priorite, details, rappel_le, rappel_envoye, ordre) VALUES (?,?,?,?,?,?,?,?,?,?)')
  ;(spec.actions || []).forEach((a, i) => insAction.run(dossierId, a.libelle, a.echeance || null, a.critere || null, a.statut, a.priorite || null, a.details || null, a.rappel || null, a.rappel ? 1 : 0, i))

  const insCreneau = db.prepare('INSERT INTO creneaux (accompagnateur_id, debut, fin, reserve) VALUES (?,?,?,?)')
  const insRdv = db.prepare("INSERT INTO rdv (creneau_id, accompagne_id, dossier_id, statut) VALUES (?,?,?, 'confirme')")
  for (const r of spec.rdvs || []) {
    const hh = r.dayOff < 0 ? ['14:00', '15:00'] : ['10:00', '11:00']
    const cid = Number(insCreneau.run(spec.accompagnateur, dayOffset(r.dayOff, hh[0]), dayOffset(r.dayOff, hh[1]), r.reserve ? 1 : 0).lastInsertRowid)
    if (r.reserve) insRdv.run(cid, spec.accompagne, dossierId)
  }

  if (spec.synthese) {
    db.prepare("INSERT INTO syntheses (dossier_id, version, contenu_html, source, publie, publie_le, genere_le) VALUES (?, 1, ?, 'ia', ?, ?, ?)")
      .run(dossierId, syntheseToHtml(syntheseData(dossierId)), spec.synthese.publie ? 1 : 0, spec.synthese.publie ? dayOffset(spec.synthese.off) : null, dayOffset(spec.synthese.off))
  }
  if (spec.discussionCR && sessionIds.length) {
    const insMsg = db.prepare('INSERT INTO cr_messages (session_id, auteur_id, texte, cree_le) VALUES (?,?,?,?)')
    spec.discussionCR.forEach((m) => insMsg.run(sessionIds[0], m.from === 'acc' ? spec.accompagnateur : spec.accompagne, m.texte, dayOffset(m.dayOff, '12:00')))
  }
  if (spec.discussionSynthese) {
    const insMsg = db.prepare('INSERT INTO synthese_messages (dossier_id, auteur_id, texte, cree_le) VALUES (?,?,?,?)')
    spec.discussionSynthese.forEach((m) => insMsg.run(dossierId, m.from === 'acc' ? spec.accompagnateur : spec.accompagne, m.texte, dayOffset(m.dayOff, '12:00')))
  }
  if (spec.demandeRdv) {
    db.prepare('INSERT INTO demandes_rdv (dossier_id, accompagne_id, accompagnateur_id) VALUES (?,?,?)').run(dossierId, spec.accompagne, spec.accompagnateur)
  }
  if (spec.grille) buildGrille(dossierId)
  return dossierId
}

// ======================================================================
//  Jeu de données complet : 2 accompagnateurs · 3 accompagnés · 6 dossiers
// ======================================================================
interface DemoIds { mohamed: number; camille: number; amine: number; lea: number; karim: number }

export async function seedDemoData(ids: DemoIds): Promise<void> {
  const accompagnes = [ids.amine, ids.lea, ids.karim]
  const accompagnateurs = [ids.mohamed, ids.camille]
  // (Ré)initialise tout le jeu de démo à CHAQUE démarrage (mode SEED_PASSWORD/local).
  db.transaction(() => {
    accompagnes.forEach((id) => db.prepare('DELETE FROM rdv WHERE accompagne_id=?').run(id))
    accompagnateurs.forEach((id) => db.prepare('DELETE FROM rdv WHERE creneau_id IN (SELECT id FROM creneaux WHERE accompagnateur_id=?)').run(id))
    accompagnateurs.forEach((id) => db.prepare('DELETE FROM creneaux WHERE accompagnateur_id=?').run(id))
    accompagnes.forEach((id) => db.prepare('DELETE FROM demandes_rdv WHERE accompagne_id=?').run(id))
    accompagnes.forEach((id) => db.prepare('DELETE FROM dossiers WHERE accompagne_id=?').run(id)) // cascade : questionnaire, entretiens, CR (+discussion/notes), plan d'action, synthèses, grille
    ;[...accompagnes, ...accompagnateurs].forEach((id) => db.prepare('DELETE FROM notifications WHERE user_id=?').run(id))
  })()

  // D1 — Amine + Mohamed — dossier VITRINE complet (en cours)
  buildParcours({
    accompagne: ids.amine, accompagnateur: ids.mohamed, accompagneNom: 'Amine',
    titre: 'Mémoire — Refonte de l’appli commandes (Téaxis)', contexte: CONTEXTE_AMINE, statut: 'en_cours', creeOff: -34,
    questionnaire: { qa: QA_AMINE, recap: RECAP_AMINE, completeOff: -32 },
    entretiens: [
      { dayOff: -28, phaseAtteinte: '2', reponses: [
        { phase: '0', q: 'Avant de commencer, je t’explique comment je travaille — ça te va ?', r: 'Accueil et cadre posés (objet, durée, confidentialité). Amine d’abord réservé, se détend quand je rappelle qu’on part de là où il en est, sans jugement. Alliance établie.' },
        { phase: '1', q: 'Qu’attends-tu vraiment de cet accompagnement ?', r: 'Demande explicite : « réussir mon mémoire ». Besoin réel entendu derrière : se sentir légitime comme professionnel et savoir valoriser son travail. Je reformule, Amine acquiesce — c’est bien le cœur.' },
        { phase: '2', q: 'Raconte-moi une mission précise dont tu es fier, étape par étape.', r: 'Amine raconte la refonte du module commandes : audit du legacy, choix de la stack, migration progressive, mise en production sans interruption. Fier d’avoir « fait tourner la prod le lundi matin sans bug ». Très factuel, peu de recul sur le sens.' },
      ] },
      { dayOff: -18, phaseAtteinte: '3', reponses: [
        { phase: '3', q: 'Quel fil rouge vois-tu entre ce que tu as décrit et ta problématique ?', r: 'On relie l’expérience au mémoire. Je transforme mes idées en questions ; Amine dégage lui-même 3 axes : dette technique, choix d’architecture justifiés, conduite du changement. Le fil rouge « concilier métier et technique » émerge.' },
      ] },
      { dayOff: -7, phaseAtteinte: '5', reponses: [
        { phase: '4', q: 'Quelle est la toute prochaine étape, la plus petite possible ?', r: 'Co-construction des prochaines étapes : finaliser intro/problématique, rédiger le chapitre « expérience », préparer un pitch de 5 min. Échéances posées par Amine lui-même.' },
        { phase: '5', q: 'Qu’est-ce que tu retiens, et comment te sens-tu maintenant ?', r: 'Amine retient qu’il « a une vraie histoire à raconter » et se sent plus légitime. Émotion positive, davantage de confiance.' },
      ] },
    ],
    crs: [
      { sessionIndex: 0, content: CR_AMINE_1, publie: true, dayOff: -27 },
      { sessionIndex: 1, content: CR_AMINE_2, publie: true, dayOff: -17 },
    ],
    actions: [
      { libelle: 'Préparer un pitch de soutenance de 5 minutes', echeance: dateOnly(17), critere: 'Pitch prêt', statut: 'a_faire', priorite: 'haute', details: 'Structurer le pitch : contexte, problématique, démarche, résultats, ouverture. S’entraîner à l’oral en 5 min chrono.' },
      { libelle: 'Rédiger le chapitre « expérience » (la refonte)', echeance: dateOnly(10), critere: 'Chapitre rédigé', statut: 'en_cours', priorite: 'haute', details: 'Décrire 2-3 situations marquantes de la refonte et les relier au cadre théorique.', rappel: dateOnly(3) },
      { libelle: 'Formaliser le plan en 3 parties', echeance: dateOnly(-4), critere: 'Plan validé', statut: 'fait', priorite: 'moyenne' },
      { libelle: 'Rédiger l’introduction et la problématique', echeance: dateOnly(-4), critere: 'Intro validée', statut: 'fait', priorite: 'basse' },
      { libelle: 'Repérer 2-3 situations marquantes de la refonte à décrire', echeance: dateOnly(-21), critere: 'Situations notées', statut: 'fait', priorite: 'basse' },
    ],
    rdvs: [{ dayOff: -28, reserve: true }, { dayOff: -18, reserve: true }, { dayOff: -7, reserve: true }, { dayOff: 7, reserve: false }],
    synthese: { publie: true, off: -5 },
    grille: true,
    discussionCR: [
      { from: 'acc', texte: 'Voici le compte rendu de notre 1ᵉʳ entretien — relis-le et dis-moi si tu te reconnais.', dayOff: -27 },
      { from: 'p', texte: 'Merci, c’est très clair ! Ça me motive de voir tout ça posé.', dayOff: -26 },
    ],
  })

  // D2 — Amine + Camille — bilan de compétences vers Product Owner (en cours)  [multi-accompagnateur]
  buildParcours({
    accompagne: ids.amine, accompagnateur: ids.camille, accompagneNom: 'Amine',
    titre: 'Bilan de compétences — évoluer vers Product Owner', statut: 'en_cours', creeOff: -16,
    contexte: 'Amine, développeur full-stack, se sent à l’étroit dans un rôle 100 % technique et envisage une évolution vers le produit (Product Owner). Bilan pour clarifier le projet et un plan de montée en compétences progressive.',
    questionnaire: {
      qa: [
        { question: 'Pourquoi entamer un bilan maintenant ?', answer: 'Je me sens à l’étroit dans le 100 % technique ; je voudrais évoluer vers le produit sans tout abandonner.' },
        { question: 'Qu’est-ce qui t’attire dans le rôle de Product Owner ?', answer: 'Faire le lien entre le métier et la technique, prioriser, donner du sens — c’est déjà ce que je fais de façon informelle.' },
        { question: 'Quelles compétences penses-tu devoir développer ?', answer: 'La posture produit, la priorisation, l’animation d’ateliers, et oser parler en public.' },
      ],
      recap: 'Amine souhaite évoluer du développement vers un rôle de Product Owner. Atout : double culture métier/technique. À développer : posture produit, priorisation, prise de parole. Objectif : clarifier le projet et les étapes réalistes.',
      completeOff: -14,
    },
    entretiens: [
      { dayOff: -10, phaseAtteinte: '1', reponses: [
        { phase: '0', q: 'On pose le cadre de ce bilan, ça te convient ?', r: 'Cadre et confidentialité posés. Amine motivé mais un peu inquiet de « tout plaquer ». Je rassure : le bilan clarifie, il ne décide pas à sa place.' },
        { phase: '1', q: 'Qu’attends-tu concrètement de ce bilan ?', r: 'Clarifier si le rôle de PO lui correspond et identifier des étapes réalistes pour y aller progressivement, sans rupture brutale.' },
      ] },
    ],
    crs: [{ sessionIndex: 0, content: {
      contexte: 'Premier entretien du bilan : cadrage de la demande d’évolution vers un rôle de Product Owner.',
      pointsCles: 'Amine exerce déjà des activités « produit » informelles (priorisation, lien métier/technique). Crainte d’une rupture brutale et de la prise de parole.',
      emergence: 'L’évolution peut être progressive, en capitalisant sur sa double culture plutôt qu’en reniant la technique.',
      planAction: [{ etape: 'Lister 5 situations où il a joué un rôle « produit »', echeance: dateOnly(-3), critere: 'Liste faite' }],
      propositions: 'Cartographier les compétences déjà acquises avant de viser les manques.',
      vigilance: 'Ne pas projeter mon propre parcours ; partir de son rapport au risque.',
    }, publie: true, dayOff: -9 }],
    actions: [
      { libelle: 'Lister 5 situations où j’ai joué un rôle « produit »', echeance: dateOnly(-3), critere: 'Liste rédigée', statut: 'fait', priorite: 'moyenne' },
      { libelle: 'M’inscrire à un atelier de prise de parole en public', echeance: dateOnly(12), critere: 'Inscription faite', statut: 'a_faire', priorite: 'haute', details: 'Chercher un atelier court (1 journée) sur la prise de parole / animation d’atelier.' },
    ],
    rdvs: [{ dayOff: -10, reserve: true }, { dayOff: 9, reserve: false }],
    discussionCR: [
      { from: 'p', texte: 'Merci Camille. Je n’avais pas réalisé que je faisais déjà autant de « produit » au quotidien.', dayOff: -8 },
      { from: 'acc', texte: 'C’est exactement le point d’appui. On part de là pour construire la suite, à ton rythme.', dayOff: -8 },
    ],
  })

  // D3 — Léa + Mohamed — mémoire conduite du changement digital (en cours)
  buildParcours({
    accompagne: ids.lea, accompagnateur: ids.mohamed, accompagneNom: 'Léa',
    titre: 'Mémoire — Conduite du changement digital en collectivité', statut: 'en_cours', creeOff: -22,
    contexte: 'Léa, chargée de mission « transformation numérique » dans une collectivité territoriale, master en management public. Mémoire sur la conduite du changement lors du déploiement d’un nouvel outil de gestion des demandes citoyennes, avec de fortes résistances des agents.',
    questionnaire: {
      qa: [
        { question: 'Quel est ton terrain professionnel ?', answer: 'Chargée de mission transformation numérique dans une collectivité ; je pilote le déploiement d’un outil de gestion des demandes citoyennes.' },
        { question: 'Quel est le cœur de ton mémoire ?', answer: 'La conduite du changement : comment embarquer des agents réticents au numérique ?' },
        { question: 'Quelles difficultés rencontres-tu ?', answer: 'Beaucoup de résistances, un sentiment de « on nous impose un outil de plus », et moi je suis prise entre la hiérarchie et le terrain.' },
        { question: 'Qu’attends-tu de l’accompagnement ?', answer: 'Prendre du recul sur ma posture et structurer une analyse qui ne soit pas qu’un récit de projet.' },
      ],
      recap: 'Léa pilote une transformation numérique en collectivité, confrontée à des résistances fortes. Problématique : conduire le changement et embarquer des agents réticents. Besoin : recul sur sa posture (position d’intermédiaire) et structuration analytique.',
      completeOff: -20,
    },
    entretiens: [
      { dayOff: -16, phaseAtteinte: '2', reponses: [
        { phase: '0', q: 'Comment souhaites-tu qu’on travaille ensemble ?', r: 'Cadre posé. Léa très volubile, beaucoup de matière. Je l’aide à ralentir et à cibler.' },
        { phase: '1', q: 'Qu’est-ce qui est vraiment en jeu pour toi dans ce mémoire ?', r: 'Au-delà du diplôme : légitimer son rôle d’intermédiaire et comprendre les résistances plutôt que de les subir.' },
        { phase: '2', q: 'Raconte-moi une situation de résistance marquante.', r: 'Un atelier où des agents ont « décroché » ; Léa a improvisé une écoute des craintes qui a tout débloqué. Elle ne voyait pas la compétence à l’œuvre.' },
      ] },
      { dayOff: -6, phaseAtteinte: '3', reponses: [
        { phase: '3', q: 'Quel fil conducteur relie tes situations à ta problématique ?', r: 'On dégage un fil : la résistance comme information, et l’écoute comme levier de changement. Léa tient son angle d’analyse.' },
      ] },
    ],
    crs: [{ sessionIndex: 0, content: {
      contexte: 'Cadrage du mémoire de Léa sur la conduite du changement en collectivité ; clarification du rôle d’intermédiaire.',
      pointsCles: 'Résistances fortes des agents ; Léa oscille entre hiérarchie et terrain. Une situation d’écoute des craintes a débloqué un atelier — compétence non vue.',
      emergence: 'La résistance peut être lue comme une information utile plutôt qu’un obstacle ; l’écoute devient un levier.',
      planAction: [{ etape: 'Décrire 3 situations de résistance et ce qui les a (dé)bloquées', echeance: dateOnly(-2), critere: '3 situations décrites' }],
      propositions: 'Mobiliser un cadre théorique sur la conduite du changement (ex. Kotter, Bareil).',
      vigilance: 'Aider Léa à passer du récit foisonnant à une analyse ciblée.',
    }, publie: true, dayOff: -15 }],
    actions: [
      { libelle: 'Décrire 3 situations de résistance marquantes', echeance: dateOnly(-2), critere: '3 situations décrites', statut: 'fait', priorite: 'haute' },
      { libelle: 'Choisir un cadre théorique de conduite du changement', echeance: dateOnly(8), critere: 'Cadre choisi et justifié', statut: 'en_cours', priorite: 'haute', details: 'Comparer Kotter, Bareil (phases de préoccupations), Crozier ; retenir le plus adapté au terrain.' },
      { libelle: 'Formaliser la problématique définitive', echeance: dateOnly(14), critere: 'Problématique validée', statut: 'a_faire', priorite: 'moyenne' },
    ],
    rdvs: [{ dayOff: -16, reserve: true }, { dayOff: -6, reserve: true }, { dayOff: 10, reserve: false }],
  })

  // D4 — Léa + Camille — projet de création (ESS) — JUSTE DÉMARRÉ (questionnaire seul, RDV demandé)
  buildParcours({
    accompagne: ids.lea, accompagnateur: ids.camille, accompagneNom: 'Léa',
    titre: 'Projet de création — coopérative (ESS)', statut: 'en_cours', creeOff: -3,
    contexte: 'En parallèle de son poste, Léa explore un projet de création d’une coopérative dans l’économie sociale et solidaire. Parcours tout juste démarré : cadrage de l’idée et de la faisabilité.',
    questionnaire: {
      qa: [
        { question: 'Quel est ton projet ?', answer: 'Créer une coopérative qui accompagne les petites associations sur leur transition numérique, dans une logique ESS.' },
        { question: 'Où en es-tu ?', answer: 'Au tout début : j’ai l’intuition et quelques contacts, mais rien de structuré.' },
        { question: 'Qu’attends-tu de cet accompagnement ?', answer: 'M’aider à clarifier l’idée, vérifier si c’est viable, et ne pas me décourager toute seule.' },
      ],
      recap: 'Léa démarre un projet de coopérative ESS d’accompagnement numérique des petites associations. Stade : idéation. Besoin : clarifier l’idée, tester la faisabilité, garder l’élan.',
      completeOff: -2,
    },
    demandeRdv: true,
  })

  // D5 — Karim + Camille — VAE Responsable de projets digitaux — CLÔTURÉ
  buildParcours({
    accompagne: ids.karim, accompagnateur: ids.camille, accompagneNom: 'Karim',
    titre: 'VAE — Responsable de projets digitaux', statut: 'cloture', creeOff: -70,
    contexte: 'Karim, 12 ans d’expérience en gestion de projets (sans diplôme correspondant), engage une VAE pour faire reconnaître un titre de Responsable de projets digitaux. Enjeu : transformer une expérience riche mais implicite en un dossier de preuves structuré.',
    syntheseCloture: 'Parcours clôturé : dossier de VAE déposé et présenté. Karim est passé d’une expérience « évidente pour lui » à une démonstration explicite de ses compétences. Il s’est senti, à la fin, pleinement légitime à candidater au titre.',
    questionnaire: {
      qa: [
        { question: 'Pourquoi une VAE maintenant ?', answer: 'J’ai 12 ans de gestion de projets mais aucun diplôme qui le prouve ; ça me freine pour évoluer.' },
        { question: 'Quelle est ta principale crainte ?', answer: 'Que mon expérience paraisse « banale » à l’écrit, alors qu’elle est dense.' },
        { question: 'Qu’attends-tu de l’accompagnement ?', answer: 'M’aider à choisir les bonnes situations et à les décrire avec le bon niveau de preuve.' },
      ],
      recap: 'Karim engage une VAE (Responsable de projets digitaux) sur 12 ans d’expérience. Difficulté : expliciter et prouver des compétences devenues implicites. Besoin : sélection des situations et niveau de preuve.',
      completeOff: -68,
    },
    entretiens: [
      { dayOff: -62, phaseAtteinte: '2', reponses: [
        { phase: '0', q: 'Comment se passe une VAE, et qu’attends-tu de moi ?', r: 'Cadre VAE explicité. Karim soulagé d’avoir une méthode. On part de ses réalisations concrètes.' },
        { phase: '2', q: 'Décris un projet dont tu es le plus fier, en détail.', r: 'Pilotage d’une refonte de SI sur 18 mois, multi-équipes. Karim sous-estime totalement l’ampleur de ce qu’il a coordonné.' },
      ] },
      { dayOff: -40, phaseAtteinte: '4', reponses: [
        { phase: '3', q: 'Quelles compétences du référentiel ces situations prouvent-elles ?', r: 'On relie ses situations au référentiel : pilotage, gestion des risques, management transverse. Les preuves apparaissent.' },
        { phase: '4', q: 'Quelles situations gardes-tu pour le dossier ?', r: 'Sélection de 4 situations couvrant l’ensemble du référentiel. Plan de rédaction posé.' },
      ] },
    ],
    crs: [
      { sessionIndex: 0, content: {
        contexte: 'Démarrage de la VAE : méthode et premières réalisations.',
        pointsCles: 'Refonte de SI sur 18 mois pilotée par Karim, largement sous-estimée par lui-même.',
        emergence: 'Son expérience est bien au niveau du titre visé ; il faut la rendre visible.',
        planAction: [{ etape: 'Lister toutes les situations professionnelles significatives', echeance: dateOnly(-55), critere: 'Inventaire fait' }],
        propositions: 'Croiser les situations avec le référentiel du titre.',
        vigilance: 'Lutter contre la minimisation systématique de ses réalisations.',
      }, publie: true, dayOff: -61 },
      { sessionIndex: 1, content: {
        contexte: 'Sélection des situations de preuve au regard du référentiel.',
        pointsCles: 'Quatre situations retenues couvrant pilotage, risques, management transverse, conduite du changement.',
        emergence: 'Karim s’autorise enfin à dire « j’ai géré » plutôt que « j’ai aidé ».',
        planAction: [{ etape: 'Rédiger les 4 fiches de preuve', echeance: dateOnly(-20), critere: '4 fiches rédigées' }],
        propositions: 'Préparer l’entretien avec le jury par une mise en situation.',
        vigilance: 'Veiller au niveau de preuve attendu, sans tomber dans le récit.',
      }, publie: true, dayOff: -39 },
    ],
    actions: [
      { libelle: 'Lister les situations professionnelles significatives', echeance: dateOnly(-55), critere: 'Inventaire fait', statut: 'fait', priorite: 'moyenne' },
      { libelle: 'Rédiger les 4 fiches de preuve', echeance: dateOnly(-20), critere: '4 fiches rédigées', statut: 'fait', priorite: 'haute' },
      { libelle: 'Préparer l’entretien avec le jury', echeance: dateOnly(-8), critere: 'Mise en situation faite', statut: 'fait', priorite: 'haute' },
    ],
    rdvs: [{ dayOff: -62, reserve: true }, { dayOff: -40, reserve: true }],
    synthese: { publie: true, off: -6 },
    discussionSynthese: [
      { from: 'acc', texte: 'Voici la synthèse de ton parcours VAE. Tu peux la garder comme trace de tout le chemin parcouru.', dayOff: -6 },
      { from: 'p', texte: 'Merci infiniment Camille. Relire ça, je mesure le travail accompli. Je me sens prêt.', dayOff: -5 },
    ],
  })

  // D6 — Karim + Mohamed — mémoire IA & pédagogie — TOUT JUSTE CRÉÉ (sans questionnaire)
  buildParcours({
    accompagne: ids.karim, accompagnateur: ids.mohamed, accompagneNom: 'Karim',
    titre: 'Mémoire — IA générative et pratiques pédagogiques', statut: 'en_cours', creeOff: -1,
    contexte: 'Nouveau parcours, tout juste démarré : Karim envisage un mémoire sur l’usage de l’IA générative dans ses pratiques de formateur. Le questionnaire initial reste à compléter.',
    rdvs: [{ dayOff: 5, reserve: false }],
  })

  // Quelques notifications cohérentes (déjà lues, pour ne pas générer de bruit)
  const insN = db.prepare('INSERT INTO notifications (user_id, texte, lu) VALUES (?,?,1)')
  insN.run(ids.mohamed, 'Amine a complété son questionnaire initial.')
  insN.run(ids.amine, 'Un compte rendu a été publié dans votre espace.')
  insN.run(ids.camille, 'Léa a démarré un nouveau parcours « Projet de création — coopérative (ESS) ».')
  insN.run(ids.lea, 'Un compte rendu a été publié dans votre espace.')
  insN.run(ids.karim, 'Votre synthèse de parcours a été publiée.')

  console.log('[seed:demo] Jeu de démo : 2 accompagnateurs, 3 accompagnés, 6 dossiers (états variés).')
}
