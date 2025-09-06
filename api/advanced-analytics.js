import { createSupabaseClient } from '../utils/supabaseClient'
import { withErrorHandler } from '../utils/errorHandler'

const supabase = createSupabaseClient()

const handler = async (req, res) => {
  const { days = 30, include_charts = 'true' } = req.query
  const daysBack = parseInt(days)

  // Run analytics queries in parallel
  const [dailyRevenue, customerAnalytics, staffPerformance] = await Promise.all([
    supabase.rpc('daily_revenue_analytics', { days_back: daysBack }),
    supabase.rpc('customer_analytics'),
    supabase.rpc('staff_revenue_by_user', { p_user_id: null })
  ])

  const analytics = {
    dateRange: `${daysBack} days`,
    generatedAt: new Date().toISOString(),
    
    revenue: {
      daily: dailyRevenue.data || [],
      total: dailyRevenue.data?.reduce((sum, day) => sum + (day.daily_revenue || 0), 0) || 0,
      trend: calculateTrend(dailyRevenue.data || [])
    },

    customers: {
      ...(customerAnalytics.data?.[0] || {}),
      retentionRate: calculateRetentionRate(customerAnalytics.data?.[0] || {})
    },

    staff: {
      performance: staffPerformance.data || [],
      totalStaff: staffPerformance.data?.length || 0
    }
  }

  // Add chart data if requested
  if (include_charts === 'true') {
    analytics.charts = {
      revenueChart: prepareRevenueChart(dailyRevenue.data || []),
      staffChart: prepareStaffChart(staffPerformance.data || []),
      appointmentTrend: prepareAppointmentChart(dailyRevenue.data || [])
    }
  }

  // Add business insights
  analytics.insights = generateBusinessInsights(analytics)

  res.json({ success: true, analytics })
}

function calculateTrend(dailyData) {
  if (dailyData.length < 7) return 0
  
  const recent = dailyData.slice(-7).reduce((sum, day) => sum + (day.daily_revenue || 0), 0)
  const previous = dailyData.slice(-14, -7).reduce((sum, day) => sum + (day.daily_revenue || 0), 0)
  
  return previous > 0 ? ((recent - previous) / previous) * 100 : 0
}

function calculateRetentionRate(customerData) {
  const { total_customers, repeat_customers } = customerData
  return total_customers > 0 ? (repeat_customers / total_customers) * 100 : 0
}

function prepareRevenueChart(dailyData) {
  return {
    type: 'line',
    data: {
      labels: dailyData.map(day => day.date),
      datasets: [{
        label: 'Daily Revenue',
        data: dailyData.map(day => day.daily_revenue),
        borderColor: '#e0cdbb',
        backgroundColor: '#eee4da'
      }]
    }
  }
}

function prepareStaffChart(staffData) {
  return {
    type: 'bar',
    data: {
      labels: staffData.map(staff => staff.staff_name),
      datasets: [{
        label: 'Revenue',
        data: staffData.map(staff => staff.total_revenue),
        backgroundColor: '#e0cdbb'
      }]
    }
  }
}

function generateBusinessInsights(analytics) {
  const insights = []

  // Revenue trend analysis
  if (analytics.revenue.trend > 15) {
    insights.push({
      type: 'positive',
      category: 'growth',
      message: `Strong revenue growth of ${analytics.revenue.trend.toFixed(1)}% in the last week`,
      recommendation: 'Consider expanding marketing efforts or service offerings'
    })
  } else if (analytics.revenue.trend < -10) {
    insights.push({
      type: 'warning',
      category: 'revenue',
      message: `Revenue declined ${Math.abs(analytics.revenue.trend).toFixed(1)}% in the last week`,
      recommendation: 'Review pricing, service quality, and customer feedback'
    })
  }

  // Customer retention analysis
  const retentionRate = analytics.customers.retentionRate
  if (retentionRate > 60) {
    insights.push({
      type: 'positive',
      category: 'retention',
      message: `Excellent customer retention rate of ${retentionRate.toFixed(1)}%`,
      recommendation: 'Maintain current service quality and consider loyalty programs'
    })
  } else if (retentionRate < 40) {
    insights.push({
      type: 'critical',
      category: 'retention',
      message: `Low customer retention rate of ${retentionRate.toFixed(1)}%`,
      recommendation: 'Implement follow-up campaigns and review service quality'
    })
  }

  // Staff performance insights
  if (analytics.staff.performance.length > 1) {
    const topPerformer = analytics.staff.performance[0]
    const averageRevenue = analytics.staff.performance.reduce(
      (sum, staff) => sum + staff.total_revenue, 0
    ) / analytics.staff.performance.length

    if (topPerformer.total_revenue > averageRevenue * 1.5) {
      insights.push({
        type: 'positive',
        category: 'staff',
        message: `${topPerformer.staff_name} is significantly outperforming team average`,
        recommendation: 'Consider using their techniques for team training'
      })
    }
  }

  return insights
}

export default withErrorHandler(handler)
