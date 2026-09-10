import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ErrorMessage from '../../components/common/ErrorMessage'
import { useAuth } from '../../hooks/useAuth'
import { getFieldErrors } from '../../utils/apiError'

const INITIAL_FORM = {
  name: '',
  email: '',
  password: '',
  password_confirmation: '',
  phone: '',
}

export default function Register() {
  const { customerRegister } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState(INITIAL_FORM)
  const [fieldErrors, setFieldErrors] = useState({})
  const [serverError, setServerError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setServerError(null)
    setFieldErrors({})
    try {
      await customerRegister(form)
      navigate('/profile', { replace: true })
    } catch (err) {
      const fields = getFieldErrors(err)
      if (fields) setFieldErrors(fields)
      setServerError(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-12">
      <h1 className="text-2xl font-bold text-slate-800">Create your account</h1>
      <p className="mt-1 text-sm text-slate-500">
        Join GrandVista to book stays and manage your reservations.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
        <ErrorMessage error={serverError} fallback="Unable to create your account." />

        <div>
          <label htmlFor="name" className="label">
            Full name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
            className="input"
            value={form.name}
            onChange={handleChange}
          />
          {fieldErrors.name && <p className="field-error">{fieldErrors.name}</p>}
        </div>

        <div>
          <label htmlFor="phone" className="label">
            Phone (optional)
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            className="input"
            value={form.phone}
            onChange={handleChange}
          />
          {fieldErrors.phone && <p className="field-error">{fieldErrors.phone}</p>}
        </div>

        <div>
          <label htmlFor="email" className="label">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="input"
            value={form.email}
            onChange={handleChange}
          />
          {fieldErrors.email && <p className="field-error">{fieldErrors.email}</p>}
        </div>

        <div>
          <label htmlFor="password" className="label">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            className="input"
            value={form.password}
            onChange={handleChange}
          />
          {fieldErrors.password && <p className="field-error">{fieldErrors.password}</p>}
        </div>

        <div>
          <label htmlFor="password_confirmation" className="label">
            Confirm password
          </label>
          <input
            id="password_confirmation"
            name="password_confirmation"
            type="password"
            autoComplete="new-password"
            required
            className="input"
            value={form.password_confirmation}
            onChange={handleChange}
          />
          {fieldErrors.password_confirmation && (
            <p className="field-error">{fieldErrors.password_confirmation}</p>
          )}
        </div>

        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create Account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already registered?{' '}
        <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">
          Sign in
        </Link>
      </p>
    </div>
  )
}