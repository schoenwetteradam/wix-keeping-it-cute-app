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
        if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
          try {
            const { data } = await supabase.auth.getSessionFromUrl()
            if (data?.session) {
              router.replace('/staff')
              return
            }
          } catch (e) {
            // ignore parsing errors
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
  }, [router])

  return { authError, loading }
}
