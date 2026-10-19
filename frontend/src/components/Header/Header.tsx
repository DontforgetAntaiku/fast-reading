import { useTranslation } from 'react-i18next'
import { LANGUAGES } from '../../i18n'
import type { Theme } from '../../hooks/useSettings'
import './Header.css'

interface Props {
  theme: Theme
  onTheme: (t: Theme) => void
}

export default function Header({ theme, onTheme }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'en').slice(0, 2)

  return (
    <header className="hdr">
      <div className="hdr-brand">
        <span className="hdr-logo" aria-hidden="true">
          A<b>b</b>
        </span>
        <div className="hdr-titles">
          <h1>{t('title')}</h1>
          <p>{t('subtitle')}</p>
        </div>
      </div>
      <div className="hdr-tools">
        <label>
          <span className="sr-only">{t('theme')}</span>
          <select value={theme} onChange={(e) => onTheme(e.target.value as Theme)}>
            <option value="auto">{t('themeAuto')}</option>
            <option value="light">{t('themeLight')}</option>
            <option value="dark">{t('themeDark')}</option>
          </select>
        </label>
        <label>
          <span className="sr-only">{t('language')}</span>
          <select value={lang} onChange={(e) => void i18n.changeLanguage(e.target.value)}>
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code} lang={l.code}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </header>
  )
}
