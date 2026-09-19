import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
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
  logout: vi.fn(),
}

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

const booking = {
  id: 1,
  booking_number: 'BK-ABCD1234',
  status: 'pending_payment',
  check_in_date: '2026-09-16T00:00:00.000000Z',
  check_out_date: '2026-09-18T00:00:00.000000Z',
  total_amount: '556.00',
  payment_deadline_at: '2026-12-01T12:00:00.000000Z',
  booking_rooms: [],
}

const payment = {
  id: 4,
  booking_id: 1,
  amount: '556.00',
  method: 'bank_transfer',
  status: 'pending',
  created_at: '2026-09-14T10:00:00.000000Z',
  updated_at: '2026-09-14T10:00:00.000000Z',
  booking,
  verifiedBy: null,
}

describe('Customer payment and invoice routes', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(apiClient)
    mockUseAuth.mockReset()
    mockUseAuth.mockReturnValue({ ...baseAuth, isAuthenticated: false, isCustomer: false, isStaff: false })
  })

  it('sends guests from /payments/new/:bookingId to the login page', () => {
    renderApp('/payments/new/1')
    expect(screen.getByTestId('from-probe').textContent).toBe('/payments/new/1')
  })

  it('sends guests from /payments/:id to the login page', () => {
    renderApp('/payments/4')
    expect(screen.getByTestId('from-probe').textContent).toBe('/payments/4')
  })

  it('sends guests from /payments to the login page with the original path', () => {
    renderApp('/payments')
    expect(screen.getByTestId('from-probe').textContent).toBe('/payments')
  })

  it('sends guests from /invoices to the login page', () => {
    renderApp('/invoices')
    expect(screen.getByTestId('from-probe').textContent).toBe('/invoices')
  })

  it('sends guests from /invoices/:id to the login page', () => {
    renderApp('/invoices/1')
    expect(screen.getByTestId('from-probe').textContent).toBe('/invoices/1')
  })

  it('sends a staff member on payment routes to the staff dashboard', () => {
    mockUseAuth.mockReturnValue({ ...baseAuth, isCustomer: false, isStaff: true })
    renderApp('/payments/4')
    expect(screen.getByText('STAFF_DASH')).toBeInTheDocument()
  })

  it('sends a staff member from /payments to the staff dashboard', () => {
    mockUseAuth.mockReturnValue({ ...baseAuth, isCustomer: false, isStaff: true })
    renderApp('/payments')
    expect(screen.getByText('STAFF_DASH')).toBeInTheDocument()
  })

  it('sends a staff member on invoice routes to the staff dashboard', () => {
    mockUseAuth.mockReturnValue({ ...baseAuth, isCustomer: false, isStaff: true })
    renderApp('/invoices')
    expect(screen.getByText('STAFF_DASH')).toBeInTheDocument()
  })

  it('renders the payment create page for a signed-in customer', async () => {
    mockUseAuth.mockReturnValue(baseAuth)
    mock.onGet('/customer/bookings/1').reply(200, { success: true, data: booking })
    mock.onGet('/customer/payments').reply(200, {
      success: true,
      data: [],
      meta: { page: 1, per_page: 15, total: 0, last_page: 1 },
    })
    renderApp('/payments/new/1')
    expect(await screen.findByText('Booking summary')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue to payment' })).toBeInTheDocument()
  })

  it('renders the payment detail page for a signed-in customer', async () => {
    mockUseAuth.mockReturnValue(baseAuth)
    mock.onGet('/customer/payments/4').reply(200, { success: true, data: payment })
    renderApp('/payments/4')
    expect(await screen.findByText('Payment #4')).toBeInTheDocument()
  })

  it('renders the payment list page for a signed-in customer', async () => {
    mockUseAuth.mockReturnValue(baseAuth)
    mock.onGet('/customer/payments').reply(200, {
      success: true,
      data: [],
      meta: { page: 1, per_page: 15, total: 0, last_page: 1 },
    })
    renderApp('/payments')
    expect(await screen.findByText('My payments')).toBeInTheDocument()
  })

  it('renders the invoice list page for a signed-in customer', async () => {
    mockUseAuth.mockReturnValue(baseAuth)
    mock.onGet('/customer/invoices').reply(200, {
      success: true,
      data: [],
      meta: { page: 1, per_page: 15, total: 0, last_page: 1 },
    })
    renderApp('/invoices')
    expect(await screen.findByText('My invoices')).toBeInTheDocument()
  })

  it('renders the invoice detail page for a signed-in customer', async () => {
    mockUseAuth.mockReturnValue(baseAuth)
    mock.onGet('/customer/invoices/1').reply(200, {
      success: true,
      data: {
        id: 1,
        invoice_number: 'INV-AAAA1111',
        total_amount: '556.00',
        issued_at: '2026-09-14T10:30:00.000000Z',
        payment,
        items: [],
      },
    })
    renderApp('/invoices/1')
    expect(await screen.findByText('INV-AAAA1111')).toBeInTheDocument()
  })

  it('shows a My Payments link in the navbar for customers', async () => {
    mockUseAuth.mockReturnValue(baseAuth)
    mock.onGet('/customer/payments').reply(200, {
      success: true,
      data: [],
      meta: { page: 1, per_page: 15, total: 0, last_page: 1 },
    })
    renderApp('/payments')
    await screen.findByText('My payments')
    const navLink = within(screen.getByRole('banner')).getByRole('link', { name: 'My Payments' })
    expect(navLink).toHaveAttribute('href', '/payments')
  })

  it('shows the My Payments link in the mobile menu too', async () => {
    mockUseAuth.mockReturnValue(baseAuth)
    mock.onGet('/customer/payments').reply(200, {
      success: true,
      data: [],
      meta: { page: 1, per_page: 15, total: 0, last_page: 1 },
    })
    renderApp('/payments')
    await screen.findByText('My payments')
    const header = screen.getByRole('banner')
    expect(within(header).getAllByRole('link', { name: 'My Payments' }).length).toBe(1)
    fireEvent.click(screen.getByRole('button', { name: 'Toggle navigation' }))
    const navLinks = within(header).getAllByRole('link', { name: 'My Payments' })
    expect(navLinks.length).toBe(2)
    navLinks.forEach((link) => expect(link).toHaveAttribute('href', '/payments'))
  })

  it('hides the My Payments links from guests', () => {
    renderApp('/payments')
    expect(screen.getByTestId('from-probe').textContent).toBe('/payments')
    expect(screen.queryByRole('link', { name: 'My Payments' })).not.toBeInTheDocument()
  })

  it('shows the My Payments link in the footer for customers', async () => {
    mockUseAuth.mockReturnValue(baseAuth)
    mock.onGet('/customer/payments').reply(200, {
      success: true,
      data: [],
      meta: { page: 1, per_page: 15, total: 0, last_page: 1 },
    })
    renderApp('/payments')
    await screen.findByText('My payments')
    const footerLink = within(screen.getByRole('contentinfo')).getByRole('link', { name: 'My Payments' })
    expect(footerLink).toHaveAttribute('href', '/payments')
  })
})