import { useState, useEffect } from 'react'
import Head from 'next/head'
import StaffNavBar from '../components/StaffNavBar'

export default function CalendarPage() {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('monthly')
  const [currentDate, setCurrentDate] = useState(new Date())

  useEffect(() => {
    loadAppointments()
  }, [])

  const loadAppointments = async () => {
    try {
      const res = await fetch('/api/get-appointments?limit=200')
      if (!res.ok) throw new Error('Failed to load appointments')
      const data = await res.json()
      setAppointments(data.appointments || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const startOfWeek = (date) => {
    const d = new Date(date)
    const diff = d.getDay()
    d.setDate(d.getDate() - diff)
    d.setHours(0, 0, 0, 0)
    return d
  }

  const endOfWeek = (date) => {
    const d = startOfWeek(date)
    d.setDate(d.getDate() + 6)
    d.setHours(23, 59, 59, 999)
    return d
  }

  const inRange = (aptDate) => {
    const d = new Date(aptDate)
    if (view === 'daily') {
      return d.toDateString() === currentDate.toDateString()
    }
    if (view === 'weekly') {
      return d >= startOfWeek(currentDate) && d <= endOfWeek(currentDate)
    }
    if (view === 'monthly') {
      return (
        d.getFullYear() === currentDate.getFullYear() &&
        d.getMonth() === currentDate.getMonth()
      )
    }
    return true
  }

  const filtered = appointments
    .filter((a) => a.appointment_date && inRange(a.appointment_date))
    .sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date))

  const prev = () => {
    const d = new Date(currentDate)
    if (view === 'daily') d.setDate(d.getDate() - 1)
    else if (view === 'weekly') d.setDate(d.getDate() - 7)
    else d.setMonth(d.getMonth() - 1)
    setCurrentDate(d)
  }

  const next = () => {
    const d = new Date(currentDate)
    if (view === 'daily') d.setDate(d.getDate() + 1)
    else if (view === 'weekly') d.setDate(d.getDate() + 7)
    else d.setMonth(d.getMonth() + 1)
    setCurrentDate(d)
  }

  const header = () => {
    if (view === 'daily') return currentDate.toDateString()
    if (view === 'weekly') {
      const start = startOfWeek(currentDate)
      const end = endOfWeek(currentDate)
      return `Week of ${start.toLocaleDateString()} - ${end.toLocaleDateString()}`
    }
    return currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })
  }

  return (
    <>
      <Head>
        <title>Appointment Calendar</title>
      </Head>
      <StaffNavBar activeTab="calendar" />
      <div style={{ padding: '20px' }}>
        <h1 style={{ marginTop: 0 }}>Appointment Calendar</h1>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '20px' }}>
          <button onClick={prev} style={{ padding: '8px 12px' }}>&lt;</button>
          <strong>{header()}</strong>
          <button onClick={next} style={{ padding: '8px 12px' }}>&gt;</button>
          <select value={view} onChange={(e) => setView(e.target.value)} style={{ marginLeft: 'auto', padding: '8px' }}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        {loading ? (
          <p>Loading...</p>
        ) : filtered.length === 0 ? (
          <p>No appointments for this period.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {filtered.map((apt) => (
              <li key={apt.id} style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>
                <strong>{apt.customer_name || 'Customer'}</strong> - {apt.service_name || 'Service'} on{' '}
                {apt.appointment_date ? new Date(apt.appointment_date).toLocaleString() : 'Unknown'}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}

