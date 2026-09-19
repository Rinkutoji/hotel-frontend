import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import MockAdapter from 'axios-mock-adapter'
import apiClient from '../api/client'
import StaffApp from '../routes/StaffApp'
import { useAuth } from '../hooks/useAuth'

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

const mockUseAuth = vi.mocked(useAuth)

const baseAuth = {
  isAuthenticated: true,
  isLoading: false,
  isCustomer: false,
  isStaff: true,
  user: { name: 'Admin User', role: 'admin', email: 'admin@example.com' },
  hasRole: () => true,
  logout: vi.fn(),
}

function countReply(count) {
  return { success: true, data: [], meta: { page: 1, per_page: 1, total: count, last_page: 1 } }
}

function mockDashboardEndpoints(mock) {
  mock.onGet('/staff/bookings').reply((config) =>
    config.params?.status ? [200, countReply(0)] : [200, { success: true, data: [], meta: { page: 1, per_page: 15, total: 0, last_page: 1 } }],
  )
  mock.onGet('/staff/payments').reply((config) =>
    config.params?.status ? [200, countReply(0)] : [200, { success: true, data: [], meta: { page: 1, per_page: 15, total: 0, last_page: 1 } }],
  )
  mock.onGet('/staff/rooms').reply(() => [200, countReply(0)])
  mock.onGet('/staff/invoices').reply(200, { success: true, data: [], meta: { page: 1, per_page: 15, total: 0, last_page: 1 } })
}

function FromProbe() {
  const location = useLocation()
  return <div data-testid="from-probe">{location.state?.from ?? 'NO_STATE'}</div>
}

function renderApp(initialUrl) {
  return render(
    <MemoryRouter initialEntries={[initialUrl]}>
      <Routes>
        <Route path="/staff/login" element={<FromProbe />} />
        <Route path="/" element={<div>CUSTOMER_HOME</div>} />
        <Route path="/staff/*" element={<StaffApp />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Staff dashboard routes', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(apiClient)
    mockUseAuth.mockReset()
    mockUseAuth.mockReturnValue({ ...baseAuth, isAuthenticated: false, isStaff: false })
  })

  afterEach(() => {
    mock.restore()
  })

  it('sends guests from /staff/dashboard to the staff login page', () => {
    renderApp('/staff/dashboard')
    expect(screen.getByTestId('from-probe').textContent).toBe('/staff/dashboard')
  })

  it('sends a customer from /staff/dashboard to the customer home', () => {
    mockUseAuth.mockReturnValue({ ...baseAuth, isStaff: false, isCustomer: true })
    renderApp('/staff/dashboard')
    expect(screen.getByText('CUSTOMER_HOME')).toBeInTheDocument()
  })

  it('lets any staff member reach the dashboard', async () => {
    mockUseAuth.mockReturnValue({ ...baseAuth, hasRole: () => true })
    mockDashboardEndpoints(mock)
    renderApp('/staff/dashboard')
    expect(await screen.findByText('Quick actions')).toBeInTheDocument()
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(1)
  })

  it('lets receptionists reach the dashboard (no role gate)', async () => {
    mockUseAuth.mockReturnValue({
      ...baseAuth,
      user: { name: 'Receptionist One', role: 'receptionist', email: 'recep@example.com' },
      hasRole: () => false,
    })
    mockDashboardEndpoints(mock)
    renderApp('/staff/dashboard')
    expect(await screen.findByText('Quick actions')).toBeInTheDocument()
  })
})