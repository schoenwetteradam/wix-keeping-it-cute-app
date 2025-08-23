import wixSyncManager from '../../utils/wixSyncManager'

export default async function handler (req, res) {
  const secret = req.headers['x-cron-secret'] || req.query.secret
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const result = await wixSyncManager.processPending()
  res.status(200).json(result)
}
