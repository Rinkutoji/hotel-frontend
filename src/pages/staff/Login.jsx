import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ErrorMessage from '../../components/common/ErrorMessage'
import { useAuth } from '../../hooks/useAuth'
import { getFieldErrors } from '../../utils/apiError'

export default function StaffLogin() {
  const { staffLogin } = useAuth()
  const navigate = useNavigate()

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
      await staffLogin(form)
      navigate('/staff/dashboard', { replace: true })
    } catch (err) {
      const fields = getFieldErrors(err)
      if (fields) setFieldErrors(fields)
      setServerError(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="text-center">
          <h1 className="text-xl font-bold text-slate-800">
            GrandVista <span className="text-brand-600">Admin</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">Staff sign in</p>
        </div>

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
      </div>
    </div>
  )
}