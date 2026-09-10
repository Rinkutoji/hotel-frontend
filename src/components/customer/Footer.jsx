import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export default function Footer() {
  const { isStaff } = useAuth()
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row">
        <p className="text-sm text-slate-500">
          © {new Date().getFullYear()} GrandVista Hotel. All rights reserved.
        </p>
        <nav className="flex items-center gap-5 text-sm text-slate-400">
          <Link to="/rooms" className="hover:text-slate-600">
            Rooms
          </Link>
          <Link to="/availability" className="hover:text-slate-600">
            Availability
          </Link>
          <Link
            to={isStaff ? '/staff/dashboard' : '/staff/login'}
            className="hover:text-slate-600"
          >
            Staff Portal
          </Link>
        </nav>
      </div>
    </footer>
  )
}