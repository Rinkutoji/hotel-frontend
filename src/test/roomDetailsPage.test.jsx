import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import MockAdapter from 'axios-mock-adapter'
import apiClient from '../api/client'
import RoomDetails from '../pages/customer/RoomDetails'

const roomType = {
  id: 5,
  name: 'Deluxe Suite',
  description: 'A spacious suite with a living area.',
  base_price: '189.00',
  capacity_adults: 2,
  capacity_children: 1,
  amenities: ['wifi', 'tv', 'balcony'],
}

function renderAt() {
  return render(
    <MemoryRouter initialEntries={['/rooms/5']}>
      <Routes>
        <Route path="/rooms/:id" element={<RoomDetails />} />
        <Route path="/rooms" element={<div>ROOMS_LIST</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RoomDetails page', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(apiClient)
    vi.restoreAllMocks()
  })

  afterEach(() => {
    mock.restore()
  })

  it('renders room type information and amenities', async () => {
    mock.onGet('/public/room-types/5').reply(200, { success: true, data: roomType })
    mock.onGet('/public/room-types/5/images').reply(200, { success: true, data: [] })
    mock.onGet('/public/rooms').reply(200, {
      success: true,
      data: [{ id: 501, room_number: '501', floor: 5, status: 'available', room_type_id: 5 }],
      meta: { page: 1, per_page: 12, total: 1, last_page: 1 },
    })

    renderAt()

    expect(await screen.findByText('Deluxe Suite')).toBeInTheDocument()
    expect(screen.getByText('189.00')).toBeInTheDocument()
    expect(screen.getByText('2 adults')).toBeInTheDocument()
    expect(screen.getByText('wifi')).toBeInTheDocument()
    expect(screen.getByText('tv')).toBeInTheDocument()
    expect(screen.getByText('balcony')).toBeInTheDocument()
    expect(screen.getByText('A spacious suite with a living area.')).toBeInTheDocument()
  })

  it('renders room images in the gallery', async () => {
    mock.onGet('/public/room-types/5').reply(200, { success: true, data: roomType })
    mock.onGet('/public/room-types/5/images').reply(200, {
      success: true,
      data: [
        { id: 1, url: '/storage/a.jpg' },
        { id: 2, url: '/storage/b.jpg' },
      ],
    })
    mock.onGet('/public/rooms').reply(200, { success: true, data: [], meta: {} })

    renderAt()

    await waitFor(() => expect(screen.getByAltText('Room photo 1')).toHaveAttribute('src', '/storage/a.jpg'))
    expect(screen.getByLabelText('Show photo 2')).toBeInTheDocument()
  })

  it('shows a loading state while fetching', () => {
    mock.onGet('/public/room-types/5').reply(() => new Promise(() => {}))
    renderAt()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('shows a not-found message for a missing room type', async () => {
    mock.onGet('/public/room-types/999').reply(404, { message: 'Not found' })
    mock.onGet('/public/room-types/999/images').reply(404, { message: 'Not found' })
    mock.onGet('/public/rooms').reply(404, { message: 'Not found' })

    renderAt()

    expect(await screen.findByText(/could not be found/i)).toBeInTheDocument()
    expect(screen.getByText('Browse all rooms')).toBeInTheDocument()
  })

  it('shows an error state with a retry on failure', async () => {
    mock.onGet('/public/room-types/5').reply(500, { message: 'Server error' })
    renderAt()
    expect(await screen.findByText(/server error/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('links back to the rooms list', async () => {
    mock.onGet('/public/room-types/5').reply(200, { success: true, data: roomType })
    mock.onGet('/public/room-types/5/images').reply(200, { success: true, data: [] })
    mock.onGet('/public/rooms').reply(200, { success: true, data: [], meta: {} })

    renderAt()
    const back = await screen.findByText('← Back to rooms')
    expect(back).toHaveAttribute('href', '/rooms')
  })

  it('shows available room count', async () => {
    mock.onGet('/public/room-types/5').reply(200, { success: true, data: roomType })
    mock.onGet('/public/room-types/5/images').reply(200, { success: true, data: [] })
    mock.onGet('/public/rooms').reply(200, {
      success: true,
      data: [
        { id: 501, room_number: '501', floor: 5, status: 'available', room_type_id: 5, room_type: roomType },
        { id: 502, room_number: '502', floor: 5, status: 'maintenance', room_type_id: 5, room_type: roomType },
      ],
      meta: { page: 1, per_page: 12, total: 2, last_page: 1 },
    })

    renderAt()
    expect(await screen.findByText(/1 room currently available/)).toBeInTheDocument()
  })
})