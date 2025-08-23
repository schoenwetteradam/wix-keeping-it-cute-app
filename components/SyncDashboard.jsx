import { useEffect } from 'react'
import useWixSync from '../hooks/useWixSync'

export default function SyncDashboard () {
  const { pending, failed, processing, refresh, processPending, retryFailed } = useWixSync()

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <div className="p-4 border rounded">
      <h2 className="text-xl font-semibold mb-4">Wix Sync Status</h2>
      <div className="mb-2">Pending: {pending}</div>
      <div className="mb-4">Failed: {failed}</div>
      <div className="flex gap-2">
        <button className="px-3 py-1 bg-blue-500 text-white rounded" onClick={processPending} disabled={processing}>
          Process Pending
        </button>
        <button className="px-3 py-1 bg-yellow-500 text-white rounded" onClick={retryFailed} disabled={processing}>
          Retry Failed
        </button>
      </div>
    </div>
  )
}
