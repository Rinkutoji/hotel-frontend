import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { customerInvoices } from '../../api/paymentApi'
import useApi from '../../hooks/useApi'
import PaymentStatusBadge from '../../components/customer/PaymentStatusBadge'
import LoadingState from '../../components/common/LoadingState'
import ErrorState from '../../components/common/ErrorState'

const METHOD_LABELS = {
  bank_transfer: 'Bank transfer',
  cash: 'Cash',
}

function formatDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

export default function InvoiceDetail() {
  const { id } = useParams()

  const fetchInvoice = useMemo(() => () => customerInvoices.show(id), [id])
  const { data: invoice, error, isLoading, refetch } = useApi(fetchInvoice)

  if (error) {
    const is404 = error?.response?.status === 404
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-800">Invoice</h1>
        <div className="mt-8">
          <ErrorState
            error={error}
            fallback={is404 ? 'This invoice could not be found.' : "We couldn't load this invoice. Please try again."}
            onRetry={is404 ? undefined : refetch}
          />
        </div>
        <div className="mt-6 text-center">
          <Link to="/invoices" className="btn-outline">
            Back to my invoices
          </Link>
        </div>
      </div>
    )
  }

  if (isLoading || !invoice) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-800">Invoice</h1>
        <div className="mt-8">
          <LoadingState label="Loading invoice…" />
        </div>
      </div>
    )
  }

  const payment = invoice.payment ?? null
  const booking = payment?.booking ?? null
  const items = Array.isArray(invoice.items) ? invoice.items : []
  const methodLabel = payment ? (METHOD_LABELS[payment.method] ?? payment.method) : '—'

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link to="/invoices" className="print:hidden text-sm font-medium text-brand-600 hover:text-brand-700">
        ← Back to my invoices
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{invoice.invoice_number}</h1>
          <p className="mt-1 text-sm text-slate-500">Issued {formatDateTime(invoice.issued_at)}</p>
        </div>
        <div className="flex items-center gap-3">
          {payment && <PaymentStatusBadge status={payment.status} />}
          <button type="button" className="btn-outline" onClick={() => window.print()}>
            Print
          </button>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
          <p className="text-sm font-semibold text-slate-800">Invoice details</p>
        </div>
        <dl className="grid gap-3 px-5 py-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Amount</dt>
            <dd className="mt-0.5 font-medium text-slate-800">{invoice.total_amount}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Issued</dt>
            <dd className="mt-0.5 font-medium text-slate-800">{formatDateTime(invoice.issued_at)}</dd>
          </div>
          {payment && (
            <>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Payment method</dt>
                <dd className="mt-0.5 font-medium text-slate-800">{methodLabel}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Payment amount</dt>
                <dd className="mt-0.5 font-medium text-slate-800">{payment.amount}</dd>
              </div>
            </>
          )}
          {booking && (
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Booking</dt>
              <dd className="mt-0.5">
                <Link to={`/bookings/${booking.id}`} className="font-medium text-brand-600 hover:text-brand-700">
                  {booking.booking_number}
                </Link>
                {booking.customer?.name ? (
                  <span className="ml-2 text-slate-500">{booking.customer.name}</span>
                ) : null}
              </dd>
            </div>
          )}
        </dl>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
          <p className="text-sm font-semibold text-slate-800">Line items</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3">Room</th>
                <th className="px-5 py-3">Room type</th>
                <th className="px-5 py-3 text-right">Price / night</th>
                <th className="px-5 py-3 text-right">Nights</th>
                <th className="px-5 py-3 text-right">Line total</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                    No line items on this invoice.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-5 py-3 font-medium text-slate-800">{item.room_number}</td>
                    <td className="px-5 py-3 text-slate-600">{item.room_type_name}</td>
                    <td className="px-5 py-3 text-right text-slate-700">{item.price_per_night}</td>
                    <td className="px-5 py-3 text-right text-slate-700">{item.nights}</td>
                    <td className="px-5 py-3 text-right font-medium text-slate-800">{item.line_total}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className="px-5 py-4 text-right text-sm font-medium text-slate-600">
                  Total
                </td>
                <td className="px-5 py-4 text-right text-base font-bold text-slate-900">
                  {invoice.total_amount}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}