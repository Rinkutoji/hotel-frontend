import { memo } from 'react'
const STATUS_LABELS = {
  available: 'Available',
  reserved: 'Reserved',
  occupied: 'Occupied',
  cleaning: 'Cleaning',
  maintenance: 'Maintenance',
}

const STATUS_STYLES = {
  available: 'bg-green-100 text-green-800',
  reserved: 'bg-yellow-100 text-yellow-800',
  occupied: 'bg-red-100 text-red-800',
  cleaning: 'bg-blue-100 text-blue-800',
  maintenance: 'bg-slate-200 text-slate-700',
}

export default memo(function RoomStatusBadge({ status }) {
  const label = STATUS_LABELS[status] ?? status
  const className = STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-700'
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>{label}</span>
})

