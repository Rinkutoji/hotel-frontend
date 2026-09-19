import { memo, useState } from 'react'
import { Link } from 'react-router-dom'
import RoomStatusBadge from './RoomStatusBadge'

const TRANSITION_ACTIONS = {
  available: { key: 'available', label: 'Mark for maintenance', heading: 'Mark this room for maintenance?' },
  maintenance: { key: 'maintenance', label: 'Mark available', heading: 'Mark this room available?' },
}

export default memo(function RoomCard({ room, canManage, busy, onTransition, onDelete }) {
  const { id, room_number, room_type, floor, status } = room
  const [confirmMode, setConfirmMode] = useState(null)
  const [reason, setReason] = useState('')

  const transition = TRANSITION_ACTIONS[status]

  const closeConfirm = () => {
    setConfirmMode(null)
    setReason('')
  }

  const handleConfirm = () => {
    if (confirmMode === 'transition') {
      onTransition(id, status, reason.trim() || undefined)
    } else if (confirmMode === 'delete') {
      onDelete(id)
    }
    closeConfirm()
  }

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-slate-800">Room {room_number}</h3>
          <p className="mt-1 text-sm text-slate-500">
            {room_type?.name ?? 'No room type'} · Floor {floor}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <RoomStatusBadge status={status} />
          {canManage && (
            <Link to={`/staff/rooms/${id}/edit`} className="text-sm font-medium text-brand-600 hover:text-brand-700">
              Edit
            </Link>
          )}
        </div>
      </div>

      {(transition || canManage) && (
        <div className="mt-4 flex flex-wrap gap-3 border-t border-slate-100 pt-4">
          {transition && (
            <button
              type="button"
              className="btn-outline"
              disabled={busy}
              onClick={() => setConfirmMode('transition')}
            >
              {transition.label}
            </button>
          )}
          {canManage && (
            <button
              type="button"
              className="btn-danger-ghost"
              disabled={busy}
              onClick={() => setConfirmMode('delete')}
            >
              Delete room
            </button>
          )}
        </div>
      )}

      {confirmMode === 'transition' && transition && (
        <form
          className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
          onSubmit={(e) => {
            e.preventDefault()
            handleConfirm()
          }}
        >
          <p className="text-sm font-medium text-slate-800">{transition.heading}</p>
          {status === 'available' && (
            <div>
              <label htmlFor={`room-${id}-reason`} className="label">
                Reason (optional)
              </label>
              <input
                id={`room-${id}-reason`}
                type="text"
                className="input"
                maxLength={255}
                placeholder="Why is this room being maintained?"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" className="btn-primary" disabled={busy}>
              Confirm
            </button>
            <button type="button" className="btn-outline" disabled={busy} onClick={closeConfirm}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {confirmMode === 'delete' && (
        <form
          className="mt-4 space-y-3 rounded-lg border border-red-200 bg-red-50 p-4"
          onSubmit={(e) => {
            e.preventDefault()
            handleConfirm()
          }}
        >
          <p className="text-sm font-medium text-red-800">Delete room {room_number}?</p>
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

