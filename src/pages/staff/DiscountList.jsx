import { useCallback, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { staffDiscounts } from '../../api/discountApi'
import useApi from '../../hooks/useApi'
import DiscountCard from '../../components/staff/DiscountCard'
import SearchBar from '../../components/customer/SearchBar'
import Pagination from '../../components/customer/Pagination'
import LoadingState from '../../components/common/LoadingState'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import ErrorMessage from '../../components/common/ErrorMessage'

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

export default function DiscountList() {
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

  const fetchDiscounts = useCallback(() => staffDiscounts.list(apiParams), [apiParams])
  const { data, meta, error, isLoading, refetch } = useApi(fetchDiscounts)

  const [running, setRunning] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [actionMessage, setActionMessage] = useState(null)

  const performAction = async (key, request, successMessage) => {
    if (running) return
    setRunning(key)
    setActionError(null)
    try {
      await request()
      setActionMessage(successMessage)
      await refetch()
    } catch (err) {
      setActionError(err)
      if (err?.response?.status === 409 || err?.response?.status === 403) {
        await refetch()
      }
    } finally {
      setRunning(null)
    }
  }

  const handleDelete = (discountId) =>
    performAction(`delete-${discountId}`, () => staffDiscounts.destroy(discountId), 'Discount deleted.')

  const discounts = Array.isArray(data) ? data : []
  const currentPage = meta?.page ?? page
  const lastPage = meta?.last_page ?? 1
  const hasFilters = Boolean(search)
  const busy = running !== null

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-bold text-slate-800">Discounts</h1>
        <p className="mt-1 text-sm text-slate-500">Length-of-stay pricing tiers applied at booking time.</p>
        <div className="mt-8">
          <LoadingState label="Loading discounts…" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-bold text-slate-800">Discounts</h1>
        <p className="mt-1 text-sm text-slate-500">Length-of-stay pricing tiers applied at booking time.</p>
        <div className="mt-8">
          <ErrorState
            error={error}
            fallback="We couldn't load the discounts. Please try again."
            onRetry={refetch}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Discounts</h1>
          <p className="mt-1 text-sm text-slate-500">Length-of-stay pricing tiers applied at booking time.</p>
        </div>
        <Link to="/staff/discounts/new" className="btn-primary">
          New discount
        </Link>
      </div>

      <div className="mt-6 w-full sm:w-64">
        <SearchBar
          value={search}
          onChange={(value) => commitParams(setSearchParams, { search: value || undefined, page: 1 })}
          placeholder="Search discounts by name"
        />
      </div>

      <div className="mt-6 space-y-3">
        {actionMessage && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800" role="status">
            {actionMessage}
          </div>
        )}
        {actionError && <ErrorMessage error={actionError} fallback="The action could not be completed. Please try again." />}
      </div>

      {discounts.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No discounts found"
            message={hasFilters ? 'No discounts match your filters.' : 'There are no discounts yet.'}
            action={hasFilters ? (
              <button type="button" className="btn-outline" onClick={() => commitParams(setSearchParams, CLEARED_FILTERS)}>
                Clear all filters
              </button>
            ) : undefined}
          />
        </div>
      ) : (
        <>
          <div className="mt-8 space-y-3">
            {discounts.map((discount) => (
              <DiscountCard
                key={discount.id}
                discount={discount}
                busy={busy}
                onDelete={handleDelete}
              />
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