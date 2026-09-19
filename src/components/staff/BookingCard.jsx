import { memo } from 'react'
import { Link } from 'react-router-dom'
import BookingStatusBadge from '../customer/BookingStatusBadge'
import { nightsBetween } from '../../utils/booking'

export default memo(function StaffBookingCard({ booking }) {
  const nights = nightsBetween(booking.check_in_date, booking.check_out_date)
  const customer = booking.customer ?? null

  return (
    <Link
      to={`/staff/bookings/${booking.id}`}
      className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800">{booking.booking_number}</p>
          <p className="mt-1 truncate text-sm text-slate-500">
            {customer ? `${customer.name} · ${customer.email}` : 'Guest not found'}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {new Date(booking.check_in_date).toLocaleDateString()} →{' '}
            {new Date(booking.check_out_date).toLocaleDateString()} · {nights}{' '}
            {nights === 1 ? 'night' : 'nights'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <BookingStatusBadge status={booking.status} />
          <p className="text-lg font-bold text-slate-900">{booking.total_amount}</p>
        </div>
      </div>
    </Link>
  )
})

