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

const adminAuth = {
  isAuthenticated: true,
  isLoading: false,
  isCustomer: false,
  isStaff: true,
  user: { name: 'Admin User', role: 'admin', email: 'admin@example.com' },
  hasRole: () => true,
  logout: vi.fn(),
}

const receptionistAuth = {
  ...adminAuth,
  user: { name: 'Receptionist', role: 'receptionist', email: 'rec@example.com' },
  hasRole: (roles) => roles.includes('receptionist'),
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

describe('Staff property routes', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(apiClient)
    mockUseAuth.mockReset()
    mockUseAuth.mockReturnValue({ ...adminAuth, isAuthenticated: false, isStaff: false })
  })

  afterEach(() => {
    mock.restore()
  })

  it.each([
    '/staff/properties',
    '/staff/properties/new',
    '/staff/properties/5',
    '/staff/properties/5/edit',
    '/staff/properties/5/buildings/new',
    '/staff/buildings/3/edit',
  ])('sends guests from %s to the staff login page', (route) => {
    renderApp(route)
    expect(screen.getByTestId('from-probe').textContent).toBe(route)
  })

  it('sends a customer on a staff property route to the customer home', () => {
    mockUseAuth.mockReturnValue({ ...adminAuth, isStaff: false, isCustomer: true })
    renderApp('/staff/properties')
    expect(screen.getByText('CUSTOMER_HOME')).toBeInTheDocument()
  })

  it('lets a receptionist reach the properties list', async () => {
    mockUseAuth.mockReturnValue(receptionistAuth)
    mock.onGet('/staff/properties').reply(200, {
      success: true,
      data: [],
      meta: { page: 1, per_page: 15, total: 0, last_page: 1 },
    })
    renderApp('/staff/properties')
    expect(await screen.findByText('No properties found')).toBeInTheDocument()
  })

  it('lets a receptionist reach the property detail page', async () => {
    mockUseAuth.mockReturnValue(receptionistAuth)
    mock.onGet('/staff/properties/5').reply(200, {
      success: true,
      data: {
        id: 5,
        name: 'Main Hotel',
        code: 'MAIN',
        status: 'active',
        summary: { room_count: 0, occupied: 0, occupancy_pct: 0, verified_revenue_total: '0.00' },
        buildings: [],
      },
    })
    renderApp('/staff/properties/5')
    expect(await screen.findByText('Main Hotel')).toBeInTheDocument()
  })

  it.each([
    '/staff/properties/new',
    '/staff/properties/5/edit',
    '/staff/properties/5/buildings/new',
    '/staff/buildings/3/edit',
  ])('blocks receptionists from %s', (route) => {
    mockUseAuth.mockReturnValue(receptionistAuth)
    renderApp(route)
    expect(screen.getByText('Access denied')).toBeInTheDocument()
  })

  it('lets admin users reach the property create form', async () => {
    mockUseAuth.mockReturnValue(adminAuth)
    renderApp('/staff/properties/new')
    expect(await screen.findByText('Add a property')).toBeInTheDocument()
  })

  it('lets admin users reach the property edit form', async () => {
    mockUseAuth.mockReturnValue(adminAuth)
    mock.onGet('/staff/properties/5').reply(200, {
      success: true,
      data: {
        id: 5,
        name: 'Main',
        code: 'MAIN',
        status: 'active',
        check_in_time: '14:00:00',
        check_out_time: '12:00:00',
      },
    })
    renderApp('/staff/properties/5/edit')
    expect(await screen.findByText(/Edit property/)).toBeInTheDocument()
  })

  it('lets admin users reach the building create form', async () => {
    mockUseAuth.mockReturnValue(adminAuth)
    renderApp('/staff/properties/5/buildings/new')
    expect(await screen.findByText('Add a building')).toBeInTheDocument()
  })

  it('lets admin users reach the building edit form', async () => {
    mockUseAuth.mockReturnValue(adminAuth)
    mock.onGet('/staff/buildings/3').reply(200, {
      success: true,
      data: { id: 3, name: 'East', code: 'EAST', status: 'active', property_id: 5 },
    })
    renderApp('/staff/buildings/3/edit')
    expect(await screen.findByText(/Edit building/)).toBeInTheDocument()
  })
})