export default function Confidentialite() {
  return (
    <article className="legal">
      <h1>Politique de confidentialité</h1>
      <p><em>Dernière mise à jour : juin 2026.</em></p>

      <h2>1. Responsable du traitement</h2>
      <p>
        Le responsable du traitement est <strong>Mohamed El Afrit</strong> (application Boussole, UE FAD130 — Cnam).
        Délégué à la protection des données : <a href="mailto:dpo@elafrit.com">dpo@elafrit.com</a>.
      </p>

      <h2>2. Données collectées</h2>
      <ul className="list">
        <li><strong>Compte</strong> : nom, prénom, adresse email, rôle, mot de passe (haché).</li>
        <li><strong>Contenu d'accompagnement</strong> : réponses au questionnaire initial, notes d'entretien, comptes rendus, plan d'action, rendez-vous.</li>
        <li><strong>Consentement</strong> : date et version des conditions acceptées.</li>
        <li><strong>Journal technique</strong> : connexions (à des fins de sécurité).</li>
      </ul>
      <p><strong>Aucun enregistrement audio n'est conservé</strong> : la dictée vocale est transcrite en texte côté navigateur.</p>

      <h2>3. Finalités et base légale</h2>
      <p>
        Les données sont traitées pour fournir le service d'accompagnement (préparation, conduite et suivi
        des entretiens). La base légale est le <strong>consentement</strong> et l'<strong>exécution</strong> de
        la relation d'accompagnement.
      </p>

      <h2>4. Destinataires et sous-traitants</h2>
      <ul className="list">
        <li><strong>Anthropic</strong> (API Claude) : les contenus transmis servent uniquement à générer des suggestions et des comptes rendus.</li>
        <li><strong>Brevo</strong> : envoi des emails (activation, réinitialisation, notifications).</li>
        <li><strong>OVH</strong> : hébergement de l'application (Union européenne).</li>
      </ul>
      <p>Certains traitements (IA) peuvent impliquer un transfert hors UE, encadré par les garanties appropriées du sous-traitant.</p>

      <h2>5. Durée de conservation</h2>
      <p>
        Les données sont conservées le temps de l'accompagnement, puis pendant une durée limitée (par défaut
        1 à 3 ans), avant suppression ou anonymisation. Vous pouvez demander la suppression à tout moment.
      </p>

      <h2>6. Sécurité</h2>
      <p>
        Chiffrement des échanges (HTTPS), mots de passe hachés, cloisonnement strict des accès (un accompagné
        ne voit que ses propres données), sauvegardes régulières.
      </p>

      <h2>7. Vos droits</h2>
      <p>
        Vous disposez des droits d'accès, de rectification, d'effacement, d'opposition, de limitation et de
        portabilité. Pour les exercer : <a href="mailto:dpo@elafrit.com">dpo@elafrit.com</a>. Vous pouvez
        également introduire une réclamation auprès de la CNIL.
      </p>

      <h2>8. Cookies</h2>
      <p>
        L'application utilise uniquement un <strong>cookie de session</strong> strictement nécessaire à
        l'authentification. Aucun cookie publicitaire ni de suivi n'est déposé.
      </p>
    </article>
  )
}
