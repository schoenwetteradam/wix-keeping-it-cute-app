import { setCorsHeaders } from '../utils/cors'
import requireAuth from '../utils/requireAuth'
import { createSupabaseClient } from '../utils/supabaseClient'

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

    const { measurement_types = [], 'date_range.start_date': startDate, 'date_range.end_date': endDate } = req.query
    const types = Array.isArray(measurement_types) ? measurement_types : [measurement_types]
    if (!types.length) {
      return res.status(400).json({ error: 'measurement_types is required' })
    }

    const start = startDate ? new Date(startDate) : null
    const end = endDate ? new Date(endDate) : null
    if (end) end.setDate(end.getDate() + 1)

    const results = []
    for (const type of types) {
      switch (type) {
        case 'TOTAL_SESSIONS': {
          let query = supabase.from('sessions').select('*', { count: 'exact', head: true })
          if (start) query = query.gte('started_at', start.toISOString())
          if (end) query = query.lt('started_at', end.toISOString())
          const { count, error } = await query
          if (error) throw error
          results.push({ type, total: count || 0, values: [] })
          break
        }
        case 'TOTAL_UNIQUE_VISITORS': {
          let query = supabase.from('sessions').select('visitor_id')
          if (start) query = query.gte('started_at', start.toISOString())
          if (end) query = query.lt('started_at', end.toISOString())
          const { data, error } = await query
          if (error) throw error
          const unique = new Set(data.map((r) => r.visitor_id).filter(Boolean)).size
          results.push({ type, total: unique, values: [] })
          break
        }
        case 'TOTAL_ORDERS': {
          let query = supabase.from('orders').select('*', { count: 'exact', head: true })
          if (start) query = query.gte('created_at', start.toISOString())
          if (end) query = query.lt('created_at', end.toISOString())
          const { count, error } = await query
          if (error) throw error
          results.push({ type, total: count || 0, values: [] })
          break
        }
        case 'TOTAL_SALES': {
          let query = supabase.from('orders').select('total_amount')
          if (start) query = query.gte('created_at', start.toISOString())
          if (end) query = query.lt('created_at', end.toISOString())
          const { data, error } = await query
          if (error) throw error
          const sum = data.reduce((s, o) => s + Number(o.total_amount || 0), 0)
          results.push({ type, total: sum, values: [] })
          break
        }
        default:
          results.push({ type, total: 0, values: [] })
      }
    }

    res.status(200).json({ success: true, data: results })
  } catch (err) {
    console.error('Site Analytics Error:', err)
    res.status(500).json({ error: 'Failed to fetch site analytics', details: err.message })
  }
}
