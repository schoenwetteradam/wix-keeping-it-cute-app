import { createSupabaseClient } from '../utils/supabaseClient'
import { WixAPIManager } from '../utils/wixApiManager'
import { setCorsHeaders } from '../utils/cors'

export default async function handler(req, res) {
  setCorsHeaders(res, 'GET')
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const health = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    checks: {},
    salon: '💅 Keeping It Cute Salon & Spa - Wix Sync',
    debug: {}
  }

  // Debug environment variables
  health.debug.supabase_url = process.env.SUPABASE_URL ? 'set' : 'missing'
  health.debug.supabase_service_key = process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'missing'
  health.debug.public_supabase_url = process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'missing'
  health.debug.public_supabase_anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'set' : 'missing'

  try {
    // Test Supabase connection with detailed error info
    let supabase
    try {
      supabase = createSupabaseClient()
      health.debug.supabase_client = 'created'
    } catch (clientError) {
      health.checks.database = 'unhealthy'
      health.debug.supabase_client_error = clientError.message
      health.debug.supabase_client = 'failed'
    }

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select('count(*)')
          .limit(1)

        if (error) {
          health.checks.database = 'unhealthy'
          health.debug.database_error = error.message
          health.debug.database_code = error.code
        } else {
          health.checks.database = 'healthy'
          health.debug.database_query = 'success'
        }
      } catch (queryError) {
        health.checks.database = 'unhealthy'
        health.debug.database_query_error = queryError.message
      }
    }

    // Test Wix API connection
    try {
      const wix = new WixAPIManager()
      await wix.getServices()
      health.checks.wix_api = 'healthy'
      health.checks.wix_site_id = process.env.WIX_SITE_ID
      health.debug.wix_api = 'success'
    } catch (err) {
      health.checks.wix_api = 'unhealthy'
      health.checks.wix_error = err.message
      health.debug.wix_api = 'failed'
    }

    const hasUnhealthy = Object.values(health.checks).some(v => v === 'unhealthy')
    if (hasUnhealthy) {
      health.status = 'degraded'
    }

    res.status(200).json(health)
  } catch (err) {
    health.status = 'unhealthy'
    health.error = err.message
    health.debug.general_error = err.stack
    res.status(500).json(health)
  }
}
