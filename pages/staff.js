import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import useRequireSupabaseAuth from '../utils/useRequireSupabaseAuth'
import useRequireRole from '../utils/useRequireRole'
import { fetchWithAuth } from '../utils/api'
import AppointmentCard from '../components/AppointmentCard'
import { getBrowserSupabaseClient } from '../utils/supabaseBrowserClient'

export default function StaffDashboard() {
  const { authError, loading: authLoading } = useRequireSupabaseAuth()
  const unauthorized = useRequireRole(['staff', 'admin'])
  const router = useRouter()

  // State variables
  const [appointments, setAppointments] = useState([])
  const [apptLoading, setApptLoading] = useState(false)
  const [apptError, setApptError] = useState(null)
  const [debugInfo, setDebugInfo] = useState(null)

  // Debugging helper
  const debugAppointments = async () => {
    const supabase = getBrowserSupabaseClient()
    console.log('🔍 Starting appointments debug...')

    try {
      // 1. Check authentication
      const { data: session } = await supabase.auth.getSession()
      console.log('Auth session:', {
        hasSession: !!session?.session,
        accessToken: session?.session?.access_token ? 'Present' : 'Missing',
        userId: session?.session?.user?.id,
        userEmail: session?.session?.user?.email
      })

      // 2. Test API connectivity
      const testRes = await fetch('/api/get-appointments?page=1&limit=5&scope=mine', {
        headers: {
          'Authorization': `Bearer ${session?.session?.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('API Response Status:', testRes.status)
      console.log('API Response Headers:', Object.fromEntries(testRes.headers))

      if (!testRes.ok) {
        const errorText = await testRes.text()
        console.error('API Error Response:', errorText)
        return
      }

      const apiData = await testRes.json()
      console.log('API Success Response:', {
        success: apiData.success,
        appointmentsCount: apiData.appointments?.length || 0,
        sampleAppointment: apiData.appointments?.[0] || 'No appointments',
        timestamp: apiData.timestamp
      })

      // 3. Test direct database connection
      try {
        const { data: directData, error: directError } = await supabase
          .from('bookings')
          .select('*')
          .limit(5)

        console.log('Direct DB Query:', {
          error: directError,
          count: directData?.length || 0,
          sample: directData?.[0] || 'No data'
        })
      } catch (dbError) {
        console.log('Direct DB Error:', dbError.message)
      }

      // 4. Check profile and permissions
      try {
        const profileRes = await fetch('/api/profile', {
          headers: {
            'Authorization': `Bearer ${session?.session?.access_token}`
          }
        })

        if (profileRes.ok) {
          const profileData = await profileRes.json()
          console.log('Profile Data:', {
            isAdmin: profileData.profile?.is_admin,
            role: profileData.profile?.role,
            fullName: profileData.profile?.full_name
          })
        }
      } catch (profileError) {
        console.log('Profile Error:', profileError.message)
      }
    } catch (error) {
      console.error('Debug Error:', error)
    }
  }

  // Enhanced load appointments function with debugging
  const loadAppointments = async () => {
    setApptLoading(true)
    setApptError(null)

    try {
      console.log('🔄 Loading appointments...')

      // Step 1: Verify authentication
      const authResponse = await fetchWithAuth('/api/profile')
      if (!authResponse.ok) {
        throw new Error(`Authentication failed: ${authResponse.status}`)
      }

      const profileData = await authResponse.json()
      console.log('✅ Authentication verified:', {
        userId: profileData.profile?.id,
        role: profileData.profile?.role,
        isAdmin: profileData.profile?.is_admin
      })

      // Step 2: Load appointments with multiple fallback strategies
      let appointmentsData = []
      let lastError = null

      // Strategy 1: Try with scope=mine
      try {
        console.log('📡 Attempting to load appointments with scope=mine')
        const res = await fetchWithAuth('/api/get-appointments?scope=mine&limit=100')

        if (res.ok) {
          const data = await res.json()
          appointmentsData = data.appointments || data || []
          console.log(`✅ Loaded ${appointmentsData.length} appointments with scope=mine`)
        } else {
          const errorText = await res.text()
          lastError = `API Error (${res.status}): ${errorText}`
          console.warn('⚠️ scope=mine failed:', lastError)
        }
      } catch (err) {
        lastError = err.message
        console.warn('⚠️ scope=mine exception:', err)
      }

      // Strategy 2: Try without scope if mine failed
      if (appointmentsData.length === 0 && lastError) {
        try {
          console.log('📡 Attempting to load appointments without scope')
          const res = await fetchWithAuth('/api/get-appointments?limit=100')

          if (res.ok) {
            const data = await res.json()
            appointmentsData = data.appointments || data || []
            console.log(`✅ Loaded ${appointmentsData.length} appointments without scope`)
          } else {
            const errorText = await res.text()
            lastError = `API Error (${res.status}): ${errorText}`
            console.warn('⚠️ No scope failed:', lastError)
          }
        } catch (err) {
          lastError = err.message
          console.warn('⚠️ No scope exception:', err)
        }
      }

      // Strategy 3: Try the alternative appointments endpoint
      if (appointmentsData.length === 0 && lastError) {
        try {
          console.log('📡 Attempting alternative appointments endpoint')
          const res = await fetchWithAuth('/api/appointments?limit=100')

          if (res.ok) {
            const data = await res.json()
            appointmentsData = data.appointments || data || []
            console.log(`✅ Loaded ${appointmentsData.length} appointments from alternative endpoint`)
          } else {
            console.warn('⚠️ Alternative endpoint failed:', res.status)
          }
        } catch (err) {
          console.warn('⚠️ Alternative endpoint exception:', err)
        }
      }

      // Update state
      setAppointments(appointmentsData)
      setDebugInfo({
        totalLoaded: appointmentsData.length,
        lastError: appointmentsData.length === 0 ? lastError : null,
        sampleAppointment: appointmentsData[0] || null,
        timestamp: new Date().toISOString()
      })

      if (appointmentsData.length === 0 && lastError) {
        setApptError(lastError)
      }
    } catch (err) {
      console.error('❌ Load appointments critical error:', err)
      setApptError(err.message)
      setDebugInfo({
        criticalError: err.message,
        timestamp: new Date().toISOString()
      })
    } finally {
      setApptLoading(false)
    }
  }

  // Load appointments when tab changes to appointments
  useEffect(() => {
    if (unauthorized || authLoading) return

    if (router.isReady && router.query.tab === 'appointments') {
      console.log('🎯 Loading appointments for tab:', router.query.tab)
      debugAppointments()
      loadAppointments()
    }
  }, [router.isReady, router.query.tab, unauthorized, authLoading])

  // Complete appointment function
  const completeAppointment = async (apt) => {
    if (!confirm('Mark this appointment completed?')) return

    try {
      const res = await fetchWithAuth(`/api/complete-booking/${apt.id}`, {
        method: 'POST'
      })

      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(`Failed to complete: ${errorText}`)
      }

      setAppointments(
        appointments.map(a => a.id === apt.id ? { ...a, status: 'completed' } : a)
      )

      console.log('✅ Appointment completed:', apt.id)
    } catch (err) {
      alert(`Failed to mark completed: ${err.message}`)
      console.error('❌ Complete error:', err)
    }
  }

  // Cancel appointment function
  const cancelAppointment = async (apt) => {
    if (!confirm('Cancel this appointment?')) return

    try {
      const res = await fetchWithAuth(`/api/cancel-booking/${apt.id}`, {
        method: 'POST'
      })

      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(`Failed to cancel: ${errorText}`)
      }

      setAppointments(
        appointments.map(a => a.id === apt.id ? { ...a, status: 'cancelled' } : a)
      )

      console.log('✅ Appointment cancelled:', apt.id)
    } catch (err) {
      alert(`Failed to cancel: ${err.message}`)
      console.error('❌ Cancel error:', err)
    }
  }

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

          {/* Debug Information (remove in production) */}
          {debugInfo && (
            <div style={{
              padding: '10px',
              backgroundColor: '#e3f2fd',
              border: '1px solid #2196f3',
              borderRadius: '4px',
              marginBottom: '20px',
              fontSize: '12px'
            }}>
              <strong>Debug Info:</strong>
              <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
            </div>
          )}

          {/* Refresh Button */}
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
              marginBottom: '20px',
              opacity: apptLoading ? 0.6 : 1
            }}
          >
            {apptLoading ? 'Loading...' : 'Refresh Appointments'}
          </button>

          {/* Content */}
          {apptLoading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p>Loading appointments...</p>
              <div style={{
                width: '40px',
                height: '40px',
                border: '4px solid #f3f3f3',
                borderTop: '4px solid #f57c00',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '20px auto'
              }}></div>
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
              <p><strong>Troubleshooting Steps:</strong></p>
              <ol>
                <li>Check your internet connection</li>
                <li>Verify you're logged in (try refreshing the page)</li>
                <li>Check browser console for additional errors</li>
                <li>Contact support if the issue persists</li>
              </ol>
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
              <h3>No Appointments Found</h3>
              <p>You don't have any appointments at the moment.</p>
              <p>New appointments will appear here once they're booked.</p>
            </div>
          ) : (
            <div>
              <p style={{ marginBottom: '20px', color: '#666' }}>
                Found {appointments.length} appointment{appointments.length !== 1 ? 's' : ''}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {appointments.map(apt => (
                  <AppointmentCard
                    key={apt.id}
                    appointment={apt}
                    onComplete={() => completeAppointment(apt)}
                    onCancel={() => cancelAppointment(apt)}
                    onUpdateNotes={(notes) => {
                      // Handle notes update if needed
                      console.log('Update notes for', apt.id, ':', notes)
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: '20px' }}>
            <Link href='/staff'>← Back to Dashboard</Link>
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

  // Rest of your main dashboard component...
  return (
    <div>
      {/* Your existing dashboard content */}
    </div>
  )
}

