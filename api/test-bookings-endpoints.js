import { setCorsHeaders } from '../utils/cors'

export default async function handler(req, res) {
  setCorsHeaders(res, 'GET')
  
  const apiToken = process.env.WIX_API_TOKEN
  const siteId = process.env.WIX_SITE_ID
  const baseUrl = 'https://www.wixapis.com'
  
  const endpoints = [
    '/bookings/v1/bookings',
    '/bookings/v2/bookings', 
    '/bookings/v1/bookings/query',
    '/bookings-reader/v1/bookings',
    '/calendar/v1/bookings',
    '/appointments/v1/bookings'
  ]
  
  const results = {}
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${baseUrl}${endpoint}?limit=1`, {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
          'wix-site-id': siteId
        }
      })
      
      results[endpoint] = {
        status: response.status,
        statusText: response.statusText,
        success: response.ok
      }
      
      if (response.ok) {
        const data = await response.json()
        results[endpoint].dataKeys = Object.keys(data)
        results[endpoint].hasBookings = !!data.bookings
        results[endpoint].bookingsCount = data.bookings?.length || 0
      }
      
    } catch (error) {
      results[endpoint] = {
        success: false,
        error: error.message
      }
    }
  }
  
  res.json({
    message: 'Bookings API endpoint test',
    wix_site_id: siteId,
    results: results
  })
}