import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import InvoiceCard from '../components/staff/InvoiceCard'

function makeInvoice(overrides = {}) {
  return {
    id: 9,
    invoice_number: 'INV-ABCD1234',
    payment_id: 7,
    total_amount: '200.00',
    issued_at: '2026-09-09T10:00:00.000000Z',
    payment: {
      id: 7,
      status: 'verified',
      booking_id: 3,
      booking: {
        id: 3,
        booking_number: 'BK-ABCD9999',
        customer: { id: 5, name: 'John Doe', email: 'john@example.com' },
      },
    },
    ...overrides,
  }
}

function renderCard(invoice) {
  return render(
    <MemoryRouter>
      <InvoiceCard invoice={invoice} />
    </MemoryRouter>,
  )
}

describe('InvoiceCard', () => {
  it('renders the invoice number, booking number, and customer name and email', () => {
    renderCard(makeInvoice())
    expect(screen.getByText('INV-ABCD1234')).toBeInTheDocument()
    expect(screen.getByText(/BK-ABCD9999/)).toBeInTheDocument()
    expect(screen.getByText(/John Doe/)).toBeInTheDocument()
    expect(screen.getByText(/john@example\.com/)).toBeInTheDocument()
  })

  it('falls back to the booking id and a guest-not-found line when booking data is absent', () => {
    renderCard(makeInvoice({ payment: { id: 7, status: 'verified', booking_id: 3, booking: null } }))
    expect(screen.getByText(/Booking #3/)).toBeInTheDocument()
    expect(screen.getByText('Guest not found')).toBeInTheDocument()
  })

  it('renders the total verbatim and the booking plus issued line', () => {
    renderCard(makeInvoice())
    expect(screen.getByText('200.00')).toBeInTheDocument()
    expect(screen.getByText(/BK-ABCD9999 · /)).toBeInTheDocument()
  })

  it('renders the payment status badge', () => {
    renderCard(makeInvoice())
    expect(screen.getByText('Verified')).toBeInTheDocument()
  })

  it('does not render a badge when the payment relation is absent', () => {
    renderCard(makeInvoice({ payment: null }))
    expect(screen.queryByText('Verified')).not.toBeInTheDocument()
  })

  it('links to the staff invoice detail route', () => {
    renderCard(makeInvoice())
    const link = screen.getByRole('link', { name: /INV-ABCD1234/ })
    expect(link).toHaveAttribute('href', '/staff/invoices/9')
  })
})