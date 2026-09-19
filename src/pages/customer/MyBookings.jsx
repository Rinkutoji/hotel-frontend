import { useCallback, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { customerBookings } from '../../api/bookingApi'
import useApi from '../../hooks/useApi'
import BookingCard from '../../components/customer/BookingCard'
import Pagination from '../../components/customer/Pagination'
import LoadingState from '../../components/common/LoadingState'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'

const STATUS_OPTIONS = [
  'pending_payment',
  'confirmed',
  'checked_in',
  'checked_out',
  'cancelled',
  'no_show',
]

export default function MyBookings() {
  const [searchParams, setSearchParams] = useSearchParams()

  const status = searchParams.get('status') ?? ''
  const page = Number(searchParams.get('page')) || 1

  const apiParams = useMemo(
    () => ({
      page,
      ...(status ? { status } : {}),
    }),
    [status, page],
  )

  const fetchBookings = useCallback(() => customerBookings.list(apiParams), [apiParams])

  const { data, meta, error, isLoading, refetch } = useApi(fetchBookings)

  const updateUrl = useCallback(
    (patch) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        Object.entries(patch).forEach(([key, value]) => {
          if (value === undefined || value === null || value === '') next.delete(key)
          else next.set(key, String(value))
        })
        return next
      })
    },
    [setSearchParams],
  )

  const bookings = Array.isArray(data) ? data : []
  const currentPage = meta?.page ?? page
  const lastPage = meta?.last_page ?? 1

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-800">My bookings</h1>
        <div className="mt-8">
          <LoadingState label="Loading your bookings…" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-800">My bookings</h1>
        <div className="mt-8">
          <ErrorState
            error={error}
            fallback="We couldn't load your bookings. Please try again."
            onRetry={refetch}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-800">My bookings</h1>
      <p className="mt-1 text-sm text-slate-500">Review and manage the reservations on your account.</p>

      <div className="mt-6 max-w-xs">
        <label htmlFor="status" className="label">
          Status
        </label>
        <select
          id="status"
          className="input"
          value={status}
          onChange={(e) => updateUrl({ status: e.target.value || undefined, page: 1 })}
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {value.replaceAll('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      {bookings.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No bookings found"
            message={status ? 'No bookings match this status.' : 'You have no bookings yet. Browse our rooms to get started.'}
            action={
              !status ? (
                <Link to="/rooms" className="btn-primary">
                  Browse rooms
                </Link>
              ) : (
                <button type="button" className="btn-outline" onClick={() => updateUrl({ status: undefined, page: 1 })}>
                  Clear filter
                </button>
              )
            }
          />
        </div>
      ) : (
        <>
          <div className="mt-8 space-y-3">
            {bookings.map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))}
          </div>
          {lastPage > 1 && (
            <div className="mt-10">
              <Pagination
                currentPage={currentPage}
                lastPage={lastPage}
                onPageChange={(nextPage) => updateUrl({ page: nextPage })}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}