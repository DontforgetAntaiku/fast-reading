import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { FileError, readTextFile } from '../../lib/files'
import { FileIcon, PlayIcon } from '../Icons/Icons'
import './InputPanel.css'

interface Props {
  text: string
  wordCount: number
  onText: (s: string) => void
  onStart: () => void
}

export default function InputPanel({ text, wordCount, onText, onStart }: Props) {
  const { t, i18n } = useTranslation()
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    setError('')
    try {
      onText(await readTextFile(file, (i18n.resolvedLanguage ?? 'en').slice(0, 2)))
    } catch (err) {
      const code = err instanceof FileError ? err.code : 'unsupported'
      setError(
        { big: t('fileTooBig'), pdf: t('pdfError'), 'pdf-empty': t('pdfNoText'), 'pdf-encrypted': t('pdfEncrypted'), unsupported: t('fileError') }[code],
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="inp">
      <label htmlFor="fr-text" className="inp-label">
        {t('textLabel')}
      </label>
      <textarea
        id="fr-text"
        value={text}
        onChange={(e) => onText(e.target.value)}
        placeholder={t('placeholder')}
        spellCheck={false}
      />
      <div className="inp-row">
        <button type="button" className="btn" onClick={() => fileRef.current?.click()} disabled={busy}>
          <FileIcon /> {busy ? t('loadingFile') : t('openFile')}
        </button>
        <input ref={fileRef} type="file" hidden onChange={onFile} accept=".txt,.md,.markdown,.pdf,.html,.htm,.csv,.srt,.vtt,.fb2,.xml,.json,.log,application/pdf,text/*" />
        <button type="button" className="btn" onClick={() => onText(t('sampleText'))}>
          {t('sample')}
        </button>
        <button type="button" className="btn" onClick={() => onText('')} disabled={!text}>
          {t('clear')}
        </button>
        <span className="inp-count">
          {t('words')}: {wordCount}
        </span>
      </div>
      {error && (
        <p className="inp-error" role="alert">
          {error}
        </p>
      )}
      <button type="button" className="btn primary inp-start" onClick={onStart} disabled={wordCount === 0}>
        <PlayIcon /> {t('startReading')}
      </button>
      {wordCount === 0 && <p className="inp-hint">{t('empty')}</p>}
    </section>
  )
}
