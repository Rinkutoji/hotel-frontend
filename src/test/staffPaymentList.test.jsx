import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MockAdapter from 'axios-mock-adapter'
import apiClient from '../api/client'
import PaymentList from '../pages/staff/PaymentList'

const payments = [
  {
    id: 1,
    booking_id: 7,
    amount: '1500.00',
    method: 'bank_transfer',
    status: 'pending',
    created_at: '2026-09-14T10:00:00.000000Z',
    updated_at: '2026-09-14T10:00:00.000000Z',
    booking: {
      id: 7,
      booking_number: 'BK-AAAA1111',
      customer: { id: 3, name: 'John Doe', email: 'john@example.com' },
    },
  },
  {
    id: 2,
    booking_id: 8,
    amount: '2000.00',
    method: 'cash',
    status: 'receipt_uploaded',
    created_at: '2026-09-14T11:00:00.000000Z',
    updated_at: '2026-09-14T11:00:00.000000Z',
    booking: {
      id: 8,
      booking_number: 'BK-BBBB2222',
      customer: { id: 4, name: 'Jane Roe', email: 'jane@example.com' },
    },
  },
]

const emptyMeta = { page: 1, per_page: 15, total: 0, last_page: 1 }

let mock

function lastListRequest() {
  return mock.history.get.findLast((request) => request.url === '/staff/payments')
}

function renderPage(initialEntry = '/staff/payments') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <PaymentList />
    </MemoryRouter>,
  )
}

describe('Staff payment list page', () => {
  beforeEach(() => {
    mock = new MockAdapter(apiClient)
  })

  afterEach(() => {
    mock.restore()
  })

  it('shows a loading state while fetching', () => {
    mock.onGet('/staff/payments').reply(() => new Promise(() => {}))
    renderPage()
    expect(screen.getByText('Payments')).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders a list of payment cards', async () => {
    mock.onGet('/staff/payments').reply(200, {
      success: true,
      data: payments,
      meta: { page: 1, per_page: 15, total: 2, last_page: 1 },
    })
    renderPage()
    expect(await screen.findByText('BK-AAAA1111')).toBeInTheDocument()
    expect(screen.getByText('BK-BBBB2222')).toBeInTheDocument()
    expect(screen.getByText(/John Doe/)).toBeInTheDocument()
    expect(screen.getByText(/john@example\.com/)).toBeInTheDocument()
    expect(screen.getByText(/Bank transfer/)).toBeInTheDocument()
  })

  it('calls the API with params derived from the URL search params', async () => {
    mock.onGet('/staff/payments').reply(200, {
      success: true,
      data: payments,
      meta: { page: 1, per_page: 15, total: 2, last_page: 1 },
    })
    renderPage('/staff/payments?status=receipt_uploaded&search=John&page=2')
    await screen.findByText('BK-AAAA1111')
    expect(lastListRequest().params).toEqual({
      status: 'receipt_uploaded',
      search: 'John',
      page: 2,
    })
  })

  it('shows an empty state with filter hints when no payments match', async () => {
    mock.onGet('/staff/payments').reply(200, { success: true, data: [], meta: emptyMeta })
    renderPage('/staff/payments?status=rejected')
    expect(await screen.findByText('No payments found')).toBeInTheDocument()
    expect(screen.getByText('No payments match your filters.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear all filters' })).toBeInTheDocument()
  })

  it('shows an empty state without filter actions when there are no filters', async () => {
    mock.onGet('/staff/payments').reply(200, { success: true, data: [], meta: emptyMeta })
    renderPage()
    expect(await screen.findByText('No payments found')).toBeInTheDocument()
    expect(screen.getByText('There are no payments yet.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Clear all filters' })).not.toBeInTheDocument()
  })

  it('renders pagination when there is more than one page', async () => {
    mock.onGet('/staff/payments').reply(200, {
      success: true,
      data: payments,
      meta: { page: 1, per_page: 15, total: 24, last_page: 2 },
    })
    renderPage()
    expect(await screen.findByText('BK-AAAA1111')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument()
  })

  it('updates the status filter in the URL and refetches', async () => {
    mock.onGet('/staff/payments').reply(() => [
      200,
      { success: true, data: payments, meta: { page: 1, per_page: 15, total: 2, last_page: 1 } },
    ])
    renderPage()
    fireEvent.change(await screen.findByLabelText('Status'), { target: { value: 'verified' } })
    await waitFor(() => {
      expect(lastListRequest().params).toEqual({ status: 'verified', page: 1 })
    })
  })

  it('updates the search filter in the URL after debounce', async () => {
    mock.onGet('/staff/payments').reply(() => [
      200,
      { success: true, data: payments, meta: { page: 1, per_page: 15, total: 2, last_page: 1 } },
    ])
    renderPage()
    fireEvent.change(await screen.findByPlaceholderText('Search by booking #, name, or email'), {
      target: { value: 'Jane' },
    })
    await waitFor(
      () => {
        expect(lastListRequest().params).toEqual({ search: 'Jane', page: 1 })
      },
      { timeout: 1500, interval: 50 },
    )
  })

  it('clears all filters from the empty state', async () => {
    mock.onGet('/staff/payments').reply(() => [
      200,
      { success: true, data: [], meta: emptyMeta },
    ])
    renderPage('/staff/payments?status=verified&search=John')
    fireEvent.click(await screen.findByRole('button', { name: 'Clear all filters' }))
    await waitFor(() => {
      expect(lastListRequest().params).toEqual({ page: 1 })
    })
  })

  it('shows an error state with a retry button on failure', async () => {
    let attempts = 0
    mock.onGet('/staff/payments').reply(() => {
      attempts += 1
      if (attempts === 1) return [500, { success: false, message: 'Server error', errors: null }]
      return [200, { success: true, data: payments, meta: { page: 1, per_page: 15, total: 2, last_page: 1 } }]
    })
    renderPage()
    expect(await screen.findByText('Server error')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('BK-AAAA1111')).toBeInTheDocument()
  })

  it('renders the status badge for each payment', async () => {
    mock.onGet('/staff/payments').reply(200, {
      success: true,
      data: payments,
      meta: { page: 1, per_page: 15, total: 2, last_page: 1 },
    })
    renderPage()
    await screen.findByText('BK-AAAA1111')
    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.getByText('Receipt Uploaded')).toBeInTheDocument()
  })
})