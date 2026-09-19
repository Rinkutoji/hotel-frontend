import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import useTheme from '../hooks/useTheme'

const originalMatchMedia = window.matchMedia

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
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove('dark')
})

afterEach(() => {
  window.matchMedia = originalMatchMedia
  localStorage.clear()
  document.documentElement.classList.remove('dark')
})

describe('useTheme', () => {
  it('defaults to the stored theme class on the root element', () => {
    localStorage.setItem('hotel_theme', 'dark')
    const { result } = renderHook(() => useTheme(), { initialProps: {} })
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(result.current.theme).toBe('dark')
  })

  it('persists a selected theme to localStorage and the root class', () => {
    stubMatchMedia(false)
    const { result } = renderHook(() => useTheme(), { initialProps: {} })
    expect(result.current.theme).toBe('system')

    act(() => result.current.setTheme('dark'))
    expect(localStorage.getItem('hotel_theme')).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    act(() => result.current.setTheme('light'))
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('resolves the system preference when no stored theme exists', () => {
    stubMatchMedia(true)
    const { result } = renderHook(() => useTheme(), { initialProps: {} })
    expect(result.current.theme).toBe('system')
    expect(result.current.resolvedTheme).toBe('dark')
  })
})
