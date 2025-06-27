import { setCorsHeaders } from '../utils/cors'

export default async function handler(req, res) {
  setCorsHeaders(res, 'POST')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const { query } = req.body || {}
  const serviceId = query?.filter?.serviceId

  if (!serviceId) {
    return res.status(400).json({ error: 'serviceId is required' })
  }

  try {
    const wixRes = await fetch(
      'https://www.wixapis.com/_api/bookings-service/v2/availability/query',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: process.env.WIX_API_TOKEN,
        },
        body: JSON.stringify(req.body),
      }
    )

    const data = await wixRes.json()
    res.status(wixRes.status).json(data)
  } catch (err) {
    console.error('Query availability error:', err)
    res.status(500).json({ error: 'Unexpected error', details: err.message })
  }
}
