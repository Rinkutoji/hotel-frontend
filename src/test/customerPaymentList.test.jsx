import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import MockAdapter from 'axios-mock-adapter'
import apiClient from '../api/client'
import CustomerPaymentList from '../pages/customer/CustomerPaymentList'

const payments = [
  {
    id: 4,
    booking_id: 12,
    amount: '556.00',
    method: 'bank_transfer',
    status: 'verified',
    created_at: '2026-09-14T10:00:00.000000Z',
    updated_at: '2026-09-14T10:00:00.000000Z',
    booking: { id: 12, booking_number: 'BK-ABCD1234', status: 'confirmed' },
  },
  {
    id: 5,
    booking_id: 13,
    amount: '800.00',
    method: 'cash',
    status: 'pending',
    created_at: '2026-09-15T09:00:00.000000Z',
    updated_at: '2026-09-15T09:00:00.000000Z',
    booking: { id: 13, booking_number: 'BK-EFGH5678', status: 'pending_payment' },
  },
]

function cardFor(payment) {
  return screen.getByText(payment.booking?.booking_number ?? `Payment #${payment.id}`).closest('.rounded-xl')
}

function renderPage(initialEntry = '/payments') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/payments" element={<CustomerPaymentList />} />
        <Route path="/payments/:id" element={<div data-testid="payment-target">{'{id}'}</div>} />
        <Route path="/bookings/:id" element={<div data-testid="booking-target">{'{id}'}</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('CustomerPaymentList page', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(apiClient)
  })

  afterEach(() => {
    mock.restore()
  })

  it('renders the payments, status badges, and verbatim amounts', async () => {
    mock.onGet('/customer/payments').reply(200, {
      success: true,
      data: payments,
      meta: { page: 1, per_page: 15, total: 2, last_page: 1 },
    })
    renderPage()
    expect(screen.getByText('My payments')).toBeInTheDocument()
    expect(await screen.findByText('BK-ABCD1234')).toBeInTheDocument()
    expect(screen.getByText('BK-EFGH5678')).toBeInTheDocument()
    expect(within(cardFor(payments[0])).getByText('Verified')).toBeInTheDocument()
    expect(within(cardFor(payments[1])).getByText('Pending')).toBeInTheDocument()
    expect(screen.getByText('556.00')).toBeInTheDocument()
    expect(screen.getByText('800.00')).toBeInTheDocument()
    expect(screen.getByText(/Bank transfer/)).toBeInTheDocument()
    expect(screen.getByText(/Cash/)).toBeInTheDocument()
  })

  it('shows a loading state while fetching', () => {
    mock.onGet('/customer/payments').reply(() => new Promise(() => {}))
    renderPage()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('shows an empty state when there are no payments', async () => {
    mock.onGet('/customer/payments').reply(200, {
      success: true,
      data: [],
      meta: { page: 1, per_page: 15, total: 0, last_page: 1 },
    })
    renderPage()
    expect(await screen.findByText(/No payments found/)).toBeInTheDocument()
    expect(screen.getByText('You have no payments yet.')).toBeInTheDocument()
    expect(screen.queryByText('Clear filter')).not.toBeInTheDocument()
  })

  it('shows a filters-aware empty state with a clear-filter action', async () => {
    mock.onGet('/customer/payments').reply(200, {
      success: true,
      data: [],
      meta: { page: 1, per_page: 15, total: 0, last_page: 1 },
    })
    renderPage('/payments?status=verified')
    expect(await screen.findByText(/No payments found/)).toBeInTheDocument()
    expect(screen.getByText('No payments match this status.')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Clear filter'))
    await waitFor(() => {
      const config = mock.history.get.filter((request) => request.url === '/customer/payments').at(-1)
      expect(config.params).toEqual({ page: 1, per_page: 15 })
    })
  })

  it('updates the status filter in the URL and refetches', async () => {
    mock.onGet('/customer/payments').reply(200, {
      success: true,
      data: payments,
      meta: { page: 1, per_page: 15, total: 2, last_page: 1 },
    })
    renderPage()
    fireEvent.change(await screen.findByLabelText('Status'), { target: { value: 'verified' } })
    await waitFor(() => {
      const config = mock.history.get.filter((request) => request.url === '/customer/payments').at(-1)
      expect(config.params).toEqual({ status: 'verified', page: 1, per_page: 15 })
    })
  })

  it('resets the page to 1 when the status filter changes', async () => {
    mock.onGet('/customer/payments').reply(200, {
      success: true,
      data: payments,
      meta: { page: 3, per_page: 15, total: 30, last_page: 3 },
    })
    renderPage('/payments?status=pending&page=3')
    fireEvent.change(await screen.findByLabelText('Status'), { target: { value: 'verified' } })
    await waitFor(() => {
      const config = mock.history.get.filter((request) => request.url === '/customer/payments').at(-1)
      expect(config.params).toEqual({ status: 'verified', page: 1, per_page: 15 })
    })
  })

  it('paginates through the results', async () => {
    mock.onGet('/customer/payments').reply(200, {
      success: true,
      data: payments,
      meta: { page: 1, per_page: 15, total: 2, last_page: 2 },
    })
    renderPage()
    fireEvent.click(await screen.findByText('Next'))
    await waitFor(() => {
      const config = mock.history.get.filter((request) => request.url === '/customer/payments').at(-1)
      expect(config.params).toEqual({ page: 2, per_page: 15 })
    })
  })

  it('navigates to a payment detail when the amount link is clicked', async () => {
    mock.onGet('/customer/payments').reply(200, {
      success: true,
      data: payments,
      meta: { page: 1, per_page: 15, total: 2, last_page: 1 },
    })
    renderPage()
    const amountLink = await screen.findByRole('link', { name: '556.00' })
    expect(amountLink).toHaveAttribute('href', '/payments/4')
    fireEvent.click(amountLink)
    expect(await screen.findByTestId('payment-target')).toBeInTheDocument()
  })

  it('navigates to a booking detail when the booking number is clicked', async () => {
    mock.onGet('/customer/payments').reply(200, {
      success: true,
      data: payments,
      meta: { page: 1, per_page: 15, total: 2, last_page: 1 },
    })
    renderPage()
    const bookingLink = await screen.findByRole('link', { name: 'BK-ABCD1234' })
    expect(bookingLink).toHaveAttribute('href', '/bookings/12')
    fireEvent.click(bookingLink)
    expect(await screen.findByTestId('booking-target')).toBeInTheDocument()
  })

  it('shows an error state with retry on failure', async () => {
    let attempts = 0
    mock.onGet('/customer/payments').reply(() => {
      attempts += 1
      if (attempts === 1) return [500, { success: false, message: 'Server error', errors: null }]
      return [200, { success: true, data: payments, meta: { page: 1, per_page: 15, total: 2, last_page: 1 } }]
    })
    renderPage()
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Server error')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('BK-ABCD1234')).toBeInTheDocument()
  })

  it('shows a receipt-uploaded badge label', async () => {
    const receiptPayment = { ...payments[0], id: 6, amount: '120.00', status: 'receipt_uploaded' }
    mock.onGet('/customer/payments').reply(200, {
      success: true,
      data: [receiptPayment],
      meta: { page: 1, per_page: 15, total: 1, last_page: 1 },
    })
    renderPage()
    expect(await screen.findByText('BK-ABCD1234')).toBeInTheDocument()
    expect(within(cardFor(receiptPayment)).getByText('Receipt Uploaded')).toBeInTheDocument()
  })

  it('falls back to a payment-id label when the booking is missing', async () => {
    const orphanPayment = { id: 7, booking_id: 99, amount: '90.00', method: 'cash', status: 'refunded', created_at: '2026-09-15T09:00:00.000000Z' }
    mock.onGet('/customer/payments').reply(200, {
      success: true,
      data: [orphanPayment],
      meta: { page: 1, per_page: 15, total: 1, last_page: 1 },
    })
    renderPage()
    expect(await screen.findByText('Payment #7')).toBeInTheDocument()
    expect(within(cardFor(orphanPayment)).getByText('Refunded')).toBeInTheDocument()
  })
})