import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import MockAdapter from 'axios-mock-adapter'
import apiClient from '../api/client'
import { staffPayments } from '../api/paymentApi'

describe('staffPayments api', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(apiClient)
  })

  afterEach(() => {
    mock.restore()
  })

  const paginatedReply = { success: true, data: [], meta: { page: 1, per_page: 15, total: 0, last_page: 1 } }

  it('lists payments with status and search filters', async () => {
    mock.onGet('/staff/payments').reply(200, paginatedReply)
    await staffPayments.list({ status: 'receipt_uploaded', search: 'John', page: 2 })
    const config = mock.history.get[0]
    expect(config.url).toBe('/staff/payments')
    expect(config.params).toEqual({ status: 'receipt_uploaded', search: 'John', page: 2 })
  })

  it('lists payments without params when none are provided', async () => {
    mock.onGet('/staff/payments').reply(200, paginatedReply)
    await staffPayments.list()
    const config = mock.history.get[0]
    expect(config.url).toBe('/staff/payments')
    expect(config.params).toBeUndefined()
  })

  it('shows a payment by id', async () => {
    mock.onGet('/staff/payments/4').reply(200, { success: true, data: { id: 4 } })
    const res = await staffPayments.show(4)
    expect(res.data.data).toEqual({ id: 4 })
    expect(mock.history.get[0].url).toBe('/staff/payments/4')
  })

  it('downloads a receipt as a blob', async () => {
    mock.onGet('/staff/payments/4/receipt').reply(200, new Blob(['file']))
    await staffPayments.downloadReceipt(4)
    const config = mock.history.get[0]
    expect(config.url).toBe('/staff/payments/4/receipt')
    expect(config.responseType).toBe('blob')
  })

  it('verifies a payment with no body', async () => {
    mock.onPost('/staff/payments/4/verify').reply(200, { success: true, data: { id: 4, status: 'verified' } })
    const res = await staffPayments.verify(4)
    expect(res.data.data.status).toBe('verified')
    const config = mock.history.post[0]
    expect(config.url).toBe('/staff/payments/4/verify')
    expect(config.data).toBeUndefined()
  })

  it('rejects a payment with a reason', async () => {
    mock.onPost('/staff/payments/4/reject').reply(200, { success: true, data: { id: 4, status: 'rejected' } })
    await staffPayments.reject(4, 'Receipt illegible')
    const config = mock.history.post[0]
    expect(config.url).toBe('/staff/payments/4/reject')
    expect(JSON.parse(config.data)).toEqual({ reason: 'Receipt illegible' })
  })

  it('refunds a payment with a reason', async () => {
    mock.onPost('/staff/payments/4/refund').reply(200, { success: true, data: { id: 4, status: 'refunded' } })
    await staffPayments.refund(4, 'Guest cancelled')
    const config = mock.history.post[0]
    expect(config.url).toBe('/staff/payments/4/refund')
    expect(JSON.parse(config.data)).toEqual({ reason: 'Guest cancelled' })
  })

  it('propagates API errors', async () => {
    mock.onPost('/staff/payments/4/verify').reply(409, { success: false, message: 'Conflict', errors: null })
    await expect(staffPayments.verify(4)).rejects.toThrow()
  })

  it('propagates receipt download 404s', async () => {
    mock.onGet('/staff/payments/4/receipt').reply(404, { success: false, message: 'Receipt not found.', errors: null })
    await expect(staffPayments.downloadReceipt(4)).rejects.toThrow()
  })
})