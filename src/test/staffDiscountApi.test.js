import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import MockAdapter from 'axios-mock-adapter'
import apiClient from '../api/client'
import { staffDiscounts } from '../api/discountApi'

describe('staffDiscounts api', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(apiClient)
  })

  afterEach(() => {
    mock.restore()
  })

  it('lists tiers with search and pagination params', async () => {
    mock.onGet('/staff/discounts').reply(200, {
      success: true,
      data: [],
      meta: { page: 1, per_page: 15, total: 0, last_page: 1 },
    })
    await staffDiscounts.list({ search: 'Stay', page: 2 })
    const config = mock.history.get[0]
    expect(config.url).toBe('/staff/discounts')
    expect(config.params).toEqual({ search: 'Stay', page: 2 })
  })

  it('lists tiers without params when none are provided', async () => {
    mock.onGet('/staff/discounts').reply(200, {
      success: true,
      data: [],
      meta: { page: 1, per_page: 15, total: 0, last_page: 1 },
    })
    await staffDiscounts.list()
    expect(mock.history.get[0].params).toBeUndefined()
  })

  it('shows a tier by id', async () => {
    mock.onGet('/staff/discounts/3').reply(200, { success: true, data: { id: 3 } })
    await staffDiscounts.show(3)
    expect(mock.history.get[0].url).toBe('/staff/discounts/3')
  })

  it('creates a tier with name, min_nights and percent_off only', async () => {
    mock.onPost('/staff/discounts').reply(201, { success: true, data: { id: 4 } })
    await staffDiscounts.create({ name: 'Week stay', min_nights: 3, percent_off: '15.00' })
    const config = mock.history.post[0]
    expect(config.url).toBe('/staff/discounts')
    expect(JSON.parse(config.data)).toEqual({ name: 'Week stay', min_nights: 3, percent_off: '15.00' })
  })

  it('updates a tier with the PUT verb and full replacement body', async () => {
    mock.onPut('/staff/discounts/4').reply(200, { success: true, data: { id: 4 } })
    await staffDiscounts.update(4, { name: 'Week stay', min_nights: 4, percent_off: '20.00' })
    const config = mock.history.put[0]
    expect(config.url).toBe('/staff/discounts/4')
    expect(JSON.parse(config.data)).toEqual({ name: 'Week stay', min_nights: 4, percent_off: '20.00' })
  })

  it('deletes a tier', async () => {
    mock.onDelete('/staff/discounts/4').reply(200, { success: true, message: 'Discount deleted.', data: null })
    await staffDiscounts.destroy(4)
    expect(mock.history.delete[0].url).toBe('/staff/discounts/4')
  })

  it('propagates a 403 from an unauthorized caller', async () => {
    mock.onGet('/staff/discounts').reply(403, { success: false, message: 'Forbidden.', errors: null })
    await expect(staffDiscounts.list()).rejects.toThrow()
  })
})