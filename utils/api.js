import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let supabase = null
if (typeof window !== 'undefined' && supabaseUrl && anonKey) {
  supabase = createClient(supabaseUrl, anonKey)
}

export async function fetchWithAuth(url, options = {}) {
  const opts = { ...options, headers: { ...(options.headers || {}) } }
  if (supabase) {
    const { data } = await supabase.auth.getSession()
    const token = data?.session?.access_token
    if (token) {
      opts.headers['Authorization'] = `Bearer ${token}`
    }
  }
  return fetch(url, opts)
}
