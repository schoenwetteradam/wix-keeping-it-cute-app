import { createSupabaseClient } from './supabaseClient'

const supabase = createSupabaseClient()

export const fetchMetrics = async () => {
  const result = {
    upcomingAppointments: 0,
    usageFormsNeeded: 0,
    lowStock: 0,
    ordersToday: 0,
    totalRevenue: 0,
    appointmentCount: 0
  }
  const errors = []

  const metricMap = [
    ['metric_upcoming_appointments', 'upcomingAppointments'],
    ['metric_usage_forms_needed', 'usageFormsNeeded'],
    ['metric_low_stock', 'lowStock'],
    ['metric_orders_today', 'ordersToday'],
    ['metric_total_revenue', 'totalRevenue'],
    ['metric_appointment_count', 'appointmentCount']
  ]

  const queries = metricMap.map(([view, key]) =>
    supabase
      .from(view)
      .select('*')
      .limit(1)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error(`Failed to fetch ${view}:`, error)
          errors.push({ view, error })
        } else {
          result[key] = data.count ?? data.total ?? data.metric_value ?? 0
        }
      })
  )

  await Promise.all(queries)

  return { metrics: result, errors }
}
