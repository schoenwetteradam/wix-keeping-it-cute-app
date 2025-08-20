import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import useRequireSupabaseAuth from '../utils/useRequireSupabaseAuth'
import useRequireRole from '../utils/useRequireRole'
import { fetchWithAuth } from '../utils/api'
import { getBrowserSupabaseClient } from '../utils/supabaseBrowserClient'

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
  const [debugInfo, setDebugInfo] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  // Helper function to log debug info
  const addDebugInfo = (info) => {
    setDebugInfo(prev => prev + '\n' + new Date().toLocaleTimeString() + ': ' + info)
    console.log('🔍 DEBUG:', info)
  }

  // Load dashboard data on component mount
  useEffect(() => {
    if (unauthorized || authLoading) return
    
    const loadDashboardData = async () => {
      setIsLoading(true)
      addDebugInfo('Loading dashboard data...')
      
      try {
        // Load metrics
        await loadMetrics()
        
        // Load upcoming appointments
        await loadUpcomingAppointments()
        
        addDebugInfo('✅ Dashboard loaded successfully')
      } catch (err) {
        addDebugInfo(`❌ Dashboard load error: ${err.message}`)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadDashboardData()
  }, [unauthorized, authLoading])

  // Load metrics from API
  const loadMetrics = async () => {
    try {
      addDebugInfo('Loading metrics...')
      const res = await fetchWithAuth('/api/get-dashboard-metrics')
      
      if (res.ok) {
        const data = await res.json()
        setMetrics(data.metrics || {})
        addDebugInfo('✅ Metrics loaded')
      } else {
        addDebugInfo('⚠️ Metrics API failed, using defaults')
        setMetrics({
          upcoming_appointments: 0,
          product_usage_needed: 0,
          low_stock: 0,
          orders_today: 0
        })
      }
    } catch (err) {
      addDebugInfo(`❌ Metrics error: ${err.message}`)
      setMetricsError(err.message)
      setMetrics({
        upcoming_appointments: 0,
        product_usage_needed: 0,
        low_stock: 0,
        orders_today: 0
      })
    }
  }

  // Load upcoming appointments
  const loadUpcomingAppointments = async () => {
    try {
      addDebugInfo('Loading upcoming appointments...')
      const res = await fetchWithAuth('/api/get-appointments?scope=mine&limit=5')
      
      if (res.ok) {
        const data = await res.json()
        const upcomingAppts = (data.appointments || []).filter(apt => {
          const aptDate = new Date(apt.appointment_date)
          return aptDate >= new Date()
        }).slice(0, 3)
        
        setUpcoming(upcomingAppts)
        addDebugInfo(`✅ Loaded ${upcomingAppts.length} upcoming appointments`)
      } else {
        addDebugInfo('⚠️ Upcoming appointments API failed')
        setUpcoming([])
      }
    } catch (err) {
      addDebugInfo(`❌ Upcoming appointments error: ${err.message}`)
      setUpcoming([])
    }
  }

  // Enhanced load appointments with multiple strategies
  const loadAppointments = async () => {
    setApptLoading(true)
    setApptError(null)
    addDebugInfo('Loading all appointments...')
    
    try {
      // Strategy 1: Try the API endpoints
      const apiResults = await tryApiEndpoints()
      if (apiResults.success) {
        setAppointments(apiResults.appointments)
        addDebugInfo(`✅ API Success: ${apiResults.appointments.length} appointments`)
        return
      }
      
      // Strategy 2: Try direct Supabase access
      const directResults = await tryDirectSupabase()
      if (directResults.success) {
        setAppointments(directResults.appointments)
        addDebugInfo(`✅ Direct Success: ${directResults.appointments.length} appointments`)
        return
      }
      
      // Strategy 3: Create mock data for testing
      const mockData = createMockAppointments()
      setAppointments(mockData)
      addDebugInfo(`⚠️ Using mock data: ${mockData.length} appointments`)
      
    } catch (err) {
      addDebugInfo(`❌ Critical error: ${err.message}`)
      setApptError(err.message)
    } finally {
      setApptLoading(false)
    }
  }

  // Try API endpoints with different approaches
  const tryApiEndpoints = async () => {
    const endpoints = [
      '/api/get-all-appointments?limit=100',
      '/api/get-appointments?scope=mine&limit=100',
      '/api/get-appointments?limit=100',
      '/api/appointments?limit=100'
    ]
    
    for (const endpoint of endpoints) {
      try {
        addDebugInfo(`Trying endpoint: ${endpoint}`)
        const res = await fetchWithAuth(endpoint)
        
        if (res.ok) {
          const data = await res.json()
          const appointments = data.appointments || data || []
          
          if (appointments.length >= 0) {
            addDebugInfo(`✅ ${endpoint} worked`)
            return { success: true, appointments }
          }
        } else {
          const errorText = await res.text().catch(() => 'Unknown error')
          addDebugInfo(`❌ ${endpoint} failed: ${res.status} - ${errorText}`)
        }
      } catch (err) {
        addDebugInfo(`❌ ${endpoint} exception: ${err.message}`)
      }
    }
    
    return { success: false, appointments: [] }
  }

  // Try direct Supabase client access
  const tryDirectSupabase = async () => {
    try {
      addDebugInfo('Trying direct Supabase access...')
      const supabase = getBrowserSupabaseClient()
      
      // Check authentication
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        addDebugInfo('❌ No Supabase session')
        return { success: false, appointments: [] }
      }
      
      addDebugInfo(`✅ Supabase session: ${session.user.email}`)
      
      // Try different table names
      const tables = ['bookings', 'salon_appointments', 'appointments']
      
      for (const tableName of tables) {
        try {
          addDebugInfo(`Trying table: ${tableName}`)
          
          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .limit(50)
          
          if (error) {
            addDebugInfo(`❌ ${tableName} error: ${error.message}`)
            continue
          }
          
          if (data && data.length >= 0) {
            addDebugInfo(`✅ ${tableName} found ${data.length} records`)
            
            // Transform the data to expected format
            const transformedData = data.map(row => ({
              id: row.id,
              customer_name: row.customer_name || row.contact_name || 'Unknown Customer',
              customer_email: row.customer_email || row.contact_email || '',
              service_name: row.service_name || row.service || 'Service',
              appointment_date: row.appointment_date || row.scheduled_date || row.start_time || new Date().toISOString(),
              status: row.status || 'scheduled',
              notes: row.notes || '',
              staff_member: row.staff_member || row.staff_name || '',
              total_price: row.total_price || row.price || 0,
              duration: row.duration || row.service_duration || 60,
              payment_status: row.payment_status || 'pending',
              ...row // Include all original fields
            }))
            
            return { success: true, appointments: transformedData }
          }
        } catch (tableError) {
          addDebugInfo(`❌ ${tableName} exception: ${tableError.message}`)
        }
      }
      
      return { success: false, appointments: [] }
    } catch (err) {
      addDebugInfo(`❌ Direct Supabase error: ${err.message}`)
      return { success: false, appointments: [] }
    }
  }

  // Create mock appointments for testing
  const createMockAppointments = () => {
    addDebugInfo('Creating mock appointments for testing...')
    return [
      {
        id: 'mock-1',
        customer_name: 'Sarah Johnson',
        customer_email: 'sarah@example.com',
        service_name: 'Haircut & Style',
        appointment_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        status: 'scheduled',
        notes: 'First time client',
        staff_member: 'Jessica',
        total_price: 85,
        duration: 90,
        payment_status: 'pending'
      },
      {
        id: 'mock-2',
        customer_name: 'Emily Chen',
        customer_email: 'emily@example.com',
        service_name: 'Color & Highlights',
        appointment_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'confirmed',
        notes: 'Regular client - blonde highlights',
        staff_member: 'Ashley',
        total_price: 150,
        duration: 120,
        payment_status: 'paid'
      }
    ]
  }

  // Load appointments when tab changes
  useEffect(() => {
    if (unauthorized || authLoading) return
    if (router.isReady && router.query.tab === 'appointments') {
      addDebugInfo('Tab changed to appointments, loading...')
      loadAppointments()
    }
  }, [router.isReady, router.query.tab, unauthorized, authLoading])

  // If showing appointments tab
  if (router.query.tab === 'appointments') {
    return (
      <>
        <Head>
          <title>My Appointments - Keeping It Cute Salon</title>
        </Head>
        <div style={{ 
          padding: '20px', 
          fontFamily: 'Arial, sans-serif',
          backgroundColor: '#f8f9fa',
          minHeight: '100vh'
        }}>
          <h1 style={{ marginBottom: '20px', color: '#333' }}>
            My Appointments
          </h1>

          {/* Enhanced Controls with Profile Management */}
          <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button 
              onClick={loadAppointments}
              disabled={apptLoading}
              style={{
                padding: '10px 20px',
                backgroundColor: '#f57c00',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: apptLoading ? 'not-allowed' : 'pointer',
                opacity: apptLoading ? 0.6 : 1
              }}
            >
              {apptLoading ? 'Loading...' : 'Refresh Appointments'}
            </button>

            {/* Create Profile Button */}
            <button 
              onClick={async () => {
                try {
                  addDebugInfo('Creating staff profile...')
                  const res = await fetchWithAuth('/api/create-staff-profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      full_name: 'Staff Member',
                      phone: '',
                      address: ''
                    })
                  })
                  
                  if (res.ok) {
                    const data = await res.json()
                    addDebugInfo(`✅ Staff check complete. Can create appointments: ${data.canCreateAppointments}`)
                    if (data.recommendedStaff) {
                      addDebugInfo(`📋 Recommended staff: ${data.recommendedStaff.email}`)
                    }
                  } else {
                    const errorText = await res.text()
                    addDebugInfo(`❌ Profile check failed: ${errorText}`)
                  }
                } catch (err) {
                  addDebugInfo(`❌ Profile creation error: ${err.message}`)
                }
              }}
              style={{
                padding: '10px 20px',
                backgroundColor: '#2196f3',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Create/Check Profile
            </button>

            {/* Add Test Data Button */}
            <button 
              onClick={async () => {
                try {
                  addDebugInfo('Creating test appointments...')
                  const res = await fetchWithAuth('/api/create-test-appointments', {
                    method: 'POST'
                  })
                  
                  if (res.ok) {
                    const data = await res.json()
                    addDebugInfo(`✅ Created ${data.appointments?.length || 0} test appointments`)
                    addDebugInfo(`📋 Staff used: ${data.staffUsed?.name || data.staffUsed?.email || 'Unknown'}`)
                    // Reload appointments to show the new data
                    await loadAppointments()
                  } else {
                    const errorText = await res.text()
                    addDebugInfo(`❌ Failed to create test data: ${errorText}`)
                  }
                } catch (err) {
                  addDebugInfo(`❌ Error creating test data: ${err.message}`)
                }
              }}
              style={{
                padding: '10px 20px',
                backgroundColor: '#4caf50',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Add Test Data
            </button>

            {/* Database Diagnostic Button */}
            <button 
              onClick={async () => {
                try {
                  addDebugInfo('Running database diagnostic...')
                  const res = await fetchWithAuth('/api/debug-appointments')
                  
                  if (res.ok) {
                    const data = await res.json()
                    addDebugInfo('=== DATABASE DIAGNOSTIC RESULTS ===')
                    addDebugInfo(`Total appointments in database: ${data.summary.totalAppointments}`)
                    addDebugInfo(`Your user ID: ${data.user.id}`)
                    addDebugInfo(`Your email: ${data.user.email}`)
                    
                    // Show staff groups
                    data.summary.staffGroupCounts.forEach(group => {
                      addDebugInfo(`Staff ID "${group.staffId}": ${group.count} appointments`)
                    })
                    
                    // Show query results
                    addDebugInfo(`Appointments with your exact user ID: ${data.queryResults.exactUserId.count}`)
                    addDebugInfo(`Appointments with your email as staff_member: ${data.queryResults.byEmail.count}`)
                    addDebugInfo(`Appointments with NULL staff_id: ${data.queryResults.nullStaffId.count}`)
                    
                    // Show sample appointments
                    addDebugInfo('=== SAMPLE APPOINTMENTS ===')
                    data.sampleAppointments.forEach((apt, i) => {
                      addDebugInfo(`${i+1}. ${apt.customer_name} - Staff ID: ${apt.staff_id || 'NULL'} - Staff Member: ${apt.staff_member || 'NULL'}`)
                    })
                    
                    // Show staff records
                    addDebugInfo('=== STAFF RECORDS ===')
                    data.allStaff.forEach(staff => {
                      addDebugInfo(`${staff.first_name} ${staff.last_name} (${staff.email}) - ID: ${staff.id}`)
                    })
                    
                  } else {
                    const errorText = await res.text()
                    addDebugInfo(`❌ Diagnostic failed: ${errorText}`)
                  }
                } catch (err) {
                  addDebugInfo(`❌ Diagnostic error: ${err.message}`)
                }
              }}
              style={{
                padding: '10px 20px',
                backgroundColor: '#9c27b0',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              🔍 Database Diagnostic
            </button>

            {/* Clear Test Data Button */}
            <button
              onClick={async () => {
                if (!confirm('Delete all test appointments? This cannot be undone.')) return
                
                try {
                  const supabase = getBrowserSupabaseClient()
                  const { error } = await supabase
                    .from('bookings')
                    .delete()
                    .contains('payload', { test: true })
                  
                  if (error) {
                    addDebugInfo(`❌ Failed to clear test data: ${error.message}`)
                  } else {
                    addDebugInfo('✅ Test data cleared')
                    await loadAppointments()
                  }
                } catch (err) {
                  addDebugInfo(`❌ Error clearing test data: ${err.message}`)
                }
              }}
              style={{
                padding: '10px 20px',
                backgroundColor: '#f44336',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Clear Test Data
            </button>

            <button 
              onClick={() => setDebugInfo('')}
              style={{
                padding: '10px 20px',
                backgroundColor: '#666',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Clear Debug
            </button>
          </div>

          {/* Debug Panel */}
          {debugInfo && (
            <div style={{ 
              padding: '15px', 
              backgroundColor: '#f0f0f0', 
              border: '1px solid #ccc',
              borderRadius: '8px',
              marginBottom: '20px',
              fontFamily: 'monospace',
              fontSize: '12px',
              maxHeight: '200px',
              overflow: 'auto'
            }}>
              <strong>Debug Information:</strong>
              <pre style={{ margin: '10px 0 0 0', whiteSpace: 'pre-wrap' }}>
                {debugInfo}
              </pre>
            </div>
          )}

          {/* Appointments Content */}
          {apptLoading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                border: '4px solid #f3f3f3',
                borderTop: '4px solid #f57c00',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 20px'
              }}></div>
              <p>Loading appointments...</p>
            </div>
          ) : apptError ? (
            <div style={{ 
              padding: '20px', 
              backgroundColor: '#ffebee', 
              color: '#c62828',
              border: '1px solid #ffcdd2',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <h3>Error Loading Appointments</h3>
              <p><strong>Error:</strong> {apptError}</p>
              <button 
                onClick={loadAppointments}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#f57c00',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginTop: '10px'
                }}
              >
                Try Again
              </button>
            </div>
          ) : appointments.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px',
              backgroundColor: '#fff',
              borderRadius: '8px',
              border: '1px solid #e0e0e0'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>📅</div>
              <h3>No Appointments Found</h3>
              <p>You don't have any appointments at the moment.</p>
              <p>Use the "Add Test Data" button above to create sample appointments.</p>
            </div>
          ) : (
            <div>
              <p style={{ marginBottom: '20px', color: '#666' }}>
                Found {appointments.length} appointment{appointments.length !== 1 ? 's' : ''}
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {appointments.map(apt => (
                  <AppointmentCard key={apt.id} appointment={apt} />
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: '20px' }}>
            <Link href="/staff">← Back to Dashboard</Link>
          </div>
        </div>

        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
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
        backgroundColor: '#f8f9fa',
        color: '#333',
        minHeight: '100vh'
      }}>
        {/* Header */}
        <div style={{ marginBottom: '30px' }}>
          <h1 style={{ marginBottom: '10px', color: '#333', fontSize: '2rem' }}>
            Staff Dashboard
          </h1>
          <p style={{ color: '#666', margin: 0 }}>
            Welcome to Keeping It Cute Salon & Spa Staff Portal
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #f57c00',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 20px'
            }}></div>
            <p>Loading dashboard...</p>
          </div>
        )}

        {/* Debug Panel */}
        {debugInfo && (
          <div style={{ 
            padding: '15px', 
            backgroundColor: '#f0f0f0', 
            border: '1px solid #ccc',
            borderRadius: '8px',
            marginBottom: '20px',
            fontFamily: 'monospace',
            fontSize: '12px',
            maxHeight: '150px',
            overflow: 'auto'
          }}>
            <strong>Debug Info:</strong>
            <pre style={{ margin: '5px 0 0 0', whiteSpace: 'pre-wrap' }}>
              {debugInfo}
            </pre>
            <button 
              onClick={() => setDebugInfo('')}
              style={{
                padding: '5px 10px',
                backgroundColor: '#666',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px',
                marginTop: '10px'
              }}
            >
              Clear
            </button>
          </div>
        )}

        {/* Error Display */}
        {metricsError && (
          <div style={{ 
            padding: '15px', 
            backgroundColor: '#ffebee', 
            color: '#c62828', 
            border: '1px solid #ffcdd2',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <strong>Warning:</strong> Could not load metrics - {metricsError}
          </div>
        )}

        {/* Metrics Cards */}
        {!isLoading && (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
            marginBottom: '30px'
          }}>
            <MetricCard 
              title="Upcoming Appointments" 
              value={metrics?.upcoming_appointments || 0}
              color="#f57c00"
              icon="📅"
            />
            <MetricCard 
              title="Forms Needed" 
              value={metrics?.product_usage_needed || 0}
              color="#2196f3"
              icon="📝"
            />
            <MetricCard 
              title="Low Stock Items" 
              value={metrics?.low_stock || 0}
              color="#f44336"
              icon="⚠️"
            />
            <MetricCard 
              title="Orders Today" 
              value={metrics?.orders_today || 0}
              color="#4caf50"
              icon="💳"
            />
          </div>
        )}

        {/* Recent Appointments Section */}
        {!isLoading && upcoming.length > 0 && (
          <div style={{ marginBottom: '30px' }}>
            <h2 style={{ marginBottom: '15px', color: '#333' }}>Upcoming Appointments</h2>
            <div style={{ 
              backgroundColor: '#fff',
              borderRadius: '8px',
              border: '1px solid #e0e0e0',
              padding: '20px'
            }}>
              {upcoming.map(apt => (
                <div key={apt.id} style={{
                  padding: '15px',
                  borderBottom: '1px solid #f0f0f0',
                  ':last-child': { borderBottom: 'none' }
                }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}>
                    <div>
                      <h4 style={{ margin: '0 0 5px 0', color: '#333' }}>
                        {apt.customer_name}
                      </h4>
                      <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '14px' }}>
                        <strong>Service:</strong> {apt.service_name}
                      </p>
                      <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
                        <strong>Date:</strong> {new Date(apt.appointment_date).toLocaleString()}
                      </p>
                    </div>
                    <div style={{
                      padding: '4px 12px',
                      backgroundColor: apt.status === 'confirmed' ? '#e8f5e8' : '#fff3e0',
                      color: apt.status === 'confirmed' ? '#4caf50' : '#f57c00',
                      borderRadius: '16px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      textTransform: 'uppercase'
                    }}>
                      {apt.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation Links */}
        {!isLoading && (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px'
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
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </>
  )
}

// Metric Card Component
const MetricCard = ({ title, value, color, icon }) => (
  <div style={{
    padding: '20px',
    backgroundColor: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    textAlign: 'center',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.transform = 'translateY(-2px)'
    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)'
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.transform = 'translateY(0)'
    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'
  }}>
    <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>{icon}</div>
    <h3 style={{ 
      margin: '0 0 10px 0', 
      fontSize: '0.9rem', 
      color: '#666',
      textTransform: 'uppercase',
      letterSpacing: '1px',
      fontWeight: '500'
    }}>
      {title}
    </h3>
    <div style={{ 
      fontSize: '2.5rem', 
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
      border: '1px solid #e0e0e0',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      cursor: 'pointer',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      height: '100%'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-2px)'
      e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)'
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)'
      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '15px' }}>{icon}</div>
      <h3 style={{ 
        margin: '0 0 10px 0', 
        color: '#333',
        fontSize: '1.2rem',
        fontWeight: '600'
      }}>
        {title}
      </h3>
      <p style={{ 
        margin: '0', 
        color: '#666',
        fontSize: '0.95rem',
        lineHeight: '1.4'
      }}>
        {description}
      </p>
    </div>
  </Link>
)

// Simple Appointment Card Component
const AppointmentCard = ({ appointment }) => (
  <div style={{
    padding: '20px',
    backgroundColor: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  }}>
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '15px'
    }}>
      <div>
        <h3 style={{ margin: '0 0 5px 0', color: '#333' }}>
          {appointment.customer_name}
        </h3>
        <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
          {appointment.customer_email}
        </p>
      </div>
      <div style={{
        padding: '6px 12px',
        backgroundColor: appointment.status === 'completed' ? '#e8f5e8' : 
                       appointment.status === 'confirmed' ? '#e3f2fd' : '#fff3e0',
        color: appointment.status === 'completed' ? '#4caf50' : 
               appointment.status === 'confirmed' ? '#2196f3' : '#f57c00',
        borderRadius: '16px',
        fontSize: '12px',
        fontWeight: 'bold',
        textTransform: 'uppercase'
      }}>
        {appointment.status}
      </div>
    </div>
    
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '15px'
    }}>
      <div>
        <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '14px' }}>
          <strong>Service:</strong> {appointment.service_name}
        </p>
        <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
          <strong>Date:</strong> {new Date(appointment.appointment_date).toLocaleString()}
        </p>
      </div>
      <div>
        <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '14px' }}>
          <strong>Duration:</strong> {appointment.duration || 60} minutes
        </p>
        <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
          <strong>Price:</strong> ${appointment.total_price || 0}
        </p>
      </div>
    </div>
    
    {appointment.notes && (
      <div style={{ 
        marginTop: '15px',
        padding: '10px',
        backgroundColor: '#f8f9fa',
        borderRadius: '6px',
        borderLeft: '3px solid #f57c00'
      }}>
        <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
          <strong>Notes:</strong> {appointment.notes}
        </p>
      </div>
    )}
  </div>
)
