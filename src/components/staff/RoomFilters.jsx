import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { staffRoomTypes } from '../../api/roomApi'
import useApi from '../../hooks/useApi'
import SearchBar from '../customer/SearchBar'

const ROOM_STATUS_OPTIONS = ['available', 'reserved', 'occupied', 'cleaning', 'maintenance']

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

export default function RoomFilters() {
  const [searchParams, setSearchParams] = useSearchParams()

  const status = searchParams.get('status') ?? ''
  const search = searchParams.get('search') ?? ''
  const roomTypeId = searchParams.get('room_type_id') ?? ''

  const fetchRoomTypes = useCallback(() => staffRoomTypes.list({ per_page: 50 }), [])
  const { data: roomTypes } = useApi(fetchRoomTypes)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
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
            {ROOM_STATUS_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value.replaceAll('_', ' ')}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full sm:w-auto sm:min-w-48">
          <label htmlFor="room-type" className="label">
            Room type
          </label>
          <select
            id="room-type"
            className="input"
            value={roomTypeId}
            onChange={(e) =>
              commitParams(setSearchParams, { room_type_id: e.target.value || undefined, page: 1 })
            }
          >
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

        <div className="w-full sm:w-64">
          <SearchBar
            value={search}
            onChange={(value) => commitParams(setSearchParams, { search: value || undefined, page: 1 })}
            placeholder="Search by room number"
          />
        </div>
      </div>
    </div>
  )
}