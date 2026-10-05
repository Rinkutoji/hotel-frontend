import { useCallback, useEffect, useRef, useState } from 'react'
import analyticsApi from '../api/analyticsApi'

export const AUTO_REFRESH_MS = 30000

/**
 * Single source of truth for the analytics page state. Fetches the whole
 * dashboard feed whenever the window/granularity change (full load), then
 * silently refreshes every 30s and on user clicks.
 *
 * A monotonically increasing request sequence guards against stale
 * responses: if a refresh resolves after the window has changed (or after
 * a newer request started), its result is discarded instead of clobbering
 * the current view.
 */
export default function useAnalytics({ from, to, groupBy = 'day', propertyId, buildingId, roomTypeId }) {
  const [analytics, setAnalytics] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [settledParams, setSettledParams] = useState(null)

  const seqRef = useRef(0)
  const inFlightRef = useRef(false)
  const paramsRef = useRef({
    from,
    to,
    group_by: groupBy,
    ...(propertyId ? { property_id: propertyId } : {}),
    ...(buildingId ? { building_id: buildingId } : {}),
    ...(roomTypeId ? { room_type_id: roomTypeId } : {}),
  })

  const loading =
    settledParams === null ||
    settledParams.from !== from ||
    settledParams.to !== to ||
    settledParams.groupBy !== groupBy ||
    settledParams.propertyId !== propertyId ||
    settledParams.buildingId !== buildingId ||
    settledParams.roomTypeId !== roomTypeId

  const fetchData = useCallback(async () => {
    const seq = ++seqRef.current
    inFlightRef.current = true
    try {
      const res = await analyticsApi.get(paramsRef.current)
      return { current: seq === seqRef.current, data: res.data?.data ?? null, error: null }
    } catch (err) {
      return { current: seq === seqRef.current, data: null, error: err }
    }
  }, [])

  const run = useCallback(async () => {
    const { current, data, error: fetchError } = await fetchData()
    if (!current) return
    if (fetchError) {
      setError(fetchError)
    } else {
      setAnalytics(data)
      setError(null)
      setLastUpdated(new Date())
    }
    inFlightRef.current = false
    setRefreshing(false)
  }, [fetchData])

  useEffect(() => {
    paramsRef.current = {
      from,
      to,
      group_by: groupBy,
      ...(propertyId ? { property_id: propertyId } : {}),
      ...(buildingId ? { building_id: buildingId } : {}),
      ...(roomTypeId ? { room_type_id: roomTypeId } : {}),
    }
    let active = true
    fetchData().then(({ current, data, error: fetchError }) => {
      if (!active || !current) return
      if (fetchError) {
        setError(fetchError)
      } else {
        setAnalytics(data)
        setError(null)
        setLastUpdated(new Date())
      }
      inFlightRef.current = false
      setRefreshing(false)
      setSettledParams({ from, to, groupBy, propertyId, buildingId, roomTypeId })
    })
    return () => {
      active = false
    }
  }, [from, to, groupBy, propertyId, buildingId, roomTypeId, fetchData])

  useEffect(() => {
    const id = setInterval(() => {
      if (inFlightRef.current) return
      setRefreshing(true)
      run()
    }, AUTO_REFRESH_MS)
    return () => clearInterval(id)
  }, [run])

  const refetch = useCallback(() => {
    if (inFlightRef.current) return
    setRefreshing(true)
    return run()
  }, [run])

  return { analytics, loading, refreshing, error, lastUpdated, refetch }
}
