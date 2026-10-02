import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import usePropertyDetail from '../../hooks/usePropertyDetail'
import StatCard from '../../components/staff/StatCard'
import LoadingState from '../../components/common/LoadingState'
import ErrorState from '../../components/common/ErrorState'
import { useAuth } from '../../hooks/useAuth'

const STATUS_STYLES = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-slate-200 text-slate-700',
}

function InfoItem({ label, value }) {
  const display = value === null || value === undefined || value === '' ? '—' : value
  return (
    <div>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-0.5 break-words text-slate-800">{display}</p>
    </div>
  )
}

export default function PropertyDetail() {
  const { id } = useParams()
  const { hasRole } = useAuth()
  const canManage = hasRole(['admin'])

  const { property, loading, error, refetch } = usePropertyDetail(id)
  const [showMap, setShowMap] = useState(false)

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="mt-2">
          <LoadingState label="Loading property…" />
        </div>
      </div>
    )
  }

  if (error) {
    const is404 = error?.response?.status === 404
    return (
      <div className="mx-auto max-w-5xl">
        <Link to="/staff/properties" className="text-sm font-medium text-brand-600 hover:text-brand-700">
          ← Back to properties
        </Link>
        <div className="mt-4">
          <ErrorState
            error={error}
            fallback={is404 ? 'This property could not be found.' : "We couldn't load this property. Please try again."}
            onRetry={is404 ? undefined : refetch}
          />
        </div>
      </div>
    )
  }

  const summary = property.summary ?? {}
  const buildings = Array.isArray(property.buildings) ? property.buildings : []

  const lat = property.latitude != null && property.latitude !== '' ? Number(property.latitude) : null
  const lng = property.longitude != null && property.longitude !== '' ? Number(property.longitude) : null
  const hasCoords = lat !== null && lng !== null && Number.isFinite(lat) && Number.isFinite(lng)
  const mapSrc = hasCoords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01}%2C${lat - 0.01}%2C${lng + 0.01}%2C${lat + 0.01}&layer=mapnik&marker=${lat}%2C${lng}`
    : null

  return (
    <div className="mx-auto max-w-5xl">
      <Link to="/staff/properties" className="text-sm font-medium text-brand-600 hover:text-brand-700">
        ← Back to properties
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{property.name}</h1>
          <p className="mt-1 text-sm text-slate-500">{property.code}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              STATUS_STYLES[property.status] ?? 'bg-slate-100 text-slate-600'
            }`}
          >
            {property.status}
          </span>
          {canManage && (
            <Link to={`/staff/properties/${property.id}/edit`} className="btn-outline">
              Edit property
            </Link>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Rooms" value={summary.room_count ?? 0} />
        <StatCard label="Occupied" value={summary.occupied ?? 0} />
        <StatCard label="Occupancy" value={`${summary.occupancy_pct ?? 0}%`} />
        <StatCard label="Verified revenue" value={summary.verified_revenue_total ?? '0.00'} caption={property.currency} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Hotel information</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <InfoItem label="Description" value={property.description} />
            <InfoItem label="Check-in time" value={property.check_in_time} />
            <InfoItem label="Check-out time" value={property.check_out_time} />
            <InfoItem label="Timezone" value={property.timezone} />
            <InfoItem label="Currency" value={property.currency} />
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Address</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <InfoItem label="Street" value={property.address} />
            <InfoItem label="City" value={property.city} />
            <InfoItem label="Province / State" value={property.province_state} />
            <InfoItem label="Country" value={property.country} />
            <InfoItem label="Postal code" value={property.postal_code} />
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Contact</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <InfoItem label="Phone" value={property.phone} />
            <InfoItem label="Email" value={property.email} />
            <div className="sm:col-span-2">
              <InfoItem label="Website" value={property.website} />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Location</h2>
          <div className="mt-4">
            {hasCoords ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-slate-500">
                    {lat}, {lng}
                  </p>
                  <button type="button" className="btn-outline" onClick={() => setShowMap((prev) => !prev)}>
                    {showMap ? 'Hide map' : 'Show map'}
                  </button>
                </div>
                {showMap && (
                  <iframe
                    title={`Map of ${property.name}`}
                    src={mapSrc}
                    className="mt-4 h-64 w-full rounded-lg border-0"
                    loading="lazy"
                  />
                )}
              </>
            ) : (
              <p className="text-sm text-slate-500">No coordinates set.</p>
            )}
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Buildings</h2>
          {canManage && (
            <Link to={`/staff/properties/${property.id}/buildings/new`} className="btn-primary">
              New building
            </Link>
          )}
        </div>
        {buildings.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No buildings yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {buildings.map((building) => (
              <div key={building.id} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium text-slate-800">{building.name}</h3>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {building.code} ·{' '}
                      {building.floor_count != null ? `${building.floor_count} floors` : 'no floor count'}
                    </p>
                  </div>
                  {canManage && (
                    <Link
                      to={`/staff/buildings/${building.id}/edit`}
                      className="text-sm font-medium text-brand-600 hover:text-brand-700"
                    >
                      Edit
                    </Link>
                  )}
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  {building.room_count} rooms · {building.occupied} occupied ·{' '}
                  {building.occupancy_pct != null ? `${building.occupancy_pct}%` : '—'} occupancy
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
