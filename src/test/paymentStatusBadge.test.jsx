import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import PaymentStatusBadge from '../components/customer/PaymentStatusBadge'

const cases = [
  ['pending', 'Pending', 'bg-yellow-100', 'text-yellow-800'],
  ['receipt_uploaded', 'Receipt Uploaded', 'bg-blue-100', 'text-blue-800'],
  ['verified', 'Verified', 'bg-green-100', 'text-green-800'],
  ['rejected', 'Rejected', 'bg-red-100', 'text-red-800'],
  ['refunded', 'Refunded', 'bg-slate-200', 'text-slate-700'],
]

describe('PaymentStatusBadge', () => {
  it.each(cases)('renders the %s label with its color', (status, label, background, text) => {
    const { container } = render(<PaymentStatusBadge status={status} />)
    expect(screen.getByText(label)).toBeInTheDocument()
    const span = container.querySelector('span')
    expect(span).not.toBeNull()
    expect(span.className).toContain(background)
    expect(span.className).toContain(text)
  })

  it('falls back to the raw value with neutral styling for unknown statuses', () => {
    const { container } = render(<PaymentStatusBadge status="processing" />)
    expect(screen.getByText('processing')).toBeInTheDocument()
    expect(container.querySelector('span').className).toContain('bg-slate-100')
  })
})