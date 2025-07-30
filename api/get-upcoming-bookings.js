// api/get-upcoming-bookings.js
import { createSupabaseClient } from '../utils/supabaseClient'
import { setCorsHeaders } from '../utils/cors'

const supabase = createSupabaseClient()

export default async function handler(req, res) {
  setCorsHeaders(res, 'GET')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const { limit = '5' } = req.query
    const limitNum = parseInt(limit, 10)
    if (!Number.isFinite(limitNum) || limitNum < 1) {
      return res.status(400).json({ error: 'Invalid limit parameter' })
    }

    const now = new Date()
    const nextWeek = new Date()
    nextWeek.setDate(now.getDate() + 7)

    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*, salon_services(*)')
      .gte('appointment_date', now.toISOString())
      .lt('appointment_date', nextWeek.toISOString())
      .order('appointment_date', { ascending: true })
      .limit(limitNum)

    if (error) {
      console.error('❌ Upcoming bookings fetch error:', error)
      return res.status(500).json({
        error: 'Failed to fetch upcoming bookings',
        details: error.message
      })
    }

    res.status(200).json({
      success: true,
      bookings: bookings || [],
      count: bookings?.length || 0,
      timestamp: new Date().toISOString()
    })
  } catch (err) {
    console.error('❌ Get Upcoming Bookings Error:', err)
    res.status(500).json({
      error: 'Unexpected error',
      details: err.message
    })
  }
}
