// api/get-dashboard-metrics.js
import { createSupabaseClient } from '../utils/supabaseClient'
import { setCorsHeaders } from '../utils/cors'
import requireAuth from '../utils/requireAuth'

const ADMIN_IDS = (process.env.ADMIN_USER_IDS || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean)

const ADMIN_PLACEHOLDER = 'admin-uuid-placeholder'

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
    let rpcUserId = user.id

    if (isAdmin) {
      if (
        staffId === undefined ||
        staffId === '' ||
        staffId === 'null' ||
        staffId === 'undefined'
      ) {
        staffId = null
        rpcUserId = ADMIN_PLACEHOLDER
      } else {
        const { data: staffRow } = await supabase
          .from('staff')
          .select('user_id')
          .eq('id', staffId)
          .single()
        rpcUserId = staffRow?.user_id || ADMIN_PLACEHOLDER
      }
    } else {
      const { data: staffRow } = await supabase
        .from('staff')
        .select('id')
        .eq('user_id', user.id)
        .single()
      staffId = staffRow?.id || user.id
    }

    const { data, error } = await supabase.rpc('dashboard_metrics', { p_staff_id: staffId })
    if (error) {
      throw error
    }

    const { data: revenueData, error: revenueError } = await supabase.rpc('total_revenue_for_user', { user_id: rpcUserId })
    if (revenueError) {
      throw revenueError
    }

    const { data: appointmentData, error: appointmentError } = await supabase.rpc(
      'total_appointments_for_user',
      { user_id: rpcUserId }
    )
    if (appointmentError) {
      throw appointmentError
    }

    const { data: upcomingData, error: upcomingError } = await supabase.rpc('upcoming_appointments', { user_id: rpcUserId })
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
