import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { staffEmployees } from '../../api/staffApi'
import { staffProperties } from '../../api/propertyApi'
import useApi from '../../hooks/useApi'
import LoadingState from '../../components/common/LoadingState'
import ErrorState from '../../components/common/ErrorState'
import ErrorMessage from '../../components/common/ErrorMessage'
import { getFieldErrors } from '../../utils/apiError'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  role: 'receptionist',
  status: 'active',
  password: '',
  property_id: '',
}

const NOOP_FETCH = () => Promise.resolve({ data: {} })

function FieldErrors({ messages }) {
  if (!messages) return null
  return messages.map((message) => (
    <p key={message} className="field-error">
      {message}
    </p>
  ))
}

export default function StaffForm() {
  const { id } = useParams()
  const editing = Boolean(id)
  const navigate = useNavigate()

  const fetchEmployee = useMemo(() => (editing ? () => staffEmployees.show(id) : undefined), [editing, id])
  const { data: employee, error, isLoading, refetch } = useApi(fetchEmployee ?? NOOP_FETCH)

  // Property options feed the receptionist assignment select. The route
  // guard already restricts this page to admins, so the admin's
  // unfiltered property list is the right source.
  const fetchProperties = useMemo(() => () => staffProperties.list({ per_page: 50 }), [])
  const {
    data: propertyList,
    error: propertiesError,
    isLoading: propertiesLoading,
  } = useApi(fetchProperties)

  const [form, setForm] = useState(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitError, setSubmitError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const employeeId = employee?.id
  const [prevEmployeeId, setPrevEmployeeId] = useState(null)
  if (employeeId && employeeId !== prevEmployeeId) {
    setPrevEmployeeId(employeeId)
    setForm({
      name: employee.name ?? '',
      email: employee.email ?? '',
      phone: employee.phone ?? '',
      role: employee.role ?? 'receptionist',
      status: employee.status ?? 'active',
      password: '',
      property_id: employee.property_id != null ? String(employee.property_id) : '',
    })
  }

  const updateField = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setFieldErrors((prev) => ({ ...prev, [e.target.name]: undefined }))
  }

  const validate = () => {
    const next = {}
    if (!form.name.trim()) next.name = ['Name is required.']
    if (!form.email.trim()) next.email = ['Email is required.']
    else if (!EMAIL_PATTERN.test(form.email.trim())) next.email = ['Enter a valid email address.']
    if (!editing && form.password === '') next.password = ['Password is required.']
    if (form.password !== '' && form.password.length < 8) {
      next.password = ['Password must be at least 8 characters.']
    }
    if (form.role === 'receptionist' && form.property_id === '') {
      next.property_id = ['Property is required for receptionists.']
    }
    return next
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const nextErrors = validate()
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    setFieldErrors({})
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() === '' ? null : form.phone.trim(),
      role: form.role,
      ...(editing ? { status: form.status } : {}),
      ...(form.password !== '' ? { password: form.password } : {}),
      ...(form.role === 'receptionist' ? { property_id: Number(form.property_id) } : {}),
    }
    try {
      if (editing) await staffEmployees.update(id, payload)
      else await staffEmployees.create(payload)
      navigate('/staff/staff')
    } catch (err) {
      const fields = getFieldErrors(err)
      if (Object.keys(fields).length > 0) setFieldErrors(fields)
      setSubmitError(err)
    } finally {
      setSubmitting(false)
    }
  }

  if (editing && error) {
    const is404 = error?.response?.status === 404
    return (
      <div className="mx-auto max-w-3xl">
        <Link to="/staff/staff" className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
          ← Back to staff
        </Link>
        <div className="mt-4">
          <ErrorState
            error={error}
            fallback={
              is404 ? 'This staff member could not be found.' : "We couldn't load this staff member. Please try again."
            }
            onRetry={is404 ? undefined : refetch}
          />
        </div>
      </div>
    )
  }

  if (editing && (isLoading || !employee)) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="mt-2">
          <LoadingState label="Loading staff member…" />
        </div>
      </div>
    )
  }

  const pageTitle = editing ? `Edit ${employee?.name ?? 'staff member'}` : 'Add a staff member'
  const propertyOptions = Array.isArray(propertyList) ? propertyList : []

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/staff/staff" className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
        ← Back to staff
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-slate-800 dark:text-slate-100">{pageTitle}</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {editing ? 'Update the staff account details.' : 'Create a new staff account.'}
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"
        noValidate
      >
        <ErrorMessage error={submitError} fallback="We could not save this staff member. Please try again." />

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
              placeholder="e.g. Srey Neang"
              value={form.name}
              onChange={updateField}
            />
            <FieldErrors messages={fieldErrors.name} />
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
              placeholder="e.g. srey@hotel.com"
              value={form.email}
              onChange={updateField}
            />
            <FieldErrors messages={fieldErrors.email} />
          </div>
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
            <label htmlFor="role" className="label">
              Role
            </label>
            <select id="role" name="role" className="input" value={form.role} onChange={updateField}>
              <option value="receptionist">Receptionist</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label htmlFor="password" className="label">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="input"
              minLength={8}
              autoComplete="new-password"
              placeholder={editing ? 'Leave blank to keep the current password' : 'At least 8 characters'}
              value={form.password}
              onChange={updateField}
            />
            <FieldErrors messages={fieldErrors.password} />
          </div>
          {editing && (
            <div>
              <label htmlFor="status" className="label">
                Status
              </label>
              <select id="status" name="status" className="input" value={form.status} onChange={updateField}>
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>
            </div>
          )}
        </div>

        {form.role === 'receptionist' && (
          <div>
            <label htmlFor="property_id" className="label">
              Assigned property
            </label>
            {propertiesError ? (
              <ErrorMessage
                error={propertiesError}
                fallback="We couldn't load the property list. Please try again."
              />
            ) : (
              <select
                id="property_id"
                name="property_id"
                className="input"
                value={form.property_id}
                onChange={updateField}
              >
                <option value="">
                  {propertiesLoading ? 'Loading properties…' : 'Select a property'}
                </option>
                {propertyOptions.map((property) => (
                  <option key={property.id} value={String(property.id)}>
                    {property.name}
                  </option>
                ))}
              </select>
            )}
            <FieldErrors messages={fieldErrors.property_id} />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Saving…' : editing ? 'Save changes' : 'Create staff member'}
          </button>
          <Link to="/staff/staff" className="btn-outline">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
