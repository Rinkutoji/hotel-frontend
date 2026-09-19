import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import BookingStatusBadge from '../components/customer/BookingStatusBadge'

const cases = [
  ['pending_payment', 'Pending payment'],
  ['confirmed', 'Confirmed'],
  ['checked_in', 'Checked in'],
  ['checked_out', 'Checked out'],
  ['cancelled', 'Cancelled'],
  ['no_show', 'No show'],
]

describe('BookingStatusBadge', () => {
  it.each(cases)('renders the %s label', (status, label) => {
    const { container } = render(<BookingStatusBadge status={status} />)
    expect(screen.getByText(label)).toBeInTheDocument()
    expect(container.querySelector('span')).not.toBeNull()
  })

  it('falls back to the raw value for unknown statuses', () => {
    render(<BookingStatusBadge status="archived" />)
    expect(screen.getByText('archived')).toBeInTheDocument()
  })
})