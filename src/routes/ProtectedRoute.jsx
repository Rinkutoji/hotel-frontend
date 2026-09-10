import { Navigate, useLocation } from 'react-router-dom'
import LoadingSpinner from '../components/common/LoadingSpinner'
import Forbidden from '../pages/Forbidden'
import { useAuth } from '../hooks/useAuth'

const LOGIN_PATHS = { customer: '/login', staff: '/staff/login' }

/**
 * Guards a route by authentication + actor (customer/staff) + optional
 * staff role list. The backend remains the source of truth — this guard
 * only shapes navigation and UX.
 */
export default function ProtectedRoute({ actor, roles, children }) {
  const { isAuthenticated, isLoading, isCustomer, isStaff, hasRole } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <LoadingSpinner fullScreen />
  }

  if (!isAuthenticated) {
    return <Navigate to={LOGIN_PATHS[actor] ?? '/login'} replace state={{ from: location.pathname }} />
  }

  // A staff member landed on a customer page -> their own home.
  if (actor === 'customer' && !isCustomer) {
    return <Navigate to="/staff/dashboard" replace />
  }

  // A customer landed on a staff page -> customer home.
  if (actor === 'staff' && !isStaff) {
    return <Navigate to="/" replace />
  }

  if (roles && roles.length > 0 && !hasRole(roles)) {
    return <Forbidden />
  }

  return children
}