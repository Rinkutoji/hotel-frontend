import { useCallback, useEffect, useState } from 'react'

export default function useApi(fetcher) {
  const [state, setState] = useState({ data: null, meta: null, error: null, isLoading: true })

  useEffect(() => {
    let active = true
    fetcher()
      .then((res) => {
        if (!active) return
        const payload = res.data ?? {}
        setState({ isLoading: false, error: null, data: payload.data ?? null, meta: payload.meta ?? null })
      })
      .catch((err) => {
        if (!active) return
        setState({ isLoading: false, error: err, data: null, meta: null })
      })
    return () => {
      active = false
    }
  }, [fetcher])

  const refetch = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }))
      const res = await fetcher()
      const payload = res.data ?? {}
      setState({ isLoading: false, error: null, data: payload.data ?? null, meta: payload.meta ?? null })
      return payload
    } catch (err) {
      setState({ isLoading: false, error: err, data: null, meta: null })
      return null
    }
  }, [fetcher])

  return { ...state, refetch }
}