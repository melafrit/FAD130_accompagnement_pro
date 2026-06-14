import type { TourStep } from './OnboardingTour'

// ---------------------------------------------------------------------------
// Visite GLOBALE par rôle (lancée à la première connexion, relançable via le bouton flottant « ? »).
// ---------------------------------------------------------------------------
export const ROLE_TOURS: Record<string, TourStep[]> = {
  accompagne: [
    { title: 'Bienvenue sur Boussole 👋', body: 'Boussole t’accompagne pas à pas dans l’écriture de ton mémoire professionnel. Voici l’essentiel en quelques étapes.' },
    { title: 'Mon espace', body: 'Retrouve ici tous tes parcours, tes rendez-vous et tes comptes rendus.', selector: '[data-tour="espace"]' },
    { title: 'Ton parcours guidé', body: 'Questionnaire initial, entretiens, plan d’action puis synthèse : chaque étape te rapproche de l’autonomie.' },
    { title: 'Une visite par écran', body: 'À ta première arrivée sur un écran, Boussole te propose une visite guidée de cet écran. Tu peux la relancer à tout moment via « Visite guidée » dans le menu de ton compte (en haut à droite).' },
  ],
  accompagnateur: [
    { title: 'Bienvenue sur Boussole 👋', body: 'Boussole t’aide à conduire des entretiens justes et à produire des comptes rendus structurés, avec l’appui de l’IA.' },
    { title: 'Ton tableau de bord', body: 'Suis tous tes accompagnés, les signaux de décrochage et ton impact en un coup d’œil.', selector: '[data-tour="espace"]' },
    { title: 'L’entretien guidé', body: 'Six phases, un co-pilote IA et un coach de posture : tu restes maître de l’entretien, l’IA te seconde.' },
    { title: 'Une visite par écran', body: 'À ta première arrivée sur un écran, Boussole te propose une visite guidée de cet écran. Tu peux la relancer via « Visite guidée » dans le menu de ton compte (en haut à droite).' },
  ],
  admin: [
    { title: 'Console d’administration', body: 'Gère les comptes, les plans d’abonnement (et donc les fonctionnalités activées), les réglages généraux et la confidentialité (RGPD).' },
    { title: 'Visite par écran', body: 'Chaque écran d’administration propose sa propre visite guidée, relançable via « Visite guidée » dans le menu de ton compte.' },
  ],
}

// ---------------------------------------------------------------------------
// Visites PAR ÉCRAN : proposées à la première arrivée sur l'écran, relançables via le menu du compte.
// `match` : test sur le pathname courant (gère les segments dynamiques comme /dossier/:id).
// ---------------------------------------------------------------------------
export interface ScreenTour { key: string; title: string; match: RegExp; steps: TourStep[] }

export const SCREEN_TOURS: ScreenTour[] = [
  {
    key: 'espace', title: 'Mon espace', match: /^\/espace$/,
    steps: [
      { title: 'Mon espace', body: 'Le point de départ : tes parcours, rendez-vous, comptes rendus et outils sont accessibles d’ici.' },
      { title: 'Tes parcours', body: 'Chaque parcours regroupe ton questionnaire, tes entretiens, ton plan d’action et ta synthèse. Ouvre-en un pour voir son détail.' },
      { title: 'Reprendre où tu en es', body: 'Le résumé « Où j’en suis » et tes notifications t’indiquent la prochaine action à mener.' },
    ],
  },
  {
    key: 'questionnaire', title: 'Questionnaire initial', match: /^\/questionnaire$/,
    steps: [
      { title: 'Cadrer ton besoin', body: 'Avant le 1ᵉʳ rendez-vous, ce questionnaire guidé par l’IA t’aide à clarifier ton sujet, ton contexte et tes difficultés — une question à la fois.' },
      { title: 'À ton rythme', body: 'Réponds librement : l’IA reformule et enchaîne. Tu peux revenir en arrière et préciser tes réponses.' },
      { title: 'Un récapitulatif utile', body: 'À la fin, un récapitulatif est généré : il servira de base au premier entretien avec ton accompagnateur.' },
    ],
  },
  {
    key: 'entretien', title: 'Entretien guidé', match: /^\/entretien$/,
    steps: [
      { title: 'L’entretien en 6 phases', body: 'De l’accueil à la clôture, chaque phase a un objectif, des points de vigilance et une banque de questions. Tu navigues phase par phase.' },
      { title: 'Dicter au micro', body: 'Active le micro pour transcrire la parole en direct (reconnaissance vocale du navigateur) : tu gardes les mains libres pendant l’échange.', selector: '[data-tour="micro"]' },
      { title: 'Ajouter et éditer des questions', body: 'Pioche dans la banque de questions, ajoute les tiennes et édite-les : l’IA propose, tu décides.', selector: '[data-tour="ajouter-question"]' },
      { title: 'Le co-pilote IA', body: 'À tout moment, l’IA suggère des relances et des reformulations — jamais imposées. Tu restes maître de l’entretien.' },
      { title: 'Générer le compte rendu', body: 'En fin d’entretien, génère un compte rendu structuré (avec plan d’action) par l’IA — puis relis-le et édite-le avant de le publier.', selector: '[data-tour="generer-cr"]' },
    ],
  },
  {
    key: 'tableau-de-bord', title: 'Tableau de bord', match: /^\/tableau-de-bord$/,
    steps: [
      { title: 'Vue d’ensemble', body: 'Tous tes accompagnés en un coup d’œil : avancement, prochains rendez-vous et état de chaque parcours.' },
      { title: 'Signaux de décrochage', body: 'Des voyants repèrent les parcours en difficulté (inactivité, météo en baisse) pour que tu interviennes au bon moment.' },
      { title: 'Recherche & étiquettes', body: 'Filtre et étiquette tes dossiers pour t’y retrouver quand le nombre d’accompagnés grandit.' },
    ],
  },
  {
    key: 'dossier', title: 'Dossier (parcours)', match: /^\/dossier\/\d+$/,
    steps: [
      { title: 'Le dossier d’un parcours', body: 'Tout le parcours d’un accompagné : questionnaire, entretiens, comptes rendus, plan d’action et synthèse.' },
      { title: 'Boussole & timeline', body: 'La boussole et la frise chronologique visualisent l’avancement et les moments-clés du parcours.' },
      { title: 'Comptes rendus & synthèse', body: 'Ouvre un compte rendu pour le lire, l’éditer et échanger ; en fin de parcours, rédige et publie la synthèse.' },
      { title: 'Réflexivité', body: 'Miroir de posture, débriefing à chaud et replay annoté t’aident à analyser ta pratique après chaque entretien.' },
    ],
  },
  {
    key: 'plan-action', title: 'Plan d’action', match: /^\/(plan-action\/\d+|mon-plan-action)$/,
    steps: [
      { title: 'Le plan d’action', body: 'Les actions concrètes issues de l’entretien : libellé, échéance et critère de réussite.' },
      { title: 'Suivre l’avancement', body: 'Glisse-dépose pour réordonner, coche les actions faites, et reçois des rappels avant l’échéance.' },
    ],
  },
  {
    key: 'comptes-rendus', title: 'Comptes rendus', match: /^\/mes-comptes-rendus$/,
    steps: [
      { title: 'Tes comptes rendus', body: 'Retrouve tous les comptes rendus publiés par ton accompagnateur, datés et structurés.' },
      { title: 'Écouter & discuter', body: 'Écoute le compte rendu à voix haute, et ouvre la discussion pour réagir ou poser une question à ton accompagnateur.' },
    ],
  },
  {
    key: 'rdv', title: 'Rendez-vous', match: /^\/(rendez-vous|mes-creneaux)$/,
    steps: [
      { title: 'Les rendez-vous', body: 'Côté accompagné : choisis un créneau parmi les disponibilités. Côté accompagnateur : publie tes créneaux.' },
      { title: 'Rester synchronisés', body: 'Les confirmations et rappels sont envoyés par email ; tu peux exporter un rendez-vous vers ton agenda (.ics).' },
    ],
  },
  {
    key: 'mutualisation', title: 'Mutualisation', match: /^\/mutualisation$/,
    steps: [
      { title: 'Mutualisation entre pairs', body: 'Partage et découvre des ressources et des pratiques d’accompagnement entre accompagnateurs.' },
    ],
  },
  {
    key: 'bilan-pratique', title: 'Bilan de pratique', match: /^\/bilan-pratique$/,
    steps: [
      { title: 'Ton bilan de pratique', body: 'Une synthèse réflexive globale de ta posture d’accompagnement, générée par l’IA à partir de tes entretiens.' },
    ],
  },
  {
    key: 'admin', title: 'Administration', match: /^\/admin$/,
    steps: [
      { title: 'Comptes', body: 'Crée et gère les comptes, leurs rôles et leurs rattachements accompagnateur ↔ accompagné.' },
      { title: 'Réglages généraux & plans', body: 'Active des fonctionnalités transversales (FALC, multilingue) pour tout le monde, et compose les plans d’abonnement.' },
      { title: 'RGPD', body: 'Traite les demandes d’effacement et la rétention des comptes inactifs depuis la console RGPD.' },
    ],
  },
  {
    key: 'supervision', title: 'Supervision', match: /^\/admin\/supervision$/,
    steps: [
      { title: 'Supervision', body: 'Trois onglets : observabilité technique, santé des dépendances (IA, email, base, sauvegardes) et indicateurs métier.' },
      { title: 'Surveiller & être alerté', body: 'Les voyants passent au rouge en cas de problème, et un email t’est envoyé lors d’un passage à un état dégradé.' },
    ],
  },
]

export function screenTourFor(pathname: string): ScreenTour | null {
  return SCREEN_TOURS.find((t) => t.match.test(pathname)) || null
}
