import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import RoomStatusBadge from '../components/staff/RoomStatusBadge'

describe('RoomStatusBadge', () => {
  it.each([
    ['available', 'Available'],
    ['reserved', 'Reserved'],
    ['occupied', 'Occupied'],
    ['cleaning', 'Cleaning'],
    ['maintenance', 'Maintenance'],
  ])('renders a readable label for status %s', (status, label) => {
    render(<RoomStatusBadge status={status} />)
    expect(screen.getByText(label)).toBeInTheDocument()
  })

  it('falls back to the raw status for unknown values', () => {
    render(<RoomStatusBadge status="unknown_status" />)
    expect(screen.getByText('unknown_status')).toBeInTheDocument()
  })
})