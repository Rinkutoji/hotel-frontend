import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import MockAdapter from 'axios-mock-adapter'
import apiClient from '../api/client'
import { customerPayments, customerInvoices } from '../api/paymentApi'

describe('customerPayments api', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(apiClient)
  })

  afterEach(() => {
    mock.restore()
  })

  it('lists payments with query params', async () => {
    mock.onGet('/customer/payments').reply(200, {
      success: true,
      data: [],
      meta: { page: 2, per_page: 15, total: 0, last_page: 1 },
    })
    await customerPayments.list({ status: 'pending', page: 2 })
    const config = mock.history.get[0]
    expect(config.url).toBe('/customer/payments')
    expect(config.params).toEqual({ status: 'pending', page: 2 })
  })

  it('creates a payment with booking_id and method', async () => {
    mock.onPost('/customer/payments').reply(201, { success: true, data: { id: 4 } })
    const res = await customerPayments.create({ booking_id: 5, method: 'bank_transfer' })
    expect(res.data.data).toEqual({ id: 4 })
    const config = mock.history.post[0]
    expect(config.url).toBe('/customer/payments')
    expect(JSON.parse(config.data)).toEqual({ booking_id: 5, method: 'bank_transfer' })
  })

  it('shows a payment by id', async () => {
    mock.onGet('/customer/payments/4').reply(200, { success: true, data: { id: 4 } })
    const res = await customerPayments.show(4)
    expect(res.data.data).toEqual({ id: 4 })
    expect(mock.history.get[0].url).toBe('/customer/payments/4')
  })

  it('uploads a receipt as multipart form data', async () => {
    mock.onPost('/customer/payments/4/receipt').reply(200, {
      success: true,
      data: { id: 4, status: 'receipt_uploaded' },
    })
    const file = new File(['receipt-bytes'], 'receipt.png', { type: 'image/png' })
    await customerPayments.uploadReceipt(4, file)
    const config = mock.history.post[0]
    expect(config.url).toBe('/customer/payments/4/receipt')
    expect(config.data).toBeInstanceOf(FormData)
    expect(config.data.get('receipt')).toBe(file)
    expect(String(config.headers['Content-Type'])).toContain('multipart/form-data')
  })

  it('downloads a receipt as a blob', async () => {
    mock.onGet('/customer/payments/4/receipt').reply(200, new Blob(['file']))
    await customerPayments.downloadReceipt(4)
    const config = mock.history.get[0]
    expect(config.url).toBe('/customer/payments/4/receipt')
    expect(config.responseType).toBe('blob')
  })

  it('propagates API errors', async () => {
    mock.onPost('/customer/payments').reply(409, { success: false, message: 'Conflict' })
    await expect(customerPayments.create({ booking_id: 5, method: 'cash' })).rejects.toThrow()
  })
})

describe('customerInvoices api', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(apiClient)
  })

  afterEach(() => {
    mock.restore()
  })

  it('lists invoices with pagination params', async () => {
    mock.onGet('/customer/invoices').reply(200, {
      success: true,
      data: [],
      meta: { page: 1, per_page: 15, total: 0, last_page: 1 },
    })
    await customerInvoices.list({ page: 1 })
    const config = mock.history.get[0]
    expect(config.url).toBe('/customer/invoices')
    expect(config.params).toEqual({ page: 1 })
  })

  it('shows an invoice by id', async () => {
    mock.onGet('/customer/invoices/9').reply(200, { success: true, data: { id: 9 } })
    const res = await customerInvoices.show(9)
    expect(res.data.data).toEqual({ id: 9 })
    expect(mock.history.get[0].url).toBe('/customer/invoices/9')
  })

  it('propagates API errors', async () => {
    mock.onGet('/customer/invoices/9').reply(404, { success: false, message: 'Not found' })
    await expect(customerInvoices.show(9)).rejects.toThrow()
  })
})