// Grille d'auto-évaluation de la pratique d'accompagnement (FAD130).
// Source partagée : rendu frontend + prompt IA.
// Alignée sur la grille officielle de l'UE : 3 critères pondérés 7 / 7 / 6 = 20 points.
// Chaque indicateur vaut 1 point → 7 + 7 + 6 = 20 indicateurs. Échelle : curseur continu 0–100, 4 zones.

export interface Indicateur {
  id: string // '1.1', '2.4', '3.6'…
  texte: string
}
export interface Critere {
  id: number
  titre: string
  resume: string
  points: number // barème officiel : 7, 7, 6 (total 20)
  indicateurs: Indicateur[]
}

export const GRILLE: Critere[] = [
  {
    id: 1,
    titre: 'Positionnement dans la relation d’accompagnement',
    resume: 'La place que je fais à l’accompagné et à mon propre positionnement, et la vigilance que j’y porte dans le temps.',
    points: 7,
    indicateurs: [
      { id: '1.1', texte: 'J’installe la confiance (« la bulle »), je me présente et j’explicite ma façon de travailler avant d’entrer dans le travail.' },
      { id: '1.2', texte: 'Je reconnais l’étudiant comme auteur de son mémoire et de son parcours : je lui fais une vraie place, je ne rédige pas à sa place.' },
      { id: '1.3', texte: 'Je tiens la juste distance (« lien élastique ») : disponible sans fusion, cadre pro sans froideur.' },
      { id: '1.4', texte: 'Je pratique le non-jugement : « je critique un livrable, jamais une personne ».' },
      { id: '1.5', texte: 'J’écoute les deux niveaux du message : derrière « je ne sais pas quoi écrire », entendre « je ne me sens pas légitime ».' },
      { id: '1.6', texte: 'Je conscientise ce que j’investis dans la relation du fait de mon histoire, de mes croyances et de mon vécu — et je le mets au service de l’autre sans m’exposer.' },
      { id: '1.7', texte: 'J’entretiens une vigilance sur mon positionnement et je le réévalue dans le temps (veille sur la façon dont il évolue) ; je vise la croissance de l’autonomie.' },
    ],
  },
  {
    id: 2,
    titre: 'Positionnement dans la mise en œuvre de l’accompagnement',
    resume: 'Comment je justifie, conduis et ajuste mes stratégies, méthodes et outils — du stratégique à l’intuitif.',
    points: 7,
    indicateurs: [
      { id: '2.1', texte: 'Je fais formuler la demande et le besoin réel (au-delà de « rendre un mémoire ») et je reformule avant d’agir.' },
      { id: '2.2', texte: 'Je pose un cadre clair : jalons, échéances, critères de réussite, disponibilités ; aligné avec le métacadre du centre.' },
      { id: '2.3', texte: 'Je conduis les étapes : cadre & alliance → demande/besoin → exploration → mise en sens → plan d’action → clôture.' },
      { id: '2.4', texte: 'Je dose mes interventions (Porter) : reformulation et questionnement d’abord ; conseil seulement si demandé.' },
      { id: '2.5', texte: 'Je fais émerger la solution de l’étudiant plutôt que de la fournir.' },
      { id: '2.6', texte: 'J’installe des boucles de progression : micro-objectifs, critères, feedback régulier (sentiment d’efficacité, Bandura).' },
      { id: '2.7', texte: 'J’ajuste sensiblement, voire intuitivement, et j’équilibre les dimensions stratégique, méthodique et intuitive (je sais m’écarter du plan quand la situation l’exige) ; j’adapte l’outil à la personne sans le croire universel.' },
    ],
  },
  {
    id: 3,
    titre: 'Positionnement professionnel',
    resume: 'Ma vision critique de la fonction, mon éthique et son rôle social.',
    points: 6,
    indicateurs: [
      { id: '3.1', texte: 'Réflexivité sur ma subjectivité : ce que mon parcours apporte, mais aussi ce qu’il me fait projeter.' },
      { id: '3.2', texte: 'Je distingue responsabilité des moyens et du résultat, et je me détache du résultat sans me désinvestir.' },
      { id: '3.3', texte: 'Je connais mes limites et j’oriente : si l’étudiant déborde vers la détresse, je relaie (je ne suis pas psy).' },
      { id: '3.4', texte: 'Je suis convaincu et je sais expliciter/justifier mes choix (« on ne peut pas accompagner dans le doute »), et j’utilise les émotions comme boussole — les siennes et les miennes.' },
      { id: '3.5', texte: 'Je porte une analyse critique de la fonction : ses difficultés, son rayonnement, ses zones de tension, ses évolutions possibles et sa place dans la société.' },
      { id: '3.6', texte: 'Je situe le sens social de ma fonction (insertion, « rigueur bienveillante »), je reste critique sur l’injonction à l’autonomie, et je m’engage dans un travail continu (analyse de pratiques).' },
    ],
  },
]

export interface Zone {
  label: string
  min: number // borne basse incluse (0–100)
  couleur: string
}

// Un seul jeu de 4 zones, identique pour tous les indicateurs.
export const ZONES: Zone[] = [
  { label: 'Émergent', min: 0, couleur: '#d9534f' },
  { label: 'En développement', min: 25, couleur: '#e8a33d' },
  { label: 'Maîtrisé', min: 50, couleur: '#7fae6b' },
  { label: 'Expert', min: 75, couleur: '#2f6f4f' },
]

/** Tous les identifiants d'indicateurs, dans l'ordre (21). */
export const INDICATEUR_IDS: string[] = GRILLE.flatMap((c) => c.indicateurs.map((i) => i.id))

/** Zone correspondant à un score 0–100. */
export function zoneFor(score: number): Zone {
  const s = Math.max(0, Math.min(100, score))
  let z = ZONES[0]
  for (const zone of ZONES) if (s >= zone.min) z = zone
  return z
}

/** Texte d'un indicateur par son id. */
export function libelleIndicateur(id: string): string {
  for (const c of GRILLE) for (const i of c.indicateurs) if (i.id === id) return i.texte
  return id
}
