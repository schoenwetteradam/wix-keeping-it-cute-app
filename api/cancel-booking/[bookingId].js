import { createSupabaseClient } from '../../utils/supabaseClient'
import { getWixRequestHeaders } from '../../utils/wixAccessToken'

const supabase = createSupabaseClient()

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const { bookingId } = req.query
  const { revision, notifyParticipants = false, message, flowControlSettings = {} } = req.body || {}

  if (!bookingId || !revision) {
    return res.status(400).json({ error: 'bookingId and revision are required' })
  }

  try {
    // Call Wix API to cancel booking
    const wixRes = await fetch(
      `https://www.wixapis.com/_api/bookings-service/v2/bookings/${bookingId}/cancel`,
      {
        method: 'POST',
        headers: await getWixRequestHeaders({
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({
          participantNotification: { notifyParticipants, message },
          revision: String(revision),
          flowControlSettings
        })
      }
    )

    const wixData = await wixRes.json()
    if (!wixRes.ok) {
      return res.status(wixRes.status).json({ error: 'Failed to cancel booking', details: wixData })
    }

    // Update local database
    await supabase
      .from('bookings')
      .update({
        status: 'canceled',
        cancelled_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)

    res.status(200).json({ success: true, booking: wixData.booking })
  } catch (err) {
    console.error('Cancel booking error:', err)
    res.status(500).json({ error: 'Unexpected error', details: err.message })
  }
}
