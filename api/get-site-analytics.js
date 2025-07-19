import { setCorsHeaders } from '../utils/cors'
import requireAuth from '../utils/requireAuth'

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
    const user = await requireAuth(req, res)
    if (!user) return

    const { measurement_types = [], 'date_range.start_date': startDate, 'date_range.end_date': endDate, time_zone: timeZone } = req.query
    if (!measurement_types.length) {
      return res.status(400).json({ error: 'measurement_types is required' })
    }

    const params = new URLSearchParams()
    if (startDate) params.append('date_range.start_date', startDate)
    if (endDate) params.append('date_range.end_date', endDate)
    if (timeZone) params.append('time_zone', timeZone)
    ;(Array.isArray(measurement_types) ? measurement_types : [measurement_types]).forEach((t) => {
      params.append('measurement_types[]', t)
    })

    const url = `https://www.wixapis.com/analytics/v2/site-analytics/data?${params.toString()}`

    const apiRes = await fetch(url, {
      headers: {
        Authorization: process.env.WIX_API_AUTH || '',
        'Content-type': 'application/json'
      }
    })

    const text = await apiRes.text()
    if (!apiRes.ok) {
      console.error('Wix analytics error', text)
      return res.status(apiRes.status).json({ error: 'Failed to fetch analytics', details: text })
    }

    const data = JSON.parse(text)
    res.status(200).json({ success: true, data: data.data || [] })
  } catch (err) {
    console.error('Site Analytics Error:', err)
    res.status(500).json({ error: 'Failed to fetch site analytics', details: err.message })
  }
}
