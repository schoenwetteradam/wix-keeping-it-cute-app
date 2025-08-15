import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import useRequireSupabaseAuth from '../utils/useRequireSupabaseAuth'
import useRequireRole from '../utils/useRequireRole'
import { fetchWithAuth } from '../utils/api'
import AppointmentCard from '../components/AppointmentCard'

export default function StaffDashboard() {
  const { authError, loading: authLoading } = useRequireSupabaseAuth()
  const unauthorized = useRequireRole(['staff', 'admin'])
  const router = useRouter()
  
  // State variables
  const [metrics, setMetrics] = useState(null)
  const [branding, setBranding] = useState(null)
  const [upcoming, setUpcoming] = useState([])
  const [appointments, setAppointments] = useState([])
  const [apptLoading, setApptLoading] = useState(false)
  const [apptError, setApptError] = useState(null)
  const [metricsError, setMetricsError] = useState(null)

  // Load appointments function
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

  // Load appointments when tab changes
  useEffect(() => {
    if (unauthorized || authLoading) return
    if (router.isReady && router.query.tab === 'appointments') {
      loadAppointments()
    }
  }, [router.isReady, router.query.tab, unauthorized, authLoading])

  // Complete appointment function
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

  // Cancel appointment function
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
        appointments.map(a => a.id === apt.id ? { ...a, status: 'cancelled' } : a)
      )
    } catch (err) {
      alert('Failed to cancel')
      console.error('Cancel error:', err)
    }
  }

  // Update notes function
  const updateNotes = async (aptId, newNotes) => {
    try {
      const res = await fetchWithAuth(`/api/update-booking-notes/${aptId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: newNotes })
      })
      if (!res.ok) throw new Error('Update failed')
      setAppointments(
        appointments.map(a => 
          a.id === aptId ? { ...a, notes: newNotes } : a
        )
      )
    } catch (err) {
      alert('Failed to save notes')
      console.error('Update notes error:', err)
    }
  }

  // Load dashboard data
  useEffect(() => {
    if (unauthorized || authLoading) return
    
    async function load() {
      try {
        // Load branding
        const bRes = await fetchWithAuth('/api/get-branding')
        if (bRes.ok) {
          const data = await bRes.json()
          setBranding(data.branding)
        }

        // Load metrics
        const mRes = await fetchWithAuth('/api/get-dashboard-metrics')
        if (mRes.ok) {
          const data = await mRes.json()
          if (data.success) {
            setMetrics(data.metrics)
            setUpcoming(data.metrics.upcoming_appointments_list || [])
            setMetricsError(null)
            console.log('✅ Metrics loaded:', data.metrics)
          } else {
            throw new Error(data.error || 'Failed to load metrics')
          }
        } else {
          const errData = await mRes.json().catch(() => ({}))
          console.error('Metrics load failed:', errData.error || mRes.status, errData.details)
          setMetrics({
            upcoming_appointments: 0,
            product_usage_needed: 0,
            low_stock: 0,
            orders_today: 0,
            total_revenue: [],
            appointment_counts: []
          })
          setUpcoming([])
          setMetricsError(errData.error || 'Failed to load metrics')
        }
      } catch (err) {
        console.error('Dashboard load error', err)
        setMetrics({
          upcoming_appointments: 0,
          product_usage_needed: 0,
          low_stock: 0,
          orders_today: 0,
          total_revenue: [],
          appointment_counts: []
        })
        setUpcoming([])
        setMetricsError(err.message)
      }
    }
    load()
  }, [unauthorized, authLoading])

  // Calculate metrics
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

  // Handle loading states
  if (authError) return <div style={{ padding: '20px', color: 'red' }}>{authError}</div>
  if (authLoading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Loading authentication...</div>
      </div>
    )
  }
  if (unauthorized) return <div style={{ padding: '20px', color: 'red' }}>Not authorized</div>

  // Appointments tab view
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
            <div>
              {appointments.map(apt => (
                <AppointmentCard
                  key={apt.id}
                  appointment={apt}
                  onComplete={() => completeAppointment(apt)}
                  onCancel={() => cancelAppointment(apt)}
                  onUpdateNotes={(notes) => updateNotes(apt.id, notes)}
                />
              ))}
            </div>
          )}
          <div style={{ marginTop: '20px' }}>
            <Link href="/staff">← Back to Dashboard</Link>
          </div>
        </div>
      </>
    )
  }

  // Main dashboard view
  return (
    <>
      <Head>
        <title>Staff Portal - Keeping It Cute Salon</title>
      </Head>
      <div style={{ 
        padding: '20px', 
        fontFamily: 'Arial, sans-serif',
        backgroundColor: branding?.background_color || '#f8f9fa',
        color: branding?.text_color || '#333',
        minHeight: '100vh'
      }}>
        <h1 style={{ marginBottom: '30px', color: branding?.primary_color || '#333' }}>
          Staff Dashboard
        </h1>

        {metricsError && (
          <div style={{ 
            padding: '10px', 
            backgroundColor: '#ffebee', 
            color: '#c62828', 
            border: '1px solid #ffcdd2',
            borderRadius: '4px',
            marginBottom: '20px'
          }}>
            Error loading metrics: {metricsError}
          </div>
        )}

        {/* Metrics Cards */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          marginBottom: '30px'
        }}>
          <MetricCard 
            title="Upcoming Appointments" 
            value={upcomingCount} 
            color="#4CAF50"
            icon="📅"
          />
          <MetricCard 
            title="Product Usage Needed" 
            value={productUsageNeeded} 
            color="#FF9800"
            icon="📝"
          />
          <MetricCard 
            title="Low Stock Items" 
            value={lowStock} 
            color="#F44336"
            icon="⚠️"
          />
          <MetricCard 
            title="Orders Today" 
            value={ordersToday} 
            color="#2196F3"
            icon="📦"
          />
          <MetricCard 
            title="Total Revenue" 
            value={`$${totalRevenue.toFixed(2)}`} 
            color="#9C27B0"
            icon="💰"
          />
          <MetricCard 
            title="Total Appointments" 
            value={appointmentCount} 
            color="#607D8B"
            icon="📋"
          />
        </div>

        {/* Upcoming Appointments Section */}
        {upcoming.length > 0 && (
          <div style={{ marginBottom: '30px' }}>
            <h2 style={{ marginBottom: '15px' }}>Upcoming Appointments</h2>
            <div style={{ 
              display: 'grid', 
              gap: '15px',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))'
            }}>
              {upcoming.slice(0, 3).map(apt => (
                <div key={apt.id} style={{
                  padding: '15px',
                  backgroundColor: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>
                    {apt.customer_name}
                  </h3>
                  <p style={{ margin: '5px 0', color: '#666' }}>
                    <strong>Service:</strong> {apt.service_name}
                  </p>
                  <p style={{ margin: '5px 0', color: '#666' }}>
                    <strong>Date:</strong> {new Date(apt.appointment_date).toLocaleString()}
                  </p>
                  <p style={{ margin: '5px 0', color: '#666' }}>
                    <strong>Status:</strong> {apt.status}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px',
          marginTop: '30px'
        }}>
          <NavCard 
            title="My Appointments" 
            href="/staff?tab=appointments"
            description="View and manage your appointments"
            icon="📅"
          />
          <NavCard 
            title="Customers" 
            href="/customers"
            description="Browse customer records"
            icon="👥"
          />
          <NavCard 
            title="Staff Chat" 
            href="/staff-chat"
            description="Internal team communication"
            icon="💬"
          />
          <NavCard 
            title="Orders" 
            href="/orders"
            description="View recent orders"
            icon="📦"
          />
          <NavCard 
            title="Inventory" 
            href="/inventory"
            description="Manage products and stock"
            icon="📋"
          />
          <NavCard 
            title="Profile" 
            href="/profile"
            description="Update your profile"
            icon="👤"
          />
        </div>
      </div>
    </>
  )
}

// Metric Card Component
const MetricCard = ({ title, value, color, icon }) => (
  <div style={{
    padding: '20px',
    backgroundColor: 'white',
    border: '1px solid #ddd',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    textAlign: 'center'
  }}>
    <div style={{ fontSize: '2rem', marginBottom: '10px' }}>{icon}</div>
    <h3 style={{ 
      margin: '0 0 10px 0', 
      fontSize: '0.9rem', 
      color: '#666',
      textTransform: 'uppercase',
      letterSpacing: '1px'
    }}>
      {title}
    </h3>
    <div style={{ 
      fontSize: '2rem', 
      fontWeight: 'bold', 
      color: color,
      margin: '0'
    }}>
      {value}
    </div>
  </div>
)

// Navigation Card Component
const NavCard = ({ title, href, description, icon }) => (
  <Link href={href} style={{ textDecoration: 'none' }}>
    <div style={{
      padding: '20px',
      backgroundColor: 'white',
      border: '1px solid #ddd',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      cursor: 'pointer',
      transition: 'transform 0.2s, box-shadow 0.2s',
      height: '100%'
    }}
    onMouseEnter={(e) => {
      e.target.style.transform = 'translateY(-2px)'
      e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)'
    }}
    onMouseLeave={(e) => {
      e.target.style.transform = 'translateY(0)'
      e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <div style={{ fontSize: '2rem', marginBottom: '10px' }}>{icon}</div>
      <h3 style={{ 
        margin: '0 0 10px 0', 
        color: '#333',
        fontSize: '1.1rem'
      }}>
        {title}
      </h3>
      <p style={{ 
        margin: '0', 
        color: '#666',
        fontSize: '0.9rem'
      }}>
        {description}
      </p>
    </div>
  </Link>
)
