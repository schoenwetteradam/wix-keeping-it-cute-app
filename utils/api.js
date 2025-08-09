import { getBrowserSupabaseClient } from './supabaseBrowserClient'

let supabase = null
if (typeof window !== 'undefined') {
  try {
    supabase = getBrowserSupabaseClient()
  } catch {
    // ignore missing env variables in non-browser environments
  }
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
  const res = await fetch(url, opts)
  if (res.status === 401 && typeof window !== 'undefined') {
    window.location.href = '/login'
  }
  return res
}
