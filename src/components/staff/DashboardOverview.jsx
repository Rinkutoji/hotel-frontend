import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import useDashboardOverview from '../../hooks/useDashboardOverview'
import useApi from '../../hooks/useApi'
import { dashboardOverview } from '../../api/dashboardApi'
import { staffProperties } from '../../api/propertyApi'
import downloadCsvBlob from '../../utils/csvDownload'
import { formatCurrency, resolveGroupBy } from '../../utils/analyticsConfig'
import { formatDateKey } from '../../utils/reportConfig'
import AnalyticsDateFilter from './analytics/AnalyticsDateFilter'
import KpiCard from './analytics/KpiCard'
import BookingTrendChart from './analytics/BookingTrendChart'
import RevenueTrendChart from './analytics/RevenueTrendChart'
import CheckFlowChart from './CheckFlowChart'
import ChartCard from './analytics/ChartCard'
import ErrorState from '../common/ErrorState'
import { SkeletonChart } from '../common/Skeleton'

const SOURCE_LABELS = { website: 'Website', walk_in: 'Walk-in', phone: 'Phone', other: 'Other' }

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

export default function DashboardOverview() {
  const [searchParams, setSearchParams] = useSearchParams()

  const propertyIdParam = searchParams.get('property_id') ?? ''
  const propertyId = Number(propertyIdParam) || undefined

  const date = new Date()
  const defaultTo = formatDateKey(date)
  const defaultFromRange = new Date()
  defaultFromRange.setDate(defaultFromRange.getDate() - 29)
  const defaultFrom = formatDateKey(defaultFromRange)

  const from = searchParams.get('from') ?? defaultFrom
  const to = searchParams.get('to') ?? defaultTo
  const granularity = searchParams.get('group_by') ?? 'auto'
  const effectiveGroupBy = useMemo(() => resolveGroupBy(from, to, granularity), [from, to, granularity])

  const { overview, loading, refreshing, error, lastUpdated, refetch } = useDashboardOverview({
    from,
    to,
    groupBy: effectiveGroupBy,
    propertyId,
  })

  const fetchProperties = useCallback(() => staffProperties.list({ per_page: 50 }), [])
  const { data: properties } = useApi(fetchProperties)

  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    if (exporting) return
    setExporting(true)
    try {
      const res = await dashboardOverview.exportCsv({ from, to, group_by: effectiveGroupBy, ...(propertyId ? { property_id: propertyId } : {}) })
      downloadCsvBlob(res, `dashboard-${from}_${to}.csv`)
    } finally {
      setExporting(false)
    }
  }

  return (
    <section aria-labelledby="dashboard-overview-heading" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="dashboard-overview-heading" className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Hotel overview
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {from} → {to} · {effectiveGroupBy === 'day' ? 'daily' : effectiveGroupBy} granularity
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-full sm:w-auto sm:min-w-40">
            <label htmlFor="property" className="label">
              Property
            </label>
            <select
              id="property"
              className="input"
              value={propertyIdParam}
              onChange={(e) => commitParams(setSearchParams, { property_id: e.target.value || undefined })}
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
          <button type="button" className="btn-outline" onClick={handleExport} disabled={exporting}>
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
          <button type="button" className="btn-outline" onClick={() => window.print()}>
            Print
          </button>
        </div>
      </div>

      <AnalyticsDateFilter
        refreshing={refreshing}
        lastUpdated={lastUpdated}
        onRefresh={refetch}
        refreshNote="refresh manually"
      />

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <SkeletonChart label="Loading hotel overview" />
        </div>
      ) : error ? (
        <ErrorState error={error} fallback="We couldn't load the hotel overview." onRetry={refetch} />
      ) : (
        <div className="space-y-4">
          {/* Today KPIs */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-6">
            <KpiCard label="Today check-ins" value={overview.todays.check_ins} caption="expected arrivals" />
            <KpiCard label="Today check-outs" value={overview.todays.check_outs} caption="expected departures" />
            <KpiCard
              label="Today revenue"
              value={formatCurrency(overview.todays.net_revenue)}
              caption={`${formatCurrency(overview.todays.revenue)} · ${formatCurrency(overview.todays.refunds)} refunded`}
            />
            <KpiCard
              label="Month revenue"
              value={formatCurrency(overview.todays.month_net_revenue)}
              caption={`${formatCurrency(overview.todays.month_revenue)} gross`}
            />
            <KpiCard
              label="Payments to review"
              value={overview.todays.payments_to_review}
              caption="pending or receipt uploaded"
            />
            <KpiCard
              label="Outstanding"
              value={formatCurrency(overview.todays.outstanding.amount)}
              caption={`${overview.todays.outstanding.count} overdue holds`}
            />
          </div>

          {/* Inventory + not-yet-tracked revenue */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard label="Rooms available" value={overview.inventory.available} caption={`of ${overview.inventory.total} rooms`} />
            <KpiCard
              label="Rooms occupied"
              value={overview.inventory.occupied}
              caption={`${overview.inventory.occupied_pct}% occupancy`}
            />
            <KpiCard
              label="Rooms in maintenance"
              value={overview.inventory.maintenance}
              caption={`${overview.inventory.cleaning} cleaning`}
            />
            <KpiCard label="Additional service revenue" value="N/A" caption="Not tracked yet" />
          </div>

          {/* Trends */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <BookingTrendChart series={overview.booking_trend ?? []} />
            <RevenueTrendChart series={overview.revenue ?? []} />
            <CheckFlowChart series={overview.check_in_out ?? []} />
            <ChartCard title="Occupancy trend" subtitle={`${overview.inventory.total} rooms × nights in each period`}>
              {(() => {
                const trend = overview.occupancy_trend ?? []
                return trend.length === 0 ? (
                  <p className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                    No occupancy data for this window.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {trend.slice(-12).reverse().map((point) => (
                      <li key={point.period} className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-slate-600 dark:text-slate-300">{point.period}</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          {point.occupied_room_nights} / {point.capacity_room_nights} nights ({point.occupancy_pct}%)
                        </span>
                      </li>
                    ))}
                  </ul>
                )
              })()}
            </ChartCard>
          </div>

          {/* Sources, methods, guests */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ChartCard title="Reservation sources" subtitle="where bookings came from">
              <ul className="space-y-2">
                {(overview.booking_source ?? []).map((entry) => (
                  <li key={entry.source} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-600 dark:text-slate-300">{SOURCE_LABELS[entry.source] ?? entry.source}</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {entry.count} ({entry.percentage}%)
                    </span>
                  </li>
                ))}
              </ul>
            </ChartCard>
            <ChartCard title="Payment methods" subtitle="count and volume">
              <ul className="space-y-2">
                {(overview.payment_methods ?? []).map((entry) => (
                  <li key={entry.method} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-600 dark:text-slate-300">{entry.method.replace(/_/g, ' ')}</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {entry.count} · {formatCurrency(entry.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            </ChartCard>
            <ChartCard title="Guests" subtitle="over the window">
              <ul className="space-y-2">
                <li className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-600 dark:text-slate-300">Currently staying</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{overview.guests.currently_staying}</span>
                </li>
                <li className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-600 dark:text-slate-300">New guests</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{overview.guests.new}</span>
                </li>
                <li className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-600 dark:text-slate-300">Returning guests</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{overview.guests.returning}</span>
                </li>
                <li className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-600 dark:text-slate-300">Total distinct guests</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{overview.guests.total}</span>
                </li>
              </ul>
            </ChartCard>
          </div>
        </div>
      )}
    </section>
  )
}
