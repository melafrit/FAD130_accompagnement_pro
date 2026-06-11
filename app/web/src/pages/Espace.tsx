import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import MesParcours from '../components/MesParcours'

export default function Espace() {
  const { user } = useAuth()
  if (!user) return null

  return (
    <div className="page">
      <p className="kicker">Mon espace</p>
      <h1 className="page-title">Bonjour {user.prenom || user.email}</h1>

      {user.role === 'accompagne' && <MesParcours />}

      {user.role === 'accompagnateur' && (
        <div className="cards cards-actions">
          <div className="card">
            <h3>Tableau de bord</h3>
            <p>Vue d'ensemble de tes accompagnés : entretiens, comptes rendus et plans d'action.</p>
            <Link className="btn btn-primary" to="/tableau-de-bord">Ouvrir le tableau de bord</Link>
          </div>
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
          <p>Gestion des comptes : créer, activer/désactiver, changer de rôle, rattacher les accompagnés.</p>
          <Link className="btn btn-primary" to="/admin">Gérer les comptes</Link>
        </div>
      )}
    </div>
  )
}
