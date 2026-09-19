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

const payment = {
  id: 4,
  booking_id: 7,
  amount: '1500.00',
  method: 'bank_transfer',
  status: 'pending',
  verified_by: null,
  verified_at: null,
  notes: null,
  created_at: '2026-09-14T10:00:00.000000Z',
  updated_at: '2026-09-14T10:00:00.000000Z',
  verifiedBy: null,
  booking: {
    id: 7,
    booking_number: 'BK-ABCD1234',
    status: 'pending_payment',
    check_in_date: '2026-10-01',
    check_out_date: '2026-10-05',
    total_amount: '1500.00',
    customer: { id: 3, name: 'John Doe', email: 'john@example.com' },
  },
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

describe('Staff payment routes', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(apiClient)
    mockUseAuth.mockReset()
    mockUseAuth.mockReturnValue({ ...baseAuth, isAuthenticated: false, isStaff: false })
  })

  afterEach(() => {
    mock.restore()
  })

  it('sends guests from /staff/payments to the staff login page', () => {
    renderApp('/staff/payments')
    expect(screen.getByTestId('from-probe').textContent).toBe('/staff/payments')
  })

  it('sends guests from /staff/payments/:id to the staff login page', () => {
    renderApp('/staff/payments/4')
    expect(screen.getByTestId('from-probe').textContent).toBe('/staff/payments/4')
  })

  it('sends a customer on a staff payment route to the customer home', () => {
    mockUseAuth.mockReturnValue({ ...baseAuth, isStaff: false, isCustomer: true })
    renderApp('/staff/payments')
    expect(screen.getByText('CUSTOMER_HOME')).toBeInTheDocument()
  })

  it('lets staff members access the payment list', async () => {
    mockUseAuth.mockReturnValue(baseAuth)
    mock.onGet('/staff/payments').reply(200, {
      success: true,
      data: [],
      meta: { page: 1, per_page: 15, total: 0, last_page: 1 },
    })
    renderApp('/staff/payments')
    expect(await screen.findByText('There are no payments yet.')).toBeInTheDocument()
  })

  it('lets staff members access a payment detail page', async () => {
    mockUseAuth.mockReturnValue(baseAuth)
    mock.onGet('/staff/payments/4').reply(200, { success: true, data: payment })
    renderApp('/staff/payments/4')
    expect(await screen.findByText('Payment #4')).toBeInTheDocument()
  })

  it('keeps the discounts route gated to admin and manager roles', () => {
    mockUseAuth.mockReturnValue({ ...baseAuth, hasRole: () => false })
    renderApp('/staff/discounts')
    expect(screen.getByText('Access denied')).toBeInTheDocument()
  })

  it('lets staff members access the rooms list', async () => {
    mockUseAuth.mockReturnValue(baseAuth)
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
    renderApp('/staff/rooms')
    expect(await screen.findByText('There are no rooms yet.')).toBeInTheDocument()
  })
})