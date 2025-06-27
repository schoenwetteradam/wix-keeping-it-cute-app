import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const { bookingId } = req.query
  const {
    startDate,
    endDate,
    revision,
    notifyParticipants = false,
    message,
    flowControlSettings = {}
  } = req.body || {}

  if (!bookingId || !revision || !startDate || !endDate) {
    return res
      .status(400)
      .json({ error: 'bookingId, startDate, endDate and revision are required' })
  }

  try {
    const { data: booking, error } = await supabase
      .from('bookings')
      .select('payload, wix_booking_id')
      .eq('id', bookingId)
      .single()

    if (error || !booking) {
      throw error || new Error('Booking not found')
    }

    const slot = booking.payload?.bookedEntity?.slot
    if (!slot) {
      return res.status(400).json({ error: 'No slot info available for booking' })
    }

    const updatedSlot = { ...slot, startDate, endDate }

    const wixRes = await fetch(
      `https://www.wixapis.com/_api/bookings-service/v2/bookings/${booking.wix_booking_id}/reschedule`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: process.env.WIX_API_TOKEN
        },
        body: JSON.stringify({
          slot: updatedSlot,
          revision: String(revision),
          participantNotification: { notifyParticipants, message },
          flowControlSettings
        })
      }
    )

    const wixData = await wixRes.json()
    if (!wixRes.ok) {
      return res
        .status(wixRes.status)
        .json({ error: 'Failed to reschedule booking', details: wixData })
    }

    await supabase
      .from('bookings')
      .update({
        appointment_date: startDate,
        end_time: endDate,
        revision: parseInt(revision) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)

    res.status(200).json({ success: true, booking: wixData.booking })
  } catch (err) {
    console.error('Reschedule booking error:', err)
    res.status(500).json({ error: 'Unexpected error', details: err.message })
  }
}
