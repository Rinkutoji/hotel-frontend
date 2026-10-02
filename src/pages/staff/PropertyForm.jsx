import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { staffProperties } from '../../api/propertyApi'
import useApi from '../../hooks/useApi'
import LoadingState from '../../components/common/LoadingState'
import ErrorState from '../../components/common/ErrorState'
import ErrorMessage from '../../components/common/ErrorMessage'
import { getFieldErrors } from '../../utils/apiError'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const WEBSITE_PATTERN = /^https?:\/\/\S+$/i
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

const EMPTY_FORM = {
  name: '',
  code: '',
  description: '',
  address: '',
  city: '',
  province_state: '',
  country: '',
  postal_code: '',
  latitude: '',
  longitude: '',
  phone: '',
  email: '',
  website: '',
  check_in_time: '',
  check_out_time: '',
  timezone: '',
  currency: '',
  status: 'active',
}

const NOOP_FETCH = () => Promise.resolve({ data: {} })

function parseErrors(err, setFieldErrors) {
  const fields = getFieldErrors(err)
  if (Object.keys(fields).length > 0) setFieldErrors(fields)
}

function FieldError({ messages }) {
  if (!messages) return null
  return messages.map((message) => (
    <p key={message} className="field-error">
      {message}
    </p>
  ))
}

export default function PropertyForm() {
  const { id } = useParams()
  const editing = Boolean(id)
  const navigate = useNavigate()

  // Create mode has no id, so the detail hook (which fetches
  // unconditionally) is not suitable here — RoomForm's useApi pattern is.
  const fetchProperty = useMemo(() => (editing ? () => staffProperties.show(id) : undefined), [editing, id])
  const { data: property, error, isLoading, refetch } = useApi(fetchProperty ?? NOOP_FETCH)

  const [form, setForm] = useState(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitError, setSubmitError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const propertyId = property?.id
  const [prevPropertyId, setPrevPropertyId] = useState(null)
  if (propertyId && propertyId !== prevPropertyId) {
    setPrevPropertyId(propertyId)
    setForm({
      name: property.name ?? '',
      code: property.code ?? '',
      description: property.description ?? '',
      address: property.address ?? '',
      city: property.city ?? '',
      province_state: property.province_state ?? '',
      country: property.country ?? '',
      postal_code: property.postal_code ?? '',
      latitude: property.latitude != null ? String(property.latitude) : '',
      longitude: property.longitude != null ? String(property.longitude) : '',
      phone: property.phone ?? '',
      email: property.email ?? '',
      website: property.website ?? '',
      check_in_time: property.check_in_time ? property.check_in_time.slice(0, 5) : '',
      check_out_time: property.check_out_time ? property.check_out_time.slice(0, 5) : '',
      timezone: property.timezone ?? '',
      currency: property.currency ?? '',
      status: property.status ?? 'active',
    })
  }

  const updateField = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setFieldErrors((prev) => ({ ...prev, [e.target.name]: undefined }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const nextErrors = {}
    if (!form.name.trim()) nextErrors.name = ['Name is required.']
    if (!form.code.trim()) nextErrors.code = ['Code is required.']
    const latitude = form.latitude === '' ? null : Number(form.latitude)
    if (latitude !== null && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) {
      nextErrors.latitude = ['Latitude must be between -90 and 90.']
    }
    const longitude = form.longitude === '' ? null : Number(form.longitude)
    if (longitude !== null && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)) {
      nextErrors.longitude = ['Longitude must be between -180 and 180.']
    }
    if (form.email.trim() && !EMAIL_PATTERN.test(form.email.trim())) {
      nextErrors.email = ['Enter a valid email address.']
    }
    if (form.website.trim() && !WEBSITE_PATTERN.test(form.website.trim())) {
      nextErrors.website = ['Enter a valid website URL starting with http:// or https://.']
    }
    if (form.check_in_time && !TIME_PATTERN.test(form.check_in_time)) {
      nextErrors.check_in_time = ['Check-in time must be in HH:MM format.']
    }
    if (form.check_out_time && !TIME_PATTERN.test(form.check_out_time)) {
      nextErrors.check_out_time = ['Check-out time must be in HH:MM format.']
    }
    if (form.currency.trim() && form.currency.trim().length !== 3) {
      nextErrors.currency = ['Currency must be a 3-letter code.']
    }
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    setFieldErrors({})
    const text = (value) => (value.trim() === '' ? null : value.trim())
    const payload = {
      name: form.name.trim(),
      code: form.code.trim(),
      description: text(form.description),
      address: text(form.address),
      city: text(form.city),
      province_state: text(form.province_state),
      country: text(form.country),
      postal_code: text(form.postal_code),
      latitude,
      longitude,
      phone: text(form.phone),
      email: text(form.email),
      website: text(form.website),
      check_in_time: form.check_in_time || null,
      check_out_time: form.check_out_time || null,
      timezone: text(form.timezone),
      currency: text(form.currency),
      status: form.status,
    }
    try {
      if (editing) {
        await staffProperties.update(id, payload)
        navigate(`/staff/properties/${id}`)
      } else {
        const res = await staffProperties.create(payload)
        navigate(`/staff/properties/${res.data.data.id}`)
      }
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
        <Link to="/staff/properties" className="text-sm font-medium text-brand-600 hover:text-brand-700">
          ← Back to properties
        </Link>
        <div className="mt-4">
          <ErrorState
            error={error}
            fallback={is404 ? 'This property could not be found.' : "We couldn't load this property. Please try again."}
            onRetry={is404 ? undefined : refetch}
          />
        </div>
      </div>
    )
  }

  if (editing && (isLoading || !property)) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="mt-2">
          <LoadingState label="Loading property…" />
        </div>
      </div>
    )
  }

  const pageTitle = editing ? `Edit property ${property?.name ?? ''}`.trim() : 'Add a property'

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/staff/properties" className="text-sm font-medium text-brand-600 hover:text-brand-700">
        ← Back to properties
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-slate-800">{pageTitle}</h1>
      <p className="mt-1 text-sm text-slate-500">
        {editing ? 'Update the property details.' : 'Register a new hotel property.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-6" noValidate>
        <ErrorMessage error={submitError} fallback="We could not save this property. Please try again." />

        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Basic information</h2>
          <div className="grid gap-4 sm:grid-cols-2">
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
                placeholder="e.g. Main Hotel"
                value={form.name}
                onChange={updateField}
              />
              <FieldError messages={fieldErrors.name} />
            </div>
            <div>
              <label htmlFor="code" className="label">
                Code
              </label>
              <input
                id="code"
                name="code"
                type="text"
                className="input"
                maxLength={50}
                placeholder="e.g. MAIN"
                value={form.code}
                onChange={updateField}
              />
              <FieldError messages={fieldErrors.code} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="description" className="label">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                className="input"
                maxLength={255}
                rows={3}
                value={form.description}
                onChange={updateField}
              />
            </div>
            <div>
              <label htmlFor="status" className="label">
                Status
              </label>
              <select id="status" name="status" className="input" value={form.status} onChange={updateField}>
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Address</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="address" className="label">
                Address
              </label>
              <input
                id="address"
                name="address"
                type="text"
                className="input"
                maxLength={255}
                placeholder="e.g. 1 Main Street"
                value={form.address}
                onChange={updateField}
              />
            </div>
            <div>
              <label htmlFor="city" className="label">
                City
              </label>
              <input
                id="city"
                name="city"
                type="text"
                className="input"
                maxLength={255}
                placeholder="e.g. Phnom Penh"
                value={form.city}
                onChange={updateField}
              />
            </div>
            <div>
              <label htmlFor="province_state" className="label">
                Province / State
              </label>
              <input
                id="province_state"
                name="province_state"
                type="text"
                className="input"
                maxLength={255}
                placeholder="e.g. Phnom Penh"
                value={form.province_state}
                onChange={updateField}
              />
            </div>
            <div>
              <label htmlFor="country" className="label">
                Country
              </label>
              <input
                id="country"
                name="country"
                type="text"
                className="input"
                maxLength={255}
                placeholder="e.g. Cambodia"
                value={form.country}
                onChange={updateField}
              />
            </div>
            <div>
              <label htmlFor="postal_code" className="label">
                Postal code
              </label>
              <input
                id="postal_code"
                name="postal_code"
                type="text"
                className="input"
                maxLength={20}
                placeholder="e.g. 12000"
                value={form.postal_code}
                onChange={updateField}
              />
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Location</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="latitude" className="label">
                Latitude
              </label>
              <input
                id="latitude"
                name="latitude"
                type="number"
                step="0.000001"
                min="-90"
                max="90"
                className="input"
                placeholder="e.g. 11.55"
                value={form.latitude}
                onChange={updateField}
              />
              <FieldError messages={fieldErrors.latitude} />
            </div>
            <div>
              <label htmlFor="longitude" className="label">
                Longitude
              </label>
              <input
                id="longitude"
                name="longitude"
                type="number"
                step="0.000001"
                min="-180"
                max="180"
                className="input"
                placeholder="e.g. 104.92"
                value={form.longitude}
                onChange={updateField}
              />
              <FieldError messages={fieldErrors.longitude} />
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Contact</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="phone" className="label">
                Phone
              </label>
              <input
                id="phone"
                name="phone"
                type="text"
                className="input"
                maxLength={20}
                placeholder="e.g. 012345678"
                value={form.phone}
                onChange={updateField}
              />
            </div>
            <div>
              <label htmlFor="email" className="label">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="input"
                maxLength={255}
                placeholder="e.g. info@hotel.com"
                value={form.email}
                onChange={updateField}
              />
              <FieldError messages={fieldErrors.email} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="website" className="label">
                Website
              </label>
              <input
                id="website"
                name="website"
                type="url"
                className="input"
                maxLength={255}
                placeholder="e.g. https://www.hotel.com"
                value={form.website}
                onChange={updateField}
              />
              <FieldError messages={fieldErrors.website} />
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Hotel settings</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="check_in_time" className="label">
                Check-in time
              </label>
              <input
                id="check_in_time"
                name="check_in_time"
                type="time"
                className="input"
                value={form.check_in_time}
                onChange={updateField}
              />
              <FieldError messages={fieldErrors.check_in_time} />
            </div>
            <div>
              <label htmlFor="check_out_time" className="label">
                Check-out time
              </label>
              <input
                id="check_out_time"
                name="check_out_time"
                type="time"
                className="input"
                value={form.check_out_time}
                onChange={updateField}
              />
              <FieldError messages={fieldErrors.check_out_time} />
            </div>
            <div>
              <label htmlFor="timezone" className="label">
                Timezone
              </label>
              <input
                id="timezone"
                name="timezone"
                type="text"
                className="input"
                maxLength={64}
                placeholder="e.g. Asia/Phnom_Penh"
                value={form.timezone}
                onChange={updateField}
              />
            </div>
            <div>
              <label htmlFor="currency" className="label">
                Currency
              </label>
              <input
                id="currency"
                name="currency"
                type="text"
                className="input"
                maxLength={3}
                placeholder="e.g. USD"
                value={form.currency}
                onChange={updateField}
              />
              <FieldError messages={fieldErrors.currency} />
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Saving…' : editing ? 'Save changes' : 'Create property'}
          </button>
          <Link to="/staff/properties" className="btn-outline">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
