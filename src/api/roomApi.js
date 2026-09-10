import apiClient from './client'

export const publicRooms = {
  listRoomTypes: (params) => apiClient.get('/public/room-types', { params }),
  getRoomType: (id) => apiClient.get(`/public/room-types/${id}`),
  getRoomTypeImages: (id) => apiClient.get(`/public/room-types/${id}/images`),
  listRooms: (params) => apiClient.get('/public/rooms', { params }),
  getRoom: (id) => apiClient.get(`/public/rooms/${id}`),
  checkAvailability: (data) => apiClient.post('/public/availability', data),
}