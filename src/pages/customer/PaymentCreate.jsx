import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { customerBookings } from '../../api/bookingApi'
import { customerPayments } from '../../api/paymentApi'
import useApi from '../../hooks/useApi'
import BookingSummary from '../../components/customer/BookingSummary'
import LoadingState from '../../components/common/LoadingState'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import ErrorMessage from '../../components/common/ErrorMessage'
import { getFieldErrors } from '../../utils/apiError'

function formatDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

export default function PaymentCreate() {
  const { bookingId } = useParams()
  const navigate = useNavigate()

  const fetchBooking = useMemo(() => () => customerBookings.show(bookingId), [bookingId])
  const { data: booking, error, isLoading, refetch } = useApi(fetchBooking)

  const [method, setMethod] = useState('bank_transfer')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})

  if (error) {
    const is404 = error?.response?.status === 404
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-800">Payment</h1>
        <div className="mt-8">
          <ErrorState
            error={error}
            fallback={is404 ? 'This booking could not be found.' : "We couldn't load this booking. Please try again."}
            onRetry={is404 ? undefined : refetch}
          />
        </div>
        <div className="mt-6 text-center">
          <Link to="/bookings" className="btn-outline">
            Back to my bookings
          </Link>
        </div>
      </div>
    )
  }

  if (isLoading || !booking) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-800">Payment</h1>
        <div className="mt-8">
          <LoadingState label="Loading booking…" />
        </div>
      </div>
    )
  }

  const rooms = Array.isArray(booking.booking_rooms) ? booking.booking_rooms : []
  const summaryItems = rooms.map((roomBooking) => ({
    id: roomBooking.id,
    roomNumber: roomBooking.room?.room_number,
    floor: roomBooking.room?.floor,
    price: roomBooking.price_per_night,
    roomTypeName: roomBooking.room_type?.name,
  }))

  const canPay = booking.status === 'pending_payment'

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setSubmitError(null)
    setFieldErrors({})
    try {
      const res = await customerPayments.create({ booking_id: Number(bookingId), method })
      navigate(`/payments/${res.data.data.id}`, { state: { created: true } })
    } catch (err) {
      setSubmitError(err)
      setFieldErrors(getFieldErrors(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (!canPay) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Link to="/bookings" className="text-sm font-medium text-brand-600 hover:text-brand-700">
          ← Back to my bookings
        </Link>
        <div className="mt-6">
          <EmptyState
            title="Payment is not available for this booking"
            message={
              <span className="mt-2 text-sm text-slate-500">
                This booking is {booking.status}. Payments can only be created while a booking is pending
                payment.
              </span>
            }
            action={
              <Link to={`/bookings/${booking.id}`} className="btn-outline">
                Back to booking
              </Link>
            }
          />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link to={`/bookings/${booking.id}`} className="text-sm font-medium text-brand-600 hover:text-brand-700">
        ← Back to booking
      </Link>

      <div className="mt-4">
        <h1 className="text-2xl font-bold text-slate-800">Payment</h1>
        <p className="mt-1 text-sm text-slate-500">
          Complete payment for {booking.booking_number} before your payment deadline.
        </p>
      </div>

      <div className="mt-6">
        <BookingSummary
          checkInDate={booking.check_in_date}
          checkOutDate={booking.check_out_date}
          items={summaryItems}
          total={booking.total_amount}
        />
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
          <p className="text-sm font-semibold text-slate-800">Select payment method</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5 px-5 py-4">
          <fieldset>
            <legend className="sr-only">Payment method</legend>
            <div className="space-y-3">
              <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-4 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
                <input
                  type="radio"
                  name="method"
                  value="bank_transfer"
                  checked={method === 'bank_transfer'}
                  onChange={(e) => setMethod(e.target.value)}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-medium text-slate-800">Bank transfer</span>
                  <span className="block text-xs text-slate-500">
                    Pay by bank transfer and upload your payment receipt.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-4 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
                <input
                  type="radio"
                  name="method"
                  value="cash"
                  checked={method === 'cash'}
                  onChange={(e) => setMethod(e.target.value)}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-medium text-slate-800">Cash</span>
                  <span className="block text-xs text-slate-500">
                    Pay in person at the hotel and upload your receipt.
                  </span>
                </span>
              </label>
            </div>
          </fieldset>

          <ErrorMessage
            error={submitError}
            fallback="We could not create the payment. Please try again."
          />

          {Object.entries(fieldErrors).map(([field, messages]) => (
            <div key={field} className="field-error">
              <span className="font-medium">{field}:</span> {Array.isArray(messages) ? messages.join(' ') : messages}
            </div>
          ))}

          {submitError?.response?.status === 409 && (
            <p className="text-sm text-slate-600">
              A payment may already exist for this booking.{' '}
              <Link to={`/bookings/${booking.id}`} className="font-medium text-brand-600 hover:text-brand-700">
                View your booking
              </Link>{' '}
              to check its status.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Creating payment…' : 'Continue to payment'}
            </button>
            <p className="text-sm text-slate-500">
              Amount to pay:{' '}
              <span className="font-bold text-slate-800">{booking.total_amount}</span>
            </p>
          </div>

          {booking.payment_deadline_at && (
            <p className="text-xs text-slate-500">
              Payment deadline: {formatDateTime(booking.payment_deadline_at)}
            </p>
          )}
        </form>
      </div>
    </div>
  )
}