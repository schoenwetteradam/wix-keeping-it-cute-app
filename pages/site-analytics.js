import { useState, useEffect } from 'react'
import Head from 'next/head'
import useRequireSupabaseAuth from '../utils/useRequireSupabaseAuth'
import useRequireRole from '../utils/useRequireRole'
import { fetchWithAuth } from '../utils/api'

// Basic analytics metrics derived from the local database
const MEASUREMENTS = [
  'TOTAL_SESSIONS',
  'TOTAL_UNIQUE_VISITORS',
  'TOTAL_ORDERS',
  'TOTAL_SALES'
]

export default function SiteAnalytics() {
  useRequireSupabaseAuth()
  const unauthorized = useRequireRole(['admin'])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selected, setSelected] = useState(['TOTAL_SESSIONS'])
  const [data, setData] = useState([])
  const [error, setError] = useState('')

  const loadData = async () => {
    if (unauthorized) return
    try {
      setError('')
      const params = new URLSearchParams()
      if (startDate) params.append('date_range.start_date', startDate)
      if (endDate) params.append('date_range.end_date', endDate)
      selected.forEach((m) => params.append('measurement_types', m))
      const res = await fetchWithAuth(`/api/get-site-analytics?${params.toString()}`)
      if (!res.ok) {
        const err = await res.text()
        throw new Error(err)
      }
      const json = await res.json()
      setData(json.data || [])
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    if (unauthorized) return
    loadData()
  }, [unauthorized])

  const toggleMeasurement = (m) => {
    setSelected((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]))
  }

  if (unauthorized) return <div>Not authorized</div>

  return (
    <>
      <Head>
        <title>Site Analytics</title>
      </Head>
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <h1>Site Analytics</h1>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ marginRight: '10px' }}>
            Start Date:
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>
          <label style={{ marginRight: '10px' }}>
            End Date:
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </label>
        </div>
        <div style={{ marginBottom: '20px' }}>
          {MEASUREMENTS.map((m) => (
            <label key={m} style={{ marginRight: '15px' }}>
              <input type="checkbox" checked={selected.includes(m)} onChange={() => toggleMeasurement(m)} />{' '}
              {m}
            </label>
          ))}
        </div>
        <button onClick={loadData} style={{ padding: '8px 16px', marginBottom: '20px' }}>
          Run Query
        </button>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {data.map((item) => (
          <div key={item.type} style={{ marginBottom: '20px' }}>
            <h3>{item.type}</h3>
            <p>Total: {item.total}</p>
            <table border="1" cellPadding="5" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {item.values.map((v) => (
                  <tr key={v.date}>
                    <td>{v.date}</td>
                    <td>{v.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </>
  )
}
