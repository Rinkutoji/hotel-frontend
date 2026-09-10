import { NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/staff/dashboard' },
  { label: 'Bookings', path: '/staff/bookings' },
  { label: 'Rooms', path: '/staff/rooms' },
  { label: 'Room Types', path: '/staff/room-types' },
  { label: 'Payments', path: '/staff/payments' },
  { label: 'Invoices', path: '/staff/invoices' },
  { label: 'Discounts', path: '/staff/discounts', roles: ['admin', 'manager'] },
]

function navLinkClass({ isActive }) {
  return isActive
    ? 'flex items-center gap-3 rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white'
    : 'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white'
}

export default function Sidebar({ open, onClose }) {
  const { user, hasRole, isStaff } = useAuth()
  const visibleItems = NAV_ITEMS.filter((item) => !item.roles || hasRole(item.roles))

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 transform flex-col bg-slate-900 transition-transform duration-200 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center border-b border-slate-800 px-4">
          <span className="text-lg font-bold text-white">
            GrandVista <span className="text-brand-400">Admin</span>
          </span>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {visibleItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={navLinkClass}
              onClick={onClose}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-800 p-4">
          <p className="truncate text-sm font-medium text-white">{user?.name}</p>
          {isStaff && (
            <p className="text-xs capitalize text-slate-400">
              {user?.role ?? 'staff'}
            </p>
          )}
        </div>
      </aside>
    </>
  )
}