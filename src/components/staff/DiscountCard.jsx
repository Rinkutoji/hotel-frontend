import { memo, useState } from 'react'
import { Link } from 'react-router-dom'

export default memo(function DiscountCard({ discount, busy, onDelete }) {
  const { id, name, min_nights, percent_off } = discount
  const [confirmOpen, setConfirmOpen] = useState(false)

  const nightsLabel = min_nights === 1 ? 'From 1 night' : `From ${min_nights} nights`

  const closeConfirm = () => setConfirmOpen(false)

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-slate-800">{name}</h3>
          <p className="mt-1 text-sm text-slate-500">{nightsLabel}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <p className="text-lg font-bold text-slate-900">{percent_off}%</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 border-t border-slate-100 pt-4">
        <Link
          to={`/staff/discounts/${id}/edit`}
          className="text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          Edit
        </Link>
        <button
          type="button"
          className="btn-danger-ghost"
          disabled={busy}
          onClick={() => setConfirmOpen((value) => !value)}
        >
          Delete
        </button>
      </div>

      {confirmOpen && (
        <form
          className="mt-4 space-y-3 rounded-lg border border-red-200 bg-red-50 p-4"
          onSubmit={(e) => {
            e.preventDefault()
            onDelete(id)
            closeConfirm()
          }}
        >
          <p className="text-sm font-medium text-red-800">Delete discount “{name}”?</p>
          <p className="text-sm text-red-700">This cannot be undone.</p>
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" className="btn-danger" disabled={busy}>
              Confirm delete
            </button>
            <button type="button" className="btn-outline" disabled={busy} onClick={closeConfirm}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
})

