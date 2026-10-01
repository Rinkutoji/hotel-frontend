import { useCallback, useEffect, useRef, useState } from 'react'
import { staffProperties } from '../api/propertyApi'

/**
 * Single property detail state for the staff property form/detail pages.
 * Same pattern as useDashboardOverview — sequence-guarded fetch, loading
 * derived from the last settled id.
 */
export default function usePropertyDetail(id) {
  const [property, setProperty] = useState(null)
  const [error, setError] = useState(null)
  const [settledId, setSettledId] = useState(null)

  const seqRef = useRef(0)
  const inFlightRef = useRef(false)
  const idRef = useRef(id)

  const loading = settledId === null || settledId !== id

  const fetchData = useCallback(async () => {
    const seq = ++seqRef.current
    inFlightRef.current = true
    try {
      const res = await staffProperties.show(idRef.current)
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
      setProperty(data)
      setError(null)
    }
    inFlightRef.current = false
  }, [fetchData])

  useEffect(() => {
    idRef.current = id
    let active = true
    fetchData().then(({ current, data, error: fetchError }) => {
      if (!active || !current) return
      if (fetchError) {
        setError(fetchError)
      } else {
        setProperty(data)
        setError(null)
      }
      inFlightRef.current = false
      setSettledId(id)
    })
    return () => {
      active = false
    }
  }, [id, fetchData])

  const refetch = useCallback(() => {
    if (inFlightRef.current) return
    return run()
  }, [run])

  return { property, loading, error, refetch }
}
