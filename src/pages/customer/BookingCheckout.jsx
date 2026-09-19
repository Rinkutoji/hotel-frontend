import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { publicRooms } from '../../api/roomApi'
import { customerBookings } from '../../api/bookingApi'
import useApi from '../../hooks/useApi'
import BookingSummary from '../../components/customer/BookingSummary'
import LoadingState from '../../components/common/LoadingState'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import ErrorMessage from '../../components/common/ErrorMessage'
import { getFieldErrors } from '../../utils/apiError'
import { nightsBetween, parseRoomIds } from '../../utils/booking'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export default function BookingCheckout() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const checkIn = searchParams.get('check_in') ?? ''
  const checkOut = searchParams.get('check_out') ?? ''
  const roomIds = useMemo(() => parseRoomIds(searchParams.get('rooms')), [searchParams])

  const intentValid = useMemo(() => {
    const datesOk = DATE_PATTERN.test(checkIn) && DATE_PATTERN.test(checkOut)
    return datesOk && nightsBetween(checkIn, checkOut) > 0 && roomIds.length > 0
  }, [checkIn, checkOut, roomIds])

  const fetchAvailability = useCallback(
    () =>
      intentValid
        ? publicRooms.checkAvailability({
            check_in_date: checkIn,
            check_out_date: checkOut,
            rooms: roomIds,
          })
        : Promise.reject(new Error('invalid-booking-intent')),
    [intentValid, checkIn, checkOut, roomIds],
  )

  const { data, error, isLoading, refetch } = useApi(fetchAvailability)

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})

  const availableRooms = Array.isArray(data) ? data : []
  const unavailableCount = roomIds.length - availableRooms.length

  const summaryItems = availableRooms.map((room) => ({
    id: room.id,
    roomNumber: room.room_number,
    floor: room.floor,
    price: room.price_per_night,
    discount: room.discount,
  }))

  const canSubmit = intentValid && availableRooms.length > 0 && !submitting

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setSubmitError(null)
    setFieldErrors({})
    try {
      const res = await customerBookings.create({
        check_in_date: checkIn,
        check_out_date: checkOut,
        rooms: availableRooms.map((room) => room.id),
      })
      const created = res.data?.data
      if (!created?.id) throw new Error('Invalid booking response')
      navigate(`/bookings/${created.id}`, { state: { created: true, booking: created } })
    } catch (err) {
      const fields = getFieldErrors(err)
      if (Object.keys(fields).length > 0) setFieldErrors(fields)
      setSubmitError(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link to="/availability" className="text-sm font-medium text-brand-600 hover:text-brand-700">
        ← Back to availability
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-slate-800">Review your booking</h1>
      <p className="mt-1 text-sm text-slate-500">
        Confirm the dates and rooms below. Prices come directly from the hotel, and nothing is
        charged on this page.
      </p>

      {!intentValid ? (
        <div className="mt-8">
          <EmptyState
            title="We need a few more details"
            message="Select your dates and at least one room before booking so we can build your reservation."
            action={
              <Link to="/availability" className="btn-primary">
                Check availability
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          <BookingSummary
            checkInDate={checkIn}
            checkOutDate={checkOut}
            items={summaryItems}
            total={null}
          />

          {isLoading ? (
            <LoadingState label="Checking availability…" />
          ) : error ? (
            <ErrorState
              error={error}
              fallback="We could not re-check availability. Please try again."
              onRetry={refetch}
            />
          ) : availableRooms.length === 0 ? (
            <EmptyState
              title="No rooms available"
              message="None of the selected rooms are available for the chosen dates anymore. Check availability again for other rooms."
              action={
                <Link to="/availability" className="btn-primary">
                  Check availability
                </Link>
              }
            />
          ) : (
            <>
              {unavailableCount > 0 && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {unavailableCount} {unavailableCount === 1 ? 'room is' : 'rooms are'} no longer
                  available for these dates and {unavailableCount === 1 ? 'has' : 'have'} been removed
                  from your booking.
                </p>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <ErrorMessage
                  error={submitError}
                  fallback="We could not create your booking. Please try again."
                />

                {fieldErrors.check_in_date &&
                  fieldErrors.check_in_date.map((message) => (
                    <p key={message} className="field-error">
                      {message}
                    </p>
                  ))}
                {fieldErrors.check_out_date &&
                  fieldErrors.check_out_date.map((message) => (
                    <p key={message} className="field-error">
                      {message}
                    </p>
                  ))}
                {fieldErrors.rooms &&
                  fieldErrors.rooms.map((message) => (
                    <p key={message} className="field-error">
                      {message}
                    </p>
                  ))}

                <button type="submit" className="btn-primary w-full" disabled={!canSubmit}>
                  {submitting ? 'Creating booking…' : `Confirm booking (${availableRooms.length} ${availableRooms.length === 1 ? 'room' : 'rooms'})`}
                </button>
                <p className="text-center text-xs text-slate-400">
                  Your booking is created as pending payment and held while you complete it.
                </p>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  )
}