import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import useProperties from '../../hooks/useProperties'
import SearchBar from '../../components/customer/SearchBar'
import Pagination from '../../components/customer/Pagination'
import LoadingState from '../../components/common/LoadingState'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import { useAuth } from '../../hooks/useAuth'

const STATUS_STYLES = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-slate-200 text-slate-700',
}

const CLEARED_FILTERS = {
  search: undefined,
  code: undefined,
  city: undefined,
  province_state: undefined,
  country: undefined,
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

export default function Properties() {
  const { hasRole } = useAuth()
  const canFilter = hasRole(['admin', 'manager'])
  const canCreate = hasRole(['admin'])

  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('search') ?? ''
  const code = searchParams.get('code') ?? ''
  const city = searchParams.get('city') ?? ''
  const provinceState = searchParams.get('province_state') ?? ''
  const country = searchParams.get('country') ?? ''
  const status = searchParams.get('status') ?? ''
  const page = Number(searchParams.get('page')) || 1

  // Key order is fixed on purpose: useProperties derives its effect key
  // from JSON.stringify(params), so unstable key order would refetch
  // on every render.
  const apiParams = useMemo(
    () => ({
      page,
      ...(search ? { search } : {}),
      ...(code ? { code } : {}),
      ...(city ? { city } : {}),
      ...(provinceState ? { province_state: provinceState } : {}),
      ...(country ? { country } : {}),
      ...(status ? { status } : {}),
    }),
    [search, code, city, provinceState, country, status, page],
  )

  const { properties, meta, loading, error, refetch } = useProperties(apiParams)

  const rows = Array.isArray(properties) ? properties : []
  const currentPage = meta?.page ?? page
  const lastPage = meta?.last_page ?? 1
  const hasFilters = Boolean(search || code || city || provinceState || country || status)

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-bold text-slate-800">Properties</h1>
        <p className="mt-1 text-sm text-slate-500">Manage hotel properties and their buildings.</p>
        <div className="mt-8">
          <LoadingState label="Loading properties…" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-bold text-slate-800">Properties</h1>
        <p className="mt-1 text-sm text-slate-500">Manage hotel properties and their buildings.</p>
        <div className="mt-8">
          <ErrorState error={error} fallback="We couldn't load the properties. Please try again." onRetry={refetch} />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Properties</h1>
          <p className="mt-1 text-sm text-slate-500">Manage hotel properties and their buildings.</p>
        </div>
        {canCreate && (
          <Link to="/staff/properties/new" className="btn-primary">
            New property
          </Link>
        )}
      </div>

      {canFilter && (
        <div className="mt-6">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-full sm:w-auto sm:min-w-40">
              <label htmlFor="code" className="label">
                Code
              </label>
              <input
                id="code"
                type="text"
                className="input"
                placeholder="e.g. MAIN"
                value={code}
                onChange={(e) => commitParams(setSearchParams, { code: e.target.value || undefined, page: 1 })}
              />
            </div>
            <div className="w-full sm:w-auto sm:min-w-40">
              <label htmlFor="city" className="label">
                City
              </label>
              <input
                id="city"
                type="text"
                className="input"
                placeholder="e.g. Phnom Penh"
                value={city}
                onChange={(e) => commitParams(setSearchParams, { city: e.target.value || undefined, page: 1 })}
              />
            </div>
            <div className="w-full sm:w-auto sm:min-w-40">
              <label htmlFor="province" className="label">
                Province / State
              </label>
              <input
                id="province"
                type="text"
                className="input"
                placeholder="e.g. Phnom Penh"
                value={provinceState}
                onChange={(e) =>
                  commitParams(setSearchParams, { province_state: e.target.value || undefined, page: 1 })
                }
              />
            </div>
            <div className="w-full sm:w-auto sm:min-w-40">
              <label htmlFor="country" className="label">
                Country
              </label>
              <input
                id="country"
                type="text"
                className="input"
                placeholder="e.g. Cambodia"
                value={country}
                onChange={(e) => commitParams(setSearchParams, { country: e.target.value || undefined, page: 1 })}
              />
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
                placeholder="Search properties"
              />
            </div>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No properties found"
            message={hasFilters ? 'No properties match your filters.' : 'There are no properties yet.'}
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
            {rows.map((property) => {
              const location = [property.city, property.country].filter(Boolean).join(', ')
              return (
                <Link
                  key={property.id}
                  to={`/staff/properties/${property.id}`}
                  className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold text-slate-800">{property.name}</h2>
                      <p className="mt-0.5 text-sm text-slate-500">
                        {property.code}
                        {location ? ` · ${location}` : ''}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_STYLES[property.status] ?? 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {property.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    {property.buildings_count} buildings · {property.rooms_count} rooms
                  </p>
                </Link>
              )
            })}
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
