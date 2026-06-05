const PRINCIPES = [
  'Faire parler l’autre le plus possible.',
  'Le « geste écologique » : le moins d’induction et de suggestion possible.',
  'Faire émerger plutôt que donner la solution.',
  'Non-jugement : ne pas évaluer, ne pas valider.',
  'Distinguer demande / besoin / décision.',
  'Responsabilité des moyens, pas du résultat.',
  'Influencer par le cadre, pas par l’autorité.',
  'Finalité : faire croître l’autonomie de la personne.',
]

interface Phase {
  n: number
  titre: string
  objectif: string
  vigilance: string[]
  questions: string[]
  porter: string
}

const PHASES: Phase[] = [
  {
    n: 0,
    titre: 'Cadre & alliance',
    objectif: 'Créer la confiance (« la bulle »), se présenter, poser le cadre (objet, durée, confidentialité), vérifier le volontariat.',
    vigilance: ['Ne pas sauter l’étape pour gagner du temps', 'Nommer une situation contrainte', 'S’aligner avec le métacadre de l’institution'],
    questions: ['« Avant de commencer, je t’explique comment je travaille — ça te va ? »', '« Qu’est-ce qui t’amène aujourd’hui ? »', '« De combien de temps disposons-nous ? »'],
    porter: 'Privilégier l’accueil et la reformulation ; éviter le conseil prématuré.',
  },
  {
    n: 1,
    titre: 'Demande & besoin',
    objectif: 'Faire formuler où en est la personne ; distinguer la demande explicite du besoin réel.',
    vigilance: ['Ne pas répondre trop vite', 'Repérer une décision déjà prise', 'Entendre le niveau psychologique (« je ne sais pas écrire » = « je ne me sens pas légitime »)'],
    questions: ['« Si tout se passait bien, à quoi ressemblerait ton mémoire — et toi — à la fin ? »', '« Qu’est-ce qui est le plus difficile en ce moment ? »', '« Qu’attends-tu de cet accompagnement ? »'],
    porter: 'Privilégier la reformulation / clarification ; bannir l’interprétation et le jugement.',
  },
  {
    n: 2,
    titre: 'Exploration de l’expérience',
    objectif: 'Faire décrire concrètement l’expérience vécue en entreprise — la matière première du mémoire.',
    vigilance: ['Ne pas parasiter avec son propre imaginaire / ses solutions', 'Laisser les silences', 'Ne pas « enquêter » (on n’est pas au commissariat)'],
    questions: ['« Raconte-moi une situation précise dont tu es fier. »', '« Concrètement, qu’as-tu fait, étape par étape ? »', '« Qu’as-tu ressenti à ce moment-là ? »'],
    porter: 'Privilégier l’écoute compréhensive ; éviter de philosopher ou de ramener à soi.',
  },
  {
    n: 3,
    titre: 'Mise en sens & structuration',
    objectif: 'Aider à relier l’expérience au mémoire, à dégager axes et plan — sans faire à la place.',
    vigilance: ['Ne pas imposer SON plan', 'Transformer ses propositions en questions', 'Vérifier que c’est bien la personne qui structure'],
    questions: ['« Quel lien vois-tu entre ce que tu viens de décrire et ta problématique ? »', '« Quelles seraient les 3 grandes parties qui te semblent logiques ? »'],
    porter: 'Privilégier la reformulation-élucidation ; surveiller le glissement vers l’interprétation.',
  },
  {
    n: 4,
    titre: 'Plan d’action & engagement',
    objectif: 'Co-construire les prochaines étapes (micro-objectifs, critères, échéances) et renforcer le sentiment d’efficacité.',
    vigilance: ['Des actions réalistes et qui sont les siennes', 'Responsabilité des moyens (ne pas faire à sa place)', 'Ne pas surcharger'],
    questions: ['« Quelle est la toute prochaine étape, la plus petite possible ? »', '« Pour quand te sens-tu de la faire ? »', '« À quoi sauras-tu que c’est réussi ? »'],
    porter: 'Privilégier le soutien dosé / la responsabilisation ; conseil seulement si demandé.',
  },
  {
    n: 5,
    titre: 'Clôture & repositionnement',
    objectif: 'Reformuler le chemin parcouru, vérifier l’état de la personne, laisser mûrir, fixer le prochain point.',
    vigilance: ['Ne pas conclure à sa place', 'Accueillir l’émotion sans dramatiser', 'Savoir différer ou passer la main si la demande dépasse son périmètre'],
    questions: ['« Qu’est-ce que tu retiens de notre échange ? »', '« Comment te sens-tu maintenant ? »', '« Qu’as-tu envie de faire d’ici la prochaine fois ? »'],
    porter: 'Privilégier la synthèse partagée ; éviter de rassurer à tout prix.',
  },
]

export default function Methode() {
  return (
    <article className="page">
      <p className="kicker">FAD130 · Méthode d’accompagnement</p>
      <h1 className="page-title">L’arbre de décision de l’entretien</h1>
      <p className="lead">
        Ma méthode met au service de la transition de l’autre un fil rouge — <strong>Comprendre →
        Structurer → Transmettre</strong> — dans une posture de <strong>facilitateur</strong> (et non
        d’expert qui livre la solution). Elle s’appuie sur Rogers (non-jugement), Porter (dosage des
        attitudes), Brémond (geste écologique) et Maela Paul (relation <em>avec</em>, non
        intervention <em>sur</em>).
      </p>

      <section className="principes-section">
        <h2>Les 8 principes (la posture)</h2>
        <ol className="principes">
          {PRINCIPES.map((p, i) => (
            <li key={i}><span className="principe-num">{i + 1}</span>{p}</li>
          ))}
        </ol>
      </section>

      <section>
        <h2>Les 6 phases de l’entretien</h2>
        <div className="phases">
          {PHASES.map((ph) => (
            <div className="phase" key={ph.n}>
              <div className="phase-head">
                <span className="phase-num">{ph.n}</span>
                <h3>{ph.titre}</h3>
              </div>
              <p className="phase-obj">{ph.objectif}</p>
              <div className="phase-grid">
                <div>
                  <h4>⚠️ Points de vigilance</h4>
                  <ul>{ph.vigilance.map((v, i) => <li key={i}>{v}</li>)}</ul>
                </div>
                <div>
                  <h4>💬 Banque de questions</h4>
                  <ul>{ph.questions.map((q, i) => <li key={i}>{q}</li>)}</ul>
                </div>
              </div>
              <p className="phase-porter"><strong>Attitudes :</strong> {ph.porter}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="ia-section">
        <h2>Comment l’IA assiste (sans jamais décider)</h2>
        <ul className="list">
          <li><strong>Elle suggère, l’accompagnateur décide.</strong> L’IA propose des questions et des reformulations ; rien n’est automatique.</li>
          <li><strong>Elle ne s’adresse jamais à la personne accompagnée</strong> à la place de l’accompagnateur.</li>
          <li><strong>Elle respecte les 8 principes</strong> ci-dessus (intégrés à ses garde-fous).</li>
          <li><strong>Claude Sonnet</strong> pour les suggestions en temps réel, <strong>Claude Opus</strong> pour la rédaction des comptes rendus.</li>
        </ul>
      </section>
    </article>
  )
}
