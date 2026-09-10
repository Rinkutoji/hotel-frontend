import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ProtectedRoute from '../routes/ProtectedRoute'
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
  hasRole: () => true,
}

function renderRoute(guard, path = '/area', initialEntries = ['/area']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route
          path={path}
          element={<ProtectedRoute {...guard}><div>PROTECTED</div></ProtectedRoute>}
        />
        <Route path="/login" element={<div>LOGIN_PAGE</div>} />
        <Route path="/staff/login" element={<div>STAFF_LOGIN_PAGE</div>} />
        <Route path="/staff/dashboard" element={<div>STAFF_DASHBOARD</div>} />
        <Route path="/" element={<div>HOME</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockUseAuth.mockReset()
  })

  it('redirects unauthenticated users to the actor login page', () => {
    mockUseAuth.mockReturnValue({ ...baseAuth, isAuthenticated: false })
    renderRoute({ actor: 'customer' })
    expect(screen.getByText('LOGIN_PAGE')).toBeInTheDocument()
  })

  it('redirects unauthenticated staff to the staff login page', () => {
    mockUseAuth.mockReturnValue({ ...baseAuth, isAuthenticated: false })
    renderRoute({ actor: 'staff' })
    expect(screen.getByText('STAFF_LOGIN_PAGE')).toBeInTheDocument()
  })

  it('shows a spinner while the session is loading', () => {
    mockUseAuth.mockReturnValue({ ...baseAuth, isLoading: true })
    renderRoute({ actor: 'customer' })
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('sends a staff member on a customer route to the staff dashboard', () => {
    mockUseAuth.mockReturnValue({ ...baseAuth, isCustomer: false, isStaff: true })
    renderRoute({ actor: 'customer' })
    expect(screen.getByText('STAFF_DASHBOARD')).toBeInTheDocument()
  })

  it('sends a customer on a staff route home', () => {
    mockUseAuth.mockReturnValue({ ...baseAuth, isStaff: false })
    renderRoute({ actor: 'staff' })
    expect(screen.getByText('HOME')).toBeInTheDocument()
  })

  it('renders children when the actor matches', () => {
    mockUseAuth.mockReturnValue(baseAuth)
    renderRoute({ actor: 'customer' })
    expect(screen.getByText('PROTECTED')).toBeInTheDocument()
  })

  it('renders the Forbidden page when roles do not match', () => {
    mockUseAuth.mockReturnValue({ ...baseAuth, isCustomer: false, isStaff: true, hasRole: () => false })
    renderRoute({ actor: 'staff', roles: ['admin'] })
    expect(screen.getByText(/Access denied/)).toBeInTheDocument()
  })
})