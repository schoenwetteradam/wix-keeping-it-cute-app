import React, { useEffect } from 'react'
import { useRouter } from 'next/router'
import ErrorBoundary from '../components/ErrorBoundary'
import Layout from '../components/Layout'
import { getBrowserSupabaseClient } from '../utils/supabaseBrowserClient'
import '../styles/globals.css'

export default function MyApp({ Component, pageProps }) {
  const router = useRouter()

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const supabase = getBrowserSupabaseClient()
      
      // Listen for auth state changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
          router.replace('/staff')
        } else if (event === 'SIGNED_OUT') {
          router.replace('/login')
        }
      })

      return () => subscription.unsubscribe()
    } catch {
      // Missing env vars, ignore
    }
  }, [router])

  return (
    <ErrorBoundary>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </ErrorBoundary>
  )
}
