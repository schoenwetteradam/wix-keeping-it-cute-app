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
    const hash = window.location.hash
    if (!hash || !hash.includes('access_token')) return

    try {
      const supabase = getBrowserSupabaseClient()
      supabase.auth
      .getSessionFromUrl()
      .then(({ data }) => {
        if (data?.session) {
          router.replace('/staff')
        }
      })
      .catch(() => {})
    } catch {
      // missing env vars, ignore
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
