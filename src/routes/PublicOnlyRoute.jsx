import { Navigate } from 'react-router-dom'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { useAuth } from '../hooks/useAuth'

/**
 * Wraps login/register forms so an already-authenticated actor is routed
 * to their home instead of seeing the form again.
 */
export default function PublicOnlyRoute({ actor, children }) {
  const { isAuthenticated, isLoading, isCustomer, isStaff } = useAuth()

  if (isLoading) {
    return <LoadingSpinner fullScreen />
  }

  if (!isAuthenticated) {
    return children
  }

  if (actor === 'staff' && isStaff) {
    return <Navigate to="/staff/dashboard" replace />
  }
  if (actor === 'customer' && isCustomer) {
    return <Navigate to="/profile" replace />
  }
  if (actor === 'staff' && isCustomer) {
    return <Navigate to="/" replace />
  }
  if (actor === 'customer' && isStaff) {
    return <Navigate to="/staff/dashboard" replace />
  }

  return children
}