import { describe, expect, it, beforeEach } from 'vitest'
import { clearStoredAuth, getStoredAuth, AUTH_STORAGE_KEY, setStoredAuth } from '../utils/authStorage'

describe('authStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  const session = { token: 'tok-123', user: { id: 1, name: 'Ada' }, actor: 'customer' }

  it('returns null when nothing is stored', () => {
    expect(getStoredAuth()).toBeNull()
  })

  it('round-trips a stored session', () => {
    setStoredAuth(session)
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBe(JSON.stringify(session))
    expect(getStoredAuth()).toEqual(session)
  })

  it('returns null for corrupted JSON', () => {
    localStorage.setItem(AUTH_STORAGE_KEY, '{not json')
    expect(getStoredAuth()).toBeNull()
  })

  it('returns null when stored value lacks a token', () => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user: {}, actor: 'customer' }))
    expect(getStoredAuth()).toBeNull()
  })

  it('clears the stored session', () => {
    setStoredAuth(session)
    clearStoredAuth()
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull()
  })
})