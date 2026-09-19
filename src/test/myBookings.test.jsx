import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import MockAdapter from 'axios-mock-adapter'
import apiClient from '../api/client'
import MyBookings from '../pages/customer/MyBookings'

const bookings = [
  {
    id: 1,
    booking_number: 'BK-AAAA1111',
    status: 'pending_payment',
    check_in_date: '2026-09-16T00:00:00.000000Z',
    check_out_date: '2026-09-18T00:00:00.000000Z',
    total_amount: '200.00',
  },
  {
    id: 2,
    booking_number: 'BK-BBBB2222',
    status: 'confirmed',
    check_in_date: '2026-10-01T00:00:00.000000Z',
    check_out_date: '2026-10-05T00:00:00.000000Z',
    total_amount: '800.00',
  },
]

function renderPage(initialEntry = '/bookings') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/bookings" element={<MyBookings />} />
        <Route path="/bookings/:id" element={<div data-testid="detail-target">{'{id}'}</div>} />
        <Route path="/rooms" element={<div>ROOMS_PAGE</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('MyBookings page', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(apiClient)
  })

  afterEach(() => {
    mock.restore()
  })

  it('renders the bookings and their statuses', async () => {
    mock.onGet('/customer/bookings').reply(200, {
      success: true,
      data: bookings,
      meta: { page: 1, per_page: 15, total: 2, last_page: 1 },
    })
    renderPage()
    expect(screen.getByText('My bookings')).toBeInTheDocument()
    expect(await screen.findByText('BK-AAAA1111')).toBeInTheDocument()
    expect(screen.getByText('BK-BBBB2222')).toBeInTheDocument()
    expect(screen.getByText('Pending payment')).toBeInTheDocument()
    expect(screen.getByText('Confirmed')).toBeInTheDocument()
  })

  it('shows a loading state while fetching', () => {
    mock.onGet('/customer/bookings').reply(() => new Promise(() => {}))
    renderPage()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('shows an empty state with a browse link when there are no bookings', async () => {
    mock.onGet('/customer/bookings').reply(200, {
      success: true,
      data: [],
      meta: { page: 1, per_page: 15, total: 0, last_page: 1 },
    })
    renderPage()
    expect(await screen.findByText(/No bookings found/)).toBeInTheDocument()
    fireEvent.click(screen.getByText('Browse rooms'))
    expect(await screen.findByText('ROOMS_PAGE')).toBeInTheDocument()
  })

  it('shows an error state when the list fails', async () => {
    mock.onGet('/customer/bookings').reply(500, { success: false, message: 'Server error', errors: null })
    renderPage()
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  it('updates the status filter in the URL and refetches', async () => {
    mock.onGet('/customer/bookings').reply(200, {
      success: true,
      data: bookings,
      meta: { page: 1, per_page: 15, total: 2, last_page: 1 },
    })
    renderPage()
    fireEvent.change(await screen.findByLabelText('Status'), { target: { value: 'pending_payment' } })
    await waitFor(() => {
      const config = mock.history.get.filter((request) => request.url === '/customer/bookings').at(-1)
      expect(config.params).toEqual({ status: 'pending_payment', page: 1 })
    })
  })

  it('paginates through the results', async () => {
    mock.onGet('/customer/bookings').reply(200, {
      success: true,
      data: bookings,
      meta: { page: 1, per_page: 15, total: 2, last_page: 2 },
    })
    renderPage()
    fireEvent.click(await screen.findByText('Next'))
    await waitFor(() => {
      const config = mock.history.get.filter((request) => request.url === '/customer/bookings').at(-1)
      expect(config.params).toEqual({ page: 2 })
    })
  })

  it('navigates to a booking detail on card click', async () => {
    mock.onGet('/customer/bookings').reply(200, {
      success: true,
      data: bookings,
      meta: { page: 1, per_page: 15, total: 2, last_page: 1 },
    })
    renderPage()
    fireEvent.click(await screen.findByText('BK-AAAA1111'))
    expect(await screen.findByTestId('detail-target')).toBeInTheDocument()
  })
})