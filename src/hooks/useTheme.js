import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'hotel_theme'
const VALID_THEMES = ['light', 'dark', 'system']

function getStoredTheme() {
  if (typeof window === 'undefined') return 'system'
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    return VALID_THEMES.includes(value) ? value : 'system'
  } catch {
    return 'system'
  }
}

function resolveTheme(theme) {
  if (theme === 'light' || theme === 'dark') return theme
  if (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark'
  }
  return 'light'
}

function applyResolvedTheme(resolved) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', resolved === 'dark')
}

/* Apply the stored preference before first paint so the app never
 * flashes the wrong scheme. Called once from main.jsx on boot. */
export function applyStoredTheme() {
  applyResolvedTheme(resolveTheme(getStoredTheme()))
}

export default function useTheme() {
  const [theme, setTheme] = useState(getStoredTheme)

  useEffect(() => {
    applyResolvedTheme(resolveTheme(theme))
  }, [theme])

  const changeTheme = useCallback((next) => {
    const value = VALID_THEMES.includes(next) ? next : 'system'
    try {
      window.localStorage.setItem(STORAGE_KEY, value)
    } catch {
      /* storage may be unavailable (private mode) — still apply this session */
    }
    setTheme(value)
  }, [])

  return { theme, setTheme: changeTheme, resolvedTheme: resolveTheme(theme) }
}