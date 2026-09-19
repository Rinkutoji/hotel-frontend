import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import MockAdapter from 'axios-mock-adapter'
import apiClient from '../api/client'
import { staffBookings } from '../api/bookingApi'

describe('staffBookings api', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(apiClient)
  })

  afterEach(() => {
    mock.restore()
  })

  it('lists bookings with a status filter and page', async () => {
    mock
      .onGet('/staff/bookings')
      .reply(200, { success: true, data: [], meta: { page: 1, per_page: 15, total: 0, last_page: 1 } })
    await staffBookings.list({ status: 'confirmed', page: 2 })
    const config = mock.history.get[0]
    expect(config.url).toBe('/staff/bookings')
    expect(config.params).toEqual({ status: 'confirmed', page: 2 })
  })

  it('lists bookings with date-range and search filters', async () => {
    mock
      .onGet('/staff/bookings')
      .reply(200, { success: true, data: [], meta: { page: 1, per_page: 15, total: 0, last_page: 1 } })
    await staffBookings.list({ from: '2026-10-01', to: '2026-10-05', search: 'John' })
    const config = mock.history.get[0]
    expect(config.url).toBe('/staff/bookings')
    expect(config.params).toEqual({ from: '2026-10-01', to: '2026-10-05', search: 'John' })
  })

  it('lists bookings without params when none are provided', async () => {
    mock
      .onGet('/staff/bookings')
      .reply(200, { success: true, data: [], meta: { page: 1, per_page: 15, total: 0, last_page: 1 } })
    await staffBookings.list()
    const config = mock.history.get[0]
    expect(config.url).toBe('/staff/bookings')
    expect(config.params).toBeUndefined()
  })

  it('shows a booking by id', async () => {
    mock.onGet('/staff/bookings/7').reply(200, { success: true, data: { id: 7 } })
    const res = await staffBookings.show(7)
    expect(res.data.data).toEqual({ id: 7 })
    expect(mock.history.get[0].url).toBe('/staff/bookings/7')
  })

  it('confirms a booking', async () => {
    mock.onPost('/staff/bookings/7/confirm').reply(200, { success: true, data: { id: 7, status: 'confirmed' } })
    const res = await staffBookings.confirm(7)
    expect(res.data.data.status).toBe('confirmed')
    const config = mock.history.post[0]
    expect(config.url).toBe('/staff/bookings/7/confirm')
    expect(config.data).toBeUndefined()
  })

  it('cancels a booking with a reason', async () => {
    mock.onPost('/staff/bookings/7/cancel').reply(200, { success: true, data: { id: 7, status: 'cancelled' } })
    await staffBookings.cancel(7, 'Guest requested')
    const config = mock.history.post[0]
    expect(config.url).toBe('/staff/bookings/7/cancel')
    expect(JSON.parse(config.data)).toEqual({ reason: 'Guest requested' })
  })

  it('cancels a booking without a reason', async () => {
    mock.onPost('/staff/bookings/7/cancel').reply(200, { success: true, data: { id: 7, status: 'cancelled' } })
    await staffBookings.cancel(7)
    const config = mock.history.post[0]
    expect(config.url).toBe('/staff/bookings/7/cancel')
    expect(JSON.parse(config.data)).toEqual({})
  })

  it('checks a booking in', async () => {
    mock.onPost('/staff/bookings/7/check-in').reply(200, { success: true, data: { id: 7, status: 'checked_in' } })
    const res = await staffBookings.checkIn(7)
    expect(res.data.data.status).toBe('checked_in')
    const config = mock.history.post[0]
    expect(config.url).toBe('/staff/bookings/7/check-in')
    expect(config.data).toBeUndefined()
  })

  it('checks a booking out', async () => {
    mock.onPost('/staff/bookings/7/check-out').reply(200, { success: true, data: { id: 7, status: 'checked_out' } })
    const res = await staffBookings.checkOut(7)
    expect(res.data.data.status).toBe('checked_out')
    const config = mock.history.post[0]
    expect(config.url).toBe('/staff/bookings/7/check-out')
    expect(config.data).toBeUndefined()
  })

  it('propagates API errors', async () => {
    mock.onPost('/staff/bookings/7/confirm').reply(409, { success: false, message: 'Conflict', errors: null })
    await expect(staffBookings.confirm(7)).rejects.toThrow()
  })
})