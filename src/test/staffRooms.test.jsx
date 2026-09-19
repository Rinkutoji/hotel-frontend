import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MockAdapter from 'axios-mock-adapter'
import apiClient from '../api/client'
import Rooms from '../pages/staff/Rooms'
import { useAuth } from '../hooks/useAuth'

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

const mockUseAuth = vi.mocked(useAuth)

const roomTypes = [
  { id: 1, name: 'Standard', description: null, base_price: '120.00', capacity_adults: 2, capacity_children: 0, amenities: [] },
  { id: 2, name: 'Suite', description: null, base_price: '250.00', capacity_adults: 3, capacity_children: 2, amenities: [] },
]

function makeRoom(overrides = {}) {
  return {
    id: 12,
    room_number: '101',
    room_type_id: 1,
    floor: 1,
    status: 'available',
    room_type: { id: 1, name: 'Standard', description: null, base_price: '120.00', capacity_adults: 2, capacity_children: 0, amenities: [] },
    ...overrides,
  }
}

const rooms = [makeRoom(), makeRoom({ id: 13, room_number: '201', room_type_id: 2, floor: 2, status: 'maintenance', room_type: roomTypes[1] })]

const emptyMeta = { page: 1, per_page: 15, total: 0, last_page: 1 }

let mock

function lastRoomsRequest() {
  return mock.history.get.findLast((request) => request.url === '/staff/rooms')
}

function lastStatusRequest() {
  return mock.history.post.findLast((request) => /\/staff\/rooms\/\d+\/status\//.test(request.url))
}

function renderPage(initialEntry = '/staff/rooms') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Rooms />
    </MemoryRouter>,
  )
}

function stubRoomTypes() {
  mock.onGet('/staff/room-types').reply(200, {
    success: true,
    data: roomTypes,
    meta: { page: 1, per_page: 50, total: 2, last_page: 1 },
  })
}

describe('Staff rooms list page', () => {
  beforeEach(() => {
    mock = new MockAdapter(apiClient)
    mockUseAuth.mockReset()
    mockUseAuth.mockReturnValue({
      user: { name: 'Admin User', role: 'admin', email: 'admin@example.com' },
      hasRole: (roles) => roles.includes('admin'),
    })
    stubRoomTypes()
  })

  afterEach(() => {
    mock.restore()
  })

  it('shows a loading state while fetching', () => {
    mock.onGet('/staff/rooms').reply(() => new Promise(() => {}))
    renderPage()
    expect(screen.getByText('Rooms')).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders a list of room cards', async () => {
    mock.onGet('/staff/rooms').reply(200, {
      success: true,
      data: rooms,
      meta: { page: 1, per_page: 15, total: 2, last_page: 1 },
    })
    renderPage()
    expect(await screen.findByText('Room 101')).toBeInTheDocument()
    expect(screen.getByText('Room 201')).toBeInTheDocument()
    expect(screen.getByText('Available')).toBeInTheDocument()
    expect(screen.getByText('Maintenance')).toBeInTheDocument()
  })

  it('calls the API with params derived from the URL search params', async () => {
    mock.onGet('/staff/rooms').reply(200, {
      success: true,
      data: rooms,
      meta: { page: 1, per_page: 15, total: 2, last_page: 1 },
    })
    renderPage('/staff/rooms?status=maintenance&search=101&page=2')
    await screen.findByText('Room 101')
    expect(lastRoomsRequest().params).toEqual({
      status: 'maintenance',
      search: '101',
      page: 2,
    })
  })

  it('updates the status filter in the URL and refetches', async () => {
    mock.onGet('/staff/rooms').reply(() => [
      200,
      { success: true, data: rooms, meta: { page: 1, per_page: 15, total: 2, last_page: 1 } },
    ])
    renderPage()
    fireEvent.change(await screen.findByLabelText('Status'), { target: { value: 'maintenance' } })
    await waitFor(() => {
      expect(lastRoomsRequest().params).toEqual({ status: 'maintenance', page: 1 })
    })
  })

  it('updates the room type filter in the URL and refetches', async () => {
    mock.onGet('/staff/rooms').reply(() => [
      200,
      { success: true, data: rooms, meta: { page: 1, per_page: 15, total: 2, last_page: 1 } },
    ])
    renderPage()
    const select = await screen.findByLabelText('Room type')
    await screen.findByRole('option', { name: 'Suite' })
    fireEvent.change(select, { target: { value: '2' } })
    await waitFor(() => {
      expect(lastRoomsRequest().params).toEqual({ room_type_id: '2', page: 1 })
    })
  })

  it('updates the search filter in the URL after debounce', async () => {
    mock.onGet('/staff/rooms').reply(() => [
      200,
      { success: true, data: rooms, meta: { page: 1, per_page: 15, total: 2, last_page: 1 } },
    ])
    renderPage()
    fireEvent.change(await screen.findByPlaceholderText('Search by room number'), {
      target: { value: '201' },
    })
    await waitFor(
      () => {
        expect(lastRoomsRequest().params).toEqual({ search: '201', page: 1 })
      },
      { timeout: 1500, interval: 50 },
    )
  })

  it('shows an empty state with filter hints when no rooms match', async () => {
    mock.onGet('/staff/rooms').reply(200, { success: true, data: [], meta: emptyMeta })
    renderPage('/staff/rooms?status=occupied')
    expect(await screen.findByText('No rooms found')).toBeInTheDocument()
    expect(screen.getByText('No rooms match your filters.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Clear all filters' }))
    await waitFor(() => {
      expect(lastRoomsRequest().params).toEqual({ page: 1 })
    })
  })

  it('shows an empty state without filter actions when there are no filters', async () => {
    mock.onGet('/staff/rooms').reply(200, { success: true, data: [], meta: emptyMeta })
    renderPage()
    expect(await screen.findByText('No rooms found')).toBeInTheDocument()
    expect(screen.getByText('There are no rooms yet.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Clear all filters' })).not.toBeInTheDocument()
  })

  it('renders pagination when there is more than one page', async () => {
    mock.onGet('/staff/rooms').reply(200, {
      success: true,
      data: rooms,
      meta: { page: 1, per_page: 15, total: 24, last_page: 2 },
    })
    renderPage()
    expect(await screen.findByText('Room 101')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument()
  })

  it('shows an error state with a retry button on failure', async () => {
    let attempts = 0
    mock.onGet('/staff/rooms').reply(() => {
      attempts += 1
      if (attempts === 1) return [500, { success: false, message: 'Server error', errors: null }]
      return [200, { success: true, data: rooms, meta: { page: 1, per_page: 15, total: 2, last_page: 1 } }]
    })
    renderPage()
    expect(await screen.findByText('Server error')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Room 101')).toBeInTheDocument()
  })

  it('marks a room for maintenance and shows a success banner', async () => {
    mock.onGet('/staff/rooms').reply(200, {
      success: true,
      data: [makeRoom()],
      meta: { page: 1, per_page: 15, total: 1, last_page: 1 },
    })
    mock.onPost('/staff/rooms/12/status/maintenance').reply(200, {
      success: true,
      message: 'Room marked for maintenance.',
      data: makeRoom({ status: 'maintenance' }),
    })
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Mark for maintenance' }))
    expect(screen.getByText('Mark this room for maintenance?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(await screen.findByText('Room marked for maintenance.')).toBeInTheDocument()
    expect(lastStatusRequest().url).toBe('/staff/rooms/12/status/maintenance')
  })

  it('sends an optional reason with a maintenance transition', async () => {
    mock.onGet('/staff/rooms').reply(200, {
      success: true,
      data: [makeRoom()],
      meta: { page: 1, per_page: 15, total: 1, last_page: 1 },
    })
    mock.onPost('/staff/rooms/12/status/maintenance').reply(200, {
      success: true,
      message: 'Room marked for maintenance.',
      data: makeRoom({ status: 'maintenance' }),
    })
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Mark for maintenance' }))
    fireEvent.change(screen.getByLabelText(/Reason \(optional\)/), { target: { value: 'Leaky tap' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(await screen.findByText('Room marked for maintenance.')).toBeInTheDocument()
    const config = lastStatusRequest()
    expect(JSON.parse(config.data)).toEqual({ reason: 'Leaky tap' })
  })

  it('surfaces the server message on a 409 confirmation and keeps the room list', async () => {
    mock.onGet('/staff/rooms').reply(() => [
      200,
      { success: true, data: [makeRoom()], meta: { page: 1, per_page: 15, total: 1, last_page: 1 } },
    ])
    mock.onPost('/staff/rooms/12/status/maintenance').reply(409, {
      success: false,
      message: 'Occupied rooms cannot be placed in maintenance.',
      errors: null,
    })
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Mark for maintenance' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(await screen.findByText('Occupied rooms cannot be placed in maintenance.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mark for maintenance' })).toBeInTheDocument()
  })

  it('deletes a room after confirmation and shows a success banner', async () => {
    mock.onGet('/staff/rooms').reply(200, {
      success: true,
      data: [makeRoom()],
      meta: { page: 1, per_page: 15, total: 1, last_page: 1 },
    })
    mock.onDelete('/staff/rooms/12').reply(200, { success: true, message: 'Room deleted.', data: null })
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Delete room' }))
    expect(screen.getByText('Delete room 101?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }))
    expect(await screen.findByText('Room deleted.')).toBeInTheDocument()
    expect(mock.history.delete.some((r) => r.url === '/staff/rooms/12')).toBe(true)
  })

  it('hides the add button and management affordances for receptionists', async () => {
    mockUseAuth.mockReturnValue({
      user: { name: 'Receptionist', role: 'receptionist', email: 'rec@example.com' },
      hasRole: (roles) => roles.includes('receptionist'),
    })
    mock.onGet('/staff/rooms').reply(200, {
      success: true,
      data: rooms,
      meta: { page: 1, per_page: 15, total: 2, last_page: 1 },
    })
    renderPage()
    await screen.findByText('Room 101')
    expect(screen.queryByRole('link', { name: 'Add room' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete room' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mark for maintenance' })).toBeInTheDocument()
  })
})