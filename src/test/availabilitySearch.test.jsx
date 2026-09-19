import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import MockAdapter from 'axios-mock-adapter'
import apiClient from '../api/client'
import AvailabilitySearch from '../pages/customer/AvailabilitySearch'

const room1 = { id: 101, room_number: '101', floor: 1, status: 'available', room_type_id: 1, room_type: { id: 1, name: 'Standard Room', base_price: '89.00' } }
const room2 = { id: 102, room_number: '102', floor: 2, status: 'available', room_type_id: 2, room_type: { id: 2, name: 'Deluxe Suite', base_price: '189.00' } }

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/availability']}>
      <Routes>
        <Route path="/availability" element={<AvailabilitySearch />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AvailabilitySearch page', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(apiClient)
  })

  afterEach(() => {
    mock.restore()
  })

  it('renders the form and loads rooms', async () => {
    mock.onGet('/public/rooms').reply(200, { success: true, data: [room1, room2], meta: {} })
    renderPage()
    expect(screen.getByText('Check availability')).toBeInTheDocument()
    expect(await screen.findByText('Room 101')).toBeInTheDocument()
    expect(screen.getByText('Room 102')).toBeInTheDocument()
  })

  it('shows a loading state while rooms are loading', () => {
    mock.onGet('/public/rooms').reply(() => new Promise(() => {}))
    renderPage()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('shows an error state if rooms fail to load', async () => {
    mock.onGet('/public/rooms').reply(500, { message: 'Server error' })
    renderPage()
    expect(await screen.findByText('Server error')).toBeInTheDocument()
  })

  it('searches and shows available rooms', async () => {
    mock.onGet('/public/rooms').reply(200, { success: true, data: [room1, room2], meta: {} })
    mock.onPost('/public/availability').reply(200, {
      success: true,
      data: [
        { id: 101, room_number: '101', floor: 1, status: 'available', room_type_id: 1, price_per_night: '89.00' },
      ],
    })
    renderPage()
    await screen.findByText('Room 101')

    fireEvent.change(screen.getByLabelText('Check-in'), { target: { value: '2026-10-01' } })
    fireEvent.change(screen.getByLabelText('Check-out'), { target: { value: '2026-10-05' } })

    fireEvent.click(screen.getByRole('checkbox', { name: /101/ }))

    fireEvent.click(screen.getByRole('button', { name: /check availability/i }))
    expect(await screen.findByText('1 room is available for your dates.')).toBeInTheDocument()
    expect(screen.getByText('89.00')).toBeInTheDocument()
  })

  it('shows empty results when no rooms are available', async () => {
    mock.onGet('/public/rooms').reply(200, { success: true, data: [room1], meta: {} })
    mock.onPost('/public/availability').reply(200, { success: true, data: [] })
    renderPage()
    await screen.findByText('Room 101')

    fireEvent.change(screen.getByLabelText('Check-in'), { target: { value: '2026-10-01' } })
    fireEvent.change(screen.getByLabelText('Check-out'), { target: { value: '2026-10-05' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /101/ }))
    fireEvent.click(screen.getByRole('button', { name: /check availability/i }))

    expect(await screen.findByText('No rooms available')).toBeInTheDocument()
  })

  it('shows an error if the availability check fails', async () => {
    mock.onGet('/public/rooms').reply(200, { success: true, data: [room1], meta: {} })
    mock.onPost('/public/availability').reply(500, { message: 'Server error' })
    renderPage()
    await screen.findByText('Room 101')

    fireEvent.change(screen.getByLabelText('Check-in'), { target: { value: '2026-10-01' } })
    fireEvent.change(screen.getByLabelText('Check-out'), { target: { value: '2026-10-05' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /101/ }))
    fireEvent.click(screen.getByRole('button', { name: /check availability/i }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  it('disables the search button when no rooms are selected', async () => {
    mock.onGet('/public/rooms').reply(200, { success: true, data: [room1], meta: {} })
    renderPage()
    await screen.findByText('Room 101')
    fireEvent.change(screen.getByLabelText('Check-in'), { target: { value: '2026-10-01' } })
    fireEvent.change(screen.getByLabelText('Check-out'), { target: { value: '2026-10-05' } })
    expect(screen.getByRole('button', { name: /check availability/i })).toBeDisabled()
  })

  it('limits room selection to the backend maximum of 5', async () => {
    const rooms = Array.from({ length: 7 }, (_, i) => ({
      id: 200 + i,
      room_number: String(200 + i),
      floor: 1,
      status: 'available',
      room_type_id: 1,
      room_type: { id: 1, name: 'Standard Room', base_price: '89.00' },
    }))
    mock.onGet('/public/rooms').reply(200, { success: true, data: rooms, meta: {} })
    renderPage()
    await screen.findByText(/Room 200/)

    rooms.forEach((room) => {
      const checkbox = screen.getByRole('checkbox', { name: new RegExp(room.room_number) })
      if (checkbox.checked) return
      fireEvent.click(checkbox)
    })

    const selected = screen.getAllByRole('checkbox', { checked: true })
    expect(selected.length).toBe(5)
    expect(screen.getByText('5/5 selected')).toBeInTheDocument()
  })
})
