import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isCustomer: true,
    isStaff: false,
    user: { name: 'Ada', email: 'ada@example.com' },
    hasRole: () => true,
  }),
}))

import Navbar from '../components/customer/Navbar'

function renderNavbar() {
  return render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>,
  )
}

describe('keyboard navigation', () => {
  it('opens the mobile menu with the toggle button', () => {
    renderNavbar()
    const button = screen.getByRole('button', { name: 'Toggle navigation' })
    expect(document.getElementById('mobile-menu')).toBeNull()

    fireEvent.click(button)

    expect(document.getElementById('mobile-menu')).not.toBeNull()
    expect(button).toHaveAttribute('aria-expanded', 'true')
  })

  it('closes the mobile menu on Escape and returns focus to the toggle', () => {
    renderNavbar()
    const button = screen.getByRole('button', { name: 'Toggle navigation' })
    fireEvent.click(button)
    expect(document.getElementById('mobile-menu')).not.toBeNull()

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(document.getElementById('mobile-menu')).toBeNull()
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(document.activeElement).toBe(button)
  })
})
