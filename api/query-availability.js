import { setCorsHeaders } from '../utils/cors'

export default async function handler(req, res) {
  setCorsHeaders(res, ['POST', 'OPTIONS'])

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const body = req.body || {}
    if (!body.query?.filter?.serviceId) {
      return res.status(400).json({ error: 'query.filter.serviceId required' })
    }

    const wixRes = await fetch(
      'https://www.wixapis.com/availability-calendar/v1/availability/query',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: process.env.WIX_API_TOKEN
        },
        body: JSON.stringify(body)
      }
    )

    const data = await wixRes.json()
    if (!wixRes.ok) {
      return res.status(wixRes.status).json({ error: 'Failed to query availability', details: data })
    }

    res.status(200).json(data)
  } catch (err) {
    console.error('Query availability error:', err)
    res.status(500).json({ error: 'Unexpected error', details: err.message })
  }
}
