import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import MockAdapter from 'axios-mock-adapter'
import apiClient from '../api/client'
import BookingCheckout from '../pages/customer/BookingCheckout'
import BookingDetail from '../pages/customer/BookingDetail'

const room101 = { id: 1, room_number: '101', floor: 1, status: 'available', room_type_id: 1, price_per_night: '89.00' }
const room202 = { id: 2, room_number: '202', floor: 2, status: 'available', room_type_id: 2, price_per_night: '189.00' }

const booking = {
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

const QUERY = 'check_in=2026-09-16&check_out=2026-09-18&rooms=1,2'

function renderPage(query = QUERY) {
  return render(
    <MemoryRouter initialEntries={[`/book?${query}`]}>
      <Routes>
        <Route path="/book" element={<BookingCheckout />} />
        <Route path="/bookings/:id" element={<BookingDetail />} />
        <Route path="/availability" element={<div>AVAIL_PAGE</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('BookingCheckout page', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(apiClient)
  })

  afterEach(() => {
    mock.restore()
  })

  it('rechecks availability and shows the server-priced summary for valid params', async () => {
    mock.onPost('/public/availability').reply(200, { success: true, data: [room101, room202] })
    renderPage()
    expect(screen.getByText('Review your booking')).toBeInTheDocument()
    expect(await screen.findByText('Room 101')).toBeInTheDocument()
    expect(screen.getByText('Room 202')).toBeInTheDocument()
    expect(screen.getByText('556.00')).toBeInTheDocument()
  })

  it('shows an empty-intent state for missing or invalid parameters', () => {
    renderPage('rooms=')
    expect(screen.getByText('We need a few more details')).toBeInTheDocument()
  })

  it('shows an empty-intent state for an invalid date range', () => {
    renderPage('check_in=2026-09-16&check_out=2026-09-16&rooms=1')
    expect(screen.getByText('We need a few more details')).toBeInTheDocument()
  })

  it('shows a loading state while availability is rechecked', () => {
    mock.onPost('/public/availability').reply(() => new Promise(() => {}))
    renderPage()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('shows a notice and confirms only the still-available rooms', async () => {
    mock.onPost('/public/availability').reply(200, { success: true, data: [room101] })
    renderPage()
    expect(await screen.findByText(/1 room is no longer available/)).toBeInTheDocument()
    expect(screen.getByText('Confirm booking (1 room)')).toBeInTheDocument()
  })

  it('shows an empty state when no rooms are available anymore', async () => {
    mock.onPost('/public/availability').reply(200, { success: true, data: [] })
    renderPage()
    expect(await screen.findByText('No rooms available')).toBeInTheDocument()
  })

  it('shows an error state when the availability recheck fails', async () => {
    mock.onPost('/public/availability').reply(500, { success: false, message: 'Server error', errors: null })
    renderPage()
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  it('creates the booking with the confirmed rooms and navigates to the detail page', async () => {
    mock.onPost('/public/availability').reply(200, { success: true, data: [room101, room202] })
    mock.onPost('/customer/bookings').reply(201, { success: true, message: 'Booking created.', data: booking })
    mock.onGet('/customer/bookings/12').reply(200, { success: true, data: booking })
    renderPage()
    fireEvent.click(await screen.findByText('Confirm booking (2 rooms)'))

    expect(await screen.findByText('BK-ABCD1234')).toBeInTheDocument()
    expect(screen.getByText('Your booking was created successfully')).toBeInTheDocument()

    const createConfig = mock.history.post.find((request) => request.url === '/customer/bookings')
    expect(createConfig).toBeTruthy()
    expect(JSON.parse(createConfig.data)).toEqual({
      check_in_date: '2026-09-16',
      check_out_date: '2026-09-18',
      rooms: [1, 2],
    })
  })

  it('uses the server response as the source of truth for the total', async () => {
    mock.onPost('/public/availability').reply(200, { success: true, data: [room101, room202] })
    renderPage()
    expect(await screen.findByText('556.00')).toBeInTheDocument()
  })

  it('shows the 409 conflict message and stays on the page', async () => {
    mock.onPost('/public/availability').reply(200, { success: true, data: [room101] })
    mock
      .onPost('/customer/bookings')
      .reply(409, { success: false, message: 'One or more requested rooms are not available for the selected dates.', errors: null })
    renderPage()
    fireEvent.click(await screen.findByText(/Confirm booking/))
    expect(
      await screen.findByText('One or more requested rooms are not available for the selected dates.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Review your booking')).toBeInTheDocument()
  })

  it('shows validation field errors from a 422 response', async () => {
    mock.onPost('/public/availability').reply(200, { success: true, data: [room101] })
    mock.onPost('/customer/bookings').reply(422, {
      success: false,
      message: 'The given data was invalid.',
      errors: { check_in_date: ['The check in date must be a date after or equal to today.'] },
    })
    renderPage()
    fireEvent.click(await screen.findByText(/Confirm booking/))
    expect(await screen.findByText('The check in date must be a date after or equal to today.')).toBeInTheDocument()
  })

  it('shows a friendly message when the session is expired (401)', async () => {
    mock.onPost('/public/availability').reply(200, { success: true, data: [room101] })
    mock.onPost('/customer/bookings').reply(401, { success: false, message: 'Unauthenticated.', errors: null })
    renderPage()
    fireEvent.click(await screen.findByText(/Confirm booking/))
    expect(await screen.findByText('Your session has expired. Please sign in again.')).toBeInTheDocument()
  })

  it('prevents duplicate submission while a request is in flight', async () => {
    mock.onPost('/public/availability').reply(200, { success: true, data: [room101] })
    mock.onPost('/customer/bookings').reply(() => new Promise(() => {}))
    renderPage()
    const submit = await screen.findByText(/Confirm booking/)
    fireEvent.click(submit)
    fireEvent.click(submit)
    await waitFor(() => {
      expect(mock.history.post.filter((request) => request.url === '/customer/bookings').length).toBe(1)
    })
  })
})