import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { publicRooms } from '../../api/roomApi'
import useApi from '../../hooks/useApi'
import RoomGallery from '../../components/customer/RoomGallery'
import RoomCard from '../../components/customer/RoomCard'
import LoadingState from '../../components/common/LoadingState'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'

export default function RoomDetails() {
  const { id } = useParams()

  const fetchRoomType = useMemo(() => () => publicRooms.getRoomType(id), [id])
  const fetchImages = useMemo(() => () => publicRooms.getRoomTypeImages(id), [id])
  const fetchRooms = useMemo(
    () => () => publicRooms.listRooms({ room_type_id: id, per_page: 12 }),
    [id],
  )

  const {
    data: roomType,
    error,
    isLoading: typeLoading,
    refetch: refetchRoomType,
  } = useApi(fetchRoomType)
  const { data: images } = useApi(fetchImages)
  const { data: roomsData, isLoading: roomsLoading } = useApi(fetchRooms)

  if (error) {
    const is404 = error?.response?.status === 404
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mt-8">
          <ErrorState
            error={error}
            fallback={is404 ? 'This room type could not be found.' : "We couldn't load this room type. Please try again."}
            onRetry={is404 ? undefined : refetchRoomType}
          />
        </div>
        <div className="mt-6 text-center">
          <Link to="/rooms" className="btn-outline">
            Browse all rooms
          </Link>
        </div>
      </div>
    )
  }

  if (typeLoading || !roomType) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mt-8">
          <LoadingState label="Loading room details…" />
        </div>
      </div>
    )
  }

  const rooms = Array.isArray(roomsData) ? roomsData : []
  const availableCount = rooms.filter((room) => room.status === 'available').length

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link to="/rooms" className="text-sm font-medium text-brand-600 hover:text-brand-700">
        ← Back to rooms
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <RoomGallery images={images} />

        <div>
          <h1 className="text-3xl font-bold text-slate-800">{roomType.name}</h1>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-600">
            <span>
              {roomType.capacity_adults} {roomType.capacity_adults === 1 ? 'adult' : 'adults'}
            </span>
            {roomType.capacity_children > 0 && (
              <span>
                {roomType.capacity_children} {roomType.capacity_children === 1 ? 'child' : 'children'}
              </span>
            )}
          </div>

          <div className="mt-4 flex items-baseline gap-1">
            <span className="text-3xl font-bold text-slate-900">{roomType.base_price}</span>
            <span className="text-sm text-slate-500">per night</span>
          </div>

          {roomType.description && (
            <p className="mt-4 text-sm leading-relaxed text-slate-600">{roomType.description}</p>
          )}

          {Array.isArray(roomType.amenities) && roomType.amenities.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Amenities</h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {roomType.amenities.map((amenity) => (
                  <li key={amenity} className="flex items-center gap-2 text-sm capitalize text-slate-700">
                    <svg className="h-4 w-4 shrink-0 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {amenity}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/availability" className="btn-primary">
              Check availability
            </Link>
          </div>
        </div>
      </div>

      <section className="mt-14">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-bold text-slate-800">Rooms of this type</h2>
          {!roomsLoading && rooms.length > 0 && (
            <p className="text-sm text-slate-500">
              {availableCount} {availableCount === 1 ? 'room' : 'rooms'} currently available
            </p>
          )}
        </div>
        {roomsLoading ? (
          <div className="mt-6">
            <LoadingState label="Loading rooms…" />
          </div>
        ) : rooms.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title="No rooms yet"
              message="There are no rooms of this type available yet. Check back soon."
            />
          </div>
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}