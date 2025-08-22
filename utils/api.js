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

// Edge Function Client for calling Supabase edge functions
export class EdgeFunctionClient {
  constructor() {
    this.baseURL =
      process.env.NEXT_PUBLIC_SUPABASE_EDGE_FUNCTIONS_URL ||
      'https://olntonazoswzaihzflos.supabase.co/functions/v1'
    this.enableEdgeFunctions = process.env.ENABLE_EDGE_FUNCTIONS === 'true'
  }

  async callEdgeFunction(functionName, options = {}) {
    if (!this.enableEdgeFunctions) {
      throw new Error('Edge functions not enabled')
    }

    const { action, params = {}, method = 'GET', body, authToken } = options

    const url = new URL(`${this.baseURL}/${functionName}`)
    if (action) url.searchParams.set('action', action)

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, value.toString())
      }
    })

    const headers = {
      'Content-Type': 'application/json'
    }

    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`
    }

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || `Edge function call failed: ${response.status}`)
    }

    return data
  }

  // Booking operations
  async getUpcomingBookings(staffId = null, days = 7, authToken = null) {
    return this.callEdgeFunction('booking-operations', {
      action: 'get-upcoming',
      params: { staff_id: staffId, days, limit: 50 },
      authToken
    })
  }

  async checkAvailability(date, staffId = null, duration = 60) {
    return this.callEdgeFunction('booking-operations', {
      action: 'check-availability',
      params: { date, staff_id: staffId, duration }
    })
  }

  async createBooking(bookingData, authToken) {
    return this.callEdgeFunction('booking-operations', {
      action: 'create',
      method: 'POST',
      body: bookingData,
      authToken
    })
  }

  async updateBooking(bookingId, updates, authToken) {
    return this.callEdgeFunction('booking-operations', {
      action: 'update',
      method: 'POST',
      body: { booking_id: bookingId, ...updates },
      authToken
    })
  }

  async cancelBooking(bookingId, reason, authToken) {
    return this.callEdgeFunction('booking-operations', {
      action: 'cancel',
      method: 'POST',
      body: { booking_id: bookingId, cancellation_reason: reason },
      authToken
    })
  }

  // Staff authentication
  async staffLogin(email, password) {
    return this.callEdgeFunction('staff-auth-handler', {
      action: 'login',
      method: 'POST',
      body: { email, password }
    })
  }

  async verifyStaffToken(authToken) {
    return this.callEdgeFunction('staff-auth-handler', {
      action: 'verify',
      authToken
    })
  }

  async getStaffProfile(authToken) {
    return this.callEdgeFunction('staff-auth-handler', {
      action: 'profile',
      authToken
    })
  }
}

// Create singleton instance
export const edgeClient = new EdgeFunctionClient()

// Hybrid API caller - tries Edge Functions first, falls back to Vercel
export async function callAPIHybrid(endpoint, options = {}) {
  const { useEdge = false, fallback = true, ...fetchOptions } = options

  if (useEdge && process.env.ENABLE_EDGE_FUNCTIONS === 'true') {
    try {
      const [functionName, action] = endpoint.split('?action=')
      if (functionName && action) {
        return await edgeClient.callEdgeFunction(functionName, {
          action,
          ...fetchOptions
        })
      }
    } catch (error) {
      console.warn('Edge function failed, falling back to Vercel API:', error.message)
      if (!fallback) throw error
    }
  }

  return fetchWithAuth(`/api/${endpoint}`, fetchOptions)
}
