import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { staffPayments } from '../../api/paymentApi'
import useApi from '../../hooks/useApi'
import StaffPaymentCard from '../../components/staff/PaymentCard'
import PaymentFilters from '../../components/staff/PaymentFilters'
import Pagination from '../../components/customer/Pagination'
import LoadingState from '../../components/common/LoadingState'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'

const CLEARED_FILTERS = {
  status: undefined,
  search: undefined,
  page: 1,
}

export default function PaymentList() {
  const [searchParams, setSearchParams] = useSearchParams()

  const status = searchParams.get('status') ?? ''
  const search = searchParams.get('search') ?? ''
  const page = Number(searchParams.get('page')) || 1

  const apiParams = useMemo(
    () => ({
      page,
      ...(status ? { status } : {}),
      ...(search ? { search } : {}),
    }),
    [status, search, page],
  )

  const fetchPayments = useCallback(() => staffPayments.list(apiParams), [apiParams])
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
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-bold text-slate-800">Payments</h1>
        <p className="mt-1 text-sm text-slate-500">View and verify guest payments.</p>
        <div className="mt-8">
          <LoadingState label="Loading payments…" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-bold text-slate-800">Payments</h1>
        <p className="mt-1 text-sm text-slate-500">View and verify guest payments.</p>
        <div className="mt-8">
          <ErrorState
            error={error}
            fallback="We couldn't load the payments. Please try again."
            onRetry={refetch}
          />
        </div>
      </div>
    )
  }

  const hasFilters = Boolean(status || search)

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold text-slate-800">Payments</h1>
      <p className="mt-1 text-sm text-slate-500">View and verify guest payments.</p>

      <div className="mt-6">
        <PaymentFilters />
      </div>

      {payments.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No payments found"
            message={
              hasFilters
                ? 'No payments match your filters.'
                : 'There are no payments yet.'
            }
            action={
              hasFilters ? (
                <button type="button" className="btn-outline" onClick={() => updateUrl(CLEARED_FILTERS)}>
                  Clear all filters
                </button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <>
          <div className="mt-8 space-y-3">
            {payments.map((payment) => (
              <StaffPaymentCard key={payment.id} payment={payment} />
            ))}
          </div>
          {lastPage > 1 && (
            <div className="mt-10">
              <Pagination currentPage={currentPage} lastPage={lastPage} onPageChange={(nextPage) => updateUrl({ page: nextPage })} />
            </div>
          )}
        </>
      )}
    </div>
  )
}