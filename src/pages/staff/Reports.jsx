import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ReportFilters from '../../components/staff/ReportFilters'
import StatCard from '../../components/staff/StatCard'
import StatusBarChart from '../../components/staff/StatusBarChart'
import RevenueChart from '../../components/staff/RevenueChart'
import OccupancyDonut from '../../components/staff/OccupancyDonut'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import { SkeletonChart } from '../../components/common/Skeleton'
import useReportSummary from '../../hooks/useReportSummary'
import { staffReports } from '../../api/reportApi'
import downloadCsvBlob from '../../utils/csvDownload'
import {
  BOOKING_LABELS,
  BOOKING_STATUS_KEYS,
  ROOM_LABELS,
  ROOM_COLORS,
  ROOM_STATUS_KEYS,
  monthBounds,
} from '../../utils/reportConfig'

const DEFAULT_GROUP = 'day'

export default function Reports() {
  const [searchParams] = useSearchParams()

  const bounds = useMemo(() => monthBounds(new Date()), [])

  const from = searchParams.get('from') ?? bounds.from
  const to = searchParams.get('to') ?? bounds.to
  const groupBy = searchParams.get('group_by') ?? DEFAULT_GROUP
  const status = searchParams.get('status') || undefined

  const propertyId = Number(searchParams.get('property_id')) || undefined
  const buildingId = Number(searchParams.get('building_id')) || undefined
  const roomTypeId = Number(searchParams.get('room_type_id')) || undefined

  const { bookings, revenue, rooms, refetch } = useReportSummary({
    from,
    to,
    groupBy,
    status,
    propertyId,
    buildingId,
    roomTypeId,
  })

  const statusRows = BOOKING_STATUS_KEYS.map((key) => ({
    label: BOOKING_LABELS[key],
    value: bookings.data?.by_status?.[key] ?? 0,
  }))

  const revenueSeries = (revenue.data?.series ?? []).map((point) => ({ ...point }))

  const occupancyRows = ROOM_STATUS_KEYS.map((key) => ({
    label: ROOM_LABELS[key],
    value: rooms.data?.distribution?.[key] ?? 0,
    color: ROOM_COLORS[key],
  }))

  const occupiedPct = Number(rooms.data?.occupied_pct ?? 0)
  const roomTotal = Number(rooms.data?.total ?? 0)

  const isLoading = bookings.isLoading || revenue.isLoading || rooms.isLoading
  const error = bookings.error || revenue.error || rooms.error

  const hasData =
    Number(bookings.data?.total ?? 0) > 0 ||
    Number(revenue.data?.verified_total ?? 0) > 0 ||
    occupancyRows.some((row) => row.value > 0)

  const [exporting, setExporting] = useState(null)
  const [exportError, setExportError] = useState(null)

  const handleExport = async (report) => {
    if (exporting) return
    setExporting(report)
    setExportError(null)
    try {
      const params = {
        from,
        to,
        ...(groupBy && groupBy !== 'day' ? { group_by: groupBy } : {}),
        ...(status ? { status } : {}),
        ...(propertyId ? { property_id: propertyId } : {}),
        ...(buildingId ? { building_id: buildingId } : {}),
        ...(roomTypeId ? { room_type_id: roomTypeId } : {}),
      }
      const res = await staffReports.exportCsv(report, params)
      downloadCsvBlob(res, `report-${report}.csv`)
    } catch (err) {
      setExportError(err)
    } finally {
      setExporting(null)
    }
  }

  return (
    <section aria-labelledby="reports-heading" className="scroll-mt-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 id="reports-heading" className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Reports
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Booking, revenue and occupancy summary for staff
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn-outline" onClick={() => window.print()}>
            Print
          </button>
          <button type="button" className="btn-outline" disabled={exporting !== null} onClick={() => handleExport('bookings')}>
            {exporting === 'bookings' ? 'Exporting…' : 'CSV: Bookings'}
          </button>
          <button type="button" className="btn-outline" disabled={exporting !== null} onClick={() => handleExport('revenue')}>
            {exporting === 'revenue' ? 'Exporting…' : 'CSV: Revenue'}
          </button>
          <button type="button" className="btn-outline" disabled={exporting !== null} onClick={() => handleExport('rooms')}>
            {exporting === 'rooms' ? 'Exporting…' : 'CSV: Rooms'}
          </button>
        </div>
      </div>

      {exportError && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          Export failed. Please try again.
        </p>
      )}

      <div className="mt-6 space-y-4">
        <ReportFilters />

        {isLoading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <SkeletonChart label="Loading report summary" />
          </div>
        ) : error ? (
          <ErrorState
            error={error}
            fallback="We couldn't load the report summary."
            onRetry={refetch}
          />
        ) : !hasData ? (
          <EmptyState
            title="No report data"
            message="Adjust the date range or filters to see booking, revenue and occupancy data."
          />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Total bookings"
                value={bookings.data?.total ?? 0}
                caption="in selected period"
                to="/staff/reports"
              />
              <StatCard
                label="Verified revenue"
                value={Number(revenue.data?.verified_total ?? 0).toFixed(2)}
                caption="from verified payments"
                to="/staff/reports"
              />
              <StatCard
                label="Refunds"
                value={Number(revenue.data?.refunded_total ?? 0).toFixed(2)}
                caption="refunded in this period"
                to="/staff/reports"
              />
              <StatCard
                label="Occupancy"
                value={`${Math.round(occupiedPct * 100)}%`}
                caption={`${roomTotal} rooms`}
                to="/staff/reports"
              />
            </div>

            <StatusBarChart title="Bookings by status" rows={statusRows} />

            <RevenueChart title="Revenue" series={revenueSeries} />

            <OccupancyDonut title="Room occupancy" data={occupancyRows} />
          </div>
        )}
      </div>
    </section>
  )
}
