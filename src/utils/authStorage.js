export const AUTH_STORAGE_KEY = 'hotel_auth'

export function getStoredAuth() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || typeof parsed.token !== 'string') {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function setStoredAuth(payload) {
  if (!payload || typeof payload !== 'object' || typeof payload.token !== 'string') {
    throw new TypeError('auth payload must contain a token')
  }
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload))
}

export function clearStoredAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY)
}