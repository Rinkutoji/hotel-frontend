import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import MockAdapter from 'axios-mock-adapter'
import apiClient from '../api/client'
import { customerBookings } from '../api/bookingApi'

describe('customerBookings api', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(apiClient)
  })

  afterEach(() => {
    mock.restore()
  })

  it('creates a booking with dates and rooms', async () => {
    mock.onPost('/customer/bookings').reply(201, { success: true, data: { id: 7 } })
    const booking = {
      check_in_date: '2026-09-16',
      check_out_date: '2026-09-18',
      rooms: [1, 2],
    }
    await customerBookings.create(booking)
    const config = mock.history.post[0]
    expect(config.url).toBe('/customer/bookings')
    expect(JSON.parse(config.data)).toEqual(booking)
  })

  it('lists bookings with a status filter and page', async () => {
    mock
      .onGet('/customer/bookings')
      .reply(200, { success: true, data: [], meta: { page: 1, per_page: 15, total: 0, last_page: 1 } })
    await customerBookings.list({ status: 'pending_payment', page: 2 })
    const config = mock.history.get[0]
    expect(config.url).toBe('/customer/bookings')
    expect(config.params).toEqual({ status: 'pending_payment', page: 2 })
  })

  it('shows a booking by id', async () => {
    mock.onGet('/customer/bookings/7').reply(200, { success: true, data: { id: 7 } })
    const res = await customerBookings.show(7)
    expect(res.data.data).toEqual({ id: 7 })
    expect(mock.history.get[0].url).toBe('/customer/bookings/7')
  })

  it('cancels a booking with a reason', async () => {
    mock.onPost('/customer/bookings/7/cancel').reply(200, { success: true, data: { id: 7, status: 'cancelled' } })
    await customerBookings.cancel(7, 'Plans changed')
    const config = mock.history.post[0]
    expect(config.url).toBe('/customer/bookings/7/cancel')
    expect(JSON.parse(config.data)).toEqual({ reason: 'Plans changed' })
  })

  it('cancels a booking without a reason', async () => {
    mock.onPost('/customer/bookings/7/cancel').reply(200, { success: true, data: { id: 7, status: 'cancelled' } })
    await customerBookings.cancel(7)
    const config = mock.history.post[0]
    expect(config.url).toBe('/customer/bookings/7/cancel')
    expect(JSON.parse(config.data)).toEqual({})
  })

  it('propagates API errors', async () => {
    mock.onPost('/customer/bookings').reply(409, { success: false, message: 'Conflict', errors: null })
    await expect(customerBookings.create({ check_in_date: 'x', check_out_date: 'y', rooms: [1] })).rejects.toThrow()
  })
})