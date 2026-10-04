import { useCallback, useEffect, useRef, useState } from 'react'
import { dashboardOverview } from '../api/dashboardApi'

/**
 * Server-side hotel overview feed for the admin/manager dashboard section.
 * Fetches whenever the window/granularity change (full load) and on manual
 * refresh; unlike useAnalytics there is no 30s auto-refresh. A monotonically
 * increasing request sequence discards stale responses, and `loading` is
 * derived from the last settled params so a window change flips the section
 * back to its skeleton without a sync setState in the effect.
 */
export default function useDashboardOverview({ from, to, groupBy = 'day', propertyId }) {
  const [overview, setOverview] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [settledParams, setSettledParams] = useState(null)

  const seqRef = useRef(0)
  const inFlightRef = useRef(false)
  const paramsRef = useRef({ from, to, group_by: groupBy, ...(propertyId ? { property_id: propertyId } : {}) })

  const loading =
    settledParams === null ||
    settledParams.from !== from ||
    settledParams.to !== to ||
    settledParams.groupBy !== groupBy ||
    settledParams.propertyId !== propertyId

  const fetchData = useCallback(async () => {
    const seq = ++seqRef.current
    inFlightRef.current = true
    try {
      const res = await dashboardOverview.get(paramsRef.current)
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
      setOverview(data)
      setError(null)
      setLastUpdated(new Date())
    }
    inFlightRef.current = false
    setRefreshing(false)
  }, [fetchData])

  useEffect(() => {
    paramsRef.current = { from, to, group_by: groupBy, ...(propertyId ? { property_id: propertyId } : {}) }
    let active = true
    fetchData().then(({ current, data, error: fetchError }) => {
      if (!active || !current) return
      if (fetchError) {
        setError(fetchError)
      } else {
        setOverview(data)
        setError(null)
        setLastUpdated(new Date())
      }
      inFlightRef.current = false
      setRefreshing(false)
      setSettledParams({ from, to, groupBy, propertyId })
    })
    return () => {
      active = false
    }
  }, [from, to, groupBy, propertyId, fetchData])

  const refetch = useCallback(() => {
    if (inFlightRef.current) return
    setRefreshing(true)
    return run()
  }, [run])

  return { overview, loading, refreshing, error, lastUpdated, refetch }
}
