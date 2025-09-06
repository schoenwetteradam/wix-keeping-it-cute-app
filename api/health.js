import { createSupabaseClient } from '../utils/supabaseClient'

const supabase = createSupabaseClient()

export default async function handler(req, res) {
  const startTime = Date.now()
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {},
    performance: {}
  }

  try {
    // Database connection test
    const dbStart = Date.now()
    const { data, error } = await supabase
      .from('bookings')
      .select('count')
      .limit(1)
    
    health.checks.database = {
      status: error ? 'unhealthy' : 'healthy',
      responseTime: Date.now() - dbStart,
      error: error?.message
    }

    // Function test
    const funcStart = Date.now()
    const { data: funcData, error: funcError } = await supabase
      .rpc('staff_revenue_by_user', { p_user_id: null })
    
    health.checks.functions = {
      status: funcError ? 'unhealthy' : 'healthy',
      responseTime: Date.now() - funcStart,
      error: funcError?.message
    }

    // Overall performance
    health.performance.totalResponseTime = Date.now() - startTime
    health.performance.grade = health.performance.totalResponseTime < 500 ? 'A' : 
                             health.performance.totalResponseTime < 1000 ? 'B' : 'C'

    // Set overall status
    const hasErrors = Object.values(health.checks).some(check => check.status === 'unhealthy')
    health.status = hasErrors ? 'degraded' : 'healthy'

    res.status(hasErrors ? 503 : 200).json(health)
  } catch (error) {
    health.status = 'critical'
    health.error = error.message
    res.status(500).json(health)
  }
}
