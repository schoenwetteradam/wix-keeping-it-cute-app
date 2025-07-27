// api/get-customers.js
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
    const {
      limit = '50',
      search,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query

    let query = supabase
      .from('contacts')
      .select('*')
      .limit(parseInt(limit))

    if (search) {
      const term = `%${search}%`
      query = query.or(
        `first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term}`
      )
    }

    if (sort_by) {
      query = query.order(sort_by, { ascending: sort_order.toLowerCase() !== 'desc' })
    }

    const { data: customers, error } = await query

    if (error) {
      console.error('❌ Customers fetch error:', error)
      return res.status(500).json({
        error: 'Failed to fetch customers',
        details: error.message
      })
    }

    res.status(200).json({
      success: true,
      customers: customers || [],
      count: customers?.length || 0,
      timestamp: new Date().toISOString()
    })
  } catch (err) {
    console.error('❌ Get Customers Error:', err)
    res.status(500).json({
      error: 'Unexpected error',
      details: err.message
    })
  }
}
