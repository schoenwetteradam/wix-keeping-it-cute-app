import { useEffect, useState } from 'react'
import { useWixSync } from '../hooks/useWixSync'

export default function SyncDashboard() {
  const { processing, processPending, retryFailed } = useWixSync()
  const [stats, setStats] = useState({ pending: 0, failed: 0, recent: [] })

  const loadStats = async () => {
    const res = await fetch('/api/sync/process')
    if (res.ok) {
      const json = await res.json()
      setStats(json)
    }
  }

  useEffect(() => {
    loadStats()
  }, [])

  return (
    <div>
      <h2>Wix Sync Dashboard</h2>
      <p>Pending: {stats.pending}</p>
      <p>Failed: {stats.failed}</p>
      <button onClick={processPending} disabled={processing}>Process Pending</button>
      <button onClick={retryFailed} disabled={processing}>Retry Failed</button>
      <h3>Recent Operations</h3>
      <ul>
        {stats.recent.map(op => (
          <li key={op.id}>{op.entity_type} {op.operation_type} - {op.status}</li>
        ))}
      </ul>
    </div>
  )
}
