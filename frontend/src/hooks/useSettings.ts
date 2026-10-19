import { useCallback, useEffect, useState } from 'react'

export type Theme = 'auto' | 'light' | 'dark'

export interface Settings {
  wpm: number
  fontSize: number
  pausePunct: boolean
  pauseLong: boolean
  highlight: boolean
  theme: Theme
}

const DEFAULTS: Settings = {
  wpm: 300,
  fontSize: 72,
  pausePunct: true,
  pauseLong: true,
  highlight: true,
  theme: 'auto',
}

const KEY = 'fr.settings'

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    /* storage unavailable */
  }
  return DEFAULTS
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings))
      localStorage.setItem('fr.theme', settings.theme)
    } catch {
      /* storage unavailable */
    }
    const root = document.documentElement
    if (settings.theme === 'auto') delete root.dataset.theme
    else root.dataset.theme = settings.theme
  }, [settings])

  const update = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((s) => ({ ...s, [key]: value }))
  }, [])

  return { settings, update }
}
