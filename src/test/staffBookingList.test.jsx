import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MockAdapter from 'axios-mock-adapter'
import apiClient from '../api/client'
import BookingList from '../pages/staff/BookingList'

const bookings = [
  {
    id: 7,
    booking_number: 'BK-AAAA1111',
    customer: { id: 3, name: 'John Doe', email: 'john@example.com' },
    status: 'pending_payment',
    check_in_date: '2026-10-01T00:00:00.000000Z',
    check_out_date: '2026-10-03T00:00:00.000000Z',
    total_amount: '200.00',
  },
  {
    id: 8,
    booking_number: 'BK-BBBB2222',
    customer: { id: 4, name: 'Jane Roe', email: 'jane@example.com' },
    status: 'confirmed',
    check_in_date: '2026-10-04T00:00:00.000000Z',
    check_out_date: '2026-10-07T00:00:00.000000Z',
    total_amount: '450.00',
  },
]

const emptyMeta = { page: 1, per_page: 15, total: 0, last_page: 1 }

let mock

function lastListRequest() {
  return mock.history.get.findLast((request) => request.url === '/staff/bookings')
}

function renderPage(initialEntry = '/staff/bookings') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <BookingList />
    </MemoryRouter>,
  )
}

describe('Staff booking list page', () => {
  beforeEach(() => {
    mock = new MockAdapter(apiClient)
  })

  afterEach(() => {
    mock.restore()
  })

  it('shows a loading state while fetching', () => {
    mock.onGet('/staff/bookings').reply(() => new Promise(() => {}))
    renderPage()
    expect(screen.getByText('Bookings')).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders a list of booking cards', async () => {
    mock.onGet('/staff/bookings').reply(200, {
      success: true,
      data: bookings,
      meta: { page: 1, per_page: 15, total: 2, last_page: 1 },
    })
    renderPage()
    expect(await screen.findByText('BK-AAAA1111')).toBeInTheDocument()
    expect(screen.getByText('BK-BBBB2222')).toBeInTheDocument()
    expect(screen.getByText(/John Doe/)).toBeInTheDocument()
    expect(screen.getByText(/john@example\.com/)).toBeInTheDocument()
    expect(screen.getByText('Confirmed')).toBeInTheDocument()
  })

  it('calls the API with params derived from the URL search params', async () => {
    mock.onGet('/staff/bookings').reply(200, {
      success: true,
      data: bookings,
      meta: { page: 1, per_page: 15, total: 2, last_page: 1 },
    })
    renderPage('/staff/bookings?status=confirmed&from=2026-10-01&to=2026-10-05&search=John&page=2')
    await screen.findByText('BK-AAAA1111')
    expect(lastListRequest().params).toEqual({
      status: 'confirmed',
      from: '2026-10-01',
      to: '2026-10-05',
      search: 'John',
      page: 2,
    })
  })

  it('shows an empty state with filter hints when no bookings match', async () => {
    mock.onGet('/staff/bookings').reply(200, { success: true, data: [], meta: emptyMeta })
    renderPage('/staff/bookings?status=confirmed')
    expect(await screen.findByText('No bookings found')).toBeInTheDocument()
    expect(screen.getByText('No bookings match your filters.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear all filters' })).toBeInTheDocument()
  })

  it('shows an empty state without filter actions when there are no filters', async () => {
    mock.onGet('/staff/bookings').reply(200, { success: true, data: [], meta: emptyMeta })
    renderPage()
    expect(await screen.findByText('No bookings found')).toBeInTheDocument()
    expect(screen.getByText('There are no bookings yet.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Clear all filters' })).not.toBeInTheDocument()
  })

  it('renders pagination when there is more than one page', async () => {
    mock.onGet('/staff/bookings').reply(200, {
      success: true,
      data: bookings,
      meta: { page: 1, per_page: 15, total: 24, last_page: 2 },
    })
    renderPage()
    expect(await screen.findByText('BK-AAAA1111')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument()
  })

  it('updates the status filter in the URL and refetches', async () => {
    mock.onGet('/staff/bookings').reply(() => [
      200,
      { success: true, data: bookings, meta: { page: 1, per_page: 15, total: 2, last_page: 1 } },
    ])
    renderPage()
    fireEvent.change(await screen.findByLabelText('Status'), { target: { value: 'confirmed' } })
    await waitFor(() => {
      expect(lastListRequest().params).toEqual({ status: 'confirmed', page: 1 })
    })
  })

  it('updates the search filter in the URL after debounce', async () => {
    mock.onGet('/staff/bookings').reply(() => [
      200,
      { success: true, data: bookings, meta: { page: 1, per_page: 15, total: 2, last_page: 1 } },
    ])
    renderPage()
    fireEvent.change(await screen.findByPlaceholderText('Search by booking #, name, or email'), {
      target: { value: 'John' },
    })
    await waitFor(
      () => {
        expect(lastListRequest().params).toEqual({ search: 'John', page: 1 })
      },
      { timeout: 1500, interval: 50 },
    )
  })

  it('updates the date range filters in the URL on blur', async () => {
    mock.onGet('/staff/bookings').reply(() => [
      200,
      { success: true, data: bookings, meta: { page: 1, per_page: 15, total: 2, last_page: 1 } },
    ])
    renderPage()
    const from = await screen.findByLabelText('Check-in from')
    fireEvent.change(from, { target: { value: '2026-10-01' } })
    fireEvent.blur(from)
    const to = screen.getByLabelText('Check-out to')
    fireEvent.change(to, { target: { value: '2026-10-05' } })
    fireEvent.blur(to)
    await waitFor(() => {
      expect(lastListRequest().params).toEqual({ from: '2026-10-01', to: '2026-10-05', page: 1 })
    })
  })

  it('clears all filters from the empty state', async () => {
    mock.onGet('/staff/bookings').reply(() => [
      200,
      { success: true, data: [], meta: emptyMeta },
    ])
    renderPage('/staff/bookings?status=confirmed&search=John')
    fireEvent.click(await screen.findByRole('button', { name: 'Clear all filters' }))
    await waitFor(() => {
      expect(lastListRequest().params).toEqual({ page: 1 })
    })
  })

  it('shows an error state with a retry button on failure', async () => {
    let attempts = 0
    mock.onGet('/staff/bookings').reply(() => {
      attempts += 1
      if (attempts === 1) return [500, { success: false, message: 'Server error', errors: null }]
      return [200, { success: true, data: bookings, meta: { page: 1, per_page: 15, total: 2, last_page: 1 } }]
    })
    renderPage()
    expect(await screen.findByText('Server error')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('BK-AAAA1111')).toBeInTheDocument()
  })
})