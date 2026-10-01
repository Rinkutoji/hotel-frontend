import { useCallback, useEffect, useRef, useState } from 'react'
import { staffProperties } from '../api/propertyApi'

/**
 * Property list state for the staff properties page. Mirrors the
 * useDashboardOverview pattern: a monotonically increasing request
 * sequence discards stale responses, and `loading` is derived from the
 * last settled params key so a filter change flips the page back to its
 * skeleton without a sync setState in the effect.
 */
export default function useProperties(params = {}) {
  const [properties, setProperties] = useState(null)
  const [meta, setMeta] = useState(null)
  const [error, setError] = useState(null)
  const [settledKey, setSettledKey] = useState(null)

  const seqRef = useRef(0)
  const inFlightRef = useRef(false)
  const paramsRef = useRef(params)

  const paramsKey = JSON.stringify(params)

  const loading = settledKey === null || settledKey !== paramsKey

  const fetchData = useCallback(async () => {
    const seq = ++seqRef.current
    inFlightRef.current = true
    try {
      const res = await staffProperties.list(paramsRef.current)
      return {
        current: seq === seqRef.current,
        data: res.data?.data ?? null,
        meta: res.data?.meta ?? null,
        error: null,
      }
    } catch (err) {
      return { current: seq === seqRef.current, data: null, meta: null, error: err }
    }
  }, [])

  const run = useCallback(async () => {
    const { current, data, meta: listMeta, error: fetchError } = await fetchData()
    if (!current) return
    if (fetchError) {
      setError(fetchError)
    } else {
      setProperties(data)
      setMeta(listMeta)
      setError(null)
    }
    inFlightRef.current = false
  }, [fetchData])

  useEffect(() => {
    paramsRef.current = JSON.parse(paramsKey)
    let active = true
    fetchData().then(({ current, data, meta: listMeta, error: fetchError }) => {
      if (!active || !current) return
      if (fetchError) {
        setError(fetchError)
      } else {
        setProperties(data)
        setMeta(listMeta)
        setError(null)
      }
      inFlightRef.current = false
      setSettledKey(paramsKey)
    })
    return () => {
      active = false
    }
  }, [paramsKey, fetchData])

  const refetch = useCallback(() => {
    if (inFlightRef.current) return
    return run()
  }, [run])

  return { properties, meta, loading, error, refetch }
}
