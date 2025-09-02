import { WixSyncManager } from '../../utils/wixSyncManager'
import { setCorsHeaders } from '../../utils/cors'

const manager = new WixSyncManager()

export default async function handler(req, res) {
  setCorsHeaders(res, 'POST')
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const results = await manager.retryFailedSyncs()
  res.status(200).json({ processed: results.length })
}
