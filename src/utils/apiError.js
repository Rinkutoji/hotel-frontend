const FRIENDLY_MESSAGES = {
  401: 'Your session has expired. Please sign in again.',
  403: 'You do not have permission to do this.',
  404: 'The requested resource could not be found.',
  409: 'This action could not be completed. Please refresh and try again.',
  422: 'Some of the information you entered is not valid. Please correct it and try again.',
}

export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  const status = error?.response?.status
  const serverMessage =
    error?.response?.data?.message && typeof error.response.data.message === 'string'
      ? error.response.data.message
      : null

  // Auth / authorization / not-found: the server's own wording here is
  // developer-facing (e.g. "No query results for model..."), so always
  // show a clean, user-friendly message instead.
  if (status === 401) {
    // A 401 with a meaningful server message is a bad-login attempt
    // ("Invalid credentials.") - surface that. The generic Sanctum
    // "Unauthenticated." (or no message at all) means the token itself
    // is missing/expired, so keep the friendly session line.
    if (serverMessage && serverMessage !== 'Unauthenticated.') {
      return serverMessage
    }
    return FRIENDLY_MESSAGES[401]
  }

  if (status === 403 || status === 404) {
    return FRIENDLY_MESSAGES[status]
  }

  // Validation: Laravel's boilerplate message carries no real detail, so
  // surface the friendly line (field-level detail is shown separately via
  // getFieldErrors where the UI supports it).
  if (status === 422) {
    return FRIENDLY_MESSAGES[status]
  }

  // 409 business-rule messages and any 500 responses: prefer the
  // server-provided wording when present (it is user-meaningful for
  // conflicts), otherwise fall back to the friendly line or fallback.
  if (status === 409) {
    return serverMessage ?? FRIENDLY_MESSAGES[409]
  }

  return serverMessage ?? fallback
}

export function getFieldErrors(error) {
  const errors = error?.response?.data?.errors
  return errors && typeof errors === 'object' ? errors : {}
}