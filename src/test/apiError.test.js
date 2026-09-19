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

  it('shows friendly messages for auth and not-found errors', () => {
    expect(getErrorMessage({ response: { status: 401, data: {} } })).toBe(
      'Your session has expired. Please sign in again.',
    )
    expect(getErrorMessage({ response: { status: 401, data: { message: 'Unauthenticated.' } } })).toBe(
      'Your session has expired. Please sign in again.',
    )
    expect(getErrorMessage({ response: { status: 403, data: { message: 'Forbidden.' } } })).toBe(
      'You do not have permission to do this.',
    )
    expect(
      getErrorMessage({
        response: { status: 404, data: { message: 'No query results for model [App\\Models\\RoomType] 1' } },
      }),
    ).toBe('The requested resource could not be found.')
  })

  it('surfaces the server message for a bad-login 401 instead of the session line', () => {
    expect(
      getErrorMessage({ response: { status: 401, data: { message: 'Invalid credentials.' } } }),
    ).toBe('Invalid credentials.')
  })

  it('prefers the server message for conflict and server errors', () => {
    expect(
      getErrorMessage({ response: { status: 409, data: { message: 'Cannot cancel a confirmed booking.' } } }),
    ).toBe('Cannot cancel a confirmed booking.')
    expect(getErrorMessage({ response: { status: 409, data: {} } })).toBe(
      'This action could not be completed. Please refresh and try again.',
    )
    expect(getErrorMessage({ response: { status: 500, data: { message: 'Server error' } } })).toBe('Server error')
  })

  it('shows a friendly validation message', () => {
    expect(getErrorMessage({ response: { status: 422, data: { message: 'The given data was invalid.' } } })).toBe(
      'Some of the information you entered is not valid. Please correct it and try again.',
    )
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