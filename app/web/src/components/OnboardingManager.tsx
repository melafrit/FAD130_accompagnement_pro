import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useFeature } from '../features/FeaturesContext'
import OnboardingTour, { type TourStep } from './OnboardingTour'
import { ROLE_TOURS, screenTourFor, type ScreenTour } from './tours'

// Désactive les PROPOSITIONS automatiques (1re visite) — utilisé par la batterie de tests.
const toursOff = () => { try { return localStorage.getItem('boussole_tours_off') === '1' } catch { return false } }
const seenKey = (k: string) => `boussole_tour_${k}`
const isSeen = (k: string) => { try { return localStorage.getItem(seenKey(k)) === '1' } catch { return false } }
const markSeen = (k: string) => { try { localStorage.setItem(seenKey(k), '1') } catch { /* ignore */ } }

/**
 * Orchestre les visites guidées :
 *  - visite GLOBALE par rôle à la première connexion (+ relance via le bouton flottant « ? ») ;
 *  - visite de l'ÉCRAN courant proposée à la première arrivée (Oui/Non), relançable via le lien
 *    « Visite guidée » du menu du compte (événement window « boussole:tour »).
 */
export default function OnboardingManager() {
  const { user } = useAuth()
  const actif = useFeature('onboarding')
  const { pathname } = useLocation()
  const [active, setActive] = useState<TourStep[] | null>(null) // visite en cours (rôle OU écran)
  const [prompt, setPrompt] = useState<ScreenTour | null>(null) // proposition de 1re visite

  const roleTour = useCallback(() => (user ? ROLE_TOURS[user.role] || ROLE_TOURS.accompagne : null), [user])

  // Visite globale par rôle à la première connexion.
  useEffect(() => {
    if (!user || !actif) return
    const key = `boussole_onboarding_${user.role}`
    try {
      if (!localStorage.getItem(key)) { setActive(ROLE_TOURS[user.role] || ROLE_TOURS.accompagne); localStorage.setItem(key, '1') }
    } catch { /* ignore */ }
  }, [user, actif])

  // Proposition de visite à la PREMIÈRE arrivée sur un écran couvert.
  useEffect(() => {
    if (!user || !actif || toursOff()) { setPrompt(null); return }
    const tour = screenTourFor(pathname)
    setPrompt(tour && !isSeen(tour.key) ? tour : null)
  }, [user, actif, pathname])

  // Lien « Visite guidée » du menu du compte : relance la visite de l'écran courant.
  const launchCurrent = useCallback(() => {
    const tour = screenTourFor(pathname)
    setPrompt(null)
    setActive(tour ? tour.steps : roleTour())
  }, [pathname, roleTour])

  useEffect(() => {
    const h = () => launchCurrent()
    window.addEventListener('boussole:tour', h)
    return () => window.removeEventListener('boussole:tour', h)
  }, [launchCurrent])

  if (!user || !actif) return null

  const accept = () => { if (prompt) { markSeen(prompt.key); setActive(prompt.steps); setPrompt(null) } }
  const decline = () => { if (prompt) markSeen(prompt.key); setPrompt(null) }

  return (
    <>
      <button className="onboarding-fab no-print" onClick={() => setActive(roleTour())} title="Lancer la visite guidée" aria-label="Lancer la visite guidée">?</button>
      {prompt && !active && (
        <div className="tour-prompt no-print" role="dialog" aria-label="Proposition de visite guidée">
          <p className="tour-prompt-txt">Première visite sur <strong>« {prompt.title} »</strong>. Voulez-vous une visite guidée de cet écran&nbsp;?</p>
          <div className="tour-prompt-actions">
            <button className="btn btn-ghost btn-sm" onClick={decline}>Non merci</button>
            <button className="btn btn-primary btn-sm" onClick={accept}>Oui, me guider</button>
          </div>
        </div>
      )}
      {active && <OnboardingTour steps={active} onClose={() => setActive(null)} />}
    </>
  )
}
