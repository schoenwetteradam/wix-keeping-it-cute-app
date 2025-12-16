/**
 * Shared Supabase Browser Client Singleton
 * Use this for both Pages Router and App Router to avoid multiple client instances
 */

import { createClient } from '@supabase/supabase-js'

let client = null

export function getSharedBrowserSupabaseClient() {
  if (typeof window === 'undefined') {
    throw new Error('getSharedBrowserSupabaseClient can only be called in the browser')
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

