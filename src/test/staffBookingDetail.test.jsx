import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import MockAdapter from 'axios-mock-adapter'
import apiClient from '../api/client'
import BookingDetail from '../pages/staff/BookingDetail'

const baseBooking = {
  id: 12,
  booking_number: 'BK-ABCD1234',
  customer_id: 3,
  customer: { id: 3, name: 'John Doe', email: 'john@example.com' },
  status: 'pending_payment',
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
  ],
}

function renderDetail() {
  return render(
    <MemoryRouter initialEntries={['/staff/bookings/12']}>
      <Routes>
        <Route path="/staff/bookings" element={<div>BOOKINGS_LIST</div>} />
        <Route path="/staff/bookings/:id" element={<BookingDetail />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Staff booking detail page', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(apiClient)
  })

  afterEach(() => {
    mock.restore()
  })

  it('shows a loading state while fetching', () => {
    mock.onGet('/staff/bookings/12').reply(() => new Promise(() => {}))
    renderDetail()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('shows a friendly not-found state for a 404', async () => {
    mock.onGet('/staff/bookings/12').reply(404, { success: false, message: 'Booking not found.', errors: null })
    renderDetail()
    expect(await screen.findByText('The requested resource could not be found.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to bookings' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it('shows an error state with retry for other failures', async () => {
    let attempts = 0
    mock.onGet('/staff/bookings/12').reply(() => {
      attempts += 1
      if (attempts === 1) return [500, { success: false, message: 'Server error', errors: null }]
      return [200, { success: true, data: baseBooking }]
    })
    renderDetail()
    expect(await screen.findByText('Server error')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('BK-ABCD1234')).toBeInTheDocument()
  })

  it('renders the booking number, status, and customer details', async () => {
    mock.onGet('/staff/bookings/12').reply(200, { success: true, data: baseBooking })
    renderDetail()
    expect(await screen.findByText('BK-ABCD1234')).toBeInTheDocument()
    expect(screen.getByText('Pending payment')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
  })

  it('renders the room lines with room number, type, and price', async () => {
    mock.onGet('/staff/bookings/12').reply(200, { success: true, data: baseBooking })
    renderDetail()
    expect(await screen.findByText(/Room 101 · Standard Room/)).toBeInTheDocument()
    expect(screen.getByText('Floor 1')).toBeInTheDocument()
    expect(screen.getByText('89.00', { selector: 'span' })).toBeInTheDocument()
    expect(screen.getAllByText('/ night').length).toBeGreaterThanOrEqual(1)
  })

  it('shows dates, nights, total, and payment deadline', async () => {
    mock.onGet('/staff/bookings/12').reply(200, { success: true, data: baseBooking })
    renderDetail()
    expect(await screen.findByText('Booking summary')).toBeInTheDocument()
    expect(screen.getByText('Check-in')).toBeInTheDocument()
    expect(screen.getByText('Check-out')).toBeInTheDocument()
    expect(screen.getByText('2 nights')).toBeInTheDocument()
    expect(screen.getAllByText('556.00').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('Payment deadline')).toBeInTheDocument()
  })

  it('shows cancellation details for a cancelled booking', async () => {
    mock.onGet('/staff/bookings/12').reply(200, {
      success: true,
      data: {
        ...baseBooking,
        status: 'cancelled',
        cancelled_at: '2026-09-14T11:00:00.000000Z',
        cancellation_reason: 'Guest had to cancel',
      },
    })
    renderDetail()
    expect(await screen.findByText('This booking was cancelled.')).toBeInTheDocument()
    expect(screen.getByText('Guest had to cancel')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Confirm booking' })).not.toBeInTheDocument()
  })

  it('shows no-show details for a no_show booking', async () => {
    mock.onGet('/staff/bookings/12').reply(200, {
      success: true,
      data: { ...baseBooking, status: 'no_show', no_show_at: '2026-09-20T10:00:00.000000Z' },
    })
    renderDetail()
    expect(await screen.findByText('This guest did not check in.')).toBeInTheDocument()
    expect(screen.getByText('No-show')).toBeInTheDocument()
  })

  it('shows the late cancellation fee when present', async () => {
    mock.onGet('/staff/bookings/12').reply(200, {
      success: true,
      data: {
        ...baseBooking,
        status: 'cancelled',
        cancelled_at: '2026-09-13T09:00:00.000000Z',
        late_fee_amount: '178.00',
        late_fee_applied_at: '2026-09-13T09:00:00.000000Z',
      },
    })
    renderDetail()
    expect(await screen.findByText('Late cancellation fee')).toBeInTheDocument()
    expect(screen.getByText('178.00')).toBeInTheDocument()
  })

  it('shows no late fee when absent', async () => {
    mock.onGet('/staff/bookings/12').reply(200, { success: true, data: baseBooking })
    renderDetail()
    await screen.findByText('BK-ABCD1234')
    expect(screen.queryByText('Late cancellation fee')).not.toBeInTheDocument()
  })

  it('shows only confirm and cancel actions for pending bookings', async () => {
    mock.onGet('/staff/bookings/12').reply(200, { success: true, data: baseBooking })
    renderDetail()
    expect(await screen.findByRole('button', { name: 'Confirm booking' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel booking' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Check in guest' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Check out guest' })).not.toBeInTheDocument()
  })

  it('shows an enabled check-in action for confirmed bookings on or after the check-in date', async () => {
    mock.onGet('/staff/bookings/12').reply(200, {
      success: true,
      data: { ...baseBooking, status: 'confirmed', check_in_date: '2026-09-01T00:00:00.000000Z' },
    })
    renderDetail()
    expect(await screen.findByRole('button', { name: 'Check in guest' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Cancel booking' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Confirm booking' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Check out guest' })).not.toBeInTheDocument()
  })

  it('disables check-in when the check-in date is in the future', async () => {
    mock.onGet('/staff/bookings/12').reply(200, {
      success: true,
      data: { ...baseBooking, status: 'confirmed', check_in_date: '2026-12-01T00:00:00.000000Z' },
    })
    renderDetail()
    expect(await screen.findByRole('button', { name: 'Check in guest' })).toBeDisabled()
    expect(screen.getByText(/Check-in is only allowed on or after/)).toBeInTheDocument()
  })

  it('shows only the check-out action for checked-in bookings', async () => {
    mock.onGet('/staff/bookings/12').reply(200, { success: true, data: { ...baseBooking, status: 'checked_in' } })
    renderDetail()
    expect(await screen.findByRole('button', { name: 'Check out guest' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Confirm booking' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancel booking' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Check in guest' })).not.toBeInTheDocument()
  })

  it('shows a terminal message for checked-out bookings without action buttons', async () => {
    mock.onGet('/staff/bookings/12').reply(200, { success: true, data: { ...baseBooking, status: 'checked_out' } })
    renderDetail()
    expect(await screen.findByText('This booking is complete.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Check out guest' })).not.toBeInTheDocument()
  })

  it('shows a terminal message for cancelled bookings without action buttons', async () => {
    mock.onGet('/staff/bookings/12').reply(200, { success: true, data: { ...baseBooking, status: 'cancelled' } })
    renderDetail()
    expect(await screen.findByText('This booking was cancelled.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancel booking' })).not.toBeInTheDocument()
  })

  it('shows a terminal message for no-show bookings without action buttons', async () => {
    mock.onGet('/staff/bookings/12').reply(200, { success: true, data: { ...baseBooking, status: 'no_show' } })
    renderDetail()
    expect(await screen.findByText('This guest did not check in.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Check in guest' })).not.toBeInTheDocument()
  })

  it('confirms a booking and refetches the details', async () => {
    let status = 'pending_payment'
    mock.onGet('/staff/bookings/12').reply(() => [200, { success: true, data: { ...baseBooking, status } }])
    mock.onPost('/staff/bookings/12/confirm').reply(() => {
      status = 'confirmed'
      return [200, { success: true, message: 'Booking confirmed.', data: { ...baseBooking, status } }]
    })
    renderDetail()
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm booking' }))
    expect(await screen.findByText('Booking confirmed.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Confirm booking' })).not.toBeInTheDocument()
    const config = mock.history.post.find((request) => request.url === '/staff/bookings/12/confirm')
    expect(config).toBeDefined()
  })

  it('cancels a booking with a reason and refetches the details', async () => {
    let status = 'pending_payment'
    mock.onGet('/staff/bookings/12').reply(() => [
      200,
      {
        success: true,
        data: {
          ...baseBooking,
          status,
          cancelled_at: status === 'cancelled' ? '2026-09-14T11:00:00.000000Z' : null,
          cancellation_reason: status === 'cancelled' ? 'Guest requested' : null,
        },
      },
    ])
    mock.onPost('/staff/bookings/12/cancel').reply(() => {
      status = 'cancelled'
      return [200, { success: true, message: 'Booking cancelled.', data: { ...baseBooking, status } }]
    })
    renderDetail()
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel booking' }))
    expect(screen.getByText(/Cancel this booking\?/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/Reason \(optional\)/), { target: { value: 'Guest requested' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirm cancellation' }))
    expect(await screen.findByText('Booking cancelled.')).toBeInTheDocument()
    expect(screen.getAllByText('This booking was cancelled.').length).toBeGreaterThanOrEqual(1)
    const config = mock.history.post.find((request) => request.url === '/staff/bookings/12/cancel')
    expect(JSON.parse(config.data)).toEqual({ reason: 'Guest requested' })
  })

  it('cancels a booking without a reason', async () => {
    let status = 'pending_payment'
    mock.onGet('/staff/bookings/12').reply(() => [200, { success: true, data: { ...baseBooking, status } }])
    mock.onPost('/staff/bookings/12/cancel').reply(() => {
      status = 'cancelled'
      return [200, { success: true, message: 'Booking cancelled.', data: { ...baseBooking, status } }]
    })
    renderDetail()
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel booking' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm cancellation' }))
    await screen.findByText('Booking cancelled.')
    const config = mock.history.post.find((request) => request.url === '/staff/bookings/12/cancel')
    expect(JSON.parse(config.data)).toEqual({})
  })

  it('keeps the booking when the cancel form is dismissed', async () => {
    mock.onGet('/staff/bookings/12').reply(200, { success: true, data: baseBooking })
    renderDetail()
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel booking' }))
    expect(screen.getByText(/Cancel this booking\?/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Keep booking' }))
    expect(screen.queryByText(/Cancel this booking\?/)).not.toBeInTheDocument()
    expect(mock.history.post.some((request) => request.url === '/staff/bookings/12/cancel')).toBe(false)
  })

  it('checks in a guest and refetches the details', async () => {
    let status = 'confirmed'
    mock
      .onGet('/staff/bookings/12')
      .reply(() => [200, { success: true, data: { ...baseBooking, status, check_in_date: '2026-09-01T00:00:00.000000Z' } }])
    mock.onPost('/staff/bookings/12/check-in').reply(() => {
      status = 'checked_in'
      return [200, { success: true, message: 'Guest checked in.', data: { ...baseBooking, status } }]
    })
    renderDetail()
    fireEvent.click(await screen.findByRole('button', { name: 'Check in guest' }))
    expect(await screen.findByText('Guest checked in.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Check out guest' })).toBeInTheDocument()
    const config = mock.history.post.find((request) => request.url === '/staff/bookings/12/check-in')
    expect(config).toBeDefined()
  })

  it('checks out a guest and refetches the details', async () => {
    let status = 'checked_in'
    mock.onGet('/staff/bookings/12').reply(() => [200, { success: true, data: { ...baseBooking, status } }])
    mock.onPost('/staff/bookings/12/check-out').reply(() => {
      status = 'checked_out'
      return [200, { success: true, message: 'Guest checked out.', data: { ...baseBooking, status } }]
    })
    renderDetail()
    fireEvent.click(await screen.findByRole('button', { name: 'Check out guest' }))
    expect(await screen.findByText('Guest checked out.')).toBeInTheDocument()
    expect(screen.getByText('This booking is complete.')).toBeInTheDocument()
    const config = mock.history.post.find((request) => request.url === '/staff/bookings/12/check-out')
    expect(config).toBeDefined()
  })

  it('surfaces the server message when an action is rejected with 409', async () => {
    mock.onGet('/staff/bookings/12').reply(200, { success: true, data: baseBooking })
    mock
      .onPost('/staff/bookings/12/confirm')
      .reply(409, { success: false, message: 'This booking was already confirmed.', errors: null })
    renderDetail()
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm booking' }))
    expect(await screen.findByText('This booking was already confirmed.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm booking' })).toBeInTheDocument()
  })
})