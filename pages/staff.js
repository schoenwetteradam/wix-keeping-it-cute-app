import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import useRequireSupabaseAuth from '../utils/useRequireSupabaseAuth'
import { fetchWithAuth } from '../utils/api'
import AppointmentCard from '../components/AppointmentCard'

export default function StaffDashboard() {
  useRequireSupabaseAuth()
  const router = useRouter()
  const [metrics, setMetrics] = useState(null)
  const [branding, setBranding] = useState(null)
  const [upcoming, setUpcoming] = useState([])
  const [appointments, setAppointments] = useState([])
  const [apptLoading, setApptLoading] = useState(false)
  const [apptError, setApptError] = useState(null)

  const loadAppointments = async () => {
    setApptLoading(true)
    try {
      const res = await fetchWithAuth('/api/get-appointments?scope=mine')
      if (!res.ok) throw new Error('Failed to load appointments')
      const data = await res.json()
      setAppointments(data.appointments || [])
      setApptError(null)
    } catch (err) {
      setApptError(err.message)
    } finally {
      setApptLoading(false)
    }
  }

  useEffect(() => {
    if (router.isReady && router.query.tab === 'appointments') {
      loadAppointments()
    }
  }, [router.isReady, router.query.tab])

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

  useEffect(() => {
    async function load() {
      try {
        const bRes = await fetchWithAuth('/api/get-branding')
        if (bRes.ok) {
          const data = await bRes.json()
          setBranding(data.branding)
        }

        const mRes = await fetchWithAuth('/api/get-dashboard-metrics')
        if (mRes.ok) {
          const data = await mRes.json()
          setMetrics(data.metrics)
          setUpcoming(data.metrics.upcoming_appointments_list || [])
        }
      } catch (err) {
        console.error('Dashboard load error', err)
      }
    }
    load()
  }, [])

  const upcomingCount = upcoming.length
  const ordersToday = metrics?.orders_today || 0
  const productUsageNeeded = metrics?.product_usage_needed || 0
  const lowStock = metrics?.low_stock || 0
  const totalRevenue = (metrics?.total_revenue || []).reduce(
    (sum, r) => sum + Number(r.total_revenue || 0),
    0
  )
  const appointmentCount = (metrics?.appointment_counts || []).reduce(
    (sum, a) => sum + Number(a.appointment_count || 0),
    0
  )

  if (router.query.tab === 'appointments') {
    return (
      <>
        <Head>
          <title>My Appointments - Keeping It Cute Salon</title>
        </Head>
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
          <h1 style={{ marginBottom: '20px' }}>My Appointments</h1>
          {apptLoading ? (
            <p>Loading appointments...</p>
          ) : apptError ? (
            <p style={{ color: 'red' }}>Error: {apptError}</p>
          ) : appointments.length === 0 ? (
            <p>No appointments found.</p>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '20px',
              }}
            >
              {appointments.map((apt) => (
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
          )}
        </div>
      </>
    )
  }

  return (
    <>
      <Head>
        <title>Staff Dashboard - Keeping It Cute Salon</title>
      </Head>
      <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          {branding?.logo_url && (
            <img src={branding.logo_url} alt="Salon Logo" style={{ height: '80px' }} />
          )}
          <h1 style={{ margin: '10px 0' }}>Welcome Back!</h1>
          <p>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <h2 style={{ marginBottom: '15px' }}>Metrics at a Glance</h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px',
          marginBottom: '30px'
        }}>
          <div style={{
            background: 'white',
            padding: '25px',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            border: '1px solid #e9ecef'
          }}>
            <h3 style={{ margin: '0 0 10px', color: '#1976d2', fontSize: '1.1em' }}>📅 Upcoming Appointments</h3>
            <p style={{ fontSize: '2.5em', margin: 0, fontWeight: 'bold', color: '#333' }}>{upcomingCount}</p>
          </div>
          <div style={{
            background: 'white',
            padding: '25px',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            border: '1px solid #e9ecef'
          }}>
            <h3 style={{ margin: '0 0 10px', color: '#f57c00', fontSize: '1.1em' }}>📝 Usage Forms Needed</h3>
            <p style={{ fontSize: '2.5em', margin: 0, fontWeight: 'bold', color: '#333' }}>{productUsageNeeded}</p>
          </div>
          <div style={{
            background: 'white',
            padding: '25px',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            border: '1px solid #e9ecef'
          }}>
            <h3 style={{ margin: '0 0 10px', color: '#d32f2f', fontSize: '1.1em' }}>🚨 Low Stock</h3>
            <p style={{ fontSize: '2.5em', margin: 0, fontWeight: 'bold', color: '#d32f2f' }}>{lowStock}</p>
          </div>
          <div style={{
            background: 'white',
            padding: '25px',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            border: '1px solid #e9ecef'
          }}>
            <h3 style={{ margin: '0 0 10px', color: '#9c27b0', fontSize: '1.1em' }}>💳 Orders Today</h3>
            <p style={{ fontSize: '2.5em', margin: 0, fontWeight: 'bold', color: '#333' }}>{ordersToday}</p>
          </div>
          <div style={{
            background: 'white',
            padding: '25px',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            border: '1px solid #e9ecef'
          }}>
            <h3 style={{ margin: '0 0 10px', color: '#388e3c', fontSize: '1.1em' }}>💰 Total Revenue</h3>
            <p style={{ fontSize: '2.5em', margin: 0, fontWeight: 'bold', color: '#333' }}>${totalRevenue.toFixed(2)}</p>
          </div>
          <div style={{
            background: 'white',
            padding: '25px',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            border: '1px solid #e9ecef'
          }}>
            <h3 style={{ margin: '0 0 10px', color: '#455a64', fontSize: '1.1em' }}>📋 Appointment Count</h3>
            <p style={{ fontSize: '2.5em', margin: 0, fontWeight: 'bold', color: '#333' }}>{appointmentCount}</p>
          </div>
        </div>

        <div style={{ background: '#fff3cd', padding: '20px', borderRadius: '8px', marginBottom: '30px', border: '1px solid #ffeeba' }}>
          You have {productUsageNeeded} appointments that require product usage logs.
        </div>

        <h3 style={{ marginBottom: '10px' }}>Upcoming Appointments</h3>
        {upcoming.length === 0 ? (
          <p>No upcoming appointments.</p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '20px',
              marginBottom: '30px',
            }}
          >
            {upcoming.map((apt) => (
              <div
                key={apt.id}
                style={{
                  background: 'white',
                  padding: '20px',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  border: '1px solid #e9ecef',
                }}
              >
                <strong>{apt.customer_name || 'Customer'}</strong>
                <div style={{ color: '#666', margin: '4px 0 8px' }}>
                  {apt.appointment_date ? new Date(apt.appointment_date).toLocaleString() : ''}
                </div>
                {apt.salon_services?.name && (
                  <div style={{ fontSize: '0.9em', color: '#555' }}>
                    {apt.salon_services.name}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <h3>Quick Links</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Link href="/product-usage-dashboard" style={{ padding: '10px 15px', background: '#e0cdbb', color: 'white', borderRadius: '6px', textDecoration: 'none' }}>Log Product Usage</Link>
          <Link href="/appointments" style={{ padding: '10px 15px', background: '#667eea', color: 'white', borderRadius: '6px', textDecoration: 'none' }}>Salon Schedule</Link>
          <Link href="/alerts" style={{ padding: '10px 15px', background: '#d32f2f', color: 'white', borderRadius: '6px', textDecoration: 'none' }}>Restock Inventory</Link>
          <Link href="/site-analytics" style={{ padding: '10px 15px', background: '#1976d2', color: 'white', borderRadius: '6px', textDecoration: 'none' }}>Site Analytics</Link>
        </div>
      </div>
    </>
  )
}
