import { memo } from 'react'
import { Link } from 'react-router-dom'

export default memo(function RoomTypeCard({ roomType, canManage }) {
  const { id, name, description, base_price, capacity_adults, capacity_children, amenities } = roomType

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-lg font-semibold text-slate-800">{name}</h3>
        <p className="text-sm text-slate-500">
          <span className="text-lg font-bold text-slate-900">{base_price}</span> / night
        </p>
      </div>

      {description && <p className="mt-2 line-clamp-3 flex-1 text-sm text-slate-500">{description}</p>}

      <div className="mt-4 flex items-center gap-4 text-sm text-slate-600">
        <span>
          {capacity_adults} {capacity_adults === 1 ? 'adult' : 'adults'}
        </span>
        {capacity_children > 0 && (
          <span>
            {capacity_children} {capacity_children === 1 ? 'child' : 'children'}
          </span>
        )}
      </div>

      {Array.isArray(amenities) && amenities.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {amenities.slice(0, 4).map((amenity) => (
            <span key={amenity} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs capitalize text-slate-600">
              {amenity}
            </span>
          ))}
          {amenities.length > 4 && (
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500">
              +{amenities.length - 4}
            </span>
          )}
        </div>
      )}

      {canManage && (
        <div className="mt-6 flex items-center gap-4 border-t border-slate-100 pt-4">
          <Link to={`/staff/room-types/${id}/edit`} className="text-sm font-medium text-brand-600 hover:text-brand-700">
            Edit
          </Link>
          <Link to={`/staff/room-types/${id}/images`} className="text-sm font-medium text-brand-600 hover:text-brand-700">
            Images
          </Link>
        </div>
      )}
    </div>
  )
})

