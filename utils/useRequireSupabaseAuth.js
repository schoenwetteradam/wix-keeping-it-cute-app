import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { getBrowserSupabaseClient } from './supabaseBrowserClient'

export default function useRequireSupabaseAuth() {
  const router = useRouter()
  const [authError, setAuthError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseAnonKey) {
      setAuthError('Supabase credentials missing')
      setLoading(false)
      return
    }

    let supabase
    try {
      supabase = getBrowserSupabaseClient()
    } catch {
      setAuthError('Supabase initialization failed')
      setLoading(false)
      return
    }

    async function checkSession() {
      try {
        // Handle URL fragments (magic links, OAuth returns)
        if (typeof window !== 'undefined' && window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1))
          if (hashParams.get('access_token')) {
            // Let Supabase handle the session automatically
            await new Promise(resolve => setTimeout(resolve, 1000))
            window.history.replaceState({}, document.title, window.location.pathname)
          }
        }

        const { data, error } = await supabase.auth.getSession()
        if (error) {
          console.error('Auth check failed:', error)
          router.replace('/login')
          return
        }
        if (!data.session) {
          router.replace('/login')
        }
      } catch (err) {
        console.error('Auth check failed:', err)
        router.replace('/login')
      } finally {
        setLoading(false)
      }
    }

    checkSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        router.replace('/staff')
      } else if (event === 'SIGNED_OUT') {
        router.replace('/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  return { authError, loading }
}
