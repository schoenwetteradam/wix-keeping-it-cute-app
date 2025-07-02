// api/get-loyalty.js
import { createClient } from '@supabase/supabase-js'
import { setCorsHeaders } from '../utils/cors'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

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
    const { limit = '50', email, contact_id } = req.query

    let query = supabase.from('loyalty').select('*')

    if (email) {
      query = query.eq('email', email)
    }

    if (contact_id) {
      query = query.eq('contact_id', contact_id)
    }

    if (!email && !contact_id) {
      query = query.limit(parseInt(limit))
    }

    query = query.order('last_activity', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error('❌ Loyalty fetch error:', error)
      return res.status(500).json({ error: 'Failed to fetch loyalty records', details: error.message })
    }

    res.status(200).json({
      success: true,
      loyalty: data || [],
      count: data?.length || 0,
      timestamp: new Date().toISOString()
    })
  } catch (err) {
    console.error('❌ Get Loyalty Error:', err)
    res.status(500).json({ error: 'Unexpected error', details: err.message })
  }
}
