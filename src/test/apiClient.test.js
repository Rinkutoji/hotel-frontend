import { describe, expect, it, vi, beforeEach } from 'vitest'
import MockAdapter from 'axios-mock-adapter'
import { afterEach } from 'vitest'
import apiClient, { AUTH_ERROR_EVENT } from '../api/client'
import { AUTH_STORAGE_KEY } from '../utils/authStorage'

describe('apiClient', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(apiClient)
    localStorage.clear()
    window.localStorage.clear()
  })

  afterEach(() => {
    mock.restore()
    vi.restoreAllMocks()
  })

  it('sends the bearer token from storage', async () => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: 'tok-abc', user: {}, actor: 'customer' }))
    let sentAuth = null
    mock.onGet('/customer/me').reply((config) => {
      sentAuth = config.headers?.Authorization
      return [200, { success: true, data: { id: 1 } }]
    })

    await apiClient.get('/customer/me')
    expect(sentAuth).toBe('Bearer tok-abc')
  })

  it('does not attach a header when no token is stored', async () => {
    let sentAuth = 'unset'
    mock.onGet('/public/rooms').reply((config) => {
      sentAuth = config.headers?.Authorization ?? null
      return [200, { success: true, data: [] }]
    })

    await apiClient.get('/public/rooms')
    expect(sentAuth).toBeNull()
  })

  it('clears storage and dispatches the unauthorized event on 401', async () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: 'tok-expired', user: {}, actor: 'customer' }))
    mock.onGet('/customer/me').reply(401, { message: 'Unauthenticated.' })

    await expect(apiClient.get('/customer/me')).rejects.toThrow()

    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull()
    expect(dispatchSpy).toHaveBeenCalled()
    const event = dispatchSpy.mock.calls.find((args) => args[0]?.type === AUTH_ERROR_EVENT)
    expect(event).toBeTruthy()
  })

  it('passes through non-401 errors without clearing storage', async () => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: 'tok-abc', user: {}, actor: 'customer' }))
    mock.onGet('/customer/me').reply(422, { message: 'Validation failed', errors: {} })

    await expect(apiClient.get('/customer/me')).rejects.toThrow()
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).not.toBeNull()
  })
})