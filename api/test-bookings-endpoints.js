// api/test-bookings-endpoints.js
import { setCorsHeaders } from '../utils/cors'

export default async function handler(req, res) {
  setCorsHeaders(res, 'GET')

  const apiToken = process.env.WIX_API_TOKEN
  const siteId = process.env.WIX_SITE_ID
  const accountId = process.env.WIX_ACCOUNT_ID // optional, add if you have it
  const baseUrl = 'https://www.wixapis.com'

  // We'll try both GET and POST /query variants across v1 + reader
  const tests = [
    { method: 'GET',  path: '/bookings/v1/bookings?limit=1' },
    { method: 'POST', path: '/bookings/v1/bookings/query', body: { query: { paging: { limit: 1 } } } },
    { method: 'POST', path: '/bookings-reader/v1/bookings/query', body: { query: { paging: { limit: 1 } } } },
    // fallback experiment: some tenants only respond here
    { method: 'POST', path: '/calendar/v1/bookings/query', body: { query: { paging: { limit: 1 } } } },
  ]

  const results = {}

  for (const t of tests) {
    try {
      const url = `${baseUrl}${t.path}`
      const headers = {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
        'wix-site-id': siteId,
      }
      if (accountId) headers['wix-account-id'] = accountId

      const resp = await fetch(url, {
        method: t.method,
        headers,
        ...(t.body ? { body: JSON.stringify(t.body) } : {})
      })

      const info = { status: resp.status, statusText: resp.statusText, success: resp.ok }
      if (resp.ok) {
        const data = await resp.json()
        info.dataKeys = Object.keys(data)
        info.hasBookings = !!data.bookings
        info.bookingsCount = Array.isArray(data.bookings) ? data.bookings.length : 0
        info.sample = Array.isArray(data.bookings) && data.bookings[0] ? data.bookings[0].id || data.bookings[0]._id : null
      } else {
        info.body = await resp.text()
      }
      results[`${t.method} ${t.path}`] = info
    } catch (e) {
      results[`${t.method} ${t.path}`] = { success: false, error: e.message }
    }
  }

  res.json({ message: 'Bookings API endpoint test (POST /query variants)', wix_site_id: siteId, results })
}
