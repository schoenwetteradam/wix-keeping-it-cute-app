import { loadNotifications } from '../utils/notifications'
import { setCorsHeaders } from '../utils/cors'

export default async function handler(req, res) {
  setCorsHeaders(res, 'GET')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const notifications = await loadNotifications()
    res.status(200).json({ success: true, notifications, count: notifications.length })
  } catch (err) {
    res.status(500).json({ error: 'Failed to load notifications', details: err.message })
  }
}
