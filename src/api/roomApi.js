import apiClient from './client'

export const publicRooms = {
  listRoomTypes: (params) => apiClient.get('/public/room-types', { params }),
  getRoomType: (id) => apiClient.get(`/public/room-types/${id}`),
  getRoomTypeImages: (id) => apiClient.get(`/public/room-types/${id}/images`),
  listRooms: (params) => apiClient.get('/public/rooms', { params }),
  getRoom: (id) => apiClient.get(`/public/rooms/${id}`),
  checkAvailability: (data) => apiClient.post('/public/availability', data),
}

export const staffRoomTypes = {
  list: (params) => apiClient.get('/staff/room-types', { params }),
  show: (id) => apiClient.get(`/staff/room-types/${id}`),
  create: (data) => apiClient.post('/staff/room-types', data),
  update: (id, data) => apiClient.put(`/staff/room-types/${id}`, data),
  destroy: (id) => apiClient.delete(`/staff/room-types/${id}`),
  listImages: (id) => apiClient.get(`/staff/room-types/${id}/images`),
  uploadImage: (id, file) => {
    const formData = new FormData()
    formData.append('image', file)
    return apiClient.post(`/staff/room-types/${id}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

export const staffRoomImages = {
  updateSortOrder: (id, sortOrder) =>
    apiClient.put(`/staff/room-images/${id}`, { sort_order: sortOrder }),
  destroy: (id) => apiClient.delete(`/staff/room-images/${id}`),
}

export const staffRooms = {
  list: (params) => apiClient.get('/staff/rooms', { params }),
  show: (id) => apiClient.get(`/staff/rooms/${id}`),
  create: (data) => apiClient.post('/staff/rooms', data),
  update: (id, data) => apiClient.put(`/staff/rooms/${id}`, data),
  destroy: (id) => apiClient.delete(`/staff/rooms/${id}`),
  toMaintenance: (id, reason) =>
    apiClient.post(`/staff/rooms/${id}/status/maintenance`, reason ? { reason } : {}),
  toAvailable: (id, reason) =>
    apiClient.post(`/staff/rooms/${id}/status/available`, reason ? { reason } : {}),
}