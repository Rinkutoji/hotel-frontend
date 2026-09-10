import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { act } from 'react'
import useApi from '../hooks/useApi'

const payload = (items, meta = { page: 1, per_page: 15, total: 1, last_page: 1 }) => ({
  data: { data: items, meta },
})

describe('useApi', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('starts loading then returns data', async () => {
    const fetcher = vi.fn().mockResolvedValue(payload([{ id: 1 }]))
    const { result } = renderHook(() => useApi(fetcher))

    expect(result.current.isLoading).toBe(true)
    expect(result.current.data).toBeNull()
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toEqual([{ id: 1 }])
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('exposes pagination meta', async () => {
    const meta = { page: 2, per_page: 12, total: 30, last_page: 3 }
    const fetcher = vi.fn().mockResolvedValue(payload([{ id: 2 }], meta))
    const { result } = renderHook(() => useApi(fetcher))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.meta).toEqual(meta)
  })

  it('returns an error and clears data on failure', async () => {
    const error = new Error('Network failure')
    const fetcher = vi.fn().mockRejectedValue(error)
    const { result } = renderHook(() => useApi(fetcher))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.error).toBe(error)
    expect(result.current.data).toBeNull()
  })

  it('refetches when the fetcher identity changes', async () => {
    const first = vi.fn().mockResolvedValue(payload([{ id: 1 }]))
    const second = vi.fn().mockResolvedValue(payload([{ id: 2 }]))
    const { result, rerender } = renderHook(({ fn }) => useApi(fn), { initialProps: { fn: first } })

    await waitFor(() => expect(result.current.data).toEqual([{ id: 1 }]))

    rerender({ fn: second })
    await waitFor(() => expect(result.current.data).toEqual([{ id: 2 }]))
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('refetch re-runs the fetch and updates data', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(payload([{ id: 1 }]))
      .mockResolvedValueOnce(payload([{ id: 3 }]))

    const { result } = renderHook(() => useApi(fetcher))
    await waitFor(() => expect(result.current.data).toEqual([{ id: 1 }]))

    await act(async () => {
      await result.current.refetch()
    })
    expect(result.current.data).toEqual([{ id: 3 }])
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})