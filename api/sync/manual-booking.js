import wixSyncManager from '../../utils/wixSyncManager'

export default async function handler (req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const { bookingId, operation = 'update' } = req.body || {}
  if (!bookingId) {
    return res.status(400).json({ error: 'bookingId required' })
  }

  await wixSyncManager.queueOperation('booking', bookingId, operation)
  res.status(200).json({ status: 'queued' })
}
