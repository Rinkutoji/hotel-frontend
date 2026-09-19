import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import MockAdapter from 'axios-mock-adapter'
import apiClient from '../api/client'
import RoomTypeForm from '../pages/staff/RoomTypeForm'

const roomType = {
  id: 3,
  name: 'Suite',
  description: 'Spacious',
  base_price: '250.00',
  capacity_adults: 3,
  capacity_children: 2,
  amenities: ['WiFi', 'Balcony'],
  created_at: '2026-09-14T10:00:00.000000Z',
  updated_at: '2026-09-14T10:00:00.000000Z',
}

function renderForm(initialEntry = '/staff/room-types/new') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/staff/room-types" element={<div>ROOM_TYPES_LIST</div>} />
        <Route path="/staff/room-types/new" element={<RoomTypeForm />} />
        <Route path="/staff/room-types/:id/edit" element={<RoomTypeForm />} />
      </Routes>
    </MemoryRouter>,
  )
}

function fillCreateForm() {
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Deluxe' } })
  fireEvent.change(screen.getByLabelText('Base price / night'), { target: { value: '189.00' } })
  fireEvent.change(screen.getByLabelText('Adults'), { target: { value: '2' } })
  fireEvent.change(screen.getByLabelText('Children'), { target: { value: '1' } })
  fireEvent.change(screen.getByLabelText('Amenities'), { target: { value: 'WiFi, AC' } })
}

describe('Staff room type form page', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(apiClient)
  })

  afterEach(() => {
    mock.restore()
  })

  it('renders the create form with a back link', () => {
    renderForm()
    expect(screen.getByText('Add a room type')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Back to room types/ })).toHaveAttribute('href', '/staff/room-types')
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Base price / night')).toBeInTheDocument()
    expect(screen.getByLabelText('Amenities')).toBeInTheDocument()
  })

  it('creates a room type with an amenities array and navigates back', async () => {
    mock.onPost('/staff/room-types').reply(201, { success: true, data: { id: 4 } })
    renderForm()
    fillCreateForm()
    fireEvent.click(screen.getByRole('button', { name: 'Create room type' }))
    expect(await screen.findByText('ROOM_TYPES_LIST')).toBeInTheDocument()
    const config = mock.history.post.find((r) => r.url === '/staff/room-types')
    expect(JSON.parse(config.data)).toEqual({
      name: 'Deluxe',
      description: '',
      base_price: '189.00',
      capacity_adults: 2,
      capacity_children: 1,
      amenities: ['WiFi', 'AC'],
    })
  })

  it('strips empty amenities and trailing commas', async () => {
    mock.onPost('/staff/room-types').reply(201, { success: true, data: { id: 4 } })
    renderForm()
    fillCreateForm()
    fireEvent.change(screen.getByLabelText('Amenities'), { target: { value: 'WiFi, , AC,' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create room type' }))
    await screen.findByText('ROOM_TYPES_LIST')
    const config = mock.history.post.find((r) => r.url === '/staff/room-types')
    expect(JSON.parse(config.data).amenities).toEqual(['WiFi', 'AC'])
  })

  it('shows inline validation errors for an invalid form', async () => {
    renderForm()
    fireEvent.change(screen.getByLabelText('Base price / night'), { target: { value: 'abc' } })
    fireEvent.change(screen.getByLabelText('Adults'), { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create room type' }))
    expect(screen.getByText('Name is required.')).toBeInTheDocument()
    expect(screen.getByText('Base price must be a number with up to two decimals.')).toBeInTheDocument()
    expect(screen.getByText(/Capacity for adults must be a whole number between 1 and 20\./)).toBeInTheDocument()
    expect(screen.getByText(/Capacity for children must be a whole number between 0 and 20\./)).toBeInTheDocument()
    expect(mock.history.post.length).toBe(0)
  })

  it('rejects more than 30 amenities', async () => {
    renderForm()
    fillCreateForm()
    const many = Array.from({ length: 31 }, (_, index) => `Amenity ${index}`).join(', ')
    fireEvent.change(screen.getByLabelText('Amenities'), { target: { value: many } })
    fireEvent.click(screen.getByRole('button', { name: 'Create room type' }))
    expect(screen.getByText(/A maximum of 30 amenities is allowed\./)).toBeInTheDocument()
    expect(mock.history.post.length).toBe(0)
  })

  it('surfaces server 422 field errors', async () => {
    mock.onPost('/staff/room-types').reply(422, {
      success: false,
      message: 'The given data was invalid.',
      errors: { name: ['The name has already been taken.'] },
    })
    renderForm()
    fillCreateForm()
    fireEvent.click(screen.getByRole('button', { name: 'Create room type' }))
    expect(await screen.findByText('The name has already been taken.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create room type' })).toBeInTheDocument()
  })

  it('shows a loading state while fetching an existing room type', () => {
    mock.onGet('/staff/room-types/3').reply(() => new Promise(() => {}))
    renderForm('/staff/room-types/3/edit')
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('prefills the edit form including a comma-separated amenities field', async () => {
    mock.onGet('/staff/room-types/3').reply(200, { success: true, data: roomType })
    renderForm('/staff/room-types/3/edit')
    expect(await screen.findByLabelText('Name')).toHaveValue('Suite')
    expect(screen.getByLabelText('Base price / night')).toHaveValue('250.00')
    expect(screen.getByLabelText('Adults')).toHaveValue(3)
    expect(screen.getByLabelText('Amenities')).toHaveValue('WiFi, Balcony')
  })

  it('submits a full PUT payload on edit', async () => {
    mock.onGet('/staff/room-types/3').reply(200, { success: true, data: roomType })
    mock.onPut('/staff/room-types/3').reply(200, { success: true, data: roomType })
    renderForm('/staff/room-types/3/edit')
    await screen.findByLabelText('Name')
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Executive Suite' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('ROOM_TYPES_LIST')).toBeInTheDocument()
    const config = mock.history.put.find((r) => r.url === '/staff/room-types/3')
    expect(config).toBeTruthy()
    expect(JSON.parse(config.data)).toEqual({
      name: 'Executive Suite',
      description: 'Spacious',
      base_price: '250.00',
      capacity_adults: 3,
      capacity_children: 2,
      amenities: ['WiFi', 'Balcony'],
    })
  })

  it('shows a friendly not-found state when editing a missing room type', async () => {
    mock.onGet('/staff/room-types/3').reply(404, { success: false, message: 'Room type not found.', errors: null })
    renderForm('/staff/room-types/3/edit')
    expect(await screen.findByText('The requested resource could not be found.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Back to room types/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it('deletes a room type after confirmation and navigates back', async () => {
    mock.onGet('/staff/room-types/3').reply(200, { success: true, data: roomType })
    mock.onDelete('/staff/room-types/3').reply(200, { success: true, message: 'Room type deleted.', data: null })
    renderForm('/staff/room-types/3/edit')
    fireEvent.click(await screen.findByRole('button', { name: 'Delete room type' }))
    expect(screen.getByText('Delete this room type?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }))
    expect(await screen.findByText('ROOM_TYPES_LIST')).toBeInTheDocument()
    expect(mock.history.delete.some((r) => r.url === '/staff/room-types/3')).toBe(true)
  })

  it('surfaces the 409 server message when a room type has physical rooms', async () => {
    mock.onGet('/staff/room-types/3').reply(() => [
      200,
      { success: true, data: roomType },
    ])
    mock.onDelete('/staff/room-types/3').reply(409, {
      success: false,
      message: 'Cannot delete a room type that has physical rooms. Remove or reassign its rooms first.',
      errors: null,
    })
    renderForm('/staff/room-types/3/edit')
    fireEvent.click(await screen.findByRole('button', { name: 'Delete room type' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }))
    expect(
      await screen.findByText(/Cannot delete a room type that has physical rooms\./),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete room type' })).toBeInTheDocument()
  })
})