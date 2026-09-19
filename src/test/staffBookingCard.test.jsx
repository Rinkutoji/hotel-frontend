import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import StaffBookingCard from '../components/staff/BookingCard'

function makeBooking(overrides = {}) {
  return {
    id: 7,
    booking_number: 'BK-ABCD1234',
    customer: { id: 3, name: 'John Doe', email: 'john@example.com' },
    status: 'confirmed',
    check_in_date: '2026-10-01T00:00:00.000000Z',
    check_out_date: '2026-10-05T00:00:00.000000Z',
    total_amount: '1000.00',
    ...overrides,
  }
}

function renderCard(booking) {
  return render(
    <MemoryRouter>
      <StaffBookingCard booking={booking} />
    </MemoryRouter>,
  )
}

describe('StaffBookingCard', () => {
  it('renders the booking number and customer name and email', () => {
    renderCard(makeBooking())
    expect(screen.getByText('BK-ABCD1234')).toBeInTheDocument()
    expect(screen.getByText(/John Doe/)).toBeInTheDocument()
    expect(screen.getByText(/john@example.com/)).toBeInTheDocument()
  })

  it('renders the date range and nights count', () => {
    renderCard(makeBooking())
    expect(screen.getByText(/4 nights/)).toBeInTheDocument()
  })

  it('renders the status badge and total amount', () => {
    renderCard(makeBooking())
    expect(screen.getByText('Confirmed')).toBeInTheDocument()
    expect(screen.getByText('1000.00')).toBeInTheDocument()
  })

  it('links to the staff booking detail route', () => {
    renderCard(makeBooking())
    const link = screen.getByRole('link', { name: /BK-ABCD1234/ })
    expect(link).toHaveAttribute('href', '/staff/bookings/7')
  })

  it('renders the booking number when customer data is absent', () => {
    renderCard(makeBooking({ customer: null }))
    expect(screen.getByText('BK-ABCD1234')).toBeInTheDocument()
    expect(screen.getByText('Guest not found')).toBeInTheDocument()
  })
})