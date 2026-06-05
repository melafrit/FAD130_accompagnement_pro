import { useState } from 'react'

const ANCHORS = [
  { nom: 'Rogers', desc: 'Relation d’aide : non-jugement, et viser la croissance de l’autre plutôt que sa dépendance.' },
  { nom: 'Porter', desc: 'Les attitudes d’écoute : privilégier la reformulation, bannir le jugement et l’interprétation.' },
  { nom: 'Brémond', desc: 'Entretien de traversée sensible : le « geste écologique », faire émerger l’expérience.' },
  { nom: 'Maela Paul', desc: 'Une relation « avec », non une intervention « sur » : se joindre à quelqu’un pour aller où il va.' },
  { nom: 'Le Boterf', desc: 'La compétence comme savoir-agir / vouloir-agir / pouvoir-agir.' },
  { nom: 'Bandura', desc: 'Le sentiment d’efficacité personnelle : aider la personne à se sentir capable.' },
  { nom: 'Deci & Ryan', desc: 'Autodétermination : besoins d’autonomie, de compétence et d’appartenance.' },
  { nom: 'Damasio', desc: 'Les émotions sont des « boussoles » : une information utile à la décision.' },
]

const PRINCIPES = [
  { titre: 'Faire parler l’autre', detail: 'C’est l’objectif n°1 : l’accompagnateur parle peu et écoute beaucoup.' },
  { titre: 'Le geste écologique', detail: 'Le moins d’induction possible : des questions ouvertes et neutres, qui ne suggèrent pas la réponse.' },
  { titre: 'Faire émerger', detail: 'Ne pas donner la solution — aider la personne à la trouver. Ça a plus d’impact et nourrit son autonomie.' },
  { titre: 'Non-jugement', detail: 'Ni évaluation positive ni négative : on questionne un travail, jamais la personne.' },
  { titre: 'Demande / besoin / décision', detail: 'La demande explicite n’est pas toujours le besoin réel ; repérer si une décision est déjà prise.' },
  { titre: 'Moyens, pas résultat', detail: 'On outille, on ne décide pas à la place : « on l’amène au bord du précipice, c’est elle qui déploie ses ailes ».' },
  { titre: 'Influencer par le cadre', detail: 'Agir sur les objectifs, les critères et le rythme — plutôt que par l’autorité.' },
  { titre: 'Viser l’autonomie', detail: 'La finalité de tout l’entretien : faire croître l’autonomie de la personne.' },
]

interface Phase {
  id: number
  titre: string
  objectif: string
  vigilance: string[]
  questions: string[]
  porter: string
  exemple: string
}

const PHASES: Phase[] = [
  {
    id: 0,
    titre: 'Cadre & alliance',
    objectif: 'Créer la confiance, se présenter, poser le cadre (objet, durée, confidentialité), vérifier le volontariat.',
    vigilance: ['Ne pas sauter l’étape pour gagner du temps', 'Nommer une situation contrainte', 'S’aligner avec le métacadre de l’institution'],
    questions: ['Avant de commencer, je t’explique comment je travaille — ça te va ?', 'Qu’est-ce qui t’amène aujourd’hui ?', 'De combien de temps disposons-nous ?'],
    porter: 'Privilégier l’accueil et la reformulation ; éviter le conseil prématuré.',
    exemple: '« On a 45 minutes ensemble. Je te propose qu’on parte de là où tu en es, sans jugement. Ça te convient ? »',
  },
  {
    id: 1,
    titre: 'Demande & besoin',
    objectif: 'Faire formuler où en est la personne ; distinguer la demande explicite du besoin réel.',
    vigilance: ['Ne pas répondre trop vite', 'Repérer une décision déjà prise', 'Entendre le niveau psychologique (légitimité, confiance)'],
    questions: ['Si tout se passait bien, à quoi ressemblerait ton mémoire — et toi — à la fin ?', 'Qu’est-ce qui est le plus difficile en ce moment ?', 'Qu’attends-tu de cet accompagnement ?'],
    porter: 'Privilégier la reformulation / clarification ; bannir l’interprétation et le jugement.',
    exemple: '— « Je bloque sur mon mémoire. » — « Qu’est-ce qui est le plus difficile, concrètement, en ce moment ? »',
  },
  {
    id: 2,
    titre: 'Exploration de l’expérience',
    objectif: 'Faire décrire concrètement l’expérience vécue en entreprise — la matière première du mémoire.',
    vigilance: ['Ne pas parasiter avec ses solutions', 'Laisser les silences', 'Ne pas « enquêter »'],
    questions: ['Raconte-moi une situation précise dont tu es fier.', 'Concrètement, qu’as-tu fait, étape par étape ?', 'Qu’as-tu ressenti à ce moment-là ?'],
    porter: 'Privilégier l’écoute compréhensive ; éviter de philosopher ou de ramener à soi.',
    exemple: '« Raconte-moi une mission précise dont tu es fier, étape par étape — comme si j’y étais. »',
  },
  {
    id: 3,
    titre: 'Mise en sens & structuration',
    objectif: 'Aider à relier l’expérience au mémoire, à dégager axes et plan — sans faire à la place.',
    vigilance: ['Ne pas imposer SON plan', 'Transformer ses propositions en questions', 'Vérifier que c’est la personne qui structure'],
    questions: ['Quel lien vois-tu entre ce que tu viens de décrire et ta problématique ?', 'Quelles seraient les 3 grandes parties qui te semblent logiques ?'],
    porter: 'Privilégier la reformulation-élucidation ; surveiller le glissement vers l’interprétation.',
    exemple: '« Quel fil rouge vois-tu entre cette mission et la problématique de ton mémoire ? »',
  },
  {
    id: 4,
    titre: 'Plan d’action & engagement',
    objectif: 'Co-construire les prochaines étapes (micro-objectifs, critères, échéances) et renforcer le sentiment d’efficacité.',
    vigilance: ['Des actions réalistes et qui sont les siennes', 'Responsabilité des moyens', 'Ne pas surcharger'],
    questions: ['Quelle est la toute prochaine étape, la plus petite possible ?', 'Pour quand te sens-tu de la faire ?', 'À quoi sauras-tu que c’est réussi ?'],
    porter: 'Privilégier le soutien dosé / la responsabilisation ; conseil seulement si demandé.',
    exemple: '« Quelle est la toute petite première étape — et pour quand te sens-tu de la faire ? »',
  },
  {
    id: 5,
    titre: 'Clôture & repositionnement',
    objectif: 'Reformuler le chemin parcouru, vérifier l’état de la personne, laisser mûrir, fixer le prochain point.',
    vigilance: ['Ne pas conclure à sa place', 'Accueillir l’émotion sans dramatiser', 'Savoir différer ou passer la main'],
    questions: ['Qu’est-ce que tu retiens de notre échange ?', 'Comment te sens-tu maintenant ?', 'Qu’as-tu envie de faire d’ici la prochaine fois ?'],
    porter: 'Privilégier la synthèse partagée ; éviter de rassurer à tout prix.',
    exemple: '« Qu’est-ce que tu retiens, et comment te sens-tu maintenant ? On laisse mûrir d’ici la prochaine fois. »',
  },
]

export default function Methode() {
  const [phase, setPhase] = useState(0)
  const [openP, setOpenP] = useState<number | null>(null)
  const [anchor, setAnchor] = useState<number | null>(null)
  const p = PHASES[phase]

  return (
    <article className="page methode">
      <p className="kicker">FAD130 · Méthode d’accompagnement</p>
      <h1 className="page-title">L’arbre de décision de l’entretien</h1>
      <p className="lead">
        Une posture de <strong>facilitateur</strong> au service de la transition de l’autre. Clique pour explorer :
        mes ancrages, ma posture, et chaque phase de l’entretien.
      </p>

      {/* Triptyque */}
      <div className="triptyque">
        <div className="tri-block">Comprendre<span>en profondeur</span></div>
        <span className="tri-arrow">→</span>
        <div className="tri-block">Structurer<span>avec rigueur</span></div>
        <span className="tri-arrow">→</span>
        <div className="tri-block">Transmettre<span>avec clarté</span></div>
      </div>

      {/* Ancrages cliquables */}
      <section>
        <h2>Mes ancrages théoriques</h2>
        <p className="hint">Clique sur un nom pour la définition.</p>
        <div className="anchors">
          {ANCHORS.map((a, i) => (
            <button key={i} className={`anchor-chip ${anchor === i ? 'active' : ''}`} onClick={() => setAnchor(anchor === i ? null : i)}>{a.nom}</button>
          ))}
        </div>
        {anchor !== null && <p className="anchor-desc">{ANCHORS[anchor].desc}</p>}
      </section>

      {/* Principes dépliables */}
      <section>
        <h2>La posture en 8 principes</h2>
        <p className="hint">Clique sur un principe pour le « pourquoi ».</p>
        <div className="principe-grid">
          {PRINCIPES.map((pr, i) => (
            <button key={i} className={`principe-card ${openP === i ? 'open' : ''}`} onClick={() => setOpenP(openP === i ? null : i)}>
              <span className="principe-head"><span className="principe-num">{i + 1}</span>{pr.titre}</span>
              {openP === i && <span className="principe-detail">{pr.detail}</span>}
            </button>
          ))}
        </div>
      </section>

      {/* Arbre de décision interactif */}
      <section className="ia-section">
        <h2>L’arbre de décision — les 6 phases</h2>
        <p className="hint">Navigue phase par phase (clique un numéro, ou « Précédent / Suivant »).</p>
        <div className="phase-tabs">
          {PHASES.map((ph, i) => (
            <button key={ph.id} className={`phase-tab ${i === phase ? 'active' : ''} ${i < phase ? 'done' : ''}`} onClick={() => setPhase(i)}>
              <span className="phase-tab-num">{i + 1}</span>
              <span className="phase-tab-titre">{ph.titre}</span>
            </button>
          ))}
        </div>

        <div className="phase-panel">
          <div className="phase-head"><span className="phase-num">{p.id}</span><h3 style={{ margin: 0 }}>{p.titre}</h3></div>
          <p className="phase-obj">{p.objectif}</p>
          <div className="phase-grid">
            <div><h4>⚠️ Points de vigilance</h4><ul>{p.vigilance.map((v, i) => <li key={i}>{v}</li>)}</ul></div>
            <div><h4>💬 Banque de questions</h4><ul>{p.questions.map((q, i) => <li key={i}>« {q} »</li>)}</ul></div>
          </div>
          <p className="phase-porter"><strong>Attitudes (Porter) :</strong> {p.porter}</p>
          <div className="phase-exemple"><strong>Exemple :</strong> {p.exemple}</div>

          <div className="phase-panel-nav">
            <button className="btn btn-ghost" disabled={phase === 0} onClick={() => setPhase(phase - 1)}>← Précédent</button>
            <span className="phase-counter">{phase + 1} / 6</span>
            <button className="btn btn-primary" disabled={phase === PHASES.length - 1} onClick={() => setPhase(phase + 1)}>Suivant →</button>
          </div>
        </div>
      </section>

      {/* IA */}
      <section className="ia-section">
        <h2>Comment l’IA assiste (sans jamais décider)</h2>
        <ul className="list">
          <li><strong>Elle suggère, l’accompagnateur décide</strong> : questions et reformulations proposées, jamais imposées.</li>
          <li><strong>Elle ne s’adresse jamais à la personne accompagnée</strong> à la place de l’accompagnateur.</li>
          <li><strong>Elle respecte les 8 principes</strong> ci-dessus (intégrés à ses garde-fous).</li>
          <li><strong>Claude Sonnet</strong> pour les suggestions en temps réel, <strong>Claude Opus</strong> pour les comptes rendus.</li>
        </ul>
      </section>
    </article>
  )
}
