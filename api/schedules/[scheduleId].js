import { setCorsHeaders } from '../../utils/cors'
import { WixAPIManager } from '../../utils/wixApiManager'

const wix = new WixAPIManager()

export default async function handler(req, res) {
  setCorsHeaders(res, ['GET', 'PATCH'])

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  const { scheduleId } = req.query
  if (!scheduleId) {
    res.status(400).json({ error: 'scheduleId is required' })
    return
  }

  try {
    if (req.method === 'GET') {
      const data = await wix.getSchedule(scheduleId)
      res.status(200).json(data)
      return
    }

    if (req.method === 'PATCH') {
      const { schedule, participantNotification } = req.body || {}
      if (!schedule) {
        res.status(400).json({ error: 'schedule is required' })
        return
      }
      const data = await wix.updateSchedule(scheduleId, schedule, participantNotification)
      res.status(200).json(data)
      return
    }

    res.status(405).json({ error: 'Method Not Allowed' })
  } catch (err) {
    console.error('Schedule detail API error:', err)
    res.status(500).json({ error: 'Failed to process schedule request', details: err.message })
  }
}
