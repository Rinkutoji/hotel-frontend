import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import StaffPaymentCard from '../components/staff/PaymentCard'

function makePayment(overrides = {}) {
  return {
    id: 4,
    booking_id: 7,
    amount: '1500.00',
    method: 'bank_transfer',
    status: 'receipt_uploaded',
    created_at: '2026-09-14T10:00:00.000000Z',
    booking: {
      id: 7,
      booking_number: 'BK-ABCD1234',
      customer: { id: 3, name: 'John Doe', email: 'john@example.com' },
    },
    ...overrides,
  }
}

function renderCard(payment) {
  return render(
    <MemoryRouter>
      <StaffPaymentCard payment={payment} />
    </MemoryRouter>,
  )
}

describe('StaffPaymentCard', () => {
  it('renders the booking number and customer name and email', () => {
    renderCard(makePayment())
    expect(screen.getByText('BK-ABCD1234')).toBeInTheDocument()
    expect(screen.getByText(/John Doe/)).toBeInTheDocument()
    expect(screen.getByText(/john@example\.com/)).toBeInTheDocument()
  })

  it('falls back to the payment id and a guest-not-found line when booking data is absent', () => {
    renderCard(makePayment({ booking: null }))
    expect(screen.getByText('Payment #4')).toBeInTheDocument()
    expect(screen.getByText('Guest not found')).toBeInTheDocument()
  })

  it('renders the amount and a readable method label', () => {
    renderCard(makePayment())
    expect(screen.getByText('1500.00')).toBeInTheDocument()
    expect(screen.getByText(/Bank transfer/)).toBeInTheDocument()
  })

  it('renders the status badge', () => {
    renderCard(makePayment())
    expect(screen.getByText('Receipt Uploaded')).toBeInTheDocument()
  })

  it('links to the staff payment detail route', () => {
    renderCard(makePayment())
    const link = screen.getByRole('link', { name: /BK-ABCD1234/ })
    expect(link).toHaveAttribute('href', '/staff/payments/4')
  })
})