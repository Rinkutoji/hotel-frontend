import { memo } from 'react'
import { centsToMoney, moneyToCents, nightsBetween } from '../../utils/booking'

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString()
}

/**
 * Shared booking summary box. Rendered by the booking checkout (preview,
 * authoritative server prices from the availability check) and the booking
 * detail page (the persisted booking snapshot).
 *
 * `items` = [{ id, roomNumber, floor, price, roomTypeName, discount }]
 * `total` = authoritative backend total when provided (decimal:2 string);
 *           otherwise the preview is computed from the items.
 * `discount` = booking-level transient discount disclosure (create response
 *           only, STEP 17 D-4) when actually returned by the backend.
 */
export default memo(function BookingSummary({ checkInDate, checkOutDate, items, total, discount }) {
  const nights = nightsBetween(checkInDate, checkOutDate)
  const rows = Array.isArray(items) ? items : []

  const computedTotal = centsToMoney(
    rows.reduce((sum, item) => {
      const price = item.discount?.discounted_price_per_night ?? item.price
      return sum + moneyToCents(price) * nights
    }, 0),
  )

  const isEstimated = total === undefined || total === null
  const shownTotal = isEstimated ? computedTotal : total

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
        <p className="text-sm font-semibold text-slate-800">Booking summary</p>
      </div>

      <div className="px-5 py-4">
        <dl className="grid gap-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Check-in</dt>
            <dd className="mt-0.5 font-medium text-slate-800">{formatDate(checkInDate)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Check-out</dt>
            <dd className="mt-0.5 font-medium text-slate-800">{formatDate(checkOutDate)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Nights</dt>
            <dd className="mt-0.5 font-medium text-slate-800">
              {Number.isFinite(nights) ? `${nights} ${nights === 1 ? 'night' : 'nights'}` : '—'}
            </dd>
          </div>
        </dl>

        {rows.length > 0 && (
          <ul className="mt-5 space-y-3">
            {rows.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    Room {item.roomNumber ?? '—'}
                    {item.roomTypeName ? ` · ${item.roomTypeName}` : ''}
                  </p>
                  {item.floor != null && <p className="mt-0.5 text-xs text-slate-500">Floor {item.floor}</p>}
                  {item.discount && (
                    <p className="mt-1 text-xs font-medium text-green-700">
                      {item.discount.discounted_price_per_night}/night with {item.discount.name} (
                      {item.discount.percent_off}% off)
                    </p>
                  )}
                </div>
                <p className="text-sm font-medium text-slate-700">
                  <span className="text-base font-bold text-slate-900">{item.discount?.discounted_price_per_night ?? item.price}</span>{' '}
                  / night
                </p>
              </li>
            ))}
          </ul>
        )}

        {discount && (
          <div className="mt-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm">
            <p className="font-semibold text-green-800">
              Discount applied: {discount.name} ({discount.percent_off}% off)
            </p>
            {(discount.total_after_discount || discount.saved_total) && (
              <p className="mt-1 text-green-700">
                Total after discount: <span className="font-bold">{discount.total_after_discount}</span>
                {discount.saved_total ? <span className="ml-2 text-green-600">You saved {discount.saved_total}</span> : null}
              </p>
            )}
          </div>
        )}

        <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4">
          <p className="text-sm font-medium text-slate-500">
            {isEstimated ? 'Estimated total' : 'Total'}
          </p>
          <p className="text-xl font-bold text-slate-900">{shownTotal}</p>
        </div>
      </div>
    </div>
  )
})

