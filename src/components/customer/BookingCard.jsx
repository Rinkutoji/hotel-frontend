import { memo } from 'react'
import { Link } from 'react-router-dom'
import BookingStatusBadge from './BookingStatusBadge'
import { nightsBetween } from '../../utils/booking'

export default memo(function BookingCard({ booking }) {
  const nights = nightsBetween(booking.check_in_date, booking.check_out_date)

  return (
    <Link
      to={`/bookings/${booking.id}`}
      className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800">{booking.booking_number}</p>
          <p className="mt-1 text-sm text-slate-500">
            {new Date(booking.check_in_date).toLocaleDateString()} →{' '}
            {new Date(booking.check_out_date).toLocaleDateString()} · {nights}{' '}
            {nights === 1 ? 'night' : 'nights'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <BookingStatusBadge status={booking.status} />
          <p className="text-lg font-bold text-slate-900">{booking.total_amount}</p>
        </div>
      </div>
    </Link>
  )
})

