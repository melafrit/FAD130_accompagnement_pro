import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import fr from './locales/fr.json'
import en from './locales/en.json'

/**
 * Infrastructure i18n (react-i18next). Langue par défaut : français.
 * L'anglais est amorcé (jeu de chaînes de départ) ; les pages non encore traduites
 * retombent sur le français. La langue choisie est mémorisée dans localStorage.
 */
void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
    },
    fallbackLng: 'fr',
    supportedLngs: ['fr', 'en'],
    interpolation: { escapeValue: false },
    // Français par défaut (l'anglais n'est qu'amorcé) : on n'utilise QUE le choix explicite
    // mémorisé ; pas de détection navigateur, qui afficherait un EN partiel aux visiteurs non-FR.
    detection: {
      order: ['localStorage'],
      caches: ['localStorage'],
      lookupLocalStorage: 'boussole_lang',
    },
  })

export default i18n
