import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { staffRoomTypes } from '../../api/roomApi'
import useApi from '../../hooks/useApi'
import LoadingState from '../../components/common/LoadingState'
import ErrorState from '../../components/common/ErrorState'
import ErrorMessage from '../../components/common/ErrorMessage'
import { getFieldErrors } from '../../utils/apiError'

const PRICE_PATTERN = /^\d+(\.\d{1,2})?$/
const MAX_AMENITIES = 30
const MAX_AMENITY_LENGTH = 100

function parseAmenities(raw) {
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function numField(raw) {
  return raw.trim() === '' ? NaN : Number(raw)
}

const NOOP_FETCH = () => Promise.resolve({ data: {} })

export default function RoomTypeForm() {
  const { id } = useParams()
  const editing = Boolean(id)
  const navigate = useNavigate()

  const fetchRoomType = useMemo(() => (editing ? () => staffRoomTypes.show(id) : undefined), [editing, id])
  const { data: roomType, error, isLoading, refetch } = useApi(fetchRoomType ?? NOOP_FETCH)

  const [form, setForm] = useState({
    name: '',
    description: '',
    base_price: '',
    capacity_adults: '',
    capacity_children: '',
    amenities: '',
  })
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitError, setSubmitError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  const roomTypeId = roomType?.id
  const [prevRoomTypeId, setPrevRoomTypeId] = useState(null)
  if (roomTypeId && roomTypeId !== prevRoomTypeId) {
    setPrevRoomTypeId(roomTypeId)
    setForm({
      name: roomType.name ?? '',
      description: roomType.description ?? '',
      base_price: roomType.base_price ?? '',
      capacity_adults: roomType.capacity_adults != null ? String(roomType.capacity_adults) : '',
      capacity_children: roomType.capacity_children != null ? String(roomType.capacity_children) : '',
      amenities: Array.isArray(roomType.amenities) ? roomType.amenities.join(', ') : '',
    })
  }

  const updateField = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setFieldErrors((prev) => ({ ...prev, [e.target.name]: undefined }))
  }

  const validate = () => {
    const next = {}
    if (!form.name.trim()) next.name = ['Name is required.']
    else if (form.name.trim().length > 255) next.name = ['Name must be at most 255 characters.']

    const price = form.base_price.trim()
    if (!price) next.base_price = ['Base price is required.']
    else if (!PRICE_PATTERN.test(price)) {
      next.base_price = ['Base price must be a number with up to two decimals.']
    } else if (Number(price) > 999999.99) {
      next.base_price = ['Base price cannot exceed 999999.99.']
    }

    const adults = numField(form.capacity_adults)
    if (form.capacity_adults.trim() === '' || !Number.isInteger(adults) || adults < 1 || adults > 20) {
      next.capacity_adults = ['Capacity for adults must be a whole number between 1 and 20.']
    }

    const children = numField(form.capacity_children)
    if (form.capacity_children.trim() === '' || !Number.isInteger(children) || children < 0 || children > 20) {
      next.capacity_children = ['Capacity for children must be a whole number between 0 and 20.']
    }

    const amenities = parseAmenities(form.amenities)
    if (amenities.length > MAX_AMENITIES) {
      next.amenities = [`A maximum of ${MAX_AMENITIES} amenities is allowed.`]
    } else if (amenities.some((item) => item.length > MAX_AMENITY_LENGTH)) {
      next.amenities = [`Each amenity must be at most ${MAX_AMENITY_LENGTH} characters.`]
    }

    return { next, amenities }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const { next, amenities } = validate()
    if (Object.keys(next).length > 0) {
      setFieldErrors(next)
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    setFieldErrors({})
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      base_price: form.base_price.trim(),
      capacity_adults: numField(form.capacity_adults),
      capacity_children: numField(form.capacity_children),
      amenities,
    }
    try {
      if (editing) await staffRoomTypes.update(id, payload)
      else await staffRoomTypes.create(payload)
      navigate('/staff/room-types')
    } catch (err) {
      const fields = getFieldErrors(err)
      if (Object.keys(fields).length > 0) setFieldErrors(fields)
      setSubmitError(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (deleting) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await staffRoomTypes.destroy(id)
      navigate('/staff/room-types')
    } catch (err) {
      setDeleteError(err)
      if (err?.response?.status === 409 || err?.response?.status === 403) {
        await refetch()
      }
    } finally {
      setDeleting(false)
    }
  }

  if (editing && error) {
    const is404 = error?.response?.status === 404
    return (
      <div className="mx-auto max-w-3xl">
        <Link to="/staff/room-types" className="text-sm font-medium text-brand-600 hover:text-brand-700">
          ← Back to room types
        </Link>
        <div className="mt-4">
          <ErrorState
            error={error}
            fallback={is404 ? 'This room type could not be found.' : "We couldn't load this room type. Please try again."}
            onRetry={is404 ? undefined : refetch}
          />
        </div>
      </div>
    )
  }

  if (editing && (isLoading || !roomType)) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="mt-2">
          <LoadingState label="Loading room type…" />
        </div>
      </div>
    )
  }

  const pageTitle = editing ? `Edit ${roomType?.name ?? 'room type'}` : 'Add a room type'

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/staff/room-types" className="text-sm font-medium text-brand-600 hover:text-brand-700">
        ← Back to room types
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-slate-800">{pageTitle}</h1>
      <p className="mt-1 text-sm text-slate-500">
        {editing ? 'Update the room type details.' : 'Define a new type of room in the hotel.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm" noValidate>
        <ErrorMessage error={submitError} fallback="We could not save this room type. Please try again." />

        <div>
          <label htmlFor="name" className="label">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            className="input"
            maxLength={255}
            placeholder="e.g. Deluxe Suite"
            value={form.name}
            onChange={updateField}
          />
          {fieldErrors.name &&
            fieldErrors.name.map((message) => (
              <p key={message} className="field-error">
                {message}
              </p>
            ))}
        </div>

        <div>
          <label htmlFor="description" className="label">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            className="input"
            maxLength={2000}
            placeholder="Describe this room type…"
            value={form.description}
            onChange={updateField}
          />
          {fieldErrors.description &&
            fieldErrors.description.map((message) => (
              <p key={message} className="field-error">
                {message}
              </p>
            ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="base-price" className="label">
              Base price / night
            </label>
            <input
              id="base-price"
              name="base_price"
              type="text"
              inputMode="decimal"
              className="input"
              placeholder="189.00"
              value={form.base_price}
              onChange={updateField}
            />
            {fieldErrors.base_price &&
              fieldErrors.base_price.map((message) => (
                <p key={message} className="field-error">
                  {message}
                </p>
              ))}
          </div>
          <div>
            <label htmlFor="capacity-adults" className="label">
              Adults
            </label>
            <input
              id="capacity-adults"
              name="capacity_adults"
              type="number"
              min="1"
              max="20"
              className="input"
              placeholder="2"
              value={form.capacity_adults}
              onChange={updateField}
            />
            {fieldErrors.capacity_adults &&
              fieldErrors.capacity_adults.map((message) => (
                <p key={message} className="field-error">
                  {message}
                </p>
              ))}
          </div>
          <div>
            <label htmlFor="capacity-children" className="label">
              Children
            </label>
            <input
              id="capacity-children"
              name="capacity_children"
              type="number"
              min="0"
              max="20"
              className="input"
              placeholder="0"
              value={form.capacity_children}
              onChange={updateField}
            />
            {fieldErrors.capacity_children &&
              fieldErrors.capacity_children.map((message) => (
                <p key={message} className="field-error">
                  {message}
                </p>
              ))}
          </div>
        </div>

        <div>
          <label htmlFor="amenities" className="label">
            Amenities
          </label>
          <input
            id="amenities"
            name="amenities"
            type="text"
            className="input"
            placeholder="Comma-separated, e.g. WiFi, Air conditioning, Balcony"
            value={form.amenities}
            onChange={updateField}
          />
          <p className="mt-1 text-xs text-slate-400">Separate amenities with commas.</p>
          {fieldErrors.amenities &&
            fieldErrors.amenities.map((message) => (
              <p key={message} className="field-error">
                {message}
              </p>
            ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Saving…' : editing ? 'Save changes' : 'Create room type'}
          </button>
          <Link to="/staff/room-types" className="btn-outline">
            Cancel
          </Link>
          {editing && (
            <button
              type="button"
              className="btn-danger-ghost ml-auto"
              disabled={submitting}
              onClick={() => setDeleteOpen((value) => !value)}
            >
              Delete room type
            </button>
          )}
        </div>
      </form>

      {editing && deleteOpen && (
        <form
          className="mt-4 space-y-3 rounded-xl border border-red-200 bg-red-50 p-5"
          onSubmit={(e) => {
            e.preventDefault()
            handleDelete()
          }}
        >
          <p className="text-sm font-medium text-red-800">Delete this room type?</p>
          <p className="text-sm text-red-700">
            Room types that still have physical rooms cannot be deleted.
          </p>
          <ErrorMessage error={deleteError} fallback="We could not delete this room type. Please try again." />
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" className="btn-danger" disabled={deleting}>
              {deleting ? 'Deleting…' : 'Confirm delete'}
            </button>
            <button type="button" className="btn-outline" disabled={deleting} onClick={() => setDeleteOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}