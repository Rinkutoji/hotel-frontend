import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import MockAdapter from 'axios-mock-adapter'
import apiClient from '../api/client'
import CustomerApp from '../routes/CustomerApp'
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

const room101 = { id: 1, room_number: '101', floor: 1, status: 'available', room_type_id: 1, price_per_night: '89.00' }
const room202 = { id: 2, room_number: '202', floor: 2, status: 'available', room_type_id: 2, price_per_night: '189.00' }

function FromProbe() {
  const location = useLocation()
  return <div data-testid="from-probe">{location.state?.from ?? 'NO_STATE'}</div>
}

function renderApp(initialUrl) {
  return render(
    <MemoryRouter initialEntries={[initialUrl]}>
      <Routes>
        <Route path="/staff/dashboard" element={<div>STAFF_DASH</div>} />
        <Route path="/login" element={<FromProbe />} />
        <Route path="/*" element={<CustomerApp />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Customer booking routes', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(apiClient)
    mockUseAuth.mockReset()
    mockUseAuth.mockReturnValue({ ...baseAuth, isAuthenticated: false, isCustomer: false, isStaff: false })
  })

  it('sends guests from /book to the login page preserving the booking intent', () => {
    renderApp('/book?check_in=2026-09-16&check_out=2026-09-18&rooms=1,2')
    expect(screen.getByTestId('from-probe').textContent).toBe('/book?check_in=2026-09-16&check_out=2026-09-18&rooms=1,2')
  })

  it('sends guests from /bookings to the login page', () => {
    renderApp('/bookings')
    expect(screen.getByTestId('from-probe').textContent).toBe('/bookings')
  })

  it('sends guests from /bookings/:id to the login page', () => {
    renderApp('/bookings/12')
    expect(screen.getByTestId('from-probe').textContent).toBe('/bookings/12')
  })

  it('renders the checkout for a signed-in customer', async () => {
    mockUseAuth.mockReturnValue(baseAuth)
    mock.onPost('/public/availability').reply(200, { success: true, data: [room101, room202] })
    renderApp('/book?check_in=2026-09-16&check_out=2026-09-18&rooms=1,2')
    expect(await screen.findByText('Review your booking')).toBeInTheDocument()
    expect(screen.getByText('Confirm booking (2 rooms)')).toBeInTheDocument()
  })

  it('renders the bookings list for a signed-in customer', async () => {
    mockUseAuth.mockReturnValue(baseAuth)
    mock.onGet('/customer/bookings').reply(200, {
      success: true,
      data: [],
      meta: { page: 1, per_page: 15, total: 0, last_page: 1 },
    })
    renderApp('/bookings')
    expect(await screen.findByText('My bookings')).toBeInTheDocument()
  })

  it('sends a staff member on booking routes to the staff dashboard', () => {
    mockUseAuth.mockReturnValue({ ...baseAuth, isCustomer: false, isStaff: true })
    renderApp('/book?check_in=2026-09-16&check_out=2026-09-18&rooms=1,2')
    expect(screen.getByText('STAFF_DASH')).toBeInTheDocument()
  })

  it('sends a staff member on a booking detail route to the staff dashboard', () => {
    mockUseAuth.mockReturnValue({ ...baseAuth, isCustomer: false, isStaff: true })
    renderApp('/bookings/3')
    expect(screen.getByText('STAFF_DASH')).toBeInTheDocument()
  })

  it('lets guests reach a public route unaffected', () => {
    renderApp('/availability')
    expect(screen.getByText('Check availability')).toBeInTheDocument()
  })
})