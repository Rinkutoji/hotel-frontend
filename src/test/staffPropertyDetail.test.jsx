import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import MockAdapter from 'axios-mock-adapter'
import apiClient from '../api/client'
import PropertyDetail from '../pages/staff/PropertyDetail'
import { useAuth } from '../hooks/useAuth'

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

const mockUseAuth = vi.mocked(useAuth)

const fullProperty = {
  id: 5,
  name: 'Main Hotel',
  code: 'MAIN',
  description: 'The main property',
  address: '1 Main St',
  city: 'Phnom Penh',
  province_state: 'Phnom Penh',
  country: 'Cambodia',
  postal_code: '12000',
  latitude: '11.55',
  longitude: '104.92',
  phone: '012345678',
  email: 'info@hotel.com',
  website: 'https://www.hotel.com',
  check_in_time: '14:00:00',
  check_out_time: '12:00:00',
  timezone: 'Asia/Phnom_Penh',
  currency: 'USD',
  status: 'active',
  summary: { room_count: 12, occupied: 5, occupancy_pct: 41.7, verified_revenue_total: '15000.00' },
  buildings: [
    { id: 1, name: 'East Wing', code: 'EAST', floor_count: 4, room_count: 6, occupied: 3, occupancy_pct: 50.0 },
    { id: 2, name: 'West Wing', code: 'WEST', floor_count: 3, room_count: 6, occupied: 2, occupancy_pct: 33.3 },
  ],
}

const noCoordsProperty = { ...fullProperty, latitude: null, longitude: null }

function renderPage(entry = '/staff/properties/5') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/staff/properties" element={<div>PROPERTIES_LIST</div>} />
        <Route path="/staff/properties/:id" element={<PropertyDetail />} />
        <Route path="/staff/properties/:id/edit" element={<div>EDIT_FORM</div>} />
        <Route path="/staff/properties/:id/buildings/new" element={<div>NEW_BUILDING</div>} />
        <Route path="/staff/buildings/:id/edit" element={<div>EDIT_BUILDING</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Staff property detail page', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(apiClient)
    mockUseAuth.mockReset()
    mockUseAuth.mockReturnValue({
      user: { name: 'Admin User', role: 'admin', email: 'admin@example.com' },
      hasRole: (roles) => roles.includes('admin'),
    })
  })

  afterEach(() => {
    mock.restore()
  })

  it('shows a loading state while fetching', () => {
    mock.onGet('/staff/properties/5').reply(() => new Promise(() => {}))
    renderPage()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders summary cards', async () => {
    mock.onGet('/staff/properties/5').reply(200, { success: true, data: fullProperty })
    renderPage()
    expect(await screen.findByText('Main Hotel')).toBeInTheDocument()
    expect(screen.getByText('MAIN')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('41.7%')).toBeInTheDocument()
    expect(screen.getByText('15000.00')).toBeInTheDocument()
  })

  it('shows hotel information and address sections', async () => {
    mock.onGet('/staff/properties/5').reply(200, { success: true, data: fullProperty })
    renderPage()
    await screen.findByText('Main Hotel')
    expect(screen.getByText('The main property')).toBeInTheDocument()
    expect(screen.getByText('1 Main St')).toBeInTheDocument()
    expect(screen.getAllByText('Phnom Penh')).toHaveLength(2)
    expect(screen.getByText('info@hotel.com')).toBeInTheDocument()
    expect(screen.getByText('https://www.hotel.com')).toBeInTheDocument()
  })

  it('shows map toggle when coords exist', async () => {
    mock.onGet('/staff/properties/5').reply(200, { success: true, data: fullProperty })
    renderPage()
    await screen.findByText('Main Hotel')
    expect(screen.getByText('11.55, 104.92')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show map' })).toBeInTheDocument()
    expect(screen.queryByTitle(/Map of/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Show map' }))
    expect(screen.getByTitle('Map of Main Hotel')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hide map' })).toBeInTheDocument()
  })

  it('does not show map toggle when coords are null', async () => {
    mock.onGet('/staff/properties/5').reply(200, { success: true, data: noCoordsProperty })
    renderPage()
    await screen.findByText('Main Hotel')
    expect(screen.getByText('No coordinates set.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Show map' })).not.toBeInTheDocument()
  })

  it('renders buildings list', async () => {
    mock.onGet('/staff/properties/5').reply(200, { success: true, data: fullProperty })
    renderPage()
    await screen.findByText('Main Hotel')
    expect(screen.getByText('East Wing')).toBeInTheDocument()
    expect(screen.getByText('EAST · 4 floors')).toBeInTheDocument()
    expect(screen.getByText('West Wing')).toBeInTheDocument()
    expect(screen.getByText('WEST · 3 floors')).toBeInTheDocument()
  })

  it('shows admin-only action links', async () => {
    mock.onGet('/staff/properties/5').reply(200, { success: true, data: fullProperty })
    renderPage()
    await screen.findByText('Main Hotel')
    expect(screen.getByRole('link', { name: 'Edit property' })).toHaveAttribute('href', '/staff/properties/5/edit')
    expect(screen.getByRole('link', { name: 'New building' })).toHaveAttribute('href', '/staff/properties/5/buildings/new')
  })

  it('hides admin action links for receptionists', async () => {
    mockUseAuth.mockReturnValue({
      user: { name: 'Receptionist', role: 'receptionist', email: 'rec@example.com' },
      hasRole: (roles) => roles.includes('receptionist'),
    })
    mock.onGet('/staff/properties/5').reply(200, { success: true, data: fullProperty })
    renderPage()
    await screen.findByText('Main Hotel')
    expect(screen.queryByRole('link', { name: 'Edit property' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'New building' })).not.toBeInTheDocument()
  })

  it('shows a not-found state for 404', async () => {
    mock.onGet('/staff/properties/5').reply(404, { success: false, message: 'Property not found.', errors: null })
    renderPage()
    await screen.findByText(/Back to properties/)
    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it('shows an error state with retry', async () => {
    let attempts = 0
    mock.onGet('/staff/properties/5').reply(() => {
      attempts += 1
      if (attempts === 1) return [500, { success: false, message: 'Server error', errors: null }]
      return [200, { success: true, data: fullProperty }]
    })
    renderPage()
    expect(await screen.findByText('Server error')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Main Hotel')).toBeInTheDocument()
  })
})