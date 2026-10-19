import { useTranslation } from 'react-i18next'
import { useOfflineReady } from '../../hooks/useOfflineReady'
import './Footer.css'

export default function Footer() {
  const { t } = useTranslation()
  const offline = useOfflineReady()
  return (
    <footer className="ftr">
      <p>
        {t('privacy')}
        {offline && <span className="ftr-off"> · ✓ {t('offlineReady')}</span>}
      </p>
      <p>
        {t('builtBy')}{' '}
        <a href="https://dontforgetantaiku.dev/" target="_blank" rel="noopener noreferrer">
          DontforgetAntaiku
        </a>
      </p>
    </footer>
  )
}
