import { staffBookings } from './bookingApi'
import { staffInvoices, staffPayments } from './paymentApi'
import { staffRooms } from './roomApi'

export const BOOKING_STATUSES = [
  'pending_payment',
  'confirmed',
  'checked_in',
  'checked_out',
  'cancelled',
  'no_show',
]

export const PAYMENT_STATUSES = ['pending', 'receipt_uploaded', 'verified', 'rejected', 'refunded']

export const ROOM_STATUSES = ['available', 'reserved', 'occupied', 'cleaning', 'maintenance']

const TO_REVIEW = ['pending', 'receipt_uploaded']

function totalFrom(response) {
  return response?.data?.meta?.total ?? 0
}

function itemsFrom(response) {
  return Array.isArray(response?.data?.data) ? response.data.data : []
}

/**
 * Dashboard metrics are derived only from the existing staff list endpoints.
 * Counts come from each response's `meta.total` (the backend count under the
 * filter); `per_page: 1` keeps count-only payloads tiny where the backend
 * accepts it. Bookings has no `per_page` rule, so those fetches use the
 * backend default (15 rows/page) — only `meta.total` is consumed.
 * No new HTTP endpoints exist; invoices never receives a `status` param.
 */
export const dashboard = {
  /** 6 parallel GET /staff/bookings?status=… — status counts + total. */
  async bookings() {
    const results = await Promise.allSettled(
      BOOKING_STATUSES.map((status) => staffBookings.list({ status })),
    )
    if (results.some((result) => result.status === 'rejected')) {
      throw new Error('Failed to load booking statistics')
    }
    const chart = results.map((result, index) => ({
      status: BOOKING_STATUSES[index],
      value: totalFrom(result.value),
    }))
    return {
      chart,
      total: chart.reduce((sum, entry) => sum + entry.value, 0),
      checkedIn: chart.find((entry) => entry.status === 'checked_in')?.value ?? 0,
    }
  },

  /** 5 parallel GET /staff/payments?status=…&per_page=1 — status counts + review queue. */
  async payments() {
    const results = await Promise.allSettled(
      PAYMENT_STATUSES.map((status) => staffPayments.list({ status, per_page: 1 })),
    )
    if (results.some((result) => result.status === 'rejected')) {
      throw new Error('Failed to load payment statistics')
    }
    const chart = results.map((result, index) => ({
      status: PAYMENT_STATUSES[index],
      value: totalFrom(result.value),
    }))
    return {
      chart,
      toReview: chart
        .filter((entry) => TO_REVIEW.includes(entry.status))
        .reduce((sum, entry) => sum + entry.value, 0),
    }
  },

  /** 5 parallel GET /staff/rooms?status=…&per_page=1 — occupancy. */
  async occupancy() {
    const results = await Promise.allSettled(
      ROOM_STATUSES.map((status) => staffRooms.list({ status, per_page: 1 })),
    )
    if (results.some((result) => result.status === 'rejected')) {
      throw new Error('Failed to load room occupancy')
    }
    const chart = results.map((result, index) => ({
      status: ROOM_STATUSES[index],
      value: totalFrom(result.value),
    }))
    const total = chart.reduce((sum, entry) => sum + entry.value, 0)
    const occupied = chart.find((entry) => entry.status === 'occupied')?.value ?? 0
    return {
      chart,
      occupied,
      total,
      pct: total > 0 ? Math.round((occupied / total) * 100) : 0,
    }
  },

  /** GET /staff/invoices?page=1 — issued total + recent invoices. */
  async invoices() {
    const response = await staffInvoices.list({ page: 1 })
    return {
      total: totalFrom(response),
      recent: itemsFrom(response),
    }
  },

  /** GET /staff/bookings?page=1 — most recent bookings. */
  async recentBookings() {
    const response = await staffBookings.list({ page: 1 })
    return itemsFrom(response)
  },

  /** GET /staff/payments?page=1 — most recent payments. */
  async recentPayments() {
    const response = await staffPayments.list({ page: 1 })
    return itemsFrom(response)
  },
}