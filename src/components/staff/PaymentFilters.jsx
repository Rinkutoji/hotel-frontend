import { useSearchParams } from 'react-router-dom'
import SearchBar from '../customer/SearchBar'

const STATUS_OPTIONS = [
  'pending',
  'receipt_uploaded',
  'verified',
  'rejected',
  'refunded',
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

export default function PaymentFilters() {
  const [searchParams, setSearchParams] = useSearchParams()

  const status = searchParams.get('status') ?? ''
  const search = searchParams.get('search') ?? ''

  const handleStatusChange = (e) => {
    commitParams(setSearchParams, { status: e.target.value || undefined, page: 1 })
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

        <div className="w-full sm:w-64">
          <SearchBar
            value={search}
            onChange={(value) => commitParams(setSearchParams, { search: value || undefined, page: 1 })}
            placeholder="Search by booking #, name, or email"
          />
        </div>
      </div>
    </div>
  )
}