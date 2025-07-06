import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let supabase = null
if (typeof window !== 'undefined' && supabaseUrl && anonKey) {
  supabase = createClient(supabaseUrl, anonKey)
}

function getStoredToken() {
  if (typeof window === 'undefined' || !supabaseUrl) return null
  try {
    const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
    const key = `sb-${projectRef}-auth-token`
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw).access_token || null
  } catch {
    return null
  }
}

export async function fetchWithAuth(url, options = {}) {
  const opts = { ...options, headers: { ...(options.headers || {}) } }

  let token = null
  if (supabase) {
    const { data } = await supabase.auth.getSession()
    token = data?.session?.access_token || null
  }
  if (!token) {
    token = getStoredToken()
  }
  if (token) {
    opts.headers['Authorization'] = `Bearer ${token}`
  }

  return fetch(url, opts)
}
