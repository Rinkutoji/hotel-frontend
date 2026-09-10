import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import ErrorMessage from '../../components/common/ErrorMessage'
import { useAuth } from '../../hooks/useAuth'
import { getFieldErrors } from '../../utils/apiError'

export default function Login() {
  const { customerLogin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from ?? '/profile'

  const [form, setForm] = useState({ email: '', password: '' })
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
      await customerLogin(form)
      navigate(from, { replace: true })
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
      <h1 className="text-2xl font-bold text-slate-800">Welcome back</h1>
      <p className="mt-1 text-sm text-slate-500">Sign in to your GrandVista guest account.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
        <ErrorMessage error={serverError} fallback="Unable to sign in. Please check your credentials." />

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
            autoComplete="current-password"
            required
            className="input"
            value={form.password}
            onChange={handleChange}
          />
          {fieldErrors.password && <p className="field-error">{fieldErrors.password}</p>}
        </div>

        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        New to GrandVista?{' '}
        <Link to="/register" className="font-medium text-brand-600 hover:text-brand-700">
          Create an account
        </Link>
      </p>
    </div>
  )
}