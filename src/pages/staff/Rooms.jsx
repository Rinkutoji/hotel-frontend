import { useCallback, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { staffRooms } from '../../api/roomApi'
import useApi from '../../hooks/useApi'
import RoomCard from '../../components/staff/RoomCard'
import RoomFilters from '../../components/staff/RoomFilters'
import Pagination from '../../components/customer/Pagination'
import LoadingState from '../../components/common/LoadingState'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import ErrorMessage from '../../components/common/ErrorMessage'
import { useAuth } from '../../hooks/useAuth'

const STATUS_SUCCES_NAME = {
  maintenance: 'Room marked for maintenance.',
  available: 'Room marked available.',
}

const CLEARED_FILTERS = {
  status: undefined,
  room_type_id: undefined,
  search: undefined,
  page: 1,
}

export default function Rooms() {
  const { hasRole } = useAuth()
  const canManage = hasRole(['admin', 'manager'])

  const [searchParams, setSearchParams] = useSearchParams()
  const status = searchParams.get('status') ?? ''
  const roomTypeId = searchParams.get('room_type_id') ?? ''
  const search = searchParams.get('search') ?? ''
  const page = Number(searchParams.get('page')) || 1

  const apiParams = useMemo(
    () => ({
      page,
      ...(status ? { status } : {}),
      ...(roomTypeId ? { room_type_id: roomTypeId } : {}),
      ...(search ? { search } : {}),
    }),
    [status, roomTypeId, search, page],
  )

  const fetchRooms = useCallback(() => staffRooms.list(apiParams), [apiParams])
  const { data, meta, error, isLoading, refetch } = useApi(fetchRooms)

  const [running, setRunning] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [actionMessage, setActionMessage] = useState(null)

  const updateUrl = useCallback(
    (patch) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        Object.entries(patch).forEach(([key, value]) => {
          if (value === undefined || value === null || value === '') next.delete(key)
          else next.set(key, String(value))
        })
        return next
      })
    },
    [setSearchParams],
  )

  const performAction = async (key, request, successMessage) => {
    if (running) return
    setRunning(key)
    setActionError(null)
    try {
      await request()
      setActionMessage(successMessage)
      await refetch()
    } catch (err) {
      setActionError(err)
      if (err?.response?.status === 409 || err?.response?.status === 403) {
        await refetch()
      }
    } finally {
      setRunning(null)
    }
  }

  const handleTransition = (roomId, currentStatus, reason) => {
    const request =
      currentStatus === 'available'
        ? () => staffRooms.toMaintenance(roomId, reason)
        : () => staffRooms.toAvailable(roomId, reason)
    const nextStatus = currentStatus === 'available' ? 'maintenance' : 'available'
    return performAction(`transition-${roomId}`, request, STATUS_SUCCES_NAME[nextStatus])
  }

  const handleDelete = (roomId) =>
    performAction(`delete-${roomId}`, () => staffRooms.destroy(roomId), 'Room deleted.')

  const rooms = Array.isArray(data) ? data : []
  const currentPage = meta?.page ?? page
  const lastPage = meta?.last_page ?? 1
  const hasFilters = Boolean(status || roomTypeId || search)
  const busy = running !== null

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-bold text-slate-800">Rooms</h1>
        <p className="mt-1 text-sm text-slate-500">Manage rooms and maintenance status.</p>
        <div className="mt-8">
          <LoadingState label="Loading rooms…" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-bold text-slate-800">Rooms</h1>
        <p className="mt-1 text-sm text-slate-500">Manage rooms and maintenance status.</p>
        <div className="mt-8">
          <ErrorState error={error} fallback="We couldn't load the rooms. Please try again." onRetry={refetch} />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Rooms</h1>
          <p className="mt-1 text-sm text-slate-500">Manage rooms and maintenance status.</p>
        </div>
        {canManage && (
          <Link to="/staff/rooms/new" className="btn-primary">
            Add room
          </Link>
        )}
      </div>

      <div className="mt-6">
        <RoomFilters />
      </div>

      <div className="mt-6 space-y-3">
      {actionMessage && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800" role="status">
          {actionMessage}
        </div>
      )}
      {actionError && <ErrorMessage error={actionError} fallback="The action could not be completed. Please try again." />}
      </div>

      {rooms.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No rooms found"
            message={hasFilters ? 'No rooms match your filters.' : 'There are no rooms yet.'}
            action={
              hasFilters ? (
                <button type="button" className="btn-outline" onClick={() => updateUrl(CLEARED_FILTERS)}>
                  Clear all filters
                </button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <>
          <div className="mt-8 space-y-3">
            {rooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                canManage={canManage}
                busy={busy}
                onTransition={handleTransition}
                onDelete={handleDelete}
              />
            ))}
          </div>
          {lastPage > 1 && (
            <div className="mt-10">
              <Pagination currentPage={currentPage} lastPage={lastPage} onPageChange={(nextPage) => updateUrl({ page: nextPage })} />
            </div>
          )}
        </>
      )}
    </div>
  )
}