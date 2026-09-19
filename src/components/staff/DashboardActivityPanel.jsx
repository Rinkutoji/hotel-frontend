import { Link } from 'react-router-dom'
import EmptyState from '../common/EmptyState'

export default function DashboardActivityPanel({ title, viewAllTo, viewAllLabel, rows, emptyTitle, emptyMessage }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        {viewAllTo && (
          <Link to={viewAllTo} className="text-sm font-medium text-brand-600 hover:text-brand-700">
            {viewAllLabel} →
          </Link>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="mt-4">
          <EmptyState title={emptyTitle} message={emptyMessage} />
        </div>
      ) : (
        <ul className="mt-2 divide-y divide-slate-100">{rows}</ul>
      )}
    </section>
  )
}