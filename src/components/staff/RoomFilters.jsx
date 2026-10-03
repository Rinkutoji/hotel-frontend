import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { staffRoomTypes } from '../../api/roomApi'
import { staffProperties } from '../../api/propertyApi'
import useApi from '../../hooks/useApi'
import SearchBar from '../customer/SearchBar'
import { useAuth } from '../../hooks/useAuth'

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
  const { hasRole } = useAuth()
  const canFilter = hasRole(['admin', 'manager'])
  const [searchParams, setSearchParams] = useSearchParams()

  const status = searchParams.get('status') ?? ''
  const search = searchParams.get('search') ?? ''
  const roomTypeId = searchParams.get('room_type_id') ?? ''
  const propertyId = searchParams.get('property_id') ?? ''
  const buildingId = searchParams.get('building_id') ?? ''

  const fetchRoomTypes = useCallback(() => staffRoomTypes.list({ per_page: 50 }), [])
  const { data: roomTypes } = useApi(fetchRoomTypes)

  const fetchBuildingGroups = useCallback(async () => {
    if (!canFilter) return { data: { data: [] } }
    const res = await staffProperties.list({ per_page: 50 })
    const properties = res?.data?.data ?? []
    const groups = await Promise.all(
      properties.map(async (property) => {
        const buildingRes = await staffProperties.listBuildings(property.id)
        return { property, buildings: buildingRes?.data?.data ?? [] }
      }),
    )
    return { data: { data: groups } }
  }, [canFilter])
  const { data: groups } = useApi(fetchBuildingGroups)

  const properties = Array.isArray(groups) ? groups.map((group) => group.property) : []
  const selectedGroup = Array.isArray(groups)
    ? groups.find((group) => String(group.property.id) === propertyId)
    : undefined
  const buildings = selectedGroup?.buildings ?? []

  const handlePropertyChange = (e) =>
    commitParams(setSearchParams, {
      property_id: e.target.value || undefined,
      building_id: undefined,
      page: 1,
    })

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        {canFilter && (
          <>
            <div className="w-full sm:w-auto sm:min-w-40">
              <label htmlFor="property" className="label">
                Property
              </label>
              <select
                id="property"
                className="input"
                value={propertyId}
                onChange={handlePropertyChange}
              >
                <option value="">All properties</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full sm:w-auto sm:min-w-40">
              <label htmlFor="building" className="label">
                Building
              </label>
              <select
                id="building"
                className="input"
                value={buildingId}
                onChange={(e) =>
                  commitParams(setSearchParams, {
                    building_id: e.target.value || undefined,
                    page: 1,
                  })
                }
              >
                <option value="">All buildings</option>
                {buildings.map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.name}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

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
