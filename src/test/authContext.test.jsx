import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { act } from 'react'
import { AuthProvider } from '../context/AuthContext'
import { useAuth } from '../hooks/useAuth'
import { AUTH_ERROR_EVENT } from '../api/client'
import { AUTH_STORAGE_KEY } from '../utils/authStorage'
import { customerAuth, staffAuth } from '../api/authApi'

vi.mock('../api/authApi', () => ({
  customerAuth: {
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    me: vi.fn(),
  },
  staffAuth: {
    login: vi.fn(),
    logout: vi.fn(),
    me: vi.fn(),
  },
}))

const customer = { id: 7, name: 'Ada Lovelace', email: 'ada@example.com', phone: null }

function renderAuth() {
  return renderHook(() => useAuth(), { wrapper: AuthProvider })
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('starts unauthenticated when nothing is stored', async () => {
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.actor).toBeNull()
    expect(result.current.user).toBeNull()
  })

  it('logs in a customer and persists the session', async () => {
    customerAuth.login.mockResolvedValue({
      data: { data: { customer, token: 'tok-customer' } },
    })
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.customerLogin({ email: 'ada@example.com', password: 'secret' })
    })

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.actor).toBe('customer')
    expect(result.current.user).toEqual(customer)
    expect(JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY))).toEqual({
      token: 'tok-customer',
      user: customer,
      actor: 'customer',
    })
  })

  it('registers a customer and starts an authenticated session', async () => {
    customerAuth.register.mockResolvedValue({
      data: { data: { customer, token: 'tok-new' } },
    })
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.customerRegister({ name: 'Ada', email: 'ada@example.com', password: 'secret' })
    })

    expect(result.current.isCustomer).toBe(true)
    expect(result.current.user.name).toBe('Ada Lovelace')
  })

  it('logs in a staff member with role and me() restoring actor', async () => {
    staffAuth.login.mockResolvedValue({
      data: { data: { employee: { id: 1, name: 'Boss', role: 'admin' }, token: 'tok-staff' } },
    })
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.staffLogin({ email: 'boss@example.com', password: 'secret' })
    })

    expect(result.current.isStaff).toBe(true)
    expect(result.current.hasRole(['admin', 'manager'])).toBe(true)
    expect(result.current.hasRole(['receptionist'])).toBe(false)
  })

  it('hydrates a stored session via the actors /me endpoint', async () => {
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ token: 'tok-customer', user: {}, actor: 'customer' }),
    )
    customerAuth.me.mockResolvedValue({ data: { data: customer } })

    const { result } = renderAuth()

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(customerAuth.me).toHaveBeenCalledTimes(1)
    expect(result.current.user).toEqual(customer)
    expect(result.current.isAuthenticated).toBe(true)
  })

  it('hydrates a staff session through staffAuth.me', async () => {
    const employee = { id: 2, name: 'Grace', role: 'receptionist' }
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: 'tok', user: {}, actor: 'staff' }))
    staffAuth.me.mockResolvedValue({ data: { data: employee } })

    const { result } = renderAuth()

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(staffAuth.me).toHaveBeenCalledTimes(1)
    expect(result.current.user).toEqual(employee)
    expect(result.current.actor).toBe('staff')
  })

  it('clears an invalid stored session when /me fails', async () => {
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ token: 'tok-expired', user: {}, actor: 'staff' }),
    )
    staffAuth.me.mockRejectedValue(new Error('401'))

    const { result } = renderAuth()

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.isAuthenticated).toBe(false)
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull()
  })

  it('clears the session when a 401 event is dispatched', async () => {
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.customerLogin({
        email: 'ada@example.com',
        password: 'secret',
      })
    })
    expect(result.current.isAuthenticated).toBe(true)

    act(() => {
      window.dispatchEvent(new Event(AUTH_ERROR_EVENT))
    })

    await waitFor(() => expect(result.current.isAuthenticated).toBe(false))
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull()
  })

  it('logs out by revoking remotely then clearing local state', async () => {
    customerAuth.login.mockResolvedValue({
      data: { data: { customer, token: 'tok-customer' } },
    })
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    await act(async () => {
      await result.current.customerLogin({ email: 'ada@example.com', password: 'secret' })
    })

    await act(async () => {
      await result.current.logout()
    })

    expect(customerAuth.logout).toHaveBeenCalledTimes(1)
    expect(result.current.isAuthenticated).toBe(false)
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull()
  })
})