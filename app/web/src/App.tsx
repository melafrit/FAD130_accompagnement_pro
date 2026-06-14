import { Routes, Route, Link, NavLink } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { FeaturesProvider, useFeature } from './features/FeaturesContext'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import VerifyEmail from './pages/VerifyEmail'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import MentionsLegales from './pages/MentionsLegales'
import CGU from './pages/CGU'
import Confidentialite from './pages/Confidentialite'
import Methode from './pages/Methode'
import Presentation from './pages/Presentation'
import Accessibilite from './pages/Accessibilite'
import Espace from './pages/Espace'
import NouveauParcours from './pages/NouveauParcours'
import ParcoursDetail from './pages/ParcoursDetail'
import Questionnaire from './pages/Questionnaire'
import Creneaux from './pages/Creneaux'
import RendezVous from './pages/RendezVous'
import Entretien from './pages/Entretien'
import ComptesRendus from './pages/ComptesRendus'
import Dashboard from './pages/Dashboard'
import BilanPratique from './pages/BilanPratique'
import Mutualisation from './pages/Mutualisation'
import RessourcePublique from './pages/RessourcePublique'
import Dossier from './pages/Dossier'
import AutoEvaluation from './pages/AutoEvaluation'
import PlanAction from './pages/PlanAction'
import MonPlanAction from './pages/MonPlanAction'
import Admin from './pages/Admin'
import WikiLayout from './pages/wiki/WikiLayout'
import WikiHome from './pages/wiki/WikiHome'
import WikiPage from './pages/wiki/WikiPage'
import Profil from './pages/Profil'
import NotificationsBell from './components/NotificationsBell'
import AuthMenu from './components/AuthMenu'
import ThemeToggle from './components/ThemeToggle'
import FalcToggle from './components/FalcToggle'
import OnboardingManager from './components/OnboardingManager'
import LanguageSwitcher from './components/LanguageSwitcher'
import Protected from './components/Protected'
import { useTranslation } from 'react-i18next'

function Header() {
  const { user } = useAuth()
  const darkMode = useFeature('dark_mode')
  const { t } = useTranslation()
  return (
    <header className="header">
      <Link to="/" className="brand" aria-label="Boussole — accueil">
        <span className="brand-mark" aria-hidden="true">✶</span>
        <span>Boussole</span>
      </Link>
      <nav className="nav" aria-label="Navigation principale">
        <NavLink to="/" end>{t('nav.home')}</NavLink>
        <NavLink to="/methode">{t('nav.method')}</NavLink>
        <NavLink to="/presentation">{t('nav.presentation')}</NavLink>
        {user && <NavLink to="/espace" data-tour="espace">{t('nav.space')}</NavLink>}
        <FalcToggle />
        {darkMode && <ThemeToggle />}
        <LanguageSwitcher />
        {user && <NotificationsBell />}
        <AuthMenu />
      </nav>
    </header>
  )
}

function Footer() {
  const { t } = useTranslation()
  return (
    <footer className="footer">
      <nav className="footer-links" aria-label="Liens légaux">
        <Link to="/mentions-legales">Mentions légales</Link>
        <span aria-hidden="true">·</span>
        <Link to="/cgu">CGU</Link>
        <span aria-hidden="true">·</span>
        <Link to="/confidentialite">Confidentialité</Link>
        <span aria-hidden="true">·</span>
        <Link to="/accessibilite">Accessibilité</Link>
      </nav>
      <p>
        <strong>Boussole</strong> — application développée dans le cadre de l'UE <strong>FAD130</strong> (Cnam).<br />
        Auteur : <strong>Mohamed&nbsp;EL&nbsp;AFRIT</strong> —{' '}
        <a href="https://www.mohamedelafrit.com" target="_blank" rel="noopener noreferrer">www.mohamedelafrit.com</a>{' '}
        · © 2026<br />
        <span className="footer-licence">
          Projet <strong>open source</strong> — code sous licence <strong>AGPL-3.0</strong>, documentation sous{' '}
          <strong>CC&nbsp;BY-NC-SA&nbsp;4.0</strong>. © 2026 Mohamed&nbsp;El&nbsp;Afrit, tous droits réservés. ·{' '}
          <a href="https://github.com/melafrit/FAD130_accompagnement_pro" target="_blank" rel="noopener noreferrer">
            {t('footer.source')} ↗
          </a>
        </span>
      </p>
    </footer>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <FeaturesProvider>
      <div className="app">
        <a className="skip-link" href="#main">Aller au contenu</a>
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
            <Route path="/cgu" element={<CGU />} />
            <Route path="/confidentialite" element={<Confidentialite />} />
            <Route path="/methode" element={<Methode />} />
            <Route path="/presentation" element={<Presentation />} />
            <Route path="/accessibilite" element={<Accessibilite />} />
            <Route path="/ressource/:token" element={<RessourcePublique />} />
            <Route path="/espace" element={<Protected><Espace /></Protected>} />
            <Route path="/profil" element={<Protected><Profil /></Protected>} />
            <Route path="/nouveau-parcours" element={<Protected role="accompagne"><NouveauParcours /></Protected>} />
            <Route path="/parcours/:id" element={<Protected role="accompagne"><ParcoursDetail /></Protected>} />
            <Route path="/questionnaire" element={<Protected role="accompagne"><Questionnaire /></Protected>} />
            <Route path="/mes-creneaux" element={<Protected role="accompagnateur"><Creneaux /></Protected>} />
            <Route path="/rendez-vous" element={<Protected role="accompagne"><RendezVous /></Protected>} />
            <Route path="/entretien" element={<Protected role="accompagnateur"><Entretien /></Protected>} />
            <Route path="/mes-comptes-rendus" element={<Protected role="accompagne"><ComptesRendus /></Protected>} />
            <Route path="/tableau-de-bord" element={<Protected role="accompagnateur"><Dashboard /></Protected>} />
            <Route path="/bilan-pratique" element={<Protected role="accompagnateur"><BilanPratique /></Protected>} />
            <Route path="/mutualisation" element={<Protected role="accompagnateur"><Mutualisation /></Protected>} />
            <Route path="/dossier/:id" element={<Protected role="accompagnateur"><Dossier /></Protected>} />
            <Route path="/dossier/:id/auto-evaluation" element={<Protected role="accompagnateur"><AutoEvaluation /></Protected>} />
            <Route path="/plan-action/:dossierId" element={<Protected role="accompagnateur"><PlanAction /></Protected>} />
            <Route path="/mon-plan-action" element={<Protected role="accompagne"><MonPlanAction /></Protected>} />
            <Route path="/admin" element={<Protected role="admin"><Admin /></Protected>} />
            {/* Wiki documentaire interne — ADMIN ONLY (la garde sur la coquille couvre l'index et les pages) */}
            <Route path="/admin/wiki" element={<Protected role="admin"><WikiLayout /></Protected>}>
              <Route index element={<WikiHome />} />
              <Route path=":slug" element={<WikiPage />} />
            </Route>
          </Routes>
        </main>
        <Footer />
        <OnboardingManager />
      </div>
      </FeaturesProvider>
    </AuthProvider>
  )
}
