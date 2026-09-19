import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import MockAdapter from 'axios-mock-adapter'
import apiClient from '../api/client'
import InvoiceDetail from '../pages/customer/InvoiceDetail'

const invoice = {
  id: 1,
  invoice_number: 'INV-AAAA1111',
  payment_id: 4,
  total_amount: '556.00',
  issued_at: '2026-09-14T10:30:00.000000Z',
  created_at: '2026-09-14T10:30:00.000000Z',
  updated_at: '2026-09-14T10:30:00.000000Z',
  payment: {
    id: 4,
    booking_id: 12,
    amount: '556.00',
    method: 'bank_transfer',
    status: 'verified',
    booking: {
      id: 12,
      booking_number: 'BK-ABCD1234',
      status: 'confirmed',
      customer: { id: 1, name: 'John Smith', email: 'john@example.com' },
    },
  },
  items: [
    {
      id: 1,
      invoice_id: 1,
      room_number: '101',
      room_type_name: 'Standard Room',
      price_per_night: '89.00',
      nights: 2,
      line_total: '178.00',
    },
    {
      id: 2,
      invoice_id: 1,
      room_number: '202',
      room_type_name: 'Deluxe Suite',
      price_per_night: '189.00',
      nights: 2,
      line_total: '378.00',
    },
  ],
}

function renderPage(id = '1') {
  return render(
    <MemoryRouter initialEntries={[`/invoices/${id}`]}>
      <Routes>
        <Route path="/invoices/:id" element={<InvoiceDetail />} />
        <Route path="/invoices" element={<div>INVOICE_LIST</div>} />
        <Route path="/bookings/:id" element={<div>BOOKING_DETAIL</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('InvoiceDetail page', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(apiClient)
  })

  afterEach(() => {
    mock.restore()
  })

  it('shows a loading state while fetching', () => {
    mock.onGet('/customer/invoices/1').reply(() => new Promise(() => {}))
    renderPage()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders the invoice header and payment details', async () => {
    mock.onGet('/customer/invoices/1').reply(200, { success: true, data: invoice })
    renderPage()
    expect(await screen.findByText('INV-AAAA1111')).toBeInTheDocument()
    expect(screen.getAllByText('556.00').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Verified')).toBeInTheDocument()
    expect(screen.getByText('Bank transfer')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'BK-ABCD1234' })).toHaveAttribute('href', '/bookings/12')
    expect(screen.getByText('John Smith')).toBeInTheDocument()
  })

  it('renders the line items table with the persisted snapshot values', async () => {
    mock.onGet('/customer/invoices/1').reply(200, { success: true, data: invoice })
    renderPage()
    expect(await screen.findByText('101')).toBeInTheDocument()
    expect(screen.getByText('Standard Room')).toBeInTheDocument()
    expect(screen.getByText('89.00')).toBeInTheDocument()
    expect(screen.getByText('178.00')).toBeInTheDocument()
    expect(screen.getByText('202')).toBeInTheDocument()
    expect(screen.getByText('Deluxe Suite')).toBeInTheDocument()
    expect(screen.getByText('189.00')).toBeInTheDocument()
    expect(screen.getByText('378.00')).toBeInTheDocument()
  })

  it('handles an empty line-item list', async () => {
    mock.onGet('/customer/invoices/1').reply(200, { success: true, data: { ...invoice, items: [] } })
    renderPage()
    expect(await screen.findByText('No line items on this invoice.')).toBeInTheDocument()
  })

  it('shows a not-found state for a 404', async () => {
    mock.onGet('/customer/invoices/1').reply(404, { success: false, message: 'Invoice not found.', errors: null })
    renderPage()
    expect(await screen.findByText('The requested resource could not be found.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to my invoices' })).toBeInTheDocument()
  })

  it('shows an error state with retry on failure', async () => {
    mock.onGet('/customer/invoices/1').reply(500, { success: false, message: 'Server error', errors: null })
    renderPage()
    expect(await screen.findByText('Server error')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('offers a print button that calls window.print()', async () => {
    const printSpy = vi.fn()
    window.print = printSpy
    mock.onGet('/customer/invoices/1').reply(200, { success: true, data: invoice })
    renderPage()
    const printButton = await screen.findByRole('button', { name: 'Print' })
    fireEvent.click(printButton)
    expect(printSpy).toHaveBeenCalledTimes(1)
  })

  it('does not render a print button until the invoice has loaded', () => {
    mock.onGet('/customer/invoices/1').reply(() => new Promise(() => {}))
    renderPage()
    expect(screen.queryByRole('button', { name: 'Print' })).not.toBeInTheDocument()
  })
})