# Scénario de démonstration — Boussole (A → Z)

**Objectif :** dérouler devant la prof un parcours d'accompagnement complet d'un étudiant pour son mémoire professionnel — du questionnaire initial à la clôture, en passant par plusieurs rendez-vous, entretiens et comptes rendus.

## Préparation
1. Récupère la dernière version et (re)lance proprement :
   ```bash
   git pull
   cd app
   docker compose -f docker-compose.local.yml down
   rm -rf data            # base neuve pour une démo propre
   docker compose -f docker-compose.local.yml up --build
   ```
2. Ouvre **deux fenêtres** de navigateur (dont une en **navigation privée**) sur http://localhost:8080 :
   - **Fenêtre A — toi (accompagnateur)** : `elafrit.mohamed@gmail.com` / `BoussoleDemo2026`
   - **Fenêtre B — l'étudiant (accompagné)** : `demo.accompagne@elafrit.com` / `BoussoleDemo2026`
3. *(Optionnel)* Mets ta **clé Anthropic** dans `app/.env` pour des suggestions IA réelles (sinon le parcours de secours s'affiche).

---

## Acte 1 — L'accompagnateur ouvre ses disponibilités *(Fenêtre A)*
- **Mon espace → Mes disponibilités → Gérer mes créneaux**
- Ajoute 2 ou 3 créneaux (ex. demain 14:00, après-demain 10:00). → *« Voici comment je propose mes rendez-vous. »*

## Acte 2 — L'étudiant prépare son 1ᵉʳ rendez-vous *(Fenêtre B)*
- **Mon espace → Préparer mon 1ᵉʳ rendez-vous → Commencer le questionnaire**
- Réponds aux questions (contexte du stage, sujet du mémoire, problématique, difficultés, besoins). Montre les **propositions cliquables** et la **dictée** possible. → *« L'IA cadre le besoin avant même de me voir. »*
- **Valide** → un récapitulatif est créé. Puis **Prendre rendez-vous → réserve un créneau**.
- → *Côté A, une notification 🔔 apparaît : « questionnaire complété » + « nouveau rendez-vous ».*

## Acte 3 — Premier entretien *(Fenêtre A)*
- **Mon espace → Tableau de bord** : le dossier de l'étudiant apparaît (questionnaire ✓, 1 RDV). Mets-lui un **tag** (ex. `mémoire`).
- **Ouvrir le dossier** → la **timeline** : questionnaire (récapitulatif téléchargeable), le RDV.
- **Nouvel entretien** → déroule les **phases 0 → 2** : montre l'objectif, les points de vigilance, la **banque de questions**, la **dictée micro** et **✨ Suggestions de l'IA** (reformulation + questions).
- En bas : **« 💾 Reprendre plus tard »** *(pour montrer la reprise)* **ou** **« ✓ Clôturer & générer le CR »**.
  - Choisis **Clôturer & générer le CR** → **Générer le compte rendu** → **Télécharge le .docx**. → *« Compte rendu intermédiaire, déjà publié à l'étudiant. »*
- *(Montre aussi le ré-import : ouvre le Word, modifie, ré-importe.)*

## Acte 4 — Côté étudiant *(Fenêtre B)*
- **Mon espace → Mes comptes rendus** : le CR est là, daté, téléchargeable.
- **Mon plan d'action** : l'étudiant voit ses prochaines étapes et peut en cocher une comme **« Fait »**.

## Acte 5 — Deuxième rendez-vous / deuxième entretien
- *(Fenêtre B)* l'étudiant réserve un **2ᵉ créneau**.
- *(Fenêtre A)* **Dossier → Nouvel entretien** : un **2ᵉ entretien** démarre (la timeline montre maintenant *Entretien #1* et *Entretien #2*). Déroule quelques phases, **clôture & génère un 2ᵉ compte rendu**.
- → *« On voit la progression dans le temps : plusieurs entretiens, plusieurs comptes rendus, un plan d'action qui s'enrichit. »*

## Acte 6 — Clôture de la démarche *(Fenêtre A)*
- **Dossier → Clôture de la démarche** : écris une **synthèse finale** (« mémoire abouti, problématique clarifiée… ») → **Clôturer la démarche**.
- Le dossier passe en **« Clôturé »**. → *Côté B, l'étudiant reçoit une notification de clôture.*

## Bonus — Montrer la méthode à la prof
- **Onglet Méthode** : l'**arbre de décision** (8 principes + 6 phases avec objectifs, points de vigilance, attitudes de Porter, garde-fous de l'IA).
- **Onglet Aide** : la **transparence** (rôle de l'IA, RGPD) et la **synthèse du cahier des charges**.

---

### Fil narratif à tenir devant la prof
> *« Boussole illustre ma posture : l'outil et l'IA ne décident pas à la place — ils m'aident à **poser les bonnes questions**, à **faire émerger** plutôt qu'à donner la solution, et à **garder une trace** structurée du parcours (questionnaire → entretiens → comptes rendus → plan d'action → clôture). »*
