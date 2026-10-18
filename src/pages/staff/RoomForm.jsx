import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { staffRooms, staffRoomTypes } from '../../api/roomApi'
import { staffProperties } from '../../api/propertyApi'
import useApi from '../../hooks/useApi'
import LoadingState from '../../components/common/LoadingState'
import ErrorState from '../../components/common/ErrorState'
import ErrorMessage from '../../components/common/ErrorMessage'
import { getFieldErrors } from '../../utils/apiError'

function parseErrors(err, setFieldErrors) {
  const fields = getFieldErrors(err)
  if (Object.keys(fields).length > 0) setFieldErrors(fields)
}

const NOOP_FETCH = () => Promise.resolve({ data: {} })

export default function RoomForm() {
  const { id } = useParams()
  const editing = Boolean(id)
  const navigate = useNavigate()

  const fetchRoomTypes = useCallback(() => staffRoomTypes.list({ per_page: 50 }), [])
  const { data: roomTypes } = useApi(fetchRoomTypes)

  const fetchBuildingGroups = useCallback(async () => {
    const res = await staffProperties.list({ per_page: 50 })
    const properties = res?.data?.data ?? []
    const groups = await Promise.all(
      properties.map(async (property) => {
        const buildingRes = await staffProperties.listBuildings(property.id, { per_page: 50 })
        return { property, buildings: buildingRes?.data?.data ?? [] }
      }),
    )
    return { data: { data: groups } }
  }, [])
  const { data: buildingGroups } = useApi(fetchBuildingGroups)

  const fetchRoom = useMemo(() => (editing ? () => staffRooms.show(id) : undefined), [editing, id])
  const { data: room, error, isLoading, refetch } = useApi(fetchRoom ?? NOOP_FETCH)

  const [form, setForm] = useState({ room_number: '', room_type_id: '', building_id: '', floor: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitError, setSubmitError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const roomId = room?.id
  const [prevRoomId, setPrevRoomId] = useState(null)
  if (roomId && roomId !== prevRoomId) {
    setPrevRoomId(roomId)
    setForm({
      room_number: room.room_number ?? '',
      room_type_id: room.room_type_id != null ? String(room.room_type_id) : '',
      building_id: room.building_id != null ? String(room.building_id) : '',
      floor: room.floor != null ? String(room.floor) : '',
    })
  }

  const types = Array.isArray(roomTypes) ? roomTypes : []
  const groups = Array.isArray(buildingGroups) ? buildingGroups : []

  const updateField = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setFieldErrors((prev) => ({ ...prev, [e.target.name]: undefined }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const nextErrors = {}
    if (!form.room_number.trim()) nextErrors.room_number = ['Room number is required.']
    if (form.room_type_id === '') nextErrors.room_type_id = ['Select a room type.']
    if (form.building_id === '') nextErrors.building_id = ['Select a building.']
    const floor = Number(form.floor)
    if (form.floor === '' || !Number.isInteger(floor) || floor < 1 || floor > 200) {
      nextErrors.floor = ['Floor must be a whole number between 1 and 200.']
    }
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    setFieldErrors({})
    const payload = {
      room_number: form.room_number.trim(),
      room_type_id: Number(form.room_type_id),
      building_id: Number(form.building_id),
      floor,
    }
    try {
      if (editing) await staffRooms.update(id, payload)
      else await staffRooms.create(payload)
      navigate('/staff/rooms')
    } catch (err) {
      parseErrors(err, setFieldErrors)
      setSubmitError(err)
    } finally {
      setSubmitting(false)
    }
  }

  if (editing && error) {
    const is404 = error?.response?.status === 404
    return (
      <div className="mx-auto max-w-3xl">
        <Link to="/staff/rooms" className="text-sm font-medium text-brand-600 hover:text-brand-700">
          ← Back to rooms
        </Link>
        <div className="mt-4">
          <ErrorState
            error={error}
            fallback={is404 ? 'This room could not be found.' : "We couldn't load this room. Please try again."}
            onRetry={is404 ? undefined : refetch}
          />
        </div>
      </div>
    )
  }

  if (editing && (isLoading || !room)) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="mt-2">
          <LoadingState label="Loading room…" />
        </div>
      </div>
    )
  }

  const pageTitle = editing ? `Edit room ${room?.room_number ?? ''}`.trim() : 'Add a room'

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/staff/rooms" className="text-sm font-medium text-brand-600 hover:text-brand-700">
        ← Back to rooms
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-slate-800">{pageTitle}</h1>
      <p className="mt-1 text-sm text-slate-500">
        {editing ? 'Update the room details.' : 'Register a new physical room in the hotel.'}
      </p>

      {types.length === 0 && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No room types are configured yet. Add a room type before creating rooms.
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm" noValidate>
        <ErrorMessage error={submitError} fallback="We could not save this room. Please try again." />

        <div>
          <label htmlFor="room-number" className="label">
            Room number
          </label>
          <input
            id="room-number"
            name="room_number"
            type="text"
            className="input"
            maxLength={50}
            placeholder="e.g. 101"
            value={form.room_number}
            onChange={updateField}
          />
          {fieldErrors.room_number &&
            fieldErrors.room_number.map((message, index) => (
              <p key={`${message}-${index}`} className="field-error">
                {message}
              </p>
            ))}
        </div>

        <div>
          <label htmlFor="room-type-id" className="label">
            Room type
          </label>
          <select
            id="room-type-id"
            name="room_type_id"
            className="input"
            value={form.room_type_id}
            onChange={updateField}
          >
            <option value="">Select a room type…</option>
            {types.map((roomType) => (
              <option key={roomType.id} value={roomType.id}>
                {roomType.name}
              </option>
            ))}
          </select>
          {fieldErrors.room_type_id &&
            fieldErrors.room_type_id.map((message, index) => (
              <p key={`${message}-${index}`} className="field-error">
                {message}
              </p>
            ))}
        </div>

        <div>
          <label htmlFor="building-id" className="label">
            Building
          </label>
          <select
            id="building-id"
            name="building_id"
            className="input"
            value={form.building_id}
            onChange={updateField}
          >
            <option value="">Select a building…</option>
            {groups.map((group) => (
              <optgroup key={group.property.id} label={group.property.name}>
                {group.buildings.map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {fieldErrors.building_id &&
            fieldErrors.building_id.map((message, index) => (
              <p key={`${message}-${index}`} className="field-error">
                {message}
              </p>
            ))}
        </div>

        <div>
          <label htmlFor="floor" className="label">
            Floor
          </label>
          <input
            id="floor"
            name="floor"
            type="number"
            min="1"
            max="200"
            className="input"
            placeholder="e.g. 1"
            value={form.floor}
            onChange={updateField}
          />
          {fieldErrors.floor &&
            fieldErrors.floor.map((message, index) => (
              <p key={`${message}-${index}`} className="field-error">
                {message}
              </p>
            ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Saving…' : editing ? 'Save changes' : 'Create room'}
          </button>
          <Link to="/staff/rooms" className="btn-outline">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
