import { createSupabaseClient } from '../../utils/supabaseClient'

const supabase = createSupabaseClient()

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const { bookingId } = req.query
  const { revision, totalParticipants, participantsChoices } = req.body || {}

  if (!bookingId || !revision || (!totalParticipants && !participantsChoices)) {
    return res.status(400).json({ error: 'bookingId, revision and participants info are required' })
  }

  const body = { revision: String(revision) }
  if (totalParticipants) body.totalParticipants = totalParticipants
  if (participantsChoices) body.participantsChoices = participantsChoices

  try {
    const wixRes = await fetch(
      `https://www.wixapis.com/_api/bookings-service/v2/bookings/${bookingId}/update_number_of_participants`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: process.env.WIX_API_TOKEN
        },
        body: JSON.stringify(body)
      }
    )

    const wixData = await wixRes.json()
    if (!wixRes.ok) {
      return res
        .status(wixRes.status)
        .json({ error: 'Failed to update participants', details: wixData })
    }

    const booking = wixData.booking || wixData
    if (booking?.totalParticipants) {
      await supabase
        .from('bookings')
        .update({
          total_participants: booking.totalParticipants,
          revision: parseInt(booking.revision) || undefined,
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId)
    }

    res.status(200).json({ success: true, booking })
  } catch (err) {
    console.error('Update participants error:', err)
    res.status(500).json({ error: 'Unexpected error', details: err.message })
  }
}
