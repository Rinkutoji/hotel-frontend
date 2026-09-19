import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import useTheme, { applyStoredTheme } from '../hooks/useTheme'

const STORAGE_KEY = 'hotel_theme'

function stubMatchMedia(matches) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
  document.documentElement.classList.add('dark')
}

beforeEach(() => localStorage.clear())

afterEach(() => {
  localStorage.clear()
  document.documentElement.className = ''
  delete window.matchMedia
})

describe('useTheme', () => {
  it('defaults to a system-aware theme when nothing is stored', () => {
    stubMatchMedia(true)
    const { result } = renderHook(() => useTheme())
    expect(result.current).toMatchObject({ theme: 'system', resolvedTheme: 'dark' })
  })

  it('persists a chosen theme to localStorage and applies the dark class', () => {
    stubMatchMedia(false)
    const { result } = renderHook(() => useTheme())
    act(() => result.current.setTheme('dark'))
    expect(localStorage.getItem(STORAGE_KEY)).toBe('dark')
    expect(result.current.theme).toBe('dark')
    expect(result.current.resolvedTheme).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('restores the stored theme when applyStoredTheme runs', () => {
    localStorage.setItem(STORAGE_KEY, 'dark')
    applyStoredTheme()
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
