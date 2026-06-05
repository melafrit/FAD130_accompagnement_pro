import { Routes, Route, Link, NavLink, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import VerifyEmail from './pages/VerifyEmail'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import MentionsLegales from './pages/MentionsLegales'
import Methode from './pages/Methode'
import Aide from './pages/Aide'
import Espace from './pages/Espace'
import Questionnaire from './pages/Questionnaire'
import Creneaux from './pages/Creneaux'
import RendezVous from './pages/RendezVous'
import Protected from './components/Protected'

function Header() {
  const { user, logout } = useAuth()
  const nav = useNavigate()
  async function onLogout() {
    await logout()
    nav('/')
  }
  return (
    <header className="header">
      <Link to="/" className="brand" aria-label="Boussole — accueil">
        <span className="brand-mark" aria-hidden="true">✶</span>
        <span>Boussole</span>
      </Link>
      <nav className="nav" aria-label="Navigation principale">
        <NavLink to="/" end>Accueil</NavLink>
        <NavLink to="/methode">Méthode</NavLink>
        <NavLink to="/aide">Aide</NavLink>
        {user ? (
          <>
            <NavLink to="/espace">Mon espace</NavLink>
            <span className="nav-user">{user.email}</span>
            <button className="btn btn-ghost" onClick={onLogout}>Déconnexion</button>
          </>
        ) : (
          <Link className="btn btn-ghost" to="/connexion">Connexion</Link>
        )}
      </nav>
    </header>
  )
}

function Footer() {
  return (
    <footer className="footer">
      <nav className="footer-links" aria-label="Liens légaux">
        <Link to="/mentions-legales">Mentions légales</Link>
        <span aria-hidden="true">·</span>
        <a href="mailto:dpo@elafrit.com">dpo@elafrit.com</a>
      </nav>
      <p>
        <strong>Boussole</strong> — application développée dans le cadre de l'UE <strong>FAD130</strong> (Cnam).<br />
        Auteur : <strong>Mohamed&nbsp;EL&nbsp;AFRIT</strong> —{' '}
        <a href="https://www.mohamedelafrit.com" target="_blank" rel="noopener noreferrer">www.mohamedelafrit.com</a>{' '}
        · © 2026
      </p>
    </footer>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <div className="app">
        <Header />
        <main className="main" id="main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/connexion" element={<Login />} />
            <Route path="/inscription" element={<Register />} />
            <Route path="/verifier-email" element={<VerifyEmail />} />
            <Route path="/mot-de-passe-oublie" element={<ForgotPassword />} />
            <Route path="/reinitialiser" element={<ResetPassword />} />
            <Route path="/mentions-legales" element={<MentionsLegales />} />
            <Route path="/methode" element={<Methode />} />
            <Route path="/aide" element={<Aide />} />
            <Route path="/espace" element={<Protected><Espace /></Protected>} />
            <Route path="/questionnaire" element={<Protected role="accompagne"><Questionnaire /></Protected>} />
            <Route path="/mes-creneaux" element={<Protected role="accompagnateur"><Creneaux /></Protected>} />
            <Route path="/rendez-vous" element={<Protected role="accompagne"><RendezVous /></Protected>} />
          </Routes>
        </main>
        <Footer />
      </div>
    </AuthProvider>
  )
}
