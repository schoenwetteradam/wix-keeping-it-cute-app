import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { getBrowserSupabaseClient } from '../utils/supabaseBrowserClient'

export default function Login() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return (
      <p style={{ padding: '2rem', textAlign: 'center' }}>
        Missing Supabase environment variables. Copy <code>.env.example</code> to{' '}
        <code>.env.local</code> and set <code>NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
        <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
      </p>
    )
  }

  const supabase = getBrowserSupabaseClient()

  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [wixLoading, setWixLoading] = useState(false)
  const [wixError, setWixError] = useState(null)

  useEffect(() => {
    router.prefetch('/dashboard')
    router.prefetch('/staff')
  }, [router])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (signInError) {
      setError(
        `${signInError.message}${
          signInError.status ? ` (status ${signInError.status})` : ''
        }`
      )
      setLoading(false)
      return
    }

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser()

    if (userError) {
      setError(
        `${userError.message}${
          userError.status ? ` (status ${userError.status})` : ''
        }`
      )
      setLoading(false)
      return
    }

    let redirect = '/staff'
    if (user) {
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      if (profileError) {
        console.error('Profile fetch error:', profileError)
      } else if (data?.role === 'admin') {
        redirect = '/dashboard'
      }
    }

    await router.push(redirect)
    setLoading(false)
  }

  const startWixOAuth = async () => {
    setWixLoading(true)
    setWixError(null)

    window.location.href = '/api/wix-auth/login'
  }

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
          onSubmit={handleSubmit}
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
            Login
          </h1>
          {error && (
            <p style={{ color: 'red', marginBottom: '15px' }}>❌ {error}</p>
          )}
          {wixError && (
            <p style={{ color: 'red', marginBottom: '15px' }}>❌ {wixError}</p>
          )}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Email</label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              Password
            </label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: '#e0cdbb',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {loading ? 'Signing in...' : 'Login'}
          </button>
          <div style={{ margin: '15px 0', textAlign: 'center' }}>
            <span style={{ display: 'inline-block', margin: '10px 0', color: '#666' }}>
              or
            </span>
            <button
              type="button"
              onClick={startWixOAuth}
              disabled={wixLoading}
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
              {wixLoading ? 'Redirecting…' : 'Login with Wix OAuth'}
            </button>
          </div>
          <p style={{ marginTop: '15px', textAlign: 'center' }}>
            No account? <a href="/signup">Sign up</a>
          </p>
        </form>
      </div>
    </>
  )
}
