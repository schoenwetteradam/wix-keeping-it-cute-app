import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import CalendarView from '../components/CalendarView'
import useRequireSupabaseAuth from '../utils/useRequireSupabaseAuth'
import { fetchWithAuth } from '../utils/api'

export default function AppointmentsPage() {
  useRequireSupabaseAuth()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState(null)
  const [appointmentSearch, setAppointmentSearch] = useState('')
  const [appointmentSort, setAppointmentSort] = useState('newest')
  const [appointmentView, setAppointmentView] = useState('list')

  const limit = 50

  const loadAppointments = async (p = 0) => {
    setLoading(true)
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (!url || !key) throw new Error('Missing Supabase env vars')
      const supabase = createClient(url, key)
      const { data, error } = await supabase
        .from('bookings')
        .select('*, salon_services(*)')
        .order('appointment_date', { ascending: false })
        .range(p * limit, p * limit + limit - 1)
      if (error) throw error
      if (p === 0) {
        setAppointments(data || [])
      } else {
        setAppointments(prev => [...prev, ...(data || [])])
      }
      setHasMore((data?.length || 0) === limit)
      setPage(p)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAppointments(0)
  }, [])

  const loadMore = () => {
    if (hasMore) {
      loadAppointments(page + 1)
    }
  }

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

  const markPaid = async (apt) => {
    if (!confirm('Mark this appointment as paid?')) return
    try {
      const res = await fetchWithAuth(`/api/mark-booking-paid/${apt.id}`, {
        method: 'POST'
      })
      if (!res.ok) throw new Error('Mark paid failed')
      setAppointments(
        appointments.map(a =>
          a.id === apt.id ? { ...a, payment_status: 'paid' } : a
        )
      )
    } catch (err) {
      alert('Failed to mark paid')
      console.error('Mark paid error:', err)
    }
  }

  const editNotes = async (apt) => {
    const newNotes = prompt('Appointment notes', apt.notes || '')
    if (newNotes === null) return
    try {
      const res = await fetchWithAuth('/api/update-appointment-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointment_id: apt.id, notes: newNotes })
      })
      if (!res.ok) throw new Error('Failed to update notes')
      setAppointments(
        appointments.map(a =>
          a.id === apt.id ? { ...a, notes: newNotes } : a
        )
      )
    } catch (err) {
      alert('Failed to save notes')
      console.error('Update notes error:', err)
    }
  }

  const term = appointmentSearch.toLowerCase()
  const filtered = appointments.filter(
    (a) =>
      (a.customer_name || '').toLowerCase().includes(term) ||
      (a.customer_email || '').toLowerCase().includes(term)
  )
  const sorted = filtered.sort((a, b) => {
    if (appointmentSort === 'oldest') {
      return new Date(a.appointment_date) - new Date(b.appointment_date)
    }
    return new Date(b.appointment_date) - new Date(a.appointment_date)
  })


  if (loading) return <p style={{padding:'20px'}}>Loading appointments...</p>
  if (error) return <p style={{padding:'20px',color:'red'}}>Error: {error}</p>

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ marginBottom: '20px' }}>Appointments</h1>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search appointments..."
          value={appointmentSearch}
          onChange={(e) => setAppointmentSearch(e.target.value)}
          style={{ flex: '2', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', minWidth: '200px' }}
        />
        <select value={appointmentSort} onChange={(e) => setAppointmentSort(e.target.value)} style={{ padding: '10px', borderRadius: '4px' }}>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
        </select>
        <button onClick={() => setAppointmentView(appointmentView === 'list' ? 'calendar' : 'list')} style={{ padding: '10px', borderRadius: '4px', cursor: 'pointer' }}>
          {appointmentView === 'list' ? 'Calendar View' : 'List View'}
        </button>
        <span style={{ alignSelf: 'center', fontWeight: 'bold' }}>
          Appointments: {appointments.length}
        </span>
      </div>
      {appointments.length === 0 ? (
        <p>No appointments found.</p>
      ) : appointmentView === 'calendar' ? (
        <CalendarView appointments={appointments} onAppointmentClick={() => {}} />
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>Customer</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>Service</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>Time</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>Status</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>Payment</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>Price</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>Staff</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>Notes</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(apt => (
              <tr key={apt.id} style={{ borderBottom: '1px solid #eee' }}>
                <td>{apt.customer_name || 'Customer'}</td>
                <td>{apt.service_name || 'Service'}</td>
                <td>{apt.appointment_date ? new Date(apt.appointment_date).toLocaleString() : ''}</td>
                <td>{apt.status}</td>
                <td>{apt.payment_status || 'pending'}</td>
                <td>{apt.total_price ? `$${parseFloat(apt.total_price).toFixed(2)}` : ''}</td>
                <td>{apt.staff_member || ''}</td>
                <td>{apt.notes ? apt.notes.substring(0, 40) : ''}</td>
                <td>
                  <button onClick={() => completeAppointment(apt)} style={{ marginRight: '8px' }}>Complete</button>
                  <button onClick={() => cancelAppointment(apt)} style={{ marginRight: '8px' }}>Cancel</button>
                  <button onClick={() => rescheduleAppointment(apt)} style={{ marginRight: '8px' }}>Reschedule</button>
                  {apt.payment_status !== 'paid' && (
                    <button onClick={() => markPaid(apt)} style={{ marginRight: '8px' }}>Mark Paid</button>
                  )}
                  <button onClick={() => editNotes(apt)} style={{ marginRight: '8px' }}>Notes</button>
                  <button onClick={() => window.open(`/product-usage/${apt.id}`, '_blank')} style={{ marginRight: '8px' }}>Usage</button>
                  <button onClick={() => window.open(`/booking-images/${apt.id}`, '_blank')} style={{ marginRight: '8px' }}>Images</button>
                  <button onClick={() => window.open(`/booking-details/${apt.id}`, '_blank')} style={{ marginRight: '8px' }}>Details</button>
                  <button onClick={() => window.open(`/collect-payment/${apt.id}`, '_blank')}>Collect</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {hasMore && (
          <div style={{ marginTop: '10px' }}>
            <button onClick={loadMore}>Load More</button>
          </div>
        )}
      )}
    </div>
  )
}
