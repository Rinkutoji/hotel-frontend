import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import MockAdapter from 'axios-mock-adapter'
import apiClient from '../api/client'
import PaymentCreate from '../pages/customer/PaymentCreate'

const baseBooking = {
  id: 12,
  booking_number: 'BK-ABCD1234',
  customer_id: 3,
  status: 'pending_payment',
  check_in_date: '2026-09-16T00:00:00.000000Z',
  check_out_date: '2026-09-18T00:00:00.000000Z',
  total_amount: '556.00',
  payment_deadline_at: '2026-12-01T12:00:00.000000Z',
  created_at: '2026-09-14T10:00:00.000000Z',
  booking_rooms: [
    {
      id: 1,
      price_per_night: '89.00',
      room: { id: 1, room_number: '101', floor: 1 },
      room_type: { id: 1, name: 'Standard Room' },
    },
    {
      id: 2,
      price_per_night: '189.00',
      room: { id: 2, room_number: '202', floor: 2 },
      room_type: { id: 2, name: 'Deluxe Suite' },
    },
  ],
}

function renderPage(bookingId = '12') {
  return render(
    <MemoryRouter initialEntries={[`/payments/new/${bookingId}`]}>
      <Routes>
        <Route path="/payments/new/:bookingId" element={<PaymentCreate />} />
        <Route path="/payments/:id" element={<div data-testid="payment-detail-target">PAYMENT_DETAIL</div>} />
        <Route path="/bookings" element={<div>MY_BOOKINGS</div>} />
        <Route path="/bookings/:id" element={<div>BOOKING_DETAIL</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PaymentCreate page', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(apiClient)
    mock.onGet('/customer/payments').reply(200, {
      success: true,
      data: [],
      meta: { page: 1, per_page: 15, total: 0, last_page: 1 },
    })
  })

  afterEach(() => {
    mock.restore()
  })

  it('shows a loading state while the booking loads', () => {
    mock.onGet('/customer/bookings/12').reply(() => new Promise(() => {}))
    renderPage()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('shows the booking summary and the authoritative amount', async () => {
    mock.onGet('/customer/bookings/12').reply(200, { success: true, data: baseBooking })
    renderPage()
    expect(await screen.findByText(/Complete payment for BK-ABCD1234/)).toBeInTheDocument()
    expect(screen.getByText('Booking summary')).toBeInTheDocument()
    expect(screen.getAllByText('556.00').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/Room 101/)).toBeInTheDocument()
    expect(screen.getByText(/Room 202/)).toBeInTheDocument()
  })

  it('renders the method selection form with bank transfer selected by default', async () => {
    mock.onGet('/customer/bookings/12').reply(200, { success: true, data: baseBooking })
    renderPage()
    const bank = await screen.findByRole('radio', { name: /Bank transfer/i })
    const cash = screen.getByRole('radio', { name: /Cash/i })
    expect(bank).toBeChecked()
    expect(cash).not.toBeChecked()
    expect(screen.getByRole('button', { name: 'Continue to payment' })).toBeInTheDocument()
  })

  it('creates a payment with the booking id and redirects on success', async () => {
    mock.onGet('/customer/bookings/12').reply(200, { success: true, data: baseBooking })
    mock.onPost('/customer/payments').reply(201, {
      success: true,
      data: { id: 4, booking_id: 12, amount: '556.00', method: 'bank_transfer', status: 'pending' },
    })
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Continue to payment' }))
    expect(await screen.findByTestId('payment-detail-target')).toBeInTheDocument()

    const config = mock.history.post.find((request) => request.url === '/customer/payments')
    expect(JSON.parse(config.data)).toEqual({ booking_id: 12, method: 'bank_transfer' })
  })

  it('submits the selected method', async () => {
    mock.onGet('/customer/bookings/12').reply(200, { success: true, data: baseBooking })
    mock.onPost('/customer/payments').reply(201, { success: true, data: { id: 4 } })
    renderPage()
    fireEvent.click(await screen.findByRole('radio', { name: /Cash/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue to payment' }))
    await screen.findByTestId('payment-detail-target')

    const config = mock.history.post.find((request) => request.url === '/customer/payments')
    expect(JSON.parse(config.data)).toEqual({ booking_id: 12, method: 'cash' })
  })

  it('surfaces the server message when a payment already exists (409)', async () => {
    mock.onGet('/customer/bookings/12').reply(200, { success: true, data: baseBooking })
    mock.onPost('/customer/payments').reply(409, {
      success: false,
      message: 'A payment already exists for this booking.',
      errors: null,
    })
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Continue to payment' }))
    expect(await screen.findByText('A payment already exists for this booking.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View your booking' })).toHaveAttribute('href', '/bookings/12')
  })

  it('shows validation errors on 422', async () => {
    mock.onGet('/customer/bookings/12').reply(200, { success: true, data: baseBooking })
    mock.onPost('/customer/payments').reply(422, {
      success: false,
      message: 'The given data was invalid.',
      errors: { method: ['The selected method is invalid.'] },
    })
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Continue to payment' }))
    expect(await screen.findByText(/The selected method is invalid\./)).toBeInTheDocument()
  })

  it('disables the submit button while submitting', async () => {
    mock.onGet('/customer/bookings/12').reply(200, { success: true, data: baseBooking })
    mock.onPost('/customer/payments').reply(() => new Promise(() => {}))
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Continue to payment' }))
    const button = await screen.findByRole('button', { name: 'Creating payment…' })
    expect(button).toBeDisabled()
  })

  it('shows a not-found state for a missing booking (404)', async () => {
    mock.onGet('/customer/bookings/12').reply(404, {
      success: false,
      message: 'Booking not found.',
      errors: null,
    })
    renderPage()
    expect(await screen.findByText('The requested resource could not be found.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to my bookings' })).toBeInTheDocument()
  })

  it('shows an error state with retry when the booking fetch fails', async () => {
    mock.onGet('/customer/bookings/12').reply(500, { success: false, message: 'Server error', errors: null })
    renderPage()
    expect(await screen.findByText('Server error')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('blocks payment for bookings that are not pending payment', async () => {
    mock.onGet('/customer/bookings/12').reply(200, {
      success: true,
      data: { ...baseBooking, status: 'confirmed' },
    })
    renderPage()
    expect(await screen.findByText('Payment is not available for this booking')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Continue to payment' })).not.toBeInTheDocument()
  })
})