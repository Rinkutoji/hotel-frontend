export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  const data = error?.response?.data
  if (data && typeof data.message === 'string' && data.message.length > 0) {
    return data.message
  }
  return fallback
}

export function getFieldErrors(error) {
  const errors = error?.response?.data?.errors
  return errors && typeof errors === 'object' ? errors : {}
}