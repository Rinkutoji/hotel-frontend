import { useCallback, useEffect, useRef, useState } from 'react'
import { dashboard } from '../api/dashboardApi'

export const DASHBOARD_GROUPS = [
  'bookings',
  'payments',
  'occupancy',
  'invoices',
  'recentBookings',
  'recentPayments',
]

function createInitialState() {
  return Object.fromEntries(
    DASHBOARD_GROUPS.map((key) => [key, { data: null, error: null, loading: true }]),
  )
}

export default function useDashboard() {
  const [groups, setGroups] = useState(createInitialState)
  const inFlight = useRef({})

  const loadGroup = useCallback(async (key) => {
    inFlight.current[key] = true
    setGroups((prev) => ({ ...prev, [key]: { ...prev[key], loading: true, error: null } }))
    try {
      const data = await dashboard[key]()
      if (!inFlight.current[key]) return
      setGroups((prev) => ({ ...prev, [key]: { data, error: null, loading: false } }))
    } catch (err) {
      if (!inFlight.current[key]) return
      setGroups((prev) => ({ ...prev, [key]: { data: null, error: err, loading: false } }))
    } finally {
      inFlight.current[key] = false
    }
  }, [])

  useEffect(() => {
    DASHBOARD_GROUPS.forEach((key) => loadGroup(key))
    return () => {
      inFlight.current = {}
    }
  }, [loadGroup])

  const refetch = useCallback((key) => loadGroup(key), [loadGroup])

  const refetchAll = useCallback(() => {
    DASHBOARD_GROUPS.forEach((key) => loadGroup(key))
  }, [loadGroup])

  return { groups, refetch, refetchAll }
}