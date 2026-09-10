import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import RoomCard from '../components/customer/RoomCard'

function makeRoom(overrides = {}) {
  return {
    id: 101,
    room_number: '101',
    floor: 2,
    status: 'available',
    room_type_id: 1,
    room_type: { id: 1, name: 'Standard Room', base_price: '89.00' },
    ...overrides,
  }
}

function renderCard(room) {
  return render(<RoomCard room={room} />)
}

describe('RoomCard', () => {
  it('renders the room number, floor and room type', () => {
    renderCard(makeRoom())
    expect(screen.getByText('Room 101')).toBeInTheDocument()
    expect(screen.getByText('Floor: 2')).toBeInTheDocument()
    expect(screen.getByText('Type: Standard Room')).toBeInTheDocument()
  })

  it('renders the price from the room type', () => {
    renderCard(makeRoom())
    expect(screen.getByText('89.00')).toBeInTheDocument()
  })

  it('shows an available badge for available rooms', () => {
    renderCard(makeRoom())
    expect(screen.getByText('available')).toBeInTheDocument()
    expect(screen.getByText('Available now')).toBeInTheDocument()
  })

  it('renders status badges for non-available statuses', () => {
    renderCard(makeRoom({ status: 'maintenance' }))
    expect(screen.getByText('maintenance')).toBeInTheDocument()
    expect(screen.queryByText('Available now')).toBeNull()
  })

  it('renders without room type info when absent', () => {
    renderCard(makeRoom({ room_type: null }))
    expect(screen.queryByText('Type: Standard Room')).toBeNull()
    expect(screen.queryByText('89.00')).toBeNull()
  })
})