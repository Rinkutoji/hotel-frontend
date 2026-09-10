import { useAuth } from '../../hooks/useAuth'

export default function StaffDashboard() {
  const { user } = useAuth()

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
      <p className="mt-1 text-sm text-slate-500">
        Welcome back, {user?.name}. This overview is under construction and will arrive in a later phase.
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {['Bookings', 'Rooms', 'Payments', 'Invoices'].map((label) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-6">
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-800">—</p>
          </div>
        ))}
      </div>
    </div>
  )
}