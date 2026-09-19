import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { staffDiscounts } from '../../api/discountApi'
import useApi from '../../hooks/useApi'
import LoadingState from '../../components/common/LoadingState'
import ErrorState from '../../components/common/ErrorState'
import ErrorMessage from '../../components/common/ErrorMessage'
import { getFieldErrors } from '../../utils/apiError'

const NOOP_FETCH = () => Promise.resolve({ data: {} })

export default function DiscountForm() {
  const { id } = useParams()
  const editing = Boolean(id)
  const navigate = useNavigate()

  const fetchDiscount = useMemo(() => (editing ? () => staffDiscounts.show(id) : undefined), [editing, id])
  const { data: discount, error, isLoading, refetch } = useApi(fetchDiscount ?? NOOP_FETCH)

  const [form, setForm] = useState({ name: '', min_nights: '', percent_off: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitError, setSubmitError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const discountId = discount?.id
  const [prevDiscountId, setPrevDiscountId] = useState(null)
  if (discountId && discountId !== prevDiscountId) {
    setPrevDiscountId(discountId)
    setForm({
      name: discount.name ?? '',
      min_nights: discount.min_nights != null ? String(discount.min_nights) : '',
      percent_off: discount.percent_off ?? '',
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

    const minNights = Number(form.min_nights)
    if (form.min_nights.trim() === '' || !Number.isInteger(minNights) || minNights < 1) {
      next.min_nights = ['Minimum nights must be a whole number of at least 1.']
    }

    const percent = Number(form.percent_off)
    if (form.percent_off.trim() === '') next.percent_off = ['Percent off is required.']
    else if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
      next.percent_off = ['Percent off must be greater than 0 and at most 100.']
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
      min_nights: Number(form.min_nights),
      percent_off: form.percent_off.trim(),
    }
    try {
      if (editing) await staffDiscounts.update(id, payload)
      else await staffDiscounts.create(payload)
      navigate('/staff/discounts')
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
        <Link to="/staff/discounts" className="text-sm font-medium text-brand-600 hover:text-brand-700">
          ← Back to discounts
        </Link>
        <div className="mt-4">
          <ErrorState
            error={error}
            fallback={is404 ? 'This discount could not be found.' : "We couldn't load this discount. Please try again."}
            onRetry={is404 ? undefined : refetch}
          />
        </div>
      </div>
    )
  }

  if (editing && (isLoading || !discount)) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="mt-2">
          <LoadingState label="Loading discount…" />
        </div>
      </div>
    )
  }

  const pageTitle = editing ? `Edit ${discount?.name ?? 'discount'}` : 'Add a discount'

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/staff/discounts" className="text-sm font-medium text-brand-600 hover:text-brand-700">
        ← Back to discounts
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-slate-800">{pageTitle}</h1>
      <p className="mt-1 text-sm text-slate-500">
        {editing ? 'Update the pricing tier details.' : 'Define a length-of-stay pricing tier.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm" noValidate>
        <ErrorMessage error={submitError} fallback="We could not save this discount. Please try again." />

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
            placeholder="e.g. Week stay"
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

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="min-nights" className="label">
              Minimum nights
            </label>
            <input
              id="min-nights"
              name="min_nights"
              type="number"
              min="1"
              className="input"
              placeholder="3"
              value={form.min_nights}
              onChange={updateField}
            />
            {fieldErrors.min_nights &&
              fieldErrors.min_nights.map((message) => (
                <p key={message} className="field-error">
                  {message}
                </p>
              ))}
          </div>
          <div>
            <label htmlFor="percent-off" className="label">
              Percent off
            </label>
            <input
              id="percent-off"
              name="percent_off"
              type="text"
              inputMode="decimal"
              className="input"
              placeholder="15.00"
              value={form.percent_off}
              onChange={updateField}
            />
            {fieldErrors.percent_off &&
              fieldErrors.percent_off.map((message) => (
                <p key={message} className="field-error">
                  {message}
                </p>
              ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Saving…' : editing ? 'Save changes' : 'Create discount'}
          </button>
          <Link to="/staff/discounts" className="btn-outline">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}