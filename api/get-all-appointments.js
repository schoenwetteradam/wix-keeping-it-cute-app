import { createSupabaseClient } from '../utils/supabaseClient'
import { setCorsHeaders } from '../utils/cors'
import requireAuth from '../utils/requireAuth'

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
    const user = await requireAuth(req, res)
    if (!user) return

    const { limit = '100' } = req.query

    console.log('📋 Fetching ALL appointments without filtering for user:', user.id)

    // Get ALL appointments without any staff filtering
    const { data: appointments, error } = await supabase
      .from('bookings')
      .select('*')
      .order('appointment_date', { ascending: false })
      .limit(parseInt(limit))

    if (error) {
      console.error('❌ Appointments fetch error:', error)
      return res.status(500).json({
        error: 'Failed to fetch appointments',
        details: error.message
      })
    }

    console.log(`✅ Found ${appointments.length} total appointments`)

    res.status(200).json({
      success: true,
      appointments: appointments || [],
      count: appointments?.length || 0,
      timestamp: new Date().toISOString(),
      note: 'This shows ALL appointments without staff filtering'
    })

  } catch (err) {
    console.error('❌ Get All Appointments Error:', err)
    res.status(500).json({ 
      error: 'Unexpected error', 
      details: err.message 
    })
  }
}
