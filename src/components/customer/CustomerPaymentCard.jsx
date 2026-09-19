import { memo } from 'react'
import { Link } from 'react-router-dom'
import PaymentStatusBadge from './PaymentStatusBadge'

const METHOD_LABELS = {
  bank_transfer: 'Bank transfer',
  cash: 'Cash',
}

export default memo(function CustomerPaymentCard({ payment }) {
  const booking = payment.booking ?? null
  const bookingNumber = booking?.booking_number ?? null
  const methodLabel = METHOD_LABELS[payment.method] ?? payment.method

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          {bookingNumber ? (
            <Link to={`/bookings/${booking.id}`} className="text-sm font-semibold text-brand-600 hover:text-brand-700">
              {bookingNumber}
            </Link>
          ) : (
            <p className="text-sm font-semibold text-slate-800">{`Payment #${payment.id}`}</p>
          )}
          <p className="mt-1 text-sm text-slate-500">
            {new Date(payment.created_at).toLocaleDateString()} · {methodLabel}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <PaymentStatusBadge status={payment.status} />
          <Link to={`/payments/${payment.id}`} className="text-lg font-bold text-slate-900 hover:text-brand-600">
            {payment.amount}
          </Link>
        </div>
      </div>
    </div>
  )
})

