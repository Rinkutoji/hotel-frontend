import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import MockAdapter from 'axios-mock-adapter'
import apiClient from '../api/client'
import { publicRooms } from '../api/roomApi'

describe('roomApi', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(apiClient)
  })

  afterEach(() => {
    mock.restore()
  })

  it('lists room types with query params', async () => {
    mock.onGet('/public/room-types').reply(200, { success: true, data: [], meta: {} })
    await publicRooms.listRoomTypes({ search: 'suite', min_price: 100, sort: 'base_price', direction: 'desc', per_page: 12, page: 2 })
    const config = mock.history.get[0]
    expect(config.url).toBe('/public/room-types')
    expect(config.params).toEqual({
      search: 'suite',
      min_price: 100,
      sort: 'base_price',
      direction: 'desc',
      per_page: 12,
      page: 2,
    })
  })

  it('gets a single room type', async () => {
    mock.onGet('/public/room-types/7').reply(200, { success: true, data: { id: 7 } })
    const res = await publicRooms.getRoomType(7)
    expect(res.data.data).toEqual({ id: 7 })
    expect(mock.history.get[0].url).toBe('/public/room-types/7')
  })

  it('gets room type images', async () => {
    mock.onGet('/public/room-types/7/images').reply(200, { success: true, data: [] })
    await publicRooms.getRoomTypeImages(7)
    expect(mock.history.get[0].url).toBe('/public/room-types/7/images')
  })

  it('lists rooms with query params', async () => {
    mock.onGet('/public/rooms').reply(200, { success: true, data: [], meta: {} })
    await publicRooms.listRooms({ status: 'available', room_type_id: 3, sort: 'room_number' })
    const config = mock.history.get[0]
    expect(config.url).toBe('/public/rooms')
    expect(config.params).toEqual({ status: 'available', room_type_id: 3, sort: 'room_number' })
  })

  it('gets a single room', async () => {
    mock.onGet('/public/rooms/101').reply(200, { success: true, data: { id: 101 } })
    const res = await publicRooms.getRoom(101)
    expect(res.data.data).toEqual({ id: 101 })
  })

  it('checks availability with a JSON body', async () => {
    mock.onPost('/public/availability').reply(200, { success: true, data: [] })
    await publicRooms.checkAvailability({
      check_in_date: '2026-09-15',
      check_out_date: '2026-09-18',
      rooms: [1, 2],
    })
    const config = mock.history.post[0]
    expect(config.url).toBe('/public/availability')
    expect(JSON.parse(config.data)).toEqual({
      check_in_date: '2026-09-15',
      check_out_date: '2026-09-18',
      rooms: [1, 2],
    })
  })

  it('propagates API errors', async () => {
    mock.onGet('/public/room-types').reply(500, { message: 'Server error' })
    await expect(publicRooms.listRoomTypes({})).rejects.toThrow()
  })
})