const STATUS_STYLES = {
  available: 'bg-green-100 text-green-800',
  reserved: 'bg-yellow-100 text-yellow-800',
  occupied: 'bg-red-100 text-red-800',
  cleaning: 'bg-blue-100 text-blue-800',
  maintenance: 'bg-slate-200 text-slate-700',
}

export default function RoomCard({ room }) {
  const { room_number, floor, status, room_type } = room
  const statusClass = STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-700'

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex h-10 items-center justify-between bg-slate-900 px-4">
        <p className="text-sm font-semibold text-white">Room {room_number}</p>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusClass}`}>{status}</span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex h-32 items-center justify-center rounded-lg bg-slate-100">
          <svg className="h-8 w-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9V7a2 2 0 00-2-2H7a2 2 0 00-2 2v2m14 0H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0a2 2 0 00-2-2H7a2 2 0 00-2 2"
            />
          </svg>
        </div>
        <div className="mt-4 space-y-1 text-sm text-slate-600">
          <p>Floor: {floor}</p>
          {room_type && <p>Type: {room_type.name}</p>}
        </div>
        {room_type && (
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
            <p className="text-sm text-slate-500">
              <span className="text-base font-bold text-slate-900">{room_type.base_price}</span> / night
            </p>
            {status === 'available' && (
              <span className="text-xs font-medium text-green-700">Available now</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}