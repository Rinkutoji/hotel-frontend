import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import MockAdapter from 'axios-mock-adapter'
import apiClient from '../api/client'
import { staffRooms, staffRoomTypes, staffRoomImages } from '../api/roomApi'

describe('staffRooms api', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(apiClient)
  })

  afterEach(() => {
    mock.restore()
  })

  const paginatedReply = { success: true, data: [], meta: { page: 1, per_page: 15, total: 0, last_page: 1 } }

  it('lists rooms with all supported filters', async () => {
    mock.onGet('/staff/rooms').reply(200, paginatedReply)
    await staffRooms.list({
      search: '101',
      room_type_id: 3,
      floor: 1,
      status: 'maintenance',
      sort: 'floor',
      direction: 'desc',
      per_page: 50,
    })
    const config = mock.history.get[0]
    expect(config.url).toBe('/staff/rooms')
    expect(config.params).toEqual({
      search: '101',
      room_type_id: 3,
      floor: 1,
      status: 'maintenance',
      sort: 'floor',
      direction: 'desc',
      per_page: 50,
    })
  })

  it('lists rooms without params when none are provided', async () => {
    mock.onGet('/staff/rooms').reply(200, paginatedReply)
    await staffRooms.list()
    const config = mock.history.get[0]
    expect(config.url).toBe('/staff/rooms')
    expect(config.params).toBeUndefined()
  })

  it('shows a room by id', async () => {
    mock.onGet('/staff/rooms/12').reply(200, { success: true, data: { id: 12 } })
    const res = await staffRooms.show(12)
    expect(res.data.data).toEqual({ id: 12 })
    expect(mock.history.get[0].url).toBe('/staff/rooms/12')
  })

  it('creates a room with room_number, room_type_id and floor only', async () => {
    mock.onPost('/staff/rooms').reply(201, { success: true, data: { id: 13 } })
    await staffRooms.create({ room_number: '204', room_type_id: 3, floor: 2 })
    const config = mock.history.post[0]
    expect(config.url).toBe('/staff/rooms')
    expect(JSON.parse(config.data)).toEqual({ room_number: '204', room_type_id: 3, floor: 2 })
  })

  it('updates a room with the PUT verb and full body', async () => {
    mock.onPut('/staff/rooms/12').reply(200, { success: true, data: { id: 12 } })
    await staffRooms.update(12, { room_number: '205', room_type_id: 4, floor: 2 })
    const config = mock.history.put[0]
    expect(config.url).toBe('/staff/rooms/12')
    expect(JSON.parse(config.data)).toEqual({ room_number: '205', room_type_id: 4, floor: 2 })
  })

  it('deletes a room', async () => {
    mock.onDelete('/staff/rooms/12').reply(200, { success: true, message: 'Room deleted.', data: null })
    await staffRooms.destroy(12)
    expect(mock.history.delete[0].url).toBe('/staff/rooms/12')
  })

  it('marks a room for maintenance with a reason', async () => {
    mock.onPost('/staff/rooms/12/status/maintenance').reply(200, { success: true, data: { id: 12 } })
    await staffRooms.toMaintenance(12, 'Leaky tap')
    const config = mock.history.post[0]
    expect(config.url).toBe('/staff/rooms/12/status/maintenance')
    expect(JSON.parse(config.data)).toEqual({ reason: 'Leaky tap' })
  })

  it('marks a room for maintenance without a reason body key', async () => {
    mock.onPost('/staff/rooms/12/status/maintenance').reply(200, { success: true, data: { id: 12 } })
    await staffRooms.toMaintenance(12)
    const config = mock.history.post[0]
    expect(config.url).toBe('/staff/rooms/12/status/maintenance')
    expect(JSON.parse(config.data)).toEqual({})
  })

  it('marks a room available', async () => {
    mock.onPost('/staff/rooms/12/status/available').reply(200, { success: true, data: { id: 12 } })
    await staffRooms.toAvailable(12)
    const config = mock.history.post[0]
    expect(config.url).toBe('/staff/rooms/12/status/available')
    expect(JSON.parse(config.data)).toEqual({})
  })

  it('propagates status transition 409s', async () => {
    mock
      .onPost('/staff/rooms/12/status/maintenance')
      .reply(409, { success: false, message: 'Illegal transition.', errors: null })
    await expect(staffRooms.toMaintenance(12)).rejects.toThrow()
  })
})

describe('staffRoomTypes api', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(apiClient)
  })

  afterEach(() => {
    mock.restore()
  })

  const paginatedReply = { success: true, data: [], meta: { page: 1, per_page: 15, total: 0, last_page: 1 } }

  it('lists room types with filters', async () => {
    mock.onGet('/staff/room-types').reply(200, paginatedReply)
    await staffRoomTypes.list({ search: 'Suite', min_price: '100', max_price: '500', per_page: 30 })
    const config = mock.history.get[0]
    expect(config.url).toBe('/staff/room-types')
    expect(config.params).toEqual({ search: 'Suite', min_price: '100', max_price: '500', per_page: 30 })
  })

  it('lists room types without params when none are provided', async () => {
    mock.onGet('/staff/room-types').reply(200, paginatedReply)
    await staffRoomTypes.list()
    expect(mock.history.get[0].params).toBeUndefined()
  })

  it('shows a room type by id', async () => {
    mock.onGet('/staff/room-types/3').reply(200, { success: true, data: { id: 3 } })
    await staffRoomTypes.show(3)
    expect(mock.history.get[0].url).toBe('/staff/room-types/3')
  })

  it('creates a room type with amenities array', async () => {
    mock.onPost('/staff/room-types').reply(201, { success: true, data: { id: 3 } })
    await staffRoomTypes.create({
      name: 'Deluxe',
      description: 'Spacious',
      base_price: '189.00',
      capacity_adults: 2,
      capacity_children: 1,
      amenities: ['WiFi', 'AC'],
    })
    const config = mock.history.post[0]
    expect(config.url).toBe('/staff/room-types')
    expect(JSON.parse(config.data)).toEqual({
      name: 'Deluxe',
      description: 'Spacious',
      base_price: '189.00',
      capacity_adults: 2,
      capacity_children: 1,
      amenities: ['WiFi', 'AC'],
    })
  })

  it('updates a room type with the PUT verb', async () => {
    mock.onPut('/staff/room-types/3').reply(200, { success: true, data: { id: 3 } })
    await staffRoomTypes.update(3, { name: 'Deluxe', base_price: '199.00', capacity_adults: 2, capacity_children: 0 })
    const config = mock.history.put[0]
    expect(config.url).toBe('/staff/room-types/3')
    expect(JSON.parse(config.data)).toEqual({
      name: 'Deluxe',
      base_price: '199.00',
      capacity_adults: 2,
      capacity_children: 0,
    })
  })

  it('deletes a room type', async () => {
    mock.onDelete('/staff/room-types/3').reply(200, { success: true, message: 'Room type deleted.', data: null })
    await staffRoomTypes.destroy(3)
    expect(mock.history.delete[0].url).toBe('/staff/room-types/3')
  })

  it('deleting a room type with physical rooms propagates 409', async () => {
    mock
      .onDelete('/staff/room-types/3')
      .reply(409, { success: false, message: 'Cannot delete a room type that has physical rooms.', errors: null })
    await expect(staffRoomTypes.destroy(3)).rejects.toThrow()
  })

  it('lists images for a room type', async () => {
    mock.onGet('/staff/room-types/3/images').reply(200, { success: true, data: [] })
    await staffRoomTypes.listImages(3)
    expect(mock.history.get[0].url).toBe('/staff/room-types/3/images')
  })

  it('uploads an image as multipart form data with an image field', async () => {
    mock.onPost('/staff/room-types/3/images').reply(201, { success: true, data: { id: 9 } })
    const file = new File(['data'], 'room.jpg', { type: 'image/jpeg' })
    await staffRoomTypes.uploadImage(3, file)
    const config = mock.history.post[0]
    expect(config.url).toBe('/staff/room-types/3/images')
    expect(config.headers['Content-Type']).toBe('multipart/form-data')
    expect(config.data).toBeInstanceOf(FormData)
    expect(config.data.get('image')).toBe(file)
  })
})

describe('staffRoomImages api', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(apiClient)
  })

  afterEach(() => {
    mock.restore()
  })

  it('updates the sort order of an image with the PUT verb', async () => {
    mock.onPut('/staff/room-images/9').reply(200, { success: true, data: { id: 9, sort_order: 2 } })
    await staffRoomImages.updateSortOrder(9, 2)
    const config = mock.history.put[0]
    expect(config.url).toBe('/staff/room-images/9')
    expect(JSON.parse(config.data)).toEqual({ sort_order: 2 })
  })

  it('deletes an image', async () => {
    mock.onDelete('/staff/room-images/9').reply(200, { success: true, message: 'Image deleted.', data: null })
    await staffRoomImages.destroy(9)
    expect(mock.history.delete[0].url).toBe('/staff/room-images/9')
  })
})