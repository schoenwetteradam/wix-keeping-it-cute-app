import wixSyncManager from '../../utils/wixSyncManager'
import { createSupabaseClient } from '../../utils/supabaseClient'

const supabase = createSupabaseClient()

export default async function handler (req, res) {
  if (req.method === 'POST') {
    const result = await wixSyncManager.processPending()
    return res.status(200).json(result)
  }

  // GET request returns basic stats
  const { count: pending } = await supabase
    .from('sync_operations')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')
  const { count: failed } = await supabase
    .from('sync_operations')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'failed')

  return res.status(200).json({ pending: pending || 0, failed: failed || 0 })
}
