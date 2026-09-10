import { describe, expect, it } from 'vitest'
import { getErrorMessage, getFieldErrors } from '../utils/apiError'

describe('apiError', () => {
  it('uses the backend message when present', () => {
    const error = {
      response: { data: { message: 'Invalid credentials.' } },
    }
    expect(getErrorMessage(error)).toBe('Invalid credentials.')
  })

  it('falls back to the supplied fallback', () => {
    expect(getErrorMessage(null, 'Fallback message')).toBe('Fallback message')
    expect(getErrorMessage({}, 'Fallback message')).toBe('Fallback message')
  })

  it('extracts field errors from the response data', () => {
    const error = {
      response: { data: { errors: { email: ['The email field is required.'] } } },
    }
    expect(getFieldErrors(error)).toEqual({ email: ['The email field is required.'] })
  })

  it('returns an empty object when there are no validation errors', () => {
    expect(getFieldErrors(null)).toEqual({})
    expect(getFieldErrors({})).toEqual({})
  })
})