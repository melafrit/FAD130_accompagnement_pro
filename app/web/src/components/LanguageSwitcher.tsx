import { useTranslation } from 'react-i18next'

/** Bascule FR ⇄ EN (infrastructure i18n). La langue est mémorisée dans localStorage. */
export default function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage || i18n.language || 'fr').slice(0, 2)
  const next = lang === 'en' ? 'fr' : 'en'
  return (
    <button
      className="lang-switch"
      onClick={() => void i18n.changeLanguage(next)}
      aria-label={lang === 'en' ? 'Switch language to French' : 'Changer la langue en anglais'}
      title="FR / EN"
    >
      {lang === 'en' ? 'FR' : 'EN'}
    </button>
  )
}
