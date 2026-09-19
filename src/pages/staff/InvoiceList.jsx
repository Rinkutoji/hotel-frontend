import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { staffInvoices } from '../../api/paymentApi'
import useApi from '../../hooks/useApi'
import InvoiceCard from '../../components/staff/InvoiceCard'
import SearchBar from '../../components/customer/SearchBar'
import Pagination from '../../components/customer/Pagination'
import LoadingState from '../../components/common/LoadingState'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'

const CLEARED_FILTERS = {
  search: undefined,
  page: 1,
}

function commitParams(setSearchParams, patch) {
  setSearchParams((prev) => {
    const next = new URLSearchParams(prev)
    Object.entries(patch).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') next.delete(key)
      else next.set(key, String(value))
    })
    return next
  })
}

export default function InvoiceList() {
  const [searchParams, setSearchParams] = useSearchParams()

  const search = searchParams.get('search') ?? ''
  const page = Number(searchParams.get('page')) || 1

  const apiParams = useMemo(
    () => ({
      page,
      ...(search ? { search } : {}),
    }),
    [search, page],
  )

  const fetchInvoices = useCallback(() => staffInvoices.list(apiParams), [apiParams])
  const { data, meta, error, isLoading, refetch } = useApi(fetchInvoices)

  const invoices = Array.isArray(data) ? data : []
  const currentPage = meta?.page ?? page
  const lastPage = meta?.last_page ?? 1
  const hasFilters = Boolean(search)

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-bold text-slate-800">Invoices</h1>
        <p className="mt-1 text-sm text-slate-500">Billing documents generated when payments are verified.</p>
        <div className="mt-8">
          <LoadingState label="Loading invoices…" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-bold text-slate-800">Invoices</h1>
        <p className="mt-1 text-sm text-slate-500">Billing documents generated when payments are verified.</p>
        <div className="mt-8">
          <ErrorState
            error={error}
            fallback="We couldn't load the invoices. Please try again."
            onRetry={refetch}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold text-slate-800">Invoices</h1>
      <p className="mt-1 text-sm text-slate-500">Billing documents generated when payments are verified.</p>

      <div className="mt-6 w-full sm:w-64">
        <SearchBar
          value={search}
          onChange={(value) => commitParams(setSearchParams, { search: value || undefined, page: 1 })}
          placeholder="Search by booking #, name, or email"
        />
      </div>

      {invoices.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No invoices found"
            message={
              hasFilters
                ? 'No invoices match your filters.'
                : 'There are no invoices yet.'
            }
            action={
              hasFilters ? (
                <button type="button" className="btn-outline" onClick={() => commitParams(setSearchParams, CLEARED_FILTERS)}>
                  Clear all filters
                </button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <>
          <div className="mt-8 space-y-3">
            {invoices.map((invoice) => (
              <InvoiceCard key={invoice.id} invoice={invoice} />
            ))}
          </div>
          {lastPage > 1 && (
            <div className="mt-10">
              <Pagination currentPage={currentPage} lastPage={lastPage} onPageChange={(nextPage) => commitParams(setSearchParams, { page: nextPage })} />
            </div>
          )}
        </>
      )}
    </div>
  )
}