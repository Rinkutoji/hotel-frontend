import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { publicRooms } from '../../api/roomApi'
import useApi from '../../hooks/useApi'
import RoomTypeCard from '../../components/customer/RoomTypeCard'
import SearchBar from '../../components/customer/SearchBar'
import FilterBar from '../../components/customer/FilterBar'
import Pagination from '../../components/customer/Pagination'
import LoadingState from '../../components/common/LoadingState'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'

const PER_PAGE = 12

const EMPTY_TITLE = 'No room types found'
const EMPTY_MESSAGE = 'Try adjusting your search or filters to find available room types.'

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

export default function Rooms() {
  const [searchParams, setSearchParams] = useSearchParams()

  const searchParamsKey = searchParams.toString()

  const filters = useMemo(() => {
    const next = {}
    searchParams.forEach((value, key) => {
      if (value !== '' && value !== undefined) {
        if (key === 'page') next[key] = Number(value)
        else if (key === 'min_price' || key === 'max_price' || key === 'min_adults' || key === 'min_children') next[key] = Number(value)
        else next[key] = value
      }
    })
    return next
  }, [searchParamsKey])

  const updateFilters = useCallback(
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
      per_page: PER_PAGE,
      ...(filters.search ? { search: filters.search } : {}),
      ...(filters.min_price ?? filters.min_price === 0 ? { min_price: filters.min_price } : {}),
      ...(filters.max_price ?? filters.max_price === 0 ? { max_price: filters.max_price } : {}),
      ...(filters.min_adults ?? filters.min_adults === 0 ? { min_adults: filters.min_adults } : {}),
      ...(filters.min_children ?? filters.min_children === 0 ? { min_children: filters.min_children } : {}),
      ...(filters.sort ? { sort: filters.sort } : {}),
      ...(filters.direction ? { direction: filters.direction } : {}),
    }),
    [filters],
  )

  const fetchRoomTypes = useCallback(() => publicRooms.listRoomTypes(apiParams), [apiParams])
  const { data: roomTypes, meta, error, isLoading, refetch } = useApi(fetchRoomTypes)

  const currentPage = meta?.page ?? filters.page ?? 1
  const lastPage = meta?.last_page ?? 1

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-800">Rooms & Suites</h1>
        <div className="mt-8">
          <LoadingState />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-800">Rooms & Suites</h1>
        <div className="mt-8">
          <ErrorState
            error={error}
            fallback="We couldn't load the room types. Please try again."
            onRetry={refetch}
          />
        </div>
      </div>
    )
  }

  const items = Array.isArray(roomTypes) ? roomTypes : []

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-800">Rooms & Suites</h1>
      <p className="mt-1 text-sm text-slate-500">
        Explore our comfortable rooms and suites, each with its own character.
      </p>

      <div className="mt-8 space-y-4">
        <SearchBar
          value={filters.search ?? ''}
          onChange={(search) => updateFilters({ search: search || undefined, page: 1 })}
          placeholder="Search by room type name…"
        />
        <FilterBar filters={filters} onChange={updateFilters} />
      </div>

      {items.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title={EMPTY_TITLE}
            message={EMPTY_MESSAGE}
            action={
              <button type="button" className="btn-outline" onClick={() => updateFilters(CLEARED_FILTERS)}>
                Clear filters
              </button>
            }
          />
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((roomType) => (
              <RoomTypeCard key={roomType.id} roomType={roomType} />
            ))}
          </div>
          {lastPage > 1 && (
            <div className="mt-10">
              <Pagination currentPage={currentPage} lastPage={lastPage} onPageChange={(page) => updateFilters({ page })} />
            </div>
          )}
        </>
      )}
    </div>
  )
}