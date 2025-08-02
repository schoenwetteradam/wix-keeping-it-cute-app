import { setCorsHeaders } from '../../../utils/cors'
import { WixAPIManager } from '../../../utils/wixApiManager'

const wix = new WixAPIManager()

export default async function handler(req, res) {
  setCorsHeaders(res, 'POST')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  const { scheduleId } = req.query
  if (!scheduleId) {
    res.status(400).json({ error: 'scheduleId is required' })
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  try {
    const { preserveFutureEventsWithParticipants = false, participantNotification } = req.body || {}
    const data = await wix.cancelSchedule(scheduleId, preserveFutureEventsWithParticipants, participantNotification)
    res.status(200).json(data)
  } catch (err) {
    console.error('Cancel schedule API error:', err)
    res.status(500).json({ error: 'Failed to cancel schedule', details: err.message })
  }
}
