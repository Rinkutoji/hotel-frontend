import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export default function Footer() {
  const { isStaff, isCustomer } = useAuth()
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row">
        <p className="text-sm text-slate-500">
          © {new Date().getFullYear()} GrandVista Hotel. All rights reserved.
        </p>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-slate-400 sm:justify-end">
          <Link to="/rooms" className="hover:text-slate-600">
            Rooms
          </Link>
          <Link to="/availability" className="hover:text-slate-600">
            Availability
          </Link>
          {isCustomer && (
            <Link to="/bookings" className="hover:text-slate-600">
              My Bookings
            </Link>
          )}
          {isCustomer && (
            <Link to="/payments" className="hover:text-slate-600">
              My Payments
            </Link>
          )}
          {isCustomer && (
            <Link to="/invoices" className="hover:text-slate-600">
              My Invoices
            </Link>
          )}
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