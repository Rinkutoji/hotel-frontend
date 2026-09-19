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

const booking = {
  id: 1,
  booking_number: 'BK-ABCD1234',
  customer_id: 3,
  customer: { id: 3, name: 'John Doe', email: 'john@example.com' },
  status: 'confirmed',
  check_in_date: '2026-09-16T00:00:00.000000Z',
  check_out_date: '2026-09-18T00:00:00.000000Z',
  total_amount: '556.00',
  payment_deadline_at: '2026-12-01T12:00:00.000000Z',
  created_at: '2026-09-14T10:00:00.000000Z',
  updated_at: '2026-09-14T10:00:00.000000Z',
  cancelled_at: null,
  cancellation_reason: null,
  no_show_at: null,
  late_fee_amount: null,
  late_fee_applied_at: null,
  booking_rooms: [],
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

describe('Staff booking routes', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(apiClient)
    mockUseAuth.mockReset()
    mockUseAuth.mockReturnValue({ ...baseAuth, isAuthenticated: false, isStaff: false })
  })

  afterEach(() => {
    mock.restore()
  })

  it('sends guests from /staff/bookings to the staff login page', () => {
    renderApp('/staff/bookings')
    expect(screen.getByTestId('from-probe').textContent).toBe('/staff/bookings')
  })

  it('sends guests from /staff/bookings/:id to the staff login page', () => {
    renderApp('/staff/bookings/1')
    expect(screen.getByTestId('from-probe').textContent).toBe('/staff/bookings/1')
  })

  it('sends a customer on a staff booking route to the customer home', () => {
    mockUseAuth.mockReturnValue({ ...baseAuth, isStaff: false, isCustomer: true })
    renderApp('/staff/bookings')
    expect(screen.getByText('CUSTOMER_HOME')).toBeInTheDocument()
  })

  it('lets staff members access the booking list', async () => {
    mockUseAuth.mockReturnValue(baseAuth)
    mock.onGet('/staff/bookings').reply(200, {
      success: true,
      data: [],
      meta: { page: 1, per_page: 15, total: 0, last_page: 1 },
    })
    renderApp('/staff/bookings')
    expect(await screen.findByText('There are no bookings yet.')).toBeInTheDocument()
  })

  it('lets staff members access a booking detail page', async () => {
    mockUseAuth.mockReturnValue(baseAuth)
    mock.onGet('/staff/bookings/1').reply(200, { success: true, data: booking })
    renderApp('/staff/bookings/1')
    expect(await screen.findByText('BK-ABCD1234')).toBeInTheDocument()
  })
})