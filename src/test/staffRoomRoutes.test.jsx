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

const roomType = {
  id: 3,
  name: 'Suite',
  description: null,
  base_price: '250.00',
  capacity_adults: 3,
  capacity_children: 2,
  amenities: ['WiFi'],
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

describe('Staff room routes', () => {
  let mock

  let stubEmptyRoomsList = () => {
    mock.onGet('/staff/rooms').reply(200, {
      success: true,
      data: [],
      meta: { page: 1, per_page: 15, total: 0, last_page: 1 },
    })
    mock.onGet('/staff/room-types').reply(200, {
      success: true,
      data: [],
      meta: { page: 1, per_page: 50, total: 0, last_page: 1 },
    })
  }

  beforeEach(() => {
    mock = new MockAdapter(apiClient)
    mockUseAuth.mockReset()
    mockUseAuth.mockReturnValue({ ...adminAuth, isAuthenticated: false, isStaff: false })
  })

  afterEach(() => {
    mock.restore()
  })

  it.each([
    '/staff/rooms',
    '/staff/rooms/new',
    '/staff/rooms/12/edit',
    '/staff/room-types',
    '/staff/room-types/new',
    '/staff/room-types/3/edit',
    '/staff/room-types/3/images',
  ])('sends guests from %s to the staff login page', (route) => {
    renderApp(route)
    expect(screen.getByTestId('from-probe').textContent).toBe(route)
  })

  it('sends a customer on a staff room route to the customer home', () => {
    mockUseAuth.mockReturnValue({ ...adminAuth, isStaff: false, isCustomer: true })
    renderApp('/staff/rooms')
    expect(screen.getByText('CUSTOMER_HOME')).toBeInTheDocument()
  })

  it('lets any staff member reach the rooms list', async () => {
    mockUseAuth.mockReturnValue(receptionistAuth)
    stubEmptyRoomsList()
    renderApp('/staff/rooms')
    expect(await screen.findByText('There are no rooms yet.')).toBeInTheDocument()
  })

  it('lets any staff member reach the room types list', async () => {
    mockUseAuth.mockReturnValue(receptionistAuth)
    mock.onGet('/staff/room-types').reply(200, {
      success: true,
      data: [],
      meta: { page: 1, per_page: 15, total: 0, last_page: 1 },
    })
    renderApp('/staff/room-types')
    expect(await screen.findByText('No room types configured')).toBeInTheDocument()
  })

  it.each(['/staff/rooms/new', '/staff/rooms/1/edit'])(
    'blocks receptionists from the room forms %s',
    (route) => {
      mockUseAuth.mockReturnValue(receptionistAuth)
      renderApp(route)
      expect(screen.getByText('Access denied')).toBeInTheDocument()
    },
  )

  it.each(['/staff/room-types/new', '/staff/room-types/3/edit', '/staff/room-types/3/images'])(
    'blocks receptionists from %s',
    (route) => {
      mockUseAuth.mockReturnValue(receptionistAuth)
      renderApp(route)
      expect(screen.getByText('Access denied')).toBeInTheDocument()
    },
  )

  it('lets admin users reach the room create form', async () => {
    mockUseAuth.mockReturnValue(adminAuth)
    mock.onGet('/staff/room-types').reply(200, {
      success: true,
      data: [],
      meta: { page: 1, per_page: 50, total: 0, last_page: 1 },
    })
    renderApp('/staff/rooms/new')
    expect(await screen.findByText('Add a room')).toBeInTheDocument()
  })

  it('lets admin users reach the room type create form and edit form', async () => {
    mockUseAuth.mockReturnValue(adminAuth)
    renderApp('/staff/room-types/new')
    expect(await screen.findByText('Add a room type')).toBeInTheDocument()
    mock.onGet('/staff/room-types/3').reply(200, { success: true, data: roomType })
    const { unmount } = renderApp('/staff/room-types/3/edit')
    expect(await screen.findByText('Edit Suite')).toBeInTheDocument()
    unmount()
  })

  it('lets admin users reach the room type images page', async () => {
    mockUseAuth.mockReturnValue(adminAuth)
    mock.onGet('/staff/room-types/3').reply(200, { success: true, data: roomType })
    mock.onGet('/staff/room-types/3/images').reply(200, { success: true, data: [] })
    renderApp('/staff/room-types/3/images')
    expect(await screen.findByText('No photos yet')).toBeInTheDocument()
  })

  it('lets staff reach the invoices list', async () => {
    mockUseAuth.mockReturnValue(adminAuth)
    mock.onGet('/staff/invoices').reply(200, {
      success: true,
      data: [],
      meta: { page: 1, per_page: 15, total: 0, last_page: 1 },
    })
    renderApp('/staff/invoices')
    expect(await screen.findByText('There are no invoices yet.')).toBeInTheDocument()
  })

  it('lets admin users reach the discounts list', async () => {
    mockUseAuth.mockReturnValue(adminAuth)
    mock.onGet('/staff/discounts').reply(200, {
      success: true,
      data: [],
      meta: { page: 1, per_page: 15, total: 0, last_page: 1 },
    })
    renderApp('/staff/discounts')
    expect(await screen.findByText('There are no discounts yet.')).toBeInTheDocument()
  })
})