import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import DarkModeToggle from '../common/DarkModeToggle'

export default function Topbar({ onMenuClick, menuButtonRef }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/staff/login')
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900 sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          ref={menuButtonRef}
          type="button"
          className="btn-icon shrink-0 lg:hidden"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="truncate text-sm font-medium capitalize text-slate-500 dark:text-slate-400">{user?.role}</span>
      </div>

      <div className="flex shrink-0 items-center gap-4">
        <DarkModeToggle />
        <div className="hidden min-w-0 text-right sm:block">
          <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{user?.name}</p>
          <p className="hidden text-xs text-slate-400 sm:block">{user?.email}</p>
        </div>
        <button type="button" onClick={handleLogout} className="btn-outline">
          Logout
        </button>
      </div>
    </header>
  )
}
