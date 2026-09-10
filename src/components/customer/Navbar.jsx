import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

function navLinkClass({ isActive }) {
  return isActive ? 'text-brand-600 font-medium' : 'text-slate-600 hover:text-slate-900'
}

export default function Navbar() {
  const { isAuthenticated, isCustomer, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="text-lg font-bold text-slate-900">
          GrandVista <span className="text-brand-600">Hotel</span>
        </Link>

        <nav className="hidden items-center gap-6 sm:flex">
          <NavLink to="/" className={navLinkClass} end>
            Home
          </NavLink>
          <NavLink to="/rooms" className={navLinkClass}>
            Rooms
          </NavLink>
          <NavLink to="/availability" className={navLinkClass}>
            Availability
          </NavLink>
          {isAuthenticated && isCustomer ? (
            <>
              <NavLink to="/profile" className={navLinkClass}>
                Profile
              </NavLink>
              <button
                type="button"
                onClick={handleLogout}
                className="btn-outline"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={navLinkClass}>
                Login
              </NavLink>
              <Link to="/register" className="btn-primary">
                Register
              </Link>
            </>
          )}
        </nav>

        <button
          type="button"
          className="sm:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle navigation"
          aria-expanded={open}
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <nav className="border-t border-slate-200 bg-white px-4 py-3 sm:hidden">
          <div className="flex flex-col gap-3">
            <NavLink to="/" className={navLinkClass} end onClick={() => setOpen(false)}>
              Home
            </NavLink>
            <NavLink to="/rooms" className={navLinkClass} onClick={() => setOpen(false)}>
              Rooms
            </NavLink>
            <NavLink to="/availability" className={navLinkClass} onClick={() => setOpen(false)}>
              Availability
            </NavLink>
            {isAuthenticated && isCustomer ? (
              <>
                <NavLink to="/profile" className={navLinkClass} onClick={() => setOpen(false)}>
                  Profile
                </NavLink>
                <button
                  type="button"
                  className="btn-outline w-full"
                  onClick={async () => {
                    setOpen(false)
                    await logout()
                    navigate('/')
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={navLinkClass} onClick={() => setOpen(false)}>
                  Login
                </NavLink>
                <Link to="/register" className="btn-primary w-full" onClick={() => setOpen(false)}>
                  Register
                </Link>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  )
}