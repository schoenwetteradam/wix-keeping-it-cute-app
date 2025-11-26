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
  if ((res.status === 401 || res.status === 403) && typeof window !== 'undefined') {
    const reason = res.status === 403 ? 'staff_only' : 'unauthorized'
    window.location.href = `/login${reason ? `?reason=${reason}` : ''}`
  }
  return res
}
