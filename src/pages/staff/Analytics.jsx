import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import useApi from '../../hooks/useApi'
import { staffProperties } from '../../api/propertyApi'
import useAnalytics from '../../hooks/useAnalytics'
import {
  formatCurrency,
  resolveGroupBy,
} from '../../utils/analyticsConfig'
import { formatDateKey } from '../../utils/reportConfig'
import AnalyticsDateFilter from '../../components/staff/analytics/AnalyticsDateFilter'
import KpiCard from '../../components/staff/analytics/KpiCard'
import BookingTrendChart from '../../components/staff/analytics/BookingTrendChart'
import RevenueTrendChart from '../../components/staff/analytics/RevenueTrendChart'
import BookingStatusChart from '../../components/staff/analytics/BookingStatusChart'
import PaymentStatusChart from '../../components/staff/analytics/PaymentStatusChart'
import RoomOccupancyChart from '../../components/staff/analytics/RoomOccupancyChart'
import RoomTypeChart from '../../components/staff/analytics/RoomTypeChart'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import { SkeletonChart } from '../../components/common/Skeleton'

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

export default function Analytics() {
  const [searchParams, setSearchParams] = useSearchParams()

  const date = new Date()
  const defaultTo = formatDateKey(date)
  const defaultFromRange = new Date()
  defaultFromRange.setDate(defaultFromRange.getDate() - 29)
  const defaultFrom = formatDateKey(defaultFromRange)

  const from = searchParams.get('from') ?? defaultFrom
  const to = searchParams.get('to') ?? defaultTo
  const granularity = searchParams.get('group_by') ?? 'auto'
  const propertyIdParam = searchParams.get('property_id') ?? ''
  const buildingIdParam = searchParams.get('building_id') ?? ''
  const propertyId = Number(propertyIdParam) || undefined
  const buildingId = Number(buildingIdParam) || undefined

  const fetchProperties = useCallback(() => staffProperties.list({ per_page: 50 }), [])
  const { data: properties } = useApi(fetchProperties)

  const fetchBuildings = useCallback(async () => {
    if (!propertyId) return { data: { data: [] } }
    return staffProperties.listBuildings(propertyId)
  }, [propertyId])
  const { data: buildings } = useApi(fetchBuildings)

  const effectiveGroupBy = useMemo(
    () => resolveGroupBy(from, to, granularity),
    [from, to, granularity],
  )

  const { analytics, loading, refreshing, error, lastUpdated, refetch } = useAnalytics({
    from,
    to,
    groupBy: effectiveGroupBy,
    propertyId,
    buildingId,
  })

  const handleProperty = (e) =>
    commitParams(setSearchParams, {
      property_id: e.target.value || undefined,
      building_id: undefined,
    })
  const handleBuilding = (e) =>
    commitParams(setSearchParams, { building_id: e.target.value || undefined })

  const summary = analytics?.summary
  const changes = summary?.changes ?? {}

  const hasData = summary != null

  return (
    <section aria-labelledby="analytics-heading" className="scroll-mt-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 id="analytics-heading" className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Analytics
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Live booking, revenue and occupancy insights from the database
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <p className="pb-2 text-xs text-slate-400 dark:text-slate-500">
            Granularity: {effectiveGroupBy === 'day' ? 'daily' : effectiveGroupBy}
          </p>
          <div className="w-full sm:w-auto sm:min-w-40">
            <label htmlFor="analytics-property" className="label">
              Property
            </label>
            <select
              id="analytics-property"
              className="input"
              value={propertyIdParam}
              onChange={handleProperty}
            >
              <option value="">All properties</option>
              {Array.isArray(properties)
                ? properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name}
                    </option>
                  ))
                : null}
            </select>
          </div>
          <div className="w-full sm:w-auto sm:min-w-40">
            <label htmlFor="analytics-building" className="label">
              Building
            </label>
            <select
              id="analytics-building"
              className="input"
              value={buildingIdParam}
              onChange={handleBuilding}
            >
              <option value="">All buildings</option>
              {Array.isArray(buildings)
                ? buildings.map((building) => (
                    <option key={building.id} value={building.id}>
                      {building.name}
                    </option>
                  ))
                : null}
            </select>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <AnalyticsDateFilter refreshing={refreshing} lastUpdated={lastUpdated} onRefresh={refetch} />

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <SkeletonChart label="Loading analytics" />
          </div>
        ) : error ? (
          <ErrorState
            error={error}
            fallback="We couldn't load the analytics data."
            onRetry={refetch}
          />
        ) : !hasData ? (
          <EmptyState
            title="No analytics data"
            message="Adjust the date range to see booking, revenue and occupancy insights."
          />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <KpiCard
                label="Total bookings"
                value={summary.total_bookings}
                change={changes.total_bookings}
              />
              <KpiCard
                label="Verified revenue"
                value={formatCurrency(summary.verified_revenue)}
                change={changes.verified_revenue}
              />
              <KpiCard
                label="Refunds"
                value={formatCurrency(summary.refunds)}
                change={changes.refunds}
                inverted
              />
              <KpiCard
                label="Net revenue"
                value={formatCurrency(summary.net_revenue)}
                change={changes.net_revenue}
              />
              <KpiCard
                label="Occupancy rate"
                value={`${Number(summary.occupancy_rate).toFixed(1)}%`}
                caption={`${summary.rooms_occupied} of ${summary.rooms_total} rooms occupied`}
              />
              <KpiCard
                label="Average booking value"
                value={formatCurrency(summary.average_booking_value)}
                change={changes.average_booking_value}
              />
              <KpiCard
                label="Cancellation rate"
                value={`${Number(summary.cancellation_rate).toFixed(1)}%`}
                change={changes.cancellation_rate}
                inverted
              />
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <BookingTrendChart series={analytics.booking_trend ?? []} />
              <RevenueTrendChart series={analytics.revenue ?? []} />
              <BookingStatusChart statuses={analytics.booking_status ?? []} />
              <PaymentStatusChart statuses={analytics.payment_status ?? []} />
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <RoomOccupancyChart
                distribution={analytics.room_occupancy ?? []}
                occupiedRate={Number(summary.occupancy_rate).toFixed(1)}
                roomsTotal={summary.rooms_total}
              />
              <RoomTypeChart roomTypes={analytics.room_types ?? []} />
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
