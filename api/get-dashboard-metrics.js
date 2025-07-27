// api/get-dashboard-metrics.js
import { createSupabaseClient } from '../utils/supabaseClient'
import { setCorsHeaders } from '../utils/cors'
import requireAuth from '../utils/requireAuth'

const ADMIN_IDS = (process.env.ADMIN_USER_IDS || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean)

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

    const isAdmin = ADMIN_IDS.includes(user.id)

    let staffId = req.query.staff_id
    if (!isAdmin || staffId === undefined) {
      staffId = user.id
    } else if (staffId === '' || staffId === 'null') {
      staffId = null
    }
    const { data, error } = await supabase.rpc('dashboard_metrics', { p_staff_id: staffId })
    if (error) {
      throw error
    }
    res.status(200).json({ success: true, metrics: data ? data[0] : {} })
  } catch (err) {
    console.error('Dashboard Metrics Error:', err)
    res.status(500).json({
      error: 'Failed to fetch dashboard metrics',
      details: err.message
    })
  }
}
