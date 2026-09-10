import { useCallback, useMemo, useState } from 'react'
import { publicRooms } from '../../api/roomApi'
import useApi from '../../hooks/useApi'
import { getErrorMessage } from '../../utils/apiError'
import LoadingState from '../../components/common/LoadingState'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'

function todayISO() {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10)
}

function AvailableResult({ room }) {
  return (
    <div className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
      <div>
        <p className="text-base font-semibold text-slate-800">Room {room.room_number}</p>
        <p className="mt-1 text-sm text-slate-500">
          Floor {room.floor}
          {room.status === 'available' ? ' · Available now' : ''}
        </p>
      </div>
      <div className="text-left sm:text-right">
        <p className="text-sm text-slate-500">
          <span className="text-lg font-bold text-slate-900">{room.price_per_night}</span> / night
        </p>
        {room.discount && (
          <p className="mt-1 text-xs font-medium text-green-700">
            {room.discount.discounted_price_per_night} / night with {room.discount.name} (
            {room.discount.percent_off}% off)
          </p>
        )}
      </div>
    </div>
  )
}

export default function AvailabilitySearch() {
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [selectedRoomIds, setSelectedRoomIds] = useState(() => [])
  const [results, setResults] = useState(null)
  const [searchError, setSearchError] = useState(null)
  const [searching, setSearching] = useState(false)
  const [roomTypeFilter, setRoomTypeFilter] = useState('')

  const fetchRooms = useCallback(() => {
    const params = { per_page: 50 }
    if (roomTypeFilter) params.room_type_id = roomTypeFilter
    return publicRooms.listRooms(params)
  }, [roomTypeFilter])

  const { data: roomsData, error: roomsError, isLoading: roomsLoading, refetch } = useApi(fetchRooms)

  const roomsByType = useMemo(() => {
    const map = new Map()
    ;(Array.isArray(roomsData) ? roomsData : []).forEach((room) => {
      const group = map.get(room.room_type_id)
      if (group) group.push(room)
      else map.set(room.room_type_id, [room])
    })
    return map
  }, [roomsData])

  const roomTypes = useMemo(() => {
    const map = new Map()
    ;(Array.isArray(roomsData) ? roomsData : []).forEach((room) => {
      if (room.room_type) map.set(room.room_type.id, room.room_type)
    })
    return [...map.values()]
  }, [roomsData])

  const canSearch = checkIn !== '' && checkOut !== '' && selectedRoomIds.length > 0 && !searching

  const minimumDate = todayISO()

  const toggleRoom = (id) => {
    setSelectedRoomIds((prev) =>
      prev.includes(id) ? prev.filter((roomId) => roomId !== id) : [...prev, id],
    )
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!canSearch) return
    setSearching(true)
    setSearchError(null)
    try {
      const res = await publicRooms.checkAvailability({
        check_in_date: checkIn,
        check_out_date: checkOut,
        rooms: selectedRoomIds,
      })
      setResults(Array.isArray(res.data?.data) ? res.data.data : [])
    } catch (err) {
      setResults(null)
      setSearchError(err)
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-800">Check availability</h1>
      <p className="mt-1 text-sm text-slate-500">
        Select your dates and the rooms you are interested in to see what is available.
      </p>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="check-in" className="label">Check-in</label>
            <input
              id="check-in"
              type="date"
              className="input"
              min={minimumDate}
              value={checkIn}
              onChange={(e) => {
                setCheckIn(e.target.value)
                if (checkOut && e.target.value >= checkOut) setCheckOut('')
              }}
            />
          </div>
          <div>
            <label htmlFor="check-out" className="label">Check-out</label>
            <input
              id="check-out"
              type="date"
              className="input"
              min={checkIn || minimumDate}
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="room-type" className="label">Room type</label>
            <select
              id="room-type"
              className="input"
              value={roomTypeFilter}
              onChange={(e) => {
                setRoomTypeFilter(e.target.value)
                setSelectedRoomIds([])
              }}
            >
              <option value="">All room types</option>
              {roomTypes.map((roomType) => (
                <option key={roomType.id} value={roomType.id}>
                  {roomType.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {roomsError ? (
        <div className="mt-8">
          <ErrorState error={roomsError} fallback="We couldn't load the room list. Please try again." onRetry={refetch} />
        </div>
      ) : roomsLoading ? (
        <div className="mt-8">
          <LoadingState label="Loading rooms…" />
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <section>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-slate-800">Select rooms</h2>
              <p className="text-sm text-slate-500">{selectedRoomIds.length} selected</p>
            </div>
            <p className="mt-1 text-sm text-slate-400">
              Choose up to 5 rooms to check. Rooms not listed below are unavailable for your dates.
            </p>

            {Array.isArray(roomsData) && roomsData.length === 0 ? (
              <div className="mt-6">
                <EmptyState title="No rooms found" message="There are no rooms to check availability for." />
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {[...roomsByType.entries()].map(([typeId, rooms]) => (
                  <div key={typeId}>
                    <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                      {rooms[0]?.room_type?.name ?? `Room type ${typeId}`}
                    </h3>
                    <div className="space-y-2">
                      {rooms.map((room) => (
                        <label
                          key={room.id}
                          className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-3 transition-colors ${
                            selectedRoomIds.includes(room.id)
                              ? 'border-brand-500 bg-brand-50'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <span className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-brand-600"
                              checked={selectedRoomIds.includes(room.id)}
                              onChange={() => toggleRoom(room.id)}
                            />
                            <span>
                              <span className="block text-sm font-medium text-slate-800">Room {room.room_number}</span>
                              <span className="block text-xs text-slate-500">Floor {room.floor}</span>
                            </span>
                          </span>
                          {room.room_type && (
                            <span className="text-sm text-slate-600">
                              {room.room_type.base_price}/night
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button type="button" className="btn-primary mt-6 w-full" disabled={!canSearch} onClick={handleSearch}>
              {searching ? 'Checking…' : 'Check availability'}
            </button>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800">Availability results</h2>

            {searchError ? (
              <div className="mt-4">
                <ErrorState
                  error={searchError}
                  fallback={getErrorMessage(searchError, 'We could not check availability. Please verify your dates and selected rooms.')}
                />
              </div>
            ) : results === null ? (
              <div className="mt-4 flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-14 text-center">
                <p className="max-w-sm text-sm text-slate-400">
                  Enter your dates, select rooms, and check availability to see what is available.
                </p>
              </div>
            ) : results.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  title="No rooms available"
                  message="None of the selected rooms are available for the chosen dates."
                />
              </div>
            ) : (
              <>
                <p className="mt-1 text-sm text-slate-500">
                  {results.length} {results.length === 1 ? 'room is' : 'rooms are'} available for your dates.
                </p>
                <div className="mt-4 space-y-3">
                  {results.map((room) => (
                    <AvailableResult key={room.id} room={room} />
                  ))}
                </div>
                {selectedRoomIds.length > results.length && (
                  <p className="mt-4 text-sm text-slate-400">
                    {selectedRoomIds.length - results.length}{' '}
                    {selectedRoomIds.length - results.length === 1 ? 'room was' : 'rooms were'} not available for the
                    selected dates.
                  </p>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </div>
  )
}