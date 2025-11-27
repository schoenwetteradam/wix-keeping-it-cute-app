import { createSupabaseClient } from '../../utils/supabaseClient'
import { getWixRequestHeaders } from '../../utils/wixAccessToken'

const supabase = createSupabaseClient()

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const { bookingId } = req.query
  const {
    revision,
    notifyParticipants = false,
    message,
    paymentStatus,
    doubleBooked,
    flowControlSettings = {}
  } = req.body || {}

  if (!bookingId || !revision) {
    return res.status(400).json({ error: 'bookingId and revision are required' })
  }

  try {
    const wixRes = await fetch(
      `https://www.wixapis.com/_api/bookings-service/v2/bookings/${bookingId}/decline`,
      {
        method: 'POST',
        headers: await getWixRequestHeaders({
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({
          revision: String(revision),
          participantNotification: { notifyParticipants, message },
          paymentStatus,
          doubleBooked,
          flowControlSettings
        })
      }
    )

    const wixData = await wixRes.json()
    if (!wixRes.ok) {
      return res
        .status(wixRes.status)
        .json({ error: 'Failed to decline booking', details: wixData })
    }

    const booking = wixData.booking || wixData
    if (booking?.status) {
      await supabase
        .from('bookings')
        .update({
          status: booking.status?.toLowerCase(),
          payment_status: booking.paymentStatus?.toLowerCase(),
          revision: parseInt(booking.revision) || undefined,
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId)
    }

    res.status(200).json({ success: true, booking })
  } catch (err) {
    console.error('Decline booking error:', err)
    res.status(500).json({ error: 'Unexpected error', details: err.message })
  }
}
