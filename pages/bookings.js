import { useState, useEffect } from 'react'
import useRequireSupabaseAuth from '../utils/useRequireSupabaseAuth'
import { fetchWithAuth } from '../utils/api'

export default function BookingsPage() {
  useRequireSupabaseAuth()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadBookings = async () => {
    setLoading(true)
    try {
      const res = await fetchWithAuth('/api/get-appointments')
      if (!res.ok) throw new Error('Failed to load bookings')
      const data = await res.json()
      setBookings(data.appointments || [])
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBookings()
  }, [])

  const completeBooking = async (b) => {
    if (!confirm('Mark this booking completed?')) return
    try {
      const res = await fetchWithAuth(`/api/complete-booking/${b.id}`, { method: 'POST' })
      if (!res.ok) throw new Error('Complete failed')
      setBookings(bookings.map(a => a.id === b.id ? { ...a, status: 'completed' } : a))
    } catch (err) {
      alert('Failed to mark completed')
      console.error('Complete error:', err)
    }
  }

  const cancelBooking = async (b) => {
    if (!confirm('Cancel this booking?')) return
    try {
      const res = await fetchWithAuth(`/api/cancel-booking/${b.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revision: b.revision })
      })
      if (!res.ok) throw new Error('Cancel failed')
      setBookings(bookings.map(a => a.id === b.id ? { ...a, status: 'canceled' } : a))
    } catch (err) {
      alert('Failed to cancel booking')
      console.error('Cancel error:', err)
    }
  }

  const rescheduleBooking = async (b) => {
    const newStart = prompt('New start time (YYYY-MM-DDTHH:MM)', b.appointment_date?.slice(0,16) || '')
    if (!newStart) return
    const newEnd = prompt('New end time (YYYY-MM-DDTHH:MM)', b.end_time?.slice(0,16) || '')
    if (!newEnd) return
    try {
      const res = await fetchWithAuth(`/api/reschedule-booking/${b.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: new Date(newStart).toISOString(),
          endDate: new Date(newEnd).toISOString(),
          revision: b.revision
        })
      })
      if (!res.ok) throw new Error('Reschedule failed')
      const data = await res.json()
      setBookings(bookings.map(a => a.id === b.id ? { ...a, appointment_date: newStart, end_time: newEnd, revision: data.booking?.revision || a.revision } : a))
    } catch (err) {
      alert('Failed to reschedule booking')
      console.error('Reschedule error:', err)
    }
  }

  const markPaid = async (b) => {
    if (!confirm('Mark this booking paid?')) return
    try {
      const res = await fetchWithAuth(`/api/mark-booking-paid/${b.id}`, { method: 'POST' })
      if (!res.ok) throw new Error('Mark paid failed')
      setBookings(bookings.map(a => a.id === b.id ? { ...a, payment_status: 'paid' } : a))
    } catch (err) {
      alert('Failed to mark paid')
      console.error('Mark paid error:', err)
    }
  }

  if (loading) return <p style={{padding:'20px'}}>Loading bookings...</p>
  if (error) return <p style={{padding:'20px',color:'red'}}>Error: {error}</p>

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ marginBottom: '20px' }}>Bookings</h1>
      {bookings.length === 0 ? (
        <p>No bookings found.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>Customer</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>Service</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>Time</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>Payment</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>Status</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map(b => (
              <tr key={b.id} style={{ borderBottom: '1px solid #eee' }}>
                <td>{b.customer_name || 'Customer'}</td>
                <td>{b.service_name || 'Service'}</td>
                <td>{b.appointment_date ? new Date(b.appointment_date).toLocaleString() : ''}</td>
                <td>{b.payment_status || 'pending'}</td>
                <td>{b.status}</td>
                <td>
                  <button onClick={() => completeBooking(b)} style={{ marginRight: '6px' }}>Complete</button>
                  <button onClick={() => cancelBooking(b)} style={{ marginRight: '6px' }}>Cancel</button>
                  <button onClick={() => rescheduleBooking(b)} style={{ marginRight: '6px' }}>Reschedule</button>
                  {b.payment_status !== 'paid' && (
                    <button onClick={() => markPaid(b)} style={{ marginRight: '6px' }}>Mark Paid</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
