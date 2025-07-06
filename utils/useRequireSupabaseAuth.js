import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { createClient } from '@supabase/supabase-js'

export default function useRequireSupabaseAuth() {
  const router = useRouter()

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseAnonKey) {
      router.replace('/login')
      return
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    async function checkSession() {
      if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
        try {
          const { data } = await supabase.auth.getSessionFromUrl()
          if (data?.session) {
            router.replace('/staff')
            return
          }
        } catch (err) {
          console.error('Failed to parse invite link', err)
        }
      }

      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        router.replace('/login')
      }
    }

    checkSession()
  }, [router])
}
