import { getBrowserSupabaseClient } from '../utils/supabaseBrowserClient'

export default function DebugLogin() {
  const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
  const hasSupabaseKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  let supabase = null
  let supabaseError = null

  try {
    supabase = getBrowserSupabaseClient()
  } catch (error) {
    supabaseError = error.message
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace' }}>
      <h1>Login Debug Information</h1>

      <h2>Environment Variables</h2>
      <ul>
        <li>NEXT_PUBLIC_SUPABASE_URL: {hasSupabaseUrl ? '✅ Set' : '❌ Missing'}</li>
        <li>NEXT_PUBLIC_SUPABASE_ANON_KEY: {hasSupabaseKey ? '✅ Set' : '❌ Missing'}</li>
      </ul>

      <h2>Supabase Client</h2>
      {supabaseError ? (
        <p style={{ color: 'red' }}>❌ Error: {supabaseError}</p>
      ) : (
        <p style={{ color: 'green' }}>✅ Supabase client initialized successfully</p>
      )}

      <h2>Next Steps</h2>
      {!hasSupabaseUrl || !hasSupabaseKey ? (
        <div style={{ background: '#fff3cd', padding: '1rem', borderRadius: '4px' }}>
          <p><strong>Missing Environment Variables!</strong></p>
          <p>You need to set up your Supabase credentials:</p>
          <ol>
            <li>Create a <code>.env.local</code> file in the project root</li>
            <li>Add your Supabase URL and Anon Key</li>
            <li>Restart the dev server</li>
          </ol>
          <p>Or if deployed to Vercel, add them in the Vercel dashboard under Settings → Environment Variables</p>
        </div>
      ) : (
        <div style={{ background: '#d4edda', padding: '1rem', borderRadius: '4px' }}>
          <p><strong>Environment is configured!</strong></p>
          <p>Try these steps if login still doesn't work:</p>
          <ol>
            <li>Check browser console for errors (F12 → Console)</li>
            <li>Verify your Supabase project is active</li>
            <li>Ensure you have created a user account in Supabase</li>
            <li>Check that email confirmations are disabled (for testing)</li>
          </ol>
        </div>
      )}

      <div style={{ marginTop: '2rem' }}>
        <a href="/login" style={{ color: '#007bff' }}>← Back to Login</a>
      </div>
    </div>
  )
}
