import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import MockAdapter from 'axios-mock-adapter'
import apiClient from '../api/client'
import BookingDetail from '../pages/customer/BookingDetail'

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
  updated_at: '2026-09-14T10:00:00.000000Z',
  cancelled_at: null,
  cancellation_reason: null,
  booking_rooms: [
    {
      id: 1,
      booking_id: 12,
      room_id: 1,
      room_type_id: 1,
      price_per_night: '89.00',
      actual_check_in_at: null,
      actual_check_out_at: null,
      room: { id: 1, room_number: '101', floor: 1, status: 'available', room_type_id: 1 },
      room_type: { id: 1, name: 'Standard Room', base_price: '89.00', capacity_adults: 2, capacity_children: 0 },
    },
    {
      id: 2,
      booking_id: 12,
      room_id: 2,
      room_type_id: 2,
      price_per_night: '189.00',
      actual_check_in_at: null,
      actual_check_out_at: null,
      room: { id: 2, room_number: '202', floor: 2, status: 'available', room_type_id: 2 },
      room_type: { id: 2, name: 'Deluxe Suite', base_price: '189.00', capacity_adults: 2, capacity_children: 1 },
    },
  ],
}

function renderDetail(initialEntries = ['/bookings/12']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/bookings" element={<div>MY_BOOKINGS</div>} />
        <Route path="/bookings/:id" element={<BookingDetail />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('BookingDetail page', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(apiClient)
  })

  afterEach(() => {
    mock.restore()
  })

  it('renders the booking details for a pending booking', async () => {
    mock.onGet('/customer/bookings/12').reply(200, { success: true, data: baseBooking })
    renderDetail()
    expect(await screen.findByText('BK-ABCD1234')).toBeInTheDocument()
    expect(screen.getByText('Pending payment')).toBeInTheDocument()
    expect(screen.getAllByText('556.00').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('2 nights')).toBeInTheDocument()
    expect(screen.getByText(/Room 101/)).toBeInTheDocument()
    expect(screen.getByText(/Room 202/)).toBeInTheDocument()
    expect(screen.getByText('Payment deadline')).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Continue to Payment' })).toHaveAttribute(
      'href',
      '/payments/new/12',
    )
    expect(screen.getByRole('button', { name: 'Cancel booking' })).toBeInTheDocument()
  })

  it('links straight to View Payment when the booking response carries a payment - no payments-list lookup (B2)', async () => {
    // The payment pre-dates the 15 most recent payments and would NOT appear
    // on page 1 of the old list lookup - the B2 regression being guarded.
    const payment = {
      id: 7,
      booking_id: 12,
      method: 'bank_transfer',
      status: 'pending',
      amount: '556.00',
      created_at: '2026-09-10T10:00:00.000000Z',
    }
    mock.onGet('/customer/bookings/12').reply(200, {
      success: true,
      data: { ...baseBooking, payment },
    })
    renderDetail()

    expect(await screen.findByRole('link', { name: 'View Payment' })).toHaveAttribute('href', '/payments/7')
    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Continue to Payment' })).not.toBeInTheDocument()

    // Never a paginated /customer/payments request - the payment comes from
    // the booking response itself.
    const listCalls = mock.history.get.filter((request) => request.url === '/customer/payments')
    expect(listCalls).toHaveLength(0)
  })

  it('shows Continue to Payment (create flow) when the booking has no payment yet', async () => {
    mock.onGet('/customer/bookings/12').reply(200, {
      success: true,
      data: { ...baseBooking, payment: null },
    })
    renderDetail()

    expect(await screen.findByRole('link', { name: 'Continue to Payment' })).toHaveAttribute(
      'href',
      '/payments/new/12',
    )
    expect(screen.queryByRole('link', { name: 'View Payment' })).not.toBeInTheDocument()
  })

  it('shows a loading state while fetching', () => {
    mock.onGet('/customer/bookings/12').reply(() => new Promise(() => {}))
    renderDetail()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('shows a friendly not-found state for a 404', async () => {
    mock.onGet('/customer/bookings/12').reply(404, { success: false, message: 'Booking not found.', errors: null })
    renderDetail()
    expect(await screen.findByText('The requested resource could not be found.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to my bookings' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it('shows an error state with retry for other failures', async () => {
    mock.onGet('/customer/bookings/12').reply(500, { success: false, message: 'Server error', errors: null })
    renderDetail()
    expect(await screen.findByText('Server error')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to my bookings' })).toBeInTheDocument()
  })

  it('hides cancel and payment for confirmed bookings', async () => {
    mock.onGet('/customer/bookings/12').reply(200, {
      success: true,
      data: { ...baseBooking, status: 'confirmed' },
    })
    renderDetail()
    expect(await screen.findByText('Confirmed')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancel booking' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Continue to Payment' })).not.toBeInTheDocument()
  })

  it('locks cancellation after the payment deadline has passed', async () => {
    mock.onGet('/customer/bookings/12').reply(200, {
      success: true,
      data: { ...baseBooking, payment_deadline_at: '2026-01-01T00:00:00.000000Z' },
    })
    renderDetail()
    expect(await screen.findByText(/payment deadline on this booking has passed/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancel booking' })).not.toBeInTheDocument()
  })

  it('cancels a booking with a reason and refreshes the details', async () => {
    let cancelled = false
    mock.onGet('/customer/bookings/12').reply(() => [
      200,
      {
        success: true,
        data: cancelled
          ? { ...baseBooking, status: 'cancelled', cancelled_at: '2026-09-14T11:00:00.000000Z', cancellation_reason: 'My trip changed' }
          : baseBooking,
      },
    ])
    mock.onPost('/customer/bookings/12/cancel').reply(() => {
      cancelled = true
      return [200, {
        success: true,
        message: 'Booking cancelled.',
        data: { ...baseBooking, status: 'cancelled', cancellation_reason: 'My trip changed' },
      }]
    })
    renderDetail()

    fireEvent.click(await screen.findByRole('button', { name: 'Cancel booking' }))
    expect(screen.getByText(/Cancel this booking\?/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/Reason \(optional\)/), { target: { value: 'My trip changed' } })
    fireEvent.click(screen.getByRole('button', { name: 'Yes, cancel booking' }))

    expect(await screen.findByText('Your booking has been cancelled.')).toBeInTheDocument()
    expect(screen.getAllByText('Cancelled').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('My trip changed')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancel booking' })).not.toBeInTheDocument()

    const cancelConfig = mock.history.post.find((request) => request.url === '/customer/bookings/12/cancel')
    expect(JSON.parse(cancelConfig.data)).toEqual({ reason: 'My trip changed' })
  })

  it('cancels a booking without a reason', async () => {
    let cancelled = false
    mock.onGet('/customer/bookings/12').reply(() => [
      200,
      {
        success: true,
        data: cancelled
          ? { ...baseBooking, status: 'cancelled', cancelled_at: '2026-09-14T11:00:00.000000Z' }
          : baseBooking,
      },
    ])
    mock.onPost('/customer/bookings/12/cancel').reply(() => {
      cancelled = true
      return [200, { success: true, message: 'Booking cancelled.', data: { ...baseBooking, status: 'cancelled' } }]
    })
    renderDetail()

    fireEvent.click(await screen.findByRole('button', { name: 'Cancel booking' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, cancel booking' }))

    expect(await screen.findByText('Your booking has been cancelled.')).toBeInTheDocument()
    expect(screen.getAllByText('Cancelled').length).toBeGreaterThanOrEqual(1)

    const cancelConfig = mock.history.post.find((request) => request.url === '/customer/bookings/12/cancel')
    expect(JSON.parse(cancelConfig.data)).toEqual({})
  })

  it('surfaces the server message when cancellation is rejected (409)', async () => {
    mock.onGet('/customer/bookings/12').reply(200, { success: true, data: baseBooking })
    mock
      .onPost('/customer/bookings/12/cancel')
      .reply(409, { success: false, message: 'Only pending payment bookings can be cancelled.', errors: null })
    renderDetail()

    fireEvent.click(await screen.findByRole('button', { name: 'Cancel booking' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, cancel booking' }))

    expect(await screen.findByText('Only pending payment bookings can be cancelled.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Yes, cancel booking' })).toBeInTheDocument()
  })

  it('shows the success banner when arriving from a freshly created booking', async () => {
    mock.onGet('/customer/bookings/12').reply(200, { success: true, data: baseBooking })
    renderDetail([{ pathname: '/bookings/12', state: { created: true, booking: baseBooking } }])
    expect(await screen.findByText('Your booking was created successfully')).toBeInTheDocument()
  })

  it('renders the transient discount banner from the create response', async () => {
    const discounted = {
      ...baseBooking,
      total_amount: '500.40',
      discount: {
        name: 'Extended Stay',
        percent_off: 10,
        total_after_discount: '500.40',
        saved_total: '55.60',
      },
    }
    mock.onGet('/customer/bookings/12').reply(200, { success: true, data: baseBooking })
    renderDetail([{ pathname: '/bookings/12', state: { created: true, booking: discounted } }])
    expect(await screen.findByText(/Discount applied: Extended Stay \(10% off\)/)).toBeInTheDocument()
    expect(screen.getByText('500.40')).toBeInTheDocument()
  })
})