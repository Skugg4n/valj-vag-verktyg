import { useCallback, useEffect, useState } from 'react'
import { loadLS, saveLS } from './utils/persistence.js'

// Colour theme for the Advanced editor.
//   pref:     'system' | 'light' | 'dark'   (what the user chose, persisted)
//   resolved: 'light' | 'dark'              (what is actually shown)
// The resolved theme is stamped on <html data-theme="..."> and theme.css
// swaps the design tokens. The reader keeps its own paper/dark toggle.

export const THEME_PREFS = ['system', 'light', 'dark']
export const THEME_LABELS = { system: 'Följ systemet', light: 'Ljust', dark: 'Mörkt' }

export function resolveTheme(pref, systemDark) {
  if (pref === 'light' || pref === 'dark') return pref
  return systemDark ? 'dark' : 'light'
}

export function applyTheme(resolved) {
  document.documentElement.setAttribute('data-theme', resolved)
}

function systemPrefersDark() {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches
}

export function useTheme() {
  const [pref, setPrefState] = useState(() => {
    const p = loadLS('theme', 'system')
    return THEME_PREFS.includes(p) ? p : 'system'
  })
  const [systemDark, setSystemDark] = useState(systemPrefersDark)

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mq) return
    const onChange = e => setSystemDark(e.matches)
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [])

  const resolved = resolveTheme(pref, systemDark)
  useEffect(() => { applyTheme(resolved) }, [resolved])

  const setPref = useCallback(p => {
    if (!THEME_PREFS.includes(p)) return
    setPrefState(p)
    saveLS('theme', p)
  }, [])

  // Quick toggle: flip what is shown, and pin it (leaves "system").
  const toggle = useCallback(() => {
    setPref(resolved === 'dark' ? 'light' : 'dark')
  }, [resolved, setPref])

  return { pref, setPref, resolved, toggle }
}
