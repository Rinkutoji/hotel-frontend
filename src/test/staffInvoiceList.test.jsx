import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MockAdapter from 'axios-mock-adapter'
import apiClient from '../api/client'
import InvoiceList from '../pages/staff/InvoiceList'

const invoices = [
  {
    id: 9,
    invoice_number: 'INV-AAAA1111',
    total_amount: '200.00',
    issued_at: '2026-09-09T10:00:00.000000Z',
    payment: {
      id: 7,
      status: 'verified',
      booking_id: 3,
      booking: {
        id: 3,
        booking_number: 'BK-AAAA9999',
        customer: { id: 5, name: 'John Doe', email: 'john@example.com' },
      },
    },
  },
  {
    id: 10,
    invoice_number: 'INV-BBBB2222',
    total_amount: '1500.00',
    issued_at: '2026-09-14T09:00:00.000000Z',
    payment: {
      id: 8,
      status: 'refunded',
      booking_id: 4,
      booking: {
        id: 4,
        booking_number: 'BK-BBBB8888',
        customer: { id: 6, name: 'Jane Roe', email: 'jane@example.com' },
      },
    },
  },
]

const emptyMeta = { page: 1, per_page: 15, total: 0, last_page: 1 }

let mock

function lastListRequest() {
  return mock.history.get.findLast((request) => request.url === '/staff/invoices')
}

function renderPage(initialEntry = '/staff/invoices') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <InvoiceList />
    </MemoryRouter>,
  )
}

describe('Staff invoice list page', () => {
  beforeEach(() => {
    mock = new MockAdapter(apiClient)
  })

  afterEach(() => {
    mock.restore()
  })

  it('shows a loading state while fetching', () => {
    mock.onGet('/staff/invoices').reply(() => new Promise(() => {}))
    renderPage()
    expect(screen.getByText('Invoices')).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders a list of invoice cards', async () => {
    mock.onGet('/staff/invoices').reply(200, {
      success: true,
      data: invoices,
      meta: { page: 1, per_page: 15, total: 2, last_page: 1 },
    })
    renderPage()
    expect(await screen.findByText('INV-AAAA1111')).toBeInTheDocument()
    expect(screen.getByText('INV-BBBB2222')).toBeInTheDocument()
    expect(screen.getByText(/BK-AAAA9999/)).toBeInTheDocument()
    expect(screen.getByText(/John Doe/)).toBeInTheDocument()
    expect(screen.getByText(/john@example\.com/)).toBeInTheDocument()
  })

  it('calls the API with params derived from the URL search params', async () => {
    mock.onGet('/staff/invoices').reply(200, {
      success: true,
      data: invoices,
      meta: { page: 1, per_page: 15, total: 2, last_page: 1 },
    })
    renderPage('/staff/invoices?search=John&page=2')
    await screen.findByText('INV-AAAA1111')
    expect(lastListRequest().params).toEqual({
      search: 'John',
      page: 2,
    })
  })

  it('never forwards a status filter from the URL', async () => {
    mock.onGet('/staff/invoices').reply(200, {
      success: true,
      data: [],
      meta: emptyMeta,
    })
    renderPage('/staff/invoices?status=verified&search=John')
    await screen.findByText('No invoices found')
    const params = lastListRequest().params
    expect(params.search).toBe('John')
    expect(params.status).toBeUndefined()
  })

  it('shows an empty state with filter hints when no invoices match', async () => {
    mock.onGet('/staff/invoices').reply(200, { success: true, data: [], meta: emptyMeta })
    renderPage('/staff/invoices?search=zzz')
    expect(await screen.findByText('No invoices found')).toBeInTheDocument()
    expect(screen.getByText('No invoices match your filters.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear all filters' })).toBeInTheDocument()
  })

  it('shows an empty state without filter actions when there are no filters', async () => {
    mock.onGet('/staff/invoices').reply(200, { success: true, data: [], meta: emptyMeta })
    renderPage()
    expect(await screen.findByText('No invoices found')).toBeInTheDocument()
    expect(screen.getByText('There are no invoices yet.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Clear all filters' })).not.toBeInTheDocument()
  })

  it('renders pagination when there is more than one page', async () => {
    mock.onGet('/staff/invoices').reply(200, {
      success: true,
      data: invoices,
      meta: { page: 1, per_page: 15, total: 24, last_page: 2 },
    })
    renderPage()
    expect(await screen.findByText('INV-AAAA1111')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument()
  })

  it('updates the search filter in the URL after debounce', async () => {
    mock.onGet('/staff/invoices').reply(() => [
      200,
      { success: true, data: invoices, meta: { page: 1, per_page: 15, total: 2, last_page: 1 } },
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

  it('clears the search filter from the empty state', async () => {
    mock.onGet('/staff/invoices').reply(() => [
      200,
      { success: true, data: [], meta: emptyMeta },
    ])
    renderPage('/staff/invoices?search=John')
    fireEvent.click(await screen.findByRole('button', { name: 'Clear all filters' }))
    await waitFor(() => {
      expect(lastListRequest().params).toEqual({ page: 1 })
    })
  })

  it('shows an error state with a retry button on failure', async () => {
    let attempts = 0
    mock.onGet('/staff/invoices').reply(() => {
      attempts += 1
      if (attempts === 1) return [500, { success: false, message: 'Server error', errors: null }]
      return [200, { success: true, data: invoices, meta: { page: 1, per_page: 15, total: 2, last_page: 1 } }]
    })
    renderPage()
    expect(await screen.findByText('Server error')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('INV-AAAA1111')).toBeInTheDocument()
  })
})