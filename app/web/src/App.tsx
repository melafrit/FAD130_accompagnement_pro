import { Routes, Route, Link, NavLink } from 'react-router-dom'
import Home from './pages/Home'

function Header() {
  return (
    <header className="header">
      <Link to="/" className="brand" aria-label="Boussole — accueil">
        <span className="brand-mark" aria-hidden="true">✶</span>
        <span>Boussole</span>
      </Link>
      <nav className="nav" aria-label="Navigation principale">
        <NavLink to="/" end>Accueil</NavLink>
        <a className="nav-soon" aria-disabled="true" title="Bientôt">Méthode</a>
        <a className="nav-soon" aria-disabled="true" title="Bientôt">Aide</a>
        <a className="btn btn-ghost nav-soon" aria-disabled="true" title="Bientôt">Connexion</a>
      </nav>
    </header>
  )
}

function Footer() {
  return (
    <footer className="footer">
      <p>
        <strong>Boussole</strong> — application développée dans le cadre de l'UE <strong>FAD130</strong> (Cnam).
        © Mohamed El Afrit. · <a href="mailto:dpo@elafrit.com">dpo@elafrit.com</a>
      </p>
    </footer>
  )
}

export default function App() {
  return (
    <div className="app">
      <Header />
      <main className="main" id="main">
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
