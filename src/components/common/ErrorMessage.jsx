import { getErrorMessage } from '../../utils/apiError'

export default function ErrorMessage({ error, fallback = 'Something went wrong. Please try again.' }) {
  if (!error) return null
  return <div className="error-banner">{getErrorMessage(error, fallback)}</div>
}