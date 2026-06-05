import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function Espace() {
  const { user } = useAuth()
  if (!user) return null

  return (
    <div className="page">
      <p className="kicker">Mon espace</p>
      <h1 className="page-title">Bonjour {user.prenom || user.email}</h1>

      {user.role === 'accompagne' && (
        <div className="cards">
          <div className="card">
            <h3>Préparer mon 1ᵉʳ rendez-vous</h3>
            <p>Quelques questions pour cadrer ton besoin (stage, mémoire, problématique…), puis tu choisiras un créneau.</p>
            <Link className="btn btn-primary" to="/questionnaire">Commencer le questionnaire</Link>
          </div>
          <div className="card">
            <h3>Prendre rendez-vous</h3>
            <p>Choisis un créneau parmi les disponibilités de ton accompagnateur.</p>
            <Link className="btn btn-primary" to="/rendez-vous">Voir les créneaux</Link>
          </div>
          <div className="card">
            <h3>Mes comptes rendus</h3>
            <p>Tu retrouveras ici, datés, les comptes rendus de tes entretiens et ton plan d’action.</p>
            <span className="nav-soon">Bientôt</span>
          </div>
        </div>
      )}

      {user.role === 'accompagnateur' && (
        <div className="cards">
          <div className="card">
            <h3>Mes disponibilités</h3>
            <p>Définis les créneaux où tes accompagnés peuvent réserver un rendez-vous.</p>
            <Link className="btn btn-primary" to="/mes-creneaux">Gérer mes créneaux</Link>
          </div>
          <div className="card">
            <h3>Mener un entretien</h3>
            <p>Conduis un entretien guidé (6 phases) avec un accompagné, avec transcription et appui de l’IA.</p>
            <Link className="btn btn-primary" to="/entretien">Démarrer un entretien</Link>
          </div>
        </div>
      )}

      {user.role === 'admin' && (
        <div className="card">
          <h3>Administration</h3>
          <p>Gestion des comptes (accompagnateurs et accompagnés).</p>
          <span className="nav-soon">Bientôt</span>
        </div>
      )}
    </div>
  )
}
