import { createSupabaseClient } from '../utils/supabaseClient'

const supabase = createSupabaseClient()

export default async function handler(req, res) {
  try {
    const { days = 30, staff_id } = req.query
    const daysBack = parseInt(days)
    const cutoffDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString()

    // Run all queries in parallel for speed
    const [revenueQuery, appointmentsQuery, inventoryQuery, staffQuery] = await Promise.all([
      // Total revenue
      supabase
        .from('bookings')
        .select('total_price, appointment_date')
        .gte('appointment_date', cutoffDate)
        .eq('status', 'completed')
        .not('total_price', 'is', null),

      // Appointments overview
      supabase
        .from('bookings')
        .select('status, appointment_date, service_name')
        .gte('appointment_date', cutoffDate),

      // Low stock items
      supabase
        .from('products')
        .select('product_name, current_stock, min_threshold, cost_per_unit')
        .lte('current_stock', supabase.raw('min_threshold'))
        .eq('is_active', true),

      // Staff performance
      supabase.rpc('staff_revenue_by_user', { p_user_id: staff_id })
    ])

    // Process the data
    const dashboard = {
      dateRange: `${daysBack} days`,
      generatedAt: new Date().toISOString(),
      
      revenue: {
        total: revenueQuery.data?.reduce((sum, booking) => sum + (booking.total_price || 0), 0) || 0,
        averageTicket: revenueQuery.data?.length > 0 ? 
          (revenueQuery.data.reduce((sum, booking) => sum + (booking.total_price || 0), 0) / revenueQuery.data.length) : 0,
        dailyAverage: revenueQuery.data?.length > 0 ? 
          (revenueQuery.data.reduce((sum, booking) => sum + (booking.total_price || 0), 0) / daysBack) : 0
      },

      appointments: {
        total: appointmentsQuery.data?.length || 0,
        completed: appointmentsQuery.data?.filter(a => a.status === 'completed').length || 0,
        upcoming: appointmentsQuery.data?.filter(a => 
          a.status === 'scheduled' && new Date(a.appointment_date) > new Date()
        ).length || 0,
        cancelled: appointmentsQuery.data?.filter(a => a.status === 'cancelled').length || 0
      },

      inventory: {
        lowStockItems: inventoryQuery.data?.length || 0,
        criticalItems: inventoryQuery.data?.filter(item => item.current_stock === 0) || [],
        reorderValue: inventoryQuery.data?.reduce((sum, item) => 
          sum + (item.cost_per_unit * item.min_threshold), 0
        ) || 0
      },

      staff: {
        performance: staffQuery.data || [],
        topPerformer: staffQuery.data?.[0] || null
      }
    }

    // Add insights
    dashboard.insights = generateInsights(dashboard)

    res.json({ success: true, dashboard })
  } catch (error) {
    console.error('Dashboard error:', error)
    res.status(500).json({ error: 'Dashboard generation failed', details: error.message })
  }
}

function generateInsights(dashboard) {
  const insights = []

  // Revenue insights
  if (dashboard.revenue.total > 0) {
    if (dashboard.revenue.averageTicket > 100) {
      insights.push({
        type: 'positive',
        category: 'revenue',
        message: `Strong average ticket of ${dashboard.revenue.averageTicket.toFixed(2)}`,
        impact: 'medium'
      })
    }
  }

  // Appointment insights
  const completionRate = dashboard.appointments.total > 0 ? 
    (dashboard.appointments.completed / dashboard.appointments.total) * 100 : 0
  
  if (completionRate > 85) {
    insights.push({
      type: 'positive',
      category: 'operations',
      message: `Excellent completion rate of ${completionRate.toFixed(1)}%`,
      impact: 'high'
    })
  } else if (completionRate < 70) {
    insights.push({
      type: 'warning',
      category: 'operations',
      message: `Low completion rate of ${completionRate.toFixed(1)}% - review no-show policies`,
      impact: 'high'
    })
  }

  // Inventory insights
  if (dashboard.inventory.lowStockItems > 0) {
    insights.push({
      type: 'warning',
      category: 'inventory',
      message: `${dashboard.inventory.lowStockItems} products need reordering`,
      impact: 'medium',
      action: 'Review inventory and place orders'
    })
  }

  if (dashboard.inventory.criticalItems.length > 0) {
    insights.push({
      type: 'critical',
      category: 'inventory',
      message: `${dashboard.inventory.criticalItems.length} products are OUT OF STOCK`,
      impact: 'high',
      action: 'Immediate reorder required'
    })
  }

  return insights
}
