import apiClient from './client'

// ── Customer ─────────────────────────────────────────────────────────────────

export const customerPayments = {
  /** GET /api/v1/customer/payments */
  list: (params) => apiClient.get('/customer/payments', { params }),

  /** POST /api/v1/customer/payments */
  create: (data) => apiClient.post('/customer/payments', data),

  /** GET /api/v1/customer/payments/:id */
  show: (id) => apiClient.get(`/customer/payments/${id}`),

  /** POST /api/v1/customer/payments/:id/receipt (multipart/form-data) */
  uploadReceipt: (id, file) => {
    const formData = new FormData()
    formData.append('receipt', file)
    return apiClient.post(`/customer/payments/${id}/receipt`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  /** GET /api/v1/customer/payments/:id/receipt (binary download) */
  downloadReceipt: (id) =>
    apiClient.get(`/customer/payments/${id}/receipt`, { responseType: 'blob' }),
}

export const customerInvoices = {
  /** GET /api/v1/customer/invoices */
  list: (params) => apiClient.get('/customer/invoices', { params }),

  /** GET /api/v1/customer/invoices/:id */
  show: (id) => apiClient.get(`/customer/invoices/${id}`),
}

export const staffInvoices = {
  /** GET /api/v1/staff/invoices — the backend prohibits a status filter (422). */
  list: (params) => {
    if (params) {
      const { status: _status, ...safeParams } = params
      return apiClient.get('/staff/invoices', { params: safeParams })
    }
    return apiClient.get('/staff/invoices')
  },

  /** GET /api/v1/staff/invoices/:id */
  show: (id) => apiClient.get(`/staff/invoices/${id}`),
}

// ── Staff ─────────────────────────────────────────────────────────────────────

export const staffPayments = {
  /** GET /api/v1/staff/payments */
  list: (params) => apiClient.get('/staff/payments', { params }),

  /** GET /api/v1/staff/payments/:id */
  show: (id) => apiClient.get(`/staff/payments/${id}`),

  /** GET /api/v1/staff/payments/:id/receipt (binary download) */
  downloadReceipt: (id) =>
    apiClient.get(`/staff/payments/${id}/receipt`, { responseType: 'blob' }),

  /** POST /api/v1/staff/payments/:id/verify */
  verify: (id) => apiClient.post(`/staff/payments/${id}/verify`),

  /** POST /api/v1/staff/payments/:id/reject */
  reject: (id, reason) => apiClient.post(`/staff/payments/${id}/reject`, { reason }),

  /** POST /api/v1/staff/payments/:id/refund */
  refund: (id, reason) => apiClient.post(`/staff/payments/${id}/refund`, { reason }),
}