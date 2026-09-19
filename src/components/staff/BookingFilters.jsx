import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import SearchBar from '../customer/SearchBar'

const STATUS_OPTIONS = [
  'pending_payment',
  'confirmed',
  'checked_in',
  'checked_out',
  'cancelled',
  'no_show',
]

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

export default function BookingFilters() {
  const [searchParams, setSearchParams] = useSearchParams()

  const status = searchParams.get('status') ?? ''
  const search = searchParams.get('search') ?? ''

  // Draft mirrors for the date inputs so the user can type before blur commits
  // the value to the URL (the URL stays the single source of truth). Synced
  // during render following the same pattern as SearchBar.
  const [draftFrom, setDraftFrom] = useState(searchParams.get('from') ?? '')
  const [draftTo, setDraftTo] = useState(searchParams.get('to') ?? '')
  const [warning, setWarning] = useState(null)

  const urlFrom = searchParams.get('from') ?? ''
  const urlTo = searchParams.get('to') ?? ''

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

  const handleStatusChange = (e) => {
    commitParams(setSearchParams, { status: e.target.value || undefined, page: 1 })
  }

  const handleFromBlur = () => {
    setWarning(null)
    const value = draftFrom.trim()
    if (value === '') {
      commitParams(setSearchParams, { from: undefined, page: 1 })
      return
    }
    if (draftTo.trim() !== '' && value > draftTo.trim()) {
      setWarning('Start date must be on or before the end date.')
      return
    }
    commitParams(setSearchParams, { from: value, page: 1 })
  }

  const handleToBlur = () => {
    setWarning(null)
    const value = draftTo.trim()
    if (value === '') {
      commitParams(setSearchParams, { to: undefined, page: 1 })
      return
    }
    if (draftFrom.trim() !== '' && value < draftFrom.trim()) {
      setWarning('End date must be on or after the start date.')
      return
    }
    commitParams(setSearchParams, { to: value, page: 1 })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-auto sm:min-w-40">
          <label htmlFor="status" className="label">
            Status
          </label>
          <select id="status" className="input" value={status} onChange={handleStatusChange}>
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value.replaceAll('_', ' ')}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full sm:w-auto">
          <label htmlFor="from" className="label">
            Check-in from
          </label>
          <input
            id="from"
            type="date"
            className="input"
            value={draftFrom}
            onChange={(e) => setDraftFrom(e.target.value)}
            onBlur={handleFromBlur}
            aria-describedby={warning ? 'booking-filter-warning' : undefined}
          />
        </div>

        <div className="w-full sm:w-auto">
          <label htmlFor="to" className="label">
            Check-out to
          </label>
          <input
            id="to"
            type="date"
            className="input"
            value={draftTo}
            onChange={(e) => setDraftTo(e.target.value)}
            onBlur={handleToBlur}
            aria-describedby={warning ? 'booking-filter-warning' : undefined}
          />
        </div>

        <div className="w-full sm:w-64">
          <SearchBar
            value={search}
            onChange={(value) => commitParams(setSearchParams, { search: value || undefined, page: 1 })}
            placeholder="Search by booking #, name, or email"
          />
        </div>
      </div>

      {warning && (
        <p id="booking-filter-warning" className="text-sm text-amber-700" role="alert">
          {warning}
        </p>
      )}
    </div>
  )
}