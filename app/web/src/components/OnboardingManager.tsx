import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useFeature } from '../features/FeaturesContext'
import OnboardingTour from './OnboardingTour'

// Orchestre la visite guidée : lancement automatique à la première connexion + bouton flottant de relance.
export default function OnboardingManager() {
  const { user } = useAuth()
  const actif = useFeature('onboarding')
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!user || !actif) return
    const key = `boussole_onboarding_${user.role}`
    try {
      if (!localStorage.getItem(key)) { setShow(true); localStorage.setItem(key, '1') }
    } catch { /* ignore */ }
  }, [user, actif])

  if (!user || !actif) return null
  return (
    <>
      <button className="onboarding-fab no-print" onClick={() => setShow(true)} title="Lancer la visite guidée" aria-label="Lancer la visite guidée">?</button>
      {show && <OnboardingTour role={user.role} onClose={() => setShow(false)} />}
    </>
  )
}
