import wixSyncManager from '../../utils/wixSyncManager'

export default async function handler (req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  await wixSyncManager.retryFailed()
  res.status(200).json({ status: 'ok' })
}
