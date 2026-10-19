import { memo, useState } from 'react'
import { Link } from 'react-router-dom'

const ROLE_STYLES = {
  admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  manager: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  receptionist: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
}

const STATUS_STYLES = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  inactive: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
}

export default memo(function StaffCard({ employee, busy, onDelete }) {
  const { id, name, email, phone, role, status } = employee
  const [confirmOpen, setConfirmOpen] = useState(false)

  const closeConfirm = () => setConfirmOpen(false)

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{name}</h3>
          <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{email}</p>
          {phone && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{phone}</p>}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_STYLES[role] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}
          >
            {role}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}
          >
            {status}
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 border-t border-slate-100 pt-4 dark:border-slate-700">
        <Link
          to={`/staff/staff/${id}/edit`}
          className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
        >
          Edit
        </Link>
        <button
          type="button"
          className="btn-danger-ghost"
          disabled={busy}
          onClick={() => setConfirmOpen((value) => !value)}
        >
          Delete
        </button>
      </div>

      {confirmOpen && (
        <form
          className="mt-4 space-y-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/50"
          onSubmit={(e) => {
            e.preventDefault()
            onDelete(id)
            closeConfirm()
          }}
        >
          <p className="text-sm font-medium text-red-800 dark:text-red-300">Delete staff member “{name}”?</p>
          <p className="text-sm text-red-700 dark:text-red-400">
            Their account will be deactivated. This cannot be undone.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" className="btn-danger" disabled={busy}>
              Confirm delete
            </button>
            <button type="button" className="btn-outline" disabled={busy} onClick={closeConfirm}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
})
