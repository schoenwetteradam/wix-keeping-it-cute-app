import { getWixRequestHeaders } from '../utils/wixAccessToken'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const { details, returnEntity = false } = req.body || {}
  if (!Array.isArray(details) || details.length === 0) {
    return res.status(400).json({ error: 'details array is required' })
  }

  try {
    const wixRes = await fetch(
      'https://www.wixapis.com/bookings/v2/bulk/bookings/confirmOrDecline',
      {
        method: 'POST',
        headers: await getWixRequestHeaders({
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({ details, returnEntity })
      }
    )

    const wixData = await wixRes.json()
    if (!wixRes.ok) {
      return res
        .status(wixRes.status)
        .json({ error: 'Failed to bulk confirm or decline', details: wixData })
    }

    res.status(200).json(wixData)
  } catch (err) {
    console.error('Bulk confirm/decline error:', err)
    res.status(500).json({ error: 'Unexpected error', details: err.message })
  }
}
