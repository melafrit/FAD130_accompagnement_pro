// Grille d'auto-évaluation de la pratique d'accompagnement (FAD130).
// Source partagée : rendu frontend + prompt IA + export DOCX.
// 3 critères × 7 indicateurs = 21 indicateurs. Échelle : curseur continu 0–100, 4 zones.

export interface Indicateur {
  id: string // '1.1', '2.4', '3.7'…
  texte: string
}
export interface Critere {
  id: number
  titre: string
  resume: string
  indicateurs: Indicateur[]
}

export const GRILLE: Critere[] = [
  {
    id: 1,
    titre: 'Positionnement dans la relation d’accompagnement',
    resume: 'Comment j’initie, j’installe et je maintiens la relation.',
    indicateurs: [
      { id: '1.1', texte: 'J’installe la confiance (« la bulle »), je me présente et j’explicite ma façon de travailler avant d’entrer dans le travail.' },
      { id: '1.2', texte: 'Je reconnais l’étudiant comme auteur de son mémoire et de son parcours : je ne rédige pas à sa place.' },
      { id: '1.3', texte: 'Je tiens la juste distance (« lien élastique ») : disponible sans fusion, cadre pro sans froideur.' },
      { id: '1.4', texte: 'Je pratique le non-jugement : « je critique un livrable, jamais une personne ».' },
      { id: '1.5', texte: 'J’écoute les deux niveaux du message : derrière « je ne sais pas quoi écrire », entendre « je ne me sens pas légitime ».' },
      { id: '1.6', texte: 'Je mets mon vécu au service de l’autre sans m’exposer (le personnel devient une source, pas une exposition).' },
      { id: '1.7', texte: 'Je vise la croissance de l’autonomie, pas la dépendance.' },
    ],
  },
  {
    id: 2,
    titre: 'Positionnement dans la mise en œuvre de l’accompagnement',
    resume: 'Mes choix stratégiques et la conduite des étapes.',
    indicateurs: [
      { id: '2.1', texte: 'Je fais formuler la demande et le besoin réel (au-delà de « rendre un mémoire ») et je reformule avant d’agir.' },
      { id: '2.2', texte: 'Je pose un cadre clair : jalons, échéances, critères de réussite, disponibilités ; aligné avec le métacadre du centre.' },
      { id: '2.3', texte: 'Je conduis les étapes : cadre & alliance → demande/besoin → exploration → mise en sens → plan d’action → clôture.' },
      { id: '2.4', texte: 'Je dose mes interventions (Porter) : reformulation et questionnement d’abord ; conseil seulement si demandé.' },
      { id: '2.5', texte: 'Je fais émerger la solution de l’étudiant plutôt que de la fournir.' },
      { id: '2.6', texte: 'J’installe des boucles de progression : micro-objectifs, critères, feedback régulier (sentiment d’efficacité, Bandura).' },
      { id: '2.7', texte: 'J’adapte l’outil à la personne (kit, mini-site, entretien) sans le croire universel ; je laisse choisir ; j’accepte d’itérer.' },
    ],
  },
  {
    id: 3,
    titre: 'Positionnement professionnel',
    resume: 'Ma vision de la fonction, mon éthique, le rôle social.',
    indicateurs: [
      { id: '3.1', texte: 'Réflexivité sur ma subjectivité : ce que mon parcours apporte, mais aussi ce qu’il me fait projeter.' },
      { id: '3.2', texte: 'Je distingue responsabilité des moyens et du résultat, et je me détache du résultat sans me désinvestir.' },
      { id: '3.3', texte: 'Je connais mes limites et j’oriente : si l’étudiant déborde vers la détresse, je relaie (je ne suis pas psy).' },
      { id: '3.4', texte: 'J’utilise les émotions comme boussole — les siennes et les miennes (reconnaître mon état avant un RDV).' },
      { id: '3.5', texte: 'Je suis convaincu et je sais expliciter/justifier mes choix (« tu ne peux pas accompagner dans le doute »).' },
      { id: '3.6', texte: 'Je situe le sens social de ma fonction (insertion, « rigueur bienveillante ») et reste critique sur l’injonction à l’autonomie.' },
      { id: '3.7', texte: 'Je m’engage dans un travail continu (analyse de pratiques, lifelong learning).' },
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
