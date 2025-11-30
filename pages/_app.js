import React, { useEffect } from 'react'
import { useRouter } from 'next/router'
import ErrorBoundary from '../components/ErrorBoundary'
import Layout from '../components/Layout'
import { getBrowserSupabaseClient } from '../utils/supabaseBrowserClient'
import '../styles/globals.css'

const ALLOWED_STAFF_DOMAINS = (process.env.NEXT_PUBLIC_ALLOWED_STAFF_DOMAINS || 'keepingitcute.com,wix.com')
  .split(',')
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean)

export default function MyApp({ Component, pageProps }) {
  const router = useRouter()

  useEffect(() => {
    const originalWarn = console.warn
    let i18nWarningLogged = false

    console.warn = (...args) => {
      const [message] = args || []
      if (
        typeof message === 'string' &&
        message.includes(
          'react-i18next:: It seems you are still using the old wait option'
        )
      ) {
        if (!i18nWarningLogged) {
          originalWarn(
            'react-i18next is reporting the legacy "wait" option. Update i18n config to use the "useSuspense" flag to avoid this warning.'
          )
          i18nWarningLogged = true
        }
        return
      }

      originalWarn(...args)
    }

    return () => {
      console.warn = originalWarn
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    let supabase
    try {
      supabase = getBrowserSupabaseClient()
    } catch {
      return
    }
    const openRoutes = ['/login', '/signup']

    const enforceStaffAccess = async () => {
      if (openRoutes.includes(router.pathname)) return

      try {
        const { data, error } = await supabase.auth.getSession()
        if (error || !data.session) {
          router.replace('/login')
          return
        }

        const user = data.session.user
        const userEmail = user?.email?.toLowerCase() || ''
        const domain = userEmail.split('@')[1]
        if (!domain || !ALLOWED_STAFF_DOMAINS.includes(domain)) {
          await supabase.auth.signOut()
          router.replace('/login?reason=staff_only')
          return
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()

        const normalizedRole = profile?.role?.toLowerCase()
        const isStaff = normalizedRole === 'staff' || normalizedRole === 'admin'

        if (profileError || !isStaff) {
          await supabase.auth.signOut()
          router.replace('/login?reason=staff_only')
        }
      } catch (err) {
        console.error('Auth enforcement failed:', err)
        router.replace('/login')
      }
    }

    enforceStaffAccess()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        router.replace('/staff')
      } else if (event === 'SIGNED_OUT') {
        router.replace('/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [router, router.pathname])

  return (
    <ErrorBoundary>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </ErrorBoundary>
  )
}
