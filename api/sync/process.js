import { WixSyncManager } from '../../utils/wixSyncManager'
import { setCorsHeaders } from '../../utils/cors'

const manager = new WixSyncManager()

export default async function handler(req, res) {
  setCorsHeaders(res, ['GET', 'POST'])
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method === 'POST') {
    const results = await manager.processPendingSyncs()
    return res.status(200).json({ processed: results.length })
  }

  if (req.method === 'GET') {
    const stats = await manager.getStats()
    return res.status(200).json(stats)
  }

  res.status(405).json({ error: 'Method Not Allowed' })
}
