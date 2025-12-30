import { useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import useWixAuth from '../hooks/useWixAuth'

export default function Login() {
  const wixClientId = process.env.NEXT_PUBLIC_WIX_CLIENT_ID

  if (!wixClientId) {
    return (
      <p style={{ padding: '2rem', textAlign: 'center' }}>
        Missing Wix OAuth configuration. Set <code>NEXT_PUBLIC_WIX_CLIENT_ID</code> in <code>.env.local</code>{' '}
        to enable staff login.
      </p>
    )
  }

  const router = useRouter()
  const { isConnected, isLoading, memberData, error, login, checkStatus } = useWixAuth()

  useEffect(() => {
    router.prefetch('/dashboard')
    router.prefetch('/staff')
  }, [router])

  useEffect(() => {
    if (!isLoading && isConnected) {
      router.replace('/staff')
    }
  }, [isConnected, isLoading, router])

  // Only check status if we have a session - avoid unnecessary API calls
  useEffect(() => {
    // Small delay to ensure component is fully mounted
    const timer = setTimeout(() => {
      checkStatus().catch(err => {
        // Silently handle errors - status check is not critical for login page
        console.warn('Status check failed (non-critical):', err.message);
      });
    }, 100);
    
    return () => clearTimeout(timer);
  }, [checkStatus])

  return (
    <>
      <Head>
        <title>Login - Keeping It Cute Salon</title>
      </Head>
      <div
        style={{
          fontFamily: 'Arial, sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#f8f9fa'
        }}
      >
        <form
          style={{
            background: 'white',
            padding: '30px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            width: '100%',
            maxWidth: '400px'
          }}
        >
          <h1 style={{ marginTop: 0, marginBottom: '20px', textAlign: 'center' }}>
            Staff Login
          </h1>
          <p style={{ marginBottom: '15px', color: '#333' }}>
            Sign in with your Wix staff account for keepingitcute.net. Only team members added
            to the Wix dashboard can access this app.
          </p>
          {error && (
            <p style={{ color: 'red', marginBottom: '15px' }}>❌ {error}</p>
          )}
          {memberData?.member?.contactId && (
            <p style={{ color: '#0f5132', background: '#d1e7dd', padding: '10px', borderRadius: '4px' }}>
              Connected as {memberData.member.profile?.nickname || memberData.member.loginEmail}
            </p>
          )}
          <button
            type="button"
            onClick={() => login('/staff')}
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: '#654321',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {isLoading ? 'Connecting to Wix…' : 'Login with Wix Staff Account'}
          </button>
          <p style={{ marginTop: '15px', textAlign: 'center', color: '#666' }}>
            Need access? Invite the staff member from your Wix dashboard for keepingitcute.net
            and then sign in here.
          </p>
        </form>
      </div>
    </>
  )
}
