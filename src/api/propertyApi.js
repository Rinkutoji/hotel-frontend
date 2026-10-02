import apiClient from './client'

export const publicProperties = {
  list: (params) => apiClient.get('/public/properties', { params }),
}

export const staffProperties = {
  list: (params) => apiClient.get('/staff/properties', { params }),
  show: (id) => apiClient.get(`/staff/properties/${id}`),
  create: (data) => apiClient.post('/staff/properties', data),
  update: (id, data) => apiClient.put(`/staff/properties/${id}`, data),
  destroy: (id) => apiClient.delete(`/staff/properties/${id}`),
  listBuildings: (propertyId) => apiClient.get(`/staff/properties/${propertyId}/buildings`),
  createBuilding: (propertyId, data) => apiClient.post(`/staff/properties/${propertyId}/buildings`, data),
  updateBuilding: (id, data) => apiClient.put(`/staff/buildings/${id}`, data),
  destroyBuilding: (id) => apiClient.delete(`/staff/buildings/${id}`),
}

export const staffBuildings = {
  show: (id) => apiClient.get(`/staff/buildings/${id}`),
}
