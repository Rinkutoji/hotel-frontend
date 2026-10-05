import { useCallback, useMemo } from 'react'
import useApi from './useApi'
import { staffReports } from '../api/reportApi'

/**
 * STEP 18 / D-1 - orchestration for the three report endpoints. Each
 * section keeps its own useApi state so one failing endpoint shows an
 * isolated error while the others render. Params are split per endpoint
 * because the backend shape differs: bookings accepts status, revenue
 * accepts group_by, rooms accepts only a from/to window.
 */
export default function useReportSummary({
  from,
  to,
  groupBy = 'day',
  status,
  propertyId,
  buildingId,
  roomTypeId,
} = {}) {
  const commonParams = useMemo(
    () => ({
      from,
      to,
      ...(groupBy && groupBy !== 'day' ? { group_by: groupBy } : {}),
      ...(propertyId ? { property_id: propertyId } : {}),
      ...(buildingId ? { building_id: buildingId } : {}),
    }),
    [from, to, groupBy, propertyId, buildingId],
  )

  const bookingsParams = useMemo(
    () => ({
      ...commonParams,
      ...(status ? { status } : {}),
      ...(roomTypeId ? { room_type_id: roomTypeId } : {}),
    }),
    [commonParams, status, roomTypeId],
  )

  const bookingsFetcher = useCallback(() => staffReports.bookings(bookingsParams), [bookingsParams])
  const revenueFetcher = useCallback(() => staffReports.revenue(commonParams), [commonParams])
  const roomsFetcher = useCallback(
    () =>
      staffReports.rooms({
        from,
        to,
        ...(propertyId ? { property_id: propertyId } : {}),
        ...(buildingId ? { building_id: buildingId } : {}),
      }),
    [from, to, propertyId, buildingId],
  )

  const bookings = useApi(bookingsFetcher)
  const revenue = useApi(revenueFetcher)
  const rooms = useApi(roomsFetcher)

  const refetch = () => Promise.all([bookings.refetch(), revenue.refetch(), rooms.refetch()])

  return { bookings, revenue, rooms, refetch }
}
