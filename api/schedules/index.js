import { setCorsHeaders } from '../utils/cors'
import { WixAPIManager } from '../utils/wixApiManager'

const wix = new WixAPIManager()

export default async function handler(req, res) {
  setCorsHeaders(res, ['GET', 'POST'])

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  try {
    if (req.method === 'GET') {
      const { filter } = req.query
      let parsedFilter = {}
      if (filter) {
        parsedFilter = typeof filter === 'string' ? JSON.parse(filter) : filter
      }
      const data = await wix.querySchedules({ filter: parsedFilter })
      res.status(200).json(data)
      return
    }

    if (req.method === 'POST') {
      const { schedule, idempotencyKey } = req.body || {}
      if (!schedule) {
        res.status(400).json({ error: 'schedule is required' })
        return
      }
      const data = await wix.createSchedule(schedule, idempotencyKey)
      res.status(200).json(data)
      return
    }

    res.status(405).json({ error: 'Method Not Allowed' })
  } catch (err) {
    console.error('Schedules API error:', err)
    res.status(500).json({ error: 'Failed to process schedule request', details: err.message })
  }
}
