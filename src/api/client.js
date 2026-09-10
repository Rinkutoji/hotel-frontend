import axios from 'axios'
import { clearStoredAuth, getStoredAuth } from '../utils/authStorage'

export const AUTH_ERROR_EVENT = 'auth:unauthorized'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
  headers: {
    Accept: 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const auth = getStoredAuth()
  if (auth?.token) {
    config.headers.Authorization = `Bearer ${auth.token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearStoredAuth()
      window.dispatchEvent(new Event(AUTH_ERROR_EVENT))
    }
    return Promise.reject(error)
  },
)

export default apiClient