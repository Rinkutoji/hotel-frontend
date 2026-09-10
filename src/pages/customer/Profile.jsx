import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import LoadingSpinner from '../../components/common/LoadingSpinner'

export default function Profile() {
  const { user, refreshUser } = useAuth()
  const [busy, setBusy] = useState(false)

  if (!user) return <LoadingSpinner />

  const handleRefresh = async () => {
    setBusy(true)
    try {
      await refreshUser()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-800">Your profile</h1>
      <p className="mt-1 text-sm text-slate-500">Review the details stored in your guest account.</p>

      <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <dl className="divide-y divide-slate-200">
          <div className="flex flex-col gap-1 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <dt className="text-sm font-medium text-slate-500">Name</dt>
            <dd className="text-sm font-medium text-slate-800">{user.name}</dd>
          </div>
          <div className="flex flex-col gap-1 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <dt className="text-sm font-medium text-slate-500">Email</dt>
            <dd className="text-sm font-medium text-slate-800">{user.email}</dd>
          </div>
          {user.phone && (
            <div className="flex flex-col gap-1 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <dt className="text-sm font-medium text-slate-500">Phone</dt>
              <dd className="text-sm font-medium text-slate-800">{user.phone}</dd>
            </div>
          )}
          {user.created_at && (
            <div className="flex flex-col gap-1 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <dt className="text-sm font-medium text-slate-500">Member since</dt>
              <dd className="text-sm font-medium text-slate-800">
                {new Date(user.created_at).toLocaleDateString()}
              </dd>
            </div>
          )}
        </dl>
      </div>

      <button type="button" onClick={handleRefresh} className="btn-outline mt-6" disabled={busy}>
        {busy ? 'Refreshing…' : 'Refresh profile'}
      </button>

      <p className="mt-8 text-sm text-slate-400">
        Booking history and reservation management arrive in a later phase.
      </p>
    </div>
  )
}