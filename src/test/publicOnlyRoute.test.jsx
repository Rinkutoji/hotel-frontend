import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import PublicOnlyRoute from '../routes/PublicOnlyRoute'
import { useAuth } from '../hooks/useAuth'

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

const mockUseAuth = vi.mocked(useAuth)

const baseAuth = {
  isAuthenticated: true,
  isLoading: false,
  isCustomer: true,
  isStaff: false,
}

function renderRoute(guard) {
  return render(
    <MemoryRouter initialEntries={['/staff/login']}>
      <Routes>
        <Route
          path="/staff/login"
          element={<PublicOnlyRoute {...guard}><div>FORM</div></PublicOnlyRoute>}
        />
        <Route path="/profile" element={<div>PROFILE</div>} />
        <Route path="/staff/dashboard" element={<div>STAFF_DASHBOARD</div>} />
        <Route path="/" element={<div>HOME</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PublicOnlyRoute', () => {
  beforeEach(() => {
    mockUseAuth.mockReset()
  })

  it('renders the form for unauthenticated visitors', () => {
    mockUseAuth.mockReturnValue({ ...baseAuth, isAuthenticated: false, isLoading: false })
    renderRoute({ actor: 'customer' })
    expect(screen.getByText('FORM')).toBeInTheDocument()
  })

  it('shows a spinner while the session is loading', () => {
    mockUseAuth.mockReturnValue({ ...baseAuth, isLoading: true })
    renderRoute({ actor: 'customer' })
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('redirects an authenticated customer away from a staff form', () => {
    mockUseAuth.mockReturnValue({ ...baseAuth, isStaff: false })
    renderRoute({ actor: 'staff' })
    expect(screen.getByText('HOME')).toBeInTheDocument()
  })

  it('redirects an authenticated customer to their profile', () => {
    mockUseAuth.mockReturnValue(baseAuth)
    renderRoute({ actor: 'customer' })
    expect(screen.getByText('PROFILE')).toBeInTheDocument()
  })

  it('redirects an authenticated staff member to the dashboard', () => {
    mockUseAuth.mockReturnValue({ ...baseAuth, isCustomer: false, isStaff: true })
    renderRoute({ actor: 'staff' })
    expect(screen.getByText('STAFF_DASHBOARD')).toBeInTheDocument()
  })
})