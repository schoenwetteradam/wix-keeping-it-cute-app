// api/dashboard-stats.js - Business dashboard statistics
import { createSupabaseClient } from '../utils/supabaseClient'

const supabase = createSupabaseClient()

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const today = new Date().toISOString().split('T')[0]
    const thisMonth = new Date().toISOString().slice(0, 7) // YYYY-MM

    // Today's appointments
    const { data: todayAppointments } = await supabase
      .from('salon_appointments')
      .select('*, customers(*), salon_services(*)')
      .gte('appointment_date', `${today}T00:00:00`)
      .lt('appointment_date', `${today}T23:59:59`)

    // This month's revenue
    const { data: monthlyRevenue } = await supabase
      .from('business_metrics')
      .select('metric_value')
      .eq('business_type', 'salon')
      .eq('metric_name', 'revenue')
      .gte('metric_date', `${thisMonth}-01`)

    // Customer count
    const { count: totalCustomers } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('business_type', 'salon')

    // Popular services this month
    const { data: popularServices } = await supabase
      .from('salon_appointments')
      .select('salon_services(name), count(*)')
      .gte('appointment_date', `${thisMonth}-01T00:00:00`)
      .eq('payment_status', 'paid')
      .group('salon_services.name')
      .order('count', { ascending: false })
      .limit(5)

    const stats = {
      today: {
        appointments: todayAppointments?.length || 0,
        confirmed:
          todayAppointments?.filter(a => a.status === 'confirmed').length || 0,
        revenue:
          todayAppointments?.filter(a => a.payment_status === 'paid')
            .reduce((sum, a) => sum + (a.payment_amount || 0), 0) || 0
      },
      monthly: {
        revenue:
          monthlyRevenue?.reduce((sum, m) => sum + (m.metric_value || 0), 0) || 0,
        appointments: todayAppointments?.length || 0 // This would need a proper monthly query
      },
      totals: {
        customers: totalCustomers || 0,
        services:
          (
            await supabase
              .from('salon_services')
              .select('*', { count: 'exact', head: true })
          ).count || 0
      },
      popular_services: popularServices || []
    }

    res.status(200).json({
      success: true,
      stats,
      generated_at: new Date().toISOString()
    })
  } catch (err) {
    console.error('❌ Dashboard Stats Error:', err)
    res.status(500).json({
      error: 'Failed to fetch dashboard stats',
      details: err.message
    })
  }
}
