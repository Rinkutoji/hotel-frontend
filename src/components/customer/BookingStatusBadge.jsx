import { memo } from 'react'
const STATUS_LABELS = {
  pending_payment: 'Pending payment',
  confirmed: 'Confirmed',
  checked_in: 'Checked in',
  checked_out: 'Checked out',
  cancelled: 'Cancelled',
  no_show: 'No show',
}

const STATUS_STYLES = {
  pending_payment: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  checked_in: 'bg-blue-100 text-blue-800',
  checked_out: 'bg-slate-200 text-slate-700',
  cancelled: 'bg-red-100 text-red-800',
  no_show: 'bg-purple-100 text-purple-700',
}

export default memo(function BookingStatusBadge({ status }) {
  const label = STATUS_LABELS[status] ?? status
  const className = STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-700'
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>{label}</span>
})

