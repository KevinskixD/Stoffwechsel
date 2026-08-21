import { useCallback, useEffect, useState } from 'react'

export type ThemePreference = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'uniformverwaltung.theme'

function readStoredPreference(): ThemePreference {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system'
}

function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function isDarkFor(preference: ThemePreference): boolean {
  return preference === 'dark' || (preference === 'system' && systemPrefersDark())
}

function applyThemeClass(preference: ThemePreference) {
  document.documentElement.classList.toggle('dark', isDarkFor(preference))
}

/**
 * 3-way theme preference persisted to localStorage (mirrors the inline flash-prevention script
 * in index.html, which reads the same key before React mounts). 'system' subscribes live to
 * prefers-color-scheme so an OS-level theme change updates the page without a reload.
 */
export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>(readStoredPreference)

  useEffect(() => {
    applyThemeClass(preference)
    if (preference !== 'system') return

    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => applyThemeClass('system')
    mql.addEventListener('change', handleChange)
    return () => mql.removeEventListener('change', handleChange)
  }, [preference])

  const setPreference = useCallback((next: ThemePreference) => {
    localStorage.setItem(STORAGE_KEY, next)
    setPreferenceState(next)
  }, [])

  const cycle = useCallback(() => {
    setPreference(preference === 'light' ? 'dark' : preference === 'dark' ? 'system' : 'light')
  }, [preference, setPreference])

  return { preference, setPreference, cycle }
}
