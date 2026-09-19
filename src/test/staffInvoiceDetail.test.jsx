import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import MockAdapter from 'axios-mock-adapter'
import apiClient from '../api/client'
import InvoiceDetail from '../pages/staff/InvoiceDetail'

const invoice = {
  id: 9,
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
      check_in_date: '2026-10-01',
      check_out_date: '2026-10-05',
      total_amount: '556.00',
      customer: { id: 1, name: 'John Smith', email: 'john@example.com' },
    },
    verifiedBy: null,
    verified_at: null,
  },
  items: [
    {
      id: 1,
      invoice_id: 9,
      room_number: '101',
      room_type_name: 'Standard Room',
      price_per_night: '89.00',
      nights: 2,
      line_total: '178.00',
    },
    {
      id: 2,
      invoice_id: 9,
      room_number: '202',
      room_type_name: 'Deluxe Suite',
      price_per_night: '189.00',
      nights: 2,
      line_total: '378.00',
    },
  ],
}

function renderPage(id = '9') {
  return render(
    <MemoryRouter initialEntries={[`/staff/invoices/${id}`]}>
      <Routes>
        <Route path="/staff/invoices/:id" element={<InvoiceDetail />} />
        <Route path="/staff/invoices" element={<div>INVOICE_LIST</div>} />
        <Route path="/staff/bookings/:id" element={<div>BOOKING_DETAIL</div>} />
        <Route path="/staff/payments/:id" element={<div>PAYMENT_DETAIL</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Staff invoice detail page', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(apiClient)
  })

  afterEach(() => {
    mock.restore()
  })

  it('shows a loading state while fetching', () => {
    mock.onGet('/staff/invoices/9').reply(() => new Promise(() => {}))
    renderPage()
    expect(screen.getByText('Invoice')).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders the header, invoice details, and payment status badge', async () => {
    mock.onGet('/staff/invoices/9').reply(200, { success: true, data: invoice })
    renderPage()
    expect(await screen.findByText('INV-AAAA1111')).toBeInTheDocument()
    expect(screen.getByText('Invoice details')).toBeInTheDocument()
    expect(screen.getAllByText('556.00').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('Bank transfer').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Verified').length).toBeGreaterThanOrEqual(1)
  })

  it('renders the booking card with link, status badge, customer, and dates', async () => {
    mock.onGet('/staff/invoices/9').reply(200, { success: true, data: invoice })
    renderPage()
    expect(await screen.findByText('BK-ABCD1234')).toBeInTheDocument()
    const bookingLink = screen.getByRole('link', { name: 'BK-ABCD1234' })
    expect(bookingLink).toHaveAttribute('href', '/staff/bookings/12')
    expect(screen.getByText('Confirmed')).toBeInTheDocument()
    expect(screen.getByText('John Smith')).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
    expect(screen.getByText('2026-10-01')).toBeInTheDocument()
    expect(screen.getByText('2026-10-05')).toBeInTheDocument()
  })

  it('renders the payment card linking to the staff payment detail', async () => {
    mock.onGet('/staff/invoices/9').reply(200, { success: true, data: invoice })
    renderPage()
    await screen.findByText('Payment')
    const paymentLink = screen.getByRole('link', { name: '#4' })
    expect(paymentLink).toHaveAttribute('href', '/staff/payments/4')
    expect(screen.getAllByText('Verified').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Bank transfer').length).toBeGreaterThanOrEqual(1)
  })

  it('renders the line items table with the persisted snapshot values', async () => {
    mock.onGet('/staff/invoices/9').reply(200, { success: true, data: invoice })
    renderPage()
    expect(await screen.findByText('101')).toBeInTheDocument()
    expect(screen.getByText('Standard Room')).toBeInTheDocument()
    expect(screen.getByText('89.00')).toBeInTheDocument()
    expect(screen.getByText('178.00')).toBeInTheDocument()
    expect(screen.getByText('202')).toBeInTheDocument()
    expect(screen.getByText('Deluxe Suite')).toBeInTheDocument()
    expect(screen.getByText('189.00')).toBeInTheDocument()
    expect(screen.getByText('378.00')).toBeInTheDocument()
    expect(screen.getByText('Total')).toBeInTheDocument()
  })

  it('handles an empty line-item list', async () => {
    mock.onGet('/staff/invoices/9').reply(200, { success: true, data: { ...invoice, items: [] } })
    renderPage()
    expect(await screen.findByText('No line items on this invoice.')).toBeInTheDocument()
  })

  it('shows a refunded payment badge and no actions on a refunded invoice', async () => {
    mock.onGet('/staff/invoices/9').reply(200, {
      success: true,
      data: { ...invoice, payment: { ...invoice.payment, status: 'refunded' } },
    })
    renderPage()
    expect(await screen.findAllByText('Refunded').then((nodes) => nodes.length)).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('button', { name: 'Print' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it('shows the verified-by note for a verified payment', async () => {
    mock.onGet('/staff/invoices/9').reply(200, {
      success: true,
      data: {
        ...invoice,
        payment: {
          ...invoice.payment,
          verified_by: 2,
          verified_at: '2026-09-14T11:00:00.000000Z',
          verifiedBy: { id: 2, name: 'Admin User' },
        },
      },
    })
    renderPage()
    expect(await screen.findByText(/Verified by Admin User/)).toBeInTheDocument()
  })

  it('shows a not-found state without retry and a back link for a 404', async () => {
    mock.onGet('/staff/invoices/9').reply(404, { success: false, message: 'Invoice not found.', errors: null })
    renderPage()
    expect(await screen.findByText('The requested resource could not be found.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to invoices' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it('shows an error state with retry on failure', async () => {
    let attempts = 0
    mock.onGet('/staff/invoices/9').reply(() => {
      attempts += 1
      if (attempts === 1) return [500, { success: false, message: 'Server error', errors: null }]
      return [200, { success: true, data: invoice }]
    })
    renderPage()
    expect(await screen.findByText('Server error')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('INV-AAAA1111')).toBeInTheDocument()
  })

  it('links back to the invoices list from the 404 page', async () => {
    mock.onGet('/staff/invoices/9').reply(404, { success: false, message: 'Invoice not found.', errors: null })
    renderPage()
    const backLink = await screen.findByRole('link', { name: 'Back to invoices' })
    expect(backLink).toHaveAttribute('href', '/staff/invoices')
  })

  it('offers a print button that calls window.print()', async () => {
    const printSpy = vi.fn()
    window.print = printSpy
    mock.onGet('/staff/invoices/9').reply(200, { success: true, data: invoice })
    renderPage()
    const printButton = await screen.findByRole('button', { name: 'Print' })
    fireEvent.click(printButton)
    expect(printSpy).toHaveBeenCalledTimes(1)
  })

  it('does not render a print button until the invoice has loaded', () => {
    mock.onGet('/staff/invoices/9').reply(() => new Promise(() => {}))
    renderPage()
    expect(screen.queryByRole('button', { name: 'Print' })).not.toBeInTheDocument()
  })
})