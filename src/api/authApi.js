import apiClient from './client'

export const customerAuth = {
  register: (data) => apiClient.post('/customer/auth/register', data),
  login: (data) => apiClient.post('/customer/auth/login', data),
  logout: () => apiClient.post('/customer/auth/logout'),
  me: () => apiClient.get('/customer/me'),
}

export const staffAuth = {
  login: (data) => apiClient.post('/admin/auth/login', data),
  logout: () => apiClient.post('/staff/auth/logout'),
  me: () => apiClient.get('/staff/me'),
}