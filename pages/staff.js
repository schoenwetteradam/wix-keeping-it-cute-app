import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import useRequireSupabaseAuth from '../utils/useRequireSupabaseAuth'
import { fetchWithAuth } from '../utils/api'

export default function StaffDashboard() {
  useRequireSupabaseAuth()
  const [metrics, setMetrics] = useState(null)
  const [branding, setBranding] = useState(null)
  const [upcoming, setUpcoming] = useState([])

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
        }

        const uRes = await fetchWithAuth('/api/get-upcoming-bookings?limit=5')
        if (uRes.ok) {
          const data = await uRes.json()
          setUpcoming(data.bookings || [])
        }
      } catch (err) {
        console.error('Dashboard load error', err)
      }
    }
    load()
  }, [])

  const upcomingCount = metrics?.upcoming_appointments || 0
  const ordersToday = metrics?.orders_today || 0
  const productUsageNeeded = metrics?.product_usage_needed || 0
  const lowStock = metrics?.low_stock || 0

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
          <Link href="/appointments" style={{ padding: '10px 15px', background: '#667eea', color: 'white', borderRadius: '6px', textDecoration: 'none' }}>View All Appointments</Link>
          <Link href="/alerts" style={{ padding: '10px 15px', background: '#d32f2f', color: 'white', borderRadius: '6px', textDecoration: 'none' }}>Restock Inventory</Link>
          <Link href="/site-analytics" style={{ padding: '10px 15px', background: '#1976d2', color: 'white', borderRadius: '6px', textDecoration: 'none' }}>Site Analytics</Link>
        </div>
      </div>
    </>
  )
}
