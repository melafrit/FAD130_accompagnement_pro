import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

// Guide de prise en main, public (aucune connexion requise).
// Deux parcours au choix (accompagnateur / accompagné), chacun déroulé étape par étape
// avec la capture de l'écran concerné. Réutilise les composants visuels existants :
// onglets .sup-tabs (Supervision), étapes .phase-tabs/.phase-panel (Méthode), barre .bartrack.

interface Etape {
  titre: string
  objectif: string
  capture: string
  alt: string
  points: string[]
}

interface Parcours {
  id: 'accompagnateur' | 'accompagne'
  label: string
  intro: string
  etapes: Etape[]
}

const PARCOURS: Parcours[] = [
  {
    id: 'accompagnateur',
    label: '🧭 Je suis accompagnateur',
    intro: 'Tu mènes les entretiens, tu rédiges les comptes rendus et tu suis la progression de chaque personne accompagnée.',
    etapes: [
      {
        titre: 'Ton espace',
        objectif: 'Le point de départ après la connexion : tout part d’ici.',
        capture: '/captures/acc-1-espace.png',
        alt: 'Espace de l’accompagnateur : trois cartes d’accès rapide vers le tableau de bord, les disponibilités et la conduite d’un entretien.',
        points: [
          'Trois raccourcis : ton tableau de bord, tes disponibilités, mener un entretien.',
          'La liste de tes personnes accompagnées, avec l’état de chaque parcours.',
        ],
      },
      {
        titre: 'Tes disponibilités',
        objectif: 'Ouvrir des créneaux pour que l’accompagné réserve lui-même son rendez-vous.',
        capture: '/captures/acc-2-creneaux.png',
        alt: 'Écran « Mes disponibilités » : formulaire d’ajout de créneau et liste des créneaux proposés, certains déjà réservés.',
        points: [
          'Tu ajoutes un créneau (date, heure, durée) en quelques secondes.',
          'Un créneau réservé affiche le nom de la personne : plus d’échanges de mails pour convenir d’une date.',
        ],
      },
      {
        titre: 'L’entretien guidé',
        objectif: 'Le cœur de Boussole : un entretien en six phases, de l’alliance jusqu’à la clôture.',
        capture: '/captures/acc-3-entretien.png',
        alt: 'Écran d’entretien guidé affichant la phase en cours, des suggestions de questions ouvertes et la zone de prise de notes.',
        points: [
          'À chaque phase, des questions ouvertes proposées et des points de vigilance sur ta posture.',
          'Tu prends tes notes au clavier ou à la voix ; l’IA t’aide à reformuler et à approfondir.',
          'Tu avances à ton rythme : rien ne t’oblige à suivre l’ordre proposé.',
        ],
      },
      {
        titre: 'Le dossier',
        objectif: 'La mémoire du parcours : tout l’historique d’une personne accompagnée au même endroit.',
        capture: '/captures/acc-4-dossier.png',
        alt: 'Dossier d’un accompagné : jauge de progression vers l’autonomie, questionnaire initial et liste des entretiens menés.',
        points: [
          'La jauge situe la progression du parcours, phase par phase.',
          'Chaque entretien donne accès à son compte rendu, à tes notes privées et au débriefing.',
          'Tu publies le compte rendu quand tu le juges prêt : il apparaît alors chez l’accompagné.',
        ],
      },
      {
        titre: 'Le plan d’action',
        objectif: 'Traduire l’entretien en engagements concrets, tenus par l’accompagné.',
        capture: '/captures/acc-5-plan-action.png',
        alt: 'Écran du plan d’action : liste d’actions avec priorité, échéance et statut à faire, en cours ou terminé.',
        points: [
          'Chaque action porte une priorité, une échéance et un statut.',
          'L’accompagné les retrouve dans son espace et met lui-même à jour leur avancement.',
        ],
      },
      {
        titre: 'Ton auto-évaluation',
        objectif: 'Prendre du recul sur ta propre posture, dossier par dossier.',
        capture: '/captures/acc-6-auto-evaluation.png',
        alt: 'Grille d’auto-évaluation de la posture : jauge de score global, radar par critère et curseurs de notation par indicateur.',
        points: [
          'Vingt indicateurs répartis sur les trois critères de la grille FAD130 (barème 7 / 7 / 6).',
          'L’IA peut pré-remplir une proposition à partir du dossier : elle suggère, tu décides.',
          'Cet espace reste strictement privé : toi seul y as accès.',
        ],
      },
      {
        titre: 'Ton tableau de bord',
        objectif: 'Voir d’un coup d’œil qui avance, qui attend, et qui décroche.',
        capture: '/captures/acc-7-tableau-de-bord.png',
        alt: 'Tableau de bord de l’accompagnateur : indicateurs d’activité et cartes des personnes accompagnées avec voyants de progression.',
        points: [
          'Un voyant par personne accompagnée signale les parcours à relancer.',
          'Les indicateurs résument ton activité : entretiens menés, comptes rendus publiés, actions en cours.',
        ],
      },
    ],
  },
  {
    id: 'accompagne',
    label: '🎓 Je suis accompagné',
    intro: 'Tu prépares tes rendez-vous, tu suis tes comptes rendus et tu avances sur ton plan d’action.',
    etapes: [
      {
        titre: 'Ton espace',
        objectif: 'Retrouver tous tes parcours d’accompagnement au même endroit.',
        capture: '/captures/acp-1-espace.png',
        alt: 'Espace de la personne accompagnée : cartes de ses parcours avec l’accompagnateur associé et l’état d’avancement.',
        points: [
          'Une carte par parcours, avec le nom de ton accompagnateur.',
          'Tu peux démarrer un nouveau parcours à tout moment.',
        ],
      },
      {
        titre: 'Le questionnaire initial',
        objectif: 'Préparer ton premier rendez-vous pour ne pas partir d’une page blanche.',
        capture: '/captures/acp-2-questionnaire.png',
        alt: 'Questionnaire initial : questions guidées sur le contexte, l’objectif et les difficultés rencontrées.',
        points: [
          'Quelques questions pour cadrer ton besoin, ton objectif et tes difficultés.',
          'Tes réponses arrivent chez ton accompagnateur avant l’entretien : vous gagnez du temps.',
        ],
      },
      {
        titre: 'Le rendez-vous',
        objectif: 'Choisir toi-même un créneau parmi ceux ouverts par ton accompagnateur.',
        capture: '/captures/acp-3-rendez-vous.png',
        alt: 'Écran de prise de rendez-vous : liste des créneaux disponibles et rappel des rendez-vous déjà réservés.',
        points: [
          'Tu réserves en un clic, sans échange de mails.',
          'Tes rendez-vous à venir restent affichés en haut de l’écran.',
        ],
      },
      {
        titre: 'Ton parcours',
        objectif: 'Suivre ta progression et savoir où tu en es.',
        capture: '/captures/acp-4-parcours.png',
        alt: 'Détail d’un parcours : jauge de progression vers l’autonomie et encadré « Où j’en suis » résumant les prochaines étapes.',
        points: [
          'La jauge montre le chemin parcouru vers l’autonomie.',
          'L’encadré « Où j’en suis » résume ta situation et tes prochaines étapes.',
        ],
      },
      {
        titre: 'Tes comptes rendus',
        objectif: 'Relire ce qui s’est dit, à froid, après chaque entretien.',
        capture: '/captures/acp-5-comptes-rendus.png',
        alt: 'Liste des comptes rendus publiés par l’accompagnateur, classés par date d’entretien.',
        points: [
          'Chaque compte rendu est daté et rattaché à son entretien.',
          'Tu y accèdes dès que ton accompagnateur l’a publié.',
        ],
      },
      {
        titre: 'Ton plan d’action',
        objectif: 'Passer des intentions aux actes, entre deux rendez-vous.',
        capture: '/captures/acp-6-plan-action.png',
        alt: 'Plan d’action de la personne accompagnée : actions à réaliser avec leur échéance et bouton de changement de statut.',
        points: [
          'Tu vois ce que tu t’es engagé à faire, et pour quand.',
          'Tu mets à jour l’avancement toi-même : ton accompagnateur le voit de son côté.',
        ],
      },
    ],
  },
]

export default function Guide() {
  const { user } = useAuth()
  const [ongletIdx, setOngletIdx] = useState(0)
  const [etapeIdx, setEtapeIdx] = useState(0)
  const ongletsRef = useRef<(HTMLButtonElement | null)[]>([])
  const panneauRef = useRef<HTMLDivElement>(null)
  const premierRendu = useRef(true)

  const parcours = PARCOURS[ongletIdx]
  const etapes = parcours.etapes
  const etape = etapes[etapeIdx]
  const total = etapes.length

  // Précharge les captures du parcours affiché : le passage d'une étape à l'autre reste instantané.
  useEffect(() => {
    etapes.forEach((e) => { const img = new Image(); img.src = e.capture })
  }, [etapes])

  // À chaque changement d'étape, on déplace le focus sur le panneau (sinon l'utilisateur
  // au clavier reste sur « Suivant » sans savoir ce qui a changé). Pas au premier rendu.
  useEffect(() => {
    if (premierRendu.current) { premierRendu.current = false; return }
    panneauRef.current?.focus()
  }, [etapeIdx, ongletIdx])

  function choisirOnglet(i: number) {
    setOngletIdx(i)
    setEtapeIdx(0)
  }

  // Navigation clavier des onglets (motif WAI-ARIA : flèches + Origine/Fin).
  function onCleOnglet(e: React.KeyboardEvent<HTMLButtonElement>, i: number) {
    const dernier = PARCOURS.length - 1
    let cible: number | null = null
    if (e.key === 'ArrowRight') cible = i === dernier ? 0 : i + 1
    else if (e.key === 'ArrowLeft') cible = i === 0 ? dernier : i - 1
    else if (e.key === 'Home') cible = 0
    else if (e.key === 'End') cible = dernier
    if (cible === null) return
    e.preventDefault()
    choisirOnglet(cible)
    ongletsRef.current[cible]?.focus()
  }

  return (
    <article className="page guide">
      <p className="kicker">FAD130 · Prise en main</p>
      <h1 className="page-title">Guide d’utilisation de Boussole</h1>
      <p className="lead">
        Choisis ton rôle, puis laisse-toi guider écran par écran. Compte <strong>moins de cinq minutes</strong> pour
        faire le tour de l’application — <strong>aucune connexion n’est nécessaire</strong> pour lire ce guide.
      </p>

      <section aria-labelledby="guide-parcours-titre">
        <h2 id="guide-parcours-titre">Quel est ton rôle&nbsp;?</h2>

        <div className="sup-tabs guide-roles" role="tablist" aria-label="Choix du rôle">
          {PARCOURS.map((p, i) => (
            <button
              key={p.id}
              ref={(el) => { ongletsRef.current[i] = el }}
              role="tab"
              id={`guide-tab-${p.id}`}
              aria-selected={i === ongletIdx}
              aria-controls={`guide-panel-${p.id}`}
              tabIndex={i === ongletIdx ? 0 : -1}
              className={`sup-tab ${i === ongletIdx ? 'active' : ''}`}
              onClick={() => choisirOnglet(i)}
              onKeyDown={(e) => onCleOnglet(e, i)}
            >{p.label}</button>
          ))}
        </div>

        <div
          role="tabpanel"
          id={`guide-panel-${parcours.id}`}
          aria-labelledby={`guide-tab-${parcours.id}`}
          tabIndex={0}
          className="guide-panel"
        >
          <p className="guide-intro">{parcours.intro}</p>

          {/* Sélecteur d'étape : chaque étape reste atteignable directement. */}
          <div className="phase-tabs">
            {etapes.map((e, i) => (
              <button
                key={e.titre}
                className={`phase-tab ${i === etapeIdx ? 'active' : ''} ${i < etapeIdx ? 'done' : ''}`}
                onClick={() => setEtapeIdx(i)}
                aria-current={i === etapeIdx ? 'step' : undefined}
              >
                <span className="phase-tab-num">{i + 1}</span>
                <span className="phase-tab-titre">{e.titre}</span>
              </button>
            ))}
          </div>

          {/* Progression : barre visuelle + compteur textuel (la couleur n'est jamais seule porteuse d'information). */}
          <div
            className="bartrack guide-bar"
            role="progressbar"
            aria-label="Progression dans le guide"
            aria-valuemin={1}
            aria-valuemax={total}
            aria-valuenow={etapeIdx + 1}
            aria-valuetext={`Étape ${etapeIdx + 1} sur ${total} : ${etape.titre}`}
          >
            <div className="barfill guide-barfill" style={{ width: `${((etapeIdx + 1) / total) * 100}%` }} />
          </div>

          <div className="phase-panel guide-etape" ref={panneauRef} tabIndex={-1} aria-live="polite">
            <div className="phase-head">
              <span className="phase-num">{etapeIdx + 1}</span>
              <div>
                <h3 style={{ margin: 0 }}>{etape.titre}</h3>
              </div>
            </div>
            <p className="phase-obj">{etape.objectif}</p>

            <figure className="guide-figure">
              <img
                className="guide-shot"
                src={etape.capture}
                alt={etape.alt}
                width={1440}
                height={900}
                loading="lazy"
                decoding="async"
              />
              <figcaption className="guide-legende">
                Écran «&nbsp;{etape.titre}&nbsp;» — {parcours.id === 'accompagnateur' ? 'vue accompagnateur' : 'vue accompagnée'}.
              </figcaption>
            </figure>

            <ul className="list guide-points">
              {etape.points.map((pt) => <li key={pt}>{pt}</li>)}
            </ul>

            <div className="phase-panel-nav">
              <button
                className="btn btn-ghost"
                disabled={etapeIdx === 0}
                onClick={() => setEtapeIdx(etapeIdx - 1)}
              >← Précédent</button>
              <span className="phase-counter">{etapeIdx + 1} / {total}</span>
              <button
                className="btn btn-primary"
                disabled={etapeIdx === total - 1}
                onClick={() => setEtapeIdx(etapeIdx + 1)}
              >Suivant →</button>
            </div>
          </div>
        </div>
      </section>

      {/* Passage à la pratique */}
      <section className="ia-section guide-fin" aria-labelledby="guide-fin-titre">
        <h2 id="guide-fin-titre">Prêt à essayer&nbsp;?</h2>
        <p>
          Ce guide décrit les écrans ; la <strong>visite guidée</strong> intégrée, elle, te prend par la main
          directement dans l’application, écran par écran.
        </p>
        <div className="guide-actions">
          {user
            ? <Link className="btn btn-primary" to="/espace">Ouvrir mon espace</Link>
            : <Link className="btn btn-primary" to="/connexion">Se connecter</Link>}
          <Link className="btn btn-ghost" to="/methode">Comprendre la méthode</Link>
          {user && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => window.dispatchEvent(new CustomEvent('boussole:tour'))}
            >🧭 Lancer la visite guidée</button>
          )}
        </div>
        <p className="hint">
          Depuis n’importe quel écran de l’application, le menu du compte propose «&nbsp;🧭 Visite guidée&nbsp;»
          pour revoir les explications de l’écran affiché.
        </p>
      </section>
    </article>
  )
}
