import apiClient from './client'

export const staffEmployees = {
  list: (params) => apiClient.get('/staff/employees', { params }),
  show: (id) => apiClient.get(`/staff/employees/${id}`),
  create: (data) => apiClient.post('/staff/employees', data),
  update: (id, data) => apiClient.put(`/staff/employees/${id}`, data),
  destroy: (id) => apiClient.delete(`/staff/employees/${id}`),
}
