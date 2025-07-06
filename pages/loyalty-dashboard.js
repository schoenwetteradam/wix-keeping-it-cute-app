// pages/loyalty-dashboard.js
import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { fetchWithAuth } from '../utils/api'

export default function LoyaltyDashboard() {
  const router = useRouter()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await fetchWithAuth('/api/get-loyalty?limit=200')
      if (!res.ok) throw new Error('Failed to load loyalty records')
      const data = await res.json()
      setRecords(data.loyalty || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const updatePoints = async (record, action) => {
    const input = prompt(`How many points to ${action === 'add' ? 'add' : 'use'}?`)
    const amt = parseInt(input, 10)
    if (!amt || isNaN(amt)) return
    try {
      const res = await fetchWithAuth('/api/update-loyalty-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loyalty_id: record.id, points: amt, action })
      })
      if (res.ok) {
        await loadData()
      } else {
        alert('Failed to update points')
      }
    } catch (err) {
      alert('Failed to update points')
    }
  }

  const filtered = records.filter(r => {
    const term = searchTerm.toLowerCase()
    return (
      (r.name || '').toLowerCase().includes(term) ||
      (r.email || '').toLowerCase().includes(term)
    )
  })

  return (
    <>
      <Head>
        <title>Loyalty Dashboard - Keeping It Cute Salon</title>
      </Head>
      <div style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f8f9fa', minHeight: '100vh', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1 style={{ margin: 0 }}>💎 Loyalty Dashboard</h1>
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
        <input
          type="text"
          placeholder="Search loyalty..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px', marginBottom: '20px', width: '100%', maxWidth: '300px' }}
        />
        {loading ? (
          <p style={{ textAlign: 'center' }}>Loading loyalty...</p>
        ) : error ? (
          <p style={{ textAlign: 'center', color: 'red' }}>❌ {error}</p>
        ) : (
          <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f1f1f1', textAlign: 'left' }}>
                  <th style={{ padding: '12px' }}>Name</th>
                  <th style={{ padding: '12px' }}>Email</th>
                  <th style={{ padding: '12px' }}>Balance</th>
                  <th style={{ padding: '12px' }}>Redeemed</th>
                  <th style={{ padding: '12px' }}>Last Activity</th>
                  <th style={{ padding: '12px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} style={{ borderTop: '1px solid #eee' }}>
                    <td style={{ padding: '12px' }}>{r.name || 'N/A'}</td>
                    <td style={{ padding: '12px' }}>{r.email}</td>
                    <td style={{ padding: '12px' }}>{r.points_balance}</td>
                    <td style={{ padding: '12px' }}>{r.redeemed_points}</td>
                    <td style={{ padding: '12px' }}>{r.last_activity ? new Date(r.last_activity).toLocaleDateString() : ''}</td>
                    <td style={{ padding: '12px' }}>
                      <button onClick={() => updatePoints(r, 'add')} style={{ marginRight: '6px' }}>Add</button>
                      <button onClick={() => updatePoints(r, 'redeem')}>Use</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
