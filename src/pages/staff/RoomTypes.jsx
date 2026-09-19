import { useCallback, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { staffRoomTypes } from '../../api/roomApi'
import useApi from '../../hooks/useApi'
import RoomTypeCard from '../../components/staff/RoomTypeCard'
import SearchBar from '../../components/customer/SearchBar'
import FilterBar from '../../components/customer/FilterBar'
import Pagination from '../../components/customer/Pagination'
import LoadingState from '../../components/common/LoadingState'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import { useAuth } from '../../hooks/useAuth'

const CLEARED_FILTERS = {
  search: undefined,
  min_price: undefined,
  max_price: undefined,
  min_adults: undefined,
  min_children: undefined,
  sort: undefined,
  direction: undefined,
  page: 1,
}

export default function RoomTypes() {
  const { hasRole } = useAuth()
  const canManage = hasRole(['admin', 'manager'])

  const [searchParams, setSearchParams] = useSearchParams()

  const filters = useMemo(() => {
    const next = {}
    searchParams.forEach((value, key) => {
      if (value === '' || value === undefined) return
      if (key === 'page') next[key] = Number(value)
      else if (key === 'min_price' || key === 'max_price' || key === 'min_adults' || key === 'min_children') {
        next[key] = Number(value)
      } else next[key] = value
    })
    return next
  }, [searchParams])

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

  const apiParams = useMemo(
    () => ({
      page: filters.page ?? 1,
      ...(filters.search ? { search: filters.search } : {}),
      ...(filters.min_price != null ? { min_price: filters.min_price } : {}),
      ...(filters.max_price != null ? { max_price: filters.max_price } : {}),
      ...(filters.min_adults != null ? { min_adults: filters.min_adults } : {}),
      ...(filters.min_children != null ? { min_children: filters.min_children } : {}),
      ...(filters.sort ? { sort: filters.sort } : {}),
      ...(filters.direction ? { direction: filters.direction } : {}),
    }),
    [filters],
  )

  const fetchRoomTypes = useCallback(() => staffRoomTypes.list(apiParams), [apiParams])
  const { data, meta, error, isLoading, refetch } = useApi(fetchRoomTypes)

  const roomTypes = Array.isArray(data) ? data : []
  const currentPage = meta?.page ?? filters.page ?? 1
  const lastPage = meta?.last_page ?? 1
  const hasFilters = Object.keys(filters).some((key) => key !== 'page')

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-bold text-slate-800">Room types</h1>
        <p className="mt-1 text-sm text-slate-500">Manage the room catalogue.</p>
        <div className="mt-8">
          <LoadingState label="Loading room types…" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-bold text-slate-800">Room types</h1>
        <p className="mt-1 text-sm text-slate-500">Manage the room catalogue.</p>
        <div className="mt-8">
          <ErrorState error={error} fallback="We couldn't load the room types. Please try again." onRetry={refetch} />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Room types</h1>
          <p className="mt-1 text-sm text-slate-500">Manage the room catalogue.</p>
        </div>
        {canManage && (
          <Link to="/staff/room-types/new" className="btn-primary">
            Add room type
          </Link>
        )}
      </div>

      <div className="mt-6 space-y-4">
        <SearchBar
          value={filters.search ?? ''}
          onChange={(search) => updateUrl({ search: search || undefined, page: 1 })}
          placeholder="Search by room type name…"
        />
        <FilterBar filters={filters} onChange={updateUrl} />
      </div>

      {roomTypes.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No room types configured"
            message={hasFilters ? 'No room types match your filters.' : 'Add your first room type to get started.'}
            action={
              hasFilters ? (
                <button type="button" className="btn-outline" onClick={() => updateUrl(CLEARED_FILTERS)}>
                  Clear filters
                </button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {roomTypes.map((roomType) => (
              <RoomTypeCard key={roomType.id} roomType={roomType} canManage={canManage} />
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