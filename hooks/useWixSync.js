import { useState } from 'react'

export function useWixSync() {
  const [processing, setProcessing] = useState(false)

  const processPending = async () => {
    setProcessing(true)
    try {
      await fetch('/api/sync/process', { method: 'POST' })
    } finally {
      setProcessing(false)
    }
  }

  const retryFailed = async () => {
    setProcessing(true)
    try {
      await fetch('/api/sync/retry-failed', { method: 'POST' })
    } finally {
      setProcessing(false)
    }
  }

  return { processing, processPending, retryFailed }
}
