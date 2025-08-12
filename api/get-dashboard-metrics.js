// api/get-dashboard-metrics.js
const { createSupabaseClient } = require('../utils/supabaseClient')
const { setCorsHeaders } = require('../utils/cors')
const requireAuth = require('../utils/requireAuth')

const ADMIN_IDS = (process.env.ADMIN_USER_IDS || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean)

const supabase = createSupabaseClient()

async function handler(req, res) {
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
    if (!isAdmin) {
      staffId = user.id
    } else if (
      staffId === undefined ||
      staffId === '' ||
      staffId === 'null' ||
      staffId === 'undefined'
    ) {
      staffId = null
    }

    const { data, error } = await supabase.rpc('dashboard_metrics', { p_staff_id: staffId })
    if (error) {
      throw error
    }

    const { data: revenueData, error: revenueError } = await supabase.rpc('total_revenue_for_user', { p_user_id: staffId })
    if (revenueError) {
      throw revenueError
    }

    const { data: appointmentData, error: appointmentError } = await supabase.rpc(
      'total_appointments_for_user',
      { p_user_id: staffId }
    )
    if (appointmentError) {
      throw appointmentError
    }

    const { data: upcomingData, error: upcomingError } = await supabase.rpc('upcoming_appointments', { p_user_id: staffId })
    if (upcomingError) {
      throw upcomingError
    }

    const baseMetrics = Array.isArray(data) ? data[0] : data || {}
    const metrics = {
      ...baseMetrics,
      total_revenue: revenueData || [],
      appointment_counts: appointmentData || [],
      upcoming_appointments_list: upcomingData || []
    }

    res.status(200).json({ success: true, metrics })
  } catch (err) {
    console.error('Dashboard Metrics Error:', err)
    res.status(500).json({
      error: 'Failed to fetch dashboard metrics',
      details: err.message
    })
  }
}

module.exports = handler

