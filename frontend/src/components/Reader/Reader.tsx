import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Settings } from '../../hooks/useSettings'
import { focusIndex, formatTime, wordDelay } from '../../lib/text'
import { BackIcon, NextIcon, PauseIcon, PlayIcon, PrevIcon, RestartIcon } from '../Icons/Icons'
import './Reader.css'

interface Props {
  words: string[]
  settings: Settings
  onSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  onBack: () => void
}

const MIN_WPM = 60
const MAX_WPM = 1500

export default function Reader({ words, settings, onSetting, onBack }: Props) {
  const { t } = useTranslation()
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(true)
  const stageRef = useRef<HTMLDivElement>(null)
  const [stageW, setStageW] = useState(320)

  const last = words.length - 1
  const finished = !playing && index >= last
  const { wpm, pausePunct, pauseLong } = settings

  useLayoutEffect(() => {
    const el = stageRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setStageW(el.clientWidth))
    ro.observe(el)
    setStageW(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!playing) return
    if (index >= last) {
      setPlaying(false)
      return
    }
    const id = window.setTimeout(
      () => setIndex((i) => Math.min(i + 1, last)),
      wordDelay(words[index], { wpm, pausePunct, pauseLong }),
    )
    return () => window.clearTimeout(id)
  }, [playing, index, last, words, wpm, pausePunct, pauseLong])

  const toggle = useCallback(() => {
    if (index >= last) {
      setIndex(0)
      setPlaying(true)
    } else setPlaying((p) => !p)
  }, [index, last])

  const step = useCallback(
    (d: number) => {
      setPlaying(false)
      setIndex((i) => Math.min(Math.max(i + d, 0), last))
    },
    [last],
  )

  const restart = useCallback(() => {
    setIndex(0)
    setPlaying(true)
  }, [])

  const changeSpeed = useCallback(
    (d: number) => onSetting('wpm', Math.min(MAX_WPM, Math.max(MIN_WPM, wpm + d))),
    [onSetting, wpm],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const el = e.target as HTMLElement
      const tag = el.tagName
      if (tag === 'TEXTAREA' || tag === 'SELECT') return
      if (tag === 'INPUT' && (el as HTMLInputElement).type === 'range' && e.key.startsWith('Arrow')) return
      if (tag === 'BUTTON' && (e.key === ' ' || e.key === 'Enter')) return
      switch (e.key) {
        case ' ':
          toggle()
          break
        case 'ArrowLeft':
          step(-1)
          break
        case 'ArrowRight':
          step(1)
          break
        case 'ArrowUp':
          changeSpeed(25)
          break
        case 'ArrowDown':
          changeSpeed(-25)
          break
        case 'r':
        case 'R':
          restart()
          break
        case 'Escape':
          onBack()
          return
        default:
          return
      }
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggle, step, changeSpeed, restart, onBack])

  const word = words[index] ?? ''
  const chars = Array.from(word)
  const fi = focusIndex(word)
  const before = chars.slice(0, fi).join('')
  const mid = chars[fi] ?? ''
  const after = chars.slice(fi + 1).join('')

  const sideChars = Math.max(Array.from(before).length, Array.from(after).length, 1)
  const fit = (stageW - 24) / (2 * sideChars + 1) / 0.62
  const fontPx = Math.max(14, Math.min(settings.fontSize, fit))

  const remaining = (last - index + 1) * (60000 / wpm)
  const label = finished ? t('finished') : playing ? t('pause') : t('play')

  return (
    <section className="rd">
      <div ref={stageRef} className="rd-stage" aria-label={`${t('position')}: ${index + 1}/${words.length}`}>
        <div className="rd-guide" aria-hidden="true" />
        <div className="rd-word" style={{ fontSize: fontPx }} aria-hidden="true">
          <span className="rd-b">{before}</span>
          <span className={settings.highlight ? 'rd-f hl' : 'rd-f'}>{mid}</span>
          <span className="rd-a">{after}</span>
        </div>
        {finished && <div className="rd-done">{t('finished')}</div>}
      </div>

      <input
        className="rd-scrub"
        type="range"
        min={0}
        max={last}
        value={index}
        aria-label={t('position')}
        onChange={(e) => {
          setPlaying(false)
          setIndex(Number(e.target.value))
        }}
      />
      <div className="rd-meta">
        <span>
          {index + 1} / {words.length}
        </span>
        <span>
          {t('time')}: {formatTime(remaining)}
        </span>
      </div>

      <div className="rd-controls">
        <button type="button" className="btn" onClick={onBack}>
          <BackIcon /> {t('editText')}
        </button>
        <button type="button" className="btn" onClick={() => step(-1)} aria-label={t('prev')} title={t('prev')} disabled={index === 0}>
          <PrevIcon />
        </button>
        <button type="button" className="btn primary rd-play" onClick={toggle}>
          {playing ? <PauseIcon /> : <PlayIcon />} {label}
        </button>
        <button type="button" className="btn" onClick={() => step(1)} aria-label={t('next')} title={t('next')} disabled={index >= last}>
          <NextIcon />
        </button>
        <button type="button" className="btn" onClick={restart} aria-label={t('restart')} title={t('restart')}>
          <RestartIcon />
        </button>
      </div>

      <div className="rd-settings">
        <label className="rd-field">
          <span>
            {t('speed')}: <b>{wpm}</b> {t('wpm')}
          </span>
          <input type="range" min={MIN_WPM} max={MAX_WPM} step={10} value={wpm} onChange={(e) => onSetting('wpm', Number(e.target.value))} />
        </label>
        <label className="rd-field">
          <span>
            {t('fontSize')}: <b>{settings.fontSize}</b>
          </span>
          <input type="range" min={24} max={140} step={2} value={settings.fontSize} onChange={(e) => onSetting('fontSize', Number(e.target.value))} />
        </label>
        <label className="rd-check">
          <input type="checkbox" checked={settings.pausePunct} onChange={(e) => onSetting('pausePunct', e.target.checked)} />
          {t('pausePunct')}
        </label>
        <label className="rd-check">
          <input type="checkbox" checked={settings.pauseLong} onChange={(e) => onSetting('pauseLong', e.target.checked)} />
          {t('pauseLong')}
        </label>
        <label className="rd-check">
          <input type="checkbox" checked={settings.highlight} onChange={(e) => onSetting('highlight', e.target.checked)} />
          {t('highlight')}
        </label>
      </div>
      <p className="rd-keys">
        <b>{t('shortcuts')}:</b> {t('shortcutsText')}
      </p>
    </section>
  )
}
