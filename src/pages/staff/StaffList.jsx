import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { staffEmployees } from '../../api/staffApi'
import useStaff from '../../hooks/useStaff'
import StaffCard from '../../components/staff/StaffCard'
import SearchBar from '../../components/customer/SearchBar'
import Pagination from '../../components/customer/Pagination'
import LoadingState from '../../components/common/LoadingState'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import ErrorMessage from '../../components/common/ErrorMessage'

const CLEARED_FILTERS = {
  search: undefined,
  role: undefined,
  status: undefined,
  page: 1,
}

function commitParams(setSearchParams, patch) {
  setSearchParams((prev) => {
    const next = new URLSearchParams(prev)
    Object.entries(patch).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') next.delete(key)
      else next.set(key, String(value))
    })
    return next
  })
}

export default function StaffList() {
  const [searchParams, setSearchParams] = useSearchParams()

  const search = searchParams.get('search') ?? ''
  const role = searchParams.get('role') ?? ''
  const status = searchParams.get('status') ?? ''
  const page = Number(searchParams.get('page')) || 1

  // Key order is fixed on purpose: useStaff derives its effect key from
  // JSON.stringify(params), so unstable key order would refetch on every
  // render.
  const apiParams = useMemo(
    () => ({
      page,
      ...(search ? { search } : {}),
      ...(role ? { role } : {}),
      ...(status ? { status } : {}),
    }),
    [search, role, status, page],
  )

  const { employees, meta, loading, error, refetch } = useStaff(apiParams)

  const [running, setRunning] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [actionMessage, setActionMessage] = useState(null)

  const performAction = async (key, request, successMessage) => {
    if (running) return
    setRunning(key)
    setActionError(null)
    try {
      await request()
      setActionMessage(successMessage)
      await refetch()
    } catch (err) {
      setActionError(err)
      if (err?.response?.status === 409 || err?.response?.status === 403) {
        await refetch()
      }
    } finally {
      setRunning(null)
    }
  }

  const handleDelete = (employeeId) =>
    performAction(`delete-${employeeId}`, () => staffEmployees.destroy(employeeId), 'Staff member deleted.')

  const rows = Array.isArray(employees) ? employees : []
  const currentPage = meta?.page ?? page
  const lastPage = meta?.last_page ?? 1
  const hasFilters = Boolean(search || role || status)
  const busy = running !== null

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Staff Management</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage staff accounts and their roles.</p>
        <div className="mt-8">
          <LoadingState label="Loading staff…" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Staff Management</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage staff accounts and their roles.</p>
        <div className="mt-8">
          <ErrorState
            error={error}
            fallback="We couldn't load the staff list. Please try again."
            onRetry={refetch}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Staff Management</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage staff accounts and their roles.</p>
        </div>
        <Link to="/staff/staff/new" className="btn-primary">
          New staff member
        </Link>
      </div>

      <div className="mt-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-full sm:w-auto sm:min-w-40">
            <label htmlFor="role" className="label">
              Role
            </label>
            <select
              id="role"
              className="input"
              value={role}
              onChange={(e) => commitParams(setSearchParams, { role: e.target.value || undefined, page: 1 })}
            >
              <option value="">All roles</option>
              <option value="admin">admin</option>
              <option value="manager">manager</option>
              <option value="receptionist">receptionist</option>
            </select>
          </div>
          <div className="w-full sm:w-auto sm:min-w-40">
            <label htmlFor="status" className="label">
              Status
            </label>
            <select
              id="status"
              className="input"
              value={status}
              onChange={(e) => commitParams(setSearchParams, { status: e.target.value || undefined, page: 1 })}
            >
              <option value="">All statuses</option>
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </select>
          </div>
          <div className="w-full sm:w-64">
            <SearchBar
              value={search}
              onChange={(value) => commitParams(setSearchParams, { search: value || undefined, page: 1 })}
              placeholder="Search staff by name or email"
            />
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {actionMessage && (
          <div
            className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/50 dark:text-green-300"
            role="status"
          >
            {actionMessage}
          </div>
        )}
        {actionError && (
          <ErrorMessage error={actionError} fallback="The action could not be completed. Please try again." />
        )}
      </div>

      {rows.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No staff found"
            message={hasFilters ? 'No staff match your filters.' : 'There are no staff members yet.'}
            action={
              hasFilters ? (
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => commitParams(setSearchParams, CLEARED_FILTERS)}
                >
                  Clear all filters
                </button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <>
          <div className="mt-8 space-y-3">
            {rows.map((employee) => (
              <StaffCard key={employee.id} employee={employee} busy={busy} onDelete={handleDelete} />
            ))}
          </div>
          {lastPage > 1 && (
            <div className="mt-10">
              <Pagination
                currentPage={currentPage}
                lastPage={lastPage}
                onPageChange={(nextPage) => commitParams(setSearchParams, { page: nextPage })}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
