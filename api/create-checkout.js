import { setCorsHeaders } from '../utils/cors'
import { getWixRequestHeaders } from '../utils/wixAccessToken'

export default async function handler(req, res) {
  setCorsHeaders(res, 'POST')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const { lineItems, ...rest } = req.body || {}

  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    return res.status(400).json({ error: 'lineItems are required' })
  }

  try {
    const wixRes = await fetch(
      'https://www.wixapis.com/ecom/v1/checkout',
      {
        method: 'POST',
        headers: await getWixRequestHeaders({
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({ lineItems, ...rest })
      }
    )

    const wixData = await wixRes.json()
    if (!wixRes.ok) {
      return res
        .status(wixRes.status)
        .json({ error: 'Failed to create checkout', details: wixData })
    }

    res.status(200).json({ success: true, checkout: wixData })
  } catch (err) {
    console.error('Create checkout error:', err)
    res.status(500).json({ error: 'Unexpected error', details: err.message })
  }
}
