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

const CONTEXTE_DOSSIER =
  'Amine, alternant développeur full-stack chez Téaxis (PME de distribution B2B, ~80 personnes), 2ᵉ année de master. ' +
  'Mémoire professionnel sur la refonte et la mise en production de l’application interne de gestion des commandes ' +
  '(migration d’un legacy PHP vers une stack React/Node). Enjeu : concilier contraintes métier, qualité technique et ' +
  'autonomie de l’équipe ; et, en filigrane, apprendre à se reconnaître comme professionnel légitime et à valoriser son travail.'

const QUESTIONNAIRE_RECAP =
  'Contexte — Alternant développeur full-stack chez Téaxis (distribution B2B).\n' +
  'Sujet — Refonte et mise en production de l’application de gestion des commandes (legacy PHP → React/Node).\n' +
  'Problématique pressentie — Comment mener une refonte applicative en PME en conciliant contraintes métier, qualité technique et autonomie de l’équipe ?\n' +
  'Difficultés — « Je sais coder, mais j’ai du mal à prendre du recul et à raconter ce que je fais » ; crainte de ne pas paraître légitime à l’écrit.\n' +
  'Attentes — Être aidé à structurer le mémoire et à mettre en valeur sa démarche.'

// Historique questions/réponses du questionnaire initial (affiché dans le détail du dossier)
const QUESTIONNAIRE_QA = [
  { question: 'Dans quel cadre se déroule ton alternance ?', answer: 'Alternant développeur full-stack chez Téaxis, une PME de distribution B2B.' },
  { question: 'Quel est le sujet de ton mémoire ?', answer: 'La refonte et la mise en production de l’application de gestion des commandes (legacy PHP → React/Node).' },
  { question: 'Quelle problématique pressens-tu ?', answer: 'Comment mener une refonte applicative en PME en conciliant contraintes métier, qualité technique et autonomie de l’équipe ?' },
  { question: 'Quelles difficultés rencontres-tu ?', answer: 'Je sais coder, mais j’ai du mal à prendre du recul et à raconter ce que je fais ; je crains de ne pas paraître légitime à l’écrit.' },
  { question: 'Qu’attends-tu de cet accompagnement ?', answer: 'Être aidé à structurer mon mémoire et à mettre en valeur ma démarche.' },
]

interface Rep { phase: string; q: string; r: string }
interface Entretien { date: string; phaseAtteinte: string; reponses: Rep[] }

const CR_E1: CRContent = {
  contexte: 'Amine, alternant développeur full-stack chez Téaxis. Demande explicite : réussir son mémoire ; besoin réel entendu : se sentir légitime et savoir valoriser son travail.',
  pointsCles: 'Refonte du module commandes (legacy PHP → React/Node) : audit, choix de la stack, migration progressive, mise en production sans interruption de service. Beaucoup de maîtrise technique, peu de recul sur le sens.',
  emergence: 'Prise de conscience que l’enjeu n’est pas que technique : il s’agit aussi de raconter et de légitimer sa démarche.',
  planAction: [{ etape: 'Repérer 2-3 situations marquantes de la refonte à décrire', echeance: dateOnly(-21), critere: 'Situations notées' }],
  propositions: 'Explorer l’expérience en profondeur avant de structurer ; ne pas se précipiter sur le plan.',
  vigilance: 'Veiller à faire émerger plutôt qu’à apporter mes propres analyses.',
}
const CR_E2: CRContent = {
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

// 21 indicateurs — auto-positionnement cohérent de Mohamed (forces côté cadre, axes côté émergence/émotionnel)
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

/** Crée un jeu de données de démonstration complet et cohérent (idempotent). */
export async function seedDemoData(accId: number, amineId: number): Promise<void> {
  // (Ré)initialise le parcours de démo d'Amine à CHAQUE démarrage, pour repartir d'un état COMPLET et propre.
  // (Mode démo/local : ne s'exécute que lorsque SEED_PASSWORD est défini — voir seed().)
  db.transaction(() => {
    db.prepare('DELETE FROM dossiers WHERE accompagne_id=? AND accompagnateur_id=?').run(amineId, accId) // cascade : entretiens, CR (+ discussions/notes), plan d'action, grille…
    db.prepare('DELETE FROM creneaux WHERE accompagnateur_id=?').run(accId) // cascade : les RDV liés
    db.prepare('DELETE FROM notifications WHERE user_id=?').run(amineId)
    db.prepare("DELETE FROM notifications WHERE user_id=? AND texte LIKE 'Amine %'").run(accId)
  })()

  const dossierId = Number(
    db.prepare("INSERT INTO dossiers (accompagne_id, accompagnateur_id, titre, contexte, statut, cree_le) VALUES (?,?,?,?, 'en_cours', ?)")
      .run(amineId, accId, 'Mémoire — Refonte de l’appli commandes (Téaxis)', CONTEXTE_DOSSIER, dayOffset(-34, '09:00')).lastInsertRowid,
  )

  // Questionnaire initial
  db.prepare('INSERT INTO questionnaires_initiaux (dossier_id, contenu, cr_recap, complete_le) VALUES (?,?,?,?)')
    .run(dossierId, JSON.stringify(QUESTIONNAIRE_QA), QUESTIONNAIRE_RECAP, dayOffset(-32, '10:00'))

  // 3 entretiens (progression sur les 6 phases)
  const entretiens: Entretien[] = [
    {
      date: dayOffset(-28, '14:00'), phaseAtteinte: '2', reponses: [
        { phase: '0', q: 'Avant de commencer, je t’explique comment je travaille — ça te va ?', r: 'Accueil et cadre posés (objet, durée, confidentialité). Amine d’abord réservé, se détend quand je rappelle qu’on part de là où il en est, sans jugement. Alliance établie.' },
        { phase: '1', q: 'Qu’attends-tu vraiment de cet accompagnement ?', r: 'Demande explicite : « réussir mon mémoire ». Besoin réel entendu derrière : se sentir légitime comme professionnel et savoir valoriser son travail. Je reformule, Amine acquiesce — c’est bien le cœur.' },
        { phase: '2', q: 'Raconte-moi une mission précise dont tu es fier, étape par étape.', r: 'Amine raconte la refonte du module commandes : audit du legacy, choix de la stack, migration progressive, mise en production sans interruption. Fier d’avoir « fait tourner la prod le lundi matin sans bug ». Très factuel, peu de recul sur le sens.' },
      ],
    },
    {
      date: dayOffset(-18, '14:00'), phaseAtteinte: '3', reponses: [
        { phase: '3', q: 'Quel fil rouge vois-tu entre ce que tu as décrit et ta problématique ?', r: 'On relie l’expérience au mémoire. Je transforme mes idées en questions ; Amine dégage lui-même 3 axes : diagnostic de la dette technique, choix d’architecture justifiés, conduite du changement et autonomie de l’équipe. Le fil rouge « concilier métier et technique » émerge. Il voit son travail comme une démarche, plus seulement du code.' },
      ],
    },
    {
      date: dayOffset(-7, '14:00'), phaseAtteinte: '5', reponses: [
        { phase: '4', q: 'Quelle est la toute prochaine étape, la plus petite possible ?', r: 'Co-construction des prochaines étapes : finaliser intro/problématique, rédiger le chapitre « expérience » à partir de notre échange, préparer un pitch de 5 min. Échéances posées par Amine lui-même ; il se sent capable.' },
        { phase: '5', q: 'Qu’est-ce que tu retiens, et comment te sens-tu maintenant ?', r: 'Amine retient qu’il « a une vraie histoire à raconter » et se sent plus légitime. Émotion positive, davantage de confiance. On laisse mûrir ; prochain point fixé. Démarche prête à être clôturée.' },
      ],
    },
  ]

  const insSession = db.prepare('INSERT INTO sessions (dossier_id, date, phase_atteinte, statut) VALUES (?,?,?, ?)')
  const insRep = db.prepare("INSERT INTO reponses (session_id, phase, texte_reponse, source) VALUES (?,?,?, 'saisie')")
  const insQ = db.prepare('INSERT INTO questions_entretien (session_id, phase, texte, reponse) VALUES (?,?,?,?)')
  const sessionIds: number[] = []
  for (const e of entretiens) {
    const sid = Number(insSession.run(dossierId, e.date, e.phaseAtteinte, 'terminee').lastInsertRowid)
    sessionIds.push(sid)
    for (const rep of e.reponses) {
      insRep.run(sid, rep.phase, rep.r)
      insQ.run(sid, rep.phase, rep.q, rep.r)
    }
  }

  // Comptes rendus des entretiens 1 et 2 en HTML, publiés (le 3ᵉ sera généré en direct lors de la démo)
  makeCR(sessionIds[0], CR_E1, dayOffset(-27, '10:00'))
  makeCR(sessionIds[1], CR_E2, dayOffset(-17, '10:00'))

  // Plan d'action (ordre = position d'affichage ; rappel de démo daté dans le futur et marqué « envoyé »
  // pour qu'aucun e-mail réel ne parte au démarrage vers les adresses de démo)
  const insAction = db.prepare(
    'INSERT INTO actions (dossier_id, libelle, echeance, critere, statut, priorite, details, rappel_le, rappel_envoye, ordre) VALUES (?,?,?,?,?,?,?,?,?,?)',
  )
  const actions: { libelle: string; echeance: string; critere: string; statut: string; priorite: string; details: string | null; rappel: string | null }[] = [
    { libelle: 'Préparer un pitch de soutenance de 5 minutes', echeance: dateOnly(17), critere: 'Pitch prêt', statut: 'a_faire', priorite: 'haute',
      details: 'Structurer le pitch : contexte, problématique, démarche, résultats, ouverture. S’entraîner à l’oral en 5 min chrono.', rappel: null },
    { libelle: 'Rédiger le chapitre « expérience » (la refonte)', echeance: dateOnly(10), critere: 'Chapitre rédigé', statut: 'en_cours', priorite: 'haute',
      details: 'Décrire 2-3 situations marquantes de la refonte et les relier au cadre théorique (analyse réflexive).', rappel: dateOnly(3) },
    { libelle: 'Formaliser le plan en 3 parties', echeance: dateOnly(-4), critere: 'Plan validé', statut: 'fait', priorite: 'moyenne', details: null, rappel: null },
    { libelle: 'Rédiger l’introduction et la problématique', echeance: dateOnly(-4), critere: 'Intro validée', statut: 'fait', priorite: 'basse', details: null, rappel: null },
    { libelle: 'Repérer 2-3 situations marquantes de la refonte à décrire', echeance: dateOnly(-21), critere: 'Situations notées', statut: 'fait', priorite: 'basse', details: null, rappel: null },
  ]
  actions.forEach((a, i) => insAction.run(dossierId, a.libelle, a.echeance, a.critere, a.statut, a.priorite, a.details, a.rappel, a.rappel ? 1 : 0, i))

  // Rendez-vous : 3 passés (réservés, alignés aux entretiens) + 1 créneau à venir (disponible)
  const insCreneau = db.prepare('INSERT INTO creneaux (accompagnateur_id, debut, fin, reserve) VALUES (?,?,?,?)')
  const insRdv = db.prepare("INSERT INTO rdv (creneau_id, accompagne_id, dossier_id, statut) VALUES (?,?,?, 'confirme')")
  for (const off of [-28, -18, -7]) {
    const cid = Number(insCreneau.run(accId, dayOffset(off, '14:00'), dayOffset(off, '15:00'), 1).lastInsertRowid)
    insRdv.run(cid, amineId, dossierId)
  }
  insCreneau.run(accId, dayOffset(7, '10:00'), dayOffset(7, '11:00'), 0)

  // Synthèse du parcours : une version générée + publiée (visible en lecture par Amine)
  db.prepare("INSERT INTO syntheses (dossier_id, version, contenu_html, source, publie, publie_le, genere_le) VALUES (?, 1, ?, 'ia', 1, ?, ?)")
    .run(dossierId, syntheseToHtml(syntheseData(dossierId)), dayOffset(-5, '11:00'), dayOffset(-5, '11:00'))

  // Grille d'auto-évaluation de Mohamed : 2 versions validées (pour la courbe) + 1 brouillon courant
  const insEval = db.prepare('INSERT INTO auto_evaluations (dossier_id, statut, note_globale, commentaire_global, analyse_questions, cree_le, maj_le) VALUES (?,?,?,?,?,?,?)')
  const insScore = db.prepare('INSERT INTO auto_evaluation_scores (eval_id, indicateur, score, commentaire) VALUES (?,?,?,?)')
  const scoresV2 = GRILLE_SCORES.map((g) => g.score)
  const scoresV1 = scoresV2.map((s) => Math.max(0, s - 7))
  const writeScores = (evalId: number, useComments: boolean, deltaFrom?: number[]) => {
    GRILLE_SCORES.forEach((g, i) => insScore.run(evalId, g.id, deltaFrom ? deltaFrom[i] : g.score, useComments ? g.commentaire : null))
  }
  // v1 (validée, plus ancienne, légèrement plus basse)
  const v1 = Number(insEval.run(dossierId, 'validee', noteFromScores(scoresV1), GRILLE_GLOBAL, GRILLE_ANALYSE_Q, dayOffset(-20, '18:00'), dayOffset(-20, '18:00')).lastInsertRowid)
  writeScores(v1, false, scoresV1)
  // v2 (validée, plus récente, valeurs courantes)
  const v2 = Number(insEval.run(dossierId, 'validee', noteFromScores(scoresV2), GRILLE_GLOBAL, GRILLE_ANALYSE_Q, dayOffset(-6, '18:00'), dayOffset(-6, '18:00')).lastInsertRowid)
  writeScores(v2, true)
  // brouillon courant (copie de v2, éditable)
  const draft = Number(insEval.run(dossierId, 'brouillon', noteFromScores(scoresV2), GRILLE_GLOBAL, GRILLE_ANALYSE_Q, dayOffset(-6, '18:00'), dayOffset(-1, '09:00')).lastInsertRowid)
  writeScores(draft, true)

  // Quelques notifications cohérentes (déjà lues)
  const insNotif = db.prepare('INSERT INTO notifications (user_id, texte, lu) VALUES (?,?,1)')
  insNotif.run(accId, 'Amine a complété son questionnaire initial.')
  insNotif.run(amineId, 'Un nouveau compte rendu est disponible dans votre espace.')

  console.log(`[seed:demo] Jeu de données de démonstration créé pour Amine (dossier ${dossierId}).`)
}

function makeCR(sessionId: number, content: CRContent, dateIso: string): void {
  const html = contentToHtml(content, { accompagne: 'Amine', date: dateIso.slice(0, 10) })
  db.prepare("INSERT INTO comptes_rendus (session_id, version, contenu_html, source, publie, publie_le, genere_le) VALUES (?, 1, ?, 'ia', 1, ?, ?)")
    .run(sessionId, html, dateIso, dateIso)
}
