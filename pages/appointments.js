import { useState, useEffect } from 'react'
import useRequireSupabaseAuth from '../utils/useRequireSupabaseAuth'
import { fetchWithAuth } from '../utils/api'

export default function AppointmentsPage() {
  useRequireSupabaseAuth()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadAppointments = async () => {
    setLoading(true)
    try {
      const res = await fetchWithAuth('/api/get-appointments')
      if (!res.ok) throw new Error('Failed to load appointments')
      const data = await res.json()
      setAppointments(data.appointments || [])
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAppointments()
  }, [])

  const completeAppointment = async (apt) => {
    if (!confirm('Mark this appointment completed?')) return
    try {
      const res = await fetchWithAuth(`/api/complete-booking/${apt.id}`, { method: 'POST' })
      if (!res.ok) throw new Error('Complete failed')
      setAppointments(
        appointments.map(a => a.id === apt.id ? { ...a, status: 'completed' } : a)
      )
    } catch (err) {
      alert('Failed to mark completed')
      console.error('Complete error:', err)
    }
  }

  const cancelAppointment = async (apt) => {
    if (!confirm('Cancel this appointment?')) return
    try {
      const res = await fetchWithAuth(`/api/cancel-booking/${apt.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revision: apt.revision })
      })
      if (!res.ok) throw new Error('Cancel failed')
      setAppointments(
        appointments.map(a => a.id === apt.id ? { ...a, status: 'canceled' } : a)
      )
    } catch (err) {
      alert('Failed to cancel appointment')
      console.error('Cancel error:', err)
    }
  }

  const rescheduleAppointment = async (apt) => {
    const newStart = prompt('New start time (YYYY-MM-DDTHH:MM)', apt.appointment_date?.slice(0,16) || '')
    if (!newStart) return
    const newEnd = prompt('New end time (YYYY-MM-DDTHH:MM)', apt.end_time?.slice(0,16) || '')
    if (!newEnd) return
    try {
      const res = await fetchWithAuth(`/api/reschedule-booking/${apt.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: new Date(newStart).toISOString(),
          endDate: new Date(newEnd).toISOString(),
          revision: apt.revision
        })
      })
      if (!res.ok) throw new Error('Reschedule failed')
      const data = await res.json()
      setAppointments(
        appointments.map(a => a.id === apt.id ? { ...a, appointment_date: newStart, end_time: newEnd, revision: data.booking?.revision || a.revision } : a)
      )
    } catch (err) {
      alert('Failed to reschedule appointment')
      console.error('Reschedule error:', err)
    }
  }

  if (loading) return <p style={{padding:'20px'}}>Loading appointments...</p>
  if (error) return <p style={{padding:'20px',color:'red'}}>Error: {error}</p>

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ marginBottom: '20px' }}>Appointments</h1>
      {appointments.length === 0 ? (
        <p>No appointments found.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>Customer</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>Service</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>Time</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>Status</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map(apt => (
              <tr key={apt.id} style={{ borderBottom: '1px solid #eee' }}>
                <td>{apt.customer_name || 'Customer'}</td>
                <td>{apt.service_name || 'Service'}</td>
                <td>{apt.appointment_date ? new Date(apt.appointment_date).toLocaleString() : ''}</td>
                <td>{apt.status}</td>
                <td>
                  <button onClick={() => completeAppointment(apt)} style={{ marginRight: '8px' }}>Complete</button>
                  <button onClick={() => cancelAppointment(apt)} style={{ marginRight: '8px' }}>Cancel</button>
                  <button onClick={() => rescheduleAppointment(apt)}>Reschedule</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
