import { WixSyncManager } from '../../utils/wixSyncManager'

const manager = new WixSyncManager()

export default async function handler(req, res) {
  const auth = req.headers['authorization']
  if (!auth || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const results = await manager.processPendingSyncs()
  res.status(200).json({ processed: results.length })
}
