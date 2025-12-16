import { createClient } from '@supabase/supabase-js'

let client = null

export function getBrowserSupabaseClient() {
  if (typeof window === 'undefined') {
    // Return null during SSR instead of throwing
    // Components should check for null or call this inside useEffect
    return null
  }

  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
    }
    client = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  }
  return client
}
