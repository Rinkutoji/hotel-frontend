import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { customerPayments } from '../../api/paymentApi'
import useApi from '../../hooks/useApi'
import CustomerPaymentCard from '../../components/customer/CustomerPaymentCard'
import Pagination from '../../components/customer/Pagination'
import LoadingState from '../../components/common/LoadingState'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'

const PER_PAGE = 15

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'receipt_uploaded', label: 'Receipt Uploaded' },
  { value: 'verified', label: 'Verified' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'refunded', label: 'Refunded' },
]

export default function CustomerPaymentList() {
  const [searchParams, setSearchParams] = useSearchParams()

  const status = searchParams.get('status') ?? ''
  const page = Number(searchParams.get('page')) || 1

  const apiParams = useMemo(
    () => ({
      page,
      per_page: PER_PAGE,
      ...(status ? { status } : {}),
    }),
    [status, page],
  )

  const fetchPayments = useCallback(() => customerPayments.list(apiParams), [apiParams])

  const { data, meta, error, isLoading, refetch } = useApi(fetchPayments)

  const updateUrl = useCallback(
    (patch) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        Object.entries(patch).forEach(([key, value]) => {
          if (value === undefined || value === null || value === '') next.delete(key)
          else next.set(key, String(value))
        })
        return next
      })
    },
    [setSearchParams],
  )

  const payments = Array.isArray(data) ? data : []
  const currentPage = meta?.page ?? page
  const lastPage = meta?.last_page ?? 1

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-800">My payments</h1>
        <div className="mt-8">
          <LoadingState label="Loading your payments…" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-800">My payments</h1>
        <div className="mt-8">
          <ErrorState
            error={error}
            fallback="We couldn't load your payments. Please try again."
            onRetry={refetch}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-800">My payments</h1>
      <p className="mt-1 text-sm text-slate-500">Review the payments on your account.</p>

      <div className="mt-6 max-w-xs">
        <label htmlFor="status" className="label">
          Status
        </label>
        <select
          id="status"
          className="input"
          value={status}
          onChange={(e) => updateUrl({ status: e.target.value || undefined, page: 1 })}
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {payments.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No payments found"
            message={status ? 'No payments match this status.' : 'You have no payments yet.'}
            action={
              status ? (
                <button type="button" className="btn-outline" onClick={() => updateUrl({ status: undefined, page: 1 })}>
                  Clear filter
                </button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <>
          <div className="mt-8 space-y-3">
            {payments.map((payment) => (
              <CustomerPaymentCard key={payment.id} payment={payment} />
            ))}
          </div>
          {lastPage > 1 && (
            <div className="mt-10">
              <Pagination
                currentPage={currentPage}
                lastPage={lastPage}
                onPageChange={(nextPage) => updateUrl({ page: nextPage })}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}