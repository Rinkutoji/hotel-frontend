import { useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { customerBookings } from '../../api/bookingApi'
import useApi from '../../hooks/useApi'
import BookingStatusBadge from '../../components/customer/BookingStatusBadge'
import PaymentStatusBadge from '../../components/customer/PaymentStatusBadge'
import BookingSummary from '../../components/customer/BookingSummary'
import LoadingState from '../../components/common/LoadingState'
import ErrorState from '../../components/common/ErrorState'
import ErrorMessage from '../../components/common/ErrorMessage'

function formatDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

function isExpired(booking) {
  return booking.payment_deadline_at != null && new Date(booking.payment_deadline_at).getTime() <= Date.now()
}

export default function BookingDetail() {
  const { id } = useParams()
  const location = useLocation()

  const created = Boolean(location.state?.created)
  const createdBooking = location.state?.booking ?? null

  const fetchBooking = useMemo(() => () => customerBookings.show(id), [id])
  const { data: booking, error, isLoading, refetch } = useApi(fetchBooking)

  const [confirming, setConfirming] = useState(false)
  const [reason, setReason] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState(null)
  const [cancelMessage, setCancelMessage] = useState(null)

  // The booking show response carries its one-and-only payment (hasOne
  // relation, eager-loaded server-side). No paginated list lookup is needed
  // anymore - a payment that exists is always found, and its absence really
  // means "create one" (audit finding B2).
  const payment = booking?.payment ?? null

  if (error) {
    const is404 = error?.response?.status === 404
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
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

  const expired = booking.status === 'pending_payment' && isExpired(booking)
  const canCancel = booking.status === 'pending_payment' && !expired

  const handleCancel = async (e) => {
    e.preventDefault()
    if (cancelling) return
    setCancelling(true)
    setCancelError(null)
    setCancelMessage(null)
    try {
      await customerBookings.cancel(booking.id, reason.trim() || undefined)
      setConfirming(false)
      setReason('')
      setCancelMessage('Your booking has been cancelled.')
      await refetch()
    } catch (err) {
      setCancelError(err)
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link to="/bookings" className="text-sm font-medium text-brand-600 hover:text-brand-700">
        ← Back to my bookings
      </Link>

      {created && (
        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-5 py-4">
          <p className="text-sm font-semibold text-green-800">Your booking was created successfully</p>
          <p className="mt-1 text-sm text-green-700">
            {booking.booking_number} is pending payment. Complete it below before the deadline to
            keep your rooms.
          </p>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{booking.booking_number}</h1>
          <p className="mt-1 text-sm text-slate-500">Reservation summary</p>
        </div>
        <BookingStatusBadge status={booking.status} />
      </div>

      <div className="mt-6">
        <BookingSummary
          checkInDate={booking.check_in_date}
          checkOutDate={booking.check_out_date}
          items={summaryItems}
          total={booking.total_amount}
        />
      </div>

      {createdBooking?.discount && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm">
          <p className="font-semibold text-green-800">
            Discount applied: {createdBooking.discount.name} ({createdBooking.discount.percent_off}% off)
          </p>
          <p className="mt-1 text-green-700">
            Total after discount: <span className="font-bold">{createdBooking.discount.total_after_discount}</span>
            {createdBooking.discount.saved_total ? (
              <span className="ml-2 text-green-600">You saved {createdBooking.discount.saved_total}</span>
            ) : null}
          </p>
        </div>
      )}

      {cancelMessage && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {cancelMessage}
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
          <p className="text-sm font-semibold text-slate-800">Trip details</p>
        </div>
        <dl className="grid gap-3 px-5 py-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Total amount</dt>
            <dd className="mt-0.5 font-medium text-slate-800">{booking.total_amount}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Payment deadline</dt>
            <dd className="mt-0.5 font-medium text-slate-800">{formatDateTime(booking.payment_deadline_at)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Created</dt>
            <dd className="mt-0.5 font-medium text-slate-800">{formatDateTime(booking.created_at)}</dd>
          </div>
          {booking.cancelled_at && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Cancelled</dt>
              <dd className="mt-0.5 font-medium text-slate-800">{formatDateTime(booking.cancelled_at)}</dd>
            </div>
          )}
          {booking.cancellation_reason && (
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Cancellation reason</dt>
              <dd className="mt-0.5 font-medium text-slate-800">{booking.cancellation_reason}</dd>
            </div>
          )}
        </dl>
      </div>

      {expired && (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          The payment deadline on this booking has passed and the rooms are no longer held. Please
          create a new booking if you still want to stay.
        </div>
      )}

      {canCancel && (
        <div className="mt-6 space-y-4">
          {payment && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span>Payment:</span>
              <PaymentStatusBadge status={payment.status} />
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {payment ? (
              <Link to={`/payments/${payment.id}`} className="btn-primary">
                View Payment
              </Link>
            ) : (
              <Link to={`/payments/new/${booking.id}`} className="btn-primary">
                Continue to Payment
              </Link>
            )}
            <button type="button" className="btn-danger-ghost" onClick={() => setConfirming((value) => !value)}>
              Cancel booking
            </button>
          </div>

          {confirming && (
            <form
              onSubmit={handleCancel}
              className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm font-medium text-slate-800">
                Cancel this booking? It is only cancellable while it is still pending payment.
              </p>
              <ErrorMessage
                error={cancelError}
                fallback="We could not cancel this booking. Please try again."
              />
              <div>
                <label htmlFor="cancel-reason" className="label">
                  Reason (optional)
                </label>
                <input
                  id="cancel-reason"
                  type="text"
                  className="input"
                  maxLength={255}
                  placeholder="Tell us why you're cancelling (optional)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button type="submit" className="btn-danger" disabled={cancelling}>
                  {cancelling ? 'Cancelling…' : 'Yes, cancel booking'}
                </button>
                <button
                  type="button"
                  className="btn-outline"
                  disabled={cancelling}
                  onClick={() => setConfirming(false)}
                >
                  Keep booking
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}