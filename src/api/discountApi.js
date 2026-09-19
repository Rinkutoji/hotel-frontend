import apiClient from './client'

export const staffDiscounts = {
  /** GET /api/v1/staff/discounts */
  list: (params) => apiClient.get('/staff/discounts', { params }),

  /** GET /api/v1/staff/discounts/:id */
  show: (id) => apiClient.get(`/staff/discounts/${id}`),

  /** POST /api/v1/staff/discounts */
  create: (data) => apiClient.post('/staff/discounts', data),

  /** PUT /api/v1/staff/discounts/:id */
  update: (id, data) => apiClient.put(`/staff/discounts/${id}`, data),

  /** DELETE /api/v1/staff/discounts/:id */
  destroy: (id) => apiClient.delete(`/staff/discounts/${id}`),
}