import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import DarkModeToggle from '../common/DarkModeToggle'

function navLinkClass({ isActive }) {
  return isActive ? 'text-brand-600 font-medium dark:text-brand-400' : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
}

function mobileLinkClass({ isActive }) {
  return isActive
    ? 'rounded-md bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'
    : 'rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
}

export default function Navbar() {
  const { isAuthenticated, isCustomer, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const menuButtonRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
        menuButtonRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link
          to="/"
          className="min-w-0 flex-1 truncate text-base font-bold text-slate-900 dark:text-white sm:text-lg lg:flex-none"
        >
          GrandVista <span className="text-brand-600 dark:text-brand-400">Hotel</span>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
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
              <NavLink to="/bookings" className={navLinkClass}>
                My Bookings
              </NavLink>
              <NavLink to="/payments" className={navLinkClass}>
                My Payments
              </NavLink>
              <NavLink to="/invoices" className={navLinkClass}>
                My Invoices
              </NavLink>
              <NavLink to="/profile" className={navLinkClass}>
                Profile
              </NavLink>
              <button type="button" onClick={handleLogout} className="btn-outline">
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

        <div className="flex shrink-0 items-center gap-2">
          <DarkModeToggle />
          <button
            ref={menuButtonRef}
            type="button"
            className="btn-icon lg:hidden"
            onClick={() => setOpen((value) => !value)}
            aria-label="Toggle navigation"
            aria-expanded={open}
            aria-controls="mobile-menu"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-menu" className="border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 lg:hidden">
          <div className="flex flex-col gap-1">
            <NavLink to="/" className={mobileLinkClass} end onClick={() => setOpen(false)}>
              Home
            </NavLink>
            <NavLink to="/rooms" className={mobileLinkClass} onClick={() => setOpen(false)}>
              Rooms
            </NavLink>
            <NavLink to="/availability" className={mobileLinkClass} onClick={() => setOpen(false)}>
              Availability
            </NavLink>
            {isAuthenticated && isCustomer ? (
              <>
                <NavLink to="/bookings" className={mobileLinkClass} onClick={() => setOpen(false)}>
                  My Bookings
                </NavLink>
                <NavLink to="/payments" className={mobileLinkClass} onClick={() => setOpen(false)}>
                  My Payments
                </NavLink>
                <NavLink to="/invoices" className={mobileLinkClass} onClick={() => setOpen(false)}>
                  My Invoices
                </NavLink>
                <NavLink to="/profile" className={mobileLinkClass} onClick={() => setOpen(false)}>
                  Profile
                </NavLink>
                <button
                  type="button"
                  className="btn-outline w-full"
                  onClick={async () => {
                    setOpen(false)
                    await handleLogout()
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={mobileLinkClass} onClick={() => setOpen(false)}>
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
