import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { staffBookings } from '../../api/bookingApi'
import useApi from '../../hooks/useApi'
import BookingStatusBadge from '../../components/customer/BookingStatusBadge'
import BookingSummary from '../../components/customer/BookingSummary'
import LoadingState from '../../components/common/LoadingState'
import ErrorState from '../../components/common/ErrorState'
import ErrorMessage from '../../components/common/ErrorMessage'
import { getFieldErrors } from '../../utils/apiError'

function formatDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

const ACTION_SUCCESS_MESSAGES = {
  confirm: 'Booking confirmed.',
  checkIn: 'Guest checked in.',
  checkOut: 'Guest checked out.',
  cancel: 'Booking cancelled.',
}

export default function BookingDetail() {
  const { id } = useParams()

  const fetchBooking = useMemo(() => () => staffBookings.show(id), [id])
  const { data: booking, error, isLoading, refetch } = useApi(fetchBooking)

  const [runningAction, setRunningAction] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [actionMessage, setActionMessage] = useState(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    if (!actionMessage) return undefined
    const timer = setTimeout(() => setActionMessage(null), 5000)
    return () => clearTimeout(timer)
  }, [actionMessage])

  const performAction = async (name, request) => {
    if (runningAction) return
    setRunningAction(name)
    setActionError(null)
    setFieldErrors({})
    try {
      await request()
      setActionMessage(ACTION_SUCCESS_MESSAGES[name])
      setCancelOpen(false)
      setReason('')
      await refetch()
    } catch (err) {
      const fields = getFieldErrors(err)
      if (fields && Object.keys(fields).length > 0) setFieldErrors(fields)
      setActionError(err)
      if (err?.response?.status === 409 || err?.response?.status === 403) {
        await refetch()
      }
    } finally {
      setRunningAction(null)
    }
  }

  const handleConfirm = () => performAction('confirm', () => staffBookings.confirm(booking.id))
  const handleCheckIn = () => performAction('checkIn', () => staffBookings.checkIn(booking.id))
  const handleCheckOut = () => performAction('checkOut', () => staffBookings.checkOut(booking.id))

  const handleCancel = (e) => {
    e.preventDefault()
    performAction('cancel', () => staffBookings.cancel(booking.id, reason.trim() || undefined))
  }

  if (error) {
    const is404 = error?.response?.status === 404
    return (
      <div className="mx-auto max-w-3xl">
        <div className="mt-2">
          <ErrorState
            error={error}
            fallback={is404 ? 'This booking could not be found.' : "We couldn't load this booking. Please try again."}
            onRetry={is404 ? undefined : refetch}
          />
        </div>
        <div className="mt-6 text-center">
          <Link to="/staff/bookings" className="btn-outline">
            Back to bookings
          </Link>
        </div>
      </div>
    )
  }

  if (isLoading || !booking) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="mt-2">
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

  const customer = booking.customer ?? null
  const status = booking.status

  const showConfirm = status === 'pending_payment'
  const showCheckIn = status === 'confirmed'
  const showCheckOut = status === 'checked_in'

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const checkInDate = new Date(booking.check_in_date)
  checkInDate.setHours(0, 0, 0, 0)
  const checkInDisabled = showCheckIn && today.getTime() < checkInDate.getTime()

  const running = runningAction !== null

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/staff/bookings" className="text-sm font-medium text-brand-600 hover:text-brand-700">
        ← Back to bookings
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{booking.booking_number}</h1>
          <p className="mt-1 text-sm text-slate-500">Reservation details</p>
        </div>
        <BookingStatusBadge status={status} />
      </div>

      {actionMessage && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800" role="status">
          {actionMessage}
        </div>
      )}

      {actionError && (
        <div className="mt-4">
          <ErrorMessage
            error={actionError}
            fallback="The action could not be completed. Please try again."
          />
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
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
          {booking.no_show_at && (
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">No-show</dt>
              <dd className="mt-0.5 font-medium text-slate-800">{formatDateTime(booking.no_show_at)}</dd>
            </div>
          )}
          {booking.late_fee_amount && (
            <div className="sm:col-span-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-amber-700">Late cancellation fee</dt>
              <dd className="mt-0.5 font-bold text-amber-900">
                {booking.late_fee_amount}
                {booking.late_fee_applied_at ? (
                  <span className="ml-2 text-xs font-normal text-amber-700">
                    applied {formatDateTime(booking.late_fee_applied_at)}
                  </span>
                ) : null}
              </dd>
            </div>
          )}
        </dl>
      </div>

      <div className="mt-4">
        <BookingSummary
          checkInDate={booking.check_in_date}
          checkOutDate={booking.check_out_date}
          items={summaryItems}
          total={booking.total_amount}
        />
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
          <p className="text-sm font-semibold text-slate-800">Guest</p>
        </div>
        <dl className="grid gap-3 px-5 py-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Name</dt>
            <dd className="mt-0.5 font-medium text-slate-800">{customer ? customer.name : '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Email</dt>
            <dd className="mt-0.5 font-medium text-slate-800">{customer ? customer.email : '—'}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-6">
        {showConfirm && (
          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn-primary" disabled={running || runningAction === 'confirm'} onClick={handleConfirm}>
              {runningAction === 'confirm' ? 'Confirming…' : 'Confirm booking'}
            </button>
            <button type="button" className="btn-danger-ghost" disabled={running} onClick={() => setCancelOpen((value) => !value)}>
              Cancel booking
            </button>
          </div>
        )}

        {showCheckIn && (
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn-primary" disabled={running || runningAction === 'checkIn' || checkInDisabled} onClick={handleCheckIn}>
              {runningAction === 'checkIn' ? 'Checking in…' : 'Check in guest'}
            </button>
            <button type="button" className="btn-danger-ghost" disabled={running} onClick={() => setCancelOpen((value) => !value)}>
              Cancel booking
            </button>
            {checkInDisabled && (
              <p className="text-sm text-slate-500">
                Check-in is only allowed on or after {new Date(booking.check_in_date).toLocaleDateString()}.
              </p>
            )}
          </div>
        )}

        {showCheckOut && (
          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn-primary" disabled={running || runningAction === 'checkOut'} onClick={handleCheckOut}>
              {runningAction === 'checkOut' ? 'Checking out…' : 'Check out guest'}
            </button>
          </div>
        )}

        {status === 'checked_out' && (
          <p className="text-sm text-slate-500">This booking is complete.</p>
        )}

        {status === 'cancelled' && (
          <p className="text-sm text-slate-500">This booking was cancelled.</p>
        )}

        {status === 'no_show' && (
          <p className="text-sm text-slate-500">This guest did not check in.</p>
        )}

        {cancelOpen && (
          <form
            onSubmit={handleCancel}
            className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-medium text-slate-800">
              Cancel this booking? Only pending and confirmed bookings can be cancelled.
            </p>
            <ErrorMessage
              error={actionError && runningAction === null ? actionError : null}
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
                placeholder="Why is this booking being cancelled?"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              {fieldErrors.reason && <p className="field-error">{fieldErrors.reason[0]}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" className="btn-danger" disabled={running}>
                {runningAction === 'cancel' ? 'Cancelling…' : 'Confirm cancellation'}
              </button>
              <button type="button" className="btn-outline" disabled={running} onClick={() => { setCancelOpen(false); setActionError(null); setFieldErrors({}); }}>
                Keep booking
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}