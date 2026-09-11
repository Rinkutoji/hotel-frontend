import apiClient from './client'

// ── Customer ─────────────────────────────────────────────────────────────────

export const customerBookings = {
  /** GET /api/v1/customer/bookings */
  list: (params) => apiClient.get('/customer/bookings', { params }),

  /** POST /api/v1/customer/bookings */
  create: (data) => apiClient.post('/customer/bookings', data),

  /** GET /api/v1/customer/bookings/:id */
  show: (id) => apiClient.get(`/customer/bookings/${id}`),

  /** POST /api/v1/customer/bookings/:id/cancel */
  cancel: (id) => apiClient.post(`/customer/bookings/${id}/cancel`),
}

// ── Staff ─────────────────────────────────────────────────────────────────────

export const staffBookings = {
  /** GET /api/v1/staff/bookings */
  list: (params) => apiClient.get('/staff/bookings', { params }),

  /** GET /api/v1/staff/bookings/:id */
  show: (id) => apiClient.get(`/staff/bookings/${id}`),

  /** POST /api/v1/staff/bookings/:id/confirm */
  confirm: (id) => apiClient.post(`/staff/bookings/${id}/confirm`),

  /** POST /api/v1/staff/bookings/:id/cancel */
  cancel: (id) => apiClient.post(`/staff/bookings/${id}/cancel`),

  /** POST /api/v1/staff/bookings/:id/check-in */
  checkIn: (id) => apiClient.post(`/staff/bookings/${id}/check-in`),

  /** POST /api/v1/staff/bookings/:id/check-out */
  checkOut: (id) => apiClient.post(`/staff/bookings/${id}/check-out`),
}
