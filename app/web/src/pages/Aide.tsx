import { Link } from 'react-router-dom'

const FLOW = [
  ['Inscription & consentement', 'L’utilisateur crée son compte, valide son email et accepte les CGU / la politique de confidentialité.'],
  ['Questionnaire initial', 'Avant le 1ᵉʳ rendez-vous, l’accompagné cadre son besoin (stage, mémoire, problématique, difficultés) — guidé par l’IA, question par question.'],
  ['Prise de rendez-vous', 'L’accompagné choisit un créneau parmi les disponibilités de l’accompagnateur ; confirmation par email.'],
  ['Entretien guidé', 'L’accompagnateur mène l’entretien en 6 phases ; la parole peut être transcrite au micro ; l’IA propose des questions et reformulations.'],
  ['Compte rendu', 'Un compte rendu structuré (avec plan d’action) est généré, modifiable, puis déposé — daté — dans l’espace de l’accompagné.'],
  ['Suivi', 'Le plan d’action est suivi (rappels, notifications) ; un tableau de bord et la recherche par étiquettes facilitent le pilotage.'],
]

export default function Aide() {
  return (
    <article className="page">
      <p className="kicker">Aide · Transparence</p>
      <h1 className="page-title">Comment fonctionne Boussole</h1>
      <p className="lead">
        Boussole est développée dans le cadre de l’UE <strong>FAD130</strong> (Cnam) pour illustrer ma
        pratique d’accompagnement. Cette page explique, en toute transparence, son fonctionnement, le
        rôle de l’IA, et la conformité RGPD.
      </p>

      <section>
        <h2>Le parcours, étape par étape</h2>
        <ol className="flow">
          {FLOW.map(([titre, desc], i) => (
            <li key={i}>
              <span className="flow-num">{i + 1}</span>
              <div><strong>{titre}</strong><p>{desc}</p></div>
            </li>
          ))}
        </ol>
      </section>

      <section className="ia-section">
        <h2>La transparence sur l’IA (Claude)</h2>
        <ul className="list">
          <li>L’IA <strong>assiste l’accompagnateur</strong> : elle suggère des questions et des reformulations, mais <strong>ne décide jamais à sa place</strong>.</li>
          <li>Elle <strong>ne s’adresse pas directement</strong> à la personne accompagnée pendant l’entretien.</li>
          <li>Elle est encadrée par des <strong>garde-fous de posture</strong> (les 8 principes — voir la <Link to="/methode">page Méthode</Link>).</li>
          <li>Les contenus d’entretien transmis à l’IA servent uniquement à produire les suggestions et le compte rendu.</li>
        </ul>
      </section>

      <section>
        <h2>Le cahier des charges (synthèse)</h2>
        <div className="cards">
          <div className="card">
            <h3>Rôles</h3>
            <ul className="list">
              <li><strong>Admin</strong> — gère les comptes.</li>
              <li><strong>Accompagnateur</strong> — voit tous ses accompagnés, mène les entretiens, pilote le plan d’action.</li>
              <li><strong>Accompagné</strong> — voit uniquement son historique et ses comptes rendus.</li>
            </ul>
          </div>
          <div className="card">
            <h3>Fonctions clés</h3>
            <ul className="list">
              <li>Questionnaire initial assisté par l’IA + prise de RDV.</li>
              <li>Entretien guidé (6 phases) + transcription + suggestions IA.</li>
              <li>Compte rendu DOCX (téléchargeable, modifiable, ré-importable).</li>
              <li>Tableau de bord, suivi du plan d’action, recherche par tags.</li>
            </ul>
          </div>
          <div className="card">
            <h3>Données & RGPD</h3>
            <ul className="list">
              <li><strong>Texte uniquement</strong>, pas d’enregistrement audio.</li>
              <li>Conservation <strong>limitée</strong> ; consentement obligatoire.</li>
              <li>Droits via <a href="mailto:dpo@elafrit.com">dpo@elafrit.com</a>.</li>
              <li>Sous-traitants : Anthropic (IA) et Brevo (emails).</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="ia-section">
        <h2>Pour l’évaluation FAD130</h2>
        <p>
          Cette application illustre ma <Link to="/methode">méthode d’accompagnement et ses
          6 phases</Link>. Les livrables de l’UE (grille d’auto-évaluation, support de l’oral, cahier
          des charges complet) accompagnent cette démonstration.
        </p>
      </section>
    </article>
  )
}
