export default function Home() {
  return (
    <>
      <section className="hero">
        <p className="kicker">Cnam · FAD130 · Accompagnement des transitions</p>
        <h1>
          Garder le cap sur <span className="accent">l'autonomie de l'autre</span>.
        </h1>
        <p className="lead">
          Boussole est un <strong>compagnon d'entretien</strong> : il aide l'accompagnateur à poser
          les bonnes questions, à tenir une posture juste, et à produire un compte rendu utile —
          au service des personnes en <strong>transition professionnelle</strong>.
        </p>
      </section>

      <section className="cards">
        <article className="card">
          <h2>Le contexte</h2>
          <p>
            Boussole est développée dans le cadre de ma formation au <strong>Cnam</strong>, pour
            l'UE <strong>FAD130 — « Accompagner le parcours de formation et de transition
            professionnelle »</strong>. Elle illustre mon expérience d'accompagnement de mes
            <strong> étudiants de master</strong> dans leur passage du monde académique au monde
            professionnel (la production de leur mémoire professionnel de fin d'études).
          </p>
        </article>

        <article className="card">
          <h2>L'objectif</h2>
          <p>
            Aider l'accompagnateur à <strong>faire émerger</strong> plutôt qu'à donner la solution :
            des questions ouvertes adaptées, des points de vigilance pour la posture, l'appui de
            l'IA pour reformuler et approfondir. À l'issue de chaque entretien, Boussole aide à
            rédiger un <strong>compte rendu structuré</strong> avec un plan d'action.
          </p>
        </article>

        <article className="card">
          <h2>Pour qui&nbsp;?</h2>
          <ul className="list">
            <li><strong>Accompagnateurs</strong> — tuteurs, formateurs, mentors qui mènent des entretiens d'accompagnement.</li>
            <li><strong>Personnes accompagnées</strong> — étudiants, alternants en transition vers le monde professionnel.</li>
          </ul>
        </article>
      </section>

      <section className="steps">
        <h2 className="steps-title">Comment ça marche</h2>
        <ol className="steps-list">
          <li className="step">
            <span className="step-num">1</span>
            <div className="step-body">
              <h3>Questionnaire initial</h3>
              <p>L'accompagné cadre son besoin (stage, mémoire, problématique) et réserve un rendez-vous.</p>
            </div>
          </li>
          <li className="step">
            <span className="step-num">2</span>
            <div className="step-body">
              <h3>Entretien guidé</h3>
              <p>Un entretien en 6 étapes, avec transcription au micro et suggestions de l'IA.</p>
            </div>
          </li>
          <li className="step">
            <span className="step-num">3</span>
            <div className="step-body">
              <h3>Compte rendu &amp; plan d'action</h3>
              <p>Un compte rendu daté, déposé dans l'espace de l'accompagné.</p>
            </div>
          </li>
        </ol>
      </section>

      <section className="note" role="note">
        <p>
          🔒 Vos données sont traitées avec soin : <strong>texte uniquement</strong>, conservation
          limitée, pas d'enregistrement audio. En créant un compte, vous accepterez les CGU et la
          politique de confidentialité. Pour exercer vos droits&nbsp;:
          <a href="mailto:dpo@elafrit.com"> dpo@elafrit.com</a>.
        </p>
      </section>
    </>
  )
}
