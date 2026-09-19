import { useCallback, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { customerInvoices } from '../../api/paymentApi'
import useApi from '../../hooks/useApi'
import Pagination from '../../components/customer/Pagination'
import LoadingState from '../../components/common/LoadingState'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'

function formatDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

export default function InvoiceList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Number(searchParams.get('page')) || 1

  const apiParams = useMemo(() => ({ page }), [page])

  const fetchInvoices = useCallback(() => customerInvoices.list(apiParams), [apiParams])

  const { data, meta, error, isLoading, refetch } = useApi(fetchInvoices)

  const updatePage = useCallback(
    (nextPage) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.set('page', String(nextPage))
        return next
      })
    },
    [setSearchParams],
  )

  const invoices = Array.isArray(data) ? data : []
  const currentPage = meta?.page ?? page
  const lastPage = meta?.last_page ?? 1

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-800">My invoices</h1>
        <div className="mt-8">
          <LoadingState label="Loading invoices…" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-800">My invoices</h1>
        <div className="mt-8">
          <ErrorState
            error={error}
            fallback="We couldn't load your invoices. Please try again."
            onRetry={refetch}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-800">My invoices</h1>
      <p className="mt-1 text-sm text-slate-500">Invoices are generated once a payment is verified.</p>

      {invoices.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No invoices yet"
            message="You don't have any invoices yet. Invoices are generated after your payment is verified."
            action={
              <Link to="/bookings" className="btn-primary">
                View my bookings
              </Link>
            }
          />
        </div>
      ) : (
        <>
          <div className="mt-8 space-y-3">
            {invoices.map((invoice) => (
              <Link
                key={invoice.id}
                to={`/invoices/${invoice.id}`}
                className="block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-brand-300 hover:shadow"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="text-sm font-semibold text-brand-600">{invoice.invoice_number}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {invoice.payment?.booking?.booking_number
                        ? `Booking ${invoice.payment.booking.booking_number}`
                        : `Booking #${invoice.payment?.booking_id ?? '—'}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold text-slate-900">{invoice.total_amount}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{formatDateTime(invoice.issued_at)}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          {lastPage > 1 && (
            <div className="mt-10">
              <Pagination currentPage={currentPage} lastPage={lastPage} onPageChange={updatePage} />
            </div>
          )}
        </>
      )}
    </div>
  )
}