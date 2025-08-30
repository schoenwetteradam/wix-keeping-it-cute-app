import { createSupabaseClient } from '../utils/supabaseClient'
import { WixAPIManager } from '../utils/wixApiManager'
import { setCorsHeaders } from '../utils/cors'

const supabase = createSupabaseClient()

export default async function handler(req, res) {
  setCorsHeaders(res, 'GET')
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const health = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    checks: {},
    salon: '💅 Keeping It Cute Salon & Spa - Wix Sync'
  }

  try {
    // Test Supabase connection with simple query
    const { error: dbError } = await supabase
      .from('bookings')
      .select('id')
      .limit(1)

    health.checks.database = dbError ? 'unhealthy' : 'healthy'
    
    if (dbError) {
      health.checks.database_error = dbError.message
    }

    // Test Wix API connection
    try {
      const wix = new WixAPIManager()
      await wix.getServices()
      health.checks.wix_api = 'healthy'
      health.checks.wix_site_id = process.env.WIX_SITE_ID
    } catch (err) {
      health.checks.wix_api = 'unhealthy'
      health.checks.wix_error = err.message
    }

    // Check sync operations if table exists
    try {
      const { data: syncOps } = await supabase
        .from('wix_sync_operations')
        .select('id')
        .eq('status', 'failed')
        .limit(10)

      health.checks.failed_syncs = syncOps?.length || 0
    } catch (syncError) {
      health.checks.sync_table = 'not_created_yet'
    }

    const hasUnhealthy = Object.values(health.checks).some(v => v === 'unhealthy')
    if (hasUnhealthy) {
      health.status = 'degraded'
    }

    res.status(200).json(health)
  } catch (err) {
    health.status = 'unhealthy'
    health.error = err.message
    res.status(500).json(health)
  }
}
