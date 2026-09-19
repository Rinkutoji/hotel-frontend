import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const m = vi.hoisted(() => {
  const setTheme = vi.fn()
  let theme = 'light'
  return {
    setTheme,
    get theme() {
      return theme
    },
    set stateTheme(value) {
      theme = value
    },
    reset() {
      theme = 'light'
      setTheme.mockReset()
    },
  }
})

vi.mock('../hooks/useTheme', () => ({
  __esModule: true,
  default: () => ({
    theme: m.theme,
    resolvedTheme: m.theme,
    setTheme: m.setTheme,
  }),
}))

import DarkModeToggle from '../components/common/DarkModeToggle'

beforeEach(() => {
  m.reset()
})

describe('DarkModeToggle', () => {
  it('offers light, dark and system options', () => {
    render(<DarkModeToggle />)
    expect(screen.getByRole('button', { name: 'Light' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dark' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'System' })).toBeInTheDocument()
  })

  it('marks the active scheme as pressed', () => {
    render(<DarkModeToggle />)
    expect(screen.getByRole('button', { name: 'Light' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'System' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('applies the clicked theme', () => {
    render(<DarkModeToggle />)
    fireEvent.click(screen.getByRole('button', { name: 'Dark' }))
    expect(m.setTheme).toHaveBeenCalledWith('dark')
  })
})
