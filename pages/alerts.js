import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { fetchWithAuth } from '../utils/api'

export default function AlertsDashboard() {
  const router = useRouter()
  const [alerts, setAlerts] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const alertsRes = await fetchWithAuth('/api/get-inventory-alerts')
      if (alertsRes.ok) {
        const data = await alertsRes.json()
        setAlerts(data.alerts || [])
      }
      const notificationsRes = await fetchWithAuth('/api/get-notifications')
      if (notificationsRes.ok) {
        const data = await notificationsRes.json()
        setNotifications(data.notifications || [])
      }
    } catch (err) {
      console.error('Failed to load alerts', err)
      setError('Failed to load alerts')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>Alerts Dashboard - Keeping It Cute Salon</title>
      </Head>
      <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1 style={{ margin: 0 }}>🚨 Alerts & Notifications</h1>
          <button
            onClick={() => router.push('/staff')}
            style={{
              background: 'linear-gradient(135deg, #e0cdbb 0%, #eee4da 100%)',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            ← Back to Staff
          </button>
        </div>
        {loading ? (
          <p style={{ textAlign: 'center' }}>Loading alerts...</p>
        ) : error ? (
          <p style={{ color: 'red', textAlign: 'center' }}>❌ {error}</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
            <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <h2 style={{ marginTop: 0 }}>Low Stock Products</h2>
              {alerts.length === 0 ? (
                <p>No products require reordering.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f3f5' }}>
                      <th style={{ textAlign: 'left', padding: '8px' }}>Product</th>
                      <th style={{ textAlign: 'right', padding: '8px' }}>Current</th>
                      <th style={{ textAlign: 'right', padding: '8px' }}>Minimum</th>
                      <th style={{ textAlign: 'right', padding: '8px' }}>Shortage</th>
                      <th style={{ textAlign: 'center', padding: '8px' }}>Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.map(alert => (
                      <tr key={alert.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '8px' }}>{alert.product_name}</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>{alert.current_stock}</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>{alert.min_threshold}</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>{alert.shortage}</td>
                        <td style={{ padding: '8px', textAlign: 'center', textTransform: 'capitalize' }}>{alert.alert_level}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <h2 style={{ marginTop: 0 }}>Other Notifications</h2>
              {notifications.length === 0 ? (
                <p>No notifications.</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {notifications.map(note => (
                    <li key={note.id} style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>
                      {note.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
