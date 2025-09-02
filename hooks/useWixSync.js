import { useState, useCallback } from 'react'

export function useWixSync () {
  const [stats, setStats] = useState({ pending: 0, failed: 0 })
  const [processing, setProcessing] = useState(false)

  const refresh = useCallback(async () => {
    const res = await fetch('/api/sync/process')
    const data = await res.json()
    setStats(data)
  }, [])

  const processPending = useCallback(async () => {
    setProcessing(true)
    await fetch('/api/sync/process', { method: 'POST' })
    await refresh()
    setProcessing(false)
  }, [refresh])

  const retryFailed = useCallback(async () => {
    setProcessing(true)
    await fetch('/api/sync/retry-failed', { method: 'POST' })
    await refresh()
    setProcessing(false)
  }, [refresh])

  return {
    pending: stats.pending,
    failed: stats.failed,
    processing,
    refresh,
    processPending,
    retryFailed
  }
}

export default useWixSync
