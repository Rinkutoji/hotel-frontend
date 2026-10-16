import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import MockAdapter from 'axios-mock-adapter'
import apiClient from '../api/client'
import RoomForm from '../pages/staff/RoomForm'

const properties = [
  { id: 1, name: 'Main Hotel', code: 'MAIN', city: 'Phnom Penh', country: 'Cambodia', status: 'active', buildings_count: 2, rooms_count: 12 },
]

const buildings = [
  { id: 1, name: 'East Wing', code: 'EAST', floor_count: 4, room_count: 6, occupied: 3, occupancy_pct: 50.0 },
  { id: 2, name: 'West Wing', code: 'WEST', floor_count: 3, room_count: 6, occupied: 2, occupancy_pct: 33.3 },
]

const roomTypes = [
  { id: 1, name: 'Standard', description: null, base_price: '120.00', capacity_adults: 2, capacity_children: 0, amenities: [] },
  { id: 2, name: 'Suite', description: null, base_price: '250.00', capacity_adults: 3, capacity_children: 2, amenities: [] },
]

const room = {
  id: 12,
  room_number: '101',
  room_type_id: 1,
  floor: 1,
  status: 'available',
  created_at: '2026-09-14T10:00:00.000000Z',
  updated_at: '2026-09-14T10:00:00.000000Z',
  room_type: {
    id: 1,
    name: 'Standard',
    description: null,
    base_price: '120.00',
    capacity_adults: 2,
    capacity_children: 0,
    amenities: [],
  },
}

function renderForm(initialEntry = '/staff/rooms/new') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/staff/rooms" element={<div>ROOMS_LIST</div>} />
        <Route path="/staff/rooms/new" element={<RoomForm />} />
        <Route path="/staff/rooms/:id/edit" element={<RoomForm />} />
      </Routes>
    </MemoryRouter>,
  )
}

async function fillCreateForm() {
  await screen.findByRole('option', { name: 'Suite' })
  await screen.findByRole('option', { name: 'East Wing' })
  fireEvent.change(screen.getByLabelText('Room number'), { target: { value: '102' } })
  fireEvent.change(screen.getByLabelText('Room type'), { target: { value: '2' } })
  fireEvent.change(screen.getByLabelText('Building'), { target: { value: '1' } })
  fireEvent.change(screen.getByLabelText('Floor'), { target: { value: '1' } })
}

describe('Staff room form page', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(apiClient)
    mock.onGet('/staff/room-types').reply(200, {
      success: true,
      data: roomTypes,
      meta: { page: 1, per_page: 50, total: 2, last_page: 1 },
    })
    mock.onGet('/staff/properties').reply(200, {
      success: true,
      data: properties,
      meta: { page: 1, per_page: 50, total: 1, last_page: 1 },
    })
    mock.onGet('/staff/properties/1/buildings').reply(200, {
      success: true,
      data: buildings,
    })
  })

  afterEach(() => {
    mock.restore()
  })

  it('renders the create form with a back link', () => {
    renderForm()
    expect(screen.getByText('Add a room')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Back to rooms/ })).toHaveAttribute('href', '/staff/rooms')
    expect(screen.getByLabelText('Room number')).toBeInTheDocument()
    expect(screen.getByLabelText('Room type')).toBeInTheDocument()
    expect(screen.getByLabelText('Floor')).toBeInTheDocument()
  })

  it('creates a room with the expected body and navigates back', async () => {
    mock.onPost('/staff/rooms').reply(201, { success: true, data: { id: 13 } })
    renderForm()
    await fillCreateForm()
    fireEvent.click(screen.getByRole('button', { name: 'Create room' }))
    expect(await screen.findByText('ROOMS_LIST')).toBeInTheDocument()
    const config = mock.history.post.find((r) => r.url === '/staff/rooms')
    expect(Object.keys(JSON.parse(config.data)).sort()).toEqual(['building_id', 'floor', 'room_number', 'room_type_id'])
    expect(JSON.parse(config.data)).toEqual({ room_number: '102', room_type_id: 2, building_id: 1, floor: 1 })
  })

  it('shows inline validation errors for an incomplete form', async () => {
    mock.onPost('/staff/rooms').reply(201, { success: true, data: { id: 13 } })
    renderForm()
    await screen.findByRole('option', { name: 'Suite' })
    await screen.findByRole('option', { name: 'East Wing' })
    fireEvent.click(screen.getByRole('button', { name: 'Create room' }))
    expect(screen.getByText('Room number is required.')).toBeInTheDocument()
    expect(screen.getByText('Select a room type.')).toBeInTheDocument()
    expect(screen.getByText(/Floor must be a whole number between 1 and 200\./)).toBeInTheDocument()
    expect(mock.history.post.length).toBe(0)
  })

  it('surfaces server 422 field errors', async () => {
    mock.onPost('/staff/rooms').reply(422, {
      success: false,
      message: 'The given data was invalid.',
      errors: { room_number: ['The room number has already been taken.'] },
    })
    renderForm()
    await fillCreateForm()
    fireEvent.click(screen.getByRole('button', { name: 'Create room' }))
    expect(await screen.findByText('The room number has already been taken.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create room' })).toBeInTheDocument()
  })

  it('shows a loading state while fetching an existing room', () => {
    mock.onGet('/staff/rooms/12').reply(() => new Promise(() => {}))
    renderForm('/staff/rooms/12/edit')
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('prefills the edit form from the fetched room', async () => {
    mock.onGet('/staff/rooms/12').reply(200, { success: true, data: { ...room, building_id: 1 } })
    renderForm('/staff/rooms/12/edit')
    expect(await screen.findByLabelText('Room number')).toHaveValue('101')
    expect(screen.getByLabelText('Room type')).toHaveValue('1')
    expect(screen.getByLabelText('Floor')).toHaveValue(1)
  })

  it('submits a full PUT payload on edit', async () => {
    mock.onGet('/staff/rooms/12').reply(200, { success: true, data: { ...room, building_id: 1 } })
    mock.onPut('/staff/rooms/12').reply(200, { success: true, data: room })
    renderForm('/staff/rooms/12/edit')
    await screen.findByLabelText('Room number')
    await screen.findByRole('option', { name: 'East Wing' })
    fireEvent.change(screen.getByLabelText('Room number'), { target: { value: '205' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('ROOMS_LIST')).toBeInTheDocument()
    const config = mock.history.put.find((r) => r.url === '/staff/rooms/12')
    expect(config).toBeTruthy()
    expect(JSON.parse(config.data)).toEqual({ room_number: '205', room_type_id: 1, building_id: 1, floor: 1 })
  })

  it('shows a friendly not-found state when editing a missing room', async () => {
    mock.onGet('/staff/rooms/12').reply(404, { success: false, message: 'Room not found.', errors: null })
    renderForm('/staff/rooms/12/edit')
    expect(await screen.findByText('The requested resource could not be found.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Back to rooms/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it('shows an error state with retry for edit load failures', async () => {
    let attempts = 0
    mock.onGet('/staff/rooms/12').reply(() => {
      attempts += 1
      if (attempts === 1) return [500, { success: false, message: 'Server error', errors: null }]
      return [200, { success: true, data: { ...room, building_id: 1 } }]
    })
    renderForm('/staff/rooms/12/edit')
    expect(await screen.findByText('Server error')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByLabelText('Room number')).toHaveValue('101')
  })

  it('shows a friendly message when no room types are configured', async () => {
    mock.onGet('/staff/room-types').reply(200, { success: true, data: [], meta: { page: 1, per_page: 50, total: 0, last_page: 1 } })
    renderForm()
    await waitFor(() => {
      expect(
        screen.getByText('No room types are configured yet. Add a room type before creating rooms.'),
      ).toBeInTheDocument()
    })
  })
})