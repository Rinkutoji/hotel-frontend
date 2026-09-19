import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import MockAdapter from 'axios-mock-adapter'
import apiClient from '../api/client'
import { dashboard } from '../api/dashboardApi'

const BOOKINGS_BY_STATUS = {
  pending_payment: 1,
  confirmed: 6,
  checked_in: 2,
  checked_out: 3,
  cancelled: 0,
  no_show: 1,
}

const PAYMENTS_BY_STATUS = {
  pending: 3,
  receipt_uploaded: 2,
  verified: 7,
  rejected: 0,
  refunded: 1,
}

const ROOMS_BY_STATUS = {
  available: 8,
  reserved: 3,
  occupied: 4,
  cleaning: 1,
  maintenance: 0,
}

function paged(count) {
  return {
    success: true,
    data: [],
    meta: { page: 1, per_page: 1, total: count, last_page: 1 },
  }
}

let mock

beforeEach(() => {
  mock = new MockAdapter(apiClient)
})

afterEach(() => {
  mock.restore()
})

function repliesTo(url, map) {
  mock.onGet(url).reply((config) => {
    const status = config.params?.status
    return [200, paged(status in map ? map[status] : 0)]
  })
}

describe('dashboard API aggregation', () => {
  it('loads booking counts per status and derives the total', async () => {
    repliesTo('/staff/bookings', BOOKINGS_BY_STATUS)
    const result = await dashboard.bookings()
    const statuses = mock.history.get
      .filter((request) => request.url === '/staff/bookings')
      .map((request) => request.params?.status)
    expect(statuses.sort()).toEqual(
      Object.keys(BOOKINGS_BY_STATUS).sort(),
    )
    expect(result.total).toBe(13)
    expect(result.checkedIn).toBe(2)
    expect(result.chart.find((entry) => entry.status === 'confirmed').value).toBe(6)
  })

  it('rejects the bookings group when any status request fails', async () => {
    mock.onGet('/staff/bookings').reply((config) => {
      if (config.params?.status === 'no_show') return [500, { success: false, message: 'Boom' }]
      return [200, paged(2)]
    })
    await expect(dashboard.bookings()).rejects.toThrow('Failed to load booking statistics')
  })

  it('loads payment counts with per_page=1 and derives the review queue', async () => {
    repliesTo('/staff/payments', PAYMENTS_BY_STATUS)
    const result = await dashboard.payments()
    const requests = mock.history.get.filter((request) => request.url === '/staff/payments')
    expect(requests).toHaveLength(5)
    requests.forEach((request) => {
      expect(request.params.per_page).toBe(1)
    })
    expect(result.toReview).toBe(5)
    expect(result.chart.find((entry) => entry.status === 'verified').value).toBe(7)
  })

  it('loads room occupancy with per_page=1 and computes the percentage', async () => {
    repliesTo('/staff/rooms', ROOMS_BY_STATUS)
    const result = await dashboard.occupancy()
    const requests = mock.history.get.filter((request) => request.url === '/staff/rooms')
    expect(requests).toHaveLength(5)
    requests.forEach((request) => {
      expect(request.params.per_page).toBe(1)
    })
    expect(result.occupied).toBe(4)
    expect(result.total).toBe(16)
    expect(result.pct).toBe(25)
  })

  it('loads invoices with page=1 and never sends a status param', async () => {
    mock.onGet('/staff/invoices').reply(200, {
      success: true,
      data: [{ id: 9, invoice_number: 'INV-1', total_amount: '200.00' }],
      meta: { page: 1, per_page: 15, total: 12, last_page: 1 },
    })
    const result = await dashboard.invoices()
    const request = mock.history.get.find((entry) => entry.url === '/staff/invoices')
    expect(request.params).toEqual({ page: 1 })
    expect(request.params.status).toBeUndefined()
    expect(result.total).toBe(12)
    expect(result.recent).toHaveLength(1)
  })

  it('loads recent bookings and payments from page 1', async () => {
    mock.onGet('/staff/bookings').reply(200, {
      success: true,
      data: [{ id: 1, booking_number: 'BK-1', status: 'confirmed' }],
      meta: { page: 1, per_page: 15, total: 1, last_page: 1 },
    })
    mock.onGet('/staff/payments').reply(200, {
      success: true,
      data: [{ id: 5, status: 'pending', amount: '100.00' }],
      meta: { page: 1, per_page: 15, total: 1, last_page: 1 },
    })

    const bookings = await dashboard.recentBookings()
    expect(bookings[0].booking_number).toBe('BK-1')

    const payments = await dashboard.recentPayments()
    expect(payments[0].amount).toBe('100.00')
  })
})