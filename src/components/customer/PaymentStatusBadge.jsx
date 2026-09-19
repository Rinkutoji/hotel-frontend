import { memo } from 'react'
const PAYMENT_STATUS_LABELS = {
  pending: 'Pending',
  receipt_uploaded: 'Receipt Uploaded',
  verified: 'Verified',
  rejected: 'Rejected',
  refunded: 'Refunded',
}

const PAYMENT_STATUS_STYLES = {
  pending: 'bg-yellow-100 text-yellow-800',
  receipt_uploaded: 'bg-blue-100 text-blue-800',
  verified: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  refunded: 'bg-slate-200 text-slate-700',
}

export default memo(function PaymentStatusBadge({ status }) {
  const label = PAYMENT_STATUS_LABELS[status] ?? status
  const className = PAYMENT_STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-700'
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>{label}</span>
})

