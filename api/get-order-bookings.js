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
    const { order_id, limit = '50' } = req.query

    if (!order_id) {
      return res.status(400).json({ error: 'order_id is required' })
    }

    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('wix_order_id', order_id)
      .order('appointment_date', { ascending: false })
      .limit(parseInt(limit))

    if (error) {
      console.error('❌ Order bookings error:', error)
      return res.status(500).json({
        error: 'Failed to fetch bookings',
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
    console.error('❌ Get Order Bookings Error:', err)
    res.status(500).json({ error: 'Unexpected error', details: err.message })
  }
}
