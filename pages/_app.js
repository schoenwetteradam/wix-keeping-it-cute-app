import React, { useEffect } from 'react'
import { useRouter } from 'next/router'
import { createClient } from '@supabase/supabase-js'
import ErrorBoundary from '../components/ErrorBoundary'
import Layout from '../components/Layout'
import '../styles/globals.css'

export default function MyApp({ Component, pageProps }) {
  const router = useRouter()

  useEffect(() => {
    async function handleMagicLink() {
      if (typeof window === 'undefined') return
      const hash = window.location.hash
      if (!hash || !hash.includes('access_token')) return

      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (!url || !key) return

      const supabase = createClient(url, key)
      try {
        const { data } = await supabase.auth.getSessionFromUrl()
        if (data?.session) {
          router.replace('/staff')
        }
      } catch (err) {
        console.error('Failed to process magic link', err)
      }
    }

    handleMagicLink()
  }, [router])

  return (
    <ErrorBoundary>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </ErrorBoundary>
  )
}
