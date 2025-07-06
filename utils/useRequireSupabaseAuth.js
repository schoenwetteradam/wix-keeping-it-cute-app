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
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace('/login')
      }
    })
  }, [router])
}
