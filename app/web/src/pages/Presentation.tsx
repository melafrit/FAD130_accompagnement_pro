import { useState } from 'react'
import { Link } from 'react-router-dom'

interface PointCle { titre: string; detail: string }
interface Matrice { attention: string; autorise: string; interdit: string; pasEncore: string; pourquoi: string }
interface QPres {
  tab: string
  critere: string
  titre: string
  accroche: string
  points: PointCle[]
  ancrages: string[]
  matrice: Matrice
  preuves: { label: string; to: string }[]
}

const QUESTIONS: QPres[] = [
  {
    tab: 'La relation',
    critere: 'Relation d’accompagnement',
    titre: 'Ma place et mes fonctions dans la relation',
    accroche:
      'Je ne suis pas l’expert qui sait à la place de l’autre : je suis un facilitateur qui marche à côté de l’alternant pour le rendre auteur de son mémoire — et, peu à peu, autonome.',
    points: [
      { titre: 'Une relation « avec », pas « sur »', detail: 'Je me joins à l’alternant là où il en est (Maela Paul) ; je l’accompagne vers où lui veut aller, je ne plaque pas un parcours type.' },
      { titre: 'Le reconnaître comme auteur', detail: 'Il reste propriétaire de son mémoire et de ses choix. Je questionne son travail, jamais sa personne (non-jugement, Rogers) ; je vise sa croissance, pas sa dépendance.' },
      { titre: 'Poser le cadre et l’alliance — ma force', detail: 'Dès le 1ᵉʳ entretien : objet, durée, confidentialité, confiance. C’est mon point d’appui le plus solide — mon ancrage de chef de projet rassure.' },
      { titre: 'Présent sans fusion', detail: 'Disponible, mais sans porter le mémoire à sa place (le « lien élastique ») ; je protège aussi la soutenabilité de la relation.' },
    ],
    ancrages: ['Maela Paul', 'Rogers', 'Porter'],
    matrice: {
      attention: 'à poser le cadre et l’alliance avant tout, et à le reconnaître comme auteur (non-jugement).',
      autorise: 'à structurer, donner des jalons et des repères — influencer par le cadre, pas par l’autorité.',
      interdit: 'de donner la solution ou de décider à sa place — « je l’amène au bord du précipice, c’est lui qui déploie ses ailes ».',
      pasEncore: 'à accueillir pleinement l’émotionnel et l’imprévu, et à entendre le besoin de légitimité derrière la demande.',
      pourquoi: 'Mon réflexe de consultant PMP me ramène vite au concret et au résultat. J’apprends la relation d’aide, où le chemin compte autant que le livrable.',
    },
    preuves: [{ label: 'Ma posture (Méthode)', to: '/methode' }],
  },
  {
    tab: 'Les méthodes',
    critere: 'Mise en œuvre',
    titre: 'Mes stratégies et méthodes dans l’entretien',
    accroche:
      'Mon entretien suit 6 phases, du cadre à la clôture, avec à chaque étape une intention et des outils précis — et je l’étaie par ma grille d’auto-évaluation.',
    points: [
      { titre: '6 phases, une progression', detail: 'Accueil et mise en confiance → clarifier le besoin → explorer l’expérience → relier et donner du sens → plan d’action & engagement → clôture et élan. Chaque phase a un objectif, des points de vigilance et une banque de questions.' },
      { titre: 'Faire parler, faire émerger', detail: 'Questions ouvertes et neutres (le « geste écologique » de Brémond), reformulation plutôt qu’interprétation (Porter), ne pas donner la solution (Rogers). C’est mon principal axe de progrès.' },
      { titre: 'Distinguer demande et besoin', detail: 'La demande explicite (« réussir mon mémoire ») n’est pas toujours le besoin réel (se sentir légitime). Je reformule et je vérifie avant d’agir.' },
      { titre: 'Outiller l’engagement — ma force', detail: 'Micro-objectifs, critères de réussite, échéances et feedback (Bandura, sentiment d’efficacité). C’est là que mes métiers de chef de projet et d’enseignant servent vraiment.' },
    ],
    ancrages: ['Brémond', 'Porter', 'Rogers', 'Bandura', 'Le Boterf'],
    matrice: {
      attention: 'à adapter mes questions à chaque phase et à ne pas brûler les étapes (surtout le cadre).',
      autorise: 'à structurer fortement : jalons, critères, micro-objectifs, feedback — ma force pédagogique.',
      interdit: 'd’apporter mes propres analyses ou d’imposer mon plan à la place du sien.',
      pasEncore: 'à transformer systématiquement mes propositions en questions ouvertes, pour faire émerger au lieu d’induire.',
      pourquoi: 'En phase de structuration, mon envie d’efficacité me fait parfois glisser vers des questions orientées qui suggèrent ma propre lecture.',
    },
    preuves: [
      { label: 'Les 6 phases (Méthode)', to: '/methode' },
      { label: 'Mes dossiers (tableau de bord)', to: '/tableau-de-bord' },
    ],
  },
  {
    tab: 'Le rôle social',
    critere: 'Positionnement professionnel',
    titre: 'Le rôle social de ma fonction',
    accroche:
      'Socialement, ma fonction, c’est d’aider des professionnels en devenir à transformer leur expérience en savoir reconnu et à se sentir légitimes — au moment charnière de la transition études → métier.',
    points: [
      { titre: 'Accompagner une transition', detail: 'Mes alternants sont à la croisée du monde académique et professionnel ; je les aide à faire de cette bascule un projet conscient, pas une simple formalité de diplôme.' },
      { titre: 'Rendre l’expérience visible comme savoir', detail: 'Beaucoup savent faire mais peinent à le dire et à le légitimer à l’écrit. Mon rôle : rendre nommable leur compétence — le savoir-agir / vouloir-agir / pouvoir-agir (Le Boterf).' },
      { titre: 'Restaurer légitimité et autonomie', detail: 'Nourrir les besoins d’autonomie, de compétence et d’appartenance (Deci & Ryan) ; viser qu’il reparte plus capable et plus libre, pas dépendant de moi.' },
      { titre: 'Un regard critique sur l’injonction à l’autonomie', detail: 'L’autonomie est une finalité, mais aussi une injonction sociale ; je situe le sens de ma fonction sans la naturaliser. À la croisée de mes deux métiers : enseignant en alternance et consultant.' },
    ],
    ancrages: ['Le Boterf', 'Deci & Ryan', 'Maela Paul'],
    matrice: {
      attention: 'au sens social de ce que je fais : pas « faire réussir un mémoire », mais accompagner une transition de vie professionnelle.',
      autorise: 'à mobiliser mes deux métiers (consultant + enseignant) comme ressource, et à expliciter / justifier mes choix.',
      interdit: 'de plaquer mon propre modèle de réussite sur l’alternant.',
      pasEncore: 'à rendre tous mes filtres conscients — mon modèle de réussite n’est pas forcément le sien.',
      pourquoi: 'Mon parcours (PMP, performance, résultat) colore ma lecture. Le travail continu — FAD108, FAD130, analyse de pratiques — m’aide à m’en décentrer.',
    },
    preuves: [{ label: 'Le sens du projet (Accueil)', to: '/' }],
  },
]

const MATRICE_CELLS: { key: keyof Matrice; cls: string; icon: string; label: string }[] = [
  { key: 'attention', cls: 'attention', icon: '🎯', label: 'J’y fais attention…' },
  { key: 'autorise', cls: 'autorise', icon: '✅', label: 'Je m’autorise…' },
  { key: 'interdit', cls: 'interdit', icon: '⛔', label: 'Je m’interdis…' },
  { key: 'pasEncore', cls: 'pasencore', icon: '🌱', label: 'Je n’y arrive pas encore…' },
]

const DEMO_PWD = 'BoussoleDemo2026'
const DEMO_ACCOUNTS: { role: string; nom: string; email: string }[] = [
  { role: 'Accompagnateur', nom: 'Mohamed', email: 'elafrit.mohamed@gmail.com' },
  { role: 'Accompagnateur', nom: 'Camille Laurent', email: 'camille.laurent@boussole.demo' },
  { role: 'Accompagné', nom: 'Amine Bensaïd', email: 'afrit_mohamed@yahoo.fr' },
  { role: 'Accompagné', nom: 'Léa Martin', email: 'lea.martin@boussole.demo' },
  { role: 'Accompagné', nom: 'Karim Benali', email: 'karim.benali@boussole.demo' },
  { role: 'Admin', nom: 'Mohamed', email: 'mohamed@elafrit.com' },
]

export default function Presentation() {
  const [q, setQ] = useState(0)
  const [openPoint, setOpenPoint] = useState<number | null>(null)
  const [showPourquoi, setShowPourquoi] = useState(false)
  const isDemo = q === QUESTIONS.length
  const item = QUESTIONS[q]

  function goto(i: number) {
    if (i < 0 || i > QUESTIONS.length) return
    setQ(i); setOpenPoint(null); setShowPourquoi(false)
  }

  return (
    <article className="page presentation">
      <p className="kicker">FAD130 · Support de l’oral</p>
      <h1 className="page-title">Présentation orale</h1>
      <p className="lead">
        5 à 7 minutes pour répondre à <strong>3 questions</strong>, avec un fil rouge :
        faire <strong>croître l’autonomie</strong> de la personne accompagnée. Clique pour dérouler chaque question.
      </p>

      <section className="ia-section">
        <p className="hint">Avance question par question (clique un onglet, ou « Précédent / Suivant »), puis ouvre « Démo » pour montrer l’appli en direct.</p>
        <div className="phase-tabs">
          {QUESTIONS.map((ph, i) => (
            <button key={i} className={`phase-tab ${i === q ? 'active' : ''} ${i < q ? 'done' : ''}`} onClick={() => goto(i)}>
              <span className="phase-tab-num">{i + 1}</span>
              <span className="phase-tab-titre">{ph.tab}</span>
            </button>
          ))}
          <button className={`phase-tab ${isDemo ? 'active' : ''}`} onClick={() => goto(QUESTIONS.length)}>
            <span className="phase-tab-num">🔑</span>
            <span className="phase-tab-titre">Démo</span>
          </button>
        </div>

        {!isDemo ? (
          <div className="phase-panel">
            <div className="phase-head"><span className="phase-num">{q + 1}</span><h3 style={{ margin: 0 }}>{item.titre}</h3></div>
            <p className="pres-critere">Critère : {item.critere}</p>
            <p className="pres-accroche">« {item.accroche} »</p>

            <h4>Points clés <span className="hint" style={{ fontWeight: 400 }}>(clique pour le détail)</span></h4>
            <div className="principe-grid">
              {item.points.map((pt, i) => (
                <button key={i} className={`principe-card ${openPoint === i ? 'open' : ''}`} onClick={() => setOpenPoint(openPoint === i ? null : i)}>
                  <span className="principe-head"><span className="principe-num">{i + 1}</span>{pt.titre}</span>
                  {openPoint === i && <span className="principe-detail">{pt.detail}</span>}
                </button>
              ))}
            </div>

            <h4>Ma matrice de positionnement</h4>
            <div className="matrice">
              {MATRICE_CELLS.map((c) => (
                <div key={c.key} className={`matrice-cell ${c.cls}`}>
                  <span className="mc-label">{c.icon} {c.label}</span>
                  <span className="mc-text">{item.matrice[c.key]}</span>
                </div>
              ))}
            </div>
            <button className="btn btn-ghost btn-sm pres-pourquoi-btn" onClick={() => setShowPourquoi((v) => !v)}>
              {showPourquoi ? '▾ Masquer le « pourquoi »' : '💡 Pourquoi ?'}
            </button>
            {showPourquoi && <p className="pres-pourquoi"><strong>Pourquoi :</strong> {item.matrice.pourquoi}</p>}

            <div className="pres-meta">
              <div className="pres-ancrages"><span className="pres-meta-lbl">Ancrages :</span>
                {item.ancrages.map((a, i) => <span key={i} className="pres-chip">{a}</span>)}
              </div>
              <div className="pres-preuves"><span className="pres-meta-lbl">Preuves :</span>
                {item.preuves.map((p, i) => <Link key={i} className="pres-chip pres-chip-link" to={p.to}>{p.label} →</Link>)}
              </div>
            </div>

            <div className="phase-panel-nav">
              <button className="btn btn-ghost" disabled={q === 0} onClick={() => goto(q - 1)}>← Précédent</button>
              <span className="phase-counter">{q + 1} / {QUESTIONS.length}</span>
              <button className="btn btn-primary" onClick={() => goto(q + 1)}>{q === QUESTIONS.length - 1 ? 'Voir la démo →' : 'Suivant →'}</button>
            </div>
          </div>
        ) : (
          <div className="phase-panel">
            <div className="phase-head"><span className="phase-num">🔑</span><h3 style={{ margin: 0 }}>Comptes de démonstration</h3></div>
            <p>Connecte-toi avec un de ces comptes <strong>préchargés</strong> pour montrer l’application en direct. Le jeu de données (dossiers, entretiens, comptes rendus, synthèses) est <strong>réinitialisé à chaque redémarrage</strong>.</p>
            <p className="demo-pwd">Mot de passe commun : <strong>{DEMO_PWD}</strong></p>
            <table className="demo-table">
              <thead><tr><th>Rôle</th><th>Nom</th><th>Identifiant (email)</th></tr></thead>
              <tbody>
                {DEMO_ACCOUNTS.map((a, i) => (
                  <tr key={i}>
                    <td><span className="demo-role">{a.role}</span></td>
                    <td>{a.nom}</td>
                    <td className="demo-email">{a.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="hint">Côté <strong>accompagnateur</strong> (Mohamed, Camille) : dossiers, entretiens, comptes rendus, grille d’auto-évaluation. Côté <strong>accompagné</strong> (Amine, Léa, Karim) : parcours, rendez-vous, synthèse.</p>
            <div className="phase-panel-nav">
              <button className="btn btn-ghost" onClick={() => goto(QUESTIONS.length - 1)}>← Retour aux questions</button>
              <Link className="btn btn-primary" to="/connexion">Se connecter →</Link>
            </div>
          </div>
        )}
      </section>
    </article>
  )
}
