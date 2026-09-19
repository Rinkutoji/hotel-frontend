import { memo } from 'react'
import { Link } from 'react-router-dom'
import PaymentStatusBadge from '../customer/PaymentStatusBadge'

function formatDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

export default memo(function StaffInvoiceCard({ invoice }) {
  const payment = invoice.payment ?? null
  const customer = payment?.booking?.customer ?? null
  const bookingNumber = payment?.booking?.booking_number ?? null

  return (
    <Link
      to={`/staff/invoices/${invoice.id}`}
      className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800">{invoice.invoice_number}</p>
          <p className="mt-1 truncate text-sm text-slate-500">
            {customer ? `${customer.name} · ${customer.email}` : 'Guest not found'}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {bookingNumber ?? `Booking #${payment?.booking_id ?? '—'}`} · {formatDateTime(invoice.issued_at)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {payment && <PaymentStatusBadge status={payment.status} />}
          <p className="text-lg font-bold text-slate-900">{invoice.total_amount}</p>
        </div>
      </div>
    </Link>
  )
})

