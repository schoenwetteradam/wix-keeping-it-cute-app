import { setCorsHeaders } from '../utils/cors'
import { getWixRequestHeaders } from '../utils/wixAccessToken'

export default async function handler(req, res) {
  setCorsHeaders(res, 'GET')

  const siteId    = process.env.WIX_SITE_ID
  const baseUrl   = 'https://www.wixapis.com'
  const baseHeaders = await getWixRequestHeaders({ 'Content-Type': 'application/json' })

  // We try both GET (for comparison) and the correct POST /query variants,
  // and we try multiple request-body shapes Wix has accepted across tenants.
  const tests = [
    { method: 'GET',  path: '/bookings/v1/bookings?limit=1' },

    // Proper POST /query attempts
    { method: 'POST', path: '/bookings/v1/bookings/query',        body: { query: { paging: { limit: 1 } } } },
    { method: 'POST', path: '/bookings/v1/bookings/query',        body: { paging: { limit: 1 } } },                 // alt
    { method: 'POST', path: '/bookings-reader/v1/bookings/query', body: { query: { paging: { limit: 1 } } } },
    { method: 'POST', path: '/bookings-reader/v1/bookings/query', body: { paging: { limit: 1 } } },                 // alt
    { method: 'POST', path: '/calendar/v1/bookings/query',        body: { query: { paging: { limit: 1 } } } },      // long shot
  ]

  const results = {}

  for (const t of tests) {
    try {
      const url = `${baseUrl}${t.path}`
      const headers = { ...baseHeaders }
      const resp = await fetch(url, {
        method: t.method,
        headers,
        ...(t.body ? { body: JSON.stringify(t.body) } : {})
      })

      const info = { status: resp.status, statusText: resp.statusText, success: resp.ok }
      const text = await resp.text()
      try {
        const json = JSON.parse(text)
        info.json = Object.keys(json)
        info.hasBookings = !!json.bookings
        info.bookingsCount = Array.isArray(json.bookings) ? json.bookings.length : 0
        info.sample = Array.isArray(json.bookings) && json.bookings[0] ? (json.bookings[0].id || json.bookings[0]._id) : null
      } catch {
        info.body = text  // show exact error if not JSON
      }

      results[`${t.method} ${t.path}`] = info
    } catch (e) {
      results[`${t.method} ${t.path}`] = { success: false, error: e.message }
    }
  }

  res.json({ message: 'Bookings API endpoint test (POST /query, multiple payloads)', wix_site_id: siteId, results })
}
