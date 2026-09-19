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

const receptionistAuth = {
  ...baseAuth,
  user: { name: 'Receptionist', role: 'receptionist', email: 'rec@example.com' },
  hasRole: (roles) => roles.includes('receptionist'),
}

const invoice = {
  id: 9,
  invoice_number: 'INV-AAAA1111',
  payment_id: 4,
  total_amount: '556.00',
  issued_at: '2026-09-14T10:30:00.000000Z',
  payment: {
    id: 4,
    booking_id: 12,
    amount: '556.00',
    method: 'bank_transfer',
    status: 'verified',
    booking: {
      id: 12,
      booking_number: 'BK-ABCD1234',
      status: 'confirmed',
      customer: { id: 1, name: 'John Smith', email: 'john@example.com' },
    },
  },
  items: [],
}

const discount = { id: 3, name: 'Week stay', min_nights: 3, percent_off: '15.00' }

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

describe('Staff invoice and discount routes', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(apiClient)
    mockUseAuth.mockReset()
    mockUseAuth.mockReturnValue({ ...baseAuth, isAuthenticated: false, isStaff: false })
  })

  afterEach(() => {
    mock.restore()
  })

  it.each(['/staff/invoices', '/staff/invoices/9', '/staff/discounts', '/staff/discounts/new', '/staff/discounts/3/edit'])(
    'sends guests from %s to the staff login page',
    (route) => {
      renderApp(route)
      expect(screen.getByTestId('from-probe').textContent).toBe(route)
    },
  )

  it('sends a customer on an invoice route to the customer home', () => {
    mockUseAuth.mockReturnValue({ ...baseAuth, isStaff: false, isCustomer: true })
    renderApp('/staff/invoices')
    expect(screen.getByText('CUSTOMER_HOME')).toBeInTheDocument()
  })

  it('lets any staff member reach the invoice list', async () => {
    mockUseAuth.mockReturnValue(receptionistAuth)
    mock.onGet('/staff/invoices').reply(200, {
      success: true,
      data: [],
      meta: { page: 1, per_page: 15, total: 0, last_page: 1 },
    })
    renderApp('/staff/invoices')
    expect(await screen.findByText('There are no invoices yet.')).toBeInTheDocument()
  })

  it('lets any staff member reach an invoice detail', async () => {
    mockUseAuth.mockReturnValue(receptionistAuth)
    mock.onGet('/staff/invoices/9').reply(200, { success: true, data: invoice })
    renderApp('/staff/invoices/9')
    expect(await screen.findByText('INV-AAAA1111')).toBeInTheDocument()
  })

  it.each(['/staff/discounts', '/staff/discounts/new', '/staff/discounts/3/edit'])(
    'blocks receptionists from %s',
    (route) => {
      mockUseAuth.mockReturnValue(receptionistAuth)
      renderApp(route)
      expect(screen.getByText('Access denied')).toBeInTheDocument()
    },
  )

  it('lets admin users reach the discount list', async () => {
    mockUseAuth.mockReturnValue(baseAuth)
    mock.onGet('/staff/discounts').reply(200, {
      success: true,
      data: [],
      meta: { page: 1, per_page: 15, total: 0, last_page: 1 },
    })
    renderApp('/staff/discounts')
    expect(await screen.findByText('There are no discounts yet.')).toBeInTheDocument()
  })

  it('lets admin users reach the discount create form', () => {
    mockUseAuth.mockReturnValue(baseAuth)
    renderApp('/staff/discounts/new')
    expect(screen.getByText('Add a discount')).toBeInTheDocument()
  })

  it('lets admin users reach the discount edit form', async () => {
    mockUseAuth.mockReturnValue(baseAuth)
    mock.onGet('/staff/discounts/3').reply(200, { success: true, data: discount })
    renderApp('/staff/discounts/3/edit')
    expect(await screen.findByText('Edit Week stay')).toBeInTheDocument()
  })
})