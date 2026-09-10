import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Forbidden() {
  const { isStaff } = useAuth()
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-6xl font-bold text-slate-300">403</h1>
      <p className="mt-4 text-lg font-medium text-slate-700">Access denied</p>
      <p className="mt-2 text-sm text-slate-500">
        You do not have permission to view this page.
      </p>
      <Link to={isStaff ? '/staff/dashboard' : '/'} className="btn-primary mt-6">
        {isStaff ? 'Back to Dashboard' : 'Back to Home'}
      </Link>
    </div>
  )
}