import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import MockAdapter from 'axios-mock-adapter'
import apiClient from '../api/client'
import InvoiceList from '../pages/customer/InvoiceList'

const invoices = [
  {
    id: 1,
    invoice_number: 'INV-AAAA1111',
    payment_id: 4,
    total_amount: '556.00',
    issued_at: '2026-09-14T10:30:00.000000Z',
    payment: { id: 4, booking_id: 12, booking: { id: 12, booking_number: 'BK-ABCD1234' } },
  },
  {
    id: 2,
    invoice_number: 'INV-BBBB2222',
    payment_id: 5,
    total_amount: '800.00',
    issued_at: '2026-10-02T09:00:00.000000Z',
    payment: { id: 5, booking_id: 13, booking: { id: 13, booking_number: 'BK-EFGH5678' } },
  },
]

function renderPage(initialEntry = '/invoices') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/invoices" element={<InvoiceList />} />
        <Route path="/invoices/:id" element={<div data-testid="invoice-detail-target">INVOICE_DETAIL</div>} />
        <Route path="/bookings" element={<div>MY_BOOKINGS</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('InvoiceList page', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(apiClient)
  })

  afterEach(() => {
    mock.restore()
  })

  it('shows a loading state while fetching', () => {
    mock.onGet('/customer/invoices').reply(() => new Promise(() => {}))
    renderPage()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders the invoices with number, amount and booking', async () => {
    mock.onGet('/customer/invoices').reply(200, {
      success: true,
      data: invoices,
      meta: { page: 1, per_page: 15, total: 2, last_page: 1 },
    })
    renderPage()
    expect(await screen.findByText('INV-AAAA1111')).toBeInTheDocument()
    expect(screen.getByText('INV-BBBB2222')).toBeInTheDocument()
    expect(screen.getByText('556.00')).toBeInTheDocument()
    expect(screen.getByText('800.00')).toBeInTheDocument()
    expect(screen.getByText('Booking BK-ABCD1234')).toBeInTheDocument()
  })

  it('links each invoice to its detail page', async () => {
    mock.onGet('/customer/invoices').reply(200, {
      success: true,
      data: invoices,
      meta: { page: 1, per_page: 15, total: 2, last_page: 1 },
    })
    renderPage()
    fireEvent.click(await screen.findByText('INV-AAAA1111'))
    expect(await screen.findByTestId('invoice-detail-target')).toBeInTheDocument()
  })

  it('shows an empty state when there are no invoices', async () => {
    mock.onGet('/customer/invoices').reply(200, {
      success: true,
      data: [],
      meta: { page: 1, per_page: 15, total: 0, last_page: 1 },
    })
    renderPage()
    expect(await screen.findByText('No invoices yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View my bookings' })).toHaveAttribute('href', '/bookings')
  })

  it('shows an error state when the list fails', async () => {
    mock.onGet('/customer/invoices').reply(500, { success: false, message: 'Server error', errors: null })
    renderPage()
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('paginates through results', async () => {
    mock.onGet('/customer/invoices').reply(200, {
      success: true,
      data: invoices,
      meta: { page: 1, per_page: 15, total: 2, last_page: 2 },
    })
    renderPage()
    fireEvent.click(await screen.findByText('Next'))
    await waitFor(() => {
      const config = mock.history.get.filter((request) => request.url === '/customer/invoices').at(-1)
      expect(config.params).toEqual({ page: 2 })
    })
  })
})