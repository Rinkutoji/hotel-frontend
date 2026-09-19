import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import RoomCard from '../components/staff/RoomCard'

function makeRoom(overrides = {}) {
  return {
    id: 12,
    room_number: '101',
    room_type_id: 3,
    floor: 1,
    status: 'available',
    room_type: { id: 3, name: 'Standard' },
    ...overrides,
  }
}

function renderCard(room, props = {}) {
  const { canManage = false, ...callbacks } = props
  return {
    callbacks,
    ...render(
      <MemoryRouter>
        <RoomCard room={room} canManage={canManage} busy={false} {...callbacks} />
      </MemoryRouter>,
    ),
  }
}

describe('RoomCard', () => {
  it('renders the room number, room type, floor and status badge', () => {
    renderCard(makeRoom())
    expect(screen.getByText('Room 101')).toBeInTheDocument()
    expect(screen.getByText(/Standard/)).toBeInTheDocument()
    expect(screen.getByText(/Floor 1/)).toBeInTheDocument()
    expect(screen.getByText('Available')).toBeInTheDocument()
  })

  it('shows the maintenance affordance for available rooms', () => {
    renderCard(makeRoom())
    expect(screen.getByRole('button', { name: 'Mark for maintenance' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mark available' })).not.toBeInTheDocument()
  })

  it('shows the available affordance for maintenance rooms', () => {
    renderCard(makeRoom({ status: 'maintenance' }))
    expect(screen.getByRole('button', { name: 'Mark available' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mark for maintenance' })).not.toBeInTheDocument()
  })

  it.each(['reserved', 'occupied', 'cleaning'])('shows no status affordance for %s rooms', (status) => {
    renderCard(makeRoom({ status }))
    expect(screen.queryByRole('button', { name: 'Mark for maintenance' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mark available' })).not.toBeInTheDocument()
  })

  it('shows the edit link only for users who can manage rooms', () => {
    renderCard(makeRoom())
    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument()
    renderCard(makeRoom(), { canManage: true })
    expect(screen.getByRole('link', { name: 'Edit' })).toBeInTheDocument()
  })

  it('confirms a maintenance transition before calling the callback', () => {
    const onTransition = vi.fn()
    renderCard(makeRoom(), { canManage: true, onTransition })
    fireEvent.click(screen.getByRole('button', { name: 'Mark for maintenance' }))
    expect(screen.getByText('Mark this room for maintenance?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(onTransition).toHaveBeenCalledWith(12, 'available', undefined)
  })

  it('sends the optional reason with a maintenance transition', () => {
    const onTransition = vi.fn()
    renderCard(makeRoom(), { canManage: true, onTransition })
    fireEvent.click(screen.getByRole('button', { name: 'Mark for maintenance' }))
    fireEvent.change(screen.getByLabelText(/Reason \(optional\)/), { target: { value: 'Leaky tap' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(onTransition).toHaveBeenCalledWith(12, 'available', 'Leaky tap')
  })

  it('confirms a delete before calling the callback when the user can manage', () => {
    const onDelete = vi.fn()
    renderCard(makeRoom(), { canManage: true, onDelete })
    fireEvent.click(screen.getByRole('button', { name: 'Delete room' }))
    expect(screen.getByText('Delete room 101?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }))
    expect(onDelete).toHaveBeenCalledWith(12)
  })

  it('does not show the delete button for users who cannot manage', () => {
    renderCard(makeRoom())
    expect(screen.queryByRole('button', { name: 'Delete room' })).not.toBeInTheDocument()
  })
})