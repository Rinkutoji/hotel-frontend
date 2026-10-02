import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { staffBuildings, staffProperties } from '../../api/propertyApi'
import useApi from '../../hooks/useApi'
import LoadingState from '../../components/common/LoadingState'
import ErrorState from '../../components/common/ErrorState'
import ErrorMessage from '../../components/common/ErrorMessage'
import { getFieldErrors } from '../../utils/apiError'

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

export default function BuildingForm() {
  const { id } = useParams()
  const location = useLocation()
  // Both routes carry :id — create uses the property id, edit uses the
  // building id — so the mode is read from the path suffix.
  const editing = location.pathname.endsWith('/edit')
  const navigate = useNavigate()

  const fetchBuilding = useMemo(() => (editing ? () => staffBuildings.show(id) : undefined), [editing, id])
  const { data: building, error, isLoading, refetch } = useApi(fetchBuilding ?? NOOP_FETCH)

  const [form, setForm] = useState({
    name: '',
    code: '',
    description: '',
    floor_count: '',
    status: 'active',
  })
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitError, setSubmitError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const buildingId = building?.id
  const [prevBuildingId, setPrevBuildingId] = useState(null)
  if (buildingId && buildingId !== prevBuildingId) {
    setPrevBuildingId(buildingId)
    setForm({
      name: building.name ?? '',
      code: building.code ?? '',
      description: building.description ?? '',
      floor_count: building.floor_count != null ? String(building.floor_count) : '',
      status: building.status ?? 'active',
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
    const floorCount = form.floor_count === '' ? null : Number(form.floor_count)
    if (floorCount !== null && (!Number.isInteger(floorCount) || floorCount < 1 || floorCount > 200)) {
      nextErrors.floor_count = ['Floor count must be a whole number between 1 and 200.']
    }
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    setFieldErrors({})
    const payload = {
      name: form.name.trim(),
      code: form.code.trim(),
      description: form.description.trim() || null,
      floor_count: floorCount,
      status: form.status,
    }
    try {
      if (editing) {
        await staffProperties.updateBuilding(id, payload)
        navigate(`/staff/properties/${building.property_id}`)
      } else {
        await staffProperties.createBuilding(id, payload)
        navigate(`/staff/properties/${id}`)
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
            fallback={is404 ? 'This building could not be found.' : "We couldn't load this building. Please try again."}
            onRetry={is404 ? undefined : refetch}
          />
        </div>
      </div>
    )
  }

  if (editing && (isLoading || !building)) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="mt-2">
          <LoadingState label="Loading building…" />
        </div>
      </div>
    )
  }

  const pageTitle = editing ? `Edit building ${building?.name ?? ''}`.trim() : 'Add a building'
  const backTo = editing && building ? `/staff/properties/${building.property_id}` : `/staff/properties/${id}`

  return (
    <div className="mx-auto max-w-3xl">
      <Link to={backTo} className="text-sm font-medium text-brand-600 hover:text-brand-700">
        ← Back to property
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-slate-800">{pageTitle}</h1>
      <p className="mt-1 text-sm text-slate-500">
        {editing ? 'Update the building details.' : 'Register a new building at this property.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm" noValidate>
        <ErrorMessage error={submitError} fallback="We could not save this building. Please try again." />

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
            placeholder="e.g. East Wing"
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
            placeholder="e.g. EAST"
            value={form.code}
            onChange={updateField}
          />
          <FieldError messages={fieldErrors.code} />
        </div>

        <div>
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

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="floor-count" className="label">
              Floor count
            </label>
            <input
              id="floor-count"
              name="floor_count"
              type="number"
              min="1"
              max="200"
              className="input"
              placeholder="e.g. 4"
              value={form.floor_count}
              onChange={updateField}
            />
            <FieldError messages={fieldErrors.floor_count} />
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

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Saving…' : editing ? 'Save changes' : 'Create building'}
          </button>
          <Link to={backTo} className="btn-outline">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
