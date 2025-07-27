import { createSupabaseClient } from '../../utils/supabaseClient'
import { WixAPIManager } from '../../utils/wixApiManager'
import { setCorsHeaders } from '../../utils/cors'

const supabase = createSupabaseClient()
const wixAPI = new WixAPIManager()

export default async function handler(req, res) {
  setCorsHeaders(res, 'GET')

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const health = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    checks: {}
  }

  try {
    const { error: dbError } = await supabase
      .from('sync_operations')
      .select('count(*)')
      .limit(1)

    health.checks.database = dbError ? 'unhealthy' : 'healthy'

    try {
      await wixAPI.getServices()
      health.checks.wix_api = 'healthy'
    } catch (err) {
      health.checks.wix_api = 'unhealthy'
      health.checks.wix_error = err.message
    }

    const { data: pendingOps, error: pendErr } = await supabase
      .from('sync_operations')
      .select('count(*)')
      .eq('status', 'pending')

    health.checks.pending_syncs = pendErr ? 'error' : pendingOps[0].count

    const { data: failedOps } = await supabase
      .from('sync_operations')
      .select('count(*)')
      .eq('status', 'failed')
      .gte('retry_count', 3)

    health.checks.failed_syncs = failedOps[0].count

    const hasUnhealthy = Object.values(health.checks).some(v => v === 'unhealthy' || v === 'error')
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
