import { getWixRequestHeaders } from '../../utils/wixAccessToken'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const { bookingId } = req.query
  const { namespace, namespaceData } = req.body || {}

  if (!bookingId || !namespace || !namespaceData) {
    return res
      .status(400)
      .json({ error: 'bookingId, namespace and namespaceData are required' })
  }

  try {
    const wixRes = await fetch(
      `https://www.wixapis.com/_api/bookings-service/v2/bookings/${bookingId}/update_extended_fields`,
      {
        method: 'POST',
        headers: await getWixRequestHeaders({
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({ namespace, namespaceData })
      }
    )

    const wixData = await wixRes.json()
    if (!wixRes.ok) {
      return res
        .status(wixRes.status)
        .json({ error: 'Failed to update extended fields', details: wixData })
    }

    res.status(200).json(wixData)
  } catch (err) {
    console.error('Update extended fields error:', err)
    res.status(500).json({ error: 'Unexpected error', details: err.message })
  }
}
