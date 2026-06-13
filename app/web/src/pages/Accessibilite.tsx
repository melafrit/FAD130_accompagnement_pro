// Déclaration d'accessibilité — exigée par le RGAA (Référentiel général d'amélioration de l'accessibilité).
export default function Accessibilite() {
  return (
    <article className="page legal">
      <h1>Déclaration d’accessibilité</h1>
      <p className="legal-note">Établie le 13 juin 2026 · RGAA version 4.1 · auto-évaluation</p>

      <p>
        <strong>Boussole</strong> (UE FAD130, Cnam) s’engage à rendre son application accessible, conformément à
        l’article 47 de la loi n° 2005-102 du 11 février 2005. Cette déclaration s’applique au site
        <strong> boussole.elafrit.com</strong>.
      </p>

      <h2>État de conformité</h2>
      <p>
        Boussole est <strong>partiellement conforme</strong> au RGAA 4.1 : les critères essentiels sont respectés,
        certains points restent à finaliser (voir ci-dessous). Le taux de conformité est issu d’une
        <strong> auto-évaluation</strong> (et non d’un audit par un tiers).
      </p>

      <h2>Résultats de l’auto-évaluation</h2>
      <ul className="list">
        <li><strong>Couleurs &amp; contrastes</strong> : palette à contraste conforme (AA) en clair et en sombre ; l’information n’est jamais portée par la seule couleur.</li>
        <li><strong>Navigation au clavier</strong> : tous les éléments interactifs sont atteignables et activables au clavier ; un <strong>lien d’évitement</strong> mène au contenu principal ; le focus est visible.</li>
        <li><strong>Structure</strong> : titres hiérarchisés, langue de la page déclarée (<code>lang=&quot;fr&quot;</code>), repères ARIA (header, nav, main, footer).</li>
        <li><strong>Formulaires</strong> : chaque champ a une étiquette ou un <code>aria-label</code> ; les boutons-icônes ont un intitulé accessible.</li>
        <li><strong>Médias</strong> : aucune image porteuse d’information sans alternative ; les graphiques (boussole, jauges) ont une description via <code>role=&quot;img&quot;</code> et un libellé.</li>
        <li><strong>Mouvement</strong> : les animations respectent la préférence système « réduire les animations » (<code>prefers-reduced-motion</code>).</li>
      </ul>

      <h2>Contenus non accessibles</h2>
      <ul className="list">
        <li>L’éditeur de texte riche (comptes rendus, synthèses) n’a pas encore fait l’objet d’une revue d’accessibilité complète.</li>
        <li>La dictée vocale dépend du navigateur et n’est pas disponible partout ; une saisie clavier équivalente est toujours proposée.</li>
        <li>Certaines tables/listes denses pourraient bénéficier d’améliorations de restitution par lecteur d’écran.</li>
      </ul>

      <h2>Technologies utilisées</h2>
      <p>HTML, CSS, JavaScript (React). Aucune technologie propriétaire requise côté utilisateur.</p>

      <h2>Voies de recours</h2>
      <p>
        Si vous constatez un défaut d’accessibilité vous empêchant d’accéder à un contenu, contactez-nous
        (<a href="mailto:contact@elafrit.com">contact@elafrit.com</a>). Si la réponse ne vous satisfait pas, vous pouvez
        saisir le Défenseur des droits (<a href="https://www.defenseurdesdroits.fr" target="_blank" rel="noopener noreferrer">defenseurdesdroits.fr</a>).
      </p>

      <h2>Retour d’information et contact</h2>
      <p>Auteur : <strong>Mohamed&nbsp;EL&nbsp;AFRIT</strong> — <a href="mailto:contact@elafrit.com">contact@elafrit.com</a>.</p>
    </article>
  )
}
