import { useState, useEffect } from 'react'
import CalendarView from '../components/CalendarView'
import AppointmentCard from '../components/AppointmentCard'
import useRequireSupabaseAuth from '../utils/useRequireSupabaseAuth'
import { fetchWithAuth } from '../utils/api'

export default function AppointmentsPage() {
  useRequireSupabaseAuth()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [appointmentSearch, setAppointmentSearch] = useState('')
  const [appointmentSort, setAppointmentSort] = useState('newest')
  const [staffFilter, setStaffFilter] = useState('')
  const [appointmentView, setAppointmentView] = useState('list')
  const [currentPage, setCurrentPage] = useState(1)
  const APPOINTMENTS_PER_PAGE = 25

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
  const filtered = appointments.filter((a) => {
    const matchesSearch =
      (a.customer_name || '').toLowerCase().includes(term) ||
      (a.customer_email || '').toLowerCase().includes(term)
    const matchesStaff = staffFilter ? a.staff_member === staffFilter : true
    return matchesSearch && matchesStaff
  })

  const sorted = filtered.sort((a, b) => {
    if (appointmentSort === 'created-oldest') {
      return new Date(a.created_at) - new Date(b.created_at)
    }
    if (appointmentSort === 'created-newest') {
      return new Date(b.created_at) - new Date(a.created_at)
    }
    if (appointmentSort === 'oldest') {
      return new Date(a.appointment_date) - new Date(b.appointment_date)
    }
    return new Date(b.appointment_date) - new Date(a.appointment_date)
  })

  const totalPages = Math.ceil(sorted.length / APPOINTMENTS_PER_PAGE)
  const paginated = sorted.slice(
    (currentPage - 1) * APPOINTMENTS_PER_PAGE,
    currentPage * APPOINTMENTS_PER_PAGE
  )


  if (loading) return <p style={{padding:'20px'}}>Loading appointments...</p>
  if (error) return <p style={{padding:'20px',color:'red'}}>Error: {error}</p>

  const staffOptions = Array.from(new Set(appointments.map(a => a.staff_member).filter(Boolean)))

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
        <select value={staffFilter} onChange={e => setStaffFilter(e.target.value)} style={{ padding: '10px', borderRadius: '4px' }}>
          <option value="">All Staff</option>
          {staffOptions.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        <select value={appointmentSort} onChange={(e) => setAppointmentSort(e.target.value)} style={{ padding: '10px', borderRadius: '4px' }}>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="created-newest">Created Newest</option>
          <option value="created-oldest">Created Oldest</option>
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
        <>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px',
          }}
        >
          {paginated.map((apt) => (
            <AppointmentCard
              key={apt.id}
              appointment={apt}
              onComplete={completeAppointment}
              onCancel={cancelAppointment}
              onReschedule={rescheduleAppointment}
              onMarkPaid={markPaid}
              onEditNotes={editNotes}
            />
          ))}
        </div>
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={{ marginRight: '10px' }}
          >
            Previous
          </button>
          <span>Page {currentPage} of {totalPages}</span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            style={{ marginLeft: '10px' }}
          >
            Next
          </button>
        </div>
        </>
      )}
    </div>
  )
}
