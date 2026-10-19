import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Footer from './components/Footer/Footer'
import Header from './components/Header/Header'
import InputPanel from './components/InputPanel/InputPanel'
import Reader from './components/Reader/Reader'
import { useSettings } from './hooks/useSettings'
import { tokenize } from './lib/text'

const TEXT_KEY = 'fr.text'

function loadText(): string {
  try {
    return localStorage.getItem(TEXT_KEY) ?? ''
  } catch {
    return ''
  }
}

export default function App() {
  const { i18n, t } = useTranslation()
  const { settings, update } = useSettings()
  const [text, setText] = useState(loadText)
  const [reading, setReading] = useState(false)
  const words = useMemo(() => tokenize(text), [text])

  useEffect(() => {
    document.documentElement.lang = (i18n.resolvedLanguage ?? 'en').slice(0, 2)
    document.title = t('title')
  }, [i18n.resolvedLanguage, t])

  useEffect(() => {
    try {
      localStorage.setItem(TEXT_KEY, text.length < 1_000_000 ? text : '')
    } catch {
      /* storage unavailable or full */
    }
  }, [text])

  const back = useCallback(() => setReading(false), [])

  return (
    <div className="app">
      <Header theme={settings.theme} onTheme={(v) => update('theme', v)} />
      <main>
        {reading && words.length > 0 ? (
          <Reader words={words} settings={settings} onSetting={update} onBack={back} />
        ) : (
          <InputPanel text={text} wordCount={words.length} onText={setText} onStart={() => setReading(true)} />
        )}
      </main>
      <Footer />
    </div>
  )
}
