import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { staffBookings } from '../../api/bookingApi'
import useApi from '../../hooks/useApi'
import StaffBookingCard from '../../components/staff/BookingCard'
import BookingFilters from '../../components/staff/BookingFilters'
import Pagination from '../../components/customer/Pagination'
import LoadingState from '../../components/common/LoadingState'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'

const CLEARED_FILTERS = {
  status: undefined,
  from: undefined,
  to: undefined,
  search: undefined,
  page: 1,
}

export default function BookingList() {
  const [searchParams, setSearchParams] = useSearchParams()

  const status = searchParams.get('status') ?? ''
  const from = searchParams.get('from') ?? ''
  const to = searchParams.get('to') ?? ''
  const search = searchParams.get('search') ?? ''
  const page = Number(searchParams.get('page')) || 1

  const apiParams = useMemo(
    () => ({
      page,
      ...(status ? { status } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
      ...(search ? { search } : {}),
    }),
    [status, from, to, search, page],
  )

  const fetchBookings = useCallback(() => staffBookings.list(apiParams), [apiParams])
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
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-bold text-slate-800">Bookings</h1>
        <p className="mt-1 text-sm text-slate-500">View and manage all hotel reservations.</p>
        <div className="mt-8">
          <LoadingState label="Loading bookings…" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-bold text-slate-800">Bookings</h1>
        <p className="mt-1 text-sm text-slate-500">View and manage all hotel reservations.</p>
        <div className="mt-8">
          <ErrorState
            error={error}
            fallback="We couldn't load the bookings. Please try again."
            onRetry={refetch}
          />
        </div>
      </div>
    )
  }

  const hasFilters = Boolean(status || from || to || search)

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold text-slate-800">Bookings</h1>
      <p className="mt-1 text-sm text-slate-500">View and manage all hotel reservations.</p>

      <div className="mt-6">
        <BookingFilters />
      </div>

      {bookings.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No bookings found"
            message={
              hasFilters
                ? 'No bookings match your filters.'
                : 'There are no bookings yet.'
            }
            action={
              hasFilters ? (
                <button type="button" className="btn-outline" onClick={() => updateUrl(CLEARED_FILTERS)}>
                  Clear all filters
                </button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <>
          <div className="mt-8 space-y-3">
            {bookings.map((booking) => (
              <StaffBookingCard key={booking.id} booking={booking} />
            ))}
          </div>
          {lastPage > 1 && (
            <div className="mt-10">
              <Pagination currentPage={currentPage} lastPage={lastPage} onPageChange={(nextPage) => updateUrl({ page: nextPage })} />
            </div>
          )}
        </>
      )}
    </div>
  )
}