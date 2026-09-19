import { memo } from 'react'
import { Link } from 'react-router-dom'
import PaymentStatusBadge from '../customer/PaymentStatusBadge'

const METHOD_LABELS = {
  bank_transfer: 'Bank transfer',
  cash: 'Cash',
}

export default memo(function StaffPaymentCard({ payment }) {
  const customer = payment.booking?.customer ?? null
  const bookingNumber = payment.booking?.booking_number ?? null
  const methodLabel = METHOD_LABELS[payment.method] ?? payment.method

  return (
    <Link
      to={`/staff/payments/${payment.id}`}
      className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800">{bookingNumber ?? `Payment #${payment.id}`}</p>
          <p className="mt-1 truncate text-sm text-slate-500">
            {customer ? `${customer.name} · ${customer.email}` : 'Guest not found'}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {new Date(payment.created_at).toLocaleDateString()} · {methodLabel}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <PaymentStatusBadge status={payment.status} />
          <p className="text-lg font-bold text-slate-900">{payment.amount}</p>
        </div>
      </div>
    </Link>
  )
})

