import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import MockAdapter from 'axios-mock-adapter'
import apiClient from '../api/client'
import { staffInvoices } from '../api/paymentApi'

describe('staffInvoices api', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(apiClient)
  })

  afterEach(() => {
    mock.restore()
  })

  it('lists invoices issuing only the supported search and page params', async () => {
    mock.onGet('/staff/invoices').reply(200, {
      success: true,
      data: [],
      meta: { page: 1, per_page: 15, total: 0, last_page: 1 },
    })
    await staffInvoices.list({ search: 'BK-AB', page: 2 })
    const config = mock.history.get[0]
    expect(config.url).toBe('/staff/invoices')
    expect(config.params).toEqual({ search: 'BK-AB', page: 2 })
  })

  it('lists invoices without params when none are provided', async () => {
    mock.onGet('/staff/invoices').reply(200, {
      success: true,
      data: [],
      meta: { page: 1, per_page: 15, total: 0, last_page: 1 },
    })
    await staffInvoices.list()
    const config = mock.history.get[0]
    expect(config.url).toBe('/staff/invoices')
    expect(config.params).toBeUndefined()
  })

  it('never forwards a status param on the staff invoice list', async () => {
    mock.onGet('/staff/invoices').reply(200, {
      success: true,
      data: [],
      meta: { page: 1, per_page: 15, total: 0, last_page: 1 },
    })
    await staffInvoices.list({ status: 'verified' })
    const config = mock.history.get[0]
    expect(config.params.status).toBeUndefined()
  })

  it('shows an invoice by id', async () => {
    mock.onGet('/staff/invoices/9').reply(200, { success: true, data: { id: 9 } })
    const res = await staffInvoices.show(9)
    expect(res.data.data).toEqual({ id: 9 })
    expect(mock.history.get[0].url).toBe('/staff/invoices/9')
  })

  it('propagates a 404 error from show', async () => {
    mock.onGet('/staff/invoices/99').reply(404, { success: false, message: 'Not found.', errors: null })
    await expect(staffInvoices.show(99)).rejects.toThrow()
  })
})