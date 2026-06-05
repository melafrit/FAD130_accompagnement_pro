// Les 6 phases de l'entretien d'accompagnement (source partagée : API + IA).
export interface Phase {
  id: number
  titre: string
  objectif: string
  vigilance: string[]
  questions: string[]
}

export const PHASES: Phase[] = [
  {
    id: 0,
    titre: 'Cadre & alliance',
    objectif: "Créer la confiance, se présenter, poser le cadre (objet, durée, confidentialité), vérifier le volontariat.",
    vigilance: ['Ne pas sauter l’étape pour gagner du temps', 'Nommer une situation contrainte', 'S’aligner avec le métacadre de l’institution'],
    questions: ['Avant de commencer, je t’explique comment je travaille — ça te va ?', 'Qu’est-ce qui t’amène aujourd’hui ?', 'De combien de temps disposons-nous ?'],
  },
  {
    id: 1,
    titre: 'Demande & besoin',
    objectif: "Faire formuler où en est la personne ; distinguer la demande explicite du besoin réel.",
    vigilance: ['Ne pas répondre trop vite', 'Repérer une décision déjà prise', 'Entendre le niveau psychologique (légitimité, confiance)'],
    questions: ['Si tout se passait bien, à quoi ressemblerait ton mémoire — et toi — à la fin ?', 'Qu’est-ce qui est le plus difficile en ce moment ?', 'Qu’attends-tu de cet accompagnement ?'],
  },
  {
    id: 2,
    titre: 'Exploration de l’expérience',
    objectif: "Faire décrire concrètement l’expérience vécue en entreprise — la matière du mémoire.",
    vigilance: ['Ne pas parasiter avec ses solutions', 'Laisser les silences', 'Ne pas « enquêter »'],
    questions: ['Raconte-moi une situation précise dont tu es fier.', 'Concrètement, qu’as-tu fait, étape par étape ?', 'Qu’as-tu ressenti à ce moment-là ?'],
  },
  {
    id: 3,
    titre: 'Mise en sens & structuration',
    objectif: "Aider à relier l’expérience au mémoire, à dégager axes et plan — sans faire à la place.",
    vigilance: ['Ne pas imposer SON plan', 'Transformer ses propositions en questions', 'Vérifier que c’est la personne qui structure'],
    questions: ['Quel lien vois-tu entre ce que tu viens de décrire et ta problématique ?', 'Quelles seraient les 3 grandes parties qui te semblent logiques ?'],
  },
  {
    id: 4,
    titre: 'Plan d’action & engagement',
    objectif: "Co-construire les prochaines étapes (micro-objectifs, critères, échéances) et renforcer le sentiment d’efficacité.",
    vigilance: ['Des actions réalistes et qui sont les siennes', 'Responsabilité des moyens', 'Ne pas surcharger'],
    questions: ['Quelle est la toute prochaine étape, la plus petite possible ?', 'Pour quand te sens-tu de la faire ?', 'À quoi sauras-tu que c’est réussi ?'],
  },
  {
    id: 5,
    titre: 'Clôture & repositionnement',
    objectif: "Reformuler le chemin, vérifier l’état de la personne, laisser mûrir, fixer le prochain point.",
    vigilance: ['Ne pas conclure à sa place', 'Accueillir l’émotion sans dramatiser', 'Savoir différer ou passer la main'],
    questions: ['Qu’est-ce que tu retiens de notre échange ?', 'Comment te sens-tu maintenant ?', 'Qu’as-tu envie de faire d’ici la prochaine fois ?'],
  },
]
