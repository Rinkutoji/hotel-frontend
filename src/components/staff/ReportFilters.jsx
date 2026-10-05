import { useCallback, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BOOKING_STATUS_KEYS } from '../../utils/reportConfig'
import { formatDateKey } from '../../utils/reportConfig'
import { staffProperties } from '../../api/propertyApi'
import { staffRoomTypes } from '../../api/roomApi'
import useApi from '../../hooks/useApi'

const PRESETS = [
  { label: 'Today', range: () => todayRange(0) },
  { label: 'Yesterday', range: () => todayRange(-1) },
  { label: 'This week', range: weekRange },
  { label: 'This month', range: monthRange },
]

function todayRange(offsetDays) {
  const day = new Date()
  day.setDate(day.getDate() + offsetDays)
  const key = formatDateKey(day)
  return { from: key, to: key }
}

function weekRange() {
  const now = new Date()
  const day = now.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + mondayOffset)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { from: formatDateKey(monday), to: formatDateKey(sunday) }
}

function monthRange() {
  const now = new Date()
  const first = new Date(now.getFullYear(), now.getMonth(), 1)
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return { from: formatDateKey(first), to: formatDateKey(last) }
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

export default function ReportFilters() {
  const [searchParams, setSearchParams] = useSearchParams()

  const urlFrom = searchParams.get('from') ?? ''
  const urlTo = searchParams.get('to') ?? ''
  const groupBy = searchParams.get('group_by') ?? 'day'
  const status = searchParams.get('status') ?? ''
  const propertyIdParam = searchParams.get('property_id') ?? ''
  const buildingIdParam = searchParams.get('building_id') ?? ''
  const roomTypeIdParam = searchParams.get('room_type_id') ?? ''
  const propertyId = Number(propertyIdParam) || undefined

  const fetchProperties = useCallback(() => staffProperties.list({ per_page: 50 }), [])
  const { data: properties } = useApi(fetchProperties)

  const fetchRoomTypes = useCallback(() => staffRoomTypes.list({ per_page: 50 }), [])
  const { data: roomTypes } = useApi(fetchRoomTypes)

  const fetchBuildings = useCallback(async () => {
    if (!propertyId) return { data: { data: [] } }
    return staffProperties.listBuildings(propertyId)
  }, [propertyId])
  const { data: buildings } = useApi(fetchBuildings)

  const [draftFrom, setDraftFrom] = useState(urlFrom)
  const [draftTo, setDraftTo] = useState(urlTo)
  const [warning, setWarning] = useState(null)

  const [prevFrom, setPrevFrom] = useState(urlFrom)
  const [prevTo, setPrevTo] = useState(urlTo)

  if (urlFrom !== prevFrom) {
    setPrevFrom(urlFrom)
    setDraftFrom(urlFrom)
  }
  if (urlTo !== prevTo) {
    setPrevTo(urlTo)
    setDraftTo(urlTo)
  }

  const handleFromBlur = () => {
    setWarning(null)
    const value = draftFrom.trim()
    if (value === '') return
    if (draftTo.trim() !== '' && value > draftTo.trim()) {
      setWarning('Start date must be on or before the end date.')
      return
    }
    commitParams(setSearchParams, { from: value })
  }

  const handleToBlur = () => {
    setWarning(null)
    const value = draftTo.trim()
    if (value === '') return
    if (draftFrom.trim() !== '' && value < draftFrom.trim()) {
      setWarning('End date must be on or after the start date.')
      return
    }
    commitParams(setSearchParams, { to: value })
  }

  const handleGroupBy = (e) => commitParams(setSearchParams, { group_by: e.target.value || undefined })
  const handleStatus = (e) => commitParams(setSearchParams, { status: e.target.value || undefined })
  const handleProperty = (e) =>
    commitParams(setSearchParams, {
      property_id: e.target.value || undefined,
      building_id: undefined,
    })
  const handleBuilding = (e) =>
    commitParams(setSearchParams, { building_id: e.target.value || undefined })
  const handleRoomType = (e) =>
    commitParams(setSearchParams, { room_type_id: e.target.value || undefined })

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            className="btn-outline"
            onClick={() => commitParams(setSearchParams, preset.range())}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-auto">
          <label htmlFor="report-from" className="label">
            From
          </label>
          <input
            id="report-from"
            type="date"
            className="input"
            value={draftFrom}
            onChange={(e) => setDraftFrom(e.target.value)}
            onBlur={handleFromBlur}
            aria-describedby={warning ? 'report-filter-warning' : undefined}
          />
        </div>

        <div className="w-full sm:w-auto">
          <label htmlFor="report-to" className="label">
            To
          </label>
          <input
            id="report-to"
            type="date"
            className="input"
            value={draftTo}
            onChange={(e) => setDraftTo(e.target.value)}
            onBlur={handleToBlur}
            aria-describedby={warning ? 'report-filter-warning' : undefined}
          />
        </div>

        <div className="w-full sm:w-40">
          <label htmlFor="report-group-by" className="label">
            Group by
          </label>
          <select id="report-group-by" className="input" value={groupBy} onChange={handleGroupBy}>
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
          </select>
        </div>

        <div className="w-full sm:w-48">
          <label htmlFor="report-status" className="label">
            Booking status
          </label>
          <select id="report-status" className="input" value={status} onChange={handleStatus}>
            <option value="">All statuses</option>
            {BOOKING_STATUS_KEYS.map((value) => (
              <option key={value} value={value}>
                {value.replaceAll('_', ' ')}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full sm:w-40">
          <label htmlFor="report-property" className="label">
            Property
          </label>
          <select id="report-property" className="input" value={propertyIdParam} onChange={handleProperty}>
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

        <div className="w-full sm:w-40">
          <label htmlFor="report-building" className="label">
            Building
          </label>
          <select id="report-building" className="input" value={buildingIdParam} onChange={handleBuilding}>
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

        <div className="w-full sm:w-40">
          <label htmlFor="report-room-type" className="label">
            Room type
          </label>
          <select id="report-room-type" className="input" value={roomTypeIdParam} onChange={handleRoomType}>
            <option value="">All room types</option>
            {Array.isArray(roomTypes)
              ? roomTypes.map((roomType) => (
                  <option key={roomType.id} value={roomType.id}>
                    {roomType.name}
                  </option>
                ))
              : null}
          </select>
        </div>
      </div>

      {warning && (
        <p id="report-filter-warning" className="text-sm text-amber-700" role="alert">
          {warning}
        </p>
      )}
    </div>
  )
}
