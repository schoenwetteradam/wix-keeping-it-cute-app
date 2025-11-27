import { createSupabaseClient } from '../../utils/supabaseClient'
import { getWixRequestHeaders } from '../../utils/wixAccessToken'

const supabase = createSupabaseClient()

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const { bookingId } = req.query
  const { paymentStatus } = req.body || {}

  if (!bookingId) {
    return res.status(400).json({ error: 'bookingId is required' })
  }

  try {
    const wixRes = await fetch(
      `https://www.wixapis.com/bookings/v2/confirmation/${bookingId}:confirmOrDecline`,
      {
        method: 'POST',
        headers: await getWixRequestHeaders({
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({ paymentStatus })
      }
    )

    const wixData = await wixRes.json()
    if (!wixRes.ok) {
      return res
        .status(wixRes.status)
        .json({ error: 'Failed to confirm or decline booking', details: wixData })
    }

    const booking = wixData.booking || wixData
    if (booking?.status) {
      await supabase
        .from('bookings')
        .update({
          status: booking.status?.toLowerCase(),
          payment_status: booking.paymentStatus?.toLowerCase(),
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId)
    }

    res.status(200).json({ success: true, booking })
  } catch (err) {
    console.error('Confirm or decline booking error:', err)
    res.status(500).json({ error: 'Unexpected error', details: err.message })
  }
}
