import { useCallback, useEffect, useMemo, useState } from 'react'
import { customerAuth, staffAuth } from '../api/authApi'
import { AUTH_ERROR_EVENT } from '../api/client'
import { clearStoredAuth, getStoredAuth, setStoredAuth } from '../utils/authStorage'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }) {
  const [storedAuth] = useState(getStoredAuth)
  const hasStoredSession = Boolean(storedAuth?.token && storedAuth?.actor)

  const [user, setUser] = useState(null)
  const [token, setToken] = useState(hasStoredSession ? storedAuth.token : null)
  const [actor, setActor] = useState(hasStoredSession ? storedAuth.actor : null)
  const [isLoading, setIsLoading] = useState(hasStoredSession)

  const clearAll = useCallback(() => {
    clearStoredAuth()
    setUser(null)
    setToken(null)
    setActor(null)
  }, [])

  const storeSession = useCallback((nextToken, nextUser, nextActor) => {
    setStoredAuth({ token: nextToken, user: nextUser, actor: nextActor })
    setToken(nextToken)
    setUser(nextUser)
    setActor(nextActor)
  }, [])

  // Session restore on refresh: localStorage -> /me validation.
  useEffect(() => {
    if (!hasStoredSession) return
    const me = storedAuth.actor === 'staff' ? staffAuth.me : customerAuth.me
    me()
      .then((res) => {
        const data = res.data?.data ?? null
        if (!data) throw new Error('Invalid /me response')
        setUser(data)
        setStoredAuth({ ...storedAuth, user: data })
      })
      .catch(() => {
        clearAll()
      })
      .finally(() => setIsLoading(false))
  }, [hasStoredSession, storedAuth, clearAll])

  // The apiClient dispatches this event when any request returns 401.
  useEffect(() => {
    const onUnauthorized = () => clearAll()
    window.addEventListener(AUTH_ERROR_EVENT, onUnauthorized)
    return () => window.removeEventListener(AUTH_ERROR_EVENT, onUnauthorized)
  }, [clearAll])

  const customerLogin = useCallback(
    async (credentials) => {
      const res = await customerAuth.login(credentials)
      const { token: nextToken, customer } = res.data?.data ?? {}
      if (!nextToken || !customer) throw new Error('Invalid login response')
      storeSession(nextToken, customer, 'customer')
      return customer
    },
    [storeSession],
  )

  const customerRegister = useCallback(
    async (formData) => {
      const res = await customerAuth.register(formData)
      const { token: nextToken, customer } = res.data?.data ?? {}
      if (!nextToken || !customer) throw new Error('Invalid register response')
      storeSession(nextToken, customer, 'customer')
      return customer
    },
    [storeSession],
  )

  const staffLogin = useCallback(
    async (credentials) => {
      const res = await staffAuth.login(credentials)
      const { token: nextToken, employee } = res.data?.data ?? {}
      if (!nextToken || !employee) throw new Error('Invalid login response')
      storeSession(nextToken, employee, 'staff')
      return employee
    },
    [storeSession],
  )

  const logout = useCallback(async () => {
    try {
      if (actor === 'staff') await staffAuth.logout()
      else if (actor === 'customer') await customerAuth.logout()
    } catch {
      // Best-effort revocation only; the local session is always cleared.
    } finally {
      clearAll()
    }
  }, [actor, clearAll])

  const refreshUser = useCallback(async () => {
    if (actor !== 'customer' && actor !== 'staff') return null
    const me = actor === 'staff' ? staffAuth.me : customerAuth.me
    const res = await me()
    const data = res.data?.data ?? null
    if (data) {
      setUser(data)
      const stored = getStoredAuth()
      if (stored) setStoredAuth({ ...stored, user: data })
    }
    return data
  }, [actor])

  const hasRole = useCallback(
    (roles) => {
      if (actor !== 'staff' || !user) return false
      return Array.isArray(roles) ? roles.includes(user.role) : false
    },
    [actor, user],
  )

  const value = useMemo(
    () => ({
      user,
      token,
      actor,
      isLoading,
      isAuthenticated: Boolean(token && user),
      isCustomer: actor === 'customer',
      isStaff: actor === 'staff',
      hasRole,
      customerLogin,
      customerRegister,
      staffLogin,
      logout,
      refreshUser,
    }),
    [user, token, actor, isLoading, hasRole, customerLogin, customerRegister, staffLogin, logout, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}