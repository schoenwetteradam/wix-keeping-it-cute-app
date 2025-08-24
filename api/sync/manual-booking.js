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

  const { bookingId, operation = 'update' } = req.body || {}
  if (!bookingId) {
    return res.status(400).json({ error: 'bookingId is required' })
  }

  await manager.queueManualBooking(bookingId, operation)
  res.status(200).json({ queued: true })
}
